import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Ya, Hapus', danger = true,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm">
      <p className="text-gray-500 text-sm leading-relaxed mb-6">{message}</p>
      <div className="flex gap-2.5 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-apple text-sm font-semibold bg-gray-100/80 hover:bg-gray-200/80 text-gray-700 transition-all press-effect"
        >
          Batal
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`px-4 py-2 rounded-apple text-sm font-semibold text-white transition-all press-effect shadow-lg ${
            danger
              ? 'bg-apple-red hover:bg-apple-red/90 shadow-apple-red/25'
              : 'bg-apple-blue hover:bg-apple-blue/90 shadow-apple-blue/25'
          }`}
        >
          <i className={`fa-solid ${danger ? 'fa-trash' : 'fa-bolt'} mr-1.5`} />
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
