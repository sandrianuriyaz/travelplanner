import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW, RADIUS } from '../constants/theme';
import useAuthStore from '../store/authStore';

export default function LoginScreen({ nav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Peringatan', 'Email dan password wajib diisi.');
      return;
    }
    clearError();
    const ok = await login(email.trim(), password);
    if (!ok) Alert.alert('Login Gagal', error || 'Periksa email dan password.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="airplane" size={48} color={COLORS.white} />
          </View>
          <Text style={styles.heroTitle}>Travel Planner</Text>
          <Text style={styles.heroSub}>Rencanakan perjalanan impianmu</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk</Text>
          <Text style={styles.cardSub}>Selamat datang kembali!</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textHint} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textHint}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textHint} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={COLORS.textHint}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textHint} />
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, isLoading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Masuk</Text>
            }
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => nav.navigate('Register')}>
              <Text style={styles.footerLink}>Daftar sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.primary },
  hero: { alignItems: 'center', paddingTop: 70, paddingBottom: 40 },
  heroIcon: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingTop: 32, flex: 1, minHeight: 420,
  },
  cardTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 28 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md, paddingHorizontal: 14,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFEBEE', borderRadius: RADIUS.sm,
    padding: 10, marginBottom: 14,
  },
  errorText: { color: COLORS.error, fontSize: 13, flex: 1 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 52, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, ...SHADOW.medium,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: COLORS.textSecondary, fontSize: 14 },
  footerLink: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});
