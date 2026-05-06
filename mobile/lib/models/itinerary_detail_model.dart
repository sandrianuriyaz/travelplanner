import 'package:equatable/equatable.dart';
import 'itinerary_generated_model.dart';

class DestinasiDetail extends Equatable {
  final int urutan;
  final String nama;
  final String kategori;
  final String kota;
  final double latitude;
  final double longitude;
  final int estimatedCost;

  const DestinasiDetail({
    required this.urutan,
    required this.nama,
    required this.kategori,
    required this.kota,
    required this.latitude,
    required this.longitude,
    required this.estimatedCost,
  });

  factory DestinasiDetail.fromJson(Map<String, dynamic> json) {
    return DestinasiDetail(
      urutan: (json['urutan'] as num).toInt(),
      nama: json['nama'] as String,
      kategori: json['kategori'] as String,
      kota: json['kota'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      estimatedCost: (json['estimated_cost'] as num).toInt(),
    );
  }

  @override
  List<Object?> get props => [urutan, nama, kota];
}

class JadwalHariDetail extends Equatable {
  final int hari;
  final List<DestinasiDetail> destinasi;
  final RuteKembali ruteKembali;

  const JadwalHariDetail({
    required this.hari,
    required this.destinasi,
    required this.ruteKembali,
  });

  factory JadwalHariDetail.fromJson(Map<String, dynamic> json) {
    return JadwalHariDetail(
      hari: (json['hari'] as num).toInt(),
      destinasi: (json['destinasi'] as List<dynamic>)
          .map((d) => DestinasiDetail.fromJson(d as Map<String, dynamic>))
          .toList(),
      ruteKembali: RuteKembali.fromJson(json['rute_kembali'] as Map<String, dynamic>),
    );
  }

  @override
  List<Object?> get props => [hari];
}

class PenggunaModel extends Equatable {
  final String username;
  final String email;

  const PenggunaModel({required this.username, required this.email});

  factory PenggunaModel.fromJson(Map<String, dynamic> json) {
    return PenggunaModel(
      username: json['username'] as String,
      email: json['email'] as String,
    );
  }

  @override
  List<Object?> get props => [username, email];
}

class ItineraryDetailModel extends Equatable {
  final int id;
  final int totalBudget;
  final int durationDays;
  final String? preferensi;
  final double startLatitude;
  final double startLongitude;
  final String dibuatPada;
  final PenggunaModel pengguna;
  final List<JadwalHariDetail> jadwal;

  const ItineraryDetailModel({
    required this.id,
    required this.totalBudget,
    required this.durationDays,
    this.preferensi,
    required this.startLatitude,
    required this.startLongitude,
    required this.dibuatPada,
    required this.pengguna,
    required this.jadwal,
  });

  factory ItineraryDetailModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>;
    return ItineraryDetailModel(
      id: (data['id'] as num).toInt(),
      totalBudget: (data['total_budget'] as num).toInt(),
      durationDays: (data['duration_days'] as num).toInt(),
      preferensi: data['preferensi'] as String?,
      startLatitude: (data['start_latitude'] as num).toDouble(),
      startLongitude: (data['start_longitude'] as num).toDouble(),
      dibuatPada: data['dibuat_pada'] as String,
      pengguna: PenggunaModel.fromJson(data['pengguna'] as Map<String, dynamic>),
      jadwal: (data['jadwal'] as List<dynamic>)
          .map((j) => JadwalHariDetail.fromJson(j as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [id];
}
