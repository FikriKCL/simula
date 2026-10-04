# SIMULA — FastAPI backend v3

Backend pembelajaran kepalangmerahan PMR Mula berdasarkan **proposal SIMULA terbaru dan tiga mockup**. Paket ini berisi API Python, skema/migrasi Prisma, PostgreSQL, pengujian, dan kontrak OpenAPI. Tidak berisi implementasi frontend Next.js/Tailwind. Chatbot tidak dikembangkan dalam pembaruan ini; kode dasar versi sebelumnya tetap dipertahankan.

## Arsitektur dan keputusan

Next.js/TypeScript mengirim HTTP JSON ke FastAPI. FastAPI menggunakan **SQLAlchemy 2.0 ORM** untuk query, model, session, dan transaksi; **psycopg** menjadi driver PostgreSQL di bawah SQLAlchemy. **Prisma ORM 6.19.0** menyediakan skema deklaratif, Prisma Client TypeScript opsional, dan satu riwayat migrasi. Prisma Client tidak dijalankan dari Python. Jangan membuat migrasi SQLAlchemy/Alembic paralel atau mengubah skema dari Next.js; Prisma menjadi sumber skema tunggal. Perintah migrasi sengaja dipatok ke versi dalam package-lock.json.

Next.js dan Tailwind adalah bagian frontend; keduanya tidak dibutuhkan untuk menjalankan API. Bila Prisma Client dipakai Next.js untuk operasi server-side, jangan melewati aturan otorisasi, penilaian kuis, dan pemberian XP di FastAPI.

## Struktur backend sesuai referensi

| Path | Tanggung jawab |
|---|---|
| `app/main.py` | Inisialisasi aplikasi, lifespan, middleware, exception handler, pemasangan router |
| `app/config.py` | Konfigurasi Pydantic Settings |
| `app/database.py` | Declarative Base, engine SQLAlchemy, session factory |
| `app/dependencies.py` | Session per request, autentikasi pengguna, pemeriksaan peran |
| `app/security.py` | Hash password dan utilitas JWT |
| `app/api/v1/` | Router auth, users, schools, modules, lessons, learning, quizzes, badges, reports, chat |
| `app/models/` | Entitas SQLAlchemy untuk 17 tabel; dipisah per domain |
| `app/schemas/` | Schema Pydantic request dan response; dipisah per domain |
| `app/services/` | Logika bisnis dan operasi ORM; tidak bergantung pada FastAPI |
| `app/services/common.py` | ServiceError, serialisasi entitas, decorator transaksi |
| `prisma/` | Satu sumber skema dan riwayat migrasi database |
| `tests/api/v1/` | Pengujian alur API dan otorisasi |
| `tests/security/` | Pengujian validasi dan keamanan |
| `tests/services/` | Pengujian rollback ORM menggunakan database SQLite terpisah |

Alur request: router memvalidasi payload dan dependency, kemudian memanggil service. Service membaca/menulis entitas melalui SQLAlchemy; router mengembalikan kontrak response Pydantic. `main.py` tidak memuat CRUD atau logika pembelajaran.

Semua CRUD, agregasi progres, laporan dengan window function, dan pencarian full-text memakai ekspresi SQLAlchemy. Tidak ada query SQL mentah dalam kode aplikasi. SQL tetap ada dalam file migrasi Prisma karena itu definisi perubahan skema, bukan query runtime. Fungsi PostgreSQL seperti `to_tsvector` dan operator `@@` dibentuk melalui expression API SQLAlchemy.

Operasi tulis memakai decorator `@transactional`: seluruh langkah diselesaikan dan di-commit sekali sebelum response dikirim, atau di-rollback jika gagal. Dependency menutup session dan membatalkan transaksi baca. Penguncian baris learner/module memakai `with_for_update()` agar aturan hadiah dan validasi tetap konsisten. Password dan parameter query disembunyikan dari log exception SQLAlchemy.

Folder `alembic/` pada gambar tidak dipakai: Prisma tetap mengelola migrasi agar stack awal dipertahankan dan tidak ada riwayat migrasi kedua. SQLAlchemy hanya menjadi ORM runtime Python. Aplikasi tidak menjalankan `Base.metadata.create_all()` terhadap database pengguna.

## Upgrade dari backend sebelumnya

Versi 3 memerlukan migrasi baru `20261004020000_frontend_alignment`. Setelah mengganti kode, jalankan:

```bash
npm ci
npm run db:deploy
python -m pip install -r requirements.txt
```

