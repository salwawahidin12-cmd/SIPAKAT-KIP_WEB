/* PERLUASAN (dimuat terakhir, menimpa fungsi lama): halaman Ubah, Hapus, form yang berfungsi, Profil baca-saja */
// ==================================================================
// pages-extra.js : versi lengkap yang benar-benar berfungsi. Dimuat PALING AKHIR,
// sehingga fungsi dan halaman bernama sama di berkas lain (V.adm_user, saveNP, enter,
// openX, dst.) tertimpa oleh versi di sini. Berkas ini menambah:
//   - pembantu form (esc, sl, fi, fb, fe) dan data tambahan (PL, F, VL, KL, ACC),
//   - Ubah dan Hapus untuk pengguna, periode, dan data latih,
//   - pencarian dan filter, form pendaftaran bervalidasi, verifikasi dan keputusan
//     yang tersimpan, ekspor CSV/cetak PDF, registrasi, login, dan lupa password.
// Gaya penulisan di berkas ini rapat (banyak perintah dalam satu baris), jadi komentar
// ditaruh di atas tiap fungsi atau pernyataan, bukan di tengah baris.
// ==================================================================
// esc(s): membuat teks aman ditaruh di dalam HTML. Mengganti & " < dengan kode HTML-nya supaya isian pengguna
// tidak dianggap tag. Nilai kosong (null/undefined) menjadi teks kosong.
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
// sl(id, a, v, x): membuat dropdown <select>. a = daftar pilihan, v = pilihan yang terpilih, x = atribut tambahan (boleh kosong).
const sl=(id,a,v,x)=>`<select id="${id}" ${x||''}>${a.map(o=>`<option${o==v?' selected':''}>${o}</option>`).join('')}</select>`;
// fi(id, l, v, t, x): membuat label + kolom isian. l = teks label, v = nilai awal (sudah di-esc), t = tipe input (bawaan text), x = atribut tambahan (misalnya disabled).
const fi=(id,l,v,t,x)=>`<label>${l}</label><input id="${id}" type="${t||'text'}" value="${esc(v)}" ${x||''}>`;
// FE = kotak pesan error merah (id fe2) yang awalnya tersembunyi, dipasang di bawah form. Diisi oleh fe().
const FE='<div id="fe2" class="note" role="alert" style="display:none;margin-top:12px;background:#FEF2F2;color:#B91C1C;border-color:#DC2626"></div>';
// fb(k, s): baris tombol di bawah form Ubah. Batal kembali ke halaman k, Simpan perubahan menjalankan fungsi s.
const fb=(k,s)=>`<p style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;margin-top:16px"><button class="o" onclick="go('${k}')">Batal</button><button class="p" onclick="${s}">Simpan perubahan</button></p>`;
// fe(m): menampilkan pesan error m di kotak FE (dipakai form halaman, berbeda dengan showE() milik pop-up).
const fe=m=>{const e=$('fe2');e.textContent=m;e.style.display='block'};
// PAR: peta halaman Ubah ke menu induknya. Dipakai go() di layout.js agar menu sidebar yang disorot tetap menu induk (misal user_f -> user).
const PAR={user_f:'user',periode_f:'periode',latih_f:'latih'};
// PG = penanda tempat paginasi. go() mengganti teks contoh "‹ 1 2 3 ›" di setiap halaman dengan ini,
// lalu pagi() (di bawah) mengisinya: kalau baris tabel <= PER_HAL, penanda dikosongkan (tidak ada angka halaman);
// kalau lebih, muncul ‹ 1 2 3 … › sesuai jumlah halaman dan baris yang tampil dibatasi PER_HAL per halaman.
const PG='<span class="pg"></span>';
var PER_HAL=10;
// pagi(n): tampilkan halaman ke-n pada tabel di kartu yang sama dengan penanda paginasi.
function pagi(n){
  var pg=document.querySelector('#main .pg'); if(!pg)return;
  var kartu=pg.closest('.card'), rows=kartu?[].filter.call(kartu.querySelectorAll('table tr'),function(r){return r.querySelector('td')}):[];
  var tot=Math.ceil(rows.length/PER_HAL);
  if(tot<=1){pg.innerHTML='';rows.forEach(function(r){r.style.display=''});return}   // satu halaman: tidak perlu angka
  n=Math.min(Math.max(1,n||1),tot);
  rows.forEach(function(r,i){r.style.display=(i>=(n-1)*PER_HAL&&i<n*PER_HAL)?'':'none'});
  var h=['<a onclick="pagi('+(n-1)+')">‹</a>'];
  for(var k=1;k<=tot;k++)h.push('<a onclick="pagi('+k+')"'+(k==n?' style="font-weight:700;background:var(--g);color:#fff"':'')+'>'+k+'</a>');
  h.push('<a onclick="pagi('+(n+1)+')">›</a>');
  pg.innerHTML=h.join(' ');
}
if(typeof go=='function'){var goPg=go; go=function(p){goPg(p);pagi(1)}}   // setiap halaman digambar, paginasinya ikut dihitung ulang (login.html tidak punya go, jadi dilewati)
// PL = daftar periode: [nama, tanggal buka (YYYY-MM-DD), tanggal tutup, kuota, aktif 1/0]. Hanya satu boleh aktif.
var PL=[['KIP-K 2026','2026-10-01','2026-11-30',120,1],['KIP-K 2025','2025-10-01','2025-11-30',100,0]];
// Variabel status halaman:
//   ei = nomor baris yang sedang diubah (-1 = tidak ada)
//   uq / ur = kata cari dan filter role di Kelola pengguna
//   dq = kata cari di Data latih
//   vf = filter status di Verifikasi, vi = nomor pendaftar yang sedang diperiksa (-1 = tidak ada)
//   FK = NIM/email akun yang sedang direset kata sandinya
//   ACC = akun hasil registrasi: [NIM atau email untuk login, kata sandi, nama lengkap, NIM, program studi]
var ei=-1,uq='',ur='Semua role',dq='',vf='Semua status',vi=-1,FK='',ACC=[];
// F = isi form pendaftaran mahasiswa: n nama, nim, pr program studi, sm semester, hp no. HP, al alamat,
// ipk, pg penghasilan, tg tanggungan, dy daya listrik, fl = nama berkas yang sudah dipilih per jenis (ktp, slip, lis, trn).
var F={n:'Salwa Wahidin',nim:'07352411149',pr:'Informatika',sm:'5',hp:'',al:'',ipk:'3.45',pg:'Rp1.000.000 – Rp2.000.000',tg:'4',dy:'900 VA',fl:{}};
// VL = daftar verifikasi petugas: [nama, NIM, tanggal, status (wait/ver/ret), catatan petugas, IPK, penghasilan, tanggungan, daya].
var VL=[['Nisma Nur Adzania','07352411129','12 Okt','wait','','3,45','Rp1,5 juta','4','900 VA'],['Tegar Risky','07352311030','13 Okt','ver','','3,10','Rp2 juta','3','1300 VA']];
// KL = daftar klasifikasi: [nama, NIM, rekomendasi sistem, keputusan akhir, IPK, penghasilan, tanggungan, daya].
var KL=[['Salwa Wahidin','07352411149','Layak','Diterima','3,45','Rp1,5 juta','4','900 VA'],['Nisma Nur Adzania','07352411129','Layak','Layak (kuota penuh)','3,45','Rp1,5 juta','4','900 VA'],['Tegar Risky','07352311030','Tidak Layak','Tidak Layak','3,10','Rp2 juta','3','1300 VA']];
// VS = status verifikasi menjadi [warna badge, tulisan]: wait = Menunggu, ver = Terverifikasi, ret = Perlu perbaikan.
const VS={wait:['wait','Menunggu'],ver:['ver','Terverifikasi'],ret:['no','Perlu perbaikan']};
// Penjelasan "Fungsi halaman" tambahan di D (data.js): Profil semua role dan tiga halaman Ubah (kode berakhiran _f).
D.mhs_prof=D.adm_prof=D.ptg_prof='Menampilkan nama dan role akun Anda, serta mengganti kata sandi.';
D.adm_user_f='Mengubah data akun pengguna yang dipilih.';D.adm_periode_f='Mengubah nama, tanggal, kuota, dan status periode.';D.adm_latih_f='Mengubah satu baris data latih.';
// dl(n, t, m): mengunduh teks sebagai berkas. n = nama berkas, t = isi, m = tipe berkas (MIME).
// \ufeff di depan isi = penanda UTF-8 supaya Excel membaca huruf dengan benar. Caranya: isi dibungkus Blob, diberi alamat sementara,
// lalu tautan <a> dibuat dan diklik lewat kode.
const dl=(n,t,m)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+t],{type:m}));a.download=n;a.click()};

