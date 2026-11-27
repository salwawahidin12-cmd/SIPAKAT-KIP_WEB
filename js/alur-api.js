/* ==================================================================
   alur-api.js : menyambungkan ALUR PENDAFTARAN ke database lewat API.
   Dimuat SETELAH pages-extra.js dan profil-api.js (lihat app.html), jadi fungsi
   bernama sama di sini menggantikan versi demo yang memakai data contoh
   (Salwa, Tegar, Aliyah, Nisma). Sesudah berkas ini, siapa pun yang mendaftar
   dengan nama apa pun akan tampil di halaman Petugas, dan hasilnya tersimpan di MySQL.
   Cakupan:
     Mahasiswa : dashboard, form pendaftaran (draf, unggah berkas, kirim), status dan hasil
     Petugas   : dashboard, verifikasi berkas, klasifikasi C4.5 dan keputusan akhir, ekspor
     Admin     : tombol Latih model (model C4.5 dibutuhkan untuk klasifikasi)
     Semua     : notifikasi (lonceng dan halaman Notifikasi)
   Catatan keamanan: semua teks dari database (nama, catatan) di-escape dengan esc()
   sebelum masuk ke HTML supaya tidak bisa menyisipkan skrip (XSS).
   ================================================================== */

// ---------- Kamus label ----------
// Penghasilan di database berupa kategori; form memakai teks rentang.
var PGL = { Rendah: 'Kurang dari Rp1.000.000', Sedang: 'Rp1.000.000 – Rp2.000.000', Tinggi: 'Lebih dari Rp2.000.000' };
// Versi singkat untuk tabel petugas.
var PGK = { Rendah: '< Rp1 juta', Sedang: 'Rp1–2 juta', Tinggi: '> Rp2 juta' };
// Nama jenis berkas.
var JL = { ktp: 'KTP / KK', slip: 'Slip gaji / surat keterangan', lis: 'Tagihan listrik', trn: 'Transkrip nilai' };

// ---------- Data dari server ----------
var SRV = { periode: null, daftar: null, berkas: [], profil: null };   // pendaftaran milik mahasiswa yang login
var FOK = false;                                                      // sudah mengisi F dari server?
var VD = null, VID = 0;                                               // detail pendaftar yang sedang diperiksa (petugas)
var PD = null;                                                        // angka dashboard petugas
var KS = { kuota: 0, layak: 0, diterima: 0 };                         // ringkasan kuota di halaman Klasifikasi
var KERR = '';                                                        // pesan kalau klasifikasi tidak bisa dimuat
var MD = null;                                                        // model C4.5 terbaru

// wkt('2026-11-13 10:05:00') -> '13 Nov 2026 10:05'
function wkt(s) { s = s || ''; return s.length >= 16 ? fd(s.slice(0, 10)) + ' ' + s.slice(11, 16) : ''; }
// tgl('2026-11-13 10:05:00') -> '13 Nov 2026'
function tgl(s) { return s ? fd(String(s).slice(0, 10)) : ''; }

// ==================================================================
// MAHASISWA
// ==================================================================

// loadSrv(): ambil pendaftaran milik akun yang login (periode aktif, data, daftar berkas).
async function loadSrv() {
  var r = await api('pendaftaran.php');
  if (r.ok) { SRV = { periode: r.periode, daftar: r.pendaftaran, berkas: r.berkas || [], profil: r.profil }; }
  // Nama di sapaan Dashboard dan bilah atas selalu mengikuti data terbaru dari server (kolom users.nama).
  if (r.ok && r.profil && r.profil.nama && role == 'mhs' && nm != r.profil.nama) {
    nm = r.profil.nama;
    try { sessionStorage.setItem('sipSes', JSON.stringify({ role: role, nm: nm })); } catch (e) {}
    var w = $('who'); if (w) w.textContent = nm + ' (' + R[role].n + ')';
  }
  if (r.ok && !FOK) { FOK = true; srvToF(); }   // isian form hanya diisi dari server SEKALI, supaya ketikan yang belum disimpan tidak tertimpa
}

