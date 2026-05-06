require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const destinasi = require('./tourism_data.json').map(d => ({
  name:                   d.name,
  category:               d.category,
  city:                   d.city || 'Tasikmalaya', // Default ke Tasikmalaya jika kolom city tidak ada di JSON
  latitude:               d.latitude,
  longitude:              d.longitude,
  entrance_fee:           d.entrance_fee,
  average_duration_spent: d.average_duration_spent,
  image_url:              d.image_url || null,
}));

async function main() {
  console.log(`Memulai seeding... (${destinasi.length} destinasi)`);

  // Ambil nama yang sudah ada di DB agar tidak duplikat
  const sudahAda = await prisma.destination.findMany({ select: { name: true } });
  const namaAda  = new Set(sudahAda.map(d => d.name));

  const baru = destinasi.filter(d => !namaAda.has(d.name));
  const sudah = destinasi.length - baru.length;

  console.log(`  ℹ️  Sudah ada: ${sudah} | Akan ditambah: ${baru.length}`);

  // Insert dalam batch 100
  let total = 0;
  const BATCH = 100;
  for (let i = 0; i < baru.length; i += BATCH) {
    const batch = baru.slice(i, i + BATCH);
    const hasil = await prisma.destination.createMany({ data: batch, skipDuplicates: true });
    total += hasil.count;
    process.stdout.write(`  📍 Batch ${Math.floor(i/BATCH)+1}: +${hasil.count} (total baru: ${total})\n`);
  }

  console.log(`\n✅ Ditambahkan ${total} destinasi baru.`);
  console.log(`✅ Total di database: ${sudah + total} destinasi.`);

  // Buat user demo hanya jika belum ada
  const userAda = await prisma.user.findUnique({ where: { email: 'demo@travelplanner.id' } });
  if (!userAda) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: { username: 'demo_traveler', email: 'demo@travelplanner.id', password_hash: passwordHash },
    });
    console.log('✅ User demo dibuat: demo@travelplanner.id / password123');
  } else {
    console.log('ℹ️  User demo sudah ada, dilewati.');
  }

  console.log('\n🎉 Seeding selesai! Data lama tetap aman.');
}

main()
  .catch(e => { console.error('❌ Seeding gagal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
