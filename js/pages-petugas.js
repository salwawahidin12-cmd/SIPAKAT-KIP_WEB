/* HALAMAN PETUGAS SELEKSI: dashboard, verifikasi berkas, klasifikasi dan keputusan */
// ==================================================================
// pages-petugas.js : halaman untuk petugas seleksi.
// Polanya sama dengan halaman admin: V.ptg_xxx = halaman 'xxx' milik petugas (ptg).
// Catatan: pages-extra.js menimpa V.ptg_verif, V.ptg_klas, openX, dan doX dengan versi
// yang lebih lengkap (verifikasi dan keputusan benar-benar tersimpan, ekspor menghasilkan file).
// ==================================================================
//
// V.ptg_dash: dashboard petugas. Tiga kartu ringkasan (menunggu verifikasi, perlu diklasifikasi,
// sudah diputuskan) dan tabel pendaftar terbaru.
V.ptg_dash = function() {
  return head('Dashboard petugas','Dashboard')+'<div class="grid"><div class="card stat"><b>14</b><span>Menunggu verifikasi</span></div><div class="card stat"><b>31</b><span>Perlu diklasifikasi</span></div><div class="card stat"><b>40</b><span>Sudah diputuskan</span></div></div><div class="card" style="margin-top:16px"><h3 style="font-size:16px;margin-bottom:8px">Pendaftar terbaru</h3>'+tbl(['Nama','NIM','Tanggal','Status'],[tr(['Nisma Nur Adzania','07352411129','12 Okt',bd('wait','Menunggu')]),tr(['Tegar Risky','07352311030','13 Okt',bd('ver','Terverifikasi')])])+'</div>'
};

// V.ptg_verif: halaman Verifikasi berkas. Filter status dan tabel pendaftar dengan tombol aksi.
V.ptg_verif = function() {
  return head("Verifikasi berkas","Verifikasi")+'<div class="bar"><select style="width:auto"><option>Semua status</option><option>Menunggu</option><option>Perlu perbaikan</option><option>Terverifikasi</option></select></div><div class="card">'+tbl(["Nama","NIM","Tanggal","Status","Aksi"],[tr(["Nisma Nur Adzania","07352411129","12 Okt",bd("wait","Menunggu"),'<button class="p" style="padding:5px 12px" onclick="document.getElementById(\'dt\').style.display=\'block\'">Periksa</button>']),tr(["Tegar Risky","07352311030","13 Okt",bd("ver","Terverifikasi"),""])])+'</div><div class="card" id="dt" style="display:none"><h3 style="font-size:16px">Nisma Nur Adzania</h3><div class="grid" style="margin-top:12px"><div>IPK: 3,45<br>Penghasilan: Rp1,5 juta<br>Tanggungan: 4<br>Daya: 900 VA</div><div>KK.pdf · Slip.pdf · Listrik.jpg<br><button class="s" style="margin-top:6px" onclick="toast(\'Pratinjau berkas dibuka\')">Lihat berkas</button></div></div><label>Catatan (wajib jika dikembalikan)</label><textarea rows="2"></textarea><p style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button class="w" onclick="toast(\'Dikembalikan: Perlu perbaikan\')">Kembalikan</button><button class="p" onclick="toast(\'Berkas disahkan: Terverifikasi\')">Sahkan berkas</button></p></div>'
};

// V.ptg_klas: halaman Klasifikasi dan keputusan. Ada tombol Jalankan klasifikasi C4.5, tabel rekomendasi sistem
// (LAYAK atau TIDAK LAYAK), dan keputusan akhir berupa dropdown sel().
// Rekomendasi hanya pendukung, keputusan akhir ada di tangan petugas.
V.ptg_klas = function() {
  var sv='<button class="p" style="padding:5px 12px" onclick="tt(8)">Simpan</button>',lh='<button class="s" style="padding:5px 10px" onclick="tt(9)">Lihat</button>';   // sv = tombol Simpan, lh = tombol Lihat. Dibuat sekali lalu dipakai ulang di tiap baris
  return head('Klasifikasi dan keputusan','Klasifikasi & Keputusan')+'<div class="bar"><button class="p" onclick="tt(6)">▶ Jalankan klasifikasi C4.5</button><span class="badge b-ver">Kuota 120 · Layak 150 · Diterima 120</span></div><div class="card">'+tbl(['No','Nama','Data','Rekomendasi sistem','Keputusan akhir','Aksi'],[tr([1,'Salwa Wahidin',lh,bd('ok','LAYAK'),sel('Diterima'),sv]),tr([2,'Tegar Risky',lh,bd('no','TIDAK LAYAK'),sel('Tidak Layak'),sv])])+'</div><div class="bar"><small style="color:var(--mut)">Rekomendasi hanya pendukung. Petugas menerapkan kuota dan menetapkan keputusan akhir.</small><button class="s" onclick="openX()">📄 Ekspor hasil (PDF/Excel)</button></div>'
};

// openX(): membuka pop-up Ekspor hasil seleksi (pilih format PDF atau Excel, plus pratinjau laporan).
function openX() {
  XF=1;   // XF = format terpilih: 1 = PDF, 2 = Excel (variabel global di data.js)
  openM(700,mHead('Ekspor hasil seleksi')+'<div class="two"><div><label>Format</label><div style="display:flex;gap:6px"><button id="xf1" class="p" style="flex:1" onclick="fx(1)">PDF</button><button id="xf2" class="o" style="flex:1" onclick="fx(2)">Excel</button></div></div><div><label>Isi laporan</label><select><option>Semua pendaftar</option><option>Hanya yang diterima</option></select></div></div><label>Pratinjau laporan</label><div class="card" style="background:#fff;color:#1f2937;margin:4px 0 0"><b>Laporan Hasil Seleksi KIP-Kuliah · KIP-K 2026</b><br><small>Universitas Khairun · Dicetak 30 Okt 2026 · Kuota 120</small>'+tbl(['No','Nama','NIM','Rekomendasi','Keputusan akhir'],[tr([1,'Salwa Wahidin','07352411149',bd('ok','LAYAK'),'Diterima']),tr([2,'Nisma Nur Adzania','07352411129',bd('ok','LAYAK'),'Layak (kuota penuh)']),tr([3,'Tegar Risky','07352311030',bd('no','TIDAK LAYAK'),'Tidak Layak'])])+'<p style="text-align:center;margin:8px 0 0"><small>© 2026 Informatika, Universitas Khairun</small></p></div>'+mFoot('Batal','<button class="p" id="xbtn" onclick="doX()">Unduh PDF</button>'))
}

// fx(n): mengganti format ekspor. n = 1 (PDF) atau 2 (Excel).
function fx(n) {
  XF=n;   // simpan pilihan format
  $('xf1').className=n==1?'p':'o';   // tombol format yang dipilih berkelas p (hijau penuh), yang lain berkelas o (garis tepi)
  $('xf2').className=n==2?'p':'o';
  $('xbtn').textContent='Unduh '+(n==1?'PDF':'Excel')   // tulisan tombol unduh ikut berubah
}

// doX(): tombol Unduh. Di sini hanya simulasi (menampilkan pesan lalu menutup pop-up).
// Versi di pages-extra.js benar-benar membuat berkas.
function doX() {
  toast('hasil-seleksi-KIP-K-2026.'+(XF==1?'pdf':'xlsx')+' diunduh (simulasi)');   // ekstensi .pdf atau .xlsx mengikuti format XF
  closeM()   // tutup pop-up
}
