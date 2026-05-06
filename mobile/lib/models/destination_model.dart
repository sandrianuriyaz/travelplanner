import 'package:equatable/equatable.dart';

class DestinationModel extends Equatable {
  final int id;
  final String name;
  final String category;
  final String city;
  final double latitude;
  final double longitude;
  final int entranceFee;
  final int averageDurationSpent;
  final String? imageUrl;

  const DestinationModel({
    required this.id,
    required this.name,
    required this.category,
    required this.city,
    required this.latitude,
    required this.longitude,
    required this.entranceFee,
    required this.averageDurationSpent,
    this.imageUrl,
  });

  factory DestinationModel.fromJson(Map<String, dynamic> json) {
    return DestinationModel(
      id: json['id'] as int,
      name: json['name'] as String,
      category: json['category'] as String,
      city: json['city'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      entranceFee: (json['entrance_fee'] as num).toInt(),
      averageDurationSpent: (json['average_duration_spent'] as num).toInt(),
      imageUrl: json['image_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'city': city,
      'latitude': latitude,
      'longitude': longitude,
      'entrance_fee': entranceFee,
      'average_duration_spent': averageDurationSpent,
      'image_url': imageUrl,
    };
  }

  @override
  List<Object?> get props => [id, name, category, city];
}
