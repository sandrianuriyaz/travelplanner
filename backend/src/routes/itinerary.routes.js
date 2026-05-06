const express = require('express');
const router = express.Router();
const { generateItinerary, getItinerary, riwayatItinerary, hapusItinerary } = require('../controllers/itinerary.controller');
const { verifikasiToken } = require('../middleware/auth.middleware');

router.post('/generate',   verifikasiToken, generateItinerary);
router.get('/riwayat',     verifikasiToken, riwayatItinerary);
router.get('/:id',         verifikasiToken, getItinerary);
router.delete('/:id',      verifikasiToken, hapusItinerary);

module.exports = router;