/* ---------- Ubah / Hapus ---------- */
// ab(k, i): tombol Ubah dan Hapus untuk baris ke-i. k = jenis data (user, periode, atau latih). Menggantikan act di helpers.js yang hanya simulasi.
const ab=(k,i)=>`<button class="s" style="padding:5px 10px" onclick="ed('${k}',${i})">Ubah</button> <button class="d" onclick="rm('${k}',${i})">Hapus</button>`;
// ed(k, i): memulai ubah. Simpan nomor baris di ei, lalu buka halaman form k + "_f" (misal user_f).
function ed(k,i){ei=i;go(k+'_f')}
// rm(k, i): menampilkan pop-up konfirmasi hapus. n = nama yang disebut di pesan (nama pengguna, nama periode, atau nomor data latih).
function rm(k,i){const n={user:UL[i]&&UL[i][0],periode:PL[i]&&PL[i][0],latih:'data latih no. '+(i+1)}[k];
  openM(380,mHead('Hapus data?')+`<p style="margin:10px 0">Yakin menghapus <b>${esc(n)}</b>? Tindakan ini tidak dapat dibatalkan.</p>`+mFoot('Batal',`<button class="d" onclick="doRm('${k}',${i})">Ya, hapus</button>`))}
// doRm(k, i): benar-benar menghapus baris ke-i dari daftar yang sesuai (UL, PL, atau DL) memakai splice.
// perLewat dihitung ulang: kalau tidak ada periode aktif, periode dianggap sudah lewat.
function doRm(k,i){({user:UL,periode:PL,latih:DL})[k].splice(i,1);perLewat=!PL.some(a=>a[4]);closeM();toast('Data dihapus');go(k)}

