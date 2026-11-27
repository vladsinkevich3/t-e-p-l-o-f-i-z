/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 4: Теплотехнический расчет технического подполья (ПТП)
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { DecodedCipher, CustomPipeSectionOverride } from '../logic/decodeCipher';
import { APPENDIX_O_DIAMETERS_MM } from '../data/normative';
import { BASEMENT_VB_PLACEMENTS } from '../data/vaporBarriers';
import {
  CheckCircle2,
  AlertTriangle,
  Flame,
  Droplets,
  Layers,
  Plus,
  Trash2,
  RotateCcw,
  Calculator,
} from 'lucide-react';
import { CrossSectionTable } from './CrossSectionTable';
import { NormativeWarningBanner } from './NormativeWarningBanner';
import { VaporBarrierEditor } from './VaporBarrierEditor';

interface BasementCalculatorProps {
  calc: FullCourseworkCalculation;
  cipher?: DecodedCipher;
  onChangeCipher?: (newCipher: DecodedCipher) => void;
  onOpenOverridesEditor?: () => void;
}

const STANDARD_TEMPS_C = [50, 60, 70, 80, 90, 95, 100, 105];

export const BasementCalculator: React.FC<BasementCalculatorProps> = ({
  calc,
  cipher,
  onChangeCipher,
  onOpenOverridesEditor,
}) => {
  const { basement, internalConditions, climate } = calc;
  const basementCheck = calc.normativeChecks.find((c) => c.id === 'basement');
  const alphaVFloor = cipher?.overrides?.alpha_v_basement ?? 8.7;
  const alphaNCrawl = cipher?.overrides?.alpha_n_basement ?? 17;
  const baseInsLambda =
    cipher?.overrides?.basementInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? basement.insulation.lambda_A
      : basement.insulation.lambda_B);
  const baseSumRLayers = +basement.layers.reduce((sum, l) => sum + l.R, 0).toFixed(3);
  const baseSumDLayers = +basement.layers.reduce((sum, l) => sum + l.D, 0).toFixed(2);
  const baseSumRpLayers = +basement.layers.reduce((sum, l) => sum + l.R_p, 0).toFixed(3);

  const updatePipesList = (nextPipes: CustomPipeSectionOverride[] | undefined) => {
    if (!cipher || !onChangeCipher) return;
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        crawlSpacePipes: {
          ...cipher.overrides?.crawlSpacePipes,
          customPipes: nextPipes,
        },
      },
    });
  };

  const getCurrentPipesForEdit = (): CustomPipeSectionOverride[] =>
    basement.pipesDetails.map((p) => ({
      temp: p.temp,
      dy: p.dy,
      length: p.length,
    }));

  const handlePipeFieldChange = (
    idx: number,
    field: 'temp' | 'dy' | 'length',
    rawValue: number
  ) => {
    const list = getCurrentPipesForEdit();
    if (!list[idx]) return;
    list[idx] = {
      ...list[idx],
      [field]: isNaN(rawValue) ? 0 : rawValue,
    };
    updatePipesList(list);
  };

  const handleAddPipeSection = () => {
    const list = getCurrentPipesForEdit();
    const last = list[list.length - 1] || { temp: 70, dy: 25, length: 10 };
    list.push({
      temp: last.temp,
      dy: last.dy,
      length: 10,
    });
    updatePipesList(list);
  };

  const handleRemovePipeSection = (idx: number) => {
    const list = getCurrentPipesForEdit();
    if (list.length <= 1) return;
    list.splice(idx, 1);
    updatePipesList(list);
  };

  const handleResetVariantPipes = () => {
    if (!cipher || !onChangeCipher) return;
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        crawlSpacePipes: {
          ...cipher.overrides?.crawlSpacePipes,
          pipe1_temp: undefined,
          pipe1_dy: undefined,
          pipe1_length: undefined,
          pipe2_temp: undefined,
          pipe2_dy: undefined,
          pipe2_length: undefined,
          pipe3_temp: undefined,
          pipe3_dy: undefined,
          pipe3_length: undefined,
          customPipes: undefined,
        },
      },
    });
  };

  const hasCustomPipes = Boolean(cipher?.overrides?.crawlSpacePipes?.customPipes);

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

        {/* 5 ключевых метрик техподполья (включая Rп) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
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
              Участков: {basement.pipesDetails.length} (Прил. О Шибеко)
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/35 col-span-2 lg:col-span-1">
            <span className="text-xs text-slate-400 block">Паропроницание Rп.ПТП</span>
            <div
              data-testid="basement-summary-rp"
              className="text-xl font-bold font-mono text-cyan-400 mt-1"
            >
              {basement.total_R_p.toFixed(2)} <span className="text-xs font-sans text-slate-400">м²·ч·Па/мг</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono block mt-1">
              {basement.vaporBarrier
                ? `в т.ч. ПИ: ${basement.vaporBarrier.R_p.toFixed(2)}`
                : 'без доп. ПИ'}
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
              Eп({basement.crawlSpaceTemp_t_p}°) = {basement.E_p} Па → eп = ({basement.crawlSpaceRH}%/100)·Eп = <span className="font-mono text-teal-300 font-semibold">{basement.e_p} Па</span>.
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

      {/* Интерактивная таблица трубопроводов в техническом подполье */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>
                Тепловыделения трубопроводов инженерных сетей в подполье (Табл. 1.6 и Прил. О Шибеко)
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Вы можете добавлять, удалять и редактировать любое количество участков трубопроводов (tт, dу, lᵢ). Линейная плотность теплового потока qᵢ⁵ определяется автоматически по Приложению О (А. С. Шибеко 2018, стр. 108).
            </p>
          </div>

          {cipher && onChangeCipher && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddPipeSection}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить участок</span>
              </button>
              {hasCustomPipes && (
                <button
                  type="button"
                  onClick={handleResetVariantPipes}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить по варианту ({basement.construction.id})</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Температура теплоносителя tт (°C)</th>
                <th className="py-2.5 px-3">Условный диаметр dу (мм)</th>
                <th className="py-2.5 px-3">Длина участка lᵢ (м)</th>
                <th className="py-2.5 px-3">Погонные теплопотери qᵢ⁵ (Вт/м)</th>
                <th className="py-2.5 px-3">Тепловой поток Qᵢ = qᵢ⁵·lᵢ (Вт)</th>
                {cipher && onChangeCipher && <th className="py-2.5 px-3 text-right">Действие</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {basement.pipesDetails.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    {cipher && onChangeCipher ? (
                      <div className="flex items-center space-x-1.5">
                        <select
                          aria-label={`Температура участка ${idx + 1}`}
                          value={STANDARD_TEMPS_C.includes(p.temp) ? p.temp : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              handlePipeFieldChange(idx, 'temp', Number(e.target.value));
                            }
                          }}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-bold text-xs focus:border-teal-500 focus:outline-none"
                        >
                          {STANDARD_TEMPS_C.map((tVal) => (
                            <option key={tVal} value={tVal}>
                              {tVal} °C
                            </option>
                          ))}
                          {!STANDARD_TEMPS_C.includes(p.temp) && (
                            <option value="custom">{p.temp} °C</option>
                          )}
                        </select>
                        <input
                          type="number"
                          step="1"
                          min="20"
                          max="150"
                          aria-label={`Ввод температуры участка ${idx + 1}`}
                          value={p.temp}
                          onChange={(e) =>
                            handlePipeFieldChange(idx, 'temp', parseFloat(e.target.value))
                          }
                          className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-amber-300 font-bold text-xs focus:border-teal-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <span className="text-amber-300 font-bold">{p.temp} °C</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {cipher && onChangeCipher ? (
                      <select
                        aria-label={`Диаметр участка ${idx + 1}`}
                        value={p.dy}
                        onChange={(e) =>
                          handlePipeFieldChange(idx, 'dy', Number(e.target.value))
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs focus:border-teal-500 focus:outline-none"
                      >
                        {APPENDIX_O_DIAMETERS_MM.map((dVal) => (
                          <option key={dVal} value={dVal}>
                            dу {dVal} мм
                          </option>
                        ))}
                        {!APPENDIX_O_DIAMETERS_MM.includes(
                          p.dy as (typeof APPENDIX_O_DIAMETERS_MM)[number]
                        ) && <option value={p.dy}>dу {p.dy} мм</option>}
                      </select>
                    ) : (
                      <span className="text-white">Dy {p.dy}</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {cipher && onChangeCipher ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          aria-label={`Длина участка ${idx + 1}`}
                          value={p.length}
                          onChange={(e) =>
                            handlePipeFieldChange(idx, 'length', parseFloat(e.target.value))
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-blue-300 font-semibold text-xs focus:border-teal-500 focus:outline-none"
                        />
                        <span className="text-slate-400">м</span>
                      </div>
                    ) : (
                      <span className="text-blue-300">{p.length} м</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{p.q_heat_loss} Вт/м</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{p.q_total.toFixed(1)} Вт</td>
                  {cipher && onChangeCipher && (
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        disabled={basement.pipesDetails.length <= 1}
                        onClick={() => handleRemovePipeSection(idx)}
                        title="Удалить участок"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 disabled:opacity-30 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="bg-slate-950/80 font-bold border-t-2 border-slate-700">
                <td colSpan={5} className="py-2.5 px-3 font-sans text-white">
                  Суммарные тепловыделения от труб в воздух подполья Σ(qᵢ⁵·lᵢ):
                </td>
                <td className="py-2.5 px-3 text-amber-400">
                  {basement.pipeHeatGains_total.toFixed(1)} Вт
                </td>
                {cipher && onChangeCipher && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Пароизоляция перекрытия над техподпольем */}
      {cipher && onChangeCipher && (
        <VaporBarrierEditor
          title="Пароизоляция перекрытия над техподпольем (опционально — Приложение Н / свои параметры)"
          subtitle="При необходимости выберите пароизоляцию — все параметры (δ, Rп / μ, λ, s, ρ) сразу открываются для редактирования"
          config={cipher.overrides?.basementVaporBarrier}
          applied={basement.vaporBarrier}
          supportAuto={false}
          totalRp={basement.total_R_p}
          placements={BASEMENT_VB_PLACEMENTS}
          defaultPlacement="before_insulation"
          accent="indigo"
          testIdPrefix="basement"
          onChange={(next) =>
            onChangeCipher({
              ...cipher,
              overrides: {
                ...cipher.overrides,
                basementVaporBarrier: next,
              },
            })
          }
        />
      )}

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
                <th className="py-2.5 px-3">Rп (м²·ч·Па/мг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {basement.layers.map((l, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/30 transition ${
                    l.isVaporBarrier ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-sans text-white font-medium">{l.name}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{l.materialName}</td>
                  <td className="py-2 px-3 text-blue-300">
                    {l.thickness * 1000 < 10
                      ? +(l.thickness * 1000).toFixed(2)
                      : Math.round(l.thickness * 1000)}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{l.lambda}</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{l.R.toFixed(3)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.s}</td>
                  <td className="py-2 px-3 text-amber-400">{l.D.toFixed(2)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.mu}</td>
                  <td className="py-2 px-3 text-cyan-300">{l.R_p.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-800 bg-slate-950 font-mono font-bold text-slate-200">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 font-sans text-right">
                  Суммарно по перекрытию (с 1/37 и 1/77 для Rп):
                </td>
                <td className="py-2.5 px-3 text-white">
                  {Math.round(basement.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000)} мм
                </td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-emerald-400">{baseSumRLayers.toFixed(3)}</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-amber-400">{baseSumDLayers.toFixed(2)}</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-cyan-400">{basement.total_R_p.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Пошаговые формулы расчета перекрытия над техподпольем */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-teal-400" />
          <h3 className="text-base font-bold text-white">
            Формулы и этапы расчета перекрытия и теплового баланса техподполья
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              1. Подбор толщины утеплителя перекрытия δут и RПТП:
            </span>
            <div className="text-blue-300">
              δут.расч = (Rнорм.ПТП − Rбез_ут) × λут = ({basement.R_required} − {basement.R_without_insulation}) × {baseInsLambda} ={' '}
              <span className="font-bold text-white">{basement.delta_insulation_calc} м</span>
            </div>
            <div className="text-blue-300">
              RПТП = 1/αв + Σ(δᵢ/λᵢ) + 1/αн.п = 1/{alphaVFloor} + {baseSumRLayers} + 1/{alphaNCrawl} ={' '}
              <span className="font-bold text-white">{basement.R_ptp} м²·°С/Вт</span> ≥ {basement.R_required}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              2. Перепад на полу Δtв.п и температура поверхности пола τв.пол:
            </span>
            <div className="text-blue-300">
              Δtв.п = (tв − tп) / (RПТП · αв) = ({internalConditions.t_v} − {basement.crawlSpaceTemp_t_p}) / ({basement.R_ptp} · {alphaVFloor}) ={' '}
              <span className="font-bold text-white">{basement.delta_t_floor} °C</span> ≤ {basement.delta_t_floor_norm} °C
            </div>
            <div className="text-emerald-300">
              τв.пол = tв − Δtв.п = {internalConditions.t_v} − {basement.delta_t_floor} ={' '}
              <span className="font-bold text-white">{basement.tau_v_floor} °C</span>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              3. Проверка цокольной стены на конденсацию и теплопотери труб:
            </span>
            <div className="text-blue-300">
              τв.цок = tп − (tп − tн.от) / (Rцок · αн.п) = {basement.crawlSpaceTemp_t_p} − ({basement.crawlSpaceTemp_t_p} − ({climate.t_heating_period})) / (1,25 · {alphaNCrawl}) ={' '}
              <span className="font-bold text-white">{basement.tau_v_basement_wall} °C</span> &gt; tр.п ({basement.dew_point_basement} °C)
            </div>
            <div className="text-amber-300">
              ΣQтр = Σ(qᵢ⁵ · lᵢ) = <span className="font-bold text-white">{basement.pipeHeatGains_total.toFixed(1)} Вт</span> ({basement.pipesDetails.length} уч., Прил. О)
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              4. Сопротивление паропроницанию перекрытия Rп.ПТП и давление e(x):
            </span>
            <div className="text-cyan-300">
              Rп.ПТП = 1/37 + Σ(δᵢ/μᵢ){basement.vaporBarrier ? ' + Rп.пи' : ''} + 1/77 = 0,027 + {baseSumRpLayers} + 0,013 ={' '}
              <span className="font-bold text-white">{basement.total_R_p.toFixed(2)} м²·ч·Па/мг</span>
            </div>
            <div className="text-slate-300">
              e(x) = eв − ((eв − eп) / Rп.ПТП) · ΣRп = {internalConditions.e_v} − (({internalConditions.e_v} − {basement.e_p}) / {basement.total_R_p.toFixed(2)}) · ΣRп
            </div>
          </div>
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
