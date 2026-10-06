# SIMULA — Sistem Pembelajaran PMR Mula

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

**SIMULA** adalah platform pembelajaran kepalangmerahan digital untuk anggota Palang Merah Remaja (PMR) tingkat Mula. Platform ini mengusung sistem pembelajaran interaktif bertingkat (*gamified learning path*), modul materi multimedia (teks, PDF, video, dan komik interaktif), sistem kuis (pre-test & post-test berbatas waktu), perolehan XP dan lencana (*badges*), penerbitan sertifikat kelulusan digital (PDF), serta pencarian materi cerdas.

---

## 📑 Daftar Isi

- [Arsitektur & Struktur Direktori](#-arsitektur--struktur-direktori)
- [Tech Stack](#-tech-stack)
- [Prasyarat Sistem (Prerequisites)](#-prasyarat-sistem-prerequisites)
- [Panduan Setup & Instalasi](#-panduan-setup--instalasi)
  - [1. Menjalankan Database PostgreSQL](#1-menjalankan-database-postgresql)
  - [2. Setup & Menjalankan Backend (FastAPI)](#2-setup--menjalankan-backend-fastapi)
  - [3. Setup & Menjalankan Frontend (Next.js)](#3-setup--menjalankan-frontend-nextjs)
- [Opsi Alternatif: Full Docker Compose](#-opsi-alternatif-full-docker-compose)
- [Konfigurasi Environment Variable (`.env`)](#-konfigurasi-environment-variable-env)
- [Fitur AI Chatbot (RAG & Guardrail)](#-fitur-ai-chatbot-rag--guardrail)
- [Alur Akses & Pengujian API](#-alur-akses--pengujian-api)
- [Menjalankan Automated Tests](#-menjalankan-automated-tests)
- [Tips & Troubleshooting (Windows)](#-tips--troubleshooting-windows)

---

## 🏛️ Arsitektur & Struktur Direktori

Repositori ini menggunakan arsitektur monorepo modular:

```text
simula/
├── backend/                  # REST API Backend (FastAPI + SQLAlchemy + Prisma)
│   ├── app/                  # Logika aplikasi (routers, services, models, schemas)
│   │   ├── api/v1/           # Endpoint auth, users, modules, learning, quizzes, chat, dll.
│   │   ├── models/           # SQLAlchemy 2.0 ORM Declarative Models (17 tabel)
│   │   ├── schemas/          # Pydantic Schemas untuk validasi I/O
│   │   ├── services/         # Business logic layer (transactional)
│   │   │   └── rag_service.py# Mesin RAG cerdas (vector search & Gemini guardrails)
│   │   ├── bootstrap.py      # Script pembuat akun initial admin
│   │   ├── config.py         # Konfigurasi Pydantic Settings & environment
│   │   └── database.py       # Engine & Session factory SQLAlchemy
│   ├── prisma/               # Single Source of Truth skema & migrasi database
│   │   ├── schema.prisma     # Definisi skema tabel
│   │   └── migrations/       # Riwayat migrasi SQL
│   ├── tests/                # Unit test, validasi keamanan, dan integrasi
│   ├── .env.example          # Template environment variable backend
│   ├── compose.yaml          # Konfigurasi Docker Compose (db pgvector, migrate, api)
│   ├── Dockerfile            # Container definition untuk API
│   ├── package.json          # Node dependencies untuk Prisma CLI
│   └── requirements.txt      # Python dependencies utama
├── frontend/                 # Web Application (Next.js App Router)
│   ├── app/                  # Route pages, layouts, dan komponen Next.js
│   │   ├── api/chat/         # Next.js API Route proxy ke RAG backend
│   │   ├── page.tsx          # Playground UI Chatbot interaktif bertema Palang Merah
│   │   └── layout.tsx        # Root layout & styling
│   ├── public/               # Static assets & SVG icons
│   ├── package.json          # Node dependencies untuk Next.js & Tailwind CSS
│   └── tsconfig.json         # Konfigurasi TypeScript
├── chatbot/                  # Pipeline Data & RAG Engine Kepalangmerahan
│   ├── data/                 # Modul asli kurikulum PMI (PDF)
│   ├── processed/            # Hasil ekstraksi Markdown & knowledge_base.json (236 Chunks)
│   ├── chunk_and_embed.py    # Pipeline pemotongan & embedding teks via Gemini
│   ├── test_rag.py           # Script pengujian mandiri di terminal
│   ├── seed_pgvector.py      # Seeding data materi ke PostgreSQL (pgvector)
│   └── requirements.txt      # Dependensi khusus modul chatbot
└── README.md                 # Dokumentasi utama proyek
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI 0.115](https://fastapi.tiangolo.com/) (Python Asynchronous REST API)
- **Runtime ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/) dengan driver `psycopg` (psycopg 3)
- **Database Migrations**: [Prisma ORM 6.19](https://www.prisma.io/) (digunakan sebagai *single schema source* & migration tool)
- **Database Engine**: [PostgreSQL 16](https://www.postgresql.org/)
- **Otentikasi & Keamanan**: Argon2 password hashing (`pwdlib[argon2]`), PyJWT (JSON Web Token), OAuth2 Password Bearer
- **Dokumen Generator**: ReportLab (penerbitan sertifikat kelulusan dalam format PDF privat)

### Frontend
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Bahasa**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)

---

## 📋 Prasyarat Sistem (Prerequisites)

Sebelum memulai, pastikan perangkat Anda telah terpasang perangkat lunak berikut:

| Software | Versi Minimum | Rekomendasi | Catatan Khusus |
|---|---|---|---|
| **Python** | `3.11.x` | `Python 3.11.9` | ⚠️ *Hindari Python 3.14 untuk saat ini karena beberapa binary wheel library C (Argon2/psycopg) belum stabil.* |
| **Node.js** | `v20.x` / `v22.x` | `v22 LTS` atau `v24` | Dibutuhkan untuk Prisma CLI di backend dan Next.js di frontend. |
| **npm** | `v10.x`+ | `v11.x` | Package manager bawaan Node.js. |
| **Docker Desktop** | Terbaru | Docker Engine aktif | Direkomendasikan untuk menjalankan instance PostgreSQL 16 secara instan dan terisolasi. |
| **Git** | `2.x`+ | Terbaru | Untuk version control. |

---

## 🚀 Panduan Setup & Instalasi

Langkah-langkah berikut direkomendasikan untuk mode pengembangan (*development mode*): **Database berjalan di Docker**, sedangkan **Backend** dan **Frontend** dijalankan di host lokal untuk kemudahan debugging dan hot-reloading.

### 1. Menjalankan Database PostgreSQL

1. Buka aplikasi **Docker Desktop** di komputer Anda dan pastikan statusnya sudah **Running**.
2. Buka terminal (PowerShell atau Bash) dan masuk ke direktori `backend`:
   ```powershell
   cd simula/backend
   ```
3. Jalankan container PostgreSQL:
   ```powershell
   docker compose up -d db
   ```
   *Container PostgreSQL akan aktif di background pada port `5432` dengan user `simula` dan database `simula`.*

---

### 2. Setup & Menjalankan Backend (FastAPI)

Pastikan Anda masih berada di dalam direktori `simula/backend`:

#### A. Salin File Environment
```powershell
Copy-Item .env.example .env
```
*(Untuk Linux/macOS: `cp .env.example .env`)*

#### B. Generate Secret Key & Konfigurasi `.env`
1. Jalankan perintah berikut untuk menghasilkan JWT Secret acak:
   ```powershell
   py -3.11 -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
2. Buka file `.env` dengan teks editor, lalu sesuaikan nilai berikut:
   ```env
   DATABASE_URL=postgresql://simula:simula_dev_password@localhost:5432/simula?schema=public
   JWT_SECRET=<TEMPEL_HASIL_TOKEN_DARI_LANGKAH_SEBELUMNYA>
   ACCESS_TOKEN_MINUTES=30
   CORS_ORIGINS=["http://localhost:3000"]
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=PasswordAdminKuat123!
   ```
   > [!IMPORTANT]
   > Nilai `JWT_SECRET` dan `ADMIN_PASSWORD` **TIDAK BOLEH** diawali dengan kata `replace-`. Backend memiliki validasi otomatis yang akan menolak startup jika masih menggunakan nilai placeholder.

#### C. Deploy Migrasi Database (Prisma)
Install dependensi Prisma dan terapkan migrasi skema tabel ke PostgreSQL:
```powershell
npm ci
npm run db:deploy
```

#### D. Buat Python Virtual Environment & Install Dependensi
Gunakan Python 3.11:
```powershell
# Membuat virtual environment bernama .venv
py -3.11 -m venv .venv

# Upgrade pip & install requirements
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
*(Di Linux/macOS: `python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`)*

#### E. Buat Akun Administrator Pertama
Jalankan script bootstrap untuk membuat akun admin awal ke database:
```powershell
.\.venv\Scripts\python.exe -m app.bootstrap
```
*Output yang diharapkan: `Admin dibuat` (atau `Username sudah ada; akun tidak diubah`).*

#### F. Jalankan Backend Server
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API aktif di: **`http://localhost:8000`**
- Dokumentasi Interaktif (Swagger UI): **`http://localhost:8000/docs`**
- Dokumentasi Alternatif (ReDoc): **`http://localhost:8000/redoc`**
- Health Check: **`http://localhost:8000/health/live`**

---

### 3. Setup & Menjalankan Frontend (Next.js)

1. Buka jendela terminal baru, lalu arahkan ke direktori `frontend`:
   ```powershell
   cd simula/frontend
   ```
2. Install dependensi Node.js:
   ```powershell
   npm install
   ```
3. Jalankan server development:
   ```powershell
   npm run dev
   ```
4. Buka browser dan akses:
   👉 **`http://localhost:3000`**

---

## 🐳 Opsi Alternatif: Full Docker Compose

Jika Anda ingin menjalankan seluruh backend (Database PostgreSQL, Migrasi Skema Prisma, dan Web API FastAPI) dalam container Docker secara otomatis:

```powershell
cd simula/backend

# 1. Siapkan file .env
Copy-Item .env.example .env
# Edit .env dan masukkan JWT_SECRET serta ADMIN_PASSWORD yang valid

# 2. Build dan jalankan seluruh container
docker compose up --build -d

# 3. Jalankan bootstrap admin di dalam container API
docker compose exec api python -m app.bootstrap
```

- Untuk melihat log container API: `docker compose logs -f api`
- Untuk mematikan layanan tanpa menghapus data database: `docker compose down`

---

## ⚙️ Konfigurasi Environment Variable (`.env`)

Konfigurasi backend disimpan di file `backend/.env`. Berikut rincian parameternya:

| Variabel | Tipe | Default / Contoh | Deskripsi |
|---|---|---|---|
| `DATABASE_URL` | String | `postgresql://simula:simula_dev_password@localhost:5432/simula?schema=public` | Connection string PostgreSQL. |
| `JWT_SECRET` | String | *(Wajib diisi acak)* | Kunci rahasia enkripsi JWT (minimal 32 karakter acak). |
| `ACCESS_TOKEN_MINUTES` | Integer | `30` | Durasi masa berlaku token login (1 - 1440 menit). |
| `CORS_ORIGINS` | JSON Array | `["http://localhost:3000"]` | Daftar domain frontend yang diizinkan mengakses API. |
| `ADMIN_USERNAME` | String | `admin` | Username awal akun admin (3-40 karakter alfanumerik/underscore). |
| `ADMIN_PASSWORD` | String | *(Wajib diisi acak)* | Password awal admin (10-128 karakter). |
| `ADMIN_EMAIL` | String | *(Opsional)* | Alamat email terdaftar untuk admin. |
| `CONTACT_EMAIL` | String | *(Opsional)* | Email dukungan publik untuk aplikasi. |
| `GUIDE_URL` | String | *(Opsional)* | Tautan dokumen panduan belajar eksternal. |
| `GEMINI_API_KEY` | String | *(Wajib untuk RAG)* | API Key Google Gemini (didapat gratis di [Google AI Studio](https://aistudio.google.com)). |

---

## 🤖 Fitur AI Chatbot (RAG & Guardrail)

SIMULA dilengkapi dengan fitur **Chatbot AI Berpagar (*Retrieval-Augmented Generation*)** yang dirancang khusus untuk menjawab pertanyaan seputar materi kepalangmerahan PMR/PMI secara akurat dan anti-halusinasi.

### 📚 Modul Materi Pembelajaran Terverifikasi
Seluruh basis pengetahuan AI diindeks dari **3 dokumen resmi PMI**:
1. **Pertolongan Pertama (PP Mula)**: Luka, Pendarahan, Patah Tulang, Pingsan, Syok, dll.
2. **Kesiapsiagaan Bencana (Ayo Siaga Mula)**: Gempa Bumi, Banjir, Tsunami, Longsor, Kebakaran, Evakuasi.
3. **Pelatihan Remaja Sebaya (PRS PMI)**: Tumbuh Kembang Remaja, Kesehatan Reproduksi, Potensi Diri.

Materi telah diproses menjadi **236 potongan teks (*chunks*)** dan di-embed ke dalam vektor 768-dimensi (`gemini-embedding-001`), tersimpan di `chatbot/processed/knowledge_base.json`.

### 🛡️ 2 Lapis Pengaman (*Strict Guardrails*)
- **Lapis 1 (Similarity Threshold)**: Jika pertanyaan pengguna tidak mirip dengan materi kepalangmerahan (skor kosinus di bawah batas), bot langsung menolak tanpa memanggil LLM (hemat API & anti-halusinasi).
- **Lapis 2 (Strict Grounded Instruction)**: Model LLM (`gemini-3.5-flash-lite`) dipandu agar **HANYA** menjawab dari materi yang dilampirkan dan menyertakan rujukan nama modul/bab di akhir jawaban.

### 🧪 Cara Menjalankan & Menguji Fitur Chatbot:

#### 1. Uji Coba Cepat via Terminal (Tanpa Browser):
```powershell
# Dari direktori simula (pastikan venv aktif):
.\backend\.venv\Scripts\Activate.ps1
python chatbot/test_rag.py
```

#### 2. Interaksi Langsung via Web UI Playground:
1. Pastikan backend berjalan: `uvicorn app.main:app --port 8000` (di folder `backend`)
2. Pastikan frontend berjalan: `npm run dev` (di folder `frontend`)
3. Buka browser: **`http://localhost:3000`**
4. Anda dapat langsung mengklik contoh pertanyaan cepat di sidebar (Pertolongan Pertama, Siaga Bencana, Kesehatan Remaja, atau Guardrail Luar Topik) atau mengetik pertanyaan bebas.

#### 3. Sinkronisasi Data ke PostgreSQL (`pgvector`):
Jika database PostgreSQL aktif di Docker dan Anda ingin mengindeks seluruh 236 materi vektor ke tabel `document_chunks`:
```powershell
python chatbot/seed_pgvector.py
```

---

## 🔑 Alur Akses & Pengujian API

Anda dapat langsung mencoba alur kerja sistem melalui **Swagger UI** di `http://localhost:8000/docs`:

1. **Login Admin**:
   - Klik tombol **Authorize** di pojok kanan atas Swagger, masukkan username `admin` dan password yang telah Anda buat di `.env`.
   - Atau panggil `POST /api/v1/auth/login`.
2. **Manajemen Pengguna & Sekolah**:
   - Buat sekolah via `POST /api/v1/schools`.
   - Daftarkan akun instruktur / reviewer via `POST /api/v1/admin/users` dengan role `INSTRUCTOR` atau `REVIEWER`.
3. **Penyusunan Modul & Materi (Instructor)**:
   - Buat modul via `POST /api/v1/modules` (status awal: `DRAFT`).
   - Tambahkan materi teks/media via `POST /api/v1/modules/{id}/lessons`.
   - Buat bank soal dan kuis via `POST /api/v1/modules/{id}/quizzes`.
   - Ajukan review materi via `POST /api/v1/modules/{id}/submit-review`.
4. **Validasi Materi (Reviewer/Admin)**:
   - Reviewer memeriksa modul dan menyetujui via `POST /api/v1/modules/{id}/review` (status menjadi `PUBLISHED`).
   - *(Catatan: Pembuat modul tidak dapat memvalidasi modulnya sendiri)*.
5. **Alur Belajar Siswa (Student)**:
   - Siswa melakukan registrasi akun via `POST /api/v1/auth/register`.
   - Menjelajahi katalog materi via `GET /api/v1/materials`.
   - Menyelesaikan lesson via `POST /api/v1/lessons/{id}/complete`.
   - Membuka sesi post-test 60 menit via `POST /api/v1/quizzes/{id}/runs`.
   - Mengirim jawaban via `POST /api/v1/quizzes/{id}/runs/{run_id}/submit`.
   - Mengunduh sertifikat resmi PDF via `GET /api/v1/certificates/{id}/download`.

---

## 🧪 Menjalankan Automated Tests

Backend dilengkapi dengan rangkaian pengujian otomatis (*unit tests*, *security tests*, dan *rollback tests*):

```powershell
cd simula/backend

# Install dependensi testing
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt

# Menjalankan test suite lokal
.\.venv\Scripts\python.exe -m pytest -q
```

> [!NOTE]
> Pengujian rollback transaksi ORM berjalan menggunakan SQLite terisolasi. Untuk menjalankan uji integrasi penuh pada PostgreSQL, tentukan variabel environment `TEST_DATABASE_URL` ke database pengujian khusus (misal: `simula_test`).

---

## 💡 Tips & Troubleshooting (Windows)

<details>
<summary><b>1. Error saat aktivasi venv (Activate.ps1 di-block)</b></summary>

Jika PowerShell memunculkan pesan error `execution of scripts is disabled on this system`, Anda dapat:
- Menjalankan perintah eksekusi langsung tanpa aktivasi shell:
  ```powershell
  .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
  ```
- Atau berikan izin eksekusi sementara pada sesi PowerShell Anda:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```
</details>

<details>
<summary><b>2. Konflik versi Python (Python 3.14 vs 3.11)</b></summary>

Secara default, jika Anda mengetik `python`, Windows mungkin akan memanggil versi Python tertinggi (misalnya 3.14). Selalu gunakan Windows Python Launcher dengan bendera versi eksplisit:
```powershell
py -3.11 -m venv .venv
```
</details>

<details>
<summary><b>3. Docker daemon error: "failed to connect to the docker API"</b></summary>

Pesan ini menandakan aplikasi Docker Desktop belum dibuka atau belum selesai memuat engine Linux-nya. Buka aplikasi **Docker Desktop** dari Start Menu Windows Anda dan tunggu hingga ikon Docker berwarna hijau (*Engine running*).
</details>

<details>
<summary><b>4. Error 422 / Pydantic ValidationError saat backend startup</b></summary>

Pastikan di file `backend/.env`:
- Nilai `JWT_SECRET` bukan string contoh yang diawali `replace-`.
- Nilai `ADMIN_PASSWORD` minimal 10 karakter dan bukan string contoh yang diawali `replace-`.
</details>

---

<p align="center">
  Dibuat dengan ❤️ untuk Pembelajaran Kepalangmerahan Indonesia (PMR Mula).
</p>
