# Pembaruan pekerjaan & kontak darurat

- Alamat pekerjaan ditambahkan sebagai isian wajib.
- Nama majikan di formulir diganti pilihan industri pekerjaan / bidang (16 pilihan).
- Hubungan pada semua 5 kontak darurat menggunakan pilihan (12 pilihan).
- Detail admin menampilkan industri dan alamat pekerjaan.
- Data majikan lama tetap dipertahankan; tidak diubah menjadi industri.

## Wajib sebelum memakai formulir baru

Jalankan `database-update/alamat-pekerjaan-industri-dan-hubungan.sql` di SQL Editor layanan database aplikasi yang sudah ada, setelah semua pembaruan sebelumnya. Tanpa pembaruan ini, formulir baru tidak bisa dikirim. Tidak perlu memindahkan database atau pengguna.

## Pemeriksaan

8 pemeriksaan otomatis lulus: aturan formulir, interaksi pilihan industri dan hubungan pada kelima kontak, isian alamat pekerjaan, dan format tanggal sebelumnya. Pengiriman serta pembacaan kembali data pada layanan live belum diuji karena layanan aplikasi ZIP tidak tersambung di lingkungan pemeriksaan.

ZIP tidak menyertakan `.env`, riwayat Git, dependensi, atau hasil kompilasi. Gunakan konfigurasi aplikasi yang sudah ada saat memasang versi ini.