# SIMULA Backend

Backend untuk aplikasi **SIMULA**, dibangun menggunakan **FastAPI** dan **PostgreSQL** dengan dukungan **pgvector**. Dokumen ini menjelaskan cara menyiapkan lingkungan lokal, menjalankan database, menjalankan API, dan memeriksa dokumentasi endpoint.

> **Catatan:** Panduan ini menggunakan struktur dan perintah yang telah diketahui dari project (`app.main:app`, `.venv`, Docker Compose service `db`, dan image `pgvector/pgvector:pg16`). Sesuaikan nama environment variable atau langkah migrasi jika konfigurasi di repository berbeda.

## Daftar Isi

- [Teknologi](#teknologi)
- [Prasyarat](#prasyarat)
- [Struktur Direktori](#struktur-direktori)
- [Instalasi](#instalasi)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Menjalankan Database](#menjalankan-database)
- [Menjalankan Backend](#menjalankan-backend)
- [Dokumentasi API](#dokumentasi-api)
- [Pengujian Koneksi](#pengujian-koneksi)
- [Menghentikan Layanan](#menghentikan-layanan)
- [Troubleshooting](#troubleshooting)

## Teknologi

- **Python** — bahasa pemrograman backend.
- **FastAPI** — framework REST API.
- **Uvicorn** — ASGI server untuk menjalankan FastAPI.
- **PostgreSQL 16** — database relasional.
- **pgvector** — ekstensi PostgreSQL untuk menyimpan dan mencari vector/embedding.
- **Docker Compose** — menjalankan database lokal.

Versi paket Python yang benar mengikuti file dependency di repository, misalnya `requirements.txt` atau `pyproject.toml`.

## Prasyarat

Pastikan perangkat sudah memiliki:

1. Windows 10/11.
2. Python versi yang sesuai dengan project.
3. Git (jika repository diambil dari GitHub).
4. Docker Desktop dengan Linux containers/engine aktif.
5. PowerShell.

Periksa instalasi:

```powershell
python --version
python -m pip --version
docker --version
docker compose version
```

Pastikan Docker Engine bisa diakses:

```powershell
docker version
```

Output seharusnya menampilkan bagian **Client** dan **Server**. Jika bagian Server gagal, buka Docker Desktop dan tunggu sampai engine berjalan sebelum melanjutkan.

## Struktur Direktori

Struktur inti yang digunakan dalam panduan ini:

```text
backend/
├── app/
│   └── main.py          # Entry point aplikasi FastAPI
├── .venv/               # Virtual environment lokal (tidak perlu di-commit)
├── .env                 # Konfigurasi lokal dan rahasia (jangan di-commit)
├── .env.example         # Template konfigurasi (jika tersedia)
├── docker-compose.yml   # Konfigurasi layanan database (jika berada di folder ini)
└── requirements.txt     # Dependency Python (jika digunakan project)
```

Direktori dan nama file aktual dapat berbeda. Gunakan file yang tersedia di repository sebagai acuan.

## Instalasi

### 1. Masuk ke folder backend

Contoh lokasi lokal:

```powershell
cd "C:\Users\<USERNAME>\Documents\.UPI Files\Semester 5\simula\backend"
```

Ganti `<USERNAME>` dengan nama folder pengguna Windows yang sesuai. Jika lokasi project berbeda, gunakan lokasi backend milikmu.

### 2. Buat virtual environment

Jika `.venv` belum tersedia:

```powershell
python -m venv .venv
```

### 3. Aktifkan virtual environment

```powershell
.\.venv\Scripts\Activate.ps1
```

Jika PowerShell memblokir aktivasi script, gunakan terminal Command Prompt atau sesuaikan Execution Policy untuk akun pengguna sesuai kebijakan perangkat. Jangan mengubah kebijakan sistem secara luas tanpa kebutuhan.

### 4. Pasang dependency

Jika repository menggunakan `requirements.txt`:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Jika dependency dikelola dengan `pyproject.toml` atau file lain, ikuti instruksi di file tersebut. Jangan memasang dependency dari beberapa metode sekaligus tanpa memeriksa konfigurasi project.

## Konfigurasi Environment

Buat file `.env` berdasarkan `.env.example` jika template tersebut tersedia:

```powershell
Copy-Item .env.example .env
```

Lalu buka `.env` dan isi nilai yang dibutuhkan untuk lingkungan lokal, terutama konfigurasi database dan email apabila digunakan aplikasi.

Contoh bentuk konfigurasi database (nama variabel hanya ilustrasi; gunakan nama yang benar-benar dibaca oleh kode project):

```dotenv
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@localhost:5432/<DB_NAME>
```

**Penting:**
- Jangan commit `.env` ke Git.
- Jangan menaruh password, token, atau kredensial asli di README.
- Pastikan host, port, nama database, username, dan password cocok dengan konfigurasi Docker Compose.
- Jangan menambahkan variabel contoh di atas jika aplikasi menggunakan nama variabel atau format koneksi yang berbeda.

## Menjalankan Database

Pastikan Docker Desktop sudah dibuka dan status engine aktif.

Dari folder yang berisi file `docker-compose.yml`, jalankan:

```powershell
docker compose up -d db
```

Periksa status container:

```powershell
docker compose ps
```

Untuk melihat log database:

```powershell
docker compose logs -f db
```

Keluar dari tampilan log dengan `Ctrl+C`. Perintah tersebut menghentikan tampilan log, bukan otomatis menghentikan container.

> Jika `docker-compose.yml` berada di root repository, jalankan perintah dari root tersebut atau tambahkan opsi `-f` dengan path file Compose yang benar.

## Menjalankan Backend

Pastikan virtual environment aktif dan terminal berada di folder backend. Jalankan:

```powershell
python -m uvicorn app.main:app --reload
```

Jika berhasil, Uvicorn biasanya menampilkan alamat lokal:

```text
http://127.0.0.1:8000
```

Biarkan terminal backend tetap terbuka selama API digunakan. Opsi `--reload` cocok untuk pengembangan lokal karena server akan memuat ulang aplikasi saat kode berubah; jangan gunakan konfigurasi pengembangan ini sebagai konfigurasi deployment production.

### Memeriksa API

Buka alamat berikut di browser:

- API lokal: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

Endpoint root `/` mungkin tidak tersedia atau memberikan respons berbeda sesuai implementasi. Gunakan `/docs` untuk melihat endpoint yang benar-benar terdaftar di aplikasi.

## Dokumentasi API

FastAPI menyediakan dokumentasi interaktif melalui:

```text
http://127.0.0.1:8000/docs
```

Di halaman Swagger UI, kamu dapat:
1. Melihat endpoint yang terdaftar.
2. Membaca parameter request dan bentuk response.
3. Mencoba endpoint menggunakan **Try it out**.
4. Melihat kode status dan response dari server.

Endpoint yang memerlukan autentikasi atau data tertentu mungkin tidak berhasil jika belum menyiapkan akun, token, atau data database.

## Pengujian Koneksi

### Periksa status database

```powershell
docker compose ps
```

### Periksa apakah port PostgreSQL dapat diakses

```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

`TcpTestSucceeded : True` menunjukkan ada layanan yang menerima koneksi TCP di port tersebut. Ini belum menjamin kredensial database atau konfigurasi aplikasi sudah benar.

### Periksa backend

Dengan server berjalan, buka:

```text
http://127.0.0.1:8000/docs
```

Jika dokumentasi API tampil, server FastAPI berhasil dimulai. Untuk memastikan integrasi database, coba endpoint yang memang melakukan query database dan periksa log backend.

## Menjalankan Frontend

Frontend Next.js dijalankan di terminal terpisah, bukan di terminal backend. Masuk ke folder frontend dan ikuti README serta konfigurasi package manager frontend yang tersedia. Pastikan URL API yang digunakan frontend mengarah ke backend lokal, sesuai nama environment variable frontend dalam project.

## Menghentikan Layanan

- Untuk menghentikan backend: tekan `Ctrl+C` di terminal Uvicorn.
- Untuk menghentikan database container:

```powershell
docker compose stop db
```

- Untuk menghentikan seluruh layanan yang dikelola file Compose aktif:

```powershell
docker compose down
```

`docker compose down` menghentikan dan menghapus container serta network yang dibuat oleh Compose, tetapi secara default tidak menghapus named volume database. **Jangan gunakan `docker compose down -v` kecuali memang ingin menghapus volume dan memahami bahwa data database lokal dapat hilang.**

## Troubleshooting

### 1. Docker tidak bisa terhubung ke Linux Engine

Contoh error:

```text
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified
```

Langkah pemeriksaan:

1. Buka Docker Desktop dan tunggu sampai engine selesai startup.
2. Jalankan `docker version`; pastikan bagian Client dan Server muncul.
3. Jika masih gagal, periksa status WSL:

   ```powershell
   wsl --status
   wsl --list --verbose
   ```

4. Jika perlu memulai ulang WSL, simpan pekerjaan terlebih dahulu, lalu jalankan:

   ```powershell
   wsl --shutdown
   ```

5. Buka kembali Docker Desktop dan tunggu engine aktif sebelum mengulang `docker compose up -d db`.

Jangan mengubah atau menghapus konfigurasi Docker/WSL sebelum mengetahui penyebab error.

### 2. Port 5432 sudah digunakan

Contoh pesan:

```text
ports are not available: exposing port TCP 127.0.0.1:5432
```

Periksa proses yang menggunakan port:

```powershell
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

Port tersebut mungkin digunakan oleh PostgreSQL lokal atau container lain. Periksa container aktif:

```powershell
docker ps
```

Jangan menghentikan proses secara sembarangan. Jika layanan PostgreSQL lain memang dibutuhkan, pertimbangkan mengubah pemetaan port host di Docker Compose dan sesuaikan connection string `.env`.

### 3. Image `pgvector/pgvector:pg16` gagal diunduh

Pastikan Docker Engine aktif dan koneksi internet tersedia. Coba tarik image secara manual:

```powershell
docker pull pgvector/pgvector:pg16
```

Jika berhasil, ulangi:

```powershell
docker compose up -d db
```

Jika gagal, baca pesan error lengkap untuk membedakan masalah jaringan, registry, atau engine.

### 4. `No module named uvicorn`

Pastikan virtual environment aktif dan instal dependency project:

```powershell
python -m pip install -r requirements.txt
```

Jika `uvicorn` memang tidak tercantum pada dependency project, periksa konfigurasi dependency terlebih dahulu. Jangan hanya mengandalkan instalasi global Python.

### 5. Error konfigurasi `.env` atau database

- Pastikan file `.env` berada di lokasi yang dibaca aplikasi.
- Cocokkan nama variabel dengan kode konfigurasi backend.
- Pastikan database container berstatus berjalan.
- Pastikan database, user, password, host, dan port benar.
- Periksa log Uvicorn dan log database untuk pesan error yang lebih spesifik.

### 6. Perintah `docker compose` tidak menemukan konfigurasi

Pastikan terminal berada di folder yang berisi `docker-compose.yml` atau `compose.yaml`. Jika file Compose berada di folder lain, pindah ke folder tersebut sebelum menjalankan perintah.

---

## Catatan Pengembangan

- Gunakan virtual environment khusus backend agar dependency Python terisolasi.
- Simpan rahasia hanya di `.env` lokal atau secret manager untuk deployment.
- Pertahankan `.env.example` tanpa nilai rahasia agar anggota tim dapat menyiapkan konfigurasi sendiri.
- Perbarui dokumentasi ini jika nama perintah startup, environment variable, migrasi database, atau struktur project berubah.
- Sebelum menjalankan migrasi atau menghapus volume database, pastikan prosedurnya sesuai konfigurasi project dan data yang perlu dipertahankan.
