<?php
// ==================================================================
// POST /api/auth/google.php   body JSON: {"credential":"<ID token dari Google>"}
// Login dengan Google. Alurnya:
//   1) Browser mendapat ID token dari Google (Google Identity Services).
//   2) Server MEMERIKSA token itu ke Google (tokeninfo), bukan percaya begitu saja.
//   3) Yang diperiksa: ditujukan untuk aplikasi ini (aud), penerbitnya Google (iss),
//      belum kedaluwarsa (exp), dan email sudah diverifikasi Google.
//   4) Email dicocokkan dengan akun MAHASISWA yang sudah terdaftar. Akun tidak dibuat otomatis.
//   5) Kalau cocok, sesi dibuat dengan cara yang sama seperti login biasa.
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
izinkan('POST');

$clientId = (string) cfg('google.client_id', '');
if ($clientId === '') gagal('Login Google belum dikonfigurasi.', 503);

$in    = masukan();
$token = is_string($in['credential'] ?? null) ? $in['credential'] : '';
// ID token berbentuk JWT: tiga bagian base64url dipisah titik. Tolak bentuk lain sebelum dikirim ke Google.
if ($token === '' || strlen($token) > 4096 || !preg_match('/^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+$/', $token)) {
    gagal('Token Google tidak valid.', 400);
}

// --- 2) Minta Google memeriksa token ---------------------------------
$url = (string) cfg('google.tokeninfo_url', 'https://oauth2.googleapis.com/tokeninfo') . '?id_token=' . urlencode($token);
$ch  = curl_init($url);
$opsi = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 10,
    CURLOPT_SSL_VERIFYPEER => true,    // sertifikat Google WAJIB diperiksa (tidak dimatikan)
    CURLOPT_SSL_VERIFYHOST => 2,
];
// Di Windows/XAMPP kadang PHP tidak menemukan daftar sertifikat. Cari berkas bawaan XAMPP.
$ca = cfg('google.ca_bundle');
if (!$ca) {
    $xampp = dirname(dirname(PHP_BINARY));
    foreach ([$xampp . '/apache/bin/curl-ca-bundle.crt', $xampp . '/php/extras/ssl/cacert.pem'] as $c) {
        if (is_file($c)) { $ca = $c; break; }
    }
}
if ($ca) $opsi[CURLOPT_CAINFO] = $ca;
curl_setopt_array($ch, $opsi);
$res  = curl_exec($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err  = curl_error($ch);
curl_close($ch);

if ($res === false) {
    error_log('Google tokeninfo gagal: ' . $err);
    gagal('Tidak dapat menghubungi Google. Periksa koneksi internet.', 502);
}
if ($http !== 200) gagal('Token Google ditolak.', 401);
$p = json_decode($res, true);
if (!is_array($p)) gagal('Jawaban Google tidak dapat dibaca.', 502);

// --- 3) Periksa isi token ---------------------------------------------
if (($p['aud'] ?? '') !== $clientId)                                              gagal('Token bukan untuk aplikasi ini.', 401);
if (!in_array($p['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) gagal('Penerbit token tidak dikenal.', 401);
if ((int) ($p['exp'] ?? 0) < time())                                              gagal('Token Google sudah kedaluwarsa.', 401);
if (!in_array($p['email_verified'] ?? false, [true, 'true'], true))               gagal('Email Google belum terverifikasi.', 403);
$email = strtolower(trim((string) ($p['email'] ?? '')));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL))                  gagal('Email Google tidak valid.', 400);

// --- 4) Cocokkan dengan akun mahasiswa yang SUDAH terdaftar -----------
$user = q("SELECT u.* FROM users u JOIN mahasiswa m ON m.user_id = u.id
           WHERE LOWER(m.email) = ? AND u.role = 'mhs' LIMIT 1", [$email])->fetch();
if (!$user) gagal('Email Google ini belum terdaftar sebagai mahasiswa. Daftar dulu atau pakai email yang terdaftar.', 403);
if (!(int) $user['aktif']) gagal('Akun dinonaktifkan. Hubungi admin.', 403);

// --- 5) Buat sesi (sama dengan login.php) -----------------------------
session_regenerate_id(true);
$_SESSION['uid']      = (int) $user['id'];
$_SESSION['terakhir'] = time();
$_SESSION['via_google'] = true;   // dipakai ganti_password.php: boleh pasang password tanpa password lama
unset($_SESSION['csrf']);
$csrf = token_csrf();

$nm = $user['nama'];   // nama lengkap
keluar([
    'ok'   => true,
    'csrf' => $csrf,
    'user' => [
        'id' => (int) $user['id'], 'nama' => $user['nama'], 'nm' => $nm, 'role' => $user['role'],
        'role_nama' => ROLE_NAMA[$user['role']] ?? '',
        'wajib_ganti_password' => (bool) $user['wajib_ganti_password'],
    ],
]);
