import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import { getAllDestinasi, getDaftarKota } from '../services/destinasiService';
import { formatRupiah } from '../utils/currency';

const KATEGORI_LIST = ['Semua', 'Budaya', 'Bahari', 'Cagar Alam', 'Taman Hiburan', 'Pusat Perbelanjaan', 'Tempat Ibadah'];

const KATEGORI_COLOR = {
  'Budaya':              { bg: '#FFF3E0', text: '#E65100', icon: 'business-outline' },
  'Bahari':              { bg: '#E3F2FD', text: '#1565C0', icon: 'water-outline' },
  'Cagar Alam':          { bg: '#E8F5E9', text: '#2E7D32', icon: 'leaf-outline' },
  'Taman Hiburan':       { bg: '#FCE4EC', text: '#AD1457', icon: 'happy-outline' },
  'Pusat Perbelanjaan':  { bg: '#F3E5F5', text: '#6A1B9A', icon: 'bag-handle-outline' },
  'Tempat Ibadah':       { bg: '#E8EAF6', text: '#283593', icon: 'moon-outline' },
};

function getKategoriStyle(kat) {
  return KATEGORI_COLOR[kat] || { bg: '#ECEFF1', text: '#455A64', icon: 'location-outline' };
}

function buildDetailMapHtml(lat, lng, nama) {
  return `<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>*{margin:0;padding:0}html,body,#map{width:100%;height:100%}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${lat},${lng}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.marker([${lat},${lng}], {
      icon: L.divIcon({
        className:'',
        html:'<div style="background:#FF6F00;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:16px">📍</div>',
        iconSize:[36,36],iconAnchor:[18,36],
      })
    }).addTo(map).bindPopup('<b>${nama.replace(/'/g, "\\'")}</b>').openPopup();
  </script>
</body></html>`;
}

