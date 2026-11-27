<?php
// ==================================================================
// validator.php : semua aturan pemeriksaan input di SISI SERVER.
// Validasi di JavaScript (validasi.js) hanya kenyamanan; yang menentukan adalah
// berkas ini, karena JavaScript bisa dilewati pengguna.
// Aturannya sama dengan validasi.js: fungsi mengembalikan TEKS PESAN kalau ada
// yang salah, dan '' (kosong) kalau semuanya benar.
// ==================================================================

// Nilai yang diperbolehkan (sama dengan OPT di data.js).
const OPT = [
    'ipk'         => ['Tinggi', 'Sedang', 'Rendah'],
    'penghasilan' => ['Rendah', 'Sedang', 'Tinggi'],
    'tanggungan'  => ['Sedikit', 'Sedang', 'Banyak'],
    'daya'        => ['450 VA', '900 VA', '1300 VA', '2200 VA'],
    'kelas'       => ['Layak', 'Tidak Layak'],
    'ket'         => ['Memenuhi kriteria', 'Memenuhi kriteria, kuota penuh', 'Tidak memenuhi kriteria'],
];
const ROLE_NAMA = ['mhs' => 'Mahasiswa', 'adm' => 'Admin', 'ptg' => 'Petugas Seleksi'];

function v_wajib(string $teks, string $nama): string
{
    return trim($teks) === '' ? "$nama wajib diisi." : '';
}

function v_email(string $e): string
{
    return filter_var($e, FILTER_VALIDATE_EMAIL) && strlen($e) <= 100 ? '' : 'Format email tidak valid.';
}

function v_password(string $p): string
{
    if (mb_strlen($p) < 8)  return 'Password minimal 8 karakter.';
    if (strlen($p) > 72)    return 'Password maksimal 72 karakter.';   // batas bcrypt
    return '';
}

// Apakah NIM/email/login ini sudah dipakai akun lain? $kecualiUser = id pengguna
// yang sedang diubah (supaya tidak dianggap kembar dengan dirinya sendiri).
function v_sudah_ada(string $nilai, int $kecualiUser = 0): bool
{
    $nilai = strtolower($nilai);
    $n = q('SELECT COUNT(*) FROM users u LEFT JOIN mahasiswa m ON m.user_id = u.id
            WHERE (u.login_id = ? OR m.nim = ? OR m.email = ?) AND u.id <> ?',
           [$nilai, $nilai, $nilai, $kecualiUser])->fetchColumn();
    return (int) $n > 0;
}

// Form Kelola Pengguna (tambah dan ubah). $role = kode role: mhs | adm | ptg.
function v_user(string $nama, string $login, ?string $pass, string $role, int $kecualiUser = 0, bool $passOpsional = false): string
{
    if ($m = v_wajib($nama, 'Nama')) return $m;
    if (mb_strlen($nama) > 100) return 'Nama maksimal 100 karakter.';
    if (!isset(ROLE_NAMA[$role])) return 'Role tidak dikenal.';
    if ($login === '') return 'Email / NIM wajib diisi.';
    if ($role === 'mhs') {
        if (!preg_match('/^\d{8,14}$/', $login)) return 'NIM harus 8–14 angka.';
    } elseif ($m = v_email($login)) {
        return $m;   // admin dan petugas wajib memakai email
    }
    if (v_sudah_ada($login, $kecualiUser)) return 'Email / NIM sudah terdaftar.';
    if ($passOpsional && ($pass === null || $pass === '')) return '';
    return v_password((string) $pass);
}

function v_registrasi(string $nama, string $nim, string $email, string $pass, string $konfirmasi, string $prodi): string
{
    if ($m = v_wajib($nama, 'Nama lengkap')) return $m;
    if (mb_strlen($nama) > 100) return 'Nama maksimal 100 karakter.';
    if (!preg_match('/^\d{8,14}$/', $nim)) return 'NIM harus 8–14 angka.';
    if ($m = v_email($email)) return $m;
    if (!in_array($prodi, ['Informatika', 'Teknik Sipil'], true)) return 'Program studi tidak dikenal.';
    if ($m = v_password($pass)) return $m;
    if ($pass !== $konfirmasi) return 'Konfirmasi password tidak sama.';
    if (v_sudah_ada($nim) || v_sudah_ada($email)) return 'NIM atau email sudah terdaftar.';
    return '';
}

