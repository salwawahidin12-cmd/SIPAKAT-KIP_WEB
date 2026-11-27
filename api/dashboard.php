<?php
// ==================================================================
// GET /api/dashboard.php : angka ringkasan untuk dashboard sesuai role pengguna.
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
izinkan('GET');
$u = wajib_login();
$per = q('SELECT id, nama, tgl_buka, tgl_tutup, kuota FROM periode WHERE aktif = 1 LIMIT 1')->fetch();
$pid = $per['id'] ?? 0;

if ($u['role'] === 'adm') {
    // Jumlah pendaftar yang mengirim berkas tiap hari selama 7 hari terakhir (hari tanpa pendaftar tetap ditampilkan 0).
    $hari = [];
    for ($i = 6; $i >= 0; $i--) $hari[date('Y-m-d', strtotime("-$i day"))] = 0;
    $baris = q('SELECT DATE(tgl_kirim) AS t, COUNT(*) AS n FROM pendaftaran WHERE periode_id = ? AND tgl_kirim >= ? GROUP BY DATE(tgl_kirim)',
               [$pid, array_key_first($hari) . ' 00:00:00'])->fetchAll();
    foreach ($baris as $b) if (isset($hari[$b['t']])) $hari[$b['t']] = (int) $b['n'];
    $perHari = [];
    foreach ($hari as $t => $n) $perHari[] = ['tanggal' => $t, 'n' => $n];

    $akurasi = q('SELECT akurasi, dilatih_pada FROM model_c45 ORDER BY id DESC LIMIT 1')->fetch();
    keluar(['ok' => true, 'role' => 'adm', 'periode' => $per ?: null, 'data' => [
        'pengguna'  => (int) q('SELECT COUNT(*) FROM users')->fetchColumn(),
        'pendaftar' => (int) q("SELECT COUNT(*) FROM pendaftaran WHERE periode_id = ? AND status <> 'draft'", [$pid])->fetchColumn(),
        'data_latih' => (int) q('SELECT COUNT(*) FROM data_latih')->fetchColumn(),
        'model'     => $akurasi ?: null,
        'layak'     => (int) q("SELECT COUNT(*) FROM pendaftaran WHERE periode_id = ? AND rekomendasi = 'Layak'", [$pid])->fetchColumn(),
        'tidak_layak' => (int) q("SELECT COUNT(*) FROM pendaftaran WHERE periode_id = ? AND rekomendasi = 'Tidak Layak'", [$pid])->fetchColumn(),
        'per_hari'  => $perHari,
    ]]);
}
if ($u['role'] === 'ptg') {
    $r = q("SELECT SUM(status = 'wait') AS menunggu, SUM(status = 'ver') AS terverifikasi, SUM(status = 'ret') AS perbaikan,
                   SUM(status = 'ver' AND rekomendasi IS NULL) AS siap_klasifikasi, SUM(keputusan IS NOT NULL) AS diputuskan
            FROM pendaftaran WHERE periode_id = ?", [$pid])->fetch();
    keluar(['ok' => true, 'role' => 'ptg', 'periode' => $per ?: null, 'data' => array_map('intval', $r)]);
}
// Mahasiswa: status pendaftarannya sendiri.
$d = q('SELECT status, catatan_petugas, keputusan FROM pendaftaran WHERE user_id = ? AND periode_id = ?', [$u['id'], $pid])->fetch();
keluar(['ok' => true, 'role' => 'mhs', 'periode' => $per ?: null, 'data' => $d ?: ['status' => null]]);
