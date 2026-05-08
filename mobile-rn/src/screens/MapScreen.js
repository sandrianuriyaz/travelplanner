import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getAllDestinasi } from '../services/destinasiService';
import { buildMapAllDestHtml } from '../utils/mapAllDestHtml';

export default function MapScreen({ nav }) {
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jumlah, setJumlah] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const dest = await getAllDestinasi();
        if (dest.length === 0) throw new Error('Tidak ada data destinasi');
        setJumlah(dest.length);
        setHtml(buildMapAllDestHtml(dest));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingIcon}>
          <Ionicons name="map" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.loadingTitle}>Memuat Peta Destinasi</Text>
        <Text style={styles.loadingText}>Mengambil data dari server...</Text>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={52} color={COLORS.textHint} />
        <Text style={styles.errTitle}>Gagal memuat peta</Text>
        <Text style={styles.errText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Peta Destinasi</Text>
          <Text style={styles.headerSub}>{jumlah} destinasi tersedia</Text>
        </View>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => nav.navigate('Explore')}
        >
          <Ionicons name="list" size={16} color={COLORS.primary} />
          <Text style={styles.exploreBtnText}>List</Text>
        </TouchableOpacity>
      </View>

      {/* WebView Peta */}
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background, padding: 32, gap: 10,
  },
  loadingIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#ccfbf1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  loadingTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  loadingText: { fontSize: 13, color: COLORS.textHint },
  errTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  errText: { fontSize: 13, color: COLORS.textHint, textAlign: 'center' },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  exploreBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
});
