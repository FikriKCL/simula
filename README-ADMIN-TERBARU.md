# Integrasi admin terbaru — desain dari admin(1).zip

Versi 22 November 2026. Paket lengkap berisi frontend Next.js dan backend FastAPI. Antarmuka admin menggunakan versi yang dikirim dalam `admin(1).zip`, dengan tabel desktop, kartu mobile, sidebar, header, ikon, tab, pagination, modal materi, dan halaman edit soal yang dipertahankan.

## Instalasi pembaruan

1. Backup pekerjaan lokal, lalu gunakan frontend dan backend dari paket ini bersama-sama.
2. Pertahankan `.env`, `.env.local`, database, dan direktori/volume upload milikmu. Jangan menimpa konfigurasi tersebut dengan template.
3. Dari folder backend dengan virtual environment aktif:

```powershell
python -m pip install -r requirements.txt
docker compose up -d db
docker compose run --rm migrate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

4. Pada terminal frontend:

```powershell
npm ci
npm run dev
```

Jika Turbopack/SWC native Windows masih bermasalah, jalankan `npm run dev -- --webpack`.

Masuk melalui `/login` memakai akun ber-role `ADMIN` yang sudah dibuat sebelumnya, lalu buka `/admin`. Jika belum punya admin, isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` pada `.env`, lalu jalankan `python -m app.bootstrap`. Bootstrap tidak mengganti akun/password yang sudah ada. Akun `demo_student` dan `demo_teacher` bukan admin.

Migration baru `20261122000000_admin_ui_content` wajib diterapkan. Migration menambah metadata materi serta tipe/gambar soal; tidak menghapus akun, materi, soal, atau progres lama.

## Desain yang dipertahankan

Komponen visual dari unggahan terbaru disambungkan melalui adapter data, bukan diganti dengan tabel/form generik. Semua nilai `className="..."` statis dari delapan komponen visual/layout utama masih terdapat pada hasil integrasi. Kelas responsif dan ikon asli tetap digunakan.

Ada tambahan yang diperlukan agar form dapat menyimpan isi sebenarnya:

- Pilihan pelajaran, isi artikel/transkrip, ilustrasi thumbnail, urutan, serta status wajib dalam modal materi.
- Provider/ID video atau halaman komik sesuai jenis materi.
- Dialog pengelolaan modul/pelajaran, dibuka dari modal materi.
- Pilihan kuis tujuan dalam halaman edit soal.
- Pesan loading, error, dan penyimpanan.

Label PDF untuk materi baru disesuaikan menjadi artikel. PDF lama tetap dikenali. Jumlah data serta nomor pagination mengikuti hasil database, bukan angka contoh. Penambahan field membuat form lebih panjang; modal dapat digulir. Tidak ada janji bahwa form dengan field baru identik per piksel dengan mockup awal.

## Data dan tindakan yang sudah terhubung

| Tampilan | Integrasi |
|---|---|
| Dashboard | Daftar siswa dan progres PP/ASB/PRS dari database; pencarian, filter, urutan, pagination |
| Pendaftaran | Daftar status menunggu/diterima/ditolak, persetujuan, penolakan, dan pengembalian ke menunggu |
| Materi | Daftar lintas modul/pelajaran, metadata, create/update/delete dan persistensi setelah reload |
| Artikel | Markdown panjang dalam `body TEXT` |
| Komik | Halaman berurutan, URL/upload gambar, alt text, narasi |
| Video | YouTube/Vimeo melalui provider dan ID; URL legacy dipertahankan |
| Bank soal | Daftar aktif, pencarian/filter/pagination, tambah/ubah, arsip |
| Soal bergambar | Upload gambar pertanyaan/opsi, penyimpanan URL, dan tampilan gambar pada kuis siswa |
| Benar/salah | Dua opsi, satu jawaban benar; tipe disimpan backend |
| Kuis baru | PRE/POST pada modul draft/rejected, dibuat bersama soal pertama |

`mockData.ts` hanya referensi dari unggahan desain; halaman admin tidak mengimpornya. Data aktif berasal dari endpoint admin. Daftar workspace lengkap dimuat untuk pencarian/filter/pagination lokal sesuai UI yang dikirim; untuk dataset sangat besar, pola ini perlu diganti pagination server tanpa mengubah desain tabelnya.

## Merevisi materi yang sudah terbit

Tombol edit pada daftar materi kini dapat membuka materi terbit. Saat menekan Simpan pada materi di modul `PUBLISHED`, muncul konfirmasi bahwa **seluruh modul akan ditarik menjadi `DRAFT`**. Jika dibatalkan, data/status tidak berubah. Jika disetujui, perubahan isi dan penarikan publikasi disimpan dalam satu transaksi. Kegagalan penyimpanan membatalkan keduanya.

Materi dalam modul draft tidak tersedia untuk siswa sampai modul ditinjau serta diterbitkan kembali. Mengubah isi materi tidak mereset progres siswa yang sudah tersimpan. Modul yang sedang `PENDING` tetap tidak bisa diubah sampai keputusan peninjauan.

