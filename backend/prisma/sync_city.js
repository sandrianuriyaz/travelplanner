/**
 * Script sekali jalan: sinkronisasi kolom `city` pada baris-baris lama
 * yang ter-set ke default 'Tasikmalaya' dari migration.
 *
 * Cara kerja:
 * 1. Baca semua destinasi dari tourism_data.json (yang punya field `city`).
 * 2. Untuk setiap entri di JSON, cari baris di DB berdasarkan `name`.
 * 3. Update kolom `city` sesuai nilai di JSON.
 *
 * Jalankan sekali saja: node prisma/sync_city.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const tourismData       = require('./tourism_data.json');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Mulai sinkronisasi kolom city...\n');

  let berhasil = 0;
  let tidakDitemukan = 0;

  for (const item of tourismData) {
    if (!item.city) continue; // Lewati jika JSON tidak punya city

    const hasil = await prisma.destination.updateMany({
      where: { name: item.name },
      data : { city: item.city },
    });

    if (hasil.count > 0) {
      berhasil++;
      process.stdout.write(`  ✅ ${item.name} → ${item.city}\n`);
    } else {
      tidakDitemukan++;
      process.stdout.write(`  ⚠️  Tidak ditemukan: ${item.name}\n`);
    }
  }

  console.log(`\n📊 Selesai: ${berhasil} diperbarui, ${tidakDitemukan} tidak ditemukan.`);

  // Cek apakah masih ada baris dengan city = 'Tasikmalaya' yang mungkin hanya default
  const sisaDefault = await prisma.destination.count({ where: { city: 'Tasikmalaya' } });
  console.log(`ℹ️  Sisa baris dengan city='Tasikmalaya': ${sisaDefault} (termasuk yang memang berlokasi di Tasikmalaya)`);
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
