import { describe, expect, it } from "vitest";
import { skemaPermohonan, semakDokumen } from "../lib/permohonan-schema";

const kontak = { nama: "Siti Aminah", telefon: "0123456789", hubungan: "Saudara" };
const asas = { nama: "Ahmad Ali", kp: "900101145678", telefon: "0123456789", alamat: "12 Jalan Merdeka", pekerjaan: "Kerani", majikan: "Syarikat", pengalaman: 2, gaji: 3000, tujuan: "Pendidikan" };

describe("Peraturan permohonan", () => {
  it("memerlukan tepat 5 kontak darurat lengkap", () => {
    expect(skemaPermohonan.safeParse({ ...asas, kontak_darurat: Array(5).fill(kontak) }).success).toBe(true);
    for (const bil of [0, 4, 6]) expect(skemaPermohonan.safeParse({ ...asas, kontak_darurat: Array(bil).fill(kontak) }).success).toBe(false);
    expect(skemaPermohonan.safeParse({ ...asas, kontak_darurat: [...Array(4).fill(kontak), { ...kontak, telefon: "" }] }).success).toBe(false);
  });
  it("memerlukan foto slip gaji", () => {
    expect(() => semakDokumen(null)).toThrow();
    expect(() => semakDokumen({ type: "image/jpeg", size: 1024 })).not.toThrow();
    expect(() => semakDokumen({ type: "application/pdf", size: 1024 })).toThrow();
  });
  it("tidak memerlukan atau menghantar jumlah dipohon", () => {
    const data = skemaPermohonan.parse({ ...asas, kontak_darurat: Array(5).fill(kontak), jumlah: 1000 });
    expect(data).not.toHaveProperty("jumlah");
  });
});