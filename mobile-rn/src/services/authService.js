import * as SecureStore from 'expo-secure-store';
import api from './api';
import { API } from '../constants/api';

function pesanError(error, fallback) {
  const data = error.response?.data;
  if (data?.pesan) return data.pesan;
  if (error.code === 'ECONNABORTED') return 'Koneksi timeout. Pastikan server berjalan.';
  if (error.message === 'Network Error') return 'Tidak dapat terhubung ke server.';
  return fallback;
}

export async function login(email, password) {
  try {
    const res = await api.post('/api/auth/login', { email, password });
    const { token, data: user } = res.data;
    await SecureStore.setItemAsync(API.TOKEN_KEY, token);
    await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    return { user, token };
  } catch (error) {
    throw pesanError(error, 'Login gagal. Periksa email dan password.');
  }
}

export async function getSavedUser() {
  const raw = await SecureStore.getItemAsync('user_data');
  return raw ? JSON.parse(raw) : null;
}

export async function register(username, email, password) {
  try {
    await api.post('/api/auth/register', { username, email, password });
  } catch (error) {
    throw pesanError(error, 'Registrasi gagal. Coba lagi nanti.');
  }
}

export async function logout() {
  await SecureStore.deleteItemAsync(API.TOKEN_KEY);
  await SecureStore.deleteItemAsync('user_data');
}

export async function getSavedToken() {
  return SecureStore.getItemAsync(API.TOKEN_KEY);
}