/* ---------- Admin: pengguna ---------- */
// V.adm_user: Kelola pengguna versi berfungsi, dengan pencarian (uq) dan filter role (ur).
// L = pasangan [pengguna, nomor asli di UL] yang lolos filter; nomor asli disimpan supaya Ubah dan Hapus mengenai baris yang benar.
V.adm_user=function(){const L=UL.map((u,i)=>[u,i]).filter(([u])=>(ur=='Semua role'||u[2]==ur)&&(u[0]+u[1]).toLowerCase().includes(uq.toLowerCase()));
  return head('Kelola pengguna','Kelola Pengguna')+`<div class="bar"><div style="display:flex;gap:8px;flex-wrap:wrap"><input style="max-width:220px" placeholder="🔍 Cari nama atau email" value="${esc(uq)}" onchange="uq=this.value;go('user')"><select style="width:auto" onchange="ur=this.value;go('user')">${['Semua role','Admin','Petugas Seleksi','Mahasiswa'].map(x=>`<option${x==ur?' selected':''}>${x}</option>`).join('')}</select></div><button class="p" onclick="openU()">+ Tambah pengguna</button></div><div class="card">`+(L.length?tbl(['No','Nama','Email','Role','Status','Aksi'],L.map(([u,i],n)=>tr([n+1,esc(u[0]),esc(u[1]),u[2],bd(u[3]?'ok':'wait',u[3]?'Aktif':'Nonaktif'),ab('user',i)]))):'<p>Tidak ada data yang cocok.</p>')+'<p style="text-align:center;margin:12px 0 0">‹ 1 2 3 ›</p></div>'};
// V.adm_user_f: form Ubah pengguna. Kolom diisi dari UL[ei]; password boleh dikosongkan (berarti tidak diganti).
V.adm_user_f=function(){const u=UL[ei];
  return head('Ubah pengguna','Kelola Pengguna › Ubah')+'<div class="card">'+fi('eu1','Nama lengkap',u[0])+fi('eu2','Email / NIM',u[1])+'<label>Role</label>'+sl('eu3',['Admin','Petugas Seleksi','Mahasiswa'],u[2])+'<label>Status akun</label>'+sl('eu4',['Aktif','Nonaktif'],u[3]?'Aktif':'Nonaktif')+fi('eu5','Password baru (kosongkan jika tidak diganti, min. 8 karakter)','','password')+FE+fb('user','saveEU()')+'</div>'};
// saveEU(): menyimpan hasil ubah pengguna. Pemeriksaan di VAL.user; skip = ei agar email milik sendiri tidak dianggap kembar.
function saveEU(){const n=$('eu1').value.trim(),e=$('eu2').value.trim(),r=$('eu3').value,p=$('eu5').value;
  const m=VAL.user(n,e,p,{role:r,skip:ei,pwOptional:true});   // aturan ada di validasi.js
  // Ada error: tampilkan dan berhenti. Kalau lolos, ganti baris UL[ei] dengan data baru lalu kembali ke daftar.
  if(m)return fe(m);UL[ei]=[n,e,r,$('eu4').value=='Aktif'?1:0];toast('Data pengguna diperbarui');go('user')}

/* ---------- Admin: periode ---------- */
// V.adm_periode: halaman Periode versi berfungsi. a = periode yang sedang aktif (dipakai untuk kalimat catatan di bawah tabel).
// Status tiap periode berupa tombol geser (toggle) yang memanggil tgP(nomor).
V.adm_periode=function(){const a=PL.find(x=>x[4]);
  return head('Periode pendaftaran','Periode')+'<div class="bar"><span></span><button class="p" onclick="openP()">+ Buat periode</button></div><div class="card">'+tbl(['Nama','Buka','Tutup','Kuota','Status','Aksi'],PL.map((x,i)=>tr([esc(x[0]),fd(x[1]),fd(x[2]),x[3],`<span class="tg${x[4]?' on':''}" role="switch" tabindex="0" aria-checked="${!!x[4]}" onclick="tgP(${i})" style="cursor:pointer"></span>${x[4]?'Aktif':'Nonaktif'}`,ab('periode',i)])))+`<p><small>${a?'Menonaktifkan '+esc(a[0])+' membuat mahasiswa tidak dapat memperbaiki berkas (muncul pesan Periode telah lewat).':'Tidak ada periode aktif: mahasiswa tidak dapat memperbaiki berkas.'}</small></p></div>`};
// tgP(i): menukar status periode ke-i. Kalau sedang aktif, dinonaktifkan. Kalau tidak aktif, semua periode dinonaktifkan dulu lalu
// periode ke-i diaktifkan (hanya satu boleh aktif). perLewat = true bila tidak ada periode aktif.
function tgP(i){if(PL[i][4])PL[i][4]=0;else{PL.forEach(x=>x[4]=0);PL[i][4]=1}perLewat=!PL.some(x=>x[4]);go('periode')}
// setPL(v): kotak centang simulasi di Status & Hasil (menimpa versi pages-mahasiswa.js).
// v = true: semua periode dinonaktifkan. v = false: periode pertama diaktifkan kalau belum ada yang aktif.
function setPL(v){perLewat=v;if(v)PL.forEach(x=>x[4]=0);else if(!PL.some(x=>x[4])&&PL[0])PL[0][4]=1;go('status')}
// pchk(): pembungkus VAL.periode supaya nama fungsi lama tetap bisa dipakai.
function pchk(n,b,t,k,skip){return VAL.periode(n,b,t,k,skip)}   // aturan ada di validasi.js
// saveNP(): menyimpan periode baru dari pop-up Buat periode (menimpa versi di pages-admin.js). -1 = periode baru, bukan ubah.
// Status awal 0 (nonaktif). showE() menampilkan pesan error di dalam pop-up.
function saveNP(){const n=$('np1').value.trim(),b=$('np2').value,t=$('np3').value,k=parseInt($('np4').value,10),m=pchk(n,b,t,k,-1);
  if(m)return showE(m);PL.push([n,b,t,k,0]);closeM();toast('Periode ditambahkan: '+n);if(page=='periode')go('periode')}
