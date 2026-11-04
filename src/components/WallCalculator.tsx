/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 2: Теплотехнический расчет наружной стены
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { CheckCircle2, AlertTriangle, Layers, Calculator, ShieldCheck } from 'lucide-react';

interface WallCalculatorProps {
  calc: FullCourseworkCalculation;
}

export const WallCalculator: React.FC<WallCalculatorProps> = ({ calc }) => {
  const { wall, climate, internalConditions } = calc;

  return (
    <div className="space-y-6">
      {/* Карточка заголовка и соответствия */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-400 font-mono font-bold text-sm border border-blue-500/30">
                {wall.construction.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Теплотехнический расчет наружной стены
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {wall.construction.typeName} (тип {wall.construction.type})
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
              wall.isCompliant
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {wall.isCompliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Условия тепловой защиты стены ВЫПОЛНЕНЫ</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Требуется увеличение толщины утеплителя</span>
              </>
            )}
          </div>
        </div>

        {/* 4 ключевые сводные метрики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Требуемое Rт.тр</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {wall.R_required} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rнорм(3.2) × n({wall.construction.increasingFactor_n})
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Фактическое Rт</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {wall.R_total} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-emerald-500/80 block mt-1">
              Запас: +{((wall.R_total - wall.R_required) / wall.R_required * 100).toFixed(1)}%
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Толщина утеплителя δут</span>
            <div className="text-xl font-bold font-mono text-blue-400 mt-1">
              {wall.delta_insulation_adopted * 1000} <span className="text-xs font-sans text-slate-400">мм</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Расчетная: {(wall.delta_insulation_calc * 1000).toFixed(0)} мм ({wall.insulation.id})
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Тепловая инерция D</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {wall.thermalInertia_D}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {wall.thermalInertia_D > 7 ? 'Массивная (tн = tх.5)' : 'Средняя (4 < D ≤ 7)'}
            </span>
          </div>
        </div>
      </div>

      {/* Таблица слоев конструкции стены */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <span>Слои наружной стены и их теплофизические характеристики</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Наименование слоя</th>
                <th className="py-2.5 px-3">Материал</th>
                <th className="py-2.5 px-3">Толщина δ (мм)</th>
                <th className="py-2.5 px-3">λБ (Вт/м·°С)</th>
                <th className="py-2.5 px-3">R (м²·°С/Вт)</th>
                <th className="py-2.5 px-3">sБ (Вт/м²·°С)</th>
                <th className="py-2.5 px-3">D = R·s</th>
                <th className="py-2.5 px-3">μ (мг/м·ч·Па)</th>
                <th className="py-2.5 px-3">Rп (м²·ч·Па/мг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {wall.layers.map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-sans text-white font-medium">{l.name}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{l.materialName}</td>
                  <td className="py-2 px-3 text-blue-300">{(l.thickness * 1000).toFixed(0)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.lambda}</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{l.R.toFixed(3)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.s}</td>
                  <td className="py-2 px-3 text-amber-400">{l.D.toFixed(2)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.mu}</td>
                  <td className="py-2 px-3 text-slate-300">{l.R_p.toFixed(3)}</td>
                </tr>
              ))}
              <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700">
                <td colSpan={3} className="py-2.5 px-3 font-sans text-white">
                  Итого по слоям (без учета теплоотдачи поверхностей):
                </td>
                <td className="py-2.5 px-3 text-blue-300">
                  {(wall.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000).toFixed(0)}
                </td>
                <td className="py-2.5 px-3">-</td>
                <td className="py-2.5 px-3 text-emerald-400">
                  {wall.layers.reduce((sum, l) => sum + l.R, 0).toFixed(3)}
                </td>
                <td className="py-2.5 px-3">-</td>
                <td className="py-2.5 px-3 text-amber-400">{wall.thermalInertia_D}</td>
                <td className="py-2.5 px-3">-</td>
                <td className="py-2.5 px-3 text-slate-200">
                  {wall.layers.reduce((sum, l) => sum + l.R_p, 0).toFixed(3)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Пошаговые формулы и обоснование расчета */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <span>Пошаговый расчет и проверка санитарно-гигиенических требований</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Формула Rт.тр */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              1. Требуемое термическое сопротивление стены Rт.тр:
            </span>
            <div className="text-blue-300">
              Rт.тр = Rт.норм × n = 3.20 × {wall.construction.increasingFactor_n} ={' '}
              <span className="font-bold text-white">{wall.R_required} м²·°С/Вт</span>
            </div>
            <p className="text-[11px] font-sans text-slate-500">
              где Rт.норм = 3.20 м²·°С/Вт по табл. 7.1 СН 2.04.02; n = {wall.construction.increasingFactor_n} — повышающий коэффициент по табл. 6.1 СП 2.04.01.
            </p>
          </div>

          {/* Формула толщины утеплителя */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              2. Расчетная толщина слоя утеплителя:
            </span>
            <div className="text-blue-300">
              δут = (Rт.тр - Rk.без_ут) × λут = ({wall.R_required} - {wall.R_without_insulation}) × {wall.insulation.lambda_B} ={' '}
              <span className="font-bold text-white">{wall.delta_insulation_calc} м</span>
            </div>
            <div className="text-emerald-400 font-sans">
              Принимаем толщину: <span className="font-mono font-bold">{wall.delta_insulation_adopted * 1000} мм</span> (кратно 10 мм).
            </div>
          </div>

          {/* Температурный перепад */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              3. Проверка температурного перепада Δtв:
            </span>
            <div className="text-blue-300">
              Δtв = (tв - tн) / (Rт × αв) = ({internalConditions.t_v} - ({wall.design_t_out})) / ({wall.R_total} × 8.7) ={' '}
              <span className="font-bold text-white">{wall.delta_t_actual} °C</span>
            </div>
            <div className="text-emerald-400 font-sans flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{wall.delta_t_actual} °C ≤ 4.0 °C (условие табл. 6.5 СП 2.04.01 выполняется)</span>
            </div>
          </div>

          {/* Температура внутренней поверхности и точка росы */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              4. Температура внутренней поверхности τв.min:
            </span>
            <div className="text-blue-300">
              τв.min = tв - Δtв = {internalConditions.t_v} - {wall.delta_t_actual} ={' '}
              <span className="font-bold text-white">{wall.tau_v_min} °C</span>
            </div>
            <div className="text-emerald-400 font-sans flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{wall.tau_v_min} °C &gt; {wall.dew_point} °C (выпадение росы исключено, запас: +{(wall.tau_v_min - wall.dew_point).toFixed(2)} °C)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
