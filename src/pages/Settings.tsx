import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, clientSchema, type SettingsFormValues, type ClientFormValues } from '../schemas';
import { useSettingsStore } from '../store/settingsStore';
import { useClientStore } from '../store/clientStore';
import { isValidQRIS } from '../utils/qrisGenerator';
import QRISDisplay from '../components/ui/QRISDisplay';
import ClientFormModal from '../components/ui/ClientFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';

interface SettingsProps { navigate: (page: Page) => void; }
type Tab = 'bisnis' | 'qris' | 'klien';

export default function Settings({ navigate }: SettingsProps) {
  const [tab, setTab]       = useState<Tab>('bisnis');
  const [saved, setSaved]   = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<string | null>(null);

  const { settings, updateSettings } = useSettingsStore();
  const { clients, addClient, updateClient, deleteClient } = useClientStore();

  // ── Settings Form ──
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name:    settings.business_name,
      business_address: settings.business_address,
      business_email:   settings.business_email,
      business_phone:   settings.business_phone,
      logo_base64:      settings.logo_base64,
      default_tax_rate: settings.default_tax_rate,
      default_currency: settings.default_currency,
      invoice_prefix:   settings.invoice_prefix,
      payment_notes:    settings.payment_notes,
      qris_string:      settings.qris_string,
    },
  });

  const watchedQRIS = settingsForm.watch('qris_string');

  const onSaveSettings = (data: SettingsFormValues) => {
    updateSettings(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => settingsForm.setValue('logo_base64', ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const logo = settingsForm.watch('logo_base64');

  // ── Input style ──
  const inp = 'w-full border border-gray-200/80 rounded-apple px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-apple-blue/20 focus:border-apple-blue bg-white/80 placeholder:text-gray-300 transition-all';

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'bisnis', label: 'Info Bisnis', icon: 'fa-building' },
    { key: 'qris',   label: 'QRIS',        icon: 'fa-qrcode'  },
    { key: 'klien',  label: `Klien (${clients.length})`, icon: 'fa-users' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate({ name: 'dashboard' })}
          className="w-8 h-8 rounded-full bg-white/80 border border-gray-200/80 flex items-center justify-center hover:bg-gray-50 transition-all press-effect shadow-sm">
          <i className="fa-solid fa-arrow-left text-gray-500 text-xs" />
        </button>
        <div>
          <h2 className="text-[22px] font-bold text-gray-800 tracking-tight">Pengaturan</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100/80 p-1 rounded-apple-lg mb-6 w-fit">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-apple text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            <i className={`fa-solid ${t.icon} text-xs`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INFO BISNIS ── */}
      {tab === 'bisnis' && (
        <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-4">
          {/* Profil */}
          <div className="glass rounded-apple-lg border border-white/60 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-id-card" /> Profil Bisnis
            </h3>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-5">
              {logo
                ? <img src={logo} alt="Logo" className="h-14 object-contain rounded-apple border border-gray-200/80 shadow-sm" />
                : <div className="h-14 w-14 rounded-apple border-2 border-dashed border-gray-200 bg-gray-50/80 flex items-center justify-center">
                    <i className="fa-solid fa-image text-gray-300 text-xl" />
                  </div>
              }
              <div className="flex gap-2">
                <label className="cursor-pointer btn bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 px-4 py-2 rounded-apple text-sm font-semibold transition-all press-effect">
                  <i className="fa-solid fa-upload mr-1.5" /> Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logo && (
                  <button type="button" onClick={() => settingsForm.setValue('logo_base64', null)}
                    className="px-3 py-2 rounded-apple text-apple-red text-sm font-semibold bg-apple-red/5 hover:bg-apple-red/10 transition-all press-effect">
                    <i className="fa-solid fa-trash" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Bisnis <span className="text-apple-red">*</span></label>
                <input {...settingsForm.register('business_name')} placeholder="Nama bisnis / nama kamu" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                  <input type="email" {...settingsForm.register('business_email')} placeholder="email@bisnis.com" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Telepon</label>
                  <input {...settingsForm.register('business_phone')} placeholder="08xx-xxxx-xxxx" className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alamat</label>
                <textarea {...settingsForm.register('business_address')} rows={2} placeholder="Alamat bisnis kamu" className={`${inp} resize-none`} />
              </div>
            </div>
          </div>

          {/* Default Invoice */}
          <div className="glass rounded-apple-lg border border-white/60 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <i className="fa-solid fa-sliders" /> Default Invoice
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prefix Invoice</label>
                <input {...settingsForm.register('invoice_prefix')} placeholder="INV" className={inp} />
                <p className="text-[10px] text-gray-400 mt-1">Contoh: INV → INV-2026-001</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pajak Default (%)</label>
                <input type="number" min="0" max="100" {...settingsForm.register('default_tax_rate', { valueAsNumber: true })} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mata Uang</label>
                <select {...settingsForm.register('default_currency')} className={inp}>
                  {['IDR','USD','EUR','SGD'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Template Catatan Pembayaran</label>
              <textarea {...settingsForm.register('payment_notes')} rows={3} placeholder="Info rekening bank, dll..." className={`${inp} resize-none`} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit"
              className="bg-apple-blue hover:bg-apple-blue/90 text-white px-6 py-2.5 rounded-apple font-semibold text-sm transition-all press-effect shadow-lg shadow-apple-blue/25 flex items-center gap-2">
              <i className="fa-solid fa-floppy-disk" /> Simpan Pengaturan
            </button>
            {saved && (
              <span className="text-apple-green font-semibold text-sm flex items-center gap-1.5 fade-in-up">
                <i className="fa-solid fa-circle-check" /> Tersimpan!
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── TAB: QRIS ── */}
      {tab === 'qris' && (
        <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-4">
          <div className="glass rounded-apple-lg border border-white/60 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <i className="fa-solid fa-qrcode" /> Setup QRIS Semi-Dinamis
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Paste string QRIS statis lo di bawah. Sistem akan otomatis inject nominal invoice ke QR code.
            </p>

            {/* How to get QRIS string */}
            <div className="bg-apple-blue/5 border border-apple-blue/15 rounded-apple p-4 mb-5">
              <p className="text-xs font-bold text-apple-blue mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-circle-question" /> Cara dapat string QRIS statis:
              </p>
              <div className="space-y-1.5 text-xs text-gray-600">
                {[
                  { app: 'GoPay', path: 'Profil → Terima Uang → QRIS → Salin Kode' },
                  { app: 'OVO',   path: 'Profil → QR Code → Salin Kode' },
                  { app: 'DANA',  path: 'Profil → QRIS Merchant → Salin Kode' },
                  { app: 'BCA',   path: 'myBCA → QRIS → Tampilkan Kode → Salin' },
                  { app: 'Shopee Pay', path: 'Profil → Terima Uang → Salin Kode QRIS' },
                ].map((item) => (
                  <div key={item.app} className="flex gap-2">
                    <span className="text-apple-blue font-semibold w-20 shrink-0">{item.app}</span>
                    <span className="text-gray-500">{item.path}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QRIS Input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                String QRIS Statis
                {watchedQRIS && isValidQRIS(watchedQRIS) && (
                  <span className="ml-2 text-apple-green font-semibold">
                    <i className="fa-solid fa-circle-check mr-1" />Valid!
                  </span>
                )}
                {watchedQRIS && !isValidQRIS(watchedQRIS) && (
                  <span className="ml-2 text-apple-red font-semibold">
                    <i className="fa-solid fa-circle-xmark mr-1" />Tidak valid
                  </span>
                )}
              </label>
              <textarea
                {...settingsForm.register('qris_string')}
                rows={4}
                placeholder="Paste string QRIS di sini... (format: 000201010211...)"
                className={`${inp} resize-none font-mono text-xs`}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                String QRIS valid dimulai dengan <code className="bg-gray-100 px-1 rounded">000201</code>
              </p>
            </div>

            {/* Preview QR */}
            {watchedQRIS && isValidQRIS(watchedQRIS) && (
              <div className="border border-gray-100 rounded-apple p-4 bg-gray-50/60">
                <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                  <i className="fa-solid fa-eye" /> Preview QRIS (nominal contoh Rp 100.000)
                </p>
                <QRISDisplay
                  qrisStatis={watchedQRIS}
                  nominal={100000}
                  currency="IDR"
                  size={160}
                  showLabel={true}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button type="submit"
              className="bg-apple-blue hover:bg-apple-blue/90 text-white px-6 py-2.5 rounded-apple font-semibold text-sm transition-all press-effect shadow-lg shadow-apple-blue/25 flex items-center gap-2">
              <i className="fa-solid fa-floppy-disk" /> Simpan QRIS
            </button>
            {saved && (
              <span className="text-apple-green font-semibold text-sm flex items-center gap-1.5 fade-in-up">
                <i className="fa-solid fa-circle-check" /> Tersimpan!
              </span>
            )}
            {watchedQRIS && (
              <button type="button"
                onClick={() => { settingsForm.setValue('qris_string', null); }}
                className="text-apple-red text-sm font-semibold hover:underline">
                <i className="fa-solid fa-trash mr-1" /> Hapus QRIS
              </button>
            )}
          </div>
        </form>
      )}

      {/* ── TAB: KLIEN ── */}
      {tab === 'klien' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowClientForm(true)}
              className="bg-apple-blue hover:bg-apple-blue/90 text-white px-4 py-2 rounded-apple text-sm font-semibold transition-all press-effect shadow-lg shadow-apple-blue/25 flex items-center gap-2">
              <i className="fa-solid fa-plus" /> Tambah Klien
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="glass rounded-apple-lg border border-white/60">
              <EmptyState icon="fa-users" title="Belum ada klien" subtitle="Tambah klien pertama kamu!"
                action={{ label: '+ Tambah Klien', onClick: () => setShowClientForm(true) }} />
            </div>
          ) : (
            <div className="glass rounded-apple-lg border border-white/60 overflow-hidden">
              {clients.map((client, idx) => (
                <div key={client.id}
                  className={`flex items-center gap-3 px-5 py-4 ${idx !== clients.length - 1 ? 'border-b border-gray-50/80' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-apple-blue/10 flex items-center justify-center text-apple-blue font-bold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{client.name}</p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                      {client.company && <span><i className="fa-solid fa-building mr-1" />{client.company}</span>}
                      {client.email   && <span><i className="fa-solid fa-envelope mr-1" />{client.email}</span>}
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget(client.id)}
                    className="p-2 text-gray-300 hover:text-apple-red rounded-apple hover:bg-apple-red/5 transition-all">
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ClientFormModal
        isOpen={showClientForm}
        onClose={() => setShowClientForm(false)}
        onSubmit={(data) => addClient(data)}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteClient(deleteTarget); }}
        title="Hapus Klien"
        message="Yakin hapus klien ini? Invoice yang sudah dibuat tidak terpengaruh."
      />
    </div>
  );
}
