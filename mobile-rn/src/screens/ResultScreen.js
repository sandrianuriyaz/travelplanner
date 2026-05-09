import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import { formatRupiah, formatMenit } from '../utils/currency';
import { buildMapHtml } from '../utils/mapHtml';

export default function ResultScreen({ nav, params }) {
  const { data } = params;
  const [selectedDay, setSelectedDay] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const webViewRef = useRef(null);
  const locationSub = useRef(null);

  useEffect(() => () => locationSub.current?.remove(), []);

  const itinerary = data?.data;
  if (!itinerary) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
        <Text style={styles.errText}>Data tidak ditemukan.</Text>
      </View>
    );
  }

  const jadwal = itinerary.jadwal || [];
  const hari = jadwal[selectedDay] || {};
  const destinations = hari.destinasi || [];
  const mapDest = destinations.map((d) => ({ latitude: d.latitude, longitude: d.longitude, nama: d.nama }));
  const mapHtml = buildMapHtml(itinerary.start_latitude, itinerary.start_longitude, mapDest);

  async function mulaiNavigasi() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan.'); return; }
    setIsNavigating(true);
    webViewRef.current?.injectJavaScript('startNavigation(); true;');
    if (destinations[0]) {
      const nama = (destinations[0].nama || '').replace(/'/g, "\\'");
      webViewRef.current?.injectJavaScript(
        `setNavDest('${nama}', 'Stop 1 dari ${destinations.length}'); true;`
      );
    }
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 },
      ({ coords }) => {
        webViewRef.current?.injectJavaScript(
          `updateUserLocation(${coords.latitude}, ${coords.longitude}, ${coords.accuracy ?? 20}); true;`
        );
      }
    );
  }

  function selesaiNavigasi() {
    locationSub.current?.remove();
    locationSub.current = null;
    setIsNavigating(false);
    webViewRef.current?.injectJavaScript('stopNavigation(); true;');
  }

  return (
    <View style={styles.container}>
      {/* ── Peta Fullscreen Overlay ── */}
      {mapExpanded && (
        <View style={styles.mapFullscreen}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            scrollEnabled={false}
          />
          {/* Tombol collapse */}
          <TouchableOpacity style={styles.collapseBtn} onPress={() => setMapExpanded(false)} activeOpacity={0.85}>
            <Ionicons name="contract" size={18} color="#fff" />
            <Text style={styles.collapseBtnText}>Kecilkan</Text>
          </TouchableOpacity>
          {/* Tombol navigasi tetap tersedia */}
          <TouchableOpacity
            style={[styles.navBtn, isNavigating && styles.navBtnStop]}
            onPress={isNavigating ? selesaiNavigasi : mulaiNavigasi}
            activeOpacity={0.9}
          >
            <Ionicons name={isNavigating ? 'stop-circle' : 'navigate'} size={18} color="#fff" />
            <Text style={styles.navBtnText}>
              {isNavigating ? 'Selesai' : 'Navigasi Live'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rencana Perjalanan</Text>
      </View>

      {/* Budget Summary */}
      <View style={styles.budgetBar}>
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Total Anggaran</Text>
          <Text style={styles.budgetVal}>{formatRupiah(itinerary.total_budget)}</Text>
        </View>
        <View style={styles.budgetDivider} />
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Terpakai</Text>
          <Text style={[styles.budgetVal, { color: COLORS.accent }]}>{formatRupiah(itinerary.total_biaya_terpakai)}</Text>
        </View>
        <View style={styles.budgetDivider} />
        <View style={styles.budgetItem}>
          <Text style={styles.budgetLabel}>Sisa</Text>
          <Text style={[styles.budgetVal, { color: COLORS.success }]}>{formatRupiah(itinerary.sisa_budget)}</Text>
        </View>
      </View>

      {/* Day Tabs */}
      {jadwal.length > 1 && (
        <View style={styles.tabWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {jadwal.map((j, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.tabPill, selectedDay === i && styles.tabPillActive]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.tabPillText, selectedDay === i && styles.tabPillTextActive]}>
                  Hari {j.hari}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Peta normal (tersembunyi saat expand) */}
        {!mapExpanded && (
          <View style={styles.mapWrap}>
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              javaScriptEnabled
              scrollEnabled={false}
            />
            <TouchableOpacity style={styles.expandBtn} onPress={() => setMapExpanded(true)} activeOpacity={0.85}>
              <Ionicons name="expand" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navBtn, isNavigating && styles.navBtnStop]}
              onPress={isNavigating ? selesaiNavigasi : mulaiNavigasi}
              activeOpacity={0.9}
            >
              <Ionicons name={isNavigating ? 'stop-circle' : 'navigate'} size={18} color="#fff" />
              <Text style={styles.navBtnText}>
                {isNavigating ? 'Selesai' : 'Navigasi Live'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Placeholder tinggi peta saat expand (agar scroll tidak lompat) */}
        {mapExpanded && <View style={{ height: 12 }} />}

        {/* Info Hari */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Biaya Hari Ini</Text>
            <Text style={styles.infoVal}>{formatRupiah(hari.total_biaya_hari || 0)}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Total Waktu</Text>
            <Text style={styles.infoVal}>{formatMenit(hari.total_waktu_menit || 0)}</Text>
          </View>
        </View>

        {/* Daftar Destinasi */}
        <Text style={styles.sectionTitle}>Destinasi Hari {hari.hari}</Text>
        {destinations.map((dest, i) => (
          <View key={i} style={styles.destCard}>
            <View style={styles.destNum}>
              <Text style={styles.destNumText}>{dest.urutan}</Text>
            </View>
            <View style={styles.destBody}>
              <Text style={styles.destName}>{dest.nama}</Text>
              <Text style={styles.destMeta}>{dest.kategori} · {dest.kota}</Text>
              <View style={styles.destStats}>
                <View style={styles.stat}>
                  <Ionicons name="ticket-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.statText}>{formatRupiah(dest.harga_tiket)}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="car-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.statText}>{formatRupiah(dest.estimasi_transport)}</Text>
                </View>
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.statText}>{formatMenit(dest.durasi_kunjungan_menit)}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Kembali ke titik awal */}
        {hari.rute_kembali && (
          <View style={styles.returnCard}>
            <View style={styles.returnIcon}>
              <Ionicons name="home" size={20} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.returnTitle}>Kembali ke titik awal</Text>
              <Text style={styles.returnMeta}>
                {hari.rute_kembali.jarak_km?.toFixed(1)} km  ·  {formatMenit(hari.rute_kembali.waktu_tempuh_menit)}  ·  {formatRupiah(hari.rute_kembali.estimasi_biaya)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errText: { color: COLORS.error, fontSize: 15 },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },

  budgetBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  budgetItem: { flex: 1, alignItems: 'center' },
  budgetDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  budgetLabel: { fontSize: 10, color: COLORS.textHint, marginBottom: 3, fontWeight: '600', textTransform: 'uppercase' },
  budgetVal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

  tabWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabPill: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
  },
  tabPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabPillTextActive: { color: '#fff' },

  scroll: { flex: 1 },

  mapFullscreen: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
  },
  mapWrap: {
    height: 260, margin: 12, borderRadius: RADIUS.lg,
    overflow: 'hidden', position: 'relative', ...SHADOW.small,
  },
  expandBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  collapseBtn: {
    position: 'absolute', top: 52, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  collapseBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  navBtn: {
    position: 'absolute', bottom: 20, alignSelf: 'center',
    backgroundColor: COLORS.primary,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
    ...SHADOW.medium,
  },
  navBtnStop: { backgroundColor: COLORS.error },
  navBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  infoRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, marginBottom: 4 },
  infoCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, alignItems: 'center', gap: 4, ...SHADOW.small,
  },
  infoLabel: { fontSize: 11, color: COLORS.textHint, textAlign: 'center' },
  infoVal: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.textPrimary,
    paddingHorizontal: 12, marginTop: 12, marginBottom: 8,
  },
  destCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    marginHorizontal: 12, marginBottom: 10,
    padding: 14, flexDirection: 'row', gap: 12, ...SHADOW.small,
  },
  destNum: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  destNumText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  destBody: { flex: 1 },
  destName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  destMeta: { fontSize: 12, color: COLORS.textHint, marginTop: 2, marginBottom: 8 },
  destStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: COLORS.textSecondary },

  returnCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#E8F5E9', borderRadius: RADIUS.md,
    marginHorizontal: 12, marginTop: 4, padding: 14,
    borderWidth: 1, borderColor: '#C8E6C9',
  },
  returnIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  returnTitle: { fontWeight: '700', color: COLORS.success, fontSize: 14 },
  returnMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
});
