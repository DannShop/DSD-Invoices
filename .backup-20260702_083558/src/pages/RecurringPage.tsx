import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRecurringStore } from '../store/recurringStore';
import { useClientStore } from '../store/clientStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useSettingsStore } from '../store/settingsStore';
import { useItemCatalogStore } from '../store/itemCatalogStore';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';
import type { RecurringFrequency } from '../types/recurring';
import type { InvoiceLineItem } from '../types';
import {
  FREQUENCY_OPTIONS, FREQUENCY_LABEL,
  isDueToday, daysUntilDue,
} from '../utils/recurringUtils';
import { calculateSummary, calculateLineTotal, formatCurrency, formatDate, todayISO } from '../utils/format';
import { generateId } from '../utils/storage';

interface RecurringPageProps { navigate: (page: Page) => void; }

// Mini schema for the recurring form
const recurringSchema = z.object({
  name:          z.string().min(1, 'Nama template wajib diisi'),
  client_id:     z.string().min(1, 'Pilih klien'),
  frequency:     z.enum(['WEEKLY','MONTHLY','QUARTERLY','YEARLY']),
  next_due_date: z.string().min(1, 'Tanggal pertama wajib diisi'),
  tax_rate:      z.number().min(0).max(100).default(11),
  currency:      z.enum(['IDR','USD','EUR','SGD']).default('IDR'),
  notes:         z.string().default(''),
  line_items: z.array(z.object({
    id:          z.string(),
    description: z.string().min(1, 'Deskripsi wajib'),
    quantity:    z.number().positive(),
    unit:        z.string().default(''),
    unit_price:  z.number().min(0),
  })).min(1),
});
type RecurringFormValues = z.infer<typeof recurringSchema>;

