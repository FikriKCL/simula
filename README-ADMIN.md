> Pembaruan 22 November 2026: gunakan `README-ADMIN-TERBARU.md` di root paket untuk integrasi desain admin terbaru, revisi materi terbit, dan gambar soal.

# SIMULA — integrasi admin

Pembaruan 15 November 2026. Paket ini menggabungkan frontend/backend hasil integrasi sebelumnya dengan tampilan admin dari `admin.zip`. Direktori admin berada di `frontend/app/admin`, bukan aplikasi terpisah. Halaman diakses pada `/admin` dan menggunakan login serta token yang sama dengan situs siswa.

## Memasang pembaruan

Gunakan frontend dan backend dari paket ini bersama-sama. Pertahankan `.env` backend dan `.env.local` frontend milikmu; jangan menimpanya dengan template. Simpan juga direktori upload jika sudah ada. File konfigurasi rahasia dan data database tidak disertakan dalam ZIP.

Terminal backend, setelah virtual environment aktif:

```powershell
cd backend
python -m pip install -r requirements.txt
docker compose up -d db
docker compose run --rm migrate
python -m app.bootstrap
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Sebelum bootstrap, isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` di `.env`. `ADMIN_PASSWORD` minimal 10 karakter, maksimal 128, dan tidak boleh memakai placeholder `replace-...`. `ADMIN_EMAIL` opsional. Bootstrap tidak mengganti password atau role akun yang sudah memakai username yang sama. Tidak ada password admin bawaan; `demo_student` dan `demo_teacher` bukan admin.

Terminal frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Jika SWC native Windows/Turbopack masih gagal, gunakan `npm run dev -- --webpack`. Buka http://localhost:3000/login dan masuk dengan akun admin. Setelah login, akun ber-role `ADMIN` diarahkan ke `/admin`; siswa tetap ke `/dashboard`. Siswa yang membuka `/admin` ditolak, dan seluruh endpoint admin juga memverifikasi role di backend.

Untuk database demo baru, `python -m app.seed` tetap tersedia. Tidak perlu seed ulang untuk memakai admin pada database yang sudah terisi.

## Konfigurasi database dan jaringan

```dotenv
DATABASE_URL=postgresql://simula:simula_dev_password@127.0.0.1:5433/simula?schema=public
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
REGISTRATION_APPROVAL_REQUIRED=false
```

`frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Python Windows memakai `127.0.0.1:5433`; container Compose memakai `db:5432`. Untuk akses melalui IP jaringan, masukkan origin frontend yang persis sama ke `CORS_ORIGINS` dan gunakan alamat backend yang dapat dijangkau browser pada `NEXT_PUBLIC_API_URL`. Bila backend perlu menerima perangkat lain, jalankan Uvicorn dengan `--host 0.0.0.0`. Restart kedua server setelah mengubah konfigurasi.

## Fitur yang disambungkan

| Tab / fitur | Perilaku |
|---|---|
| Dashboard | Jumlah siswa, akun menunggu, materi, soal aktif, modul terbit; pencarian dan pagination anggota |
| Progres anggota | Persentase pelajaran terbit yang selesai per topik PP/ASB/PRS dan keseluruhan |
| Aktivitas terakhir | Aktivitas materi, penyelesaian pelajaran, atau pengiriman tes terakhir; bukan waktu login |
| Pendaftaran | Daftar siswa berdasarkan status; terima atau tolak/nonaktifkan akun |
| Materi | Pilih modul/pelajaran, lihat materi draft dan terbit, tambah/ubah/hapus materi yang dapat diedit |
| Artikel | Teks panjang Markdown, thumbnail komponen, urutan, dan status wajib |
| Komik | Gambar per halaman, narasi, alt text, urutan halaman, upload atau URL gambar |
| Video | Provider YouTube/Vimeo, ID video, transkrip, durasi; bukan input iframe mentah |
| Struktur belajar | Tambah modul dan pelajaran; ajukan peninjauan; setujui/tolak modul dari pembuat lain |
| Soal | Pilih kuis PRE/POST, tambah/ubah pertanyaan dan jawaban benar, arsipkan/aktifkan soal |

Tidak ada import `mockData` atau perubahan yang hanya disimpan pada state lokal. Form ditutup setelah API menyatakan penyimpanan berhasil. Loading, error, retry, daftar kosong, dan konfirmasi tindakan ditampilkan di UI.

## Persetujuan pendaftaran

Migration baru `20261115000000_admin_accounts` menambahkan `User.registration_status`:

- `PENDING`: menunggu peninjauan.
- `APPROVED`: disetujui.
- `REJECTED`: ditolak.

Semua akun lama tetap `APPROVED`. Default `REGISTRATION_APPROVAL_REQUIRED=false` mempertahankan perilaku register lama: siswa baru langsung disetujui. Untuk mengaktifkan antrean pada **registrasi publik baru**, set:

```dotenv
REGISTRATION_APPROVAL_REQUIRED=true
```

Restart backend. Registrasi melalui `POST /api/v1/auth/register` kini menghasilkan akun `PENDING` dan akun tersebut belum dapat login. Admin menerima akun melalui tab Pendaftaran. Penolakan menonaktifkan akun dan backend menolak pemakaian tokennya pada request berikutnya. Persetujuan ulang mengaktifkan kembali akun; pengguna perlu login ulang.

Mengubah flag tidak memindahkan akun lama ke antrean. Pembuatan staf melalui admin/bootstrap tidak memerlukan antrean. Halaman register frontend tetap belum dibuat; endpoint register tersedia pada Swagger.

## Menambah dan menerbitkan materi

1. Masuk tab Materi, lalu tambah modul pada topik dan level yang belum dipakai.
2. Pilih modul baru berstatus `DRAFT`, lalu tambah pelajaran.
3. Pilih pelajaran dan tambah artikel/komik/video. Isi judul, body/transkrip, urutan, ilustrasi thumbnail, dan kebutuhan selesai.
4. Untuk komik, tambahkan gambar melalui upload atau URL HTTP/HTTPS lengkap. Lengkapi alt text dan atur urutan halaman.
5. Tambahkan kuis melalui tab Soal bila dibutuhkan.
6. Klik **Ajukan peninjauan** pada modul. Status berubah `PENDING`.
7. Akun admin lain yang bukan pembuat meninjau lalu memilih **Setujui & terbitkan** atau **Tolak modul**.
8. Setelah terbit, materi muncul di katalog siswa sesuai aturan kunci level. Jika ditolak, pembuat/admin dapat mengubahnya kembali lalu mengajukan ulang.

Aturan backend lama tetap berlaku: isi modul `PUBLISHED`/`PENDING` tidak dapat diubah langsung. Tombol edit/hapus dinonaktifkan pada UI untuk kondisi tersebut. Jangan mengubah status database secara manual untuk melewati aturan ini. Modul lama yang sudah terbit tetap dapat dibaca siswa.

Untuk membuat akun admin peninjau kedua, admin dapat memakai `POST /api/v1/admin/users` di Swagger dengan role `ADMIN`, username baru, display name, dan password yang dipilih sendiri. Akun `REVIEWER` dapat meninjau melalui endpoint review di Swagger, tetapi halaman `/admin` pada pembaruan ini khusus role `ADMIN`.

## Bank soal

Backend menyimpan pertanyaan, 2–6 opsi teks, indeks jawaban benar, pembahasan, dan status aktif. Benar/salah dapat dibuat memakai dua opsi teks. Tipe soal bergambar, cocokkan, dan urutkan pada mockup belum didukung skema/grader; kontrol tersebut tidak ditampilkan sebagai fitur yang seolah-olah sudah bekerja.

Untuk kuis baru, modul harus `DRAFT`/`REJECTED` dan soal pertama dibuat bersamaan dengan kuis. Setelah itu gunakan bank soal untuk menambah soal lain. Maksimal 50 soal aktif per kuis sesuai backend.

Tindakan hapus pada bank soal menjadi **Arsipkan**. Soal arsip tidak masuk ke kuis/run baru; snapshot run yang sudah dimulai dan riwayat hasil sebelumnya tetap dipertahankan. Soal dapat diaktifkan kembali. Penilaian tetap dilakukan backend, bukan frontend.

## Upload gambar

Endpoint `POST /api/v1/admin/uploads/images` hanya untuk admin. Format PNG/JPEG/WebP, maksimal 10 MB dan 20 megapiksel. Server membaca gambar dan menyimpannya ulang sebagai WebP dengan nama acak. File HTML/SVG atau file yang hanya mengganti ekstensi ditolak.

- Python lokal: default folder `backend/uploads`; dapat diubah melalui `UPLOAD_DIR`.
- Docker: `UPLOAD_DIR=/data/uploads` dan named volume `simula_uploads` sudah disiapkan pada Compose.
- Gambar dilayani publik pada `/uploads/{nama-file}` karena dipakai pembaca komik siswa.
- Database menyimpan URL gambar, bukan binary-nya. Frontend membentuk URL dari alamat API yang dikonfigurasi.

Jangan gunakan fasilitas ini untuk dokumen privat. Menghapus halaman komik/materi belum membersihkan file gambar fisik; file yang sudah diupload tetapi form dibatalkan juga tetap ada. Backup database dan direktori/volume upload secara bersama. `docker compose down -v` dapat menghapus volume database serta upload.

## Endpoint tambahan

Semua memakai prefix `/api/v1` dan role `ADMIN`:

| Method | Endpoint | Kegunaan |
|---|---|---|
| GET | `/admin/overview` | Statistik dashboard |
| GET | `/admin/members?q=&limit=20&offset=0` | Progres anggota dan aktivitas belajar terakhir |
| GET | `/admin/registrations?status=PENDING&q=&limit=20&offset=0` | Daftar akun siswa |
| PATCH | `/admin/registrations/{uid}` | Body `{ "status": "APPROVED" }` atau `REJECTED` |
| GET | `/admin/content` | Metadata topik, modul, pelajaran, kuis termasuk draft |
| GET | `/admin/lessons/{lid}/materials?limit=20&offset=0` | Daftar materi pelajaran untuk pengelolaan |
| POST | `/admin/uploads/images` | Multipart field `file` |

UI juga menggunakan endpoint pengelolaan materi, modul, pelajaran, kuis, dan bank soal yang sebelumnya tersedia. Tidak ada endpoint privat baru yang dapat diakses siswa atau tanpa login. Respons daftar akun menggunakan daftar field yang diizinkan dan tidak menyertakan `password_hash`.

## Verifikasi

- Frontend: TypeScript, ESLint, dan production build diperiksa.
- Backend: **27 passed, 9 skipped**. Suite portabel ditambah uji admin untuk kontrol akses, antrean registrasi, approve/reject, persistensi materi, publikasi, bank soal, dan upload.
- Empat migration SQL berhasil diterapkan pada PostgreSQL 16 dalam single-user mode; Prisma schema valid.
- Suite PostgreSQL server tetap membutuhkan `TEST_DATABASE_URL` ke database disposable `simula_test`.
- Pengujian API memakai FastAPI TestClient dan SQLite in-memory untuk alur portabel. Ini tidak menggantikan uji concurrency PostgreSQL atau interaksi browser penuh pada komputer pengguna.
