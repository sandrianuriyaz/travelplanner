/**
 * controllers/itineraryController.js
 *
 * Controller utama untuk fitur pembuatan itinerary otomatis.
 * Mengimplementasikan Algoritma Greedy dengan dua aturan wajib:
 *
 *  ● Aturan 6.1 — Rute Siklus Tertutup (Round-Trip):
 *      Rute WAJIB diakhiri dengan kembali ke titik awal setiap harinya.
 *      Biaya & waktu kembali disertakan dalam kalkulasi harian.
 *
 *  ● Aturan 6.2 — Batasan Wilayah Geografis (Geographic Boundary Filter):
 *      Kandidat destinasi difilter berdasarkan kota yang sama dengan titik awal.
 *      Fallback ke kota tetangga jika destinasi sekota < MIN_DESTINASI_KOTA.
 */

'use strict';

const prisma = require('../utils/prisma');
const {
  hitungJarak,
  estimasiWaktuTempuh,
  estimasiBiayaTransport,
  hitungMetrikPerjalanan,
} = require('../utils/distance');

// ─── Konstanta ────────────────────────────────────────────────────────────────
const BIAYA_MAKAN_HARIAN_DEFAULT = 100000; // Fallback jika tidak ada data restoran
const MENIT_HARI_MIN      = 8 * 60;  // 480 menit = batas lunak (8 jam wisata)
const MENIT_HARI_MAX      = 10 * 60; // 600 menit = batas keras (10 jam wisata)
const MENIT_ISTIRAHAT     = 30;      // Estimasi istirahat/transisi per destinasi
const MIN_DESTINASI_KOTA  = 3;       // Fallback ke kota tetangga jika < nilai ini

// Peta kota tetangga (Aturan 6.2 — fallback wilayah)
const KOTA_TETANGGA = {
  Tasikmalaya : ['Ciamis', 'Garut', 'Pangandaran', 'Banjar'],
  Ciamis      : ['Tasikmalaya', 'Pangandaran', 'Banjar', 'Kuningan'],
  Garut       : ['Tasikmalaya', 'Bandung', 'Sumedang'],
  Pangandaran : ['Tasikmalaya', 'Ciamis'],
  Banjar      : ['Ciamis', 'Tasikmalaya'],
  Bandung     : ['Garut', 'Sumedang', 'Cianjur'],
  Jakarta     : ['Bogor', 'Bekasi', 'Tangerang', 'Depok'],
  Surabaya    : ['Sidoarjo', 'Gresik', 'Mojokerto'],
};

// ─── Helper: Filter Wilayah (Aturan 6.2) ─────────────────────────────────────

/**
 * Memfilter kandidat destinasi berdasarkan kota.
 * Jika destinasi di kota yang sama kurang dari MIN_DESTINASI_KOTA,
 * diperluas ke kota-kota tetangga.
 *
 * @param {Array}  semuaDestinasi - Seluruh destinasi dari DB
 * @param {string} kota           - Nama kota titik awal / city_preference
 * @returns {{ kandidat: Array, kotaAktif: string[], diperluas: boolean }}
 */
function filterWilayah(semuaDestinasi, kota) {
  const normKota = kota.trim().toLowerCase();

  const sekota = semuaDestinasi.filter(
    (d) => d.city.toLowerCase() === normKota
  );

  if (sekota.length >= MIN_DESTINASI_KOTA) {
    return { kandidat: sekota, kotaAktif: [kota], diperluas: false };
  }

  // Fallback: gabungkan dengan kota tetangga
  const tetangga = (KOTA_TETANGGA[kota] || []).map((k) => k.toLowerCase());
  const kotaAktif = [kota, ...(KOTA_TETANGGA[kota] || [])];

  const diperluas = semuaDestinasi.filter(
    (d) =>
      d.city.toLowerCase() === normKota ||
      tetangga.includes(d.city.toLowerCase())
  );

  return { kandidat: diperluas, kotaAktif, diperluas: true };
}

/**
 * Mendeteksi kota terdekat dari koordinat secara otomatis
 * apabila city_preference tidak disuplai.
 *
 * @param {Array}  destinasi
 * @param {number} lat
 * @param {number} lng
 * @returns {string} Nama kota terdekat
 */
