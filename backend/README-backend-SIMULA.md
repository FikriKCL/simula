# SIMULA Backend

Panduan backend SIMULA setelah integrasi frontend, pembaruan struktur materi, dan penambahan seed data dummy. Diperbarui 13 November 2026 berdasarkan kode dalam paket `SIMULA-integrated.zip`.

Backend menggunakan FastAPI, SQLAlchemy, dan PostgreSQL. Prisma dipakai untuk mengelola migration skema; akses data saat API berjalan dilakukan melalui SQLAlchemy dan driver Psycopg. Image database yang disediakan adalah `pgvector/pgvector:pg16`.

## 1. Fitur dan status integrasi

| Fitur | Status pada paket integrasi |
|---|---|
| Login dan pemeriksaan sesi | API dan halaman login frontend tersedia |
| Register siswa | API tersedia; halaman register frontend belum dibuat |
| Profil dan perubahan nama | Sudah terhubung ke frontend |
| Katalog, pencarian, dan filter materi | Sudah terhubung ke frontend |
| Artikel, komik, dan video embed | Pembaca materi tersedia |
| Pelajaran dan jalur level | Mengikuti progres dan aturan akses backend |
| Kuis PRE/POST | Soal dari API; nilai dihitung di backend |
| XP, lencana, dan sertifikat | Terhubung ke progres siswa dan profil |
| Pengelolaan konten/staf | Endpoint sesuai role tersedia; website admin belum dibuat |
| Chatbot | Endpoint lama dipertahankan; memerlukan konfigurasi Gemini dan knowledge base tersendiri |

## 2. Prasyarat

- Python 3.11, sesuai image Docker backend; versi dependency mengikuti `requirements.txt`.
- Docker Desktop dengan Linux Engine aktif dan Docker Compose.
- PowerShell untuk contoh perintah Windows.
- Node.js dan npm hanya diperlukan di Windows jika migration dijalankan langsung tanpa service Docker `migrate`.

Periksa instalasi dan koneksi Docker Engine:

```powershell
python --version
python -m pip --version
docker version
docker compose version
```

`docker version` harus menampilkan bagian Client dan Server. Semua perintah backend di bawah dijalankan dari direktori `backend`, tempat `compose.yaml` berada.

## 3. Struktur penting

```text
backend/
├── app/
│   ├── main.py                 # FastAPI, CORS, router, static files
│   ├── config.py               # Konfigurasi environment
│   ├── database.py             # SQLAlchemy engine dan session
│   ├── dependencies.py         # Session request dan pemeriksaan role
│   ├── security.py             # Hash password dan JWT
│   ├── bootstrap.py            # Membuat akun admin awal
│   ├── seed.py                 # Data dummy pengembangan
│   ├── api/v1/                 # Endpoint aplikasi
│   ├── models/                 # Model SQLAlchemy
│   ├── schemas/                # Validasi request/response
│   ├── services/               # Aturan bisnis
│   └── static/demo/            # Ilustrasi komik dummy
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── compose.yaml
├── Dockerfile
├── .env.example
├── requirements.txt
├── requirements-dev.txt
├── package.json                # Perintah Prisma migration
└── openapi.json
```

## 4. Instalasi pertama

### 4.1. Buat lingkungan Python

Dari folder proyek:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Jika aktivasi PowerShell diblokir, gunakan interpreter virtual environment secara langsung. Contoh: `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`. Perintah `python` berikutnya juga dapat diganti dengan path interpreter tersebut.

### 4.2. Siapkan `.env`

Salin template hanya jika `.env` belum ada, agar konfigurasi lama tidak tertimpa:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Masukkan hasil perintah Python ke `JWT_SECRET` dalam `.env`. Nilai berawalan `replace-` ditolak oleh aplikasi.

Konfigurasi inti untuk **Python berjalan di Windows, database di Docker**:

