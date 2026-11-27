/* DATA & STATE (data contoh). Backend: ganti bagian ini dengan data dari API. */
var role = "mhs";      // role yang sedang login: mhs | adm | ptg
var page = '';      // halaman yang sedang dibuka
var nm = "Salwa";        // nama pengguna yang login
var st = 1;          // langkah form pendaftaran (1-3). Bawaan langkah 1 (Data diri)
var nf = 0;          // filter notifikasi: 0 semua, 1 belum dibaca, 2 dibaca
var perLewat = false;  // simulasi: periode pendaftaran sudah lewat
// NL = karakter baris baru (kode 10), CR = karakter kembali ke awal baris (kode 13).
// Dibuat lewat fromCharCode supaya tidak perlu menulis \n di dalam teks; dipakai saat memecah isi CSV.
var NL = String.fromCharCode(10), CR = String.fromCharCode(13);

/* Menu sidebar per role: [kode halaman, label] */
// R = daftar menu per role. R[role].n = nama role yang tampil, R[role].m = daftar menu sidebar.
// Urutan menu = urutan tampil, dan menu pertama selalu menjadi halaman awal (Dashboard).
var R = {
  "mhs": {
    "n": "Mahasiswa",
    "m": [
      [
        "dash",
        "Dashboard"
      ],
      [
        "daftar",
        "Pendaftaran"
      ],
      [
        "status",
        "Status & Hasil"
      ],
      [
        "prof",
        "Profil"
      ]
    ]
  },
  "adm": {
    "n": "Admin",
    "m": [
      [
        "dash",
        "Dashboard"
      ],
      [
        "user",
        "Kelola pengguna"
      ],
      [
        "periode",
        "Periode"
      ],
      [
        "latih",
        "Data latih"
      ],
      [
        "model",
        "Model C4.5"
      ],
      [
        "prof",
        "Profil"
      ]
    ]
  },
  "ptg": {
    "n": "Petugas Seleksi",
    "m": [
      [
        "dash",
        "Dashboard"
      ],
      [
        "verif",
        "Verifikasi berkas"
      ],
      [
        "klas",
        "Klasifikasi & Keputusan"
      ],
      [
        "prof",
        "Profil"
      ]
    ]
  }
};

/* Penjelasan fungsi tiap halaman (kotak "Fungsi halaman") */
// D = isi kotak "Fungsi halaman". Kuncinya "role_kode", sama dengan nama fungsi halaman di V.
// Contoh: D.adm_latih menjelaskan halaman V.adm_latih. Pages-extra.js menambah beberapa entri lagi.
var D = {
  "mhs_dash": "Ringkasan posisi Anda dalam proses seleksi: status terkini, periode aktif, dan siapa mengerjakan tiap tahap.",
  "mhs_daftar": "Tempat mengisi data diri, data kriteria (IPK, penghasilan, tanggungan, daya listrik), dan mengunggah berkas. Data kriteria inilah yang dinilai sistem.",
  "mhs_status": "Memantau perjalanan pendaftaran dan melihat hasil seleksi setelah petugas menetapkan keputusan.",
  "adm_dash": "Ringkasan jumlah pengguna, pendaftar, data latih, dan akurasi model.",
  "adm_user": "Membuat dan mengatur akun Admin dan Petugas Seleksi; mahasiswa mendaftar sendiri.",
  "adm_periode": "Membuka atau menutup pendaftaran dan menetapkan kuota penerima. Hanya satu periode boleh aktif.",
  "adm_latih": "Data pendaftar tahun lalu berlabel Layak atau Tidak Layak yang dipelajari algoritma C4.5 untuk membentuk model.",
  "adm_model": "Melatih model C4.5 dan menampilkan perhitungan, pohon, dan aturan agar hasil seleksi dapat dipertanggungjawabkan.",
  "ptg_dash": "Ringkasan pekerjaan menurut tahap: verifikasi, klasifikasi, dan keputusan.",
  "ptg_verif": "Memeriksa kelengkapan dan keabsahan berkas serta memvalidasi data kriteria. Hanya berkas sah yang diklasifikasi.",
  "ptg_klas": "Menjalankan klasifikasi C4.5 sebagai rekomendasi, lalu menetapkan keputusan akhir sesuai kuota.",
  "ptg_prof": "Data akun Anda dan pengaturan kata sandi.",
  "adm_prof": "Data akun Anda dan pengaturan kata sandi.",
  "mhs_prof": "Data akun Anda dan pengaturan kata sandi.",
  "ptg_notif": "Pemberitahuan kejadian terbaru beserta riwayatnya. Berbeda dengan Status & Hasil yang menunjukkan posisi pendaftaran saat ini.",
  "adm_notif": "Pemberitahuan kejadian terbaru beserta riwayatnya. Berbeda dengan Status & Hasil yang menunjukkan posisi pendaftaran saat ini.",
  "mhs_notif": "Pemberitahuan kejadian terbaru beserta riwayatnya. Berbeda dengan Status & Hasil yang menunjukkan posisi pendaftaran saat ini."
};

