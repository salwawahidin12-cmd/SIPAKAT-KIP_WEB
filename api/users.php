<?php
// ==================================================================
// /api/users.php : CRUD pengguna. HANYA Admin.
//   GET    ?q=kata&role=adm|ptg|mhs  -> daftar (Read)
//   POST   {nama, login, role, password, aktif}  -> tambah (Create)
//   PUT    ?id=5 {nama, login, role, aktif, password?} -> ubah (Update); password kosong = tidak diganti
//   DELETE ?id=5 -> hapus (Delete)
// ==================================================================
require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/validator.php';
izinkan('GET', 'POST', 'PUT', 'DELETE');
$admin = penjaga('adm');   // wajib login sebagai admin + CSRF untuk selain GET

// ---------- READ ----------
if (metode() === 'GET') {
    $sql = 'SELECT u.id, u.nama, u.login_id, u.role, u.aktif, u.created_at, m.nim, m.email
            FROM users u LEFT JOIN mahasiswa m ON m.user_id = u.id WHERE 1 = 1';
    $par = [];
    $role = teks($_GET, 'role');
    if ($role !== '') {
        if (!isset(ROLE_NAMA[$role])) gagal('Role tidak dikenal.', 422);
        $sql .= ' AND u.role = ?';
        $par[] = $role;
    }
    $kata = teks($_GET, 'q');
    if ($kata !== '') {
        // Karakter % dan _ pada kata cari di-escape agar dianggap huruf biasa, bukan wildcard.
        $like = '%' . addcslashes($kata, '%_\\') . '%';
        $sql .= ' AND (u.nama LIKE ? OR u.login_id LIKE ? OR m.email LIKE ?)';
        array_push($par, $like, $like, $like);
    }
    $sql .= ' ORDER BY u.id';
    $data = q($sql, $par)->fetchAll();
    foreach ($data as &$d) { $d['aktif'] = (bool) $d['aktif']; $d['role_nama'] = ROLE_NAMA[$d['role']]; }
    keluar(['ok' => true, 'data' => $data]);
}

// ---------- CREATE ----------
$in    = masukan();
$nama  = teks($in, 'nama');
$login = strtolower(teks($in, 'login'));
$role  = teks($in, 'role');
$pass  = is_string($in['password'] ?? null) ? $in['password'] : '';
$aktif = !empty($in['aktif']) ? 1 : 0;

if (metode() === 'POST') {
    if ($m = v_user($nama, $login, $pass, $role)) gagal($m, 422);
    $pdo = db();
    try {
        $pdo->beginTransaction();
        // Akun buatan admin memakai password sementara: pengguna wajib menggantinya saat login pertama.
        q('INSERT INTO users (nama, login_id, password_hash, role, aktif, wajib_ganti_password) VALUES (?, ?, ?, ?, ?, 1)',
          [$nama, $login, password_hash($pass, PASSWORD_DEFAULT), $role, $aktif]);
        $id = (int) $pdo->lastInsertId();
        if ($role === 'mhs') q('INSERT INTO mahasiswa (user_id, nim) VALUES (?, ?)', [$id, $login]);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if (galat_kembar($e)) gagal('Email / NIM sudah terdaftar.', 409);
        throw $e;
    }
    keluar(['ok' => true, 'id' => $id, 'pesan' => 'Pengguna ditambahkan: ' . $nama], 201);
}

// ---------- UPDATE dan DELETE butuh ?id= ----------
$id = id_query();
if (!$id) gagal('Parameter id wajib.', 422);
$lama = q('SELECT id, role FROM users WHERE id = ?', [$id])->fetch();
if (!$lama) gagal('Pengguna tidak ditemukan.', 404);

if (metode() === 'PUT') {
    if ($m = v_user($nama, $login, $pass, $role, $id, true)) gagal($m, 422);
    // Aturan bisnis: admin tidak boleh menonaktifkan atau menurunkan role dirinya sendiri (agar tidak terkunci).
    if ($id === (int) $admin['id'] && (!$aktif || $role !== 'adm')) gagal('Anda tidak dapat menonaktifkan atau mengubah role akun sendiri.', 422);
    if ($lama['role'] !== $role && ($lama['role'] === 'mhs' || $role === 'mhs')) gagal('Role Mahasiswa tidak dapat diubah dari/ke role lain.', 422);

    $pdo = db();
    try {
        $pdo->beginTransaction();
        q('UPDATE users SET nama = ?, login_id = ?, role = ?, aktif = ? WHERE id = ?', [$nama, $login, $role, $aktif, $id]);
        if ($pass !== '') q('UPDATE users SET password_hash = ?, wajib_ganti_password = 1 WHERE id = ?', [password_hash($pass, PASSWORD_DEFAULT), $id]);
        if ($role === 'mhs') q('UPDATE mahasiswa SET nim = ? WHERE user_id = ?', [$login, $id]);
        $pdo->commit();
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if (galat_kembar($e)) gagal('Email / NIM sudah terdaftar.', 409);
        throw $e;
    }
    keluar(['ok' => true, 'pesan' => 'Data pengguna diperbarui']);
}

// DELETE
if ($id === (int) $admin['id']) gagal('Anda tidak dapat menghapus akun sendiri.', 422);
q('DELETE FROM users WHERE id = ?', [$id]);   // data terkait ikut terhapus lewat ON DELETE CASCADE
keluar(['ok' => true, 'pesan' => 'Data dihapus']);
