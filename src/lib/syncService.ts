import { supabase, isSupabaseConfigured } from './supabase';
import { storageGet, STORAGE_KEYS } from '../utils/storage';
import type { Client, ItemCatalog, Invoice, Settings } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  success: boolean;
  message: string;
  counts?: { settings: number; clients: number; items: number; invoices: number };
}

/**
 * Migrasi semua data dari localStorage ke Supabase.
 * Dipanggil sekali saat user pertama kali setup cloud.
 */
export async function migrateLocalToSupabase(): Promise<SyncResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env' };
  }

  try {
    const settings = storageGet<Settings | null>(STORAGE_KEYS.SETTINGS, null);
    const clients  = storageGet<Client[]>(STORAGE_KEYS.CLIENTS, []);
    const items    = storageGet<ItemCatalog[]>(STORAGE_KEYS.ITEMS, []);
    const invoices = storageGet<Invoice[]>(STORAGE_KEYS.INVOICES, []);

    let counts = { settings: 0, clients: 0, items: 0, invoices: 0 };
    const errorMessages: string[] = [];

    // ── Settings ──
    if (settings) {
      const { error } = await supabase.from('settings').upsert({
        id: settings.id,
        business_name:    settings.business_name,
        business_address: settings.business_address,
        business_email:   settings.business_email,
        business_phone:   settings.business_phone,
        logo_base64:      settings.logo_base64,
        default_tax_rate: settings.default_tax_rate,
        default_currency: settings.default_currency,
        invoice_prefix:   settings.invoice_prefix,
        payment_notes:    settings.payment_notes,
      });
      if (!error) {
        counts.settings = 1;
      } else {
        console.error('[Sync] settings error:', error);
        errorMessages.push(`Settings: ${error.message}`);
      }
    }

    // ── Clients ──
    if (clients.length > 0) {
      const { error } = await supabase.from('clients').upsert(
        clients.map((c) => ({
          id: c.id, name: c.name, email: c.email, phone: c.phone,
          address: c.address, company: c.company, notes: c.notes,
        }))
      );
      if (!error) {
        counts.clients = clients.length;
      } else {
        console.error('[Sync] clients error:', error);
        errorMessages.push(`Klien: ${error.message}`);
      }
    }

    // ── Item Catalog ──
    if (items.length > 0) {
      const { error } = await supabase.from('item_catalog').upsert(
        items.map((i) => ({
          id: i.id, name: i.name, description: i.description,
          default_price: i.default_price, unit: i.unit, category: i.category,
        }))
      );
      if (!error) {
        counts.items = items.length;
      } else {
        console.error('[Sync] item_catalog error:', error);
        errorMessages.push(`Item: ${error.message}`);
      }
    }

    // ── Invoices + Line Items ──
    for (const inv of invoices) {
      const { error: invErr } = await supabase.from('invoices').upsert({
        id: inv.id, invoice_number: inv.invoice_number,
        client_id: inv.client_id, client_snapshot: inv.client_snapshot,
        status: inv.status, invoice_date: inv.invoice_date, due_date: inv.due_date,
        subtotal: inv.subtotal, discount_type: inv.discount_type,
        discount_value: inv.discount_value, tax_rate: inv.tax_rate,
        tax_amount: inv.tax_amount, total_amount: inv.total_amount,
        currency: inv.currency, notes: inv.notes,
      });

      if (invErr) {
        console.error('[Sync] invoice error:', inv.invoice_number, invErr);
        errorMessages.push(`Invoice ${inv.invoice_number}: ${invErr.message}`);
        continue;
      }

      if (inv.line_items.length > 0) {
        const { error: liErr } = await supabase.from('invoice_line_items').upsert(
          inv.line_items.map((li) => ({
            id: li.id, invoice_id: inv.id,
            catalog_item_id: li.catalog_item_id,
            description: li.description, quantity: li.quantity,
            unit: li.unit, unit_price: li.unit_price,
            line_total: li.line_total, sort_order: li.sort_order,
          }))
        );
        if (liErr) {
          console.error('[Sync] line_items error:', inv.invoice_number, liErr);
          errorMessages.push(`Item invoice ${inv.invoice_number}: ${liErr.message}`);
        }
      }
      counts.invoices++;
    }

    const hasErrors = errorMessages.length > 0;
    const allFailed  = counts.settings === 0 && counts.clients === 0 && counts.items === 0 && counts.invoices === 0 && hasErrors;

    return {
      success: !allFailed,
      message: allFailed
        ? `Gagal sync — ${errorMessages[0]}`
        : hasErrors
          ? `Sebagian berhasil: ${counts.clients} klien, ${counts.items} item, ${counts.invoices} invoice. Ada ${errorMessages.length} error — cek Console (F12) untuk detail.`
          : `Migrasi berhasil! ${counts.clients} klien, ${counts.items} item, ${counts.invoices} invoice tersinkron ke Supabase.`,
      counts,
    };
  } catch (err) {
    console.error('[Sync] fatal error:', err);
    return { success: false, message: `Error: ${String(err)}` };
  }
}

/** Fetch semua data dari Supabase untuk replace localStorage */
export async function fetchAllFromSupabase() {
  if (!isSupabaseConfigured()) return null;

  const [settingsRes, clientsRes, itemsRes, invoicesRes] = await Promise.all([
    supabase.from('settings').select('*').limit(1).single(),
    supabase.from('clients').select('*').order('created_at', { ascending: false }),
    supabase.from('item_catalog').select('*').order('name'),
    supabase.from('invoices').select('*, invoice_line_items(*)').order('created_at', { ascending: false }),
  ]);

  return {
    settings: settingsRes.data ?? null,
    clients:  clientsRes.data  ?? [],
    items:    itemsRes.data    ?? [],
    invoices: (invoicesRes.data ?? []).map((inv: any) => ({
      ...inv,
      line_items: inv.invoice_line_items ?? [],
    })),
  };
}
