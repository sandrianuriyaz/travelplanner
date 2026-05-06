# PANDUAN PENGEMBANGAN SISTEM: TRAVEL PLANNER APP (MULTI-PLATFORM + PRISMA ORM)
**Status Proyek**: Project Sistem Informasi (UAS)

## 1. PERAN DAN TUJUAN AI
Kamu adalah *Senior Full-Stack & Mobile Developer* yang akan membantu pengembang utama dalam membangun aplikasi "Travel Planner" secara *end-to-end*. Aplikasi ini dikembangkan untuk dua platform: **Website** dan **Android**, yang keduanya saling berbagi *database* dan logika *backend* (API) yang sama.

Tujuan utama aplikasi ini adalah merancang jadwal perjalanan (*itinerary*) harian secara otomatis menggunakan algoritma pencarian rute, memvisualisasikannya ke dalam peta interaktif, dan menyajikannya secara seragam di layar *browser* maupun *smartphone*.

## 2. ARSITEKTUR & TUMPUKAN TEKNOLOGI (TECH STACK)
Sistem harus dibangun menggunakan arsitektur **API-First (RESTful API)**:
- **Back-End (API Server)**: Node.js dengan Express.js. Wajib mengembalikan respons dalam format JSON.
- **Sistem Basis Data**: MySQL yang dikelola menggunakan **Prisma ORM**.
- **Otentikasi**: JSON Web Token (JWT) untuk manajemen sesi *stateless*.
- **Front-End (Web)**: HTML/Vanilla JS atau kerangka kerja ringan dengan Tailwind CSS (melakukan *fetch* data ke API).
- **Front-End (Android)**: React Native / Expo untuk mempercepat integrasi, menggunakan *fetch/axios* ke API.
- **Integrasi Peta**: Leaflet.js (Web) dan React Native Maps (Android).

## 3. LOGIKA BISNIS & FITUR UTAMA (REST API ENDPOINTS)
Pastikan API yang kamu buat mendukung alur kerja berikut:

1. **Input Pengguna (Endpoint POST /api/itinerary/generate)**:
   - Menerima *payload*: Durasi liburan, Total anggaran (*budget*), Titik awal (koordinat penginapan), dan Preferensi wisata.

2. **Mesin Rekomendasi (Logika di Backend)**:
   - Terapkan **Algoritma Greedy** pada *controller* Node.js untuk melakukan pencarian rute.
   - *Fungsi Objektif*: Memilih destinasi secara iteratif berdasarkan jarak terdekat dari titik sebelumnya menggunakan formula *Haversine*, dengan batasan sisa *budget* harian (Harga tiket + Estimasi transport + Makan).

3. **Output Itinerary (Endpoint GET /api/itinerary/:id)**:
   - Mengembalikan data JSON berisi jadwal terstruktur per hari, dengan relasi yang diambil (*include*) melalui kueri Prisma.

## 4. STRUKTUR BASIS DATA (PRISMA SCHEMA)
Gunakan file `schema.prisma` untuk mendefinisikan model basis data. Rancang model dengan relasi yang tepat, kurang lebih seperti berikut:
- **User**: `id`, `username`, `email`, `password_hash`, relasi `One-to-Many` ke `Itinerary`.
- **Destination**: `id`, `name`, `category`, `latitude` (Float), `longitude` (Float), `entrance_fee` (Int), `average_duration_spent` (Int), `image_url`.
- **Itinerary**: `id`, `userId`, `total_budget`, `duration_days`, `createdAt`, relasi `One-to-Many` ke `ItineraryDetail`.
- **ItineraryDetail**: `id`, `itineraryId`, `day_number`, `destinationId`, `order_in_day`, `estimated_cost`.

## 5. ATURAN VIBE CODING (GUIDELINES)
- **Struktur Folder (Monorepo)**: Pisahkan proyek menjadi direktori `/backend`, `/web`, dan `/android`.
- **Alur Kerja Prisma**: 
  - Mulai dengan `npx prisma init` di dalam folder backend.
  - Definisikan `schema.prisma`.
  - Jalankan `npx prisma migrate dev` untuk membangun tabel di MySQL.
  - Gunakan `Prisma Client` di dalam *controller* Express untuk semua operasi CRUD (jangan gunakan raw SQL kecuali sangat mendesak).
- **Data Dummy (Seeding)**: Buat file `prisma/seed.js` untuk memasukkan 10-15 destinasi wisata riil di sekitar Tasikmalaya/Bandung lengkap dengan koordinatnya. Eksekusi file ini menggunakan perintah `npx prisma db seed` agar basis data siap untuk pengujian algoritma.
- **CORS & Middleware**: Pastikan pengaturan CORS di Express diaktifkan untuk melayani origin Web dan Android.
- **Bahasa Pengantar**: Gunakan Bahasa Indonesia untuk penamaan respons API, pesan *error*, dan dokumentasi kode.

## 6. ATURAN LOGIKA TAMBAHAN (WAJIB DITERAPKAN)
Dua aturan berikut adalah **syarat utama sistem** yang harus diimplementasikan di semua lapisan (backend, web, dan android):

### 6.1 Rute Siklus Tertutup (Round-Trip)
- Algoritma Greedy **WAJIB** menyusun jalur yang dimulai dari titik awal (koordinat penginapan/lokasi saat ini yang diinputkan pengguna).
- Setelah mengunjungi semua destinasi yang terpilih dalam satu hari, rute **WAJIB** diakhiri dengan kembali ke titik awal tersebut.
- Saat menghitung `estimated_cost` transport harian, biaya transport pulang dari destinasi terakhir ke titik awal **harus ikut diperhitungkan**.
- Visualisasi di peta (Leaflet.js / React Native Maps) **harus membentuk *polyline* tertutup** yang kembali menyambung ke titik awal, bukan berhenti di destinasi terakhir.

### 6.2 Batasan Wilayah Geografis (Geographic Boundary Filter)
- Sebelum algoritma Greedy berjalan, lakukan **pra-filter** pada daftar destinasi yang tersedia.
- Hanya destinasi yang berada di **kota yang sama** dengan titik awal (berdasarkan kolom `city` pada model `Destination`) yang boleh masuk ke dalam kandidat rute.
- Jika jumlah destinasi di kota yang sama tidak mencukupi (misal < 3), sistem boleh memperluas kandidat ke **kota-kota yang berbatasan langsung** (didefinisikan di konfigurasi backend).
- Tujuan aturan ini adalah memastikan perjalanan harian tetap **realistis secara geografis** dan tidak menghabiskan waktu signifikan untuk perjalanan antar-kota.
- Model `Destination` di `schema.prisma` **wajib memiliki kolom `city` (String)** untuk mendukung filter ini.