Kemudian restart API. Jangan reset database. Migrasi menambahkan profil/email, topik, materi media/progres, snapshot tes, dan sertifikat. Modul lama masuk topik PP; nomor level sekarang unik **per topik**. Lesson lama tetap bisa diselesaikan tanpa Material tambahan. Riwayat attempt lama tetap ada dengan snapshot kosong; sertifikat tidak di-backfill untuk hasil lama. Sertifikat baru diterbitkan pada post-test lulus berikutnya.

## Fitur

- Register dengan username dan email opsional; login email atau username dengan Argon2 dan JWT 30 menit; Swagger mendukung OAuth2 password form.
- Peran STUDENT, INSTRUCTOR, REVIEWER, ADMIN. Registrasi publik selalu STUDENT.
- Sekolah; akun siswa dapat dikaitkan dengan sekolah tanpa meminta email anak.
- Topik PP/ASB/PRS, modul berlevel per topik, lesson teks, serta Material PDF/video/komik dengan halaman berurutan.
- DRAFT → PENDING → PUBLISHED atau REJECTED. Validator harus akun berbeda dari pembuat.
- Edit dan hapus materi hanya saat modul DRAFT/REJECTED. Lesson dan media terbit dibuat immutable; revisi menggunakan modul baru. Admin dapat memperbarui atau mengarsipkan soal kuis terbit.
- Level berikutnya dalam topik yang sama terbuka setelah semua lesson level sebelumnya selesai dan setiap post-testnya lulus.
- Pre-test dan post-test, jawaban dinilai di server; kunci tidak muncul pada GET kuis.
- Riwayat hasil; laporan agregat nilai awal PRE/POST dan peningkatan berpasangan, opsional filter sekolah.
- XP 10 per lesson, 20 per kuis POST pertama yang lulus. Pengulangan tidak menambah XP lagi.
- Satu lencana per modul, diperoleh setelah semua materi selesai dan setiap post-test lulus jika tersedia.
- Katalog media dengan pencarian, filter format/topik, pagination, status terkunci, dan progres membuka/menyelesaikan.
- Post-test berbasis sesi 60 menit: snapshot soal/kunci/pass_score ketika mulai, pengiriman sekali, penilaian server.
- Bank soal admin: tambah, edit, arsipkan/aktifkan; maksimal 50 soal aktif. Snapshot sesi yang sudah dimulai tidak berubah.
- Sertifikat PDF privat otomatis untuk kelulusan POST; satu per akun/kuis, menyimpan nama dan nilai saat penerbitan pertama.
- Ringkasan profil, level, lencana terkunci/diperoleh, progres per format; preferensi bahasa/tema/avatar.
- Endpoint chatbot lama tetap ada tanpa peningkatan; integrasi UI chatbot ditunda.
- CORS untuk `http://localhost:3000`, health check, Swagger, OpenAPI JSON.

**Batas implementasi:** chatbot lama ini pencarian teks PostgreSQL dan kutipan, bukan LLM atau RAG berbasis embedding. Media memakai URL; tidak ada unggah berkas, transcoding atau bukti siswa menonton video. Tombol selesai adalah pengakuan pengguna. Belum ada refresh token, reset password, logout server-side, manajemen kelas, kuesioner, ekspor laporan, atau pengiriman email. Token yang disimpan browser harus dihapus saat logout dan kedaluwarsa setelah 30 menit. Menonaktifkan akun langsung menolak token yang masih berlaku. Sebelum membuka akses publik, pasang HTTPS dan pembatasan permintaan/login di reverse proxy serta tentukan kebijakan akun siswa, backup, dan retensi histori.

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
5. Siswa register/login, mengerjakan kuis PRE jika diperlukan, membaca media dan menandai setiap media wajib selesai, menyelesaikan lesson, lalu mengerjakan POST. Endpoint GET kuis memberi ID soal dan pilihan; gunakan ID itu ketika mengirim jawaban.
6. Periksa `/learning/progress`, `/learning/badges`, `/learning/attempts`, dan `/users/me`. Reviewer membuka `/reports/evaluation`.
7. Ikuti alur media → lesson selesai → sesi POST → submit → sertifikat pada `FRONTEND_API_MAPPING.md`.

Nomor level unik per topik. Materi dan kuis level terkunci tidak bisa diambil siswa, tetapi katalog menampilkan judul dan deskripsi. Chatbot boleh mencari semua materi terbit sebagai sumber pendamping. Urutan lesson adalah urutan tampil, bukan syarat membuka lesson dalam satu modul. Tidak ada kewajiban mengerjakan PRE sebelum membaca; tentukan prosedur baseline dalam kegiatan evaluasi.

## Contoh payload

Register:
```json
{"username":"siswa01","display_name":"Siswa 01","password":"password-kuat-123","school_id":null,"email":"siswa01@example.org"}
```

