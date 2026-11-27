<?php

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/validator.php';
require __DIR__ . '/../../includes/email.php';
izinkan('POST');

$in    = masukan();
$aksi  = teks($in, 'aksi');
$login = strtolower(teks($in, 'login'));
if ($login === '') gagal('Email / NIM wajib diisi.', 422);

$user = q('SELECT u.id, u.nama, COALESCE(m.email, u.login_id) AS email FROM users u LEFT JOIN mahasiswa m ON m.user_id = u.id
           WHERE (u.login_id = ? OR m.nim = ? OR m.email = ?) AND u.aktif = 1 LIMIT 1',
          [$login, $login, $login])->fetch();

if ($aksi === 'kirim') {
    $balas = ['ok' => true, 'pesan' => 'Jika akun terdaftar, kode verifikasi telah dikirim ke email.'];
    if ($user) {
        $kode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);   // acak yang aman (bukan rand)
        q('UPDATE reset_password SET dipakai = 1 WHERE user_id = ?', [$user['id']]);   // kode lama hangus
        q('INSERT INTO reset_password (user_id, kode_hash, kedaluwarsa) VALUES (?, ?, ?)',
          [$user['id'], password_hash($kode, PASSWORD_DEFAULT),
           date('Y-m-d H:i:s', time() + (int) cfg('reset_berlaku_mnt') * 60)]);
        // Kirim kode ke email pengguna lewat SMTP (includes/email.php) kalau 'email.aktif' = true.
        $terkirim = false;
        if (cfg('email.aktif')) {
            try {
                kirim_email((string) $user['email'], 'Kode verifikasi SIPAKAT-KIP',
                    "Halo " . $user['nama'] . ",\r\n\r\nKode verifikasi untuk mengatur ulang password Anda: " . $kode . "\r\n\r\n"
                    . "Kode berlaku " . (int) cfg('reset_berlaku_mnt') . " menit dan hanya bisa dipakai sekali.\r\n"
                    . "Jika Anda tidak merasa meminta ini, abaikan email ini.\r\n\r\nSIPAKAT-KIP");
                $terkirim = true;
            } catch (Throwable $e) {
                error_log('Gagal mengirim email reset password: ' . $e->getMessage());   // jawaban ke pengguna tetap sama
            }
        }
        // Mode demo: kode hanya ditampilkan kalau debug = true DAN email tidak terkirim.
        if (cfg('debug') && !$terkirim) $balas['kode_demo'] = $kode;
    }
    keluar($balas);
}

if ($aksi !== 'cek' && $aksi !== 'reset') gagal('Aksi tidak dikenal.', 400);

// Langkah cek/reset: ambil kode terbaru yang belum dipakai dan belum kedaluwarsa.
$kode = teks($in, 'kode');
$baris = $user ? q('SELECT * FROM reset_password WHERE user_id = ? AND dipakai = 0 AND kedaluwarsa > ?
                    ORDER BY id DESC LIMIT 1', [$user['id'], sekarang()])->fetch() : false;
if (!$baris || (int) $baris['percobaan'] >= (int) cfg('reset_maks_salah')) gagal('Kode salah atau kedaluwarsa.', 400);

if (!preg_match('/^\d{6}$/', $kode) || !password_verify($kode, $baris['kode_hash'])) {
    q('UPDATE reset_password SET percobaan = percobaan + 1 WHERE id = ?', [$baris['id']]);
    gagal('Kode salah atau kedaluwarsa.', 400);
}
if ($aksi === 'cek') keluar(['ok' => true]);

// aksi = reset
$pass = is_string($in['password'] ?? null) ? $in['password'] : '';
if ($m = v_password($pass)) gagal($m, 422);
if ($pass !== ($in['konfirmasi'] ?? null)) gagal('Konfirmasi password tidak sama.', 422);

$pdo = db();
$pdo->beginTransaction();
q('UPDATE users SET password_hash = ?, wajib_ganti_password = 0 WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $user['id']]);
q('UPDATE reset_password SET dipakai = 1 WHERE user_id = ?', [$user['id']]);   // kode tidak bisa dipakai ulang
$pdo->commit();
keluar(['ok' => true, 'pesan' => 'Password berhasil diubah, silakan masuk.']);
