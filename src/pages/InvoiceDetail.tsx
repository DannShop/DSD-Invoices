import { useState } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Page } from '../App';
import type { InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { generateInvoicePDF, generateSimplePDF } from '../utils/pdfGenerator';
import { sendInvoiceEmail, isEmailConfigured } from '../utils/emailService';
import { isValidQRIS } from '../utils/qrisGenerator';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import QRISDisplay from '../components/ui/QRISDisplay';

interface InvoiceDetailProps {
  invoiceId: string;
  navigate: (page: Page) => void;
}

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

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail]   = useState(false);
  const [emailResult, setEmailResult]         = useState<{ success: boolean; message: string } | null>(null);
  const [showDelete, setShowDelete]           = useState(false);

  const invoice = getInvoiceById(invoiceId);

  if (!invoice) {
    return (
      <div className="p-6 text-center mt-16 fade-in-up">
        <i className="fa-solid fa-file-circle-xmark text-5xl text-gray-200 mb-4 block" />
        <p className="text-gray-500 font-medium">Invoice tidak ditemukan.</p>
        <button onClick={() => navigate({ name: 'dashboard' })} className="mt-4 text-apple-blue text-sm font-semibold">
          ← Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const handlePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const el = document.getElementById('invoice-preview-root');
      if (el) await generateInvoicePDF(invoice, settings);
      else generateSimplePDF(invoice, settings);
    } catch {
      generateSimplePDF(invoice, settings);
    }
    setIsGeneratingPDF(false);
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailResult(null);

    // Generate QRIS kalau ada
    let qrisDataUrl: string | undefined;
    if (settings.qris_string && isValidQRIS(settings.qris_string)) {
      try {
        const { generateInvoiceQRIS } = await import('../utils/qrisGenerator');
        qrisDataUrl = await generateInvoiceQRIS(settings.qris_string, invoice.total_amount);
      } catch {
        // QRIS gagal generate, tetap kirim email tanpa QR
      }
    }

    const result = await sendInvoiceEmail(invoice, settings, undefined, qrisDataUrl);
    setEmailResult(result);
    setIsSendingEmail(false);
    if (result.success && invoice.status === 'DRAFT') {
      updateStatus(invoiceId, 'SENT');
    }
    setTimeout(() => setEmailResult(null), 5000);
  };

  const emailConfigured = isEmailConfigured();
  const hasClientEmail  = Boolean(invoice.client_snapshot.email);

  return (
    <div className="p-6 max-w-4xl mx-auto fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ name: 'history' })}
            className="w-8 h-8 rounded-full bg-white/80 border border-gray-200/80 flex items-center justify-center hover:bg-gray-50 transition-all press-effect shadow-sm">
            <i className="fa-solid fa-arrow-left text-gray-500 text-xs" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800 font-mono tracking-tight">{invoice.invoice_number}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={invoice.status} />
              <span className="text-gray-400 text-sm">{invoice.client_snapshot.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status transitions */}
          {NEXT_STATUSES[invoice.status].map((s) => (
            <button key={s} onClick={() => updateStatus(invoiceId, s)}
              className="text-xs px-3 py-1.5 rounded-apple border border-gray-200/80 bg-white/80 hover:bg-gray-50 font-semibold text-gray-600 transition-all press-effect">
              Tandai {s}
            </button>
          ))}

          {/* Send Email */}
          <button
            onClick={handleSendEmail}
            disabled={isSendingEmail || !emailConfigured || !hasClientEmail}
            title={
              !emailConfigured ? 'Setup Resend API key dulu di .env (VITE_RESEND_API_KEY)' :
              !hasClientEmail  ? 'Email klien belum diisi' : 'Kirim invoice ke email klien'
            }
            className="flex items-center gap-2 px-4 py-2 rounded-apple text-sm font-semibold transition-all press-effect
              bg-white/80 border border-gray-200/80 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <i className={`fa-solid ${isSendingEmail ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-apple-blue`} />
            {isSendingEmail ? 'Mengirim...' : 'Kirim Email'}
          </button>

          {/* Export PDF */}
          <button onClick={handlePDF} disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-apple text-sm font-semibold bg-apple-blue hover:bg-apple-blue/90 text-white transition-all press-effect shadow-lg shadow-apple-blue/25 disabled:opacity-60">
            <i className={`fa-solid ${isGeneratingPDF ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} />
            {isGeneratingPDF ? 'Generating...' : 'Export PDF'}
          </button>

          {/* Delete */}
          <button onClick={() => setShowDelete(true)}
            className="w-9 h-9 rounded-apple border border-gray-200/80 bg-white/80 flex items-center justify-center text-gray-400 hover:text-apple-red hover:border-apple-red/20 hover:bg-apple-red/5 transition-all press-effect">
            <i className="fa-solid fa-trash text-xs" />
          </button>
        </div>
      </div>

      {/* Email result toast */}
      {emailResult && (
        <div className={`glass rounded-apple px-4 py-3 mb-4 flex items-center gap-3 border text-sm font-medium
          ${emailResult.success
            ? 'border-apple-green/20 bg-apple-green/5 text-apple-green'
            : 'border-apple-red/20 bg-apple-red/5 text-apple-red'
          }`}>
          <i className={`fa-solid ${emailResult.success ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
          {emailResult.message}
        </div>
      )}

      {/* Email not configured notice */}
      {!emailConfigured && (
        <div className="glass rounded-apple px-4 py-3 mb-4 flex items-center gap-3 border border-amber-200/60 bg-amber-50/60 text-amber-700 text-sm">
          <i className="fa-solid fa-circle-info text-amber-500" />
          <span>Tambahkan <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">VITE_RESEND_API_KEY=re_xxx</code> ke file <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> untuk aktifkan kirim email otomatis.</span>
        </div>
      )}

      {/* Invoice Preview */}
      <div id="invoice-preview-root" className="glass rounded-apple-xl overflow-hidden shadow-glass-lg border border-white/60">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1C2B3A] to-[#0A84FF]/70 px-8 py-7 flex justify-between items-start">
          <div>
            {settings.logo_base64 && (
              <img src={settings.logo_base64} alt="Logo" className="h-12 mb-3 object-contain" />
            )}
            <h1 className="text-white text-xl font-bold tracking-tight">
              {settings.business_name || 'Nama Bisnis'}
            </h1>
            {settings.business_address && <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{settings.business_address}</p>}
            {settings.business_email   && <p className="text-white/40 text-xs">{settings.business_email}</p>}
            {settings.business_phone   && <p className="text-white/40 text-xs">{settings.business_phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.15em] mb-1">Invoice</p>
            <p className="text-white font-mono font-bold text-xl tracking-tight">{invoice.invoice_number}</p>
            <div className="mt-3 space-y-1">
              <p className="text-white/40 text-xs">Tanggal: {formatDate(invoice.invoice_date)}</p>
              <p className="text-white/40 text-xs">Jatuh Tempo: {formatDate(invoice.due_date)}</p>
            </div>
            <div className="mt-3"><StatusBadge status={invoice.status} /></div>
          </div>
        </div>

        {/* Billing */}
        <div className="px-8 py-5 bg-gray-50/60 border-b border-gray-100/80">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tagihan Kepada</p>
          <p className="font-bold text-gray-800 text-lg leading-tight">{invoice.client_snapshot.name}</p>
          {invoice.client_snapshot.company  && <p className="text-gray-500 text-sm mt-0.5">{invoice.client_snapshot.company}</p>}
          {invoice.client_snapshot.address  && <p className="text-gray-400 text-sm leading-relaxed mt-0.5">{invoice.client_snapshot.address}</p>}
          {invoice.client_snapshot.email    && <p className="text-gray-400 text-sm">{invoice.client_snapshot.email}</p>}
        </div>

        {/* Line items */}
        <div className="px-8 py-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left py-2.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold w-6">#</th>
                <th className="text-left py-2.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Deskripsi</th>
                <th className="text-center py-2.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Qty</th>
                <th className="text-right py-2.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Harga</th>
                <th className="text-right py-2.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.line_items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-50 ${idx % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                  <td className="py-3.5 text-gray-300 text-xs">{idx + 1}</td>
                  <td className="py-3.5 text-gray-800 font-medium">{item.description}</td>
                  <td className="py-3.5 text-center text-gray-500 text-sm">{item.quantity} {item.unit}</td>
                  <td className="py-3.5 text-right text-gray-500 text-sm">{formatCurrency(item.unit_price, invoice.currency)}</td>
                  <td className="py-3.5 text-right font-semibold text-gray-800">{formatCurrency(item.line_total, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-8 pb-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span className="font-medium text-gray-700">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.discount_value > 0 && (
              <div className="flex justify-between text-sm text-apple-red">
                <span>Diskon</span>
                <span>- {formatCurrency(invoice.subtotal - (invoice.total_amount - invoice.tax_amount), invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>PPN ({invoice.tax_rate}%)</span><span className="font-medium text-gray-700">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
            </div>
            <div className="flex justify-between items-center bg-gradient-to-r from-[#1C2B3A] to-[#0A84FF]/80 text-white rounded-apple-lg px-4 py-3.5 mt-2">
              <span className="font-bold text-sm">TOTAL</span>
              <span className="font-bold text-lg text-blue-200">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes + QRIS */}
        <div className="px-8 py-5 bg-gray-50/60 border-t border-gray-100/80">
          <div className={`flex gap-8 ${settings.qris_string && isValidQRIS(settings.qris_string) ? 'items-start' : ''}`}>
            {/* Notes */}
            {invoice.notes && (
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Catatan & Info Pembayaran</p>
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}

            {/* QRIS semi-dinamis */}
            {settings.qris_string && isValidQRIS(settings.qris_string) && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
              <div className="shrink-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bayar via QRIS</p>
                <QRISDisplay
                  qrisStatis={settings.qris_string}
                  nominal={invoice.total_amount}
                  currency={invoice.currency}
                  size={140}
                  showLabel={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center border-t border-gray-100/80">
          <p className="text-xs text-gray-300">Terima kasih atas kepercayaan Anda 🙏 · {settings.business_name}</p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => { deleteInvoice(invoiceId); navigate({ name: 'dashboard' }); }}
        title="Hapus Invoice"
        message={`Yakin hapus invoice ${invoice.invoice_number}? Tindakan ini tidak bisa dibatalkan.`}
      />
    </div>
  );
}
