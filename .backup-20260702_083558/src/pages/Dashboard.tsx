import { useState, useMemo } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { useClientStore } from '../store/clientStore';
import { useRecurringStore } from '../store/recurringStore';
import { useSettingsStore } from '../store/settingsStore';
import StatusBadge from '../components/ui/StatusBadge';
import type { Page } from '../App';
import type { InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { isDueToday, FREQUENCY_LABEL } from '../utils/recurringUtils';

interface DashboardProps { navigate: (page: Page) => void; }

export default function Dashboard({ navigate }: DashboardProps) {
  const { invoices, updateStatus } = useInvoiceStore();
  const { clients }   = useClientStore();
  const { templates } = useRecurringStore();
  const { settings }  = useSettingsStore();

  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'ALL'>('ALL');

  const currency = settings.default_currency;

  // ── Stats ──
  const stats = useMemo(() => {
    const paid     = invoices.filter((i) => i.status === 'PAID');
    const unpaid   = invoices.filter((i) => ['SENT','OVERDUE'].includes(i.status));
    const overdue  = invoices.filter((i) => i.status === 'OVERDUE');
    const thisMonth = invoices.filter((i) => {
      const d = new Date(i.invoice_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      totalInvoices:   invoices.length,
      totalClients:    clients.length,
      totalPaid:       paid.reduce((s, i) => s + i.total_amount, 0),
      totalUnpaid:     unpaid.reduce((s, i) => s + i.total_amount, 0),
      overdueCount:    overdue.length,
      thisMonthCount:  thisMonth.length,
      thisMonthTotal:  thisMonth.reduce((s, i) => s + i.total_amount, 0),
    };
  }, [invoices, clients]);

  const dueRecurring = templates.filter((t) => t.is_active && isDueToday(t.next_due_date));

  const filtered = useMemo(() =>
    filterStatus === 'ALL'
      ? invoices.slice(0, 10)
      : invoices.filter((i) => i.status === filterStatus).slice(0, 10),
    [invoices, filterStatus]
  );

  const isFirstTime = invoices.length === 0 && clients.length === 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Welcome / First-time ── */}
      {isFirstTime && (
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2D6A9F] rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-1">Selamat datang di WildanInvoice! 👋</h2>
          <p className="text-blue-200 text-sm mb-5">Mulai dengan langkah-langkah berikut:</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { step: '1', icon: '⚙️', title: 'Setup Profil', desc: 'Isi nama bisnis, logo, rekening', page: { name: 'settings' } as Page },
              { step: '2', icon: '👥', title: 'Tambah Klien', desc: 'Daftarkan klien pertamamu', page: { name: 'clients' } as Page },
              { step: '3', icon: '✏️', title: 'Buat Invoice', desc: 'Generate invoice pertama!', page: { name: 'create' } as Page },
            ].map((s) => (
              <button key={s.step} onClick={() => navigate(s.page)}
                className="bg-white/10 hover:bg-white/20 rounded-xl p-4 text-left transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-400/40 text-blue-200 text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-blue-300 text-xs mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      {!isFirstTime && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {settings.business_name ? `${settings.business_name}` : 'Dashboard'}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {stats.thisMonthCount} invoice bulan ini · {stats.totalClients} klien
            </p>
          </div>
          <button onClick={() => navigate({ name: 'create' })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
            ✏️ Buat Invoice
          </button>
        </div>
      )}

      {/* ── Stats Cards ── */}
      {!isFirstTime && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Dibayar', value: formatCurrency(stats.totalPaid, currency),
              icon: '✅', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100',
            },
            {
              label: 'Belum Lunas', value: formatCurrency(stats.totalUnpaid, currency),
              icon: '⏳', color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100',
            },
            {
              label: 'Overdue', value: String(stats.overdueCount),
              icon: '🚨', color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100',
            },
            {
              label: 'Bulan Ini', value: String(stats.thisMonthCount) + ' invoice',
              icon: '📅', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
            },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <span className="text-lg">{s.icon}</span>
              </div>
              <p className={`font-bold text-lg ${s.color} leading-tight`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Recurring Due Alert ── */}
      {dueRecurring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                {dueRecurring.length} recurring invoice siap di-generate!
              </p>
              <p className="text-amber-600 text-xs">
                {dueRecurring.map((t) => t.name).join(', ')}
              </p>
            </div>
          </div>
          <button onClick={() => navigate({ name: 'recurring' })}
            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
            ⚡ Generate
          </button>
        </div>
      )}

      {/* ── Overdue alerts ── */}
      {invoices.filter((i) => i.status === 'OVERDUE').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-5">
          <p className="font-semibold text-red-700 text-sm mb-2">
            🚨 {invoices.filter((i) => i.status === 'OVERDUE').length} Invoice Overdue
          </p>
          <div className="space-y-1.5">
            {invoices.filter((i) => i.status === 'OVERDUE').slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-red-600 font-semibold">{inv.invoice_number}</span>
                  <span className="text-xs text-red-500">{inv.client_snapshot.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-semibold">
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </span>
                  <button onClick={() => updateStatus(inv.id, 'PAID')}
                    className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition-colors">
                    Lunas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invoice Table ── */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm">Invoice Terbaru</h3>
            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              <div className="flex gap-1">
                {(['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      filterStatus === s ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}>
                    {s === 'ALL' ? 'Semua' : s}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate({ name: 'history' })}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold ml-2 transition-colors">
                Lihat semua →
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-gray-300 text-3xl mb-2">📄</p>
              <p className="text-gray-400 text-sm">Tidak ada invoice dengan status ini</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">No. Invoice</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Klien</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tanggal</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => (
                  <tr key={inv.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    onClick={() => navigate({ name: 'detail', invoiceId: inv.id })}>
                    <td className="px-5 py-3 font-mono font-semibold text-blue-700 text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 text-sm">{inv.client_snapshot.name}</p>
                      {inv.client_snapshot.company && (
                        <p className="text-gray-400 text-xs">{inv.client_snapshot.company}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(inv.total_amount, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 justify-end">
                        {inv.status === 'DRAFT' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'SENT'); }}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold">
                            Kirim
                          </button>
                        )}
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'PAID'); }}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold">
                            Lunas ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Quick actions (non-empty state) ── */}
      {!isFirstTime && (
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '👥', label: `${clients.length} Klien`, sub: 'Kelola data klien', page: { name: 'clients' } as Page },
            { icon: '🔄', label: `${templates.length} Recurring`, sub: 'Template invoice berkala', page: { name: 'recurring' } as Page },
            { icon: '📁', label: 'Import / Export', sub: 'CSV & Excel', page: { name: 'import-export' } as Page },
          ].map((q) => (
            <button key={q.label} onClick={() => navigate(q.page)}
              className="bg-white border border-gray-100 rounded-xl p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all">
              <span className="text-2xl">{q.icon}</span>
              <p className="font-semibold text-gray-700 text-sm mt-2">{q.label}</p>
              <p className="text-gray-400 text-xs">{q.sub}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
