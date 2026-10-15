BEGIN;
ALTER TABLE public.permohonan ADD COLUMN IF NOT EXISTS kontak_darurat JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.permohonan ADD COLUMN IF NOT EXISTS foto_slip_gaji_path TEXT;
ALTER TABLE public.permohonan ALTER COLUMN jumlah_dipohon DROP NOT NULL;
-- Preserve old applications; require the new documents in the submission function.
DROP FUNCTION IF EXISTS public.hantar_permohonan(text,text,text,text,text,text,numeric,numeric,numeric,text,text,text);
CREATE OR REPLACE FUNCTION public.hantar_permohonan(
  _nama_penuh TEXT, _no_kp TEXT, _no_telefon TEXT, _alamat TEXT, _pekerjaan TEXT, _majikan TEXT,
  _pengalaman NUMERIC, _gaji NUMERIC, _tujuan TEXT, _foto_kp TEXT, _foto_selfie TEXT, _kontak_darurat JSONB, _foto_slip_gaji TEXT)
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
  IF length(btrim(coalesce(_tujuan,''))) < 3 OR length(_tujuan) > 300 THEN RAISE EXCEPTION 'Tujuan pinjaman wajib diisi.'; END IF;
  IF _foto_kp IS NULL OR split_part(_foto_kp, '/', 1) <> u::text OR _foto_selfie IS NULL OR split_part(_foto_selfie, '/', 1) <> u::text THEN
    RAISE EXCEPTION 'Dokumen tidak sah.'; END IF;
  IF jsonb_typeof(_kontak_darurat) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Lengkapkan semua 5 kontak darurat.'; END IF;
  IF jsonb_array_length(_kontak_darurat) <> 5 THEN RAISE EXCEPTION 'Lengkapkan semua 5 kontak darurat.'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(_kontak_darurat) c WHERE
    jsonb_typeof(c) IS DISTINCT FROM 'object' OR
    length(btrim(coalesce(c->>'nama',''))) NOT BETWEEN 3 AND 120 OR
    coalesce(c->>'telefon','') !~ '^\+?[0-9]{9,15}$' OR
    length(btrim(coalesce(c->>'hubungan',''))) NOT BETWEEN 2 AND 80)
  THEN RAISE EXCEPTION 'Kontak darurat tidak lengkap atau tidak sah.'; END IF;
  IF _foto_slip_gaji IS NULL OR split_part(_foto_slip_gaji, '/', 1) <> u::text OR
    NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'dokumen-permohonan' AND name = _foto_slip_gaji)
  THEN RAISE EXCEPTION 'Sila muat naik foto slip gaji yang sah.'; END IF;
  SELECT email INTO em FROM auth.users WHERE id = u;
  INSERT INTO public.permohonan (user_id, nama_penuh, no_kad_pengenalan, no_telefon, emel, alamat, pekerjaan, majikan,
    pengalaman_tahun, gaji_bulanan, jumlah_dipohon, tujuan, foto_kp_path, foto_selfie_path, kontak_darurat, foto_slip_gaji_path)
  VALUES (u, _nama_penuh, _no_kp, _no_telefon, coalesce(em,''), btrim(_alamat), btrim(_pekerjaan), btrim(coalesce(_majikan,'')),
    _pengalaman, _gaji, NULL, btrim(_tujuan), _foto_kp, _foto_selfie, _kontak_darurat, _foto_slip_gaji)
  RETURNING id INTO baru;
  PERFORM public._notis(u, 'permohonan', 'Permohonan diterima', 'Permohonan anda telah dihantar dan akan disemak oleh pasukan kami.', '/dashboard');
  PERFORM public._audit('hantar_permohonan', 'permohonan', baru, jsonb_build_object('bil_kontak_darurat', 5));
  RETURN baru;
END; $$;

REVOKE ALL ON FUNCTION public.hantar_permohonan(text,text,text,text,text,text,numeric,numeric,text,text,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hantar_permohonan(text,text,text,text,text,text,numeric,numeric,text,text,text,jsonb,text) TO authenticated;
COMMIT;
