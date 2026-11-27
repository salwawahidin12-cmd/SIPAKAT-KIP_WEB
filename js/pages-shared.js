/* HALAMAN BERSAMA: Profil dan Notifikasi (semua role) */

// V.mhs_prof: halaman Profil (nama, NIM/email, role, ubah kata sandi).
// Catatan: pages-extra.js menimpa halaman ini dengan versi baca-saja, jadi versi di bawah adalah versi awal.
V.mhs_prof = function() {
  // idn = NIM (mahasiswa) atau email (admin/petugas) yang ditampilkan dan tidak dapat diubah.
  // DEMO()[ri()][1] mengambil identitas akun demo sesuai role yang login.
  var idn=role=='mhs'?'07352411149':DEMO()[ri()][1];
  return head('Profil','Profil')+'<div class="two2"><div class="card" style="margin:0"><div style="display:flex;gap:12px;align-items:center"><div style="width:48px;height:48px;border-radius:50%;background:var(--g);color:#fff;display:flex;align-items:center;justify-content:center;font:700 20px Poppins">'+nm.charAt(0)+'</div><div><b>'+nm+'</b><br><small style="color:var(--mut)">'+R[role].n+'</small></div></div><label>Nama lengkap</label><input id="pn" value="'+nm+'"><label>'+(role=='mhs'?'NIM':'Email')+' (tidak dapat diubah)</label><input value="'+idn+'" disabled><label>Role (tidak dapat diubah)</label><input value="'+R[role].n+'" disabled><label>No. HP</label><input id="ph" placeholder="08xx-xxxx-xxxx"></div><div class="card" style="margin:0"><h3 style="font-size:16px">Ubah kata sandi</h3><label>Password lama</label><input id="po" type="password"><label>Password baru (min. 8 karakter)</label><input id="pp" type="password"><label>Konfirmasi password</label><input id="pc" type="password"><div id="pm" class="note" role="alert" style="display:none;margin-top:12px"></div></div></div><p style="display:flex;gap:8px;justify-content:space-between"><button class="o" onclick="goD()">Batal</button><button class="p" onclick="saveP()">Simpan perubahan</button></p>'
};
// Admin dan Petugas memakai halaman Profil yang sama dengan Mahasiswa.
V.adm_prof = V.mhs_prof;
V.ptg_prof = V.mhs_prof;

// V.mhs_notif: halaman Notifikasi, dipakai bersama oleh ketiga role (V.adm_notif dan V.ptg_notif di bawahnya).
// Ada tab filter Semua / Belum dibaca / Dibaca (variabel nf di data.js) dan tombol Tandai semua dibaca.
V.mhs_notif = function() {
  // L = daftar notifikasi role ini setelah difilter sesuai tab (nf).
  // Tiap elemen berpasangan [nomor asli, notifikasi] supaya tombol Lihat tetap menunjuk notifikasi yang benar.
  // Notifikasi x = [pesan, waktu, belum dibaca (1/0), halaman tujuan].
  var L=NT[role].map(function(x,i) {
    return [i,x]
  }).filter(function(a) {
    return nf==0||(nf==1?a[1][2]:!a[1][2])
  });
  return head('Notifikasi','Notifikasi')+'<div class="bar"><div class="tabs" style="margin:0">'+['Semua','Belum dibaca','Dibaca'].map(function(t,i) {
    return '<button class="'+(nf==i?'on':'')+'" onclick="setNF('+i+')">'+t+'</button>'
  }).join('')+'</div><button class="s" onclick="markAll()">✔ Tandai semua dibaca</button></div><div class="card">'+(L.length?tbl(['','Notifikasi','Waktu','Aksi'],L.map(function(a) {
    var x=a[1];
    return tr([x[2]?'<b>●</b>':'○',x[2]?'<b>'+x[0]+'</b>':x[0],x[1],'<button class="p" style="padding:5px 12px" onclick="openN('+a[0]+')">Lihat</button>'])
  })):'<p>Tidak ada notifikasi.</p>')+'<p style="text-align:center;margin:12px 0 0">‹ 1 2 3 ›</p></div>'
};
V.adm_notif = V.mhs_notif;
V.ptg_notif = V.mhs_notif;

// ri(): nomor role yang sedang login: mhs = 0, adm = 1, ptg = 2.
// Sama dengan urutan akun di DEMO() (auth.js) dan array PWD (data.js).
function ri() {
  return {mhs:0,adm:1,ptg:2}[role]
}

// saveP(): tombol Simpan perubahan pada Profil versi awal. Memeriksa nama dan (kalau diisi) kata sandi.
// Catatan: tidak dipakai lagi karena Profil versi pages-extra.js memakai savePw().
function saveP() {
  // m = kotak pesan, o = password lama, p = password baru, c = konfirmasi, n = nama, e = pesan error (kosong = lolos)
  var m=$('pm'),o=$('po').value,p=$('pp').value,c=$('pc').value,n=$('pn').value.trim(),e='';
  // Pemeriksaan berurutan: nama wajib; lalu kalau ada isian kata sandi, periksa lama, panjang, beda dari lama, dan konfirmasi.
  if(!n)e='Nama lengkap wajib diisi.';
  else if(o||p||c) {
    if(o!==DEMO()[ri()][2])e='Password lama salah.';
    else if(p.length<8)e='Password baru minimal 8 karakter.';
    else if(p===o)e='Password baru tidak boleh sama dengan password lama.';
    else if(p!==c)e='Konfirmasi password tidak sama.'
  }
  // Ada error: warnai kotak pesan merah, tampilkan pesannya, dan berhenti (tidak disimpan).
  if(e) {
    m.style.background='#FEF2F2';
    m.style.color='#B91C1C';
    m.style.borderColor='#DC2626';
    m.textContent=e;
    m.style.display='block';
    return
  }
  // Lolos: simpan nama baru, ganti kata sandi hanya kalau diisi, perbarui nama di bilah atas, lalu gambar ulang Profil.
  nm=n;
  if(p)PWD[ri()]=p;
  $('who').textContent=nm+' ('+R[role].n+')';
  toast('Perubahan profil disimpan');
  go('prof')
}

// setNF(i): memilih tab filter notifikasi (0 semua, 1 belum dibaca, 2 dibaca), lalu gambar ulang halaman.
function setNF(i) {
  nf=i;
  go('notif')
}

// markAll(): menandai semua notifikasi role ini sebagai sudah dibaca (x[2] = 0).
function markAll() {
  NT[role].forEach(function(x) {
    x[2]=0
  });
  go('notif')
}

// openN(i): tombol Lihat. Tandai notifikasi ke-i sudah dibaca, lalu buka halaman tujuannya (kolom ke-4).
function openN(i) {
  NT[role][i][2]=0;
  go(NT[role][i][3])
}
