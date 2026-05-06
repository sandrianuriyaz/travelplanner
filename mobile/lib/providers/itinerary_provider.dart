import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/itinerary_model.dart';
import '../services/itinerary_service.dart';

// ─── State ────────────────────────────────────────────────────────────────────

class ItineraryState {
  final bool isLoading;
  final ItineraryModel? itinerary;
  final List<ItineraryModel> itineraries;
  final String? error;

  const ItineraryState({
    this.isLoading = false,
    this.itinerary,
    this.itineraries = const [],
    this.error,
  });

  ItineraryState copyWith({
    bool? isLoading,
    ItineraryModel? itinerary,
    List<ItineraryModel>? itineraries,
    String? error,
    bool clearError = false,
    bool clearItinerary = false,
  }) {
    return ItineraryState(
      isLoading: isLoading ?? this.isLoading,
      itinerary: clearItinerary ? null : (itinerary ?? this.itinerary),
      itineraries: itineraries ?? this.itineraries,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

// ─── Notifier ─────────────────────────────────────────────────────────────────

class ItineraryNotifier extends StateNotifier<ItineraryState> {
  final ItineraryService _service;

  ItineraryNotifier(this._service) : super(const ItineraryState());

  /// Generate itinerary baru; return hasilnya agar screen bisa navigasi.
  Future<ItineraryModel?> generate({
    required int duration,
    required int budget,
    required double startLat,
    required double startLng,
    required String city,
    required List<String> preferences,
  }) async {
    state = state.copyWith(
        isLoading: true, clearError: true, clearItinerary: true);
    try {
      final result = await _service.generateItinerary(
        duration: duration,
        budget: budget,
        startLat: startLat,
        startLng: startLng,
        city: city,
        preferences: preferences,
      );
      state = state.copyWith(isLoading: false, itinerary: result);
      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return null;
    }
  }

  /// Ambil detail satu itinerary; hasilnya masuk ke state.itinerary.
  Future<void> fetchById(int id) async {
    state = state.copyWith(
        isLoading: true, clearError: true, clearItinerary: true);
    try {
      final result = await _service.getItinerary(id);
      state = state.copyWith(isLoading: false, itinerary: result);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Ambil semua itinerary milik user; hasilnya masuk ke state.itineraries.
  Future<void> fetchUserItineraries() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final results = await _service.getUserItineraries();
      state = state.copyWith(isLoading: false, itineraries: results);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void clearItinerary() {
    state = state.copyWith(clearItinerary: true, clearError: true);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final itineraryProvider =
    StateNotifierProvider<ItineraryNotifier, ItineraryState>((ref) {
  return ItineraryNotifier(ref.read(itineraryServiceProvider));
});

// ─── Provider kota (tetap FutureProvider — bukan bagian dari ItineraryState) ──

final daftarKotaProvider = FutureProvider<List<String>>((ref) async {
  return ref.read(itineraryServiceProvider).getDaftarKota();
});