// V.adm_periode_f: form Ubah periode, diisi dari PL[ei]. Kotak centang "Periode aktif" membuat periode lain otomatis nonaktif.
V.adm_periode_f=function(){const x=PL[ei];
  return head('Ubah periode','Periode › Ubah')+'<div class="card">'+fi('ep1','Nama periode',x[0])+'<div class="two"><div>'+fi('ep2','Tanggal buka',x[1],'date')+'</div><div>'+fi('ep3','Tanggal tutup',x[2],'date')+'</div></div>'+fi('ep4','Kuota penerima',x[3],'number','min="1"')+`<label style="display:flex;align-items:center;gap:8px;margin-top:12px"><input id="ep5" type="checkbox" style="width:auto" ${x[4]?'checked':''}> Periode aktif (periode lain otomatis nonaktif)</label>`+FE+fb('periode','saveEP()')+'</div>'};
// saveEP(): menyimpan hasil ubah periode. Kalau dicentang aktif, semua periode lain dinonaktifkan dulu. Lalu perLewat dihitung ulang.
function saveEP(){const n=$('ep1').value.trim(),b=$('ep2').value,t=$('ep3').value,k=parseInt($('ep4').value,10),m=pchk(n,b,t,k,ei);
  if(m)return fe(m);if($('ep5').checked)PL.forEach(x=>x[4]=0);PL[ei]=[n,b,t,k,$('ep5').checked?1:0];perLewat=!PL.some(x=>x[4]);toast('Periode diperbarui');go('periode')}

/* ---------- Admin: data latih ---------- */
// V.adm_latih: halaman Data latih versi berfungsi. Pencarian menyambung isi satu baris menjadi satu teks lalu dicocokkan dengan kata cari (dq).
// L = pasangan [baris, nomor asli di DL] yang lolos pencarian.
V.adm_latih=function(){const L=DL.map((r,i)=>[r,i]).filter(([r])=>r.join(' ').toLowerCase().includes(dq.toLowerCase()));
  return head('Data latih','Data Latih')+`<div class="bar"><div><button class="p" onclick="openT()">+ Tambah</button> <button class="s" onclick="openI()">⬆ Impor CSV</button> <button class="o" onclick="openTpl()">⬇ Template</button></div><input style="max-width:200px" placeholder="🔍 Cari" value="${esc(dq)}" onchange="dq=this.value;go('latih')"></div><div class="card">`+(L.length?tbl(['No','IPK','Penghasilan','Tanggungan','Daya','Kelas','Keterangan label','Aksi'],L.map(([r,i],n)=>tr([n+1,r[0],r[1],r[2],r[3],bd(r[4]=='Layak'?'ok':'no',r[4].toUpperCase()),r[5],ab('latih',i)]))):'<p>Tidak ada data yang cocok.</p>')+`<p><small>Total ${DL.length} data. Label berdasarkan pemenuhan kriteria, bukan hasil akhir. Berkas tidak sah tidak dimasukkan.</small></p></div>`};
// V.adm_latih_f: form Ubah data latih. o = OPT (data.js) sebagai sumber pilihan dropdown, diisi dari DL[ei].
V.adm_latih_f=function(){const r=DL[ei],o=OPT;
  return head('Ubah data latih','Data Latih › Ubah')+'<div class="card"><div class="two"><div><label>IPK</label>'+sl('el0',o.ipk,r[0])+'</div><div><label>Penghasilan</label>'+sl('el1',o.peng,r[1])+'</div></div><div class="two"><div><label>Tanggungan</label>'+sl('el2',o.tang,r[2])+'</div><div><label>Daya listrik</label>'+sl('el3',o.daya,r[3])+'</div></div><div class="two"><div><label>Kelas</label>'+sl('el4',o.kelas,r[4])+'</div><div><label>Keterangan label</label>'+sl('el5',o.ket,r[5])+'</div></div>'+FE+fb('latih','saveEL()')+'</div>'};
// saveEL(): menyimpan hasil ubah data latih. r = enam nilai dropdown (el0 sampai el5), diperiksa chk(). Kalau lolos, ganti DL[ei].
function saveEL(){const r=[0,1,2,3,4,5].map(i=>$('el'+i).value),m=chk(r);if(m)return fe(m);DL[ei]=r;toast('Data latih diperbarui');go('latih')}
// trainM(b): simulasi "Latih model". Tombol b dimatikan selama 1,4 detik, lalu tulisan "Terakhir dilatih" diisi tanggal hari ini.
// Angka akurasi 87% masih contoh; perhitungan C4.5 yang sebenarnya direncanakan di server.
function trainM(b){b.disabled=true;b.textContent='⏳ Melatih model…';
  setTimeout(()=>{const d=new Date();b.disabled=false;b.textContent='▶ Latih model';$('mb').textContent='Terakhir dilatih: '+d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()+' · Akurasi 87%';toast('Model selesai dilatih (tetap di halaman ini)')},1400)}
