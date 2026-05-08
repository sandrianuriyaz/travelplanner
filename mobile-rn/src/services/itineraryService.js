import api from './api';

function pesanError(error, fallback) {
  const data = error.response?.data;
  if (data?.pesan) return data.pesan;
  if (error.code === 'ECONNABORTED') return 'Koneksi timeout. Pastikan server berjalan.';
  if (error.message === 'Network Error') return 'Tidak dapat terhubung ke server.';
  return fallback;
}

export async function generateItinerary({ duration, budget, startLat, startLng, city, category }) {
  try {
    const payload = {
      duration_days: duration,
      total_budget: budget,
      start_latitude: startLat,
      start_longitude: startLng,
      ...(city && { city_preference: city }),
      ...(category && { category_preference: category }),
    };
    const res = await api.post('/api/itinerary/generate', payload);
    return res.data;
  } catch (error) {
    throw pesanError(error, 'Gagal membuat itinerary. Coba lagi nanti.');
  }
}

export async function getItinerary(id) {
  try {
    const res = await api.get(`/api/itinerary/${id}`);
    return res.data;
  } catch (error) {
    throw pesanError(error, 'Gagal memuat detail itinerary.');
  }
}

export async function getRiwayat() {
  try {
    const res = await api.get('/api/itinerary/riwayat');
    return res.data.data;
  } catch (error) {
    throw pesanError(error, 'Gagal memuat riwayat perjalanan.');
  }
}

export async function deleteItinerary(id) {
  try {
    await api.delete(`/api/itinerary/${id}`);
  } catch (error) {
    throw pesanError(error, 'Gagal menghapus itinerary.');
  }
}

export async function getDaftarKota() {
  try {
    const res = await api.get('/api/destinasi/kota');
    return res.data.data;
  } catch (error) {
    return [];
  }
}
