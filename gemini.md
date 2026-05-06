# PANDUAN PENGEMBANGAN SISTEM: TRAVEL PLANNER APP (MULTI-PLATFORM + PRISMA ORM)
**Status Proyek**: Project Sistem Informasi (UAS)

## 1. PERAN DAN TUJUAN AI
Kamu adalah *Senior Full-Stack & Mobile Developer* yang akan membantu pengembang utama dalam membangun aplikasi "Travel Planner" secara *end-to-end*. Aplikasi ini dikembangkan untuk dua platform: **Website** dan **Android/iOS (Flutter)**, yang keduanya saling berbagi *database* dan logika *backend* (API) yang sama.

Tujuan utama aplikasi ini adalah merancang jadwal perjalanan (*itinerary*) harian secara otomatis menggunakan algoritma pencarian rute, memvisualisasikannya ke dalam peta interaktif, dan menyajikannya secara seragam di layar *browser* maupun *smartphone*.

> ✅ **Status**: Backend (Node.js + Express + Prisma) dan Frontend Web sudah selesai dibangun. Tahap aktif saat ini adalah **Frontend Mobile (Flutter)**.

---

## 2. ARSITEKTUR & TUMPUKAN TEKNOLOGI (TECH STACK)
Sistem dibangun menggunakan arsitektur **API-First (RESTful API)**:

| Layer | Teknologi | Status |
|---|---|---|
| Back-End (API Server) | Node.js + Express.js + JSON response | ✅ Selesai |
| Sistem Basis Data | MySQL dikelola dengan **Prisma ORM** | ✅ Selesai |
| Otentikasi | JSON Web Token (JWT) stateless | ✅ Selesai |
| Front-End Web | HTML/Vanilla JS + Tailwind CSS + Leaflet.js | ✅ Selesai |
| **Front-End Mobile** | **Flutter + Dart** | 🔄 Aktif |
| Integrasi Peta Mobile | **flutter_map** (berbasis Leaflet, gratis) | 🔄 Aktif |
| Testing Mobile | **Xcode Simulator** (iOS) + Android Emulator | 🔄 Aktif |

---

## 3. LOGIKA BISNIS & FITUR UTAMA (REST API ENDPOINTS)
API yang sudah ada dikonsumsi oleh Flutter via Dio:

1. **POST /api/auth/register** — Registrasi pengguna baru
2. **POST /api/auth/login** — Login, mengembalikan JWT token
3. **POST /api/itinerary/generate** — Generate itinerary otomatis
   - Payload: `duration`, `budget`, `start_lat`, `start_lng`, `preferences`, `city`
4. **GET /api/itinerary/:id** — Ambil detail itinerary (JSON per hari)
5. **GET /api/destinations** — Daftar semua destinasi
6. **GET /api/itinerary/user** — Riwayat itinerary milik pengguna (butuh JWT header)

---

## 4. STRUKTUR BASIS DATA (PRISMA SCHEMA) — REFERENSI
```prisma
model User {
  id            Int         @id @default(autoincrement())
  username      String      @unique
  email         String      @unique
  password_hash String
  itineraries   Itinerary[]
}

model Destination {
  id                     Int               @id @default(autoincrement())
  name                   String
  category               String
  city                   String
  latitude               Float
  longitude              Float
  entrance_fee           Int
  average_duration_spent Int
  image_url              String
  itineraryDetails       ItineraryDetail[]
}

model Itinerary {
  id            Int               @id @default(autoincrement())
  userId        Int
  total_budget  Int
  duration_days Int
  createdAt     DateTime          @default(now())
  user          User              @relation(fields: [userId], references: [id])
  details       ItineraryDetail[]
}

model ItineraryDetail {
  id             Int         @id @default(autoincrement())
  itineraryId    Int
  day_number     Int
  destinationId  Int
  order_in_day   Int
  estimated_cost Int
  itinerary      Itinerary   @relation(fields: [itineraryId], references: [id])
  destination    Destination @relation(fields: [destinationId], references: [id])
}
```

---

## 5. STRUKTUR FOLDER (MONOREPO)
```
travel-planner/
├── backend/          ← Node.js + Express + Prisma (✅ Selesai)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── controllers/
│   ├── routes/
│   └── index.js
├── web/              ← HTML + Tailwind + Leaflet.js (✅ Selesai)
│   ├── index.html
│   └── assets/
└── mobile/           ← Flutter + Dart (🔄 Aktif)
    ├── android/
    ├── ios/          ← Build & test via Xcode Simulator
    ├── lib/
    │   ├── main.dart
    │   ├── core/
    │   │   ├── constants/
    │   │   └── utils/
    │   ├── models/
    │   ├── screens/
    │   ├── services/
    │   └── providers/
    ├── pubspec.yaml
    └── test/
```

---

## 6. PANDUAN PENGEMBANGAN FLUTTER MOBILE

