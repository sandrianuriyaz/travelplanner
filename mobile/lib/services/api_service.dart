import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';

class ApiService {
  final Dio _dio;

  ApiService._(this._dio);

  factory ApiService() {
    final dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(InterceptorsWrapper(
      // Tambah header Authorization jika token tersedia
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(ApiConstants.tokenKey);
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      // Hapus token jika server mengembalikan 401 Unauthorized
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove(ApiConstants.tokenKey);
        }
        handler.next(error);
      },
    ));

    return ApiService._(dio);
  }

  Dio get dio => _dio;

  Future<Response<dynamic>> get(String path) => _dio.get(path);

  Future<Response<dynamic>> post(
    String path,
    Map<String, dynamic> body,
  ) =>
      _dio.post(path, data: body);
}

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

// Backward-compat: seluruh kode yang memegang Dio langsung tetap bisa bekerja
final dioProvider = Provider<Dio>((ref) => ref.read(apiServiceProvider).dio);
