/* HALAMAN MAHASISWA */
// V.mhs_dash: dashboard mahasiswa. Dua kartu (status dan periode aktif), penjelasan sistem,
// empat kartu tahap seleksi (dibuat stc()), dan tombol Lengkapi pendaftaran.
V.mhs_dash = function() {
  // ok = label hijau 'Selesai' yang dipakai ulang pada judul tahap 1 dan 2.
  var ok='<span class="badge b-ok">Selesai</span>';
  return head('Halo, '+nm,'Dashboard')+'<div class="grid"><div class="card"><div class="stat"><span>Status Anda</span><br>'+bd('wait','Menunggu verifikasi')+'</div></div><div class="card stat"><span>Periode aktif</span><b style="font-size:20px">KIP-K 2026</b><span>ditutup 30 Nov 2026</span></div></div><div class="card" style="margin-top:16px"><h3 style="font-size:16px">Tentang SIPAKAT-KIP</h3><p style="margin:6px 0 0">Sistem seleksi calon penerima beasiswa KIP-Kuliah Universitas Khairun. Kelayakan dinilai dari IPK, penghasilan orang tua/wali, jumlah tanggungan, dan daya listrik memakai metode Decision Tree C4.5. Sistem hanya memberi rekomendasi; keputusan akhir ada pada Petugas Seleksi.</p></div><div class="grid">'+stc('1. Isi data '+ok,'','Dikerjakan oleh Anda.','gd1')+stc('2. Unggah '+ok,'','Dikerjakan oleh Anda.','gd3')+stc('3. Verifikasi',bd('wait','Berlangsung'),'Dikerjakan oleh Petugas Seleksi. Anda cukup menunggu; berkas yang kurang dikembalikan beserta catatan.',0)+stc('4. Hasil','<span class="badge" style="background:var(--mut)">Terkunci</span>','Terbuka setelah Petugas menetapkan keputusan akhir; dilihat di menu Status & Hasil.',0)+'</div><p style="margin-top:16px"><button class="p" onclick="gd()">LENGKAPI PENDAFTARAN</button></p>'
};

// V.mhs_daftar: form pendaftaran tiga langkah (data diri, data kriteria, berkas). Variabel st (data.js) = langkah yang sedang tampil.
// Catatan: pages-extra.js menimpa halaman ini dengan versi yang isiannya tersimpan dan divalidasi.
V.mhs_daftar = function() {
  // S = nama tiap langkah. c = isi form tiap langkah, jadi c[st-1] adalah isi langkah yang sedang tampil.
  var S=['Data diri','Data kriteria','Berkas'],c=[
'<label>Nama lengkap</label><input value="Salwa Wahidin"><label>NIM</label><input value="07352411149"><label>Program studi</label><input value="Informatika"><label>Semester</label><input type="number" value="5"><label>No. HP</label><input><label>Alamat</label><textarea rows="2"></textarea>',
'<label>IPK</label><input value="3.45"><label>Penghasilan orang tua / wali</label><select><option>Rp1.000.000 – Rp2.000.000</option><option>Kurang dari Rp1.000.000</option><option>Lebih dari Rp2.000.000</option></select><label>Jumlah tanggungan</label><input type="number" value="4"><label>Daya listrik</label><select><option>900 VA</option><option>450 VA</option><option>1300 VA</option><option>2200 VA atau lebih</option></select>',
'<label>KTP / KK</label><input type="file"><label>Slip gaji / surat keterangan</label><input type="file"><label>Tagihan listrik</label><input type="file"><label>Transkrip nilai</label><input type="file"><small>PDF/JPG, maks. 2 MB</small>'];
  return head('Form pendaftaran','Pendaftaran')+'<div class="steps">'+S.map(function(x,i) {
    return '<span class="'+(i+1==st?'on':'')+'">'+(i+1)+' '+x+'</span>'
  }).join('')+'</div><div class="card">'+c[st-1]+'<p style="display:flex;gap:8px;flex-wrap:wrap">'+(st>1?'<button class="o" onclick="stp('+(st-1)+')">Kembali</button>':'')+'<button class="s" onclick="toast(\'Draf tersimpan\')">Simpan draf</button>'+(st<3?'<button class="p" onclick="stp('+(st+1)+')">Lanjut</button>':'<button class="p" onclick="if(confirm(\'Yakin kirim? Data tidak dapat diubah.\'))toast(\'Pendaftaran terkirim\')">Kirim pendaftaran</button>')+'</p></div>'
};

