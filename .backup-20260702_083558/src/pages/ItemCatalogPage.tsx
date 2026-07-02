import { useState } from 'react';
import { useItemCatalogStore } from '../store/itemCatalogStore';
import { useSettingsStore } from '../store/settingsStore';
import ItemFormModal from '../components/ui/ItemFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import type { Page } from '../App';
import type { ItemCatalog } from '../types';
import type { ItemCatalogFormValues } from '../schemas';
import { formatCurrency } from '../utils/format';

interface ItemCatalogPageProps {
  navigate: (page: Page) => void;
}

export default function ItemCatalogPage({ navigate }: ItemCatalogPageProps) {
  const { items, addItem, updateItem, deleteItem } = useItemCatalogStore();
  const { settings } = useSettingsStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ItemCatalog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemCatalog | null>(null);

  // Unique categories
  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean)))];

  const filtered = items.filter((item) => {
    const matchSearch = [item.name, item.description, item.category].some((f) =>
      f.toLowerCase().includes(search.toLowerCase())
    );
    const matchCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleAdd = (data: ItemCatalogFormValues) => addItem(data);
  const handleEdit = (data: ItemCatalogFormValues) => {
    if (editTarget) updateItem(editTarget.id, data);
    setEditTarget(null);
  };
  const handleDelete = () => {
    if (deleteTarget) deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ name: 'dashboard' })} className="text-gray-400 hover:text-gray-600">←</button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Katalog Item</h2>
            <p className="text-gray-400 text-sm">{items.length} item tersimpan</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          + Tambah Item
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama item, deskripsi, kategori..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat === 'ALL' ? 'Semua' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100">
          <EmptyState
            emoji="📦"
            title={search ? 'Item tidak ditemukan' : 'Katalog masih kosong'}
            subtitle={search ? `Tidak ada hasil untuk "${search}"` : 'Tambah item/jasa yang sering kamu tagihkan'}
            action={!search ? { label: '+ Tambah Item', onClick: () => setShowForm(true) } : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                  {item.category && (
                    <span className="inline-block text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1">
                      {item.category}
                    </span>
                  )}
                  {item.description && (
                    <p className="text-gray-400 text-xs mt-1.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditTarget(item)}
                    className="p-1.5 text-gray-300 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-400">{item.unit || 'unit'}</span>
                <span className="font-bold text-blue-700 text-sm">
                  {formatCurrency(item.default_price, settings.default_currency)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      {items.length > 0 && (
        <p className="text-xs text-gray-400 text-center mt-6">
          💡 Item katalog bisa dipilih langsung saat buat invoice — harga & nama terisi otomatis
        </p>
      )}

      {/* Modals */}
      <ItemFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleAdd}
      />
      <ItemFormModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEdit}
        initialData={editTarget}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Item"
        message={`Yakin hapus item "${deleteTarget?.name}"? Item ini tidak akan lagi muncul di katalog.`}
      />
    </div>
  );
}
