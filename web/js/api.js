const API_BASE = 'http://localhost:3000/api';

// ── Token Management ──────────────────────────────────────────────
const auth = {
  getToken: () => localStorage.getItem('tp_token'),
  getUser:  () => JSON.parse(localStorage.getItem('tp_user') || 'null'),
  setSession(token, user) {
    localStorage.setItem('tp_token', token);
    localStorage.setItem('tp_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_user');
  },
  isLoggedIn: () => !!localStorage.getItem('tp_token'),
  requireAuth() {
    if (!this.isLoggedIn()) window.location.href = 'login.html';
  },
  logout() {
    if (confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) {
      this.clearSession();
      window.location.href = 'login.html';
    }
  },
};

// ── Core Fetch Wrapper ────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = auth.getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  
  if (!res.ok) {
    if (isJson && data.pesan) throw new Error(data.pesan);
    throw new Error(`HTTP Error ${res.status}: Route tidak ditemukan atau server bermasalah.`);
  }
  return data;
}

// ── API Methods ───────────────────────────────────────────────────
const api = {
  auth: {
    login: (email, password) =>
      apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (username, email, password) =>
      apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  },
  destinasi: {
    semua: (kategori) =>
      apiFetch(kategori ? `/destinasi?kategori=${encodeURIComponent(kategori)}` : '/destinasi'),
    detail: (id) => apiFetch(`/destinasi/${id}`),
  },
  itinerary: {
    generate: (payload) =>
      apiFetch('/itinerary/generate', { method: 'POST', body: JSON.stringify(payload) }),
    get:     (id) => apiFetch(`/itinerary/${id}`),
    riwayat: ()   => apiFetch('/itinerary/riwayat'),
    hapus:   (id) => apiFetch(`/itinerary/${id}`, { method: 'DELETE' }),
  },
};

// ── UI Helpers ────────────────────────────────────────────────────
function formatRupiah(angka) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

function formatTanggal(isoString) {
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function showToast(pesan, tipe = 'sukses') {
  const bg = tipe === 'sukses' ? '#0d9488' : '#ef4444';
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed; bottom:24px; right:24px; z-index:9999; background:${bg}; color:#fff; padding:12px 24px; border-radius:16px; box-shadow:0 10px 25px rgba(0,0,0,0.2); font-size:14px; font-weight:600; font-family:'Inter', sans-serif; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity:0; transform:translateY(20px); pointer-events:none;`;
  toast.textContent = pesan;
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
