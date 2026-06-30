import { useState, useMemo } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { useClientStore } from '../store/clientStore';
import StatusBadge from '../components/ui/StatusBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';
import type { Invoice, InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

interface HistoryPageProps {
  navigate: (page: Page) => void;
  clientId?: string; // optional: filter by client langsung
}

const ALL_STATUSES: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

export default function HistoryPage({ navigate, clientId }: HistoryPageProps) {
  const { invoices, deleteInvoice, updateStatus } = useInvoiceStore();
  const { clients } = useClientStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState<string>(clientId ?? 'ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'number'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  };

  const filtered = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchSearch =
          inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
          inv.client_snapshot.name.toLowerCase().includes(search.toLowerCase()) ||
          inv.client_snapshot.company.toLowerCase().includes(search.toLowerCase());
        const matchStatus  = statusFilter === 'ALL' || inv.status === statusFilter;
        const matchClient  = clientFilter === 'ALL' || inv.client_id === clientFilter;
        const matchFrom    = !dateFrom || inv.invoice_date >= dateFrom;
        const matchTo      = !dateTo   || inv.invoice_date <= dateTo;
        return matchSearch && matchStatus && matchClient && matchFrom && matchTo;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'date')   diff = a.invoice_date.localeCompare(b.invoice_date);
        if (sortBy === 'total')  diff = a.total_amount - b.total_amount;
        if (sortBy === 'number') diff = a.invoice_number.localeCompare(b.invoice_number);
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [invoices, search, statusFilter, clientFilter, dateFrom, dateTo, sortBy, sortDir]);

  // Summary stats dari filtered
  const stats = useMemo(() => ({
    total:    filtered.length,
    paid:     filtered.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total_amount, 0),
    unpaid:   filtered.filter((i) => ['SENT', 'OVERDUE'].includes(i.status)).reduce((s, i) => s + i.total_amount, 0),
    overdue:  filtered.filter((i) => i.status === 'OVERDUE').length,
  }), [filtered]);

  const currency = invoices[0]?.currency ?? 'IDR';

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? (sortDir === 'asc' ? <span>↑</span> : <span>↓</span>) : <span className="opacity-20">↕</span>;

  const hasActiveFilters = statusFilter !== 'ALL' || clientFilter !== 'ALL' || dateFrom || dateTo;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Riwayat Invoice</h2>
            <p className="text-gray-400 text-sm">{invoices.length} invoice total</p>
          </div>
        </div>
        <button
          onClick={() => navigate({ name: 'create' })}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          ✏️ Buat Baru
        </button>
      </div>

      {/* Stats bar */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Ditampilkan',  value: String(stats.total),                     color: 'text-gray-700' },
            { label: 'Total Dibayar', value: formatCurrency(stats.paid, currency),    color: 'text-green-600' },
            { label: 'Belum Lunas',  value: formatCurrency(stats.unpaid, currency),   color: 'text-orange-500' },
            { label: 'Overdue',      value: String(stats.overdue),                    color: 'text-red-500' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`font-bold text-base mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter toggle */}
      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor invoice atau nama klien..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            hasActiveFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          🎛️ Filter
          {hasActiveFilters && (
            <span className="bg-white/30 text-white text-xs rounded-full px-1.5">
              {[statusFilter !== 'ALL', clientFilter !== 'ALL', !!dateFrom, !!dateTo].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-2 gap-4 shadow-sm">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', ...ALL_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s === 'ALL' ? 'Semua' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Klien</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dari Tanggal</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sampai Tanggal</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <div className="col-span-2 flex justify-end">
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setClientFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
              >
                ✕ Reset semua filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            emoji="📄"
            title="Belum ada invoice"
            subtitle="Buat invoice pertamamu sekarang!"
            action={{ label: '✏️ Buat Invoice', onClick: () => navigate({ name: 'create' }) }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            emoji="🔍"
            title="Tidak ada hasil"
            subtitle="Coba ubah filter atau kata pencarian"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('number')}
                >
                  No. Invoice <SortIcon col="number" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Klien</th>
                <th
                  className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('date')}
                >
                  Tgl Invoice <SortIcon col="date" />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th
                  className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
                  onClick={() => toggleSort('total')}
                >
                  Total <SortIcon col="total" />
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-blue-50/50 transition-colors group"
                >
                  <td
                    className="px-4 py-3 font-mono font-semibold text-blue-700 text-xs cursor-pointer"
                    onClick={() => navigate({ name: 'detail', invoiceId: inv.id })}
                  >
                    {inv.invoice_number}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => navigate({ name: 'detail', invoiceId: inv.id })}
                  >
                    <p className="font-medium text-gray-800">{inv.client_snapshot.name}</p>
                    {inv.client_snapshot.company && (
                      <p className="text-gray-400 text-xs">{inv.client_snapshot.company}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    {/* Quick status actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => updateStatus(inv.id, 'SENT')}
                          title="Tandai Terkirim"
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-semibold"
                        >
                          Kirim
                        </button>
                      )}
                      {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                        <button
                          onClick={() => updateStatus(inv.id, 'PAID')}
                          title="Tandai Lunas"
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-semibold"
                        >
                          Lunas
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(inv)}
                        className="text-gray-300 hover:text-red-400 transition-colors p-1"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer count */}
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Menampilkan {filtered.length} dari {invoices.length} invoice
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteInvoice(deleteTarget.id); }}
        title="Hapus Invoice"
        message={`Yakin hapus invoice ${deleteTarget?.invoice_number}? Tindakan ini tidak bisa dibatalkan.`}
      />
    </div>
  );
}
