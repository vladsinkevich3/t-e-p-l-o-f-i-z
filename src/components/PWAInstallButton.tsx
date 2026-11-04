import React from 'react';
import { Download, Monitor, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenLocalModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenLocalModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <button
        onClick={onOpenLocalModal}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900/80 transition"
        title="Приложение установлено локально на вашем ПК (PWA)"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">ПК-версия</span>
      </button>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer"
        title="Установить калькулятор на ПК для работы без браузера и интернета"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Установить на ПК</span>
      </button>
    );
  }

  return (
    <button
      onClick={onOpenLocalModal}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
      title="Настройки локальной работы без интернета на ПК"
    >
      <Monitor className="w-3.5 h-3.5 text-blue-400" />
      <span className="hidden sm:inline">На ПК</span>
    </button>
  );
};