function deteksiKotaTerdekat(destinasi, lat, lng) {
  const perKota = {};
  for (const d of destinasi) {
    if (!perKota[d.city]) perKota[d.city] = [];
    perKota[d.city].push(hitungJarak(lat, lng, d.latitude, d.longitude));
  }

  let kotaTerdekat   = null;
  let minRataRata    = Infinity;
  for (const [kota, jarakArr] of Object.entries(perKota)) {
    const rataRata = jarakArr.reduce((a, b) => a + b, 0) / jarakArr.length;
    if (rataRata < minRataRata) {
      minRataRata  = rataRata;
      kotaTerdekat = kota;
    }
  }
  return kotaTerdekat;
}

// ─── Algoritma Greedy ─────────────────────────────────────────────────────────

/**
 * Fungsi inti Algoritma Greedy untuk menyusun rute 1 hari.
 *
 * Strategi pemilihan:
 *  1. Dari posisi saat ini, cari destinasi terdekat yang BELUM dikunjungi.
 *  2. Pastikan menambahkan destinasi tersebut masih dalam batas BUDGET dan WAKTU harian.
 *     - Budget: tiket + transport ke sana + makan + transport pulang ke hotel
 *     - Waktu : waktu di destinasi + waktu tempuh ke sana + waktu tempuh pulang
 *  3. Ulangi sampai tidak ada destinasi lagi yang terjangkau.
 *  4. Aturan 6.1: Selalu tambahkan "leg pulang" ke titik awal sebagai penutup.
 *
 * @param {Array}       kandidat     - Destinasi yang lolos filter wilayah
 * @param {number}      startLat     - Latitude hotel/titik awal
 * @param {number}      startLng     - Longitude hotel/titik awal
 * @param {number}      budgetHarian - Budget per hari (Rp)
 * @param {Set}         idDikunjungi - Set ID yang sudah dikunjungi hari sebelumnya
 * @returns {Object} { destinasiTerpilih, biayaPulang, menitPulang, jarakPulangKm }
 */
function jalankanGreedy(kandidat, startLat, startLng, budgetHarian, idDikunjungi) {
  let posLat     = startLat;
  let posLng     = startLng;
  let budgetSisa = budgetHarian;
  let menitSisa  = MENIT_HARI_MAX;

  const terpilih    = [];
  const idHariIni   = new Set();

  // Pool: destinasi yang belum pernah dikunjungi
  let pool = kandidat.filter((d) => !idDikunjungi.has(d.id));

  while (pool.length > 0) {
    // Urutkan pool: destinasi terdekat dari posisi saat ini
    pool.sort((a, b) => {
      const dA = hitungJarak(posLat, posLng, a.latitude, a.longitude);
      const dB = hitungJarak(posLat, posLng, b.latitude, b.longitude);
      return dA - dB;
    });

    let dipilih = null;

    for (const dest of pool) {
      if (idHariIni.has(dest.id)) continue;

      // ── Kalkulasi pergi ──────────────────────────────────────────────────
      const pergi           = hitungMetrikPerjalanan(posLat, posLng, dest.latitude, dest.longitude);
      const biayaTransportKe = pergi.biaya_transport;
      const menitKe          = pergi.waktu_tempuh_menit;
      const menitDiDestinasi = dest.average_duration_spent; // dari DB (menit)

      // ── Kalkulasi pulang dari destinasi ini ke hotel ─────────────────────
      const pulang            = hitungMetrikPerjalanan(dest.latitude, dest.longitude, startLat, startLng);
      const biayaTransportPulang = pulang.biaya_transport;
      const menitPulang          = pulang.waktu_tempuh_menit;

      // ── Total biaya & waktu jika memilih destinasi ini ───────────────────
      const totalBiayaKunjungan  = dest.entrance_fee + biayaTransportKe; // BIAYA_MAKAN_HARIAN sudah dipotong di awal
      // Estimasi total (kunjungan + biaya pulang) agar budget tidak jebol
      const totalBiayaEstimasi   = totalBiayaKunjungan + biayaTransportPulang;

      // Total waktu: tempuh ke + waktu di destinasi + istirahat + tempuh pulang (untuk cek feasibility)
      const totalMenitEstimasi   = menitKe + menitDiDestinasi + MENIT_ISTIRAHAT + menitPulang;

      // ── Cek feasibility budget DAN waktu ────────────────────────────────
      if (totalBiayaEstimasi <= budgetSisa && totalMenitEstimasi <= menitSisa) {
        dipilih = {
          ...dest,
          // Metrik pergi
          jarak_km          : pergi.jarak_km,
          waktu_tempuh_menit: menitKe,
          biaya_transport_ke : biayaTransportKe,
          // Biaya kunjungan (tidak termasuk pulang)
          biaya_kunjungan   : totalBiayaKunjungan,
          // Metrik pulang (disimpan untuk kalkulasi leg pulang akhir hari)
          _jarak_pulang_km  : pulang.jarak_km,
          _biaya_pulang     : biayaTransportPulang,
          _menit_pulang     : menitPulang,
        };
        break;
      }
    }

    if (!dipilih) break; // Tidak ada lagi yang feasible

    terpilih.push(dipilih);
    idHariIni.add(dipilih.id);

    // Update posisi & budget: kurangi biaya kunjungan saja (bukan pulang)
    budgetSisa -= dipilih.biaya_kunjungan;
    // Update waktu: kurangi tempuh ke + durasi di destinasi + istirahat
    menitSisa  -= (dipilih.waktu_tempuh_menit + dipilih.average_duration_spent + MENIT_ISTIRAHAT);

    posLat = dipilih.latitude;
    posLng = dipilih.longitude;

    pool = pool.filter((d) => !idHariIni.has(d.id));
  }

  // ── Aturan 6.1: Kalkulasi leg pulang dari destinasi terakhir ke hotel ────
  let biayaPulang = 0;
  let menitPulang = 0;
  let jarakPulangKm = 0;

  if (terpilih.length > 0) {
    const terakhir   = terpilih[terpilih.length - 1];
    biayaPulang   = terakhir._biaya_pulang;
    menitPulang   = terakhir._menit_pulang;
    jarakPulangKm = terakhir._jarak_pulang_km;
  }

  return { destinasiTerpilih: terpilih, biayaPulang, menitPulang, jarakPulangKm };
}

