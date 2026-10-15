-- Jalankan sekali di SQL Editor database anda.
-- 1) Faedah kini dikira SEMINGGU (kolum kadar_faedah_bulanan menyimpan % seminggu). Default 25%.
ALTER TABLE public.produk_pinjaman ALTER COLUMN kadar_faedah_bulanan SET DEFAULT 25;
UPDATE public.produk_pinjaman SET kadar_faedah_bulanan = 25 WHERE id = 1;

CREATE OR REPLACE FUNCTION public.mohon_pencairan(_jumlah NUMERIC, _tenor INTEGER, _bank TEXT, _pemegang TEXT, _akaun TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u UUID := auth.uid(); r public.permohonan%ROWTYPE; prod public.produk_pinjaman%ROWTYPE;
  faedah NUMERIC; yuran NUMERIC; baru UUID;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Sila log masuk.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('pencairan:' || u::text));
  SELECT * INTO r FROM public.permohonan WHERE user_id = u AND status = 'lulus' FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Tiada had kredit yang diluluskan.'; END IF;
  IF EXISTS (SELECT 1 FROM public.pinjaman WHERE permohonan_id = r.id AND status IN ('menunggu_pencairan','aktif')) THEN
    RAISE EXCEPTION 'Anda sudah mempunyai permintaan pencairan atau pinjaman aktif.'; END IF;
  SELECT * INTO prod FROM public.produk_pinjaman WHERE id = 1;
  IF _jumlah IS NULL OR _jumlah < prod.jumlah_minimum OR _jumlah > r.had_kredit THEN RAISE EXCEPTION 'Jumlah mesti antara RM% dan had kredit anda.', prod.jumlah_minimum; END IF;
  IF NOT (_tenor = ANY(prod.pilihan_tenor)) THEN RAISE EXCEPTION 'Tenor tidak sah.'; END IF;
  _bank := btrim(coalesce(_bank,'')); _pemegang := upper(btrim(coalesce(_pemegang,''))); _akaun := regexp_replace(coalesce(_akaun,''), '\D', '', 'g');
  IF length(_bank) < 2 OR length(_bank) > 80 THEN RAISE EXCEPTION 'Nama bank wajib dipilih.'; END IF;
  IF length(_pemegang) < 3 OR length(_pemegang) > 120 THEN RAISE EXCEPTION 'Nama pemegang akaun tidak sah.'; END IF;
  IF length(_akaun) < 8 OR length(_akaun) > 20 THEN RAISE EXCEPTION 'No. akaun mesti 8-20 digit.'; END IF;
  faedah := round(_jumlah * prod.kadar_faedah_bulanan / 100 * _tenor / 7.0, 2);
  yuran := round(_jumlah * prod.yuran_pemprosesan / 100, 2);
  INSERT INTO public.pinjaman (user_id, permohonan_id, jumlah_pokok, tenor_bulan, kadar_faedah_bulanan, yuran_pemprosesan,
    jumlah_faedah, jumlah_yuran, jumlah_kewajipan, nama_bank, nama_pemegang_akaun, no_akaun)
  VALUES (u, r.id, round(_jumlah,2), _tenor, prod.kadar_faedah_bulanan, prod.yuran_pemprosesan, faedah, yuran,
    round(_jumlah,2) + faedah + yuran, _bank, _pemegang, _akaun)
  RETURNING id INTO baru;
  PERFORM public._notis(u, 'pencairan', 'Permintaan pencairan diterima', 'Permintaan pencairan anda sedang diproses.', '/pinjaman');
  PERFORM public._audit('mohon_pencairan', 'pinjaman', baru, jsonb_build_object('jumlah', _jumlah, 'tenor', _tenor));
  RETURN baru;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_kemaskini_produk(_kadar NUMERIC, _yuran NUMERIC, _denda NUMERIC, _tenor INTEGER[], _min NUMERIC, _max NUMERIC, _syarat TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._wajib_admin();
  IF _kadar < 0 OR _kadar > 100 THEN RAISE EXCEPTION 'Kadar faedah mesti 0-100 peratus seminggu.'; END IF;
  IF _yuran < 0 OR _yuran > 10 THEN RAISE EXCEPTION 'Yuran mesti 0-10 peratus.'; END IF;
  IF _denda < 0 THEN RAISE EXCEPTION 'Denda tidak sah.'; END IF;
  IF _tenor IS NULL OR array_length(_tenor,1) IS NULL OR EXISTS (SELECT 1 FROM unnest(_tenor) x WHERE x < 1 OR x > 60) THEN RAISE EXCEPTION 'Pilihan tenor tidak sah.'; END IF;
  IF _min < 1 OR _max <= _min THEN RAISE EXCEPTION 'Julat jumlah tidak sah.'; END IF;
  UPDATE public.produk_pinjaman SET kadar_faedah_bulanan = _kadar, yuran_pemprosesan = _yuran, denda_lewat = _denda,
    pilihan_tenor = _tenor, jumlah_minimum = _min, jumlah_maksimum = _max, syarat = _syarat, updated_at = now() WHERE id = 1;
  PERFORM public._audit('kemaskini_produk', 'produk', NULL, jsonb_build_object('kadar_seminggu', _kadar, 'yuran', _yuran));
END; $$;

-- 2) Admin merekod bayaran pelanggan yang diterima melalui WhatsApp
CREATE OR REPLACE FUNCTION public.admin_rekod_bayaran(_pinjaman_id UUID, _jumlah NUMERIC, _rujukan TEXT, _catatan TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pinjaman%ROWTYPE; a public.ansuran%ROWTYPE; t UUID; baki NUMERIC;
BEGIN
  PERFORM public._wajib_admin();
  SELECT * INTO p FROM public.pinjaman WHERE id = _pinjaman_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Pinjaman tidak dijumpai.'; END IF;
  IF p.status <> 'aktif' THEN RAISE EXCEPTION 'Pinjaman tidak aktif.'; END IF;
  baki := p.jumlah_kewajipan - p.jumlah_dibayar;
  IF _jumlah IS NULL OR _jumlah <= 0 OR round(_jumlah,2) > round(baki,2) THEN RAISE EXCEPTION 'Jumlah mesti antara RM0.01 dan baki RM%.', round(baki,2); END IF;
  SELECT * INTO a FROM public.ansuran WHERE pinjaman_id = p.id AND status <> 'dibayar' ORDER BY bil LIMIT 1;
  UPDATE public.transaksi SET status = 'dibatalkan' WHERE pinjaman_id = p.id AND status = 'menunggu';
  INSERT INTO public.transaksi (user_id, pinjaman_id, ansuran_id, jumlah, status, mode, penyedia, rujukan_gateway, catatan, disahkan_pada)
  VALUES (p.user_id, p.id, a.id, round(_jumlah,2), 'berjaya', 'whatsapp', 'whatsapp', nullif(btrim(coalesce(_rujukan,'')),''), nullif(btrim(coalesce(_catatan,'')),''), now())
  RETURNING id INTO t;
  UPDATE public.pinjaman SET jumlah_dibayar = jumlah_dibayar + round(_jumlah,2) WHERE id = p.id RETURNING * INTO p;
  IF p.jumlah_dibayar >= p.jumlah_kewajipan THEN
    UPDATE public.ansuran SET status = 'dibayar', tarikh_dibayar = now() WHERE pinjaman_id = p.id AND status <> 'dibayar';
    UPDATE public.pinjaman SET status = 'selesai', tarikh_selesai = now() WHERE id = p.id;
    UPDATE public.permohonan SET status = 'selesai' WHERE id = p.permohonan_id;
    PERFORM public._notis(p.user_id, 'selesai', 'Pinjaman selesai', 'Tahniah! Pinjaman anda telah dijelaskan sepenuhnya. Anda kini boleh membuat permohonan baharu.', '/pinjaman');
  ELSE
    PERFORM public._notis(p.user_id, 'pembayaran', 'Pembayaran diterima', 'Pembayaran RM' || to_char(_jumlah, 'FM999,999,990.00') || ' telah direkodkan. Baki: RM' || to_char(p.jumlah_kewajipan - p.jumlah_dibayar, 'FM999,999,990.00') || '.', '/pembayaran');
  END IF;
  PERFORM public._audit('rekod_bayaran_whatsapp', 'transaksi', t, jsonb_build_object('jumlah', _jumlah, 'rujukan', _rujukan));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_rekod_bayaran(uuid,numeric,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rekod_bayaran(uuid,numeric,text,text) TO authenticated;
