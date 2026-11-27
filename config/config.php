<?php
// ==================================================================
// config.php : pengaturan aplikasi. Ubah sesuai komputer Anda.
// Nilai bisa juga ditimpa lewat environment variable (SIPAKAT_DB_PASS, dst.)
// supaya password database tidak perlu ditulis di kode saat dipublikasikan.
// ==================================================================
return [
    // Koneksi database (XAMPP: user root, password kosong)
    'db' => [
        'host'    => getenv('SIPAKAT_DB_HOST') ?: '127.0.0.1',
        'nama'    => getenv('SIPAKAT_DB_NAME') ?: 'sipakat_kip',
        'user'    => getenv('SIPAKAT_DB_USER') ?: 'root',
        'pass'    => getenv('SIPAKAT_DB_PASS') !== false ? getenv('SIPAKAT_DB_PASS') : '',
        'charset' => 'utf8mb4',
    ],

    // Zona waktu server (Gorontalo = WITA)
    'zona_waktu' => 'Asia/Makassar',

    // debug = true: kalau email GAGAL terkirim, kode "lupa password" ditampilkan di layar sebagai cadangan.
    // Ubah ke false setelah pengiriman email berhasil dan sebelum dipakai sungguhan.
    'debug' => true,

    // Unggah berkas: folder ada di luar akses web (lihat storage/.htaccess), maksimal 2 MB.
    'folder_unggah' => __DIR__ . '/../storage/uploads',
    'unggah_maks'   => 2 * 1024 * 1024,

    // Batas login gagal: 5 kali dalam 15 menit
    'login_maks_gagal'   => 5,
    'login_jendela_mnt'  => 15,

    // Kode lupa password: berlaku 10 menit, maksimal 5 kali salah
    'reset_berlaku_mnt'  => 10,
    'reset_maks_salah'   => 5,

    // Sesi otomatis habis kalau tidak ada aktivitas selama 30 menit
    'sesi_idle_mnt' => 30,

    // Batas kategori yang mengubah angka menjadi label untuk algoritma C4.5.
    // SATU aturan ini dipakai untuk data pendaftar (data latih sudah berupa label).
    'kategori' => [
        'ipk_tinggi'      => 3.50,   // IPK >= 3.50 = Tinggi, >= 3.00 = Sedang, selain itu Rendah
        'ipk_sedang'      => 3.00,
        'tanggungan_banyak' => 5,    // >= 5 orang = Banyak, 3-4 = Sedang, 0-2 = Sedikit
        'tanggungan_sedang' => 3,
    ],

    // ------------------------------------------------------------------
    // PENGIRIMAN EMAIL (kode reset password). Contoh ini untuk Gmail.
    // Yang WAJIB Anda isi hanya 'pass':
    //   pass = App Password 16 karakter dari Google (tanpa spasi), BUKAN password Gmail.
    // Cara membuat: akun Google > Keamanan > aktifkan Verifikasi 2 langkah > Sandi aplikasi.
    // Jangan bagikan berkas ini atau mengunggahnya ke GitHub setelah diisi.
    // Kalau muncul error sertifikat di XAMPP, isi 'ca_bundle' dengan path file sertifikat,
    // contoh: 'E:\\xampp\\apache\\bin\\curl-ca-bundle.crt'. Pemeriksaan sertifikat tidak boleh dimatikan.
    // ------------------------------------------------------------------
    'email' => [
        'aktif'      => true,                       // false = kode hanya tampil di layar (mode demo)
        'host'       => 'smtp.gmail.com',
        'port'       => 587,
        'enkripsi'   => 'tls',                      // tls = port 587, ssl = port 465
        'user'       => 'salwawahidin02@gmail.com',
        'pass'       => 'eghv wofs znum qvyq',
        'dari_email' => '',                         // kosong = memakai alamat 'user'
        'dari_nama'  => 'SIPAKAT-KIP',
        'ca_bundle'  => null,
    ],

    // Login dengan Google (Google Identity Services). Client ID BUKAN rahasia (sudah terlihat di halaman web).
    // Di Google Cloud, "Authorized JavaScript origins" harus memuat http://localhost dan https://localhost
    'google' => [
        'client_id'     => getenv('SIPAKAT_GOOGLE_CLIENT_ID') ?: '100901048754-8v40h3lflrv1am4v9rf9q7br2rh8vf2o.apps.googleusercontent.com',
        'tokeninfo_url' => 'https://oauth2.googleapis.com/tokeninfo',
    ],
];
