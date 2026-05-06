import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_constants.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthResult {
  final bool berhasil;
  final String pesan;
  final UserModel? user;
  final String? token;

  const AuthResult({
    required this.berhasil,
    required this.pesan,
    this.user,
    this.token,
  });
}

class AuthService {
  final Dio _dio;

  AuthService(this._dio);

  Future<AuthResult> login(String email, String password) async {
    try {
      final response = await _dio.post(ApiConstants.login, data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      final user = UserModel.fromJson(data['data'] as Map<String, dynamic>);
      final token = data['token'] as String;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(ApiConstants.tokenKey, token);

      return AuthResult(berhasil: true, pesan: 'Login berhasil.', user: user, token: token);
    } on DioException catch (e) {
      final pesan = _pesanError(e, 'Login gagal. Periksa email dan password Anda.');
      return AuthResult(berhasil: false, pesan: pesan);
    }
  }

  Future<AuthResult> register(String username, String email, String password) async {
    try {
      final response = await _dio.post(ApiConstants.register, data: {
        'username': username,
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      return AuthResult(berhasil: true, pesan: data['pesan'] as String? ?? 'Registrasi berhasil.');
    } on DioException catch (e) {
      final pesan = _pesanError(e, 'Registrasi gagal. Coba lagi nanti.');
      return AuthResult(berhasil: false, pesan: pesan);
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(ApiConstants.tokenKey);
  }

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
  return AuthService(ref.read(dioProvider));
});
