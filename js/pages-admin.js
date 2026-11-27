/* HALAMAN ADMIN: dashboard, kelola pengguna, periode, data latih, model C4.5 */
// ==================================================================
// pages-admin.js : halaman dan aksi untuk admin.
// Setiap halaman = satu fungsi di objek V yang mengembalikan teks HTML.
// Penamaan: V.adm_xxx = halaman 'xxx' milik admin (adm).
// Catatan: pages-extra.js dimuat terakhir dan menimpa beberapa fungsi di berkas ini
// (V.adm_user, V.adm_periode, V.adm_latih, tgP, saveNP, dlTpl). Yang tampil di aplikasi
// adalah versi pages-extra.js; versi di sini adalah versi awal.
// ==================================================================
//
// V.adm_dash: dashboard admin. Berisi 4 kartu statistik, grafik batang pendaftar per hari,
// dan diagram lingkaran Layak vs Tidak Layak (dibuat dengan CSS conic-gradient: 61% = 52 dari 85).
V.adm_dash = function() {
  var b=[40,65,50,80,95,70,55],d=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];   // b = tinggi tiap batang (piksel), d = nama hari
  return head('Dashboard admin','Dashboard')+'<div class="grid"><div class="card stat"><b>120</b><span>Pengguna</span></div><div class="card stat"><b>85</b><span>Pendaftar</span></div><div class="card stat"><b>300</b><span>Data latih</span></div><div class="card stat"><b>87%</b><span>Akurasi model</span></div></div><div class="two2" style="margin-top:16px"><div class="card" style="margin:0"><h3 style="font-size:16px">Pendaftar per hari</h3><div style="display:flex;align-items:flex-end;gap:8px;height:120px;margin-top:10px">'+b.map(function(h,i) {
    return '<div style="flex:1;text-align:center;font-size:11px"><div style="height:'+h+'px;background:var(--g);border-radius:4px 4px 0 0"></div>'+d[i]+'</div>'   // tiap batang = satu div yang tingginya sesuai angka di b, dengan nama hari di bawahnya
  }).join('')+'</div></div><div class="card" style="margin:0"><h3 style="font-size:16px">Layak vs Tidak Layak</h3><div style="display:flex;align-items:center;gap:16px;margin-top:10px"><div style="width:110px;height:110px;border-radius:50%;background:conic-gradient(var(--ok) 0 61%,var(--no) 0)"></div><div>'+bd('ok','Layak 52')+'<br><br>'+bd('no','Tidak layak 33')+'</div></div></div></div>'
};

// V.adm_user: halaman Kelola pengguna. Tabel dibuat dari array UL (data.js) memakai tbl() dan tr().
V.adm_user = function() {
  return head('Kelola pengguna','Kelola Pengguna')+'<div class="bar"><div style="display:flex;gap:8px;flex-wrap:wrap"><input style="max-width:220px" placeholder="🔍 Cari nama atau email"><select style="width:auto"><option>Semua role</option><option>Admin</option><option>Petugas Seleksi</option><option>Mahasiswa</option></select></div><button class="p" onclick="openU()">+ Tambah pengguna</button></div><div class="card">'+tbl(['No','Nama','Email','Role','Status','Aksi'],UL.map(function(u,i) {
    return tr([i+1,u[0],u[1],u[2],bd(u[3]?'ok':'wait',u[3]?'Aktif':'Nonaktif'),act])   // satu baris per pengguna: no, nama, email, role, badge status, tombol aksi
  }))+'<p style="text-align:center;margin:12px 0 0">‹ 1 2 3 ›</p></div>'
};

// V.adm_periode: halaman Periode pendaftaran. Variabel perLewat (data.js) menentukan periode utama Aktif atau Nonaktif.
V.adm_periode = function() {
  var rows=[tr(['KIP-K 2026','1 Okt 2026','30 Nov 2026','120','<span class="tg'+(perLewat?'':' on')+'" role="switch" tabindex="0" aria-checked="'+(!perLewat)+'" onclick="tgP()" style="cursor:pointer"></span>'+(perLewat?'Nonaktif':'Aktif'),act]),tr(['KIP-K 2025','1 Okt 2025','30 Nov 2025','100','<span class="tg"></span>Nonaktif',act])].concat(NP.map(function(x) {
    return tr([x[0],x[1],x[2],x[3],'<span class="tg"></span>Nonaktif',act])   // periode tambahan dari array NP (hasil 'Buat periode')
  }));
  return head('Periode pendaftaran','Periode')+'<div class="bar"><span></span><button class="p" onclick="openP()">+ Buat periode</button></div><div class="card">'+tbl(['Nama','Buka','Tutup','Kuota','Status','Aksi'],rows)+'<p><small>Menonaktifkan KIP-K 2026 membuat mahasiswa tidak dapat memperbaiki berkas (muncul pesan Periode telah lewat).</small></p></div>'
};

