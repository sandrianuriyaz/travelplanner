class ApiConstants {
  // ─── Base URL (pilih satu sesuai environment) ─────────────────────────────

  // iOS Simulator: localhost langsung terhubung ke mesin host
  static const String baseUrl = 'http://localhost:3000';

  // Android Emulator: 10.0.2.2 adalah alias localhost mesin host
  // static const String baseUrl = 'http://10.0.2.2:3000';

  // Device fisik: ganti ke IP mesin host di jaringan yang sama
  // static const String baseUrl = 'http://192.168.1.5:3000';

  // ─── Auth ─────────────────────────────────────────────────────────────────
  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';

  // ─── Itinerary ────────────────────────────────────────────────────────────
  static const String generateItinerary = '/api/itinerary/generate';
  static const String itinerary = '/api/itinerary';
  static const String userItineraries = '/api/itinerary/riwayat';

  // ─── Destinasi ────────────────────────────────────────────────────────────
  static const String destinations = '/api/destinasi';
  static const String destinationCities = '/api/destinasi/kota';

  // ─── SharedPreferences ────────────────────────────────────────────────────
  static const String tokenKey = 'jwt_token';
}
