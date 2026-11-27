<?php
// ==================================================================
// seed.php : membuat akun demo dengan password yang di-HASH oleh PHP.
// Jalankan SEKALI dari terminal setelah mengimpor sipakat_kip.sql:
//     php database/seed.php
// Berkas ini hanya boleh dijalankan lewat terminal, bukan lewat browser.
// ==================================================================
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Hanya untuk terminal.'); }

$cfg = require __DIR__ . '/../config/config.php';
$d = $cfg['db'];
$pdo = new PDO("mysql:host={$d['host']};dbname={$d['nama']};charset={$d['charset']}", $d['user'], $d['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

// [nama, login (email atau NIM), password, role, email mahasiswa]
$akun = [
    ['Salwa Wahidin',  '07352411149',       'mhs123',     'mhs', 'salwa@unkhair.ac.id'],
    ['Admin SIPAKAT',  'admin@sipakat.id',  'admin123',   'adm', null],
    ['Petugas Seleksi','petugas@sipakat.id','petugas123', 'ptg', null],
];

$pdo->beginTransaction();
$cekUser = $pdo->prepare('SELECT id FROM users WHERE login_id = ?');
$insUser = $pdo->prepare('INSERT INTO users (nama, login_id, password_hash, role) VALUES (?, ?, ?, ?)');
$insMhs  = $pdo->prepare('INSERT INTO mahasiswa (user_id, nim, email, program_studi) VALUES (?, ?, ?, ?)');

foreach ($akun as [$nama, $login, $pass, $role, $email]) {
    $cekUser->execute([$login]);
    if ($cekUser->fetchColumn()) { echo "Lewati (sudah ada): $login\n"; continue; }
    $insUser->execute([$nama, $login, password_hash($pass, PASSWORD_DEFAULT), $role]);   // hash bcrypt, bukan teks asli
    if ($role === 'mhs') $insMhs->execute([$pdo->lastInsertId(), $login, $email, 'Informatika']);
    echo "Dibuat: $login ($role)\n";
}
$pdo->commit();
echo "Selesai. Password demo ada di README-BACKEND.md. Ganti sebelum dipakai sungguhan.\n";
