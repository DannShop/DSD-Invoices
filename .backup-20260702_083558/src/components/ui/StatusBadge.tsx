import type { InvoiceStatus } from '../../types';

const STYLE: Record<InvoiceStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600 border border-gray-200',
  SENT:      'bg-blue-100 text-blue-700 border border-blue-200',
  PAID:      'bg-green-100 text-green-700 border border-green-200',
  OVERDUE:   'bg-red-100 text-red-700 border border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-400 border border-gray-200',
};

const EMOJI: Record<InvoiceStatus, string> = {
  DRAFT: '📝', SENT: '📤', PAID: '✅', OVERDUE: '⚠️', CANCELLED: '❌',
};

interface StatusBadgeProps {
  status: InvoiceStatus;
  showEmoji?: boolean;
}

export default function StatusBadge({ status, showEmoji = false }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${STYLE[status]}`}>
      {showEmoji && <span>{EMOJI[status]}</span>}
      {status}
    </span>
  );
}
