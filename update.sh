#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# WildanInvoice — Patch: Setup Resend via Supabase Edge Function
# ═══════════════════════════════════════════════════════════════
#
# LATAR BELAKANG:
# Browser tidak bisa memanggil api.resend.com langsung (diblokir
# CORS oleh Resend — ini normal untuk SEMUA provider email API,
# bukan cuma Resend). Solusinya: browser memanggil Supabase Edge
# Function (yang boleh dipanggil dari browser), lalu Edge Function
# itu yang memanggil Resend dari sisi server.
#
#   Browser → Supabase Edge Function → Resend API → Email terkirim
#
# CARA PAKAI SCRIPT INI:
# 1. Copy file ini ke ROOT folder project (sejajar package.json)
# 2. Jalankan: bash setup-resend-edge-function-patch.sh
# 3. Ikuti langkah DEPLOY MANUAL di akhir output script ini
#    (deploy Edge Function via Supabase Dashboard, tidak perlu CLI)
# 4. Restart dev server: npm run dev
#
# FILE YANG DIBUAT/DIUBAH:
# - supabase/functions/send-invoice-email/index.ts  (BARU)
# - src/utils/emailService.ts                        (rewrite penuh)
# - src/pages/InvoiceDetail.tsx                       (patch teks notice)
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Patch: Resend via Supabase Edge Function${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ package.json tidak ditemukan.${NC}"
  echo -e "${YELLOW}   Jalankan script ini dari ROOT folder project.${NC}"
  exit 1
fi

EMAIL_SERVICE="src/utils/emailService.ts"
INVOICE_DETAIL="src/pages/InvoiceDetail.tsx"
EDGE_FN_DIR="supabase/functions/send-invoice-email"
EDGE_FN_FILE="${EDGE_FN_DIR}/index.ts"

mkdir -p "$EDGE_FN_DIR"

for f in "$EMAIL_SERVICE" "$INVOICE_DETAIL"; do
  if [ -f "$f" ]; then
    cp "$f" "${f}.bak"
  fi
done
echo -e "${YELLOW}📦 Backup dibuat (.bak) untuk file yang ada${NC}"
echo ""

# ── 1. Buat Edge Function ──
cat > "$EDGE_FN_FILE" << 'FILE_EOF'
// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: send-invoice-email
// ─────────────────────────────────────────────────────────────
// Fungsi ini jadi "perantara" antara browser dan Resend API.
// Browser TIDAK BISA manggil api.resend.com langsung (CORS block),
// jadi browser manggil Edge Function ini (yang boleh dipanggil dari
// browser), lalu Edge Function ini yang manggil Resend dari sisi
// server (Deno runtime, bukan browser — jadi CORS tidak berlaku).
//
// CARA DEPLOY (via Dashboard, tanpa install apapun):
// 1. Buka dashboard.supabase.com → project kamu
// 2. Sidebar kiri → Edge Functions → Deploy a new function
// 3. Pilih "Via Editor" (bukan AI Assistant)
// 4. Nama function: send-invoice-email
// 5. Hapus semua kode default, paste seluruh isi file ini
// 6. Klik Deploy
// 7. Setelah deploy, buka tab "Secrets" di Edge Functions
//    → tambahkan secret: RESEND_API_KEY = re_xxxxxxxxx (API key Resend kamu)
// ═══════════════════════════════════════════════════════════════

// @ts-ignore - Deno import, valid di runtime Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, toName, subject, html, fromEmail, fromName } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Field 'to', 'subject', dan 'html' wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-ignore - Deno global, valid di runtime Supabase
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY belum di-set di Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName || "WildanInvoice"} <${fromEmail || "onboarding@resend.dev"}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: resendData.message || "Gagal kirim email via Resend", detail: resendData }),
        { status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
FILE_EOF

echo -e "${GREEN}✅ ${EDGE_FN_FILE} dibuat${NC}"

# ── 2. Rewrite emailService.ts ──
cat > "$EMAIL_SERVICE" << 'FILE_EOF'
import type { Invoice, Settings } from '../types';
import { formatCurrency, formatDate } from './format';

/** Cek apakah Supabase (untuk Edge Function) sudah dikonfigurasi */
export const isEmailConfigured = () =>
  Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

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
            ${settings.business_name || 'WildanInvoice'}
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
 * Kirim invoice ke email klien via Resend, di-relay lewat Supabase Edge Function.
 * ─────────────────────────────────────────────────────────────
 * Browser TIDAK bisa manggil api.resend.com langsung (diblokir CORS
 * oleh Resend, ini normal untuk semua provider email API demi
 * keamanan). Jadi alurnya:
 *
 *   Browser → Supabase Edge Function → Resend API → Email terkirim
 *
 * Setup yang dibutuhkan:
 * 1. Deploy Edge Function "send-invoice-email"
 *    (lihat supabase/functions/send-invoice-email/index.ts)
 * 2. Set secret RESEND_API_KEY di Supabase Dashboard
 *    → Edge Functions → send-invoice-email → Secrets
 * 3. (Opsional) VITE_EMAIL_FROM di .env — kalau kosong pakai
 *    default onboarding@resend.dev dari Resend
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  settings: Settings,
  recipientEmail?: string,
  qrisDataUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { success: false, message: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env' };
  }

  const toEmail = recipientEmail || invoice.client_snapshot.email;
  if (!toEmail) {
    return { success: false, message: 'Email klien tidak ditemukan. Pastikan email klien sudah diisi.' };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const fromEmail    = import.meta.env.VITE_EMAIL_FROM || 'onboarding@resend.dev';

  const html = await generateInvoiceEmailHTMLWithQRIS(invoice, settings, qrisDataUrl);

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        to: toEmail,
        toName: invoice.client_snapshot.name,
        subject: `Invoice ${invoice.invoice_number} dari ${settings.business_name || 'WildanInvoice'}`,
        html,
        fromEmail,
        fromName: settings.business_name || 'WildanInvoice',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Email] Edge Function error:', data);
      return { success: false, message: data.error || 'Gagal kirim email. Cek Console (F12) untuk detail.' };
    }

    return { success: true, message: `Email berhasil dikirim ke ${toEmail}` };
  } catch (err) {
    console.error('[Email] fetch error:', err);
    return { success: false, message: `Error: ${String(err)}. Pastikan Edge Function "send-invoice-email" sudah di-deploy di Supabase.` };
  }
}
FILE_EOF

