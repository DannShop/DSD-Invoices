import type { RecurringFrequency } from '../types/recurring';

/** Hitung next_due_date berdasarkan frekuensi */
export function addDaysToRecurring(fromDate: string, frequency: RecurringFrequency): string {
  const d = new Date(fromDate);
  switch (frequency) {
    case 'WEEKLY':    d.setDate(d.getDate() + 7);  break;
    case 'MONTHLY':   d.setMonth(d.getMonth() + 1); break;
    case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break;
    case 'YEARLY':    d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

export const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  WEEKLY:    'Mingguan',
  MONTHLY:   'Bulanan',
  QUARTERLY: 'Per 3 Bulan',
  YEARLY:    'Tahunan',
};

export const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'WEEKLY',    label: 'Mingguan' },
  { value: 'MONTHLY',   label: 'Bulanan' },
  { value: 'QUARTERLY', label: 'Per 3 Bulan (Kuartal)' },
  { value: 'YEARLY',    label: 'Tahunan' },
];

/** Cek apakah template sudah lewat due date dan perlu di-generate */
export function isDueToday(nextDueDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return nextDueDate <= today;
}

export function daysUntilDue(nextDueDate: string): number {
  const today = new Date();
  const due   = new Date(nextDueDate);
  const diff  = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}
