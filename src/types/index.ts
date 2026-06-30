// ─── ENUMS ───────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type DiscountType = 'FLAT' | 'PERCENT';
export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD';

// ─── ENTITIES ────────────────────────────────────────────────────────────────

export interface Settings {
  id: string;
  business_name: string;
  business_address: string;
  business_email: string;
  business_phone: string;
  logo_base64: string | null;
  default_tax_rate: number;       // e.g. 11 → 11%
  default_currency: Currency;
  invoice_prefix: string;          // e.g. "INV"
  payment_notes: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
  created_at: string;
}

export interface ItemCatalog {
  id: string;
  name: string;
  description: string;
  default_price: number;
  unit: string;
  category: string;
  created_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  catalog_item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;              // computed: qty * unit_price
  sort_order: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  client_snapshot: ClientSnapshot; // snapshot saat invoice dibuat
  status: InvoiceStatus;
  invoice_date: string;            // ISO date string
  due_date: string;
  line_items: InvoiceLineItem[];
  subtotal: number;
  discount_type: DiscountType | null;
  discount_value: number;
  tax_rate: number;
  tax_amount: number;              // computed
  total_amount: number;            // computed
  currency: Currency;
  notes: string;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
}

// Snapshot data klien saat invoice dibuat (biar historical data aman)
export interface ClientSnapshot {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
}

// ─── FORM TYPES ──────────────────────────────────────────────────────────────

export interface InvoiceFormData {
  client_id: string;
  invoice_date: string;
  due_date: string;
  line_items: LineItemFormData[];
  discount_type: DiscountType | null;
  discount_value: number;
  tax_rate: number;
  currency: Currency;
  notes: string;
}

export interface LineItemFormData {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

// ─── COMPUTED SUMMARY ────────────────────────────────────────────────────────

export interface InvoiceSummary {
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  tax_amount: number;
  total_amount: number;
}
