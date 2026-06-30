import { create } from 'zustand';
import type { ItemCatalog } from '../types';
import { storageGet, storageSet, STORAGE_KEYS, generateId } from '../utils/storage';

interface ItemCatalogStore {
  items: ItemCatalog[];
  addItem: (data: Omit<ItemCatalog, 'id' | 'created_at'>) => ItemCatalog;
  updateItem: (id: string, data: Partial<ItemCatalog>) => void;
  deleteItem: (id: string) => void;
  getItemById: (id: string) => ItemCatalog | undefined;
}

export const useItemCatalogStore = create<ItemCatalogStore>((set, get) => ({
  items: storageGet<ItemCatalog[]>(STORAGE_KEYS.ITEMS, []),

  addItem: (data) => {
    const newItem: ItemCatalog = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    set((state) => {
      const updated = [...state.items, newItem];
      storageSet(STORAGE_KEYS.ITEMS, updated);
      return { items: updated };
    });
    return newItem;
  },

  updateItem: (id, data) =>
    set((state) => {
      const updated = state.items.map((i) => (i.id === id ? { ...i, ...data } : i));
      storageSet(STORAGE_KEYS.ITEMS, updated);
      return { items: updated };
    }),

  deleteItem: (id) =>
    set((state) => {
      const updated = state.items.filter((i) => i.id !== id);
      storageSet(STORAGE_KEYS.ITEMS, updated);
      return { items: updated };
    }),

  getItemById: (id) => get().items.find((i) => i.id === id),
}));