// dlTpl(): mengunduh template CSV data latih (menimpa versi simulasi di pages-admin.js) lewat dl().
function dlTpl(){dl('template-data-latih.csv','ipk,penghasilan,tanggungan,daya,kelas,keterangan\nTinggi,Rendah,Banyak,450 VA,Layak,Memenuhi kriteria\nSedang,Tinggi,Sedikit,2200 VA,Tidak Layak,Tidak memenuhi kriteria','text/csv');toast('template-data-latih.csv diunduh')}

/* ---------- Profil (semua role, hanya tampilan) ---------- */
// V.mhs_prof: Profil versi baca-saja. Nama dan role hanya ditampilkan; yang bisa diubah hanya kata sandi.
// full = nama lengkap (mahasiswa memakai nama di form pendaftaran F.n, role lain memakai nm).
V.mhs_prof=function(){const full=role=='mhs'?F.n:nm;
  return head('Profil','Profil')+`<div class="card" style="max-width:480px"><div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><div style="width:56px;height:56px;border-radius:50%;background:var(--g);color:#fff;display:flex;align-items:center;justify-content:center;font:700 22px Poppins">${esc(nm.charAt(0))}</div><div><b>${esc(full)}</b><br><small style="color:var(--mut)">${R[role].n}</small></div></div>`+fi('pf1','Nama lengkap',full,'text','disabled')+fi('pf2','Role',R[role].n,'text','disabled')+fi('pf3','Kata sandi baru (min. 8 karakter)','','password','autocomplete="new-password" placeholder="Ketik kata sandi baru"')+`<div id="pfm" class="note" role="alert" style="display:none;margin-top:12px"></div><p style="margin-top:16px;text-align:right"><button class="p" onclick="savePw()">Simpan</button></p></div>`};
// savePw(): menyimpan kata sandi baru (minimal 8 karakter). Akun hasil registrasi mengubah ACC (untuk NIM dan emailnya),
// akun demo mengubah PWD. save() menyimpan perubahan ke sessionStorage.
function savePw(){const p=$('pf3').value,m=$('pfm');
  if(p.length<8){m.textContent='Kata sandi baru minimal 8 karakter.';m.style.display='block';return}
  if(role=='mhs'&&ACC.some(a=>a[3]==F.nim))ACC.forEach(a=>{if(a[3]==F.nim)a[1]=p});else PWD[ri()]=p;
  save();toast('Kata sandi berhasil diubah');go('prof')}
// Admin dan Petugas memakai Profil yang sama.
V.adm_prof=V.ptg_prof=V.mhs_prof;

/* ---------- Mahasiswa: form pendaftaran ---------- */
// cl(): menyalin isi kolom form (id berawalan q_) ke objek F supaya tidak hilang saat pindah langkah atau menggambar ulang halaman.
function cl(){['n','nim','pr','sm','hp','al','ipk','pg','tg','dy'].forEach(k=>{const e=$('q_'+k);if(e)F[k]=e.value.trim()})}
// vs(s): memeriksa langkah ke-s pada form pendaftaran.
function vs(s){return VAL.pendaftaran(s,F)}   // aturan ada di validasi.js
// V.mhs_daftar: form pendaftaran 3 langkah versi berfungsi: 1 data diri, 2 data kriteria, 3 unggah berkas.
// c = isi form langkah yang sedang tampil (st). Isian diambil dari F sehingga tetap terisi saat kembali ke langkah sebelumnya.
V.mhs_daftar=function(){const S=['Data diri','Data kriteria','Berkas'];let c;
  if(st==1)c=fi('q_n','Nama lengkap',F.n)+fi('q_nim','NIM',F.nim,'text','inputmode="numeric" maxlength="14" placeholder="8–14 angka"')+fi('q_pr','Program studi',F.pr)+fi('q_sm','Semester',F.sm,'number','min="1" max="14"')+fi('q_hp','No. HP',F.hp,'tel','placeholder="08xx-xxxx-xxxx"')+`<label>Alamat</label><textarea id="q_al" rows="2">${esc(F.al)}</textarea>`;
  else if(st==2)c=fi('q_ipk','IPK (0 – 4)',F.ipk,'number','step="0.01" min="0" max="4"')+'<label>Penghasilan orang tua / wali</label>'+sl('q_pg',['Kurang dari Rp1.000.000','Rp1.000.000 – Rp2.000.000','Lebih dari Rp2.000.000'],F.pg)+fi('q_tg','Jumlah tanggungan',F.tg,'number','min="0"')+'<label>Daya listrik</label>'+sl('q_dy',['450 VA','900 VA','1300 VA','2200 VA atau lebih'],F.dy);
  else c=[['ktp','KTP / KK'],['slip','Slip gaji / surat keterangan'],['lis','Tagihan listrik'],['trn','Transkrip nilai']].map(([k,l])=>`<label>${l}</label><input type="file" accept=".pdf,.jpg,.jpeg" onchange="fchk(this,'${k}')">${F.fl[k]?`<small>✔ Terpilih: ${esc(F.fl[k])}</small>`:''}`).join('')+'<br><small>PDF/JPG, maks. 2 MB</small>';
  return head('Form pendaftaran','Pendaftaran')+'<div class="steps">'+S.map((x,i)=>`<span class="${i+1==st?'on':''}">${i+1} ${x}</span>`).join('')+'</div><div class="card">'+c+FE+'<p style="display:flex;gap:8px;flex-wrap:wrap">'+(st>1?`<button class="o" onclick="stp(${st-1})">Kembali</button>`:'')+'<button class="s" onclick="cl();toast(\'Draf tersimpan\')">Simpan draf</button>'+(st<3?`<button class="p" onclick="stp(${st+1})">Lanjut</button>`:'<button class="p" onclick="kirim()">Kirim pendaftaran</button>')+'</p></div>'};
