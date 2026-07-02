interface EmptyStateProps {
  icon: string;       // Font Awesome class e.g. "fa-file-invoice"
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center fade-in-up">
      <div className="w-16 h-16 rounded-apple-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-apple border border-gray-100/80">
        <i className={`fa-solid ${icon} text-2xl text-gray-300`} />
      </div>
      <p className="font-semibold text-gray-700 text-[15px]">{title}</p>
      {subtitle && <p className="text-gray-400 text-sm mt-1.5 max-w-xs">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 bg-apple-blue hover:bg-apple-blue/90 text-white px-5 py-2.5 rounded-apple text-sm font-semibold transition-all press-effect shadow-lg shadow-apple-blue/25"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