```dotenv
DATABASE_URL=postgresql://simula:simula_dev_password@127.0.0.1:5433/simula?schema=public
JWT_SECRET=GANTI_DENGAN_HASIL_TOKEN_URLSAFE_DI_ATAS
ACCESS_TOKEN_MINUTES=30
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
DEMO_PASSWORD=SimulaDemo2026!
DEMO_ASSET_BASE_URL=http://localhost:8000
```

Jangan memakai teks placeholder `JWT_SECRET` tersebut sebagai secret sebenarnya. Password database dan akun demo di sini adalah nilai pengembangan dari konfigurasi paket, bukan kredensial production.

| Variabel | Kegunaan |
|---|---|
| `DATABASE_URL` | Koneksi database backend; wajib |
| `JWT_SECRET` | Secret penandatanganan JWT, minimal 32 karakter; wajib |
| `ACCESS_TOKEN_MINUTES` | Masa berlaku token; default 30 menit |
| `CORS_ORIGINS` | Array JSON origin frontend yang diizinkan |
| `DEMO_PASSWORD` | Password saat akun demo pertama kali dibuat; default `SimulaDemo2026!` |
| `DEMO_ASSET_BASE_URL` | Alamat backend untuk URL gambar komik dummy saat seed dibuat |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` | Dipakai perintah bootstrap admin; email opsional |
| `CONTACT_EMAIL`, `GUIDE_URL` | Konfigurasi bantuan publik, opsional |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Konfigurasi layanan AI; model default mengikuti `app/config.py` |
| `KNOWLEDGE_BASE_PATH` | Lokasi knowledge base chatbot; dibaca layanan RAG |
| `CHAT_PLAYGROUND_RATE_LIMIT` | Batas permintaan playground chat per IP per menit; default 20, per proses worker |

Jalankan perintah dari folder backend. Konfigurasi aplikasi juga membaca `.env` di direktori kerja dan `../.env`; hindari nilai yang saling bertentangan. Environment variable proses dapat mengalahkan nilai `.env`. Setelah mengubah konfigurasi, restart backend.

### 4.3. Bedakan alamat database Windows dan Docker

Pemetaan pada `compose.yaml` adalah `127.0.0.1:5433:5432`:

| Proses | Host dan port database |
|---|---|
| `python -m app.seed` di Windows | `127.0.0.1:5433` |
| Uvicorn di Windows | `127.0.0.1:5433` |
| Service Docker `migrate` | `db:5432` |
| Service Docker `api` | `db:5432` |

Service `migrate` dan `api` memiliki `DATABASE_URL` internal sendiri pada Compose. Karena itu, migration di container bisa berhasil meskipun `DATABASE_URL` untuk Python Windows salah. Nama host `db` hanya digunakan antar-container pada network Compose.

### 4.4. Jalankan database dan migration

Buka Docker Desktop, lalu:

```powershell
docker compose up -d db
docker compose ps
docker compose run --rm migrate
```

Migration pada paket integrasi:

1. `20261004000000_init`: tabel inti.
2. `20261004020000_frontend_alignment`: profil, topik, materi, progres, sesi kuis, dan sertifikat.
3. `20261112000000_article_materials`: jenis `ARTICLE`, `thumbnail_key`, `video_provider`, serta `video_id`.

`No pending migrations to apply` berarti migration sudah diterapkan, bukan berarti data dummy sudah diisi. Startup API tidak otomatis menjalankan migration atau seed.

Alternatif menjalankan migration dari Windows:

```powershell
npm ci
npm run db:deploy
```

Alternatif ini memakai `DATABASE_URL` untuk akses dari Windows. Jangan menjalankan `migrate reset` pada database yang datanya perlu dipertahankan. Jika tabel sebelumnya dibuat manual tanpa riwayat Prisma, periksa kebutuhan baseline sebelum menerapkan migration.

### 4.5. Isi data dummy

Setelah migration berhasil:

```powershell
python -m app.seed
```

Akun yang dibuat:

| Username | Password default | Role |
|---|---|---|
| `demo_student` | `SimulaDemo2026!` | `STUDENT` |
| `demo_teacher` | `SimulaDemo2026!` | `INSTRUCTOR` |

Default password berada di `app/seed.py`. Jika `DEMO_PASSWORD` diubah sebelum seed pertama, password akun mengikuti nilai tersebut. Menjalankan seed ulang atau mengubah `.env` setelah akun dibuat **tidak mereset password akun yang sudah ada**.

Pada database baru yang sudah dimigrasi, dataset demo berisi:

| Data | Jumlah |
|---|---:|
| Sekolah | 1 |
| Akun demo | 2 |
| Topik | 3 |
| Modul / level | 9 |
| Pelajaran | 9 |
| Materi | 27: 9 artikel, 9 komik, 9 video |
| Kuis | 18: PRE dan POST pada setiap modul |
| Soal | 54 |
| Lencana | 9 |

Seed mencari data yang sudah ada sebelum menambahkannya. Progres, nilai, perubahan profil, dan password akun lama tidak dihapus. Modul nyata dengan topik dan level yang sama dilewati sehingga jumlah tambahan dapat lebih kecil pada database yang sudah terisi.

Materi dan soal adalah contoh pengujian, bukan konten kurikulum final. Komik memakai dua ilustrasi SVG lokal. Video memakai contoh YouTube untuk menguji pemutar dan bersifat opsional. Seed tidak memberi progres atau nilai palsu kepada siswa.

### 4.6. Jalankan API

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

| Alamat | Kegunaan |
|---|---|
| http://127.0.0.1:8000/docs | Swagger UI |
| http://127.0.0.1:8000/redoc | ReDoc |
| http://127.0.0.1:8000/openapi.json | Skema OpenAPI dari aplikasi |
| http://127.0.0.1:8000/health/live | Proses API hidup |
| http://127.0.0.1:8000/health/ready | API dapat melakukan query tabel `User` |
| http://localhost:8000/static/demo/comic-1.svg | Contoh gambar komik dummy |

Endpoint `/` tidak harus tersedia. Halaman `/docs` yang terbuka belum menjamin koneksi database berhasil; periksa `/health/ready` dan endpoint yang membutuhkan database.

## 5. Menjalankan kembali setelah instalasi

Terminal backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
docker compose up -d db
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Jalankan migration lagi jika ada pembaruan skema. Seed cukup dijalankan saat membutuhkan data demo; tidak wajib pada setiap startup.

## 6. Login, register, dan penyimpanan akun

Register tersedia di `POST /api/v1/auth/register`; pada paket integrasi, halaman register frontend belum tersedia. Contoh body request melalui Swagger:

```json
{
  "username": "siswa_baru",
  "display_name": "Siswa Baru",
  "email": "siswa@example.com",
  "password": "ContohPassword123!"
}
```

Username terdiri dari 3–40 huruf kecil, angka, atau underscore. Password registrasi 10–128 karakter. Registrasi publik membuat role `STUDENT`; tidak menerima pilihan role admin. Email dan `school_id` bersifat opsional sesuai skema API.

Login melalui `POST /api/v1/auth/login`:

```json
{
  "username": "demo_student",
  "password": "SimulaDemo2026!"
}
```

Respons berisi `access_token`, `token_type`, dan `expires_in`. Endpoint privat menggunakan header:

```http
Authorization: Bearer TOKEN_HASIL_LOGIN
```

Pada Swagger, tombol **Authorize** menggunakan endpoint form `/api/v1/auth/token` dengan username dan password. Pada frontend integrasi, token disimpan di `sessionStorage` per tab; token kedaluwarsa memerlukan login ulang.

Akun tersimpan dalam tabel PostgreSQL **`User`**. Password tersimpan sebagai hash Argon2 dalam `password_hash`, bukan teks asli. Named volume Compose `simula_data` mempertahankan data database; nama volume aktual biasanya diberi prefix proyek Compose.

### Membuat admin awal

Seed tidak membuat admin. Isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` yang valid di `.env`, serta `ADMIN_EMAIL` jika diperlukan, lalu:

