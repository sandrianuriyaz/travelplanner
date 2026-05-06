import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/itinerary_model.dart';
import '../models/riwayat_model.dart';
import '../services/itinerary_service.dart';

// ─── State generate itinerary ────────────────────────────────────────────────

class GenerateState {
  final ItineraryModel? data;
  final bool isLoading;
  final String? error;

  const GenerateState({this.data, this.isLoading = false, this.error});

  GenerateState copyWith({
    ItineraryModel? data,
    bool? isLoading,
    String? error,
    bool clearError = false,
  }) {
    return GenerateState(
      data: data ?? this.data,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

class GenerateNotifier extends Notifier<GenerateState> {
  late final ItineraryService _service;

  @override
  GenerateState build() {
    _service = ref.read(itineraryServiceProvider);
    return const GenerateState();
  }

  Future<ItineraryModel?> generate({
    required int duration,
    required int budget,
    required double startLat,
    required double startLng,
    required String city,
    required List<String> preferences,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _service.generateItinerary(
        duration: duration,
        budget: budget,
        startLat: startLat,
        startLng: startLng,
        city: city,
        preferences: preferences,
      );
      state = state.copyWith(data: result, isLoading: false);
      return result;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return null;
    }
  }

  void reset() {
    state = const GenerateState();
  }
}

final generateProvider =
    NotifierProvider<GenerateNotifier, GenerateState>(() => GenerateNotifier());

// ─── Provider riwayat (preview list dengan RiwayatItemModel) ─────────────────

final riwayatProvider = FutureProvider<List<RiwayatItemModel>>((ref) async {
  return ref.read(itineraryServiceProvider).getRiwayat();
});

// ─── Provider detail itinerary (ItineraryModel lengkap per ID) ───────────────

final itineraryDetailProvider =
    FutureProvider.family<ItineraryModel, int>((ref, id) async {
  return ref.read(itineraryServiceProvider).getItinerary(id);
});

// ─── Provider daftar kota untuk dropdown form ─────────────────────────────────

final daftarKotaProvider = FutureProvider<List<String>>((ref) async {
  return ref.read(itineraryServiceProvider).getDaftarKota();
});
