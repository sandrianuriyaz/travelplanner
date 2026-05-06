const prisma = require('../utils/prisma');

/**
 * GET /api/destinasi
 * Query params opsional: kategori, kota
 * Contoh: /api/destinasi?kota=Tasikmalaya&kategori=Cagar+Alam
 */
async function semuaDestinasi(req, res) {
  try {
    const { kategori, kota } = req.query;

    // Bangun filter secara dinamis
    const where = {};
    if (kategori) where.category = { contains: kategori, mode: 'insensitive' };
    if (kota)     where.city     = { contains: kota, mode: 'insensitive' };

    const destinasi = await prisma.destination.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ berhasil: true, jumlah: destinasi.length, data: destinasi });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil data destinasi.', error: err.message });
  }
}

/**
 * GET /api/destinasi/kota
 * Mengembalikan daftar semua kota unik yang tersedia di database.
 * Digunakan frontend untuk dropdown pemilihan kota awal.
 */
async function daftarKota(req, res) {
  try {
    const kota = await prisma.destination.findMany({
      select  : { city: true },
      distinct: ['city'],
      orderBy : { city: 'asc' },
    });

    res.json({ berhasil: true, data: kota.map((k) => k.city) });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil daftar kota.', error: err.message });
  }
}

/**
 * GET /api/destinasi/:id
 * Detail satu destinasi berdasarkan ID.
 */
async function detailDestinasi(req, res) {
  const { id } = req.params;
  try {
    const destinasi = await prisma.destination.findUnique({ where: { id: parseInt(id) } });
    if (!destinasi) {
      return res.status(404).json({ berhasil: false, pesan: 'Destinasi tidak ditemukan.' });
    }
    res.json({ berhasil: true, data: destinasi });
  } catch (err) {
    res.status(500).json({ berhasil: false, pesan: 'Gagal mengambil detail destinasi.', error: err.message });
  }
}

module.exports = { semuaDestinasi, daftarKota, detailDestinasi };
