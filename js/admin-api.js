var ROLEK = { mhs: 'Mahasiswa', adm: 'Admin', ptg: 'Petugas Seleksi' };             
var ROLEKODE = { 'Mahasiswa': 'mhs', 'Admin': 'adm', 'Petugas Seleksi': 'ptg' };      
var NAMA_ATR = { ipk: 'IPK', penghasilan: 'Penghasilan', tanggungan: 'Tanggungan', daya: 'Daya listrik' };

var DLID = [];     
var AD = null;     

function kom(x, n) { return Number(x).toFixed(n == null ? 3 : n).replace('.', ','); }

async function loadAdmDash() {
  var r = await api('dashboard.php');
  AD = r.ok ? r : null;
}

async function loadUser() {
  var r = await api('users.php');
  if (r.ok) UL = r.data.map(function (u) { return [u.nama, u.login_id, ROLEK[u.role], u.aktif ? 1 : 0, +u.id]; });
}

async function loadPer() {
  var r = await api('periode.php');
  if (r.ok) {
    PL = r.data.map(function (p) { return [p.nama, p.tgl_buka, p.tgl_tutup, +p.kuota, p.aktif ? 1 : 0, +p.id]; });
    perLewat = !PL.some(function (x) { return x[4]; });
  }
}

async function loadLatih() {
  var r = await api('data_latih.php');
  if (r.ok) {
    DL = r.data.map(function (x) { return [x.ipk, x.penghasilan, x.tanggungan, x.daya, x.kelas, x.keterangan]; });
    DLID = r.data.map(function (x) { return +x.id; });
  }
}

PEMUAT.adm_dash = loadAdmDash;
PEMUAT.adm_user = loadUser;
PEMUAT.adm_periode = loadPer;
PEMUAT.adm_latih = loadLatih;

V.adm_dash = function () {
  var d = (AD && AD.data) || {}, ph = d.per_hari || [];
  var mx = Math.max.apply(null, ph.map(function (x) { return x.n; }).concat([1]));   
  var total = (d.layak || 0) + (d.tidak_layak || 0), pc = total ? Math.round(d.layak / total * 100) : 0;
  var batang = ph.map(function (x) {
    var p = x.tanggal.split('-');
    return '<div style="flex:1;text-align:center;font-size:11px">' + x.n + '<div style="height:' + Math.round(x.n / mx * 100) + 'px;min-height:2px;background:var(--g);border-radius:4px 4px 0 0"></div>' + (+p[2]) + ' ' + MON[+p[1] - 1] + '</div>';
  }).join('');
  return head('Halo, ' + esc(nm), 'Dashboard') + '<div class="grid"><div class="card stat"><b>' + (d.pengguna || 0) + '</b><span>Pengguna</span></div><div class="card stat"><b>' + (d.pendaftar || 0) + '</b><span>Pendaftar</span></div><div class="card stat"><b>' + (d.data_latih || 0) + '</b><span>Data latih</span></div><div class="card stat"><b>' + (d.model ? d.model.akurasi + '%' : '—') + '</b><span>Akurasi model</span></div></div>' +
    '<div class="two2" style="margin-top:16px"><div class="card" style="margin:0"><h3 style="font-size:16px">Pendaftar 7 hari terakhir</h3><div style="display:flex;align-items:flex-end;gap:8px;height:140px;margin-top:10px">' + batang + '</div></div>' +
    '<div class="card" style="margin:0"><h3 style="font-size:16px">Layak vs Tidak Layak</h3><div style="display:flex;align-items:center;gap:16px;margin-top:10px"><div style="width:110px;height:110px;border-radius:50%;background:' +
    (total ? 'conic-gradient(var(--ok) 0 ' + pc + '%,var(--no) 0)' : '#E5E7EB') + '"></div><div>' + bd('ok', 'Layak ' + (d.layak || 0)) + '<br><br>' + bd('no', 'Tidak layak ' + (d.tidak_layak || 0)) + (total ? '' : '<br><small>Belum ada hasil klasifikasi.</small>') + '</div></div></div></div>';
};

