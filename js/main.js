/* TITIK AWAL: dijalankan terakhir. Dipakai login.html dan app.html. */
// ==================================================================
// main.js : titik awal aplikasi. Berkas ini dimuat paling akhir, jadi semua fungsi
// dari berkas lain sudah tersedia. Yang dikerjakan: memuat data tersimpan, memasang
// tombol Esc, lalu menyiapkan halaman sesuai berkas HTML yang membukanya.
// ==================================================================
//
// 1) Pulihkan data contoh dari sessionStorage (fungsi load() ada di storage.js).
load();

// 2) Tombol Esc menutup jendela yang sedang terbuka: pengaturan tampilan (closeSet),
// form tambah pengguna (closeU), atau pop-up umum (closeM).
document.addEventListener('keydown', function (e) {
  // window[f] memeriksa fungsinya ada dulu (di login.html fungsi-fungsi ini tidak dimuat), baru dipanggil
  if (e.key == 'Escape') ['closeSet','closeU','closeM'].forEach(function (f) { if (window[f]) window[f]() });
});

// 3) Tentukan halaman mana yang sedang dibuka dengan memeriksa elemen yang khas.
if ($('lf')) {   // ada form login (#lf): ini login.html
  drawRoles();   // gambar tombol pilih akun demo (Mahasiswa/Admin/Petugas)
  showLogin(/daftar/.test(location.search) ? 1 : 0)   // alamat memuat '?daftar' = tampilkan form registrasi (1), selain itu form login (0)
} else if ($('app')) {   // ada kerangka aplikasi (#app): ini app.html, wajib sudah login
  var ses = null;   // ses = data sesi login (peran dan nama)
  try { ses = JSON.parse(sessionStorage.getItem('sipSes')) } catch (e) {}   // baca tanda login yang dicatat start() di auth.js
  if (!ses) location.replace('login.html');   // belum login: kembalikan ke halaman login
  else {
    role = ses.role; nm = ses.nm;   // pulihkan peran dan nama pengguna ke variabel global
    $('app').style.display = 'block';   // tampilkan aplikasi (awalnya tersembunyi supaya tidak berkedip sebelum pemeriksaan login)
    $('who').textContent = nm + ' (' + R[role].n + ')';   // tulis nama dan peran di bilah atas
    go(R[role].m[0][0])   // buka halaman pertama menu role ini, yaitu Dashboard
  }
}
