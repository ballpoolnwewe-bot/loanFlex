# Petunjuk Instalasi — QuickLoan Spark

## 1. Persyaratan
- Node.js 20+ atau Bun 1.1+
- Akun Supabase (database, auth, storage)
- Akun payment gateway (Midtrans/Xendit) jika ingin pembayaran live

## 2. Instalasi
```bash
bun install        # atau: npm install
```

## 3. Konfigurasi Environment
Salin `.env.example` menjadi `.env`, lalu isi:
```
SUPABASE_PROJECT_ID=<project id Supabase>
SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PROJECT_ID=<sama seperti di atas>
VITE_SUPABASE_PUBLISHABLE_KEY=<sama>
VITE_SUPABASE_URL=<sama>
```
Nilai ini didapat dari Supabase Dashboard → Project Settings → API.

## 4. Database
Jalankan migrasi yang tersedia, urut dari yang paling lama:
- `drizzle/migrations/` — schema & migrasi Drizzle (tabel, RLS, seed).
- `database-update/` — pembaruan lanjutan, termasuk `faedah-mingguan-dan-bayaran-whatsapp.sql`
  untuk bunga 25% per minggu dan pencatatan pembayaran lewat WhatsApp.

Terapkan lewat Supabase SQL Editor atau `supabase db push` sesuai setup Anda.

## Pembaruan formulir permohonan
Setelah migrasi sebelumnya, jalankan `database-update/kontak-darurat-dan-slip-gaji.sql` sebelum memakai versi aplikasi ini. Pembaruan ini menyimpan 5 kontak darurat dan foto slip gaji dalam dokumen pribadi. Jumlah permohonan baru tidak lagi dimasukkan; had kredit ditentukan pentadbir. Permohonan lama tetap dipertahankan.

## Pembaruan: alamat pekerjaan & pilihan industri / hubungan
Setelah semua pembaruan sebelumnya, jalankan `database-update/alamat-pekerjaan-industri-dan-hubungan.sql` sebelum menggunakan formulir baru. Pembaruan ini menyimpan alamat pekerjaan dan industri / bidang, serta memvalidasi pilihan hubungan bagi semua 5 kontak darurat. Kolom majikan lama tetap disimpan untuk menjaga data lama, tetapi tidak lagi ditampilkan atau diminta dalam formulir baru. Data lama tidak ditafsirkan sebagai industri.

## 5. Payment Gateway
Isi API key payment gateway sebagai secret di environment server
(jangan commit ke git). Uji dulu dengan mode sandbox.

## 6. Menjalankan
```bash
bun dev            # development server
bun run build      # build produksi
bunx vitest run    # menjalankan test
```

## Catatan
- File `.env` asli tidak disertakan demi keamanan; gunakan `.env.example`.
- `node_modules` tidak disertakan; jalankan `bun install` setelah ekstrak.

## Pembaruan: satu kali permohonan, edit & sekat
Jalankan `database-update/satu-permohonan-edit-sekat.sql`. Pengguna hanya boleh memohon sekali; setelah diluluskan tidak boleh memohon lagi. Admin boleh mengedit had kredit dan menyekat/membuka sekatan (wajib alasan). Jika ditolak, pengguna boleh memohon semula selepas 24 jam.
