import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import useItineraryStore from '../store/itineraryStore';
import { formatRupiah, formatTanggal } from '../utils/currency';

export default function HistoryScreen({ nav }) {
  const { riwayat, fetchRiwayat, hapusItinerary, isLoadingRiwayat, riwayatError } = useItineraryStore();

  useEffect(() => { fetchRiwayat(); }, []);

  function konfirmasiHapus(id, nama) {
    Alert.alert('Hapus Itinerary', `Hapus perjalanan ke ${nama || 'sini'}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try { await hapusItinerary(id); }
          catch { Alert.alert('Gagal', 'Tidak dapat menghapus itinerary.'); }
        },
      },
    ]);
  }

  function renderItem({ item }) {
    const preview = item.details?.[0]?.destination?.name || 'Tidak ada destinasi';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => nav.navigate('Detail', { id: item.id })}
        activeOpacity={0.88}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Text style={styles.badgeNum}>{item.duration_days}</Text>
            <Text style={styles.badgeUnit}>Hari</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle}>{item.preference || 'Perjalanan'}</Text>
            <Text style={styles.cardDate}>
              <Ionicons name="calendar-outline" size={11} color={COLORS.textHint} />{' '}
              {formatTanggal(item.createdAt)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => konfirmasiHapus(item.id, item.preference)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.destPreview}>
            <Ionicons name="location-outline" size={13} color={COLORS.textHint} />
            <Text style={styles.destText} numberOfLines={1}>{preview}</Text>
          </View>
          <View style={styles.budgetWrap}>
            <Text style={styles.budgetText}>{formatRupiah(item.total_budget)}</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoadingRiwayat && riwayat.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Perjalanan</Text>
        <Text style={styles.headerSub}>{riwayat.length} perjalanan tersimpan</Text>
      </View>

      <FlatList
        data={riwayat}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoadingRiwayat} onRefresh={fetchRiwayat} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Ionicons name="airplane-outline" size={48} color={COLORS.textHint} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
            <Text style={styles.emptyText}>Buat rencana pertamamu di tab Rencanakan</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => nav.navigate('Planner')}>
              <Text style={styles.emptyBtnText}>Buat Sekarang</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.textHint, marginTop: 12 },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    marginBottom: 12, overflow: 'hidden', ...SHADOW.small,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, paddingBottom: 12,
  },
  badge: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  badgeNum: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  badgeUnit: { fontSize: 10, color: COLORS.primary, marginTop: -2 },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  cardDate: { fontSize: 12, color: COLORS.textHint, marginTop: 3 },
  deleteBtn: { padding: 8, backgroundColor: '#FFEBEE', borderRadius: 10 },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 14 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12, paddingHorizontal: 14,
  },
  destPreview: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  destText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  budgetWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budgetText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textHint, marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingHorizontal: 28, paddingVertical: 12, marginTop: 20,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
