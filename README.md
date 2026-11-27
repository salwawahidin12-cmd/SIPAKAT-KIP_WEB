# SIPAKAT-KIP (Sistem Seleksi KIP-Kuliah) - Tampilan Web

Tampilan web statis (HTML + CSS + JavaScript biasa, tanpa framework dan tanpa instalasi).
Semua data masih contoh dan hanya tersimpan di memori browser.

## Cara membuka
1. Ekstrak folder, lalu klik dua kali `index.html` (Chrome/Edge/Firefox).
2. Atau jalankan server lokal: `python -m http.server 8000`, lalu buka http://localhost:8000
Font (Inter dan Poppins) dimuat dari Google Fonts; tanpa internet tampilan tetap jalan dengan font cadangan.

## Akun demo (satu kata sandi khusus per role)
| Role | NIM / Email | Kata sandi |
|---|---|---|
| Mahasiswa | 07352411149 | mhs123 |
| Admin | admin@sipakat.id | admin123 |
| Petugas Seleksi | petugas@sipakat.id | petugas123 |
Kode verifikasi "Lupa password" (demo): 123456.

## Struktur folder
```
sipakat-kip-web/
  index.html      landing page
  login.html      login, registrasi, lupa password
  app.html        kerangka aplikasi (dashboard semua role, halaman diisi oleh JavaScript)
  css/
    base.css        warna/tema, reset, tombol, formulir
    components.css  kartu, grid, badge, tabel, langkah, tab, catatan, toast
    topbar.css      bilah atas, lonceng, menu profil
    layout.css      sidebar, area utama, footer
    auth.css        login/registrasi/lupa password + animasi logo
    modal.css       pengaturan tampilan dan modal
    landing.css     landing page
  assets/ilustrasi-landing.png
  js/   data, helpers, modal, layout, auth, pages-shared, pages-mahasiswa, pages-admin, pages-petugas, pages-extra, storage, main
```
Urutan CSS per halaman: landing = base, components, topbar, landing; login = base, components, auth; app = base, components, topbar, layout, modal.
`storage.js` menyimpan data contoh di sessionStorage agar tidak hilang saat pindah halaman.

## Cara kerja singkat
- Setiap halaman dalam adalah fungsi di objek `V` dengan nama `role_halaman`, misalnya `V.adm_latih`. Fungsi itu mengembalikan teks HTML.
- `go('latih')` memilih fungsi sesuai role yang login, lalu menaruh hasilnya di `<main id="main">`.
- Menu sidebar ada di `R` (data.js). Penjelasan "Fungsi halaman" ada di `D` (data.js).

### Menambah halaman baru
1. Tambah entri menu di `R[role].m` (data.js): `['kode','Label menu']`.
2. Buat `V.role_kode = function () { return head('Judul','Crumb') + '...HTML...'; };` di berkas halaman role itu.
3. Tambah penjelasannya di `D['role_kode']` (data.js).

## Catatan untuk tim backend (bagian yang perlu disambungkan ke server)
| Bagian di web | Berkas / fungsi | Saran |
|---|---|---|
| Login 3 role | auth.js `enter()` | POST /api/login, server mengembalikan role dan token |
| Login Google | auth.js `gLogin()` | OAuth Google (sekarang demo) |
| Lupa password | auth.js `fstep/fcheck/fdone` | kirim kode ke email, verifikasi kode, simpan password ter-hash |
| Pengguna (Admin) | pages-admin.js `saveU()`, array `UL` | CRUD /api/users; password sementara + wajib ganti saat login pertama |
| Periode | `saveNP()`, `NP`, `tgP()` | CRUD /api/periode; hanya satu periode aktif; tolak perbaikan berkas bila periode lewat |
| Data latih | `saveDL()`, `parseImp()`, `doImp()`, array `DL` | validasi di server juga (nilai kategori, label sesuai kelas) |
| Model C4.5 | halaman `V.adm_model` | hitung entropy/gain ratio di server, kirim hasilnya ke tampilan (sekarang angka contoh) |
| Notifikasi | `NT`, `bell()`, `openN()` | tabel notifikasi (user_id, pesan, tautan, dibaca, waktu) |
| Unggah berkas, ekspor PDF, unduh template | `openX()`, `dlTpl()` | sekarang simulasi |
Batas kategori (IPK, penghasilan, dst.) harus satu aturan yang sama untuk data latih dan data pendaftar.

## Pembaruan
- `js/pages-extra.js` (dimuat terakhir) menambah: halaman Ubah (pengguna, periode, data latih), Hapus dengan konfirmasi, cari/filter, registrasi + lupa password berfungsi, form pendaftaran tervalidasi (unggah PDF/JPG maks 2 MB), verifikasi & keputusan tersimpan, ekspor CSV/cetak PDF, Profil baca-saja untuk semua role (ubah kata sandi dihapus).
- Tombol "Latih model" dan "Jalankan klasifikasi" berjalan di halaman yang sama (tanpa pindah halaman).
