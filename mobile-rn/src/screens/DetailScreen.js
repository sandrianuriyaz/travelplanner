import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import useItineraryStore from '../store/itineraryStore';
import { formatRupiah, formatTanggal } from '../utils/currency';
import { buildMapHtml } from '../utils/mapHtml';

export default function DetailScreen({ nav, params }) {
  const { id } = params;
  const [selectedDay, setSelectedDay] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  const { detail, fetchDetail, isLoadingDetail, detailError } = useItineraryStore();

  useEffect(() => {
    fetchDetail(id);
    return () => locationSub.current?.remove();
  }, [id]);

  async function mulaiNavigasi() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan.'); return; }
    setIsNavigating(true);
    webViewRef.current?.injectJavaScript('startNavigation(); true;');
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

  if (isLoadingDetail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat detail...</Text>
      </View>
    );
  }

  if (detailError || !detail) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={52} color={COLORS.textHint} />
        <Text style={styles.errTitle}>Gagal memuat</Text>
        <Text style={styles.errText}>{detailError || 'Data tidak ditemukan'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail(id)}>
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => nav.goBack()}>
          <Text style={styles.backLinkText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const jadwal = detail.jadwal || [];
  const hari = jadwal[selectedDay] || {};
  const destinations = hari.destinasi || [];
  const mapDest = destinations.map((d) => ({ latitude: d.latitude, longitude: d.longitude, nama: d.nama }));
  const mapHtml = buildMapHtml(detail.start_latitude, detail.start_longitude, mapDest);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {detail.preferensi || 'Detail Perjalanan'}
        </Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Anggaran</Text>
          <Text style={styles.summaryVal}>{formatRupiah(detail.total_budget)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Durasi</Text>
          <Text style={styles.summaryVal}>{detail.duration_days} hari</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Dibuat</Text>
          <Text style={styles.summaryVal}>{formatTanggal(detail.dibuat_pada).split(' ').slice(0, 3).join(' ')}</Text>
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

      {/* Peta Fullscreen Overlay */}
      {mapExpanded && (
        <View style={styles.mapFullscreen}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            scrollEnabled={false}
          />
          <TouchableOpacity style={styles.collapseBtn} onPress={() => setMapExpanded(false)} activeOpacity={0.85}>
            <Ionicons name="contract" size={18} color="#fff" />
            <Text style={styles.collapseBtnText}>Kecilkan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, isNavigating && styles.navBtnStop]}
            onPress={isNavigating ? selesaiNavigasi : mulaiNavigasi}
            activeOpacity={0.9}
          >
            <Ionicons name={isNavigating ? 'stop-circle' : 'navigate'} size={18} color="#fff" />
            <Text style={styles.navBtnText}>{isNavigating ? 'Selesai' : 'Navigasi Live'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Peta normal */}
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
              <Text style={styles.navBtnText}>{isNavigating ? 'Selesai' : 'Navigasi Live'}</Text>
            </TouchableOpacity>
          </View>
        )}
        {mapExpanded && <View style={{ height: 12 }} />}

        {/* Daftar Destinasi */}
        <Text style={styles.sectionTitle}>Destinasi Hari {hari.hari}</Text>
        {destinations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="location-outline" size={32} color={COLORS.textHint} />
            <Text style={styles.emptyText}>Tidak ada destinasi</Text>
          </View>
        ) : (
          destinations.map((dest, i) => (
            <View key={i} style={styles.destCard}>
              <View style={styles.destNum}>
                <Text style={styles.destNumText}>{dest.urutan}</Text>
              </View>
              <View style={styles.destBody}>
                <Text style={styles.destName}>{dest.nama}</Text>
                <Text style={styles.destMeta}>{dest.kategori} · {dest.kota}</Text>
                <View style={styles.costRow}>
                  <Ionicons name="receipt-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.costText}>
                    Estimasi: {formatRupiah(dest.estimated_cost)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  loadingText: { color: COLORS.textHint, fontSize: 14 },
  errTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  errText: { fontSize: 13, color: COLORS.textHint, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 8,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  backLink: { marginTop: 4 },
  backLinkText: { color: COLORS.primary, fontSize: 14 },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { color: '#fff', fontSize: 15 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },

  summaryBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  summaryLabel: { fontSize: 10, color: COLORS.textHint, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
  summaryVal: { fontSize: 13, fontWeight: '800', color: COLORS.primary },

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
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
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

  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.textPrimary,
    paddingHorizontal: 12, marginTop: 4, marginBottom: 8,
  },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    margin: 12, padding: 24, alignItems: 'center', gap: 8,
  },
  emptyText: { color: COLORS.textHint, fontSize: 14 },
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
  destMeta: { fontSize: 12, color: COLORS.textHint, marginTop: 2, marginBottom: 6 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  costText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});
