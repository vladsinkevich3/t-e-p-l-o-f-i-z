/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Универсальный редактор выбора пароизоляции и мгновенного редактирования всех ее параметров
 * (для стены, покрытия и перекрытия над техподпольем)
 */

import React from 'react';
import { ShieldCheck, RotateCcw, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import {
  VAPOR_BARRIER_MATERIALS,
  VaporBarrierPlacementOption,
  CustomVaporBarrierParams,
  DEFAULT_CUSTOM_VAPOR_BARRIER,
  getVaporBarrierById,
  getEditableVaporBarrierParams,
  calculateVaporBarrierRp,
} from '../data/vaporBarriers';
import { VaporBarrierConfig } from '../logic/decodeCipher';
import { AppliedVaporBarrierInfo } from '../logic/calculations';

interface VaporBarrierEditorProps<P extends string> {
  title: string;
  subtitle?: string;
  /** Текущая конфигурация из cipher.overrides (undefined = авто для покрытия или нет для стены/ПТП) */
  config: VaporBarrierConfig | undefined;
  /** Фактически примененная пароизоляция из результата расчета */
  applied: AppliedVaporBarrierInfo | null;
  /** Поддерживает ли конструкция автоподбор (для покрытия = true) */
  supportAuto?: boolean;
  /** Текущее суммарное Rп конструкции, м²·ч·Па/мг */
  totalRp: number;
  /** Дополнительная подпись к Rп (например, по пустоте/ребру) */
  totalRpNote?: string;
  /** Список допустимых позиций расположения пароизоляции */
  placements: VaporBarrierPlacementOption<P>[];
  /** Позиция по умолчанию */
  defaultPlacement: P;
  /** Коллбек обновления VaporBarrierConfig (undefined = сбросить к авто / убрать) */
  onChange: (next: VaporBarrierConfig | undefined) => void;
  /** Акцентный цвет секции */
  accent?: 'cyan' | 'emerald' | 'indigo';
  /** Уникальный префикс для тестовых атрибутов и id */
  testIdPrefix: string;
}

export function VaporBarrierEditor<P extends string>({
  title,
  subtitle,
  config,
  applied,
  supportAuto = false,
  totalRp,
  totalRpNote,
  placements,
  defaultPlacement,
  onChange,
  accent = 'cyan',
  testIdPrefix,
}: VaporBarrierEditorProps<P>) {
  const isAutoMode = supportAuto && config === undefined;
  const selectedId = isAutoMode ? 'auto' : (config?.materialId ?? 'none');
  const activePlacement = (config?.placement ?? applied?.placement ?? defaultPlacement) as P;
  const placementOpt = placements.find((p) => p.id === activePlacement) ?? placements[0];

  // Есть ли активный слой пароизоляции, параметры которого можно сразу редактировать
  const hasActiveBarrier =
    selectedId !== 'none' && (!isAutoMode || Boolean(applied));

  // Эффективные параметры для полей ввода (работает и для каталога, и для custom, и для автоподбора!)
  const effectiveConfigForParams: VaporBarrierConfig | undefined =
    isAutoMode && applied
      ? {
          materialId: applied.materialId,
          thicknessMm: applied.thicknessMm,
          placement: activePlacement as VaporBarrierConfig['placement'],
        }
      : config;

  const editable: CustomVaporBarrierParams = hasActiveBarrier
    ? getEditableVaporBarrierParams(effectiveConfigForParams)
    : { ...DEFAULT_CUSTOM_VAPOR_BARRIER };

  const currentMode: 'rp' | 'mu' = editable.inputMode ?? 'rp';
  const currentThkMm = editable.thicknessMm ?? 1.0;
  const currentRp = editable.R_p ?? 0;
  const currentMu = editable.mu ?? 0;
  const currentLambda = editable.lambda ?? 0.2;
  const currentS = editable.s ?? 3.5;
  const currentDensity = editable.density ?? 1000;
  const currentName = editable.name ?? '';

  const isCatalogMaterial =
    hasActiveBarrier &&
    (isAutoMode ? Boolean(applied && applied.materialId !== 'custom') : selectedId !== 'custom');
  const catalogMatId = isAutoMode ? (applied?.materialId ?? 'pe_film_1') : selectedId;
  const catalogMat = isCatalogMaterial ? getVaporBarrierById(catalogMatId) : null;

  const handleSelectMaterial = (newId: string) => {
    if (newId === 'auto' && supportAuto) {
      onChange(undefined);
      return;
    }
    if (newId === 'none') {
      if (supportAuto) {
        onChange({ materialId: 'none', thicknessMm: 0, placement: activePlacement as VaporBarrierConfig['placement'] });
      } else {
        onChange(undefined);
      }
      return;
    }
    if (newId === 'custom') {
      const base = applied
        ? {
            name: applied.name,
            thicknessMm: applied.thicknessMm,
            inputMode: 'rp' as const,
            R_p: applied.R_p,
            mu: applied.mu ?? (applied.R_p > 0 ? +(applied.thicknessMm / 1000 / applied.R_p).toFixed(7) : 0.0002),
            lambda: applied.lambda ?? 0.2,
            s: applied.s ?? 3.5,
            density: applied.density ?? 1000,
          }
        : { ...DEFAULT_CUSTOM_VAPOR_BARRIER };
      onChange({
        materialId: 'custom',
        thicknessMm: base.thicknessMm,
        placement: activePlacement as VaporBarrierConfig['placement'],
        custom: base,
      });
      return;
    }

    const mat = getVaporBarrierById(newId);
    const thkM = mat.defaultThicknessMm / 1000;
    const baseMu = mat.baseRp > 0 ? +(thkM / mat.baseRp).toFixed(7) : 0;
    onChange({
      materialId: mat.id,
      thicknessMm: mat.defaultThicknessMm,
      placement: activePlacement as VaporBarrierConfig['placement'],
      custom: {
        name: mat.name,
        thicknessMm: mat.defaultThicknessMm,
        inputMode: 'rp',
        R_p: mat.baseRp,
        mu: baseMu,
        lambda: mat.lambda,
        s: mat.s,
        density: mat.density,
      },
    });
  };

  const handlePlacementChange = (newPlacement: P) => {
    if (isAutoMode) {
      if (applied) {
        onChange({
          materialId: applied.materialId,
          thicknessMm: applied.thicknessMm,
          placement: newPlacement as VaporBarrierConfig['placement'],
          custom: { ...editable },
        });
      }
      return;
    }
    if (!config || selectedId === 'none') return;
    onChange({
      ...config,
      placement: newPlacement as VaporBarrierConfig['placement'],
    });
  };

  const commitParamsPatch = (patch: Partial<CustomVaporBarrierParams>, nextThicknessMm?: number) => {
    const targetMatId = isAutoMode ? (applied?.materialId ?? 'pe_film_1') : selectedId;
    if (!targetMatId || targetMatId === 'none') return;

    const merged: CustomVaporBarrierParams = {
      ...editable,
      ...patch,
    };
    const effThk = nextThicknessMm !== undefined ? nextThicknessMm : merged.thicknessMm;
    merged.thicknessMm = effThk;

    onChange({
      materialId: targetMatId,
      thicknessMm: effThk,
      placement: activePlacement as VaporBarrierConfig['placement'],
      custom: merged,
    });
  };

  const handleThicknessChange = (rawVal: string) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) return;
    const thkM = val / 1000;
    // Если режим 'mu' — пересчитываем Rп по μ; если это каталожный материал с неизмененным базовым Rп — масштабируем пропорционально δ
    if (currentMode === 'mu') {
      const nextRp = currentMu > 0 && val > 0 ? +(thkM / currentMu).toFixed(3) : 0;
      commitParamsPatch({ thicknessMm: val, R_p: nextRp }, val);
      return;
    }
    if (catalogMat && catalogMat.id !== 'none') {
      const prevScaledRp = calculateVaporBarrierRp(catalogMat.id, currentThkMm);
      const wasDefaultRp = Math.abs(currentRp - prevScaledRp) <= 0.01;
      if (wasDefaultRp) {
        const nextScaledRp = calculateVaporBarrierRp(catalogMat.id, val);
        const nextMu = nextScaledRp > 0 && val > 0 ? +(thkM / nextScaledRp).toFixed(7) : 0;
        commitParamsPatch({ thicknessMm: val, R_p: nextScaledRp, mu: nextMu }, val);
        return;
      }
    }
    const nextMu = currentRp > 0 && val > 0 ? +(thkM / currentRp).toFixed(7) : 0;
    commitParamsPatch({ thicknessMm: val, mu: nextMu }, val);
  };

  const handleRpChange = (rawVal: string) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) return;
    const thkM = currentThkMm / 1000;
    const nextMu = val > 0 && thkM > 0 ? +(thkM / val).toFixed(7) : 0;
    commitParamsPatch({ inputMode: 'rp', R_p: val, mu: nextMu });
  };

  const handleMuChange = (rawVal: string) => {
    const val = parseFloat(rawVal);
    if (isNaN(val) || val < 0) return;
    const thkM = currentThkMm / 1000;
    const nextRp = val > 0 && thkM > 0 ? +(thkM / val).toFixed(3) : 0;
    commitParamsPatch({ inputMode: 'mu', mu: val, R_p: nextRp });
  };

  const handleResetCatalogDefaults = () => {
    if (!catalogMat || catalogMat.id === 'none') return;
    const thkM = catalogMat.defaultThicknessMm / 1000;
    onChange({
      materialId: catalogMat.id,
      thicknessMm: catalogMat.defaultThicknessMm,
      placement: activePlacement as VaporBarrierConfig['placement'],
      custom: {
        name: catalogMat.name,
        thicknessMm: catalogMat.defaultThicknessMm,
        inputMode: 'rp',
        R_p: catalogMat.baseRp,
        mu: catalogMat.baseRp > 0 ? +(thkM / catalogMat.baseRp).toFixed(7) : 0,
        lambda: catalogMat.lambda,
        s: catalogMat.s,
        density: catalogMat.density,
      },
    });
  };

  const accentBadge =
    accent === 'emerald'
      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
      : accent === 'indigo'
      ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
      : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300';

  const rThermalPreview =
    currentLambda > 0 && currentThkMm > 0
      ? (currentThkMm / 1000 / currentLambda).toFixed(4)
      : '0.0000';

  return (
    <div
      data-testid={`${testIdPrefix}-vb-editor`}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4"
    >
      {/* Шапка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{title}</span>
          </h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span
            data-testid={`${testIdPrefix}-total-rp-badge`}
            className={`px-2.5 py-1 rounded-lg border font-semibold ${accentBadge}`}
          >
            ΣRп = {totalRp.toFixed(2)} м²·ч·Па/мг
          </span>
          {totalRpNote && (
            <span className="text-[11px] text-slate-400 font-sans">{totalRpNote}</span>
          )}
          {applied && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
              Rп.пи = {applied.R_p.toFixed(3)}
              {applied.isAuto ? ' (авто)' : applied.isCustom ? ' (изменено)' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Верхняя строка выбора материала и расположения */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
        <div className="lg:col-span-6 space-y-1">
          <label
            htmlFor={`${testIdPrefix}-vb-select`}
            className="text-[11px] text-slate-400 block"
          >
            Материал пароизоляции (Приложение Н Шибеко / ТУ BY / своя):
          </label>
          <select
            id={`${testIdPrefix}-vb-select`}
            data-testid={`${testIdPrefix}-vb-select`}
            value={selectedId}
            onChange={(e) => handleSelectMaterial(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none cursor-pointer"
          >
            {supportAuto && (
              <option value="auto">Автоподбор (по условию конденсации, СП 2.04.01)</option>
            )}
            {VAPOR_BARRIER_MATERIALS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === 'none'
                  ? m.name
                  : `${m.name} — δ=${m.baseThicknessMm} мм, Rп=${m.baseRp}`}
              </option>
            ))}
            <option value="custom">★ Своя пароизоляция (полный ручной ввод)</option>
          </select>
        </div>

        <div className="lg:col-span-4 space-y-1">
          <label
            htmlFor={`${testIdPrefix}-vb-placement`}
            className="text-[11px] text-slate-400 block"
          >
            Расположение в конструкции (СП 2.04.01-2020 п. 10.6):
          </label>
          <select
            id={`${testIdPrefix}-vb-placement`}
            data-testid={`${testIdPrefix}-vb-placement`}
            value={activePlacement}
            disabled={!hasActiveBarrier}
            onChange={(e) => handlePlacementChange(e.target.value as P)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:border-cyan-500 outline-none cursor-pointer disabled:opacity-40"
          >
            {placements.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2 flex items-center gap-1.5">
          {supportAuto && !isAutoMode ? (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer flex items-center justify-center gap-1"
              title="Вернуться к автоподбору пароизоляции"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Авто</span>
            </button>
          ) : !supportAuto && hasActiveBarrier ? (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="w-full px-3 py-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs transition cursor-pointer"
            >
              Убрать ПИ
            </button>
          ) : (
            <div className="w-full px-2.5 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-500 text-center">
              {isAutoMode ? (applied ? 'Автоактивна' : 'Не требуется') : 'Не выбрана'}
            </div>
          )}
        </div>
      </div>

      {/* СРАЗУ ОТКРЫТЫЙ БЛОК РЕДАКТИРОВАНИЯ ВСЕХ ПАРАМЕТРОВ ПРИ ВЫБОРЕ ЛЮБОЙ ПАРОИЗОЛЯЦИИ */}
      {hasActiveBarrier && (
        <div
          data-testid={`${testIdPrefix}-vb-params-panel`}
          className="rounded-xl bg-slate-950/80 border border-cyan-500/35 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                Параметры выбранной пароизоляции — все значения доступны для немедленной правки:
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCatalogMaterial && catalogMat && applied?.isCustom && (
                <button
                  type="button"
                  onClick={handleResetCatalogDefaults}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer transition"
                  title="Вернуть паспортные значения из Приложения Н"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Сбросить к Прил. Н</span>
                </button>
              )}
              <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px]">
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-vb-mode-rp`}
                  onClick={() => commitParamsPatch({ inputMode: 'rp' })}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                    currentMode === 'rp'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Задать Rп
                </button>
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-vb-mode-mu`}
                  onClick={() => commitParamsPatch({ inputMode: 'mu' })}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition ${
                    currentMode === 'mu'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Задать μ
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="text-[11px] text-slate-400 block mb-1">
                Наименование пароизоляции:
              </label>
              <input
                type="text"
                data-testid={`${testIdPrefix}-vb-name`}
                value={currentName}
                onChange={(e) => commitParamsPatch({ name: e.target.value })}
                placeholder="Наименование материала..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Толщина δ, мм:
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                data-testid={`${testIdPrefix}-vb-thickness`}
                value={currentThkMm}
                onChange={(e) => handleThicknessChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 outline-none"
              />
            </div>

            {currentMode === 'rp' ? (
              <div>
                <label className="text-[11px] text-cyan-300 font-semibold block mb-1">
                  Rп, м²·ч·Па/мг:
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="500"
                  data-testid={`${testIdPrefix}-vb-rp`}
                  value={currentRp}
                  onChange={(e) => handleRpChange(e.target.value)}
                  className="w-full bg-slate-900 border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-200 font-semibold focus:border-cyan-400 outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-cyan-300 font-semibold block mb-1">
                  μ, мг/(м·ч·Па):
                </label>
                <input
                  type="number"
                  step="0.00001"
                  min="0.000001"
                  max="1"
                  data-testid={`${testIdPrefix}-vb-mu`}
                  value={currentMu}
                  onChange={(e) => handleMuChange(e.target.value)}
                  className="w-full bg-slate-900 border border-cyan-500/60 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-200 font-semibold focus:border-cyan-400 outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                λ, Вт/(м·°C):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                data-testid={`${testIdPrefix}-vb-lambda`}
                value={currentLambda}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) commitParamsPatch({ lambda: val });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  s, Вт/м²·°C:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  data-testid={`${testIdPrefix}-vb-s`}
                  value={currentS}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) commitParamsPatch({ s: val });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  ρ, кг/м³:
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  max="10000"
                  data-testid={`${testIdPrefix}-vb-density`}
                  value={currentDensity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) commitParamsPatch({ density: val });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono">
              <span>
                Rп.пи = <b className="text-cyan-300">{currentRp.toFixed(3)}</b> м²·ч·Па/мг
              </span>
              <span>
                μ = δ / Rп = <b className="text-slate-200">{currentMu > 0 ? currentMu.toFixed(6) : '—'}</b> мг/(м·ч·Па)
              </span>
              <span>
                Rпи = δ / λ = <b className="text-slate-200">{rThermalPreview}</b> м²·°C/Вт
              </span>
            </div>
            <span className="text-slate-500">
              {placementOpt?.note}
            </span>
          </div>

          {!placementOpt?.isNormative && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-950/35 border border-amber-500/35 px-3 py-2 text-[11px] text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Ненормативное расположение пароизоляции: по СП 2.04.01-2020 п. 10.6 рекомендуется устанавливать с теплой стороны перед утеплителем. Проверьте таблицу и график на отсутствие зоны конденсации!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
