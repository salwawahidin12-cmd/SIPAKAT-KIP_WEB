/* FUNGSI BANTU: elemen, toast, badge, tabel, judul halaman */
// ==================================================================
// helpers.js : kotak perkakas.
// Fungsi kecil yang dipakai berulang oleh berkas lain: mengambil elemen,
// pesan singkat (toast), label status (badge), tabel, judul halaman,
// dan format tanggal. Dimuat setelah data.js dan sebelum validasi.js.
// ==================================================================
//
// act = potongan HTML dua tombol (Ubah dan Hapus) untuk kolom Aksi tabel.
// Di sini tombolnya hanya simulasi (menampilkan toast). Versi yang benar-benar
// berfungsi ada di pages-extra.js.
var act = "<button class=\"s\" style=\"padding:5px 10px\" onclick=\"toast('Form ubah data terbuka')\">Ubah</button> <button class=\"d\" onclick=\"toast('Konfirmasi hapus muncul di sini')\">Hapus</button>";  // tombol Ubah/Hapus di tabel
// V = wadah semua halaman. Setiap halaman ditulis sebagai V.peran_halaman = function(){...}
// yang mengembalikan teks HTML. Fungsi go() di layout.js memanggil V[role+'_'+page]()
// lalu menaruh hasilnya di area utama halaman.
var V = {};  // daftar fungsi pembuat halaman: V[role_halaman]()
// Halaman cadangan: dipakai go() kalau halaman yang diminta tidak ada di V.
V.none = function() {
  return head("Halaman","—")
};

// Jalan pintas: $('mc') sama artinya dengan document.getElementById('mc').
function $(i) {
  return document.getElementById(i)
}

// toast(t): memunculkan pesan kecil di bawah layar selama 2,6 detik. t = teks pesan.
function toast(t) {
  var e=$("toast");   // ambil kotak pesan
  e.textContent=t;   // isi dengan teks
  e.style.display="block";   // tampilkan kotaknya
  clearTimeout(e._t);   // batalkan pewaktu lama, supaya pesan baru tidak terhapus lebih cepat
  e._t=setTimeout(function() {
    e.style.display="none"   // sembunyikan lagi
  },2600)   // setelah 2600 milidetik
}

// bd(c, t): membuat label berwarna (badge).
// c = nama warna: ok (hijau), no (merah), wait (kuning), ver (biru). t = tulisannya.
function bd(c,t) {
  return '<span class="badge b-'+c+'">'+t+'</span>'
}

// tr(a): membuat satu baris tabel. a = daftar isi sel, contoh tr(['Budi','Aktif']).
// map membungkus tiap isi dengan <td>, join menyambung semuanya.
function tr(a) {
  return '<tr>'+a.map(function(x) {
    return '<td>'+x+'</td>'
  }).join("")+'</tr>'
}

// tbl(h, rows): membuat tabel lengkap. h = daftar judul kolom, rows = daftar baris hasil tr().
// Dibungkus div.scroll supaya tabel yang lebar bisa digeser di layar kecil.
function tbl(h,rows) {
  return '<div class="scroll"><table><tr>'+h.map(function(x) {
    return '<th>'+x+'</th>'
  }).join("")+'</tr>'+rows.join("")+'</table></div>'
}

// head(t, c): judul halaman dan jejak navigasi. t = judul, c = nama di breadcrumb.
function head(t,c) {
  return '<h1>'+t+'</h1><div class="crumb">Beranda › '+c+'</div>'
}

// sel(v): dropdown keputusan akhir untuk petugas. v = pilihan yang tampil pertama.
function sel(v) {
  return '<select style="width:auto"><option>'+v+'</option><option>Diterima</option><option>Layak (kuota penuh)</option><option>Tidak Layak</option></select>'
}

// opt(id, a): membuat dropdown <select>. id = id elemen, a = daftar pilihan.
function opt(id,a) {
  return '<select id="'+id+'">'+a.map(function(x) {
    return '<option>'+x+'</option>'
  }).join('')+'</select>'
}

// fd(s): mengubah tanggal '2026-10-01' menjadi '1 Okt 2026'.
function fd(s) {
  var p=s.split('-');   // pecah di tiap tanda strip menjadi [tahun, bulan, hari]
  return +p[2]+' '+MON[+p[1]-1]+' '+p[0]   // +p[2] mengubah '01' jadi angka 1; MON[bulan-1] = nama bulan (daftar mulai dari 0)
}

// tt(i): pesan toast untuk tombol yang masih simulasi. i = nomor pesan dalam daftar di bawah.
function tt(i) {
  toast(['Form tambah pengguna terbuka','Form periode baru terbuka','Tambah data latih','Pilih berkas CSV','Template CSV diunduh','Model dilatih dari 300 data','Klasifikasi C4.5 dijalankan','Ekspor PDF/Excel dimulai','Keputusan disimpan','Pratinjau berkas dibuka','Berkas dikembalikan: Perlu perbaikan'][i])
}

// chk(r): memeriksa satu baris data latih. Aturannya sudah dipindahkan ke validasi.js,
// namanya dipertahankan karena dipakai di banyak tempat.
function chk(r) {
  return VAL.dataLatih(r)   // aturan ada di validasi.js
}
