# SIMULA — integrasi frontend dan backend

Paket ini berisi frontend Next.js dan backend FastAPI yang sudah disambungkan untuk login, profil, katalog materi, pembelajaran, kuis, progres, XP, lencana, dan sertifikat. Desain halaman utama dipertahankan. Backend mengakses PostgreSQL dengan SQLAlchemy; migration skema dikelola Prisma.

## Menjalankan di Windows PowerShell

Ekstrak ZIP. Gunakan folder `backend` dan `frontend` dari paket yang sama. Salin konfigurasi lama milikmu bila sudah ada; `.env` berisi rahasia tidak disertakan dalam paket ini.

### 1. Backend dan database

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Masukkan hasil perintah terakhir sebagai `JWT_SECRET` di `.env`. Jangan gunakan nilai `replace-...`. Jika `.env` lama sudah ada, pertahankan file tersebut dan sesuaikan nilainya. Contoh konfigurasi database sesuai Compose:

```dotenv
DATABASE_URL=postgresql://simula:simula_dev_password@127.0.0.1:5433/simula?schema=public
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
DEMO_PASSWORD=SimulaDemo2026!
DEMO_ASSET_BASE_URL=http://localhost:8000
```

Pastikan Docker Desktop Linux Engine sudah aktif. Jalankan:

```powershell
docker compose up -d db
docker compose run --rm migrate
python -m app.seed
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Alternatif migration tanpa container Node: `npm ci` lalu `npm run db:deploy` dari folder backend. Jika memakai PostgreSQL sendiri, sesuaikan `DATABASE_URL` dan jalankan migration menggunakan alternatif tersebut. API tersedia di http://localhost:8000/docs.

Migration baru `20261112000000_article_materials` menambahkan kolom materi tanpa menghapus data lama. Jangan memakai `migrate reset` untuk database yang sudah berisi data. Bila tabel sudah dibuat manual tanpa riwayat Prisma, lakukan baseline sesuai kondisi database sebelum menjalankan deployment migration.

### 2. Frontend (terminal kedua)

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

`.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Buka http://localhost:3000/login. Akun siswa: **demo_student**, password **SimulaDemo2026!**, kecuali `DEMO_PASSWORD` diubah sebelum seed pertama. Akun pengajar: `demo_teacher`, password sama. Tidak ada auto-login atau token yang ditanam dalam frontend. Sesi disimpan pada sessionStorage per tab dan meminta login ulang setelah token kedaluwarsa.

`DEMO_ASSET_BASE_URL` perlu sesuai alamat backend yang dapat dijangkau browser. Ganti sebelum seed pertama bila menguji dari perangkat lain. File contoh komik dilayani backend pada `/static/demo/`. Video contoh memakai YouTube dan memerlukan internet serta ketersediaan video dari provider.

## Data dummy

Pada database kosong (yang sudah dimigrasi), seed menambahkan:

| Data | Jumlah |
|---|---:|
| Sekolah | 1 |
| Akun | 2 |
| Topik | 3 |
| Modul / level | 9 |
| Pelajaran | 9 |
| Artikel | 9 |
| Komik | 9 |
| Video embed | 9 |
| Kuis (PRE + POST) | 18 |
| Soal | 54 |
| Lencana | 9 |

Seed dapat dijalankan ulang. Ia mencari data berdasarkan identitas/natural key dan menambahkan yang belum ada, tanpa mereset password akun, jawaban, progres, atau profil yang sudah diubah. Modul nyata dengan topik/level yang sama dilewati; jumlah tambahan dapat lebih kecil pada database yang sudah berisi data. Nama akun berawalan `demo_` dicadangkan untuk seed.

Konten dummy ditandai sebagai contoh untuk menguji aplikasi. Video adalah contoh pemutar, bukan materi kurikulum. Komik menggunakan dua ilustrasi SVG lokal. Progres, nilai, dan lencana tidak dipalsukan; semuanya diperoleh saat akun siswa benar-benar menyelesaikan alur.

## Struktur materi baru

| Field | Penyimpanan / kegunaan |
|---|---|
| `kind` | `ARTICLE`, `COMIC`, `VIDEO`; `PDF` lama tetap kompatibel |
| `body` | PostgreSQL `TEXT`, Markdown untuk artikel; API menerima hingga 1.000.000 karakter |
| `thumbnail_key` | `plaster`, `kit`, `hand`, `heart`, `roll`; memilih ilustrasi komponen frontend |
| `pages` | JSONB array halaman komik; urutan array adalah urutan baca; `image_url`, `alt`, `text` |
| `video_provider` | `youtube` atau `vimeo` |
| `video_id` | ID video yang divalidasi; frontend membentuk URL iframe dari provider yang diizinkan |
| `url` | Kompatibilitas URL materi/video lama; bukan HTML iframe mentah |
| `required` | Materi wajib yang harus selesai sebelum pelajaran bisa diselesaikan |