// srvToF(): salin data dari server ke objek F (isian form di pages-extra.js).
function srvToF() {
  var pr = SRV.profil || {}, d = SRV.daftar;
  F = { n: (d && d.nama) || pr.nama || '', nim: pr.nim || '', pr: pr.program_studi || '', sm: '', hp: '', al: '', ipk: '', pg: PGL.Rendah, tg: '', dy: '450 VA', fl: {} };
  if (d) {
    F.sm = d.semester == null ? '' : String(d.semester);
    F.hp = d.no_hp || '';
    F.al = d.alamat || '';
    F.ipk = d.ipk == null ? '' : String(d.ipk);
    if (d.penghasilan) F.pg = PGL[d.penghasilan];
    F.tg = d.tanggungan == null ? '' : String(d.tanggungan);
    if (d.daya) F.dy = d.daya == '2200 VA' ? '2200 VA atau lebih' : d.daya;
  }
  (SRV.berkas || []).forEach(function (b) { F.fl[b.jenis] = b.nama_asli; });
}

// bodyF(): isi form menjadi objek yang dikirim ke pendaftaran.php.
function bodyF() {
  return { nama: F.n, nim: F.nim, semester: F.sm, no_hp: F.hp, alamat: F.al, ipk: F.ipk, penghasilan: F.pg, tanggungan: F.tg, daya: F.dy };
}

// terkunci(): true kalau pendaftaran sudah dikirim dan tidak boleh diubah (status wait atau ver).
function terkunci() {
  var d = SRV.daftar;
  return !!d && d.status != 'draft' && d.status != 'ret';
}

// simpanDraf(diam): PUT pendaftaran.php. Server memeriksa ulang semua isian dan periode. diam = tanpa toast.
async function simpanDraf(diam) {
  cl();   // salin isi kolom yang tampil ke F
  var r = await api('pendaftaran.php', { method: 'PUT', body: bodyF() });
  if (!r.ok) { fe(r.pesan); return false; }
  if (!diam) toast('Draf tersimpan');
  return true;
}

// Form pendaftaran: pakai halaman lama, hanya tombol Simpan draf diganti dan diberi catatan bila terkunci.
var _daftarLama = V.mhs_daftar;
V.mhs_daftar = function () {
  var h = _daftarLama().replace("cl();toast('Draf tersimpan')", 'simpanDraf()'), c = '';
  var p = SRV.periode;
  if (terkunci()) c = 'Pendaftaran sudah dikirim dan tidak dapat diubah.';
  else if (!p) c = 'Belum ada periode pendaftaran yang aktif.';
  else if (!p.terbuka) c = 'Periode pendaftaran sedang ditutup, data tidak dapat disimpan atau dikirim.';
  return c ? h.replace('<div class="steps">', '<div class="note" style="margin-bottom:12px">' + c + '</div><div class="steps">') : h;
};

// fchk(el, k): unggah berkas langsung ke server (berkas.php). Draf disimpan dulu karena berkas menempel pada pendaftaran.
async function fchk(el, k) {
  var f = el.files[0];
  if (!f) return;
  if (!/\.(pdf|jpe?g)$/i.test(f.name)) { el.value = ''; return fe('Format berkas harus PDF atau JPG.'); }
  if (f.size > 2 * 1024 * 1024) { el.value = ''; return fe('Ukuran berkas maksimal 2 MB.'); }
  if (!(await simpanDraf(true))) { el.value = ''; return; }
  var data = new FormData();
  data.append('jenis', k);
  data.append('berkas', f);
  var r = await api('berkas.php', { method: 'POST', body: data });
  if (!r.ok) { el.value = ''; return fe(r.pesan); }
  F.fl[k] = f.name;
  go('daftar');
}

// doKirim(): "Ya, kirim" pada pop-up. Server memeriksa data lengkap, 4 berkas, dan periode terbuka.
async function doKirim() {
  cl();
  var r = await api('pendaftaran.php?aksi=kirim', { method: 'POST', body: bodyF() });
  closeM();
  if (!r.ok) return fe(r.pesan);
  toast('Pendaftaran terkirim');
  await loadSrv();
  srvToF();
  go('dash');
}

// Status verifikasi/hasil mahasiswa menjadi [warna badge, tulisan].
function stSrv() {
  var d = SRV.daftar;
  if (!d || d.status == 'draft') return ['wait', 'Belum dikirim'];
  if (d.keputusan) return d.keputusan == 'Tidak Layak' ? ['no', 'Tidak layak'] : ['ok', d.keputusan];
  return { wait: ['wait', 'Menunggu verifikasi'], ver: ['ver', 'Terverifikasi'], ret: ['no', 'Perlu perbaikan'] }[d.status];
}

function gStatus() { go('status'); }

