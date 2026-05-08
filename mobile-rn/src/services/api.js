import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API } from '../constants/api';

const api = axios.create({
  baseURL: API.BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'TravelPlannerApp/1.0',
  },
});

// Request interceptor: tambah token JWT ke setiap request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(API.TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: hapus token jika 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(API.TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

export default api;
