"""Struktur 3 level per topik: bagian buku, komik, kuis PRE/POST, dan badge.

Dipakai oleh app.import_modules. Soal diambil dari Buku Materi PMI (PMR Mula).
Format soal: (pertanyaan, [pilihan], indeks_benar, penjelasan).
"""
from app.module_quizzes import ASB_POST, ASB_PRE, KR_POST, KR_PRE, PP_POST, PP_PRE


def pick(source, *indexes):
    return [source[i] for i in indexes]


# ---------------- Soal tambahan ----------------
PP1_PRE_NEW = [
    ("Manakah yang termasuk peralatan Pertolongan Pertama?",
     ["Kasa steril dan pembalut gulung (perban)", "Pensil warna", "Bola sepak", "Payung"], 0,
     "Peralatan PP antara lain kasa steril, perban, plester, gunting pembalut, kapas, dan selimut."),
]
PP1_POST_NEW = [
    ("Jika keadaan korban berat, apa yang harus dilakukan penolong?",
     ["Diam saja", "Meminta bantuan kepada yang lebih ahli", "Pulang ke rumah", "Menyuruh korban berdiri"], 1,
     "Salah satu kewajiban penolong adalah meminta bantuan kepada yang lebih ahli."),
    ("Manakah yang termasuk Alat Perlindungan Diri (APD) penolong?",
     ["Masker penolong", "Topi ulang tahun", "Kacamata hitam gaya", "Sepatu roda"], 0,
     "Contoh APD: sarung tangan lateks dan masker penolong. APD tidak perlu mahal."),
    ("Salah satu tujuan PP adalah mencegah cacat. Contohnya…",
     ["Membuat korban tertawa", "Mencegah luka meninggalkan bekas", "Membuat korban cepat tidur", "Memberi hadiah"], 1,
     "PP bertujuan menyelamatkan jiwa, mencegah cacat (misalnya luka membekas), dan memberi rasa nyaman."),
    ("Pertolongan yang diberikan penolong harus…",
     ["Sesuai dengan keadaan korban", "Sama untuk semua korban", "Secepatnya meski berbahaya", "Menunggu izin teman"], 0,
     "Penolong memberi pertolongan yang sesuai dengan keadaan korban."),
]
PP2_PRE_NEW = [
    ("Indera penciuman pada tubuh manusia adalah…",
     ["Telinga", "Hidung", "Lidah", "Kulit"], 1,
     "Hidung adalah indera penciuman."),
    ("Manakah yang BUKAN bagian anggota gerak atas?",
     ["Siku", "Pergelangan tangan", "Lutut", "Lengan atas"], 2,
     "Lutut termasuk anggota gerak bawah, bersama paha, tungkai bawah, dan kaki."),
]
PP2_POST_NEW = [
    ("Sebelum ditutup, luka yang berdarah sebaiknya dibersihkan dengan…",
     ["Antiseptik", "Kecap", "Tanah", "Odol"], 0,
     "Luka berdarah dibersihkan dengan antiseptik lalu ditutup."),
    ("Memar karena terbentur benda keras termasuk…",
     ["Luka berdarah", "Luka tidak berdarah", "Patah tulang terbuka", "Bukan luka"], 1,
     "Luka dibagi menjadi luka berdarah dan luka tidak berdarah, misalnya memar."),
    ("Apa salah satu fungsi pembalut luka?",
     ["Mempertahankan penutup luka tetap di tempatnya", "Menghias tubuh",
      "Membuat luka lebih lebar", "Menggantikan dokter"], 0,
     "Pembalut berfungsi sebagai penekan perdarahan, penahan penutup luka, dan penopang bagian yang cedera."),
]
PP3_PRE_NEW = [
    ("Patah tulang adalah…",
     ["Terputusnya jaringan tulang", "Tulang yang bertambah panjang", "Kulit yang lecet", "Otot yang lelah"], 0,
     "Patah tulang adalah terputusnya jaringan tulang."),
    ("Manakah tanda patah tulang?",
     ["Bagian yang patah sulit digerakkan dan terasa sakit", "Badan terasa segar",
      "Bisa berlari lebih cepat", "Tidak ada perubahan apa pun"], 0,
     "Tanda patah tulang: bentuk berubah, kesakitan, sulit digerakkan, kadang memar atau ujung tulang keluar."),
    ("Prinsip Kenetralan berarti Gerakan Palang Merah…",
     ["Memihak kelompok yang menang", "Tidak memihak dalam pertentangan politik, ras, agama, atau ideologi",
      "Hanya menolong negara sendiri", "Mencari keuntungan"], 1,
     "Kenetralan: Gerakan tidak memihak atau melibatkan diri dalam pertentangan."),
    ("Ada berapa Prinsip Dasar Gerakan Palang Merah dan Bulan Sabit Merah?",
     ["3", "5", "7", "10"], 2,
     "Ada 7 prinsip: Kemanusiaan, Kesamaan, Kenetralan, Kemandirian, Kesukarelaan, Kesatuan, Kesemestaan."),
]

