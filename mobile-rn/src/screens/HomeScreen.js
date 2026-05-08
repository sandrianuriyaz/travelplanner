import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import useAuthStore from '../store/authStore';
import useItineraryStore from '../store/itineraryStore';
import { formatRupiah, formatTanggal } from '../utils/currency';

export default function HomeScreen({ nav }) {
  const { user, logout } = useAuthStore();
  const { riwayat, fetchRiwayat, isLoadingRiwayat } = useItineraryStore();

  useEffect(() => { fetchRiwayat(); }, []);

  async function handleLogout() {
    Alert.alert('Keluar', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: logout },
    ]);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat pagi';
    if (h < 15) return 'Selamat siang';
    if (h < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{greeting()},</Text>
          <Text style={styles.username}>{user?.username || 'Pengguna'} 👋</Text>
          <Text style={styles.headerSub}>Mau liburan ke mana hari ini?</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.avatarBtn}>
          <Ionicons name="person-circle" size={44} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      </View>

      {/* Banner CTA */}
      <View style={styles.bannerWrap}>
        <TouchableOpacity
          style={styles.banner}
          onPress={() => nav.navigate('Planner')}
          activeOpacity={0.92}
        >
          <View>
            <Text style={styles.bannerTitle}>Buat Rencana Baru</Text>
            <Text style={styles.bannerSub}>Generate itinerary otomatis dengan AI</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Ionicons name="sparkles" size={28} color={COLORS.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Cepat</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#E3F2FD' }]} onPress={() => nav.navigate('Planner')}>
            <View style={[styles.quickIcon, { backgroundColor: '#1565C0' }]}>
              <Ionicons name="map" size={22} color="#fff" />
            </View>
            <Text style={styles.quickLabel}>Rencanakan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#E8F5E9' }]} onPress={() => nav.navigate('History')}>
            <View style={[styles.quickIcon, { backgroundColor: '#2E7D32' }]}>
              <Ionicons name="time" size={22} color="#fff" />
            </View>
            <Text style={styles.quickLabel}>Riwayat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#FFF3E0' }]} onPress={() => nav.navigate('Planner')}>
            <View style={[styles.quickIcon, { backgroundColor: '#E65100' }]}>
              <Ionicons name="location" size={22} color="#fff" />
            </View>
            <Text style={styles.quickLabel}>GPS Route</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Perjalanan Terbaru */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Perjalanan Terbaru</Text>
          <TouchableOpacity onPress={() => nav.navigate('History')}>
            <Text style={styles.seeAll}>Lihat semua →</Text>
          </TouchableOpacity>
        </View>

        {isLoadingRiwayat ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : riwayat.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="airplane-outline" size={42} color={COLORS.textHint} />
            <Text style={styles.emptyTitle}>Belum ada perjalanan</Text>
            <Text style={styles.emptyText}>Buat rencana pertamamu sekarang!</Text>
          </View>
        ) : (
          riwayat.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.tripCard}
              onPress={() => nav.navigate('Detail', { id: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.tripLeft}>
                <View style={styles.tripBadge}>
                  <Text style={styles.tripBadgeText}>{item.duration_days}</Text>
                  <Text style={styles.tripBadgeUnit}>hari</Text>
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripTitle}>{item.preference || 'Perjalanan'}</Text>
                  <Text style={styles.tripDate}>
                    <Ionicons name="calendar-outline" size={11} color={COLORS.textHint} />{' '}
                    {formatTanggal(item.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.tripRight}>
                <Text style={styles.tripBudget}>{formatRupiah(item.total_budget)}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textHint} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 56, paddingBottom: 28,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: { flex: 1 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  username: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  avatarBtn: { marginLeft: 12, marginTop: 4 },
  bannerWrap: { paddingHorizontal: 16, marginTop: -14 },
  banner: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.medium,
  },
  bannerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  bannerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center',
  },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', ...SHADOW.small,
  },
  quickIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  tripCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10, ...SHADOW.small,
  },
  tripLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  tripBadge: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tripBadgeText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  tripBadgeUnit: { fontSize: 10, color: COLORS.primary, marginTop: -2 },
  tripInfo: { flex: 1 },
  tripTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  tripDate: { fontSize: 12, color: COLORS.textHint, marginTop: 3 },
  tripRight: { alignItems: 'flex-end', gap: 4 },
  tripBudget: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 32, alignItems: 'center', ...SHADOW.small,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.textHint, marginTop: 4 },
});