// V.adm_latih: halaman Data latih. Tabel dari array DL, dengan tombol Tambah, Impor CSV, dan Template.
V.adm_latih = function() {
  return head('Data latih','Data Latih')+'<div class="bar"><div><button class="p" onclick="openT()">+ Tambah</button> <button class="s" onclick="openI()">⬆ Impor CSV</button> <button class="o" onclick="openTpl()">⬇ Template</button></div><input style="max-width:200px" placeholder="🔍 Cari"></div><div class="card">'+tbl(['No','IPK','Penghasilan','Tanggungan','Daya','Kelas','Keterangan label','Aksi'],DL.map(function(r,i) {
    return tr([i+1,r[0],r[1],r[2],r[3],bd(r[4]=='Layak'?'ok':'no',r[4].toUpperCase()),r[5],act])   // satu baris per data; badge LAYAK atau TIDAK LAYAK dari kolom kelas
  }))+'<p><small>Total '+DL.length+' data. Label berdasarkan pemenuhan kriteria, bukan hasil akhir. Berkas tidak sah tidak dimasukkan.</small></p></div>'
};

// V.adm_model: halaman Model C4.5 dengan tiga tab (Perhitungan, Pohon keputusan, Rule).
// Angka entropy dan gain ratio serta gambar pohon masih CONTOH tampilan.
// Perhitungan C4.5 yang sebenarnya direncanakan dihitung di server.
V.adm_model = function() {
  return head("Model Decision Tree C4.5","Model C4.5")+'<div class="bar"><button class="p" onclick="trainM(this)">▶ Latih model</button><span class="badge b-ver" id="mb">Terakhir dilatih: 17 Okt 2026 · Akurasi 87%</span></div><div class="card"><div class="tabs" id="tb"><button class="on" onclick="tab(0)">Perhitungan</button><button onclick="tab(1)">Pohon keputusan</button><button onclick="tab(2)">Rule</button></div><div class="tc"><p>Entropy total = 0,971</p>'+tbl(["Atribut","Gain","Split info","Gain ratio"],[tr(["IPK","0,31","1,52","0,20"]),tr(["Penghasilan","0,28","1,40","0,20"]),tr(["Tanggungan","0,12","1,10","0,11"]),tr(["<b>Daya listrik ★ akar</b>","0,42","1,30","<b>0,32</b>"])])+'</div><div class="tc" style="display:none"><div class="tree">Daya listrik?\n├─ 450 VA ── IPK?\n│            ├─ Tinggi/Sedang ─ LAYAK\n│            └─ Rendah ──────── TIDAK LAYAK\n├─ 900 VA ── Penghasilan?\n│            ├─ Rendah ─ LAYAK\n│            └─ Tinggi ─ TIDAK LAYAK\n└─ ≥ 1300 VA ─ TIDAK LAYAK</div></div><div class="tc" style="display:none"><p>R1: JIKA Daya = 450 VA DAN IPK ≠ Rendah MAKA <b>LAYAK</b><br>R2: JIKA Daya = 900 VA DAN Penghasilan = Rendah MAKA <b>LAYAK</b><br>R3: JIKA Daya ≥ 1300 VA MAKA <b>TIDAK LAYAK</b></p></div></div><small style="color:var(--mut)">Angka dan pohon di atas hanya contoh tampilan.</small>'
};

// tab(i): pindah tab di halaman Model. i = nomor tab yang dibuka.
function tab(i,n) {
  var t=document.querySelectorAll("#tb button"),c=document.querySelectorAll(".tc");   // t = semua tombol tab, c = semua isi tab
  for(var k=0;k<t.length;k++) {
    t[k].className=k==i?"on":"";   // tombol tab ke-i diberi gaya aktif (on), yang lain tidak
    c[k].style.display=k==i?"block":"none"   // hanya isi tab ke-i yang tampil, yang lain disembunyikan
  }
}