// stp(n): pindah ke langkah n. Isian disimpan dulu (cl). Kalau maju, langkah sekarang harus lolos pemeriksaan vs(); kalau tidak, tampilkan error dan tetap di tempat.
function stp(n){cl();if(n>st){const m=vs(st);if(m)return fe(m)}st=n;go('daftar')}
// fchk(el, k): memeriksa berkas yang dipilih pada kolom el. Hanya PDF/JPG dan maksimal 2 MB; kalau melanggar, pilihan dikosongkan dan pesan error tampil.
// Kalau lolos, nama berkas disimpan di F.fl[k] lalu halaman digambar ulang agar tanda ✔ muncul.
function fchk(el,k){const f=el.files[0];if(!f)return;
  if(!/\.(pdf|jpe?g)$/i.test(f.name)){el.value='';return fe('Format berkas harus PDF atau JPG.')}
  if(f.size>2*1024*1024){el.value='';return fe('Ukuran berkas maksimal 2 MB.')}F.fl[k]=f.name;go('daftar')}
// kirim(): tombol Kirim pendaftaran. Memeriksa langkah 1 dan 2, lalu memastikan keempat berkas sudah diunggah (x = jumlah yang belum).
// Kalau lolos, tampilkan pop-up konfirmasi.
function kirim(){cl();let m=vs(1)||vs(2);const x=['ktp','slip','lis','trn'].filter(k=>!F.fl[k]).length;if(!m&&x)m=x+' berkas belum diunggah.';if(m)return fe(m);
  openM(400,mHead('Kirim pendaftaran?')+'<p style="margin:10px 0">Data tidak dapat diubah setelah dikirim.</p>'+mFoot('Periksa lagi','<button class="p" onclick="doKirim()">Ya, kirim</button>'))}
// doKirim(): dipanggil dari pop-up setelah mahasiswa menekan "Ya, kirim". Menutup pop-up dan kembali ke dashboard.
function doKirim(){closeM();toast('Pendaftaran terkirim');go('dash')}
// gd1() dan gd3(): tombol Buka pada kartu tahap di dashboard. Membuka form pendaftaran langsung di langkah 1 atau langkah 3.
function gd1(){st=1;go('daftar')}
function gd3(){st=3;go('daftar')}

/* ---------- Petugas ---------- */
// V.ptg_verif: halaman Verifikasi berfungsi. L = pendaftar yang lolos filter status (vf). Tombol Periksa membuka kartu detail (d)
// untuk pendaftar nomor vi, berisi data kriteria, tombol Lihat berkas, kolom catatan, serta tombol Kembalikan dan Sahkan.
V.ptg_verif=function(){const L=VL.map((v,i)=>[v,i]).filter(([v])=>vf=='Semua status'||VS[v[3]][1]==vf);let d='';
  if(vi>=0){const v=VL[vi];d=`<div class="card"><h3 style="font-size:16px">${v[0]}</h3><div class="grid" style="margin-top:12px"><div>IPK: ${v[5]}<br>Penghasilan: ${v[6]}<br>Tanggungan: ${v[7]}<br>Daya: ${v[8]}</div><div>KK.pdf · Slip.pdf · Listrik.jpg<br><button class="s" style="margin-top:6px" onclick="lihatB()">Lihat berkas</button></div></div><label>Catatan (wajib jika dikembalikan)</label><textarea id="vn" rows="2"></textarea>${FE}<p style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button class="w" onclick="vset('ret')">Kembalikan</button><button class="o" onclick="vi=-1;go('verif')">Tutup</button><button class="p" onclick="vset('ver')">Sahkan berkas</button></p></div>`}
  return head('Verifikasi berkas','Verifikasi')+`<div class="bar"><select style="width:auto" onchange="vf=this.value;vi=-1;go('verif')">${['Semua status','Menunggu','Perlu perbaikan','Terverifikasi'].map(x=>`<option${x==vf?' selected':''}>${x}</option>`).join('')}</select></div><div class="card">`+tbl(['Nama','NIM','Tanggal','Status','Aksi'],L.map(([v,i])=>tr([v[0],v[1],v[2],bd(VS[v[3]][0],VS[v[3]][1]),v[3]=='wait'?`<button class="p" style="padding:5px 12px" onclick="vi=${i};go('verif')">Periksa</button>`:''])))+'</div>'+d};
