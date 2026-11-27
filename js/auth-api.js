/* ==================================================================
   auth-api.js : login, registrasi, lupa password, dan logout lewat SERVER (PHP + MySQL).
   Dimuat SETELAH pages-extra.js dan storage.js, sehingga fungsi bernama sama
   (enter, reg, sendK, fcheck, fdone, logout, gLogin) menggantikan versi demo.
   Cara pasang: tambahkan di login.html dan app.html
       <script src="js/api.js"></script>      (sebelum js/auth.js)
       <script src="js/auth-api.js"></script> (sesudah js/storage.js, sebelum js/main.js)
   ================================================================== */

// enter(e): tombol Masuk. Kirim NIM/email dan password ke server.
async function enter(e) {
  e.preventDefault();
  var er = $('er');
  var r = await api('auth/login.php', { method: 'POST', body: { login: $('em').value.trim(), password: $('pw').value } });
  if (!r.ok) { er.textContent = r.pesan; er.style.display = 'block'; return false; }
  er.style.display = 'none';
  setCsrf(r.csrf);
  role = r.user.role;   // mhs | adm | ptg, ditentukan SERVER (bukan dari tombol yang diklik)
  nm = r.user.nm;
  start();              // start() (auth.js) mencatat sesi tampilan lalu membuka app.html
  return false;
}

// reg(e): registrasi mahasiswa.
async function reg(e) {
  e.preventDefault();
  var er = $('rer');
  var r = await api('auth/register.php', { method: 'POST', body: {
    nama: $('r1').value.trim(), nim: $('r2').value.trim(), prodi: $('r3').value,
    email: $('r4').value.trim(), password: $('r5').value, konfirmasi: $('r6').value } });
  if (!r.ok) { er.textContent = r.pesan; er.style.display = 'block'; return false; }
  er.style.display = 'none';
  toast('Akun dibuat, silakan masuk');
  showLogin(0);
  $('em').value = $('r2').value.trim();
  return false;
}

// Lupa password: kode dan password dikirim ke server; server yang memeriksa.
var FK = '', FKODE = '';   // FK = NIM/email yang direset, FKODE = kode yang sudah diverifikasi
async function sendK() {
  var k = $('fe').value.trim();
  if (!k) return fmErr('Email / NIM wajib diisi.');
  var r = await api('auth/lupa_password.php', { method: 'POST', body: { aksi: 'kirim', login: k } });
  if (!r.ok) return fmErr(r.pesan);
  FK = k;
  // Kode dikirim ke email terdaftar. Kalau email gagal terkirim dan debug = true di config.php, kode ditampilkan sebagai cadangan.
  if (r.kode_demo) toast('Email belum terkirim (' + (r.mail_error || 'cek config.php') + '). Kode demo: ' + r.kode_demo);
  else toast('Jika akun terdaftar, kode verifikasi dikirim ke email Anda');
  fstep(2);
}
async function fcheck() {
  var r = await api('auth/lupa_password.php', { method: 'POST', body: { aksi: 'cek', login: FK, kode: $('fc').value.trim() } });
  if (!r.ok) return fmErr(r.pesan);
  FKODE = $('fc').value.trim();
  fstep(3);
}
async function fdone() {
  var r = await api('auth/lupa_password.php', { method: 'POST', body: { aksi: 'reset', login: FK, kode: FKODE, password: $('fp1').value, konfirmasi: $('fp2').value } });
  if (!r.ok) return fmErr(r.pesan);
  toast('Password berhasil diubah, silakan masuk');
  showLogin(0);
}
function fmErr(m) { $('fm').textContent = m; $('fm').style.display = 'block'; }

// Halaman aplikasi (app.html): pastikan sesi MASIH berlaku di server dan ambil peran dari server.
// Mengubah sipSes di sessionStorage hanya mengubah tampilan; data tetap dijaga server (403/401).
if (document.getElementById('app')) {
  api('auth/me.php').then(function (r) {
    if (!r.ok) { sessionStorage.removeItem('sipSes'); location.replace('login.html'); return; }
    setCsrf(r.csrf);
    if (r.user.role !== role) { role = r.user.role; nm = r.user.nm; sessionStorage.setItem('sipSes', JSON.stringify({ role: role, nm: nm })); location.reload(); }
  });
}

// Login Google: tombol resmi Google (Google Identity Services) memberi ID token,
// lalu token itu DIPERIKSA server di api/auth/google.php sebelum sesi dibuat.
var GOOGLE_CLIENT_ID = '100901048754-8v40h3lflrv1am4v9rf9q7br2rh8vf2o.apps.googleusercontent.com';

async function gCallback(resp) {
  var er = $('er');
  var r = await api('auth/google.php', { method: 'POST', body: { credential: resp.credential } });
  if (!r.ok) { er.textContent = r.pesan; er.style.display = 'block'; return; }
  er.style.display = 'none';
  setCsrf(r.csrf);
  role = r.user.role;
  nm = r.user.nm;
  start();
}

// Pasang tombol Google di #gbtn begitu pustaka Google selesai dimuat.
function gPasang() {
  var box = document.getElementById('gbtn');
  if (!box) return;
  var coba = 0, t = setInterval(function () {
    coba++;
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(t);
      google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: gCallback });
      google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', text: 'signin_with', width: Math.min(360, box.parentNode.clientWidth || 360), locale: 'id' });
    } else if (coba > 40) {   // 10 detik tanpa pustaka Google (tidak ada internet)
      clearInterval(t);
      box.innerHTML = '<button class="s" type="button" style="width:100%" onclick="toast(\'Login Google butuh koneksi internet\')">G  Masuk dengan Google</button>';
    }
  }, 250);
}
gPasang();

// gLogin(): dipertahankan supaya pemanggilan lama tidak error.
function gLogin() { toast('Gunakan tombol Masuk dengan Google'); }

// logout(): hapus sesi di server lalu kembali ke login.
async function logout() {
  await api('auth/logout.php', { method: 'POST' });
  sessionStorage.removeItem('sipSes');
  sessionStorage.removeItem('sipCsrf');
  sessionStorage.removeItem('sipDat');   // buang data tampilan akun sebelumnya
  location.href = 'login.html';
}

// logout(): hapus sesi di server lalu kembali ke login.
async function logout() {
  await api('auth/logout.php', { method: 'POST' });
  sessionStorage.removeItem('sipSes');
  sessionStorage.removeItem('sipCsrf');
  sessionStorage.removeItem('sipDat');   // buang data tampilan akun sebelumnya
  location.href = 'login.html';
}
