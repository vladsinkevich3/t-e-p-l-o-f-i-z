import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, HardDrive, CheckCircle2 } from 'lucide-react';

interface OfflineIndicatorProps {
  onOpenLocalModal?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onOpenLocalModal }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <button
        onClick={onOpenLocalModal}
        title="Приложение готово к автономной работе без интернета. Нажмите для подробностей."
        className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 rounded-lg hover:bg-emerald-900/60 transition shadow-sm"
      >
        <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
        <span>100% Локально</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenLocalModal}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/90 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold shadow-xl border border-amber-400/40 backdrop-blur-md transition cursor-pointer"
      title="Нажмите для открытия панели локального режима"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
      </span>
      <WifiOff className="w-4 h-4 text-amber-100" />
      <span>Офлайн-режим активен (все расчеты и БД работают локально)</span>
    </button>
  );
};
