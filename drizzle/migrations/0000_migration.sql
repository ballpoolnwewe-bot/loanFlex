
CREATE TYPE public.app_role AS ENUM ('admin', 'pemohon');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_penuh TEXT,
  emel TEXT,
  no_telefon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "profil_lihat" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profil_kemaskini_sendiri" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nama_penuh, no_telefon) ON public.profiles TO authenticated;
CREATE POLICY "peranan_lihat" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_penuh, emel, no_telefon)
  VALUES (NEW.id, left(NEW.raw_user_meta_data ->> 'nama_penuh', 120), NEW.email, left(NEW.raw_user_meta_data ->> 'no_telefon', 20))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'pemohon') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.produk_pinjaman (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nama TEXT NOT NULL DEFAULT 'Pinjaman Peribadi RinggitFlex',
  kadar_faedah_bulanan NUMERIC NOT NULL DEFAULT 1.5,
  yuran_pemprosesan NUMERIC NOT NULL DEFAULT 2,
  denda_lewat NUMERIC NOT NULL DEFAULT 0,
  pilihan_tenor INTEGER[] NOT NULL DEFAULT ARRAY[3,6,12],
  jumlah_minimum NUMERIC NOT NULL DEFAULT 500,
  jumlah_maksimum NUMERIC NOT NULL DEFAULT 25000,
  syarat TEXT NOT NULL DEFAULT 'Pinjaman tertakluk kepada kelulusan. Bayaran ansuran perlu dibuat sebelum tarikh jatuh tempo setiap bulan. Bayaran lewat boleh menjejaskan kelayakan permohonan akan datang.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.produk_pinjaman TO authenticated, anon;
GRANT ALL ON public.produk_pinjaman TO service_role;
ALTER TABLE public.produk_pinjaman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produk_lihat" ON public.produk_pinjaman FOR SELECT TO authenticated, anon USING (true);
INSERT INTO public.produk_pinjaman (id) VALUES (1);

CREATE TABLE public.permohonan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nama_penuh TEXT NOT NULL,
  no_kad_pengenalan TEXT NOT NULL,
  no_telefon TEXT NOT NULL,
  emel TEXT NOT NULL,
  alamat TEXT NOT NULL,
  pekerjaan TEXT NOT NULL,
  majikan TEXT NOT NULL DEFAULT '',
  pengalaman_tahun NUMERIC NOT NULL DEFAULT 0,
  gaji_bulanan NUMERIC NOT NULL,
  jumlah_dipohon NUMERIC NOT NULL,
  tujuan TEXT NOT NULL,
  foto_kp_path TEXT NOT NULL,
  foto_selfie_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu',
  had_kredit NUMERIC,
  sebab_tolak TEXT,
  catatan_admin TEXT,
  diputuskan_oleh UUID,
  tarikh_keputusan TIMESTAMPTZ,
  keputusan_dilihat BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX permohonan_user_idx ON public.permohonan(user_id, created_at DESC);
CREATE UNIQUE INDEX permohonan_satu_aktif ON public.permohonan(user_id) WHERE status IN ('menunggu','disemak','lulus');
GRANT SELECT ON public.permohonan TO authenticated;
GRANT ALL ON public.permohonan TO service_role;
ALTER TABLE public.permohonan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permohonan_lihat" ON public.permohonan FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER permohonan_updated_at BEFORE UPDATE ON public.permohonan FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pinjaman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permohonan_id UUID NOT NULL REFERENCES public.permohonan(id) ON DELETE CASCADE,
  jumlah_pokok NUMERIC NOT NULL,
  tenor_bulan INTEGER NOT NULL,
  kadar_faedah_bulanan NUMERIC NOT NULL,
  yuran_pemprosesan NUMERIC NOT NULL,
  jumlah_faedah NUMERIC NOT NULL,
  jumlah_yuran NUMERIC NOT NULL,
  jumlah_kewajipan NUMERIC NOT NULL,
  jumlah_dibayar NUMERIC NOT NULL DEFAULT 0,
  nama_bank TEXT NOT NULL,
  nama_pemegang_akaun TEXT NOT NULL,
  no_akaun TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu_pencairan',
  rujukan_pencairan TEXT,
  catatan_admin TEXT,
  tarikh_dicairkan TIMESTAMPTZ,
  tarikh_selesai TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pinjaman_satu_terbuka ON public.pinjaman(permohonan_id) WHERE status IN ('menunggu_pencairan','aktif');
GRANT SELECT ON public.pinjaman TO authenticated;
GRANT ALL ON public.pinjaman TO service_role;
ALTER TABLE public.pinjaman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pinjaman_lihat" ON public.pinjaman FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pinjaman_updated_at BEFORE UPDATE ON public.pinjaman FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ansuran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pinjaman_id UUID NOT NULL REFERENCES public.pinjaman(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  bil INTEGER NOT NULL,
  jumlah NUMERIC NOT NULL,
  tarikh_jatuh_tempo DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'belum_bayar',
  tarikh_dibayar TIMESTAMPTZ,
  UNIQUE (pinjaman_id, bil)
);
GRANT SELECT ON public.ansuran TO authenticated;
GRANT ALL ON public.ansuran TO service_role;
ALTER TABLE public.ansuran ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ansuran_lihat" ON public.ansuran FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.transaksi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pinjaman_id UUID NOT NULL REFERENCES public.pinjaman(id) ON DELETE CASCADE,
  ansuran_id UUID REFERENCES public.ansuran(id) ON DELETE SET NULL,
  jumlah NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'menunggu',
  mode TEXT NOT NULL DEFAULT 'gateway',
  penyedia TEXT,
  rujukan_gateway TEXT UNIQUE,
  url_bayaran TEXT,
  catatan TEXT,
  disahkan_pada TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transaksi_satu_menunggu ON public.transaksi(ansuran_id) WHERE status = 'menunggu';
