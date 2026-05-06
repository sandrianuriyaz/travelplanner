import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/format_utils.dart';
import '../models/itinerary_detail_model.dart';
import '../models/itinerary_model.dart';
import '../providers/itinerary_provider.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final ItineraryModel itinerary;

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
    final dayCount = widget.itinerary.groupedByDay.keys.length;
    _tabController = TabController(length: dayCount.clamp(1, 99), vsync: this)
      ..addListener(() {
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

  // Polyline tertutup: start → dest1 → ... → start (Aturan 7.1)
  List<LatLng> _buildClosedRoute(List<ItineraryDetailModel> details) {
    final start = LatLng(
        widget.itinerary.startingLat, widget.itinerary.startingLng);
    final points =
        details.map((d) => LatLng(d.destination.latitude, d.destination.longitude)).toList();
    return [start, ...points, start];
  }

  @override
  Widget build(BuildContext context) {
    final itinerary = widget.itinerary;
    final grouped = itinerary.groupedByDay;
    final sortedDays = grouped.keys.toList()..sort();

    if (sortedDays.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Rencana Perjalanan')),
        body: const Center(child: Text('Tidak ada destinasi yang ditemukan.')),
      );
    }

    final currentDetails = grouped[sortedDays[_selectedDay]] ?? [];
    final startPoint = LatLng(itinerary.startingLat, itinerary.startingLng);
    final routePoints = _buildClosedRoute(currentDetails);

    final allLat = routePoints.map((p) => p.latitude);
    final allLng = routePoints.map((p) => p.longitude);
    final centerLat = allLat.reduce((a, b) => a + b) / routePoints.length;
    final centerLng = allLng.reduce((a, b) => a + b) / routePoints.length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rencana Perjalanan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            ref.read(generateProvider.notifier).reset();
            context.go('/home');
          },
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: sortedDays.map((d) => Tab(text: 'Hari $d')).toList(),
          isScrollable: sortedDays.length > 4,
        ),
      ),
      body: Column(
        children: [
          // ── Ringkasan total ───────────────────────────────────────────
          Container(
            color: AppColors.colorScheme.primaryContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _Chip(
                  label: 'Total Anggaran',
                  value: formatRupiah(itinerary.totalBudget),
                  icon: Icons.wallet_outlined,
                ),
                _Chip(
                  label: 'Durasi',
                  value: '${itinerary.durationDays} hari',
                  icon: Icons.calendar_today_outlined,
                ),
                _Chip(
                  label: 'Kota',
                  value: itinerary.preference ?? '-',
                  icon: Icons.location_city_outlined,
                ),
              ],
            ),
          ),

          // ── Konten per hari ───────────────────────────────────────────
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: sortedDays.map((dayNum) {
                final hariDetails = grouped[dayNum] ?? [];
                final points = _buildClosedRoute(hariDetails);
                final destPoints = hariDetails
                    .map((d) => LatLng(
                        d.destination.latitude, d.destination.longitude))
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
                                color: AppColors.primary,
                                strokeWidth: 3.0,
                              ),
                            ],
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: startPoint,
                                width: 40,
                                height: 40,
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: AppColors.mapMarkerStart,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: Colors.white, width: 2),
                                  ),
                                  child: const Icon(Icons.home,
                                      color: Colors.white, size: 20),
                                ),
                              ),
                              ...destPoints.asMap().entries.map((e) => Marker(
                                    point: e.value,
                                    width: 36,
                                    height: 36,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: AppColors.mapMarkerDestination,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 2),
                                      ),
                                      child: Center(
                                        child: Text(
                                          '${e.key + 1}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                    ),
                                  )),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // ── Daftar destinasi ──────────────────────────────────
                    Expanded(
                      child: hariDetails.isEmpty
                          ? const Center(
                              child:
                                  Text('Tidak ada destinasi pada hari ini.'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: hariDetails.length,
                              itemBuilder: (context, idx) =>
                                  _DestinasiCard(detail: hariDetails[idx]),
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

class _Chip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _Chip({required this.label, required this.value, required this.icon});

  @override
  Widget build(BuildContext context) {
    final color = AppColors.colorScheme.onPrimaryContainer;
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
  final ItineraryDetailModel detail;

  const _DestinasiCard({required this.detail});

  @override
  Widget build(BuildContext context) {
    final dest = detail.destination;
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
              decoration: const BoxDecoration(
                color: AppColors.accent,
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${detail.orderInDay}',
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
                  Text(dest.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text('${dest.category} · ${dest.city}',
                      style: const TextStyle(
                          color: AppColors.textSecondary, fontSize: 12)),
                  if (dest.entranceFee > 0) ...[
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(Icons.confirmation_number_outlined,
                          size: 13, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text(
                        'Tiket: ${formatRupiah(dest.entranceFee)}',
                        style: const TextStyle(
                            fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ]),
                  ],
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.receipt_outlined,
                        size: 13, color: AppColors.primary),
                    const SizedBox(width: 4),
                    Text(
                      'Estimasi: ${formatRupiah(detail.estimatedCost)}',
                      style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
