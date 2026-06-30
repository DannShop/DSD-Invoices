import { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceFormSchema, type InvoiceFormValues } from '../schemas';
import { useInvoiceStore } from '../store/invoiceStore';
import { useClientStore } from '../store/clientStore';
import { useSettingsStore } from '../store/settingsStore';
import { useItemCatalogStore } from '../store/itemCatalogStore';
import { calculateSummary, calculateLineTotal, formatCurrency, todayISO, addDays } from '../utils/format';
import { generateId } from '../utils/storage';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';
import type { InvoiceLineItem } from '../types';

interface CreateInvoiceProps {
  navigate: (page: Page) => void;
  onSuccess: (invoiceId: string) => void;
}

export default function CreateInvoice({ navigate, onSuccess }: CreateInvoiceProps) {
  const { addInvoice } = useInvoiceStore();
  const { clients } = useClientStore();
  const { settings } = useSettingsStore();
  const { items: catalogItems } = useItemCatalogStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogOpenIdx, setCatalogOpenIdx] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) {
        setCatalogOpenIdx(null);
        setCatalogSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      client_id: '',
      invoice_date: todayISO(),
      due_date: addDays(todayISO(), 14),
      line_items: [{ id: generateId(), description: '', quantity: 1, unit: '', unit_price: 0 }],
      discount_type: null,
      discount_value: 0,
      tax_rate: settings.default_tax_rate,
      currency: settings.default_currency,
      notes: settings.payment_notes,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });

  const watchedItems        = watch('line_items');
  const watchedDiscount     = watch('discount_value');
  const watchedDiscountType = watch('discount_type');
  const watchedTax          = watch('tax_rate');
  const watchedCurrency     = watch('currency');

  const summary = calculateSummary(
    watchedItems.map((i) => ({ quantity: i.quantity || 0, unit_price: i.unit_price || 0 })),
    watchedDiscountType, watchedDiscount || 0, watchedTax || 0,
  );

  const pickCatalogItem = (idx: number, itemId: string) => {
    const item = catalogItems.find((i) => i.id === itemId);
    if (!item) return;
    setValue(`line_items.${idx}.description`, item.name);
    setValue(`line_items.${idx}.unit_price`, item.default_price);
    setValue(`line_items.${idx}.unit`, item.unit);
    setCatalogOpenIdx(null);
    setCatalogSearch('');
  };

  const filteredCatalog = catalogItems.filter((i) =>
    i.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(catalogSearch.toLowerCase())
  );

  const onSubmit = (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    const client = clients.find((c) => c.id === data.client_id);
    if (!client) { setIsSubmitting(false); return; }

    const lineItems: InvoiceLineItem[] = data.line_items.map((item, idx) => ({
      id: item.id, invoice_id: '', catalog_item_id: null,
      description: item.description, quantity: item.quantity, unit: item.unit,
      unit_price: item.unit_price,
      line_total: calculateLineTotal(item.quantity, item.unit_price),
      sort_order: idx,
    }));

    const inv = addInvoice({
      client_id: client.id,
      client_snapshot: { name: client.name, email: client.email, phone: client.phone, address: client.address, company: client.company },
      status: 'DRAFT', invoice_date: data.invoice_date, due_date: data.due_date,
      line_items: lineItems, subtotal: summary.subtotal,
      discount_type: data.discount_type, discount_value: data.discount_value,
      tax_rate: data.tax_rate, tax_amount: summary.tax_amount,
      total_amount: summary.total_amount, currency: data.currency,
      notes: data.notes, pdf_path: null,
    }, settings.invoice_prefix);

    setIsSubmitting(false);
    onSuccess(inv.id);
  };

  if (clients.length === 0) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <EmptyState emoji="👤" title="Belum ada data klien"
          subtitle="Tambah klien dulu sebelum membuat invoice."
          action={{ label: 'Pergi ke Halaman Klien', onClick: () => navigate({ name: 'clients' }) }} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Buat Invoice Baru</h2>
          <p className="text-gray-400 text-sm">Nomor invoice di-generate otomatis</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Info Dasar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-widest">Informasi Invoice</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Klien <span className="text-red-500">*</span></label>
              <select {...register('client_id')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih klien --</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
              </select>
              {errors.client_id && <p className="text-red-500 text-xs mt-1">{errors.client_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Invoice <span className="text-red-500">*</span></label>
              <input type="date" {...register('invoice_date')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jatuh Tempo <span className="text-red-500">*</span></label>
              <input type="date" {...register('due_date')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
              <select {...register('currency')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['IDR', 'USD', 'EUR', 'SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-500 text-xs uppercase tracking-widest">Item / Jasa</h3>
            <div className="flex items-center gap-3">
              {catalogItems.length > 0 && <span className="text-xs text-gray-400">💡 Klik 📦 untuk pilih dari katalog</span>}
              <button type="button"
                onClick={() => append({ id: generateId(), description: '', quantity: 1, unit: '', unit_price: 0 })}
                className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
                + Tambah Baris
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-2 mb-2 text-xs text-gray-400 font-semibold uppercase tracking-wide">
            <div className="col-span-5">Deskripsi</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-1">Sat.</div>
            <div className="col-span-2">Harga/Unit</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-2" ref={catalogRef}>
            {fields.map((field, idx) => {
              const qty   = watchedItems[idx]?.quantity || 0;
              const price = watchedItems[idx]?.unit_price || 0;
              return (
                <div key={field.id} className="relative">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 flex gap-1">
                      <input {...register(`line_items.${idx}.description`)} placeholder="Nama jasa / produk"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      {catalogItems.length > 0 && (
                        <button type="button"
                          onClick={() => { setCatalogOpenIdx(catalogOpenIdx === idx ? null : idx); setCatalogSearch(''); }}
                          title="Pilih dari katalog"
                          className={`px-2 rounded-lg border text-sm transition-colors ${catalogOpenIdx === idx ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-400 hover:border-blue-400 hover:text-blue-500'}`}>
                          📦
                        </button>
                      )}
                    </div>
                    <input type="number" min="0" step="any"
                      {...register(`line_items.${idx}.quantity`, { valueAsNumber: true })}
                      className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input {...register(`line_items.${idx}.unit`)} placeholder="jam"
                      className="col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" min="0" step="any"
                      {...register(`line_items.${idx}.unit_price`, { valueAsNumber: true })}
                      className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="col-span-1 text-right text-sm font-semibold text-gray-700">
                      {formatCurrency(qty * price, watchedCurrency)}
                    </div>
                    <button type="button" onClick={() => fields.length > 1 && remove(idx)}
                      disabled={fields.length === 1}
                      className="col-span-1 text-gray-200 hover:text-red-400 text-lg transition-colors disabled:opacity-20 text-center">✕</button>
                  </div>

                  {/* Catalog dropdown */}
                  {catalogOpenIdx === idx && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input autoFocus value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)}
                          placeholder="Cari item katalog..."
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {filteredCatalog.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-4">Tidak ada item ditemukan</p>
                        ) : filteredCatalog.map((item) => (
                          <button key={item.id} type="button" onClick={() => pickCatalogItem(idx, item.id)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{item.name}</p>
                              {item.category && <p className="text-xs text-blue-500">{item.category}</p>}
                            </div>
                            <div className="text-right ml-4 shrink-0">
                              <p className="text-sm font-bold text-blue-700">{formatCurrency(item.default_price, watchedCurrency)}</p>
                              {item.unit && <p className="text-xs text-gray-400">/{item.unit}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Diskon & Pajak */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-500 mb-4 text-xs uppercase tracking-widest">Diskon & Pajak</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Diskon</label>
              <select {...register('discount_type')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Tanpa Diskon</option>
                <option value="FLAT">Flat (Rp)</option>
                <option value="PERCENT">Persentase (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nilai Diskon</label>
              <input type="number" min="0" step="any" {...register('discount_value', { valueAsNumber: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PPN / Pajak (%)</label>
              <input type="number" min="0" max="100" step="0.1" {...register('tax_rate', { valueAsNumber: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Catatan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Catatan / Info Pembayaran</label>
          <textarea {...register('notes')} rows={3}
            placeholder="Info rekening bank, syarat pembayaran, dll..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        {/* Summary + Submit */}
        <div className="flex gap-5 items-start">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex-1 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span className="font-medium">{formatCurrency(summary.subtotal, watchedCurrency)}</span>
            </div>
            {summary.discount_amount > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Diskon</span><span>- {formatCurrency(summary.discount_amount, watchedCurrency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>PPN ({watchedTax}%)</span><span className="font-medium">{formatCurrency(summary.tax_amount, watchedCurrency)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-800">
              <span>TOTAL</span>
              <span className="text-blue-700 text-lg">{formatCurrency(summary.total_amount, watchedCurrency)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[160px]">
            <button type="submit" disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold transition-colors disabled:opacity-60">
              {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan Invoice'}
            </button>
            <button type="button" onClick={() => navigate({ name: 'dashboard' })}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-xl font-semibold transition-colors">
              Batal
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
