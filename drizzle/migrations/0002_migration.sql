-- Had RM50 - RM10,000, tenor 14/21/30 hari
ALTER TABLE public.produk_pinjaman ALTER COLUMN pilihan_tenor SET DEFAULT ARRAY[14,21,30];
ALTER TABLE public.produk_pinjaman ALTER COLUMN jumlah_minimum SET DEFAULT 50;
ALTER TABLE public.produk_pinjaman ALTER COLUMN jumlah_maksimum SET DEFAULT 10000;
--> statement-breakpoint
UPDATE public.produk_pinjaman SET pilihan_tenor = ARRAY[14,21,30], jumlah_minimum = 50, jumlah_maksimum = 10000;
--> statement-breakpoint
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
  faedah := round(_jumlah * prod.kadar_faedah_bulanan / 100 * _tenor / 30.0, 2);
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
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.admin_proses_pencairan(_id UUID, _lulus BOOLEAN, _rujukan TEXT, _catatan TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.pinjaman%ROWTYPE; i INTEGER; per NUMERIC; baki NUMERIC; mula DATE;
BEGIN
  PERFORM public._wajib_admin();
  SELECT * INTO p FROM public.pinjaman WHERE id = _id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Pinjaman tidak dijumpai.'; END IF;
  IF p.status <> 'menunggu_pencairan' THEN RAISE EXCEPTION 'Pinjaman ini sudah diproses.'; END IF;
  IF _lulus THEN
    IF length(btrim(coalesce(_rujukan,''))) < 3 THEN RAISE EXCEPTION 'Rujukan pindahan bank wajib diisi.'; END IF;
    UPDATE public.pinjaman SET status = 'aktif', tarikh_dicairkan = now(), rujukan_pencairan = btrim(_rujukan), catatan_admin = _catatan WHERE id = _id;
    -- tenor_bulan kini menyimpan bilangan HARI; satu bayaran penuh pada hari ke-N
    mula := (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
    INSERT INTO public.ansuran (pinjaman_id, user_id, bil, jumlah, tarikh_jatuh_tempo)
    VALUES (p.id, p.user_id, 1, p.jumlah_kewajipan, mula + p.tenor_bulan);
    PERFORM public._notis(p.user_id, 'pencairan', 'Dana telah dicairkan', 'RM' || to_char(p.jumlah_pokok, 'FM999,999,990.00') || ' telah dipindahkan ke akaun ' || p.nama_bank || '.', '/pinjaman');
  ELSE
    UPDATE public.pinjaman SET status = 'ditolak', catatan_admin = _catatan WHERE id = _id;
    PERFORM public._notis(p.user_id, 'pencairan', 'Pencairan tidak dapat diproses', coalesce(nullif(_catatan,''), 'Sila semak butiran akaun bank anda dan cuba lagi.'), '/pinjaman');
  END IF;
  PERFORM public._audit(CASE WHEN _lulus THEN 'cairkan' ELSE 'tolak_pencairan' END, 'pinjaman', _id, jsonb_build_object('rujukan', _rujukan, 'catatan', _catatan));
END; $$;
