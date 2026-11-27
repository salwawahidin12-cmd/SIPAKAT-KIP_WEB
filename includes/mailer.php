<?php
// ==================================================================
// mailer.php : pengirim email lewat SMTP (tanpa library tambahan).
// Dipakai untuk mengirim kode reset password. Pengaturannya ada di bagian 'mail'
// pada config/config.php. Mendukung STARTTLS (port 587) dan SSL (port 465)
// dengan login AUTH LOGIN, cocok untuk Gmail (pakai App Password).
// kirim_email() mengembalikan [true, ''] kalau berhasil, atau [false, 'alasan'] kalau gagal.
// ==================================================================
declare(strict_types=1);

// Baca satu balasan server SMTP (bisa beberapa baris, baris terakhir berbentuk "250 OK").
function smtp_baca($fp): string
{
    $hasil = '';
    while (($baris = fgets($fp, 515)) !== false) {
        $hasil .= $baris;
        if (strlen($baris) < 4 || $baris[3] === ' ') break;
    }
    return $hasil;
}

// Kirim satu perintah lalu baca balasannya.
function smtp_perintah($fp, string $perintah): string
{
    fwrite($fp, $perintah . "\r\n");
    return smtp_baca($fp);
}

// Tiga angka pertama balasan = kode status (250 = sukses, 535 = login ditolak, dst.).
function smtp_kode(string $balasan): int
{
    return (int) substr($balasan, 0, 3);
}

// Tutup koneksi dan kembalikan pesan gagal.
function smtp_gagal($fp, string $pesan): array
{
    if (is_resource($fp)) @fclose($fp);
    return [false, $pesan];
}

function kirim_email(string $ke, string $subjek, string $isi): array
{
    $m = cfg('mail', []);
    if (empty($m['aktif'])) return [false, 'Pengiriman email belum diaktifkan (config.php, bagian mail).'];
    // filter_var menolak alamat yang berisi baris baru, sehingga header email tidak bisa disisipi (header injection).
    if (!filter_var($ke, FILTER_VALIDATE_EMAIL)) return [false, 'Alamat email tujuan tidak valid.'];

    $host   = (string) ($m['host'] ?? '');
    $port   = (int) ($m['port'] ?? 587);
    $secure = (string) ($m['secure'] ?? 'tls');          // tls = STARTTLS (587), ssl = langsung SSL (465)
    $user   = (string) ($m['user'] ?? '');
    $pass   = (string) ($m['pass'] ?? '');
    $dari   = (string) (($m['dari_email'] ?? '') ?: $user);
    $nama   = (string) ($m['dari_nama'] ?? 'SIPAKAT-KIP');
    if ($host === '' || $user === '' || $pass === '' || !filter_var($dari, FILTER_VALIDATE_EMAIL)) {
        return [false, 'Pengaturan email di config.php belum lengkap (host, user, pass).'];
    }

    // Pemeriksaan sertifikat server. Matikan (verifikasi_ssl = false) hanya untuk uji coba di komputer sendiri.
    $verif = (bool) ($m['verifikasi_ssl'] ?? true);
    $opsi = ['ssl' => ['verify_peer' => $verif, 'verify_peer_name' => $verif, 'allow_self_signed' => !$verif]];
    if (!empty($m['cafile'])) $opsi['ssl']['cafile'] = (string) $m['cafile'];

    $alamat = ($secure === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $errno = 0;
    $errstr = '';
    $fp = @stream_socket_client($alamat, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, stream_context_create($opsi));
    if (!$fp) return [false, "Tidak dapat terhubung ke $host:$port ($errstr). Periksa internet dan pengaturan host/port."];
    stream_set_timeout($fp, 15);

    $b = smtp_baca($fp);
    if (smtp_kode($b) !== 220) return smtp_gagal($fp, 'Server SMTP menolak koneksi: ' . trim($b));
    $b = smtp_perintah($fp, 'EHLO localhost');
    if (smtp_kode($b) !== 250) return smtp_gagal($fp, 'EHLO ditolak: ' . trim($b));

    if ($secure === 'tls') {
        $b = smtp_perintah($fp, 'STARTTLS');
        if (smtp_kode($b) !== 220) return smtp_gagal($fp, 'STARTTLS ditolak: ' . trim($b));
        if (!@stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            return smtp_gagal($fp, 'Gagal mengaktifkan enkripsi TLS. Kalau pesan sebelumnya soal sertifikat, isi cafile atau set verifikasi_ssl = false di config.php.');
        }
        $b = smtp_perintah($fp, 'EHLO localhost');   // setelah TLS, perkenalan diulang
        if (smtp_kode($b) !== 250) return smtp_gagal($fp, 'EHLO setelah TLS ditolak: ' . trim($b));
    }

    // Login. Username dan password dikirim dalam bentuk base64 (melalui koneksi terenkripsi).
    $b = smtp_perintah($fp, 'AUTH LOGIN');
    if (smtp_kode($b) !== 334) return smtp_gagal($fp, 'Server tidak mendukung AUTH LOGIN: ' . trim($b));
    $b = smtp_perintah($fp, base64_encode($user));
    if (smtp_kode($b) !== 334) return smtp_gagal($fp, 'Username SMTP ditolak: ' . trim($b));
    $b = smtp_perintah($fp, base64_encode($pass));
    if (smtp_kode($b) !== 235) return smtp_gagal($fp, 'Login SMTP ditolak. Untuk Gmail gunakan App Password 16 karakter, bukan password akun.');

    $b = smtp_perintah($fp, 'MAIL FROM:<' . $dari . '>');
    if (smtp_kode($b) !== 250) return smtp_gagal($fp, 'Pengirim ditolak: ' . trim($b));
    $b = smtp_perintah($fp, 'RCPT TO:<' . $ke . '>');
    if (!in_array(smtp_kode($b), [250, 251], true)) return smtp_gagal($fp, 'Penerima ditolak: ' . trim($b));
    $b = smtp_perintah($fp, 'DATA');
    if (smtp_kode($b) !== 354) return smtp_gagal($fp, 'DATA ditolak: ' . trim($b));

    // Nama pengirim dan subjek dikodekan base64 agar huruf non-ASCII aman.
    $header = [
        'Date: ' . date('r'),
        'From: =?UTF-8?B?' . base64_encode($nama) . '?= <' . $dari . '>',
        'To: <' . $ke . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subjek) . '?=',
        'Message-ID: <' . bin2hex(random_bytes(8)) . '@sipakat.local>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
    ];
    $badan = chunk_split(base64_encode($isi), 76, "\r\n");   // isi dalam base64, jadi tidak ada baris yang hanya berisi titik
    fwrite($fp, implode("\r\n", $header) . "\r\n\r\n" . $badan . "\r\n.\r\n");
    $b = smtp_baca($fp);
    if (smtp_kode($b) !== 250) return smtp_gagal($fp, 'Email ditolak server: ' . trim($b));

    smtp_perintah($fp, 'QUIT');
    fclose($fp);
    return [true, ''];
}
