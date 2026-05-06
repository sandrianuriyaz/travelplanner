const prisma = require('../utils/prisma');
const { hitungJarak } = require('../utils/haversine');

// ─── Konstanta Biaya ────────────────────────────────────────────────────────
const BIAYA_TRANSPORT_PER_KM = 2000; // Rp/km
const BIAYA_MAKAN             = 30000; // Rp per kunjungan destinasi

// ─── Peta Kota Tetangga (untuk fallback batasan wilayah) ────────────────────
// Digunakan saat destinasi di kota yang sama < MIN_DESTINASI_KOTA
const KOTA_TETANGGA = {
  'Tasikmalaya' : ['Ciamis', 'Garut', 'Pangandaran', 'Banjar'],
  'Ciamis'      : ['Tasikmalaya', 'Pangandaran', 'Banjar', 'Kuningan'],
  'Garut'       : ['Tasikmalaya', 'Bandung', 'Sumedang'],
  'Pangandaran' : ['Tasikmalaya', 'Ciamis'],
  'Banjar'      : ['Ciamis', 'Tasikmalaya'],
  'Bandung'     : ['Garut', 'Sumedang', 'Cianjur'],
};
const MIN_DESTINASI_KOTA = 3; // Ambang batas sebelum memperluas ke kota tetangga

/**
 * Menentukan kota terdekat dari koordinat titik awal berdasarkan
 * kolom `city` yang ada di database destinasi.
 * Digunakan untuk filter batasan wilayah (Aturan 6.2).
 */
function tentukanKotaTerdekat(semuaDestinasi, startLat, startLng) {
  // Hitung jarak rata-rata per kota, pilih kota dengan rata-rata terdekat
  const perKota = {};
  for (const d of semuaDestinasi) {
    if (!perKota[d.city]) perKota[d.city] = [];
    perKota[d.city].push(hitungJarak(startLat, startLng, d.latitude, d.longitude));
  }

  let kotaTerdekat = null;
  let jarakMinRataRata = Infinity;
  for (const [kota, jarak] of Object.entries(perKota)) {
    const rataRata = jarak.reduce((a, b) => a + b, 0) / jarak.length;
    if (rataRata < jarakMinRataRata) {
      jarakMinRataRata = rataRata;
      kotaTerdekat = kota;
    }
  }
  return kotaTerdekat;
}

/**
 * Filter destinasi berdasarkan kota (Aturan 6.2 — Batasan Wilayah Geografis).
 * Jika jumlah destinasi di kota yang sama < MIN_DESTINASI_KOTA,
 * maka diperluas ke kota-kota tetangga yang terdefinisi di KOTA_TETANGGA.
 *
 * @param {Array}  semuaDestinasi - Seluruh destinasi dari DB
 * @param {string} kota           - Nama kota titik awal
 * @returns {{ kandidat: Array, kotaAktif: string[], diperluas: boolean }}
 */
function filterWilayah(semuaDestinasi, kota) {
  const sekota = semuaDestinasi.filter(
    (d) => d.city.toLowerCase() === kota.toLowerCase()
  );

  if (sekota.length >= MIN_DESTINASI_KOTA) {
    return { kandidat: sekota, kotaAktif: [kota], diperluas: false };
  }

  // Fallback: tambahkan kota tetangga
  const tetangga = KOTA_TETANGGA[kota] || [];
  const kotaAktif = [kota, ...tetangga];
  const diperluas = semuaDestinasi.filter(
    (d) => kotaAktif.some((k) => k.toLowerCase() === d.city.toLowerCase())
  );

  return { kandidat: diperluas, kotaAktif, diperluas: true };
}

/**
 * Algoritma Greedy — memilih rute itinerary per hari.
 *
 * Aturan 6.1 (Round-Trip):
 *  - Rute DIMULAI dari titik awal (penginapan).
 *  - Setelah semua destinasi terpilih, dihitung biaya transport PULANG
 *    dari destinasi terakhir ke titik awal dan disertakan dalam total biaya harian.
 *
 * @param {Array}  kandidat     - Destinasi yang lolos filter wilayah
 * @param {number} startLat     - Latitude titik awal
 * @param {number} startLng     - Longitude titik awal
 * @param {number} budgetHarian - Budget per hari (sudah dikurangi estimasi biaya pulang)
 * @param {string|null} preferensi - Kategori wisata (opsional)
 * @returns {Array} destinasi terpilih beserta metadata biaya
 */