// V.mhs_dash: dashboard mahasiswa dari data server.
V.mhs_dash = function () {
  var d = SRV.daftar, p = SRV.periode, ok = '<span class="badge b-ok">Selesai</span>', sent = !!d && d.status != 'draft';
  var nb = (SRV.berkas || []).length, s = stSrv();
  var kartuP = p
    ? '<span>Periode aktif</span><b class="per-nama" style="font-size:20px">' + esc(p.nama) + '</b><div style="margin:4px 0">' + bd(p.terbuka ? 'ok' : 'fix', p.terbuka ? 'Aktif' : 'Ditutup') + '</div><span>' + (p.terbuka ? 'ditutup ' + fd(p.tgl_tutup) : 'pendaftaran sedang ditutup') + '</span>'
    : '<span>Periode aktif</span><b class="per-nama" style="font-size:20px">—</b><span>Belum ada periode aktif</span>';
  var tahap3 = !sent ? '' : (d.status == 'ver' || d.keputusan ? bd('ok', 'Selesai') : d.status == 'ret' ? bd('no', 'Perlu perbaikan') : bd('wait', 'Berlangsung'));
  var tombol = !sent || d.status == 'ret'
    ? '<button class="p" onclick="gd()">LENGKAPI PENDAFTARAN</button>'
    : '<button class="p" onclick="gStatus()">LIHAT STATUS &amp; HASIL</button>';
  return head('Halo, ' + esc(nm), 'Dashboard') + '<div class="grid"><div class="card"><div class="stat"><span>Status Anda</span><br>' + bd(s[0], esc(s[1])) + '</div></div><div class="card stat">' + kartuP + '</div></div>' +
    '<div class="card" style="margin-top:16px"><h3 style="font-size:16px">Tentang SIPAKAT-KIP</h3><p style="margin:6px 0 0">Sistem seleksi calon penerima beasiswa KIP-Kuliah Universitas Khairun. Kelayakan dinilai dari IPK, penghasilan orang tua/wali, jumlah tanggungan, dan daya listrik memakai metode Decision Tree C4.5. Sistem hanya memberi rekomendasi; keputusan akhir ada pada Petugas Seleksi.</p></div><div class="grid">' +
    stc('1. Isi data ' + (sent ? ok : ''), '', 'Dikerjakan oleh Anda.', 'gd1') +
    stc('2. Unggah ' + (nb >= 4 ? ok : (nb ? bd('wait', nb + '/4') : '')), '', 'Dikerjakan oleh Anda.', 'gd3') +
    stc('3. Verifikasi', tahap3, 'Dikerjakan oleh Petugas Seleksi. Anda cukup menunggu; berkas yang kurang dikembalikan beserta catatan.', 0) +
    stc('4. Hasil', d && d.keputusan ? bd('ok', 'Tersedia') : '<span class="badge" style="background:var(--mut)">Terkunci</span>', 'Terbuka setelah Petugas menetapkan keputusan akhir; dilihat di menu Status & Hasil.', d && d.keputusan ? 'gStatus' : 0) +
    '</div><p style="margin-top:16px">' + tombol + '</p>';
};