ASB2_PRE_NEW = [
    ("Bencana kekeringan terjadi ketika…",
     ["Hujan turun setiap hari", "Ketersediaan air tidak mencukupi kebutuhan sehari-hari",
      "Sungai meluap", "Angin bertiup kencang"], 1,
     "Kekeringan adalah matinya sumber-sumber air sehingga air tidak mencukupi kebutuhan."),
    ("Di Indonesia, angin topan disertai petir dan hujan lebat juga disebut…",
     ["Pelangi", "Badai", "Gerimis", "Embun"], 1,
     "Di Indonesia angin topan juga disebut badai, ditandai angin kencang, petir, kilat, dan hujan lebat."),
]
ASB2_POST_NEW = [
    ("Jika terjebak kebakaran dan ruangan penuh asap, apa yang dilakukan?",
     ["Berdiri tegak dan berlari", "Merangkak di bawah asap dan bernapas pendek-pendek",
      "Membuka semua pintu lebar-lebar", "Bersembunyi di lemari"], 1,
     "Merangkaklah di bawah asap, tutup celah pintu dengan kain basah, dan minta pertolongan."),
    ("Setelah gunung api meletus, bagian tubuh mana yang perlu dilindungi dari abu?",
     ["Mulut dan hidung", "Kuku", "Rambut saja", "Telapak kaki"], 0,
     "Abu gunung api bisa menimbulkan iritasi dan mengganggu pernapasan, jadi lindungi mulut dan hidung."),
]
ASB3_PRE = [
    ("Abrasi adalah…",
     ["Berkurangnya daratan pantai karena gelombang laut", "Hujan abu gunung",
      "Air sungai meluap", "Tanah yang retak karena kemarau"], 0,
     "Abrasi atau erosi pantai adalah berkurangnya daratan yang disebabkan gelombang laut."),
    ("Sebagian besar abrasi terjadi akibat…",
     ["Rusaknya tanaman bakau di bibir pantai", "Banyaknya ikan di laut",
      "Pasir yang terlalu putih", "Turunnya hujan"], 0,
     "Rusaknya hutan bakau dan terumbu karang membuat pengikisan pantai tidak terkendali."),
    ("Pemanasan global adalah…",
     ["Turunnya suhu bumi", "Kenaikan rata-rata suhu bumi yang menyebabkan perubahan iklim",
      "Matahari yang semakin kecil", "Musim hujan yang tetap"], 1,
     "Pemanasan global adalah kenaikan rata-rata temperatur bumi yang kemudian menyebabkan perubahan iklim."),
    ("Manakah yang termasuk Gas Rumah Kaca?",
     ["Karbondioksida (CO2)", "Oksigen murni dari pohon", "Air mineral", "Garam dapur"], 0,
     "Gas Rumah Kaca antara lain karbondioksida (CO2), metana (CH4), dan dinitroksida (N2O)."),
    ("Konflik sosial tidak akan terjadi jika orang…",
     ["Saling menghargai perbedaan", "Selalu ingin menang sendiri",
      "Memelihara rasa dendam", "Tidak mau berteman"], 0,
     "Konflik tidak terjadi jika orang dapat saling menghargai perbedaan."),
]
ASB3_POST = [
    ("Apa yang bisa kita lakukan untuk mencegah abrasi?",
     ["Merusak terumbu karang", "Menanam bakau dan menjaga kebersihan pantai",
      "Membuang sampah ke laut", "Menebang pohon kelapa"], 1,
     "Pencegahan abrasi: menanam bakau, membangun pemecah ombak, dan tidak merusak terumbu karang."),
    ("Salah satu dampak perubahan iklim bagi petani adalah…",
     ["Panen selalu berlimpah", "Gagal panen karena pola hujan tidak menentu",
      "Sawah bertambah luas", "Tidak ada dampak"], 1,
     "Hujan yang jarang atau tidak menentu membuat pertanian menderita dan bisa gagal panen."),
    ("Tindakan kecil apa yang membantu mengurangi dampak perubahan iklim?",
     ["Menanam pohon sebanyak-banyaknya", "Membakar sampah setiap hari",
      "Membiarkan lampu menyala terus", "Membuang sampah ke selokan"], 0,
     "Menanam pohon dan menjaga kebersihan lingkungan membantu mengurangi dampak perubahan iklim."),
    ("Sebagai anggota PMR, apa yang bisa kita lakukan untuk menjaga persahabatan dan perdamaian?",
     ["Memelihara rasa dendam", "Menolong tanpa membeda-bedakan dan tidak ikut tawuran",
      "Mengejek teman yang berbeda", "Menjauhi semua orang"], 1,
     "Tidak memelihara dendam, menolong tanpa membeda-bedakan, dan membuat kegiatan yang mempererat persahabatan."),
    ("Prinsip Kemanusiaan berarti Gerakan Palang Merah bertujuan…",
     ["Mencari keuntungan", "Melindungi jiwa dan kesehatan serta menghormati sesama manusia",
      "Memenangkan perang", "Menolong orang tertentu saja"], 1,
     "Kemanusiaan: mencegah dan mengatasi penderitaan, melindungi jiwa dan kesehatan, serta menghormati manusia."),
]

