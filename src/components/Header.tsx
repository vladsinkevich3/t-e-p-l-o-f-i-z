/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Верхняя панель приложения «Теплофизика-Калькулятор»
 */

import React from 'react';
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
} from 'lucide-react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

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
  const isCompliant = calc.summary.totalCompliance;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Бренд и заголовок */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Теплофизика-Калькулятор
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                  БНТУ СП 2.04.01
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Автоматизированный расчет курсовой работы по строительной теплофизике
              </p>
            </div>
          </div>

          {/* Статус и кнопки действий */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Офлайн / локальный индикатор */}
            <OfflineIndicator onOpenLocalModal={onOpenLocalModal} />

            {/* Статус соответствия нормативам */}
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
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
                  <span>Требуется проверка</span>
                </>
              )}
            </div>

            {/* Кнопка установки / инфо о работе на ПК */}
            <PWAInstallButton onOpenLocalModal={onOpenLocalModal} />

            {/* Справочник материалов СП 2.04.01-2020 */}
            {onOpenMaterialsCatalog && (
              <button
                onClick={onOpenMaterialsCatalog}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/50 transition cursor-pointer"
                title="Открыть полный справочник материалов СП 2.04.01-2020 (Табл. Д.1)"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>СП 2.04.01</span>
              </button>
            )}

            {/* Редактор параметров / расчетов */}
            {onOpenOverridesEditor && (
              <button
                onClick={onOpenOverridesEditor}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  hasOverrides
                    ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 hover:bg-amber-600/30'
                    : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                }`}
                title="Редактирование параметров расчета, толщин утеплителя и нормативов"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Параметры</span>
                {hasOverrides && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                )}
              </button>
            )}

            {/* Сохранить вариант */}
            <button
              onClick={onSaveCurrentProject}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Сохранить текущие параметры в базу данных"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>

            {/* Мои варианты (База данных) */}
            <button
              onClick={onOpenProjects}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Открыть сохраненные проекты"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>База проектов</span>
            </button>

            {/* Экспорт Excel */}
            <button
              onClick={onExportExcel}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition cursor-pointer"
              title="Скачать расчетную книгу Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>

            {/* Экспорт Word (.docx) */}
            {onExportWord && (
              <button
                onClick={onExportWord}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition cursor-pointer"
                title="Скачать пояснительную записку в формате Microsoft Word (.docx) со структурой таблиц «В_отчет»"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>
            )}

            {/* Экспорт PDF */}
            <button
              onClick={onExportPdf}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
              title="Скачать пояснительную записку в PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF отчет</span>
            </button>

            {/* Печать */}
            <button
              onClick={onPrint}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Печать расчетно-пояснительной записки"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Навигационные вкладки разделов */}
        <nav className="flex space-x-1 overflow-x-auto py-2 text-xs font-medium scrollbar-none border-t border-slate-800/80">
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
  );
};
