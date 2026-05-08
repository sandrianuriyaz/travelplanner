import { create } from 'zustand';
import { login, register, logout, getSavedToken, getSavedUser } from '../services/authService';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    const token = await getSavedToken();
    const user = await getSavedUser();
    set({ isLoggedIn: !!token, token, user });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await login(email, password);
      set({ user, token, isLoggedIn: true, isLoading: false });
      return true;
    } catch (error) {
      set({ error, isLoading: false });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await register(username, email, password);
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ error, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    await logout();
    set({ user: null, token: null, isLoggedIn: false });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
