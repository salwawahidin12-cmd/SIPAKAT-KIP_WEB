/* PENYIMPANAN SEMENTARA antar halaman (sessionStorage): data contoh tetap ada saat pindah login.html -> app.html */
// ==================================================================
// storage.js : menyimpan dan memuat data contoh.
// Setiap kali pindah halaman (login.html -> app.html), semua variabel JavaScript
// kembali kosong. Maka data contoh disimpan dulu ke sessionStorage (memori browser
// yang hilang saat tab ditutup), lalu dibaca lagi oleh halaman berikutnya.
// Catatan: variabel UL, PL, DL, dst. didefinisikan di data.js dan pages-extra.js.
// ==================================================================
//
// save(): menyimpan semua data contoh ke sessionStorage dengan kunci 'sipDat'.
// Dipanggil saat login (start), logout, ubah kata sandi, dan saat halaman akan ditutup (pagehide).
function save() {
  try {
    // JSON.stringify mengubah objek menjadi teks karena sessionStorage hanya bisa menyimpan teks.
    // Isinya: UL pengguna, PL periode, DL data latih, VL daftar verifikasi, KL hasil klasifikasi,
    // ACC akun hasil registrasi, PWD kata sandi demo, F data form pendaftaran, NT notifikasi.
    sessionStorage.setItem('sipDat',JSON.stringify({UL:UL,PL:PL,DL:DL,VL:VL,KL:KL,ACC:ACC,PWD:PWD,F:F,NT:NT}))
  } catch (e) {}   // gagal (misalnya penyimpanan penuh atau diblokir) diabaikan saja, aplikasi tetap jalan dengan data bawaan
}

// load(): kebalikan save(). Membaca data dari sessionStorage dan mengembalikannya ke variabel global.
// Dipanggil sekali di awal oleh main.js.
function load() {
  try {
    // Ambil teks yang tersimpan lalu ubah kembali menjadi objek. Kalau belum ada, hasilnya null.
    var o=JSON.parse(sessionStorage.getItem('sipDat')||'null');
    if(!o)return;   // belum pernah disimpan (kunjungan pertama): pakai data bawaan dari data.js
    // timpa data bawaan dengan data yang tersimpan
    UL=o.UL;PL=o.PL;DL=o.DL;VL=o.VL;KL=o.KL;ACC=o.ACC;PWD=o.PWD;F=o.F;NT=o.NT
  } catch (e) {}   // data rusak atau tidak terbaca: abaikan, pakai data bawaan
}

// Simpan otomatis saat halaman akan ditinggalkan (pindah halaman, tutup tab, atau muat ulang).
window.addEventListener('pagehide',save);
