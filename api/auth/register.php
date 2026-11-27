<?php
// ==================================================================
// POST /api/auth/register.php : registrasi akun MAHASISWA (admin/petugas dibuat admin).
// body: {nama, nim, prodi, email, password, konfirmasi}
// Role selalu 'mhs' -- tidak dibaca dari input, sehingga orang tidak bisa mendaftar sebagai admin.
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
izinkan('POST');

$in    = masukan();
$nama  = teks($in, 'nama');
$nim   = teks($in, 'nim');
$email = strtolower(teks($in, 'email'));
$prodi = teks($in, 'prodi') ?: 'Informatika';
$pass  = is_string($in['password'] ?? null) ? $in['password'] : '';
$konf  = is_string($in['konfirmasi'] ?? null) ? $in['konfirmasi'] : '';

if ($m = v_registrasi($nama, $nim, $email, $pass, $konf, $prodi)) gagal($m, 422);

$pdo = db();
try {
    // Dua tabel diisi sekaligus: kalau salah satu gagal, keduanya dibatalkan (transaksi).
    $pdo->beginTransaction();
    q('INSERT INTO users (nama, login_id, password_hash, role) VALUES (?, ?, ?, ?)',
      [$nama, $nim, password_hash($pass, PASSWORD_DEFAULT), 'mhs']);
    $uid = (int) $pdo->lastInsertId();
    q('INSERT INTO mahasiswa (user_id, nim, email, program_studi) VALUES (?, ?, ?, ?)', [$uid, $nim, $email, $prodi]);
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if (galat_kembar($e)) gagal('NIM atau email sudah terdaftar.', 409);   // balapan dengan pendaftar lain
    throw $e;
}
keluar(['ok' => true, 'pesan' => 'Akun dibuat, silakan masuk.'], 201);
