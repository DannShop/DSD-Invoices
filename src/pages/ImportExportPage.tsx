import { useState, useRef } from 'react';
import { useClientStore } from '../store/clientStore';
import { useItemCatalogStore } from '../store/itemCatalogStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  importClientsFromFile, importItemsFromFile,
  exportToCSV, type ImportResult, type ImportedClient, type ImportedItem,
} from '../utils/importExport';
import type { Page } from '../App';
import { formatCurrency, formatDate } from '../utils/format';

interface ImportExportPageProps { navigate: (page: Page) => void; }

type ImportType = 'clients' | 'items';
type Tab = 'import' | 'export';

export default function ImportExportPage({ navigate }: ImportExportPageProps) {
  const { clients, addClient } = useClientStore();
  const { items, addItem } = useItemCatalogStore();
  const { invoices } = useInvoiceStore();
  const { settings } = useSettingsStore();

  const [tab, setTab]           = useState<Tab>('import');
  const [importType, setImportType] = useState<ImportType>('clients');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult]     = useState<ImportResult<any> | null>(null);
  const [preview, setPreview]   = useState<any[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setResult(null);
    setPreview([]);
    setConfirmed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setResult(null);
    setPreview([]);
    setConfirmed(false);

    try {
      let res: ImportResult<any>;
      if (importType === 'clients') {
        res = await importClientsFromFile(file);
      } else {
        res = await importItemsFromFile(file);
      }
      setResult(res);
      setPreview(res.data.slice(0, 5));
    } catch (err) {
      setResult({ success: false, data: [], errors: [String(err)], skipped: 0 });
    }
    setIsProcessing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleConfirmImport = () => {
    if (!result?.data) return;
    if (importType === 'clients') {
      result.data.forEach((c: ImportedClient) => addClient(c));
    } else {
      result.data.forEach((i: ImportedItem) => addItem(i));
    }
    setConfirmed(true);
  };

  // ── EXPORTS ──
  const exportInvoicesCSV = () => {
    const headers = ['No. Invoice','Klien','Perusahaan','Tgl Invoice','Due Date','Subtotal','Diskon','Pajak','Total','Status','Mata Uang'];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.client_snapshot.name,
      inv.client_snapshot.company,
      inv.invoice_date,
      inv.due_date,
      String(inv.subtotal),
      String(inv.discount_value),
      String(inv.tax_amount),
      String(inv.total_amount),
      inv.status,
      inv.currency,
    ]);
    exportToCSV(headers, rows, `DSD-Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportClientsCSV = () => {
    const headers = ['Nama','Email','Telepon','Alamat','Perusahaan','Catatan'];
    const rows = clients.map((c) => [c.name, c.email, c.phone, c.address, c.company, c.notes]);
    exportToCSV(headers, rows, `DSD-Invoices_Clients_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportItemsCSV = () => {
    const headers = ['Nama Item','Deskripsi','Harga Default','Satuan','Kategori'];
    const rows = items.map((i) => [i.name, i.description, String(i.default_price), i.unit, i.category]);
    exportToCSV(headers, rows, `DSD-Invoices_Items_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportTemplateSampleCSV = (type: ImportType) => {
    if (type === 'clients') {
      exportToCSV(
        ['name','email','phone','address','company','notes'],
        [['Budi Santoso','budi@email.com','0812-3456-7890','Jl. Merdeka No.1 Jakarta','PT Maju Bersama','Klien VIP']],
        'template_import_klien.csv'
      );
    } else {
      exportToCSV(
        ['name','description','price','unit','category'],
        [['Jasa Desain UI','Desain tampilan aplikasi mobile','500000','jam','Design'],
         ['Website Landing Page','Pembuatan halaman website statis','3500000','paket','Development']],
        'template_import_item.csv'
      );
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Import & Export</h2>
          <p className="text-gray-400 text-sm">Import CSV/Excel atau export data kamu</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(['import','export'] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); resetState(); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'import' ? '📥 Import' : '📤 Export'}
          </button>
        ))}
      </div>

      {/* ═══ IMPORT TAB ═══ */}
      {tab === 'import' && (
        <div className="space-y-5">
          {/* Type selector */}
          <div className="flex gap-3">
            {(['clients','items'] as ImportType[]).map((t) => (
              <button key={t} onClick={() => { setImportType(t); resetState(); }}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  importType === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {t === 'clients' ? '👥 Import Klien' : '📦 Import Item Katalog'}
              </button>
            ))}
          </div>

          {/* Download template */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-700">Template CSV</p>
              <p className="text-xs text-gray-400">Download contoh format yang benar</p>
            </div>
            <button onClick={() => exportTemplateSampleCSV(importType)}
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
              ⬇️ Download Template
            </button>
          </div>

          {/* Drop zone */}
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
              {isProcessing ? (
                <div className="space-y-2">
                  <p className="text-3xl animate-bounce">⏳</p>
                  <p className="text-gray-500 font-medium">Memproses file...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-4xl">{isDragging ? '📂' : '📁'}</p>
                  <p className="font-semibold text-gray-700">Drop file di sini atau klik untuk pilih</p>
                  <p className="text-sm text-gray-400">Mendukung .csv dan .xlsx</p>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {result && !confirmed && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`rounded-xl p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-semibold ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success
                    ? `✅ Berhasil membaca ${result.data.length} data${result.skipped > 0 ? `, ${result.skipped} baris dilewati` : ''}`
                    : '❌ Gagal memproses file'}
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {result.errors.slice(0, 5).map((e, i) => (
                      <li key={i} className="text-xs text-orange-600">⚠️ {e}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-xs text-orange-400">...dan {result.errors.length - 5} peringatan lainnya</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">
                    Preview (5 data pertama dari {result.data.length}):
                  </p>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {preview.map((row, i) => (
                      <div key={i} className={`px-4 py-3 text-sm ${i !== preview.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        {importType === 'clients' ? (
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                              {row.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{row.name}</p>
                              <p className="text-xs text-gray-400">{[row.email, row.company].filter(Boolean).join(' · ')}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{row.name}</p>
                              <p className="text-xs text-gray-400">{row.category || 'Tanpa kategori'}</p>
                            </div>
                            <p className="font-semibold text-blue-700">
                              Rp {Number(row.default_price).toLocaleString('id-ID')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {result.data.length > 0 && (
                <div className="flex gap-3">
                  <button onClick={resetState}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                    ✕ Batal
                  </button>
                  <button onClick={handleConfirmImport}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                    ✅ Import {result.data.length} {importType === 'clients' ? 'Klien' : 'Item'}
                  </button>
                </div>
              )}
              {result.data.length === 0 && (
                <button onClick={resetState}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                  Coba File Lain
                </button>
              )}
            </div>
          )}

          {/* Success confirmed */}
          {confirmed && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-bold text-green-700 text-lg">Import Berhasil!</p>
              <p className="text-green-600 text-sm mt-1">
                {result?.data.length} {importType === 'clients' ? 'klien' : 'item'} berhasil ditambahkan
              </p>
              <button onClick={resetState}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors">
                Import Lagi
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ EXPORT TAB ═══ */}
      {tab === 'export' && (
        <div className="space-y-3">
          {[
            {
              icon: '🧾', title: 'Export Semua Invoice',
              desc: `${invoices.length} invoice — nomor, klien, tanggal, total, status`,
              action: exportInvoicesCSV, disabled: invoices.length === 0,
            },
            {
              icon: '👥', title: 'Export Data Klien',
              desc: `${clients.length} klien — nama, email, telepon, alamat, perusahaan`,
              action: exportClientsCSV, disabled: clients.length === 0,
            },
            {
              icon: '📦', title: 'Export Katalog Item',
              desc: `${items.length} item — nama, deskripsi, harga, satuan, kategori`,
              action: exportItemsCSV, disabled: items.length === 0,
            },
          ].map((ex) => (
            <div key={ex.title}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{ex.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{ex.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ex.desc}</p>
                </div>
              </div>
              <button onClick={ex.action} disabled={ex.disabled}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0">
                {ex.disabled ? 'Kosong' : '⬇️ Download CSV'}
              </button>
            </div>
          ))}

          <p className="text-xs text-center text-gray-400 pt-2">
            File CSV bisa dibuka di Microsoft Excel, Google Sheets, atau Numbers (Mac)
          </p>
        </div>
      )}
    </div>
  );
}
