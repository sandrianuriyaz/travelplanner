import { create } from 'zustand';
import {
  generateItinerary,
  getRiwayat,
  getItinerary,
  deleteItinerary,
  getDaftarKota,
} from '../services/itineraryService';

const useItineraryStore = create((set, get) => ({
  // State generate
  generated: null,
  isGenerating: false,
  generateError: null,

  // State riwayat
  riwayat: [],
  isLoadingRiwayat: false,
  riwayatError: null,

  // State detail
  detail: null,
  isLoadingDetail: false,
  detailError: null,

  // State kota
  daftarKota: [],

  // ── Generate ──────────────────────────────────────────────────────────────
  generate: async (params) => {
    set({ isGenerating: true, generateError: null, generated: null });
    try {
      const data = await generateItinerary(params);
      set({ generated: data, isGenerating: false });
      return data;
    } catch (error) {
      set({ generateError: error, isGenerating: false });
      return null;
    }
  },

  clearGenerated: () => set({ generated: null, generateError: null }),

  // ── Riwayat ───────────────────────────────────────────────────────────────
  fetchRiwayat: async () => {
    set({ isLoadingRiwayat: true, riwayatError: null });
    try {
      const data = await getRiwayat();
      set({ riwayat: data, isLoadingRiwayat: false });
    } catch (error) {
      set({ riwayatError: error, isLoadingRiwayat: false });
    }
  },

  hapusItinerary: async (id) => {
    try {
      await deleteItinerary(id);
      set((state) => ({
        riwayat: state.riwayat.filter((item) => item.id !== id),
      }));
    } catch (error) {
      throw error;
    }
  },

  // ── Detail ────────────────────────────────────────────────────────────────
  fetchDetail: async (id) => {
    set({ isLoadingDetail: true, detailError: null, detail: null });
    try {
      const data = await getItinerary(id);
      set({ detail: data.data, isLoadingDetail: false });
    } catch (error) {
      set({ detailError: error, isLoadingDetail: false });
    }
  },

  // ── Kota ──────────────────────────────────────────────────────────────────
  fetchKota: async () => {
    const kota = await getDaftarKota();
    set({ daftarKota: kota });
  },
}));

export default useItineraryStore;
