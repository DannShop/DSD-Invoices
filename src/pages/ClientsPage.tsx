import { useState } from 'react';
import { useClientStore } from '../store/clientStore';
import { useInvoiceStore } from '../store/invoiceStore';
import ClientFormModal from '../components/ui/ClientFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';
import type { Client } from '../types';
import type { ClientFormValues } from '../schemas';

interface ClientsPageProps {
  navigate: (page: Page) => void;
}

export default function ClientsPage({ navigate }: ClientsPageProps) {
  const { clients, addClient, updateClient, deleteClient } = useClientStore();
  const { invoices } = useInvoiceStore();

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = clients.filter((c) =>
    [c.name, c.company, c.email].some((f) =>
      f.toLowerCase().includes(search.toLowerCase())
    )
  );

  const invoiceCountFor = (clientId: string) =>
    invoices.filter((inv) => inv.client_id === clientId).length;

  const totalBilledFor = (clientId: string) =>
    invoices
      .filter((inv) => inv.client_id === clientId && inv.status === 'PAID')
      .reduce((s, inv) => s + inv.total_amount, 0);

  const handleAdd = (data: ClientFormValues) => addClient(data);
  const handleEdit = (data: ClientFormValues) => {
    if (editTarget) updateClient(editTarget.id, data);
    setEditTarget(null);
  };
  const handleDelete = () => {
    if (deleteTarget) deleteClient(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manajemen Klien</h2>
            <p className="text-gray-400 text-sm">{clients.length} klien terdaftar</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          + Tambah Klien
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, perusahaan, atau email..."
          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            emoji="👤"
            title={search ? 'Klien tidak ditemukan' : 'Belum ada klien'}
            subtitle={search ? `Tidak ada hasil untuk "${search}"` : 'Tambah klien pertama kamu!'}
            action={!search ? { label: '+ Tambah Klien', onClick: () => setShowForm(true) } : undefined}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => {
            const invoiceCount = invoiceCountFor(client.id);
            const totalBilled = totalBilledFor(client.id);
            const isExpanded = expandedId === client.id;

            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                {/* Main row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{client.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      {client.company && <span>🏢 {client.company}</span>}
                      {client.email && <span>✉️ {client.email}</span>}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-xs text-gray-400">{invoiceCount} invoice</p>
                    {totalBilled > 0 && (
                      <p className="text-xs text-green-600 font-semibold">
                        Rp {totalBilled.toLocaleString('id-ID')} dibayar
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditTarget(client); }}
                      className="p-2 text-gray-300 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      title="Edit klien"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteTarget(client)}
                      className="p-2 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors text-sm"
                      title="Hapus klien"
                    >
                      🗑️
                    </button>
                    <span className="text-gray-200 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50 px-5 py-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Telepon</p>
                      <p className="text-gray-700">{client.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-gray-700">{client.email || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Alamat</p>
                      <p className="text-gray-700 whitespace-pre-line">{client.address || '—'}</p>
                    </div>
                    {client.notes && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Catatan</p>
                        <p className="text-gray-600 italic">{client.notes}</p>
                      </div>
                    )}
                    {/* Invoice history for this client */}
                    <div className="col-span-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => navigate({ name: 'history', clientId: client.id })}
                        className="text-blue-600 hover:text-blue-800 text-xs font-semibold transition-colors"
                      >
                        Lihat {invoiceCount} invoice klien ini →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ClientFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
      />
      <ClientFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        initialData={editTarget}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Klien"
        message={`Yakin hapus klien "${deleteTarget?.name}"? Data klien akan dihapus permanen, tapi invoice yang sudah dibuat tetap ada.`}
      />
    </div>
  );
}
