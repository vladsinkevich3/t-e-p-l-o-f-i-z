/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Главный компонент веб-приложения «Теплофизика-Калькулятор» (БНТУ)
 */

import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { TaskCipherInput } from './components/TaskCipherInput';
import { WallCalculator } from './components/WallCalculator';
import { MoistureChart } from './components/MoistureChart';
import { RoofCalculator } from './components/RoofCalculator';
import { BasementCalculator } from './components/BasementCalculator';
import { WindowCalculator } from './components/WindowCalculator';
import { AutoCadCalculator } from './components/AutoCadCalculator';
import { ReportPreview } from './components/ReportPreview';
import { ProjectsModal } from './components/ProjectsModal';
import { LocalModeModal } from './components/LocalModeModal';
import { CalculationOverridesEditor } from './components/CalculationOverridesEditor';
import { MaterialsCatalogModal } from './components/MaterialsCatalogModal';
import { NormativeWarningBanner } from './components/NormativeWarningBanner';
import { DecodedCipher, PDF_REFERENCE_CIPHER } from './logic/decodeCipher';
import { calculateCoursework } from './logic/calculations';
import { exportCourseworkToExcel } from './export/excelExport';
import { exportCourseworkToWord } from './export/wordExport';
import { exportReportToPdf } from './export/pdfExport';
import { saveProject } from './db/projectsDb';