function algoritmaGreedy(kandidat, startLat, startLng, budgetHarian, preferensi) {
  // Filter preferensi kategori jika ada
  let pool = preferensi
    ? kandidat.filter((d) => d.category.toLowerCase() === preferensi.toLowerCase())
    : [...kandidat];

  let posisiLat  = startLat;
  let posisiLng  = startLng;
  let budgetSisa = budgetHarian;
  const terpilih  = [];
  const idTerpilih = new Set();

  while (pool.length > 0) {
    // Urutkan berdasarkan jarak terdekat dari posisi saat ini
    pool.sort((a, b) => {
      const dA = hitungJarak(posisiLat, posisiLng, a.latitude, a.longitude);
      const dB = hitungJarak(posisiLat, posisiLng, b.latitude, b.longitude);
      return dA - dB;
    });

    let dipilih = null;
    for (const dest of pool) {
      if (idTerpilih.has(dest.id)) continue;

      const jarakKe       = hitungJarak(posisiLat, posisiLng, dest.latitude, dest.longitude);
      const jarakPulang   = hitungJarak(dest.latitude, dest.longitude, startLat, startLng);
      const biayaTransportKe    = Math.round(jarakKe * BIAYA_TRANSPORT_PER_KM);
      const biayaTransportPulang = Math.round(jarakPulang * BIAYA_TRANSPORT_PER_KM);

      // Total biaya = tiket + transport ke destinasi + makan + transport pulang (sementara)
      // Biaya transport pulang hanya diperhitungkan jika ini adalah destinasi terakhir.
      // Untuk pemilihan greedy, kita estimasikan total termasuk biaya pulang agar budget tidak jebol.
      const totalBiayaEstimasi =
        dest.entrance_fee + biayaTransportKe + BIAYA_MAKAN + biayaTransportPulang;

      if (totalBiayaEstimasi <= budgetSisa) {
        dipilih = {
          ...dest,
          jarakKe,
          jarakPulang,
          biayaTransportKe,
          biayaTransportPulang,
          // Biaya kunjungan (tidak termasuk pulang — pulang dihitung terpisah di akhir)
          totalBiayaKunjungan: dest.entrance_fee + biayaTransportKe + BIAYA_MAKAN,
          totalBiayaEstimasi,
        };
        break;
      }
    }

    if (!dipilih) break; // Tidak ada destinasi terjangkau

    terpilih.push(dipilih);
    idTerpilih.add(dipilih.id);
    // Kurangi budget dengan biaya kunjungan SAJA (biaya pulang diperhitungkan saat loop berikutnya)
    budgetSisa -= dipilih.totalBiayaKunjungan;
    posisiLat   = dipilih.latitude;
    posisiLng   = dipilih.longitude;

    pool = pool.filter((d) => !idTerpilih.has(d.id));
  }

  return terpilih;
}

