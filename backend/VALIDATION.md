# Validasi paket — 4 Oktober 2026

- `prisma validate`: skema valid dengan Prisma 6.19.0.
- Import FastAPI dan pembuatan OpenAPI: berhasil; 26 path, 38 schema input/output.
- Empat tes unit: lulus (JWT/audience, penolakan secret contoh, validasi kunci kuis, konversi URL Prisma).
- Empat skenario integrasi API: lulus menggunakan **PGlite**, mesin PostgreSQL tersemat, melalui protokol PostgreSQL dan psycopg. SQL migrasi awal berhasil diterapkan di mesin tersebut.
- Total: **8 tes lulus**.

Skenario integrasi mencakup batas peran dan token akun nonaktif, konflik username, materi draft, validasi independen, level terkunci, penilaian server, reward idempotent, lencana, laporan baseline berpasangan, histori dan kepemilikan chat.

Lingkungan uji menggunakan PGlite sebagai pengganti sementara PostgreSQL native: SSL dan prepared statements dimatikan pada harness uji, dan tes konflik username dijalankan terakhir karena keterbatasan pemulihan error protokol adapter PGlite. Konfigurasi produksi dalam paket tetap menggunakan psycopg normal. PGlite dan harness sementara bukan dependency aplikasi.

**Belum diverifikasi di lingkungan ini:** migrasi melalui Prisma terhadap PostgreSQL 16 native, runtime Docker Compose, pengujian beban/concurrency, dan integrasi Next.js. Jalankan suite tes yang disertakan terhadap database PostgreSQL terpisah `simula_test` mengikuti README sebelum deployment. Hasil uji PGlite tidak menggantikan uji terhadap PostgreSQL target.
