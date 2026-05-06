import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthState {
  final UserModel? user;
  final String? token;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.user,
    this.token,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => token != null && token!.isNotEmpty;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearSession = false,
  }) {
    return AuthState(
      user: clearSession ? null : (user ?? this.user),
      token: clearSession ? null : (token ?? this.token),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  late final AuthService _service;

  @override
  AuthState build() {
    _service = ref.read(authServiceProvider);
    return const AuthState();
  }

  /// Baca token tersimpan saat app pertama kali dibuka.
  Future<void> init() async {
    final token = await _service.getSavedToken();
    if (token != null && token.isNotEmpty) {
      state = state.copyWith(token: token);
    }
  }

  /// Login: return true jika berhasil, false jika gagal (error tersimpan di state).
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _service.login(email, password);
      final token = await _service.getSavedToken() ?? '';
      state = state.copyWith(
        user: user,
        token: token,
        isLoading: false,
        clearError: true,
      );
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  /// Register: return true jika berhasil.
  Future<bool> register(String username, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      await _service.register(username, email, password);
      state = state.copyWith(isLoading: false, clearError: true);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await _service.logout();
    state = const AuthState();
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(() => AuthNotifier());
