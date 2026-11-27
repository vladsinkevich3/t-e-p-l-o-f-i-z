/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Верхняя панель приложения «Теплофизика-Калькулятор»
 */

import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  FolderOpen,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  Sliders,
  BookOpen,
  Menu,
  X,
  HardDrive,
  Monitor,
  Download,
} from 'lucide-react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface HeaderProps {
  calc: FullCourseworkCalculation;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenProjects: () => void;
  onSaveCurrentProject: () => void;
  onOpenLocalModal: () => void;
  onOpenMaterialsCatalog?: () => void;
  onOpenOverridesEditor?: () => void;
  hasOverrides?: boolean;
  onExportExcel: () => void;
  onExportWord?: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  calc,
  activeTab,
  setActiveTab,
  onOpenProjects,
  onSaveCurrentProject,
  onOpenLocalModal,
  onOpenMaterialsCatalog,
  onOpenOverridesEditor,
  hasOverrides,
  onExportExcel,
  onExportWord,
  onExportPdf,
  onPrint,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isCompliant = calc.summary.totalCompliance;
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  const runAndClose = (action?: () => void) => {
    setIsDrawerOpen(false);
    if (action) action();
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Компактная верхняя строка: бренд + только «Параметры» и кнопка бокового меню */}
          <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
            {/* Бренд и заголовок */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                    Теплофизика-Калькулятор
                  </h1>
                  <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 shrink-0">
                    БНТУ СП 2.04.01
                  </span>
                </div>
                <p className="hidden md:block text-xs text-slate-400 truncate">
                  Автоматизированный расчет курсовой работы по строительной теплофизике
                </p>
              </div>
            </div>

            {/* Только «Параметры» + кнопка открытия бокового меню */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {onOpenOverridesEditor && (
                <button
                  type="button"
                  onClick={onOpenOverridesEditor}
                  data-testid="header-params-btn"
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    hasOverrides
                      ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 hover:bg-amber-600/30'
                      : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                  }`}
                  title="Редактирование параметров расчета, толщин утеплителя и нормативов"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span>Параметры</span>
                  {hasOverrides && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Открыть боковое меню"
                aria-expanded={isDrawerOpen}
                aria-controls="header-side-drawer"
                data-testid="header-menu-toggle"
                className="relative inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition cursor-pointer"
                title="Открыть меню экспорта, проектов и справочников"
              >
                <Menu className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Меню</span>
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full ${
                    isCompliant ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Навигационные вкладки разделов */}
          <nav className="flex space-x-1 overflow-x-auto py-1.5 text-xs font-medium scrollbar-none border-t border-slate-800/80">
            {[
              { id: 'task', label: '1. Исходные и шифр' },
              { id: 'wall', label: '2. Наружная стена' },
              { id: 'moisture', label: 'График (Фокин)' },
              { id: 'roof', label: '3. Покрытие' },
              { id: 'basement', label: '4. Подполье (ПТП)' },
              { id: 'windows', label: '5. Окна (Шибеко)' },
              { id: 'autocad', label: 'AutoCAD (графики)' },
              { id: 'report', label: '6. Отчет (ГОСТ)' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-md whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Плавающий индикатор при отсутствии интернета */}
      {!isOnline && (
        <button
          type="button"
          onClick={onOpenLocalModal}
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 hover:bg-amber-600 text-white px-3.5 py-2 text-xs font-semibold shadow-xl border border-amber-400/40 backdrop-blur-md transition cursor-pointer print:hidden"
          title="Нажмите для открытия панели локального режима"
        >
          <HardDrive className="w-4 h-4 shrink-0" />
          <span>Офлайн-режим (все расчеты локально)</span>
        </button>
      )}

      {/* Выдвижное боковое меню со всеми действиями */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Боковое меню действий"
        >
          {/* Затемненный фон */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Панель бокового меню */}
          <aside
            id="header-side-drawer"
            data-testid="header-side-drawer"
            className="relative z-10 w-80 max-w-[88vw] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-white"
          >
            {/* Заголовок бокового меню */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white leading-tight">Меню действий</div>
                  <div className="text-[11px] text-slate-400">БНТУ СП 2.04.01-2020</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Закрыть боковое меню"
                data-testid="header-drawer-close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Содержимое бокового меню */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Статус соответствия нормативам */}
              <div
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium border ${
                  isCompliant
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                }`}
              >
                {isCompliant ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Нормативы соблюдены (10 баллов)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Требуется проверка нормативов</span>
                  </>
                )}
              </div>

              {/* Экспорт и печать */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  Экспорт и печать
                </div>
                <button
                  type="button"
                  onClick={() => runAndClose(onExportExcel)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Скачать Excel (.xlsx)</span>
                </button>

                {onExportWord && (
                  <button
                    type="button"
                    onClick={() => runAndClose(onExportWord)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>Скачать Word (.docx)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => runAndClose(onExportPdf)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Скачать PDF отчет</span>
                </button>

                <button
                  type="button"
                  onClick={() => runAndClose(onPrint)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 shrink-0 text-slate-300" />
                  <span>Печать пояснительной записки</span>
                </button>
              </div>

              {/* Проекты и справочники */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  Проекты и справочники
                </div>
                <button
                  type="button"
                  onClick={() => runAndClose(onSaveCurrentProject)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Save className="w-4 h-4 shrink-0 text-blue-400" />
                  <span>Сохранить текущий вариант</span>
                </button>

                <button
                  type="button"
                  onClick={() => runAndClose(onOpenProjects)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>База проектов</span>
                </button>

                {onOpenMaterialsCatalog && (
                  <button
                    type="button"
                    onClick={() => runAndClose(onOpenMaterialsCatalog)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>Справочник материалов СП 2.04.01</span>
                  </button>
                )}
              </div>

              {/* Локальная работа и PWA */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  Автономная работа
                </div>
                {isInstallable && !isInstalled && (
                  <button
                    type="button"
                    onClick={() => runAndClose(install)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Установить на ПК / телефон</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => runAndClose(onOpenLocalModal)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Monitor className="w-4 h-4 shrink-0 text-blue-400" />
                    <span>{isInstalled ? 'ПК-версия (установлена)' : 'Работа на ПК без интернета'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>100%</span>
                  </span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
