/* KERANGKA HALAMAN: navigasi, topbar, notifikasi lonceng, pengaturan tampilan */
// ==================================================================
// layout.js : kerangka aplikasi di app.html.
// Isinya: berpindah halaman (go), sidebar, menu profil, lonceng notifikasi,
// dan jendela pengaturan tampilan (tema, ukuran huruf, warna).
// ==================================================================
//
/* go(): membuka halaman sesuai role, menggambar sidebar, kotak info, dan footer */
// go(p): membuka halaman berkode p (contoh 'latih'). Dipanggil dari menu, tombol, dan main.js.
function go(p) {
  page=p;   // catat halaman yang sedang dibuka (dibaca oleh fungsi lain, misalnya saveU)
  $('pdd').classList.remove('on');   // tutup menu profil (pdd) kalau sedang terbuka
  $('bdd').classList.remove('on');   // tutup daftar notifikasi lonceng (bdd) kalau sedang terbuka
  // Gambar menu sidebar dari R[role].m. Menu yang kodenya sama dengan halaman ini diberi kelas 'on' (sorot).
  // PAR[p] dipakai halaman Ubah (misal 'user_f') supaya yang disorot tetap menu induknya ('user').
  $('nav').innerHTML=R[role].m.map(function(m,i) {
    return '<a class="'+(m[0]==(PAR[p]||p)?'on':'')+'" onclick="goI('+i+')">'+m[1]+'</a>'
  }).join('')+'<a onclick="logout()">Keluar</a><button class="gear" onclick="openSet()" title="Pengaturan tampilan" aria-label="Pengaturan tampilan">⚙</button>';   // tambah tautan Keluar dan tombol roda gigi di ujung menu
  $('nav').classList.remove('open');   // di layar HP, tutup sidebar setelah memilih menu
  // Ambil fungsi halaman V['role_kode'] (kalau tidak ada, pakai V.none), jalankan untuk mendapat teks HTML.
  // Teks contoh paginasi '‹ 1 2 3 ›' diganti dengan PG (tombol halaman) dari pages-extra.js.
  var h=(V[role+'_'+p]||V.none)().split('‹ 1 2 3 ›').join(PG);
  // Taruh HTML di area utama. Setelah penutup </div> pertama (judul dan crumb) disisipkan kotak 'Fungsi halaman' dari D (data.js).
  $('main').innerHTML=h.replace('</div>','</div><div class="info"><b>Fungsi halaman:</b> '+(D[role+'_'+p]||'')+'</div>');
  $('main').insertAdjacentHTML('beforeend','<div class="ft"><span>© 2026 Informatika, Universitas Khairun</span></div>');   // tambahkan footer di bagian paling bawah
  window.scrollTo(0,0);   // gulung layar ke paling atas
  updDot()   // perbarui titik merah lonceng sesuai notifikasi yang belum dibaca
}

// goI(i): membuka halaman menu ke-i milik role ini (dipanggil saat menu sidebar diklik).
function goI(i) {
  if (R[role].m[i][0] == 'daftar') st = 1;   // membuka menu Pendaftaran dari sidebar selalu mulai dari langkah 1 (Data diri)
  go(R[role].m[i][0])
}

// goD(): ke Dashboard (menu pertama setiap role).
function goD() {
  go(R[role].m[0][0])
}

// goP(): ke halaman Profil.
function goP() {
  go('prof')
}

// goN(): ke halaman Notifikasi.
function goN() {
  go('notif')
}

// tg(): tombol hamburger. Layar lebar (di atas 760px): sidebar disembunyikan atau ditampilkan.
// Layar sempit (HP): sidebar dibuka atau ditutup sebagai panel.
function tg() {
  var s=document.querySelector('.side');   // s = elemen sidebar
  if(innerWidth>760)s.classList.toggle('hide');   // toggle = nyalakan kelasnya kalau belum ada, matikan kalau sudah ada
  else s.classList.toggle('open')
}

// pmenu(): buka atau tutup menu profil di bilah atas.
function pmenu() {
  $('pdd').classList.toggle('on')
}

// bell(): klik lonceng. Mengisi daftar notifikasi role ini lalu membuka atau menutup dropdown-nya.
function bell() {
  $('pdd').classList.remove('on');   // tutup menu profil supaya tidak bertumpuk
  var d=$('bdd');   // d = kotak dropdown notifikasi
  // Setiap notifikasi x = [pesan, waktu, belum dibaca, halaman tujuan].
  // Yang belum dibaca ditebalkan dengan tanda ●, yang sudah dibaca memakai tanda ○.
  d.innerHTML=NT[role].map(function(x) {
    return '<div>'+(x[2]?'<b>● '+x[0]+'</b>':'○ '+x[0])+'<br><small>'+x[1]+'</small></div>'
  }).join('')+'<a onclick="goN()">Lihat semua notifikasi →</a>';
  d.classList.toggle('on')
}

// updDot(): menampilkan titik merah di lonceng kalau masih ada notifikasi belum dibaca.
function updDot() {
  var n=NT[role].filter(function(x) {   // n = jumlah notifikasi yang belum dibaca (x[2] bernilai 1)
    return x[2]
  }).length;
  document.querySelector('#bell .dot').style.display=n?'block':'none'   // ada yang belum dibaca: titik tampil, selain itu disembunyikan
}

// openSet() / closeSet(): membuka dan menutup jendela Pengaturan tampilan (elemen #set).
function openSet() {
  $('set').style.display='flex'
}

function closeSet() {
  $('set').style.display='none'
}

// setT(i): memilih tema. 0 = terang, 1 = gelap, 2 = ikuti pengaturan perangkat.
function setT(i) {
  var h=document.documentElement;   // elemen <html>; CSS membaca atribut data-theme di sini
  if(i==2)h.removeAttribute('data-theme');   // ikuti perangkat: hapus atribut agar CSS memakai pengaturan sistem
  else h.setAttribute('data-theme',['light','dark'][i])
}

// setS(i): memilih ukuran huruf. 0 = kecil (13px), 1 = sedang (15px), 2 = besar (17px).
function setS(i) {
  document.body.style.fontSize=[13,15,17][i]+'px'
}

// setC(i): memilih warna utama. 0 = hijau, 1 = biru, 2 = abu-abu.
// Tiap pilihan berisi dua warna: [warna utama, warna lebih gelap untuk hover].
function setC(i) {
  var c=[['#166534','#14532d'],['#1e40af','#1e3a8a'],['#374151','#1f2937']][i],s=document.documentElement.style;
  document.documentElement.setAttribute('data-warna',i);   // kontras.css memakai atribut ini untuk warna teks aksen di mode gelap
  s.setProperty('--g',c[0]);   // --g dan --g2 adalah variabel warna CSS (base.css) yang dipakai tombol, badge, dll.
  s.setProperty('--g2',c[1])
}

// rs(): tombol Reset. Kembalikan pengaturan ke bawaan: tema ikut perangkat, huruf sedang, warna hijau.
function rs() {
  setT(2);
  setS(1);
  setC(0)
}