KR1_PRE_NEW = [
    ("Potensi diri adalah…",
     ["Kemampuan diri yang dikembangkan untuk mencapai tujuan hidup", "Uang saku setiap hari",
      "Nilai rapor saja", "Jumlah teman di media sosial"], 0,
     "Potensi diri merupakan kemampuan yang dimiliki seseorang dan dikembangkan untuk mencapai tujuan hidup."),
    ("Norma sosial dapat bersumber dari…",
     ["Agama, undang-undang, dan adat kebiasaan masyarakat", "Iklan televisi",
      "Gim daring", "Keinginan pribadi saja"], 0,
     "Norma bersumber dari agama, undang-undang/peraturan negara, serta adat dan kesepakatan masyarakat."),
]
KR1_POST_NEW = [
    ("Karena pembawaan tidak bisa diubah, tumbuh kembang remaja disempurnakan dengan mengelola…",
     ["Kesehatan, gizi, dan lingkungan", "Warna kulit", "Tinggi orang tua", "Tanggal lahir"], 0,
     "Faktor luar yang bisa dikelola: kesehatan, gizi, serta lingkungan keluarga, sekolah, dan teman sebaya."),
    ("Bagaimana peran sahabat karib dalam mencapai cita-cita?",
     ["Menjadi teman berdiskusi dan saling memberi nasihat", "Mengerjakan semua tugas kita",
      "Mengajak bolos", "Menyimpan uang kita"], 0,
     "Sahabat karib membantu menggali potensi, mengurangi kelemahan, dan saling memberi nasihat."),
    ("Apa akibat jika seseorang melanggar norma sosial?",
     ["Mendapat pujian", "Bisa mendapat penolakan atau dikucilkan masyarakat",
      "Langsung menjadi terkenal", "Tidak ada akibat"], 1,
     "Taat norma membuat diterima masyarakat; pelanggaran menyebabkan penolakan dan sanksi sosial."),
    ("Dalam pendekatan 3T, langkah 'Telaah' berarti…",
     ["Menimbang untung rugi setiap pilihan", "Langsung bertindak tanpa berpikir",
      "Melupakan masalah", "Menyerahkan keputusan ke orang lain"], 0,
     "Telaah = menimbang untung rugi tiap pilihan, lalu memilih yang paling berdaya guna atau risikonya terkecil."),
]
KR2_PRE_NEW = [
    ("Peran kodrati adalah peran yang…",
     ["Muncul berdasarkan jenis kelamin dan tidak dapat dipertukarkan, misalnya melahirkan",
      "Bisa ditukar kapan saja", "Ditentukan oleh teman", "Hanya ada di sekolah"], 0,
     "Peran kodrati berdasarkan jenis kelamin dan tidak dapat dipertukarkan; peran gender dapat dipertukarkan."),
    ("Fungsi reproduksi adalah…",
     ["Kemampuan memiliki keturunan", "Kemampuan berlari cepat", "Kemampuan berhitung", "Kemampuan bernyanyi"], 0,
     "Reproduksi adalah kemampuan seseorang memiliki keturunan untuk melestarikan kehidupan manusia."),
    ("Buah pelir (testis) pada laki-laki berfungsi menghasilkan…",
     ["Sel telur", "Sperma dan hormon testosteron", "Air liur", "Darah merah"], 1,
     "Testis menghasilkan sel kelamin pria (sperma) dan hormon testosteron."),
]
KR2_POST = [
    ("Mengapa kehamilan dini berisiko bagi remaja?",
     ["Tubuh, mental, dan sosial remaja belum siap; pendidikan bisa terhenti",
      "Karena remaja sudah sangat dewasa", "Tidak ada risiko apa pun", "Karena membuat badan lebih kuat"], 0,
     "Remaja belum siap secara fisik, mental, dan sosial; kehamilan dini bisa menghentikan pendidikan dan cita-cita."),
    ("Peminggiran atau pemiskinan ekonomi karena gender disebut…",
     ["Marginalisasi", "Kesetaraan", "Pemberdayaan", "Kerja sama"], 0,
     "Bentuk ketidakadilan gender: marginalisasi, subordinasi, stereotipe, kekerasan, diskriminasi, beban ganda."),
    ("Menurut buku materi, cara paling aman bagi remaja yang belum menikah untuk mencegah infeksi menular seksual (IMS) adalah…",
     ["Menghindari hubungan seksual sebelum menikah", "Minum vitamin saja",
      "Mandi dua kali sehari", "Tidak perlu dicegah"], 0,
     "Bagi remaja yang belum menikah, pencegahan IMS adalah menghindari hubungan seksual dan suasana yang menjurus ke sana."),
    ("Keluarga Berencana (KB) adalah…",
     ["Usaha mengatur keluarga agar bahagia dan sejahtera", "Liburan bersama keluarga",
      "Arisan keluarga", "Daftar nama anggota keluarga"], 0,
     "KB adalah ikhtiar mengatur keluarga agar bahagia dan sejahtera."),
    ("Indung telur (ovarium) pada perempuan menghasilkan…",
     ["Sperma", "Sel telur (ovum)", "Air mani", "Air susu"], 1,
     "Di dalam ovarium terdapat folikel penghasil sel telur (ovum)."),
]


