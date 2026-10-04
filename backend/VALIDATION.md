# Validasi backend v3 — 4 Oktober 2026

- SQLAlchemy 2.0.44 memetakan 17 tabel; lima tabel baru: Topic, Material, MaterialProgress, QuizRun, Certificate.
- `prisma validate` lulus dengan Prisma 6.19.0. Migrasi awal dan tambahan dijalankan berurutan melalui SQL pada PGlite.
- Import dan ekspor OpenAPI berhasil: versi 3.0.0, 43 path, 56 schema. Snapshot diperbarui.
- Runtime tidak menggunakan query SQL mentah; CRUD, agregasi, penguncian, pencarian memakai ORM/SQLAlchemy expressions. SQL tetap ada dalam migrasi.
- Ruff import/undefined names (F/I) lulus; kode diformat.
- Empat tes keamanan/validasi, satu tes rollback ORM dengan SQLite, dan lima skenario integrasi FastAPI + SQLAlchemy + psycopg + PGlite lulus.
- **Total: 10 tes lulus.** Satu peringatan deprecation Starlette/AnyIO test client.
- PDF sertifikat berhasil dibuat, dirender, dan diperiksa visual dengan nama/judul panjang; font tertanam, teks terbaca tanpa terpotong.
- Service/schema chatbot identik dengan versi sebelumnya; tidak ada peningkatan chatbot atau implementasi frontend.

Integrasi lama mencakup batas peran, akun nonaktif, konflik username, draft, validasi independen, level terkunci, nilai server, hadiah idempotent, lencana, laporan baseline berpasangan, dan kepemilikan chat.

Integrasi baru mencakup login email tanpa membedakan huruf besar/kecil, level sama pada topik berbeda, katalog tanpa URL media, prasyarat penyelesaian media, membuka media tanpa duplikasi, snapshot penilaian setelah soal diedit, jawaban invalid, kepemilikan/masa berlaku sesi, penolakan submit berulang, PDF/kepemilikan sertifikat, statistik profil, nama sertifikat tetap setelah edit profil, bank kosong, dan batas 50 soal aktif termasuk aktivasi kembali.

PGlite merupakan PostgreSQL tersemat untuk validasi lokal, bukan target deployment atau dependency backend. Harness sementara mematikan SSL/prepared statements dan memakai engine yang sama untuk seeding/aplikasi karena batas adapter protokol. Database terpisah bernama `simula_test` digunakan. Rollback transaksi setelah konflik unique telah diuji dengan SQLite.

**Belum diverifikasi di lingkungan ini:** Prisma migrate deploy pada PostgreSQL 16 native, Docker Compose, recovery constraint pada PostgreSQL native, beban/concurrency, dan integrasi Next.js. Jalankan suite terhadap PostgreSQL `simula_test` sesuai README sebelum deployment. Tanpa TEST_DATABASE_URL, lima tes lokal berjalan dan lima integrasi skip.

Materi pendidikan final dan aset media tidak disediakan oleh tes. Validasi teknis tidak menyatakan materi telah disetujui PMI.
