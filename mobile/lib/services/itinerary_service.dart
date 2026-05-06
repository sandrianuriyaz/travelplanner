import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_constants.dart';
import '../models/itinerary_model.dart';
import '../models/riwayat_model.dart';
import 'api_service.dart';

class ItineraryService {
  final ApiService _api;

  ItineraryService(this._api);

  // ─── BAGIAN 11 — metode sesuai spesifikasi ────────────────────────────────

  /// Generate itinerary baru via Greedy algorithm di backend.
  /// [preferences] → backend hanya mendukung satu kategori; nilai pertama dipakai.
  Future<ItineraryModel> generateItinerary({
    required int duration,
    required int budget,
    required double startLat,
    required double startLng,
    required String city,
    required List<String> preferences,
  }) async {
    try {
      final payload = <String, dynamic>{
        'duration_days': duration,
        'total_budget': budget,
        'start_latitude': startLat,
        'start_longitude': startLng,
        if (city.isNotEmpty) 'city_preference': city,
        if (preferences.isNotEmpty) 'category_preference': preferences.first,
      };

      final response = await _api.post(ApiConstants.generateItinerary, payload);
      return _transformGenerateResponse(
        response.data as Map<String, dynamic>,
        city: city,
        startLat: startLat,
        startLng: startLng,
      );
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal membuat itinerary. Coba lagi nanti.');
    }
  }

