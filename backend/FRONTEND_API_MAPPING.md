# SIMULA — Pemetaan mockup ke backend v3

Dokumen integrasi untuk proposal baru dan tiga mockup. Pengerjaan saat ini hanya backend dan kontrak API. Halaman, komponen, client TypeScript, serta pengembangan chatbot ditunda.

Base URL development: `http://localhost:8000/api/v1`. Semua endpoint di bawah memerlukan Bearer token kecuali register, login, config, dan daftar topik. Kontrak tipe lengkap tersedia pada `openapi.json` dan Swagger `/docs`.

## Login dan navigasi

| Elemen mockup | Endpoint | Data / penyesuaian berikutnya |
|---|---|---|
| Email dan password | POST `/auth/login` | `{email,password}`; akun lama juga dapat memakai `{username,password}`. Token memiliki `expires_in`. |
| Registrasi | POST `/auth/register` | `username`, `display_name`, `password`, email opsional, `school_id` opsional. Username tetap diperlukan. |
| Akun aktif | GET `/users/me` | Profil pengguna; password tidak dikirim. |
| Hubungi kami | GET `/ui/config` | `contact_email`; sembunyikan/nonaktifkan bila kosong. |
| Panduan belajar | GET `/ui/config` | `guide_url`; hanya aktif bila diisi. |
| Lupa password | GET `/ui/config` | `password_reset_enabled:false`; belum ada endpoint pemulihan. UI nanti perlu mengarahkan ke kontak dukungan bila tersedia. |
| Keluar | Penghapusan token oleh client | Belum ada endpoint logout/revokasi sesi. Token kedaluwarsa, akun nonaktif langsung ditolak. |
| Hati/nyawa | GET `/ui/config` | `hearts_enabled:false`; hilangkan indikator karena belum ada aturan pengurangan/pemulihan nyawa. |
| Dokter Piko / panel chat | GET `/ui/config` | `chatbot_enabled:false`; panel interaksi ditunda. Endpoint chat dasar versi sebelumnya tetap tersedia tanpa peningkatan. |

## Jalur belajar dan pustaka

| Elemen mockup | Endpoint | Data / penyesuaian berikutnya |
|---|---|---|
| Tab PP, ASB, PRS | GET `/topics` | `id`, `code`, `name`, `position`; nama ASB/PRS dapat ditentukan admin. |
| Jalur level per topik | GET `/learning/path` | `levels[].id` adalah module ID; `level` adalah nomor tampilan. Status `AVAILABLE`, `LOCKED`, `COMPLETED`. |
| Detail level | GET `/modules/{mid}` | Lesson dan daftar kuis. Gunakan ID, bukan nomor level, untuk URL API. |
| Tab PDF/VIDEO/COMIC | GET `/materials?kind=PDF` | Katalog `items,total,limit,offset`; filter format sesuai tab. |
| Cari materi | GET `/materials?q=...&topic_id=1&kind=COMIC` | Pencarian judul/transkrip, kombinasi filter dan pagination. |
| Kartu materi | Katalog di atas | Judul, thumbnail, jumlah halaman/durasi, `locked`, `opened`, `completed`. Tidak memuat isi atau URL sumber. |
| Pembaca PDF / player video | GET `/materials/{aid}` | `url`, `body`, metadata; akses ditolak bila level terkunci. Backend tidak menyediakan player. |
| Pembaca komik | GET `/materials/{aid}` | `pages[]` terurut berisi `image_url`, `alt`, `text`; tampilkan plain text yang di-escape. |
| Catat dibuka | POST `/materials/{aid}/open` | Idempotent; membuka berulang tidak menaikkan hitungan. |
| Tombol selesai media | POST `/materials/{aid}/complete` | Idempotent; pengakuan siswa, tanpa pembuktian durasi menonton/membaca. |
| Selesai lesson | POST `/lessons/{lid}/complete` | Semua media `required:true` dalam lesson harus selesai; memberikan XP lesson sekali. |

Level dibuka secara independen per topik. Semua lesson pada level terbit sebelumnya dan setiap POST harus selesai/lulus sebelum maju. Jumlah level berasal dari data terbit; mockup tidak boleh selalu menampilkan 10 level atau total 30 bila kontennya belum tersedia. Level yang tidak memiliki POST dianggap memenuhi bagian tes, tetapi lesson tetap wajib selesai.

`current_level` di ringkasan profil adalah nomor level pertama yang tersedia dalam urutan topik. Untuk label yang tidak ambigu (misalnya “PP · Level 2”), ambil topik dan node dari `/learning/path`; jangan menganggap nomor level unik secara global.

## Alur post-test dan sertifikat

1. Selesaikan media wajib dan semua lesson dalam modul. Ambil quiz ID POST dari detail modul.
2. POST `/quizzes/{qid}/runs` untuk membuat sesi. Response memuat `id`, `expires_at`, `pass_score`, dan `questions` tanpa kunci. Sesi berlaku 60 menit.
3. Tampilkan **soal response sesi** dan simpan run ID. Jangan mengambil ulang soal dari bank untuk sesi yang sedang berjalan.
4. POST `/quizzes/{qid}/runs/{rid}/submit` dengan `{"answers":{"12":0,"13":2}}`. Key adalah ID soal; indeks opsi mulai dari nol. Harus menjawab tepat seluruh soal sesi.
5. Response berisi `score`, `passed`, `xp_awarded`, feedback, dan `certificate_id` bila POST lulus. Nilai dan hadiah dihitung server.
6. GET `/certificates` untuk daftar milik akun. GET `/certificates/{cid}/download` mengembalikan PDF privat dengan header attachment. Download melalui request ber-Bearer lalu gunakan blob; link publik tanpa autentikasi tidak bekerja.
7. Muat ulang jalur, profil, progres, dan lencana sesudah submit berhasil.

