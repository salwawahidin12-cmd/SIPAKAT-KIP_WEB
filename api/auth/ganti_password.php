<?php
// ==================================================================
// POST /api/auth/ganti_password.php : pengguna yang sudah login mengganti passwordnya.
// body: {"lama":"...", "baru":"..."}  (password lama wajib benar)
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
izinkan('POST');
$u = wajib_login();
wajib_csrf();

$in   = masukan();
$lama = is_string($in['lama'] ?? null) ? $in['lama'] : '';
$baru = is_string($in['baru'] ?? null) ? $in['baru'] : '';

// Akun yang masuk lewat Google (sesi ini) boleh memasang password TANPA password lama,
// karena mereka memang belum pernah memiliki password sendiri. Akun yang masuk dengan
// NIM/email dan password tetap wajib memasukkan password lama.
$viaGoogle = !empty($_SESSION['via_google']);
if ($lama === '' && !$viaGoogle) gagal('Kata sandi lama wajib diisi.', 422);
if ($lama !== '' || !$viaGoogle) {
    $hash = q('SELECT password_hash FROM users WHERE id = ?', [$u['id']])->fetchColumn();
    if (!password_verify($lama, (string) $hash)) gagal('Password lama salah.', 422);
}
if ($m = v_password($baru)) gagal($m, 422);

q('UPDATE users SET password_hash = ?, wajib_ganti_password = 0 WHERE id = ?', [password_hash($baru, PASSWORD_DEFAULT), $u['id']]);
keluar(['ok' => true, 'pesan' => 'Kata sandi berhasil diubah.']);
