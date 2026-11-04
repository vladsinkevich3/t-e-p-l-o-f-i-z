/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Модальное окно управления сохраненными проектами и локальной базой данных
 */

import React, { useState, useEffect } from 'react';
import {
  SavedProject,
  getAllProjects,
  saveProject,
  deleteProject,
  exportProjectsToJson,
  importProjectsFromJson,
} from '../db/projectsDb';
import { DecodedCipher, formatCipherString } from '../logic/decodeCipher';
import {
  X,
  FolderOpen,
  Save,
  Trash2,
  Download,
  Upload,
  Calendar,
  Check,
  FileCode,
} from 'lucide-react';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCipher: DecodedCipher;
  onLoadProject: (cipher: DecodedCipher) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentCipher,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const refreshList = async () => {
    const list = await getAllProjects();
    setProjects(list);
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      setSaveName(`Вариант ${currentCipher.cityCode} (${currentCipher.wallCode}-${currentCipher.roofCode})`);
    }
  }, [isOpen, currentCipher]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!saveName.trim()) return;
    await saveProject({
      name: saveName.trim(),
      cipher: currentCipher,
      notes: saveNotes.trim(),
    });
    setStatusMsg('Проект успешно сохранен в локальную базу данных!');
    setTimeout(() => setStatusMsg(''), 3000);
    refreshList();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Удалить сохраненный вариант "${name}"?`)) {
      await deleteProject(id);
      refreshList();
    }
  };

  const handleExportJson = async () => {
    const json = await exportProjectsToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Теплофизика_Проекты_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const count = await importProjectsFromJson(text);
        alert(`Успешно импортировано ${count} проектов!`);
        refreshList();
      } catch (err) {
        alert('Ошибка при импорте файла: неверный формат');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Шапка модального окна */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">
              Локальная база данных вариантов курсовой работы
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {statusMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Форма сохранения текущего состояния */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Сохранить текущий расчет в базу данных</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Название проекта"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Примечание / комментарий"
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Шифр: {formatCipherString(currentCipher)}
              </span>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition cursor-pointer"
              >
                Сохранить в базу
              </button>
            </div>
          </div>

          {/* Список сохраненных вариантов */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Сохраненные варианты ({projects.length})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleExportJson}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Экспортировать все варианты в JSON файл"
                >
                  <Download className="w-3 h-3" />
                  <span>Экспорт JSON</span>
                </button>
                <label className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center space-x-1 transition cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Импорт JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJson}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">
                        {proj.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono border border-blue-900">
                        {proj.cipher.cityCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {formatCipherString(proj.cipher)}
                    </div>
                    {proj.notes && (
                      <p className="text-xs text-slate-500">{proj.notes}</p>
                    )}
                    <div className="flex items-center space-x-3 text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(proj.updatedAt).toLocaleDateString()}</span>
                      </span>
                      <span>Студент: {proj.cipher.studentName || 'Не указан'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => {
                        onLoadProject(proj.cipher);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition cursor-pointer"
                    >
                      Загрузить
                    </button>
                    <button
                      onClick={() => handleDelete(proj.id, proj.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Подвал модального окна */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
