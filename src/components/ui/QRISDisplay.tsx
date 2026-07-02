import { useState, useEffect } from 'react';
import { generateInvoiceQRIS, isValidQRIS } from '../../utils/qrisGenerator';
import { formatCurrency } from '../../utils/format';
import type { Currency } from '../../types';

interface QRISDisplayProps {
  qrisStatis: string;
  nominal: number;
  currency?: Currency;
  size?: number;
  showLabel?: boolean;
}

export default function QRISDisplay({
  qrisStatis,
  nominal,
  currency = 'IDR',
  size = 180,
  showLabel = true,
}: QRISDisplayProps) {
  const [qrDataUrl, setQrDataUrl]  = useState<string | null>(null);
  const [isLoading, setIsLoading]  = useState(true);
  const [error, setError]          = useState<string | null>(null);

  useEffect(() => {
    if (!qrisStatis || !isValidQRIS(qrisStatis)) {
      setError('String QRIS tidak valid');
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    generateInvoiceQRIS(qrisStatis, nominal)
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [qrisStatis, nominal]);

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-white rounded-apple border border-gray-100"
        style={{ width: size + 32, height: size + 32 }}
      >
        <i className="fa-solid fa-spinner fa-spin text-gray-300 text-xl mb-2" />
        <p className="text-xs text-gray-400">Generating QR...</p>
      </div>
    );
  }

  if (error || !qrDataUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-red-50 rounded-apple border border-apple-red/20"
        style={{ width: size + 32, height: size + 32 }}
      >
        <i className="fa-solid fa-circle-xmark text-apple-red text-xl mb-2" />
        <p className="text-xs text-apple-red text-center px-2">QRIS error</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* QR Container */}
      <div className="bg-white rounded-apple-lg p-3 border border-gray-100 shadow-apple">
        {/* QRIS header */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="w-3 h-3 rounded-sm bg-[#E30613]" />
          <span className="text-[10px] font-bold text-gray-600 tracking-wider uppercase">QRIS</span>
        </div>

        {/* QR Image */}
        <img
          src={qrDataUrl}
          alt={`QRIS ${formatCurrency(nominal, currency)}`}
          width={size}
          height={size}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Nominal */}
        {showLabel && (
          <div className="mt-2 text-center">
            <p className="text-[11px] text-gray-400 font-medium">Nominal</p>
            <p className="font-bold text-gray-800 text-sm">{formatCurrency(nominal, currency)}</p>
          </div>
        )}
      </div>

      {/* Info badge */}
      {showLabel && (
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <i className="fa-solid fa-circle-info" />
          <span>Scan dengan semua app e-wallet</span>
        </div>
      )}
    </div>
  );
}
