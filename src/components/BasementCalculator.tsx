/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 4: Теплотехнический расчет технического подполья (ПТП)
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { CheckCircle2, AlertTriangle, Flame, Droplets, Thermometer, Layers } from 'lucide-react';
import { CrossSectionTable } from './CrossSectionTable';
import { NormativeWarningBanner } from './NormativeWarningBanner';

interface BasementCalculatorProps {
  calc: FullCourseworkCalculation;
  onOpenOverridesEditor?: () => void;
}

export const BasementCalculator: React.FC<BasementCalculatorProps> = ({
  calc,
  onOpenOverridesEditor,
}) => {
  const { basement, internalConditions } = calc;
  const basementCheck = calc.normativeChecks.find((c) => c.id === 'basement');

  return (
    <div className="space-y-6">
      {/* Карточка заголовка */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-teal-600/20 text-teal-400 font-mono font-bold text-sm border border-teal-500/30">
                {basement.construction.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Расчет перекрытия и теплового баланса техподполья
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {basement.construction.name} (ж/б плита {basement.construction.slabThickness * 1000} мм)
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
              basement.isCompliant
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {basement.isCompliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Условия теплового режима техподполья ВЫПОЛНЕНЫ</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Нарушены требования теплозащиты техподполья</span>
              </>
            )}
          </div>
        </div>

        {/* 4 ключевые метрики техподполья */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Температура в подполье tп</span>
            <div className="text-xl font-bold font-mono text-teal-400 mt-1">
              {basement.crawlSpaceTemp_t_p} <span className="text-xs font-sans text-slate-400">°C</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Норматив: tп ≥ +5.0 °C (СП 2.04.01)
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Перепад на полу Δtв.п</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                basement.delta_t_floor <= basement.delta_t_floor_norm
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {basement.delta_t_floor} <span className="text-xs font-sans text-slate-400">°C</span>
            </div>
            <span
              className={`text-[11px] block mt-1 ${
                basement.delta_t_floor <= basement.delta_t_floor_norm
                  ? 'text-emerald-500/80'
                  : 'text-rose-300'
              }`}
            >
              Норматив: ≤ {basement.delta_t_floor_norm} °C (п. 6.6)
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              basement.isRCompliant
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}
          >
            <span className="text-xs text-slate-400 block">Сопротивление пола Rт.ПТП</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                basement.isRCompliant ? 'text-white' : 'text-rose-400'
              }`}
            >
              {basement.R_ptp} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span
              className={`text-[11px] block mt-1 ${
                basement.isRCompliant ? 'text-slate-500' : 'text-rose-300'
              }`}
            >
              {basement.isRCompliant
                ? `Норматив: ≥ ${basement.R_required} м²·°С/Вт`
                : `Ниже нормы (${basement.R_required}) на ${(basement.R_required - basement.R_ptp).toFixed(2)}`}
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Теплопотери труб Σqi·li</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {basement.pipeHeatGains_total} <span className="text-xs font-sans text-slate-400">Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Отопление + ГВС в подполье
            </span>
          </div>
        </div>
      </div>

      <NormativeWarningBanner
        variant="section"
        check={basementCheck}
        onOpenOverridesEditor={onOpenOverridesEditor}
      />

      {/* Проверка отсутствия конденсата на цокольной стене подполья */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Droplets className="w-5 h-5 text-teal-400" />
          <span>Проверка выпадения конденсата на внутренней поверхности цоколя</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Температура воздуха в подполье tп:
            </span>
            <div className="text-teal-300 text-sm font-bold">
              tп = {basement.crawlSpaceTemp_t_p} °C, φп = {basement.crawlSpaceRH}%
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Парциальное давление пара в подполье eп = {((basement.crawlSpaceRH / 100) * 1127).toFixed(1)} Па.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Точка росы воздуха подполья tр.п:
            </span>
            <div className="text-blue-400 text-sm font-bold">
              tр.п = {basement.dew_point_basement} °C
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Температура, при которой в подполье начнется выпадение конденсата на поверхностях.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Температура внутренней поверхности цоколя τв.цок:
            </span>
            <div
              className={`text-sm font-bold ${
                !basement.isCondensationOnWall ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              τв.цок = {basement.tau_v_basement_wall} °C
            </div>
            <p
              className={`text-[11px] font-sans mt-2 flex items-center space-x-1 ${
                !basement.isCondensationOnWall ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {!basement.isCondensationOnWall ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {!basement.isCondensationOnWall
                  ? `τв.цок > tр.п (${basement.tau_v_basement_wall} > ${basement.dew_point_basement} °C) — конденсат отсутствует!`
                  : `τв.цок ≤ tр.п (${basement.tau_v_basement_wall} ≤ ${basement.dew_point_basement} °C) — риск конденсации!`}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Таблица трубопроводов в техническом подполье */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>Тепловыделения трубопроводов инженерных сетей в подполье (Таблица 1.6)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Температура теплоносителя (°C)</th>
                <th className="py-2.5 px-3">Условный диаметр Dy (мм)</th>
                <th className="py-2.5 px-3">Длина участка l (м)</th>
                <th className="py-2.5 px-3">Погонные теплопотери q (Вт/м)</th>
                <th className="py-2.5 px-3">Суммарный тепловой поток Q (Вт)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {basement.pipesDetails.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 text-amber-300 font-bold">{p.temp} °C</td>
                  <td className="py-2 px-3 text-white">Dy {p.dy}</td>
                  <td className="py-2 px-3 text-blue-300">{p.length} м</td>
                  <td className="py-2 px-3 text-slate-300">{p.q_heat_loss} Вт/м</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{p.q_total} Вт</td>
                </tr>
              ))}
              <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700">
                <td colSpan={5} className="py-2.5 px-3 font-sans text-white">
                  Суммарные тепловыделения от труб в воздух подполья:
                </td>
                <td className="py-2.5 px-3 text-amber-400">
                  {basement.pipeHeatGains_total} Вт
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Слои перекрытия над техподпольем */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-teal-400" />
          <span>Послойная структура перекрытия над техподпольем ({basement.construction.id})</span>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {basement.layers.map((l, idx) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Таблица температур и влажности по расчетному сечению перекрытия над техподпольем */}
      <CrossSectionTable
        title={`Таблица температур и влажности по расчетному сечению перекрытия над техподпольем (${basement.construction.id})`}
        points={basement.crossSectionProfile}
        t_v={internalConditions.t_v}
        t_n={basement.crawlSpaceTemp_t_p}
        t_n_moisture={basement.crawlSpaceTemp_t_p}
        R_total={basement.R_ptp}
        sectionBadge={`Перекрытие ${basement.construction.id}`}
      />
    </div>
  );
};
