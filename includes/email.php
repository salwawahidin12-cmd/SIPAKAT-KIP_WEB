<?php
// ==================================================================
// email.php : mengirim email lewat SMTP (contoh: Gmail) tanpa library tambahan.
//   kirim_email($ke, $subjek, $isi)  -> melempar Exception kalau gagal.
// Pengaturan ada di config.php bagian 'email'. Alur SMTP:
//   sambung -> EHLO -> STARTTLS (enkripsi) -> AUTH LOGIN -> MAIL FROM -> RCPT TO -> DATA -> QUIT
// Sertifikat server SMTP SELALU diperiksa (tidak dimatikan).
// ==================================================================

// Membaca balasan SMTP (bisa berbaris banyak: "250-..." lalu "250 ..."). Hasil: [kode, teks].
function smtp_baca($fp): array
{
    $teks = '';
    while (($baris = fgets($fp, 1024)) !== false) {
        $teks .= $baris;
        if (strlen($baris) < 4 || $baris[3] === ' ') break;   // baris terakhir tidak memakai tanda "-"
    }
    if ($teks === '') throw new RuntimeException('Server email tidak menjawab (timeout).');
    return [(int) substr($teks, 0, 3), trim($teks)];
}

// Kirim satu perintah lalu pastikan balasannya sesuai kode yang diharapkan.
function smtp_perintah($fp, ?string $perintah, array $kodeOk): string
{
    if ($perintah !== null) fwrite($fp, $perintah . "\r\n");
    [$kode, $teks] = smtp_baca($fp);
    if (!in_array($kode, $kodeOk, true)) {
        // Perintah AUTH tidak dicatat apa adanya supaya password tidak masuk log.
        $tampil = ($perintah !== null && !preg_match('/^(AUTH|[A-Za-z0-9+\/=]{12,}$)/', $perintah)) ? $perintah : '(disamarkan)';
        throw new RuntimeException("SMTP menolak [$tampil]: $teks");
    }
    return $teks;
}

function kirim_email(string $ke, string $subjek, string $isi): void
{
    $c = cfg('email', []);
    $host = (string) ($c['host'] ?? ''); $port = (int) ($c['port'] ?? 587); $enk = (string) ($c['enkripsi'] ?? 'tls');
    $user = (string) ($c['user'] ?? '');  $pass = (string) ($c['pass'] ?? '');
    $dari = (string) ($c['dari_email'] ?: $user); $nama = (string) ($c['dari_nama'] ?? 'SIPAKAT-KIP');
    if ($host === '' || $user === '' || $pass === '') throw new RuntimeException('Pengaturan email belum lengkap.');
    // Cegah penyisipan baris header (header injection): alamat tidak boleh berisi CR/LF dan harus valid.
    if (!filter_var($ke, FILTER_VALIDATE_EMAIL) || !filter_var($dari, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Alamat email tidak valid.');

    // Daftar sertifikat tepercaya. Di XAMPP/Windows kadang PHP tidak menemukannya sendiri.
    $ca = $c['ca_bundle'] ?? null;
    if (!$ca) {
        $xampp = dirname(dirname(PHP_BINARY));
        foreach ([$xampp . '/apache/bin/curl-ca-bundle.crt', $xampp . '/php/extras/ssl/cacert.pem'] as $f) if (is_file($f)) { $ca = $f; break; }
    }
    $ssl = ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host];
    if ($ca) $ssl['cafile'] = $ca;
    $ctx = stream_context_create(['ssl' => $ssl]);

    $alamat = ($enk === 'ssl' ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $fp = @stream_socket_client($alamat, $no, $str, 10, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("Tidak dapat tersambung ke $host:$port ($str)");
    stream_set_timeout($fp, 15);

    try {
        smtp_perintah($fp, null, [220]);
        smtp_perintah($fp, 'EHLO localhost', [250]);
        if ($enk === 'tls') {   // STARTTLS: ubah sambungan biasa menjadi terenkripsi
            smtp_perintah($fp, 'STARTTLS', [220]);
            if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('Gagal mengaktifkan enkripsi TLS (sertifikat tidak dipercaya?).');
            smtp_perintah($fp, 'EHLO localhost', [250]);
        }
        smtp_perintah($fp, 'AUTH LOGIN', [334]);
        smtp_perintah($fp, base64_encode($user), [334]);
        smtp_perintah($fp, base64_encode($pass), [235]);
        smtp_perintah($fp, "MAIL FROM:<$dari>", [250]);
        smtp_perintah($fp, "RCPT TO:<$ke>", [250, 251]);
        smtp_perintah($fp, 'DATA', [354]);

        $enc = fn(string $s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
        $pesan = implode("\r\n", [
            'Date: ' . date('r'),
            'From: ' . $enc($nama) . " <$dari>",
            "To: <$ke>",
            'Subject: ' . $enc($subjek),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@sipakat-kip>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            '', rtrim(chunk_split(base64_encode($isi), 76, "\r\n")),
        ]);
        $pesan = preg_replace('/^\./m', '..', $pesan);   // aturan SMTP: baris yang diawali titik digandakan
        fwrite($fp, $pesan . "\r\n.\r\n");
        smtp_perintah($fp, null, [250]);
        @fwrite($fp, "QUIT\r\n");
    } finally {
        fclose($fp);
    }
}