// ─── Endpoint: POST /api/itinerary/generate ───────────────────────────────────

/**
 * Menerima payload, menjalankan Greedy, menyimpan ke DB, dan mengembalikan
 * struktur itinerary lengkap per hari beserta sisa budget.
 *
 * Payload yang diterima:
 * {
 *   "total_budget"    : 500000,
 *   "duration_days"   : 2,
 *   "start_latitude"  : -7.3274,
 *   "start_longitude" : 108.2207,
 *   "city_preference" : "Tasikmalaya"   // opsional; auto-detect jika tidak diisi
 * }
 */
async function generateItinerary(req, res) {
  const { total_budget, duration_days, start_latitude, start_longitude, city_preference, category_preference } = req.body;

  console.log('[generateItinerary] Payload diterima:', req.body);
  // ── Validasi input ────────────────────────────────────────────────────────
  if (!total_budget || !duration_days || start_latitude == null || start_longitude == null) {
    console.error('[generateItinerary] Error 400: Validasi gagal.', { total_budget, duration_days, start_latitude, start_longitude });
    return res.status(400).json({
      berhasil: false,
      pesan   : 'Field wajib: total_budget, duration_days, start_latitude, start_longitude.',
    });
  }
  if (total_budget <= 0 || duration_days <= 0) {
    return res.status(400).json({
      berhasil: false,
      pesan   : 'total_budget dan duration_days harus bernilai positif.',
    });
  }

  try {
    // ── Ambil semua destinasi dari DB ─────────────────────────────────────
    const semuaDestinasi = await prisma.destination.findMany();
    if (semuaDestinasi.length === 0) {
      return res.status(404).json({ berhasil: false, pesan: 'Belum ada data destinasi di database.' });
    }

    // ── Aturan 6.2: Tentukan kota & filter kandidat ───────────────────────
    const kotaAwal = city_preference || deteksiKotaTerdekat(semuaDestinasi, start_latitude, start_longitude);
    const { kandidat: kandidatKota, kotaAktif, diperluas } = filterWilayah(semuaDestinasi, kotaAwal);

    // ── Filter tambahan berdasarkan kategori jika ada ─────────────────────
    const kandidat = category_preference
      ? kandidatKota.filter(d => d.category === category_preference)
      : kandidatKota;

    if (kandidat.length === 0) {
      return res.status(404).json({
        berhasil: false,
        pesan   : category_preference
          ? `Tidak ada destinasi kategori "${category_preference}" di sekitar lokasi Anda.`
          : `Tidak ada destinasi yang tersedia di kota: ${kotaAwal}.`,
      });
    }

    // ── Cari hotel termurah di kota ───────────────────────────────────────
    // Cari di kota yang sama, fallback ke estimasi default
    const kotaList = [kotaAwal, ...(kotaAktif || [])];
    let hotelTerpilih = null;
    for (const kota of kotaList) {
      hotelTerpilih = await prisma.hotel.findFirst({
        where: { city: { contains: kota, mode: 'insensitive' }, price_per_night: { gt: 0 } },
        orderBy: { price_per_night: 'asc' },
      });
      if (hotelTerpilih) break;
    }
    const biayaHotelPerMalam = hotelTerpilih ? hotelTerpilih.price_per_night : 200000;
    const biayaHotelTotal    = biayaHotelPerMalam * duration_days;

    // ── Cari rata-rata biaya makan dari data restoran ─────────────────────
    let biayaMakanHarian = BIAYA_MAKAN_HARIAN_DEFAULT;
    for (const kota of kotaList) {
      const restaurants = await prisma.restaurant.findMany({
        where: { city: { contains: kota, mode: 'insensitive' } },
        select: { avg_cost_for_two: true },
      });
      if (restaurants.length > 0) {
        const avgCostForTwo = restaurants.reduce((s, r) => s + r.avg_cost_for_two, 0) / restaurants.length;
        // Per orang per makan = avg_cost_for_two / 2
        // 3 kali makan sehari
        biayaMakanHarian = Math.round((avgCostForTwo / 2) * 3);
        break;
      }
    }
    const biayaMakanTotal = biayaMakanHarian * duration_days;

    // ── Budget tersisa untuk wisata (transport + tiket) ───────────────────
    const budgetWisataTotal  = Math.max(0, total_budget - biayaHotelTotal - biayaMakanTotal);
    const budgetHarian       = Math.floor(budgetWisataTotal / duration_days);

    const jadwal         = [];
    const idSudahDipilih = new Set();
    let   budgetTerpakai = biayaHotelTotal + biayaMakanTotal; // sudah termasuk hotel & makan

    // ── Loop per hari ─────────────────────────────────────────────────────
    for (let hari = 1; hari <= duration_days; hari++) {

      // Posisi awal setiap hari = hotel (titik awal)
      const { destinasiTerpilih, biayaPulang, menitPulang, jarakPulangKm } =
        jalankanGreedy(kandidat, start_latitude, start_longitude, budgetHarian, idSudahDipilih);

      // Hitung total waktu & biaya hari ini
      let totalMenitHari      = 0;
      let totalBiayaKunjungan = 0; // Hanya wisata (tiket + transport ke dest)

      const detailDestinasi = destinasiTerpilih.map((dest, idx) => {
        idSudahDipilih.add(dest.id);
        totalBiayaKunjungan += dest.biaya_kunjungan;
        totalMenitHari      += dest.waktu_tempuh_menit + dest.average_duration_spent + MENIT_ISTIRAHAT;

        return {
          urutan           : idx + 1,
          destinationId    : dest.id,
          estimated_cost   : dest.biaya_kunjungan,
          nama             : dest.name,
          kategori         : dest.category,
          kota             : dest.city,
          latitude         : dest.latitude,
          longitude        : dest.longitude,
          harga_tiket      : dest.entrance_fee,
          durasi_kunjungan_menit: dest.average_duration_spent,
          jarak_dari_sebelumnya_km: dest.jarak_km,
          waktu_tempuh_menit      : dest.waktu_tempuh_menit,
          estimasi_transport      : dest.biaya_transport_ke,
        };
      });

      // Total biaya hari = wisata (tiket + transport ke) + transport pulang
      // (makan & hotel sudah dihitung terpisah di budgetTerpakai awal)
      const totalBiayaWisataHari = totalBiayaKunjungan + biayaPulang;
      const totalBiayaHari = totalBiayaWisataHari + biayaMakanHarian;
      totalMenitHari      += menitPulang;
      budgetTerpakai      += totalBiayaWisataHari; // makan sudah di-init

      jadwal.push({
        hari,
        total_biaya_hari        : totalBiayaHari,
        total_biaya_kunjungan   : totalBiayaKunjungan,
        biaya_transport_pulang  : biayaPulang,
        total_waktu_menit       : totalMenitHari,
        total_waktu_jam         : Math.round((totalMenitHari / 60) * 10) / 10,
        // ─ Aturan 6.1: informasi rute kembali eksplisit untuk visualisasi peta ─
        rute_kembali: {
          dari: destinasiTerpilih.length > 0
            ? { lat: destinasiTerpilih[destinasiTerpilih.length - 1].latitude,
                lng: destinasiTerpilih[destinasiTerpilih.length - 1].longitude }
            : { lat: start_latitude, lng: start_longitude },
          ke          : { lat: start_latitude, lng: start_longitude },
          jarak_km    : jarakPulangKm,
          estimasi_biaya: biayaPulang,
          waktu_tempuh_menit: menitPulang,
        },
        destinasi: detailDestinasi,
      });
    }

    // ── Validasi: jangan simpan jika tidak ada destinasi sama sekali ─────
    const totalDestinasi = jadwal.reduce((sum, h) => sum + h.destinasi.length, 0);
    if (totalDestinasi === 0) {
      return res.status(404).json({
        berhasil: false,
        pesan: category_preference
          ? `Tidak ada destinasi kategori "${category_preference}" yang terjangkau dengan budget Rp ${total_budget.toLocaleString('id-ID')} di sekitar lokasi Anda. Coba tambah budget atau pilih kategori lain.`
          : `Tidak ada destinasi yang terjangkau dengan budget tersebut di sekitar lokasi Anda. Coba tambah budget.`,
      });
    }

    // ── Simpan ke database ────────────────────────────────────────────────
    const itinerary = await prisma.itinerary.create({
      data: {
        userId       : req.user.id,
        total_budget,
        duration_days,
        starting_lat : start_latitude,
        starting_lng : start_longitude,
        preference   : city_preference || kotaAwal,
        details: {
          create: jadwal.flatMap((h) =>
            h.destinasi.map((d) => ({
              day_number    : h.hari,
              destinationId : d.destinationId,
              order_in_day  : d.urutan,
              estimated_cost: d.estimated_cost,
            }))
          ),
        },
      },
      include: {
        details: {
          orderBy: [{ day_number: 'asc' }, { order_in_day: 'asc' }],
          include: { destination: true },
        },
      },
    });

    // ── Respons ───────────────────────────────────────────────────────────
    return res.status(201).json({
      berhasil: true,
      pesan   : 'Itinerary berhasil dibuat.',
      meta: {
        kota_awal                : kotaAwal,
        kota_aktif               : kotaAktif,
        diperluas_ke_tetangga    : diperluas,
        total_kandidat_destinasi : kandidat.length,
        batas_waktu_per_hari     : `${MENIT_HARI_MIN / 60}–${MENIT_HARI_MAX / 60} jam`,
      },
      data: {
        itinerary_id  : itinerary.id,
        total_budget,
        budget_wisata_per_hari: budgetHarian,
        duration_days,
        start_latitude,
        start_longitude,
        total_biaya_terpakai: budgetTerpakai,
        sisa_budget         : total_budget - budgetTerpakai,
        // ── Rincian biaya real ────────────────────────────────────────────
        rincian_biaya: {
          hotel: {
            nama            : hotelTerpilih ? hotelTerpilih.name : 'Estimasi penginapan',
            kota            : hotelTerpilih ? hotelTerpilih.city : kotaAwal,
            bintang         : hotelTerpilih ? hotelTerpilih.star_rating : 2,
            harga_per_malam : biayaHotelPerMalam,
            total           : biayaHotelTotal,
            sumber          : hotelTerpilih ? (hotelTerpilih.source || 'data') : 'estimasi',
          },
          makan: {
            harga_per_hari  : biayaMakanHarian,
            total           : biayaMakanTotal,
            sumber          : biayaMakanHarian !== BIAYA_MAKAN_HARIAN_DEFAULT ? 'data_restoran' : 'estimasi',
          },
          wisata: {
            total: budgetTerpakai - biayaHotelTotal - biayaMakanTotal,
          },
        },
        jadwal,
      },
    });

  } catch (err) {
    console.error('[generateItinerary] Error:', err);
    return res.status(500).json({
      berhasil: false,
      pesan   : 'Gagal membuat itinerary. Silakan coba lagi.',
      error   : err.message,
    });
  }
}

