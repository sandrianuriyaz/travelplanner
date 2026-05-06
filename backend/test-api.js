#!/usr/bin/env node
/**
 * test-api.js — Script pengujian otomatis semua endpoint backend
 * Jalankan: node test-api.js
 * Pastikan server sudah berjalan di port 3000.
 */

const BASE_URL = 'http://localhost:3000';
let token = '';

async function req(method, path, body, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

function log(label, status, data) {
  const icon = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`\n${icon} [${status}] ${label}`);
  if (typeof data === 'object') {
    const preview = JSON.stringify(data, null, 2).split('\n').slice(0, 20).join('\n');
    console.log(preview + (JSON.stringify(data, null, 2).split('\n').length > 20 ? '\n  ... (terpotong)' : ''));
  }
}

async function main() {
  console.log('🧪 Mulai pengujian Travel Planner API\n' + '='.repeat(50));

  // ─── 1. Health Check ─────────────────────────────────────────────────────
  const health = await req('GET', '/');
  log('Health Check', health.status, health.body);

  // ─── 2. Register (mungkin sudah ada, expected 409) ───────────────────────
  const register = await req('POST', '/api/auth/register', {
    username: 'tester_uas',
    email: 'tester@uas.test',
    password: 'password123',
  });
  log('Register user baru', register.status, register.body);

  // ─── 3. Login ────────────────────────────────────────────────────────────
  const login = await req('POST', '/api/auth/login', {
    email: 'demo@travelplanner.id',
    password: 'password123',
  });
  log('Login user demo', login.status, { pesan: login.body.pesan, tokenPreview: login.body.token?.slice(0, 40) + '...' });

  if (!login.body.token) {
    console.error('\n❌ GAGAL: Tidak dapat mengambil token. Hentikan pengujian.');
    process.exit(1);
  }
  token = login.body.token;

  // ─── 4. Daftar Kota ──────────────────────────────────────────────────────
  const kota = await req('GET', '/api/destinasi/kota', null, true);
  log('Daftar Kota (Aturan 6.2)', kota.status, { jumlah_kota: kota.body.data?.length, kota: kota.body.data });

  // ─── 5. Filter Destinasi per Kota ────────────────────────────────────────
  const destTsm = await req('GET', '/api/destinasi?kota=Tasikmalaya', null, true);
  log('Destinasi Tasikmalaya', destTsm.status, {
    jumlah: destTsm.body.jumlah,
    contoh: destTsm.body.data?.slice(0, 3).map(d => `${d.name} (${d.city})`),
  });

  // ─── 6. Filter Destinasi per Kota + Kategori ─────────────────────────────
  const destBdg = await req('GET', '/api/destinasi?kota=Bandung&kategori=Cagar+Alam', null, true);
  log('Destinasi Bandung + Cagar Alam', destBdg.status, {
    jumlah: destBdg.body.jumlah,
    contoh: destBdg.body.data?.slice(0, 3).map(d => `${d.name} (${d.city})`),
  });

  // ─── 7. Generate Itinerary (Aturan 6.1 + 6.2) ────────────────────────────
  // Koordinat: sekitar pusat kota Tasikmalaya
  const generate = await req('POST', '/api/itinerary/generate', {
    durasi_hari : 2,
    total_budget: 500000,
    starting_lat: -7.3274,
    starting_lng: 108.2207,
    preferensi  : null,
    kota        : 'Tasikmalaya',
  }, true);

  log('Generate Itinerary (Greedy + Round-Trip + Geo-Filter)', generate.status, {
    meta               : generate.body.meta,
    itinerary_id       : generate.body.data?.itinerary_id,
    budget_per_hari    : generate.body.data?.budget_per_hari,
    hari_1_destinasi   : generate.body.data?.jadwal?.[0]?.destinasi?.map(d => d.destinasi?.nama),
    hari_1_biaya_total : generate.body.data?.jadwal?.[0]?.total_biaya_hari,
    hari_1_biaya_pulang: generate.body.data?.jadwal?.[0]?.biaya_transport_pulang,
    hari_1_rute_kembali: generate.body.data?.jadwal?.[0]?.rute_kembali,
  });

  const itineraryId = generate.body.data?.itinerary_id;

  // ─── 8. GET Itinerary by ID ───────────────────────────────────────────────
  if (itineraryId) {
    const getItin = await req('GET', `/api/itinerary/${itineraryId}`, null, true);
    log(`GET Itinerary #${itineraryId}`, getItin.status, {
      durasi_hari  : getItin.body.data?.durasi_hari,
      starting_lat : getItin.body.data?.starting_lat,
      starting_lng : getItin.body.data?.starting_lng,
      hari_1_rute_kembali: getItin.body.data?.jadwal?.[0]?.rute_kembali,
    });
  }

  // ─── 9. Riwayat Itinerary ────────────────────────────────────────────────
  const riwayat = await req('GET', '/api/itinerary/riwayat', null, true);
  log('Riwayat Itinerary', riwayat.status, { jumlah: riwayat.body.jumlah });

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Pengujian selesai!');
}

main().catch(e => { console.error('❌ Error tidak terduga:', e.message); process.exit(1); });