Snapshot soal, kunci, dan nilai kelulusan dibuat ketika sesi dimulai. Perubahan soal admin berlaku untuk sesi berikutnya. Sesi sudah dikirim atau kedaluwarsa tidak dapat digunakan lagi; buat sesi baru untuk latihan. Sertifikat pertama per akun/kuis tetap dipakai pada kelulusan berikutnya dan menyimpan nama/nilai saat penerbitan pertama. Hasil lama sebelum migrasi tidak dibuatkan sertifikat otomatis.

Endpoint lama `/quizzes/{qid}/attempts` tetap kompatibel, tetapi integrasi baru sebaiknya memakai run agar perubahan bank soal tidak memengaruhi sesi aktif. PRE tersedia tanpa kewajiban menyelesaikan materi; prosedur baseline evaluasi ditentukan kegiatan pembelajaran.

Mockup belum menunjukkan halaman post-test, hasil, unduh sertifikat, atau bank soal admin. Keempat tampilan itu perlu dirancang ketika pengembangan frontend dimulai.

## Profil

| Elemen mockup | Endpoint | Sumber data |
|---|---|---|
| Nama, avatar, “bergabung sejak” | GET `/users/me/summary` | `user.display_name`, `avatar_url`, `created_at`; tanggal diformat client. |
| Edit profil | PATCH `/users/me` | Kirim `display_name`, `avatar_url` (URL atau null), `locale`, `theme` sebagai satu set nilai. Endpoint belum menerima unggah gambar atau edit email. |
| Bahasa / tema | PATCH `/users/me` | `locale:id/en`, `theme:light/dark/system`; hanya persistensi preferensi. UI/terjemahan dikembangkan kemudian. |
| Level selesai / total | GET `/users/me/summary` | `completed_levels`, `total_levels`, bersumber dari modul terbit. |
| Lencana diperoleh | Endpoint summary | `earned_badges`, `badges[].earned`; item belum diperoleh dapat ditampilkan terkunci. |
| Materi dibuka | Endpoint summary | `opened_materials`, hitungan unik akun. |
| Progres PDF/video/komik | Endpoint summary | `material_progress[]` memuat `kind,total,opened,completed`. Progress bar penyelesaian memakai `completed / total`, dan 0 bila total 0. |
| XP | Endpoint summary | `user.xp`; perubahan hanya dari server. |

Contoh payload profil: `{"display_name":"Raka","avatar_url":null,"locale":"id","theme":"dark"}`. Pertahankan nilai preferensi lain ketika mengedit satu kolom. Total progres format mencakup seluruh media terbit, termasuk level yang masih terkunci; jumlah dibuka berbeda dari jumlah selesai.

## Pengelolaan konten dan bank soal

| Operasi | Endpoint | Hak akses / aturan |
|---|---|---|
| Nama/urutan topik | PATCH `/admin/topics/{tid}` | Admin; `{name,position}`. |
| Modul per topik | POST `/modules`, PUT `/modules/{mid}` | Instructor pemilik atau admin; sertakan `topic_id` dan `level`. |
| Lesson | POST `/modules/{mid}/lessons`, PUT/DELETE `/lessons/{lid}` | Pemilik/admin; modul DRAFT/REJECTED. |
| Media | POST `/lessons/{lid}/materials`, PUT/DELETE `/materials/{aid}` | Pemilik/admin; DRAFT/REJECTED. PDF/video memerlukan URL; komik memerlukan pages. |
| Validasi penerbitan | POST `/modules/{mid}/submit-review`, POST `/modules/{mid}/review` | Reviewer/admin berbeda dari pembuat; konten tidak diasumsikan tervalidasi PMI. |
| Daftar/tambah soal | GET/POST `/admin/quizzes/{qid}/questions` | Admin; response bank mencakup kunci, hanya untuk admin. Maksimal 50 soal aktif. |
| Ubah soal | PUT `/admin/quizzes/{qid}/questions/{question_id}` | Admin; prompt/options/correct_index/explanation; boleh pada kuis terbit. |
| Arsip/aktifkan soal | PATCH `/admin/quizzes/{qid}/questions/{question_id}/active` | Admin; `{active:false}` menggantikan hapus permanen untuk menjaga histori. |

Bank digunakan seluruhnya, tanpa sampling acak. Media eksternal belum diunggah/disimpan oleh API. Contoh data dan URL dalam tes hanya fixture teknis, bukan materi pendidikan final.

## State yang perlu ditangani client nanti

| HTTP | Perlakuan |
|---|---|
| 401 | Token tidak valid/kedaluwarsa: kembali login. |
| 403 | Akun nonaktif, peran tidak berhak, atau prasyarat level/lesson belum selesai; tampilkan `detail`. |
| 404 | Data tidak tersedia untuk akun, belum terbit, atau bukan miliknya. |
| 409 | Konflik data/urutan, konten immutable, sesi terpakai/kedaluwarsa, bank kosong atau penuh; tampilkan detail sesuai operasi. |
| 422 | Payload atau jawaban invalid; tampilkan validasi field dan koreksi input. |
| 500 | Tampilkan kegagalan umum dan `reference` bila tersedia. |

Jangan menampilkan kunci jawaban sebelum submit, menghitung kelulusan/XP lokal, membuka node terkunci berdasarkan cache, atau mengubah database langsung dari browser. Refresh data setelah mutasi. Rahasia/database URL tetap di server; CORS origin disesuaikan lewat `.env`. Teks konten dan feedback diperlakukan sebagai plain text, bukan HTML mentah.