```powershell
python -m app.bootstrap
```

Password admin harus 10–128 karakter dan tidak berawalan `replace-`. Perintah ini tidak mengganti akun dengan username yang sudah ada. Halaman website admin belum termasuk paket integrasi.

## 7. Struktur materi terbaru

| Field | Bentuk dan kegunaan |
|---|---|
| `kind` | `ARTICLE`, `COMIC`, `VIDEO`; jenis `PDF` lama tetap didukung untuk kompatibilitas |
| `body` | PostgreSQL `TEXT`; Markdown artikel atau teks/transkrip materi untuk pencarian |
| `thumbnail_key` | `plaster`, `kit`, `hand`, `heart`, atau `roll`; frontend memilih ilustrasi komponen |
| `pages` | JSONB array halaman komik berurutan: `image_url`, `alt`, `text` |
| `video_provider` | `youtube` atau `vimeo` |
| `video_id` | ID video; frontend membentuk URL embed dari provider yang didukung |
| `url` | URL materi/video lama; bukan kode HTML iframe mentah |
| `position` | Urutan materi dalam pelajaran |
| `required` | Menentukan materi wajib sebelum pelajaran dapat diselesaikan |

API menerima `body` 10–1.000.000 karakter. Komik memerlukan minimal satu halaman, maksimal 100 halaman. URL gambar pada skema API menggunakan URL HTTP/HTTPS lengkap. Urutan array adalah urutan baca; `page_count` komik mengikuti jumlah halaman.

