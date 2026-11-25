/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Калькулятор координат X,Y для автоматического построения графиков
 * тепловлажностного режима (t, E, e) в AutoCAD командой ПОЛИЛИНИЯ (PLINE)
 * с интерактивным предпросмотром, параметрами МАССИВПРЯМОУГ и пошаговой инструкцией.
 */

import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Compass,
  FileSpreadsheet,
  Layers,
  Info,
  Sliders,
  Grid,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { FullCourseworkCalculation } from '../logic/calculations';
import {
  AutoCadScaleSettings,
  DEFAULT_AUTOCAD_SETTINGS,
  buildAutoCadCoordinates,
  extractSurfaceProfilePoints,
} from '../logic/autocadExport';

interface AutoCadCalculatorProps {
  calc: FullCourseworkCalculation;
  onExportExcel?: () => void;
}

type AutoCadTarget = 'wall' | 'roof_void' | 'roof_worst';

const PRESETS: Array<{
  id: string;
  label: string;
  sublabel: string;
  settings: Required<AutoCadScaleSettings>;
}> = [
  {
    id: 'pdf_500',
    label: 'H = 500 мм (эталон)',
    sublabel: 't: -2..19 °C, E: 300..2200 Па',
    settings: { ...DEFAULT_AUTOCAD_SETTINGS },
  },
  {
    id: 'compact_210',
    label: 'H = 210 мм (1 см = 1°C / 100 Па)',
    sublabel: 't: -2..19 °C, E: 300..2400 Па',
    settings: {
      frameHeightMm: 210,
      tMin: -2,
      tMax: 19,
      eMin: 300,
      eMax: 2400,
      tTickStepDeg: 1,
      eTickStepPa: 100,
    },
  },
  {
    id: 'grid_25',
    label: 'Ровный шаг 25 мм (H = 500)',
    sublabel: 't: -2..18 °C, E: 300..2300 Па',
    settings: {
      frameHeightMm: 500,
      tMin: -2,
      tMax: 18,
      eMin: 300,
      eMax: 2300,
      tTickStepDeg: 1,
      eTickStepPa: 100,
    },
  },
];

