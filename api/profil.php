<?php
// ==================================================================
// PUT /api/profil.php   body JSON: {"nama":"...", "nim":"..."}   (nim hanya untuk mahasiswa)
// Pemilik akun mengubah nama dan NIM-nya sendiri. Role TIDAK bisa diubah dari sini.
// Identitas yang diubah selalu akun yang sedang login (dari sesi), bukan dari input.
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/identitas.php';
izinkan('PUT');
$u = wajib_login();
wajib_csrf();

$in = masukan();
if ($m = ubah_identitas($u, teks($in, 'nama'), teks($in, 'nim'))) gagal($m, 422);
keluar(['ok' => true, 'pesan' => 'Profil diperbarui.']);
