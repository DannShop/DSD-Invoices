import { useState, useMemo } from 'react';
import { useInvoiceStore } from '../store/invoiceStore';
import { useClientStore } from '../store/clientStore';
import { useRecurringStore } from '../store/recurringStore';
import { useSettingsStore } from '../store/settingsStore';
import StatusBadge from '../components/ui/StatusBadge';
import type { Page } from '../App';
import type { InvoiceStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { isDueToday } from '../utils/recurringUtils';

interface DashboardProps { navigate: (page: Page) => void; }

export default function Dashboard({ navigate }: DashboardProps) {
  const { invoices, updateStatus } = useInvoiceStore();
  const { clients }   = useClientStore();
  const { templates } = useRecurringStore();
  const { settings }  = useSettingsStore();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'ALL'>('ALL');

  const currency = settings.default_currency;

  const stats = useMemo(() => {
    const paid    = invoices.filter((i) => i.status === 'PAID');
    const unpaid  = invoices.filter((i) => ['SENT','OVERDUE'].includes(i.status));
    const overdue = invoices.filter((i) => i.status === 'OVERDUE');
    const now     = new Date();
    const thisMonth = invoices.filter((i) => {
      const d = new Date(i.invoice_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      totalPaid:      paid.reduce((s, i) => s + i.total_amount, 0),
      totalUnpaid:    unpaid.reduce((s, i) => s + i.total_amount, 0),
      overdueCount:   overdue.length,
      thisMonthCount: thisMonth.length,
    };
  }, [invoices]);

  const dueRecurring = templates.filter((t) => t.is_active && isDueToday(t.next_due_date));
  const filtered = useMemo(() =>
    filterStatus === 'ALL' ? invoices.slice(0, 8) : invoices.filter((i) => i.status === filterStatus).slice(0, 8),
    [invoices, filterStatus]
  );
  const isFirstTime = invoices.length === 0 && clients.length === 0;

  return (
    <div className="p-6 max-w-5xl mx-auto fade-in-up">
      {/* ── Welcome ── */}
      {isFirstTime && (
        <div className="bg-gradient-to-br from-[#1C2B3A] to-[#0A84FF]/80 rounded-apple-xl p-7 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.4)_0%,_transparent_60%)]" />
          <h2 className="text-white text-2xl font-bold mb-1 relative">Selamat datang! 👋</h2>
          <p className="text-white/60 text-sm mb-6 relative">Mulai dengan 3 langkah berikut:</p>
          <div className="grid grid-cols-3 gap-3 relative">
            {[
              { step: '1', icon: 'fa-gear', title: 'Setup Profil', desc: 'Nama bisnis & logo', page: { name: 'settings' } as Page },
              { step: '2', icon: 'fa-users', title: 'Tambah Klien', desc: 'Daftarkan klien pertama', page: { name: 'clients' } as Page },
              { step: '3', icon: 'fa-file-invoice', title: 'Buat Invoice', desc: 'Generate invoice pertama!', page: { name: 'create' } as Page },
            ].map((s) => (
              <button key={s.step} onClick={() => navigate(s.page)}
                className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-apple-lg p-4 text-left transition-all press-effect hover-lift">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-white/20 text-white/70 text-[10px] font-bold flex items-center justify-center">{s.step}</span>
                  <i className={`fa-solid ${s.icon} text-white/60 text-sm`} />
                </div>
                <p className="font-semibold text-white text-sm">{s.title}</p>
                <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      {!isFirstTime && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[22px] font-bold text-gray-800 tracking-tight">
              {settings.business_name || 'Dashboard'}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {stats.thisMonthCount} invoice bulan ini · {clients.length} klien
            </p>
          </div>
          <button onClick={() => navigate({ name: 'create' })}
            className="bg-apple-blue hover:bg-apple-blue/90 text-white px-5 py-2.5 rounded-apple text-sm font-semibold flex items-center gap-2 transition-all press-effect shadow-lg shadow-apple-blue/25">
            <i className="fa-solid fa-plus" />
            Buat Invoice
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      {!isFirstTime && (
        <div className="grid grid-cols-4 gap-3 mb-5 fade-in-up fade-in-up-delay-1">
          {[
            { label: 'Total Dibayar', value: formatCurrency(stats.totalPaid, currency), icon: 'fa-circle-check', color: 'text-apple-green', bg: 'from-apple-green/10 to-apple-green/5', border: 'border-apple-green/15' },
            { label: 'Belum Lunas',   value: formatCurrency(stats.totalUnpaid, currency), icon: 'fa-clock', color: 'text-amber-500', bg: 'from-amber-50 to-amber-50/50', border: 'border-amber-200/60' },
            { label: 'Overdue',       value: String(stats.overdueCount), icon: 'fa-triangle-exclamation', color: 'text-apple-red', bg: 'from-apple-red/10 to-apple-red/5', border: 'border-apple-red/15' },
            { label: 'Bulan Ini',     value: `${stats.thisMonthCount} invoice`, icon: 'fa-calendar-days', color: 'text-apple-blue', bg: 'from-apple-blue/10 to-apple-blue/5', border: 'border-apple-blue/15' },
          ].map((s, i) => (
            <div key={s.label} className={`glass rounded-apple-lg p-4 bg-gradient-to-br ${s.bg} border ${s.border} hover-lift`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                <i className={`fa-solid ${s.icon} text-sm ${s.color}`} />
              </div>
              <p className={`font-bold text-[17px] leading-tight ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Recurring alert ── */}
      {dueRecurring.length > 0 && (
        <div className="glass rounded-apple-lg px-5 py-3.5 mb-4 flex items-center justify-between border border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-amber-50/40 fade-in-up fade-in-up-delay-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
              <i className="fa-solid fa-clock text-amber-500 text-sm" />
            </div>
            <div>
              <p className="font-semibold text-amber-800 text-sm">{dueRecurring.length} recurring invoice siap di-generate!</p>
              <p className="text-amber-600 text-xs">{dueRecurring.map((t) => t.name).join(', ')}</p>
            </div>
          </div>
          <button onClick={() => navigate({ name: 'recurring' })}
            className="bg-amber-400 hover:bg-amber-500 text-amber-900 px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all press-effect">
            <i className="fa-solid fa-bolt mr-1" /> Generate
          </button>
        </div>
      )}

      {/* ── Overdue alerts ── */}
      {invoices.filter((i) => i.status === 'OVERDUE').length > 0 && (
        <div className="glass rounded-apple-lg px-5 py-4 mb-4 border border-apple-red/15 bg-gradient-to-r from-apple-red/5 to-transparent fade-in-up fade-in-up-delay-2">
          <p className="font-semibold text-apple-red text-sm mb-3 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" />
            {invoices.filter((i) => i.status === 'OVERDUE').length} Invoice Overdue
          </p>
          <div className="space-y-2">
            {invoices.filter((i) => i.status === 'OVERDUE').slice(0, 3).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-apple-red font-semibold">{inv.invoice_number}</span>
                  <span className="text-xs text-gray-500">{inv.client_snapshot.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">{formatCurrency(inv.total_amount, inv.currency)}</span>
                  <button onClick={() => updateStatus(inv.id, 'PAID')}
                    className="text-xs px-2.5 py-1 bg-apple-green/10 text-apple-green rounded-[6px] hover:bg-apple-green/20 font-semibold transition-all press-effect border border-apple-green/20">
                    <i className="fa-solid fa-check mr-1" />Lunas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Invoice table ── */}
      {invoices.length > 0 && (
        <div className="glass rounded-apple-lg overflow-hidden border border-white/60 shadow-glass fade-in-up fade-in-up-delay-3">
          <div className="px-5 py-3.5 border-b border-gray-100/80 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
              <i className="fa-solid fa-list text-gray-400 text-xs" />
              Invoice Terbaru
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-100/80 rounded-lg p-0.5">
                {(['ALL','DRAFT','SENT','PAID','OVERDUE'] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-all ${
                      filterStatus === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}>
                    {s === 'ALL' ? 'Semua' : s}
                  </button>
                ))}
              </div>
              <button onClick={() => navigate({ name: 'history' })}
                className="text-xs text-apple-blue hover:text-apple-blue/80 font-semibold transition-colors ml-1">
                Semua →
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <i className="fa-solid fa-file-circle-xmark text-2xl text-gray-200 mb-2 block" />
              <p className="text-gray-400 text-sm">Tidak ada invoice dengan status ini</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60">
                  <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">No. Invoice</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Klien</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Tanggal</th>
                  <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/80">
                {filtered.map((inv) => (
                  <tr key={inv.id}
                    className="hover:bg-apple-blue/[0.03] transition-colors cursor-pointer group"
                    onClick={() => navigate({ name: 'detail', invoiceId: inv.id })}>
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-apple-blue text-xs">{inv.invoice_number}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-800 text-sm leading-tight">{inv.client_snapshot.name}</p>
                      {inv.client_snapshot.company && <p className="text-gray-400 text-xs mt-0.5">{inv.client_snapshot.company}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-gray-400 text-xs">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-800">{formatCurrency(inv.total_amount, inv.currency)}</td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3.5">
                      <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-1.5 justify-end">
                        {inv.status === 'DRAFT' && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'SENT'); }}
                            className="text-[11px] px-2 py-1 bg-apple-blue/10 text-apple-blue rounded-[6px] hover:bg-apple-blue/20 font-semibold transition-all border border-apple-blue/15">
                            Kirim
                          </button>
                        )}
                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                          <button onClick={(e) => { e.stopPropagation(); updateStatus(inv.id, 'PAID'); }}
                            className="text-[11px] px-2 py-1 bg-apple-green/10 text-apple-green rounded-[6px] hover:bg-apple-green/20 font-semibold transition-all border border-apple-green/15">
                            <i className="fa-solid fa-check mr-1" />Lunas
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

      {/* ── Quick actions ── */}
      {!isFirstTime && (
        <div className="grid grid-cols-3 gap-3 mt-4 fade-in-up fade-in-up-delay-4">
          {[
            { icon: 'fa-users', label: `${clients.length} Klien`, sub: 'Kelola data klien', page: { name: 'clients' } as Page, color: 'text-apple-blue' },
            { icon: 'fa-rotate', label: `${templates.length} Recurring`, sub: 'Template berkala', page: { name: 'recurring' } as Page, color: 'text-apple-purple' },
            { icon: 'fa-arrow-right-arrow-left', label: 'Import / Export', sub: 'CSV & Excel', page: { name: 'import-export' } as Page, color: 'text-apple-green' },
          ].map((q) => (
            <button key={q.label} onClick={() => navigate(q.page)}
              className="glass rounded-apple-lg p-4 text-left hover:border-apple-blue/20 transition-all press-effect hover-lift border border-white/60">
              <i className={`fa-solid ${q.icon} ${q.color} text-lg mb-2.5 block`} />
              <p className="font-semibold text-gray-700 text-sm">{q.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{q.sub}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
