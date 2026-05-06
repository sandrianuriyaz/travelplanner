import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../core/utils/format_utils.dart';
import '../models/itinerary_generated_model.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final ItineraryGeneratedModel itinerary;

  const ResultScreen({super.key, required this.itinerary});

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedDay = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: widget.itinerary.jadwal.length,
      vsync: this,
    );
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() => _selectedDay = _tabController.index);
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ── Bangun polyline tertutup (Aturan 7.1) ────────────────────────────────
  List<LatLng> _buildClosedRoute(JadwalHari jadwal) {
    final startPoint = LatLng(
      widget.itinerary.startLatitude,
      widget.itinerary.startLongitude,
    );
    final destinationPoints = jadwal.destinasi
        .map((d) => LatLng(d.latitude, d.longitude))
        .toList();
    // WAJIB: [startPoint, ...destinations, startPoint]
    return [startPoint, ...destinationPoints, startPoint];
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final itinerary = widget.itinerary;
    final jadwalHariIni = itinerary.jadwal[_selectedDay];

    final startPoint = LatLng(itinerary.startLatitude, itinerary.startLongitude);
    final routePoints = _buildClosedRoute(jadwalHariIni);

    // Hitung center peta dari semua titik
    final allLat = routePoints.map((p) => p.latitude).toList();
    final allLng = routePoints.map((p) => p.longitude).toList();
    final centerLat = (allLat.reduce((a, b) => a + b)) / allLat.length;
    final centerLng = (allLng.reduce((a, b) => a + b)) / allLng.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rencana Perjalanan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: itinerary.jadwal
              .map((j) => Tab(text: 'Hari ${j.hari}'))
              .toList(),
          isScrollable: itinerary.jadwal.length > 4,
        ),
      ),
      body: Column(
        children: [
          // ── Ringkasan anggaran ────────────────────────────────────────
          Container(
            color: colorScheme.primaryContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _InfoChip(
                  label: 'Total Anggaran',
                  value: formatRupiah(itinerary.totalBudget),
                  icon: Icons.wallet_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
                _InfoChip(
                  label: 'Terpakai',
                  value: formatRupiah(itinerary.totalBiayaTerpakai),
                  icon: Icons.receipt_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
                _InfoChip(
                  label: 'Sisa',
                  value: formatRupiah(itinerary.sisaBudget),
                  icon: Icons.savings_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
              ],
            ),
          ),

          // ── Peta & daftar destinasi ───────────────────────────────────
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: itinerary.jadwal.map((jadwal) {
                final points = _buildClosedRoute(jadwal);
                final destPoints = jadwal.destinasi
                    .map((d) => LatLng(d.latitude, d.longitude))
                    .toList();

                return Column(
                  children: [
                    // ── Peta interaktif ──────────────────────────────────
                    SizedBox(
                      height: 260,
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: LatLng(centerLat, centerLng),
                          initialZoom: 11,
                          interactionOptions: const InteractionOptions(
                            flags: InteractiveFlag.all,
                          ),
                        ),
                        children: [
                          TileLayer(
                            urlTemplate:
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.travelplanner.mobile',
                          ),
                          PolylineLayer(
                            polylines: [
                              Polyline(
                                points: points,
                                color: colorScheme.primary,
                                strokeWidth: 3.0,
                              ),
                            ],
                          ),
                          MarkerLayer(
                            markers: [
                              // Titik awal (hotel/penginapan)
                              Marker(
                                point: startPoint,
                                width: 40,
                                height: 40,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade600,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: Colors.white, width: 2),
                                  ),
                                  child: const Icon(Icons.home,
                                      color: Colors.white, size: 20),
                                ),
                              ),
                              // Destinasi bernomor
                              ...destPoints.asMap().entries.map((entry) {
                                return Marker(
                                  point: entry.value,
                                  width: 36,
                                  height: 36,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: Colors.orange.shade700,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                          color: Colors.white, width: 2),
                                    ),
                                    child: Center(
                                      child: Text(
                                        '${entry.key + 1}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // ── Info hari ─────────────────────────────────────────
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      color: colorScheme.surfaceContainerLow,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _InfoChip(
                            label: 'Anggaran Hari',
                            value: formatRupiah(jadwal.totalBiayaHari),
                            icon: Icons.today_outlined,
                            color: colorScheme.onSurface,
                          ),
                          _InfoChip(
                            label: 'Waktu Tempuh',
                            value: formatMenit(jadwal.totalWaktuMenit),
                            icon: Icons.schedule_outlined,
                            color: colorScheme.onSurface,
                          ),
                        ],
                      ),
                    ),

                    // ── Daftar destinasi ──────────────────────────────────
                    Expanded(
                      child: ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: jadwal.destinasi.length,
                        itemBuilder: (context, idx) {
                          final dest = jadwal.destinasi[idx];
                          return _DestinasiCard(
                            nomor: dest.urutan,
                            nama: dest.nama,
                            kategori: dest.kategori,
                            kota: dest.kota,
                            hargaTiket: dest.hargaTiket,
                            estimasiTransport: dest.estimasiTransport,
                            durasiMenit: dest.durasiKunjunganMenit,
                            jarakKm: dest.jarakDariSebelumnyaKm,
                          );
                        },
                      ),
                    ),

                    // ── Leg kembali ───────────────────────────────────────
                    Container(
                      margin: const EdgeInsets.all(12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.green.shade200),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.home, color: Colors.green.shade700),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Kembali ke titik awal',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  '${jadwal.ruteKembali.jarakKm.toStringAsFixed(1)} km · '
                                  '${formatMenit(jadwal.ruteKembali.waktuTempuhMenit)} · '
                                  '${formatRupiah(jadwal.ruteKembali.estimasiBiaya)}',
                                  style: const TextStyle(
                                      fontSize: 12, color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _InfoChip({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(height: 2),
        Text(label,
            style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.7))),
        Text(value,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}

class _DestinasiCard extends StatelessWidget {
  final int nomor;
  final String nama;
  final String kategori;
  final String kota;
  final int hargaTiket;
  final int estimasiTransport;
  final int durasiMenit;
  final double jarakKm;

  const _DestinasiCard({
    required this.nomor,
    required this.nama,
    required this.kategori,
    required this.kota,
    required this.hargaTiket,
    required this.estimasiTransport,
    required this.durasiMenit,
    required this.jarakKm,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.orange.shade700,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '$nomor',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(nama,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text('$kategori · $kota',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant, fontSize: 12)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    children: [
                      _PillInfo(
                        icon: Icons.confirmation_number_outlined,
                        text: formatRupiah(hargaTiket),
                      ),
                      _PillInfo(
                        icon: Icons.directions_car_outlined,
                        text: formatRupiah(estimasiTransport),
                      ),
                      _PillInfo(
                        icon: Icons.timer_outlined,
                        text: formatMenit(durasiMenit),
                      ),
                      _PillInfo(
                        icon: Icons.route_outlined,
                        text: '${jarakKm.toStringAsFixed(1)} km',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PillInfo extends StatelessWidget {
  final IconData icon;
  final String text;

  const _PillInfo({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: Colors.grey.shade600),
        const SizedBox(width: 2),
        Text(text, style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
      ],
    );
  }
}