### 6.1 Inisialisasi Proyek
```bash
# Buat proyek Flutter baru di dalam direktori monorepo
flutter create mobile --org com.travelplanner --platforms ios,android
cd mobile

# Jalankan di iOS Simulator (Xcode harus sudah terinstall)
open -a Simulator
flutter run

# Cek daftar device yang tersedia
flutter devices
flutter run -d <device_id>
```

### 6.2 Dependencies (pubspec.yaml)
```yaml
dependencies:
  flutter:
    sdk: flutter

  # HTTP & State Management
  dio: ^5.4.0
  flutter_riverpod: ^2.4.0
  shared_preferences: ^2.2.2

  # Navigasi
  go_router: ^13.0.0

  # Peta (gratis, tanpa API key)
  flutter_map: ^6.1.0
  latlong2: ^0.9.0

  # UI
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
  fl_chart: ^0.66.0

  # Utilitas
  intl: ^0.19.0
  equatable: ^2.0.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

### 6.3 Konfigurasi BASE_URL per Platform
```dart
// lib/core/constants/api_constants.dart
class ApiConstants {
  // Android Emulator → gunakan 10.0.2.2 (alias localhost host machine)
  static const String baseUrl = 'http://10.0.2.2:3000';

  // iOS Simulator → ganti ke:
  // static const String baseUrl = 'http://localhost:3000';

  // Device fisik → ganti ke IP mesin host, contoh:
  // static const String baseUrl = 'http://192.168.1.5:3000';

  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';
  static const String generateItinerary = '/api/itinerary/generate';
  static const String itinerary = '/api/itinerary';
  static const String userItineraries = '/api/itinerary/user';
  static const String destinations = '/api/destinations';
}
```

### 6.4 Visualisasi Peta — Rute Siklus Tertutup
```dart
// Bangun polyline tertutup: start → dest1 → dest2 → ... → start
List<LatLng> buildClosedRoute(LatLng startPoint, List<LatLng> destinations) {
  return [startPoint, ...destinations, startPoint];
}

// Di dalam FlutterMap widget:
PolylineLayer(
  polylines: [
    Polyline(
      points: buildClosedRoute(startPoint, destinationPoints),
      color: Colors.blue,
      strokeWidth: 3.0,
    ),
  ],
),
MarkerLayer(
  markers: [
    Marker(
      point: startPoint,
      child: const Icon(Icons.home, color: Colors.green, size: 36),
    ),
    ...destinationPoints.asMap().entries.map((entry) => Marker(
      point: entry.value,
      child: CircleAvatar(
        backgroundColor: Colors.orange,
        child: Text('${entry.key + 1}'),
      ),
    )),
  ],
),
```

### 6.5 Testing di Xcode Simulator (iOS)
```bash
# Pastikan Xcode & Command Line Tools sudah terinstall
xcode-select --install

# Buka Xcode Simulator
open -a Simulator

# Lihat daftar simulator tersedia
xcrun simctl list devices

# Jalankan Flutter di iOS Simulator
flutter run

# Build release iOS
flutter build ios --release

# Jalankan unit test
flutter test
```

### 6.6 Konfigurasi Info.plist (iOS)
Tambahkan ke `ios/Runner/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Aplikasi membutuhkan lokasi untuk menentukan titik awal perjalanan Anda.</string>
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

---

## 7. ATURAN LOGIKA WAJIB

### 7.1 Rute Siklus Tertutup (Round-Trip)
- Algoritma Greedy backend **WAJIB** menyusun jalur dari titik awal pengguna.
- Setelah semua destinasi dikunjungi dalam satu hari, rute **WAJIB** kembali ke titik awal.
- `estimated_cost` harian **mencakup** biaya transport pulang dari destinasi terakhir.
- Polyline Flutter **WAJIB tertutup**: `[startPoint, ...destinations, startPoint]`.

### 7.2 Batasan Wilayah Geografis (Geographic Boundary Filter)
- Backend pra-filter destinasi berdasarkan kolom `city` sebelum algoritma berjalan.
- Jika destinasi < 3, sistem memperluas ke kota berbatasan (konfigurasi backend).
- Flutter menampilkan dropdown kota di form planner.

---

## 8. ALUR KERJA PENGEMBANGAN (MOBILE PHASE)
```
1.  Setup Flutter project di /mobile
2.  Konfigurasi pubspec.yaml & install dependencies
3.  Buat model Dart (fromJson/toJson sesuai response API)
4.  Buat ApiService + AuthService (Dio + JWT interceptor)
5.  Setup Riverpod providers & GoRouter
6.  Buat screens: Login → Register → Home → Planner Form
7.  Integrasikan POST /api/itinerary/generate
8.  Tampilkan hasil itinerary per hari (TabBar + ListView)
9.  Integrasi flutter_map + polyline siklus tertutup
10. Halaman riwayat (GET /api/itinerary/user)
11. Test di Xcode Simulator (iOS) + Android Emulator
12. Polish UI: shimmer loading, error state, format Rupiah
```