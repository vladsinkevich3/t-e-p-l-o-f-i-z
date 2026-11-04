import React, { useState } from 'react';
import { 
  X, 
  MonitorDown, 
  HardDrive, 
  WifiOff, 
  CheckCircle2, 
  Download, 
  Terminal, 
  ShieldCheck, 
  Laptop, 
  Layers, 
  FileSpreadsheet, 
  FileText 
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface LocalModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalModeModal: React.FC<LocalModeModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Полностью автономная работа на ПК
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% Offline
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Калькулятор, формулы, база проектов и экспорт работают локально без интернета
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm">
          {/* Quick Install Banner */}
          <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-600/40 rounded-xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-base text-white">
                  <MonitorDown className="w-5 h-5 text-blue-400" />
                  Установка как приложение на ПК (PWA)
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                  Установите калькулятор на рабочий стол Windows / macOS / Linux. Приложение будет запускаться в отдельном окне и работать даже при полном отключении сети.
                </p>
              </div>

              {isInstalled || installSuccess ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Установлено на этом ПК
                </div>
              ) : isInstallable ? (
                <button
                  onClick={handleInstallClick}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition flex items-center gap-2 whitespace-nowrap cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Установить на ПК
                </button>
              ) : (
                <div className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700 px-3.5 py-2 rounded-lg">
                  В браузере (Chrome / Edge / Яндекс) нажмите значок <strong className="text-white">«Установить»</strong> в адресной строке справа.
                </div>
              )}
            </div>
          </div>

          {/* System components status */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Статус локальных модулей системы
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-200">Локальная БД (IndexedDB)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Все проекты и варианты курсовой хранятся в постоянной памяти вашего ПК, данные не уходят на внешние серверы.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-200">Офлайн Service Worker</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Код интерфейса, формулы, иконки и шрифты автоматически закэшированы браузером для запуска без интернета.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-200">Генератор Excel (.xlsx)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Формирование 5-листовой расчетной книги Excel происходит локально в оперативной памяти компьютера.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-slate-200">Генератор отчета (PDF)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Отрисовка ГОСТ-отчета и экспорт в PDF работают прямо на стороне клиента без сторонних сервисов.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Running locally from folder / source code */}
          <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-xs text-slate-200">
              <Terminal className="w-4 h-4 text-blue-400" />
              Запуск локально из исходного кода / репозитория (для разработчиков и кафедры)
            </div>
            <p className="text-xs text-slate-400">
              Вы также можете запустить проект автономно в локальной сети или на любом ПК без доступа в интернет:
            </p>
            <div className="bg-black/60 border border-slate-800 rounded-lg p-3 font-mono text-xs text-emerald-400 space-y-1.5 overflow-x-auto">
              <div className="text-slate-500"># 1. Клонирование или открытие папки с проектом</div>
              <div>cd teplofizika-bntu</div>
              <div className="text-slate-500"># 2. Установка зависимостей (один раз)</div>
              <div>npm install</div>
              <div className="text-slate-500"># 3. Запуск локального сервера (доступен по http://localhost:3000)</div>
              <div>npm run dev</div>
              <div className="text-slate-500"># 4. Либо сборка статического автономного бандла:</div>
              <div>npm run build && npx serve dist</div>
            </div>
          </div>

          {/* Current network status banner */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            isOnline 
              ? 'bg-blue-950/30 border-blue-800/40 text-blue-300'
              : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
          }`}>
            <div className="flex items-center gap-2.5">
              {isOnline ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>Сеть подключена: сервис-воркер синхронизирован и готов к отключению интернета.</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span>Сеть отключена: приложение функционирует в полностью автономном режиме!</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
