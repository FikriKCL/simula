# SIMULA — FastAPI backend

Backend pembelajaran kepalangmerahan PMR Mula berdasarkan **Proposal SIMULA**. Paket ini berisi API Python, skema/migrasi Prisma, PostgreSQL, pengujian, dan kontrak OpenAPI. Tidak berisi UI Next.js atau Tailwind.

## Arsitektur dan keputusan

Next.js/TypeScript mengirim HTTP JSON ke FastAPI. FastAPI menggunakan **psycopg** untuk query PostgreSQL dan transaksi. **Prisma ORM 6.19.0** menyediakan skema deklaratif, Prisma Client TypeScript opsional, dan satu riwayat migrasi. Prisma Client tidak dijalankan dari Python. Jangan membuat migrasi SQLAlchemy/Alembic paralel atau mengubah skema dari Next.js; Prisma menjadi sumber skema tunggal. Perintah migrasi sengaja dipatok ke versi dalam package-lock.json.

Next.js dan Tailwind adalah bagian frontend; keduanya tidak dibutuhkan untuk menjalankan API. Bila Prisma Client dipakai Next.js untuk operasi server-side, jangan melewati aturan otorisasi, penilaian kuis, dan pemberian XP di FastAPI.

## Fitur

- Register/login username dengan Argon2 dan JWT 30 menit; Swagger mendukung OAuth2 password form.
- Peran STUDENT, INSTRUCTOR, REVIEWER, ADMIN. Registrasi publik selalu STUDENT.
- Sekolah; akun siswa dapat dikaitkan dengan sekolah tanpa meminta email anak.
- Modul berlevel; materi teks, URL gambar, dan URL video.
- DRAFT → PENDING → PUBLISHED atau REJECTED. Validator harus akun berbeda dari pembuat.
- Edit dan hapus materi hanya saat modul DRAFT/REJECTED. Materi terbit dibuat immutable untuk menjaga hasil evaluasi; revisi menggunakan modul baru.
- Level berikutnya terbuka setelah semua materi pada level terbit sebelumnya selesai.
- Pre-test dan post-test, jawaban dinilai di server; kunci tidak muncul pada GET kuis.
- Riwayat hasil; laporan agregat nilai awal PRE/POST dan peningkatan berpasangan, opsional filter sekolah.
- XP 10 per materi, 20 per kuis POST pertama yang lulus. Pengulangan tidak menambah XP lagi.
- Satu lencana per modul, diperoleh setelah semua materi selesai dan setiap post-test lulus jika tersedia.
- Chatbot pencarian kutipan materi tervalidasi dengan referensi sumber dan histori per pengguna.
- CORS untuk `http://localhost:3000`, health check, Swagger, OpenAPI JSON.

**Batas implementasi:** chatbot ini pencarian teks PostgreSQL dan kutipan, bukan LLM atau RAG berbasis embedding. Media memakai URL; tidak ada unggah berkas, transcoding atau bukti siswa menonton video. Tombol selesai adalah pengakuan pengguna. Belum ada refresh token, reset password, logout server-side, manajemen kelas, kuesioner, ekspor laporan, atau email. Token yang disimpan browser harus dihapus saat logout dan kedaluwarsa setelah 30 menit. Menonaktifkan akun langsung menolak token yang masih berlaku. Sebelum membuka akses publik, pasang HTTPS dan pembatasan permintaan/login di reverse proxy serta tentukan kebijakan akun siswa, backup, dan retensi histori.

Materi edukasi final tidak diisi otomatis dan tidak dianggap telah disetujui PMI. Pembina menulis konten, lalu validator PMI memeriksanya melalui alur validasi.

## Persiapan (Windows PowerShell)

Butuh Python 3.11+, Node.js 22 LTS, dan PostgreSQL 16; PostgreSQL dapat dijalankan dengan Docker Desktop.