// tgP(): menukar status periode Aktif atau Nonaktif (simulasi lewat perLewat).
function tgP() {
  perLewat=!perLewat;   // balik nilai: true menjadi false, false menjadi true
  go('periode')   // gambar ulang halaman Periode
}

// openU(): membuka form Tambah pengguna. Kosongkan kolom, centang Akun aktif, sembunyikan pesan error lama.
function openU() {
  $('un').value='';
  $('ue').value='';
  $('up').value='';
  $('ua').checked=true;
  $('uerr').style.display='none';   // sembunyikan pesan error dari percobaan sebelumnya
  $('um').style.display='flex'   // tampilkan form
}

// closeU(): menutup form Tambah pengguna.
function closeU() {
  $('um').style.display='none'
}

// genP(): membuat password sementara acak sepanjang 10 karakter.
function genP() {
  var c='abcdefghjkmnpqrstuvwxyz23456789',s='';   // c = karakter yang dipakai. Huruf mirip (i, l, o) dan angka 0, 1 sengaja dibuang agar tidak membingungkan
  for(var i=0;i<10;i++)s+=c.charAt(Math.floor(Math.random()*c.length));   // diulang 10 kali: ambil satu karakter acak dari c
  $('up').value=s   // hasilnya dimasukkan ke kolom password
}

// saveU(): dipanggil tombol Simpan pada form Tambah pengguna.
// Aturan pengecekannya ada di validasi.js (VAL.user).
function saveU() {
  var n=$('un').value.trim(),e=$('ue').value.trim().toLowerCase(),p=$('up').value;   // ambil isian: n = nama, e = email (huruf kecil), p = password
  var m=VAL.user(n,e,p,{role:$('ur').value});   // aturan ada di validasi.js
  if(m) {   // ada pesan error: tampilkan di kotak merah lalu berhenti
    $('uerr').textContent=m;
    $('uerr').style.display='block';
    return   // berhenti, pengguna tidak disimpan
  }
  UL.push([n,e,$('ur').value,$('ua').checked?1:0]);   // lolos: tambahkan ke daftar pengguna UL dengan format [nama, email, role, status 1/0]
  closeU();   // tutup form
  toast('Pengguna ditambahkan: '+n);   // pesan sukses
  if(page=='user')go('user')   // kalau sedang di halaman Pengguna, gambar ulang tabelnya
}

// openP(): membuka pop-up Buat periode (memakai openM dari modal.js).
function openP() {
  openM(440,mHead('Buat periode')+'<label>Nama periode</label><input id="np1" placeholder="Contoh: KIP-K 2027"><div class="two"><div><label>Tanggal buka</label><input id="np2" type="date"></div><div><label>Tanggal tutup</label><input id="np3" type="date"></div></div><label>Kuota penerima</label><input id="np4" type="number" min="1" placeholder="120"><small>Status awal Nonaktif. Hanya satu periode boleh aktif; aktifkan lewat toggle di tabel.</small>'+mErr()+mFoot('Batal','<button class="p" onclick="saveNP()">Simpan</button>'))
}

// saveNP(): menyimpan periode baru. Ini versi awal yang bekerja pada array NP.
// Versi yang berjalan sekarang ada di pages-extra.js (memakai VAL.periode dari validasi.js).
function saveNP() {
  var n=$('np1').value.trim(),b=$('np2').value,t=$('np3').value,k=parseInt($('np4').value,10);
  // Validasi satu per satu. 'return showE(...)' menampilkan pesan di pop-up lalu menghentikan fungsi.
  if(!n)return showE('Nama periode wajib diisi.');
  if(!b||!t)return showE('Tanggal buka dan tutup wajib diisi.');
  if(t<=b)return showE('Tanggal tutup harus setelah tanggal buka.');
  if(!(k>0))return showE('Kuota harus berupa angka lebih dari 0.');
  var all=['KIP-K 2026','KIP-K 2025'].concat(NP.map(function(x) {   // all = semua nama periode yang sudah ada
    return x[0]
  }));
  if(all.some(function(x) {   // cek nama kembar (huruf besar/kecil diabaikan)
    return x.toLowerCase()==n.toLowerCase()
  }))return showE('Nama periode sudah ada.');
  NP.push([n,fd(b),fd(t),k]);   // lolos semua: simpan periode baru dengan tanggal yang sudah diformat fd()
  closeM();
  toast('Periode ditambahkan: '+n);
  if(page=='periode')go('periode')
}

