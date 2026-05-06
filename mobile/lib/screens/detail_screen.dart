import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:shimmer/shimmer.dart';
import '../core/constants/app_colors.dart';
import '../core/utils/format_utils.dart';
import '../models/itinerary_detail_model.dart';
import '../models/itinerary_model.dart';
import '../providers/itinerary_provider.dart';

class DetailScreen extends ConsumerStatefulWidget {
  final int itineraryId;

  const DetailScreen({super.key, required this.itineraryId});

  @override
  ConsumerState<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends ConsumerState<DetailScreen>
    with SingleTickerProviderStateMixin {
  TabController? _tabController;
  int _selectedDay = 0;

  @override
  void initState() {
    super.initState();
    // Trigger fetchById setelah frame pertama terbentuk
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(itineraryProvider.notifier).fetchById(widget.itineraryId);
    });
  }

  @override
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  // Polyline tertutup: startPoint → dest1 → ... → startPoint (Aturan 7.1)
  List<LatLng> _buildClosedRoute(
      ItineraryModel itinerary, List<ItineraryDetailModel> details) {
    final start = LatLng(itinerary.startingLat, itinerary.startingLng);
    final points =
        details.map((d) => LatLng(d.destination.latitude, d.destination.longitude)).toList();
    return [start, ...points, start];
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(itineraryProvider);

    if (state.isLoading || state.itinerary == null) {
      return _buildSkeleton(context, state.error);
    }
    if (state.error != null && state.itinerary == null) {
      return _buildError(context, state.error!);
    }
    return _buildContent(context, state.itinerary!);
  }

  Widget _buildSkeleton(BuildContext context, String? error) {
    if (error != null) return _buildError(context, error);
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Perjalanan')),
      body: Shimmer.fromColors(
        baseColor: Colors.grey.shade300,
        highlightColor: Colors.grey.shade100,
        child: Column(
          children: [
            Container(height: 260, color: Colors.white),
            const SizedBox(height: 12),
            ...List.generate(
              4,
              (_) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, String pesan) {
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Perjalanan')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off, size: 64, color: AppColors.error),
              const SizedBox(height: 16),
              Text(
                'Gagal memuat detail.\n$pesan',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.error),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref
                    .read(itineraryProvider.notifier)
                    .fetchById(widget.itineraryId),
                child: const Text('Coba lagi'),
              ),
              const SizedBox(height: 8),
              TextButton(
                onPressed: () => context.go('/home'),
                child: const Text('Kembali ke beranda'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, ItineraryModel itinerary) {
    final grouped = itinerary.groupedByDay;
    final sortedDays = grouped.keys.toList()..sort();

    _tabController ??= TabController(
      length: sortedDays.length.clamp(1, 99),
      vsync: this,
    )..addListener(() {
        if (!_tabController!.indexIsChanging) {
          setState(() => _selectedDay = _tabController!.index);
        }
      });

    final currentDetails = grouped[sortedDays[_selectedDay]] ?? [];
    final startPoint = LatLng(itinerary.startingLat, itinerary.startingLng);
    final routePoints = _buildClosedRoute(itinerary, currentDetails);

    final allLat = routePoints.map((p) => p.latitude);
    final allLng = routePoints.map((p) => p.longitude);
    final centerLat = allLat.reduce((a, b) => a + b) / routePoints.length;
    final centerLng = allLng.reduce((a, b) => a + b) / routePoints.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(itinerary.preference ?? 'Detail Perjalanan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        bottom: TabBar(
          controller: _tabController!,
          tabs: sortedDays.map((d) => Tab(text: 'Hari $d')).toList(),
          isScrollable: sortedDays.length > 4,
        ),
      ),
      body: Column(
        children: [
          // ── Ringkasan ─────────────────────────────────────────────────
          Container(
            color: AppColors.colorScheme.primaryContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _InfoChip(
                  label: 'Total Anggaran',
                  value: formatRupiah(itinerary.totalBudget),
                  icon: Icons.wallet_outlined,
                ),
                _InfoChip(
                  label: 'Durasi',
                  value: '${itinerary.durationDays} hari',
                  icon: Icons.calendar_today_outlined,
                ),
                _InfoChip(
                  label: 'Dibuat',
                  value: formatTanggal(itinerary.createdAt.toIso8601String())
                      .split(',')
                      .first,
                  icon: Icons.event_note_outlined,
                ),
              ],
            ),
          ),

          // ── Konten per hari ───────────────────────────────────────────
          Expanded(
            child: TabBarView(
              controller: _tabController!,
              children: sortedDays.map((dayNum) {
                final hariDetails = grouped[dayNum] ?? [];
                final points = _buildClosedRoute(itinerary, hariDetails);
                final destPoints = hariDetails
                    .map((d) =>
                        LatLng(d.destination.latitude, d.destination.longitude))
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
                              child: Text('Tidak ada destinasi pada hari ini'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: hariDetails.length,
                              itemBuilder: (_, idx) =>
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

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _InfoChip({required this.label, required this.value, required this.icon});

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
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.receipt_outlined,
                          size: 14, color: AppColors.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Estimasi: ${formatRupiah(detail.estimatedCost)}',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
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