// ─── Endpoint: GET /api/itinerary/:id ────────────────────────────────────────

async function getItineraryById(req, res) {
  const { id } = req.params;
  const parsed  = parseInt(id);

  if (isNaN(parsed)) {
    return res.status(400).json({ berhasil: false, pesan: 'ID itinerary tidak valid.' });
  }

  try {
    const itinerary = await prisma.itinerary.findUnique({
      where  : { id: parsed },
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
      return res.status(403).json({ berhasil: false, pesan: 'Akses ditolak. Bukan itinerary milik Anda.' });
    }

    // Susun ulang per hari + tambahkan data rute kembali (Aturan 6.1)
    const perHari = {};
    for (const detail of itinerary.details) {
      if (!perHari[detail.day_number]) perHari[detail.day_number] = [];
      perHari[detail.day_number].push(detail);
    }

    const jadwal = Object.entries(perHari).map(([hari, details]) => {
      const terakhir = details[details.length - 1];
      const pulang   = terakhir
        ? hitungMetrikPerjalanan(
            terakhir.destination.latitude, terakhir.destination.longitude,
            itinerary.starting_lat, itinerary.starting_lng
          )
        : { jarak_km: 0, waktu_tempuh_menit: 0, biaya_transport: 0 };

      return {
        hari     : parseInt(hari),
        destinasi: details.map((d) => ({
          urutan        : d.order_in_day,
          nama          : d.destination.name,
          kategori      : d.destination.category,
          kota          : d.destination.city,
          latitude      : d.destination.latitude,
          longitude     : d.destination.longitude,
          estimated_cost: d.estimated_cost,
        })),
        rute_kembali: {
          dari: terakhir
            ? { lat: terakhir.destination.latitude, lng: terakhir.destination.longitude }
            : { lat: itinerary.starting_lat, lng: itinerary.starting_lng },
          ke            : { lat: itinerary.starting_lat, lng: itinerary.starting_lng },
          jarak_km      : pulang.jarak_km,
          estimasi_biaya: pulang.biaya_transport,
          waktu_tempuh_menit: pulang.waktu_tempuh_menit,
        },
      };
    });

    return res.json({
      berhasil: true,
      data    : {
        id            : itinerary.id,
        total_budget  : itinerary.total_budget,
        duration_days : itinerary.duration_days,
        preferensi    : itinerary.preference,
        start_latitude: itinerary.starting_lat,
        start_longitude: itinerary.starting_lng,
        dibuat_pada   : itinerary.createdAt,
        pengguna      : itinerary.user,
        jadwal,
      },
    });
  } catch (err) {
    return res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil itinerary.', error: err.message });
  }
}

// ─── Endpoint: GET /api/itinerary/riwayat ────────────────────────────────────

async function getRiwayat(req, res) {
  try {
    const list = await prisma.itinerary.findMany({
      where  : { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        details: {
          include : { destination: { select: { name: true, category: true, city: true } } },
          orderBy : [{ day_number: 'asc' }, { order_in_day: 'asc' }],
          take    : 3, // Preview singkat per itinerary
        },
      },
    });

    return res.json({ berhasil: true, jumlah: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil riwayat.', error: err.message });
  }
}

// ─── Endpoint: DELETE /api/itinerary/:id ─────────────────────────────────────

async function deleteItinerary(req, res) {
  console.log('[DELETE] Request diterima untuk ID:', req.params.id);
  const { id } = req.params;
  const parsed  = parseInt(id);

  if (isNaN(parsed)) {
    return res.status(400).json({ berhasil: false, pesan: 'ID tidak valid.' });
  }

  try {
    const existing = await prisma.itinerary.findUnique({ where: { id: parsed } });
    if (!existing) return res.status(404).json({ berhasil: false, pesan: 'Itinerary tidak ditemukan.' });
    if (existing.userId !== req.user.id) return res.status(403).json({ berhasil: false, pesan: 'Akses ditolak.' });

    await prisma.itinerary.delete({ where: { id: parsed } });
    return res.json({ berhasil: true, pesan: 'Itinerary berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ berhasil: false, pesan: 'Gagal menghapus itinerary.', error: err.message });
  }
}

module.exports = { generateItinerary, getItineraryById, getRiwayat, deleteItinerary };
