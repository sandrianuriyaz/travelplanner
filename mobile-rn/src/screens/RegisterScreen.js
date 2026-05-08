import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import useAuthStore from '../store/authStore';

export default function RegisterScreen({ nav }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert('Peringatan', 'Semua field wajib diisi.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Peringatan', 'Password minimal 6 karakter.');
      return;
    }
    if (password !== konfirmasi) {
      Alert.alert('Peringatan', 'Password dan konfirmasi tidak cocok.');
      return;
    }
    clearError();
    const berhasil = await register(username.trim(), email.trim(), password);
    if (berhasil) {
      Alert.alert('Berhasil', 'Akun berhasil dibuat! Silakan masuk.', [
        { text: 'OK', onPress: () => nav.navigate('Login') },
      ]);
    } else {
      Alert.alert('Registrasi Gagal', error || 'Terjadi kesalahan.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Buat Akun Baru</Text>
        <Text style={styles.subtitle}>Isi data di bawah untuk mendaftar</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Konfirmasi Password"
          value={konfirmasi}
          onChangeText={setKonfirmasi}
          secureTextEntry
          placeholderTextColor="#999"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, isLoading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Daftar</Text>
          }
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.hint}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => nav.navigate('Login')}>
            <Text style={styles.link}>Masuk</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1565C0', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, backgroundColor: '#f8f8f8',
    marginBottom: 16, color: '#333',
  },
  error: { color: '#C62828', marginBottom: 12 },
  btn: {
    backgroundColor: '#1565C0', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  btnDisabled: { backgroundColor: '#90CAF9' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'center' },
  hint: { color: '#666' },
  link: { color: '#1565C0', fontWeight: '600' },
});