export default function ExploreScreen({ nav }) {
  const [destinasi, setDestinasi] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [kota, setKota] = useState([]);
  const [selectedKota, setSelectedKota] = useState('');
  const [selectedKat, setSelectedKat] = useState('Semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [dest, kotaList] = await Promise.all([getAllDestinasi(), getDaftarKota()]);
      setDestinasi(dest);
      setFiltered(dest);
      setKota(kotaList);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    let data = destinasi;
    if (selectedKota) data = data.filter(d => d.city === selectedKota);
    if (selectedKat !== 'Semua') data = data.filter(d => d.category === selectedKat);
    if (search.trim()) data = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(data);
  }, [selectedKota, selectedKat, search, destinasi]);

  function renderCard({ item }) {
    const kat = getKategoriStyle(item.category);
    return (
      <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.88}>
        <View style={[styles.cardImg, { backgroundColor: kat.bg }]}>
          <Ionicons name={kat.icon} size={52} color={kat.text} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textHint} />
            <Text style={styles.cardCity}>{item.city}</Text>
          </View>
          <View style={[styles.katBadge, { backgroundColor: kat.bg }]}>
            <Text style={[styles.katText, { color: kat.text }]}>{item.category}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="ticket-outline" size={12} color={COLORS.primary} />
              <Text style={styles.footerText}>{formatRupiah(item.entrance_fee)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="time-outline" size={12} color={COLORS.textHint} />
              <Text style={styles.footerText}>{item.average_duration_spent} mnt</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Jelajahi Destinasi</Text>
          <Text style={styles.headerSub}>{filtered.length} destinasi ditemukan</Text>
        </View>
      </View>

      {/* Search + Filter dalam satu panel putih */}
      <View style={styles.filterPanel}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textHint} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari destinasi..."
            placeholderTextColor={COLORS.textHint}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textHint} />
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.filterDivider} />

        {/* Filter Kategori */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {KATEGORI_LIST.map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.filterChip, selectedKat === k && styles.filterChipActive]}
              onPress={() => setSelectedKat(k)}
            >
              <Text style={[styles.filterText, selectedKat === k && styles.filterTextActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter Kota */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kotaContent}>
          {['', ...kota].map((k) => (
            <TouchableOpacity
              key={k || 'all'}
              style={[styles.kotaChip, selectedKota === k && styles.kotaChipActive]}
              onPress={() => setSelectedKota(k)}
            >
              <Text style={[styles.kotaText, selectedKota === k && styles.kotaTextActive]}>
                {k || 'Semua Kota'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat destinasi...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCard}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ gap: 10 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="search-outline" size={48} color={COLORS.textHint} />
              <Text style={styles.emptyText}>Tidak ada destinasi ditemukan</Text>
            </View>
          }
        />
      )}

      {/* Modal Detail */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selected.name}</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView>
              {/* Peta kecil */}
              <View style={{ height: 220 }}>
                <WebView
                  source={{ html: buildDetailMapHtml(selected.latitude, selected.longitude, selected.name) }}
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  scrollEnabled={false}
                />
              </View>

              {/* Info */}
              <View style={styles.detailBody}>
                <View style={[styles.detailKatBadge, { backgroundColor: getKategoriStyle(selected.category).bg }]}>
                  <Ionicons name={getKategoriStyle(selected.category).icon} size={14} color={getKategoriStyle(selected.category).text} />
                  <Text style={[styles.detailKatText, { color: getKategoriStyle(selected.category).text }]}>
                    {selected.category}
                  </Text>
                </View>

                <Text style={styles.detailName}>{selected.name}</Text>

                <View style={styles.detailRow}>
                  <Ionicons name="location" size={16} color={COLORS.primary} />
                  <Text style={styles.detailCity}>{selected.city}</Text>
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="ticket" size={22} color={COLORS.primary} />
                    <Text style={styles.statLabel}>Harga Tiket</Text>
                    <Text style={styles.statVal}>{formatRupiah(selected.entrance_fee)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="time" size={22} color={COLORS.secondary} />
                    <Text style={styles.statLabel}>Durasi Kunjungan</Text>
                    <Text style={styles.statVal}>{selected.average_duration_spent} menit</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="map" size={22} color={COLORS.accent} />
                    <Text style={styles.statLabel}>Koordinat</Text>
                    <Text style={styles.statVal}>{selected.latitude.toFixed(3)}, {selected.longitude.toFixed(3)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.planBtn}
                  onPress={() => { setSelected(null); nav.navigate('Planner'); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.planBtnText}>Rencanakan ke Sini</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText: { color: COLORS.textHint },
  emptyText: { color: COLORS.textHint, fontSize: 14 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterPanel: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12,
    borderRadius: RADIUS.md, paddingTop: 4, paddingBottom: 8, ...SHADOW.small,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  filterDivider: { height: 1, backgroundColor: COLORS.borderGray, marginHorizontal: 14, marginBottom: 8 },
  filterContent: { paddingHorizontal: 12, paddingBottom: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.borderGray,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  filterTextActive: { color: '#fff' },
  kotaContent: { paddingHorizontal: 12 },
  kotaChip: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16, marginRight: 8,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.borderGray,
  },
  kotaChipActive: { backgroundColor: '#E3F2FD', borderColor: COLORS.primary },
  kotaText: { fontSize: 12, color: COLORS.textHint },
  kotaTextActive: { color: COLORS.primary, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 32 },
  card: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md,
    marginBottom: 10, overflow: 'hidden', ...SHADOW.small,
  },
  cardImg: {
    height: 120, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: 10 },
  cardName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  cardCity: { fontSize: 11, color: COLORS.textHint },
  katBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 },
  katText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', gap: 8 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footerText: { fontSize: 11, color: COLORS.textSecondary },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  detailBody: { padding: 20 },
  detailKatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 12,
  },
  detailKatText: { fontSize: 13, fontWeight: '700' },
  detailName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  detailCity: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  statLabel: { fontSize: 10, color: COLORS.textHint, textAlign: 'center', fontWeight: '600' },
  statVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  planBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 52, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, ...SHADOW.medium,
  },
  planBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
