<?php
// ==================================================================
// /api/notifikasi.php : notifikasi MILIK pengguna yang login (semua role).
//   GET ?filter=semua|belum|dibaca  -> daftar
//   PUT ?id=5   -> tandai satu notifikasi dibaca
//   PUT ?semua=1 -> tandai semua dibaca
// Setiap query memakai user_id dari SESI, jadi pengguna tidak bisa membaca atau
// mengubah notifikasi milik orang lain meskipun mengganti ?id=.
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
izinkan('GET', 'PUT');
$u = wajib_login();
if (metode() !== 'GET') wajib_csrf();

if (metode() === 'GET') {
    $sql = 'SELECT id, pesan, tautan, dibaca, created_at FROM notifikasi WHERE user_id = ?';
    $f = $_GET['filter'] ?? 'semua';
    if ($f === 'belum')  $sql .= ' AND dibaca = 0';
    if ($f === 'dibaca') $sql .= ' AND dibaca = 1';
    $data = q($sql . ' ORDER BY id DESC LIMIT 100', [$u['id']])->fetchAll();
    $belum = (int) q('SELECT COUNT(*) FROM notifikasi WHERE user_id = ? AND dibaca = 0', [$u['id']])->fetchColumn();
    keluar(['ok' => true, 'belum_dibaca' => $belum, 'data' => $data]);
}

if (!empty($_GET['semua'])) {
    q('UPDATE notifikasi SET dibaca = 1 WHERE user_id = ?', [$u['id']]);
    keluar(['ok' => true]);
}
$id = id_query();
if (!$id) gagal('Parameter id wajib.', 422);
$n = q('UPDATE notifikasi SET dibaca = 1 WHERE id = ? AND user_id = ?', [$id, $u['id']])->rowCount();
keluar(['ok' => true, 'diubah' => $n]);