async function copyTextSafe(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const AutoCadCalculator: React.FC<AutoCadCalculatorProps> = ({
  calc,
  onExportExcel,
}) => {
  const [target, setTarget] = useState<AutoCadTarget>('wall');
  const [settings, setSettings] = useState<Required<AutoCadScaleSettings>>({
    ...DEFAULT_AUTOCAD_SETTINGS,
  });
  const [copiedKey, setCopiedKey] = useState<'t' | 'E' | 'e' | null>(null);

  const { targetLabel, surfacePoints } = useMemo(() => {
    if (target === 'wall') {
      return {
        targetLabel: `Наружная стена ${calc.wall.construction.id}`,
        surfacePoints: extractSurfaceProfilePoints(calc.wall.crossSectionProfile),
      };
    }
    if (target === 'roof_void') {
      return {
        targetLabel: `Покрытие ${calc.roof.construction.id} (по пустоте плиты)`,
        surfacePoints: extractSurfaceProfilePoints(
          calc.roof.voidSection?.crossSectionProfile || calc.roof.crossSectionProfile
        ),
      };
    }
    return {
      targetLabel: `Покрытие ${calc.roof.construction.id} (по ребру плиты — худшее)`,
      surfacePoints: extractSurfaceProfilePoints(
        calc.roof.worstSection?.crossSectionProfile || calc.roof.crossSectionProfile
      ),
    };
  }, [target, calc]);

  const data = useMemo(
    () => buildAutoCadCoordinates(surfacePoints, settings),
    [surfacePoints, settings]
  );

  const handleCopy = async (key: 't' | 'E' | 'e') => {
    const text =
      key === 't'
        ? data.tPolylineCoords
        : key === 'E'
          ? data.eSatPolylineCoords
          : data.ePartPolylineCoords;
    const ok = await copyTextSafe(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
    }
  };

  const updateNumeric = (field: keyof AutoCadScaleSettings, raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    setSettings((prev) => ({ ...prev, [field]: parsed }));
  };

  const outOfRangePoints = useMemo(() => {
    const H = data.settings.frameHeightMm;
    return data.rows.filter(
      (r) => r.yT < 0 || r.yT > H || r.yE < 0 || r.yE > H || r.y_e < 0 || r.y_e > H
    ).length;
  }, [data]);

  // Параметры мини-предпросмотра SVG (масштаб 1:1 по пропорциям W × H)
  const svgW = 760;
  const svgH = 340;
  const pad = { top: 28, right: 64, bottom: 44, left: 60 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;
  const maxX = Math.max(1, data.frameWidthMm);
  const maxY = Math.max(1, data.settings.frameHeightMm);

  const sx = (xMm: number) => pad.left + (xMm / maxX) * plotW;
  const sy = (yMm: number) => pad.top + plotH - (yMm / maxY) * plotH;

  const polylinePath = (getter: (r: (typeof data.rows)[number]) => number) =>
    data.rows
      .map((r, i) => `${i === 0 ? 'M' : 'L'} ${sx(r.xMm).toFixed(1)} ${sy(getter(r)).toFixed(1)}`)
      .join(' ');

  return (
    <div className="space-y-6">
      {/* Заголовок и переключение конструкции */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Compass className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">
                Калькулятор координат для AutoCAD (ПОЛИЛИНИЯ / PLINE)
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 font-mono">
                {targetLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Автоматический пересчет температур t(x) и давлений пара E(x), e(x) в координаты X,Y для вставки прямо в командную строку AutoCAD и дублирование на листе Excel «AutoCAD_Графики».
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Скачать Excel (лист AutoCAD_Графики)</span>
              </button>
            )}

            <div className="flex flex-wrap p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1">
              <button
                onClick={() => setTarget('wall')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  target === 'wall'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Стена {calc.wall.construction.id}
              </button>
              <button
                onClick={() => setTarget('roof_void')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  target === 'roof_void'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Покрытие (пустота)
              </button>
              <button
                onClick={() => setTarget('roof_worst')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  target === 'roof_worst'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ★ Покрытие (ребро)
              </button>
            </div>
          </div>
        </div>

        {/* Пресеты масштаба и ручной ввод параметров рамки */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Быстрые пресеты масштаба чертежа (как в методичке):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const isSelected =
                  settings.frameHeightMm === preset.settings.frameHeightMm &&
                  settings.tMin === preset.settings.tMin &&
                  settings.tMax === preset.settings.tMax &&
                  settings.eMin === preset.settings.eMin &&
                  settings.eMax === preset.settings.eMax;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSettings({ ...preset.settings })}
                    className={`px-3 py-1.5 rounded-xl text-left border transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-semibold">{preset.label}</div>
                    <div className="text-[10px] text-slate-400">{preset.sublabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ввод параметров шкал */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">Высота рамки H (мм)</span>
              <input
                type="number"
                step="10"
                min="50"
                value={settings.frameHeightMm}
                onChange={(e) => updateNumeric('frameHeightMm', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">t min (°C)</span>
              <input
                type="number"
                step="1"
                value={settings.tMin}
                onChange={(e) => updateNumeric('tMin', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-rose-300 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">t max (°C)</span>
              <input
                type="number"
                step="1"
                value={settings.tMax}
                onChange={(e) => updateNumeric('tMax', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-rose-300 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">E, e min (Па)</span>
              <input
                type="number"
                step="50"
                value={settings.eMin}
                onChange={(e) => updateNumeric('eMin', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-sky-300 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">E, e max (Па)</span>
              <input
                type="number"
                step="50"
                value={settings.eMax}
                onChange={(e) => updateNumeric('eMax', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-sky-300 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">Шаг делений t (°C)</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={settings.tTickStepDeg}
                onChange={(e) => updateNumeric('tTickStepDeg', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">Шаг делений E (Па)</span>
              <input
                type="number"
                step="50"
                min="10"
                value={settings.eTickStepPa}
                onChange={(e) => updateNumeric('eTickStepPa', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </label>
          </div>

          {/* Предупреждение о выходе кривых за рамку */}
          {outOfRangePoints > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Внимание: {outOfRangePoints} точ. выходят за пределы рамки [0; {data.settings.frameHeightMm} мм]. Расширьте границы шкал t min/max или E min/max, чтобы графики полностью поместились внутри рамки.
              </span>
            </div>
          )}

          {/* Карточка параметров рамки и МАССИВПРЯМОУГ (ARRAYRECT) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-cyan-400" />
                <span>Габариты рамки графика (1:1 в мм)</span>
              </div>
              <div className="mt-1.5 text-base font-bold font-mono text-white">
                W = {data.frameWidthMm} мм × H = {data.settings.frameHeightMm} мм
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Левый нижний угол перенести в <span className="font-mono text-cyan-300 font-semibold">#0,0</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-rose-900/40 rounded-xl p-3.5">
              <div className="text-[11px] text-rose-300 font-semibold">
                МАССИВПРЯМОУГ — ось температур t (слева)
              </div>
              <div className="mt-1.5 text-sm font-mono text-white">
                Шаг (Между): <span className="text-rose-300 font-bold">{data.tTickSpacingMm} мм</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Столбцы: 1 | Строки: <span className="text-white font-semibold">{data.tTickCount}</span> (через {data.settings.tTickStepDeg} °C)
              </div>
            </div>

            <div className="bg-slate-950/80 border border-sky-900/40 rounded-xl p-3.5">
              <div className="text-[11px] text-sky-300 font-semibold">
                МАССИВПРЯМОУГ — ось давлений E, e (справа)
              </div>
              <div className="mt-1.5 text-sm font-mono text-white">
                Шаг (Между): <span className="text-sky-300 font-bold">{data.eTickSpacingMm} мм</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Столбцы: 1 | Строки: <span className="text-white font-semibold">{data.eTickCount}</span> (через {data.settings.eTickStepPa} Па)
              </div>
            </div>
          </div>
        </div>

        {/* Предпросмотр рамки AutoCAD (система координат #0,0) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 overflow-x-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
            <span>Предпросмотр геометрии в координатах AutoCAD (от #0,0 до {data.frameWidthMm},{data.settings.frameHeightMm})</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-3.5 h-0.5 bg-rose-500 inline-block" /> График_t
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-3.5 h-0.5 bg-sky-400 inline-block" /> График_E
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3.5 h-0.5 bg-amber-400 border-b border-dashed inline-block" /> График_e
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto min-w-[660px] select-none">
            {/* Рамка чертежа */}
            <rect
              x={pad.left}
              y={pad.top}
              width={plotW}
              height={plotH}
              fill="rgba(15, 23, 42, 0.75)"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Горизонтальные линии сетки (4 равных деления высоты H) */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const yPx = pad.top + plotH - frac * plotH;
              const tVal = data.settings.tMin + frac * (data.settings.tMax - data.settings.tMin);
              const eVal = data.settings.eMin + frac * (data.settings.eMax - data.settings.eMin);
              return (
                <g key={frac}>
                  <line
                    x1={pad.left}
                    y1={yPx}
                    x2={pad.left + plotW}
                    y2={yPx}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={pad.left - 8}
                    y={yPx + 3.5}
                    fill="#fb7185"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tVal.toFixed(1)}°
                  </text>
                  <text
                    x={pad.left + plotW + 8}
                    y={yPx + 3.5}
                    fill="#38bdf8"
                    fontSize="10"
                    textAnchor="start"
                    fontFamily="monospace"
                  >
                    {Math.round(eVal)}
                  </text>
                </g>
              );
            })}

            {/* Вертикальные границы слоев (X, мм) */}
            {data.rows.map((r, idx) => {
              const xPx = sx(r.xMm);
              const prevX = idx > 0 ? sx(data.rows[idx - 1].xMm) : -999;
              const nextX = idx < data.rows.length - 1 ? sx(data.rows[idx + 1].xMm) : 9999;
              const isEdgeOrMid = idx === 0 || idx === data.rows.length - 1 || Boolean(r.isMidpoint);
              const tooCloseToPrev = idx > 0 && xPx - prevX < 24;
              const tooCloseToLast =
                idx < data.rows.length - 1 && sx(data.rows[data.rows.length - 1].xMm) - xPx < 24;
              const tooCloseToNext = idx < data.rows.length - 1 && nextX - xPx < 24 && !isEdgeOrMid;
              const showLabel = isEdgeOrMid || (!tooCloseToPrev && !tooCloseToLast && !tooCloseToNext);
              return (
                <g key={`${r.index}-${r.xMm}`}>
                  <line
                    x1={xPx}
                    y1={pad.top}
                    x2={xPx}
                    y2={pad.top + plotH}
                    stroke={r.isMidpoint ? '#f59e0b' : '#334155'}
                    strokeWidth={r.isMidpoint ? '1.2' : '0.8'}
                    strokeDasharray={r.isMidpoint ? '3,3' : '2,2'}
                  />
                  {showLabel && (
                    <text
                      x={xPx}
                      y={pad.top + plotH + 16}
                      fill={r.isMidpoint ? '#fbbf24' : '#94a3b8'}
                      fontSize="9.5"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {r.xMm}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Полилинии t, E, e */}
            <path d={polylinePath((r) => r.yT)} fill="none" stroke="#f43f5e" strokeWidth="2.4" />
            <path d={polylinePath((r) => r.yE)} fill="none" stroke="#38bdf8" strokeWidth="2.4" />
            <path
              d={polylinePath((r) => r.y_e)}
              fill="none"
              stroke="#fb923c"
              strokeWidth="2.2"
              strokeDasharray="6,4"
            />

            {/* Узлы полилиний */}
            {data.rows.map((r) => (
              <g key={`pts-${r.index}`}>
                <circle cx={sx(r.xMm)} cy={sy(r.yT)} r="3.2" fill="#f43f5e" stroke="#0f172a" strokeWidth="1" />
                <circle cx={sx(r.xMm)} cy={sy(r.yE)} r="3.2" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
                <circle cx={sx(r.xMm)} cy={sy(r.y_e)} r="3.2" fill="#fb923c" stroke="#0f172a" strokeWidth="1" />
              </g>
            ))}

            {/* Маркер начала координат #0,0 */}
            <circle cx={pad.left} cy={pad.top + plotH} r="4.5" fill="#22d3ee" stroke="#0f172a" strokeWidth="1.5" />
            <text
              x={pad.left + 8}
              y={pad.top + plotH - 8}
              fill="#22d3ee"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              #0,0
            </text>

            <text x={pad.left - 8} y={16} fill="#fb7185" fontSize="10" textAnchor="end" fontWeight="bold">
              t, °C
            </text>
            <text x={pad.left + plotW + 8} y={16} fill="#38bdf8" fontSize="10" textAnchor="start" fontWeight="bold">
              E, e, Па
            </text>
            <text x={pad.left + plotW / 2} y={svgH - 8} fill="#94a3b8" fontSize="10.5" textAnchor="middle">
              Толщина конструкции X (мм) — масштаб 1:1
            </text>
          </svg>
        </div>

        {/* Кнопки копирования готовых списков координат для PLINE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleCopy('t')}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-700/50 text-rose-200 transition cursor-pointer"
          >
            <div className="text-left">
              <div className="text-xs font-bold">1. Копировать кривую t(x)</div>
              <div className="text-[11px] text-rose-300/80 font-mono">
                {data.rows.length} вершин для ПОЛИЛИНИЯ (PLINE)
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold">
              {copiedKey === 't' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 't' ? 'Скопировано' : 'Копировать'}
            </span>
          </button>

          <button
            onClick={() => handleCopy('E')}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-sky-950/40 hover:bg-sky-950/70 border border-sky-700/50 text-sky-200 transition cursor-pointer"
          >
            <div className="text-left">
              <div className="text-xs font-bold">2. Копировать кривую E(x)</div>
              <div className="text-[11px] text-sky-300/80 font-mono">
                {data.rows.length} вершин (макс. упругость пара)
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-semibold">
              {copiedKey === 'E' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'E' ? 'Скопировано' : 'Копировать'}
            </span>
          </button>

          <button
            onClick={() => handleCopy('e')}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-950/40 hover:bg-amber-950/70 border border-amber-700/50 text-amber-200 transition cursor-pointer"
          >
            <div className="text-left">
              <div className="text-xs font-bold">3. Копировать кривую e(x)</div>
              <div className="text-[11px] text-amber-300/80 font-mono">
                {data.rows.length} вершин (парциальное давление)
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold">
              {copiedKey === 'e' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey === 'e' ? 'Скопировано' : 'Копировать'}
            </span>
          </button>
        </div>

        {/* Таблица координат X,Y */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <th className="py-2.5 px-3 font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Граница / плоскость</th>
                <th className="py-2.5 px-3 font-semibold text-right">X (мм)</th>
                <th className="py-2.5 px-3 font-semibold text-right">t (°C)</th>
                <th className="py-2.5 px-3 font-semibold text-right">E (Па)</th>
                <th className="py-2.5 px-3 font-semibold text-right">e (Па)</th>
                <th className="py-2.5 px-3 font-semibold text-rose-300">Коорд. t (X,Y)</th>
                <th className="py-2.5 px-3 font-semibold text-sky-300">Коорд. E (X,Y)</th>
                <th className="py-2.5 px-3 font-semibold text-amber-300">Коорд. e (X,Y)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono">
              {data.rows.map((row) => (
                <tr
                  key={`${row.index}-${row.xMm}`}
                  className={
                    row.isMidpoint
                      ? 'bg-amber-950/25 border-l-4 border-l-amber-400'
                      : 'hover:bg-slate-800/30'
                  }
                >
                  <td className="py-2 px-3 text-slate-500">{row.index}</td>
                  <td className="py-2 px-3 font-sans text-slate-200">
                    {row.planeName}
                    {row.isMidpoint && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        ★ Середина утеплителя
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-white font-semibold">{row.xMm}</td>
                  <td className="py-2 px-3 text-right text-rose-300">{row.t.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-sky-300">{row.E.toFixed(1)}</td>
                  <td className="py-2 px-3 text-right text-amber-300">{row.e.toFixed(2)}</td>
                  <td className="py-2 px-3 text-rose-200 font-semibold bg-rose-950/20">{row.coordT}</td>
                  <td className="py-2 px-3 text-sky-200 font-semibold bg-sky-950/20">{row.coordE}</td>
                  <td className="py-2 px-3 text-amber-200 font-semibold bg-amber-950/20">{row.coord_e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Полная пошаговая инструкция работы в AutoCAD (по методическому файлу) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Пошаговая инструкция построения графиков t, E, e в AutoCAD
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">1</span>
              <span>Слои, разрез 1:1 и порядок штриховок</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Вычертите разрез конструкции в натуральную величину в миллиметрах (ширина <strong className="text-white">{data.frameWidthMm} мм</strong>) и рамку высотой <strong className="text-white">{data.settings.frameHeightMm} мм</strong>. Создайте отдельные слои: <span className="text-rose-300 font-mono">График_t</span> (красный, 0.35 мм), <span className="text-sky-300 font-mono">График_E</span> (синий, 0.35 мм), <span className="text-amber-300 font-mono">График_e</span> (оранжевый пунктир, 0.35 мм) и <span className="text-slate-300 font-mono">Сетка_Оси</span> (серый, 0.15 мм). Выполните штриховку слоев, затем выделите все штриховки → ПКМ → <strong>«Порядок прорисовки» → «На задний план»</strong>, чтобы они не перекрывали линии графиков.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">2</span>
              <span>Привязка рамки к абсолютному нулю #0,0</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Выделите разрез и рамку целиком, запустите команду <strong className="text-white font-mono">ПЕРЕНЕСТИ</strong> (<span className="font-mono">MOVE</span>), укажите базовой точкой <strong>левый нижний угол рамки</strong> (внутренняя поверхность конструкции, X = 0), введите в командную строку <strong className="text-cyan-300 font-mono">#0,0</strong> и нажмите <strong className="text-white">Enter</strong>. Решетка <span className="font-mono">#</span> гарантирует абсолютные мировые координаты.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/50 space-y-1.5">
            <div className="font-bold text-amber-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] flex items-center justify-center shrink-0">3</span>
              <span>Критически важно: отключите F3 и F12!</span>
            </div>
            <p className="text-amber-100/80 leading-relaxed">
              Перед вставкой координат обязательно отключите <strong>Объектную привязку (<span className="font-mono text-white">F3</span> / ОСНАП)</strong> и <strong>Динамический ввод (<span className="font-mono text-white">F12</span> / ДИН)</strong>. Если F3 включена — вершины полилинии «примагнитятся» к соседним углам штриховки; если F12 включена — AutoCAD прочитает координаты как относительные смещения и график «улетит» в сторону.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">4</span>
              <span>Автопостроение кривых командой ПОЛИЛИНИЯ</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Сделайте текущим слой <span className="text-rose-300 font-mono">График_t</span>. Введите команду <strong className="text-white font-mono">ПОЛИЛИНИЯ</strong> (<span className="font-mono">PLINE</span>) → <strong className="text-white">Enter</strong>. Нажмите кнопку <strong>«Копировать»</strong> для кривой t выше (или скопируйте диапазон координат из листа <span className="font-mono text-emerald-300">AutoCAD_Графики</span> в Excel), кликните <strong>внутрь поля командной строки</strong> внизу AutoCAD, нажмите <strong className="text-white font-mono">Ctrl+V</strong>, затем <strong className="text-white">Enter</strong> / <strong className="text-white">Esc</strong>. Повторите для слоев <span className="text-sky-300 font-mono">График_E</span> и <span className="text-amber-300 font-mono">График_e</span>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">5</span>
              <span>Шкалы и засечки командой МАССИВПРЯМОУГ</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Начертите одну короткую горизонтальную засечку в левом нижнем углу (<span className="font-mono">#0,0</span>) для шкалы t. Вызовите <strong className="text-white font-mono">МАССИВПРЯМОУГ</strong> (<span className="font-mono">ARRAYRECT</span>), задайте: Столбцы = <strong className="text-white">1</strong>, Строки = <strong className="text-rose-300">{data.tTickCount}</strong>, Между (шаг) = <strong className="text-rose-300">{data.tTickSpacingMm}</strong> мм. Аналогично справа для шкалы E, e: Столбцы = <strong className="text-white">1</strong>, Строки = <strong className="text-sky-300">{data.eTickCount}</strong>, Между = <strong className="text-sky-300">{data.eTickSpacingMm}</strong> мм.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
            <div className="font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] flex items-center justify-center shrink-0">6</span>
              <span>Значок градуса %%d и Маскировка фона текста</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Для ввода символа «°» в однострочном или многострочном тексте AutoCAD набирайте код <strong className="text-cyan-300 font-mono">%%d</strong> (например, <span className="font-mono text-white">18%%dC</span> автоматически превратится в <span className="text-white">18°C</span>). Чтобы числовые подписи точек поверх штриховки утеплителя или кладки читались чисто, в свойствах Мтекста включите <strong>«Маскировка фона» → Да</strong> (цвет фона чертежа) либо подложите контур командой <span className="font-mono text-white">МАСКИРОВКА</span> (<span className="font-mono">WIPEOUT</span>).
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Работа напрямую в Excel:</span> тот же самый калькулятор с живыми формулами{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono text-[11px]">
              =SUBSTITUTE(ROUND(X,2),&quot;,&quot;,&quot;.&quot;)&amp;&quot;,&quot;&amp;SUBSTITUTE(ROUND((t-t_min)/(t_max-t_min)*H,2),&quot;,&quot;,&quot;.&quot;)
            </code>{' '}
            уже встроен в скачиваемую книгу Excel на листе <strong>«AutoCAD_Графики»</strong> — при смене шифра на листе «Ввод_и_Итоги» все координаты для стены и покрытия пересчитываются автоматически.
          </div>
        </div>
      </div>
    </div>
  );
};
