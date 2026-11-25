/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 2: Теплотехнический расчет наружной стены
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { DecodedCipher } from '../logic/decodeCipher';
import { BUILDING_TYPES } from '../data/buildingTypes';
import {
  VAPOR_BARRIER_MATERIALS,
  WALL_VB_PLACEMENTS,
  DEFAULT_CUSTOM_VAPOR_BARRIER,
  CustomVaporBarrierParams,
  WallVaporBarrierPlacement,
  getVaporBarrierById,
  getWallPlacementOption,
  resolveVaporBarrier,
} from '../data/vaporBarriers';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calculator,
  ShieldCheck,
  Sliders,
  RotateCcw,
} from 'lucide-react';
import { CrossSectionTable } from './CrossSectionTable';
import { NormativeWarningBanner } from './NormativeWarningBanner';

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

  const wallVbCfg = cipher.overrides?.wallVaporBarrier;
  const selectedVbId = wallVbCfg?.materialId ?? 'none';
  const isCustomVb = selectedVbId === 'custom';
  const selectedVbMat = getVaporBarrierById(selectedVbId);
  const customVbParams: CustomVaporBarrierParams = {
    ...DEFAULT_CUSTOM_VAPOR_BARRIER,
    ...(wallVbCfg?.custom || {}),
  };
  const selectedVbThickness = isCustomVb
    ? wallVbCfg?.thicknessMm ?? customVbParams.thicknessMm
    : wallVbCfg?.thicknessMm ?? selectedVbMat.defaultThicknessMm;
  const selectedPlacement: WallVaporBarrierPlacement =
    (wallVbCfg?.placement as WallVaporBarrierPlacement) ?? 'before_insulation';
  const placementOpt = getWallPlacementOption(selectedPlacement);
  const resolvedVb = resolveVaporBarrier(wallVbCfg);
  const previewVbRp = resolvedVb?.R_p ?? 0;

  const handleVaporBarrierMaterialChange = (materialId: string) => {
    if (materialId === 'none') {
      onChangeCipher({
        ...cipher,
        overrides: {
          ...cipher.overrides,
          wallVaporBarrier: undefined,
        },
      });
      return;
    }
    if (materialId === 'custom') {
      onChangeCipher({
        ...cipher,
        overrides: {
          ...cipher.overrides,
          wallVaporBarrier: {
            materialId: 'custom',
            thicknessMm: customVbParams.thicknessMm,
            placement: selectedPlacement,
            custom: customVbParams,
          },
        },
      });
      return;
    }
    const mat = getVaporBarrierById(materialId);
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        wallVaporBarrier: {
          materialId,
          thicknessMm: mat.defaultThicknessMm,
          placement: selectedPlacement,
        },
      },
    });
  };

  const handleVaporBarrierThicknessChange = (val: string) => {
    const num = parseFloat(val);
    if (Number.isNaN(num) || num < 0) return;
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        wallVaporBarrier: {
          ...wallVbCfg,
          materialId: selectedVbId,
          thicknessMm: num,
          placement: selectedPlacement,
          custom: isCustomVb ? { ...customVbParams, thicknessMm: num } : wallVbCfg?.custom,
        },
      },
    });
  };

  const handlePlacementChange = (placement: WallVaporBarrierPlacement) => {
    if (selectedVbId === 'none') return;
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        wallVaporBarrier: {
          ...wallVbCfg,
          materialId: selectedVbId,
          thicknessMm: selectedVbThickness,
          placement,
          custom: isCustomVb ? customVbParams : wallVbCfg?.custom,
        },
      },
    });
  };

  const handleCustomVbFieldChange = (patch: Partial<CustomVaporBarrierParams>) => {
    const nextCustom: CustomVaporBarrierParams = {
      ...customVbParams,
      ...patch,
    };
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        wallVaporBarrier: {
          materialId: 'custom',
          thicknessMm: nextCustom.thicknessMm,
          placement: selectedPlacement,
          custom: nextCustom,
        },
      },
    });
  };

  const handleResetVaporBarrier = () => {
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        wallVaporBarrier: undefined,
      },
    });
  };

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

        {/* 4 ключевые сводные метрики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
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
        </div>
      </div>

      <NormativeWarningBanner
        variant="section"
        check={wallCheck}
        onOpenOverridesEditor={onOpenOverridesEditor}
      />

      {/* Панель выбора пароизоляции наружной стены (СП 2.04.01-2020 п. 10.6, Приложение Н + свой материал) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Пароизоляция наружной стены (СП 2.04.01-2020 п. 10.6 — с теплой стороны перед утеплителем)
              </h3>
              <p className="text-xs text-slate-400">
                Выберите материал из Приложения Н или добавьте свою пароизоляцию, настройте расположение — таблица температур и давлений ниже перестроится автоматически
              </p>
            </div>
          </div>
          {selectedVbId !== 'none' && (
            <button
              type="button"
              onClick={handleResetVaporBarrier}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Убрать пароизоляцию</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Материал пароизоляции (Приложение Н / Свой)
            </label>
            <select
              aria-label="Материал пароизоляции стены"
              value={selectedVbId}
              onChange={(e) => handleVaporBarrierMaterialChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {VAPOR_BARRIER_MATERIALS.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name}
                  {mat.id !== 'none' ? ` (баз. δ=${mat.baseThicknessMm} мм, Rп=${mat.baseRp})` : ''}
                </option>
              ))}
              <option value="custom">+ Своя пароизоляция (ввести параметры вручную)</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Расположение в конструкции стены
            </label>
            <select
              aria-label="Расположение пароизоляции стены"
              disabled={selectedVbId === 'none'}
              value={selectedPlacement}
              onChange={(e) => handlePlacementChange(e.target.value as WallVaporBarrierPlacement)}
              className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {WALL_VB_PLACEMENTS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              δ, мм
            </label>
            <input
              aria-label="Толщина пароизоляции стены, мм"
              type="number"
              step="0.05"
              min="0"
              disabled={selectedVbId === 'none'}
              value={selectedVbId === 'none' ? 0 : selectedVbThickness}
              onChange={(e) => handleVaporBarrierThicknessChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 disabled:opacity-50 rounded-lg px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="md:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[11px] text-slate-400 block">Rп пароиз.:</span>
            <div className="text-sm font-bold font-mono text-cyan-400">
              {previewVbRp.toFixed(3)}
            </div>
            <span className="text-[10px] text-slate-500 block">
              ΣRп стены: {wall.total_R_p}
            </span>
          </div>
        </div>

        {/* Редактор пользовательской пароизоляции */}
        {isCustomVb && (
          <div className="bg-cyan-950/25 border border-cyan-500/40 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-cyan-200">
                Параметры своей пароизоляции (автоматически передаются в расчет, отчет и Excel)
              </span>
              <div className="inline-flex rounded-lg bg-slate-950 border border-slate-700 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleCustomVbFieldChange({ inputMode: 'rp' })}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                    (customVbParams.inputMode ?? 'rp') === 'rp'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Задать Rп
                </button>
                <button
                  type="button"
                  onClick={() => handleCustomVbFieldChange({ inputMode: 'mu' })}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                    customVbParams.inputMode === 'mu'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Задать μ
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Наименование материала</label>
                <input
                  aria-label="Наименование своей пароизоляции стены"
                  type="text"
                  value={customVbParams.name}
                  onChange={(e) => handleCustomVbFieldChange({ name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {(customVbParams.inputMode ?? 'rp') === 'rp' ? (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Rп, м²·ч·Па/мг</label>
                  <input
                    aria-label="Rп своей пароизоляции стены"
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={customVbParams.R_p ?? 5.0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v) && v >= 0) handleCustomVbFieldChange({ R_p: v });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">μ, мг/(м·ч·Па)</label>
                  <input
                    aria-label="μ своей пароизоляции стены"
                    type="number"
                    step="0.0001"
                    min="0.00001"
                    value={customVbParams.mu ?? 0.0002}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v) && v > 0) handleCustomVbFieldChange({ mu: v });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">λ, Вт/(м·°C)</label>
                <input
                  aria-label="λ своей пароизоляции стены"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customVbParams.lambda ?? 0.2}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v) && v > 0) handleCustomVbFieldChange({ lambda: v });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">s, Вт/(м²·°C)</label>
                <input
                  aria-label="s своей пароизоляции стены"
                  type="number"
                  step="0.1"
                  min="0"
                  value={customVbParams.s ?? 3.5}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v) && v >= 0) handleCustomVbFieldChange({ s: v });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">ρ, кг/м³</label>
                <input
                  aria-label="ρ своей пароизоляции стены"
                  type="number"
                  step="50"
                  min="0"
                  value={customVbParams.density ?? 1000}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v) && v >= 0) handleCustomVbFieldChange({ density: v });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Подсказка о нормативном расположении */}
        {selectedVbId !== 'none' && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs border ${
              placementOpt.isNormative
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : 'bg-amber-950/30 border-amber-700/60 text-amber-200'
            }`}
          >
            <span className="font-semibold">
              {placementOpt.isNormative ? '✓ Нормативное положение: ' : '⚠ Нестандартное положение: '}
            </span>
            <span>{placementOpt.note}</span>
          </div>
        )}
      </div>

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