Komponen thumbnail, warna, dan JSX tetap di frontend. Artikel tidak memerlukan file PDF. Halaman komik berupa referensi gambar, bukan binary dalam database. HTML mentah artikel tidak dieksekusi; pembaca memakai renderer Markdown React yang sudah ada.

## Alur mencoba fitur

1. Masuk sebagai `demo_student`.
2. Dashboard mengambil topik dan status level dari `/learning/path`.
3. Pilih level pertama. Halaman modul mengambil pelajaran dan daftar materi dari API.
4. Buka artikel dan komik, lalu tekan **Tandai selesai** pada masing-masing. Video dummy bersifat opsional.
5. Kembali ke modul dan tekan **Selesaikan pelajaran**. Server memeriksa materi wajib, lalu memberikan XP satu kali.
6. Kerjakan tes akhir. Pertanyaan dan opsi berasal dari backend; jawaban benar tidak dikirim sebelum penilaian. Sistem memakai quiz run snapshot, menolak pengiriman ulang dan sesi kedaluwarsa.
7. Setelah lulus, profil menampilkan XP, progres, lencana, serta sertifikat yang dapat diunduh. Level berikutnya terbuka berdasarkan aturan backend.
8. Ubah nama melalui **Ubah Profil**, muat ulang, dan pastikan hasilnya tersimpan.

## Endpoint yang disambungkan

| Fitur | Endpoint `/api/v1` |
|---|---|
| Login | `POST /auth/login` |
| Pemeriksaan sesi | `GET /users/me` |
| Profil, statistik, lencana | `GET /users/me/summary` |
| Ubah profil | `PATCH /users/me` |
| Katalog + pencarian + filter + pagination | `GET /materials?q=...&kind=...&module_id=...&limit=100&offset=0` |
| Detail / membuka / selesai materi | `GET /materials/{id}`, `POST /materials/{id}/open`, `POST /materials/{id}/complete` |
| Jalur level | `GET /learning/path` |
| Modul dan pelajaran | `GET /modules/{id}` |
| Progres / selesai pelajaran | `GET /learning/progress`, `POST /lessons/{id}/complete` |
| Mulai / kirim tes | `POST /quizzes/{id}/runs`, `POST /quizzes/{id}/runs/{run_id}/submit` |
| Sertifikat | `GET /certificates`, `GET /certificates/{id}/download` |

Frontend menampilkan loading, error dengan tombol coba lagi, daftar kosong, dan materi terkunci. Pesan kesalahan backend ditampilkan tanpa mengganti data gagal dengan data dummy lokal. Pencarian dan filter katalog dilakukan di backend. Indikator nyawa statis dihapus karena backend belum memiliki fitur tersebut.

## Verifikasi

- Frontend: TypeScript dan production build berhasil; ESLint bersih.
- Backend: `python -m pytest -q` menghasilkan **23 passed, 9 skipped**.
- Pengujian integrasi baru memakai SQLite in-memory + FastAPI TestClient: seed berulang, profil, filter materi, kunci level, penyelesaian materi/pelajaran, penilaian snapshot, XP idempotent, lencana, dan PDF sertifikat.
- Seluruh migration SQL berhasil dijalankan pada PostgreSQL 16 dalam single-user mode; bentuk data seed juga berhasil dimasukkan, dengan 2 akun, 27 materi, dan 54 soal.
- Sembilan pengujian lama yang memerlukan koneksi PostgreSQL server dilewati karena `TEST_DATABASE_URL` tidak tersedia. Pengujian ini tidak menggantikan verifikasi locking/concurrency PostgreSQL.
- Belum dilakukan pengujian interaksi browser secara penuh atau akses ke database di komputer pengguna.

Untuk menjalankan suite PostgreSQL, sediakan database disposable bernama `simula_test`, terapkan migration pada database itu, set `TEST_DATABASE_URL`, lalu jalankan `pip install -r requirements-dev.txt` dan `python -m pytest -q`. Fixture pengujian menghapus data dalam database test tersebut.

## Batas pekerjaan

Website admin dan upload/editor konten belum dibuat. Endpoint pengelolaan yang sebelumnya ada tetap tersedia sesuai role. Chatbot dan integrasi AI sebelumnya dipertahankan; pengujian ini berfokus pada pembelajaran, bukan validasi Gemini atau knowledge base yang tidak disertakan dalam ZIP. Data materi sesungguhnya dan video kurikulum perlu menggantikan contoh setelah konten tersedia.
