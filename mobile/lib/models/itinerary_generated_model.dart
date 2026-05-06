import 'package:equatable/equatable.dart';

class LatLngPoint extends Equatable {
  final double lat;
  final double lng;

  const LatLngPoint({required this.lat, required this.lng});

  factory LatLngPoint.fromJson(Map<String, dynamic> json) {
    return LatLngPoint(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
    );
  }

  @override
  List<Object?> get props => [lat, lng];
}

class RuteKembali extends Equatable {
  final LatLngPoint dari;
  final LatLngPoint ke;
  final double jarakKm;
  final int estimasiBiaya;
  final int waktuTempuhMenit;

  const RuteKembali({
    required this.dari,
    required this.ke,
    required this.jarakKm,
    required this.estimasiBiaya,
    required this.waktuTempuhMenit,
  });

  factory RuteKembali.fromJson(Map<String, dynamic> json) {
    return RuteKembali(
      dari: LatLngPoint.fromJson(json['dari'] as Map<String, dynamic>),
      ke: LatLngPoint.fromJson(json['ke'] as Map<String, dynamic>),
      jarakKm: (json['jarak_km'] as num).toDouble(),
      estimasiBiaya: (json['estimasi_biaya'] as num).toInt(),
      waktuTempuhMenit: (json['waktu_tempuh_menit'] as num).toInt(),
    );
  }

  @override
  List<Object?> get props => [dari, ke, jarakKm];
}

class DestinasiHari extends Equatable {
  final int urutan;
  final int destinationId;
  final int estimatedCost;
  final String nama;
  final String kategori;
  final String kota;
  final double latitude;
  final double longitude;
  final int hargaTiket;
  final int durasiKunjunganMenit;
  final double jarakDariSebelumnyaKm;
  final int waktuTempuhMenit;
  final int estimasiTransport;

  const DestinasiHari({
    required this.urutan,
    required this.destinationId,
    required this.estimatedCost,
    required this.nama,
    required this.kategori,
    required this.kota,
    required this.latitude,
    required this.longitude,
    required this.hargaTiket,
    required this.durasiKunjunganMenit,
    required this.jarakDariSebelumnyaKm,
    required this.waktuTempuhMenit,
    required this.estimasiTransport,
  });

  factory DestinasiHari.fromJson(Map<String, dynamic> json) {
    return DestinasiHari(
      urutan: (json['urutan'] as num).toInt(),
      destinationId: (json['destinationId'] as num).toInt(),
      estimatedCost: (json['estimated_cost'] as num).toInt(),
      nama: json['nama'] as String,
      kategori: json['kategori'] as String,
      kota: json['kota'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      hargaTiket: (json['harga_tiket'] as num).toInt(),
      durasiKunjunganMenit: (json['durasi_kunjungan_menit'] as num).toInt(),
      jarakDariSebelumnyaKm: (json['jarak_dari_sebelumnya_km'] as num).toDouble(),
      waktuTempuhMenit: (json['waktu_tempuh_menit'] as num).toInt(),
      estimasiTransport: (json['estimasi_transport'] as num).toInt(),
    );
  }

  @override
  List<Object?> get props => [urutan, destinationId, nama];
}

class JadwalHari extends Equatable {
  final int hari;
  final int totalBiayaHari;
  final int totalBiayaKunjungan;
  final int biayaTransportPulang;
  final int totalWaktuMenit;
  final double totalWaktuJam;
  final RuteKembali ruteKembali;
  final List<DestinasiHari> destinasi;

  const JadwalHari({
    required this.hari,
    required this.totalBiayaHari,
    required this.totalBiayaKunjungan,
    required this.biayaTransportPulang,
    required this.totalWaktuMenit,
    required this.totalWaktuJam,
    required this.ruteKembali,
    required this.destinasi,
  });

  factory JadwalHari.fromJson(Map<String, dynamic> json) {
    return JadwalHari(
      hari: (json['hari'] as num).toInt(),
      totalBiayaHari: (json['total_biaya_hari'] as num).toInt(),
      totalBiayaKunjungan: (json['total_biaya_kunjungan'] as num).toInt(),
      biayaTransportPulang: (json['biaya_transport_pulang'] as num).toInt(),
      totalWaktuMenit: (json['total_waktu_menit'] as num).toInt(),
      totalWaktuJam: (json['total_waktu_jam'] as num).toDouble(),
      ruteKembali: RuteKembali.fromJson(json['rute_kembali'] as Map<String, dynamic>),
      destinasi: (json['destinasi'] as List<dynamic>)
          .map((d) => DestinasiHari.fromJson(d as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [hari];
}

class ItineraryGeneratedModel extends Equatable {
  final int itineraryId;
  final int totalBudget;
  final int budgetPerHari;
  final int durationDays;
  final double startLatitude;
  final double startLongitude;
  final int totalBiayaTerpakai;
  final int sisaBudget;
  final List<JadwalHari> jadwal;

  const ItineraryGeneratedModel({
    required this.itineraryId,
    required this.totalBudget,
    required this.budgetPerHari,
    required this.durationDays,
    required this.startLatitude,
    required this.startLongitude,
    required this.totalBiayaTerpakai,
    required this.sisaBudget,
    required this.jadwal,
  });

  factory ItineraryGeneratedModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>;
    return ItineraryGeneratedModel(
      itineraryId: (data['itinerary_id'] as num).toInt(),
      totalBudget: (data['total_budget'] as num).toInt(),
      budgetPerHari: (data['budget_per_hari'] as num).toInt(),
      durationDays: (data['duration_days'] as num).toInt(),
      startLatitude: (data['start_latitude'] as num).toDouble(),
      startLongitude: (data['start_longitude'] as num).toDouble(),
      totalBiayaTerpakai: (data['total_biaya_terpakai'] as num).toInt(),
      sisaBudget: (data['sisa_budget'] as num).toInt(),
      jadwal: (data['jadwal'] as List<dynamic>)
          .map((j) => JadwalHari.fromJson(j as Map<String, dynamic>))
          .toList(),
    );
  }

  @override
  List<Object?> get props => [itineraryId];
}