// vset(s): menetapkan hasil verifikasi pendaftar ke-vi. s = "ver" (sahkan) atau "ret" (kembalikan). Mengembalikan wajib disertai catatan.
// Status dan catatan disimpan di VL.
function vset(s){const n=$('vn').value.trim();if(s=='ret'&&!n)return fe('Catatan wajib diisi jika berkas dikembalikan.');VL[vi][3]=s;VL[vi][4]=n;toast(s=='ver'?'Berkas disahkan: Terverifikasi':'Dikembalikan: Perlu perbaikan');vi=-1;go('verif')}
// lihatB(): pop-up pratinjau berkas pendaftar (tiga berkas contoh, hanya kotak penanda).
function lihatB(){openM(540,mHead('Berkas pendaftar')+['KK.pdf','Slip.pdf','Listrik.jpg'].map(f=>`<div class="card" style="margin:8px 0"><b>📄 ${f}</b><div style="height:90px;margin-top:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--mut);border:1px dashed var(--mut)">Pratinjau ${f} (contoh)</div></div>`).join('')+mFoot('Tutup',''))}
// kq(): teks badge ringkasan "Kuota · Layak · Diterima". Kuota dari periode aktif (bawaan 120 kalau tidak ada), jumlah Layak dan Diterima dihitung dari KL.
const kq=()=>{const q=(PL.find(a=>a[4])||[0,0,0,120])[3];return`Kuota ${q} · Layak ${KL.filter(k=>k[2]=='Layak').length} · Diterima ${KL.filter(k=>k[3]=='Diterima').length}`};
// V.ptg_klas: halaman Klasifikasi dan keputusan versi berfungsi. Satu baris per pendaftar di KL, dengan dropdown keputusan akhir (id ks0, ks1, ...) dan tombol Simpan per baris.
V.ptg_klas=function(){
  return head('Klasifikasi dan keputusan','Klasifikasi & Keputusan')+`<div class="bar"><button class="p" onclick="runK(this)">▶ Jalankan klasifikasi C4.5</button><span class="badge b-ver" id="kq">${kq()}</span></div><div class="card">`+tbl(['No','Nama','Data','Rekomendasi sistem','Keputusan akhir','Aksi'],KL.map((k,i)=>tr([i+1,k[0],`<button class="s" style="padding:5px 10px" onclick="lihatK(${i})">Lihat</button>`,bd(k[2]=='Layak'?'ok':'no',k[2].toUpperCase()),sl('ks'+i,['Diterima','Layak (kuota penuh)','Tidak Layak'],k[3],'style="width:auto"'),`<button class="p" style="padding:5px 12px" onclick="saveK(${i})">Simpan</button>`])))+'</div><div class="bar"><small style="color:var(--mut)">Rekomendasi hanya pendukung. Petugas menerapkan kuota dan menetapkan keputusan akhir.</small><button class="s" onclick="openX()">📄 Ekspor hasil (PDF/Excel)</button></div>'};
// runK(b): simulasi "Jalankan klasifikasi C4.5". Setelah 1,2 detik, rekomendasi diisi dengan aturan sederhana contoh:
// daya 450 VA atau 900 VA = Layak, selain itu Tidak Layak. Halaman digambar ulang tanpa pindah halaman.
function runK(b){b.disabled=true;b.textContent='⏳ Mengklasifikasi…';setTimeout(()=>{KL.forEach(k=>k[2]=/^(450|900) VA/.test(k[7])?'Layak':'Tidak Layak');go('klas');toast('Klasifikasi selesai: '+KL.length+' pendaftar')},1200)}
// saveK(i): menyimpan keputusan akhir pendaftar ke-i dari dropdown ks+i ke KL, lalu memperbarui badge kuota (kq).
function saveK(i){KL[i][3]=$('ks'+i).value;$('kq').textContent=kq();toast('Keputusan disimpan: '+KL[i][0]+' → '+KL[i][3])}
// lihatK(i): pop-up berisi data kriteria pendaftar ke-i (nama, NIM, IPK, penghasilan, tanggungan, daya).
function lihatK(i){const k=KL[i];openM(400,mHead('Data pendaftar')+tbl(['Data','Isi'],[tr(['Nama',k[0]]),tr(['NIM',k[1]]),tr(['IPK',k[4]]),tr(['Penghasilan',k[5]]),tr(['Tanggungan',k[6]]),tr(['Daya listrik',k[7]])])+mFoot('Tutup',''))}
// openX(): pop-up Ekspor hasil (menimpa versi pages-petugas.js). XF = format (1 PDF, 2 Excel). Pratinjau memakai data KL asli.
function openX(){XF=1;openM(700,mHead('Ekspor hasil seleksi')+'<div class="two"><div><label>Format</label><div style="display:flex;gap:6px"><button id="xf1" class="p" style="flex:1" onclick="fx(1)">PDF</button><button id="xf2" class="o" style="flex:1" onclick="fx(2)">Excel</button></div></div><div><label>Isi laporan</label><select id="xs"><option>Semua pendaftar</option><option>Hanya yang diterima</option></select></div></div><label>Pratinjau laporan</label><div class="card" style="background:#fff;color:#1f2937;margin:4px 0 0"><b>Laporan Hasil Seleksi KIP-Kuliah · KIP-K 2026</b><br><small>Universitas Khairun · Kuota '+(PL.find(a=>a[4])||[0,0,0,120])[3]+'</small>'+tbl(['No','Nama','NIM','Rekomendasi','Keputusan akhir'],KL.map((k,i)=>tr([i+1,k[0],k[1],bd(k[2]=='Layak'?'ok':'no',k[2].toUpperCase()),k[3]])))+'<p style="text-align:center;margin:8px 0 0"><small>© 2026 Informatika, Universitas Khairun</small></p></div>'+mFoot('Batal','<button class="p" id="xbtn" onclick="doX()">Unduh PDF</button>'))}
// doX(): tombol Unduh. L = pendaftar yang diekspor sesuai pilihan isi laporan (semua, atau hanya yang diterima).
function doX(){const L=KL.filter(k=>$('xs').value=='Semua pendaftar'||k[3]=='Diterima');
  // Format Excel: dibuat berkas CSV (bisa dibuka di Excel) lewat dl(). Kolom keputusan diberi tanda kutip karena mengandung tanda kurung dan spasi.
  if(XF==2)dl('hasil-seleksi-KIP-K-2026.csv',['No,Nama,NIM,Rekomendasi,Keputusan akhir'].concat(L.map((k,i)=>[i+1,k[0],k[1],k[2],'"'+k[3]+'"'].join(','))).join('\n'),'text/csv');
  // Format PDF: buka tab baru berisi tabel laporan yang langsung memanggil print(), lalu pengguna memilih "Simpan sebagai PDF".
  // Kalau tab diblokir browser (w kosong), tampilkan pesan agar mengizinkan pop-up.
  else{const w=open('','_blank');if(!w)return toast('Izinkan pop-up untuk mencetak/menyimpan PDF');
    w.document.write('<title>Laporan Hasil Seleksi</title><body style="font-family:sans-serif"><h3>Laporan Hasil Seleksi KIP-Kuliah · KIP-K 2026</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>No</th><th>Nama</th><th>NIM</th><th>Rekomendasi</th><th>Keputusan akhir</th></tr>'+L.map((k,i)=>`<tr><td>${i+1}</td><td>${k[0]}</td><td>${k[1]}</td><td>${k[2]}</td><td>${k[3]}</td></tr>`).join('')+'</table><p>© 2026 Informatika, Universitas Khairun</p><script>print()<\/script>');w.document.close()}
  // Tutup pop-up dan beri tahu laporan sudah dibuat.
  closeM();toast('Laporan diunduh')}

