import { create } from 'zustand';
import type { Client } from '../types';
import { storageGet, storageSet, STORAGE_KEYS, generateId } from '../utils/storage';

interface ClientStore {
  clients: Client[];
  addClient: (data: Omit<Client, 'id' | 'created_at'>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
}

export const useClientStore = create<ClientStore>((set, get) => ({
  clients: storageGet<Client[]>(STORAGE_KEYS.CLIENTS, []),

  addClient: (data) => {
    const newClient: Client = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    set((state) => {
      const updated = [...state.clients, newClient];
      storageSet(STORAGE_KEYS.CLIENTS, updated);
      return { clients: updated };
    });
    return newClient;
  },

  updateClient: (id, data) =>
    set((state) => {
      const updated = state.clients.map((c) =>
        c.id === id ? { ...c, ...data } : c
      );
      storageSet(STORAGE_KEYS.CLIENTS, updated);
      return { clients: updated };
    }),

  deleteClient: (id) =>
    set((state) => {
      const updated = state.clients.filter((c) => c.id !== id);
      storageSet(STORAGE_KEYS.CLIENTS, updated);
      return { clients: updated };
    }),

  getClientById: (id) => get().clients.find((c) => c.id === id),
}));
