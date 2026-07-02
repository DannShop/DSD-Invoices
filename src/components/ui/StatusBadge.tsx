import type { InvoiceStatus } from '../../types';

const CONFIG: Record<InvoiceStatus, { style: string; icon: string; label: string }> = {
  DRAFT:     { style: 'bg-gray-100/80 text-gray-500 border-gray-200/80',                    icon: 'fa-pen-to-square',  label: 'Draft' },
  SENT:      { style: 'bg-apple-blue/10 text-apple-blue border-apple-blue/20',              icon: 'fa-paper-plane',   label: 'Sent' },
  PAID:      { style: 'bg-apple-green/10 text-apple-green border-apple-green/20',           icon: 'fa-circle-check',  label: 'Paid' },
  OVERDUE:   { style: 'bg-apple-red/10 text-apple-red border-apple-red/20',                 icon: 'fa-triangle-exclamation', label: 'Overdue' },
  CANCELLED: { style: 'bg-gray-100/60 text-gray-400 border-gray-200/60',                   icon: 'fa-ban',           label: 'Cancelled' },
};

interface StatusBadgeProps {
  status: InvoiceStatus;
  showIcon?: boolean;
}

export default function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const { style, icon, label } = CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-sm ${style}`}>
      {showIcon && <i className={`fa-solid ${icon} text-[10px]`} />}
      {label}
    </span>
  );
}