// V.mhs_status: garis waktu, catatan petugas, dan kartu hasil akhir dari server.
V.mhs_status = function () {
  var d = SRV.daftar;
  if (!d || d.status == 'draft') {
    return head('Status & Hasil', 'Status & Hasil') + '<div class="card"><p>Anda belum mengirim pendaftaran. Lengkapi data dan unggah berkas di menu Pendaftaran.</p><p style="margin-top:12px"><button class="p" onclick="gd()">Buka pendaftaran</button></p></div>';
  }
  var k = d.keputusan, ver = d.status == 'ver' || !!k;
  var li = function (on, t, s) { return '<li' + (on ? ' class="done"' : '') + '><b>' + t + '</b> <small>' + s + '</small></li>'; };
  var hasil = '<div style="font:700 24px Poppins;color:var(--mut)">🔒 Terkunci</div><small>Terbuka setelah Petugas menetapkan keputusan akhir.</small>';
  if (k) {
    var lb = { 'Diterima': ['LAYAK · DITERIMA', 'var(--ok)'], 'Layak (kuota penuh)': ['LAYAK · KUOTA PENUH', '#B45309'], 'Tidak Layak': ['TIDAK LAYAK', '#B91C1C'] }[k];
    hasil = '<div class="hasil-' + (k == 'Diterima' ? 'ok' : k == 'Tidak Layak' ? 'tidak' : 'kuota') + '" style="font:700 28px Poppins;color:' + lb[1] + '">' + lb[0] + '</div>';
  }
  return head('Status & Hasil', 'Status & Hasil') + '<div class="two2"><div class="card" style="margin:0"><ul class="tl">' +
    li(true, 'Dikirim', '(oleh Anda, ' + tgl(d.tgl_kirim) + ')') +
    li(ver, 'Diverifikasi', '(oleh Petugas)') +
    li(!!k, 'Diklasifikasi', '(oleh sistem)') +
    li(!!k, 'Hasil akhir', '(oleh Petugas)') +
    '</ul></div><div>' +
    (d.status == 'ret' && d.catatan_petugas ? '<div class="note" style="margin-bottom:16px">Catatan petugas: ' + esc(d.catatan_petugas) + '</div>' : '') +
    '<div class="card" style="text-align:center"><small>HASIL AKHIR</small>' + hasil + '</div>' +
    (d.status == 'ret' ? '<button class="w" onclick="perbaiki()">Perbaiki berkas</button><div id="perr" class="note" role="alert" style="display:none;margin-top:10px;background:#FEF2F2;color:#B91C1C;border-color:#DC2626"></div>' : '') +
    '</div></div><div class="info"><b>Arti hasil.</b> DITERIMA: layak dan masuk kuota. LAYAK (kuota penuh): memenuhi kriteria tetapi kuota habis. TIDAK LAYAK: belum memenuhi kriteria.</div>';
};

// perbaiki(): hanya boleh selama periode masih terbuka (dicek juga oleh server).
function perbaiki() {
  var e = $('perr'), p = SRV.periode;
  if (!p || !p.terbuka) {
    e.style.display = 'block';
    e.textContent = 'Periode telah lewat. Perbaikan berkas tidak dapat dilakukan lagi.';
  } else {
    e.style.display = 'none';
    st = 3;
    go('daftar');
  }
}

// ==================================================================
// PETUGAS
// ==================================================================

// loadVerif(): daftar pendaftar yang sudah mengirim berkas -> VL.
// VL = [nama, NIM, tanggal, status, catatan, IPK, penghasilan, tanggungan, daya, id]. Teks sudah di-escape.
async function loadVerif() {
  var r = await api('verifikasi.php');
  if (r.ok) {
    VL = r.data.map(function (x) {
      return [esc(x.nama), esc(x.nim), tgl(x.tgl_kirim), x.status, esc(x.catatan_petugas || ''), String(x.ipk).replace('.', ','), PGK[x.penghasilan] || '', String(x.tanggungan), esc(x.daya), +x.id];
    });
  }
  vi = VID ? VL.findIndex(function (v) { return v[9] === VID; }) : -1;   // pertahankan pendaftar yang sedang diperiksa
  if (vi < 0) { VID = 0; VD = null; }
}

async function loadPtgDash() {
  var a = await Promise.all([api('dashboard.php'), loadVerif()]);
  if (a[0].ok) PD = a[0];
}

V.ptg_dash = function () {
  var d = (PD && PD.data) || {};
  var rows = VL.slice(-5).reverse().map(function (v) { return tr([v[0], v[1], v[2], bd(VS[v[3]][0], VS[v[3]][1])]); });
  return head('Halo, ' + esc(nm), 'Dashboard') + '<div class="grid"><div class="card stat"><b>' + (d.menunggu || 0) + '</b><span>Menunggu verifikasi</span></div><div class="card stat"><b>' + (d.siap_klasifikasi || 0) + '</b><span>Perlu diklasifikasi</span></div><div class="card stat"><b>' + (d.diputuskan || 0) + '</b><span>Sudah diputuskan</span></div></div><div class="card" style="margin-top:16px"><h3 style="font-size:16px;margin-bottom:8px">Pendaftar terbaru</h3>' +
    (rows.length ? tbl(['Nama', 'NIM', 'Tanggal', 'Status'], rows) : '<p>Belum ada pendaftar yang mengirim berkas.</p>') + '</div>';
};

