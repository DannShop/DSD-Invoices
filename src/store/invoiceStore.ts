import { create } from 'zustand';
import type { Invoice, InvoiceStatus } from '../types';
import { storageGet, storageSet, STORAGE_KEYS, generateId, generateInvoiceNumber } from '../utils/storage';

interface InvoiceStore {
  invoices: Invoice[];
  addInvoice: (data: Omit<Invoice, 'id' | 'invoice_number' | 'created_at' | 'updated_at'>, prefix: string) => Invoice;
  updateInvoice: (id: string, data: Partial<Invoice>) => void;
  updateStatus: (id: string, status: InvoiceStatus) => void;
  deleteInvoice: (id: string) => void;
  getInvoiceById: (id: string) => Invoice | undefined;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: storageGet<Invoice[]>(STORAGE_KEYS.INVOICES, []),

  addInvoice: (data, prefix) => {
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...data,
      id: generateId(),
      invoice_number: generateInvoiceNumber(prefix),
      created_at: now,
      updated_at: now,
    };
    set((state) => {
      const updated = [newInvoice, ...state.invoices];
      storageSet(STORAGE_KEYS.INVOICES, updated);
      return { invoices: updated };
    });
    return newInvoice;
  },

  updateInvoice: (id, data) =>
    set((state) => {
      const updated = state.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, ...data, updated_at: new Date().toISOString() }
          : inv
      );
      storageSet(STORAGE_KEYS.INVOICES, updated);
      return { invoices: updated };
    }),

  updateStatus: (id, status) =>
    set((state) => {
      const updated = state.invoices.map((inv) =>
        inv.id === id
          ? { ...inv, status, updated_at: new Date().toISOString() }
          : inv
      );
      storageSet(STORAGE_KEYS.INVOICES, updated);
      return { invoices: updated };
    }),

  deleteInvoice: (id) =>
    set((state) => {
      const updated = state.invoices.filter((inv) => inv.id !== id);
      storageSet(STORAGE_KEYS.INVOICES, updated);
      return { invoices: updated };
    }),

  getInvoiceById: (id) => get().invoices.find((inv) => inv.id === id),
}));