// openT(): membuka pop-up Tambah data latih. Berisi enam dropdown yang pilihannya dari OPT (data.js).
function openT() {
  openM(520,mHead('Tambah data latih')+'<div class="two"><div><label>IPK</label>'+opt('d1',OPT.ipk)+'</div><div><label>Penghasilan</label>'+opt('d2',OPT.peng)+'</div></div><div class="two"><div><label>Tanggungan</label>'+opt('d3',OPT.tang)+'</div><div><label>Daya listrik</label>'+opt('d4',OPT.daya)+'</div></div><div class="two"><div><label>Kelas</label>'+opt('d5',OPT.kelas)+'</div><div><label>Keterangan label</label>'+opt('d6',OPT.ket)+'</div></div><small>Label berdasarkan pemenuhan kriteria, bukan hasil akhir penerimaan. Berkas tidak sah tidak dimasukkan.</small>'+mErr()+mFoot('Batal','<button class="p" onclick="saveDL()">Simpan</button>'))
}

// saveDL(): menyimpan satu data latih. Ambil nilai enam dropdown, periksa dengan chk() (validasi.js),
// simpan kalau benar.
function saveDL() {
  var r=['d1','d2','d3','d4','d5','d6'].map(function(i) {   // r = nilai enam dropdown d1 sampai d6
    return $(i).value
  }),e=chk(r);   // e = pesan error dari chk() (kosong kalau semuanya benar)
  if(e)return showE(e);   // ada error: tampilkan di pop-up lalu berhenti
  DL.push(r);   // simpan ke daftar data latih DL
  closeM();
  toast('Data latih ditambahkan');
  if(page=='latih')go('latih')
}

// openI(): membuka pop-up Impor CSV.
function openI() {
  IMPV=[];   // kosongkan daftar baris valid dari impor sebelumnya
  openM(660,mHead('Impor CSV data latih')+'<p style="margin:8px 0">Pilih file CSV sesuai template (kolom: ipk, penghasilan, tanggungan, daya, kelas, keterangan).</p><input id="ifile" type="file" accept=".csv,text/csv" onchange="readImp(this)"><p><button class="s" onclick="demoImp()">Pakai contoh file (demo)</button></p><div id="ires"></div>'+mFoot('Batal','<button class="p" id="ibtn" disabled onclick="doImp()">Impor</button>'))
}

// demoImp(): tombol 'Pakai contoh file'. Memeriksa teks contoh SAMPLE (data.js) seolah-olah file diunggah.
function demoImp() {
  parseImp(SAMPLE,'contoh-data-latih.csv')
}

// readImp(el): membaca file CSV yang dipilih pengguna.
function readImp(el) {
  var f=el.files[0];   // ambil file pertama yang dipilih
  if(!f)return;   // tidak ada file: berhenti
  var rd=new FileReader();   // FileReader = alat bawaan browser untuk membaca isi file
  rd.onload=function() {   // dijalankan setelah file selesai dibaca
    parseImp(rd.result,f.name)   // periksa isinya dengan parseImp
  };
  rd.readAsText(f)   // baca file sebagai teks
}