  /// Ambil detail satu itinerary berdasarkan ID.
  Future<ItineraryModel> getItinerary(int id) async {
    try {
      final response = await _api.get('${ApiConstants.itinerary}/$id');
      return _transformDetailResponse(
        (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat detail itinerary.');
    }
  }

  /// Ambil daftar itinerary milik user yang sedang login.
  Future<List<ItineraryModel>> getUserItineraries() async {
    try {
      final response = await _api.get(ApiConstants.userItineraries);
      final list =
          (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
      return list
          .map((item) =>
              _transformListItem(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat riwayat itinerary.');
    }
  }

  // ─── Metode tambahan yang dipakai UI ──────────────────────────────────────

  Future<void> deleteItinerary(int id) async {
    try {
      await _api.dio.delete('${ApiConstants.itinerary}/$id');
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal menghapus itinerary.');
    }
  }

  Future<List<String>> getDaftarKota() async {
    try {
      final response = await _api.get(ApiConstants.destinationCities);
      final data =
          (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
      return data.map((k) => k as String).toList();
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat daftar kota.');
    }
  }

  /// Kembalikan riwayat sebagai RiwayatItemModel (preview; tak butuh koordinat).
  Future<List<RiwayatItemModel>> getRiwayat() async {
    try {
      final response = await _api.get(ApiConstants.userItineraries);
      final data =
          (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
      return data
          .map((item) =>
              RiwayatItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat riwayat.');
    }
  }

  // ─── Transformer private ──────────────────────────────────────────────────

  /// Ubah response POST /generate (jadwal format) → ItineraryModel.
  ItineraryModel _transformGenerateResponse(
    Map<String, dynamic> json, {
    required String city,
    required double startLat,
    required double startLng,
  }) {
    final data = json['data'] as Map<String, dynamic>;
    final jadwal = data['jadwal'] as List<dynamic>;
    final itineraryId = (data['itinerary_id'] as num).toInt();

    final details = <Map<String, dynamic>>[];
    for (final hariRaw in jadwal) {
      final hari = hariRaw as Map<String, dynamic>;
      final dayNum = (hari['hari'] as num).toInt();
      for (final destRaw in hari['destinasi'] as List<dynamic>) {
        final dest = destRaw as Map<String, dynamic>;
        details.add({
          'id': 0,
          'itineraryId': itineraryId,
          'day_number': dayNum,
          'destinationId': (dest['destinationId'] as num).toInt(),
          'order_in_day': (dest['urutan'] as num).toInt(),
          'estimated_cost': (dest['estimated_cost'] as num).toInt(),
          'destination': {
            'id': (dest['destinationId'] as num).toInt(),
            'name': dest['nama'],
            'category': dest['kategori'],
            'city': dest['kota'],
            'latitude': dest['latitude'],
            'longitude': dest['longitude'],
            'entrance_fee': dest['harga_tiket'],
            'average_duration_spent': dest['durasi_kunjungan_menit'],
            'image_url': null,
          },
        });
      }
    }

    return ItineraryModel.fromJson({
      'id': itineraryId,
      'userId': 0,
      'total_budget': data['total_budget'],
      'duration_days': data['duration_days'],
      'starting_lat': data['start_latitude'],
      'starting_lng': data['start_longitude'],
      'preference': city.isEmpty ? null : city,
      'createdAt': DateTime.now().toIso8601String(),
      'details': details,
    });
  }

  /// Ubah response GET /api/itinerary/:id (jadwal format) → ItineraryModel.
  ItineraryModel _transformDetailResponse(Map<String, dynamic> body) {
    final jadwal = body['jadwal'] as List<dynamic>;
    final details = <Map<String, dynamic>>[];

    for (final hariRaw in jadwal) {
      final hari = hariRaw as Map<String, dynamic>;
      final dayNum = (hari['hari'] as num).toInt();
      for (final destRaw in hari['destinasi'] as List<dynamic>) {
        final dest = destRaw as Map<String, dynamic>;
        details.add({
          'id': 0,
          'itineraryId': body['id'],
          'day_number': dayNum,
          'destinationId': 0,
          'order_in_day': (dest['urutan'] as num).toInt(),
          'estimated_cost': (dest['estimated_cost'] as num).toInt(),
          'destination': {
            'id': 0,
            'name': dest['nama'],
            'category': dest['kategori'],
            'city': dest['kota'],
            'latitude': dest['latitude'],
            'longitude': dest['longitude'],
            'entrance_fee': 0,
            'average_duration_spent': 0,
            'image_url': null,
          },
        });
      }
    }

    return ItineraryModel.fromJson({
      'id': body['id'],
      'userId': 0,
      'total_budget': body['total_budget'],
      'duration_days': body['duration_days'],
      'starting_lat': body['start_latitude'],
      'starting_lng': body['start_longitude'],
      'preference': body['preferensi'],
      'createdAt': body['dibuat_pada'],
      'details': details,
    });
  }

  /// Ubah item riwayat (partial destination data) → ItineraryModel.
  ItineraryModel _transformListItem(Map<String, dynamic> json) {
    final details = (json['details'] as List<dynamic>).map((dRaw) {
      final d = dRaw as Map<String, dynamic>;
      final dest = d['destination'] as Map<String, dynamic>;
      return <String, dynamic>{
        'id': (d['id'] as num).toInt(),
        'itineraryId': (d['itineraryId'] as num).toInt(),
        'day_number': (d['day_number'] as num).toInt(),
        'destinationId': (d['destinationId'] as num).toInt(),
        'order_in_day': (d['order_in_day'] as num).toInt(),
        'estimated_cost': (d['estimated_cost'] as num).toInt(),
        'destination': {
          'id': (d['destinationId'] as num).toInt(),
          'name': dest['name'],
          'category': dest['category'],
          'city': dest['city'],
          'latitude': 0.0,
          'longitude': 0.0,
          'entrance_fee': 0,
          'average_duration_spent': 0,
          'image_url': null,
        },
      };
    }).toList();

    return ItineraryModel.fromJson({
      'id': (json['id'] as num).toInt(),
      'userId': (json['userId'] as num).toInt(),
      'total_budget': (json['total_budget'] as num).toInt(),
      'duration_days': (json['duration_days'] as num).toInt(),
      'starting_lat': (json['starting_lat'] as num).toDouble(),
      'starting_lng': (json['starting_lng'] as num).toDouble(),
      'preference': json['preference'],
      'createdAt': json['createdAt'],
      'details': details,
    });
  }

  String _pesanError(DioException e, String fallback) {
    final data = e.response?.data;
    if (data is Map<String, dynamic>) {
      return data['pesan'] as String? ?? fallback;
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Koneksi ke server timeout. Pastikan server berjalan.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Tidak dapat terhubung ke server. Periksa koneksi jaringan.';
    }
    return fallback;
  }
}

final itineraryServiceProvider = Provider<ItineraryService>((ref) {
  return ItineraryService(ref.read(apiServiceProvider));
});
