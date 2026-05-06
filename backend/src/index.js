require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const itineraryRoutes = require('./routes/itineraryRoutes'); // Ganti ke file route yang baru
const destinasiRoutes = require('./routes/destinasi.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/destinasi', destinasiRoutes);

// Garansi explicit route untuk delete itinerary
app.delete('/api/itinerary/:id', require('./middleware/auth.middleware').verifikasiToken, require('./controllers/itineraryController').deleteItinerary);

// Health check
app.get('/', (req, res) => {
  res.json({ pesan: 'Travel Planner API berjalan dengan baik ✅', versi: '1.0.0' });
});

// Handler error global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ berhasil: false, pesan: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

// nodemon restart trigger
