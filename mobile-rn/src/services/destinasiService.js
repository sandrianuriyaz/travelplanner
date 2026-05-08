import api from './api';

export async function getAllDestinasi(kota = '', kategori = '') {
  try {
    const params = new URLSearchParams();
    if (kota) params.append('kota', kota);
    if (kategori) params.append('kategori', kategori);
    const query = params.toString() ? `?${params}` : '';
    const res = await api.get(`/api/destinasi${query}`);
    return res.data.data || [];
  } catch {
    return [];
  }
}

export async function getDaftarKota() {
  try {
    const res = await api.get('/api/destinasi/kota');
    return res.data.data || [];
  } catch {
    return [];
  }
}
