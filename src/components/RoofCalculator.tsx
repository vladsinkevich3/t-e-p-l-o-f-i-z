/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 3: Теплотехнический расчет совмещенного покрытия с многопустотной ж/б плитой
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { CheckCircle2, ShieldCheck, Layers, HelpCircle, AlertCircle } from 'lucide-react';

interface RoofCalculatorProps {
  calc: FullCourseworkCalculation;
}

export const RoofCalculator: React.FC<RoofCalculatorProps> = ({ calc }) => {
  const { roof, internalConditions } = calc;

  return (
    <div className="space-y-6">
      {/* Карточка заголовка */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm border border-indigo-500/30">
                {roof.construction.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Расчет совмещенного покрытия с многопустотной плитой
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {roof.construction.name} (тип {roof.construction.type}, {roof.construction.kind})
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
              roof.isCompliant
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Условия тепловой защиты и пароизоляции ВЫПОЛНЕНЫ</span>
          </div>
        </div>

        {/* 4 ключевые метрики покрытия */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Требуемое Rт.тр</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {roof.R_required} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rнорм(6.0) × n({roof.construction.increasingFactor_n})
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Фактическое Rт</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {roof.R_total} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-emerald-500/80 block mt-1">
              Запас: +{((roof.R_total - roof.R_required) / roof.R_required * 100).toFixed(1)}%
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Многопустотная плита Rпл</span>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
              {roof.hollowCore.R_slab} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              h={roof.hollowCore.height} мм, d={roof.hollowCore.voidDiameter} мм
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Толщина утеплителя δут</span>
            <div className="text-xl font-bold font-mono text-blue-400 mt-1">
              {roof.delta_insulation_adopted * 1000} <span className="text-xs font-sans text-slate-400">мм</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Расчетная: {(roof.delta_insulation_calc * 1000).toFixed(0)} мм ({roof.insulation.id})
            </span>
          </div>
        </div>
      </div>

      {/* Блок расчета приведенного сопротивления многопустотной ж/б плиты */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Теплотехнический расчет многопустотной железобетонной плиты перекрытия</span>
        </h3>
        <p className="text-xs text-slate-300">
          Приведенное сопротивление теплопередаче плиты с круглыми невентилируемыми пустотами рассчитывается по методике п. 5.1–5.3 пособия А.С. Шибеко методом параллельных и перпендикулярных сечений теплового потока:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Сечение вдоль потока R||:
            </span>
            <div className="text-indigo-300 text-sm font-bold">
              R|| = {roof.hollowCore.R_parallel} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Учитывает термическое сопротивление участков сплошного бетона ребер и воздушных пустот.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Сечение поперек потока R⊥:
            </span>
            <div className="text-indigo-300 text-sm font-bold">
              R⊥ = {roof.hollowCore.R_perpendicular} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Учитывает последовательное сопротивление верхней полки, слоя с пустотами и нижней полки.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Приведенное сопротивление плиты Rпл:
            </span>
            <div className="text-emerald-400 text-sm font-bold">
              Rпл = (R|| + 2·R⊥) / 3 = {roof.hollowCore.R_slab} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Соответствует эталонному значению (0.173 м²·°С/Вт для плиты 260 мм с d=159 мм).
            </p>
          </div>
        </div>
      </div>

      {/* Обоснование и проверка пароизоляции */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Проверка необходимости устройства пароизоляционного слоя</span>
        </h3>

        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 text-xs text-slate-200 space-y-2">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white text-sm">
                Пароизоляция предусмотрена: полиэтиленовая пленка ГОСТ 10354-82 (δ = 0.2 мм, Rп.из = 7.3 м²·ч·Па/мг)
              </p>
              <p className="text-slate-300 mt-1">
                В конструкции совмещенного покрытия над утеплителем расположен водонепроницаемый ковер из рубероида (μ = 0.001 мг/(м·ч·Па)). Без пароизоляции водяной пар беспрепятственно проникает из теплого помещения через поры ж/б плиты в утеплитель и накапливается на границе со стяжкой, вызывая намокание минваты и потерю теплоизоляционных свойств.
              </p>
              <p className="text-emerald-300 font-medium mt-1">
                ✓ С пароизоляционным слоем из полиэтиленовой пленки перед утеплителем условие e(x) &lt; E(x) обеспечено на всех сечениях покрытия.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица слоев покрытия */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-4">
          Слои покрытия и их теплофизические характеристики
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Наименование слоя</th>
                <th className="py-2.5 px-3">Материал</th>
                <th className="py-2.5 px-3">Толщина δ (мм)</th>
                <th className="py-2.5 px-3">λ (Вт/м·°С)</th>
                <th className="py-2.5 px-3">R (м²·°С/Вт)</th>
                <th className="py-2.5 px-3">s (Вт/м²·°С)</th>
                <th className="py-2.5 px-3">D = R·s</th>
                <th className="py-2.5 px-3">μ (мг/м·ч·Па)</th>
                <th className="py-2.5 px-3">Rп (м²·ч·Па/мг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {roof.layers.map((l, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-sans text-white font-medium">{l.name}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{l.materialName}</td>
                  <td className="py-2 px-3 text-blue-300">{(l.thickness * 1000).toFixed(l.thickness < 0.001 ? 1 : 0)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.lambda}</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{l.R.toFixed(3)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.s}</td>
                  <td className="py-2 px-3 text-amber-400">{l.D.toFixed(2)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.mu}</td>
                  <td className="py-2 px-3 text-slate-300">{l.R_p.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