```powershell
cd simula-backend
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Buka `.env`. Ganti `JWT_SECRET` dengan hasil perintah di atas, dan ganti `ADMIN_PASSWORD` dengan password kuat (10–128 karakter). `.env.example` hanya template; `.env` berisi konfigurasi lokal dan tidak di-commit. Database password di compose hanya untuk development.

### Pilihan A — seluruh layanan melalui Docker

```powershell
docker compose up --build -d
docker compose logs -f api
```

Compose menunggu PostgreSQL sehat, menginstal dependency Prisma menggunakan lockfile, menjalankan migrasi, lalu menyalakan API. Sesudah API aktif, buat admin:

```powershell
docker compose exec api python -m app.bootstrap
```

Swagger: http://localhost:8000/docs. PostgreSQL hanya dipetakan ke localhost. `docker compose down` mempertahankan data. Jangan menggunakan `down -v` jika ingin menyimpan data.

### Pilihan B — Python lokal + PostgreSQL Docker

```powershell
docker compose up -d db
npm ci
npm run db:deploy
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m app.bootstrap
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Jika PowerShell memblokir aktivasi, jalankan Python langsung:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.bootstrap
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Dengan PostgreSQL yang sudah terpasang, buat database `simula`, user/password sendiri, lalu sesuaikan DATABASE_URL di `.env` dan lewati perintah Docker. API tidak membuat tabel otomatis; jalankan migrasi lebih dulu.

### Linux/macOS

```bash
cp .env.example .env
# Edit .env, lalu:
docker compose up -d db
npm ci
npm run db:deploy
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.bootstrap
uvicorn app.main:app --reload
```

## Uji coba melalui Swagger

1. POST `/api/v1/auth/login` dengan username admin dan ADMIN_PASSWORD. Di Swagger, tombol **Authorize** juga bisa login langsung menggunakan username/password melalui `/auth/token`.
2. Admin membuat akun INSTRUCTOR dan REVIEWER melalui `/admin/users`. Admin dapat membuat sekolah melalui `/schools`.
3. Instructor membuat `/modules`, lalu materi `/modules/{mid}/lessons`, kuis `/modules/{mid}/quizzes`, dan lencana `/modules/{mid}/badge` sebelum mengirim `/submit-review`.
4. Reviewer memeriksa detail modul dan mengirim `/modules/{mid}/review` dengan `approved: true`. Akun pembuat tidak dapat menyetujui sendiri, termasuk ADMIN.
5. Siswa register/login, mengerjakan kuis PRE, membaca materi, menandai selesai, lalu mengerjakan POST. Endpoint GET kuis memberi ID soal dan pilihan; gunakan ID itu ketika mengirim jawaban.
6. Periksa `/learning/progress`, `/learning/badges`, `/learning/attempts`, dan `/users/me`. Reviewer membuka `/reports/evaluation`.
7. Buat `/chat/sessions`, lalu kirim pertanyaan ke `/chat/sessions/{sid}/messages`.

Modul hanya memiliki satu nomor level unik. Materi dan kuis level terkunci tidak bisa diambil siswa, tetapi katalog menampilkan judul dan deskripsi. Chatbot boleh mencari semua materi terbit sebagai sumber pendamping. Urutan lesson adalah urutan tampil, bukan syarat membuka lesson dalam satu modul. Tidak ada kewajiban mengerjakan PRE sebelum membaca; tentukan prosedur baseline dalam kegiatan evaluasi.

## Contoh payload

Register:
```json
{"username":"siswa01","display_name":"Siswa 01","password":"password-kuat-123","school_id":null}
```

Login:
```json
{"username":"siswa01","password":"password-kuat-123"}
```

Gunakan `Authorization: Bearer <access_token>` pada endpoint terlindungi. Modul:
```json
{"title":"Pengenalan PMR Mula","description":"Materi pengantar yang akan divalidasi PMI.","level":1}
```

Materi (teks diperlakukan sebagai plain text, bukan HTML):
```json
{"title":"Materi pengantar","body":"Isi materi final disiapkan pembina dan diperiksa validator PMI.","image_url":null,"video_url":"https://example.com/video-pengantar.mp4","position":1}
```

Kuis (contoh teknis; bukan materi tervalidasi):
```json
{"title":"Pre-test contoh","kind":"PRE","pass_score":70,"questions":[{"prompt":"Pilih jawaban contoh yang benar","options":["Benar","Salah"],"correct_index":0,"explanation":"Jawaban contoh adalah Benar."}]}
```

Pengiriman jawaban: `{"answers":{"12":0,"13":2}}` untuk ID soal 12 dan 13. Indeks dimulai dari 0; harus menjawab tepat seluruh soal kuis. Jawaban invalid menghasilkan 422. POST dapat diulang untuk latihan; laporan baseline memakai percobaan paling awal per siswa/modul/jenis, termasuk jika gagal. Nilai lulus ditentukan `pass_score`. Riwayat jawaban tersimpan.

## Daftar endpoint

