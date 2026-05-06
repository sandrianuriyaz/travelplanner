import 'package:equatable/equatable.dart';

class RiwayatDestinasiPreview extends Equatable {
  final String name;
  final String category;
  final String city;

  const RiwayatDestinasiPreview({
    required this.name,
    required this.category,
    required this.city,
  });

  factory RiwayatDestinasiPreview.fromJson(Map<String, dynamic> json) {
    return RiwayatDestinasiPreview(
      name: json['name'] as String,
      category: json['category'] as String,
      city: json['city'] as String,
    );
  }

  @override
  List<Object?> get props => [name, city];
}

class RiwayatDetailPreview extends Equatable {
  final int dayNumber;
  final int orderInDay;
  final int estimatedCost;
  final RiwayatDestinasiPreview destination;

  const RiwayatDetailPreview({
    required this.dayNumber,
    required this.orderInDay,
    required this.estimatedCost,
    required this.destination,
  });

  factory RiwayatDetailPreview.fromJson(Map<String, dynamic> json) {
    return RiwayatDetailPreview(
      dayNumber: (json['day_number'] as num).toInt(),
      orderInDay: (json['order_in_day'] as num).toInt(),
      estimatedCost: (json['estimated_cost'] as num).toInt(),
      destination: RiwayatDestinasiPreview.fromJson(
        json['destination'] as Map<String, dynamic>,
      ),
    );
  }

  @override
  List<Object?> get props => [dayNumber, orderInDay];
}

class RiwayatItemModel extends Equatable {
  final int id;
  final int totalBudget;
  final int durationDays;
  final String? preference;
  final String createdAt;
  final List<RiwayatDetailPreview> details;

  const RiwayatItemModel({
    required this.id,
    required this.totalBudget,
    required this.durationDays,
    this.preference,
    required this.createdAt,
    required this.details,
  });

  factory RiwayatItemModel.fromJson(Map<String, dynamic> json) {
    return RiwayatItemModel(
      id: (json['id'] as num).toInt(),
      totalBudget: (json['total_budget'] as num).toInt(),
      durationDays: (json['duration_days'] as num).toInt(),
      preference: json['preference'] as String?,
      createdAt: json['createdAt'] as String,
      details: (json['details'] as List<dynamic>)
          .map((d) => RiwayatDetailPreview.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id];
}