export default function App() {
  const [cipher, setCipher] = useState<DecodedCipher>(PDF_REFERENCE_CIPHER);
  const [activeTab, setActiveTab] = useState<string>('task');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState<boolean>(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState<boolean>(false);
  const [isMaterialsCatalogOpen, setIsMaterialsCatalogOpen] = useState<boolean>(false);
  const [isOverridesEditorOpen, setIsOverridesEditorOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const hasOverrides = Boolean(
    cipher.overrides &&
      Object.values(cipher.overrides).some((v) => v !== undefined && v !== null)
  );

  // Мгновенный перерасчет всей курсовой работы
  const calculation = useMemo(() => {
    return calculateCoursework(cipher);
  }, [cipher]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Экспорт в автономную книгу Excel (.xlsx с живыми формулами)
  const handleExportExcel = async () => {
   
    try {
      await exportCourseworkToExcel(calculation);
      showToast('Автономная книга Excel (.xlsx, 18 листов, В_отчет, Формулы_расчета, графики Шибеко и AutoCAD) сформирована!');
    } catch (err) {
      console.error('Ошибка экспорта в Excel:', err);
      showToast('Не удалось сформировать файл Excel. Попробуйте снова.');
    }
  };

  // Экспорт в Microsoft Word (.docx)
  const handleExportWord = async () => {
    try {
      await exportCourseworkToWord(calculation);
      showToast('Пояснительная записка Microsoft Word (.docx) со структурой таблиц «В_отчет» успешно сформирована!');
    } catch (err) {
      console.error('Ошибка экспорта в Word:', err);
      showToast('Не удалось сформировать файл Word (.docx). Попробуйте снова.');
    }
  };

  // Экспорт в PDF
  const handleExportPdf = async () => {
    // Временно переключаем на вкладку отчета для корректного захвата canvas, если нужно
    setActiveTab('report');
    setTimeout(async () => {
      try {
        await exportReportToPdf('academic-report-document', calculation);
        showToast('Академический отчет PDF успешно сформирован!');
      } catch (err) {
        console.error('Ошибка экспорта в PDF:', err);
        window.print();
      }
    }, 200);
  };

  // Печать
  const handlePrint = () => {
    setActiveTab('report');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Быстрое сохранение
  const handleQuickSave = async () => {
    await saveProject({
      name: `Проект ${cipher.cityCode} (${cipher.wallCode}) - ${cipher.studentName || 'Студент'}`,
      cipher,
      notes: `Автоматическое сохранение ${new Date().toLocaleTimeString()}`,
    });
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.1 } });
    showToast('Текущий вариант сохранен в локальную базу данных IndexedDB!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Верхняя навигационная панель */}
      <Header
        calc={calculation}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
        onSaveCurrentProject={handleQuickSave}
        onOpenLocalModal={() => setIsLocalModalOpen(true)}
        onOpenMaterialsCatalog={() => setIsMaterialsCatalogOpen(true)}
        onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
        hasOverrides={hasOverrides}
        onExportExcel={handleExportExcel}
        onExportWord={handleExportWord}
        onExportPdf={handleExportPdf}
        onPrint={handlePrint}
      />

      {/* Уведомления Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500 font-medium text-xs flex items-center space-x-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Основной контент */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <NormativeWarningBanner
          variant="global"
          warnings={calculation.normativeWarnings}
          onNavigateTab={setActiveTab}
          onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
        />

        {activeTab === 'task' && (
          <TaskCipherInput
            cipher={cipher}
            calc={calculation}
            onChangeCipher={setCipher}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
            onExportExcel={handleExportExcel}
            onExportWord={handleExportWord}
          />
        )}

        {activeTab === 'wall' && (
          <WallCalculator
            calc={calculation}
            cipher={cipher}
            onChangeCipher={setCipher}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
          />
        )}

        {activeTab === 'moisture' && (
          <MoistureChart
            calc={calculation}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
            onOpenAutoCad={() => setActiveTab('autocad')}
          />
        )}

        {activeTab === 'roof' && (
          <RoofCalculator
            calc={calculation}
            cipher={cipher}
            onChangeCipher={setCipher}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
            onViewMoistureChart={() => setActiveTab('moisture')}
          />
        )}

        {activeTab === 'basement' && (
          <BasementCalculator
            calc={calculation}
            cipher={cipher}
            onChangeCipher={setCipher}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
          />
        )}

        {activeTab === 'windows' && (
          <WindowCalculator
            calc={calculation}
            cipher={cipher}
            onChangeCipher={setCipher}
            onOpenOverridesEditor={() => setIsOverridesEditorOpen(true)}
          />
        )}

        {activeTab === 'autocad' && (
          <AutoCadCalculator
            calc={calculation}
            onExportExcel={() => showToast('Отчет Excel временно отключен.')}
          />
        )}

        {activeTab === 'report' && (
          <ReportPreview
            calc={calculation}
            onPrint={handlePrint}
            onExportPdf={handleExportPdf}
            onExportWord={handleExportWord}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* Подвал */}
      <footer className="border-t border-slate-900 bg-slate-950/80 text-center py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>
              «Теплофизика-Калькулятор» — автоматизированное проектирование по СП 2.04.01-2020 и СН 2.04.02-2020
            </span>
            <button
              onClick={() => setIsLocalModalOpen(true)}
              className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer"
            >
              Автономная работа на ПК (100% Offline)
            </button>
          </div>
          <span>Белорусский национальный технический университет (БНТУ)</span>
        </div>
      </footer>

      {/* Модальное окно проектов */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        currentCipher={cipher}
        onLoadProject={(loaded) => {
          setCipher(loaded);
          showToast(`Загружен вариант: ${loaded.cityCode} (${loaded.wallCode})`);
        }}
      />

      {/* Модальное окно локального режима на ПК */}
      <LocalModeModal
        isOpen={isLocalModalOpen}
        onClose={() => setIsLocalModalOpen(false)}
      />

      {/* Модальное окно справочника материалов СП 2.04.01-2020 */}
      <MaterialsCatalogModal
        isOpen={isMaterialsCatalogOpen}
        onClose={() => setIsMaterialsCatalogOpen(false)}
        activeCondition={calculation.internalConditions.exploitationConditions}
      />

      {/* Модальное окно просмотра и редактирования расчетных параметров */}
      <CalculationOverridesEditor
        isOpen={isOverridesEditorOpen}
        onClose={() => setIsOverridesEditorOpen(false)}
        cipher={cipher}
        calc={calculation}
        onUpdateCipher={(updated) => {
          setCipher(updated);
          showToast('Расчетные параметры и толщины обновлены!');
        }}
      />
    </div>
  );
}
