// ─── STORAGE KEYS ────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  SETTINGS: 'wi_settings',
  CLIENTS: 'wi_clients',
  ITEMS: 'wi_items',
  INVOICES: 'wi_invoices',
  INVOICE_COUNTER: 'wi_invoice_counter',
} as const;

// ─── GENERIC HELPERS ──────────────────────────────────────────────────────────

export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Storage] Failed to save "${key}":`, err);
  }
}

export function storageRemove(key: string): void {
  localStorage.removeItem(key);
}

// ─── INVOICE NUMBER GENERATOR ─────────────────────────────────────────────────

/**
 * Generate invoice number dengan format: {PREFIX}-{YYYY}-{NNN}
 * Contoh: INV-2026-001
 * Counter di-reset setiap tahun baru.
 */
export function generateInvoiceNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const counterKey = `${STORAGE_KEYS.INVOICE_COUNTER}_${year}`;
  const current = storageGet<number>(counterKey, 0);
  const next = current + 1;
  storageSet(counterKey, next);
  return `${prefix}-${year}-${String(next).padStart(3, '0')}`;
}

// ─── UUID GENERATOR ───────────────────────────────────────────────────────────

export function generateId(): string {
  // Pakai crypto.randomUUID() kalau tersedia (modern browser)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manual
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
