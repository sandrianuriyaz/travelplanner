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

  bool get isAuthenticated => token != null;

  AuthState copyWith({
    UserModel? user,
    String? token,
    bool? isLoading,
    String? error,
    bool clearError = false,
    bool clearToken = false,
    bool clearUser = false,
  }) {
    return AuthState(
      user: clearUser ? null : (user ?? this.user),
      token: clearToken ? null : (token ?? this.token),
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

  Future<void> init() async {
    final token = await _service.getSavedToken();
    if (token != null) {
      state = state.copyWith(token: token);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _service.login(email, password);

    if (result.berhasil && result.user != null && result.token != null) {
      state = state.copyWith(
        user: result.user,
        token: result.token,
        isLoading: false,
        clearError: true,
      );
      return true;
    }

    state = state.copyWith(isLoading: false, error: result.pesan);
    return false;
  }

  Future<bool> register(String username, String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    final result = await _service.register(username, email, password);

    if (result.berhasil) {
      state = state.copyWith(isLoading: false, clearError: true);
      return true;
    }

    state = state.copyWith(isLoading: false, error: result.pesan);
    return false;
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
