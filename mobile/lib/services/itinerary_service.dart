import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_constants.dart';
import '../models/itinerary_generated_model.dart';
import '../models/itinerary_model.dart';
import '../models/riwayat_model.dart';
import 'api_service.dart';

class ItineraryService {
  final Dio _dio;

  ItineraryService(this._dio);

  Future<ItineraryGeneratedModel> generateItinerary({
    required int totalBudget,
    required int durationDays,
    required double startLatitude,
    required double startLongitude,
    String? cityPreference,
    String? categoryPreference,
  }) async {
    try {
      final payload = {
        'total_budget': totalBudget,
        'duration_days': durationDays,
        'start_latitude': startLatitude,
        'start_longitude': startLongitude,
        if (cityPreference != null && cityPreference.isNotEmpty)
          'city_preference': cityPreference,
        if (categoryPreference != null && categoryPreference.isNotEmpty)
          'category_preference': categoryPreference,
      };

      final response = await _dio.post(ApiConstants.generateItinerary, data: payload);
      return ItineraryGeneratedModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal membuat itinerary. Coba lagi nanti.');
    }
  }

  /// Mengambil detail itinerary dari GET /api/itinerary/:id.
  /// API mengembalikan format jadwal-per-hari; fungsi ini mengubahnya menjadi
  /// ItineraryModel flat (details list) agar bisa dipakai dengan groupedByDay.
  Future<ItineraryModel> getItineraryById(int id) async {
    try {
      final response = await _dio.get('${ApiConstants.itinerary}/$id');
      final body = (response.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;

      final jadwal = body['jadwal'] as List<dynamic>;
      final details = <Map<String, dynamic>>[];

      for (final hariRaw in jadwal) {
        final hari = hariRaw as Map<String, dynamic>;
        final dayNum = (hari['hari'] as num).toInt();
        final destinasi = hari['destinasi'] as List<dynamic>;

        for (final destRaw in destinasi) {
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
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat detail itinerary.');
    }
  }

  Future<List<RiwayatItemModel>> getRiwayat() async {
    try {
      final response = await _dio.get(ApiConstants.userItineraries);
      final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
      return data
          .map((item) => RiwayatItemModel.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat riwayat itinerary.');
    }
  }

  Future<void> deleteItinerary(int id) async {
    try {
      await _dio.delete('${ApiConstants.itinerary}/$id');
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal menghapus itinerary.');
    }
  }

  Future<List<String>> getDaftarKota() async {
    try {
      final response = await _dio.get(ApiConstants.destinationCities);
      final data = (response.data as Map<String, dynamic>)['data'] as List<dynamic>;
      return data.map((k) => k as String).toList();
    } on DioException catch (e) {
      throw _pesanError(e, 'Gagal memuat daftar kota.');
    }
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
  return ItineraryService(ref.read(dioProvider));
});