// parseImp(txt, name): memeriksa isi CSV. Header harus sesuai template dan tiap baris diperiksa dengan chk().
// Hasilnya: jumlah dibaca, valid, gagal, daftar pesan error (dengan nomor baris), dan pratinjau.
// Hanya baris yang valid disimpan di IMPV untuk diimpor.
function parseImp(txt,name) {
  var L=txt.split(NL).map(function(s) {   // pecah per baris. NL = karakter baris baru, CR = tanda baris Windows yang dibuang
    return s.split(CR).join('').trim()
  }).filter(Boolean),res=$('ires'),ok=[],er=[];   // buang baris kosong. res = kotak hasil, ok = baris valid, er = daftar pesan error
  IMPV=[];   // kosongkan hasil impor sebelumnya
  // header (baris pertama) harus persis sama dengan template, kalau tidak seluruh impor ditolak
  if(!L.length||L[0].toLowerCase().split(' ').join('')!=='ipk,penghasilan,tanggungan,daya,kelas,keterangan') {
    res.innerHTML='<div class="note" style="margin-top:10px;background:#FEF2F2;color:#B91C1C;border-color:#DC2626">Header kolom tidak sesuai template. Unduh template lalu isi ulang.</div>';
    $('ibtn').disabled=true;   // header salah: tombol Impor dimatikan
    $('ibtn').textContent='Impor';
    return
  }
  for(var i=1;i<L.length;i++) {   // mulai dari 1 karena baris 0 adalah header
    var c=L[i].split(','),r=[c[0],c[1],c[2],c[3],c[4],c.slice(5).join(',')].map(function(x) {   // pecah baris menjadi kolom. Kolom ke-6 (keterangan) boleh mengandung koma, maka disambung lagi
      return (x||'').split('"').join('').trim()
    }),e=chk(r);   // e = pesan error dari chk() untuk baris ini
    if(e)er.push('Baris '+(i+1)+': '+e);   // salah: catat dengan nomor baris
    else ok.push(r)   // benar: masukkan ke daftar ok
  }
  IMPV=ok;   // simpan baris yang valid untuk diimpor nanti
  res.innerHTML='<div style="margin:10px 0"><b>'+name+'</b><br>'+bd('ver','Dibaca '+(L.length-1)+' baris')+' '+bd('ok','Valid '+ok.length)+' '+bd(er.length?'no':'ok','Gagal '+er.length)+'</div>'+(er.length?'<div class="note" style="background:#FEF2F2;color:#B91C1C;border-color:#DC2626;margin-bottom:10px">'+er.slice(0,5).join('<br>')+'</div>':'')+(ok.length?tbl(['IPK','Penghasilan','Tanggungan','Daya','Kelas'],ok.slice(0,3).map(function(r) {
    return tr([r[0],r[1],r[2],r[3],bd(r[4]=='Layak'?'ok':'no',r[4].toUpperCase())])
  }))+'<small>Pratinjau '+Math.min(3,ok.length)+' dari '+ok.length+' data valid.</small>':'');
  $('ibtn').disabled=!ok.length;   // tombol Impor aktif hanya kalau ada baris valid
  $('ibtn').textContent='Impor '+ok.length+' data valid'   // tulisan tombol menjadi 'Impor N data valid'
}

// doImp(): tombol 'Impor N data valid'. Memasukkan semua baris valid ke data latih DL.
function doImp() {
  var n=IMPV.length;   // n = jumlah baris yang diimpor
  IMPV.forEach(function(r) {   // setiap baris valid dimasukkan ke data latih
    DL.push(r)
  });
  closeM();   // tutup pop-up
  toast(n+' data latih diimpor');
  if(page=='latih')go('latih')   // kalau sedang di halaman Data latih, gambar ulang tabelnya
}

// openTpl(): membuka pop-up berisi contoh template CSV (kolom dan nilai yang diperbolehkan).
function openTpl() {
  openM(840,mHead('Template CSV data latih')+'<p style="margin:8px 0">Isi file CSV memakai kolom dan nilai berikut. Baris pertama harus berupa nama kolom.</p>'+tbl(['Kolom','Nilai yang diperbolehkan'],[tr(['ipk','Tinggi / Sedang / Rendah']),tr(['penghasilan','Rendah / Sedang / Tinggi']),tr(['tanggungan','Sedikit / Sedang / Banyak']),tr(['daya','450 VA / 900 VA / 1300 VA / 2200 VA']),tr(['kelas','Layak / Tidak Layak']),tr(['keterangan','Memenuhi kriteria, Memenuhi kriteria (kuota penuh), atau Tidak memenuhi kriteria'])])+'<label>Contoh isi template-data-latih.csv</label><pre class="tree" style="margin:4px 0">'+['ipk,penghasilan,tanggungan,daya,kelas,keterangan','Tinggi,Rendah,Banyak,450 VA,Layak,Memenuhi kriteria','Sedang,Tinggi,Sedikit,2200 VA,Tidak Layak,Tidak memenuhi kriteria'].join(NL)+'</pre>'+mFoot('Tutup','<button class="p" onclick="dlTpl()">⬇ Unduh template.csv</button>'))
}

// dlTpl(): unduh template (simulasi, hanya menampilkan pesan). Versi di pages-extra.js menimpa fungsi ini.
function dlTpl() {
  toast('template-data-latih.csv diunduh (simulasi)')
}
