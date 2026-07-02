import { create } from 'zustand';
import type { RecurringInvoice, RecurringFrequency } from '../types/recurring';
import { storageGet, storageSet, generateId } from '../utils/storage';
import { addDaysToRecurring } from '../utils/recurringUtils';

const STORAGE_KEY = 'wi_recurring';

interface RecurringStore {
  templates: RecurringInvoice[];
  addTemplate: (data: Omit<RecurringInvoice, 'id' | 'created_at' | 'updated_at'>) => RecurringInvoice;
  updateTemplate: (id: string, data: Partial<RecurringInvoice>) => void;
  toggleActive: (id: string) => void;
  deleteTemplate: (id: string) => void;
  advanceNextDue: (id: string, frequency: RecurringFrequency) => void;
  getTemplateById: (id: string) => RecurringInvoice | undefined;
}

export const useRecurringStore = create<RecurringStore>((set, get) => ({
  templates: storageGet<RecurringInvoice[]>(STORAGE_KEY, []),

  addTemplate: (data) => {
    const now = new Date().toISOString();
    const t: RecurringInvoice = { ...data, id: generateId(), created_at: now, updated_at: now };
    set((s) => {
      const updated = [...s.templates, t];
      storageSet(STORAGE_KEY, updated);
      return { templates: updated };
    });
    return t;
  },

  updateTemplate: (id, data) =>
    set((s) => {
      const updated = s.templates.map((t) =>
        t.id === id ? { ...t, ...data, updated_at: new Date().toISOString() } : t
      );
      storageSet(STORAGE_KEY, updated);
      return { templates: updated };
    }),

  toggleActive: (id) =>
    set((s) => {
      const updated = s.templates.map((t) =>
        t.id === id ? { ...t, is_active: !t.is_active, updated_at: new Date().toISOString() } : t
      );
      storageSet(STORAGE_KEY, updated);
      return { templates: updated };
    }),

  deleteTemplate: (id) =>
    set((s) => {
      const updated = s.templates.filter((t) => t.id !== id);
      storageSet(STORAGE_KEY, updated);
      return { templates: updated };
    }),

  advanceNextDue: (id, frequency) =>
    set((s) => {
      const updated = s.templates.map((t) => {
        if (t.id !== id) return t;
        const next = addDaysToRecurring(t.next_due_date, frequency);
        return { ...t, next_due_date: next, updated_at: new Date().toISOString() };
      });
      storageSet(STORAGE_KEY, updated);
      return { templates: updated };
    }),

  getTemplateById: (id) => get().templates.find((t) => t.id === id),
}));