// V.mhs_status: halaman Status & Hasil. Garis waktu proses, catatan petugas, kartu hasil akhir (terkunci sebelum diputuskan),
// tombol Perbaiki berkas, dan kotak centang simulasi periode lewat.
V.mhs_status = function() {
  return head('Status & Hasil','Status & Hasil')+'<div class="two2"><div class="card" style="margin:0"><ul class="tl"><li class="done"><b>Dikirim</b> <small>(oleh Anda, 12 Okt 2026)</small></li><li class="done"><b>Diverifikasi</b> <small>(oleh Petugas, 14 Okt 2026)</small></li><li class="done"><b>Diklasifikasi</b> <small>(oleh sistem, 16 Okt 2026)</small></li><li><b>Hasil akhir</b> <small>(oleh Petugas)</small></li></ul></div><div><div class="note" style="margin-bottom:16px">Catatan petugas: tagihan listrik buram, unggah ulang.</div><div class="card" style="text-align:center"><small>HASIL AKHIR</small><div style="font:700 28px Poppins;color:var(--ok)">LAYAK · DITERIMA</div><small>Sebelum keputusan ditetapkan, kartu ini terkunci 🔒</small></div><button class="w" onclick="perbaiki()">Perbaiki berkas</button><div id="perr" class="note" role="alert" style="display:none;margin-top:10px;background:#FEF2F2;color:#B91C1C;border-color:#DC2626"></div><label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px"><input type="checkbox" style="width:auto" '+(perLewat?'checked':'')+' onchange="setPL(this.checked)"> Simulasi (demo): periode pendaftaran sudah lewat</label> <small>Hanya muncul saat status Perlu Perbaikan.</small></div></div><div class="info"><b>Arti hasil.</b> DITERIMA: layak dan masuk kuota. LAYAK (kuota penuh): memenuhi kriteria tetapi kuota habis. TIDAK LAYAK: belum memenuhi kriteria.</div>'
};

// stc(t, b, w, a): membuat satu kartu tahap di dashboard.
// t = judul tahap, b = badge status (boleh kosong), w = penjelasan, a = nama fungsi untuk tombol Buka (0 = kartu terkunci tanpa tombol).
function stc(t,b,w,a) {
  return '<div class="st'+(a?'':' lock')+'"><b>'+t+'</b> '+b+'<p>'+w+'</p>'+(a?'<button class="p" style="padding:5px 12px" onclick="'+a+'()">Buka</button>':'<small>🔒 Bukan tombol, hanya informasi tahap.</small>')+'</div>'
}

// gd(): membuka halaman Pendaftaran (tombol Lengkapi pendaftaran).
function gd() {
  go('daftar')
}

// stp(n): pindah ke langkah n pada form pendaftaran, lalu gambar ulang halaman. (Versi pages-extra.js juga memeriksa isian.)
function stp(n) {
  st=n;
  go('daftar')
}

// perbaiki(): tombol Perbaiki berkas. Kalau periode sudah lewat, tampilkan pesan penolakan; kalau belum, buka langkah 3 (Berkas) untuk unggah ulang.
function perbaiki() {
  // e = kotak pesan error di bawah tombol Perbaiki berkas.
  var e=$('perr');
  if(perLewat) {
    e.style.display='block';
    e.textContent='Periode telah lewat. Perbaikan berkas tidak dapat dilakukan lagi.'
  }else {   // periode masih berlaku
    e.style.display='none';
    st=3;
    go('daftar')
  }
}

// setPL(v): kotak centang simulasi "periode sudah lewat". v = true/false disimpan di perLewat (data.js), lalu halaman digambar ulang.
// (Versi pages-extra.js juga ikut menonaktifkan atau mengaktifkan periode.)
function setPL(v) {
  perLewat=v;
  go('status')
}
