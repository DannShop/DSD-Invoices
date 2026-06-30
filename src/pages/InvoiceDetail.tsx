import { useState } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Page } from '../App';
import type { InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { generateInvoicePDF, generateSimplePDF } from '../utils/pdfGenerator';

interface InvoiceDetailProps {
  invoiceId: string;
  navigate: (page: Page) => void;
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SENT:      'bg-blue-100 text-blue-700',
  PAID:      'bg-green-100 text-green-700',
  OVERDUE:   'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

const NEXT_STATUSES: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['PAID', 'OVERDUE', 'CANCELLED'],
  PAID:      [],
  OVERDUE:   ['PAID', 'CANCELLED'],
  CANCELLED: [],
};

export default function InvoiceDetail({ invoiceId, navigate }: InvoiceDetailProps) {
  const { getInvoiceById, updateStatus, deleteInvoice } = useInvoiceStore();
  const { settings } = useSettingsStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const invoice = getInvoiceById(invoiceId);

  if (!invoice) {
    return (
      <div className="p-6 text-center mt-16">
        <p className="text-gray-500">Invoice tidak ditemukan.</p>
        <button onClick={() => navigate({ name: 'dashboard' })} className="mt-4 text-blue-600">
          ← Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const handlePDF = async () => {
    setIsGenerating(true);
    try {
      // Coba render via DOM dulu, fallback ke simple jsPDF
      const el = document.getElementById('invoice-preview-root');
      if (el) {
        await generateInvoicePDF(invoice, settings);
      } else {
        generateSimplePDF(invoice, settings);
      }
    } catch {
      generateSimplePDF(invoice, settings);
    }
    setIsGenerating(false);
  };

  const handleDelete = () => {
    if (confirm(`Hapus invoice ${invoice.invoice_number}? Tindakan ini tidak bisa dibatalkan.`)) {
      deleteInvoice(invoiceId);
      navigate({ name: 'dashboard' });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ name: 'dashboard' })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ←
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 font-mono">
              {invoice.invoice_number}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[invoice.status]}`}>
                {invoice.status}
              </span>
              <span className="text-gray-400 text-sm">
                {invoice.client_snapshot.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status transitions */}
          {NEXT_STATUSES[invoice.status].map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(invoiceId, s)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 font-semibold text-gray-600 transition-colors"
            >
              Tandai {s}
            </button>
          ))}
          <button
            onClick={handlePDF}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60"
          >
            {isGenerating ? '⏳ Generating...' : '📄 Export PDF'}
          </button>
          <button
            onClick={handleDelete}
            className="text-red-400 hover:text-red-600 px-2 py-2 rounded-lg transition-colors text-sm"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Invoice Preview — ini yang di-capture jsPDF */}
      <div
        id="invoice-preview-root"
        className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* ── HEADER INVOICE ── */}
        <div className="bg-[#1E3A5F] px-8 py-6 flex justify-between items-start">
          <div>
            {settings.logo_base64 && (
              <img src={settings.logo_base64} alt="Logo" className="h-12 mb-2 object-contain" />
            )}
            <h1 className="text-white text-xl font-bold">
              {settings.business_name || 'Nama Bisnis'}
            </h1>
            {settings.business_address && (
              <p className="text-blue-200 text-xs mt-1 whitespace-pre-line">
                {settings.business_address}
              </p>
            )}
            {settings.business_email && (
              <p className="text-blue-200 text-xs">{settings.business_email}</p>
            )}
            {settings.business_phone && (
              <p className="text-blue-200 text-xs">{settings.business_phone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Invoice</p>
            <p className="text-white font-mono font-bold text-lg">{invoice.invoice_number}</p>
            <p className="text-blue-200 text-xs mt-2">
              Tanggal: {formatDate(invoice.invoice_date)}
            </p>
            <p className="text-blue-200 text-xs">
              Jatuh Tempo: {formatDate(invoice.due_date)}
            </p>
            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[invoice.status]}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* ── BILLING TO ── */}
        <div className="px-8 py-5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Tagihan Kepada</p>
          <p className="font-bold text-gray-800 text-lg">{invoice.client_snapshot.name}</p>
          {invoice.client_snapshot.company && (
            <p className="text-gray-500 text-sm">{invoice.client_snapshot.company}</p>
          )}
          {invoice.client_snapshot.address && (
            <p className="text-gray-500 text-sm whitespace-pre-line">{invoice.client_snapshot.address}</p>
          )}
          {invoice.client_snapshot.email && (
            <p className="text-gray-500 text-sm">{invoice.client_snapshot.email}</p>
          )}
        </div>

        {/* ── LINE ITEMS ── */}
        <div className="px-8 py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold w-6">#</th>
                <th className="text-left py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Deskripsi</th>
                <th className="text-center py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Qty</th>
                <th className="text-right py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Harga</th>
                <th className="text-right py-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}
                >
                  <td className="py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="py-3 text-gray-800">{item.description}</td>
                  <td className="py-3 text-center text-gray-600">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 text-right text-gray-600">
                    {formatCurrency(item.unit_price, invoice.currency)}
                  </td>
                  <td className="py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(item.line_total, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── SUMMARY ── */}
        <div className="px-8 pb-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discount_value > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Diskon</span>
                <span>- {formatCurrency(invoice.subtotal - (invoice.total_amount - invoice.tax_amount), invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>PPN ({invoice.tax_rate}%)</span>
              <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#1E3A5F] text-white rounded-lg px-4 py-3 mt-2">
              <span className="font-bold text-sm">TOTAL</span>
              <span className="font-bold text-lg">
                {formatCurrency(invoice.total_amount, invoice.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* ── NOTES ── */}
        {invoice.notes && (
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">
              Catatan &amp; Info Pembayaran
            </p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-300">
            Terima kasih atas kepercayaan Anda 🙏 • {settings.business_name}
          </p>
        </div>
      </div>
    </div>
  );
}
