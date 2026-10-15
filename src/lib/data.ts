import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Permohonan = Database["public"]["Tables"]["permohonan"]["Row"];
export type Pinjaman = Database["public"]["Tables"]["pinjaman"]["Row"];
export type Ansuran = Database["public"]["Tables"]["ansuran"]["Row"];
export type Transaksi = Database["public"]["Tables"]["transaksi"]["Row"];
export type Notifikasi = Database["public"]["Tables"]["notifikasi"]["Row"];
export type Produk = Database["public"]["Tables"]["produk_pinjaman"]["Row"];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sila log masuk.");
  return data.user;
}

export function useSaya() {
  return useQuery({
    queryKey: ["saya"],
    queryFn: async () => {
      const u = await uid();
      const [{ data: profil }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: u.id, _role: "admin" }),
      ]);
      return { user: u, profil, admin: !!admin };
    },
  });
}

export function useProduk() {
  return useQuery({
    queryKey: ["produk"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produk_pinjaman").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePermohonanSaya() {
  return useQuery({
    queryKey: ["permohonan-saya"],
    queryFn: async () => {
      const u = await uid();
      const { data, error } = await supabase.from("permohonan").select("*").eq("user_id", u.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useKelayakan() {
  return useQuery({
    queryKey: ["kelayakan"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("semak_kelayakan");
      if (error) throw error;
      return data as { boleh: boolean; kod?: string; sebab?: string; boleh_mohon_pada?: string };
    },
  });
}

export function usePinjamanSaya() {
  return useQuery({
    queryKey: ["pinjaman-saya"],
    queryFn: async () => {
      const u = await uid();
      const [{ data: pinjaman, error }, { data: ansuran }, { data: transaksi }] = await Promise.all([
        supabase.from("pinjaman").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
        supabase.from("ansuran").select("*").eq("user_id", u.id).order("bil"),
        supabase.from("transaksi").select("*").eq("user_id", u.id).order("created_at", { ascending: false }),
      ]);
      if (error) throw error;
      return { pinjaman: pinjaman ?? [], ansuran: ansuran ?? [], transaksi: transaksi ?? [] };
    },
  });
}

export function useNotifikasi() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["notifikasi"],
    queryFn: async () => {
      const u = await uid();
      const { data, error } = await supabase.from("notifikasi").select("*").eq("user_id", u.id).order("created_at", { ascending: false }).limit(40);
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    let batal = false;
    supabase.auth.getUser().then(({ data }) => {
      if (batal || !data.user) return;
      ch = supabase
        .channel(`notis-${data.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifikasi", filter: `user_id=eq.${data.user.id}` }, () => {
          qc.invalidateQueries();
        })
        .subscribe();
    });
    return () => {
      batal = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [qc]);
  return q;
}

/** Ringkasan pinjaman semasa (aktif / menunggu pencairan) beserta ansuran. */
export function ringkasPinjaman(d: { pinjaman: Pinjaman[]; ansuran: Ansuran[]; transaksi: Transaksi[] } | undefined) {
  const semasa = d?.pinjaman.find((p) => p.status === "aktif" || p.status === "menunggu_pencairan") ?? null;
  const ans = semasa ? d!.ansuran.filter((a) => a.pinjaman_id === semasa.id) : [];
  const seterusnya = ans.find((a) => a.status !== "dibayar") ?? null;
  const baki = semasa ? Math.max(0, Number(semasa.jumlah_kewajipan) - Number(semasa.jumlah_dibayar)) : 0;
  const peratus = semasa ? (Number(semasa.jumlah_dibayar) / Number(semasa.jumlah_kewajipan)) * 100 : 0;
  return { semasa, ans, seterusnya, baki, peratus };
}

export function kiraPinjaman(pokok: number, tenor: number, p?: Produk | null) {
  if (!p) return { faedah: 0, yuran: 0, jumlah: 0, bulanan: 0 };
  const faedah = Math.round(pokok * (Number(p.kadar_faedah_bulanan) / 100) * tenor * 100) / 100;
  const yuran = Math.round(pokok * (Number(p.yuran_pemprosesan) / 100) * 100) / 100;
  const jumlah = Math.round((pokok + faedah + yuran) * 100) / 100;
  return { faedah, yuran, jumlah, bulanan: tenor ? Math.round((jumlah / tenor) * 100) / 100 : 0 };
}
