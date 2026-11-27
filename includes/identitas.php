<?php
// ==================================================================
// identitas.php : pemilik akun mengubah NAMA (semua role) dan NIM (mahasiswa) sendiri,
// tanpa perantaraan admin. Dipakai oleh api/profil.php dan api/pendaftaran.php.
// Mengembalikan teks pesan kalau ada yang salah, dan '' (kosong) kalau berhasil.
// Aturan bisnis: nama dan NIM dikunci setelah pendaftaran dikirim (status wait atau ver),
// karena petugas sudah mencocokkannya dengan berkas. Setelah itu hanya admin yang bisa mengubahnya.
// ==================================================================
require_once __DIR__ . '/validator.php';

function ubah_identitas(array $u, string $nama, ?string $nim = null): string
{
    $mhs  = $u['role'] === 'mhs';
    $nama = trim($nama);
    if ($m = v_wajib($nama, 'Nama lengkap')) return $m;
    if (mb_strlen($nama) > 100) return 'Nama maksimal 100 karakter.';

    $nimLama = $mhs ? (string) q('SELECT nim FROM mahasiswa WHERE user_id = ?', [$u['id']])->fetchColumn() : '';
    $nim     = $mhs ? trim((string) $nim) : '';
    if ($mhs) {
        if (!preg_match('/^\d{8,14}$/', $nim)) return 'NIM harus 8–14 angka.';
        if ($nim !== $nimLama && v_sudah_ada($nim, (int) $u['id'])) return 'NIM sudah terdaftar.';
    }

    // Tidak ada yang berubah: selesai tanpa menyentuh database.
    if ($nama === $u['nama'] && (!$mhs || $nim === $nimLama)) return '';

    if ($mhs) {
        $terkirim = (int) q("SELECT COUNT(*) FROM pendaftaran WHERE user_id = ? AND status IN ('wait','ver')", [$u['id']])->fetchColumn();
        if ($terkirim > 0) return 'Data sudah dipakai pada pendaftaran yang dikirim, sehingga nama dan NIM tidak dapat diubah. Hubungi admin.';
    }

    $pdo   = db();
    $mulai = !$pdo->inTransaction();   // kalau pemanggil sudah memulai transaksi, ikut di dalamnya
    try {
        if ($mulai) $pdo->beginTransaction();
        if ($mhs) {
            // Untuk mahasiswa, NIM = login_id, jadi ketiga tabel diperbarui bersamaan.
            q('UPDATE users SET nama = ?, login_id = ? WHERE id = ?', [$nama, $nim, $u['id']]);
            q('UPDATE mahasiswa SET nim = ? WHERE user_id = ?', [$nim, $u['id']]);
            q("UPDATE pendaftaran SET nim = ? WHERE user_id = ? AND status IN ('draft','ret')", [$nim, $u['id']]);
        } else {
            q('UPDATE users SET nama = ? WHERE id = ?', [$nama, $u['id']]);
        }
        if ($mulai) $pdo->commit();
    } catch (PDOException $e) {
        if ($mulai && $pdo->inTransaction()) $pdo->rollBack();
        if (galat_kembar($e)) return 'NIM sudah terdaftar.';
        throw $e;
    }
    return '';
}
