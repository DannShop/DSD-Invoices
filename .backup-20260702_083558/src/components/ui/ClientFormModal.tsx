import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, type ClientFormValues } from '../../schemas';
import Modal from './Modal';
import type { Client } from '../../types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormValues) => void;
  initialData?: Client | null;
}

export default function ClientFormModal({ isOpen, onClose, onSubmit, initialData }: ClientFormModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: '', email: '', phone: '', address: '', company: '', notes: '' },
  });

  // Populate form when editing
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone,
        address: initialData.address,
        company: initialData.company,
        notes: initialData.notes,
      });
    } else {
      reset({ name: '', email: '', phone: '', address: '', company: '', notes: '' });
    }
  }, [initialData, reset, isOpen]);

  const handleClose = () => { reset(); onClose(); };

  const Field = ({ label, name, type = 'text', placeholder, span = 1 }: {
    label: string; name: keyof ClientFormValues;
    type?: string; placeholder?: string; span?: number;
  }) => (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        {...register(name)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {errors[name] && (
        <p className="text-red-500 text-xs mt-1">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? `Edit Klien — ${initialData.name}` : 'Tambah Klien Baru'}
    >
      <form onSubmit={handleSubmit((data) => { onSubmit(data); handleClose(); })} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nama *" name="name" placeholder="Nama lengkap klien" />
          <Field label="Perusahaan" name="company" placeholder="Nama perusahaan (opsional)" />
          <Field label="Email" name="email" type="email" placeholder="email@klien.com" />
          <Field label="Telepon" name="phone" placeholder="08xx-xxxx-xxxx" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
          <textarea
            {...register('address')}
            rows={2}
            placeholder="Alamat lengkap klien"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Internal</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Catatan pribadi tentang klien ini..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            Batal
          </button>
          <button type="submit"
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            {initialData ? '💾 Simpan Perubahan' : '✅ Tambah Klien'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
