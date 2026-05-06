import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class AuthState {
  final bool isLoading;
  final UserModel? user;
  final String? error;
  final bool isLoggedIn;

  const AuthState({
    this.isLoading = false,
    this.user,
    this.error,
    this.isLoggedIn = false,
  });

  AuthState copyWith({
    bool? isLoading,
    UserModel? user,
    String? error,
    bool? isLoggedIn,
    bool clearError = false,
    bool clearUser = false,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      user: clearUser ? null : (user ?? this.user),
      error: clearError ? null : (error ?? this.error),
      isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthService _service;

  AuthNotifier(this._service) : super(const AuthState());

  /// Cek token tersimpan saat app pertama dibuka → update isLoggedIn.
  Future<void> checkAuth() async {
    final loggedIn = await _service.isLoggedIn();
    state = state.copyWith(isLoggedIn: loggedIn, clearError: true);
  }

  /// Login: set loading → call service → update state.
  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final user = await _service.login(email, password);
      state = state.copyWith(
        isLoading: false,
        user: user,
        isLoggedIn: true,
        clearError: true,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
        isLoggedIn: false,
      );
      return false;
    }
  }

  /// Register: set loading → call service → update state.
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

  /// Logout: call service → reset ke state awal.
  Future<void> logout() async {
    await _service.logout();
    state = const AuthState();
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authServiceProvider));
});
