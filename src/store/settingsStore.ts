import { create } from 'zustand';
import type { Settings } from '../types';
import { storageGet, storageSet, STORAGE_KEYS, generateId } from '../utils/storage';

// ─── DEFAULT SETTINGS ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  id: generateId(),
  business_name: '',
  business_address: '',
  business_email: '',
  business_phone: '',
  logo_base64: null,
  default_tax_rate: 11,
  default_currency: 'IDR',
  invoice_prefix: 'INV',
  payment_notes: 'Pembayaran dapat ditransfer ke rekening:\nBank BCA: 1234-5678-90\na.n. Nama Bisnis Kamu',
  qris_string: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── STORE ────────────────────────────────────────────────────────────────────

interface SettingsStore {
  settings: Settings;
  updateSettings: (data: Partial<Settings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: storageGet<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),

  updateSettings: (data) =>
    set((state) => {
      const updated: Settings = {
        ...state.settings,
        ...data,
        updated_at: new Date().toISOString(),
      };
      storageSet(STORAGE_KEYS.SETTINGS, updated);
      return { settings: updated };
    }),

  resetSettings: () => {
    storageSet(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));
