import { z } from "zod";

export const skemaKontak = z.object({
  nama: z.string().trim().min(3, "Nama kontak darurat wajib diisi").max(120),
  telefon: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "No. telefon kontak darurat tidak sah"),
  hubungan: z.string().trim().min(2, "Hubungan kontak darurat wajib diisi").max(80),
});

export const skemaPermohonan = z.object({
  nama: z.string().trim().min(3, "Nama penuh wajib diisi").max(120),
  kp: z.string().regex(/^\d{6}-?\d{2}-?\d{4}$/, "No. KP mesti 12 digit (cth: 900101-14-5678)"),
  telefon: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "No. telefon tidak sah"),
  alamat: z.string().trim().min(10, "Alamat tidak lengkap").max(500),
  pekerjaan: z.string().trim().min(2, "Pekerjaan wajib diisi").max(100),
  majikan: z.string().trim().max(150),
  pengalaman: z.coerce.number().min(0).max(60),
  gaji: z.coerce.number().positive("Gaji tidak sah").max(1_000_000),
  tujuan: z.string().trim().min(3, "Tujuan wajib diisi").max(300),
  kontak_darurat: z.array(skemaKontak).length(5, "Lengkapkan semua 5 kontak darurat"),
});

export function semakDokumen(fail: { type: string; size: number } | null) {
  if (!fail) throw new Error("Sila muat naik foto slip gaji.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(fail.type)) throw new Error("Dokumen mesti JPG, PNG atau WEBP.");
  if (fail.size > 5 * 1024 * 1024) throw new Error("Saiz dokumen maksimum 5MB.");
}