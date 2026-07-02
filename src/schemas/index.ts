import { z } from 'zod';

// ─── LINE ITEM SCHEMA ────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Deskripsi item wajib diisi'),
  quantity: z
    .number({ invalid_type_error: 'Qty harus angka' })
    .positive('Qty harus lebih dari 0'),
  unit: z.string().default(''),
  unit_price: z
    .number({ invalid_type_error: 'Harga harus angka' })
    .min(0, 'Harga tidak boleh negatif'),
});

// ─── INVOICE FORM SCHEMA ──────────────────────────────────────────────────────

export const invoiceFormSchema = z.object({
  client_id: z.string().min(1, 'Pilih klien terlebih dahulu'),
  invoice_date: z.string().min(1, 'Tanggal invoice wajib diisi'),
  due_date: z.string().min(1, 'Due date wajib diisi'),
  line_items: z
    .array(lineItemSchema)
    .min(1, 'Tambahkan minimal 1 item'),
  discount_type: z.enum(['FLAT', 'PERCENT']).nullable().default(null),
  discount_value: z.number().min(0).default(0),
  tax_rate: z.number().min(0).max(100).default(11),
  currency: z.enum(['IDR', 'USD', 'EUR', 'SGD']).default('IDR'),
  notes: z.string().default(''),
});

// ─── CLIENT SCHEMA ────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: z.string().min(1, 'Nama klien wajib diisi'),
  email: z.string().email('Format email tidak valid').or(z.literal('')),
  phone: z.string().default(''),
  address: z.string().default(''),
  company: z.string().default(''),
  notes: z.string().default(''),
});

// ─── SETTINGS SCHEMA ──────────────────────────────────────────────────────────

export const settingsSchema = z.object({
  business_name: z.string().min(1, 'Nama bisnis wajib diisi'),
  business_address: z.string().default(''),
  business_email: z.string().email('Format email tidak valid').or(z.literal('')),
  business_phone: z.string().default(''),
  logo_base64: z.string().nullable().default(null),
  default_tax_rate: z.number().min(0).max(100).default(11),
  default_currency: z.enum(['IDR', 'USD', 'EUR', 'SGD']).default('IDR'),
  invoice_prefix: z.string().min(1).default('INV'),
  payment_notes: z.string().default(''),
  qris_string: z.string().nullable().default(null),
});

// ─── ITEM CATALOG SCHEMA ──────────────────────────────────────────────────────

export const itemCatalogSchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  description: z.string().default(''),
  default_price: z.number().min(0, 'Harga tidak boleh negatif'),
  unit: z.string().default(''),
  category: z.string().default(''),
});

// ─── INFER TYPES ──────────────────────────────────────────────────────────────

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type LineItemValues = z.infer<typeof lineItemSchema>;
export type ClientFormValues = z.infer<typeof clientSchema>;
export type SettingsFormValues = z.infer<typeof settingsSchema>;
export type ItemCatalogFormValues = z.infer<typeof itemCatalogSchema>;
