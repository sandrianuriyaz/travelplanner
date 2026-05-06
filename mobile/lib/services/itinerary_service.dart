import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants/api_constants.dart';
import '../models/itinerary_generated_model.dart';
import '../models/itinerary_detail_model.dart';
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

  Future<ItineraryDetailModel> getItineraryById(int id) async {
    try {
      final response = await _dio.get('${ApiConstants.itinerary}/$id');
      return ItineraryDetailModel.fromJson(response.data as Map<String, dynamic>);
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