Menambah atau menghapus materi pada modul terbit juga memerlukan konfirmasi penarikan publikasi. Penghapusan materi menghapus data materi dan progress materi yang bergantung padanya sesuai relasi database; jangan gunakan Hapus untuk sekadar merevisi teks.

Untuk membuat modul/pelajaran atau mengajukan publikasi, buka **Unggah materi → Kelola modul dan pelajaran**. Pilih modul, lalu gunakan kontrol tambah/peninjauan. Publikasi tetap membutuhkan peninjau yang berbeda dari pembuat modul. Gunakan admin kedua, atau endpoint review dengan akun REVIEWER melalui Swagger. Jangan mengubah status langsung lewat SQL untuk melewati alur ini.

## Soal dan gambar

- Pilihan ganda: 2–6 opsi teks, satu indeks jawaban benar.
- Pilihan bergambar: opsi teks tetap dipakai sebagai label; gambar pertanyaan dan/atau opsi dapat diunggah.
- Benar/salah: dua opsi; satu jawaban benar.
- Cocokkan dan Urutkan tetap terlihat pada desain, tetapi dinonaktifkan karena grader belum mendukungnya. Data tidak dikonversi diam-diam menjadi pilihan ganda.
- Soal baru memilih topik, level, dan kuis tujuan. Bila modul draft/rejected belum memiliki kuis, pilih Buat kuis PRE/POST baru. Pada soal yang sudah tersimpan, topik/level/kuis tidak dapat dipindahkan lewat edit; buat soal baru untuk kuis lain.
- Hapus soal berarti arsip: soal hilang dari daftar aktif dan run baru, sementara snapshot sesi lama serta riwayat nilai tetap dipertahankan.

Field upload gambar soal mengikuti batas UI 2 MB. Server upload tetap menerima gambar raster PNG/JPEG/WebP maksimal 10 MB/20 megapiksel untuk kebutuhan komik, lalu mengodekan ulang menjadi WebP. URL yang disimpan dibentuk dari `NEXT_PUBLIC_API_URL`. Gambar disajikan publik melalui `/uploads/`; jangan unggah berkas privat.

## Akun dan jaringan

`REGISTRATION_APPROVAL_REQUIRED=false` mempertahankan register publik langsung disetujui. Set `true` lalu restart backend jika siswa baru harus masuk antrean menunggu. Akun lama tetap disetujui. Tombol Batalkan/Kembalikan ke Menunggu sekarang menyimpan `PENDING` dan memblokir login sampai admin menerima kembali. Penolakan juga memblokir pemakaian token pada request berikutnya.

Jika mengakses melalui IP jaringan, bukan localhost:

- `NEXT_PUBLIC_API_URL` harus mengarah ke backend yang dapat dijangkau browser.
- `CORS_ORIGINS` backend harus memuat origin frontend yang tepat (protokol, IP/host, port).
- Uvicorn perlu bind `0.0.0.0` bila menerima koneksi dari perangkat lain.
- Restart frontend dan backend setelah perubahan environment.

Database Python Windows tetap memakai port host Compose, default `127.0.0.1:5433`; antar-container memakai `db:5432`. Tidak perlu membuka PostgreSQL ke perangkat siswa.

## Endpoint tambahan pembaruan ini

Semua endpoint berikut memakai prefix `/api/v1` dan role ADMIN:

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/admin/workspace` | Data nyata untuk komponen admin asli, termasuk metadata relasi |
| POST | `/admin/lessons/{lid}/materials?withdraw=false` | Buat materi; `withdraw=true` setelah konfirmasi untuk modul terbit |
| PUT | `/admin/materials/{aid}?withdraw=false` | Revisi materi secara atomik dengan penarikan publikasi bila dikonfirmasi |
| DELETE | `/admin/materials/{aid}?withdraw=false` | Hapus materi dengan aturan status/konfirmasi yang sama |

Endpoint admin dari paket sebelumnya tetap tersedia. `PATCH /admin/registrations/{uid}` kini juga menerima `PENDING`. Skema soal menerima `question_type`, `image_url`, serta `option_images` sejajar dengan urutan opsi. Jawaban benar hanya tersedia bagi admin dan tidak disertakan pada pertanyaan publik siswa.

## Verifikasi dan batas

- Backend: 30 tes lolos; 9 tes yang membutuhkan server PostgreSQL dilewati.
- Pengujian baru mencakup workspace/admin role, penyimpanan gambar soal, snapshot sesi, revisi materi terbit, rollback saat urutan konflik, dan progres yang tetap tersimpan.
- TypeScript, lint, dan build frontend diperiksa.
- Lima migration berhasil diterapkan pada PostgreSQL 16 dalam single-user mode; schema Prisma valid.
- Audit kode memastikan kelas statis komponen visual asli tetap ada. Pengujian browser/screenshot tidak berhasil dijalankan karena Chromium ditolak lingkungan eksekusi; kesamaan visual per piksel belum diverifikasi.
- Database di komputer pengguna tidak diakses atau dimodifikasi oleh proses pembuatan paket ini.

Baca juga `README-ADMIN.md` untuk pengaturan awal akun/penyimpanan upload. Bila ada perbedaan mengenai fitur revisi, gambar soal, dan desain, gunakan dokumen terbaru ini sebagai acuan.