GRANT SELECT ON public.transaksi TO authenticated;
GRANT ALL ON public.transaksi TO service_role;
ALTER TABLE public.transaksi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transaksi_lihat" ON public.transaksi FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER transaksi_updated_at BEFORE UPDATE ON public.transaksi FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.notifikasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  jenis TEXT NOT NULL,
  tajuk TEXT NOT NULL,
  mesej TEXT NOT NULL,
  pautan TEXT,
  dibaca BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifikasi_user_idx ON public.notifikasi(user_id, created_at DESC);
GRANT SELECT ON public.notifikasi TO authenticated;
GRANT UPDATE (dibaca) ON public.notifikasi TO authenticated;
GRANT ALL ON public.notifikasi TO service_role;
ALTER TABLE public.notifikasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifikasi_lihat" ON public.notifikasi FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notifikasi_tanda_baca" ON public.notifikasi FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.log_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pelaku UUID,
  tindakan TEXT NOT NULL,
  entiti TEXT NOT NULL,
  entiti_id UUID,
  butiran JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.log_audit TO authenticated;
GRANT ALL ON public.log_audit TO service_role;
ALTER TABLE public.log_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin" ON public.log_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifikasi;
ALTER PUBLICATION supabase_realtime ADD TABLE public.permohonan;

