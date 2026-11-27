/* ==================================================================
   animasi.js : angka statistik di Dashboard "menghitung naik" dari 0 ke nilai aslinya.
   Setiap kali isi #main diganti (pindah halaman), angka pada .stat b yang berupa bilangan bulat dianimasikan.
   Dilewati kalau perangkat meminta gerakan dikurangi. Nilai akhir selalu sama persis dengan data aslinya.
   ================================================================== */
(function () {
  var main = document.getElementById('main');
  if (!main || !window.MutationObserver) return;
  var kurangi = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hitung(el, akhir) {
    var mulai = null, durasi = 800;
    function langkah(t) {
      if (mulai === null) mulai = t;
      var p = Math.min(1, (t - mulai) / durasi);
      var e = 1 - Math.pow(1 - p, 3);                 // melambat di akhir
      el.textContent = p < 1 ? String(Math.round(akhir * e)) : String(akhir);
      if (p < 1) requestAnimationFrame(langkah);
    }
    requestAnimationFrame(langkah);
  }

  new MutationObserver(function () {
    if (kurangi) return;
    var angka = main.querySelectorAll('.stat b');
    for (var i = 0; i < angka.length; i++) {
      var teks = angka[i].textContent.trim();
      if (/^\d{1,7}$/.test(teks) && +teks > 0) { var n = +teks; angka[i].textContent = '0'; hitung(angka[i], n); }
    }
  }).observe(main, { childList: true });          // hanya pergantian isi #main, bukan perubahan angkanya sendiri

  /* ---------- Confetti saat hasil DITERIMA ---------- */
  var terakhir = 0;
  function confetti(el) {
    if (Date.now() - terakhir < 4000) return;       // jangan berulang kalau halaman digambar ulang berdekatan
    terakhir = Date.now();
    var r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    var warna = ['#16a34a', '#facc15', '#38bdf8', '#f472b6', '#fb923c', '#a78bfa'];
    var wadah = document.createElement('div');
    wadah.setAttribute('aria-hidden', 'true');
    wadah.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:50;overflow:hidden';
    for (var i = 0; i < 56; i++) {
      var p = document.createElement('i'), w = 6 + Math.random() * 6;
      p.style.cssText = 'position:absolute;left:' + x0 + 'px;top:' + y0 + 'px;width:' + w + 'px;height:' + (w * 1.6) + 'px;border-radius:2px;background:' + warna[i % warna.length];
      wadah.appendChild(p);
      var sudut = Math.random() * Math.PI * 2, jarak = 120 + Math.random() * 260, dx = Math.cos(sudut) * jarak, dy = Math.sin(sudut) * jarak - 80;
      p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (Math.random() * 540) + 'deg)', opacity: 1, offset: .55 },
        { transform: 'translate(' + (dx * 1.2) + 'px,' + (dy + 260) + 'px) rotate(' + (Math.random() * 900) + 'deg)', opacity: 0 }
      ], { duration: 1500 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.3,1)', delay: Math.random() * 150, fill: 'forwards' });
    }
    document.body.appendChild(wadah);
    setTimeout(function () { wadah.remove(); }, 2800);
  }

  /* ---------- Pohon keputusan: tergambar baris demi baris ---------- */
  function gambarPohon() {
    var t = main.querySelector('.tree');
    if (!t || t.offsetParent === null || t.querySelector('.ln')) return;   // hanya yang sedang tampil dan belum diproses
    var baris = t.textContent.split('\n');
    t.textContent = '';
    baris.forEach(function (b, i) {
      var s = document.createElement('span'); s.className = 'ln'; s.textContent = b === '' ? ' ' : b;
      s.style.animationDelay = Math.min(i * 90, 1800) + 'ms'; t.appendChild(s);
    });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#tb button')) setTimeout(function () { if (!kurangi) gambarPohon(); }, 30);
  });

  /* ---------- Akurasi model menghitung naik ---------- */
  function akurasiNaik(el) {
    var m = el.textContent.match(/^(.*Akurasi )(\d+(?:[.,]\d+)?)(%.*)$/);
    if (!m) return;
    var asli = el.textContent, nilai = parseFloat(m[2].replace(',', '.')), des = (m[2].split(/[.,]/)[1] || '').length, sep = m[2].indexOf(',') >= 0 ? ',' : '.';
    var mulai = null;
    (function langkah(t) {
      if (mulai === null) mulai = t;
      var p = Math.min(1, (t - mulai) / 900), e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? m[1] + (nilai * e).toFixed(des).replace('.', sep) + m[3] : asli;
      if (p < 1) requestAnimationFrame(langkah);
    })(performance.now());
  }

  if (!kurangi) {
    new MutationObserver(function () {
      var h = main.querySelector('.hasil-ok'); if (h) confetti(h);
      var mb = main.querySelector('#mb'); if (mb) akurasiNaik(mb);
    }).observe(main, { childList: true });
  }
})();
