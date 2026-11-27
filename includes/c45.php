<?php
// ==================================================================
// c45.php : algoritma Decision Tree C4.5 untuk atribut kategorikal.
// Dihitung di server supaya hasil seleksi dapat dipertanggungjawabkan.
// Atribut: ipk, penghasilan, tanggungan, daya. Kelas: Layak / Tidak Layak.
//
// Rumus yang dipakai:
//   Entropy(S)     = - jumlah( p_i * log2(p_i) )
//   Gain(S, A)     = Entropy(S) - jumlah( |S_v|/|S| * Entropy(S_v) )
//   SplitInfo(S,A) = - jumlah( |S_v|/|S| * log2(|S_v|/|S|) )
//   GainRatio      = Gain / SplitInfo
// Pada tiap simpul dipilih atribut ber-GainRatio terbesar di antara atribut
// yang Gain-nya minimal sama dengan rata-rata Gain (aturan C4.5 asli).
// ==================================================================

const C45_ATRIBUT = ['ipk', 'penghasilan', 'tanggungan', 'daya'];

// Entropy sekumpulan baris: seberapa "campur" kelasnya (0 = semua sama).
function c45_entropy(array $baris): float
{
    $n = count($baris);
    if ($n === 0) return 0.0;
    $hitung = [];
    foreach ($baris as $b) $hitung[$b['kelas']] = ($hitung[$b['kelas']] ?? 0) + 1;
    $e = 0.0;
    foreach ($hitung as $c) {
        $p = $c / $n;
        $e -= $p * log($p, 2);
    }
    return $e;
}

// Kelas yang paling banyak muncul.
function c45_mayoritas(array $baris): string
{
    $hitung = [];
    foreach ($baris as $b) $hitung[$b['kelas']] = ($hitung[$b['kelas']] ?? 0) + 1;
    arsort($hitung);
    return (string) array_key_first($hitung);
}

// Bagi baris menurut nilai atribut: ['Tinggi' => [...], 'Rendah' => [...]]
function c45_bagi(array $baris, string $atribut): array
{
    $grup = [];
    foreach ($baris as $b) $grup[$b[$atribut]][] = $b;
    return $grup;
}

// Gain, SplitInfo, dan GainRatio untuk satu atribut.
function c45_gain(array $baris, string $atribut): array
{
    $n    = count($baris);
    $sisa = 0.0;
    $info = 0.0;
    foreach (c45_bagi($baris, $atribut) as $g) {
        $p     = count($g) / $n;
        $sisa += $p * c45_entropy($g);
        $info -= $p * log($p, 2);
    }
    $gain = c45_entropy($baris) - $sisa;
    return [
        'gain'       => $gain,
        'split_info' => $info,
        'gain_ratio' => $info > 1e-12 ? $gain / $info : 0.0,
    ];
}

// Membangun pohon secara rekursif. Daun = ['daun'=>true, 'kelas'=>..., 'n'=>...].
function c45_bangun(array $baris, array $atribut, int $dalam = 0, int $maks = 6): array
{
    $mayor = c45_mayoritas($baris);
    $kelasUnik = count(array_unique(array_column($baris, 'kelas')));
    // Berhenti kalau semua baris sekelas, atribut habis, atau pohon sudah terlalu dalam.
    if ($kelasUnik <= 1 || count($atribut) === 0 || $dalam >= $maks) {
        return ['daun' => true, 'kelas' => $mayor, 'n' => count($baris)];
    }
    $hasil = [];
    foreach ($atribut as $a) $hasil[$a] = c45_gain($baris, $a);
    $rata = array_sum(array_column($hasil, 'gain')) / count($hasil);

    $terbaik = null;
    $gr = -1.0;
    foreach ($hasil as $a => $h) {
        if ($h['gain'] + 1e-12 >= $rata && $h['gain_ratio'] > $gr) {
            $gr = $h['gain_ratio'];
            $terbaik = $a;
        }
    }
    // Tidak ada atribut yang membantu memisahkan kelas: jadikan daun.
    if ($terbaik === null || $hasil[$terbaik]['gain'] <= 1e-12) {
        return ['daun' => true, 'kelas' => $mayor, 'n' => count($baris)];
    }
    $sisaAtribut = array_values(array_diff($atribut, [$terbaik]));
    $anak = [];
    foreach (c45_bagi($baris, $terbaik) as $nilai => $g) {
        $anak[$nilai] = c45_bangun($g, $sisaAtribut, $dalam + 1, $maks);
    }
    return ['daun' => false, 'atribut' => $terbaik, 'mayoritas' => $mayor, 'anak' => $anak, 'n' => count($baris)];
}

