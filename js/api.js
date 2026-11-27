/* ==================================================================
   api.js : penghubung front-end ke backend PHP (folder api/).
   Dimuat SEBELUM berkas halaman lain. Menyimpan token CSRF dan membungkus fetch().
   Pemakaian:  const r = await api('users.php', {method:'POST', body:{nama:'...'}});
   Kalau ok = false, r.pesan berisi pesan error dari server.
   ================================================================== */
var CSRF = sessionStorage.getItem('sipCsrf') || '';   // token CSRF dari server (login/me), dikirim di setiap permintaan yang mengubah data

// setCsrf(t): simpan token baru (dipanggil setelah login / me).
function setCsrf(t) {
  CSRF = t || '';
  sessionStorage.setItem('sipCsrf', CSRF);
}

// api(path, opsi): panggil endpoint. path relatif terhadap folder api/ (contoh 'auth/login.php?x=1').
//   opsi.method = GET | POST | PUT | DELETE (bawaan GET)
//   opsi.body   = objek (dikirim sebagai JSON) atau FormData (untuk unggah berkas)
// Selalu mengembalikan objek JSON dari server; kalau jaringan putus, {ok:false, pesan:'...'}.
async function api(path, opsi) {
  opsi = opsi || {};
  var h = {};
  var init = { method: opsi.method || 'GET', credentials: 'same-origin', headers: h };
  if (init.method !== 'GET') h['X-CSRF-Token'] = CSRF;   // bukti bahwa permintaan datang dari aplikasi ini
  if (opsi.body instanceof FormData) init.body = opsi.body;   // unggah berkas: browser mengatur Content-Type sendiri
  else if (opsi.body) { h['Content-Type'] = 'application/json'; init.body = JSON.stringify(opsi.body); }
  try {
    var res = await fetch('api/' + path, init);
    var data = await res.json();
    data.status = res.status;
    // 401 pada halaman aplikasi = sesi habis: kembali ke halaman login.
    if (res.status === 401 && !/login\.html$/.test(location.pathname) && !/auth\//.test(path)) {
      sessionStorage.removeItem('sipSes');
      location.replace('login.html');
    }
    return data;
  } catch (e) {
    return { ok: false, pesan: 'Tidak dapat terhubung ke server.', status: 0 };
  }
}
