<?php
// ==================================================================
// bootstrap.php : dimuat di AWAL setiap berkas api/*.php.
// Isinya: konfigurasi, sesi yang aman, koneksi database (PDO), dan fungsi
// pembantu (keluaran JSON, pembacaan input, penjaga login, role, dan CSRF).
// ==================================================================
declare(strict_types=1);

$GLOBALS['CFG'] = require __DIR__ . '/../config/config.php';

// cfg('db.host') = baca pengaturan bertingkat dari config.php.
function cfg(string $kunci, $bawaan = null)
{
    $nilai = $GLOBALS['CFG'];
    foreach (explode('.', $kunci) as $k) {
        if (!is_array($nilai) || !array_key_exists($k, $nilai)) return $bawaan;
        $nilai = $nilai[$k];
    }
    return $nilai;
}

date_default_timezone_set((string) cfg('zona_waktu', 'UTC'));

// Pesan error PHP jangan ditampilkan ke pengguna (bisa membocorkan struktur server).
// Cukup dicatat di log PHP.
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Semua keluaran API berupa JSON dan tidak boleh disimpan cache browser.
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// ------------------------------------------------------------------
// Keluaran JSON dan penanganan error
// ------------------------------------------------------------------
function keluar($data, int $kode = 200): void
{
    http_response_code($kode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// gagal('pesan', 422) = hentikan proses dan kirim {"ok":false,"pesan":"..."}.
function gagal(string $pesan, int $kode = 400, array $tambahan = []): void
{
    keluar(array_merge(['ok' => false, 'pesan' => $pesan], $tambahan), $kode);
}

// Error yang tidak tertangani (misalnya database mati): catat di log, balas pesan umum.
set_exception_handler(function (Throwable $e) {
    error_log('[SIPAKAT] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $info = cfg('debug') ? ['detail' => $e->getMessage()] : [];
    gagal('Terjadi kesalahan pada server.', 500, $info);
});

// ------------------------------------------------------------------
// Sesi: cookie HttpOnly (tidak bisa dibaca JavaScript), SameSite=Lax
// (tidak ikut terkirim dari situs lain), dan Secure kalau memakai HTTPS.
// ------------------------------------------------------------------
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
session_name('SIPAKATSESS');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

// Sesi habis kalau tidak aktif lebih dari sesi_idle_mnt menit.
$idle = (int) cfg('sesi_idle_mnt', 30) * 60;
if (isset($_SESSION['uid'], $_SESSION['terakhir']) && time() - (int) $_SESSION['terakhir'] > $idle) {
    $_SESSION = [];
    session_destroy();
    session_start();
}
if (isset($_SESSION['uid'])) $_SESSION['terakhir'] = time();

// ------------------------------------------------------------------
// Database: PDO dengan prepared statement SEJATI (EMULATE_PREPARES = false).
// Artinya nilai dari pengguna dikirim terpisah dari teks SQL, sehingga tidak
// bisa mengubah perintah SQL (pencegahan SQL injection).
// ------------------------------------------------------------------
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $d   = cfg('db');
        $dsn = "mysql:host={$d['host']};dbname={$d['nama']};charset={$d['charset']}";
        $pdo = new PDO($dsn, $d['user'], $d['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // error SQL menjadi exception
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// q('SELECT ... WHERE id = ?', [$id]) = jalankan query berparameter, kembalikan statement-nya.
function q(string $sql, array $param = []): PDOStatement
{
    $st = db()->prepare($sql);
    $st->execute($param);
    return $st;
}

// ------------------------------------------------------------------
// Membaca permintaan
// ------------------------------------------------------------------
function metode(): string
{
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

// Hanya metode yang disebut yang diizinkan, selain itu 405.
function izinkan(string ...$daftar): void
{
    if (!in_array(metode(), $daftar, true)) {
        header('Allow: ' . implode(', ', $daftar));
        gagal('Metode ' . metode() . ' tidak diizinkan.', 405);
    }
}

// masukan() = isi permintaan sebagai array. JSON dibaca dari body; formulir biasa dari $_POST.
function masukan(): array
{
    static $cache = null;
    if ($cache !== null) return $cache;
    $tipe = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($tipe, 'application/json') !== false) {
        $mentah = file_get_contents('php://input');
        $data   = json_decode($mentah === false ? '' : $mentah, true);
        if (!is_array($data)) gagal('Isi permintaan bukan JSON yang valid.', 400);
        return $cache = $data;
    }
    return $cache = $_POST;
}

// Ambil teks bersih dari input (selalu string, spasi pinggir dibuang).
function teks(array $in, string $kunci): string
{
    $v = $in[$kunci] ?? '';
    return is_scalar($v) ? trim((string) $v) : '';
}

// ID dari ?id=12 harus bilangan bulat positif.
function id_query(): int
{
    $id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    return $id === false || $id === null ? 0 : $id;
}

function sekarang(): string
{
    return date('Y-m-d H:i:s');
}

// ------------------------------------------------------------------
// Login, role, dan CSRF
// ------------------------------------------------------------------

// user_sekarang() = data pengguna yang sedang login (dibaca ulang dari database
// supaya akun yang dinonaktifkan admin langsung tidak bisa dipakai), atau null.
function user_sekarang(): ?array
{
    static $u = false;
    if ($u !== false) return $u;
    if (empty($_SESSION['uid'])) return $u = null;
    $baris = q('SELECT id, nama, login_id, role, aktif, wajib_ganti_password FROM users WHERE id = ?', [$_SESSION['uid']])->fetch();
    if (!$baris || !(int) $baris['aktif']) {
        $_SESSION = [];
        return $u = null;
    }
    return $u = $baris;
}

// Wajib sudah login. Belum login = 401.
function wajib_login(): array
{
    $u = user_sekarang();
    if (!$u) gagal('Silakan login terlebih dahulu.', 401);
    return $u;
}

// Wajib login DAN role-nya termasuk yang diizinkan. Salah role = 403.
// Pemeriksaan ini dilakukan di SERVER, jadi tidak bisa dilewati dengan mengubah JavaScript.
function wajib_role(string ...$role): array
{
    $u = wajib_login();
    if (!in_array($u['role'], $role, true)) gagal('Anda tidak berhak mengakses data ini.', 403);
    return $u;
}

// Token CSRF dibuat saat login. Permintaan yang mengubah data wajib membawa
// header X-CSRF-Token yang sama, sehingga situs lain tidak bisa memalsukan permintaan.
function token_csrf(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function wajib_csrf(): void
{
    $kirim = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], $kirim)) {
        gagal('Token keamanan tidak valid. Muat ulang halaman lalu coba lagi.', 403);
    }
}

// Untuk aksi yang mengubah data: cek role + CSRF sekaligus (kalau bukan GET).
function penjaga(string ...$role): array
{
    $u = wajib_role(...$role);
    if (metode() !== 'GET') wajib_csrf();
    return $u;
}

// Kirim notifikasi ke satu pengguna.
function notifikasi(int $userId, string $pesan, ?string $tautan = null): void
{
    q('INSERT INTO notifikasi (user_id, pesan, tautan, created_at) VALUES (?, ?, ?, ?)',
      [$userId, mb_substr($pesan, 0, 255), $tautan, sekarang()]);
}

// Apakah exception ini karena data kembar (UNIQUE) / terikat foreign key?
function galat_kembar(PDOException $e): bool { return $e->getCode() === '23000' && str_contains($e->getMessage(), '1062'); }
function galat_terikat(PDOException $e): bool { return $e->getCode() === '23000' && str_contains($e->getMessage(), '1451'); }
