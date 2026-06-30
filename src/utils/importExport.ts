/**
 * Import utility untuk CSV dan Excel (.xlsx)
 * 
 * Format kolom yang diharapkan (fleksibel, case-insensitive):
 * 
 * IMPORT KLIEN:
 *   name/nama | email | phone/telepon | address/alamat | company/perusahaan | notes/catatan
 * 
 * IMPORT ITEM KATALOG:
 *   name/nama | description/deskripsi | price/harga | unit/satuan | category/kategori
 *
 * IMPORT INVOICE (basic):
 *   client_name | invoice_date | due_date | item_description | qty | unit_price | tax_rate | notes
 */

export interface ImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  skipped: number;
}

// ─── FIELD ALIASES ──────────────────────────────────────────────────────────

const CLIENT_ALIASES: Record<string, string> = {
  nama: 'name', name: 'name',
  email: 'email',
  phone: 'phone', telepon: 'phone', 'no. hp': 'phone', hp: 'phone',
  address: 'address', alamat: 'address',
  company: 'company', perusahaan: 'company',
  notes: 'notes', catatan: 'notes',
};

const ITEM_ALIASES: Record<string, string> = {
  nama: 'name', name: 'name',
  description: 'description', deskripsi: 'description', desc: 'description',
  price: 'default_price', harga: 'default_price', 'harga default': 'default_price',
  unit: 'unit', satuan: 'unit',
  category: 'category', kategori: 'category',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, ' ');
}

function mapRow(row: Record<string, string>, aliases: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    const norm = normalizeHeader(key);
    const canonical = aliases[norm];
    if (canonical) mapped[canonical] = val?.trim() ?? '';
  }
  return mapped;
}

// ─── CSV PARSER ──────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      // Handle quoted commas
      const vals: string[] = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      vals.push(cur.trim());

      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });
}

// ─── EXCEL PARSER (via ArrayBuffer, no heavy deps) ────────────────────────

async function parseXLSX(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  // Dynamic import SheetJS — hanya load kalau dipakai
  // Pastikan sudah: npm install xlsx
  try {
    const XLSX = await import('xlsx');
    const wb   = XLSX.read(buffer, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
    return data.map((row) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)]))
    );
  } catch {
    throw new Error('Gagal membaca file Excel. Pastikan format .xlsx dan coba lagi.');
  }
}

// ─── READ FILE ───────────────────────────────────────────────────────────────

async function readFileRows(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const text = await file.text();
    return parseCSV(text);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    return parseXLSX(buffer);
  }

  throw new Error('Format file tidak didukung. Gunakan .csv atau .xlsx');
}

// ─── IMPORT KLIEN ────────────────────────────────────────────────────────────

export interface ImportedClient {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: string;
}

export async function importClientsFromFile(file: File): Promise<ImportResult<ImportedClient>> {
  const errors: string[] = [];
  const data: ImportedClient[] = [];
  let skipped = 0;

  try {
    const rows = await readFileRows(file);

    rows.forEach((row, i) => {
      const mapped = mapRow(row, CLIENT_ALIASES);
      const lineNum = i + 2; // header = row 1

      if (!mapped.name) {
        errors.push(`Baris ${lineNum}: kolom "name/nama" kosong — dilewati`);
        skipped++;
        return;
      }

      data.push({
        name:    mapped.name    || '',
        email:   mapped.email   || '',
        phone:   mapped.phone   || '',
        address: mapped.address || '',
        company: mapped.company || '',
        notes:   mapped.notes   || '',
      });
    });

    return { success: true, data, errors, skipped };
  } catch (err) {
    return { success: false, data: [], errors: [String(err)], skipped: 0 };
  }
}

// ─── IMPORT ITEM KATALOG ─────────────────────────────────────────────────────

export interface ImportedItem {
  name: string;
  description: string;
  default_price: number;
  unit: string;
  category: string;
}

export async function importItemsFromFile(file: File): Promise<ImportResult<ImportedItem>> {
  const errors: string[] = [];
  const data: ImportedItem[] = [];
  let skipped = 0;

  try {
    const rows = await readFileRows(file);

    rows.forEach((row, i) => {
      const mapped  = mapRow(row, ITEM_ALIASES);
      const lineNum = i + 2;

      if (!mapped.name) {
        errors.push(`Baris ${lineNum}: kolom "name/nama" kosong — dilewati`);
        skipped++;
        return;
      }

      const price = parseFloat(mapped.default_price?.replace(/[^0-9.]/g, '') || '0');
      if (isNaN(price)) {
        errors.push(`Baris ${lineNum}: harga "${mapped.default_price}" bukan angka — diset ke 0`);
      }

      data.push({
        name:          mapped.name        || '',
        description:   mapped.description || '',
        default_price: isNaN(price) ? 0 : price,
        unit:          mapped.unit        || '',
        category:      mapped.category    || '',
      });
    });

    return { success: true, data, errors, skipped };
  } catch (err) {
    return { success: false, data: [], errors: [String(err)], skipped: 0 };
  }
}

// ─── EXPORT ke CSV ───────────────────────────────────────────────────────────

export function exportToCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
