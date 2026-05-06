import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import '../core/utils/format_utils.dart';
import '../providers/auth_provider.dart';
import '../providers/itinerary_provider.dart';
import '../services/itinerary_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;

  void navigateTo(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: const [
          _BerandaTab(),
          _PlannerTab(),
          _RiwayatTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.add_location_alt_outlined),
            selectedIcon: Icon(Icons.add_location_alt),
            label: 'Rencanakan',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'Riwayat',
          ),
        ],
      ),
    );
  }
}

// ─── Tab Beranda ──────────────────────────────────────────────────────────────

class _BerandaTab extends ConsumerWidget {
  const _BerandaTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final colorScheme = Theme.of(context).colorScheme;
    final riwayatAsync = ref.watch(riwayatProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Travel Planner'),
        actions: [
          PopupMenuButton<String>(
            icon: CircleAvatar(
              backgroundColor: colorScheme.primaryContainer,
              child: Icon(Icons.person, color: colorScheme.onPrimaryContainer),
            ),
            onSelected: (value) async {
              if (value == 'logout') {
                final konfirmasi = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Keluar'),
                    content: const Text('Apakah Anda yakin ingin keluar?'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Batal'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Keluar'),
                      ),
                    ],
                  ),
                );
                if (konfirmasi == true) {
                  await ref.read(authProvider.notifier).logout();
                }
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authState.user?.username ?? 'Pengguna',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      authState.user?.email ?? '',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18),
                    SizedBox(width: 8),
                    Text('Keluar'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header selamat datang ─────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [colorScheme.primary, colorScheme.tertiary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Selamat datang,',
                    style: TextStyle(
                      color: colorScheme.onPrimary.withValues(alpha: 0.8),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    authState.user?.username ?? 'Pengguna',
                    style: TextStyle(
                      color: colorScheme.onPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Mau liburan ke mana hari ini?',
                    style: TextStyle(
                      color: colorScheme.onPrimary.withValues(alpha: 0.9),
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Aksi cepat ───────────────────────────────────────────────
            Text(
              'Mulai dari sini',
              style: Theme.of(context)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _AksiCard(
                    icon: Icons.add_location_alt,
                    label: 'Buat Rencana',
                    warna: colorScheme.primaryContainer,
                    warnaIkon: colorScheme.onPrimaryContainer,
                    onTap: () {
                      context
                          .findAncestorStateOfType<_HomeScreenState>()
                          ?.navigateTo(1);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _AksiCard(
                    icon: Icons.history,
                    label: 'Lihat Riwayat',
                    warna: colorScheme.secondaryContainer,
                    warnaIkon: colorScheme.onSecondaryContainer,
                    onTap: () {
                      context
                          .findAncestorStateOfType<_HomeScreenState>()
                          ?.navigateTo(2);
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Preview riwayat terbaru ───────────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Perjalanan Terbaru',
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: () {
                    context
                        .findAncestorStateOfType<_HomeScreenState>()
                        ?.navigateTo(2);
                  },
                  child: const Text('Lihat semua'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            riwayatAsync.when(
              loading: () => _ShimmerRiwayat(),
              error: (e, _) => Center(
                child: Text(
                  'Gagal memuat riwayat',
                  style: TextStyle(color: colorScheme.error),
                ),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.luggage_outlined,
                            size: 48, color: colorScheme.onSurfaceVariant),
                        const SizedBox(height: 8),
                        Text(
                          'Belum ada rencana perjalanan.\nBuat rencana pertama Anda!',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ),
                  );
                }
                return Column(
                  children: list.take(3).map((item) {
                    final preview = item.details.isNotEmpty
                        ? item.details.first.destination.name
                        : 'Tidak ada destinasi';
                    return Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: colorScheme.primaryContainer,
                          child: Text(
                            '${item.durationDays}H',
                            style: TextStyle(
                              color: colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                        title: Text(
                          item.preference ?? 'Perjalanan',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(preview),
                        trailing: Text(
                          formatRupiah(item.totalBudget),
                          style: TextStyle(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                        onTap: () => context.push('/detail/${item.id}'),
                      ),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _AksiCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color warna;
  final Color warnaIkon;
  final VoidCallback onTap;

  const _AksiCard({
    required this.icon,
    required this.label,
    required this.warna,
    required this.warnaIkon,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: warna,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: warnaIkon),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.w600, color: warnaIkon),
            ),
          ],
        ),
      ),
    );
  }
}

class _ShimmerRiwayat extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Colors.grey.shade300,
      highlightColor: Colors.grey.shade100,
      child: Column(
        children: List.generate(
          3,
          (_) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            height: 72,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Tab Rencanakan ───────────────────────────────────────────────────────────

class _PlannerTab extends ConsumerStatefulWidget {
  const _PlannerTab();

  @override
  ConsumerState<_PlannerTab> createState() => _PlannerTabState();
}

class _PlannerTabState extends ConsumerState<_PlannerTab> {
  final _formKey = GlobalKey<FormState>();
  final _budgetCtrl = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();

  int _durationDays = 1;
  String? _selectedKota;
  String? _selectedKategori;

  static const List<String> _kategoriOptions = [
    'Bahari',
    'Cagar Alam',
    'Budaya',
    'Taman Wisata Alam',
    'Taman Hiburan',
    'Belanja',
    'Kuliner',
  ];

  @override
  void dispose() {
    _budgetCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    if (!_formKey.currentState!.validate()) return;

    final budget = int.tryParse(_budgetCtrl.text.replaceAll('.', '').replaceAll(',', ''));
    final lat = double.tryParse(_latCtrl.text);
    final lng = double.tryParse(_lngCtrl.text);

    if (budget == null || lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pastikan semua angka diisi dengan benar'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final result = await ref.read(generateProvider.notifier).generate(
          duration: _durationDays,
          budget: budget,
          startLat: lat,
          startLng: lng,
          city: _selectedKota ?? '',
          preferences:
              _selectedKategori != null ? [_selectedKategori!] : [],
        );

    if (result != null && mounted) {
      ref.invalidate(riwayatProvider);
      context.push('/result', extra: result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final generateState = ref.watch(generateProvider);
    final kotaAsync = ref.watch(daftarKotaProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Rencanakan Perjalanan')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Budget ────────────────────────────────────────────────
              _SeksiLabel(label: 'Total Anggaran (Rp)'),
              const SizedBox(height: 8),
              TextFormField(
                controller: _budgetCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Contoh: 500000',
                  prefixIcon: Icon(Icons.wallet_outlined),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Anggaran wajib diisi';
                  final angka = int.tryParse(val.replaceAll('.', '').replaceAll(',', ''));
                  if (angka == null || angka <= 0) return 'Anggaran harus lebih dari 0';
                  return null;
                },
              ),
              const SizedBox(height: 20),

              // ── Durasi ────────────────────────────────────────────────
              _SeksiLabel(label: 'Durasi Perjalanan'),
              const SizedBox(height: 8),
              Row(
                children: [
                  IconButton.filled(
                    onPressed: _durationDays > 1
                        ? () => setState(() => _durationDays--)
                        : null,
                    icon: const Icon(Icons.remove),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$_durationDays hari',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  IconButton.filled(
                    onPressed: _durationDays < 7
                        ? () => setState(() => _durationDays++)
                        : null,
                    icon: const Icon(Icons.add),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Koordinat ─────────────────────────────────────────────
              _SeksiLabel(label: 'Lokasi Awal (Titik Keberangkatan)'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                      decoration: const InputDecoration(
                        labelText: 'Latitude',
                        hintText: '-7.3274',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Wajib diisi';
                        if (double.tryParse(val) == null) return 'Tidak valid';
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lngCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                          decimal: true, signed: true),
                      decoration: const InputDecoration(
                        labelText: 'Longitude',
                        hintText: '108.2207',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Wajib diisi';
                        if (double.tryParse(val) == null) return 'Tidak valid';
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () {
                    _latCtrl.text = '-7.3274';
                    _lngCtrl.text = '108.2207';
                    setState(() => _selectedKota = 'Tasikmalaya');
                  },
                  icon: const Icon(Icons.my_location, size: 16),
                  label: const Text('Gunakan koordinat Tasikmalaya'),
                ),
              ),
              const SizedBox(height: 12),

              // ── Kota ─────────────────────────────────────────────────
              _SeksiLabel(label: 'Kota Tujuan (Opsional)'),
              const SizedBox(height: 8),
              kotaAsync.when(
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
                data: (kotaList) {
                  return DropdownButtonFormField<String>(
                    key: ValueKey(_selectedKota),
                    initialValue: _selectedKota,
                    decoration: const InputDecoration(
                      labelText: 'Pilih kota',
                      prefixIcon: Icon(Icons.location_city_outlined),
                    ),
                    items: [
                      const DropdownMenuItem(
                        value: null,
                        child: Text('Otomatis (berdasarkan koordinat)'),
                      ),
                      ...kotaList.map(
                        (kota) => DropdownMenuItem(value: kota, child: Text(kota)),
                      ),
                    ],
                    onChanged: (val) => setState(() => _selectedKota = val),
                  );
                },
              ),
              const SizedBox(height: 20),

              // ── Kategori ──────────────────────────────────────────────
              _SeksiLabel(label: 'Kategori Wisata (Opsional)'),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                key: ValueKey(_selectedKategori),
                initialValue: _selectedKategori,
                decoration: const InputDecoration(
                  labelText: 'Pilih kategori',
                  prefixIcon: Icon(Icons.category_outlined),
                ),
                items: [
                  const DropdownMenuItem(
                    value: null,
                    child: Text('Semua Kategori'),
                  ),
                  ..._kategoriOptions.map(
                    (k) => DropdownMenuItem(value: k, child: Text(k)),
                  ),
                ],
                onChanged: (val) => setState(() => _selectedKategori = val),
              ),
              const SizedBox(height: 16),

              if (generateState.error != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: colorScheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: colorScheme.onErrorContainer, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          generateState.error!,
                          style: TextStyle(color: colorScheme.onErrorContainer),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              ElevatedButton.icon(
                onPressed: generateState.isLoading ? null : _generate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: colorScheme.primary,
                  foregroundColor: colorScheme.onPrimary,
                ),
                icon: generateState.isLoading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.auto_awesome),
                label: Text(generateState.isLoading
                    ? 'Membuat rencana...'
                    : 'Buat Rencana Perjalanan'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _SeksiLabel extends StatelessWidget {
  final String label;
  const _SeksiLabel({required this.label});

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: Theme.of(context).textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
    );
  }
}

// ─── Tab Riwayat ──────────────────────────────────────────────────────────────

class _RiwayatTab extends ConsumerWidget {
  const _RiwayatTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final riwayatAsync = ref.watch(riwayatProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Riwayat Perjalanan')),
      body: riwayatAsync.when(
        loading: () => ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: 5,
          itemBuilder: (_, __) => Shimmer.fromColors(
            baseColor: Colors.grey.shade300,
            highlightColor: Colors.grey.shade100,
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              height: 100,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.cloud_off, size: 64, color: colorScheme.error),
              const SizedBox(height: 16),
              Text(
                'Gagal memuat riwayat.\n$e',
                textAlign: TextAlign.center,
                style: TextStyle(color: colorScheme.error),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.invalidate(riwayatProvider),
                child: const Text('Coba lagi'),
              ),
            ],
          ),
        ),
        data: (list) {
          if (list.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.luggage_outlined,
                      size: 80, color: colorScheme.onSurfaceVariant),
                  const SizedBox(height: 16),
                  Text(
                    'Belum ada riwayat perjalanan',
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(riwayatProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              itemBuilder: (context, index) {
                final item = list[index];
                final destinations = item.details
                    .map((d) => d.destination.name)
                    .take(2)
                    .join(', ');

                return Dismissible(
                  key: Key('riwayat-${item.id}'),
                  direction: DismissDirection.endToStart,
                  confirmDismiss: (_) async {
                    return await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Hapus Itinerary'),
                        content: const Text(
                            'Apakah Anda yakin ingin menghapus rencana perjalanan ini?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Batal'),
                          ),
                          TextButton(
                            style: TextButton.styleFrom(
                                foregroundColor: colorScheme.error),
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Hapus'),
                          ),
                        ],
                      ),
                    );
                  },
                  onDismissed: (_) async {
                    try {
                      await ref
                          .read(itineraryServiceProvider)
                          .deleteItinerary(item.id);
                      ref.invalidate(riwayatProvider);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Itinerary berhasil dihapus'),
                            behavior: SnackBarBehavior.floating,
                          ),
                        );
                      }
                    } catch (e) {
                      ref.invalidate(riwayatProvider);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Gagal menghapus: $e'),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: colorScheme.error,
                          ),
                        );
                      }
                    }
                  },
                  background: Container(
                    alignment: Alignment.centerRight,
                    padding: const EdgeInsets.only(right: 20),
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: colorScheme.error,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child:
                        Icon(Icons.delete_outline, color: colorScheme.onError),
                  ),
                  child: Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => context.push('/detail/${item.id}'),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: colorScheme.primaryContainer,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    '${item.durationDays} Hari',
                                    style: TextStyle(
                                      color: colorScheme.onPrimaryContainer,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item.preference ?? 'Perjalanan',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (destinations.isNotEmpty)
                              Text(
                                destinations,
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  formatRupiah(item.totalBudget),
                                  style: TextStyle(
                                    color: colorScheme.primary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Text(
                                  formatTanggal(item.createdAt),
                                  style: TextStyle(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
