<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
izinkan('GET', 'PUT');
$u = metode() === 'GET' ? penjaga('ptg', 'adm') : penjaga('ptg');   // yang boleh MENGUBAH hanya petugas

$per = q('SELECT id FROM periode WHERE aktif = 1 LIMIT 1')->fetch();
$periodeId = (int) ($_GET['periode'] ?? ($per['id'] ?? 0));

if (metode() === 'GET') {
    $id = id_query();
    if ($id) {
        $d = q('SELECT * FROM pendaftaran WHERE id = ? AND status <> ?', [$id, 'draft'])->fetch();
        if (!$d) gagal('Pendaftar tidak ditemukan.', 404);
        $d['berkas'] = q('SELECT jenis, nama_asli, ukuran FROM berkas WHERE pendaftaran_id = ?', [$id])->fetchAll();
        keluar(['ok' => true, 'data' => $d]);
    }
    $sql = "SELECT id, nama, nim, tgl_kirim, status, catatan_petugas,
                   ipk, penghasilan, tanggungan, daya
            FROM pendaftaran WHERE periode_id = ? AND status <> 'draft'";
    $par = [$periodeId];
    $st = teks($_GET, 'status');
    if ($st !== '') {
        if (!in_array($st, ['wait', 'ver', 'ret'], true)) gagal('Status tidak dikenal.', 422);
        $sql .= ' AND status = ?';
        $par[] = $st;
    }
    keluar(['ok' => true, 'data' => q($sql . ' ORDER BY tgl_kirim', $par)->fetchAll()]);
}

// ---------- PUT: sahkan / kembalikan ----------
$id = id_query();
if (!$id) gagal('Parameter id wajib.', 422);
$in = masukan();
$status = teks($in, 'status');
$catatan = teks($in, 'catatan');
if (!in_array($status, ['ver', 'ret'], true)) gagal('Status harus ver (sahkan) atau ret (kembalikan).', 422);
if ($status === 'ret' && $catatan === '') gagal('Catatan wajib diisi jika berkas dikembalikan.', 422);
if (mb_strlen($catatan) > 1000) gagal('Catatan maksimal 1000 karakter.', 422);

$d = q('SELECT * FROM pendaftaran WHERE id = ?', [$id])->fetch();
if (!$d) gagal('Pendaftar tidak ditemukan.', 404);
if ($d['status'] === 'draft') gagal('Pendaftar belum mengirim berkas.', 422);
// Aturan bisnis: pendaftar yang sudah punya keputusan akhir tidak boleh diverifikasi ulang.
if ($d['keputusan'] !== null) gagal('Pendaftar sudah memiliki keputusan akhir.', 422);

q('UPDATE pendaftaran SET status = ?, catatan_petugas = ?, verifikator_id = ?, rekomendasi = NULL WHERE id = ?',
  [$status, $catatan !== '' ? $catatan : null, $u['id'], $id]);
notifikasi((int) $d['user_id'],
           $status === 'ver' ? 'Berkas Anda telah diverifikasi' : 'Berkas perlu diperbaiki: ' . mb_substr($catatan, 0, 150),
           'status');
keluar(['ok' => true, 'pesan' => $status === 'ver' ? 'Berkas disahkan: Terverifikasi' : 'Dikembalikan: Perlu perbaikan']);
