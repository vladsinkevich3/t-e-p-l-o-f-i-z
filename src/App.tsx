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
import { ReportPreview } from './components/ReportPreview';
import { ProjectsModal } from './components/ProjectsModal';
import { LocalModeModal } from './components/LocalModeModal';
import { DecodedCipher, DEFAULT_CIPHER } from './logic/decodeCipher';
import { calculateCoursework } from './logic/calculations';
import { exportCourseworkToExcel } from './export/excelExport';
import { exportReportToPdf } from './export/pdfExport';
import { saveProject } from './db/projectsDb';

export default function App() {
  const [cipher, setCipher] = useState<DecodedCipher>(DEFAULT_CIPHER);
  const [activeTab, setActiveTab] = useState<string>('task');
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState<boolean>(false);
  const [isLocalModalOpen, setIsLocalModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Мгновенный перерасчет всей курсовой работы
  const calculation = useMemo(() => {
    return calculateCoursework(cipher);
  }, [cipher]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Экспорт в Excel
  const handleExportExcel = () => {
    exportCourseworkToExcel(calculation);
    showToast('Книга Excel (.xlsx) успешно создана и скачивается!');
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
        onExportExcel={handleExportExcel}
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
        {activeTab === 'task' && (
          <TaskCipherInput
            cipher={cipher}
            calc={calculation}
            onChangeCipher={setCipher}
          />
        )}

        {activeTab === 'wall' && <WallCalculator calc={calculation} />}

        {activeTab === 'moisture' && <MoistureChart calc={calculation} />}

        {activeTab === 'roof' && <RoofCalculator calc={calculation} />}

        {activeTab === 'basement' && <BasementCalculator calc={calculation} />}

        {activeTab === 'windows' && <WindowCalculator calc={calculation} />}

        {activeTab === 'report' && (
          <ReportPreview
            calc={calculation}
            onPrint={handlePrint}
            onExportPdf={handleExportPdf}
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
    </div>
  );
}
