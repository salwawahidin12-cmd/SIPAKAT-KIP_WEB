<?php
// ==================================================================
// POST /api/auth/login.php   body JSON: {"login":"NIM atau email","password":"..."}
// Memeriksa login. Keamanan yang diterapkan:
//   - password dibandingkan dengan HASH memakai password_verify (bukan teks asli)
//   - query berparameter (anti SQL injection)
//   - pembatasan login gagal (anti tebak password)
//   - pesan error SAMA untuk "akun tidak ada" dan "password salah"
//   - session_regenerate_id setelah login (anti session fixation)
// ==================================================================
require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
izinkan('POST');

$in    = masukan();
$login = strtolower(teks($in, 'login'));
$pass  = is_string($in['password'] ?? null) ? $in['password'] : '';
if ($login === '' || $pass === '') gagal('NIM/email dan kata sandi wajib diisi.', 422);

$ip     = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$batas  = date('Y-m-d H:i:s', time() - (int) cfg('login_jendela_mnt') * 60);

// 1) Terlalu banyak gagal baru-baru ini? Tolak dulu sebelum memeriksa password.
$gagal = (int) q('SELECT COUNT(*) FROM login_gagal WHERE login_id = ? AND waktu > ?', [$login, $batas])->fetchColumn();
if ($gagal >= (int) cfg('login_maks_gagal')) {
    gagal('Terlalu banyak percobaan gagal. Coba lagi dalam ' . (int) cfg('login_jendela_mnt') . ' menit.', 429);
}

// 2) Cari akun. Mahasiswa boleh memakai NIM atau email, admin/petugas memakai email.
$user = q('SELECT u.* FROM users u LEFT JOIN mahasiswa m ON m.user_id = u.id
           WHERE u.login_id = ? OR m.nim = ? OR m.email = ? LIMIT 1',
          [$login, $login, $login])->fetch();

// 3) Bandingkan password. Kalau akun tidak ada tetap memverifikasi hash palsu
//    supaya waktu responsnya mirip (penyerang tidak bisa menebak akun yang ada).
$hash = $user ? $user['password_hash'] : password_hash('palsu', PASSWORD_DEFAULT);
$cocok = password_verify($pass, $hash);

if (!$user || !$cocok || !(int) $user['aktif']) {
    q('INSERT INTO login_gagal (login_id, ip, waktu) VALUES (?, ?, ?)', [$login, $ip, sekarang()]);
    // Akun nonaktif sengaja diberi pesan yang sama dengan password salah.
    gagal('NIM/email atau kata sandi salah.', 401);
}

// 4) Berhasil: hapus catatan gagal, ganti ID sesi, simpan identitas di SESI (di server).
q('DELETE FROM login_gagal WHERE login_id = ?', [$login]);
session_regenerate_id(true);
$_SESSION['uid']      = (int) $user['id'];
$_SESSION['terakhir'] = time();
unset($_SESSION['csrf'], $_SESSION['via_google']);
$csrf = token_csrf();

// Kalau algoritma hash bawaan PHP sudah berganti, perbarui hash lama secara diam-diam.
if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    q('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $user['id']]);
}

$nm = $user['nama'];   // nama lengkap untuk semua role (dipakai sapaan Dashboard dan bilah atas)
keluar([
    'ok'   => true,
    'csrf' => $csrf,
    'user' => [
        'id' => (int) $user['id'], 'nama' => $user['nama'], 'nm' => $nm, 'role' => $user['role'],
        'role_nama' => ROLE_NAMA[$user['role']] ?? '',
        'wajib_ganti_password' => (bool) $user['wajib_ganti_password'],
    ],
]);