/* Notifikasi per role: [pesan, waktu, belum dibaca(1/0), halaman tujuan] */
var NT = {
  "mhs": [
    [
      "Berkas perlu diperbaiki: tagihan listrik buram",
      "2 jam lalu",
      1,
      "status"
    ],
    [
      "Berkas Anda telah diverifikasi",
      "2 hari lalu",
      0,
      "status"
    ],
    [
      "Hasil seleksi tersedia",
      "1 hari lalu",
      0,
      "status"
    ]
  ],
  "adm": [
    [
      "3 pendaftar baru hari ini",
      "1 jam lalu",
      1,
      "dash"
    ],
    [
      "Periode KIP-K 2026 ditutup 30 Nov",
      "3 hari lalu",
      0,
      "periode"
    ],
    [
      "Model C4.5 terakhir dilatih 17 Okt",
      "5 hari lalu",
      0,
      "model"
    ]
  ],
  "ptg": [
    [
      "14 berkas menunggu verifikasi",
      "30 menit lalu",
      1,
      "verif"
    ],
    [
      "31 pendaftar siap diklasifikasi",
      "1 hari lalu",
      0,
      "klas"
    ],
    [
      "Kuota 120 belum ditetapkan penuh",
      "2 hari lalu",
      0,
      "klas"
    ]
  ]
};

/* Pengguna, password demo, periode, dan data latih */
// UL = daftar pengguna di halaman Kelola pengguna.
var UL = [
  [
    "Tegar Risky",
    "tegar@unkhair.ac.id",
    "Admin",
    1
  ],
  [
    "Aliyah Tasya",
    "aliyah@unkhair.ac.id",
    "Petugas Seleksi",
    1
  ],
  [
    "Salwa Wahidin",
    "07352411149",
    "Mahasiswa",
    1
  ]
];   // [nama, email/NIM, role, aktif]
var PWD = ["mhs123", "admin123", "petugas123"];  // password demo: mahasiswa, admin, petugas
var NP = [];   // periode baru yang ditambahkan
// DL = data latih yang dipelajari algoritma C4.5.
var DL = [
  [
    "Tinggi",
    "Rendah",
    "Banyak",
    "450 VA",
    "Layak",
    "Memenuhi kriteria, kuota penuh"
  ],
  [
    "Sedang",
    "Tinggi",
    "Sedikit",
    "2200 VA",
    "Tidak Layak",
    "Tidak memenuhi kriteria"
  ],
  [
    "Rendah",
    "Rendah",
    "Banyak",
    "900 VA",
    "Tidak Layak",
    "Tidak memenuhi kriteria"
  ]
];   // data latih: [ipk, penghasilan, tanggungan, daya, kelas, keterangan]
// OPT = nilai yang diperbolehkan untuk tiap kolom data latih.
// Dipakai untuk mengisi dropdown (opt) dan memeriksa data (VAL.dataLatih di validasi.js).
// Kuncinya: ipk, peng (penghasilan), tang (tanggungan), daya, kelas, ket (keterangan label).
var OPT = {
  "ipk": [
    "Tinggi",
    "Sedang",
    "Rendah"
  ],
  "peng": [
    "Rendah",
    "Sedang",
    "Tinggi"
  ],
  "tang": [
    "Sedikit",
    "Sedang",
    "Banyak"
  ],
  "daya": [
    "450 VA",
    "900 VA",
    "1300 VA",
    "2200 VA"
  ],
  "kelas": [
    "Layak",
    "Tidak Layak"
  ],
  "ket": [
    "Memenuhi kriteria",
    "Memenuhi kriteria, kuota penuh",
    "Tidak memenuhi kriteria"
  ]
};
// MON = nama bulan singkat, dipakai fd() di helpers.js untuk mengubah tanggal menjadi teks.
var MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
var IMPV = []; // baris valid hasil pemeriksaan impor CSV
var XF = 1;   // format ekspor: 1 PDF, 2 Excel
// SAMPLE = isi CSV contoh untuk tombol "Pakai contoh file (demo)" saat impor data latih.
// Dua baris di dalamnya sengaja salah (daya 700 VA dan kelas kosong) supaya pesan gagal impor bisa diperlihatkan.
var SAMPLE = "ipk,penghasilan,tanggungan,daya,kelas,keterangan\nTinggi,Rendah,Banyak,450 VA,Layak,Memenuhi kriteria\nSedang,Sedang,Sedang,900 VA,Layak,Memenuhi kriteria, kuota penuh\nRendah,Tinggi,Sedikit,700 VA,Tidak Layak,Tidak memenuhi kriteria\nSedang,Rendah,Banyak,900 VA,Tidak Layak,Tidak memenuhi kriteria\nTinggi,Tinggi,Sedikit,2200 VA,,Tidak memenuhi kriteria";