// V.ptg_verif: tabel pendaftar nyata + kartu detail pendaftar yang diperiksa.
V.ptg_verif = function () {
  var L = VL.map(function (v, i) { return [v, i]; }).filter(function (a) { return vf == 'Semua status' || VS[a[0][3]][1] == vf; }), d = '';
  if (vi >= 0 && VL[vi]) {
    var v = VL[vi], b = (VD && VD.berkas) || [];
    d = '<div class="card"><h3 style="font-size:16px">' + v[0] + '</h3><div class="grid" style="margin-top:12px"><div>IPK: ' + v[5] + '<br>Penghasilan: ' + v[6] + '<br>Tanggungan: ' + v[7] + '<br>Daya: ' + v[8] + '</div><div>' +
      (b.length ? b.map(function (x) { return JL[x.jenis]; }).join(' · ') : 'Belum ada berkas') + '<br><button class="s" style="margin-top:6px" onclick="lihatB()">Lihat berkas</button></div></div><label>Catatan (wajib jika dikembalikan)</label><textarea id="vn" rows="2"></textarea>' + FE +
      '<p style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button class="w" onclick="vset(\'ret\')">Kembalikan</button><button class="o" onclick="vi=-1;VID=0;go(\'verif\')">Tutup</button><button class="p" onclick="vset(\'ver\')">Sahkan berkas</button></p></div>';
  }
  return head('Verifikasi berkas', 'Verifikasi') + '<div class="bar"><select style="width:auto" onchange="vf=this.value;vi=-1;VID=0;go(\'verif\')">' + ['Semua status', 'Menunggu', 'Perlu perbaikan', 'Terverifikasi'].map(function (x) { return '<option' + (x == vf ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></div><div class="card">' +
    (L.length ? tbl(['Nama', 'NIM', 'Tanggal', 'Status', 'Aksi'], L.map(function (a) {
      var v = a[0];
      return tr([v[0], v[1], v[2], bd(VS[v[3]][0], VS[v[3]][1]), v[3] == 'wait' ? '<button class="p" style="padding:5px 12px" onclick="periksa(' + a[1] + ')">Periksa</button>' : '']);
    })) : '<p>Belum ada pendaftar yang mengirim berkas.</p>') + '</div>' + d;
};

// periksa(i): ambil detail dan daftar berkas pendaftar ke-i dari server, lalu tampilkan kartu detail.
async function periksa(i) {
  var r = await api('verifikasi.php?id=' + VL[i][9]);
  if (!r.ok) return toast(r.pesan);
  VD = r.data;
  VID = VL[i][9];
  vi = i;
  go('verif');
}

// vset(s): sahkan (ver) atau kembalikan (ret). Server memeriksa catatan, status, dan role petugas.
async function vset(s) {
  var n = $('vn').value.trim();
  if (s == 'ret' && !n) return fe('Catatan wajib diisi jika berkas dikembalikan.');
  var r = await api('verifikasi.php?id=' + VL[vi][9], { method: 'PUT', body: { status: s, catatan: n } });
  if (!r.ok) return fe(r.pesan);
  toast(r.pesan);
  vi = -1; VID = 0; VD = null;
  go('verif');
}

// lihatB(): pop-up berisi tautan ke berkas asli. berkas.php memeriksa login dan role sebelum mengirim file.
function lihatB() {
  var v = VL[vi], b = (VD && VD.berkas) || [];
  openM(540, mHead('Berkas pendaftar') + (b.length ? b.map(function (x) {
    return '<div class="card" style="margin:8px 0"><b>📄 ' + JL[x.jenis] + '</b><br><small>' + esc(x.nama_asli) + '</small><br><a href="api/berkas.php?pendaftaran=' + v[9] + '&jenis=' + x.jenis + '" target="_blank" rel="noopener">Buka berkas</a></div>';
  }).join('') : '<p>Belum ada berkas.</p>') + mFoot('Tutup', ''));
}

// loadKlas(): pendaftar terverifikasi + ringkasan kuota -> KL.
// KL = [nama, NIM, rekomendasi, keputusan, IPK, penghasilan, tanggungan, daya, id]. Teks sudah di-escape.
async function loadKlas() {
  var r = await api('klasifikasi.php');
  KERR = '';
  if (r.ok) {
    KS = r.ringkasan;
    KL = r.data.map(function (x) {
      return [esc(x.nama), esc(x.nim), x.rekomendasi || '', x.keputusan || '', String(x.ipk).replace('.', ','), PGK[x.penghasilan] || '', String(x.tanggungan), esc(x.daya), +x.id];
    });
  } else { KL = []; KERR = r.pesan || ''; }
}

// V.ptg_klas: rekomendasi C4.5 dan keputusan akhir per pendaftar.
V.ptg_klas = function () {
  var opsi = ['Diterima', 'Layak (kuota penuh)', 'Tidak Layak'];
  var rows = KL.map(function (k, i) {
    return tr([i + 1, k[0], '<button class="s" style="padding:5px 10px" onclick="lihatK(' + i + ')">Lihat</button>',
      k[2] ? bd(k[2] == 'Layak' ? 'ok' : 'no', k[2].toUpperCase()) : bd('wait', 'BELUM'),
      '<select id="ks' + i + '" style="width:auto"><option value="">— pilih —</option>' + opsi.map(function (o) { return '<option' + (o == k[3] ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>',
      '<button class="p" style="padding:5px 12px" onclick="saveK(' + i + ')">Simpan</button>']);
  });
  return head('Klasifikasi dan keputusan', 'Klasifikasi & Keputusan') + '<div class="bar"><button class="p" onclick="runK(this)">▶ Jalankan klasifikasi C4.5</button><span class="badge b-ver" id="kq">Kuota ' + KS.kuota + ' · Layak ' + KS.layak + ' · Diterima ' + KS.diterima + '</span></div><div class="card">' +
    (KERR ? '<p>' + esc(KERR) + '</p>' : rows.length ? tbl(['No', 'Nama', 'Data', 'Rekomendasi sistem', 'Keputusan akhir', 'Aksi'], rows) : '<p>Belum ada pendaftar yang terverifikasi. Sahkan berkas di menu Verifikasi terlebih dahulu.</p>') +
    '</div><div class="bar"><small style="color:var(--mut)">Rekomendasi hanya pendukung. Petugas menerapkan kuota dan menetapkan keputusan akhir.</small><button class="s" onclick="openX()">📄 Ekspor hasil (PDF/Excel)</button></div>';
};

// runK(b): jalankan model C4.5 terbaru di server pada semua pendaftar terverifikasi.
async function runK(b) {
  b.disabled = true;
  b.textContent = '⏳ Mengklasifikasi…';
  var r = await api('klasifikasi.php?aksi=jalankan', { method: 'POST' });
  if (!r.ok) { b.disabled = false; b.textContent = '▶ Jalankan klasifikasi C4.5'; return toast(r.pesan); }
  toast(r.pesan);
  go('klas');
}

// saveK(i): simpan keputusan akhir. Server menjaga kuota dan aturan "hanya yang Layak boleh diterima".
async function saveK(i) {
  var v = $('ks' + i).value;
  if (!v) return toast('Pilih keputusan akhir terlebih dahulu.');
  var r = await api('klasifikasi.php?id=' + KL[i][8], { method: 'PUT', body: { keputusan: v } });
  if (!r.ok) return toast(r.pesan);
  toast(r.pesan);
  go('klas');
}

// openX(): pop-up ekspor (pratinjau dari KL). Nama sudah ter-escape.
function openX() {
  XF = 1;
  openM(700, mHead('Ekspor hasil seleksi') + '<div class="two"><div><label>Format</label><div style="display:flex;gap:6px"><button id="xf1" class="p" style="flex:1" onclick="fx(1)">PDF</button><button id="xf2" class="o" style="flex:1" onclick="fx(2)">Excel</button></div></div><div><label>Isi laporan</label><select id="xs"><option>Semua pendaftar</option><option>Hanya yang diterima</option></select></div></div><label>Pratinjau laporan</label><div class="card" style="background:#fff;color:#1f2937;margin:4px 0 0"><b>Laporan Hasil Seleksi KIP-Kuliah</b><br><small>Universitas Khairun · Kuota ' + KS.kuota + '</small>' +
    tbl(['No', 'Nama', 'NIM', 'Rekomendasi', 'Keputusan akhir'], KL.map(function (k, i) { return tr([i + 1, k[0], k[1], k[2] ? bd(k[2] == 'Layak' ? 'ok' : 'no', k[2].toUpperCase()) : '-', k[3] || '-']); })) +
    '<p style="text-align:center;margin:8px 0 0"><small>© 2026 Informatika, Universitas Khairun</small></p></div>' + mFoot('Batal', '<button class="p" id="xbtn" onclick="doX()">Unduh PDF</button>'));
}

// doX(): Excel = CSV dari server (api/klasifikasi.php?ekspor=csv). PDF = tab cetak dari data di layar.
function doX() {
  var L = KL.filter(function (k) { return $('xs').value == 'Semua pendaftar' || k[3] == 'Diterima'; });
  if (XF == 2) { location.href = 'api/klasifikasi.php?ekspor=csv'; closeM(); return toast('Laporan diunduh'); }
  var w = open('', '_blank');
  if (!w) return toast('Izinkan pop-up untuk mencetak/menyimpan PDF');
  w.document.write('<title>Laporan Hasil Seleksi</title><body style="font-family:sans-serif"><h3>Laporan Hasil Seleksi KIP-Kuliah</h3><table border="1" cellpadding="6" style="border-collapse:collapse"><tr><th>No</th><th>Nama</th><th>NIM</th><th>Rekomendasi</th><th>Keputusan akhir</th></tr>' +
    L.map(function (k, i) { return '<tr><td>' + (i + 1) + '</td><td>' + k[0] + '</td><td>' + k[1] + '</td><td>' + (k[2] || '-') + '</td><td>' + (k[3] || '-') + '</td></tr>'; }).join('') +
    '</table><p>© 2026 Informatika, Universitas Khairun</p><script>print()<\/script>');
  w.document.close();
  closeM();
  toast('Laporan dibuat');
}

// ==================================================================
// ADMIN: latih model C4.5 (dibutuhkan sebelum klasifikasi)
// ==================================================================
async function loadModel() {
  var r = await api('model.php');
  MD = r.ok ? r.model : null;
}
var _modelLama = V.adm_model;
V.adm_model = function () {
  var t = MD ? 'Terakhir dilatih: ' + tgl(MD.dilatih_pada) + ' · Akurasi ' + MD.akurasi + '%' : 'Belum pernah dilatih';
  return _modelLama().replace('Terakhir dilatih: 17 Okt 2026 · Akurasi 87%', t);
};
async function trainM(b) {
  b.disabled = true;
  b.textContent = '⏳ Melatih model…';
  var r = await api('model.php', { method: 'POST' });
  b.disabled = false;
  b.textContent = '▶ Latih model';
  if (!r.ok) return toast(r.pesan);
  $('mb').textContent = 'Terakhir dilatih: ' + tgl(r.dilatih_pada) + ' · Akurasi ' + r.akurasi + '%';
  toast('Model selesai dilatih dari ' + r.jumlah_data + ' data');
}

// ==================================================================
// NOTIFIKASI (semua role)
// ==================================================================
// NT[role] = [pesan, waktu, belum dibaca (1/0), halaman tujuan, id]
async function loadNotif() {
  var r = await api('notifikasi.php');
  if (r.ok) NT[role] = r.data.map(function (n) { return [esc(n.pesan), wkt(n.created_at), n.dibaca == 1 ? 0 : 1, n.tautan || 'dash', +n.id]; });
}
async function markAll() {
  await api('notifikasi.php?semua=1', { method: 'PUT' });
  go('notif');
}
async function openN(i) {
  var n = NT[role][i];
  if (n[2] && n[4]) await api('notifikasi.php?id=' + n[4], { method: 'PUT' });
  go(n[3]);
}

// ==================================================================
// Pemuat data sebelum halaman digambar
// go() dibungkus: untuk halaman yang punya pemuat, data diambil dulu dari server,
// baru halamannya digambar. Halaman lain digambar langsung seperti biasa.
// ==================================================================
var PEMUAT = {
  mhs_dash: loadSrv, mhs_status: loadSrv, mhs_prof: loadSrv,
  mhs_daftar: function () { return FOK ? Promise.resolve() : loadSrv(); },   // jangan menimpa ketikan yang belum disimpan
  ptg_dash: loadPtgDash, ptg_verif: loadVerif, ptg_klas: loadKlas,
  adm_model: loadModel,
  mhs_notif: loadNotif, adm_notif: loadNotif, ptg_notif: loadNotif
};
var goAsli = go, goTok = 0;
go = function (p) {
  var ld = PEMUAT[role + '_' + p], tok = ++goTok;
  if (!ld) { goAsli(p); } else {
    Promise.resolve().then(ld).catch(function () {}).then(function () { if (tok === goTok) goAsli(p); });
  }
  // Segarkan notifikasi di latar belakang supaya titik merah lonceng selalu terbaru.
  if (role && NT[role] && !/_notif$/.test(role + '_' + p)) loadNotif().then(function () { if (document.querySelector('#bell .dot')) updDot(); });
};
