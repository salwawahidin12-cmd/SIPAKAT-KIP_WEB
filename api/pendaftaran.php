<?php
// ==================================================================
// /api/pendaftaran.php : pendaftaran KIP-K oleh MAHASISWA.
//   GET                 -> pendaftaran saya pada periode aktif (+ daftar berkas) atau null
//   PUT                 -> simpan draf / perbaikan {nama, nim, semester, no_hp, alamat, ipk, penghasilan, tanggungan, daya}
//   POST ?aksi=kirim    -> kirim pendaftaran (semua data + 4 berkas harus lengkap)
// Aturan bisnis: hanya saat periode aktif dan hari ini di antara tanggal buka-tutup;
// data hanya boleh diubah saat status draft atau ret (dikembalikan petugas).
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
require __DIR__ . '/../includes/identitas.php';
izinkan('GET', 'PUT', 'POST');
$u = penjaga('mhs');

// Periode aktif (null kalau tidak ada). 'terbuka' = hari ini masih dalam rentang tanggalnya.
$per = q('SELECT id, nama, tgl_buka, tgl_tutup, kuota FROM periode WHERE aktif = 1 LIMIT 1')->fetch();
$hari = date('Y-m-d');
$terbuka = $per && $hari >= $per['tgl_buka'] && $hari <= $per['tgl_tutup'];

$mhs = q('SELECT nim, program_studi FROM mahasiswa WHERE user_id = ?', [$u['id']])->fetch();
if (!$mhs) gagal('Profil mahasiswa tidak ditemukan.', 404);

$daftar = $per ? q('SELECT * FROM pendaftaran WHERE user_id = ? AND periode_id = ?', [$u['id'], $per['id']])->fetch() : false;

// ---------- READ ----------
if (metode() === 'GET') {
    $berkas = [];
    if ($daftar) $berkas = q('SELECT jenis, nama_asli, ukuran FROM berkas WHERE pendaftaran_id = ?', [$daftar['id']])->fetchAll();
    // Rekomendasi sistem dan keputusan internal bukan untuk mahasiswa; keputusan akhir tampil setelah ditetapkan.
    if ($daftar) unset($daftar['rekomendasi'], $daftar['verifikator_id']);
    keluar(['ok' => true, 'periode' => $per ? $per + ['terbuka' => $terbuka] : null,
            'pendaftaran' => $daftar ?: null, 'berkas' => $berkas,
            'profil' => ['nama' => $u['nama'], 'nim' => $mhs['nim'], 'program_studi' => $mhs['program_studi']]]);
}

// Dari sini ke bawah mengubah data: periode harus terbuka dan status harus mengizinkan.
if (!$per)      gagal('Belum ada periode pendaftaran yang aktif.', 422);
if (!$terbuka)  gagal('Periode pendaftaran sedang ditutup.', 422);
if ($daftar && !in_array($daftar['status'], ['draft', 'ret'], true)) gagal('Pendaftaran sudah dikirim dan tidak dapat diubah.', 422);

$in = masukan();
$f = [
    'nama' => teks($in, 'nama'), 'nim' => teks($in, 'nim'), 'semester' => teks($in, 'semester'), 'no_hp' => teks($in, 'no_hp'),
    'alamat' => teks($in, 'alamat'), 'ipk' => teks($in, 'ipk'), 'penghasilan' => teks($in, 'penghasilan'),
    'tanggungan' => teks($in, 'tanggungan'), 'daya' => teks($in, 'daya'),
];

