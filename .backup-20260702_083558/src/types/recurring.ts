import type { InvoiceFormValues } from '../schemas';
import type { ClientSnapshot, Currency } from './index';

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringInvoice {
  id: string;
  name: string;                      // label template, e.g. "Retainer Budi Design"
  client_id: string;
  client_snapshot: ClientSnapshot;
  frequency: RecurringFrequency;
  next_due_date: string;             // ISO date
  is_active: boolean;
  template_data: Partial<InvoiceFormValues>; // data form yang di-snapshot
  currency: Currency;
  notes: string;
  created_at: string;
  updated_at: string;
}
