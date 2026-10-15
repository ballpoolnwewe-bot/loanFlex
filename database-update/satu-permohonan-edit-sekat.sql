-- Aturan permohonan:
-- 1) Setiap pengguna hanya boleh memohon SEKALI. Setelah diluluskan (dapat kredit),
--    pengguna tidak boleh memohon lagi.
-- 2) Admin boleh mengedit had kredit (wajib alasan) dan menyekat/membuka sekatan (wajib alasan).
-- 3) Jika ditolak, pengguna boleh memohon semula selepas 24 jam.
BEGIN;
ALTER TABLE public.permohonan ADD COLUMN IF NOT EXISTS sebab_sekat TEXT;
ALTER TABLE public.permohonan ADD COLUMN IF NOT EXISTS sebab_edit TEXT;

CREATE OR REPLACE FUNCTION public.semak_kelayakan()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u UUID := auth.uid();
  r public.permohonan%ROWTYPE;
  akhir public.permohonan%ROWTYPE;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('boleh', false, 'sebab', 'Sila log masuk.'); END IF;
  SELECT * INTO r FROM public.permohonan WHERE user_id = u AND status = 'disekat' ORDER BY created_at DESC LIMIT 1;
  IF r.id IS NOT NULL THEN
    RETURN jsonb_build_object('boleh', false, 'kod', 'disekat', 'permohonan_id', r.id,
      'sebab', 'Akaun anda telah disekat oleh pentadbir' || coalesce(': ' || r.sebab_sekat, '.'));
  END IF;
  SELECT * INTO r FROM public.permohonan WHERE user_id = u AND status IN ('menunggu','disemak') LIMIT 1;
  IF r.id IS NOT NULL THEN
    RETURN jsonb_build_object('boleh', false, 'kod', 'ada_aktif', 'sebab', 'Permohonan anda sedang diproses.', 'permohonan_id', r.id);
  END IF;
  SELECT * INTO r FROM public.permohonan WHERE user_id = u AND status IN ('lulus','selesai') LIMIT 1;
  IF r.id IS NOT NULL THEN
    RETURN jsonb_build_object('boleh', false, 'kod', 'sudah_kredit', 'permohonan_id', r.id,
      'sebab', 'Anda sudah mempunyai had kredit. Permohonan hanya boleh dibuat sekali.');
  END IF;
  SELECT * INTO akhir FROM public.permohonan WHERE user_id = u AND status = 'ditolak' ORDER BY coalesce(tarikh_keputusan, created_at) DESC LIMIT 1;
  IF akhir.id IS NOT NULL AND coalesce(akhir.tarikh_keputusan, akhir.created_at) + interval '24 hours' > now() THEN
    RETURN jsonb_build_object('boleh', false, 'kod', 'tunggu_24_jam',
      'sebab', 'Permohonan anda ditolak. Anda boleh memohon semula selepas 24 jam.',
      'boleh_mohon_pada', coalesce(akhir.tarikh_keputusan, akhir.created_at) + interval '24 hours');
  END IF;
  RETURN jsonb_build_object('boleh', true);
END; $$;

-- Admin edit had kredit (wajib alasan)
CREATE OR REPLACE FUNCTION public.admin_edit_kredit(_id UUID, _had NUMERIC, _alasan TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.permohonan%ROWTYPE; prod public.produk_pinjaman%ROWTYPE;
BEGIN
  PERFORM public._wajib_admin();
  SELECT * INTO r FROM public.permohonan WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Permohonan tidak dijumpai.'; END IF;
  IF r.status NOT IN ('lulus','selesai','disekat') THEN RAISE EXCEPTION 'Hanya kredit yang diluluskan boleh diedit.'; END IF;
  IF length(btrim(coalesce(_alasan,''))) < 3 OR length(_alasan) > 500 THEN RAISE EXCEPTION 'Alasan edit wajib diisi.'; END IF;
  SELECT * INTO prod FROM public.produk_pinjaman WHERE id = 1;
  IF _had IS NULL OR _had < prod.jumlah_minimum OR _had > prod.jumlah_maksimum THEN
    RAISE EXCEPTION 'Had kredit mesti antara RM% dan RM%.', prod.jumlah_minimum, prod.jumlah_maksimum; END IF;
  UPDATE public.permohonan SET had_kredit = round(_had, 2), sebab_edit = btrim(_alasan) WHERE id = _id;
  PERFORM public._notis(r.user_id, 'status', 'Had kredit dikemas kini',
    'Had kredit anda kini RM' || to_char(_had, 'FM999,999,990.00') || '. Alasan: ' || btrim(_alasan), '/keputusan');
  PERFORM public._audit('edit_kredit', 'permohonan', _id, jsonb_build_object('had_lama', r.had_kredit, 'had_baru', _had, 'alasan', _alasan));
END; $$;

-- Admin sekat / buka sekatan (wajib alasan)
CREATE OR REPLACE FUNCTION public.admin_sekat(_id UUID, _sekat BOOLEAN, _alasan TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.permohonan%ROWTYPE;
BEGIN
  PERFORM public._wajib_admin();
  SELECT * INTO r FROM public.permohonan WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Permohonan tidak dijumpai.'; END IF;
  IF length(btrim(coalesce(_alasan,''))) < 3 OR length(_alasan) > 500 THEN RAISE EXCEPTION 'Alasan wajib diisi.'; END IF;
  IF _sekat THEN
    IF r.status = 'disekat' THEN RAISE EXCEPTION 'Sudah disekat.'; END IF;
    UPDATE public.permohonan SET status = 'disekat', sebab_sekat = btrim(_alasan),
      catatan_admin = coalesce(catatan_admin || E'\n', '') || 'Status sebelum sekat: ' || r.status WHERE id = _id;
    PERFORM public._notis(r.user_id, 'status', 'Akaun disekat', 'Alasan: ' || btrim(_alasan), '/dashboard');
  ELSE
    IF r.status <> 'disekat' THEN RAISE EXCEPTION 'Permohonan ini tidak disekat.'; END IF;
    UPDATE public.permohonan SET status = CASE WHEN had_kredit IS NOT NULL THEN 'lulus' ELSE 'ditolak' END,
      sebab_sekat = NULL WHERE id = _id;
    PERFORM public._notis(r.user_id, 'status', 'Sekatan dibuka', 'Alasan: ' || btrim(_alasan), '/dashboard');
  END IF;
  PERFORM public._audit(CASE WHEN _sekat THEN 'sekat' ELSE 'buka_sekat' END, 'permohonan', _id, jsonb_build_object('status_lama', r.status, 'alasan', _alasan));
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_edit_kredit(uuid,numeric,text), public.admin_sekat(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_edit_kredit(uuid,numeric,text), public.admin_sekat(uuid,boolean,text), public.semak_kelayakan() TO authenticated;
COMMIT;
