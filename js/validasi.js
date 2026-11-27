/* =====================================================================
   validasi.js : pusat semua aturan pengecekan form SIPAKAT-KIP
   ---------------------------------------------------------------------
   Aturannya satu: setiap fungsi mengembalikan TEKS PESAN kalau ada yang
   salah, dan TEKS KOSONG ('') kalau semuanya benar.
   Pemanggil (saveU, saveNP, dst) tinggal memeriksa:
        var m = VAL.user(...);
        if (m) { tampilkan pesan m; return; }   // berhenti, jangan simpan
   Berkas ini harus dimuat SETELAH data.js dan helpers.js, dan SEBELUM
   berkas halaman (pages-*.js). Variabel global UL, PL, ACC, OPT dibaca
   saat fungsi dipanggil, jadi selalu memakai data terbaru.
   ===================================================================== */
var VAL = (function () {

  /* ---------- pemeriksa kecil yang bisa dipakai di mana saja ---------- */

  // Teks wajib diisi (tidak boleh kosong atau hanya spasi).
  function wajib(teks, namaKolom) {
    return String(teks == null ? '' : teks).trim() ? '' : namaKolom + ' wajib diisi.';
  }

  // Format email: ada teks, lalu @, lalu teks, lalu titik, lalu akhiran minimal 2 huruf.
  // Contoh benar: budi@unkhair.ac.id   Contoh salah: budi, budi@, a@b., a@b.c
  function email(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? '' : 'Format email tidak valid.';
  }

  // Password minimal 8 karakter.
  function password(p) {
    return p.length >= 8 ? '' : 'Password minimal 8 karakter.';
  }

  // Apakah NIM/email ini sudah dipakai? Dicek ke daftar pengguna (UL), akun
  // hasil registrasi (ACC), dan akun demo (DEMO). "boleh" adalah nilai milik
  // pengguna yang sedang diubah, supaya tidak dianggap kembar dengan dirinya sendiri.
  function sudahAda(e, boleh) {
    e = String(e).toLowerCase();
    boleh = boleh ? String(boleh).toLowerCase() : null;
    if (e === boleh) return false;
    var di = [];
    if (typeof UL !== 'undefined')  UL.forEach(function (u) { di.push(String(u[1]).toLowerCase()); });
    if (typeof ACC !== 'undefined') ACC.forEach(function (a) { di.push(String(a[0]).toLowerCase()); });
    if (typeof DEMO === 'function') DEMO().forEach(function (d) { di.push(String(d[1]).toLowerCase()); });
    return di.indexOf(e) >= 0;
  }

  /* ---------- form Kelola pengguna (tambah dan ubah) ---------- */
  // opsi.role         : peran yang dipilih. Mahasiswa boleh memakai NIM, peran lain wajib email.
  // opsi.skip         : nomor pengguna yang sedang diubah (untuk mode ubah), diabaikan saat cek kembar.
  // opsi.pwOptional   : true kalau password boleh dikosongkan (mode ubah: berarti tidak diganti).
  function user(nama, e, p, opsi) {
    opsi = opsi || {};
    var m = wajib(nama, 'Nama');
    if (m) return m;
    if (!String(e).trim()) return 'Email / NIM wajib diisi.';
    if (opsi.role !== 'Mahasiswa') { m = email(e); if (m) return m; }
    var milikSendiri = (opsi.skip != null && opsi.skip >= 0 && UL[opsi.skip]) ? UL[opsi.skip][1] : null;
    if (sudahAda(e, milikSendiri)) return 'Email / NIM sudah terdaftar.';
    if (opsi.pwOptional && !p) return '';
    return password(p);
  }

  /* ---------- form Periode (buat dan ubah) ---------- */
  // skip: nomor periode yang sedang diubah (-1 kalau membuat baru).
  function periode(nama, buka, tutup, kuota, skip) {
    if (!nama) return 'Nama periode wajib diisi.';
    if (!buka || !tutup) return 'Tanggal buka dan tutup wajib diisi.';
    if (tutup <= buka) return 'Tanggal tutup harus setelah tanggal buka.';  // format YYYY-MM-DD bisa dibandingkan sebagai teks
    if (!(kuota > 0)) return 'Kuota harus berupa angka lebih dari 0.';
    var kembar = PL.some(function (x, i) { return i != skip && x[0].toLowerCase() == nama.toLowerCase(); });
    return kembar ? 'Nama periode sudah ada.' : '';
  }

  /* ---------- satu baris data latih (form tambah/ubah dan impor CSV) ----------
     r = [ipk, penghasilan, tanggungan, daya, kelas, keterangan] */
  function dataLatih(r) {
    var kunci = ['ipk', 'peng', 'tang', 'daya', 'kelas'];
    var nama  = ['IPK', 'Penghasilan', 'Tanggungan', 'Daya', 'Kelas'];
    for (var i = 0; i < 5; i++) {
      if (OPT[kunci[i]].indexOf(r[i]) < 0) return nama[i] + ' (' + (r[i] || 'kosong') + ') tidak valid';
    }
    if (OPT.ket.indexOf(r[5]) < 0) return 'Keterangan label kosong atau tidak dikenal';
    // aturan silang: Layak harus berketerangan "Memenuhi...", dan sebaliknya
    if ((r[4] == 'Layak') != (r[5].indexOf('Memenuhi') == 0)) return 'Keterangan label tidak sesuai dengan kelas';
    return '';
  }

  /* ---------- form pendaftaran mahasiswa, per langkah ----------
     langkah 1 = data diri, langkah 2 = data kriteria. F = data form. */
  function pendaftaran(langkah, F) {
    if (langkah == 1) {
      if (!F.n) return 'Nama lengkap wajib diisi.';
      if (!/^\d{8,14}$/.test(F.nim || '')) return 'NIM harus 8–14 angka.';
      if (!/^08\d{8,12}$/.test(F.hp.replace(/[-\s]/g, ''))) return 'No. HP tidak valid (contoh 08123456789).';
      if (!F.al) return 'Alamat wajib diisi.';
    }
    if (langkah == 2) {
      var ipk = parseFloat(F.ipk);
      if (!(ipk >= 0 && ipk <= 4)) return 'IPK harus antara 0 dan 4.';
      if (!/^\d+$/.test(F.tg)) return 'Jumlah tanggungan harus angka 0 atau lebih.';
    }
    return '';
  }

  /* ---------- registrasi akun mahasiswa ---------- */
  function registrasi(nama, nim, em, p, konfirmasi) {
    if (!nama) return 'Nama lengkap wajib diisi.';
    if (!/^\d{8,14}$/.test(nim)) return 'NIM harus 8–14 angka.';
    var m = email(em); if (m) return m;
    m = password(p); if (m) return m;
    if (p !== konfirmasi) return 'Konfirmasi password tidak sama.';
    if (sudahAda(nim) || sudahAda(em)) return 'NIM atau email sudah terdaftar.';
    return '';
  }

  // Yang boleh dipanggil dari berkas lain:
  return { wajib: wajib, email: email, password: password, sudahAda: sudahAda,
           user: user, periode: periode, dataLatih: dataLatih,
           pendaftaran: pendaftaran, registrasi: registrasi };
})();