CREATE OR REPLACE FUNCTION public._notis(_u UUID, _jenis TEXT, _tajuk TEXT, _mesej TEXT, _pautan TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifikasi (user_id, jenis, tajuk, mesej, pautan) VALUES (_u, _jenis, _tajuk, _mesej, _pautan);
$$;
CREATE OR REPLACE FUNCTION public._audit(_tindakan TEXT, _entiti TEXT, _id UUID, _butiran JSONB)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.log_audit (pelaku, tindakan, entiti, entiti_id, butiran) VALUES (auth.uid(), _tindakan, _entiti, _id, _butiran);
$$;
CREATE OR REPLACE FUNCTION public._wajib_admin() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Akses ditolak: hanya pentadbir.' USING ERRCODE = '42501';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.semak_kelayakan()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u UUID := auth.uid();
  terbuka public.permohonan%ROWTYPE;
  bil30 INTEGER;
  tertua TIMESTAMPTZ;
  akhir public.permohonan%ROWTYPE;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('boleh', false, 'sebab', 'Sila log masuk.'); END IF;
  SELECT * INTO terbuka FROM public.permohonan WHERE user_id = u AND status IN ('menunggu','disemak','lulus') LIMIT 1;
  IF terbuka.id IS NOT NULL THEN
    RETURN jsonb_build_object('boleh', false, 'kod', 'ada_aktif', 'sebab',
      CASE WHEN terbuka.status = 'lulus' THEN 'Anda masih mempunyai had kredit/pinjaman aktif yang belum selesai.'
           ELSE 'Permohonan anda sedang diproses.' END,
      'permohonan_id', terbuka.id);
  END IF;
  SELECT * INTO akhir FROM public.permohonan WHERE user_id = u ORDER BY created_at DESC LIMIT 1;
  IF akhir.id IS NOT NULL AND akhir.status = 'ditolak' THEN
    SELECT count(*), min(created_at) INTO bil30, tertua FROM public.permohonan
      WHERE user_id = u AND created_at > now() - interval '30 days' AND status <> 'dibatalkan';
    IF bil30 >= 2 THEN
      RETURN jsonb_build_object('boleh', false, 'kod', 'had_30_hari',
        'sebab', 'Anda telah memohon semula dalam tempoh 30 hari. Sila cuba lagi selepas tarikh yang dinyatakan.',
        'boleh_mohon_pada', tertua + interval '30 days');
    END IF;
  END IF;
  RETURN jsonb_build_object('boleh', true);
END; $$;

CREATE OR REPLACE FUNCTION public.hantar_permohonan(
  _nama_penuh TEXT, _no_kp TEXT, _no_telefon TEXT, _alamat TEXT, _pekerjaan TEXT, _majikan TEXT,
  _pengalaman NUMERIC, _gaji NUMERIC, _jumlah NUMERIC, _tujuan TEXT, _foto_kp TEXT, _foto_selfie TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u UUID := auth.uid();
  kel JSONB;
  prod public.produk_pinjaman%ROWTYPE;
  baru UUID;
  em TEXT;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Sila log masuk.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('permohonan:' || u::text));
  kel := public.semak_kelayakan();
  IF NOT (kel->>'boleh')::boolean THEN RAISE EXCEPTION '%', kel->>'sebab'; END IF;
  SELECT * INTO prod FROM public.produk_pinjaman WHERE id = 1;
  _nama_penuh := btrim(coalesce(_nama_penuh,'')); _no_kp := regexp_replace(coalesce(_no_kp,''), '\D', '', 'g');
  _no_telefon := regexp_replace(coalesce(_no_telefon,''), '[^0-9+]', '', 'g');
  IF length(_nama_penuh) < 3 OR length(_nama_penuh) > 120 THEN RAISE EXCEPTION 'Nama penuh tidak sah.'; END IF;
  IF length(_no_kp) <> 12 THEN RAISE EXCEPTION 'No. kad pengenalan mesti 12 digit.'; END IF;
  IF length(_no_telefon) < 9 OR length(_no_telefon) > 15 THEN RAISE EXCEPTION 'No. telefon tidak sah.'; END IF;
  IF length(btrim(coalesce(_alamat,''))) < 10 OR length(_alamat) > 500 THEN RAISE EXCEPTION 'Alamat tidak lengkap.'; END IF;
  IF length(btrim(coalesce(_pekerjaan,''))) < 2 OR length(_pekerjaan) > 100 THEN RAISE EXCEPTION 'Pekerjaan wajib diisi.'; END IF;
  IF length(coalesce(_majikan,'')) > 150 THEN RAISE EXCEPTION 'Nama majikan terlalu panjang.'; END IF;
  IF _pengalaman IS NULL OR _pengalaman < 0 OR _pengalaman > 60 THEN RAISE EXCEPTION 'Pengalaman kerja tidak sah.'; END IF;
  IF _gaji IS NULL OR _gaji <= 0 OR _gaji > 1000000 THEN RAISE EXCEPTION 'Gaji bulanan tidak sah.'; END IF;
  IF _jumlah IS NULL OR _jumlah < prod.jumlah_minimum OR _jumlah > prod.jumlah_maksimum THEN
    RAISE EXCEPTION 'Jumlah mesti antara RM% dan RM%.', prod.jumlah_minimum, prod.jumlah_maksimum; END IF;
  IF length(btrim(coalesce(_tujuan,''))) < 3 OR length(_tujuan) > 300 THEN RAISE EXCEPTION 'Tujuan pinjaman wajib diisi.'; END IF;
  IF _foto_kp IS NULL OR split_part(_foto_kp, '/', 1) <> u::text OR _foto_selfie IS NULL OR split_part(_foto_selfie, '/', 1) <> u::text THEN
    RAISE EXCEPTION 'Dokumen tidak sah.'; END IF;
  SELECT email INTO em FROM auth.users WHERE id = u;
  INSERT INTO public.permohonan (user_id, nama_penuh, no_kad_pengenalan, no_telefon, emel, alamat, pekerjaan, majikan,
    pengalaman_tahun, gaji_bulanan, jumlah_dipohon, tujuan, foto_kp_path, foto_selfie_path)
  VALUES (u, _nama_penuh, _no_kp, _no_telefon, coalesce(em,''), btrim(_alamat), btrim(_pekerjaan), btrim(coalesce(_majikan,'')),
    _pengalaman, _gaji, _jumlah, btrim(_tujuan), _foto_kp, _foto_selfie)
  RETURNING id INTO baru;
  PERFORM public._notis(u, 'permohonan', 'Permohonan diterima', 'Permohonan anda telah dihantar dan akan disemak oleh pasukan kami.', '/dashboard');
  PERFORM public._audit('hantar_permohonan', 'permohonan', baru, jsonb_build_object('jumlah', _jumlah));
  RETURN baru;
END; $$;

CREATE OR REPLACE FUNCTION public.tanda_keputusan_dilihat(_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.permohonan SET keputusan_dilihat = true
  WHERE id = _id AND user_id = auth.uid() AND status IN ('lulus','ditolak');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_keputusan(_id UUID, _status TEXT, _had NUMERIC, _sebab TEXT, _catatan TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.permohonan%ROWTYPE; prod public.produk_pinjaman%ROWTYPE;
BEGIN
  PERFORM public._wajib_admin();
  SELECT * INTO r FROM public.permohonan WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Permohonan tidak dijumpai.'; END IF;
  IF _status NOT IN ('disemak','lulus','ditolak') THEN RAISE EXCEPTION 'Status tidak sah.'; END IF;
  IF r.status NOT IN ('menunggu','disemak') THEN RAISE EXCEPTION 'Permohonan ini sudah diputuskan (%).', r.status; END IF;
  SELECT * INTO prod FROM public.produk_pinjaman WHERE id = 1;
  IF _status = 'disemak' THEN
    UPDATE public.permohonan SET status = 'disemak', catatan_admin = coalesce(_catatan, catatan_admin) WHERE id = _id;
    PERFORM public._notis(r.user_id, 'status', 'Permohonan sedang disemak', 'Pasukan kami sedang menyemak permohonan anda.', '/dashboard');
  ELSIF _status = 'lulus' THEN
    IF _had IS NULL OR _had < prod.jumlah_minimum OR _had > prod.jumlah_maksimum THEN
      RAISE EXCEPTION 'Had kredit mesti antara RM% dan RM%.', prod.jumlah_minimum, prod.jumlah_maksimum; END IF;
    UPDATE public.permohonan SET status = 'lulus', had_kredit = round(_had, 2), sebab_tolak = NULL,
      catatan_admin = _catatan, diputuskan_oleh = auth.uid(), tarikh_keputusan = now(), keputusan_dilihat = false WHERE id = _id;
    PERFORM public._notis(r.user_id, 'kelulusan', 'Tahniah! Permohonan diluluskan', 'Had kredit RM' || to_char(_had, 'FM999,999,990.00') || ' telah diluluskan untuk anda.', '/keputusan');
  ELSE
    IF length(coalesce(_sebab,'')) > 500 THEN RAISE EXCEPTION 'Sebab terlalu panjang.'; END IF;
    UPDATE public.permohonan SET status = 'ditolak', had_kredit = NULL, sebab_tolak = nullif(btrim(coalesce(_sebab,'')), ''),
      catatan_admin = _catatan, diputuskan_oleh = auth.uid(), tarikh_keputusan = now(), keputusan_dilihat = false WHERE id = _id;
    PERFORM public._notis(r.user_id, 'penolakan', 'Keputusan permohonan', 'Maaf, permohonan anda tidak berjaya kali ini.', '/keputusan');
  END IF;
  PERFORM public._audit('keputusan_' || _status, 'permohonan', _id,
    jsonb_build_object('status_lama', r.status, 'status_baru', _status, 'had', _had, 'sebab', _sebab));
END; $$;

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
  IF _jumlah IS NULL OR _jumlah < 100 OR _jumlah > r.had_kredit THEN RAISE EXCEPTION 'Jumlah mesti antara RM100 dan had kredit anda.'; END IF;
  IF NOT (_tenor = ANY(prod.pilihan_tenor)) THEN RAISE EXCEPTION 'Tenor tidak sah.'; END IF;
  _bank := btrim(coalesce(_bank,'')); _pemegang := upper(btrim(coalesce(_pemegang,''))); _akaun := regexp_replace(coalesce(_akaun,''), '\D', '', 'g');
  IF length(_bank) < 2 OR length(_bank) > 80 THEN RAISE EXCEPTION 'Nama bank wajib dipilih.'; END IF;
  IF length(_pemegang) < 3 OR length(_pemegang) > 120 THEN RAISE EXCEPTION 'Nama pemegang akaun tidak sah.'; END IF;
  IF length(_akaun) < 8 OR length(_akaun) > 20 THEN RAISE EXCEPTION 'No. akaun mesti 8-20 digit.'; END IF;
  faedah := round(_jumlah * prod.kadar_faedah_bulanan / 100 * _tenor, 2);
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
    per := round(p.jumlah_kewajipan / p.tenor_bulan, 2);
    baki := p.jumlah_kewajipan;
    mula := (now() AT TIME ZONE 'Asia/Kuala_Lumpur')::date;
    FOR i IN 1..p.tenor_bulan LOOP
      INSERT INTO public.ansuran (pinjaman_id, user_id, bil, jumlah, tarikh_jatuh_tempo)
      VALUES (p.id, p.user_id, i, CASE WHEN i = p.tenor_bulan THEN baki ELSE per END, (mula + make_interval(months => i))::date);
      baki := baki - per;
    END LOOP;
    PERFORM public._notis(p.user_id, 'pencairan', 'Dana telah dicairkan', 'RM' || to_char(p.jumlah_pokok, 'FM999,999,990.00') || ' telah dipindahkan ke akaun ' || p.nama_bank || '.', '/pinjaman');
  ELSE
    UPDATE public.pinjaman SET status = 'ditolak', catatan_admin = _catatan WHERE id = _id;
    PERFORM public._notis(p.user_id, 'pencairan', 'Pencairan tidak dapat diproses', coalesce(nullif(_catatan,''), 'Sila semak butiran akaun bank anda dan cuba lagi.'), '/pinjaman');
  END IF;
  PERFORM public._audit(CASE WHEN _lulus THEN 'cairkan' ELSE 'tolak_pencairan' END, 'pinjaman', _id, jsonb_build_object('rujukan', _rujukan, 'catatan', _catatan));
END; $$;

CREATE OR REPLACE FUNCTION public.cipta_transaksi(_ansuran_id UUID, _mode TEXT)
RETURNS public.transaksi LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u UUID := auth.uid(); a public.ansuran%ROWTYPE; p public.pinjaman%ROWTYPE; t public.transaksi%ROWTYPE;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Sila log masuk.'; END IF;
  IF _mode NOT IN ('gateway','simulasi') THEN RAISE EXCEPTION 'Mod tidak sah.'; END IF;
  SELECT * INTO a FROM public.ansuran WHERE id = _ansuran_id AND user_id = u FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Ansuran tidak dijumpai.'; END IF;
  IF a.status = 'dibayar' THEN RAISE EXCEPTION 'Ansuran ini sudah dibayar.'; END IF;
  SELECT * INTO p FROM public.pinjaman WHERE id = a.pinjaman_id;
  IF p.status <> 'aktif' THEN RAISE EXCEPTION 'Pinjaman tidak aktif.'; END IF;
  IF EXISTS (SELECT 1 FROM public.ansuran WHERE pinjaman_id = a.pinjaman_id AND bil < a.bil AND status <> 'dibayar') THEN
    RAISE EXCEPTION 'Sila jelaskan ansuran terdahulu dahulu.'; END IF;
  UPDATE public.transaksi SET status = 'dibatalkan' WHERE ansuran_id = a.id AND status = 'menunggu';
  INSERT INTO public.transaksi (user_id, pinjaman_id, ansuran_id, jumlah, mode, penyedia)
  VALUES (u, p.id, a.id, a.jumlah, _mode, CASE WHEN _mode = 'simulasi' THEN 'simulasi' ELSE 'billplz' END)
  RETURNING * INTO t;
  RETURN t;
END; $$;

CREATE OR REPLACE FUNCTION public.sahkan_transaksi(_id UUID, _berjaya BOOLEAN, _rujukan TEXT, _jumlah_diterima NUMERIC)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.transaksi%ROWTYPE; p public.pinjaman%ROWTYPE; baki INTEGER;
BEGIN
  SELECT * INTO t FROM public.transaksi WHERE id = _id FOR UPDATE;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Transaksi tidak dijumpai.'; END IF;
  IF t.status <> 'menunggu' THEN RETURN; END IF;
  IF NOT _berjaya THEN
    UPDATE public.transaksi SET status = 'gagal', rujukan_gateway = coalesce(_rujukan, rujukan_gateway) WHERE id = _id;
    PERFORM public._notis(t.user_id, 'pembayaran', 'Pembayaran tidak berjaya', 'Pembayaran RM' || to_char(t.jumlah, 'FM999,999,990.00') || ' tidak berjaya. Sila cuba lagi.', '/pembayaran');
    RETURN;
  END IF;
  IF _jumlah_diterima IS NULL OR round(_jumlah_diterima, 2) <> round(t.jumlah, 2) THEN
    UPDATE public.transaksi SET status = 'gagal', catatan = 'Jumlah tidak sepadan' WHERE id = _id;
    RETURN;
  END IF;
  UPDATE public.transaksi SET status = 'berjaya', disahkan_pada = now(), rujukan_gateway = coalesce(_rujukan, rujukan_gateway) WHERE id = _id;
  UPDATE public.ansuran SET status = 'dibayar', tarikh_dibayar = now() WHERE id = t.ansuran_id;
  UPDATE public.pinjaman SET jumlah_dibayar = jumlah_dibayar + t.jumlah WHERE id = t.pinjaman_id RETURNING * INTO p;
  SELECT count(*) INTO baki FROM public.ansuran WHERE pinjaman_id = p.id AND status <> 'dibayar';
  IF baki = 0 THEN
    UPDATE public.pinjaman SET status = 'selesai', tarikh_selesai = now() WHERE id = p.id;
    UPDATE public.permohonan SET status = 'selesai' WHERE id = p.permohonan_id;
    PERFORM public._notis(t.user_id, 'selesai', 'Pinjaman selesai', 'Tahniah! Pinjaman anda telah dijelaskan sepenuhnya. Anda kini boleh membuat permohonan baharu.', '/pinjaman');
  ELSE
    PERFORM public._notis(t.user_id, 'pembayaran', 'Pembayaran berjaya', 'Pembayaran RM' || to_char(t.jumlah, 'FM999,999,990.00') || ' telah disahkan.' || CASE WHEN t.mode = 'simulasi' THEN ' (MOD SIMULASI - bukan transaksi sebenar)' ELSE '' END, '/pembayaran');
  END IF;
  INSERT INTO public.log_audit (pelaku, tindakan, entiti, entiti_id, butiran)
  VALUES (NULL, 'sahkan_bayaran', 'transaksi', _id, jsonb_build_object('mode', t.mode, 'rujukan', _rujukan, 'jumlah', t.jumlah));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_kemaskini_produk(_kadar NUMERIC, _yuran NUMERIC, _denda NUMERIC, _tenor INTEGER[], _min NUMERIC, _max NUMERIC, _syarat TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._wajib_admin();
  IF _kadar < 0 OR _kadar > 10 THEN RAISE EXCEPTION 'Kadar faedah mesti 0-10 peratus sebulan.'; END IF;
  IF _yuran < 0 OR _yuran > 10 THEN RAISE EXCEPTION 'Yuran mesti 0-10 peratus.'; END IF;
  IF _denda < 0 THEN RAISE EXCEPTION 'Denda tidak sah.'; END IF;
  IF _tenor IS NULL OR array_length(_tenor,1) IS NULL OR EXISTS (SELECT 1 FROM unnest(_tenor) x WHERE x < 1 OR x > 60) THEN RAISE EXCEPTION 'Pilihan tenor tidak sah.'; END IF;
  IF _min < 100 OR _max <= _min THEN RAISE EXCEPTION 'Julat jumlah tidak sah.'; END IF;
  UPDATE public.produk_pinjaman SET kadar_faedah_bulanan = _kadar, yuran_pemprosesan = _yuran, denda_lewat = _denda,
    pilihan_tenor = (SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(_tenor) x), jumlah_minimum = _min, jumlah_maksimum = _max,
    syarat = left(coalesce(_syarat,''), 4000), updated_at = now() WHERE id = 1;
  PERFORM public._audit('kemaskini_produk', 'produk_pinjaman', NULL, jsonb_build_object('kadar', _kadar, 'yuran', _yuran, 'tenor', _tenor, 'min', _min, 'max', _max));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_hantar_notifikasi(_user UUID, _tajuk TEXT, _mesej TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._wajib_admin();
  IF length(btrim(coalesce(_tajuk,''))) < 2 OR length(_tajuk) > 120 OR length(btrim(coalesce(_mesej,''))) < 2 OR length(_mesej) > 1000 THEN
    RAISE EXCEPTION 'Tajuk/mesej tidak sah.'; END IF;
  IF _user IS NULL THEN
    INSERT INTO public.notifikasi (user_id, jenis, tajuk, mesej) SELECT id, 'pengumuman', _tajuk, _mesej FROM public.profiles;
  ELSE
    PERFORM public._notis(_user, 'pengumuman', _tajuk, _mesej, NULL);
  END IF;
  PERFORM public._audit('hantar_notifikasi', 'notifikasi', _user, jsonb_build_object('tajuk', _tajuk));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_tetap_admin(_user UUID, _admin BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._wajib_admin();
  IF _user = auth.uid() AND NOT _admin THEN RAISE EXCEPTION 'Anda tidak boleh membuang peranan admin sendiri.'; END IF;
  IF _admin THEN INSERT INTO public.user_roles (user_id, role) VALUES (_user, 'admin') ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.user_roles WHERE user_id = _user AND role = 'admin'; END IF;
  PERFORM public._audit(CASE WHEN _admin THEN 'beri_admin' ELSE 'tarik_admin' END, 'user_roles', _user, '{}'::jsonb);
END; $$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notis(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._audit(text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._wajib_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sahkan_transaksi(uuid,boolean,text,numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sahkan_transaksi(uuid,boolean,text,numeric) TO service_role;
REVOKE EXECUTE ON FUNCTION public.cipta_transaksi(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cipta_transaksi(uuid,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.semak_kelayakan() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.hantar_permohonan(text,text,text,text,text,text,numeric,numeric,numeric,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tanda_keputusan_dilihat(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_keputusan(uuid,text,numeric,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mohon_pencairan(numeric,integer,text,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_proses_pencairan(uuid,boolean,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_kemaskini_produk(numeric,numeric,numeric,integer[],numeric,numeric,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_hantar_notifikasi(uuid,text,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_tetap_admin(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.semak_kelayakan(), public.hantar_permohonan(text,text,text,text,text,text,numeric,numeric,numeric,text,text,text),
  public.tanda_keputusan_dilihat(uuid), public.admin_keputusan(uuid,text,numeric,text,text), public.mohon_pencairan(numeric,integer,text,text,text),
  public.admin_proses_pencairan(uuid,boolean,text,text), public.admin_kemaskini_produk(numeric,numeric,numeric,integer[],numeric,numeric,text),
  public.admin_hantar_notifikasi(uuid,text,text), public.admin_tetap_admin(uuid,boolean) TO authenticated;

CREATE POLICY "dokumen_muat_naik_sendiri" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dokumen-permohonan' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "dokumen_lihat_sendiri" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dokumen-permohonan' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
