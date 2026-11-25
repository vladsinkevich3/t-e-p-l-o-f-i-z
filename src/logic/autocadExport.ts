/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Чистый расчетный модуль генератора координат X,Y для автоматического построения
 * графиков тепловлажностного режима (t, E, e) в AutoCAD командой ПОЛИЛИНИЯ (PLINE).
 */

import { CrossSectionTemperaturePoint } from './calculations';

export interface AutoCadScaleSettings {
  frameHeightMm: number; // Высота рамки H, мм (например, 500 или 210)
  tMin: number; // Нижняя граница шкалы температур t, °C (например, -2)
  tMax: number; // Верхняя граница шкалы температур t, °C (например, 19)
  eMin: number; // Нижняя граница шкалы давлений E, e, Па (например, 300)
  eMax: number; // Верхняя граница шкалы давлений E, e, Па (например, 2200)
  tTickStepDeg?: number; // Шаг делений оси температур, °C (по умолч. 1)
  eTickStepPa?: number; // Шаг делений оси давлений, Па (по умолч. 100)
}

export interface AutoCadInputPoint {
  index: number;
  planeName: string;
  xMm: number;
  t: number;
  E: number;
  e: number;
  isMidpoint?: boolean;
}

export interface AutoCadCoordinateRow extends AutoCadInputPoint {
  yT: number;
  yE: number;
  y_e: number;
  coordT: string;
  coordE: string;
  coord_e: string;
}

export interface AutoCadExportData {
  settings: Required<AutoCadScaleSettings>;
  frameWidthMm: number;
  rows: AutoCadCoordinateRow[];
  tTickSpacingMm: number;
  tTickCount: number;
  eTickSpacingMm: number;
  eTickCount: number;
  tPolylineCoords: string;
  eSatPolylineCoords: string;
  ePartPolylineCoords: string;
}

export const DEFAULT_AUTOCAD_SETTINGS: Required<AutoCadScaleSettings> = {
  frameHeightMm: 500,
  tMin: -2,
  tMax: 19,
  eMin: 300,
  eMax: 2200,
  tTickStepDeg: 1,
  eTickStepPa: 100,
};

/**
 * Форматирует число для командной строки AutoCAD (точка вместо запятой, без лишних хвостовых нулей).
 */
export function formatAutoCadNumber(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return '0';
  const rounded = Number(val.toFixed(decimals));
  // Избегаем "-0"
  const normalized = Object.is(rounded, -0) ? 0 : rounded;
  return String(normalized);
}

/**
 * Форматирует пару координат "X,Y" для команды ПОЛИЛИНИЯ (PLINE) в AutoCAD.
 */
export function formatAutoCadCoord(xMm: number, yMm: number): string {
  return `${formatAutoCadNumber(xMm, 2)},${formatAutoCadNumber(yMm, 2)}`;
}

/**
 * Извлекает точки конструкции (от внутренней поверхности τ_в до наружной поверхности τ_н,
 * без точек внутреннего/наружного воздуха) из CrossSectionTemperaturePoint[].
 */
export function extractSurfaceProfilePoints(
  profile: CrossSectionTemperaturePoint[]
): AutoCadInputPoint[] {
  // Исключаем индекс 0 (внутренний воздух tв) и последний элемент (наружный воздух tн)
  const inner = profile.filter((pt, idx) => {
    if (idx === 0 && pt.planeName.toLowerCase().includes('внутренний воздух')) return false;
    if (idx === profile.length - 1 && pt.planeName.toLowerCase().includes('наружный воздух')) return false;
    return true;
  });

  return inner.map((pt, i) => ({
    index: i + 1,
    planeName: pt.planeName,
    xMm: pt.coord_x_mm,
    t: pt.temp_heating,
    E: pt.E_sat,
    e: pt.e_partial,
    isMidpoint: pt.isInsulationMidpoint,
  }));
}

/**
 * Рассчитывает координаты X,Y для AutoCAD по формулам из методического руководства:
 *   Y_t = ROUND((t - t_min) / (t_max - t_min) * H, 2)
 *   Y_E = ROUND((E - E_min) / (E_max - E_min) * H, 2)
 *   Y_e = ROUND((e - E_min) / (E_max - E_min) * H, 2)
 */
export function buildAutoCadCoordinates(
  points: AutoCadInputPoint[],
  rawSettings: Partial<AutoCadScaleSettings> = {}
): AutoCadExportData {
  const settings: Required<AutoCadScaleSettings> = {
    frameHeightMm:
      rawSettings.frameHeightMm !== undefined && rawSettings.frameHeightMm > 0
        ? rawSettings.frameHeightMm
        : DEFAULT_AUTOCAD_SETTINGS.frameHeightMm,
    tMin: rawSettings.tMin ?? DEFAULT_AUTOCAD_SETTINGS.tMin,
    tMax: rawSettings.tMax ?? DEFAULT_AUTOCAD_SETTINGS.tMax,
    eMin: rawSettings.eMin ?? DEFAULT_AUTOCAD_SETTINGS.eMin,
    eMax: rawSettings.eMax ?? DEFAULT_AUTOCAD_SETTINGS.eMax,
    tTickStepDeg:
      rawSettings.tTickStepDeg !== undefined && rawSettings.tTickStepDeg > 0
        ? rawSettings.tTickStepDeg
        : DEFAULT_AUTOCAD_SETTINGS.tTickStepDeg,
    eTickStepPa:
      rawSettings.eTickStepPa !== undefined && rawSettings.eTickStepPa > 0
        ? rawSettings.eTickStepPa
        : DEFAULT_AUTOCAD_SETTINGS.eTickStepPa,
  };

  const tSpan = Math.max(0.1, settings.tMax - settings.tMin);
  const eSpan = Math.max(1, settings.eMax - settings.eMin);
  const H = settings.frameHeightMm;

  const rows: AutoCadCoordinateRow[] = points.map((pt) => {
    const yT = Number((((pt.t - settings.tMin) / tSpan) * H).toFixed(2));
    const yE = Number((((pt.E - settings.eMin) / eSpan) * H).toFixed(2));
    const y_e = Number((((pt.e - settings.eMin) / eSpan) * H).toFixed(2));
    return {
      ...pt,
      yT,
      yE,
      y_e,
      coordT: formatAutoCadCoord(pt.xMm, yT),
      coordE: formatAutoCadCoord(pt.xMm, yE),
      coord_e: formatAutoCadCoord(pt.xMm, y_e),
    };
  });

  const frameWidthMm = rows.length > 0 ? Math.max(...rows.map((r) => r.xMm)) : 0;
  const tIntervals = tSpan / settings.tTickStepDeg;
  const eIntervals = eSpan / settings.eTickStepPa;

  const tTickSpacingMm = Number((H / tIntervals).toFixed(2));
  const tTickCount = Math.max(2, Math.floor(tIntervals + 1e-6) + 1);
  const eTickSpacingMm = Number((H / eIntervals).toFixed(2));
  const eTickCount = Math.max(2, Math.floor(eIntervals + 1e-6) + 1);

  return {
    settings,
    frameWidthMm,
    rows,
    tTickSpacingMm,
    tTickCount,
    eTickSpacingMm,
    eTickCount,
    tPolylineCoords: rows.map((r) => r.coordT).join('\n'),
    eSatPolylineCoords: rows.map((r) => r.coordE).join('\n'),
    ePartPolylineCoords: rows.map((r) => r.coord_e).join('\n'),
  };
}
