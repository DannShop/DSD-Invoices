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
  section?: string;
}

export default function Sidebar({ currentPage, navigate }: SidebarProps) {
  const { templates } = useRecurringStore();
  const dueCount = templates.filter((t) => t.is_active && isDueToday(t.next_due_date)).length;

  const NAV: NavItem[] = [
    // Main
    { label: 'Dashboard',     page: { name: 'dashboard' }, icon: '📊', section: 'main' },
    { label: 'Buat Invoice',  page: { name: 'create' },    icon: '✏️',  section: 'main' },
    { label: 'Riwayat',       page: { name: 'history' },   icon: '🗂️',  section: 'main' },
    // Data
    { label: 'Klien',         page: { name: 'clients' },   icon: '👥',  section: 'data' },
    { label: 'Katalog Item',  page: { name: 'catalog' },   icon: '📦',  section: 'data' },
    { label: 'Recurring',     page: { name: 'recurring' }, icon: '🔄',  section: 'data', badge: dueCount },
    // Tools
    { label: 'Import / Export', page: { name: 'import-export' }, icon: '📁', section: 'tools' },
    { label: 'Cloud Sync',    page: { name: 'cloud-sync' }, icon: '☁️', section: 'tools' },
    { label: 'Pengaturan',    page: { name: 'settings' },  icon: '⚙️',  section: 'tools' },
  ];

  const sections = [
    { key: 'main',  label: 'UTAMA' },
    { key: 'data',  label: 'DATA' },
    { key: 'tools', label: 'TOOLS' },
  ];

  return (
    <aside className="w-56 bg-[#1E3A5F] flex flex-col shadow-xl shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <h1 className="text-white font-bold text-base tracking-tight leading-none">
          💼 WildanInvoice
        </h1>
        <p className="text-blue-300 text-xs mt-1">Invoice Generator</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {sections.map((sec) => {
          const sectionItems = NAV.filter((n) => n.section === sec.key);
          return (
            <div key={sec.key}>
              <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-widest px-3 mb-1">
                {sec.label}
              </p>
              <div className="space-y-0.5">
                {sectionItems.map((item) => {
                  const isActive = currentPage === item.page.name;
                  return (
                    <button
                      key={item.page.name}
                      onClick={() => navigate(item.page)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left group ${
                        isActive
                          ? 'bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                          : 'text-blue-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className="text-base leading-none">{item.icon}</span>
                        <span className="leading-none">{item.label}</span>
                      </span>
                      {item.badge != null && item.badge > 0 && (
                        <span className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/10">
        <p className="text-blue-400/60 text-[10px]">v1.0.0 • Phase 3 Complete</p>
      </div>
    </aside>
  );
}
