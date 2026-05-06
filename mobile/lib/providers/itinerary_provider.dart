import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/itinerary_generated_model.dart';
import '../models/itinerary_model.dart';
import '../models/riwayat_model.dart';
import '../services/itinerary_service.dart';

// ─── State generate itinerary ────────────────────────────────────────────────

class GenerateState {
  final ItineraryGeneratedModel? data;
  final bool isLoading;
  final String? error;

  const GenerateState({this.data, this.isLoading = false, this.error});

  GenerateState copyWith({
    ItineraryGeneratedModel? data,
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

  Future<ItineraryGeneratedModel?> generate({
    required int totalBudget,
    required int durationDays,
    required double startLatitude,
    required double startLongitude,
    String? cityPreference,
    String? categoryPreference,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final result = await _service.generateItinerary(
        totalBudget: totalBudget,
        durationDays: durationDays,
        startLatitude: startLatitude,
        startLongitude: startLongitude,
        cityPreference: cityPreference,
        categoryPreference: categoryPreference,
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

// ─── Provider riwayat (preview list) ─────────────────────────────────────────

final riwayatProvider = FutureProvider<List<RiwayatItemModel>>((ref) async {
  final service = ref.read(itineraryServiceProvider);
  return service.getRiwayat();
});

// ─── Provider detail itinerary (per ID) — mengembalikan ItineraryModel ───────

final itineraryDetailProvider =
    FutureProvider.family<ItineraryModel, int>((ref, id) async {
  final service = ref.read(itineraryServiceProvider);
  return service.getItineraryById(id);
});

// ─── Provider daftar kota untuk dropdown form ─────────────────────────────────

final daftarKotaProvider = FutureProvider<List<String>>((ref) async {
  final service = ref.read(itineraryServiceProvider);
  return service.getDaftarKota();
});