export default function RecurringPage({ navigate }: RecurringPageProps) {
  const { templates, addTemplate, toggleActive, deleteTemplate, advanceNextDue } = useRecurringStore();
  const { clients } = useClientStore();
  const { addInvoice } = useInvoiceStore();
  const { settings } = useSettingsStore();
  const { items: catalogItems } = useItemCatalogStore();

  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [generateTarget, setGenerateTarget] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      name: '', client_id: '', frequency: 'MONTHLY',
      next_due_date: todayISO(), tax_rate: settings.default_tax_rate,
      currency: settings.default_currency, notes: settings.payment_notes,
      line_items: [{ id: generateId(), description: '', quantity: 1, unit: '', unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });
  const watchedItems    = watch('line_items');
  const watchedCurrency = watch('currency');
  const watchedTax      = watch('tax_rate');

  const summary = calculateSummary(
    watchedItems.map((i) => ({ quantity: i.quantity || 0, unit_price: i.unit_price || 0 })),
    null, 0, watchedTax || 0
  );

  const onSubmit = (data: RecurringFormValues) => {
    const client = clients.find((c) => c.id === data.client_id);
    if (!client) return;
    addTemplate({
      name: data.name, client_id: client.id,
      client_snapshot: { name: client.name, email: client.email, phone: client.phone, address: client.address, company: client.company },
      frequency: data.frequency as RecurringFrequency,
      next_due_date: data.next_due_date,
      is_active: true,
      template_data: {
        client_id: client.id, tax_rate: data.tax_rate,
        currency: data.currency, notes: data.notes,
        line_items: data.line_items,
        invoice_date: todayISO(), due_date: todayISO(),
        discount_type: null, discount_value: 0,
      },
      currency: data.currency, notes: data.notes,
    });
    reset();
    setShowForm(false);
    setSuccessMsg('Template recurring berhasil dibuat!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Generate invoice dari template
  const handleGenerate = (templateId: string) => {
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;

    const td   = tmpl.template_data;
    const items = (td.line_items ?? []) as any[];

    const lineItems: InvoiceLineItem[] = items.map((item: any, idx: number) => ({
      id: generateId(), invoice_id: '', catalog_item_id: null,
      description: item.description, quantity: item.quantity, unit: item.unit,
      unit_price: item.unit_price,
      line_total: calculateLineTotal(item.quantity, item.unit_price),
      sort_order: idx,
    }));

    const sum = calculateSummary(
      items.map((i: any) => ({ quantity: i.quantity, unit_price: i.unit_price })),
      null, 0, tmpl.template_data.tax_rate ?? settings.default_tax_rate
    );

    const inv = addInvoice({
      client_id: tmpl.client_id,
      client_snapshot: tmpl.client_snapshot,
      status: 'DRAFT',
      invoice_date: todayISO(),
      due_date: tmpl.next_due_date,
      line_items: lineItems,
      subtotal: sum.subtotal,
      discount_type: null, discount_value: 0,
      tax_rate: td.tax_rate ?? settings.default_tax_rate,
      tax_amount: sum.tax_amount,
      total_amount: sum.total_amount,
      currency: tmpl.currency,
      notes: tmpl.notes,
      pdf_path: null,
    }, settings.invoice_prefix);

    advanceNextDue(templateId, tmpl.frequency);
    setGenerateTarget(null);
    setSuccessMsg(`Invoice ${inv.invoice_number} berhasil dibuat!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const dueCount = templates.filter((t) => t.is_active && isDueToday(t.next_due_date)).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Recurring Invoice</h2>
            <p className="text-gray-400 text-sm">{templates.length} template aktif</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          + Buat Template
        </button>
      </div>

      {/* Due alert */}
      {dueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-semibold text-amber-800">{dueCount} invoice sudah waktunya di-generate!</p>
            <p className="text-amber-600 text-sm">Klik tombol "Generate" di template yang ditandai merah.</p>
          </div>
        </div>
      )}

      {/* Success msg */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-5 flex items-center gap-2">
          <span>✅</span>
          <p className="text-green-700 font-semibold text-sm">{successMsg}</p>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState emoji="🔄"
            title="Belum ada template recurring"
            subtitle="Buat template untuk invoice yang berulang setiap minggu/bulan"
            action={{ label: '+ Buat Template', onClick: () => setShowForm(true) }} />
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => {
            const due      = isDueToday(tmpl.next_due_date);
            const daysLeft = daysUntilDue(tmpl.next_due_date);

            return (
              <div key={tmpl.id}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-all ${
                  due && tmpl.is_active ? 'border-amber-300 shadow-amber-100' : 'border-gray-100'
                }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Active toggle */}
                    <button onClick={() => toggleActive(tmpl.id)}
                      className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 relative ${
                        tmpl.is_active ? 'bg-blue-500' : 'bg-gray-200'
                      }`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        tmpl.is_active ? 'left-5' : 'left-1'
                      }`} />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{tmpl.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                          {FREQUENCY_LABEL[tmpl.frequency]}
                        </span>
                        {!tmpl.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Nonaktif</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">👤 {tmpl.client_snapshot.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={`font-semibold ${due ? 'text-amber-600' : 'text-gray-500'}`}>
                          {due
                            ? '⏰ Sudah jatuh tempo!'
                            : daysLeft === 0
                              ? 'Hari ini!'
                              : daysLeft > 0
                                ? `⏱ ${daysLeft} hari lagi`
                                : `Lewat ${Math.abs(daysLeft)} hari`
                          }
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500">Next: {formatDate(tmpl.next_due_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {tmpl.is_active && due && (
                      <button onClick={() => setGenerateTarget(tmpl.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                        ⚡ Generate
                      </button>
                    )}
                    {tmpl.is_active && !due && (
                      <button onClick={() => setGenerateTarget(tmpl.id)}
                        className="border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                        Generate Sekarang
                      </button>
                    )}
                    <button onClick={() => setDeleteTarget(tmpl.id)}
                      className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Template items preview */}
                {tmpl.template_data.line_items && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2">
                      {(tmpl.template_data.line_items as any[]).slice(0, 3).map((item: any, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                          {item.description} × {item.quantity}
                        </span>
                      ))}
                      {(tmpl.template_data.line_items as any[]).length > 3 && (
                        <span className="text-xs text-gray-400">+{(tmpl.template_data.line_items as any[]).length - 3} item lainnya</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Form Modal ── */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); reset(); }} title="Buat Template Recurring" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Template *</label>
              <input {...register('name')} placeholder="Contoh: Retainer Budi — Bulanan"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Klien *</label>
              <select {...register('client_id')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih klien --</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi *</label>
              <select {...register('frequency')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Invoice Pertama *</label>
              <input type="date" {...register('next_due_date')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PPN (%)</label>
              <input type="number" min="0" max="100" {...register('tax_rate', { valueAsNumber: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Line items */}
          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-600">Item Template</p>
              <button type="button"
                onClick={() => append({ id: generateId(), description: '', quantity: 1, unit: '', unit_price: 0 })}
                className="text-blue-600 text-xs font-semibold hover:text-blue-800">
                + Tambah Baris
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                  <input {...register(`line_items.${idx}.description`)} placeholder="Deskripsi item"
                    className="col-span-5 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" step="any" {...register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input {...register(`line_items.${idx}.unit`)} placeholder="jam"
                    className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" min="0" step="any" {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                    className="col-span-3 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => fields.length > 1 && remove(idx)} disabled={fields.length === 1}
                    className="col-span-1 text-gray-200 hover:text-red-400 text-lg disabled:opacity-20 text-center">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-sm">
              <span className="text-gray-500">Estimasi Total</span>
              <span className="font-bold text-blue-700">{formatCurrency(summary.total_amount, watchedCurrency)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea {...register('notes')} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowForm(false); reset(); }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">Batal</button>
            <button type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">✅ Simpan Template</button>
          </div>
        </form>
      </Modal>

      {/* Confirm generate */}
      <ConfirmDialog isOpen={!!generateTarget} onClose={() => setGenerateTarget(null)}
        onConfirm={() => generateTarget && handleGenerate(generateTarget)}
        title="Generate Invoice" danger={false} confirmLabel="⚡ Ya, Generate!"
        message={`Generate invoice baru dari template "${templates.find((t) => t.id === generateTarget)?.name}"? Invoice akan dibuat sebagai DRAFT dan next due date otomatis maju.`} />

      {/* Confirm delete */}
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteTemplate(deleteTarget); }}
        title="Hapus Template" message="Yakin hapus template ini? Invoice yang sudah dibuat tidak terpengaruh." />
    </div>
  );
}
