<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
require __DIR__ . '/../includes/c45.php';
izinkan('GET', 'POST', 'PUT');
$u = metode() === 'GET' ? penjaga('ptg', 'adm') : penjaga('ptg');

$per = q('SELECT id, nama, kuota FROM periode WHERE aktif = 1 LIMIT 1')->fetch();
if (!$per) gagal('Tidak ada periode aktif.', 422);

// Ringkasan "Kuota · Layak · Diterima" untuk lencana di halaman.
function ringkasan(array $per): array
{
    $r = q("SELECT SUM(rekomendasi = 'Layak') AS layak, SUM(keputusan = 'Diterima') AS diterima FROM pendaftaran WHERE periode_id = ? AND status = 'ver'", [$per['id']])->fetch();
    return ['kuota' => (int) $per['kuota'], 'layak' => (int) $r['layak'], 'diterima' => (int) $r['diterima']];
}

// ---------- READ + EKSPOR ----------
if (metode() === 'GET') {
    $data = q("SELECT id, nama, nim, ipk, penghasilan, tanggungan, daya, rekomendasi, keputusan
               FROM pendaftaran WHERE periode_id = ? AND status = 'ver' ORDER BY nama", [$per['id']])->fetchAll();

    if (($_GET['ekspor'] ?? '') === 'csv') {
        // Ekspor CSV. Sel yang diawali = + - @ diberi tanda petik agar tidak dijalankan sebagai rumus Excel (CSV injection).
        $aman = fn($s) => preg_match('/^[=+\-@]/', (string) $s) ? "'" . $s : (string) $s;
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="hasil-seleksi-' . preg_replace('/[^A-Za-z0-9_-]+/', '-', $per['nama']) . '.csv"');
        $o = fopen('php://output', 'w');
        fwrite($o, "\xEF\xBB\xBF");   // penanda UTF-8 agar Excel membaca huruf dengan benar
        fputcsv($o, ['No', 'Nama', 'NIM', 'Rekomendasi', 'Keputusan akhir']);
        foreach ($data as $i => $d) fputcsv($o, [$i + 1, $aman($d['nama']), $d['nim'], $d['rekomendasi'] ?? '-', $d['keputusan'] ?? '-']);
        fclose($o);
        exit;
    }
    keluar(['ok' => true, 'periode' => $per['nama'], 'ringkasan' => ringkasan($per), 'data' => $data]);
}

// ---------- POST: jalankan klasifikasi ----------
if (metode() === 'POST') {
    if (($_GET['aksi'] ?? '') !== 'jalankan') gagal('Aksi tidak dikenal.', 400);
    $model = q('SELECT pohon FROM model_c45 ORDER BY id DESC LIMIT 1')->fetchColumn();
    if (!$model) gagal('Model C4.5 belum dilatih. Minta Admin melatih model terlebih dahulu.', 422);
    $pohon = json_decode($model, true);

    $rows = q("SELECT id, ipk, penghasilan, tanggungan, daya FROM pendaftaran WHERE periode_id = ? AND status = 'ver' AND keputusan IS NULL", [$per['id']])->fetchAll();
    $pdo = db();
    $pdo->beginTransaction();
    $st = $pdo->prepare('UPDATE pendaftaran SET rekomendasi = ? WHERE id = ?');
    foreach ($rows as $r) {
        // Angka pendaftar diubah menjadi label dulu (aturan batas di config.php), baru ditebak pohon.
        $label = ['ipk' => kat_ipk((float) $r['ipk']), 'penghasilan' => $r['penghasilan'],
                  'tanggungan' => kat_tanggungan((int) $r['tanggungan']), 'daya' => $r['daya']];
        $st->execute([c45_prediksi($pohon, $label), $r['id']]);
    }
    $pdo->commit();
    keluar(['ok' => true, 'pesan' => 'Klasifikasi selesai: ' . count($rows) . ' pendaftar', 'jumlah' => count($rows), 'ringkasan' => ringkasan($per)]);
}

// ---------- PUT: keputusan akhir ----------
$id = id_query();
$keputusan = teks(masukan(), 'keputusan');
if (!$id) gagal('Parameter id wajib.', 422);
if (!in_array($keputusan, ['Diterima', 'Layak (kuota penuh)', 'Tidak Layak'], true)) gagal('Keputusan tidak valid.', 422);

$pdo = db();
$pdo->beginTransaction();
// FOR UPDATE mengunci baris periode supaya dua petugas tidak bisa sama-sama menerima di kuota terakhir.
$kuota = (int) q('SELECT kuota FROM periode WHERE id = ? FOR UPDATE', [$per['id']])->fetchColumn();
$d = q("SELECT * FROM pendaftaran WHERE id = ? AND periode_id = ? AND status = 'ver'", [$id, $per['id']])->fetch();
if (!$d)                      { $pdo->rollBack(); gagal('Pendaftar tidak ditemukan atau belum terverifikasi.', 404); }
if ($d['rekomendasi'] === null) { $pdo->rollBack(); gagal('Jalankan klasifikasi terlebih dahulu.', 422); }
if ($keputusan !== 'Tidak Layak' && $d['rekomendasi'] !== 'Layak') { $pdo->rollBack(); gagal('Hanya pendaftar yang direkomendasikan Layak yang dapat diterima.', 422); }
if ($keputusan === 'Diterima') {
    $sudah = (int) q("SELECT COUNT(*) FROM pendaftaran WHERE periode_id = ? AND keputusan = 'Diterima' AND id <> ?", [$per['id'], $id])->fetchColumn();
    if ($sudah >= $kuota) { $pdo->rollBack(); gagal("Kuota $kuota sudah penuh. Pilih \"Layak (kuota penuh)\".", 422); }
}
q('UPDATE pendaftaran SET keputusan = ? WHERE id = ?', [$keputusan, $id]);
notifikasi((int) $d['user_id'], 'Hasil seleksi tersedia', 'status');
$pdo->commit();
keluar(['ok' => true, 'pesan' => 'Keputusan disimpan: ' . $d['nama'] . ' → ' . $keputusan, 'ringkasan' => ringkasan($per)]);
