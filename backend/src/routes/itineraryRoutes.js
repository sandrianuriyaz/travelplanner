/**
 * routes/itineraryRoutes.js
 * Routing untuk endpoint itinerary.
 */

const express = require('express');
const router = express.Router();
const {
  generateItinerary,
  getItineraryById,
  getRiwayat,
  deleteItinerary,
} = require('../controllers/itineraryController');

// Asumsi middleware autentikasi sudah ada di middleware/auth.middleware.js
const { verifikasiToken } = require('../middleware/auth.middleware');

// Terapkan middleware token ke semua route itinerary
router.use(verifikasiToken);

// ─── Endpoints ─────────────────────────────────────────────────────────────
// PERHATIAN: Route statis harus di atas route dinamis (/:id)

// Generate rute (Greedy)
router.post('/generate', generateItinerary);

// Riwayat itinerary milik user yang login
router.get('/riwayat', getRiwayat);

// Ambil detail itinerary berdasarkan ID
router.get('/:id', getItineraryById);

// Hapus itinerary berdasarkan ID
router.delete('/:id', deleteItinerary);

module.exports = router;
