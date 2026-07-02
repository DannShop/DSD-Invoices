import type { Currency, InvoiceLineItem, InvoiceSummary, DiscountType } from '../types';

// ─── CURRENCY FORMATTING ──────────────────────────────────────────────────────

const CURRENCY_LOCALE: Record<Currency, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
};

export function formatCurrency(amount: number, currency: Currency = 'IDR'): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

// ─── DATE FORMATTING ──────────────────────────────────────────────────────────

export function formatDate(isoDate: string): string {
  if (!isoDate) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function isOverdue(dueDateISO: string): boolean {
  return new Date(dueDateISO) < new Date(todayISO());
}

// ─── INVOICE CALCULATION ──────────────────────────────────────────────────────

export function calculateSummary(
  lineItems: Pick<InvoiceLineItem, 'quantity' | 'unit_price'>[],
  discountType: DiscountType | null,
  discountValue: number,
  taxRate: number
): InvoiceSummary {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  let discount_amount = 0;
  if (discountType === 'FLAT') {
    discount_amount = Math.min(discountValue, subtotal);
  } else if (discountType === 'PERCENT') {
    discount_amount = (subtotal * Math.min(discountValue, 100)) / 100;
  }

  const taxable_amount = subtotal - discount_amount;
  const tax_amount = (taxable_amount * taxRate) / 100;
  const total_amount = taxable_amount + tax_amount;

  return {
    subtotal,
    discount_amount,
    taxable_amount,
    tax_amount,
    total_amount,
  };
}

export function calculateLineTotal(qty: number, unitPrice: number): number {
  return qty * unitPrice;
}
