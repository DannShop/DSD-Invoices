import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import HistoryPage from './pages/HistoryPage';
import ClientsPage from './pages/ClientsPage';
import ItemCatalogPage from './pages/ItemCatalogPage';
import RecurringPage from './pages/RecurringPage';
import ImportExportPage from './pages/ImportExportPage';
import CloudSyncPage from './pages/CloudSyncPage';
import Settings from './pages/Settings';
import Sidebar from './components/layout/Sidebar';

export type Page =
  | { name: 'dashboard' }
  | { name: 'create' }
  | { name: 'detail'; invoiceId: string }
  | { name: 'history'; clientId?: string }
  | { name: 'clients' }
  | { name: 'catalog' }
  | { name: 'recurring' }
  | { name: 'import-export' }
  | { name: 'cloud-sync' }
  | { name: 'settings' };

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' });
  const navigate = (p: Page) => setPage(p);

  function renderPage() {
    switch (page.name) {
      case 'dashboard':     return <Dashboard navigate={navigate} />;
      case 'create':        return <CreateInvoice navigate={navigate} onSuccess={(id) => navigate({ name: 'detail', invoiceId: id })} />;
      case 'detail':        return <InvoiceDetail invoiceId={page.invoiceId} navigate={navigate} />;
      case 'history':       return <HistoryPage navigate={navigate} clientId={page.clientId} />;
      case 'clients':       return <ClientsPage navigate={navigate} />;
      case 'catalog':       return <ItemCatalogPage navigate={navigate} />;
      case 'recurring':     return <RecurringPage navigate={navigate} />;
      case 'import-export': return <ImportExportPage navigate={navigate} />;
      case 'cloud-sync':    return <CloudSyncPage navigate={navigate} />;
      case 'settings':      return <Settings navigate={navigate} />;
      default:              return <Dashboard navigate={navigate} />;
    }
  }

  return (
    <div className="flex h-screen bg-apple overflow-hidden">
      <Sidebar currentPage={page.name} navigate={navigate} />
      <main className="flex-1 overflow-y-auto main-scroll">
        {renderPage()}
      </main>
    </div>
  );
}