/* ---------- Auth: registrasi, login, lupa password ---------- */
// reg(e): registrasi akun mahasiswa. g(i) = isi kolom registrasi ke-i (r1 nama, r2 NIM, r3 prodi, r4 email, r5 password, r6 konfirmasi).
function reg(e){e.preventDefault();const g=i=>$('r'+i).value.trim(),n=g(1),nim=g(2),em=g(4).toLowerCase(),p=$('r5').value;let m='';
  m=VAL.registrasi(n,nim,em,p,$('r6').value);   // aturan ada di validasi.js
  // Ada error: tampilkan di kotak merah (rer) dan berhenti. return false mencegah form dikirim.
  const er=$('rer');if(m){er.textContent=m;er.style.display='block';return false}
  // Lolos: akun disimpan dua kali di ACC (login dengan NIM dan login dengan email), lalu ditambahkan juga ke daftar pengguna UL
  // agar tampil di Kelola pengguna admin. Kembali ke form login dengan kolom NIM terisi.
  er.style.display='none';ACC.push([nim,p,n,nim,g(3)],[em,p,n,nim,g(3)]);UL.push([n,nim,'Mahasiswa',1]);toast('Akun dibuat, silakan masuk');showLogin(0);$('em').value=nim;return false}
// enter(e): login versi berfungsi (menimpa auth.js). Selain 3 akun demo, juga menerima akun hasil registrasi di ACC.
// u = nomor akun demo yang cocok, a = akun registrasi yang cocok.
function enter(e){e.preventDefault();const k=$('em').value.trim().toLowerCase(),p=$('pw').value,er=$('er');let u=null;
  DEMO().forEach((d,i)=>{if(d[1].toLowerCase()==k&&d[2]==p)u=i});const a=ACC.find(x=>x[0]==k&&x[1]==p);
  if(u===null&&!a){er.textContent='NIM/email atau kata sandi salah.';er.style.display='block';return false}
  er.style.display='none';
  // Akun registrasi: role mahasiswa, nama tampil = nama depan, dan form pendaftaran F dikosongkan memakai data akunnya.
  // Akun demo: role dan nama diambil sesuai nomor akun.
  if(a){role='mhs';nm=a[2].split(' ')[0];F={n:a[2],nim:a[3],pr:a[4],sm:'1',hp:'',al:'',ipk:'',pg:'Kurang dari Rp1.000.000',tg:'',dy:'450 VA',fl:{}}}
  else{role=['mhs','adm','ptg'][u];nm=['Salwa','Admin','Petugas'][u]}
  start();return false}
// fm2(m): menampilkan pesan error m pada form lupa password (kotak #fm).
const fm2=m=>{$('fm').textContent=m;$('fm').style.display='block'};
// sendK(): langkah 1 lupa password. Email/NIM wajib diisi dan harus terdaftar (akun demo atau ACC). Kalau ada, disimpan di FK lalu lanjut ke langkah 2 (kode).
function sendK(){const k=$('fe').value.trim().toLowerCase();if(!k)return fm2('Email / NIM wajib diisi.');
  if(!DEMO().some(d=>d[1].toLowerCase()==k)&&!ACC.some(a=>a[0]==k))return fm2('Akun tidak ditemukan.');FK=k;fstep(2)}
// fdone(): langkah 3 lupa password (menimpa auth.js). Password baru minimal 8 karakter dan konfirmasinya harus sama.
// Kalau akun demo, ganti PWD; kalau akun registrasi, ganti di ACC (kedua entri NIM dan email sekaligus).
function fdone(){const a=$('fp1').value,b=$('fp2').value;if(a.length<8)return fm2('Password baru minimal 8 karakter.');if(a!==b)return fm2('Konfirmasi password tidak sama.');
  const i=DEMO().findIndex(d=>d[1].toLowerCase()==FK);if(i>=0)PWD[i]=a;const c=ACC.find(x=>x[0]==FK);if(c)ACC.forEach(x=>{if(x[3]==c[3])x[1]=a});
  toast('Password berhasil diubah, silakan masuk');showLogin(0)}
