import { useRecurringStore } from '../../store/recurringStore';
import { isDueToday } from '../../utils/recurringUtils';
import type { Page } from '../../App';

interface SidebarProps {
  currentPage: string;
  navigate: (page: Page) => void;
}

interface NavItem {
  label: string;
  page: Page;
  icon: string;
  badge?: number;
  section: string;
}

export default function Sidebar({ currentPage, navigate }: SidebarProps) {
  const { templates } = useRecurringStore();
  const dueCount = templates.filter((t) => t.is_active && isDueToday(t.next_due_date)).length;

  const NAV: NavItem[] = [
    { label: 'Dashboard',      page: { name: 'dashboard' },     icon: 'fa-chart-pie',         section: 'main' },
    { label: 'Buat Invoice',   page: { name: 'create' },        icon: 'fa-file-invoice',      section: 'main' },
    { label: 'Riwayat',        page: { name: 'history' },       icon: 'fa-clock-rotate-left', section: 'main' },
    { label: 'Klien',          page: { name: 'clients' },       icon: 'fa-users',             section: 'data' },
    { label: 'Katalog Item',   page: { name: 'catalog' },       icon: 'fa-box-open',          section: 'data' },
    { label: 'Recurring',      page: { name: 'recurring' },     icon: 'fa-rotate',            section: 'data', badge: dueCount },
    { label: 'Import / Export',page: { name: 'import-export' }, icon: 'fa-arrow-right-arrow-left', section: 'tools' },
    { label: 'Cloud Sync',     page: { name: 'cloud-sync' },    icon: 'fa-cloud-arrow-up',    section: 'tools' },
    { label: 'Pengaturan',     page: { name: 'settings' },      icon: 'fa-gear',              section: 'tools' },
  ];

  const sections = [
    { key: 'main',  label: 'Utama' },
    { key: 'data',  label: 'Data' },
    { key: 'tools', label: 'Tools' },
  ];

  return (
    <aside className="glass-dark w-56 flex flex-col shrink-0 relative z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-apple-blue flex items-center justify-center shadow-lg shadow-apple-blue/30">
            <i className="fa-solid fa-file-invoice text-white text-sm" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight leading-none">DSD-Invoices</h1>
            <p className="text-white/30 text-[10px] mt-0.5 leading-none">Invoice Generator</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
        {sections.map((sec, si) => (
          <div key={sec.key}>
            <p className="text-white/25 text-[9px] font-bold uppercase tracking-[0.12em] px-3 mb-1.5">
              {sec.label}
            </p>
            <div className="space-y-0.5">
              {NAV.filter((n) => n.section === sec.key).map((item, i) => {
                const isActive = currentPage === item.page.name;
                return (
                  <button
                    key={item.page.name}
                    onClick={() => navigate(item.page)}
                    style={{ animationDelay: `${si * 60 + i * 30}ms` }}
                    className={`
                      w-full flex items-center justify-between gap-2.5 px-3 py-2.5
                      rounded-[10px] text-[13px] font-medium border border-transparent
                      transition-all duration-200 text-left press-effect
                      ${isActive
                        ? 'bg-apple-blue border-apple-blue/30 text-white shadow-lg shadow-apple-blue/25'
                        : 'text-white/55 hover:bg-white/[0.07] hover:text-white/90 hover:border-white/[0.06]'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2.5">
                      <i className={`fa-solid ${item.icon} w-4 text-center text-[13px] ${isActive ? 'text-white' : 'text-white/40'}`} />
                      <span className="leading-none">{item.label}</span>
                    </span>
                    {item.badge != null && item.badge > 0 && (
                      <span className="pulse-badge bg-apple-amber text-[#1C1C1E] text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-white/[0.06]">
        <p className="text-white/20 text-[9px] font-medium">v1.0.0 · Phase 3</p>
      </div>
    </aside>
  );
}
