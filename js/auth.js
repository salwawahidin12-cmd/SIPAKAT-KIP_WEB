/* LOGIN, LUPA PASSWORD, REGISTRASI. Backend: ganti enter() dengan panggilan API login. */
// ==================================================================
// auth.js : masuk ke aplikasi (login).
// Karena belum ada server, akunnya berupa 3 akun demo di dalam kode.
// Variabel role dan nm ada di data.js, fungsi save() ada di storage.js.
// ==================================================================
//
// DEMO(): daftar akun demo. Tiap akun = [peran, NIM atau email, kata sandi].
function DEMO() {
  var P=window.PWD||['mhs123','admin123','petugas123'];   // pakai kata sandi dari window.PWD kalau ada (bisa berubah), kalau tidak pakai bawaan
  return [['Mahasiswa','07352411149',P[0]],['Admin','admin@sipakat.id',P[1]],['Petugas','petugas@sipakat.id',P[2]]]   // tiga akun: nomor 0 = mahasiswa, 1 = admin, 2 = petugas
}

// drawRoles(): membuat tiga tombol di halaman login (Mahasiswa, Admin, Petugas).
// Klik tombol memanggil fill(nomor akun).
function drawRoles() {
  $('roles').innerHTML=DEMO().map(function(x,i) {   // satu tombol untuk setiap akun demo
    return '<button type="button" onclick="fill('+i+')">'+x[0]+'</button>'
  }).join('')
}

// fill(i): mengisi form login otomatis dengan akun demo nomor i, supaya saat demo tidak perlu mengetik.
function fill(i) {
  var d=DEMO()[i];   // ambil akun demo ke-i
  $('em').value=d[1];   // isi kolom NIM/email
  $('pw').value=d[2];   // isi kolom kata sandi
  toast('Terisi: '+d[1]+' / '+d[2])
}

// start(): dipanggil setelah login berhasil. Menyimpan data, mencatat sesi, lalu pindah ke aplikasi.
function start() {
  save();   // simpan data contoh ke sessionStorage agar tidak hilang saat pindah halaman
  sessionStorage.setItem('sipSes',JSON.stringify({role:role,nm:nm}));   // catat 'tanda sudah login' berisi peran dan nama. Dibaca main.js sebagai penjaga halaman
  location.href='app.html'   // pindah ke app.html
}

// enter(e): memeriksa login, dipanggil saat tombol Masuk ditekan.
// Catatan: versi yang berjalan sekarang ada di pages-extra.js (menimpa fungsi ini)
// dan juga menerima akun hasil registrasi (ACC). Logika dasarnya sama dengan di bawah.
function enter(e) {
  e.preventDefault();   // cegah form memuat ulang halaman
  // u = nomor akun demo yang cocok (null = belum ketemu), k = NIM/email yang diketik (huruf kecil), er = kotak pesan error
  var u=null,k=$('em').value.trim().toLowerCase(),er=$('er');
  // cocokkan dengan setiap akun demo: NIM/email sama (huruf besar/kecil diabaikan) dan kata sandi sama persis
  DEMO().forEach(function(d,i) {
    if(d[1].toLowerCase()==k&&d[2]==$('pw').value)u=i
  });
  // tidak ada yang cocok: tampilkan pesan error lalu berhenti
  if(u===null) {
    er.textContent='NIM/email atau kata sandi salah.';
    er.style.display='block';
    return false
  }
  er.style.display='none';   // cocok: sembunyikan pesan error
  role=['mhs','adm','ptg'][u];   // tentukan peran dari nomor akun: mhs, adm, atau ptg
  nm=['Salwa','Admin','Petugas'][u];   // tentukan nama pengguna
  start();   // simpan sesi lalu pindah ke app.html
  return false   // return false mencegah form dikirim ulang
}

// gLogin(): tombol 'Masuk dengan Google' (demo). Langsung masuk sebagai mahasiswa.
function gLogin() {
  role='mhs';
  nm='Salwa';
  toast('Demo: masuk dengan Google khusus akun mahasiswa');
  start()
}

// logout(): keluar. Hapus tanda login dari sessionStorage lalu kembali ke halaman login.
function logout() {
  save();
  sessionStorage.removeItem('sipSes');
  location.href='login.html'
}

// showLogin(r): menampilkan form login (r = 0) atau form registrasi (r = 1), dan mengulang animasi masuknya.
function showLogin(r) {
  $('login').style.display='grid';
  $('lf').style.display=r?'none':'block';   // r benar: form login disembunyikan, selain itu ditampilkan
  $('rg').style.display=r?'block':'none';
  $('fg').style.display='none';   // form lupa password disembunyikan
  // Trik mengulang animasi CSS: matikan animasi, paksa browser menghitung ulang tampilan
  // (membaca offsetWidth), lalu nyalakan lagi.
  var g=$('lgo');
  g.style.animation='none';
  void g.offsetWidth;
  g.style.animation='';
  [$('lf'),$('rg'),$('fg')].forEach(function(f) {
    Array.prototype.forEach.call(f.children,function(c,i) {
      c.style.animation='none';
      void c.offsetWidth;
      c.style.animation='up .6s ease '+(1.7+i*.1)+'s both'
    })
  })
}

// showForgot(): menampilkan form lupa password (3 langkah), mulai dari langkah 1.
function showForgot() {
  $('lf').style.display='none';
  $('rg').style.display='none';
  $('fg').style.display='block';
  Array.prototype.forEach.call($('fg').children,function(c) {
    c.style.animation='none'
  });
  fstep(1)
}

// fstep(n): menampilkan langkah ke-n pada lupa password (1 = email, 2 = kode, 3 = password baru).
function fstep(n) {
  [1,2,3].forEach(function(i) {
    $('fs'+i).style.display=i==n?'block':'none'   // hanya langkah n yang tampil, langkah lain disembunyikan
  });
  $('fm').style.display='none'
}

// fcheck(): langkah 2 lupa password. Untuk demo, kode yang benar adalah 123456.
function fcheck() {
  if($('fc').value=='123456')fstep(3);   // kode benar: lanjut ke langkah 3
  else {
    $('fm').textContent='Kode salah atau kedaluwarsa.';   // kode salah: tampilkan pesan
    $('fm').style.display='block'
  }
}

// fdone(): selesai mengganti password. Versi di pages-extra.js menimpa fungsi ini
// dan benar-benar memeriksa password baru (minimal 8 karakter dan konfirmasi sama).
function fdone() {
  toast('Password berhasil diubah, silakan masuk');
  showLogin(0)
}

// eye(): tombol mata. Menukar kolom password antara tersembunyi (password) dan terlihat (text).
function eye() {
  var p=$('pw');
  p.type=p.type=='password'?'text':'password'
}
