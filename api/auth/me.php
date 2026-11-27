<?php
// ==================================================================
// GET /api/auth/me.php : siapa yang sedang login? Dipakai front-end untuk
// memeriksa sesi saat halaman dibuka (menggantikan sessionStorage 'sipSes').
// Belum login = 401.
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
izinkan('GET');
$u = wajib_login();
$nm = $u['nama'];   // nama lengkap untuk semua role
keluar([
    'ok' => true, 'csrf' => token_csrf(),
    'user' => ['id' => (int) $u['id'], 'nama' => $u['nama'], 'nm' => $nm, 'role' => $u['role'],
               'role_nama' => ROLE_NAMA[$u['role']] ?? '', 'login_id' => $u['login_id'],
               'wajib_ganti_password' => (bool) $u['wajib_ganti_password']],
]);