// Periode: nama unik, tanggal tutup > buka, kuota > 0. $kecualiId = periode yang sedang diubah.
function v_periode(string $nama, string $buka, string $tutup, $kuota, int $kecualiId = 0): string
{
    if ($nama === '')                   return 'Nama periode wajib diisi.';
    if (mb_strlen($nama) > 60)          return 'Nama periode maksimal 60 karakter.';
    if ($buka === '' || $tutup === '')  return 'Tanggal buka dan tutup wajib diisi.';
    foreach ([$buka, $tutup] as $t) {
        $d = DateTime::createFromFormat('Y-m-d', $t);
        if (!$d || $d->format('Y-m-d') !== $t) return 'Format tanggal harus YYYY-MM-DD.';
    }
    if ($tutup <= $buka)                return 'Tanggal tutup harus setelah tanggal buka.';
    if (filter_var($kuota, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]) === false) {
        return 'Kuota harus berupa angka lebih dari 0.';
    }
    $n = q('SELECT COUNT(*) FROM periode WHERE LOWER(nama) = LOWER(?) AND id <> ?', [$nama, $kecualiId])->fetchColumn();
    return (int) $n > 0 ? 'Nama periode sudah ada.' : '';
}

// Satu baris data latih. $r = ['ipk'=>, 'penghasilan'=>, 'tanggungan'=>, 'daya'=>, 'kelas'=>, 'keterangan'=>]
function v_data_latih(array $r): string
{
    $label = ['ipk' => 'IPK', 'penghasilan' => 'Penghasilan', 'tanggungan' => 'Tanggungan', 'daya' => 'Daya', 'kelas' => 'Kelas'];
    foreach ($label as $k => $nama) {
        $v = (string) ($r[$k] ?? '');
        if (!in_array($v, OPT[$k], true)) return $nama . ' (' . ($v === '' ? 'kosong' : $v) . ') tidak valid';
    }
    $ket = (string) ($r['keterangan'] ?? '');
    if (!in_array($ket, OPT['ket'], true)) return 'Keterangan label kosong atau tidak dikenal';
    // Aturan silang: Layak harus berketerangan "Memenuhi...", Tidak Layak sebaliknya.
    if (($r['kelas'] === 'Layak') !== (strpos($ket, 'Memenuhi') === 0)) return 'Keterangan label tidak sesuai dengan kelas';
    return '';
}

// ------------------------------------------------------------------
// Pendaftaran mahasiswa
// ------------------------------------------------------------------

// Penghasilan dari form (teks rentang) -> kategori untuk C4.5.
function peta_penghasilan(string $teks): ?string
{
    $peta = [
        'Kurang dari Rp1.000.000'    => 'Rendah',
        'Rp1.000.000 – Rp2.000.000'  => 'Sedang',
        'Lebih dari Rp2.000.000'     => 'Tinggi',
        'Rendah' => 'Rendah', 'Sedang' => 'Sedang', 'Tinggi' => 'Tinggi',   // kategori langsung juga diterima
    ];
    return $peta[$teks] ?? null;
}

function peta_daya(string $teks): ?string
{
    $peta = ['450 VA' => '450 VA', '900 VA' => '900 VA', '1300 VA' => '1300 VA',
             '2200 VA' => '2200 VA', '2200 VA atau lebih' => '2200 VA'];
    return $peta[$teks] ?? null;
}

// Mengubah angka menjadi label (batasnya di config.php) agar bisa diproses C4.5.
function kat_ipk(float $ipk): string
{
    if ($ipk >= (float) cfg('kategori.ipk_tinggi')) return 'Tinggi';
    if ($ipk >= (float) cfg('kategori.ipk_sedang')) return 'Sedang';
    return 'Rendah';
}

function kat_tanggungan(int $n): string
{
    if ($n >= (int) cfg('kategori.tanggungan_banyak')) return 'Banyak';
    if ($n >= (int) cfg('kategori.tanggungan_sedang')) return 'Sedang';
    return 'Sedikit';
}

// $langkah 1 = data diri, 2 = data kriteria. Mengembalikan pesan error atau ''.
function v_pendaftaran(int $langkah, array $f): string
{
    if ($langkah === 1) {
        if (trim((string) ($f['nama'] ?? '')) === '') return 'Nama lengkap wajib diisi.';
        $sm = $f['semester'] ?? '';
        if ($sm !== '' && $sm !== null && filter_var($sm, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 14]]) === false) {
            return 'Semester harus 1–14.';
        }
        $hp = preg_replace('/[-\s]/', '', (string) ($f['no_hp'] ?? ''));
        if (!preg_match('/^08\d{8,12}$/', $hp)) return 'No. HP tidak valid (contoh 08123456789).';
        if (trim((string) ($f['alamat'] ?? '')) === '') return 'Alamat wajib diisi.';
    }
    if ($langkah === 2) {
        $ipk = $f['ipk'] ?? '';
        if (!is_numeric($ipk) || (float) $ipk < 0 || (float) $ipk > 4) return 'IPK harus antara 0 dan 4.';
        if (peta_penghasilan((string) ($f['penghasilan'] ?? '')) === null) return 'Penghasilan tidak valid.';
        if (!preg_match('/^\d{1,2}$/', (string) ($f['tanggungan'] ?? ''))) return 'Jumlah tanggungan harus angka 0 atau lebih.';
        if (peta_daya((string) ($f['daya'] ?? '')) === null) return 'Daya listrik tidak valid.';
    }
    return '';
}
