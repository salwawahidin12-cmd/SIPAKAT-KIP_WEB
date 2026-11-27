<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
izinkan('GET', 'POST', 'PUT', 'DELETE');
penjaga('adm');

const KOLOM_LATIH = ['ipk', 'penghasilan', 'tanggungan', 'daya', 'kelas', 'keterangan'];

// Ambil 6 kolom dari input, semuanya jadi teks bersih.
function baris_latih(array $in): array
{
    $r = [];
    foreach (KOLOM_LATIH as $k) $r[$k] = teks($in, $k);
    return $r;
}

// ---------- READ ----------
if (metode() === 'GET') {
    $sql = 'SELECT id, ipk, penghasilan, tanggungan, daya, kelas, keterangan FROM data_latih';
    $par = [];
    $kata = teks($_GET, 'q');
    if ($kata !== '') {
        $like = '%' . addcslashes($kata, '%_\\') . '%';
        $sql .= ' WHERE CONCAT_WS(" ", ipk, penghasilan, tanggungan, daya, kelas, keterangan) LIKE ?';
        $par[] = $like;
    }
    $data = q($sql . ' ORDER BY id', $par)->fetchAll();
    keluar(['ok' => true, 'total' => count($data), 'data' => $data]);
}

// ---------- IMPOR CSV ----------
if (metode() === 'POST' && ($_GET['aksi'] ?? '') === 'impor') {
    $f = $_FILES['berkas'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) gagal('Berkas CSV belum dipilih atau gagal diunggah.', 422);
    if ($f['size'] > 1024 * 1024) gagal('Ukuran CSV maksimal 1 MB.', 422);
    if (strtolower(pathinfo($f['name'], PATHINFO_EXTENSION)) !== 'csv') gagal('Berkas harus berformat .csv.', 422);

    $h = fopen($f['tmp_name'], 'r');
    $judul = fgetcsv($h);   // baris pertama = judul kolom, dilewati
    $valid = [];
    $galat = [];
    $no = 1;
    while (($kol = fgetcsv($h)) !== false) {
        $no++;
        if (count($kol) === 1 && trim((string) $kol[0]) === '') continue;   // baris kosong
        // Keterangan boleh mengandung koma tanpa tanda kutip: kolom sisanya digabung kembali.
        if (count($kol) > 6) $kol = array_merge(array_slice($kol, 0, 5), [implode(',', array_slice($kol, 5))]);
        $kol = array_pad(array_map('trim', $kol), 6, '');
        $r = array_combine(KOLOM_LATIH, $kol);
        if ($m = v_data_latih($r)) $galat[] = "Baris $no: $m"; else $valid[] = $r;
    }
    fclose($h);

    // Baris valid disimpan sekaligus dalam satu transaksi (cepat dan semua-atau-tidak-sama-sekali).
    if ($valid) {
        $pdo = db();
        $pdo->beginTransaction();
        $st = $pdo->prepare('INSERT INTO data_latih (ipk, penghasilan, tanggungan, daya, kelas, keterangan) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($valid as $r) $st->execute(array_values($r));
        $pdo->commit();
    }
    keluar(['ok' => true, 'berhasil' => count($valid), 'gagal' => count($galat), 'galat' => array_slice($galat, 0, 50)]);
}

// ---------- CREATE ----------
$r = baris_latih(masukan());
if (metode() === 'POST') {
    if ($m = v_data_latih($r)) gagal($m, 422);
    q('INSERT INTO data_latih (ipk, penghasilan, tanggungan, daya, kelas, keterangan) VALUES (?, ?, ?, ?, ?, ?)', array_values($r));
    keluar(['ok' => true, 'id' => (int) db()->lastInsertId(), 'pesan' => 'Data latih ditambahkan'], 201);
}

// ---------- UPDATE / DELETE ----------
$id = id_query();
if (!$id) gagal('Parameter id wajib.', 422);
if (!q('SELECT 1 FROM data_latih WHERE id = ?', [$id])->fetchColumn()) gagal('Data latih tidak ditemukan.', 404);

if (metode() === 'PUT') {
    if ($m = v_data_latih($r)) gagal($m, 422);
    q('UPDATE data_latih SET ipk = ?, penghasilan = ?, tanggungan = ?, daya = ?, kelas = ?, keterangan = ? WHERE id = ?', array_merge(array_values($r), [$id]));
    keluar(['ok' => true, 'pesan' => 'Data latih diperbarui']);
}
q('DELETE FROM data_latih WHERE id = ?', [$id]);
keluar(['ok' => true, 'pesan' => 'Data dihapus']);