def level(title, pages, comics, pre, post, badge, intro):
    return {"title": title, "pages": pages, "comics": comics, "pre": pre, "post": post,
            "badge": badge, "intro": intro}


# kode topik -> info topik + 3 level. pages = (halaman awal, halaman akhir) buku, 1-based inklusif.
# comics = nama file PDF komik (tanpa .pdf) di folder sumber topik.
LEVELS = {
    "PP": {
        "name": "Pertolongan Pertama",
        "levels": [
            level("Siap Menolong", (1, 10), ["Pertolongan Pertama"],
                  pick(PP_PRE, 0, 1, 2, 3) + PP1_PRE_NEW, pick(PP_POST, 5) + PP1_POST_NEW,
                  ("Penolong Cilik", "Paham dasar pertolongan pertama dan keselamatan penolong."),
                  "Kenali pertolongan pertama, kewajiban penolong, APD, dan peralatan PP."),
            level("Kenali Tubuh dan Luka", (11, 14), [],
                  pick(PP_PRE, 4, 5, 6) + PP2_PRE_NEW, pick(PP_POST, 0, 1) + PP2_POST_NEW,
                  ("Ahli Balut Luka", "Mengenal tubuh manusia, luka, penutup luka, dan pembalut."),
                  "Pelajari bagian tubuh, panca indera, jenis luka, penutup luka, dan pembalut."),
            level("Patah Tulang dan Prinsip PMR", (15, 21), [],
                  pick(PP_PRE, 7) + PP3_PRE_NEW, pick(PP_POST, 2, 3, 4, 6, 7),
                  ("Penjaga Prinsip PMR", "Mengenali patah tulang dan memahami Tri Bakti serta 7 Prinsip."),
                  "Kenali patah tulang dan pembidaian, Tri Bakti PMR, serta 7 Prinsip Dasar Gerakan."),
        ],
    },
    "ASB": {
        "name": "Ayo Siaga Bencana",
        "levels": [
            level("Mulai Siaga", (1, 18), ["Siaga Gempa", "Siaga Banjir"],
                  pick(ASB_PRE, 0, 1, 2, 3, 7), pick(ASB_POST, 0, 3, 4, 5, 6),
                  ("Sahabat Siaga Bencana", "Siap menghadapi gempa dan banjir bersama keluarga."),
                  "Kenali kesiapsiagaan bencana, tas siaga, gempa bumi, dan banjir."),
            level("Waspada Alam", (19, 34),
                  ["Siaga Longsor", "Siaga Kebakaran", "Siaga Kekeringan", "Siaga Angin Topan",
                   "Siaga Gunung Meletus"],
                  pick(ASB_PRE, 4, 5, 6) + ASB2_PRE_NEW, pick(ASB_POST, 1, 2, 7) + ASB2_POST_NEW,
                  ("Pemberani Siaga Alam", "Waspada longsor, kebakaran, kekeringan, angin topan, dan gunung api."),
                  "Pelajari longsor, kebakaran, kekeringan, angin topan, dan letusan gunung api."),
            level("Jaga Bumi dan Sesama", (35, 47),
                  ["Siaga Abrasi", "Siaga Perubahan Iklim", "Siaga Konflik Sosial"],
                  ASB3_PRE, ASB3_POST,
                  ("Penjaga Bumi", "Peduli pantai, iklim, dan perdamaian bersama sesama."),
                  "Pelajari abrasi, perubahan iklim, konflik sosial, dan 7 Prinsip Dasar Gerakan."),
        ],
    },
    "KR": {
        "name": "Kesehatan Remaja",
        "levels": [
            level("Kenali Dirimu", (1, 25),
                  ["Tumbuh Kembang", "Norma Sosial", "Perilaku Berisiko"],
                  pick(KR_PRE, 0, 1, 7) + KR1_PRE_NEW, pick(KR_POST, 0) + KR1_POST_NEW,
                  ("Sahabat Remaja Sehat", "Mengenal tumbuh kembang, potensi diri, dan norma sosial."),
                  "Pelajari tumbuh kembang remaja, potensi diri, keputusan yang baik, norma sosial, "
                  "dan perilaku berisiko."),
            level("Sehat dan Setara", (26, 48),
                  ["Kesetaraan Gender", "Kesehatan Reproduksi"],
                  pick(KR_POST, 1, 2) + KR2_PRE_NEW, KR2_POST,
                  ("Duta Setara", "Memahami gender dan kesehatan reproduksi remaja."),
                  "Pelajari gender, kesehatan reproduksi, kehamilan dini, IMS, dan Keluarga Berencana."),
            level("Jaga Diri dan Teman", (49, 86),
                  ["HIV dan AIDS", "Cegah Penyakit Menular", "Tolak Rokok", "Tolak Napza dan Miras",
                   "Peduli Sesama"],
                  pick(KR_PRE, 2, 3, 4, 5, 6), pick(KR_POST, 3, 4, 5, 6, 7),
                  ("Pelindung Sebaya", "Menjaga diri dari HIV, penyakit menular, rokok, dan napza, "
                                       "serta menjadi pendidik sebaya."),
                  "Pelajari HIV dan AIDS, hepatitis-B, TBC, rokok, alkohol, napza, dan Pendidikan Remaja Sebaya."),
        ],
    },
}