// Menebak kelas satu data dengan menelusuri pohon dari akar ke daun.
// Kalau nilai tidak dikenal pohon, pakai kelas mayoritas simpul itu.
function c45_prediksi(array $pohon, array $data): string
{
    while (empty($pohon['daun'])) {
        $nilai = $data[$pohon['atribut']] ?? null;
        if ($nilai === null || !isset($pohon['anak'][$nilai])) return (string) $pohon['mayoritas'];
        $pohon = $pohon['anak'][$nilai];
    }
    return (string) $pohon['kelas'];
}

// Mengubah pohon menjadi daftar aturan "JIKA ... MAKA ...".
function c45_aturan(array $pohon, array $jalur = []): array
{
    if (!empty($pohon['daun'])) {
        return [['jika' => $jalur, 'maka' => $pohon['kelas'], 'n' => $pohon['n']]];
    }
    $hasil = [];
    foreach ($pohon['anak'] as $nilai => $anak) {
        $hasil = array_merge($hasil, c45_aturan($anak, array_merge($jalur, [$pohon['atribut'] . ' = ' . $nilai])));
    }
    return $hasil;
}

// Akurasi = persentase tebakan yang cocok dengan label asli.
function c45_akurasi(array $pohon, array $uji): float
{
    if (count($uji) === 0) return 0.0;
    $benar = 0;
    foreach ($uji as $b) if (c45_prediksi($pohon, $b) === $b['kelas']) $benar++;
    return round($benar / count($uji) * 100, 2);
}

// Melatih model dari seluruh data latih.
// Kembalian: pohon, aturan, akurasi, dan tabel perhitungan di akar (untuk tab "Perhitungan").
// Akurasi dihitung dengan membagi data: setiap data ke-5 dijadikan data uji (20%),
// pohon uji dilatih dari 80% sisanya. Pohon FINAL dilatih ulang dari semua data.
function c45_latih(array $data): array
{
    $n = count($data);
    if ($n < 10) throw new InvalidArgumentException('Data latih minimal 10 baris.');
    if (count(array_unique(array_column($data, 'kelas'))) < 2) {
        throw new InvalidArgumentException('Data latih harus memuat kelas Layak dan Tidak Layak.');
    }
    $latih = [];
    $uji   = [];
    foreach ($data as $i => $b) {
        if ($i % 5 === 0) $uji[] = $b; else $latih[] = $b;
    }
    $pohonUji = c45_bangun($latih, C45_ATRIBUT);
    $akurasi  = c45_akurasi($pohonUji, $uji);

    $pohon = c45_bangun($data, C45_ATRIBUT);

    $akar = [];
    foreach (C45_ATRIBUT as $a) {
        $g = c45_gain($data, $a);
        $akar[] = ['atribut' => $a, 'gain' => round($g['gain'], 4), 'split_info' => round($g['split_info'], 4), 'gain_ratio' => round($g['gain_ratio'], 4)];
    }
    return [
        'pohon'       => $pohon,
        'aturan'      => c45_aturan($pohon),
        'akurasi'     => $akurasi,
        'perhitungan' => ['entropy_total' => round(c45_entropy($data), 4), 'jumlah_data' => $n, 'atribut_akar' => $akar],
    ];
}