Artikel tidak memerlukan PDF. File gambar disimpan di penyimpanan file, sedangkan database menyimpan referensinya. JSX, komponen React, serta kelas warna tidak disimpan dalam database. Upload file dan editor konten admin belum dibuat.

## 8. Endpoint utama

Prefix seluruh endpoint pada tabel berikut adalah **`/api/v1`**. Gunakan `/docs` untuk seluruh parameter, skema, dan aturan role.

| Method | Path | Kegunaan |
|---|---|---|
| POST | `/auth/register` | Register siswa |
| POST | `/auth/login` | Login JSON |
| POST | `/auth/token` | Login form Swagger/OAuth2 |
| GET | `/users/me` | Akun aktif |
| GET | `/users/me/summary` | Profil, statistik, lencana, progres materi |
| PATCH | `/users/me` | Ubah profil |
| GET | `/topics` | Daftar topik |
| GET | `/materials` | Katalog: `q`, `kind`, `topic_id`, `module_id`, `limit`, `offset` |
| GET | `/materials/{aid}` | Detail materi sesuai akses level |
| POST | `/materials/{aid}/open` | Catat materi dibuka |
| POST | `/materials/{aid}/complete` | Tandai materi selesai |
| GET | `/learning/path` | Jalur level dan status akses |
| GET | `/learning/progress` | Progres pelajaran per modul |
| POST | `/lessons/{lid}/complete` | Selesaikan pelajaran setelah materi wajib selesai |
| GET | `/modules` | Daftar modul |
| GET | `/modules/{mid}` | Detail modul, pelajaran, dan daftar kuis |
| GET | `/quizzes/{qid}` | Detail kuis dan pertanyaan publik |
| POST | `/quizzes/{qid}/runs` | Mulai sesi kuis dengan snapshot soal |
| POST | `/quizzes/{qid}/runs/{rid}/submit` | Kirim jawaban sesi kuis |
| GET | `/learning/attempts` | Riwayat percobaan kuis |
| GET | `/learning/badges` | Lencana yang diperoleh |
| GET | `/certificates` | Sertifikat milik pengguna |
| GET | `/certificates/{cid}/download` | Unduh sertifikat PDF dengan autentikasi |
| GET | `/schools` | Daftar sekolah |
| GET | `/ui/config` | Konfigurasi frontend |