async function saveU() {
  var n = $('un').value.trim(), e = $('ue').value.trim().toLowerCase(), p = $('up').value;
  var r = await api('users.php', { method: 'POST', body: { nama: n, login: e, role: ROLEKODE[$('ur').value], password: p, aktif: $('ua').checked } });
  if (!r.ok) { $('uerr').textContent = r.pesan; $('uerr').style.display = 'block'; return; }   
  closeU();
  toast(r.pesan);
  if (page == 'user') go('user');
}

async function saveEU() {
  var r = await api('users.php?id=' + UL[ei][4], { method: 'PUT', body: {
    nama: $('eu1').value.trim(), login: $('eu2').value.trim().toLowerCase(), role: ROLEKODE[$('eu3').value],
    password: $('eu5').value, aktif: $('eu4').value == 'Aktif' } });
  if (!r.ok) return fe(r.pesan);
  toast(r.pesan);
  go('user');
}

async function tgP(i) {
  var r = await api('periode.php?id=' + PL[i][5] + '&aksi=toggle', { method: 'PUT' });
  if (!r.ok) return toast(r.pesan);
  go('periode');
}

async function saveNP() {
  var r = await api('periode.php', { method: 'POST', body: { nama: $('np1').value.trim(), tgl_buka: $('np2').value, tgl_tutup: $('np3').value, kuota: parseInt($('np4').value, 10) } });
  if (!r.ok) return showE(r.pesan);
  closeM();
  toast(r.pesan);
  if (page == 'periode') go('periode');
}

async function saveEP() {
  var r = await api('periode.php?id=' + PL[ei][5], { method: 'PUT', body: {
    nama: $('ep1').value.trim(), tgl_buka: $('ep2').value, tgl_tutup: $('ep3').value, kuota: parseInt($('ep4').value, 10), aktif: $('ep5').checked } });
  if (!r.ok) return fe(r.pesan);
  toast(r.pesan);
  go('periode');
}

function bodyLatih(r) { return { ipk: r[0], penghasilan: r[1], tanggungan: r[2], daya: r[3], kelas: r[4], keterangan: r[5] }; }

async function saveDL() {
  var r = await api('data_latih.php', { method: 'POST', body: bodyLatih(['d1', 'd2', 'd3', 'd4', 'd5', 'd6'].map(function (i) { return $(i).value; })) });
  if (!r.ok) return showE(r.pesan);
  closeM();
  toast(r.pesan);
  if (page == 'latih') go('latih');
}

async function saveEL() {
  var r = await api('data_latih.php?id=' + DLID[ei], { method: 'PUT', body: bodyLatih([0, 1, 2, 3, 4, 5].map(function (i) { return $('el' + i).value; })) });
  if (!r.ok) return fe(r.pesan);
  toast(r.pesan);
  go('latih');
}

