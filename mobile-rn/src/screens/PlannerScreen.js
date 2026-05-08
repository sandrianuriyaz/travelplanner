import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import useItineraryStore from '../store/itineraryStore';
import { buildMapPickerHtml } from '../utils/mapPickerHtml';

const KATEGORI = [
  { label: 'Semua',   value: '',                  icon: 'grid-outline' },
  { label: 'Bahari',  value: 'Bahari',             icon: 'water-outline' },
  { label: 'Alam',    value: 'Cagar Alam',         icon: 'leaf-outline' },
  { label: 'Budaya',  value: 'Budaya',             icon: 'business-outline' },
  { label: 'Taman',   value: 'Taman Wisata Alam',  icon: 'flower-outline' },
  { label: 'Hiburan', value: 'Taman Hiburan',      icon: 'happy-outline' },
];

export default function PlannerScreen({ nav }) {
  const [budget, setBudget] = useState('');
  const [durasi, setDurasi] = useState(1);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [kota, setKota] = useState('');
  const [kategori, setKategori] = useState('');
  const [loadingGps, setLoadingGps] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const { generate, isGenerating, generateError, daftarKota, fetchKota } = useItineraryStore();

  useEffect(() => { fetchKota(); }, []);

  // ── GPS otomatis ─────────────────────────────────────────────────────────
  async function gunakanLokasi() {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(loc.coords.latitude.toFixed(6));
      setLng(loc.coords.longitude.toFixed(6));
      Alert.alert('Berhasil', 'Lokasi GPS terdeteksi!');
    } catch {
      Alert.alert('Gagal', 'GPS tidak tersedia. Pilih via peta atau isi manual.');
    } finally {
      setLoadingGps(false);
    }
  }

  // ── Terima koordinat dari WebView map picker ───────────────────────────
  function handleMapMessage(event) {
    try {
      const { lat: pickedLat, lng: pickedLng } = JSON.parse(event.nativeEvent.data);
      setLat(pickedLat);
      setLng(pickedLng);
      setShowMapPicker(false);
    } catch {}
  }

  async function handleGenerate() {
    const budgetNum = parseInt(budget.replace(/\D/g, ''));
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!budgetNum || budgetNum <= 0) { Alert.alert('Peringatan', 'Anggaran harus lebih dari 0.'); return; }
    if (isNaN(latNum) || isNaN(lngNum)) { Alert.alert('Peringatan', 'Pilih lokasi awal terlebih dahulu.'); return; }

    const result = await generate({ budget: budgetNum, duration: durasi, startLat: latNum, startLng: lngNum, city: kota, category: kategori });
    if (result) nav.navigate('Result', { data: result });
    else Alert.alert('Gagal', generateError || 'Tidak dapat membuat itinerary.');
  }

  const hasLocation = lat !== '' && lng !== '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rencanakan Perjalanan</Text>
        <Text style={styles.headerSub}>Isi detail perjalananmu</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Budget */}
        <View style={styles.section}>
          <Text style={styles.label}>Total Anggaran</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.prefix}>Rp</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 500000"
              placeholderTextColor={COLORS.textHint}
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Durasi */}
        <View style={styles.section}>
          <Text style={styles.label}>Durasi Perjalanan</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[styles.counterBtn, durasi <= 1 && styles.counterBtnOff]}
              onPress={() => setDurasi(Math.max(1, durasi - 1))}
              disabled={durasi <= 1}
            >
              <Ionicons name="remove" size={22} color={durasi <= 1 ? COLORS.textHint : '#fff'} />
            </TouchableOpacity>
            <View style={styles.counterDisplay}>
              <Text style={styles.counterNum}>{durasi}</Text>
              <Text style={styles.counterUnit}>hari</Text>
            </View>
            <TouchableOpacity
              style={[styles.counterBtn, durasi >= 7 && styles.counterBtnOff]}
              onPress={() => setDurasi(Math.min(7, durasi + 1))}
              disabled={durasi >= 7}
            >
              <Ionicons name="add" size={22} color={durasi >= 7 ? COLORS.textHint : '#fff'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lokasi Awal */}
        <View style={styles.section}>
          <Text style={styles.label}>Lokasi Awal</Text>

          {/* Indikator lokasi terpilih */}
          {hasLocation && (
            <View style={styles.locSelected}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.locSelectedText}>
                {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
              </Text>
              <TouchableOpacity onPress={() => { setLat(''); setLng(''); }}>
                <Ionicons name="close-circle" size={18} color={COLORS.textHint} />
              </TouchableOpacity>
            </View>
          )}

          {/* 3 pilihan lokasi */}
          <View style={styles.locOptions}>
            {/* GPS */}
            <TouchableOpacity
              style={styles.locBtn}
              onPress={gunakanLokasi}
              disabled={loadingGps}
              activeOpacity={0.85}
            >
              <View style={[styles.locBtnIcon, { backgroundColor: '#E8F5E9' }]}>
                {loadingGps
                  ? <ActivityIndicator size="small" color={COLORS.success} />
                  : <Ionicons name="navigate" size={22} color={COLORS.success} />
                }
              </View>
              <Text style={styles.locBtnTitle}>GPS Otomatis</Text>
              <Text style={styles.locBtnSub}>Deteksi lokasi saat ini</Text>
            </TouchableOpacity>

            {/* Pilih di Peta */}
            <TouchableOpacity
              style={styles.locBtn}
              onPress={() => setShowMapPicker(true)}
              activeOpacity={0.85}
            >
              <View style={[styles.locBtnIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="map" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.locBtnTitle}>Pilih di Peta</Text>
              <Text style={styles.locBtnSub}>Tap lokasi pada peta</Text>
            </TouchableOpacity>
          </View>

          {/* Manual */}
          <Text style={styles.orText}>— atau isi koordinat manual —</Text>
          <View style={styles.coordRow}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Latitude"
                placeholderTextColor={COLORS.textHint}
                value={lat}
                onChangeText={setLat}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 8 }} />
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Longitude"
                placeholderTextColor={COLORS.textHint}
                value={lng}
                onChangeText={setLng}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Kota */}
        {daftarKota.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Kota Tujuan</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['', ...daftarKota].map((k) => (
                <TouchableOpacity
                  key={k || 'auto'}
                  style={[styles.chip, kota === k && styles.chipActive]}
                  onPress={() => setKota(k)}
                >
                  <Text style={[styles.chipText, kota === k && styles.chipTextActive]}>
                    {k || 'Otomatis'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Kategori */}
        <View style={styles.section}>
          <Text style={styles.label}>Kategori Wisata</Text>
          <View style={styles.kategoriGrid}>
            {KATEGORI.map((k) => (
              <TouchableOpacity
                key={k.value}
                style={[styles.kategoriCard, kategori === k.value && styles.kategoriCardActive]}
                onPress={() => setKategori(k.value)}
              >
                <Ionicons name={k.icon} size={20} color={kategori === k.value ? '#fff' : COLORS.primary} />
                <Text style={[styles.kategoriText, kategori === k.value && styles.kategoriTextActive]}>
                  {k.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {generateError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{generateError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.generateBtn, (isGenerating || !hasLocation) && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={isGenerating || !hasLocation}
          activeOpacity={0.85}
        >
          {isGenerating
            ? <ActivityIndicator color="#fff" />
            : <Ionicons name="sparkles" size={20} color="#fff" />
          }
          <Text style={styles.generateBtnText}>
            {isGenerating ? 'Membuat itinerary...' : 'Buat Rencana Perjalanan'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Map Picker ──────────────────────────────────────────────── */}
      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Pilih Titik Awal</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.modalHint}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.modalHintText}>Tap pada peta untuk menentukan titik keberangkatan</Text>
          </View>

          {/* WebView Peta */}
          <WebView
            source={{ html: buildMapPickerHtml(
              lat ? parseFloat(lat) : -7.3274,
              lng ? parseFloat(lng) : 108.2207
            )}}
            style={{ flex: 1 }}
            javaScriptEnabled
            onMessage={handleMapMessage}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scroll: { flex: 1 },

  section: { backgroundColor: '#fff', marginTop: 10, padding: 16 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    paddingHorizontal: 14, height: 50,
    borderWidth: 1, borderColor: COLORS.border,
  },
  prefix: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },

  counterRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  counterBtn: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  counterBtnOff: { backgroundColor: COLORS.border },
  counterDisplay: { flex: 1, alignItems: 'center' },
  counterNum: { fontSize: 34, fontWeight: '800', color: COLORS.textPrimary },
  counterUnit: { fontSize: 13, color: COLORS.textHint, marginTop: -4 },

  locSelected: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#E8F5E9', borderRadius: RADIUS.sm,
    padding: 10, marginBottom: 12,
  },
  locSelectedText: { flex: 1, fontSize: 13, color: COLORS.success, fontWeight: '600' },

  locOptions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  locBtn: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  locBtnIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  locBtnTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  locBtnSub: { fontSize: 11, color: COLORS.textHint, textAlign: 'center' },

  orText: { textAlign: 'center', color: COLORS.textHint, fontSize: 12, marginBottom: 12 },
  coordRow: { flexDirection: 'row' },

  chip: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  kategoriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kategoriCard: {
    width: '30%', borderRadius: RADIUS.md, padding: 12,
    alignItems: 'center', gap: 6,
    backgroundColor: '#E3F2FD', borderWidth: 1.5, borderColor: '#E3F2FD',
  },
  kategoriCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  kategoriText: { fontSize: 11, fontWeight: '600', color: COLORS.primary, textAlign: 'center' },
  kategoriTextActive: { color: '#fff' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFEBEE', borderRadius: RADIUS.md,
    padding: 12, margin: 16,
  },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },

  generateBtn: {
    backgroundColor: COLORS.primary, margin: 16, borderRadius: RADIUS.md,
    height: 56, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10, ...SHADOW.medium,
  },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalClose: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 10,
  },
  modalHintText: { fontSize: 13, color: COLORS.primary, flex: 1 },
});
