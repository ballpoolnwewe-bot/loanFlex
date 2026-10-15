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
Jalankan migrasi yang tersedia:
- Folder `supabase/` berisi migrasi SQL (tabel, RLS, seed).
- Folder `drizzle/` berisi schema & migrasi Drizzle.
Terapkan lewat Supabase SQL Editor atau `supabase db push` sesuai setup Anda.

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