async function doImp() {
  if (!IMPV.length) return;
  var q = function (s) { s = String(s); return /[",]/.test(s) ? '"' + s.split('"').join('""') + '"' : s; };  
  var csv = 'ipk,penghasilan,tanggungan,daya,kelas,keterangan' + NL + IMPV.map(function (r) { return r.map(q).join(','); }).join(NL);
  var data = new FormData();
  data.append('berkas', new Blob([csv], { type: 'text/csv' }), 'impor.csv');
  var r = await api('data_latih.php?aksi=impor', { method: 'POST', body: data });
  closeM();
  if (!r.ok) return toast(r.pesan);
  toast(r.berhasil + ' data latih diimpor' + (r.gagal ? ', ' + r.gagal + ' ditolak server' : ''));
  if (page == 'latih') go('latih');
}

async function doRm(k, i) {
  var url = { user: 'users.php?id=' + (UL[i] && UL[i][4]), periode: 'periode.php?id=' + (PL[i] && PL[i][5]), latih: 'data_latih.php?id=' + DLID[i] }[k];
  var r = await api(url, { method: 'DELETE' });
  closeM();
  if (!r.ok) return toast(r.pesan);   
  toast('Data dihapus');
  go(k);
}

function pohonTeks(n, pre) {
  var out = '', ks = Object.keys(n.anak);
  ks.forEach(function (k, i) {
    var last = i == ks.length - 1, c = n.anak[k], cab = pre + (last ? '└─ ' : '├─ ');
    if (c.daun) out += cab + k + ' ─ ' + c.kelas.toUpperCase() + ' (' + c.n + ')' + NL;
    else out += cab + k + ' ── ' + NAMA_ATR[c.atribut] + '?' + NL + pohonTeks(c, pre + (last ? '   ' : '│  '));
  });
  return out;
}

V.adm_model = function () {
  var m = MD, info = m ? 'Terakhir dilatih: ' + tgl(m.dilatih_pada) + ' · Akurasi ' + m.akurasi + '%' : 'Belum pernah dilatih';
  var atas = head('Model Decision Tree C4.5', 'Model C4.5') + '<div class="bar"><button class="p" onclick="trainM(this)">▶ Latih model</button><span class="badge b-ver" id="mb">' + info + '</span></div>';
  if (!m) return atas + '<div class="card"><p>Model belum dilatih. Klik <b>Latih model</b> untuk menghitung entropy, gain ratio, pohon keputusan, dan aturan dari data latih di database.</p></div>';

  var pc = m.perhitungan, akar = m.pohon && !m.pohon.daun ? m.pohon.atribut : '';
  var hitung = '<p>Entropy total = ' + kom(pc.entropy_total) + ' (dari ' + pc.jumlah_data + ' data latih)</p>' + tbl(['Atribut', 'Gain', 'Split info', 'Gain ratio'],
    pc.atribut_akar.map(function (a) {
      var t = NAMA_ATR[a.atribut] + (a.atribut == akar ? ' ★ akar' : ''), b = a.atribut == akar;
      return tr([b ? '<b>' + t + '</b>' : t, kom(a.gain, 4), kom(a.split_info, 4), b ? '<b>' + kom(a.gain_ratio, 4) + '</b>' : kom(a.gain_ratio, 4)]);
    }));
  var pohon = m.pohon.daun ? m.pohon.kelas.toUpperCase() + NL : NAMA_ATR[m.pohon.atribut] + '?' + NL + pohonTeks(m.pohon, '');
  var aturan = m.aturan.length ? tbl(['No', 'Aturan', 'Kelas', 'Jumlah data'], m.aturan.map(function (a, i) {
    var jika = a.jika.length ? a.jika.map(function (s) { var p = s.split(' = '); return NAMA_ATR[p[0]] + ' = ' + esc(p[1]); }).join(' DAN ') : 'Semua data';
    return tr([i + 1, 'JIKA ' + jika + ' MAKA', bd(a.maka == 'Layak' ? 'ok' : 'no', esc(a.maka).toUpperCase()), a.n]);
  })) : '<p>Belum ada aturan.</p>';
  return atas + '<div class="card"><div class="tabs" id="tb"><button class="on" onclick="tab(0)">Perhitungan</button><button onclick="tab(1)">Pohon keputusan</button><button onclick="tab(2)">Rule</button></div>' +
    '<div class="tc">' + hitung + '<p><small>Angka dihitung dari seluruh data latih saat model dilatih. Akurasi diuji dengan 20% data (setiap data ke-5) yang tidak dipakai untuk melatih pohon pengujinya.</small></p></div>' +
    '<div class="tc" style="display:none"><div class="tree">' + esc(pohon) + '</div></div>' +
    '<div class="tc" style="display:none">' + aturan + '</div></div>';
};

async function trainM(b) {
  b.disabled = true;
  b.textContent = '⏳ Melatih model…';
  var r = await api('model.php', { method: 'POST' });
  if (!r.ok) { b.disabled = false; b.textContent = '▶ Latih model'; return toast(r.pesan); }
  toast('Model selesai dilatih dari ' + r.jumlah_data + ' data');
  go('model');
}
