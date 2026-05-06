import 'package:equatable/equatable.dart';
import 'destination_model.dart';

class ItineraryDetailModel extends Equatable {
  final int id;
  final int itineraryId;
  final int dayNumber;
  final int destinationId;
  final int orderInDay;
  final int estimatedCost;
  final DestinationModel destination;

  const ItineraryDetailModel({
    required this.id,
    required this.itineraryId,
    required this.dayNumber,
    required this.destinationId,
    required this.orderInDay,
    required this.estimatedCost,
    required this.destination,
  });

  factory ItineraryDetailModel.fromJson(Map<String, dynamic> json) {
    return ItineraryDetailModel(
      id: json['id'] as int,
      itineraryId: (json['itineraryId'] as num).toInt(),
      dayNumber: (json['day_number'] as num).toInt(),
      destinationId: (json['destinationId'] as num).toInt(),
      orderInDay: (json['order_in_day'] as num).toInt(),
      estimatedCost: (json['estimated_cost'] as num).toInt(),
      destination: DestinationModel.fromJson(
        json['destination'] as Map<String, dynamic>,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'itineraryId': itineraryId,
      'day_number': dayNumber,
      'destinationId': destinationId,
      'order_in_day': orderInDay,
      'estimated_cost': estimatedCost,
      'destination': destination.toJson(),
    };
  }

  @override
  List<Object?> get props => [id, itineraryId, dayNumber, orderInDay];
}
