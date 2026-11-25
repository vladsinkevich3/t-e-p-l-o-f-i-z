/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Справочник теплофизических характеристик строительных материалов
 * по СП 2.04.01-2020 (Приложение Д, таблица Д.1) и пособию А. С. Шибеко (2018)
 */

import React, { useMemo, useState } from 'react';
import { X, Search, BookOpen, Filter } from 'lucide-react';
import {
  MaterialCategory,
  MATERIAL_CATEGORY_LABELS,
  MATERIAL_CATEGORY_ORDER,
  getSortedMaterialsList,
} from '../data/materials';

interface MaterialsCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCondition: 'А' | 'Б';
}

export const MaterialsCatalogModal: React.FC<MaterialsCatalogModalProps> = ({
  isOpen,
  onClose,
  activeCondition,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');

  const allMaterials = useMemo(() => getSortedMaterialsList(), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMaterials.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        String(m.density).includes(q) ||
        MATERIAL_CATEGORY_LABELS[m.category].toLowerCase().includes(q)
      );
    });
  }, [allMaterials, search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Справочник материалов СП 2.04.01-2020 (Приложение Д, Таблица Д.1)
              </h2>
              <p className="text-xs text-slate-400">
                Всего {allMaterials.length} позиций · Текущие условия эксплуатации проекта:{' '}
                <strong className="text-amber-300">Условия {activeCondition}</strong> (выделены в таблице)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Закрыть справочник"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, плотности (например: газосиликат, кирпич, 1800, пеностекло, XPS)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as MaterialCategory | 'all')}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все группы СП 2.04.01 ({allMaterials.length})</option>
              {MATERIAL_CATEGORY_ORDER.map((cat) => {
                const count = allMaterials.filter((m) => m.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {MATERIAL_CATEGORY_LABELS[cat]} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Наименование материала</th>
                <th className="py-2.5 px-2.5 font-semibold text-right">ρ₀, кг/м³</th>
                <th className="py-2.5 px-2.5 font-semibold text-right">c₀</th>
                <th className="py-2.5 px-2.5 font-semibold text-right">λ₀</th>
                <th
                  className={`py-2.5 px-2.5 font-semibold text-right ${
                    activeCondition === 'А' ? 'text-amber-300 bg-amber-950/30' : ''
                  }`}
                >
                  λ_А
                </th>
                <th
                  className={`py-2.5 px-2.5 font-semibold text-right ${
                    activeCondition === 'Б' ? 'text-amber-300 bg-amber-950/30' : ''
                  }`}
                >
                  λ_Б
                </th>
                <th
                  className={`py-2.5 px-2.5 font-semibold text-right ${
                    activeCondition === 'А' ? 'text-amber-300 bg-amber-950/30' : ''
                  }`}
                >
                  s_А
                </th>
                <th
                  className={`py-2.5 px-2.5 font-semibold text-right ${
                    activeCondition === 'Б' ? 'text-amber-300 bg-amber-950/30' : ''
                  }`}
                >
                  s_Б
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">μ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3">
                    <div className="font-medium text-slate-100">{m.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {MATERIAL_CATEGORY_LABELS[m.category]}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-300">{m.density}</td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-400">{m.heatCapacity}</td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-400">
                    {m.lambda_dry ?? '—'}
                  </td>
                  <td
                    className={`py-2 px-2.5 text-right font-mono ${
                      activeCondition === 'А'
                        ? 'text-amber-300 font-bold bg-amber-950/20'
                        : 'text-slate-300'
                    }`}
                  >
                    {m.lambda_A}
                  </td>
                  <td
                    className={`py-2 px-2.5 text-right font-mono ${
                      activeCondition === 'Б'
                        ? 'text-amber-300 font-bold bg-amber-950/20'
                        : 'text-slate-300'
                    }`}
                  >
                    {m.lambda_B}
                  </td>
                  <td
                    className={`py-2 px-2.5 text-right font-mono ${
                      activeCondition === 'А'
                        ? 'text-amber-200 font-semibold bg-amber-950/20'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.s_A}
                  </td>
                  <td
                    className={`py-2 px-2.5 text-right font-mono ${
                      activeCondition === 'Б'
                        ? 'text-amber-200 font-semibold bg-amber-950/20'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.s_B}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-cyan-300">{m.mu}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    По запросу «{search}» материалы не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Показано {filtered.length} из {allMaterials.length} материалов · Эти же материалы экспортируются на лист Excel «Справ_Материалы»
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
