import type { Invoice, Settings } from '../types';
import { formatCurrency, formatDate } from './format';

/** Cek apakah Resend sudah dikonfigurasi */
export const isEmailConfigured = () =>
  Boolean(import.meta.env.VITE_RESEND_API_KEY);

/**
 * Generate HTML email template invoice
 * Dipake untuk kirim ke klien
 */
function generateInvoiceEmailHTML(invoice: Invoice, settings: Settings): string {
  const lineItemsHTML = invoice.line_items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'}">
      <td style="padding:12px 16px;font-size:13px;color:#374151">${item.description}</td>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center">${item.quantity} ${item.unit}</td>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:right">${formatCurrency(item.unit_price, invoice.currency)}</td>
      <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right">${formatCurrency(item.line_total, invoice.currency)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Invoice ${invoice.invoice_number}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',system-ui,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1C2B3A 0%,#0A84FF 100%);border-radius:20px 20px 0 0;padding:32px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.5px">
            ${settings.business_name || 'DSD-Invoices'}
          </h1>
          ${settings.business_email ? `<p style="color:rgba(255,255,255,0.5);font-size:12px;margin:4px 0 0">${settings.business_email}</p>` : ''}
          ${settings.business_phone ? `<p style="color:rgba(255,255,255,0.5);font-size:12px;margin:2px 0 0">${settings.business_phone}</p>` : ''}
        </div>
        <div style="text-align:right">
          <p style="color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:0.1em;margin:0">Invoice</p>
          <p style="color:#ffffff;font-family:monospace;font-size:18px;font-weight:700;margin:4px 0 0">${invoice.invoice_number}</p>
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:6px 0 0">Tgl: ${formatDate(invoice.invoice_date)}</p>
          <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:2px 0 0">Jatuh Tempo: ${formatDate(invoice.due_date)}</p>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px 32px">

      <!-- Billing to -->
      <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px;border:1px solid #e5e7eb">
        <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Tagihan Kepada</p>
        <p style="font-size:17px;font-weight:800;color:#111827;margin:0">${invoice.client_snapshot.name}</p>
        ${invoice.client_snapshot.company ? `<p style="font-size:13px;color:#6b7280;margin:3px 0 0">${invoice.client_snapshot.company}</p>` : ''}
        ${invoice.client_snapshot.address ? `<p style="font-size:12px;color:#9ca3af;margin:3px 0 0">${invoice.client_snapshot.address}</p>` : ''}
      </div>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Deskripsi</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Harga</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Total</th>
          </tr>
        </thead>
        <tbody>${lineItemsHTML}</tbody>
      </table>

      <!-- Summary -->
      <div style="display:flex;justify-content:flex-end">
        <div style="width:240px">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#6b7280">
            <span>Subtotal</span><span>${formatCurrency(invoice.subtotal, invoice.currency)}</span>
          </div>
          ${invoice.discount_value > 0 ? `
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#ef4444">
            <span>Diskon</span><span>- ${formatCurrency(invoice.subtotal - (invoice.total_amount - invoice.tax_amount), invoice.currency)}</span>
          </div>` : ''}
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#6b7280">
            <span>PPN (${invoice.tax_rate}%)</span><span>${formatCurrency(invoice.tax_amount, invoice.currency)}</span>
          </div>
          <div style="background:linear-gradient(135deg,#1C2B3A,#0A84FF);border-radius:10px;padding:14px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center">
            <span style="color:#ffffff;font-weight:800;font-size:14px">TOTAL</span>
            <span style="color:#93C5FD;font-weight:800;font-size:18px">${formatCurrency(invoice.total_amount, invoice.currency)}</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      ${invoice.notes ? `
      <div style="margin-top:24px;padding:16px 20px;background:#f9fafb;border-radius:12px;border-left:3px solid #0A84FF">
        <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Catatan & Info Pembayaran</p>
        <p style="font-size:13px;color:#6b7280;margin:0;white-space:pre-line;line-height:1.7">${invoice.notes}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;border-radius:0 0 20px 20px;padding:20px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none">
      <p style="font-size:12px;color:#9ca3af;margin:0">
        Terima kasih atas kepercayaan Anda 🙏<br/>
        <strong style="color:#6b7280">${settings.business_name}</strong>
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generate HTML email template invoice dengan QRIS
 * @param qrisDataUrl - optional base64 PNG dari QR code
 */
async function generateInvoiceEmailHTMLWithQRIS(
  invoice: Invoice,
  settings: Settings,
  qrisDataUrl?: string
): Promise<string> {
  const base = generateInvoiceEmailHTML(invoice, settings);
  if (!qrisDataUrl) return base;

  // Inject QRIS section sebelum closing body tag
  const qrisSection = `
    <div style="max-width:600px;margin:0 auto;padding:0 16px 24px">
      <div style="background:#ffffff;border-radius:0 0 20px 20px;border:1px solid #e5e7eb;border-top:none;padding:24px 32px">
        <p style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 16px">Bayar via QRIS</p>
        <div style="display:flex;align-items:center;gap:24px">
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;display:inline-block">
            <div style="text-align:center;margin-bottom:8px">
              <span style="display:inline-block;width:10px;height:10px;background:#E30613;border-radius:2px;margin-right:4px;vertical-align:middle"></span>
              <span style="font-size:9px;font-weight:700;color:#4b5563;letter-spacing:0.1em;text-transform:uppercase;vertical-align:middle">QRIS</span>
            </div>
            <img src="${qrisDataUrl}" width="160" height="160" alt="QRIS" style="display:block" />
            <p style="text-align:center;font-size:11px;color:#9ca3af;margin:8px 0 0">Nominal</p>
            <p style="text-align:center;font-size:14px;font-weight:700;color:#111827;margin:2px 0 0">${formatCurrency(invoice.total_amount, invoice.currency)}</p>
          </div>
          <div>
            <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 8px">Cara Bayar:</p>
            <ol style="font-size:12px;color:#6b7280;margin:0;padding-left:16px;line-height:2">
              <li>Buka aplikasi e-wallet (GoPay, OVO, DANA, dll)</li>
              <li>Pilih menu Scan / Bayar</li>
              <li>Scan QR code di samping</li>
              <li>Nominal sudah terisi otomatis</li>
              <li>Konfirmasi pembayaran</li>
            </ol>
          </div>
        </div>
      </div>
    </div>`;

  return base.replace('</body>', `${qrisSection}</body>`);
}

/**
 * Kirim invoice ke email klien via Resend API
 * Setup: Daftar di resend.com (gratis 100 email/hari)
 * → Tambahkan VITE_RESEND_API_KEY=re_xxxx ke .env
 * → (Opsional) VITE_EMAIL_FROM=invoice@domainlo.com
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  settings: Settings,
  recipientEmail?: string,
  qrisDataUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { success: false, message: 'Resend API key belum dikonfigurasi. Tambahkan VITE_RESEND_API_KEY ke file .env' };
  }

  const toEmail = recipientEmail || invoice.client_snapshot.email;
  if (!toEmail) {
    return { success: false, message: 'Email klien tidak ditemukan. Pastikan email klien sudah diisi.' };
  }

  const fromEmail = import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev';
  const apiKey    = import.meta.env.VITE_RESEND_API_KEY;

  const html = await generateInvoiceEmailHTMLWithQRIS(invoice, settings, qrisDataUrl);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settings.business_name || 'DSD-Invoices'} <${fromEmail}>`,
        to:   [toEmail],
        subject: `Invoice ${invoice.invoice_number} dari ${settings.business_name || 'DSD-InvoicesInvoice'}`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Email] Resend error:', data);
      return { success: false, message: data.message || 'Gagal kirim email. Cek Console (F12) untuk detail.' };
    }

    return { success: true, message: `Email berhasil dikirim ke ${toEmail}` };
  } catch (err) {
    console.error('[Email] fetch error:', err);
    return { success: false, message: `Error: ${String(err)}` };
  }
}