// ─── Endpoint: POST /api/itinerary/generate ─────────────────────────────────
async function generateItinerary(req, res) {
  const { durasi_hari, total_budget, starting_lat, starting_lng, preferensi, kota } = req.body;

  if (!durasi_hari || !total_budget || starting_lat === undefined || starting_lng === undefined) {
    return res.status(400).json({
      berhasil: false,
      pesan: 'Durasi hari, total budget, dan koordinat awal wajib diisi.',
    });
  }

  try {
    const semuaDestinasi = await prisma.destination.findMany();
    const budgetHarian   = Math.floor(total_budget / durasi_hari);

    // ── Aturan 6.2: Filter Wilayah Geografis ─────────────────────────────
    // Jika kota tidak disuplai, deteksi otomatis dari destinasi terdekat
    const kotaAwal = kota || tentukanKotaTerdekat(semuaDestinasi, starting_lat, starting_lng);
    const { kandidat: kandidatWilayah, kotaAktif, diperluas } = filterWilayah(semuaDestinasi, kotaAwal);

    const jadwal         = [];
    const idSudahDipilih = new Set();

    for (let hari = 1; hari <= durasi_hari; hari++) {
      const kandidatHariIni = kandidatWilayah.filter((d) => !idSudahDipilih.has(d.id));

      // ── Aturan 6.1 & 6.2: Greedy dengan Round-Trip + filter wilayah ─────
      const hasilGreedy = algoritmaGreedy(
        kandidatHariIni,
        starting_lat,
        starting_lng,
        budgetHarian,
        preferensi || null
      );

      // Hitung biaya pulang dari destinasi terakhir ke titik awal
      let biayaPulang = 0;
      let jarakPulang = 0;
      if (hasilGreedy.length > 0) {
        const terakhir = hasilGreedy[hasilGreedy.length - 1];
        jarakPulang  = hitungJarak(terakhir.latitude, terakhir.longitude, starting_lat, starting_lng);
        biayaPulang  = Math.round(jarakPulang * BIAYA_TRANSPORT_PER_KM);
      }

      let totalBiayaKunjungan = 0;
      const detailHari = hasilGreedy.map((dest, idx) => {
        idSudahDipilih.add(dest.id);
        totalBiayaKunjungan += dest.totalBiayaKunjungan;
        return {
          order_in_day  : idx + 1,
          destinationId : dest.id,
          estimated_cost: dest.totalBiayaKunjungan,
          destinasi: {
            nama              : dest.name,
            kategori          : dest.category,
            kota              : dest.city,
            latitude          : dest.latitude,
            longitude         : dest.longitude,
            harga_tiket       : dest.entrance_fee,
            jarak_dari_sebelumnya_km: Math.round(dest.jarakKe * 10) / 10,
            estimasi_transport: dest.biayaTransportKe,
          },
        };
      });

      // ── Aturan 6.1: Sertakan leg pulang ke titik awal dalam respons ───────
      const totalBiayaHari = totalBiayaKunjungan + biayaPulang;

      jadwal.push({
        hari,
        total_biaya_hari : totalBiayaHari,
        total_biaya_kunjungan: totalBiayaKunjungan,
        biaya_transport_pulang: biayaPulang,
        jarak_pulang_km: Math.round(jarakPulang * 10) / 10,
        destinasi: detailHari,
        // Leg pulang eksplisit untuk visualisasi polyline tertutup di peta
        rute_kembali: {
          dari: hasilGreedy.length > 0
            ? { lat: hasilGreedy[hasilGreedy.length - 1].latitude, lng: hasilGreedy[hasilGreedy.length - 1].longitude }
            : { lat: starting_lat, lng: starting_lng },
          ke  : { lat: starting_lat, lng: starting_lng },
          jarak_km: Math.round(jarakPulang * 10) / 10,
          estimasi_biaya: biayaPulang,
        },
      });
    }

    // Simpan ke database
    const itinerary = await prisma.itinerary.create({
      data: {
        userId      : req.user.id,
        total_budget,
        duration_days: durasi_hari,
        starting_lat,
        starting_lng,
        preference  : preferensi || null,
        details     : {
          create: jadwal.flatMap((h) =>
            h.destinasi.map((d) => ({
              day_number    : h.hari,
              destinationId : d.destinationId,
              order_in_day  : d.order_in_day,
              estimated_cost: d.estimated_cost,
            }))
          ),
        },
      },
      include: { details: { include: { destination: true } } },
    });

    res.status(201).json({
      berhasil: true,
      pesan   : 'Itinerary berhasil dibuat.',
      meta: {
        kota_awal     : kotaAwal,
        kota_aktif    : kotaAktif,
        diperluas_ke_tetangga: diperluas,
        total_kandidat_destinasi: kandidatWilayah.length,
      },
      data: {
        itinerary_id  : itinerary.id,
        total_budget,
        durasi_hari,
        budget_per_hari: budgetHarian,
        starting_lat,
        starting_lng,
        jadwal,
      },
    });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal membuat itinerary.', error: err.message });
  }
}

