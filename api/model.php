<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
require __DIR__ . '/../includes/c45.php';
izinkan('GET', 'POST');
$admin = penjaga('adm');

if (metode() === 'GET') {
    $m = q('SELECT id, dilatih_pada, jumlah_data, akurasi, pohon, aturan, perhitungan FROM model_c45 ORDER BY id DESC LIMIT 1')->fetch();
    if (!$m) keluar(['ok' => true, 'model' => null]);
    foreach (['pohon', 'aturan', 'perhitungan'] as $k) $m[$k] = json_decode($m[$k], true);
    keluar(['ok' => true, 'model' => $m]);
}

$data = q('SELECT ipk, penghasilan, tanggungan, daya, kelas FROM data_latih ORDER BY id')->fetchAll();
try {
    $hasil = c45_latih($data);
} catch (InvalidArgumentException $e) {
    gagal($e->getMessage(), 422);   // misalnya data latih kurang dari 10 baris
}
$j = JSON_UNESCAPED_UNICODE;
q('INSERT INTO model_c45 (dilatih_pada, dilatih_oleh, jumlah_data, akurasi, pohon, aturan, perhitungan) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [sekarang(), $admin['id'], count($data), $hasil['akurasi'],
   json_encode($hasil['pohon'], $j), json_encode($hasil['aturan'], $j), json_encode($hasil['perhitungan'], $j)]);

keluar(['ok' => true, 'pesan' => 'Model selesai dilatih', 'dilatih_pada' => sekarang(),
        'akurasi' => $hasil['akurasi'], 'jumlah_data' => count($data),
        'aturan' => $hasil['aturan'], 'perhitungan' => $hasil['perhitungan']]);
