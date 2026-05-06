/**
 * utils/distance.js
 * Utilitas perhitungan jarak dan waktu tempuh antar koordinat GPS.
 * Menggunakan Formula Haversine untuk akurasi di permukaan bumi.
 */

const RADIUS_BUMI_KM     = 6371;   // Radius rata-rata bumi dalam km
const KECEPATAN_RATA_KMH = 40;     // Asumsi kecepatan berkendara dalam kota (km/jam)
const BIAYA_PER_KM       = 2000;   // Estimasi biaya transportasi (Rp/km)

/**
 * Mengkonversi derajat ke radian.
 * @param {number} derajat
 * @returns {number} radian
 */
function keRadian(derajat) {
  return (derajat * Math.PI) / 180;
}

/**
 * Menghitung jarak lurus antara dua titik koordinat (km).
 * Menggunakan Formula Haversine.
 *
 * @param {number} lat1 - Latitude titik pertama
 * @param {number} lng1 - Longitude titik pertama
 * @param {number} lat2 - Latitude titik kedua
 * @param {number} lng2 - Longitude titik kedua
 * @returns {number} Jarak dalam kilometer
 */
function hitungJarak(lat1, lng1, lat2, lng2) {
  const dLat = keRadian(lat2 - lat1);
  const dLng = keRadian(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(keRadian(lat1)) * Math.cos(keRadian(lat2)) * Math.sin(dLng / 2) ** 2;

  return RADIUS_BUMI_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Mengestimasi waktu tempuh (dalam menit) berdasarkan jarak.
 * Menggunakan asumsi kecepatan kendaraan dalam kota.
 *
 * @param {number} jarakKm - Jarak dalam kilometer
 * @returns {number} Estimasi waktu tempuh dalam menit
 */
function estimasiWaktuTempuh(jarakKm) {
  return Math.ceil((jarakKm / KECEPATAN_RATA_KMH) * 60);
}

/**
 * Mengestimasi biaya transportasi berdasarkan jarak.
 *
 * @param {number} jarakKm - Jarak dalam kilometer
 * @returns {number} Estimasi biaya transportasi dalam Rupiah
 */
function estimasiBiayaTransport(jarakKm) {
  return Math.round(jarakKm * BIAYA_PER_KM);
}

/**
 * Menghitung semua metrik perjalanan antar dua titik sekaligus.
 * Mengembalikan objek lengkap: jarak, waktu, dan biaya.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {{ jarak_km: number, waktu_tempuh_menit: number, biaya_transport: number }}
 */
function hitungMetrikPerjalanan(lat1, lng1, lat2, lng2) {
  const jarak = hitungJarak(lat1, lng1, lat2, lng2);
  return {
    jarak_km           : Math.round(jarak * 10) / 10,
    waktu_tempuh_menit : estimasiWaktuTempuh(jarak),
    biaya_transport    : estimasiBiayaTransport(jarak),
  };
}

module.exports = {
  hitungJarak,
  estimasiWaktuTempuh,
  estimasiBiayaTransport,
  hitungMetrikPerjalanan,
  KECEPATAN_RATA_KMH,
  BIAYA_PER_KM,
};
