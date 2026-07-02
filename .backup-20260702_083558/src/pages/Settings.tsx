import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { settingsSchema, clientSchema, type SettingsFormValues, type ClientFormValues } from '../schemas';
import { useSettingsStore } from '../store/settingsStore';
import { useClientStore } from '../store/clientStore';
import type { Page } from '../App';

interface SettingsProps {
  navigate: (page: Page) => void;
}

type Tab = 'bisnis' | 'klien';

export default function Settings({ navigate }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('bisnis');
  const [showClientForm, setShowClientForm] = useState(false);
  const [saved, setSaved] = useState(false);

  const { settings, updateSettings } = useSettingsStore();
  const { clients, addClient, deleteClient } = useClientStore();

  // ── Settings Form ──
  const settingsForm = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: settings.business_name,
      business_address: settings.business_address,
      business_email: settings.business_email,
      business_phone: settings.business_phone,
      logo_base64: settings.logo_base64,
      default_tax_rate: settings.default_tax_rate,
      default_currency: settings.default_currency,
      invoice_prefix: settings.invoice_prefix,
      payment_notes: settings.payment_notes,
    },
  });

  const onSaveSettings = (data: SettingsFormValues) => {
    updateSettings(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ── Logo Upload ──
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      settingsForm.setValue('logo_base64', b64);
    };
    reader.readAsDataURL(file);
  };

  // ── Client Form ──
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', address: '', company: '', notes: '' },
  });

  const onAddClient = (data: ClientFormValues) => {
    addClient(data);
    clientForm.reset();
    setShowClientForm(false);
  };

  const logo = settingsForm.watch('logo_base64');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">
          ←
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Pengaturan</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {(['bisnis', 'klien'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'bisnis' ? '🏢 Info Bisnis' : `👥 Klien (${clients.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB: INFO BISNIS ── */}
      {tab === 'bisnis' && (
        <form onSubmit={settingsForm.handleSubmit(onSaveSettings)} className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Profil Bisnis</h3>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {logo ? (
                  <img src={logo} alt="Logo preview" className="h-14 object-contain rounded border border-gray-200" />
                ) : (
                  <div className="h-14 w-14 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">
                    🖼️
                  </div>
                )}
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logo && (
                  <button
                    type="button"
                    onClick={() => settingsForm.setValue('logo_base64', null)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Bisnis <span className="text-red-500">*</span>
              </label>
              <input
                {...settingsForm.register('business_name')}
                placeholder="Nama bisnis / nama kamu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  {...settingsForm.register('business_email')}
                  type="email"
                  placeholder="email@bisnis.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input
                  {...settingsForm.register('business_phone')}
                  placeholder="08xx-xxxx-xxxx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
              <textarea
                {...settingsForm.register('business_address')}
                rows={2}
                placeholder="Alamat bisnis kamu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Default Invoice</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix Invoice</label>
                <input
                  {...settingsForm.register('invoice_prefix')}
                  placeholder="INV"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Contoh: INV → INV-2026-001</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pajak Default (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  {...settingsForm.register('default_tax_rate', { valueAsNumber: true })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Uang</label>
                <select
                  {...settingsForm.register('default_currency')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['IDR', 'USD', 'EUR', 'SGD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Catatan Pembayaran
              </label>
              <textarea
                {...settingsForm.register('payment_notes')}
                rows={3}
                placeholder="Info rekening bank, dll..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
            >
              💾 Simpan Pengaturan
            </button>
            {saved && (
              <span className="text-green-600 font-semibold text-sm animate-pulse">
                ✅ Tersimpan!
              </span>
            )}
          </div>
        </form>
      )}

      {/* ── TAB: KLIEN ── */}
      {tab === 'klien' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowClientForm((v) => !v)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              {showClientForm ? '✕ Batal' : '+ Tambah Klien'}
            </button>
          </div>

          {/* Add Client Form */}
          {showClientForm && (
            <form
              onSubmit={clientForm.handleSubmit(onAddClient)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4"
            >
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Klien Baru
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...clientForm.register('name')}
                    placeholder="Nama klien"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {clientForm.formState.errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {clientForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perusahaan</label>
                  <input
                    {...clientForm.register('company')}
                    placeholder="Nama perusahaan (opsional)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...clientForm.register('email')}
                    type="email"
                    placeholder="email@klien.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                  <input
                    {...clientForm.register('phone')}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                  <textarea
                    {...clientForm.register('address')}
                    rows={2}
                    placeholder="Alamat klien"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                ✅ Simpan Klien
              </button>
            </form>
          )}

          {/* Client list */}
          {clients.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <p className="text-3xl mb-2">👤</p>
              <p className="text-gray-500">Belum ada klien. Tambah klien dulu!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {clients.map((client, idx) => (
                <div
                  key={client.id}
                  className={`flex items-center justify-between px-5 py-4 ${
                    idx !== clients.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-800">{client.name}</p>
                    {client.company && (
                      <p className="text-gray-500 text-xs">{client.company}</p>
                    )}
                    {client.email && (
                      <p className="text-gray-400 text-xs">{client.email}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus klien "${client.name}"?`)) deleteClient(client.id);
                    }}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
