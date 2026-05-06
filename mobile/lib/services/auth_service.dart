import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api;

  AuthService(this._api);

  /// Login → simpan token ke SharedPreferences → return UserModel.
  /// Lempar String pesan error jika gagal.
  Future<UserModel> login(String email, String password) async {
    try {
      final response = await _api.post(ApiConstants.login, {
        'email': email,
        'password': password,
      });
      final body = response.data as Map<String, dynamic>;
      final user = UserModel.fromJson(body['data'] as Map<String, dynamic>);
      final token = body['token'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(ApiConstants.tokenKey, token);

      return user;
    } on DioException catch (e) {
      throw _pesanError(e, 'Login gagal. Periksa email dan password Anda.');
    }
  }

  /// Register → lempar String pesan error jika gagal.
  Future<void> register(
    String username,
    String email,
    String password,
  ) async {
    try {
      await _api.post(ApiConstants.register, {
        'username': username,
        'email': email,
        'password': password,
      });
    } on DioException catch (e) {
      throw _pesanError(e, 'Registrasi gagal. Coba lagi nanti.');
    }
  }

  /// Hapus token dari SharedPreferences.
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(ApiConstants.tokenKey);
  }

  /// Kembalikan true jika token ada dan tidak kosong.
  Future<bool> isLoggedIn() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(ApiConstants.tokenKey);
    return token != null && token.isNotEmpty;
  }

  /// Kembalikan token tersimpan (null jika belum login).
  Future<String?> getSavedToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(ApiConstants.tokenKey);
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

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.read(apiServiceProvider));
});
