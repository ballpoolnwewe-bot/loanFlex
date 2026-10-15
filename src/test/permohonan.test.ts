import { describe, expect, it } from "vitest";
import { skemaPermohonan, semakDokumen, PILIHAN_INDUSTRI, PILIHAN_HUBUNGAN } from "../lib/permohonan-schema";

const kontak = { nama: "Siti Aminah", telefon: "0123456789", hubungan: "Saudara" };
const asas = { nama: "Ahmad Ali", kp: "900101145678", telefon: "0123456789", alamat: "12 Jalan Merdeka", pekerjaan: "Kerani", industri: "Pendidikan", alamat_pekerjaan: "25 Jalan Sekolah", pengalaman: 2, gaji: 3000, tujuan: "Pendidikan" };

describe("Peraturan permohonan", () => {
  it("memerlukan alamat pekerjaan dan industri daripada pilihan", () => {
    const data = { ...asas, kontak_darurat: Array(5).fill(kontak) };
    for (const industri of PILIHAN_INDUSTRI) expect(skemaPermohonan.safeParse({ ...data, industri }).success).toBe(true);
    for (const industri of ["", "bidang bebas"]) expect(skemaPermohonan.safeParse({ ...data, industri }).success).toBe(false);
    for (const alamat_pekerjaan of ["", "pendek", "a".repeat(501)]) expect(skemaPermohonan.safeParse({ ...data, alamat_pekerjaan }).success).toBe(false);
    expect(skemaPermohonan.parse({ ...data, majikan: "Nama lama" })).not.toHaveProperty("majikan");
  });
  it("hanya menerima pilihan hubungan untuk kelima-lima kontak", () => {
    for (const hubungan of PILIHAN_HUBUNGAN) expect(skemaPermohonan.safeParse({ ...asas, kontak_darurat: Array(5).fill({ ...kontak, hubungan }) }).success).toBe(true);
    for (let i = 0; i < 5; i++) {
      const kontak_darurat = Array.from({ length: 5 }, (_, j) => ({ ...kontak, hubungan: i === j ? "hubungan bebas" : "Saudara" }));
      expect(skemaPermohonan.safeParse({ ...asas, kontak_darurat }).success).toBe(false);
    }
  });
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