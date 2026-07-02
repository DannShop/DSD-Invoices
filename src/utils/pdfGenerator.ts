import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Invoice, Settings } from '../types';
import { formatCurrency, formatDate } from './format';

/**
 * Mengambil elemen preview invoice dari DOM lalu convert ke PDF.
 * Elemen harus punya id="invoice-preview-root"
 */
export async function generateInvoicePDF(
  invoice: Invoice,
  settings: Settings
): Promise<void> {
  const element = document.getElementById('invoice-preview-root');
  if (!element) {
    throw new Error('Elemen preview invoice tidak ditemukan di DOM');
  }

  // Capture DOM → canvas
  const canvas = await html2canvas(element, {
    scale: 2,           // retina quality
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const canvasAspect = canvas.height / canvas.width;
  const imgHeight = pdfWidth * canvasAspect;

  // Kalau content > 1 halaman, paginate
  let y = 0;
  while (y < imgHeight) {
    if (y > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, imgHeight);
    y += pdfHeight;
  }

  // Nama file: INV-2026-001_NamaKlien.pdf
  const safeName = invoice.client_snapshot.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${invoice.invoice_number}_${safeName}.pdf`;

  pdf.save(fileName);
}

/**
 * Generate PDF dari data langsung (tanpa DOM capture).
 * Dipakai sebagai fallback atau untuk testing.
 */
export function generateSimplePDF(invoice: Invoice, settings: Settings): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageW = pdf.internal.pageSize.getWidth();
  let y = margin;

  // Helper
  const line = (text: string, x = margin, size = 10, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.text(text, x, y);
    y += size * 0.4 + 2;
  };
  const gap = (mm = 5) => { y += mm; };
  const hrule = () => {
    pdf.setDrawColor(200);
    pdf.line(margin, y, pageW - margin, y);
    y += 4;
  };

  // ── HEADER ──
  pdf.setFillColor(30, 58, 95);
  pdf.rect(0, 0, pageW, 30, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(settings.business_name || 'DSD-Invoices', margin, 15);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('INVOICE', pageW - margin - 20, 15);
  y = 38;

  pdf.setTextColor(44, 62, 80);

  // ── INVOICE META ──
  const metaX = pageW / 2;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(invoice.invoice_number, metaX, y, { align: 'left' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  y += 5;
  pdf.text(`Tanggal: ${formatDate(invoice.invoice_date)}`, metaX, y);
  y += 4;
  pdf.text(`Jatuh Tempo: ${formatDate(invoice.due_date)}`, metaX, y);
  y = 38;

  // ── DARI (bisnis) ──
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DARI:', margin, y); y += 4;
  pdf.setFont('helvetica', 'normal');
  if (settings.business_address) pdf.text(settings.business_address, margin, y, { maxWidth: 80 }), y += 8;
  if (settings.business_email) pdf.text(settings.business_email, margin, y), y += 4;
  if (settings.business_phone) pdf.text(settings.business_phone, margin, y), y += 4;

  gap(4);
  hrule();

  // ── KEPADA (klien) ──
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('TAGIHAN KEPADA:', margin, y); y += 4;
  pdf.setFont('helvetica', 'normal');
  pdf.text(invoice.client_snapshot.name, margin, y); y += 4;
  if (invoice.client_snapshot.company) pdf.text(invoice.client_snapshot.company, margin, y), y += 4;
  if (invoice.client_snapshot.address) pdf.text(invoice.client_snapshot.address, margin, y, { maxWidth: 100 }), y += 8;
  if (invoice.client_snapshot.email) pdf.text(invoice.client_snapshot.email, margin, y), y += 4;

  gap(4);
  hrule();

  // ── LINE ITEMS TABLE ──
  const colW = [10, 80, 20, 30, 30];
  const colX = [margin, margin + 10, margin + 90, margin + 110, margin + 140];

  pdf.setFillColor(30, 58, 95);
  pdf.rect(margin, y - 2, pageW - margin * 2, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  ['#', 'Deskripsi', 'Qty', 'Harga', 'Total'].forEach((h, i) =>
    pdf.text(h, colX[i], y + 4)
  );
  y += 8;
  pdf.setTextColor(44, 62, 80);

  invoice.line_items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      pdf.setFillColor(244, 246, 248);
      pdf.rect(margin, y - 2, pageW - margin * 2, 7, 'F');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(String(idx + 1), colX[0], y + 3);
    pdf.text(item.description, colX[1], y + 3, { maxWidth: 75 });
    pdf.text(`${item.quantity} ${item.unit}`.trim(), colX[2], y + 3);
    pdf.text(formatCurrency(item.unit_price, invoice.currency), colX[3], y + 3);
    pdf.text(formatCurrency(item.line_total, invoice.currency), colX[4], y + 3);
    y += 7;
  });

  gap(4);
  hrule();

  // ── SUMMARY ──
  const summaryX = pageW - margin - 60;
  const valueX = pageW - margin;

  const summaryRow = (label: string, value: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.text(label, summaryX, y);
    pdf.text(value, valueX, y, { align: 'right' });
    y += 5;
  };

  summaryRow('Subtotal', formatCurrency(invoice.subtotal, invoice.currency));
  if (invoice.discount_value > 0) {
    summaryRow('Diskon', `- ${formatCurrency(invoice.subtotal - (invoice.total_amount - invoice.tax_amount), invoice.currency)}`);
  }
  summaryRow(`PPN (${invoice.tax_rate}%)`, formatCurrency(invoice.tax_amount, invoice.currency));

  // Total box
  pdf.setFillColor(30, 58, 95);
  pdf.rect(summaryX - 5, y - 2, pageW - margin - summaryX + 5, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL', summaryX, y + 5);
  pdf.text(formatCurrency(invoice.total_amount, invoice.currency), valueX, y + 5, { align: 'right' });
  y += 14;

  pdf.setTextColor(44, 62, 80);

  // ── NOTES ──
  if (invoice.notes) {
    gap(4);
    hrule();
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Catatan & Informasi Pembayaran:', margin, y); y += 4;
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(invoice.notes, pageW - margin * 2);
    pdf.text(lines, margin, y);
  }

  const safeName = invoice.client_snapshot.name.replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`${invoice.invoice_number}_${safeName}.pdf`);
}
