/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 5: Теплотехнический расчет оконных блоков и поэтажной воздухопроницаемости
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { CheckCircle2, Shield, Wind, DoorClosed, Maximize2 } from 'lucide-react';

interface WindowCalculatorProps {
  calc: FullCourseworkCalculation;
}

export const WindowCalculator: React.FC<WindowCalculatorProps> = ({ calc }) => {
  const { window: win, door, climate } = calc;

  return (
    <div className="space-y-6">
      {/* Карточка окна */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-sky-600/20 text-sky-400 font-mono font-bold text-sm border border-sky-500/30">
                {win.windowDef.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Расчет оконного заполнения и поэтажной воздухопроницаемости
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Профиль: {win.windowDef.profileSystem} | Стеклопакет: {win.windowDef.glazingType} (Схема {win.windowDef.typeScheme})
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
              win.isCompliant
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Требование СН 2.04.02 (Rт.ок ≥ 1.0 м²·°С/Вт) ВЫПОЛНЕНО</span>
          </div>
        </div>

        {/* Геометрические и теплотехнические показатели окна */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Приведенное Rт.ок</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {win.R_actual} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-emerald-500/80 block mt-1">
              Норматив: ≥ 1.0 м²·°С/Вт (+{((win.R_actual - 1.0) * 100).toFixed(0)}%)
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Размеры H × B</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {win.windowDef.dim.H} × {win.windowDef.dim.B} <span className="text-xs font-sans text-slate-400">мм</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Площадь Fок = {win.area_total} м²
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Светопрозрачная часть Fсв</span>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">
              {win.area_transparent} <span className="text-xs font-sans text-slate-400">м²</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rсв = {win.R_transparent} м²·°С/Вт ({(win.area_transparent / win.area_total * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Непрозрачная часть (профиль)</span>
            <div className="text-xl font-bold font-mono text-slate-300 mt-1">
              {win.area_opaque} <span className="text-xs font-sans text-slate-400">м²</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rнепр = {win.R_opaque} м²·°С/Вт
            </span>
          </div>
        </div>
      </div>

      {/* Поэтажная таблица воздухопроницаемости окон */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-2 flex items-center space-x-2">
          <Wind className="w-5 h-5 text-blue-400" />
          <span>Поэтажный расчет воздухопроницаемости оконных блоков (п. 8.1 СП 2.04.01)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Определяет разность давлений воздуха Δp с наветренной стороны на каждом этаже с учетом ветрового и гравитационного напора, требуемое сопротивление воздухопроницанию Rв.тр и класс окна (А – Д).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">Этаж</th>
                <th className="py-2.5 px-3">Высота центра окна hi (м)</th>
                <th className="py-2.5 px-3">Коэффициент ki</th>
                <th className="py-2.5 px-3">Разность давлений Δpi (Па)</th>
                <th className="py-2.5 px-3">Норматив Gн (кг/м²·ч)</th>
                <th className="py-2.5 px-3">Требуемое Rв.тр (м²·ч·Па/кг)</th>
                <th className="py-2.5 px-3">Требуемый класс окна</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {win.floors.map((f) => (
                <tr key={f.floor} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-white font-bold">{f.floor} этаж</td>
                  <td className="py-2 px-3 text-slate-300">{f.height.toFixed(1)} м</td>
                  <td className="py-2 px-3 text-slate-300">{f.k_i}</td>
                  <td className="py-2 px-3 text-blue-300 font-semibold">{f.delta_p} Па</td>
                  <td className="py-2 px-3 text-slate-400">{f.G_v_required}</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{f.R_v_required}</td>
                  <td className="py-2 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold border border-blue-800/50">
                      Класс {f.windowClass}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Расчет наружных входных дверей */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <DoorClosed className="w-5 h-5 text-indigo-400" />
          <span>Теплотехнический расчет наружных входных дверей</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Формула норматива Rт.дн:
            </span>
            <div className="text-indigo-300 text-sm">
              Rт.дн = 0.6 × (tв - tн) / (αв × Δtв.норм)
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              где Δtв.норм = 6.0 °C для входных дверей жилых зданий.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Требуемое сопротивление:
            </span>
            <div className="text-white text-sm font-bold">
              Rт.дн = {door.R_required} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              0.6 × (18 - (-22)) / (8.7 × 6) = 0.46 м²·°С/Вт.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Принятая конструкция двери:
            </span>
            <div className="text-emerald-400 text-sm font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Rт.д = {door.R_adopted} м²·°С/Вт ≥ {door.R_required}</span>
            </div>
            <p className="text-[11px] font-sans text-emerald-400/90 mt-2">
              Принята типовая стальная утепленная дверь с минераловатным заполнением.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
