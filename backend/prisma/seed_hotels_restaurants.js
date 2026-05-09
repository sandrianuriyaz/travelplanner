/**
 * Seed Hotel (dari Traveloka CSV) + Restaurant (dari Zomato CSV + estimasi)
 * Jalankan: node prisma/seed_hotels_restaurants.js
 */

'use strict';

const { PrismaClient } = require('@prisma/client');
const fs   = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// ─── Parse CSV sederhana ─────────────────────────────────────────────────────

function parseCSV(filePath, separator = ',') {
  const lines  = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const header = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(separator);
    const row = {};
    header.forEach((h, i) => { row[h] = (values[i] || '').trim().replace(/^"|"$/g, ''); });
    return row;
  });
}

// ─── Estimasi hotel untuk kota wisata yang tidak ada di dataset ──────────────
// Harga per malam berdasarkan kelas kota (IDR)
const HOTEL_ESTIMASI = [
  { city: 'Tasikmalaya', name: 'Hotel Horison Tasikmalaya',    lat: -7.3274, lng: 108.2207, star: 3, price: 350000, rating: 7.8 },
  { city: 'Tasikmalaya', name: 'Hotel Santika Tasikmalaya',    lat: -7.3251, lng: 108.2198, star: 3, price: 280000, rating: 7.5 },
  { city: 'Tasikmalaya', name: 'Grand Metro Hotel Tasikmalaya',lat: -7.3321, lng: 108.2144, star: 2, price: 180000, rating: 7.2 },
  { city: 'Ciamis',      name: 'Hotel Nusantara Ciamis',       lat: -7.3270, lng: 108.3467, star: 2, price: 150000, rating: 7.0 },
  { city: 'Garut',       name: 'Hotel Cempaka Garut',          lat: -7.2120, lng: 107.9056, star: 2, price: 200000, rating: 7.1 },
  { city: 'Pangandaran', name: 'Hotel Grand Pangandaran',      lat: -7.6849, lng: 108.6509, star: 3, price: 450000, rating: 8.0 },
  { city: 'Cianjur',     name: 'Hotel Mitra Cianjur',          lat: -6.8226, lng: 107.1420, star: 2, price: 175000, rating: 7.0 },
  { city: 'Bogor',       name: 'Hotel Salak Heritage Bogor',   lat: -6.5971, lng: 106.7960, star: 4, price: 650000, rating: 8.2 },
  { city: 'Malang',      name: 'Hotel Tugu Malang',            lat: -7.9754, lng: 112.6328, star: 4, price: 800000, rating: 8.5 },
  { city: 'Lombok',      name: 'Lombok Raya Beach Hotel',      lat: -8.5832, lng: 116.0989, star: 3, price: 500000, rating: 7.9 },
];

// ─── Estimasi restaurant untuk kota wisata yang tidak ada di dataset ──────────
const RESTAURANT_ESTIMASI = [
  { city: 'Tasikmalaya', name: 'Rumah Makan Sari Rasa',     lat: -7.3274, lng: 108.2207, cuisines: 'Sunda', cost: 80000,  range: 2, rating: 4.2 },
  { city: 'Tasikmalaya', name: 'Warung Nasi Ampera Tasik',  lat: -7.3291, lng: 108.2180, cuisines: 'Sunda', cost: 50000,  range: 1, rating: 4.0 },
  { city: 'Ciamis',      name: 'Warung Makan Ciamis Rasa',  lat: -7.3270, lng: 108.3467, cuisines: 'Sunda', cost: 50000,  range: 1, rating: 4.0 },
  { city: 'Garut',       name: 'Restoran Garut Indah',      lat: -7.2120, lng: 107.9056, cuisines: 'Sunda', cost: 70000,  range: 2, rating: 4.1 },
  { city: 'Pangandaran', name: 'Seafood Pantai Pangandaran', lat: -7.6849, lng: 108.6509, cuisines: 'Seafood', cost: 120000, range: 2, rating: 4.3 },
  { city: 'Bogor',       name: 'Rumah Makan Bogor Baru',    lat: -6.5971, lng: 106.7960, cuisines: 'Indonesian', cost: 90000, range: 2, rating: 4.2 },
];