Endpoint pengelolaan modul, pelajaran, materi, bank soal, sekolah, dan staf juga tersedia sesuai role. `INSTRUCTOR` mengelola konten miliknya; `REVIEWER`/`ADMIN` meninjau publikasi; operasi khusus admin memerlukan role `ADMIN`.

### Alur belajar

1. Siswa login dan membuka level yang tersedia.
2. Buka materi, lalu tandai setiap materi wajib selesai.
3. Selesaikan pelajaran untuk mencatat progres dan memperoleh XP satu kali.
4. Kerjakan POST setelah seluruh pelajaran pada modul selesai.
5. Backend menghitung nilai dari snapshot soal, lalu memperbarui XP, lencana, sertifikat, dan akses level sesuai hasil.

Untuk submit sesi kuis, kirim `answers` dengan ID soal sebagai key dan indeks opsi **mulai dari 0** sebagai value. Contoh bentuk request, dengan ID disesuaikan hasil `runs`:

```json
{
  "answers": {
    "101": 0,
    "102": 1,
    "103": 2
  }
}
```

Jawaban benar tidak dikirim dalam pertanyaan publik. Sesi yang sudah dikirim atau kedaluwarsa ditolak. Jalur frontend memakai endpoint `runs`; endpoint percobaan langsung lama tetap dipertahankan untuk kompatibilitas.

## 9. Koneksi frontend

Di `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Origin browser harus sesuai `CORS_ORIGINS` backend. Restart frontend setelah mengubah environment. Halaman materi mengambil daftar dari API dan merender kartu dengan `.map()`, bukan array materi dummy lokal.

Jika Next.js Windows gagal memuat SWC native dan menolak Turbopack, jalankan dari folder **frontend**:

```powershell
npm run dev -- --webpack
```

Ini penanganan sementara untuk frontend; konfigurasi database backend tidak perlu diubah karenanya.

## 10. Alternatif: API di Docker

Untuk menjalankan API, migration, dan database melalui Compose:

```powershell
docker compose up -d --build api
docker compose exec api python -m app.seed
```

Service API menunggu migration berhasil dan memakai `db:5432` secara internal. Jangan menjalankan Uvicorn Windows pada port 8000 bersamaan dengan service API Docker. Compose memasang `../chatbot/processed` ke `/app/chatbot/processed`; sediakan knowledge base yang sesuai jika ingin memakai fitur RAG. Dataset demo tidak memerlukan Gemini atau knowledge base.

## 11. Pemeriksaan dan troubleshooting

### Connection timeout ketika seed atau Uvicorn berjalan di Windows

Jika migration container berhasil tetapi Python gagal dengan `connection timeout expired`, periksa jalur koneksi dari Windows:

```powershell
docker compose ps
docker compose port db 5432
Test-NetConnection 127.0.0.1 -Port 5433
```

Dengan Compose paket ini, port yang dipublikasikan seharusnya `127.0.0.1:5433`. Untuk memaksa koneksi yang benar pada terminal PowerShell saat ini:

```powershell
$env:DATABASE_URL = "postgresql://simula:simula_dev_password@127.0.0.1:5433/simula?schema=public"
python -m app.seed
```

Jika berhasil, samakan `DATABASE_URL` di `backend/.env`. Untuk kembali memakai `.env` tanpa override terminal:

```powershell
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

Jika ada `.env` pada folder induk, pastikan nilainya tidak mengarah ke database lain. Restart backend sesudah perbaikan. `TcpTestSucceeded=True` hanya membuktikan port menerima koneksi; kredensial dan skema masih perlu benar.

Jika port tidak dapat dijangkau:

