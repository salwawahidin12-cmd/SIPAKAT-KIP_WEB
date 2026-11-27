/* ==================================================================
   profil-api.js : menghubungkan halaman PROFIL ke API (PHP + MySQL).
   Dimuat SETELAH pages-extra.js, sehingga V.mhs_prof dan savePrf() di bawah
   menggantikan versi lama yang hanya mengubah data contoh di browser.
   Pemilik akun bisa mengubah sendiri:
     - nama lengkap (semua role) dan NIM (mahasiswa)  -> PUT api/profil.php
     - kata sandi                                      -> POST api/auth/ganti_password.php
   Role hanya ditampilkan (tidak bisa diubah dari halaman ini).
   Pola menghubungkan halaman ke API:
     1) panggil  var r = await api('nama-endpoint.php', {method:'POST', body:{...}});
     2) cek      if (!r.ok) -> tampilkan r.pesan (pesan validasi dari server)
     3) berhasil -> tampilkan toast lalu go('halaman') untuk menggambar ulang
   ================================================================== */

// profilSaatIni(): nama dan NIM akun yang sedang login menurut server.
function profilSaatIni() {
  if (role == 'mhs') {
    var p = (typeof SRV !== 'undefined' && SRV && SRV.profil) ? SRV.profil : null;
    return { nama: p ? (p.nama || '') : F.n, nim: p ? (p.nim || '') : F.nim };
  }
  return { nama: nm, nim: '' };   // admin dan petugas: nm berisi nama lengkap
}

V.mhs_prof = function () {
  var cur = profilSaatIni();
  return head('Profil', 'Profil') +
    '<div class="card" style="max-width:480px"><div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">' +
    '<div style="width:56px;height:56px;border-radius:50%;background:var(--g);color:#fff;display:flex;align-items:center;justify-content:center;font:700 22px Poppins">' + esc(cur.nama.charAt(0) || nm.charAt(0)) + '</div>' +
    '<div><b>' + esc(cur.nama) + '</b><br><small style="color:var(--mut)">' + R[role].n + '</small></div></div>' +
    fi('pf1', 'Nama lengkap', cur.nama, 'text', 'maxlength="100"') +
    (role == 'mhs' ? fi('pf5', 'NIM', cur.nim, 'text', 'inputmode="numeric" maxlength="14" placeholder="8–14 angka"') : '') +
    fi('pf2', 'Role', R[role].n, 'text', 'disabled') +
    '<p style="margin:14px 0 0;color:var(--mut)"><small>Kosongkan dua kolom kata sandi di bawah kalau Anda hanya ingin mengubah nama atau NIM.</small></p>' +
    fi('pf4', 'Kata sandi lama (kosongkan jika Anda masuk dengan Google)', '', 'password', 'autocomplete="new-password"') +
    fi('pf3', 'Kata sandi baru (min. 8 karakter)', '', 'password', 'autocomplete="new-password" placeholder="Ketik kata sandi baru"') +
    '<div id="pfm" class="note" role="alert" style="display:none;margin-top:12px"></div>' +
    '<p style="margin-top:16px;text-align:right"><button class="p" onclick="savePrf()">Simpan</button></p></div>';
};
V.adm_prof = V.ptg_prof = V.mhs_prof;   // semua role memakai Profil yang sama

// savePrf(): simpan nama/NIM (kalau berubah) lalu kata sandi (kalau diisi).
// Server yang memeriksa semuanya lagi: format, NIM kembar, kata sandi lama, dan penguncian setelah pendaftaran dikirim.
async function savePrf() {
  var m = $('pfm'), cur = profilSaatIni();
  var nama = $('pf1').value.trim();
  var nim = role == 'mhs' ? $('pf5').value.trim() : '';
  var lama = $('pf4').value, baru = $('pf3').value;
  function tampil(t) { m.textContent = t; m.style.display = 'block'; }

  var ubahProfil = nama != cur.nama || (role == 'mhs' && nim != cur.nim);
  var ubahSandi = lama != '' || baru != '';
  if (!ubahProfil && !ubahSandi) return tampil('Tidak ada yang diubah.');
  if (ubahProfil) {
    if (!nama) return tampil('Nama lengkap wajib diisi.');
    if (role == 'mhs' && !/^\d{8,14}$/.test(nim)) return tampil('NIM harus 8–14 angka.');
    var r1 = await api('profil.php', { method: 'PUT', body: { nama: nama, nim: nim } });
    if (!r1.ok) return tampil(r1.pesan);   // misalnya "NIM sudah terdaftar."
    nm = nama;   // nama lengkap, sama seperti yang dikirim server saat login
    try { sessionStorage.setItem('sipSes', JSON.stringify({ role: role, nm: nm })); } catch (e) {}
    var w = $('who'); if (w) w.textContent = nm + ' (' + R[role].n + ')';   // segarkan nama di bilah atas
    if (role == 'mhs') { FOK = false; await loadSrv(); }   // isi ulang form pendaftaran dari server
  }
  if (ubahSandi) {
    var r2 = await api('auth/ganti_password.php', { method: 'POST', body: { lama: lama, baru: baru } });
    if (!r2.ok) {
      if (ubahProfil) { toast('Profil tersimpan'); go('prof'); setTimeout(function () { var e = $('pfm'); if (e) { e.textContent = 'Kata sandi belum diubah: ' + r2.pesan; e.style.display = 'block'; } }, 400); return; }
      return tampil(r2.pesan);   // pesan dari server, misalnya "Password lama salah."
    }
  }
  toast(ubahSandi && ubahProfil ? 'Profil dan kata sandi diperbarui' : ubahSandi ? 'Kata sandi berhasil diubah' : 'Profil diperbarui');
  go('prof');
}