// ─── Seed Hotels ─────────────────────────────────────────────────────────────

async function seedHotels() {
  console.log('\n📦 Seeding Hotels dari Traveloka CSV...');

  const csvPath = path.join(__dirname, '../../traveloka_newyearhotels.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('  ⚠️  File traveloka_newyearhotels.csv tidak ditemukan, skip.');
    return;
  }

  const rows = parseCSV(csvPath, '|');
  const hotels = [];

  for (const row of rows) {
    const price = parseFloat(row['cheapestRate_perNight_totalFare'] || '0');
    const lat   = parseFloat(row['latitude'] || '0');
    const lng   = parseFloat(row['longitude'] || '0');
    const city  = (row['city'] || '').trim();

    if (!row['name'] || price <= 0 || isNaN(lat) || isNaN(lng) || !city) continue;
    // Filter harga tidak wajar (< 50rb atau > 20jt per malam)
    if (price < 50000 || price > 20000000) continue;

    hotels.push({
      name           : row['name'].substring(0, 299),
      city,
      latitude       : lat,
      longitude      : lng,
      star_rating    : parseFloat(row['starRating'] || '3'),
      price_per_night: Math.round(price),
      user_rating    : parseFloat(row['userRating'] || '0') || null,
      features       : (row['hotelFeatures'] || '').substring(0, 999) || null,
      source         : 'traveloka',
    });
  }

  // Tambahkan estimasi untuk kota wisata
  for (const h of HOTEL_ESTIMASI) {
    hotels.push({
      name: h.name, city: h.city, latitude: h.lat, longitude: h.lng,
      star_rating: h.star, price_per_night: h.price,
      user_rating: h.rating, features: null, source: 'estimasi',
    });
  }

  // Upsert agar bisa di-rerun
  await prisma.hotel.deleteMany({});
  await prisma.hotel.createMany({ data: hotels, skipDuplicates: true });
  console.log(`  ✅ ${hotels.length} hotel berhasil diseed.`);
}

// ─── Seed Restaurants ─────────────────────────────────────────────────────────

async function seedRestaurants() {
  console.log('\n🍽️  Seeding Restaurants dari Zomato CSV...');

  const csvPath = path.join(__dirname, '../../zomato.csv');
  const restaurants = [];

  if (fs.existsSync(csvPath)) {
    const rows = parseCSV(csvPath, ',');
    for (const row of rows) {
      // Hanya Indonesia (country code 94)
      if ((row['Country Code'] || '').trim() !== '94') continue;

      const lat  = parseFloat(row['Latitude'] || '0');
      const lng  = parseFloat(row['Longitude'] || '0');
      const cost = parseInt(row['Average Cost for two'] || '0');
      const city = (row['City'] || '').trim();

      if (!row['Restaurant Name'] || isNaN(lat) || isNaN(lng) || !city) continue;

      restaurants.push({
        name            : row['Restaurant Name'].substring(0, 299),
        city,
        latitude        : lat,
        longitude       : lng,
        cuisines        : (row['Cuisines'] || '').substring(0, 199) || null,
        avg_cost_for_two: cost || 100000,
        price_range     : parseInt(row['Price range'] || '2'),
        rating          : parseFloat(row['Aggregate rating'] || '0') || null,
        source          : 'zomato',
      });
    }
    console.log(`  ✅ ${restaurants.length} restaurant Indonesia dari Zomato.`);
  }

  // Tambahkan estimasi untuk kota wisata
  for (const r of RESTAURANT_ESTIMASI) {
    restaurants.push({
      name: r.name, city: r.city, latitude: r.lat, longitude: r.lng,
      cuisines: r.cuisines, avg_cost_for_two: r.cost,
      price_range: r.range, rating: r.rating, source: 'estimasi',
    });
  }

  await prisma.restaurant.deleteMany({});
  await prisma.restaurant.createMany({ data: restaurants, skipDuplicates: true });
  console.log(`  ✅ Total ${restaurants.length} restaurant berhasil diseed.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Seed Hotel & Restaurant dimulai...');
  try {
    await seedHotels();
    await seedRestaurants();
    console.log('\n✅ Seeding selesai!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