Login (email atau username; akun lama tanpa email memakai username):
```json
{"email":"siswa01@example.org","password":"password-kuat-123"}
```

Gunakan `Authorization: Bearer <access_token>` pada endpoint terlindungi. Modul:
```json
{"title":"Pengenalan PMR Mula","description":"Materi pengantar yang akan divalidasi PMI.","level":1,"topic_id":1}
```

Lesson (teks diperlakukan sebagai plain text, bukan HTML):
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

Pemetaan lengkap mockup, endpoint baru, alur, dan perubahan UI yang diperlukan ada di [FRONTEND_API_MAPPING.md](FRONTEND_API_MAPPING.md). Dokumen ini merupakan spesifikasi integrasi; tidak ada frontend yang dikembangkan.

Base URL: `http://localhost:8000/api/v1`. Next.js cukup melakukan fetch HTTP JSON dan mengirim Bearer token. CORS origin tambahan dikonfigurasi sebagai JSON array dalam `.env`, misalnya `CORS_ORIGINS=["http://localhost:3000","https://simula.example"]`. Jangan mengekspos DATABASE_URL atau JWT_SECRET ke variabel `NEXT_PUBLIC_*`. Tampilan materi/chat harus escape plain text; jangan langsung memakai `dangerouslySetInnerHTML`.

## Mengubah skema

Edit `prisma/schema.prisma`, sesuaikan mapping kolom/foreign key/default pada `app/models/`, lalu jalankan `npm run db:dev -- --name nama_perubahan` pada database development. Commit migrasi dan gunakan `npm run db:deploy` pada target. `db:dev` memerlukan izin shadow database. SQL migrasi awal juga memiliki CHECK constraints untuk peran, status, skor, dan pilihan soal; pertahankan constraints tersebut ketika mengubah skema. `npm run db:generate` menghasilkan Prisma Client TypeScript opsional; API Python tidak bergantung padanya.

## Pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

Lima tes lokal tidak memerlukan PostgreSQL (termasuk uji rollback transaksi ORM). Lima tes integrasi akan **skip** tanpa TEST_DATABASE_URL. Untuk menjalankannya, buat database terpisah bernama `simula_test`, migrasikan, lalu:

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

`app/api/v1/`: route HTTP. `app/services/`: aturan domain dan CRUD ORM. `app/models/`: entitas database. `app/schemas/`: kontrak API. `app/database.py`: engine/session. `app/dependencies.py`: autentikasi dan role. `app/bootstrap.py`: admin awal. `prisma/`: skema dan migrasi. `tests/`: keamanan, transaksi, dan integrasi. `compose.yaml`: lingkungan development.

Dependency utama dipatok di requirements dan package-lock. Jalankan tanpa `--reload` ketika deployment, jangan gunakan `.env` contoh, dan simpan rahasia melalui environment deployment.

## Acuan implementasi

- FastAPI OAuth2/JWT: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
- Prisma CLI versi 6 dipatok dalam paket; dokumentasi migrate: https://docs.prisma.io/docs/orm/reference/prisma-cli-reference
- SQLAlchemy Session: https://docs.sqlalchemy.org/en/20/orm/session_basics.html
- SQLAlchemy ORM SELECT: https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html

## Penyesuaian proposal dan mockup

`/ui/config` menyediakan contact/guide opsional, locale yang dikenali, serta flag hearts/password-reset/chatbot yang saat ini `false`. Hearts belum memiliki aturan dalam proposal, reset password belum memiliki layanan email, dan chatbot ditunda. Preferensi locale/theme hanya disimpan, belum menerjemahkan atau merender UI. `ADMIN_EMAIL` hanya berlaku ketika bootstrap membuat akun baru; username tetap mendukung admin lama.

Topik PP, ASB, PRS disiapkan oleh migrasi. Kepanjangan ASB/PRS belum didefinisikan sehingga namanya tidak diasumsikan; admin dapat menggantinya. Jumlah level dan materi berasal dari konten terbit, bukan angka 10/30 yang di-hardcode dari mockup. Konten final, video/PDF/gambar, dan 30 level pembelajaran belum diisi otomatis.

Sertifikat menyatakan penyelesaian pembelajaran, tanpa tanda tangan PMI atau klaim kompetensi profesi. Nama/judul/nilai tersimpan saat penerbitan pertama dan tidak berubah ketika profil/soal diedit. Download hanya untuk pemilik dengan Bearer token. Tidak ada verifikasi publik. Katalog tidak mengekspos isi atau URL media; detail memeriksa akses level. URL media eksternal sendiri harus dikelola penyedia dengan kontrol akses bila kontennya privat.
