<?php
// ==================================================================
// /api/periode.php : CRUD periode pendaftaran.
//   GET                       -> daftar periode (semua pengguna login; mahasiswa perlu melihat periode aktif)
//   GET ?aktif=1              -> hanya periode aktif (beserta status terbuka/tertutup hari ini)
//   POST   {nama, tgl_buka, tgl_tutup, kuota}        -> Admin: buat
//   PUT    ?id= {nama, tgl_buka, tgl_tutup, kuota, aktif}  -> Admin: ubah (aktif=true menonaktifkan yang lain)
//   PUT    ?id=&aksi=toggle                          -> Admin: aktif <-> nonaktif
//   DELETE ?id=                                      -> Admin: hapus (ditolak kalau sudah ada pendaftar)
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
izinkan('GET', 'POST', 'PUT', 'DELETE');

// Mengaktifkan periode ke-$id dan menonaktifkan sisanya, dalam SATU transaksi.
function aktifkan_periode(int $id): void
{
    $pdo = db();
    $pdo->beginTransaction();
    q('UPDATE periode SET aktif = 0 WHERE aktif = 1');
    q('UPDATE periode SET aktif = 1 WHERE id = ?', [$id]);
    $pdo->commit();
}

if (metode() === 'GET') {
    wajib_login();
    $sql = 'SELECT id, nama, tgl_buka, tgl_tutup, kuota, aktif FROM periode';
    if (!empty($_GET['aktif'])) $sql .= ' WHERE aktif = 1';
    $data  = q($sql . ' ORDER BY tgl_buka DESC, id DESC')->fetchAll();
    $hari  = date('Y-m-d');
    foreach ($data as &$p) {
        $p['aktif']    = (bool) $p['aktif'];
        $p['terbuka']  = $p['aktif'] && $hari >= $p['tgl_buka'] && $hari <= $p['tgl_tutup'];   // sedang menerima pendaftaran?
    }
    keluar(['ok' => true, 'data' => $data]);
}

penjaga('adm');
$in    = masukan();
$nama  = teks($in, 'nama');
$buka  = teks($in, 'tgl_buka');
$tutup = teks($in, 'tgl_tutup');
$kuota = $in['kuota'] ?? '';

if (metode() === 'POST') {
    if ($m = v_periode($nama, $buka, $tutup, $kuota)) gagal($m, 422);
    q('INSERT INTO periode (nama, tgl_buka, tgl_tutup, kuota, aktif) VALUES (?, ?, ?, ?, 0)', [$nama, $buka, $tutup, (int) $kuota]);
    keluar(['ok' => true, 'id' => (int) db()->lastInsertId(), 'pesan' => 'Periode ditambahkan: ' . $nama], 201);
}

$id = id_query();
if (!$id) gagal('Parameter id wajib.', 422);
$p = q('SELECT * FROM periode WHERE id = ?', [$id])->fetch();
if (!$p) gagal('Periode tidak ditemukan.', 404);

if (metode() === 'PUT') {
    if (($_GET['aksi'] ?? '') === 'toggle') {
        if ((int) $p['aktif']) q('UPDATE periode SET aktif = 0 WHERE id = ?', [$id]);
        else aktifkan_periode($id);   // hanya satu periode boleh aktif
        keluar(['ok' => true, 'aktif' => !(int) $p['aktif']]);
    }
    if ($m = v_periode($nama, $buka, $tutup, $kuota, $id)) gagal($m, 422);
    // Aturan bisnis: kuota tidak boleh lebih kecil dari jumlah yang sudah diterima.
    $diterima = (int) q("SELECT COUNT(*) FROM pendaftaran WHERE periode_id = ? AND keputusan = 'Diterima'", [$id])->fetchColumn();
    if ((int) $kuota < $diterima) gagal("Kuota tidak boleh kurang dari jumlah yang sudah diterima ($diterima).", 422);

    q('UPDATE periode SET nama = ?, tgl_buka = ?, tgl_tutup = ?, kuota = ? WHERE id = ?', [$nama, $buka, $tutup, (int) $kuota, $id]);
    if (!empty($in['aktif'])) aktifkan_periode($id);
    elseif (array_key_exists('aktif', $in)) q('UPDATE periode SET aktif = 0 WHERE id = ?', [$id]);
    keluar(['ok' => true, 'pesan' => 'Periode diperbarui']);
}

// DELETE: foreign key RESTRICT menolak kalau periode sudah punya pendaftaran.
try {
    q('DELETE FROM periode WHERE id = ?', [$id]);
} catch (PDOException $e) {
    if (galat_terikat($e)) gagal('Periode sudah memiliki pendaftar dan tidak dapat dihapus.', 409);
    throw $e;
}
keluar(['ok' => true, 'pesan' => 'Data dihapus']);
