/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 2: Теплотехнический расчет наружной стены
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { DecodedCipher } from '../logic/decodeCipher';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { WALL_VB_PLACEMENTS } from '../data/vaporBarriers';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calculator,
  Sliders,
} from 'lucide-react';
import { CrossSectionTable } from './CrossSectionTable';
import { NormativeWarningBanner } from './NormativeWarningBanner';
import { VaporBarrierEditor } from './VaporBarrierEditor';

interface WallCalculatorProps {
  calc: FullCourseworkCalculation;
  cipher: DecodedCipher;
  onChangeCipher: (newCipher: DecodedCipher) => void;
  onOpenOverridesEditor?: () => void;
}

export const WallCalculator: React.FC<WallCalculatorProps> = ({
  calc,
  cipher,
  onChangeCipher,
  onOpenOverridesEditor,
}) => {
  const { wall, climate, internalConditions } = calc;
  const wallCheck = calc.normativeChecks.find((c) => c.id === 'wall');

  const rNormWall =
    cipher.overrides?.R_norm_wall ??
    BUILDING_TYPES[internalConditions.buildingTypeId]?.R_norm_wall ??
    3.2;
  const activeInsLambda =
    cipher.overrides?.wallInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? wall.insulation.lambda_A
      : wall.insulation.lambda_B);
  const alphaV = cipher.overrides?.alpha_v_wall ?? cipher.overrides?.alpha_v ?? 8.7;
  const alphaN = cipher.overrides?.alpha_n ?? 23;
  const wallSumRpLayers = +wall.layers.reduce((sum, l) => sum + l.R_p, 0).toFixed(3);
  const wallSumRLayers = +wall.layers.reduce((sum, l) => sum + l.R, 0).toFixed(3);
  const wallEout = wall.crossSectionProfile[wall.crossSectionProfile.length - 1]?.e_partial ?? 0;

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
              {wall.construction.typeName} (схема «{wall.construction.type}», Условия эксплуатации {internalConditions.exploitationConditions})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenOverridesEditor && (
              <button
                onClick={onOpenOverridesEditor}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Изменить толщину утеплителя, климат СП 2.04.04 или температуру"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Редактировать расчет</span>
              </button>
            )}

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
        </div>

        {/* 5 ключевых сводных метрик (включая Rп) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-xs">Принятая толщина утеплителя:</span>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {Math.round(wall.delta_insulation_adopted * 1000)} мм
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              (расчетная: {(wall.delta_insulation_calc * 1000).toFixed(1)} мм)
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              wall.isRCompliant
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}
          >
            <span className="text-slate-400 text-xs">Фактическое сопротивление Rт:</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                wall.isRCompliant ? 'text-blue-400' : 'text-rose-400'
              }`}
            >
              {wall.R_total} м²·°С/Вт
            </div>
            <span
              className={`text-[11px] font-mono ${
                wall.isRCompliant ? 'text-slate-500' : 'text-rose-300'
              }`}
            >
              {wall.isRCompliant
                ? `(требуемое Rт.тр: ${wall.R_required})`
                : `Ниже Rт.тр (${wall.R_required}) на ${(wall.R_required - wall.R_total).toFixed(2)}`}
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-xs">Тепловая инерция D:</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {wall.thermalInertia_D}
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {wall.designTempRule} → tн = {wall.design_t_out}°C
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 text-xs">Температура пов. τв (Δtв = {wall.delta_t_actual}°C):</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                wall.tau_v_min > wall.dew_point ? 'text-white' : 'text-rose-400'
              }`}
            >
              {wall.tau_v_min} °C
            </div>
            <span
              className={`text-[11px] font-mono block ${
                wall.tau_v_min > wall.dew_point ? 'text-emerald-400' : 'text-rose-300'
              }`}
            >
              {wall.tau_v_min > wall.dew_point ? 'τв > tр' : 'τв ≤ tр'} | tр = {wall.dew_point}°C
            </span>
            <span className="text-[10px] font-mono text-cyan-300/90 block mt-0.5">
              Eв({internalConditions.t_v}°) = {internalConditions.E_v} Па → eв = {internalConditions.e_v} Па
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/35 col-span-2 lg:col-span-1">
            <span className="text-slate-400 text-xs">Сопротивление паропроницанию Rп:</span>
            <div
              data-testid="wall-summary-rp"
              className="text-xl font-bold font-mono text-cyan-400 mt-1"
            >
              {wall.total_R_p.toFixed(2)} <span className="text-xs font-sans text-slate-400">м²·ч·Па/мг</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono block mt-1">
              {wall.vaporBarrier
                ? `в т.ч. ПИ: ${wall.vaporBarrier.R_p.toFixed(2)}`
                : 'без пароизоляции'}
            </span>
          </div>
        </div>
      </div>

      <NormativeWarningBanner
        variant="section"
        check={wallCheck}
        onOpenOverridesEditor={onOpenOverridesEditor}
      />

      {/* Универсальный выбор и редактирование всех параметров пароизоляции наружной стены */}
      <VaporBarrierEditor
        title="Пароизоляция наружной стены (СП 2.04.01-2020 п. 10.6 — Приложение Н / свои параметры)"
        subtitle="Выберите любой материал пароизоляции — сразу откроются все параметры (название, δ, Rп / μ, λ, s, ρ) для мгновенной корректировки"
        config={cipher.overrides?.wallVaporBarrier}
        applied={wall.vaporBarrier}
        supportAuto={false}
        totalRp={wall.total_R_p}
        placements={WALL_VB_PLACEMENTS}
        defaultPlacement="before_insulation"
        accent="cyan"
        testIdPrefix="wall"
        onChange={(next) =>
          onChangeCipher({
            ...cipher,
            overrides: {
              ...cipher.overrides,
              wallVaporBarrier: next,
            },
          })
        }
      />

      {/* Таблица слоев наружной стены */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Layers className="w-5 h-5 text-blue-400" />
          <h3 className="text-base font-bold text-white">
            Конструктивные слои наружной стены {wall.construction.id} и утеплителя {wall.insulation.id}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Наименование слоя</th>
                <th className="py-2.5 px-3">Материал</th>
                <th className="py-2.5 px-2 text-right">Толщина δ, мм</th>
                <th className="py-2.5 px-2 text-right">λ, Вт/(м·°С)</th>
                <th className="py-2.5 px-2 text-right">R, м²·°С/Вт</th>
                <th className="py-2.5 px-2 text-right">s, Вт/(м²·°С)</th>
                <th className="py-2.5 px-2 text-right">Инерция D</th>
                <th className="py-2.5 px-2 text-right">μ, мг/(м·ч·Па)</th>
                <th className="py-2.5 px-2 text-right">Rп, м²·ч·Па/мг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {wall.layers.map((layer, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/50 ${
                    layer.name.toLowerCase().includes('пароизол') ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                    {layer.name}
                  </td>
                  <td className="py-2.5 px-3 font-sans text-slate-400">{layer.materialName}</td>
                  <td className="py-2.5 px-2 text-right text-white font-semibold">
                    {layer.thickness * 1000 < 10
                      ? +(layer.thickness * 1000).toFixed(2)
                      : Math.round(layer.thickness * 1000)}
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300">{layer.lambda}</td>
                  <td className="py-2.5 px-2 text-right text-blue-300 font-semibold">{layer.R}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400">{layer.s}</td>
                  <td className="py-2.5 px-2 text-right text-amber-300">{layer.D}</td>
                  <td className="py-2.5 px-2 text-right text-slate-400">{layer.mu}</td>
                  <td className="py-2.5 px-2 text-right text-cyan-300">{layer.R_p.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-800 bg-slate-950 font-mono font-bold text-slate-200">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 font-sans text-right">
                  Суммарно по конструкции:
                </td>
                <td className="py-2.5 px-2 text-right text-white">
                  {Math.round(wall.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000)} мм
                </td>
                <td className="py-2.5 px-2 text-right">—</td>
                <td className="py-2.5 px-2 text-right text-blue-400">
                  {wall.layers.reduce((sum, l) => sum + l.R, 0).toFixed(3)}
                </td>
                <td className="py-2.5 px-2 text-right">—</td>
                <td className="py-2.5 px-2 text-right text-amber-400">{wall.thermalInertia_D}</td>
                <td className="py-2.5 px-2 text-right">—</td>
                <td className="py-2.5 px-2 text-right text-cyan-400">{wall.total_R_p}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Пошаговые формулы расчета */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Формулы и этапы теплотехнического расчета стены
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Требуемое сопротивление */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              1. Требуемое сопротивление Rт.тр:
            </span>
            <div className="text-blue-300">
              Rт.тр = Rт.норм × n = {rNormWall.toFixed(2)} × {wall.construction.increasingFactor_n} ={' '}
              <span className="font-bold text-white">{wall.R_required} м²·°С/Вт</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              где n = {wall.construction.increasingFactor_n} — повышающий коэффициент для конструкции типа {wall.construction.type}.
            </p>
          </div>

          {/* Расчетная толщина утеплителя */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              2. Толщина утеплителя δут:
            </span>
            <div className="text-blue-300">
              δут = (Rт.тр - Rk.без_ут) × λут = ({wall.R_required} - {wall.R_without_insulation}) × {activeInsLambda} ={' '}
              <span className="font-bold text-white">{wall.delta_insulation_calc} м</span>
            </div>
            <div className="text-emerald-400 font-sans">
              Принимаем толщину: <span className="font-mono font-bold">{Math.round(wall.delta_insulation_adopted * 1000)} мм</span>.
            </div>
          </div>

          {/* Температурный перепад */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              3. Проверка температурного перепада Δtв:
            </span>
            <div className="text-blue-300">
              Δtв = (tв - tн) / (Rт × αв) = ({internalConditions.t_v} - ({wall.design_t_out})) / ({wall.R_total} × {alphaV}) ={' '}
              <span className="font-bold text-white">{wall.delta_t_actual} °C</span>
            </div>
            <div
              className={`font-sans flex items-center space-x-1 ${
                wall.delta_t_actual <= wall.delta_t_norm ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {wall.delta_t_actual <= wall.delta_t_norm ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {wall.delta_t_actual} °C {wall.delta_t_actual <= wall.delta_t_norm ? '≤' : '>'} {wall.delta_t_norm} °C (
                {wall.delta_t_actual <= wall.delta_t_norm
                  ? 'условие табл. 6.5 СП 2.04.01 выполняется'
                  : 'превышен допустимый перепад температур!'}
                )
              </span>
            </div>
          </div>

          {/* Температура внутренней поверхности стены τв */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              4. Температура внутренней поверхности стены τв (стационарный расчет):
            </span>
            <div className="text-blue-300">
              τв = tв − (tв − tн) / (R₀ · αв) = {internalConditions.t_v} − ({internalConditions.t_v} − ({wall.design_t_out})) / ({wall.R_total} · {alphaV}) ={' '}
              <span className="font-bold text-white">{wall.tau_v_min} °C</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              По табл. Е.1 при tв = {internalConditions.t_v}°C: <span className="font-mono text-cyan-300">Eв = {internalConditions.E_v} Па</span> → <span className="font-mono text-emerald-300">eв = ({internalConditions.phi_v}%/100)·Eв = {internalConditions.e_v} Па</span> → точка росы <span className="font-mono text-slate-200">tр = {wall.dew_point} °C</span>.
            </p>
            <div
              className={`font-sans flex items-center space-x-1 ${
                wall.tau_v_min > wall.dew_point ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {wall.tau_v_min > wall.dew_point ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {wall.tau_v_min} °C {wall.tau_v_min > wall.dew_point ? '>' : '≤'} {wall.dew_point} °C (
                {wall.tau_v_min > wall.dew_point
                  ? `выпадение росы исключено, запас: +${(wall.tau_v_min - wall.dew_point).toFixed(2)} °C`
                  : 'ВНИМАНИЕ: риск выпадения конденсата на внутренней поверхности!'}
                )
              </span>
            </div>
          </div>

          {/* Общее сопротивление R0 и тепловая инерция D */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              5. Сопротивление теплопередаче R₀ и тепловая инерция D:
            </span>
            <div className="text-blue-300">
              R₀ = 1/αв + Σ(δᵢ/λᵢ) + 1/αн = 1/{alphaV} + {wallSumRLayers} + 1/{alphaN} ={' '}
              <span className="font-bold text-white">{wall.R_total} м²·°С/Вт</span>
            </div>
            <div className="text-amber-300">
              D = Σ(Rᵢ · sᵢ) = <span className="font-bold text-white">{wall.thermalInertia_D}</span>{' '}
              <span className="text-slate-400 font-sans">({wall.designTempRule} → tн = {wall.design_t_out}°C)</span>
            </div>
          </div>

          {/* Сопротивление паропроницанию Rп и упругость пара e(x) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              6. Сопротивление паропроницанию Rп и парциальное давление e(x):
            </span>
            <div className="text-cyan-300">
              Rп = 1/37 + Σ(δᵢ/μᵢ){wall.vaporBarrier ? ' + Rп.пи' : ''} + 1/77 = 0,027 + {wallSumRpLayers} + 0,013 ={' '}
              <span className="font-bold text-white">{wall.total_R_p.toFixed(2)} м²·ч·Па/мг</span>
            </div>
            <div className="text-slate-300">
              e(x) = eв − ((eв − eн.от) / Rп) · (1/37 + ΣRпi) = {internalConditions.e_v} − (({internalConditions.e_v} − {wallEout}) / {wall.total_R_p.toFixed(2)}) · ΣRп
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              Где Rп.в = 1/37 = 0,027 и Rп.н = 1/77 = 0,013 м²·ч·Па/мг — сопротивления влагообмену у внутренней и наружной поверхностей (Шибеко, п. 7.1).
            </p>
          </div>
        </div>
      </div>

      {/* Таблица температур и влажности по расчетному сечению наружной стены (с линейной интерполяцией E(t)) */}
      <CrossSectionTable
        title={`Таблица температур и влажности по расчетному сечению наружной стены (${wall.construction.id})`}
        points={wall.crossSectionProfile}
        t_v={internalConditions.t_v}
        t_n={wall.design_t_out}
        t_n_moisture={climate.t_heating_period}
        R_total={wall.R_total}
        sectionBadge={`Стена ${wall.construction.id}`}
      />
    </div>
  );
};
