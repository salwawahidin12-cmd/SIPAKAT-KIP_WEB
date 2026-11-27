<?php
// ==================================================================
// POST /api/auth/logout.php : keluar. Sesi dihapus total di server dan cookie dibuang.
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
izinkan('POST');
if (user_sekarang()) wajib_csrf();   // pastikan permintaan keluar benar dari aplikasi ini

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 3600, $p['path'], $p['domain'] ?? '', $p['secure'], $p['httponly']);
}
session_destroy();
keluar(['ok' => true]);
