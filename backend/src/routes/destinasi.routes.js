const express = require('express');
const router  = express.Router();
const { semuaDestinasi, daftarKota, detailDestinasi } = require('../controllers/destinasi.controller');
const { verifikasiToken } = require('../middleware/auth.middleware');

// PENTING: Route statis (/kota) harus didaftarkan SEBELUM route dinamis (/:id)
// agar Express tidak menafsirkan "kota" sebagai nilai :id
router.get('/',      verifikasiToken, semuaDestinasi);   // GET /api/destinasi?kota=Tasikmalaya&kategori=Bahari
router.get('/kota',  verifikasiToken, daftarKota);       // GET /api/destinasi/kota
router.get('/:id',   verifikasiToken, detailDestinasi);  // GET /api/destinasi/:id

module.exports = router;
