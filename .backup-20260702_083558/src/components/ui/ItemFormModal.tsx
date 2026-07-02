import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemCatalogSchema, type ItemCatalogFormValues } from '../../schemas';
import Modal from './Modal';
import type { ItemCatalog } from '../../types';

interface ItemFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ItemCatalogFormValues) => void;
  initialData?: ItemCatalog | null;
}

export default function ItemFormModal({ isOpen, onClose, onSubmit, initialData }: ItemFormModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ItemCatalogFormValues>({
    resolver: zodResolver(itemCatalogSchema),
    defaultValues: { name: '', description: '', default_price: 0, unit: '', category: '' },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description,
        default_price: initialData.default_price,
        unit: initialData.unit,
        category: initialData.category,
      });
    } else {
      reset({ name: '', description: '', default_price: 0, unit: '', category: '' });
    }
  }, [initialData, reset, isOpen]);

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? `Edit Item — ${initialData.name}` : 'Tambah Item Katalog'}
    >
      <form onSubmit={handleSubmit((data) => { onSubmit(data); handleClose(); })} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Item *</label>
          <input
            {...register('name')}
            placeholder="Contoh: Jasa Desain UI, Website Landing Page"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Deskripsi detail item ini..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Harga Default *</label>
            <input
              type="number"
              min="0"
              step="any"
              {...register('default_price', { valueAsNumber: true })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.default_price && <p className="text-red-500 text-xs mt-1">{errors.default_price.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
            <input
              {...register('unit')}
              placeholder="jam / hari / paket"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <input
              {...register('category')}
              placeholder="Design / Dev / Konsultasi"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            Batal
          </button>
          <button type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            {initialData ? '💾 Simpan' : '✅ Tambah Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