| Metode | Path (prefix `/api/v1`) | Akses |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/token` | Publik |
| GET | `/users/me` | Login |
| POST | `/admin/users` | Admin |
| PATCH | `/admin/users/{uid}/active` | Admin |
| GET / POST | `/schools` | Publik / Admin |
| GET / POST | `/modules` | Login / Instructor, Admin |
| GET / PUT | `/modules/{mid}` | Sesuai akses / Pemilik, Admin |
| POST | `/modules/{mid}/lessons` | Pemilik, Admin |
| PUT / DELETE | `/lessons/{lid}` | Pemilik, Admin |
| POST | `/modules/{mid}/submit-review` | Pemilik, Admin |
| POST | `/modules/{mid}/review` | Reviewer, Admin; akun berbeda |
| POST | `/lessons/{lid}/complete` | Login; materi terbit |
| GET | `/learning/progress`, `/learning/attempts`, `/learning/badges` | Data akun sendiri |
| POST | `/modules/{mid}/quizzes`, `/modules/{mid}/badge` | Pemilik, Admin |
| GET | `/quizzes/{qid}` | Sesuai akses modul |
| POST | `/quizzes/{qid}/attempts` | Login; kuis terbit |
| GET | `/reports/evaluation` | Reviewer, Admin |
| POST | `/chat/sessions` | Login |
| GET / POST | `/chat/sessions/{sid}/messages` | Pemilik percakapan |

Health di luar prefix: GET `/health/live`, GET `/health/ready`. Kontrak lengkap di `/openapi.json`; snapshot `openapi.json` juga disertakan. Daftar sekolah, modul, riwayat attempt, dan chat menerima `limit`/`offset` dengan limit maksimal 100.

## Integrasi frontend

Base URL: `http://localhost:8000/api/v1`. Next.js cukup melakukan fetch HTTP JSON dan mengirim Bearer token. CORS origin tambahan dikonfigurasi sebagai JSON array dalam `.env`, misalnya `CORS_ORIGINS=["http://localhost:3000","https://simula.example"]`. Jangan mengekspos DATABASE_URL atau JWT_SECRET ke variabel `NEXT_PUBLIC_*`. Tampilan materi/chat harus escape plain text; jangan langsung memakai `dangerouslySetInnerHTML`.

## Mengubah skema

Edit `prisma/schema.prisma` lalu jalankan `npm run db:dev -- --name nama_perubahan` pada database development. Commit migrasi dan gunakan `npm run db:deploy` pada target. `db:dev` memerlukan izin shadow database. SQL migrasi awal juga memiliki CHECK constraints untuk peran, status, skor, dan pilihan soal; pertahankan constraints tersebut ketika mengubah skema. `npm run db:generate` menghasilkan Prisma Client TypeScript opsional; API Python tidak bergantung padanya.

## Pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Tes integrasi akan **skip** tanpa TEST_DATABASE_URL. Untuk menjalankannya, buat database terpisah bernama `simula_test`, migrasikan, lalu:

```powershell
$env:TEST_DATABASE_URL = "postgresql://simula:simula_dev_password@localhost:5432/simula_test?schema=public"
# Override DATABASE_URL sementara hanya untuk migrasi database test:
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:deploy
Remove-Item Env:DATABASE_URL
python -m pytest -q
Remove-Item Env:TEST_DATABASE_URL
```

**Tes mengosongkan tabel database `simula_test` pada setiap skenario**. Jangan memakai database kerja atau produksi. Tes mencakup batas peran, penonaktifan akun, validasi independen, draft, level terkunci, penilaian, reward idempotent, lencana, laporan, dan kepemilikan chat.

## Struktur

`app/main.py`: route dan aturan domain. `app/security.py`: JWT dan role. `app/db.py`: pool transaksi. `app/schemas.py`: validasi input. `app/bootstrap.py`: admin awal. `prisma/`: skema dan migrasi. `tests/`: unit dan integrasi. `compose.yaml`: lingkungan development.

Dependency utama dipatok di requirements dan package-lock. Jalankan tanpa `--reload` ketika deployment, jangan gunakan `.env` contoh, dan simpan rahasia melalui environment deployment.

## Acuan implementasi

- FastAPI OAuth2/JWT: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- Prisma CLI versi 6 dipatok dalam paket; dokumentasi migrate: https://docs.prisma.io/docs/orm/reference/prisma-cli-reference
- Psycopg connection pool: https://www.psycopg.org/psycopg3/docs/advanced/pool.html
