import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: 'fadeIn 200ms ease both' }}
      />
      {/* Panel */}
      <div
        className={`relative glass rounded-apple-lg w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-glass-lg`}
        style={{ animation: 'fadeInUp 240ms cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/40">
          <h3 className="font-semibold text-gray-800 text-[15px]">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all press-effect"
          >
            <i className="fa-solid fa-xmark text-gray-500 text-xs" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  );
}
