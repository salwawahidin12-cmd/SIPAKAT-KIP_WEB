# SIPAKAT-KIP: Backend PHP + MySQL

Backend ini melengkapi tampilan web yang sudah ada. Browser memanggil `api/*.php`
(JSON), PHP memeriksa login, role, dan validasi, lalu membaca/menulis MySQL lewat PDO.

## Kebutuhan
PHP 8.0 atau lebih baru (ekstensi `pdo_mysql`, `fileinfo`, `mbstring`) dan MySQL 8 / MariaDB 10.3+.
XAMPP versi terbaru sudah cukup.

## Cara menjalankan (XAMPP / terminal)
1. Jalankan MySQL, lalu impor skema:
   `mysql -u root -p < database/sipakat_kip.sql`
   (atau lewat phpMyAdmin: tab Import, pilih `database/sipakat_kip.sql`)
2. Sesuaikan `config/config.php` (user dan password database).
3. Buat akun demo (password di-hash oleh PHP): `php database/seed.php`
4. Jalankan server dari folder proyek: `php -S localhost:8000`
   (atau taruh folder ini di `htdocs` XAMPP), lalu buka http://localhost:8000/login.html
5. Pastikan folder `storage/uploads` bisa ditulis oleh PHP.

Penting: web harus dibuka lewat `http://localhost...`, bukan klik dua kali berkas HTML,
supaya sesi (cookie) dan `api/` berfungsi.

| Role | NIM / Email | Password |
|---|---|---|
| Mahasiswa | 07352411149 | mhs123 |
| Admin | admin@sipakat.id | admin123 |
| Petugas | petugas@sipakat.id | petugas123 |

## Struktur
```
config/config.php        pengaturan database, batas login, batas kategori IPK/tanggungan
database/sipakat_kip.sql skema 10 tabel + data awal (periode, 48 data latih)
database/seed.php        membuat akun demo ber-hash
includes/bootstrap.php   koneksi PDO, sesi aman, JSON, penjaga login/role/CSRF
includes/validator.php   validasi sisi server (sama dengan validasi.js)
includes/c45.php         algoritma Decision Tree C4.5 (entropy, gain ratio)
api/auth/                login, logout, me, register, lupa_password, ganti_password
api/users.php            CRUD pengguna (Admin)
api/periode.php          CRUD periode + aktif/nonaktif (Admin)
api/data_latih.php       CRUD data latih + impor CSV (Admin)
api/model.php            latih dan lihat model C4.5 (Admin)
api/pendaftaran.php      draf dan kirim pendaftaran (Mahasiswa)
api/berkas.php           unggah dan unduh berkas (Mahasiswa, Petugas, Admin)
api/verifikasi.php       sahkan/kembalikan berkas (Petugas)
api/klasifikasi.php      jalankan C4.5, keputusan akhir, ekspor CSV (Petugas)
api/notifikasi.php       notifikasi milik pengguna
api/dashboard.php        angka ringkasan per role
js/api.js, js/auth-api.js  penghubung front-end (login, registrasi, lupa password, logout)
```

## Relasi tabel (ERD ringkas)
```
users 1──1 mahasiswa
users 1──* pendaftaran *──1 periode
pendaftaran 1──* berkas
users 1──* notifikasi        users 1──* reset_password
users 1──* model_c45 (dilatih_oleh)    data_latih (berdiri sendiri)
```

## Pemetaan ke rubrik penilaian
| Indikator | Letak di kode |
|---|---|
| Pemrosesan request, PHP, validasi server, logika bisnis | `includes/bootstrap.php` (`masukan`, `izinkan`), `includes/validator.php`, aturan bisnis di `periode.php` (kuota), `pendaftaran.php` (periode terbuka, status), `klasifikasi.php` (kuota, hanya berkas sah) |
| Koneksi database, struktur tabel, relasi, query SQL | `bootstrap.php` fungsi `db()`, `database/sipakat_kip.sql` (PK, FK, UNIQUE, CHECK, ENUM), query JOIN di `users.php`, `berkas.php`, `verifikasi.php` |
| Create, Read, Update, Delete | `users.php`, `periode.php`, `data_latih.php` (lengkap CRUD); `pendaftaran.php`, `verifikasi.php`, `klasifikasi.php`, `notifikasi.php` |
| Login/logout, session, password hashing, validasi akses, anti SQL injection | `api/auth/login.php` + `logout.php` (sesi, `password_hash`/`password_verify`, batas percobaan), `wajib_role()` dan `wajib_csrf()` di `bootstrap.php`, semua query memakai prepared statement |

## Keamanan yang diterapkan
- Password disimpan sebagai hash bcrypt (`password_hash`), dicek dengan `password_verify`.
- Semua query memakai prepared statement (`PDO::ATTR_EMULATE_PREPARES = false`); nilai pengguna tidak pernah disambung ke teks SQL.
- Role dicek di server pada setiap endpoint (`penjaga('adm')`, dst.), jadi mengubah JavaScript tidak memberi akses.
- Token CSRF wajib pada permintaan yang mengubah data; cookie sesi HttpOnly + SameSite; ID sesi diganti setelah login; sesi habis setelah 30 menit tidak aktif.
- Login dibatasi 5 kali gagal per 15 menit; pesan error sama untuk akun tidak ada dan password salah.
- Unggah berkas: cek ekstensi dan isi file (finfo), maksimal 2 MB, nama acak, folder `storage/` tidak bisa dibuka lewat URL.
- Pengguna hanya bisa membaca berkas dan notifikasi miliknya sendiri; mahasiswa tidak melihat rekomendasi sistem sebelum keputusan.
- Ekspor CSV menetralkan sel berawalan `= + - @` (CSV injection).

## Contoh pemakaian API (sudah dipasang untuk auth)
`js/auth-api.js` mengganti `enter()`, `reg()`, `sendK/fcheck/fdone()` dan `logout()` agar memakai server.
Halaman lain (Kelola pengguna, Periode, dst.) masih membaca array contoh; sambungkan dengan pola yang sama, misalnya:
```js
var r = await api('users.php', {method: 'POST', body: {nama: n, login: e, role: 'ptg', password: p, aktif: true}});
if (!r.ok) return showE(r.pesan);     // pesan validasi dari server
r = await api('users.php?q=' + encodeURIComponent(uq));   // r.data = daftar pengguna
```
Kode role di API: `mhs`, `adm`, `ptg`. Status pendaftaran: `draft`, `wait`, `ver`, `ret`.

## Catatan
- `config.php` bagian `kategori` menentukan batas IPK (>= 3,50 Tinggi, >= 3,00 Sedang) dan tanggungan (>= 5 Banyak, 3-4 Sedang). Itu asumsi saya; sesuaikan dengan aturan yang dipakai di data latih Anda.
- Kode verifikasi "lupa password" tampil di respons selama `debug = true` karena belum ada pengiriman email. Matikan `debug` sebelum dipakai sungguhan.
- Login Google belum disambungkan.
