import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SHADOW, RADIUS, WARNA_RUTE } from '../constants/theme';
import { formatRupiah, formatMenit } from '../utils/currency';
import { buildMapHtml } from '../utils/mapHtml';

function fmtWaktu(totalMenit) {
  const h = Math.floor(totalMenit / 60);
  const m = totalMenit % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function hitungRundown(destinations, hasHotel) {
  const MULAI       = 8 * 60;
  const SELESAI     = 20 * 60;
  const ISTIRAHAT   = 15;
  const BUF_HOTEL   = 30;

  const baseDurasi   = destinations.map((d) => Math.max(30, d.durasi_kunjungan_menit || 60));
  const totalBase    = baseDurasi.reduce((s, v) => s + v, 0);
  const totalTravel  = destinations.reduce((s, d) => s + (d.waktu_tempuh_menit || 30), 0);
  const bufHotel     = hasHotel ? BUF_HOTEL : 0;
  const available    = SELESAI - MULAI - totalTravel - bufHotel - destinations.length * ISTIRAHAT;

  let durasiOptimal;
  if (available >= totalBase) {
    const extra = Math.floor((available - totalBase) / Math.max(1, destinations.length) / 5) * 5;
    durasiOptimal = baseDurasi.map((b) => b + extra);
  } else {
    const scale = Math.max(0, available) / (totalBase || 1);
    durasiOptimal = baseDurasi.map((b) => Math.max(30, Math.round(b * scale / 5) * 5));
  }

  const stops = [];
  let cursor = MULAI;

  destinations.forEach((d, i) => {
    const travelMnt = d.waktu_tempuh_menit || 30;
    const arrMnt    = cursor + travelMnt;
    const durMnt    = durasiOptimal[i];
    const depMnt    = arrMnt + durMnt + ISTIRAHAT;

    stops.push({
      nama: d.nama,
      travelMnt,
      jarak: d.jarak_dari_sebelumnya_km,
      arrivalMnt: arrMnt,
      departureMnt: arrMnt + durMnt,
      durMnt,
    });

    cursor = depMnt;
  });

  return { stops, hotelCheckin: hasHotel ? fmtWaktu(cursor + bufHotel) : null };
}

function RundownSection({ destinations, hotelMalam, isFirstDay }) {
  const [open, setOpen] = useState(false);
  const hasHotel = !!hotelMalam;

  if (!destinations.length) return null;

  const { stops, hotelCheckin } = hitungRundown(destinations, hasHotel);

  return (
    <View style={rdStyles.wrap}>
      <TouchableOpacity style={rdStyles.header} onPress={() => setOpen((v) => !v)} activeOpacity={0.8}>
        <Ionicons name="time-outline" size={16} color={COLORS.primary} />
        <Text style={rdStyles.headerText}>Rundown Perjalanan</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textHint} />
      </TouchableOpacity>

      {open && (
        <View style={rdStyles.body}>
          <View style={rdStyles.startRow}>
            <View style={rdStyles.dot} />
            <Text style={rdStyles.startLabel}>08:00 · {isFirstDay ? 'Titik Awal' : 'Hotel'}</Text>
          </View>

          {stops.map((s, i) => (
            <View key={i}>
              <View style={rdStyles.travelRow}>
                <View style={rdStyles.line} />
                <Text style={rdStyles.travelText}>
                  🚗 {s.travelMnt} mnt{s.jarak != null ? ` · ${Number(s.jarak).toFixed(1)} km` : ''}
                </Text>
              </View>
              <View style={rdStyles.stopRow}>
                <View style={[rdStyles.dot, rdStyles.dotDest]} />
                <View style={rdStyles.stopInfo}>
                  <Text style={rdStyles.stopName}>{s.nama}</Text>
                  <Text style={rdStyles.stopTime}>
                    {fmtWaktu(s.arrivalMnt)} – {fmtWaktu(s.departureMnt)} · {s.durMnt} mnt
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {hasHotel && hotelCheckin && (
            <>
              <View style={rdStyles.travelRow}>
                <View style={rdStyles.line} />
                <Text style={rdStyles.travelText}>🚗 30 mnt · menuju hotel</Text>
              </View>
              <View style={rdStyles.stopRow}>
                <View style={[rdStyles.dot, rdStyles.dotHotel]} />
                <View style={rdStyles.stopInfo}>
                  <Text style={rdStyles.stopName}>🏨 {hotelMalam.nama}</Text>
                  <Text style={rdStyles.stopTime}>Check-in ~{hotelCheckin}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const rdStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    marginHorizontal: 12, marginTop: 10, ...SHADOW.small, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14,
  },
  headerText: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  startLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  travelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  line: { width: 2, height: 20, backgroundColor: COLORS.border, marginLeft: 5 },
  travelText: { fontSize: 12, color: COLORS.textHint },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.primary, marginTop: 3,
  },
  dotDest: { backgroundColor: COLORS.accent },
  dotHotel: { backgroundColor: '#1d4ed8' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  stopTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
});

export default function ResultScreen({ nav, params }) {
  const { data } = params;
  const [selectedDay, setSelectedDay] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [arrivedPopup, setArrivedPopup] = useState(null); // { nama, indeks, total }
  const popupOpacity = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  const popupTimer = useRef(null);

  function tampilkanPopupTiba(nama, indeks, total) {
    if (popupTimer.current) clearTimeout(popupTimer.current);
    setArrivedPopup({ nama, indeks, total });
    Animated.sequence([
      Animated.timing(popupOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(popupOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setArrivedPopup(null));
  }

  function handleWebViewMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tiba') tampilkanPopupTiba(msg.nama, msg.indeks, msg.total);
    } catch {}
  }

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

  const warna = WARNA_RUTE[selectedDay % WARNA_RUTE.length];
  const hotelHari = hari.hotel_malam || null;
  const prevHotel = selectedDay > 0 ? jadwal[selectedDay - 1]?.hotel_malam : null;
  const dayStartLat = prevHotel?.latitude ?? itinerary.start_latitude;
  const dayStartLng = prevHotel?.longitude ?? itinerary.start_longitude;
  const mapHtml = buildMapHtml(dayStartLat, dayStartLng, mapDest, warna, hotelHari);

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

      {/* ── Popup Tiba di Destinasi ── */}
      {arrivedPopup && (
        <Animated.View style={[styles.arrivedPopup, { opacity: popupOpacity }]}>
          <Text style={styles.arrivedEmoji}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.arrivedTitle}>Kamu Sudah Sampai!</Text>
            <Text style={styles.arrivedName} numberOfLines={1}>{arrivedPopup.nama}</Text>
            <Text style={styles.arrivedSub}>Stop {arrivedPopup.indeks} dari {arrivedPopup.total}</Text>
          </View>
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
        </Animated.View>
      )}

      {mapExpanded && (
        <View style={styles.mapFullscreen}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            scrollEnabled={false}
            onMessage={handleWebViewMessage}
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
            <Text style={styles.navBtnText}>
              {isNavigating ? 'Selesai' : 'Navigasi Live'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rencana Perjalanan</Text>
      </View>

      {/* ── Budget Bar (sticky) ── */}
      {(() => {
        const rb           = itinerary.rincian_biaya || {};
        const hotelData    = rb.hotel?.digunakan ? rb.hotel : null;
        const totalHotel   = hotelData?.total || 0;
        const totalMakan   = rb.makan?.digunakan ? rb.makan.total : 100000 * itinerary.duration_days;
        const totalWisata  = rb.wisata?.total || 0;
        const totalTiket   = jadwal.reduce((s, h) =>
          s + h.destinasi.reduce((ss, d) => ss + (d.harga_tiket || 0), 0), 0);
        const totalTransport = Math.max(0, totalWisata - totalTiket);
        return (
          <View style={styles.budgetBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }} contentContainerStyle={styles.budgetBarContent}>
            <View style={styles.budgetItem}>
              <Text style={styles.budgetLabel}>Anggaran</Text>
              <Text style={styles.budgetVal}>{formatRupiah(itinerary.total_budget)}</Text>
            </View>
            {totalHotel > 0 && (<>
              <View style={styles.budgetDivider} />
              <View style={styles.budgetItem}>
                <Text style={styles.budgetLabel}>Hotel</Text>
                <Text style={[styles.budgetVal, { color: '#7c3aed' }]}>{formatRupiah(totalHotel)}</Text>
                <Text style={styles.budgetNote}>{hotelData.jumlah_malam} malam</Text>
              </View>
            </>)}
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={styles.budgetLabel}>Makan</Text>
              <Text style={[styles.budgetVal, { color: '#0891b2' }]}>{formatRupiah(totalMakan)}</Text>
              <Text style={styles.budgetNote}>{itinerary.duration_days} hari</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={styles.budgetLabel}>Tiket</Text>
              <Text style={[styles.budgetVal, { color: COLORS.accent }]}>{formatRupiah(totalTiket)}</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={styles.budgetLabel}>Transport</Text>
              <Text style={[styles.budgetVal, { color: '#16a34a' }]}>{formatRupiah(totalTransport)}</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={styles.budgetLabel}>Sisa</Text>
              <Text style={[styles.budgetVal, { color: COLORS.success }]}>{formatRupiah(itinerary.sisa_budget)}</Text>
            </View>
          </ScrollView>
          </View>
        );
      })()}

      {/* ── Tabs hari (sticky) ── */}
      {jadwal.length > 1 && (
        <View style={styles.tabWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
            {jadwal.map((j, i) => {
              const c = WARNA_RUTE[i % WARNA_RUTE.length];
              return (
                <TouchableOpacity key={i}
                  style={[styles.tabPill, selectedDay === i && { backgroundColor: c, borderColor: c }]}
                  onPress={() => setSelectedDay(i)}>
                  <Text style={[styles.tabPillText, selectedDay === i && styles.tabPillTextActive]}>
                    Hari {j.hari}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Konten scrollable ── */}
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Fasilitas Terpilih Card */}
        {(() => {
          const rb       = itinerary.rincian_biaya || {};
          const hotelData = rb.hotel?.digunakan ? rb.hotel : null;
          const makanData = rb.makan?.digunakan ? rb.makan : null;
          const totalHotel = hotelData?.total || 0;
          const totalMakan = makanData?.total || 0;
          const totalWisata = rb.wisata?.total || 0;
          if (!hotelData && !makanData) return null;
          return (
            <View style={styles.fasilitasCard}>
              <Text style={styles.fasilitasTitle}>Fasilitas Terpilih</Text>
              {hotelData && (
                <View style={styles.fasilitasRow}>
                  <View style={styles.fasilitasIcon}><Text style={{ fontSize: 16 }}>🏨</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fasilitasName} numberOfLines={1}>{hotelData.nama || 'Hotel'}</Text>
                    <Text style={styles.fasilitasSub}>
                      {'⭐'.repeat(Math.round(hotelData.bintang || 3))}
                      {' · '}{hotelData.jumlah_malam} malam × {formatRupiah(hotelData.harga_per_malam)}
                    </Text>
                  </View>
                  <Text style={styles.fasilitasTotal}>{formatRupiah(totalHotel)}</Text>
                </View>
              )}
              {makanData && (
                <View style={[styles.fasilitasRow, { marginTop: hotelData ? 8 : 0 }]}>
                  <View style={styles.fasilitasIcon}><Text style={{ fontSize: 16 }}>🍽</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fasilitasName}>Estimasi Makan</Text>
                    <Text style={styles.fasilitasSub}>{itinerary.duration_days} hari × {formatRupiah(makanData.harga_per_hari)}</Text>
                  </View>
                  <Text style={[styles.fasilitasTotal, { color: '#0891b2' }]}>{formatRupiah(totalMakan)}</Text>
                </View>
              )}
              <View style={styles.fasilitasDestRow}>
                <Text style={{ fontSize: 16 }}>🗺</Text>
                <Text style={styles.fasilitasDestLabel}>Budget Destinasi</Text>
                <Text style={styles.fasilitasDestVal}>{formatRupiah(totalWisata)}</Text>
              </View>
            </View>
          );
        })()}

        {!mapExpanded && (
          <View style={styles.mapWrap}>
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              javaScriptEnabled
              scrollEnabled={false}
              onMessage={handleWebViewMessage}
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
        {mapExpanded && <View style={{ height: 12 }} />}

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

        <Text style={[styles.sectionTitle, { color: warna }]}>Destinasi Hari {hari.hari}</Text>
        {destinations.map((dest, i) => (
          <View key={i} style={[styles.destCard, { borderLeftWidth: 3, borderLeftColor: warna }]}>
            <View style={[styles.destNum, { backgroundColor: warna }]}>
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

        {hotelHari && (
          <View style={styles.hotelCard}>
            <View style={styles.hotelCardIcon}>
              <Text style={{ fontSize: 20 }}>🏨</Text>
            </View>
            <View style={styles.hotelCardBody}>
              <Text style={styles.hotelCardName}>{hotelHari.nama}</Text>
              <Text style={styles.hotelCardSub}>
                {'⭐'.repeat(Math.round(hotelHari.bintang || 0))} · {formatRupiah(hotelHari.harga_per_malam)}/malam
              </Text>
            </View>
          </View>
        )}

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

        <RundownSection
          destinations={destinations}
          hotelMalam={hotelHari}
          isFirstDay={selectedDay === 0}
        />

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

  budgetBarWrap: {
    height: 72, flexShrink: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  budgetBarContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 8, height: 72,
  },
  budgetItem: { alignItems: 'center', paddingHorizontal: 14 },
  budgetDivider: { width: 1, height: 32, backgroundColor: COLORS.border },
  budgetLabel: { fontSize: 9, color: COLORS.textHint, marginBottom: 2, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  budgetVal: { fontSize: 12, fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  budgetNote: { fontSize: 9, color: COLORS.textHint, marginTop: 1 },
  fasilitasCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginTop: 10,
    borderRadius: RADIUS.md, padding: 14, ...SHADOW.small,
  },
  fasilitasTitle: {
    fontSize: 10, fontWeight: '800', color: COLORS.textHint,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12,
  },
  fasilitasRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fasilitasIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  fasilitasName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  fasilitasSub:  { fontSize: 11, color: COLORS.textHint, marginTop: 1 },
  fasilitasTotal: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  fasilitasDestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  fasilitasDestLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.primary },
  fasilitasDestVal:   { fontSize: 13, fontWeight: '800', color: COLORS.primary },

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

  arrivedPopup: {
    position: 'absolute', top: 60, left: 16, right: 16, zIndex: 9999,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...SHADOW.medium,
  },
  arrivedEmoji: { fontSize: 28 },
  arrivedTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  arrivedName: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 1 },
  arrivedSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

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

  hotelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#eff6ff', borderRadius: RADIUS.md,
    marginHorizontal: 12, marginBottom: 10,
    padding: 14, borderWidth: 1, borderColor: '#bfdbfe', ...SHADOW.small,
  },
  hotelCardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  hotelCardBody: { flex: 1 },
  hotelCardName: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  hotelCardSub: { fontSize: 12, color: '#3b82f6', marginTop: 3 },

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
