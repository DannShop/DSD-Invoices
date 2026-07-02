/**
 * QRIS Semi-Dinamis Utility
 * ─────────────────────────────────────────────────────────────
 * Approach sama persis kayak DannShop — simpel dan proven:
 * 1. Ambil string QRIS statis lo
 * 2. Hapus 4 char CRC di akhir
 * 3. Ganti "010211" (statis) → "010212" (dinamis)
 * 4. Split di "5802ID" (country code), inject nominal di tengah
 * 5. Recalculate CRC16 CCITT
 * 6. Generate QR code image via qrcode library
 */

import QRCode from 'qrcode';

// ── CRC16 CCITT — sama persis kayak convertCRC16 di DannShop ──
function convertCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  const hex = crc & 0xFFFF;
  return ('000' + hex.toString(16).toUpperCase()).slice(-4);
}

/**
 * Inject nominal ke string QRIS statis → return QRIS dinamis
 * Logika sama persis kayak generateQRIS() di DannShop
 */
export function injectNominalQRIS(qrisStatis: string, nominal: number): string {
  // PENTING: hanya trim spasi di AWAL/AKHIR string, JANGAN hapus semua
  // whitespace — karena field seperti "59" (Merchant Name) bisa berisi
  // spasi di dalamnya (contoh: "DANNSHOP DIGITAL PAYMENT"). Menghapus
  // semua whitespace akan mengubah panjang value field tsb dan merusak
  // parsing TLV setelahnya, sehingga QR jadi tidak valid saat discan.
  const qrisData = qrisStatis.trim();

  // Step 1: Hapus 4 char CRC di akhir
  const withoutCRC = qrisData.slice(0, -4);

  // Step 2: Ganti statis (010211) → dinamis (010212)
  const step1 = withoutCRC.replace('010211', '010212');

  // Step 3: Split di "5802ID" (Indonesia country code)
  const step2 = step1.split('5802ID');

  if (step2.length < 2) {
    throw new Error('Format QRIS tidak valid — tidak ditemukan country code "5802ID"');
  }

  // Step 4: Build field nominal (tag 54 + length + value)
  const paymentAmount = nominal.toString();
  const uang = '54' + ('0' + paymentAmount.length).slice(-2) + paymentAmount + '5802ID';

  // Step 5: Gabungkan kembali
  const rawResult = step2[0] + uang + step2[1];

  // Step 6: Hitung CRC baru dan append
  const result = rawResult + convertCRC16(rawResult);

  return result;
}

/**
 * Generate QR code data URL dari QRIS string
 */
export async function generateQRISCanvas(
  qrisString: string,
  size: number = 200
): Promise<string> {
  return QRCode.toDataURL(qrisString, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Main: QRIS statis + nominal → data URL image QR
 */
export async function generateInvoiceQRIS(
  qrisStatis: string,
  nominalIDR: number
): Promise<string> {
  const qrisDinamis = injectNominalQRIS(qrisStatis, nominalIDR);
  return generateQRISCanvas(qrisDinamis);
}

/**
 * Validasi basic string QRIS
 */
export function isValidQRIS(str: string): boolean {
  if (!str) return false;
  const cleaned = str.trim();
  return (
    cleaned.startsWith('000201') &&
    cleaned.length > 50 &&
    cleaned.includes('5802ID')   // harus ada country code Indonesia
  );
}