echo -e "${GREEN}✅ ${EMAIL_SERVICE} diperbarui (panggil Edge Function)${NC}"

# ── 3. Patch InvoiceDetail.tsx pakai sed ──
if [ -f "$INVOICE_DETAIL" ]; then
  if sed --version >/dev/null 2>&1; then
    SED_INPLACE=(-i)
  else
    SED_INPLACE=(-i '')
  fi

  sed "${SED_INPLACE[@]}" \
    -e "s/Setup Resend API key dulu di \.env (VITE_RESEND_API_KEY)/Setup Supabase Edge Function dulu (lihat panduan)/g" \
    -e "s/Setup Brevo API key dulu di \.env (VITE_BREVO_API_KEY)/Setup Supabase Edge Function dulu (lihat panduan)/g" \
    "$INVOICE_DETAIL"

  echo -e "${GREEN}✅ ${INVOICE_DETAIL} diperbarui (tooltip)${NC}"
  echo -e "${YELLOW}   Catatan: notice box panjang (soal cara setup) mungkin masih${NC}"
  echo -e "${YELLOW}   menyebut provider lama — ini cuma teks UI, tidak mempengaruhi fungsi.${NC}"
else
  echo -e "${YELLOW}⚠️  ${INVOICE_DETAIL} tidak ditemukan, skip.${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  LANGKAH DEPLOY EDGE FUNCTION (manual, ~5 menit)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "  1. Buka ${YELLOW}dashboard.supabase.com${NC} → project kamu"
echo -e "  2. Sidebar kiri → ${YELLOW}Edge Functions${NC}"
echo -e "  3. Klik ${YELLOW}Deploy a new function${NC} → pilih ${YELLOW}Via Editor${NC}"
echo -e "  4. Nama function: ${YELLOW}send-invoice-email${NC}"
echo -e "  5. Hapus kode default, copy-paste seluruh isi file:"
echo -e "     ${YELLOW}${EDGE_FN_FILE}${NC}"
echo -e "  6. Klik ${YELLOW}Deploy${NC}"
echo -e "  7. Buka tab ${YELLOW}Secrets${NC} di halaman function tsb"
echo -e "  8. Tambahkan secret:"
echo -e "     ${YELLOW}Key:${NC}   RESEND_API_KEY"
echo -e "     ${YELLOW}Value:${NC} re_xxxxxxxxxxxx  (API key Resend kamu)"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setelah deploy selesai:${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "  npm run dev"
echo -e "  → Buka invoice → klik Kirim Email → cek inbox klien"
echo ""
echo -e "${YELLOW}Kalau sudah OK, hapus file backup:${NC}"
echo -e "  rm ${EMAIL_SERVICE}.bak ${INVOICE_DETAIL}.bak"
echo ""
echo -e "${BLUE}Kalau mau commit ke GitHub:${NC}"
echo -e "  git add supabase/ src/utils/emailService.ts src/pages/InvoiceDetail.tsx"
echo -e "  git commit -m \"Add Supabase Edge Function relay for Resend email (fix CORS)\""
echo -e "  git push"
echo ""