// Simpan data ke tabel (insert kalau belum ada, update kalau sudah). Mengembalikan id pendaftaran.
function simpan_data(array $u, array $mhs, array $per, $daftar, array $f): int
{
    $hp = preg_replace('/[-\s]/', '', $f['no_hp']);
    $nilai = [
        $f['nama'] !== '' ? $f['nama'] : $u['nama'],
        $f['semester'] !== '' ? (int) $f['semester'] : null,
        $hp !== '' ? $hp : null,
        $f['alamat'] !== '' ? $f['alamat'] : null,
        is_numeric($f['ipk']) ? round((float) $f['ipk'], 2) : null,
        peta_penghasilan($f['penghasilan']),
        preg_match('/^\d{1,2}$/', $f['tanggungan']) ? (int) $f['tanggungan'] : null,
        peta_daya($f['daya']),
    ];
    if ($daftar) {
        q('UPDATE pendaftaran SET nama = ?, semester = ?, no_hp = ?, alamat = ?, ipk = ?, penghasilan = ?, tanggungan = ?, daya = ? WHERE id = ?',
          array_merge($nilai, [$daftar['id']]));
        return (int) $daftar['id'];
    }
    q('INSERT INTO pendaftaran (user_id, periode_id, nim, program_studi, nama, semester, no_hp, alamat, ipk, penghasilan, tanggungan, daya)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      array_merge([$u['id'], $per['id'], $mhs['nim'], $mhs['program_studi']], $nilai));
    return (int) db()->lastInsertId();
}

if (metode() === 'PUT') {
    // Draf boleh belum lengkap, tetapi nilai yang DIISI harus valid.
    if ($f['no_hp'] !== '' && !preg_match('/^08\d{8,12}$/', preg_replace('/[-\s]/', '', $f['no_hp']))) gagal('No. HP tidak valid (contoh 08123456789).', 422);
    if ($f['semester'] !== '' && filter_var($f['semester'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 14]]) === false) gagal('Semester harus 1–14.', 422);
    if ($f['ipk'] !== '' && (!is_numeric($f['ipk']) || (float) $f['ipk'] < 0 || (float) $f['ipk'] > 4)) gagal('IPK harus antara 0 dan 4.', 422);
    if ($f['penghasilan'] !== '' && peta_penghasilan($f['penghasilan']) === null) gagal('Penghasilan tidak valid.', 422);
    if ($f['tanggungan'] !== '' && !preg_match('/^\d{1,2}$/', $f['tanggungan'])) gagal('Jumlah tanggungan harus angka 0 atau lebih.', 422);
    if ($f['daya'] !== '' && peta_daya($f['daya']) === null) gagal('Daya listrik tidak valid.', 422);
    // NIM boleh diisi sendiri: kalau berbeda dari yang tersimpan, akunnya ikut diperbarui.
    if ($f['nim'] !== '' && $f['nim'] !== $mhs['nim']) {
        if ($m = ubah_identitas($u, $u['nama'], $f['nim'])) gagal($m, 422);
        $mhs['nim'] = $f['nim'];
    }
    $id = simpan_data($u, $mhs, $per, $daftar, $f);
    keluar(['ok' => true, 'id' => $id, 'pesan' => 'Draf tersimpan']);
}

// ---------- KIRIM ----------
if (($_GET['aksi'] ?? '') !== 'kirim') gagal('Aksi tidak dikenal.', 400);
if ($m = v_pendaftaran(1, $f) ?: v_pendaftaran(2, $f)) gagal($m, 422);
if ($f['nim'] !== '' && $f['nim'] !== $mhs['nim']) {
    if ($m = ubah_identitas($u, $u['nama'], $f['nim'])) gagal($m, 422);
    $mhs['nim'] = $f['nim'];
}

$pdo = db();
$pdo->beginTransaction();
$id = simpan_data($u, $mhs, $per, $daftar, $f);
$ada = q('SELECT jenis FROM berkas WHERE pendaftaran_id = ?', [$id])->fetchAll(PDO::FETCH_COLUMN);
$kurang = array_diff(['ktp', 'slip', 'lis', 'trn'], $ada);
if ($kurang) {
    $pdo->rollBack();
    gagal(count($kurang) . ' berkas belum diunggah.', 422, ['berkas_kurang' => array_values($kurang)]);
}
q("UPDATE pendaftaran SET status = 'wait', tgl_kirim = ?, catatan_petugas = NULL WHERE id = ?", [sekarang(), $id]);
// Beri tahu semua petugas aktif bahwa ada berkas baru.
foreach (q("SELECT id FROM users WHERE role = 'ptg' AND aktif = 1")->fetchAll(PDO::FETCH_COLUMN) as $pid) {
    notifikasi((int) $pid, 'Berkas baru menunggu verifikasi: ' . $u['nama'], 'verif');
}
$pdo->commit();
keluar(['ok' => true, 'pesan' => 'Pendaftaran terkirim']);