```powershell
docker compose logs db --tail 50
```

### `password authentication failed`

Samakan user dan password dengan database yang benar. Mengubah `POSTGRES_PASSWORD` dalam Compose tidak otomatis mengubah password cluster PostgreSQL yang sudah tersimpan pada volume lama. Periksa kredensial volume tersebut; jangan menghapus volume hanya untuk mencoba memperbaiki koneksi.

### Tabel atau kolom tidak ditemukan

Pastikan Python mengarah ke database yang sama dengan target migration. Jalankan:

```powershell
docker compose run --rm migrate
```

Pesan migration sukses pada container tidak membuktikan Python Windows sedang mengakses database yang sama. Periksa host, port, serta nama database.

### `JWT_SECRET` ditolak atau token tidak berlaku

Buat secret acak menggunakan perintah pada bagian instalasi, simpan di `.env`, dan restart API. Token lama tidak valid setelah secret berubah; login ulang. Token juga kedaluwarsa mengikuti `ACCESS_TOKEN_MINUTES`.

### Docker Linux Engine tidak tersedia

Buka Docker Desktop dan tunggu engine aktif. Jalankan `docker version`. Jika masalah terkait WSL, periksa `wsl --status` dan `wsl --list --verbose`. Simpan pekerjaan sebelum memulai ulang WSL/Docker.

### Port host 5433 atau API 8000 dipakai proses lain

```powershell
Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
```

Identifikasi prosesnya sebelum menghentikan apa pun. Jika port database host diubah, sesuaikan `DATABASE_URL` Windows; port internal antar-container tetap 5432.

### Gambar komik atau video tidak tampil

Pastikan `DEMO_ASSET_BASE_URL` saat seed pertama sesuai alamat backend yang dapat dijangkau browser. Seed ulang tidak memperbarui URL record lama. Untuk perangkat lain, `localhost` menunjuk ke perangkat tersebut, bukan komputer backend. Video contoh memerlukan internet dan izin embed dari provider.

### Modul terkunci atau post-test ditolak

Selesaikan materi wajib, tekan **Selesaikan pelajaran**, dan lulus POST level sebelumnya pada topik yang sama. Menandai materi saja belum otomatis menyelesaikan pelajaran. Respons 403 dapat berasal dari aturan akses ini, bukan selalu masalah token.

## 12. Pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Hasil verifikasi paket integrasi sebelumnya: **23 passed, 9 skipped**. Tes integrasi portabel menggunakan SQLite in-memory dan FastAPI TestClient. Migration SQL dan bentuk data seed juga telah diperiksa dengan PostgreSQL 16 single-user mode; ini bukan pengujian concurrency melalui server PostgreSQL.

Tes PostgreSQL memerlukan database disposable bernama **`simula_test`**. Terapkan migration pada database test terlebih dahulu, misalnya melalui Prisma lokal:

```powershell
npm ci
$env:DATABASE_URL = "postgresql://simula:simula_dev_password@127.0.0.1:5433/simula_test?schema=public"
npm run db:deploy
$env:TEST_DATABASE_URL = $env:DATABASE_URL
python -m pytest -q
Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
```

Database `simula_test` harus sudah dibuat. Fixture PostgreSQL menghapus data di database test; jangan arahkan ke database aplikasi. Sesudah pengujian, pastikan API kembali memakai konfigurasi database aplikasi.

## 13. Menghentikan layanan dan mempertahankan data

Hentikan Uvicorn dengan `Ctrl+C`. Untuk menghentikan database:

```powershell
docker compose stop db
```

Atau hentikan seluruh service dan hapus container/network proyek:

```powershell
docker compose down
```

Named volume database tetap dipertahankan secara default. **`docker compose down -v` menghapus volume dan dapat menghilangkan akun, materi, serta progres.** Simpan `.env` di luar version control dan gunakan backup database untuk data yang perlu dipertahankan.
