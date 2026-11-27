-- =====================================================================
-- sipakat_kip.sql : skema database SIPAKAT-KIP (MySQL 5.7+ / MariaDB 10.3+)
-- Cara pakai:  mysql -u root -p < database/sipakat_kip.sql
-- Lalu buat akun demo (password di-hash PHP):  php database/seed.php
-- =====================================================================
CREATE DATABASE IF NOT EXISTS sipakat_kip
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sipakat_kip;

-- Hapus tabel lama (urutan dari tabel anak ke tabel induk karena ada foreign key).
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS login_gagal, reset_password, notifikasi, model_c45, data_latih,
                     berkas, pendaftaran, periode, mahasiswa, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. users : semua akun (mahasiswa, admin, petugas). Password HANYA disimpan
--    dalam bentuk hash (bcrypt lewat password_hash PHP), tidak pernah teks asli.
--    login_id = email (admin/petugas) atau NIM (mahasiswa), huruf kecil.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama                  VARCHAR(100) NOT NULL,
  login_id              VARCHAR(100) NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  role                  ENUM('mhs','adm','ptg') NOT NULL,
  aktif                 TINYINT(1) NOT NULL DEFAULT 1,
  wajib_ganti_password  TINYINT(1) NOT NULL DEFAULT 0,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_login (login_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. mahasiswa : profil tambahan khusus role mhs (relasi 1-1 ke users).
--    Mahasiswa boleh login memakai NIM atau email.
-- ---------------------------------------------------------------------
CREATE TABLE mahasiswa (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED NOT NULL,
  nim            VARCHAR(14)  NOT NULL,
  email          VARCHAR(100) NULL,
  program_studi  VARCHAR(50)  NOT NULL DEFAULT 'Informatika',
  PRIMARY KEY (id),
  UNIQUE KEY uq_mhs_user (user_id),
  UNIQUE KEY uq_mhs_nim (nim),
  UNIQUE KEY uq_mhs_email (email),
  CONSTRAINT fk_mhs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. periode : periode pendaftaran. Hanya SATU periode boleh aktif.
--    Aturan itu dijaga di database: kolom aktif_unik bernilai 1 kalau aktif
--    dan NULL kalau tidak, lalu diberi UNIQUE. Dua periode aktif -> ditolak MySQL.
-- ---------------------------------------------------------------------
CREATE TABLE periode (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama       VARCHAR(60) NOT NULL,
  tgl_buka   DATE NOT NULL,
  tgl_tutup  DATE NOT NULL,
  kuota      SMALLINT UNSIGNED NOT NULL,
  aktif      TINYINT(1) NOT NULL DEFAULT 0,
  aktif_unik TINYINT(1) GENERATED ALWAYS AS (IF(aktif = 1, 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_periode_nama (nama),
  UNIQUE KEY uq_periode_aktif (aktif_unik),
  CONSTRAINT ck_periode_tanggal CHECK (tgl_tutup > tgl_buka),
  CONSTRAINT ck_periode_kuota CHECK (kuota > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. pendaftaran : satu mahasiswa maksimal satu pendaftaran per periode.
--    status: draft = belum dikirim, wait = menunggu verifikasi,
--            ver = terverifikasi, ret = perlu perbaikan (dikembalikan petugas)
--    rekomendasi = hasil klasifikasi C4.5, keputusan = keputusan akhir petugas.
-- ---------------------------------------------------------------------
CREATE TABLE pendaftaran (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  periode_id      INT UNSIGNED NOT NULL,
  nama            VARCHAR(100) NOT NULL,
  nim             VARCHAR(14)  NOT NULL,
  program_studi   VARCHAR(50)  NOT NULL,
  semester        TINYINT UNSIGNED NULL,
  no_hp           VARCHAR(15)  NULL,
  alamat          TEXT NULL,
  ipk             DECIMAL(3,2) NULL,
  penghasilan     ENUM('Rendah','Sedang','Tinggi') NULL,
  tanggungan      TINYINT UNSIGNED NULL,
  daya            ENUM('450 VA','900 VA','1300 VA','2200 VA') NULL,
  status          ENUM('draft','wait','ver','ret') NOT NULL DEFAULT 'draft',
  catatan_petugas TEXT NULL,
  verifikator_id  INT UNSIGNED NULL,
  rekomendasi     ENUM('Layak','Tidak Layak') NULL,
  keputusan       ENUM('Diterima','Layak (kuota penuh)','Tidak Layak') NULL,
  tgl_kirim       DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_daftar_user_periode (user_id, periode_id),
  KEY idx_daftar_status (periode_id, status),
  CONSTRAINT fk_daftar_user    FOREIGN KEY (user_id)        REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_daftar_periode FOREIGN KEY (periode_id)     REFERENCES periode(id) ON DELETE RESTRICT,
  CONSTRAINT fk_daftar_verif   FOREIGN KEY (verifikator_id) REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT ck_daftar_ipk CHECK (ipk IS NULL OR (ipk >= 0 AND ipk <= 4))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. berkas : berkas unggahan pendaftaran (ktp, slip, lis, trn). Satu jenis
--    hanya boleh satu berkas per pendaftaran (unggah ulang = mengganti).
--    nama_file = nama acak di server; nama_asli = nama dari komputer pengguna.
-- ---------------------------------------------------------------------
CREATE TABLE berkas (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pendaftaran_id INT UNSIGNED NOT NULL,
  jenis          ENUM('ktp','slip','lis','trn') NOT NULL,
  nama_asli      VARCHAR(150) NOT NULL,
  nama_file      VARCHAR(80)  NOT NULL,
  mime           VARCHAR(50)  NOT NULL,
  ukuran         INT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_berkas_jenis (pendaftaran_id, jenis),
  CONSTRAINT fk_berkas_daftar FOREIGN KEY (pendaftaran_id) REFERENCES pendaftaran(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. data_latih : data tahun lalu berlabel Layak / Tidak Layak untuk C4.5.
-- ---------------------------------------------------------------------
CREATE TABLE data_latih (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ipk         ENUM('Tinggi','Sedang','Rendah') NOT NULL,
  penghasilan ENUM('Rendah','Sedang','Tinggi') NOT NULL,
  tanggungan  ENUM('Sedikit','Sedang','Banyak') NOT NULL,
  daya        ENUM('450 VA','900 VA','1300 VA','2200 VA') NOT NULL,
  kelas       ENUM('Layak','Tidak Layak') NOT NULL,
  keterangan  VARCHAR(60) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. model_c45 : riwayat model hasil pelatihan. Model terbaru = id terbesar.
--    pohon/aturan/perhitungan disimpan sebagai JSON.
-- ---------------------------------------------------------------------
CREATE TABLE model_c45 (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  dilatih_pada  DATETIME NOT NULL,
  dilatih_oleh  INT UNSIGNED NULL,
  jumlah_data   INT UNSIGNED NOT NULL,
  akurasi       DECIMAL(5,2) NOT NULL,
  pohon         LONGTEXT NOT NULL,
  aturan        LONGTEXT NOT NULL,
  perhitungan   LONGTEXT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_model_user FOREIGN KEY (dilatih_oleh) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. notifikasi : pesan untuk pengguna (lonceng di bilah atas).
-- ---------------------------------------------------------------------
CREATE TABLE notifikasi (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  pesan      VARCHAR(255) NOT NULL,
  tautan     VARCHAR(30) NULL,
  dibaca     TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id, dibaca),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. reset_password : kode verifikasi lupa password. Yang disimpan HASH kode,
--    berlaku 10 menit, maksimal 5 kali salah.
-- ---------------------------------------------------------------------
CREATE TABLE reset_password (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  kode_hash   VARCHAR(255) NOT NULL,
  kedaluwarsa DATETIME NOT NULL,
  percobaan   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  dipakai     TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_reset_user (user_id),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. login_gagal : catatan login gagal untuk membatasi tebak-tebakan password
--     (5 kali gagal dalam 15 menit = akun/NIM itu dikunci sementara).
-- ---------------------------------------------------------------------
CREATE TABLE login_gagal (
  id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  login_id VARCHAR(100) NOT NULL,
  ip       VARCHAR(45) NOT NULL,
  waktu    DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_gagal (login_id, waktu)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Data awal: dua periode dan 48 data latih contoh.
-- Periode 2026 aktif, buka 1 Okt - tutup 30 Nov 2026, kuota 120.
-- ---------------------------------------------------------------------
INSERT INTO periode (nama, tgl_buka, tgl_tutup, kuota, aktif) VALUES
  ('KIP-K 2025', '2025-10-01', '2025-11-30', 100, 0),
  ('KIP-K 2026', '2026-10-01', '2026-11-30', 120, 1);

INSERT INTO data_latih (ipk, penghasilan, tanggungan, daya, kelas, keterangan) VALUES
('Rendah','Sedang','Banyak','450 VA','Layak','Memenuhi kriteria'),
('Tinggi','Tinggi','Banyak','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Banyak','900 VA','Layak','Memenuhi kriteria'),
('Tinggi','Sedang','Banyak','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Rendah','Sedikit','450 VA','Layak','Memenuhi kriteria'),
('Rendah','Tinggi','Sedikit','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Tinggi','Sedang','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedang','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Rendah','Sedang','1300 VA','Layak','Memenuhi kriteria'),
('Tinggi','Sedang','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Banyak','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Rendah','Sedang','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedang','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Tinggi','Sedikit','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Rendah','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Tinggi','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Tinggi','Banyak','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedikit','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Rendah','Banyak','2200 VA','Layak','Memenuhi kriteria'),
('Tinggi','Rendah','Sedikit','900 VA','Layak','Memenuhi kriteria'),
('Tinggi','Tinggi','Sedikit','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Sedikit','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Rendah','Banyak','1300 VA','Layak','Memenuhi kriteria'),
('Rendah','Tinggi','Sedang','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Rendah','Sedikit','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Sedang','Sedang','450 VA','Layak','Memenuhi kriteria'),
('Sedang','Sedang','Sedang','450 VA','Layak','Memenuhi kriteria'),
('Tinggi','Rendah','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Banyak','450 VA','Layak','Memenuhi kriteria'),
('Rendah','Tinggi','Sedang','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Rendah','Sedang','900 VA','Layak','Memenuhi kriteria'),
('Tinggi','Sedang','Banyak','900 VA','Layak','Memenuhi kriteria'),
('Sedang','Sedang','Sedikit','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Tinggi','Banyak','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Tinggi','Sedikit','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedikit','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Sedikit','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Sedang','Sedang','450 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Tinggi','Sedang','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Rendah','Tinggi','Banyak','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Sedang','Banyak','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Sedang','Rendah','Banyak','450 VA','Layak','Memenuhi kriteria'),
('Sedang','Tinggi','Sedikit','1300 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Tinggi','Sedang','900 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Sedang','Banyak','450 VA','Layak','Memenuhi kriteria'),
('Rendah','Sedang','Banyak','2200 VA','Tidak Layak','Tidak memenuhi kriteria'),
('Tinggi','Tinggi','Banyak','1300 VA','Tidak Layak','Tidak memenuhi kriteria');
