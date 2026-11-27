<?php

require __DIR__ . '/../includes/bootstrap.php';
izinkan('GET', 'POST');

const JENIS_BERKAS = ['ktp', 'slip', 'lis', 'trn'];
const MIME_BOLEH   = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg'];

// ---------- UNDUH ----------
if (metode() === 'GET') {
    $u = wajib_login();
    $pid   = filter_var($_GET['pendaftaran'] ?? null, FILTER_VALIDATE_INT);
    $jenis = $_GET['jenis'] ?? '';
    if (!$pid || !in_array($jenis, JENIS_BERKAS, true)) gagal('Parameter tidak valid.', 422);

    $b = q('SELECT b.*, p.user_id FROM berkas b JOIN pendaftaran p ON p.id = b.pendaftaran_id
            WHERE b.pendaftaran_id = ? AND b.jenis = ?', [$pid, $jenis])->fetch();
    if (!$b) gagal('Berkas tidak ditemukan.', 404);
    // Mahasiswa hanya boleh membuka berkas MILIKNYA sendiri.
    if ($u['role'] === 'mhs' && (int) $b['user_id'] !== (int) $u['id']) gagal('Anda tidak berhak mengakses berkas ini.', 403);

    $path = rtrim((string) cfg('folder_unggah'), '/\\') . DIRECTORY_SEPARATOR . $b['nama_file'];
    if (!is_file($path)) gagal('Berkas hilang dari server.', 404);
    header('Content-Type: ' . $b['mime']);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="' . $jenis . '.' . MIME_BOLEH[$b['mime']] . '"');
    readfile($path);
    exit;
}

// ---------- UNGGAH ----------
$u = penjaga('mhs');
$jenis = $_POST['jenis'] ?? '';
if (!in_array($jenis, JENIS_BERKAS, true)) gagal('Jenis berkas tidak dikenal.', 422);

$per = q('SELECT id, tgl_buka, tgl_tutup FROM periode WHERE aktif = 1 LIMIT 1')->fetch();
$hari = date('Y-m-d');
if (!$per || $hari < $per['tgl_buka'] || $hari > $per['tgl_tutup']) gagal('Periode pendaftaran sedang ditutup.', 422);

$daftar = q('SELECT id, status FROM pendaftaran WHERE user_id = ? AND periode_id = ?', [$u['id'], $per['id']])->fetch();
if (!$daftar) gagal('Simpan data pendaftaran (draf) terlebih dahulu.', 422);
if (!in_array($daftar['status'], ['draft', 'ret'], true)) gagal('Pendaftaran sudah dikirim dan tidak dapat diubah.', 422);

$f = $_FILES['berkas'] ?? null;
if (!$f || $f['error'] !== UPLOAD_ERR_OK) gagal('Berkas belum dipilih atau gagal diunggah.', 422);
if ($f['size'] > (int) cfg('unggah_maks')) gagal('Ukuran berkas maksimal 2 MB.', 422);
if (!is_uploaded_file($f['tmp_name'])) gagal('Berkas tidak valid.', 422);

$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['pdf', 'jpg', 'jpeg'], true)) gagal('Format berkas harus PDF atau JPG.', 422);
// Periksa ISI berkas, bukan hanya namanya: file .php yang diganti nama menjadi .pdf akan ditolak.
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
if (!isset(MIME_BOLEH[$mime])) gagal('Isi berkas bukan PDF atau JPG yang valid.', 422);

$folder = rtrim((string) cfg('folder_unggah'), '/\\');
if (!is_dir($folder) && !mkdir($folder, 0755, true)) gagal('Folder penyimpanan tidak dapat dibuat.', 500);
$namaFile = bin2hex(random_bytes(16)) . '.' . MIME_BOLEH[$mime];   // nama acak, bukan nama dari pengguna
if (!move_uploaded_file($f['tmp_name'], $folder . DIRECTORY_SEPARATOR . $namaFile)) gagal('Berkas gagal disimpan.', 500);

// Hapus berkas lama jenis yang sama (kalau ada), lalu catat yang baru.
$lama = q('SELECT nama_file FROM berkas WHERE pendaftaran_id = ? AND jenis = ?', [$daftar['id'], $jenis])->fetchColumn();
q('INSERT INTO berkas (pendaftaran_id, jenis, nama_asli, nama_file, mime, ukuran) VALUES (?, ?, ?, ?, ?, ?)
   ON DUPLICATE KEY UPDATE nama_asli = VALUES(nama_asli), nama_file = VALUES(nama_file), mime = VALUES(mime), ukuran = VALUES(ukuran), created_at = ?',
  [$daftar['id'], $jenis, mb_substr(basename($f['name']), 0, 150), $namaFile, $mime, (int) $f['size'], sekarang()]);
if ($lama && is_file($folder . DIRECTORY_SEPARATOR . $lama)) @unlink($folder . DIRECTORY_SEPARATOR . $lama);

keluar(['ok' => true, 'pesan' => 'Berkas diunggah', 'jenis' => $jenis, 'nama' => basename($f['name'])], 201);
