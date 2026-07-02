import { useState } from 'react';
import { migrateLocalToSupabase, fetchAllFromSupabase, type SyncResult } from '../lib/syncService';
import { isSupabaseConfigured } from '../lib/supabase';
import { useClientStore } from '../store/clientStore';
import { useItemCatalogStore } from '../store/itemCatalogStore';
import { useInvoiceStore } from '../store/invoiceStore';
import { useSettingsStore } from '../store/settingsStore';
import { storageSet, STORAGE_KEYS } from '../utils/storage';
import type { Page } from '../App';

interface CloudSyncPageProps { navigate: (page: Page) => void; }

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export default function CloudSyncPage({ navigate }: CloudSyncPageProps) {
  const { settings } = useSettingsStore();
  const { clients }  = useClientStore();
  const { items }    = useItemCatalogStore();
  const { invoices } = useInvoiceStore();

  const configured = isSupabaseConfigured();

  const [pushStatus, setPushStatus] = useState<SyncStatus>('idle');
  const [pullStatus, setPullStatus] = useState<SyncStatus>('idle');
  const [pushResult, setPushResult] = useState<SyncResult | null>(null);
  const [pullResult, setPullResult] = useState<string>('');

  // ── Push: local → Supabase ──
  const handlePush = async () => {
    setPushStatus('syncing');
    setPushResult(null);
    const res = await migrateLocalToSupabase();
    setPushResult(res);
    setPushStatus(res.success ? 'success' : 'error');
  };

  // ── Pull: Supabase → local ──
  const handlePull = async () => {
    setPullStatus('syncing');
    setPullResult('');
    try {
      const data = await fetchAllFromSupabase();
      if (!data) {
        setPullResult('Supabase belum dikonfigurasi atau tidak ada data.');
        setPullStatus('error');
        return;
      }

      // Overwrite localStorage
      if (data.settings) storageSet(STORAGE_KEYS.SETTINGS, data.settings);
      storageSet(STORAGE_KEYS.CLIENTS,  data.clients);
      storageSet(STORAGE_KEYS.ITEMS,    data.items);
      storageSet(STORAGE_KEYS.INVOICES, data.invoices);

      setPullResult(
        `✅ Berhasil pull dari Supabase: ${data.clients.length} klien, ${data.items.length} item, ${data.invoices.length} invoice. Refresh halaman untuk melihat data terbaru.`
      );
      setPullStatus('success');
    } catch (err) {
      setPullResult(`❌ Error: ${String(err)}`);
      setPullStatus('error');
    }
  };

  const StatusIcon = ({ status }: { status: SyncStatus }) => {
    if (status === 'syncing') return <span className="animate-spin inline-block">⏳</span>;
    if (status === 'success') return <span>✅</span>;
    if (status === 'error')   return <span>❌</span>;
    return null;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate({ name: 'settings' })} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cloud Sync</h2>
          <p className="text-gray-400 text-sm">Sinkronisasi data ke Supabase</p>
        </div>
      </div>

      {/* Status configured */}
      <div className={`rounded-xl p-4 mb-6 flex items-center gap-3 ${configured ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <span className="text-2xl">{configured ? '🟢' : '🟡'}</span>
        <div>
          <p className={`font-semibold ${configured ? 'text-green-700' : 'text-amber-700'}`}>
            {configured ? 'Supabase sudah dikonfigurasi' : 'Supabase belum dikonfigurasi'}
          </p>
          <p className={`text-sm ${configured ? 'text-green-600' : 'text-amber-600'}`}>
            {configured
              ? 'Koneksi ke database cloud siap digunakan.'
              : 'Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env'}
          </p>
        </div>
      </div>

      {/* Setup guide kalau belum configured */}
      {!configured && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">📋 Setup Supabase (5 menit)</h3>
          <ol className="space-y-3">
            {[
              { step: '1', text: 'Buat akun gratis di supabase.com', sub: 'Free tier sudah lebih dari cukup untuk personal use' },
              { step: '2', text: 'Buat project baru', sub: 'Pilih region Asia Southeast (Singapore) biar cepat' },
              { step: '3', text: 'Jalankan SQL migration', sub: 'Buka SQL Editor di Supabase → paste isi file src/lib/migration.sql → Run' },
              { step: '4', text: 'Copy API credentials', sub: 'Project Settings → API → copy Project URL dan anon public key' },
              { step: '5', text: 'Buat file .env di root project', sub: 'Isi dengan VITE_SUPABASE_URL=... dan VITE_SUPABASE_ANON_KEY=...' },
              { step: '6', text: 'Restart dev server', sub: 'Ctrl+C lalu npm run dev lagi — halaman ini akan hijau!' },
            ].map((s) => (
              <li key={s.step} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* .env sample */}
          <div className="mt-4 bg-gray-900 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 mb-1"># .env (taruh di root project, sejajar package.json)</p>
            <p className="text-green-400 text-xs font-mono">VITE_SUPABASE_URL=https://xxxx.supabase.co</p>
            <p className="text-green-400 text-xs font-mono">VITE_SUPABASE_ANON_KEY=eyJhbG...</p>
          </div>
        </div>
      )}

      {/* Data summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Klien',   value: clients.length,  icon: '👥' },
          { label: 'Item',    value: items.length,    icon: '📦' },
          { label: 'Invoice', value: invoices.length, icon: '🧾' },
          { label: 'Settings', value: 1,              icon: '⚙️' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-xl">{s.icon}</p>
            <p className="font-bold text-gray-800 text-lg">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sync actions */}
      <div className="space-y-4">
        {/* Push */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                📤 Upload ke Cloud
                {pushStatus !== 'idle' && <StatusIcon status={pushStatus} />}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Kirim semua data lokal (klien, item, invoice, settings) ke Supabase. Data lama di cloud akan di-overwrite.
              </p>
            </div>
            <button onClick={handlePush} disabled={!configured || pushStatus === 'syncing'}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {pushStatus === 'syncing' ? 'Uploading...' : '📤 Push'}
            </button>
          </div>

          {pushResult && (
            <div className={`mt-4 rounded-lg p-3 text-sm ${pushResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              <p className="font-semibold">{pushResult.message}</p>
              {pushResult.counts && (
                <p className="text-xs mt-1">
                  Settings: {pushResult.counts.settings} · Klien: {pushResult.counts.clients} · Item: {pushResult.counts.items} · Invoice: {pushResult.counts.invoices}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Pull */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                📥 Download dari Cloud
                {pullStatus !== 'idle' && <StatusIcon status={pullStatus} />}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ambil data terbaru dari Supabase dan timpa data lokal. Berguna kalau ganti laptop atau reinstall.
              </p>
            </div>
            <button onClick={handlePull} disabled={!configured || pullStatus === 'syncing'}
              className="shrink-0 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              {pullStatus === 'syncing' ? 'Downloading...' : '📥 Pull'}
            </button>
          </div>

          {pullResult && (
            <div className={`mt-4 rounded-lg p-3 text-sm ${pullStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {pullResult}
            </div>
          )}
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex gap-3">
          <span className="text-lg">⚠️</span>
          <p className="text-xs text-amber-700">
            Sync manual — data tidak otomatis sinkron real-time. Jalankan Push setiap habis input data banyak, atau Pull kalau buka dari perangkat lain.
          </p>
        </div>
      </div>
    </div>
  );
}