// ─── Endpoint: GET /api/itinerary/:id ───────────────────────────────────────
async function getItinerary(req, res) {
  const { id } = req.params;
  try {
    const itinerary = await prisma.itinerary.findUnique({
      where  : { id: parseInt(id) },
      include: {
        user   : { select: { username: true, email: true } },
        details: {
          orderBy: [{ day_number: 'asc' }, { order_in_day: 'asc' }],
          include: { destination: true },
        },
      },
    });

    if (!itinerary) {
      return res.status(404).json({ berhasil: false, pesan: 'Itinerary tidak ditemukan.' });
    }

    if (itinerary.userId !== req.user.id) {
      return res.status(403).json({ berhasil: false, pesan: 'Anda tidak berhak mengakses itinerary ini.' });
    }

    // Susun per hari + tambahkan info rute kembali (Round-Trip) untuk frontend
    const perHari = {};
    for (const detail of itinerary.details) {
      if (!perHari[detail.day_number]) perHari[detail.day_number] = [];
      perHari[detail.day_number].push(detail);
    }

    const jadwal = Object.entries(perHari).map(([hari, details]) => {
      const terakhir = details[details.length - 1];
      const jarakPulang = terakhir
        ? hitungJarak(
            terakhir.destination.latitude,
            terakhir.destination.longitude,
            itinerary.starting_lat,
            itinerary.starting_lng
          )
        : 0;

      return {
        hari     : parseInt(hari),
        destinasi: details,
        // Aturan 6.1: Sertakan leg pulang agar frontend bisa menggambar polyline tertutup
        rute_kembali: {
          dari: terakhir
            ? { lat: terakhir.destination.latitude, lng: terakhir.destination.longitude }
            : { lat: itinerary.starting_lat, lng: itinerary.starting_lng },
          ke  : { lat: itinerary.starting_lat, lng: itinerary.starting_lng },
          jarak_km: Math.round(jarakPulang * 10) / 10,
          estimasi_biaya: Math.round(jarakPulang * BIAYA_TRANSPORT_PER_KM),
        },
      };
    });

    res.json({
      berhasil: true,
      data    : {
        id            : itinerary.id,
        total_budget  : itinerary.total_budget,
        durasi_hari   : itinerary.duration_days,
        preferensi    : itinerary.preference,
        dibuat_pada   : itinerary.createdAt,
        starting_lat  : itinerary.starting_lat,
        starting_lng  : itinerary.starting_lng,
        pengguna      : itinerary.user,
        jadwal,
      },
    });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil itinerary.', error: err.message });
  }
}

// ─── Endpoint: GET /api/itinerary/riwayat ───────────────────────────────────
async function riwayatItinerary(req, res) {
  try {
    const itineraries = await prisma.itinerary.findMany({
      where  : { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        details: {
          include : { destination: { select: { name: true, category: true, city: true } } },
          orderBy : [{ day_number: 'asc' }, { order_in_day: 'asc' }],
        },
      },
    });

    res.json({ berhasil: true, jumlah: itineraries.length, data: itineraries });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil riwayat itinerary.', error: err.message });
  }
}

async function hapusItinerary(req, res) {
  const { id } = req.params;
  try {
    const itinerary = await prisma.itinerary.findUnique({ where: { id: parseInt(id) } });

    if (!itinerary)
      return res.status(404).json({ berhasil: false, pesan: 'Itinerary tidak ditemukan.' });

    if (itinerary.userId !== req.user.id)
      return res.status(403).json({ berhasil: false, pesan: 'Anda tidak berhak menghapus itinerary ini.' });

    // Cascade delete: detail → itinerary (sudah diatur di schema onDelete: Cascade)
    await prisma.itinerary.delete({ where: { id: parseInt(id) } });

    res.json({ berhasil: true, pesan: 'Itinerary berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal menghapus itinerary.', error: err.message });
  }
}

module.exports = { generateItinerary, getItinerary, riwayatItinerary, hapusItinerary };
