/* JENDELA (MODAL) UMUM */
// ==================================================================
// modal.js : jendela pop-up (modal).
// Di app.html ada dua elemen: #mm = lapisan gelap yang menutupi halaman,
// dan #mc = kotak putih di tengahnya yang berisi konten.
// ==================================================================
//
// openM(w, h): membuka pop-up. w = lebar dalam piksel, h = isi dalam bentuk HTML.
function openM(w,h) {
  var c=$('mc');   // ambil kotak putih (isi modal)
  c.style.width='min('+w+'px,94vw)';   // lebar w piksel, tapi maksimal 94% lebar layar supaya muat di HP
  c.innerHTML=h;   // isi kotak dengan HTML yang dikirim: satu fungsi bisa dipakai untuk semua pop-up
  $('mm').style.display='flex'   // tampilkan lapisan gelap, maka kotak terlihat di tengah layar
}

// closeM(): menutup pop-up. Dipanggil tombol silang, tombol Batal, dan tombol Esc (diatur di main.js).
function closeM() {
  $('mm').style.display='none'
}

// mHead(t): bagian atas pop-up, berisi judul t dan tombol silang untuk menutup.
function mHead(t) {
  return '<div class="bar" style="margin-bottom:0"><h3>'+t+'</h3><button class="s" onclick="closeM()" aria-label="Tutup" style="padding:4px 10px">✕</button></div>'
}

// mErr(): kotak pesan error berwarna merah, awalnya tersembunyi (display:none). Diisi oleh showE().
function mErr() {
  return '<div id="merr" class="note" role="alert" style="display:none;margin-top:10px;background:#FEF2F2;color:#B91C1C;border-color:#DC2626"></div>'
}

// mFoot(a, b): bagian bawah pop-up. Tombol Batal di kiri (teks a), tombol aksi di kanan (HTML b).
function mFoot(a,b) {
  return '<p style="display:flex;gap:8px;justify-content:space-between;margin-top:16px"><button class="o" onclick="closeM()">'+a+'</button>'+b+'</p>'
}

// showE(m): menampilkan pesan error m di dalam pop-up. Dipakai saat validasi gagal.
function showE(m) {
  var e=$('merr');   // ambil kotak merah
  e.textContent=m;   // isi dengan pesan
  e.style.display='block'   // tampilkan
}
