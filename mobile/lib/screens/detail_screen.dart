import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:shimmer/shimmer.dart';
import '../core/utils/format_utils.dart';
import '../models/itinerary_detail_model.dart';
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
  void dispose() {
    _tabController?.dispose();
    super.dispose();
  }

  // ── Polyline tertutup per hari (Aturan 7.1) ───────────────────────────────
  List<LatLng> _buildClosedRoute(
      ItineraryDetailModel detail, JadwalHariDetail jadwal) {
    final startPoint = LatLng(detail.startLatitude, detail.startLongitude);
    final destinationPoints =
        jadwal.destinasi.map((d) => LatLng(d.latitude, d.longitude)).toList();
    // WAJIB: [startPoint, ...destinations, startPoint]
    return [startPoint, ...destinationPoints, startPoint];
  }

  @override
  Widget build(BuildContext context) {
    final detailAsync = ref.watch(itineraryDetailProvider(widget.itineraryId));

    return detailAsync.when(
      loading: () => _buildSkeleton(context),
      error: (e, _) => _buildError(context, e.toString()),
      data: (detail) => _buildContent(context, detail),
    );
  }

  Widget _buildSkeleton(BuildContext context) {
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
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Detail Perjalanan')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off, size: 64, color: colorScheme.error),
              const SizedBox(height: 16),
              Text(
                'Gagal memuat detail itinerary.\n$pesan',
                textAlign: TextAlign.center,
                style: TextStyle(color: colorScheme.error),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () =>
                    ref.invalidate(itineraryDetailProvider(widget.itineraryId)),
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

  Widget _buildContent(BuildContext context, ItineraryDetailModel detail) {
    _tabController ??= TabController(
      length: detail.jadwal.length,
      vsync: this,
    )..addListener(() {
        if (!_tabController!.indexIsChanging) {
          setState(() => _selectedDay = _tabController!.index);
        }
      });

    final colorScheme = Theme.of(context).colorScheme;
    final jadwalHariIni = detail.jadwal[_selectedDay];
    final startPoint = LatLng(detail.startLatitude, detail.startLongitude);
    final routePoints = _buildClosedRoute(detail, jadwalHariIni);

    final allLat = routePoints.map((p) => p.latitude).toList();
    final allLng = routePoints.map((p) => p.longitude).toList();
    final centerLat = allLat.reduce((a, b) => a + b) / allLat.length;
    final centerLng = allLng.reduce((a, b) => a + b) / allLng.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(detail.preferensi ?? 'Detail Perjalanan'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        bottom: TabBar(
          controller: _tabController!,
          tabs: detail.jadwal
              .map((j) => Tab(text: 'Hari ${j.hari}'))
              .toList(),
          isScrollable: detail.jadwal.length > 4,
        ),
      ),
      body: Column(
        children: [
          // ── Ringkasan ─────────────────────────────────────────────────
          Container(
            color: colorScheme.primaryContainer,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _InfoChip(
                  label: 'Total Anggaran',
                  value: formatRupiah(detail.totalBudget),
                  icon: Icons.wallet_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
                _InfoChip(
                  label: 'Durasi',
                  value: '${detail.durationDays} hari',
                  icon: Icons.calendar_today_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
                _InfoChip(
                  label: 'Dibuat',
                  value: formatTanggal(detail.dibuatPada).split(',').first,
                  icon: Icons.event_note_outlined,
                  color: colorScheme.onPrimaryContainer,
                ),
              ],
            ),
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController!,
              children: detail.jadwal.map((jadwal) {
                final points = _buildClosedRoute(detail, jadwal);
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
                            estimatedCost: dest.estimatedCost,
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
                                  style:
                                      TextStyle(fontWeight: FontWeight.w600),
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
  final int estimatedCost;

  const _DestinasiCard({
    required this.nomor,
    required this.nama,
    required this.kategori,
    required this.kota,
    required this.estimatedCost,
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
                  const SizedBox(height: 4),
                  Text('$kategori · $kota',
                      style: TextStyle(
                          color: colorScheme.onSurfaceVariant, fontSize: 12)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.receipt_outlined,
                          size: 14, color: colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        'Estimasi biaya: ${formatRupiah(estimatedCost)}',
                        style: TextStyle(
                          color: colorScheme.primary,
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
