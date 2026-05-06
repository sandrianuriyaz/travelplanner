import 'package:equatable/equatable.dart';
import 'itinerary_detail_model.dart';

class ItineraryModel extends Equatable {
  final int id;
  final int userId;
  final int totalBudget;
  final int durationDays;
  // starting_lat & starting_lng dari DB — wajib untuk menggambar polyline tertutup
  final double startingLat;
  final double startingLng;
  final String? preference;
  final DateTime createdAt;
  final List<ItineraryDetailModel> details;

  const ItineraryModel({
    required this.id,
    required this.userId,
    required this.totalBudget,
    required this.durationDays,
    required this.startingLat,
    required this.startingLng,
    this.preference,
    required this.createdAt,
    required this.details,
  });

  factory ItineraryModel.fromJson(Map<String, dynamic> json) {
    return ItineraryModel(
      id: json['id'] as int,
      userId: (json['userId'] as num).toInt(),
      totalBudget: (json['total_budget'] as num).toInt(),
      durationDays: (json['duration_days'] as num).toInt(),
      startingLat: (json['starting_lat'] as num).toDouble(),
      startingLng: (json['starting_lng'] as num).toDouble(),
      preference: json['preference'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      details: (json['details'] as List<dynamic>)
          .map((d) => ItineraryDetailModel.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'total_budget': totalBudget,
      'duration_days': durationDays,
      'starting_lat': startingLat,
      'starting_lng': startingLng,
      'preference': preference,
      'createdAt': createdAt.toIso8601String(),
      'details': details.map((d) => d.toJson()).toList(),
    };
  }

  /// Mengelompokkan details berdasarkan day_number, diurutkan orderInDay.
  /// Hasil: { 1: [detail_hari1...], 2: [detail_hari2...], ... }
  Map<int, List<ItineraryDetailModel>> get groupedByDay {
    final grouped = <int, List<ItineraryDetailModel>>{};
    for (final detail in details) {
      grouped.putIfAbsent(detail.dayNumber, () => []).add(detail);
    }
    for (final list in grouped.values) {
      list.sort((a, b) => a.orderInDay.compareTo(b.orderInDay));
    }
    return grouped;
  }

  @override
  List<Object?> get props => [id, userId, totalBudget, durationDays, createdAt];
}
