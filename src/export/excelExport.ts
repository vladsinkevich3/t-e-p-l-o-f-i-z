/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Генератор полноценной автономной расчетной книги Microsoft Excel (.xlsx)
 * с живыми формулами (18 листов), выпадающими списками (Data Validation),
 * готовым листом «В_отчет» (таблицы 1.1–5.2 по образцу отчета БНТУ),
 * листом «Формулы_Отчета» (все расчетные формулы с живой подстановкой чисел),
 * точной линейной интерполяцией E(t) по Таблице Е.1 (шаг 0,1 °C),
 * выбираемой и собственной пароизоляцией с управлением расположением по СП 2.04.01-2020,
 * сравнительными листами всех стен (С1–С30) и покрытий (П1–П30),
 * и полной методикой расчета окон по А. С. Шибеко (табл. 6.1–6.4, без раздела дверей).
 */

import ExcelJS from 'exceljs';
import { FullCourseworkCalculation, CrossSectionTemperaturePoint } from '../logic/calculations';
import { CITIES_DATA } from '../data/climate';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { INSULATION_VARIANTS } from '../data/insulation';
import {
  MATERIALS,
  MATERIAL_CATEGORY_LABELS,
  getSortedMaterialsList,
} from '../data/materials';
import {
  WALL_CONSTRUCTIONS,
  ROOF_CONSTRUCTIONS,
  BASEMENT_CONSTRUCTIONS,
} from '../data/constructions';
import { WINDOW_VARIANTS } from '../data/windows';
import {
  SATURATED_VAPOR_PRESSURE_TABLE,
  WINDOW_AIR_PERMEABILITY_CLASSES,
  WIND_HEIGHT_COEFF_TABLE,
} from '../data/normative';
import {
  VAPOR_BARRIER_MATERIALS,
  WALL_VB_PLACEMENTS,
  ROOF_VB_PLACEMENTS,
  WallVaporBarrierPlacement,
  RoofVaporBarrierPlacement,
  getVaporBarrierById,
  getWallPlacementOption,
  getRoofPlacementOption,
} from '../data/vaporBarriers';
import { extractSurfaceProfilePoints } from '../logic/autocadExport';
import { ExcelChartSpec, injectChartsIntoXlsx } from './excelCharts';

// ---------------------------------------------------------------------------
// Стили оформления книги Excel
// ---------------------------------------------------------------------------

const COLORS = {
  navyHeader: 'FF1E3A5F',
  slateSubHeader: 'FF334155',
  sectionBg: 'FFE2E8F0',
  inputFill: 'FFFFF9C4', // Желтые ячейки ручного ввода / выпадающих списков
  inputFont: 'FF0D47A1',
  formulaFill: 'FFF8FAFC',
  accentFill: 'FFDBEAFE',
  okFill: 'FFDCFCE7',
  okFont: 'FF166534',
  warnFill: 'FFFEE2E2',
  warnFont: 'FF991B1B',
  midFill: 'FFFEF3C7',
  vbFill: 'FFCFFAFE',
  vbFont: 'FF155E75',
  border: 'FFCBD5E1',
  darkBorder: 'FF475569',
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.darkBorder } },
  left: { style: 'thin', color: { argb: COLORS.darkBorder } },
  bottom: { style: 'medium', color: { argb: COLORS.darkBorder } },
  right: { style: 'thin', color: { argb: COLORS.darkBorder } },
};

function colLetter(colIdx: number): string {
  let letter = '';
  let n = colIdx;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function styleTitleBanner(
  ws: ExcelJS.Worksheet,
  rangeOrCols: string | number,
  text: string,
  subtitle?: string
) {
  const range = typeof rangeOrCols === 'number' ? `A1:${colLetter(rangeOrCols)}2` : rangeOrCols;
  ws.mergeCells(range);
  const topLeft = range.split(':')[0];
  const cell = ws.getCell(topLeft);
  cell.value = subtitle ? `${text}\n${subtitle}` : text;
  cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  const rowNum = parseInt(topLeft.replace(/\D/g, ''), 10) || 1;
  ws.getRow(rowNum).height = subtitle ? 40 : 28;
}

function styleSectionRow(ws: ExcelJS.Worksheet, rowNum: number, colCount: number, title: string) {
  const endCol = colLetter(colCount);
  ws.mergeCells(`A${rowNum}:${endCol}${rowNum}`);
  const cell = ws.getCell(`A${rowNum}`);
  cell.value = title;
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(rowNum).height = 24;
  for (let c = 1; c <= colCount; c++) {
    ws.getCell(rowNum, c).border = HEADER_BORDER;
  }
}

function styleTableHeader(
  wsOrCell: ExcelJS.Worksheet | ExcelJS.Cell,
  rowNumOrHeaders?: number | string[],
  headersOrStartCol?: string[] | number,
  startCol = 1
) {
  if ('font' in wsOrCell && !('getRow' in wsOrCell)) {
    const cell = wsOrCell as ExcelJS.Cell;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSubHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
    return;
  }
  const ws = wsOrCell as ExcelJS.Worksheet;
  const rowNum = rowNumOrHeaders as number;
  const headers = (headersOrStartCol as string[]) || (rowNumOrHeaders as unknown as string[]);
  const start = typeof headersOrStartCol === 'number' ? headersOrStartCol : startCol;
  const row = ws.getRow(rowNum);
  row.height = 28;
  headers.forEach((h, idx) => {
    const cell = row.getCell(start + idx);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSubHeader } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
  });
}

function styleInputCell(cell: ExcelJS.Cell, numFmt?: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.inputFill } };
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.inputFont } };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFD97706' } },
    left: { style: 'thin', color: { argb: 'FFD97706' } },
    bottom: { style: 'thin', color: { argb: 'FFD97706' } },
    right: { style: 'thin', color: { argb: 'FFD97706' } },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  if (numFmt) cell.numFmt = numFmt;
}

function styleFormulaCell(
  cell: ExcelJS.Cell,
  numFmt?: string,
  boldOrAlign: boolean | 'left' | 'center' | 'right' = false,
  accentOrBold = false
) {
  const isAlign = typeof boldOrAlign === 'string';
  const horizontal: 'left' | 'center' | 'right' = isAlign
    ? (boldOrAlign as 'left' | 'center' | 'right')
    : 'center';
  const bold = isAlign ? accentOrBold : Boolean(boldOrAlign);
  const accent = !isAlign && accentOrBold;
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: accent ? COLORS.accentFill : COLORS.formulaFill },
  };
  cell.font = { name: 'Calibri', size: 10, bold, color: { argb: 'FF0F172A' } };
  cell.border = THIN_BORDER;
  cell.alignment = { vertical: 'middle', horizontal };
  if (numFmt) cell.numFmt = numFmt;
}

function styleResultCell(
  cell: ExcelJS.Cell,
  numFmt?: string,
  align: 'left' | 'center' | 'right' = 'center'
) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.accentFill },
  };
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  cell.border = THIN_BORDER;
  cell.alignment = { vertical: 'middle', horizontal: align, wrapText: true };
  if (numFmt) cell.numFmt = numFmt;
}

function styleLabelCell(cell: ExcelJS.Cell, bold = false) {
  cell.font = { name: 'Calibri', size: 10, bold, color: { argb: 'FF1E293B' } };
  cell.border = THIN_BORDER;
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
}

/**
 * Универсальная формула Excel для ТОЧНОЙ линейной интерполяции E(t) по Таблице Е.1 (шаг 0,1 °C)
 * без округления температуры! Совместима со всеми версиями Excel (INDEX + MATCH, без XLOOKUP/LET).
 */
function excelInterpE(tempRef: string, e1EndRow: number): string {
  const tRng = `'Справ_Таблица_Е1'!$A$2:$A$${e1EndRow}`;
  const eRng = `'Справ_Таблица_Е1'!$B$2:$B$${e1EndRow}`;
  const tc = `MIN(MAX(${tempRef},-35),39.9)`;
  const idx = `MATCH(${tc},${tRng},1)`;
  return `ROUND(INDEX(${eRng},${idx})+(${tc}-INDEX(${tRng},${idx}))/(INDEX(${tRng},${idx}+1)-INDEX(${tRng},${idx}))*(INDEX(${eRng},${idx}+1)-INDEX(${eRng},${idx})),1)`;
}

/**
 * Универсальная формула Excel для обратной линейной интерполяции точки росы t_р(e) по Таблице Е.1
 */
function excelInterpDewPoint(eRef: string, e1EndRow: number): string {
  const tRng = `'Справ_Таблица_Е1'!$A$2:$A$${e1EndRow}`;
  const eRng = `'Справ_Таблица_Е1'!$B$2:$B$${e1EndRow}`;
  const ec = `MIN(MAX(${eRef},22.5),7350)`;
  const idx = `MATCH(${ec},${eRng},1)`;
  return `ROUND(INDEX(${tRng},${idx})+(${ec}-INDEX(${eRng},${idx}))/(INDEX(${eRng},${idx}+1)-INDEX(${eRng},${idx}))*(INDEX(${tRng},${idx}+1)-INDEX(${tRng},${idx})),2)`;
}

/**
 * Формула Excel для выбора расчетной зимней температуры t_н по тепловой инерции D (табл. 6.3 СП 2.04.01-2020)
 * с поддержкой ручного переопределения в ячейке 'Ввод_и_Итоги'!$C$24.
 * Ввод_и_Итоги: F8 = t_х.с(0.98), F9 = t_х.с(0.92), F22 = t_х.3(0.92), F11 = t_х.5(0.92)
 */
function excelDesignTempByD(dRef: string): string {
  const autoExpr = `IF(${dRef}<=1.5,'Ввод_и_Итоги'!$F$8,IF(${dRef}<=4,'Ввод_и_Итоги'!$F$9,IF(${dRef}<=7,'Ввод_и_Итоги'!$F$22,'Ввод_и_Итоги'!$F$11)))`;
  return `IF('Ввод_и_Итоги'!$C$24="t_х.с (0.98)",'Ввод_и_Итоги'!$F$8,IF('Ввод_и_Итоги'!$C$24="t_х.с (0.92)",'Ввод_и_Итоги'!$F$9,IF('Ввод_и_Итоги'!$C$24="t_х.3 (0.92)",'Ввод_и_Итоги'!$F$22,IF('Ввод_и_Итоги'!$C$24="t_х.5 (0.92)",'Ввод_и_Итоги'!$F$11,${autoExpr}))))`;
}

/**
 * Поясняющая формула Excel для выбранного правила табл. 6.3 СП 2.04.01-2020
 */
function excelDesignTempRuleByD(dRef: string): string {
  return `IF('Ввод_и_Итоги'!$C$24<>"Авто (табл. 6.3)","Ручной выбор: "&'Ввод_и_Итоги'!$C$24,IF(${dRef}<=1.5,"D ≤ 1.5 → t_х.с(0.98)",IF(${dRef}<=4,"1.5 < D ≤ 4.0 → t_х.с(0.92)",IF(${dRef}<=7,"4.0 < D ≤ 7.0 → t_х.3(0.92)","D > 7.0 → t_х.5(0.92)"))))`;
}

/**
 * Формула Excel для определения буквы класса окна по одному значению R_в (табл. 6.1 СТБ 939-2013)
 */
function excelWindowClassLetter(rvRef: string): string {
  return `IF(${rvRef}>1.279,"А",IF(${rvRef}>0.426,"Б",IF(${rvRef}>0.226,"В",IF(${rvRef}>0.142,"Г","Д"))))`;
}

/**
 * Формула Excel для назначения класса окна по диапазону [rvMin, rvMax] (табл. 6.4 Шибеко),
 * с автоматическим указанием обоих классов при пересечении границы (1.279 / 0.426 / 0.226 / 0.142)
 */
function excelWindowClassRange(minRef: string, maxRef: string): string {
  const cHigh = excelWindowClassLetter(maxRef);
  const cLow = excelWindowClassLetter(minRef);
  const f = (expr: string) => `ROUND(${expr},3)`;
  // Граничные переходы: между А/Б = 1.279, Б/В = 0.426, В/Г = 0.226, Г/Д = 0.142
  return (
    `IF(${cHigh}=${cLow},${cHigh},` +
    `IF(AND(${maxRef}>1.279,${minRef}<=1.279),"А (при Rв.ок="&${f('1.279')}&"–"&${f(maxRef)}&"); Б (при Rв.ок="&${f(minRef)}&"–"&${f('1.279')}&")",` +
    `IF(AND(${maxRef}>0.426,${minRef}<=0.426),"Б (при Rв.ок="&${f('0.426')}&"–"&${f(maxRef)}&"); В (при Rв.ок="&${f(minRef)}&"–"&${f('0.426')}&")",` +
    `IF(AND(${maxRef}>0.226,${minRef}<=0.226),"В (при Rв.ок="&${f('0.226')}&"–"&${f(maxRef)}&"); Г (при Rв.ок="&${f(minRef)}&"–"&${f('0.226')}&")",` +
    `"Г (при Rв.ок="&${f('0.142')}&"–"&${f(maxRef)}&"); Д (при Rв.ок="&${f(minRef)}&"–"&${f('0.142')}&")"))))`
  );
}

// ---------------------------------------------------------------------------
// ГЛАВНЫЙ ПОСТРОИТЕЛЬ КНИГИ (14 листов, тестируется в Node.js)
// ---------------------------------------------------------------------------

export async function buildCourseworkWorkbook(
  calc: FullCourseworkCalculation
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Теплофизика-Калькулятор (БНТУ)';
  wb.created = new Date();
  wb.modified = new Date();
  wb.calcProperties.fullCalcOnLoad = true;

  // 11 расчетных, отчетных и графических листов + 7 справочных листов = 18 листов
  const wsInput = wb.addWorksheet('Ввод_и_Итоги', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsReport = wb.addWorksheet('В_отчет', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsFormulas = wb.addWorksheet('Формулы_расчета', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsWallMain = wb.addWorksheet('Стена_Расчет', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsWallAll = wb.addWorksheet('Стены_Все_Схемы', { views: [{ state: 'frozen', ySplit: 4 }] });
  const wsRoofMain = wb.addWorksheet('Покрытие_Расчет', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsRoofAll = wb.addWorksheet('Покрытия_Все_Схемы', { views: [{ state: 'frozen', ySplit: 4 }] });
  const wsBasement = wb.addWorksheet('Подполье_ПТП', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsWindows = wb.addWorksheet('Окна_Расчет', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsCharts = wb.addWorksheet('Графики_Шибеко', { views: [{ state: 'frozen', ySplit: 2 }] });
  const wsAutoCad = wb.addWorksheet('AutoCAD_Графики', { views: [{ state: 'frozen', ySplit: 2 }] });

  // Справочники
  const wsRefCities = wb.addWorksheet('Справ_Города', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefBuildings = wb.addWorksheet('Справ_ТипыЗданий', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefIns = wb.addWorksheet('Справ_Утеплители', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefMat = wb.addWorksheet('Справ_Материалы', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefVB = wb.addWorksheet('Справ_Пароизоляция', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefConstr = wb.addWorksheet('Справ_Конструкции', { views: [{ state: 'frozen', ySplit: 1 }] });
  const wsRefE1 = wb.addWorksheet('Справ_Таблица_Е1', { views: [{ state: 'frozen', ySplit: 1 }] });

  // =========================================================================
  // 1. СПРАВОЧНЫЕ ЛИСТЫ
  // =========================================================================

  // --- Справ_Города (129 городов) ---
  const citiesList = Object.values(CITIES_DATA);
  styleTableHeader(wsRefCities, 1, [
    'Шифр', 'Город', 'Область', 'Метеостанция',
    't_х.с(0.98), °C', 't_х.с(0.92), °C', 't_х.5(0.98), °C', 't_х.5(0.92), °C',
    'v_ср, м/с', 't_н.от, °C', 'z_от, сут', 'φ_н.от, %', 'P_бар, гПа',
  ]);
  citiesList.forEach((c, i) => {
    const r = wsRefCities.getRow(i + 2);
    r.values = [
      c.id, c.name, c.region, c.nearestStation,
      c.t_coldest_day_098, c.t_coldest_day_092, c.t_coldest_5days_098, c.t_coldest_5days_092,
      c.wind_speed_winter, c.t_heating_period, c.duration_heating_period, c.rh_heating_period,
      c.barometric_pressure_winter,
    ];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });
  wsRefCities.columns = [
    { width: 8 }, { width: 18 }, { width: 18 }, { width: 18 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 },
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 }, { width: 12 },
  ];
  const citiesEndRow = citiesList.length + 1;

  // --- Справ_ТипыЗданий (8 типов) ---
  const bTypesList = Object.values(BUILDING_TYPES);
  styleTableHeader(wsRefBuildings, 1, [
    'ID', 'Тип здания', 'Полное наименование',
    't_в, °C', 'φ_в, %', 'α_в, Вт/(м²·°C)',
    'Δt_в стена, °C', 'Δt_в покрытие, °C', 'Δt_в пол, °C',
    'R_норм стена', 'R_норм покрытие', 'R_норм ПТП', 'R_норм окно',
  ]);
  bTypesList.forEach((b, i) => {
    const r = wsRefBuildings.getRow(i + 2);
    r.values = [
      b.id, b.codeName, b.name,
      b.default_t_v, b.default_phi_v, b.alpha_v,
      b.delta_t_norm_wall, b.delta_t_norm_roof, b.delta_t_norm_floor,
      b.R_norm_wall, b.R_norm_roof, b.R_norm_basement, b.R_norm_window,
    ];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });
  wsRefBuildings.columns = [
    { width: 16 }, { width: 20 }, { width: 42 },
    { width: 9 }, { width: 9 }, { width: 13 },
    { width: 13 }, { width: 15 }, { width: 12 },
    { width: 13 }, { width: 14 }, { width: 12 }, { width: 12 },
  ];
  const bTypesEndRow = bTypesList.length + 1;

  // --- Справ_Утеплители (У1..У50) ---
  const insList = Object.values(INSULATION_VARIANTS);
  styleTableHeader(wsRefIns, 1, [
    'Шифр', 'Наименование утеплителя', 'ρ, кг/м³', 'c, кДж/(кг·°C)',
    'λ_А, Вт/(м·°C)', 'λ_Б, Вт/(м·°C)', 's_А, Вт/(м²·°C)', 's_Б, Вт/(м²·°C)', 'μ, мг/(м·ч·Па)',
  ]);
  insList.forEach((ins, i) => {
    const r = wsRefIns.getRow(i + 2);
    r.values = [
      ins.id, ins.name, ins.density, ins.heatCapacity,
      ins.lambda_A, ins.lambda_B, ins.s_A, ins.s_B, ins.mu,
    ];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });
  wsRefIns.columns = [
    { width: 8 }, { width: 46 }, { width: 10 }, { width: 13 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 14 },
  ];
  const insEndRow = insList.length + 1;

  // --- Справ_Материалы (полный каталог СП 2.04.01-2020 Прил. Д, табл. Д.1 + Шибеко Прил. В) ---
  const matList = getSortedMaterialsList();
  styleTableHeader(wsRefMat, 1, [
    'ID материала', 'Наименование материала (СП 2.04.01-2020, табл. Д.1)', 'ρ, кг/м³', 'c, кДж/(кг·°C)',
    'λ_А, Вт/(м·°C)', 'λ_Б, Вт/(м·°C)', 's_А, Вт/(м²·°C)', 's_Б, Вт/(м²·°C)', 'μ, мг/(м·ч·Па)',
    'Группа материалов (СП 2.04.01)', 'λ_0 сух., Вт/(м·°C)',
  ]);
  matList.forEach((m, i) => {
    const r = wsRefMat.getRow(i + 2);
    r.values = [
      m.id, m.name, m.density, m.heatCapacity,
      m.lambda_A, m.lambda_B, m.s_A, m.s_B, m.mu,
      MATERIAL_CATEGORY_LABELS[m.category], m.lambda_dry ?? '',
    ];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });
  wsRefMat.columns = [
    { width: 28 }, { width: 54 }, { width: 10 }, { width: 13 },
    { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 14 },
    { width: 34 }, { width: 15 },
  ];
  const matEndRow = matList.length + 1;

  // --- Справ_Пароизоляция (Приложение Н + мембраны + 3 редактируемых слота «Своя пароизоляция») ---
  styleTableHeader(wsRefVB, 1, [
    'Наименование пароизоляции', 'ID', 'δ_баз, мм', 'R_п.баз, м²·ч·Па/мг',
    'λ, Вт/(м·°C)', 's, Вт/(м²·°C)', 'ρ, кг/м³', 'Примечание (Приложение Н / Своя)',
  ]);
  VAPOR_BARRIER_MATERIALS.forEach((vb, i) => {
    const r = wsRefVB.getRow(i + 2);
    r.values = [vb.name, vb.id, vb.baseThicknessMm, vb.baseRp, vb.lambda, vb.s, vb.density, vb.note];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });

  // 3 редактируемые желтые строки для собственной (пользовательской) пароизоляции (строки 18..20)
  const customVbSlots: [string, string, number, number, number, number, number, string][] = [
    ['Своя пароизоляция 1 (задайте параметры)', 'custom_1', 0.2, 5.0, 0.2, 4.0, 950, 'Редактируемый слот: измените название, δ, Rп, λ, s, ρ и выберите на «Ввод_и_Итоги»'],
    ['Своя пароизоляция 2 (задайте параметры)', 'custom_2', 1.0, 3.5, 0.17, 5.0, 1100, 'Редактируемый слот (обмазочная / битумная / своя мембрана)'],
    ['Своя пароизоляция 3 (задайте параметры)', 'custom_3', 2.0, 8.0, 0.17, 4.5, 1200, 'Редактируемый слот (рулонная / многослойная своя пароизоляция)'],
  ];

  const catalogVbNames = new Set(VAPOR_BARRIER_MATERIALS.map((m) => m.name));
  const ensureUniqueCustomVbName = (rawName: string, suffix: string): string =>
    catalogVbNames.has(rawName) ? `${rawName} (${suffix})` : rawName;

  let wallCustomSlotName: string | null = null;
  let roofCustomSlotName: string | null = null;
  let nextFreeCustomSlot = 0;

  if (calc.wall.vaporBarrier?.isCustom) {
    const wbVb = calc.wall.vaporBarrier;
    wallCustomSlotName = ensureUniqueCustomVbName(wbVb.name, 'изм. стена');
    customVbSlots[nextFreeCustomSlot] = [
      wallCustomSlotName,
      `custom_${nextFreeCustomSlot + 1}`,
      wbVb.thicknessMm,
      wbVb.R_p,
      wbVb.lambda ?? 0.2,
      wbVb.s ?? 4.0,
      wbVb.density ?? 950,
      'Задана пользователем для наружной стены (можно редактировать прямо в Excel)',
    ];
    nextFreeCustomSlot++;
  }
  if (calc.roof.vaporBarrier?.isCustom) {
    const rfVb = calc.roof.vaporBarrier;
    const candidateName = ensureUniqueCustomVbName(rfVb.name, 'изм. покр.');
    if (
      wallCustomSlotName &&
      calc.wall.vaporBarrier &&
      rfVb.name === calc.wall.vaporBarrier.name &&
      rfVb.thicknessMm === calc.wall.vaporBarrier.thicknessMm &&
      Math.abs(rfVb.R_p - calc.wall.vaporBarrier.R_p) < 1e-6
    ) {
      roofCustomSlotName = wallCustomSlotName;
    } else {
      roofCustomSlotName =
        candidateName === wallCustomSlotName ? `${candidateName} (покр.)` : candidateName;
      customVbSlots[nextFreeCustomSlot] = [
        roofCustomSlotName,
        `custom_${nextFreeCustomSlot + 1}`,
        rfVb.thicknessMm,
        rfVb.R_p,
        rfVb.lambda ?? 0.2,
        rfVb.s ?? 4.0,
        rfVb.density ?? 950,
        'Задана пользователем для покрытия (можно редактировать прямо в Excel)',
      ];
      nextFreeCustomSlot++;
    }
  }
  if (calc.basement.vaporBarrier?.isCustom && nextFreeCustomSlot < customVbSlots.length) {
    const bsVb = calc.basement.vaporBarrier;
    const baseName = ensureUniqueCustomVbName(bsVb.name, 'изм. ПТП');
    customVbSlots[nextFreeCustomSlot] = [
      baseName,
      `custom_${nextFreeCustomSlot + 1}`,
      bsVb.thicknessMm,
      bsVb.R_p,
      bsVb.lambda ?? 0.2,
      bsVb.s ?? 4.0,
      bsVb.density ?? 950,
      'Задана пользователем для перекрытия ПТП (можно редактировать прямо в Excel)',
    ];
  }

  customVbSlots.forEach((slotVals, idx) => {
    const rowIdx = VAPOR_BARRIER_MATERIALS.length + 2 + idx; // 18..20
    const r = wsRefVB.getRow(rowIdx);
    r.values = slotVals;
    r.eachCell((cell, colNum) => {
      if (colNum === 1 || (colNum >= 3 && colNum <= 7)) {
        styleInputCell(cell);
        if (colNum === 1) cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.border = THIN_BORDER;
        cell.font = { name: 'Calibri', size: 10, italic: colNum === 8 };
      }
    });
  });

  wsRefVB.columns = [
    { width: 48 }, { width: 22 }, { width: 12 }, { width: 20 },
    { width: 13 }, { width: 13 }, { width: 11 }, { width: 46 },
  ];
  const vbEndRow = VAPOR_BARRIER_MATERIALS.length + 1 + customVbSlots.length; // 20

  // --- Справ_Конструкции ---
  // Блок 1 (строки 2..31): Стены С1..С30
  styleTableHeader(wsRefConstr, 1, [
    'Шифр', 'Тип', 'Описание конструкции', 'Коэфф. n',
    'Слой1_Имя', 'Слой1_ID', 'Слой1_δ',
    'Слой2_Имя', 'Слой2_ID', 'Слой2_δ',
    'Слой3_Имя', 'Слой3_ID', 'Слой3_δ',
    'Слой4_Имя', 'Слой4_ID', 'Слой4_δ',
    'Слой5_Имя', 'Слой5_ID', 'Слой5_δ',
  ]);
  const wallList = Object.values(WALL_CONSTRUCTIONS);
  const wallStartRow = 2;
  wallList.forEach((w, i) => {
    const rowVals: (string | number)[] = [w.id, w.type, w.typeName, w.increasingFactor_n];
    const srcLayers =
      w.id === calc.cipher.wallCode && calc.cipher.overrides?.wallCustomLayers?.length
        ? calc.cipher.overrides.wallCustomLayers
        : w.layers;
    for (let s = 0; s < 5; s++) {
      const layer = srcLayers[s];
      if (layer) {
        const matId = 'materialId' in layer ? layer.materialId : undefined;
        const isIns = Boolean(layer.isInsulation || matId === 'insulation');
        rowVals.push(
          layer.name,
          isIns ? 'INSULATION' : (matId || 'cement_sand_mortar_1800'),
          isIns ? 0 : layer.thickness
        );
      } else {
        rowVals.push('', '', 0);
      }
    }
    const r = wsRefConstr.getRow(wallStartRow + i);
    r.values = rowVals;
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 9 };
    });
  });
  const wallEndRow = wallStartRow + wallList.length - 1; // 31

  // Блок 2 (строки 35..64): Покрытия П1..П30
  const roofHeaderRow = wallEndRow + 3; // 34
  styleTableHeader(wsRefConstr, roofHeaderRow, [
    'Шифр', 'Тип', 'Описание покрытия', 'Коэфф. n', 'h_мм', 'd_мм', 'шаг_мм',
    'Внутр1_Имя', 'Внутр1_ID', 'Внутр1_δ',
    'Внутр2_Имя', 'Внутр2_ID', 'Внутр2_δ',
    'Нар1_Имя', 'Нар1_ID', 'Нар1_δ',
    'Нар2_Имя', 'Нар2_ID', 'Нар2_δ',
  ]);
  const roofList = Object.values(ROOF_CONSTRUCTIONS);
  const roofStartRow = roofHeaderRow + 1; // 35
  roofList.forEach((rf, i) => {
    const beforeSlab: typeof rf.layers = [];
    const afterIns: typeof rf.layers = [];
    let seenSlab = false;
    let seenIns = false;
    for (const l of rf.layers) {
      if (l.isInsulation) {
        seenIns = true;
        continue;
      }
      if (l.materialId === 'reinforced_concrete' || l.name.toLowerCase().includes('плита')) {
        seenSlab = true;
        continue;
      }
      if (!seenSlab && !seenIns) beforeSlab.push(l);
      else afterIns.push(l);
    }
    const vals: (string | number)[] = [
      rf.id, rf.type, rf.name, rf.increasingFactor_n,
      rf.slab.height, rf.slab.voidDiameter, rf.slab.spacing,
      beforeSlab[0]?.name || '', beforeSlab[0]?.materialId || '', beforeSlab[0]?.thickness || 0,
      beforeSlab[1]?.name || '', beforeSlab[1]?.materialId || '', beforeSlab[1]?.thickness || 0,
      afterIns[0]?.name || '', afterIns[0]?.materialId || '', afterIns[0]?.thickness || 0,
      afterIns[1]?.name || '', afterIns[1]?.materialId || '', afterIns[1]?.thickness || 0,
    ];
    const r = wsRefConstr.getRow(roofStartRow + i);
    r.values = vals;
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 9 };
    });
  });
  const roofEndRow = roofStartRow + roofList.length - 1; // 64

  // Блок 3 (строки 68..87): Подполья ПТП1..ПТП20
  const baseHeaderRow = roofEndRow + 3; // 67
  styleTableHeader(wsRefConstr, baseHeaderRow, [
    'Шифр', 'Тип', 'Описание ПТП', 'R_норм',
    'Слой1_Имя', 'Слой1_ID', 'Слой1_δ',
    'Слой2_Имя', 'Слой2_ID', 'Слой2_δ',
    'Слой3_Имя', 'Слой3_ID', 'Слой3_δ',
    'Слой4_Имя', 'Слой4_ID', 'Слой4_δ',
    'Слой5_Имя', 'Слой5_ID', 'Слой5_δ',
  ]);
  const baseList = Object.values(BASEMENT_CONSTRUCTIONS);
  const baseStartRow = baseHeaderRow + 1; // 68
  baseList.forEach((b, i) => {
    const vals: (string | number)[] = [b.id, `вар. ${b.variantNum}`, b.name, 1.87];
    for (let s = 0; s < 5; s++) {
      const layer = b.layers[s];
      if (layer) {
        vals.push(
          layer.name,
          layer.isInsulation ? 'INSULATION' : (layer.materialId || 'cement_sand_mortar_1800'),
          layer.isInsulation ? 0 : layer.thickness
        );
      } else {
        vals.push('', '', 0);
      }
    }
    const r = wsRefConstr.getRow(baseStartRow + i);
    r.values = vals;
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 9 };
    });
  });
  const baseEndRow = baseStartRow + baseList.length - 1; // 87

  // Блок 4 (строки 91..134): Окна О1..О44
  const winHeaderRow = baseEndRow + 3; // 90
  styleTableHeader(wsRefConstr, winHeaderRow, [
    'Шифр', 'Схема', 'Профильная система', 'Стеклопакет',
    'R_непр', 'R_св', 'H_мм', 'B_мм', 'b1_мм', 'b1_штрих_мм', 'b2_мм', 'b3_мм', 'b3_штрих_мм', 'b4_мм',
  ]);
  const winList = Object.values(WINDOW_VARIANTS);
  const winStartRow = winHeaderRow + 1; // 91
  winList.forEach((win, i) => {
    const r = wsRefConstr.getRow(winStartRow + i);
    r.values = [
      win.id, win.typeScheme, win.profileSystem, win.glazingType,
      win.R_neopr, win.R_sv, win.dim.H, win.dim.B,
      win.dim.b1, win.dim.b1_prime ?? win.dim.b1, win.dim.b2,
      win.dim.b3, win.dim.b3_prime, win.dim.b4,
    ];
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 9 };
    });
  });
  const winEndRow = winStartRow + winList.length - 1; // 134

  wsRefConstr.columns = [
    { width: 9 }, { width: 7 }, { width: 42 }, { width: 10 },
    { width: 22 }, { width: 20 }, { width: 9 },
    { width: 22 }, { width: 20 }, { width: 9 },
    { width: 22 }, { width: 20 }, { width: 9 },
    { width: 22 }, { width: 20 }, { width: 9 },
    { width: 22 }, { width: 20 }, { width: 9 },
  ];

  // --- Справ_Таблица_Е1 (шаг 0,1 °C от -26,0 до +26,0 + хвосты -35..+40, строго по возрастанию) ---
  styleTableHeader(wsRefE1, 1, ['Температура t, °C', 'Давление насыщенного пара E(t), Па']);
  SATURATED_VAPOR_PRESSURE_TABLE.forEach((item, i) => {
    const r = wsRefE1.getRow(i + 2);
    r.values = [item.t, item.E];
    r.getCell(1).numFmt = '0.0';
    r.getCell(2).numFmt = '0.0';
    r.eachCell((cell) => {
      cell.border = THIN_BORDER;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });
  wsRefE1.columns = [{ width: 20 }, { width: 34 }];
  const e1EndRow = SATURATED_VAPOR_PRESSURE_TABLE.length + 1;

  // =========================================================================
  // 2. ЛИСТ 1: «Ввод_и_Итоги»
  // =========================================================================
  styleTitleBanner(
    wsInput,
    'A1:G2',
    'КУРСОВАЯ РАБОТА ПО СТРОИТЕЛЬНОЙ ТЕПЛОФИЗИКЕ (БНТУ) — АВТОНОМНЫЙ КАЛЬКУЛЯТОР EXCEL',
    'Изменяйте желтые ячейки с выпадающими списками — все 18 листов, таблицы «В_отчет», «Формулы_расчета», графики Шибеко и AutoCAD пересчитываются автоматически'
  );

  wsInput.columns = [
    { width: 36 }, // A
    { width: 10 }, // B
    { width: 34 }, // C (Ввод / выпадающие списки)
    { width: 4 },  // D
    { width: 38 }, // E
    { width: 16 }, // F
    { width: 26 }, // G
  ];

  styleSectionRow(wsInput, 4, 3, '1. ИСХОДНЫЕ ДАННЫЕ ВАРИАНТА (ЖЕЛТЫЕ ЯЧЕЙКИ — ВЫПАДАЮЩИЕ СПИСКИ)');
  wsInput.mergeCells('E4:G4');
  const secRight = wsInput.getCell('E4');
  secRight.value = '2. КЛИМАТОЛОГИЯ СП 2.04.04-2026 И ПАРОИЗОЛЯЦИЯ (АВТОРАСЧЕТ)';
  secRight.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  secRight.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  secRight.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ['E4', 'F4', 'G4'].forEach((ref) => { wsInput.getCell(ref).border = HEADER_BORDER; });

  const currentBuildingCodeName =
    BUILDING_TYPES[calc.internalConditions.buildingTypeId]?.codeName || 'Административное';
  const opModeExcel =
    calc.internalConditions.operatingConditionMode === 'A'
      ? 'А'
      : calc.internalConditions.operatingConditionMode === 'B'
      ? 'Б'
      : 'Авто';

  const wallVbDefaultName = wallCustomSlotName
    ?? (calc.wall.vaporBarrier
      ? getVaporBarrierById(calc.wall.vaporBarrier.materialId).name
      : getVaporBarrierById('none').name);
  const wallVbDefaultThk = calc.wall.vaporBarrier ? calc.wall.vaporBarrier.thicknessMm : null;

  const roofVbDefaultName = roofCustomSlotName
    ?? (calc.roof.vaporBarrier
      ? getVaporBarrierById(calc.roof.vaporBarrier.materialId).name
      : getVaporBarrierById('none').name);
  const roofVbDefaultThk = calc.roof.vaporBarrier ? calc.roof.vaporBarrier.thicknessMm : null;

  const designTempModeExcel =
    calc.cipher.overrides?.designTemperatureMode === 't_coldest_day_098'
      ? 't_х.с (0.98)'
      : calc.cipher.overrides?.designTemperatureMode === 't_coldest_day_092'
      ? 't_х.с (0.92)'
      : calc.cipher.overrides?.designTemperatureMode === 't_coldest_3days'
      ? 't_х.3 (0.92)'
      : calc.cipher.overrides?.designTemperatureMode === 't_coldest_5days'
      ? 't_х.5 (0.92)'
      : 'Авто (табл. 6.3)';

  // Строки ввода 5..24 (сохраняем точные координаты C5:C23, добавляем C24 для режима t_н)
  const inputRows: [string, string, string | number | null, string | null, string?][] = [
    ['Тип здания (СН 2.04.02)', 'Тип', currentBuildingCodeName, `'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow}`],
    ['Шифр города (Г1–Г129)', 'Город', calc.climate.id, `'Справ_Города'!$A$2:$A$${citiesEndRow}`],
    ['Количество этажей', 'N', calc.cipher.floorsCount, null, '0'],
    ['Конструкция наружной стены', 'Стена', calc.cipher.wallCode, `'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow}`],
    ['Покрытие / чердачное перекрытие', 'Покр.', calc.cipher.roofCode, `'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow}`],
    ['Перекрытие техподполья', 'ПТП', calc.cipher.basementCode, `'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow}`],
    ['Вид утеплителя (У1–У50)', 'Утепл.', calc.cipher.insulationCode, `'Справ_Утеплители'!$A$2:$A$${insEndRow}`],
    ['Оконный блок (О1–О44)', 'Окно', calc.cipher.windowCode, `'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow}`],
    ['Режим условий эксплуатации', 'А / Б', opModeExcel, '"Авто,А,Б"'],
    ['Тип местности (Прил. М для окон)', 'Местн.', calc.window.terrainType, '"A,B,C"'],
    ['Ручное t_в (пусто = авто по типу)', 't_в', calc.cipher.overrides?.t_indoor ?? null, null, '0.0'],
    ['Ручное φ_в (пусто = авто по типу)', 'φ_в', calc.cipher.overrides?.phi_indoor ?? null, null, '0'],
    ['Пароизоляция стены (материал)', 'ПИ ст.', wallVbDefaultName, `'Справ_Пароизоляция'!$A$2:$A$${vbEndRow}`],
    ['Пароизоляция стены: толщина, мм', 'δ_пи.с', wallVbDefaultThk, null, '0.00'],
    ['Пароизоляция покрытия (материал)', 'ПИ пк.', roofVbDefaultName, `'Справ_Пароизоляция'!$A$2:$A$${vbEndRow}`],
    ['Пароизоляция покрытия: толщина, мм', 'δ_пи.п', roofVbDefaultThk, null, '0.00'],
    ['Студент (ФИО)', 'ФИО', calc.cipher.studentName || 'Синькевич В. А.', null],
    ['Учебная группа', 'Группа', calc.cipher.groupName || '11004224', null],
    ['Преподаватель', 'Пров.', calc.cipher.reviewerName || 'доц. к.т.н. Крутилин А. Б.', null],
    ['Выбор зимней t_н (табл. 6.3 СП 2.04.01)', 't_н', designTempModeExcel, '"Авто (табл. 6.3),t_х.с (0.98),t_х.с (0.92),t_х.3 (0.92),t_х.5 (0.92)"'],
  ];

  inputRows.forEach(([label, sym, val, listFormula, numFmt], idx) => {
    const r = 5 + idx;
    wsInput.getRow(r).height = 21;
    wsInput.getCell(`A${r}`).value = label;
    styleLabelCell(wsInput.getCell(`A${r}`), idx < 10 || idx === 12 || idx === 14 || idx === 19);
    wsInput.getCell(`B${r}`).value = sym;
    styleLabelCell(wsInput.getCell(`B${r}`));
    wsInput.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    const cCell = wsInput.getCell(`C${r}`);
    cCell.value = val;
    styleInputCell(cCell, numFmt);
    if (listFormula) {
      cCell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [listFormula],
        showErrorMessage: true,
        errorTitle: 'Недопустимое значение',
        error: 'Выберите значение из выпадающего списка справочника.',
      };
    }
  });

  // Правая колонка (строки 5..24): Климатология + Расчет выбранной пароизоляции + t_х.3 и итоговые t_н
  const vbNameRng = `'Справ_Пароизоляция'!$A$2:$A$${vbEndRow}`;
  const vbThkRng = `'Справ_Пароизоляция'!$C$2:$C$${vbEndRow}`;
  const vbRpRng = `'Справ_Пароизоляция'!$D$2:$D$${vbEndRow}`;

  const climateFormulas: [string, string, string, string][] = [
    ['Населенный пункт', `INDEX('Справ_Города'!$B$2:$B$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '@', 'Город РБ'],
    ['Область / Метеостанция', `INDEX('Справ_Города'!$C$2:$C$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))&" ("&INDEX('Справ_Города'!$D$2:$D$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))&")"`, '@', 'СП 2.04.04-2026'],
    ['Высота здания H = 1,0 + 3,0·N + 2,7', '3.7+3*$C$7', '0.0', 'м (рис. 6.4 Шибеко)'],
    ['Температура наиболее холодных суток (0.98)', `INDEX('Справ_Города'!$E$2:$E$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', '°C (t_х.с 0.98)'],
    ['Температура наиболее холодных суток (0.92)', `INDEX('Справ_Города'!$F$2:$F$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', '°C (t_х.с 0.92)'],
    ['Температура холодной пятидневки (0.98)', `INDEX('Справ_Города'!$G$2:$G$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', '°C (t_х.5 0.98)'],
    ['Температура холодной пятидневки (0.92)', `INDEX('Справ_Города'!$H$2:$H$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', '°C (t_х.5 0.92)'],
    ['Средняя скорость ветра за зиму v_ср', `INDEX('Справ_Города'!$I$2:$I$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', 'м/с'],
    ['Средняя температура отопит. периода t_н.от', `INDEX('Справ_Города'!$J$2:$J$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0.0', '°C'],
    ['Продолжительность отопит. периода z_от', `INDEX('Справ_Города'!$K$2:$K$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0', 'сут'],
    ['Отн. влажность отопит. периода φ_н.от', `INDEX('Справ_Города'!$L$2:$L$${citiesEndRow},MATCH($C$6,'Справ_Города'!$A$2:$A$${citiesEndRow},0))`, '0', '%'],
    ['Насыщенное давление E_н.от (интерп. Е.1)', excelInterpE('F13', e1EndRow), '0.0', 'Па (интерполяция)'],
    ['Парциальное давление нар. воздуха e_н.от', '(F15/100)*F16', '0.00', 'Па'],
    ['Пароизоляция стены: расч. толщина δ_пи.с', `IF(INDEX(${vbThkRng},MATCH($C$17,${vbNameRng},0))=0,0,IF($C$18="",INDEX(${vbThkRng},MATCH($C$17,${vbNameRng},0)),$C$18))`, '0.00', 'мм (пусто = базовая)'],
    ['Пароизоляция стены: R_п.ст = Rп.баз·(δ/δбаз)', `IF(F18<=0,0,ROUND(INDEX(${vbRpRng},MATCH($C$17,${vbNameRng},0))*(F18/INDEX(${vbThkRng},MATCH($C$17,${vbNameRng},0))),3))`, '0.000', 'м²·ч·Па/мг'],
    ['Пароизоляция покрытия: расч. толщина δ_пи.п', `IF(INDEX(${vbThkRng},MATCH($C$19,${vbNameRng},0))=0,0,IF($C$20="",INDEX(${vbThkRng},MATCH($C$19,${vbNameRng},0)),$C$20))`, '0.00', 'мм (пусто = базовая)'],
    ['Пароизоляция покрытия: R_п.покр = Rп.баз·(δ/δбаз)', `IF(F20<=0,0,ROUND(INDEX(${vbRpRng},MATCH($C$19,${vbNameRng},0))*(F20/INDEX(${vbThkRng},MATCH($C$19,${vbNameRng},0))),3))`, '0.000', 'м²·ч·Па/мг'],
    ['Температура наиболее холодных 3 суток (0.92)', 'ROUND((F9+F11)/2,1)', '0.0', '°C (0.5·(t_х.с+t_х.5))'],
    ['Расчетная зимняя t_н стены (по D стены)', "'Стена_Расчет'!C18", '0.0', '°C (табл. 6.3 СП 2.04.01)'],
    ['Расчетная зимняя t_н покрытия (по D покр.)', "'Покрытие_Расчет'!C22", '0.0', '°C (табл. 6.3 СП 2.04.01)'],
  ];

  climateFormulas.forEach(([label, formula, fmt, unit], idx) => {
    const r = 5 + idx;
    wsInput.getCell(`E${r}`).value = label;
    styleLabelCell(wsInput.getCell(`E${r}`), idx === 14 || idx === 16 || idx >= 18);
    const fCell = wsInput.getCell(`F${r}`);
    fCell.value = { formula };
    styleFormulaCell(
      fCell,
      fmt,
      idx === 0 || idx === 6 || idx === 8 || idx === 14 || idx === 16 || idx >= 17,
      idx === 14 || idx === 16 || idx >= 18
    );
    wsInput.getCell(`G${r}`).value = unit;
    styleLabelCell(wsInput.getCell(`G${r}`));
  });

  // Секции 3 и 4 (строки 25..35): Внутренний микроклимат + Нормативы и Утеплитель
  styleSectionRow(wsInput, 25, 3, '3. ВНУТРЕННИЙ МИКРОКЛИМАТ И УСЛОВИЯ А/Б (СП 2.04.01)');
  wsInput.mergeCells('E25:G25');
  const secMatRight = wsInput.getCell('E25');
  secMatRight.value = '4. НОРМАТИВЫ ЗДАНИЯ И ВЫБРАННЫЙ УТЕПЛИТЕЛЬ';
  secMatRight.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  secMatRight.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.sectionBg } };
  secMatRight.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ['E25', 'F25', 'G25'].forEach((ref) => { wsInput.getCell(ref).border = HEADER_BORDER; });

  const microRows: [string, string, string, string][] = [
    ['Расчетная температура внутри t_в', 't_в, °C', `IF($C$15="",INDEX('Справ_ТипыЗданий'!$D$2:$D$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0)),$C$15)`, '0.0'],
    ['Расчетная влажность внутри φ_в', 'φ_в, %', `IF($C$16="",INDEX('Справ_ТипыЗданий'!$E$2:$E$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0)),$C$16)`, '0.0'],
    ['Давление насыщенного пара E_в по t_в (интерп. Е.1)', 'E_в, Па', excelInterpE('C26', e1EndRow), '0.0'],
    ['Парциальное давление e_в = (φ_в/100)·E_в', 'e_в, Па', '(C27/100)*C28', '0.00'],
    ['Температура точки росы t_р (интерп. Е.1)', 't_р, °C', excelInterpDewPoint('C29', e1EndRow), '0.00'],
    [
      'Влажностный режим (табл. 5.1)',
      'Режим',
      'IF(C26<=12,IF(C27<=60,"Сухой",IF(C27<=75,"Нормальный","Влажный")),IF(C26<=24,IF(C27<=50,"Сухой",IF(C27<=60,"Нормальный",IF(C27<=75,"Влажный","Мокрый"))),IF(C27<=40,"Сухой",IF(C27<=50,"Нормальный",IF(C27<=60,"Влажный","Мокрый")))))',
      '@',
    ],
    ['Зона влажности (Республика Беларусь)', 'Зона', '"Зона 2 (Нормальная)"', '@'],
    ['Условия эксплуатации (табл. 5.2)', 'А / Б', 'IF($C$13="Авто",IF(C31="Сухой","А","Б"),$C$13)', '@'],
    ['Коэффициент теплоотдачи внутри α_в', 'α_в', `INDEX('Справ_ТипыЗданий'!$F$2:$F$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.0'],
    ['Коэффициент теплоотдачи снаружи α_н', 'α_н', '23', '0.0'],
  ];

  microRows.forEach(([label, sym, formula, fmt], idx) => {
    const r = 26 + idx;
    wsInput.getRow(r).height = 20;
    wsInput.getCell(`A${r}`).value = label;
    styleLabelCell(wsInput.getCell(`A${r}`), idx === 2 || idx === 3 || idx === 4 || idx === 7);
    wsInput.getCell(`B${r}`).value = sym;
    styleLabelCell(wsInput.getCell(`B${r}`));
    wsInput.getCell(`B${r}`).alignment = { vertical: 'middle', horizontal: 'center' };
    const cCell = wsInput.getCell(`C${r}`);
    cCell.value = { formula };
    styleFormulaCell(cCell, fmt, idx === 2 || idx === 3 || idx === 4 || idx === 7, idx === 2 || idx === 7);
  });

  const normInsRows: [string, string, string, string][] = [
    ['Нормативное R_т.норм наружной стены', `INDEX('Справ_ТипыЗданий'!$J$2:$J$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.00', 'м²·°C/Вт'],
    ['Нормативное R_т.норм покрытия/чердака', `INDEX('Справ_ТипыЗданий'!$K$2:$K$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.00', 'м²·°C/Вт'],
    ['Нормативное R_т.норм перекрытия ПТП', `INDEX('Справ_ТипыЗданий'!$L$2:$L$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.00', 'м²·°C/Вт'],
    ['Допустимый Δt_в.норм стены', `INDEX('Справ_ТипыЗданий'!$G$2:$G$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.0', '°C (стена)'],
    ['Допустимый Δt_в.норм покрытия', `INDEX('Справ_ТипыЗданий'!$H$2:$H$${bTypesEndRow},MATCH($C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.0', '°C (покрытие)'],
    ['Утеплитель (наименование)', `INDEX('Справ_Утеплители'!$B$2:$B$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0))`, '@', 'У1–У50'],
    ['Плотность утеплителя ρ', `INDEX('Справ_Утеплители'!$C$2:$C$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0))`, '0', 'кг/м³'],
    ['Расчетная λ утеплителя (по А или Б)', `IF($C$33="А",INDEX('Справ_Утеплители'!$E$2:$E$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0)),INDEX('Справ_Утеплители'!$F$2:$F$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0)))`, '0.0000', 'Вт/(м·°C)'],
    ['Коэффициент теплоусвоения s утеплителя', `IF($C$33="А",INDEX('Справ_Утеплители'!$G$2:$G$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0)),INDEX('Справ_Утеплители'!$H$2:$H$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0)))`, '0.000', 'Вт/(м²·°C)'],
    ['Паропроницаемость утеплителя μ', `INDEX('Справ_Утеплители'!$I$2:$I$${insEndRow},MATCH($C$11,'Справ_Утеплители'!$A$2:$A$${insEndRow},0))`, '0.0000', 'мг/(м·ч·Па)'],
  ];

  normInsRows.forEach(([label, formula, fmt, unit], idx) => {
    const r = 26 + idx;
    wsInput.getCell(`E${r}`).value = label;
    styleLabelCell(wsInput.getCell(`E${r}`), idx === 7);
    const fCell = wsInput.getCell(`F${r}`);
    fCell.value = { formula };
    styleFormulaCell(fCell, fmt, idx === 7, idx === 7);
    wsInput.getCell(`G${r}`).value = unit;
    styleLabelCell(wsInput.getCell(`G${r}`));
  });

  // Секция 5: Сводная таблица результатов (4 раздела — БЕЗ дверей!)
  styleSectionRow(wsInput, 37, 7, '5. СВОДНАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ РАСЧЕТА (АВТОМАТИЧЕСКАЯ ПРОВЕРКА НОРМАТИВОВ)');
  styleTableHeader(wsInput, 38, [
    'Конструкция / Раздел', 'Шифр', 'Толщина утепл., мм', 'R_факт', 'R_треб', 'τ_в / Класс', 'Статус соответствия',
  ]);

  const summaryRows: [string, string, string, string, string, string, string][] = [
    [
      'Наружная стена (лист «Стена_Расчет»)',
      '$C$8',
      "'Стена_Расчет'!C15*1000",
      "'Стена_Расчет'!C16",
      "'Стена_Расчет'!C13",
      "'Стена_Расчет'!C20",
      "'Стена_Расчет'!C22",
    ],
    [
      'Покрытие / чердак (лист «Покрытие_Расчет»)',
      '$C$9',
      "'Покрытие_Расчет'!C18*1000",
      "'Покрытие_Расчет'!C19",
      "'Покрытие_Расчет'!C16",
      "'Покрытие_Расчет'!C23",
      "'Покрытие_Расчет'!C26",
    ],
    [
      'Перекрытие техподполья (лист «Подполье_ПТП»)',
      '$C$10',
      "'Подполье_ПТП'!C15*1000",
      "'Подполье_ПТП'!C16",
      "'Подполье_ПТП'!C13",
      "'Подполье_ПТП'!C22",
      "'Подполье_ПТП'!C25",
    ],
    [
      'Оконный блок (лист «Окна_Расчет»)',
      '$C$12',
      '"—"',
      "'Окна_Расчет'!C14",
      "'Окна_Расчет'!C15",
      "'Окна_Расчет'!F87",
      "'Окна_Расчет'!C16",
    ],
  ];

  summaryRows.forEach((rowF, idx) => {
    const r = 39 + idx;
    wsInput.getRow(r).height = 22;
    wsInput.getCell(`A${r}`).value = rowF[0];
    styleLabelCell(wsInput.getCell(`A${r}`), true);
    wsInput.getCell(`B${r}`).value = { formula: rowF[1] };
    styleFormulaCell(wsInput.getCell(`B${r}`), '@', true);
    wsInput.getCell(`C${r}`).value = { formula: rowF[2] };
    styleFormulaCell(wsInput.getCell(`C${r}`), idx < 3 ? '0' : '@', true);
    wsInput.getCell(`D${r}`).value = { formula: rowF[3] };
    styleFormulaCell(wsInput.getCell(`D${r}`), '0.00', true, true);
    wsInput.getCell(`E${r}`).value = { formula: rowF[4] };
    styleFormulaCell(wsInput.getCell(`E${r}`), '0.00');
    wsInput.getCell(`F${r}`).value = { formula: rowF[5] };
    styleFormulaCell(wsInput.getCell(`F${r}`), idx < 3 ? '0.00' : '@');
    wsInput.getCell(`G${r}`).value = { formula: rowF[6] };
    styleFormulaCell(wsInput.getCell(`G${r}`), '@', true);
    wsInput.getCell(`G${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.okFill } };
    wsInput.getCell(`G${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.okFont } };
  });

  // Секция 6 (строки 44..47): Расположение пароизоляции по нормам СП 2.04.01-2020 п. 10.6 и своя пароизоляция
  styleSectionRow(wsInput, 44, 7, '6. РАСПОЛОЖЕНИЕ ПАРОИЗОЛЯЦИИ (СП 2.04.01-2020 П. 10.6) И ДОБАВЛЕНИЕ СВОЕЙ ПАРОИЗОЛЯЦИИ');

  const wallVbPlaceDefault = getWallPlacementOption(
    calc.wall.vaporBarrier?.placement as WallVaporBarrierPlacement | undefined
  ).excelLabel;
  const roofVbPlaceDefault = getRoofPlacementOption(
    calc.roof.vaporBarrier?.placement as RoofVaporBarrierPlacement | undefined
  ).excelLabel;
  const wallPlaceListFormula = `"${WALL_VB_PLACEMENTS.map((p) => p.excelLabel).join(',')}"`;
  const roofPlaceListFormula = `"${ROOF_VB_PLACEMENTS.map((p) => p.excelLabel).join(',')}"`;

  wsInput.getRow(45).height = 22;
  wsInput.getCell('A45').value = 'Расположение пароизоляции в стене';
  styleLabelCell(wsInput.getCell('A45'), true);
  wsInput.getCell('B45').value = 'Поз. ст.';
  styleLabelCell(wsInput.getCell('B45'));
  wsInput.getCell('B45').alignment = { vertical: 'middle', horizontal: 'center' };
  wsInput.getCell('C45').value = wallVbPlaceDefault;
  styleInputCell(wsInput.getCell('C45'));
  wsInput.getCell('C45').dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: [wallPlaceListFormula],
    showErrorMessage: true,
    errorTitle: 'Недопустимая позиция',
    error: 'Выберите расположение пароизоляции стены из списка.',
  };
  wsInput.mergeCells('E45:G45');
  wsInput.getCell('E45').value = {
    formula: 'IF(C45="Перед утеплителем (по нормам СП 2.04.01)","✓ По нормам СП 2.04.01-2020 п. 10.6 (с теплой стороны утеплителя)","⚠ Нестандартная позиция — проверьте влажностный режим на «Стена_Расчет»")',
  };
  styleFormulaCell(wsInput.getCell('E45'), '@', true);
  wsInput.getCell('E45').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsInput.getRow(46).height = 22;
  wsInput.getCell('A46').value = 'Расположение пароизоляции в покрытии';
  styleLabelCell(wsInput.getCell('A46'), true);
  wsInput.getCell('B46').value = 'Поз. пк.';
  styleLabelCell(wsInput.getCell('B46'));
  wsInput.getCell('B46').alignment = { vertical: 'middle', horizontal: 'center' };
  wsInput.getCell('C46').value = roofVbPlaceDefault;
  styleInputCell(wsInput.getCell('C46'));
  wsInput.getCell('C46').dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: [roofPlaceListFormula],
    showErrorMessage: true,
    errorTitle: 'Недопустимая позиция',
    error: 'Выберите расположение пароизоляции покрытия из списка.',
  };
  wsInput.mergeCells('E46:G46');
  wsInput.getCell('E46').value = {
    formula: 'IF(C46="Перед утеплителем (по нормам СП 2.04.01)","✓ По нормам СП 2.04.01-2020 п. 10.6 (поверх ж/б плиты перед утеплителем)",IF(C46="После утеплителя (ошибочное расположение)","✗ ОШИБКА! Пароизоляция за утеплителем запирает влагу в толще утеплителя!","⚠ Нестандартная позиция — проверьте конденсацию на «Покрытие_Расчет»"))',
  };
  styleFormulaCell(wsInput.getCell('E46'), '@', true);
  wsInput.getCell('E46').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  wsInput.mergeCells('A47:G47');
  wsInput.getRow(47).height = 28;
  wsInput.getCell('A47').value =
    'СВОЯ ПАРОИЗОЛЯЦИЯ: Чтобы задать собственный материал, перейдите на лист «Справ_Пароизоляция» (желтые строки 18–20), введите наименование, базовую толщину δ (мм), R_п, λ, s, ρ и выберите его в выпадающем списке C17 (стена) или C19 (покрытие). При включении пароизоляции в таблицах t/E/e и на листе «В_отчет» автоматически появляется отдельный слой пароизоляции!';
  wsInput.getCell('A47').font = { name: 'Calibri', size: 9, bold: true, color: { argb: COLORS.vbFont } };
  wsInput.getCell('A47').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.vbFill } };
  wsInput.getCell('A47').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  for (let c = 1; c <= 7; c++) wsInput.getCell(47, c).border = THIN_BORDER;

  // =========================================================================
  // 3. ЛИСТ 2: «Стена_Расчет» (выбранный шифр С1–С30 + пароизоляция + интерп. Е.1)
  // =========================================================================
  styleTitleBanner(
    wsWallMain,
    'A1:K2',
    'РАСЧЕТ НАРУЖНОЙ СТЕНЫ (АВТОМАТИЧЕСКИ ПО ВЫБРАННОМУ ШИФРУ С1–С30)',
    'Все формулы связаны с листом «Ввод_и_Итоги». Поддержка выбора пароизоляции (материал и толщина), линейная интерполяция E(t) по табл. Е.1 и точка в середине утеплителя.'
  );
  wsWallMain.columns = [
    { width: 6 }, { width: 36 }, { width: 15 }, { width: 11 },
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 10 },
    { width: 11 }, { width: 11 }, { width: 18 },
  ];

  styleSectionRow(wsWallMain, 4, 11, '1. ВЫБРАННАЯ КОНСТРУКЦИЯ СТЕНЫ И СОСТАВ СЛОЕВ (ВКЛЮЧАЯ ПАРОИЗОЛЯЦИЮ)');
  wsWallMain.mergeCells('A5:B5');
  wsWallMain.getCell('A5').value = 'Шифр наружной стены:';
  styleLabelCell(wsWallMain.getCell('A5'), true);
  wsWallMain.getCell('C5').value = { formula: "'Ввод_и_Итоги'!$C$8" };
  styleFormulaCell(wsWallMain.getCell('C5'), '@', true, true);
  wsWallMain.mergeCells('D5:H5');
  wsWallMain.getCell('D5').value = {
    formula: `INDEX('Справ_Конструкции'!$C$${wallStartRow}:$C$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`,
  };
  styleFormulaCell(wsWallMain.getCell('D5'), '@', true);
  wsWallMain.getCell('D5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsWallMain.getCell('I5').value = 'Коэфф. n:';
  styleLabelCell(wsWallMain.getCell('I5'), true);
  wsWallMain.getCell('J5').value = {
    formula: `INDEX('Справ_Конструкции'!$D$${wallStartRow}:$D$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`,
  };
  styleFormulaCell(wsWallMain.getCell('J5'), '0.00', true, true);
  wsWallMain.getCell('K5').value = { formula: '"Условия "&\'Ввод_и_Итоги\'!$C$33' };
  styleFormulaCell(wsWallMain.getCell('K5'), '@', true);

  styleTableHeader(wsWallMain, 6, [
    '№', 'Наименование слоя (изнутри → наружу)', 'Код мат.', 'δ, м',
    'λ, Вт/(м·°C)', 'R_i, м²·°C/Вт', 's_i, Вт/(м²·°C)', 'D_i = R·s',
    'μ, мг/(м·ч·Па)', 'R_п.i', 'Тип слоя',
  ]);

  const layerColTriplets: [string, string, string][] = [
    ['E', 'F', 'G'],
    ['H', 'I', 'J'],
    ['K', 'L', 'M'],
    ['N', 'O', 'P'],
    ['Q', 'R', 'S'],
  ];

  // Строки 7..11 — 5 слоев конструкции стены из справочника
  for (let s = 0; s < 5; s++) {
    const r = 7 + s;
    const [cName, cMat, cThk] = layerColTriplets[s];
    wsWallMain.getRow(r).height = 20;
    wsWallMain.getCell(`A${r}`).value = s + 1;
    styleFormulaCell(wsWallMain.getCell(`A${r}`), '0');

    const nameF = `INDEX('Справ_Конструкции'!$${cName}$${wallStartRow}:$${cName}$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`;
    const matF = `INDEX('Справ_Конструкции'!$${cMat}$${wallStartRow}:$${cMat}$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`;
    const thkF = `INDEX('Справ_Конструкции'!$${cThk}$${wallStartRow}:$${cThk}$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`;

    wsWallMain.getCell(`B${r}`).value = {
      formula: `IF(${matF}="INSULATION","Утеплитель "&'Ввод_и_Итоги'!$C$11&" ("&'Ввод_и_Итоги'!$F$31&")",${nameF})`,
    };
    styleLabelCell(wsWallMain.getCell(`B${r}`));
    wsWallMain.getCell(`C${r}`).value = { formula: matF };
    styleFormulaCell(wsWallMain.getCell(`C${r}`), '@');
    // δ берется из $C$15 (принятая толщина утеплителя)
    wsWallMain.getCell(`D${r}`).value = { formula: `IF(C${r}="",0,IF(C${r}="INSULATION",$C$15,${thkF}))` };
    styleFormulaCell(wsWallMain.getCell(`D${r}`), '0.000');
    wsWallMain.getCell(`E${r}`).value = {
      formula: `IF(C${r}="",0,IF(C${r}="INSULATION",'Ввод_и_Итоги'!$F$33,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)))))`,
    };
    styleFormulaCell(wsWallMain.getCell(`E${r}`), '0.0000');
    wsWallMain.getCell(`F${r}`).value = { formula: `IF(E${r}>0,D${r}/E${r},0)` };
    styleFormulaCell(wsWallMain.getCell(`F${r}`), '0.0000');
    wsWallMain.getCell(`G${r}`).value = {
      formula: `IF(C${r}="",0,IF(C${r}="INSULATION",'Ввод_и_Итоги'!$F$34,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$G$2:$G$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$H$2:$H$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)))))`,
    };
    styleFormulaCell(wsWallMain.getCell(`G${r}`), '0.00');
    wsWallMain.getCell(`H${r}`).value = { formula: `ROUND(F${r}*G${r},3)` };
    styleFormulaCell(wsWallMain.getCell(`H${r}`), '0.000');
    wsWallMain.getCell(`I${r}`).value = {
      formula: `IF(C${r}="",0,IF(C${r}="INSULATION",'Ввод_и_Итоги'!$F$35,INDEX('Справ_Материалы'!$I$2:$I$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0))))`,
    };
    styleFormulaCell(wsWallMain.getCell(`I${r}`), '0.0000');
    wsWallMain.getCell(`J${r}`).value = { formula: `IF(I${r}>0,D${r}/I${r},0)` };
    styleFormulaCell(wsWallMain.getCell(`J${r}`), '0.000');
    wsWallMain.getCell(`K${r}`).value = {
      formula: `IF(C${r}="","—",IF(C${r}="INSULATION","УТЕПЛИТЕЛЬ","Конструктивный"))`,
    };
    styleFormulaCell(wsWallMain.getCell(`K${r}`), '@');
  }

  // Строка 12: Выбираемый слой пароизоляции стены (перед утеплителем с теплой стороны)
  wsWallMain.getRow(12).height = 20;
  wsWallMain.getCell('A12').value = 'ПИ';
  styleFormulaCell(wsWallMain.getCell('A12'), '@', true);
  wsWallMain.getCell('B12').value = { formula: `"Пароизоляция: "&'Ввод_и_Итоги'!$C$17` };
  styleLabelCell(wsWallMain.getCell('B12'), true);
  wsWallMain.getCell('C12').value = {
    formula: `INDEX('Справ_Пароизоляция'!$B$2:$B$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$17,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsWallMain.getCell('C12'), '@');
  wsWallMain.getCell('D12').value = { formula: `'Ввод_и_Итоги'!$F$18/1000` };
  styleFormulaCell(wsWallMain.getCell('D12'), '0.0000');
  wsWallMain.getCell('E12').value = {
    formula: `INDEX('Справ_Пароизоляция'!$E$2:$E$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$17,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsWallMain.getCell('E12'), '0.00');
  wsWallMain.getCell('F12').value = { formula: `IF(D12>0,D12/E12,0)` };
  styleFormulaCell(wsWallMain.getCell('F12'), '0.0000');
  wsWallMain.getCell('G12').value = {
    formula: `INDEX('Справ_Пароизоляция'!$F$2:$F$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$17,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsWallMain.getCell('G12'), '0.0');
  wsWallMain.getCell('H12').value = { formula: `ROUND(F12*G12,3)` };
  styleFormulaCell(wsWallMain.getCell('H12'), '0.000');
  wsWallMain.getCell('I12').value = { formula: `IF(J12>0,D12/J12,0)` };
  styleFormulaCell(wsWallMain.getCell('I12'), '0.00000');
  wsWallMain.getCell('J12').value = { formula: `'Ввод_и_Итоги'!$F$19` };
  styleFormulaCell(wsWallMain.getCell('J12'), '0.000', true, true);
  wsWallMain.getCell('K12').value = { formula: `IF(J12>0,"ПАРОИЗОЛЯЦИЯ","Не установлена")` };
  styleFormulaCell(wsWallMain.getCell('K12'), '@', true);

  // Ациклическая формула R_без_ут
  const wallNonInsRTerms = layerColTriplets
    .map(([, , cThk], s) => {
      const lr = 7 + s;
      const thkF = `INDEX('Справ_Конструкции'!$${cThk}$${wallStartRow}:$${cThk}$${wallEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${wallStartRow}:$A$${wallEndRow},0))`;
      return `IF(OR(C${lr}="",C${lr}="INSULATION",E${lr}<=0),0,${thkF}/E${lr})`;
    })
    .join('+');

  // Строки 13..22: Основные теплотехнические результаты стены
  const wallCalcRows: [number, string, string, string, string, boolean, boolean][] = [
    [13, 'Требуемое сопротивление теплопередаче R_пр = R_норм · n', "ROUND('Ввод_и_Итоги'!$F$26*$J$5,2)", '0.00', 'м²·°C/Вт', true, false],
    [14, 'Расчетная толщина утеплителя δ_ут.расч = (R_пр - R_без_ут)·λ_ут', `ROUND((C13-(1/'Ввод_и_Итоги'!$C$34+1/'Ввод_и_Итоги'!$C$35+${wallNonInsRTerms}))*'Ввод_и_Итоги'!$F$33,3)`, '0.000', 'м', false, false],
    [15, 'Принятая толщина утеплителя δ_ут.прин (ручн. правка в ячейке E15)', 'IF(E15="",MAX(0.05,ROUNDUP(C14,2)),E15)', '0.00', 'м', true, true],
    [16, 'Фактическое сопротивление теплопередаче R_0', "ROUND(1/'Ввод_и_Итоги'!$C$34+SUM(F7:F12)+1/'Ввод_и_Итоги'!$C$35,2)", '0.00', 'м²·°C/Вт', true, true],
    [17, 'Показатель тепловой инерции стены D = Σ(R_i · s_i)', 'ROUND(SUM(H7:H12),2)', '0.00', 'безразм.', false, false],
    [18, 'Расчетная зимняя температура наружного воздуха t_н (табл. 6.3 по D)', excelDesignTempByD('C17'), '0.0', '°C', true, false],
    [19, 'Фактический температурный перепад Δt_в = (t_в - t_н)/(R_0 · α_в)', "ROUND(('Ввод_и_Итоги'!$C$26-C18)/((1/'Ввод_и_Итоги'!$C$34+SUM(F7:F12)+1/'Ввод_и_Итоги'!$C$35)*'Ввод_и_Итоги'!$C$34),2)", '0.00', '°C', false, false],
    [20, 'Температура внутренней поверхности τ_в = t_в − (t_в − t_н)/(R_0·α_в)', "ROUND('Ввод_и_Итоги'!$C$26-('Ввод_и_Итоги'!$C$26-C18)/((1/'Ввод_и_Итоги'!$C$34+SUM(F7:F12)+1/'Ввод_и_Итоги'!$C$35)*'Ввод_и_Итоги'!$C$34),2)", '0.00', '°C', true, false],
    [21, 'Суммарное сопротивление паропроницанию R_п = 1/37 + ΣR_п.i + R_п.пи + 1/77', 'ROUND(1/37+SUM(J7:J12)+1/77,2)', '0.00', 'м²·ч·Па/мг', false, false],
    [22, 'Заключение по теплозащите и конденсации на поверхности', `IF(AND(C16>=C13,C20>'Ввод_и_Итоги'!$C$30,C19<='Ввод_и_Итоги'!$F$29),"СООТВЕТСТВУЕТ ✓","ТРЕБУЕТ ПРОВЕРКИ ✗")`, '@', 'СП 2.04.01-2020', true, true],
  ];

  wallCalcRows.forEach(([r, lbl, formula, fmt, unit, bold, accent]) => {
    wsWallMain.getRow(r).height = 20;
    wsWallMain.mergeCells(`A${r}:B${r}`);
    wsWallMain.getCell(`A${r}`).value = lbl;
    styleLabelCell(wsWallMain.getCell(`A${r}`), bold);
    const valCell = wsWallMain.getCell(`C${r}`);
    valCell.value = { formula };
    styleFormulaCell(valCell, fmt, bold, accent);
    wsWallMain.getCell(`D${r}`).value = unit;
    styleLabelCell(wsWallMain.getCell(`D${r}`));
  });

  wsWallMain.getCell('E14').value = 'Ручная δ_ут (м):';
  styleLabelCell(wsWallMain.getCell('E14'), true);
  wsWallMain.getCell('E15').value =
    calc.cipher.overrides?.wallInsulationThickness ??
    (calc.cipher.overrides?.wallCustomLayers || calc.cipher.overrides?.R_norm_wall !== undefined
      ? calc.wall.delta_insulation_adopted
      : null);
  styleInputCell(wsWallMain.getCell('E15'), '0.00');
  wsWallMain.mergeCells('F14:K15');
  wsWallMain.getCell('F14').value = 'Оставьте E15 пустой для автоподбора δ_ут вверх до 10 мм (0.01 м) или введите толщину вручную. Пароизоляция выбирается на листе «Ввод_и_Итоги» (C17:C18).';
  styleLabelCell(wsWallMain.getCell('F14'));

  // Расчет E_в по температуре помещения t_в и проверка запаса по температуре внутренней поверхности
  wsWallMain.mergeCells('E16:G16');
  wsWallMain.getCell('E16').value = 'Насыщенное давление пара внутри E_в(t_в):';
  styleLabelCell(wsWallMain.getCell('E16'), true);
  wsWallMain.getCell('H16').value = { formula: "'Ввод_и_Итоги'!$C$28" };
  styleFormulaCell(wsWallMain.getCell('H16'), '0.0', true, true);
  wsWallMain.mergeCells('I16:K16');
  wsWallMain.getCell('I16').value = {
    formula: '"Па (e_в = "&ROUND(\'Ввод_и_Итоги\'!$C$29,2)&" Па при φ_в="&\'Ввод_и_Итоги\'!$C$27&"%)"',
    result: `Па (e_в = ${calc.internalConditions.e_v.toFixed(2).replace('.', ',')} Па при φ_в=${calc.internalConditions.phi_v}%)`,
  };
  styleLabelCell(wsWallMain.getCell('I16'));

  wsWallMain.mergeCells('E17:G17');
  wsWallMain.getCell('E17').value = 'Точка росы внутреннего воздуха t_р:';
  styleLabelCell(wsWallMain.getCell('E17'));
  wsWallMain.getCell('H17').value = { formula: "'Ввод_и_Итоги'!$C$30" };
  styleFormulaCell(wsWallMain.getCell('H17'), '0.00', true);
  wsWallMain.mergeCells('I17:K17');
  wsWallMain.getCell('I17').value = '°C (интерполяция по табл. Е.1)';
  styleLabelCell(wsWallMain.getCell('I17'));

  wsWallMain.mergeCells('E18:G18');
  wsWallMain.getCell('E18').value = 'Запас до выпадения росы (τ_в − t_р):';
  styleLabelCell(wsWallMain.getCell('E18'), true);
  wsWallMain.getCell('H18').value = { formula: 'ROUND(C20-H17,2)' };
  styleFormulaCell(wsWallMain.getCell('H18'), '+0.00;-0.00;0.00', true, true);
  wsWallMain.mergeCells('I18:K18');
  wsWallMain.getCell('I18').value = '°C (стационарный расчет без коэфф. m)';
  styleLabelCell(wsWallMain.getCell('I18'));

  wsWallMain.mergeCells('E19:G19');
  wsWallMain.getCell('E19').value = 'Правило выбора t_н (табл. 6.3 СП 2.04.01):';
  styleLabelCell(wsWallMain.getCell('E19'));
  wsWallMain.mergeCells('H19:K19');
  wsWallMain.getCell('H19').value = { formula: excelDesignTempRuleByD('C17') };
  styleFormulaCell(wsWallMain.getCell('H19'), '@', true);

  wsWallMain.mergeCells('E20:G20');
  wsWallMain.getCell('E20').value = 'Позиция пароизоляции (перед слоем №):';
  styleLabelCell(wsWallMain.getCell('E20'), true);
  wsWallMain.getCell('H20').value = {
    formula:
      'IF(\'Ввод_и_Итоги\'!$C$45="На внутр. поверхности (перед слоем 1)",0,' +
      'IF(\'Ввод_и_Итоги\'!$C$45="После слоя 1",1,' +
      'IF(\'Ввод_и_Итоги\'!$C$45="После слоя 2",2,' +
      'IF(\'Ввод_и_Итоги\'!$C$45="После слоя 3",3,' +
      'IF(\'Ввод_и_Итоги\'!$C$45="После слоя 4",4,' +
      'IFERROR(MATCH("INSULATION",$C$7:$C$11,0)-1,5))))))',
  };
  styleFormulaCell(wsWallMain.getCell('H20'), '0', true, true);
  wsWallMain.mergeCells('I20:K20');
  wsWallMain.getCell('I20').value = { formula: "'Ввод_и_Итоги'!$C$45" };
  styleFormulaCell(wsWallMain.getCell('I20'), '@', true);

  // Блок 2 на Стена_Расчет: Метод Фокина с интерполяцией E(t) и ЯВНОЙ строкой пароизоляции в выбранной позиции ($H$20)
  styleSectionRow(wsWallMain, 24, 12, '2. ВЛАЖНОСТНЫЙ РЕЖИМ НАРУЖНОЙ СТЕНЫ (МЕТОД ФОКИНА, ЯВНЫЙ СЛОЙ ПАРОИЗОЛЯЦИИ, ИНТЕРПОЛЯЦИЯ E(t) ПО ТАБЛ. Е.1)');

  // Строка 25: Пояснение отличия столбцов t_зима и t_от.пер (какие значения куда брать)
  wsWallMain.mergeCells('A25:L25');
  const wallLegendCell = wsWallMain.getCell('A25');
  wallLegendCell.value =
    'ПОЯСНЕНИЕ К СТОЛБЦАМ t_зима И t_от.пер:  • t_зима (при расчетной зимней t_н) — берется для проверки τ_в > t_р, перепада Δt_в ≤ Δt_в.норм (разд. 2.2) и оценки промерзания;  • t_от.пер (при средней t_н.от за отоп. период) — берется для расчета E(t), e(x), проверки конденсации (метод Фокина), графиков Шибеко и AutoCAD (разд. 2.3). При выборе пароизоляции появляется отдельная строка «★ Пароизоляция» в позиции из Ввод_и_Итоги!C45.';
  wallLegendCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E3A5F' } };
  wallLegendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  wallLegendCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  wsWallMain.getRow(25).height = 36;
  for (let c = 1; c <= 12; c++) wsWallMain.getCell(25, c).border = THIN_BORDER;

  styleTableHeader(wsWallMain, 26, [
    '№', 'Сечение / граница слоя', 'x, мм', 'R_накопл',
    'R_п.накопл', 't_зима, °C\n(при t_н — для τ_в)', 't_от.пер, °C\n(при t_н.от — для E, e)', 'E(t), Па\n(интерп. Е.1)',
    'e_x, Па', 'Δ = E - e, Па', 'Конденсация', '№ акт.',
  ]);
  wsWallMain.getRow(26).height = 34;
  wsWallMain.getColumn(12).width = 8;

  const R_wall_exact = `(1/'Ввод_и_Итоги'!$C$34+SUM($F$7:$F$12)+1/'Ввод_и_Итоги'!$C$35)`;
  const Rp_wall_exact = `(1/37+SUM($J$7:$J$12)+1/77)`;

  // Строка 27: Внутренний воздух помещения (t_в, φ_в, E_в, e_в) — справочная строка, не попадает на графики (L27 = "")
  wsWallMain.getRow(27).height = 21;
  wsWallMain.getCell('A27').value = 'Воздух вн.';
  styleFormulaCell(wsWallMain.getCell('A27'), '@', true);
  wsWallMain.getCell('B27').value = {
    formula: '"Внутренний воздух помещения (t_в = "&\'Ввод_и_Итоги\'!$C$26&"°C, φ_в = "&\'Ввод_и_Итоги\'!$C$27&"%)"',
  };
  styleLabelCell(wsWallMain.getCell('B27'), true);
  wsWallMain.getCell('C27').value = 0;
  styleFormulaCell(wsWallMain.getCell('C27'), '0');
  wsWallMain.getCell('D27').value = 0;
  styleFormulaCell(wsWallMain.getCell('D27'), '0.000');
  wsWallMain.getCell('E27').value = 0;
  styleFormulaCell(wsWallMain.getCell('E27'), '0.000');
  wsWallMain.getCell('F27').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsWallMain.getCell('F27'), '0.00', true);
  wsWallMain.getCell('G27').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsWallMain.getCell('G27'), '0.00', true);
  wsWallMain.getCell('H27').value = { formula: "'Ввод_и_Итоги'!$C$28" };
  styleFormulaCell(wsWallMain.getCell('H27'), '0.0', true);
  wsWallMain.getCell('I27').value = { formula: "ROUND('Ввод_и_Итоги'!$C$29,2)" };
  styleFormulaCell(wsWallMain.getCell('I27'), '0.00', true);
  wsWallMain.getCell('J27').value = { formula: 'ROUND(H27-I27,1)' };
  styleFormulaCell(wsWallMain.getCell('J27'), '0.0', true);
  wsWallMain.getCell('K27').value = 'Внутр. воздух';
  styleFormulaCell(wsWallMain.getCell('K27'), '@', true);
  wsWallMain.getCell('L27').value = '';
  styleFormulaCell(wsWallMain.getCell('L27'), '@');
  for (let c = 1; c <= 11; c++) {
    wsWallMain.getCell(27, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
  }

  // Строки 28..44: 17 слотов (τ_в + 5 слоев × [слот ПИ перед слоем, середина утеплителя, граница слоя] + хвостовой слот ПИ)
  const wallFokinRows: {
    row: number;
    idx: number | string;
    nameF: string;
    xF: string;
    rCumF: string;
    rpCumF: string;
    isMid?: boolean;
    isVb?: boolean;
  }[] = [
    {
      row: 28,
      idx: 1,
      nameF: '"Внутренняя поверхность стены τ_в"',
      xF: '0',
      rCumF: "1/'Ввод_и_Итоги'!$C$34",
      rpCumF: '1/37',
    },
  ];

  let curWRow = 29;
  for (let s = 0; s < 5; s++) {
    const lr = 7 + s;
    const prevX = s === 0 ? '0' : `SUM($D$7:$D$${lr - 1})*1000`;
    const prevR = s === 0 ? `1/'Ввод_и_Итоги'!$C$34` : `1/'Ввод_и_Итоги'!$C$34+SUM($F$7:$F$${lr - 1})`;
    const prevRp = s === 0 ? `1/37` : `1/37+SUM($J$7:$J$${lr - 1})`;
    const vbXHere = `IF(AND($J$12>0,$H$20<=${s}),$D$12*1000,0)`;
    const vbRHere = `IF(AND($J$12>0,$H$20<=${s}),$F$12,0)`;
    const vbRpHere = `IF(AND($J$12>0,$H$20<=${s}),$J$12,0)`;

    // 1) Явная строка пароизоляции ПЕРЕД слоем s (активна только когда $J$12>0 и $H$20=s)
    wallFokinRows.push({
      row: curWRow++,
      idx: `ПИ.${s}`,
      nameF: `IF(AND($J$12>0,$H$20=${s}),"★ Пароизоляция: "&'Ввод_и_Итоги'!$C$17&" (δ="&ROUND('Ввод_и_Итоги'!$F$18,2)&" мм)","(позиция ПИ не здесь — пропуск)")`,
      xF: `IF(AND($J$12>0,$H$20=${s}),ROUND(${prevX}+$D$12*1000,1),"")`,
      rCumF: `IF(AND($J$12>0,$H$20=${s}),${prevR}+$F$12,"")`,
      rpCumF: `IF(AND($J$12>0,$H$20=${s}),${prevRp}+$J$12,"")`,
      isVb: true,
    });

    // 2) Середина утеплителя (учитывает ПИ, если $H$20 <= s)
    wallFokinRows.push({
      row: curWRow++,
      idx: `${s + 1}.5`,
      nameF: `IF($C$${lr}="INSULATION","★ Середина утеплителя ("&ROUND($D$${lr}*500,0)&" мм)","(не утеплитель — пропуск)")`,
      xF: `IF($C$${lr}="INSULATION",ROUND(${prevX}+${vbXHere}+$D$${lr}*500,1),"")`,
      rCumF: `IF($C$${lr}="INSULATION",${prevR}+${vbRHere}+$F$${lr}/2,"")`,
      rpCumF: `IF($C$${lr}="INSULATION",${prevRp}+${vbRpHere}+$J$${lr}/2,"")`,
      isMid: true,
    });

    // 3) Граница слоя s (учитывает ПИ, если $H$20 <= s)
    wallFokinRows.push({
      row: curWRow++,
      idx: s + 2,
      nameF: `IF($C$${lr}="","(слой отсутствует)","Граница слоя: "&$B$${lr})`,
      xF: `IF($C$${lr}="","",ROUND(SUM($D$7:$D$${lr})*1000+${vbXHere},1))`,
      rCumF: `IF($C$${lr}="","",1/'Ввод_и_Итоги'!$C$34+SUM($F$7:$F$${lr})+${vbRHere})`,
      rpCumF: `IF($C$${lr}="","",1/37+SUM($J$7:$J$${lr})+${vbRpHere})`,
    });
  }

  // Строка 44: хвостовой слот ПИ (если $H$20 >= 5)
  wallFokinRows.push({
    row: curWRow++, // 44
    idx: 'ПИ.5',
    nameF: `IF(AND($J$12>0,$H$20>=5),"★ Пароизоляция: "&'Ввод_и_Итоги'!$C$17&" (δ="&ROUND('Ввод_и_Итоги'!$F$18,2)&" мм)","(позиция ПИ не здесь — пропуск)")`,
    xF: `IF(AND($J$12>0,$H$20>=5),ROUND(SUM($D$7:$D$12)*1000,1),"")`,
    rCumF: `IF(AND($J$12>0,$H$20>=5),1/'Ввод_и_Итоги'!$C$34+SUM($F$7:$F$12),"")`,
    rpCumF: `IF(AND($J$12>0,$H$20>=5),1/37+SUM($J$7:$J$12),"")`,
    isVb: true,
  });

  wallFokinRows.forEach((fr) => {
    const r = fr.row;
    wsWallMain.getRow(r).height = 20;
    wsWallMain.getCell(`A${r}`).value = fr.idx;
    styleFormulaCell(wsWallMain.getCell(`A${r}`), '@', Boolean(fr.isVb));
    wsWallMain.getCell(`B${r}`).value = { formula: fr.nameF };
    styleLabelCell(wsWallMain.getCell(`B${r}`), Boolean(fr.isMid || fr.isVb));
    wsWallMain.getCell(`C${r}`).value = { formula: fr.xF };
    styleFormulaCell(wsWallMain.getCell(`C${r}`), 'General');
    wsWallMain.getCell(`D${r}`).value = { formula: fr.rCumF };
    styleFormulaCell(wsWallMain.getCell(`D${r}`), '0.000');
    wsWallMain.getCell(`E${r}`).value = { formula: fr.rpCumF };
    styleFormulaCell(wsWallMain.getCell(`E${r}`), '0.000');
    wsWallMain.getCell(`F${r}`).value = {
      formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-$C$18)/${R_wall_exact})*D${r})`,
    };
    styleFormulaCell(wsWallMain.getCell(`F${r}`), '0.00');
    wsWallMain.getCell(`G${r}`).value = {
      formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-'Ввод_и_Итоги'!$F$13)/${R_wall_exact})*D${r})`,
    };
    styleFormulaCell(wsWallMain.getCell(`G${r}`), '0.00', true);
    // ТОЧНАЯ ЛИНЕЙНАЯ ИНТЕРПОЛЯЦИЯ E(t) ПО ТАБЛИЦЕ Е.1 (по некругленному t_от.пер!)
    wsWallMain.getCell(`H${r}`).value = {
      formula: `IF(G${r}="","",${excelInterpE(`G${r}`, e1EndRow)})`,
    };
    styleFormulaCell(wsWallMain.getCell(`H${r}`), '0.0');
    wsWallMain.getCell(`I${r}`).value = {
      formula: `IF(E${r}="","",ROUND('Ввод_и_Итоги'!$C$29-(('Ввод_и_Итоги'!$C$29-'Ввод_и_Итоги'!$F$17)/${Rp_wall_exact})*E${r},2))`,
    };
    styleFormulaCell(wsWallMain.getCell(`I${r}`), '0.00');
    wsWallMain.getCell(`J${r}`).value = { formula: `IF(H${r}="","",ROUND(H${r}-I${r},1))` };
    styleFormulaCell(wsWallMain.getCell(`J${r}`), '0.0', true);
    wsWallMain.getCell(`K${r}`).value = {
      formula: `IF(J${r}="","",IF(J${r}>0,"Нет конденсата ✓","КОНДЕНСАТ ✗"))`,
    };
    styleFormulaCell(wsWallMain.getCell(`K${r}`), '@', true);
    // Порядковый номер активной точки (строки 28..44 — от τ_в до τ_н, без строк воздуха!)
    wsWallMain.getCell(`L${r}`).value =
      r === 28 ? 1 : { formula: `IF(C${r}="","",MAX($L$28:L${r - 1})+1)` };
    styleFormulaCell(wsWallMain.getCell(`L${r}`), '0');
    if (fr.isMid) {
      wsWallMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.midFill } };
    }
    if (fr.isVb) {
      wsWallMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.vbFill } };
      wsWallMain.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.vbFont } };
    }
  });

  // Строка 45: Наружный воздух (t_н — зима / t_н.от — отоп. период, E_н.от, e_н.от)
  wsWallMain.getRow(45).height = 21;
  wsWallMain.getCell('A45').value = 'Воздух нар.';
  styleFormulaCell(wsWallMain.getCell('A45'), '@', true);
  wsWallMain.getCell('B45').value = {
    formula: '"Наружный воздух (зима t_н = "&$C$18&"°C / от. пер. t_н.от = "&\'Ввод_и_Итоги\'!$F$13&"°C)"',
  };
  styleLabelCell(wsWallMain.getCell('B45'), true);
  wsWallMain.getCell('C45').value = { formula: 'ROUND(SUM($D$7:$D$12)*1000,1)' };
  styleFormulaCell(wsWallMain.getCell('C45'), 'General');
  wsWallMain.getCell('D45').value = { formula: R_wall_exact };
  styleFormulaCell(wsWallMain.getCell('D45'), '0.000');
  wsWallMain.getCell('E45').value = { formula: Rp_wall_exact };
  styleFormulaCell(wsWallMain.getCell('E45'), '0.000');
  wsWallMain.getCell('F45').value = { formula: '$C$18' };
  styleFormulaCell(wsWallMain.getCell('F45'), '0.00', true);
  wsWallMain.getCell('G45').value = { formula: "'Ввод_и_Итоги'!$F$13" };
  styleFormulaCell(wsWallMain.getCell('G45'), '0.00', true);
  wsWallMain.getCell('H45').value = { formula: "'Ввод_и_Итоги'!$F$16" };
  styleFormulaCell(wsWallMain.getCell('H45'), '0.0', true);
  wsWallMain.getCell('I45').value = { formula: "ROUND('Ввод_и_Итоги'!$F$17,2)" };
  styleFormulaCell(wsWallMain.getCell('I45'), '0.00', true);
  wsWallMain.getCell('J45').value = { formula: 'ROUND(H45-I45,1)' };
  styleFormulaCell(wsWallMain.getCell('J45'), '0.0', true);
  wsWallMain.getCell('K45').value = 'Нар. воздух';
  styleFormulaCell(wsWallMain.getCell('K45'), '@', true);
  wsWallMain.getCell('L45').value = '';
  styleFormulaCell(wsWallMain.getCell('L45'), '@');
  for (let c = 1; c <= 11; c++) {
    wsWallMain.getCell(45, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }

  // =========================================================================
  // 4. ЛИСТ 3: «Стены_Все_Схемы» (СРАВНЕНИЕ ВСЕХ 30 КОНСТРУКЦИЙ СТЕН С1–С30)
  // =========================================================================
  styleTitleBanner(
    wsWallAll,
    'A1:M2',
    'СРАВНИТЕЛЬНЫЙ РАСЧЕТ ВСЕХ 30 КОНСТРУКЦИЙ НАРУЖНЫХ СТЕН (С1–С30, СХЕМЫ «а»–«е»)',
    'Все 30 вариантов наружных стен пересчитываются автоматически по выбранному городу, типу здания, условиям А/Б и утеплителю с листа «Ввод_и_Итоги»'
  );
  wsWallAll.columns = [
    { width: 8 }, { width: 8 }, { width: 38 }, { width: 8 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 11 },
    { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 16 },
  ];
  styleTableHeader(wsWallAll, 4, [
    'Шифр', 'Схема', 'Описание конструкции стены', 'Коэф. n',
    'R_пр', 'R_без_ут', 'δ_ут.расч, м', 'δ_ут.прин, м',
    'R_0, факт', 'Инерция D', 't_н, °C', 'τ_в, °C', 'Статус',
  ]);

  wallList.forEach((wDef, idx) => {
    const r = 5 + idx;
    wsWallAll.getRow(r).height = 21;
    wsWallAll.getCell(`A${r}`).value = wDef.id;
    styleFormulaCell(wsWallAll.getCell(`A${r}`), '@', true, wDef.id === calc.cipher.wallCode);
    wsWallAll.getCell(`B${r}`).value = `«${wDef.type}»`;
    styleFormulaCell(wsWallAll.getCell(`B${r}`), '@');
    wsWallAll.getCell(`C${r}`).value = wDef.typeName;
    styleLabelCell(wsWallAll.getCell(`C${r}`));
    wsWallAll.getCell(`D${r}`).value = wDef.increasingFactor_n;
    styleFormulaCell(wsWallAll.getCell(`D${r}`), '0.00');
    wsWallAll.getCell(`E${r}`).value = { formula: `ROUND('Ввод_и_Итоги'!$F$26*D${r},2)` };
    styleFormulaCell(wsWallAll.getCell(`E${r}`), '0.00');

    const nonInsTerms = wDef.layers
      .filter((l) => !l.isInsulation && l.materialId)
      .map(
        (l) =>
          `${l.thickness}/IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)))`
      );
    wsWallAll.getCell(`F${r}`).value = {
      formula: `ROUND(1/'Ввод_и_Итоги'!$C$34+1/'Ввод_и_Итоги'!$C$35+${nonInsTerms.join('+')},3)`,
    };
    styleFormulaCell(wsWallAll.getCell(`F${r}`), '0.000');
    wsWallAll.getCell(`G${r}`).value = { formula: `ROUND((E${r}-F${r})*'Ввод_и_Итоги'!$F$33,3)` };
    styleFormulaCell(wsWallAll.getCell(`G${r}`), '0.000');
    wsWallAll.getCell(`H${r}`).value = { formula: `MAX(0.05,ROUNDUP(G${r},2))` };
    styleFormulaCell(wsWallAll.getCell(`H${r}`), '0.00', true, true);
    wsWallAll.getCell(`I${r}`).value = { formula: `ROUND(F${r}+H${r}/'Ввод_и_Итоги'!$F$33,2)` };
    styleFormulaCell(wsWallAll.getCell(`I${r}`), '0.00', true);

    const dTerms = wDef.layers.map((l) => {
      if (l.isInsulation) {
        return `(H${r}/'Ввод_и_Итоги'!$F$33)*'Ввод_и_Итоги'!$F$34`;
      }
      const mId = l.materialId || 'cement_sand_mortar_1800';
      return `(${l.thickness}/IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH("${mId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH("${mId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0))))*IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$G$2:$G$${matEndRow},MATCH("${mId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$H$2:$H$${matEndRow},MATCH("${mId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)))`;
    });
    wsWallAll.getCell(`J${r}`).value = { formula: `ROUND(${dTerms.join('+')},2)` };
    styleFormulaCell(wsWallAll.getCell(`J${r}`), '0.00');
    wsWallAll.getCell(`K${r}`).value = { formula: excelDesignTempByD(`J${r}`) };
    styleFormulaCell(wsWallAll.getCell(`K${r}`), '0.0');
    wsWallAll.getCell(`L${r}`).value = {
      formula: `ROUND('Ввод_и_Итоги'!$C$26-('Ввод_и_Итоги'!$C$26-K${r})/(I${r}*'Ввод_и_Итоги'!$C$34),2)`,
    };
    styleFormulaCell(wsWallAll.getCell(`L${r}`), '0.00');
    wsWallAll.getCell(`M${r}`).value = {
      formula: `IF(AND(I${r}>=E${r},L${r}>'Ввод_и_Итоги'!$C$30),"СООТВЕТСТВУЕТ ✓","ПРОВЕРИТЬ ✗")`,
    };
    styleFormulaCell(wsWallAll.getCell(`M${r}`), '@', true);
  });

  // =========================================================================
  // 5. ЛИСТ 4: «Покрытие_Расчет» (выбранное П1–П30 + пароизоляция + интерп. Е.1)
  // =========================================================================
  styleTitleBanner(
    wsRoofMain,
    'A1:L2',
    'РАСЧЕТ ПОКРЫТИЯ / ЧЕРДАЧНОГО ПЕРЕКРЫТИЯ (МНОГОПУСТОТНАЯ Ж/Б ПЛИТА П1–П30)',
    'Структура аналогична «Стена_Расчет»: полная таблица всех слоев (вкл. ж/б плиту, утеплитель и пароизоляцию), точный расчет R_п по пустоте (R_п.возд = 0) и по ребру, интерполяция E(t) по табл. Е.1'
  );
  wsRoofMain.columns = [
    { width: 6 }, { width: 38 }, { width: 15 }, { width: 11 },
    { width: 11 }, { width: 11 }, { width: 11 }, { width: 11 },
    { width: 11 }, { width: 11 }, { width: 20 }, { width: 8 },
  ];

  // Блок 1: Полная таблица слоев покрытия (идентично «Стена_Расчет», 11 столбцов A..K)
  styleSectionRow(wsRoofMain, 4, 12, '1. КОНСТРУКЦИЯ ПОКРЫТИЯ И ХАРАКТЕРИСТИКИ ВСЕХ СЛОЕВ (СВЯЗАНО С «Ввод_и_Итоги»)');
  wsRoofMain.mergeCells('A5:B5');
  wsRoofMain.getCell('A5').value = 'Шифр покрытия:';
  styleLabelCell(wsRoofMain.getCell('A5'), true);
  wsRoofMain.getCell('C5').value = { formula: "'Ввод_и_Итоги'!$C$9" };
  styleFormulaCell(wsRoofMain.getCell('C5'), '@', true, true);
  wsRoofMain.mergeCells('D5:H5');
  wsRoofMain.getCell('D5').value = {
    formula: `INDEX('Справ_Конструкции'!$C$${roofStartRow}:$C$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))`,
  };
  styleFormulaCell(wsRoofMain.getCell('D5'), '@', true);
  wsRoofMain.getCell('D5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsRoofMain.getCell('I5').value = 'Коэфф. n:';
  styleLabelCell(wsRoofMain.getCell('I5'), true);
  wsRoofMain.getCell('J5').value = {
    formula: `INDEX('Справ_Конструкции'!$D$${roofStartRow}:$D$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))`,
  };
  styleFormulaCell(wsRoofMain.getCell('J5'), '0.00', true, true);
  wsRoofMain.getCell('K5').value = { formula: '"Условия "&\'Ввод_и_Итоги\'!$C$33' };
  styleFormulaCell(wsRoofMain.getCell('K5'), '@', true);

  styleTableHeader(wsRoofMain, 6, [
    '№', 'Наименование слоя (изнутри → наружу)', 'Код мат.', 'δ, м',
    'λ, Вт/(м·°C)', 'R_i, м²·°C/Вт', 's_i, Вт/(м²·°C)', 'D_i = R·s',
    'μ, мг/(м·ч·Па)', 'R_п.i', 'Тип слоя',
  ]);

  // Помощник для заполнения конструктивного слоя покрытия (Внутр1, Внутр2, Нар1, Нар2) в формате «Стена_Расчет»
  const writeRoofLookupLayerRow = (
    r: number,
    numLabel: number,
    cN: string,
    cM: string,
    cD: string,
    roleLabel: string
  ) => {
    wsRoofMain.getRow(r).height = 20;
    const fName = `INDEX('Справ_Конструкции'!$${cN}$${roofStartRow}:$${cN}$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))`;
    const fMat = `INDEX('Справ_Конструкции'!$${cM}$${roofStartRow}:$${cM}$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))`;
    const fThk = `INDEX('Справ_Конструкции'!$${cD}$${roofStartRow}:$${cD}$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))`;
    wsRoofMain.getCell(`A${r}`).value = numLabel;
    styleFormulaCell(wsRoofMain.getCell(`A${r}`), '0');
    wsRoofMain.getCell(`B${r}`).value = { formula: `IF(C${r}="","(нет слоя)",${fName})` };
    styleLabelCell(wsRoofMain.getCell(`B${r}`));
    wsRoofMain.getCell(`C${r}`).value = { formula: fMat };
    styleFormulaCell(wsRoofMain.getCell(`C${r}`), '@');
    wsRoofMain.getCell(`D${r}`).value = { formula: `IF(C${r}="",0,${fThk})` };
    styleFormulaCell(wsRoofMain.getCell(`D${r}`), '0.000');
    wsRoofMain.getCell(`E${r}`).value = {
      formula: `IF(C${r}="",0,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0))))`,
    };
    styleFormulaCell(wsRoofMain.getCell(`E${r}`), '0.0000');
    wsRoofMain.getCell(`F${r}`).value = { formula: `IF(E${r}>0,ROUND(D${r}/E${r},4),0)` };
    styleFormulaCell(wsRoofMain.getCell(`F${r}`), '0.000');
    wsRoofMain.getCell(`G${r}`).value = {
      formula: `IF(C${r}="",0,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$G$2:$G$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$H$2:$H$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0))))`,
    };
    styleFormulaCell(wsRoofMain.getCell(`G${r}`), '0.00');
    wsRoofMain.getCell(`H${r}`).value = { formula: `ROUND(F${r}*G${r},3)` };
    styleFormulaCell(wsRoofMain.getCell(`H${r}`), '0.000');
    wsRoofMain.getCell(`I${r}`).value = {
      formula: `IF(C${r}="",0,INDEX('Справ_Материалы'!$I$2:$I$${matEndRow},MATCH(C${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)))`,
    };
    styleFormulaCell(wsRoofMain.getCell(`I${r}`), '0.000');
    wsRoofMain.getCell(`J${r}`).value = { formula: `IF(I${r}>0,ROUND(D${r}/I${r},3),0)` };
    styleFormulaCell(wsRoofMain.getCell(`J${r}`), '0.000');
    wsRoofMain.getCell(`K${r}`).value = { formula: `IF(C${r}="","(пустой слот)","${roleLabel}")` };
    styleFormulaCell(wsRoofMain.getCell(`K${r}`), '@');
  };

  // Строки 7..8: Внутренние слои (под плитой)
  writeRoofLookupLayerRow(7, 1, 'H', 'I', 'J', 'Внутренний слой');
  writeRoofLookupLayerRow(8, 2, 'K', 'L', 'M', 'Внутренний слой');

  // Строка 9: Многопустотная ж/б плита (приведенное R_пл в F9, D_i и R_п.i по пустоте в H9/J9 с R_п.возд = 0)
  wsRoofMain.getRow(9).height = 21;
  wsRoofMain.getCell('A9').value = 3;
  styleFormulaCell(wsRoofMain.getCell('A9'), '0', true);
  wsRoofMain.getCell('B9').value = {
    formula: '"Многопустотная ж/б плита (h="&ROUND(H15*1000,0)&" мм, пустота d="&ROUND(H16*1000,0)&" мм)"',
    result: `Многопустотная ж/б плита (h=${calc.roof.construction.slab.height} мм, пустота d=${calc.roof.construction.slab.voidDiameter} мм)`,
  };
  styleLabelCell(wsRoofMain.getCell('B9'), true);
  wsRoofMain.getCell('C9').value = 'ПЛИТА';
  styleFormulaCell(wsRoofMain.getCell('C9'), '@', true);
  wsRoofMain.getCell('D9').value = { formula: 'H15' };
  styleFormulaCell(wsRoofMain.getCell('D9'), '0.000', true);
  wsRoofMain.getCell('E9').value = { formula: 'H18' };
  styleFormulaCell(wsRoofMain.getCell('E9'), '0.0000');
  wsRoofMain.getCell('F9').value = { formula: 'H22' };
  styleFormulaCell(wsRoofMain.getCell('F9'), '0.000', true);
  wsRoofMain.getCell('G9').value = { formula: 'K18' };
  styleFormulaCell(wsRoofMain.getCell('G9'), '0.00');
  wsRoofMain.getCell('H9').value = { formula: 'ROUND((2*K15/H18)*K18,3)' };
  styleFormulaCell(wsRoofMain.getCell('H9'), '0.000');
  wsRoofMain.getCell('I9').value = 0.03;
  styleFormulaCell(wsRoofMain.getCell('I9'), '0.000');
  wsRoofMain.getCell('J9').value = { formula: 'ROUND((2*K15)/I9,3)' };
  styleFormulaCell(wsRoofMain.getCell('J9'), '0.000', true);
  wsRoofMain.getCell('K9').value = 'ПЛИТА (R_п.возд=0)';
  styleFormulaCell(wsRoofMain.getCell('K9'), '@', true);

  // Строка 10: Утеплитель покрытия
  wsRoofMain.getRow(10).height = 21;
  wsRoofMain.getCell('A10').value = 4;
  styleFormulaCell(wsRoofMain.getCell('A10'), '0', true);
  wsRoofMain.getCell('B10').value = {
    formula: `"Утеплитель "&'Ввод_и_Итоги'!$C$11&" ("&'Ввод_и_Итоги'!$F$31&")"`,
    result: `Утеплитель ${calc.cipher.insulationCode} (${calc.roof.insulation.name})`,
  };
  styleLabelCell(wsRoofMain.getCell('B10'), true);
  wsRoofMain.getCell('C10').value = 'INSULATION';
  styleFormulaCell(wsRoofMain.getCell('C10'), '@', true);
  wsRoofMain.getCell('D10').value = { formula: '$C$18' };
  styleFormulaCell(wsRoofMain.getCell('D10'), '0.000', true, true);
  wsRoofMain.getCell('E10').value = { formula: "'Ввод_и_Итоги'!$F$33" };
  styleFormulaCell(wsRoofMain.getCell('E10'), '0.0000');
  wsRoofMain.getCell('F10').value = { formula: 'IF(E10>0,ROUND(D10/E10,4),0)' };
  styleFormulaCell(wsRoofMain.getCell('F10'), '0.000', true);
  wsRoofMain.getCell('G10').value = { formula: "'Ввод_и_Итоги'!$F$34" };
  styleFormulaCell(wsRoofMain.getCell('G10'), '0.00');
  wsRoofMain.getCell('H10').value = { formula: 'ROUND(F10*G10,3)' };
  styleFormulaCell(wsRoofMain.getCell('H10'), '0.000');
  wsRoofMain.getCell('I10').value = { formula: "'Ввод_и_Итоги'!$F$35" };
  styleFormulaCell(wsRoofMain.getCell('I10'), '0.000');
  wsRoofMain.getCell('J10').value = { formula: 'IF(I10>0,ROUND(D10/I10,3),0)' };
  styleFormulaCell(wsRoofMain.getCell('J10'), '0.000');
  wsRoofMain.getCell('K10').value = 'УТЕПЛИТЕЛЬ';
  styleFormulaCell(wsRoofMain.getCell('K10'), '@', true);

  // Строки 11..12: Наружные слои (стяжка, кровля и др.)
  writeRoofLookupLayerRow(11, 5, 'N', 'O', 'P', 'Наружный слой');
  writeRoofLookupLayerRow(12, 6, 'Q', 'R', 'S', 'Наружный слой');

  // Строка 13: Пароизоляция покрытия (идентично «Стена_Расчет» строка 12!)
  wsRoofMain.getRow(13).height = 21;
  wsRoofMain.getCell('A13').value = 'ПИ';
  styleFormulaCell(wsRoofMain.getCell('A13'), '@', true);
  wsRoofMain.getCell('B13').value = { formula: `"Пароизоляция: "&'Ввод_и_Итоги'!$C$19` };
  styleLabelCell(wsRoofMain.getCell('B13'), true);
  wsRoofMain.getCell('C13').value = {
    formula: `INDEX('Справ_Пароизоляция'!$B$2:$B$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$19,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsRoofMain.getCell('C13'), '@');
  wsRoofMain.getCell('D13').value = { formula: `'Ввод_и_Итоги'!$F$20/1000` };
  styleFormulaCell(wsRoofMain.getCell('D13'), '0.0000');
  wsRoofMain.getCell('E13').value = {
    formula: `INDEX('Справ_Пароизоляция'!$E$2:$E$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$19,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsRoofMain.getCell('E13'), '0.00');
  wsRoofMain.getCell('F13').value = { formula: `IF(AND(D13>0,E13>0),D13/E13,0)` };
  styleFormulaCell(wsRoofMain.getCell('F13'), '0.0000');
  wsRoofMain.getCell('G13').value = {
    formula: `INDEX('Справ_Пароизоляция'!$F$2:$F$${vbEndRow},MATCH('Ввод_и_Итоги'!$C$19,'Справ_Пароизоляция'!$A$2:$A$${vbEndRow},0))`,
  };
  styleFormulaCell(wsRoofMain.getCell('G13'), '0.0');
  wsRoofMain.getCell('H13').value = { formula: `ROUND(F13*G13,3)` };
  styleFormulaCell(wsRoofMain.getCell('H13'), '0.000');
  wsRoofMain.getCell('I13').value = { formula: `IF(J13>0,D13/J13,0)` };
  styleFormulaCell(wsRoofMain.getCell('I13'), '0.00000');
  wsRoofMain.getCell('J13').value = { formula: `'Ввод_и_Итоги'!$F$21` };
  styleFormulaCell(wsRoofMain.getCell('J13'), '0.000', true, true);
  wsRoofMain.getCell('K13').value = { formula: `IF(J13>0,"ПАРОИЗОЛЯЦИЯ","Не установлена")` };
  styleFormulaCell(wsRoofMain.getCell('K13'), '@', true);

  // Точные выражения сопротивлений теплопередаче и паропроницанию по пустоте и по ребру
  const R_roof_void_exact = `(1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+(2*$K$15/$H$18+0.15)+$F$10+$F$11+$F$12+$F$13+1/'Ввод_и_Итоги'!$C$35)`;
  // СП 2.04.01-2020 п. 10.5 и Шибеко п. 7.1.3: сопротивление паропроницанию замкнутой воздушной прослойки равно 0 (R_п.возд = 0)
  const Rp_roof_void_exact = `(1/37+$J$7+$J$8+2*$K$15/0.03+$J$10+$J$11+$J$12+$J$13+1/77)`;
  const R_roof_rib_exact = `(1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+$F$10+$F$11+$F$12+$F$13+1/'Ввод_и_Итоги'!$C$35)`;
  const Rp_roof_rib_exact = `(1/37+$J$7+$J$8+$H$15/0.03+$J$10+$J$11+$J$12+$J$13+1/77)`;

  // Блок 2 (строки 14..26): Сводка расчета покрытия слева (A15:D26) + Геометрия плиты и параметры справа (E15:K26)
  styleSectionRow(wsRoofMain, 14, 12, '2. ПОДБОР УТЕПЛИТЕЛЯ, РАСЧЕТ R_п ПОКРЫТИЯ И ГЕОМЕТРИЯ МНОГОПУСТОТНОЙ Ж/Б ПЛИТЫ');

  const roofSummaryRows: [number, string, string, string, string, boolean, boolean][] = [
    [15, 'Сопротивление покрытия без утеплителя R_без_ут', `ROUND(1/'Ввод_и_Итоги'!$C$34+F7+F8+F9+F11+F12+F13+1/'Ввод_и_Итоги'!$C$35,4)`, '0.000', 'м²·°C/Вт', false, false],
    [16, 'Требуемое сопротивление теплопередаче R_пр = R_норм · n', `ROUND('Ввод_и_Итоги'!$F$27*$J$5,2)`, '0.00', 'м²·°C/Вт', true, false],
    [17, 'Расчетная толщина утеплителя δ_ут.расч = (R_пр - R_без_ут)·λ_ут', `ROUND((C16-C15)*'Ввод_и_Итоги'!$F$33,3)`, '0.000', 'м', false, false],
    [18, 'Принятая толщина утеплителя δ_ут.прин (ручн. правка в K19)', 'IF(K19="",MAX(0.05,ROUNDUP(C17,2)),K19)', '0.00', 'м', true, true],
    [19, 'Фактическое приведенное сопротивление покрытия R_0', `ROUND(1/'Ввод_и_Итоги'!$C$34+SUM(F7:F13)+1/'Ввод_и_Итоги'!$C$35,2)`, '0.00', 'м²·°C/Вт', true, true],
    [20, 'Фактическое сопротивление по сечению через пустоту R_0^пуст', `ROUND(${R_roof_void_exact},2)`, '0.00', 'м²·°C/Вт', false, false],
    [21, 'Тепловая инерция покрытия по пустоте D_покрытия (s_возд = 0)', 'ROUND(SUM(H7:H13),2)', '0.00', 'безразм.', false, false],
    [22, 'Расчетная зимняя температура t_н для покрытия (по D_покрытия)', excelDesignTempByD('C21'), '0.0', '°C', true, false],
    [23, 'Температура внутренней поверхности потолка τ_в (по пустоте)', `ROUND('Ввод_и_Итоги'!$C$26-('Ввод_и_Итоги'!$C$26-C22)/(${R_roof_void_exact}*'Ввод_и_Итоги'!$C$34),2)`, '0.00', '°C', true, false],
    [24, 'Суммарное сопротивление паропроницанию R_п (по пустоте, R_п.возд=0)', `ROUND(${Rp_roof_void_exact},2)`, '0.00', 'м²·ч·Па/мг', true, true],
    [25, 'Суммарное сопротивление паропроницанию R_п (по сплошному ребру)', `ROUND(${Rp_roof_rib_exact},2)`, '0.00', 'м²·ч·Па/мг', true, false],
    [26, 'Заключение по покрытию / чердачному перекрытию', `IF(AND(C19>=C16,C23>'Ввод_и_Итоги'!$C$30),"СООТВЕТСТВУЕТ ✓","ТРЕБУЕТ ПРОВЕРКИ ✗")`, '@', 'СП 2.04.01-2020', true, true],
  ];
  roofSummaryRows.forEach(([r, lbl, formula, fmt, unit, bold, accent]) => {
    wsRoofMain.getRow(r).height = 20;
    wsRoofMain.mergeCells(`A${r}:B${r}`);
    wsRoofMain.getCell(`A${r}`).value = lbl;
    styleLabelCell(wsRoofMain.getCell(`A${r}`), bold);
    wsRoofMain.getCell(`C${r}`).value = { formula };
    styleFormulaCell(wsRoofMain.getCell(`C${r}`), fmt, bold, accent);
    wsRoofMain.getCell(`D${r}`).value = unit;
    styleLabelCell(wsRoofMain.getCell(`D${r}`));
  });

  // Справа E15:K26: Параметры многопустотной ж/б плиты (E:H) + Ввод ручной δ_ут, R_п ПИ, микроклимат и позиция ПИ (I:K)
  const slabRightRows: [number, string, string, string, boolean, boolean, string, string | number | null, string, boolean, boolean, boolean][] = [
    [
      15,
      'Высота плиты h, м',
      `INDEX('Справ_Конструкции'!$E$${roofStartRow}:$E$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))/1000`,
      '0.000', false, false,
      'Полка δ_ф = (h-d)/2, м', '(H15-H16)/2', '0.000', false, false, false,
    ],
    [
      16,
      'Диаметр пустоты d, м',
      `INDEX('Справ_Конструкции'!$F$${roofStartRow}:$F$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))/1000`,
      '0.000', false, false,
      'Сторона экв. кв. a, м', 'ROUND(SQRT(PI()*H16^2/4),4)', '0.0000', false, false, false,
    ],
    [
      17,
      'Шаг пустот b_шаг, м',
      `INDEX('Справ_Конструкции'!$G$${roofStartRow}:$G$${roofEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${roofStartRow}:$A$${roofEndRow},0))/1000`,
      '0.000', false, false,
      'Ширина ребра b_1 = b-a, м', 'ROUND(H17-K16,4)', '0.0000', false, false, false,
    ],
    [
      18,
      'λ железобетона λ_б (А/Б)',
      `IF('Ввод_и_Итоги'!$C$33="А",1.92,2.04)`,
      '0.00', false, false,
      'Теплоусвоение s_бет', `IF('Ввод_и_Итоги'!$C$33="А",17.98,19.4)`, '0.00', false, false, false,
    ],
    [
      19,
      'Прив. полка δ_п = (h-a)/2, м',
      'ROUND((H15-K16)/2,4)',
      '0.0000', false, false,
      'Ручная δ_ут (м, пусто=авто):',
      calc.cipher.overrides?.roofInsulationThickness ??
        (calc.cipher.overrides?.roofCustomLayers || calc.cipher.overrides?.R_norm_roof !== undefined
          ? calc.roof.delta_insulation_adopted
          : null),
      '0.00', true, false, true,
    ],
    [
      20,
      'R_1 по ребру = h / λ_б',
      'H15/H18',
      '0.0000', false, false,
      'R_п пароизоляции (J13):', 'J13', '0.000', true, true, false,
    ],
    [
      21,
      'R_2 по пустоте = 2δ_п/λ_б+0.15',
      '(2*H19)/H18+0.15',
      '0.0000', false, false,
      'Насыщ. давление E_в, Па:', "'Ввод_и_Итоги'!$C$28", '0.0', true, false, false,
    ],
    [
      22,
      'Приведенное R_пл плиты',
      'ROUND((K17+K16)/(K17/H20+K16/H21),3)',
      '0.000', true, true,
      'Точка росы t_р, °C:', "'Ввод_и_Итоги'!$C$30", '0.00', true, false, false,
    ],
    [
      23,
      'τ_в по ребру (худшее сеч.), °C',
      `ROUND('Ввод_и_Итоги'!$C$26-('Ввод_и_Итоги'!$C$26-C22)/(${R_roof_rib_exact}*'Ввод_и_Итоги'!$C$34),2)`,
      '0.00', true, false,
      'R_0 по ребру, м²·°C/Вт:', `ROUND(${R_roof_rib_exact},2)`, '0.00', false, false, false,
    ],
  ];

  slabRightRows.forEach(([r, lbl1, f1, fmt1, b1, a1, lbl2, f2, fmt2, b2, a2, isInput2]) => {
    wsRoofMain.mergeCells(`E${r}:G${r}`);
    wsRoofMain.getCell(`E${r}`).value = lbl1;
    styleLabelCell(wsRoofMain.getCell(`E${r}`), b1);
    wsRoofMain.getCell(`H${r}`).value = { formula: f1 };
    styleFormulaCell(wsRoofMain.getCell(`H${r}`), fmt1, b1, a1);

    wsRoofMain.mergeCells(`I${r}:J${r}`);
    wsRoofMain.getCell(`I${r}`).value = lbl2;
    styleLabelCell(wsRoofMain.getCell(`I${r}`), b2);
    const kCell = wsRoofMain.getCell(`K${r}`);
    if (isInput2) {
      kCell.value = f2 as number | null;
      styleInputCell(kCell, fmt2);
    } else {
      kCell.value = { formula: f2 as string };
      styleFormulaCell(kCell, fmt2, b2, a2);
    }
  });

  wsRoofMain.mergeCells('E24:G24');
  wsRoofMain.getCell('E24').value = 'Правило выбора t_н (табл. 6.3 СП 2.04.01):';
  styleLabelCell(wsRoofMain.getCell('E24'));
  wsRoofMain.mergeCells('H24:K24');
  wsRoofMain.getCell('H24').value = { formula: excelDesignTempRuleByD('C21') };
  styleFormulaCell(wsRoofMain.getCell('H24'), '@', true);

  wsRoofMain.mergeCells('E25:G25');
  wsRoofMain.getCell('E25').value = 'Позиция пароизоляции (код 0..3):';
  styleLabelCell(wsRoofMain.getCell('E25'), true);
  wsRoofMain.getCell('H25').value = {
    formula:
      'IF(\'Ввод_и_Итоги\'!$C$46="На внутр. поверхности потолка",0,' +
      'IF(\'Ввод_и_Итоги\'!$C$46="После внутр. отделки (под плитой)",1,' +
      'IF(\'Ввод_и_Итоги\'!$C$46="После утеплителя (ошибочное расположение)",3,2)))',
  };
  styleFormulaCell(wsRoofMain.getCell('H25'), '0', true, true);
  wsRoofMain.mergeCells('I25:K25');
  wsRoofMain.getCell('I25').value = { formula: "'Ввод_и_Итоги'!$C$46" };
  styleFormulaCell(wsRoofMain.getCell('I25'), '@', true);

  wsRoofMain.mergeCells('E26:K26');
  wsRoofMain.getCell('E26').value = {
    formula: '"e_в = "&ROUND(\'Ввод_и_Итоги\'!$C$29,2)&" Па; выбор пароизоляции покрытия на «Ввод_и_Итоги» (C19:C20, C46)"',
    result: `e_в = ${calc.internalConditions.e_v.toFixed(2).replace('.', ',')} Па; выбор пароизоляции покрытия на «Ввод_и_Итоги» (C19:C20, C46)`,
  };
  styleLabelCell(wsRoofMain.getCell('E26'));

  // Таблица 3 (строки 30..47): Влажностный режим покрытия (Сечение I по пустоте — с ЯВНЫМ слоем пароизоляции, интерполяцией E(t) и R_п.возд = 0!)
  styleSectionRow(wsRoofMain, 30, 12, '3. ВЛАЖНОСТНЫЙ РЕЖИМ ПОКРЫТИЯ (СЕЧЕНИЕ I ПО ПУСТОТЕ ПЛИТЫ, ЯВНЫЙ СЛОЙ ПАРОИЗОЛЯЦИИ, R_п.возд = 0)');

  // Строка 31: Пояснение отличия столбцов t_зима и t_от.пер
  wsRoofMain.mergeCells('A31:L31');
  const roofLegendCell = wsRoofMain.getCell('A31');
  roofLegendCell.value =
    'ПОЯСНЕНИЕ К СТОЛБЦАМ t_зима И t_от.пер:  • t_зима (при расчетной зимней t_н) — берется для проверки τ_в > t_р и перепада Δt_в ≤ Δt_в.норм (разд. 3.2);  • t_от.пер (при средней t_н.от за отоп. период) — берется для расчета E(t), e(x), метода Фокина (подбор пароизоляции), графиков Шибеко и AutoCAD (разд. 3.3). При выборе пароизоляции появляется отдельная строка «★ Пароизоляция» в позиции из Ввод_и_Итоги!C46.';
  roofLegendCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1E3A5F' } };
  roofLegendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  roofLegendCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  wsRoofMain.getRow(31).height = 36;
  for (let c = 1; c <= 12; c++) wsRoofMain.getCell(31, c).border = THIN_BORDER;

  styleTableHeader(wsRoofMain, 32, [
    '№', 'Сечение / граница слоя', 'x, мм', 'R_накопл',
    'R_п.накопл', 't_зима, °C\n(при t_н — для τ_в)', 't_от.пер, °C\n(при t_н.от — для E, e)', 'E(t), Па\n(интерп. Е.1)',
    'e_x, Па', 'Δ = E - e, Па', 'Конденсация', '№ акт.',
  ]);
  wsRoofMain.getRow(32).height = 34;

  // Строка 33: Внутренний воздух (под потолком) — справочная строка, не попадает в графики (L33 = "")
  wsRoofMain.getRow(33).height = 21;
  wsRoofMain.getCell('A33').value = 'Воздух вн.';
  styleFormulaCell(wsRoofMain.getCell('A33'), '@', true);
  wsRoofMain.getCell('B33').value = {
    formula: '"Внутренний воздух помещения (t_в = "&\'Ввод_и_Итоги\'!$C$26&"°C, φ_в = "&\'Ввод_и_Итоги\'!$C$27&"%)"',
  };
  styleLabelCell(wsRoofMain.getCell('B33'), true);
  wsRoofMain.getCell('C33').value = 0;
  styleFormulaCell(wsRoofMain.getCell('C33'), '0');
  wsRoofMain.getCell('D33').value = 0;
  styleFormulaCell(wsRoofMain.getCell('D33'), '0.000');
  wsRoofMain.getCell('E33').value = 0;
  styleFormulaCell(wsRoofMain.getCell('E33'), '0.000');
  wsRoofMain.getCell('F33').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsRoofMain.getCell('F33'), '0.00', true);
  wsRoofMain.getCell('G33').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsRoofMain.getCell('G33'), '0.00', true);
  wsRoofMain.getCell('H33').value = { formula: "'Ввод_и_Итоги'!$C$28" };
  styleFormulaCell(wsRoofMain.getCell('H33'), '0.0', true);
  wsRoofMain.getCell('I33').value = { formula: "ROUND('Ввод_и_Итоги'!$C$29,2)" };
  styleFormulaCell(wsRoofMain.getCell('I33'), '0.00', true);
  wsRoofMain.getCell('J33').value = { formula: 'ROUND(H33-I33,1)' };
  styleFormulaCell(wsRoofMain.getCell('J33'), '0.0', true);
  wsRoofMain.getCell('K33').value = 'Внутр. воздух';
  styleFormulaCell(wsRoofMain.getCell('K33'), '@', true);
  wsRoofMain.getCell('L33').value = '';
  styleFormulaCell(wsRoofMain.getCell('L33'), '@');
  for (let c = 1; c <= 11; c++) {
    wsRoofMain.getCell(33, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
  }

  // Хелперы: учтена ли пароизоляция к этапу k (0=поверхность, 1=после отделки, 2=перед утеплителем, 3=после утеплителя)
  const rVbX = (k: number) => `IF(AND($J$13>0,$H$25<=${k}),$D$13*1000,0)`;
  const rVbR = (k: number) => `IF(AND($J$13>0,$H$25<=${k}),$F$13,0)`;
  const rVbRp = (k: number) => `IF(AND($J$13>0,$H$25<=${k}),$J$13,0)`;
  const rVbLabel = `"★ Пароизоляция: "&'Ввод_и_Итоги'!$C$19&" (δ="&ROUND('Ввод_и_Итоги'!$F$20,2)&" мм)"`;

  // Строки 34..46 (13 слотов, до 10 активных): активные точки с автосжатием в столбце L и явной строкой пароизоляции!
  const roofVoidPts: [string | number, string, string, string, string, boolean?, boolean?][] = [
    [1, '"Внутренняя поверхность потолка τ_в"', '0', "1/'Ввод_и_Итоги'!$C$34", '1/37'],
    ['ПИ.0', `IF(AND($J$13>0,$H$25=0),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=0),ROUND($D$13*1000,1),"")`, `IF(AND($J$13>0,$H$25=0),1/'Ввод_и_Итоги'!$C$34+$F$13,"")`, `IF(AND($J$13>0,$H$25=0),1/37+$J$13,"")`, false, true],
    [2, 'IF($C$7="","(нет внутр. слоя — пропуск)","Граница: "&$B$7)', `IF($C$7="","",ROUND(($D$7+$D$8)*1000+${rVbX(0)},1))`, `IF($C$7="","",1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+${rVbR(0)})`, `IF($C$7="","",1/37+$J$7+$J$8+${rVbRp(0)})`],
    ['ПИ.1', `IF(AND($J$13>0,$H$25=1),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=1),ROUND(($D$7+$D$8+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=1),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$F$13,"")`, `IF(AND($J$13>0,$H$25=1),1/37+$J$7+$J$8+$J$13,"")`, false, true],
    [3, '"Граница: Нижняя полка ж/б плиты"', `ROUND(($D$7+$D$8+$K$15)*1000+${rVbX(1)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$K$15/$H$18+${rVbR(1)}`, `1/37+$J$7+$J$8+$K$15/0.03+${rVbRp(1)}`],
    [4, '"Граница: Воздушная прослойка (пустота d, R_п=0)"', `ROUND(($D$7+$D$8+$K$15+$H$16)*1000+${rVbX(1)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$K$15/$H$18+0.15+${rVbR(1)}`, `1/37+$J$7+$J$8+$K$15/0.03+${rVbRp(1)}`],
    [5, '"Граница: Верхняя полка ж/б плиты"', `ROUND(($D$7+$D$8+$H$15)*1000+${rVbX(1)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+${rVbR(1)}`, `1/37+$J$7+$J$8+2*$K$15/0.03+${rVbRp(1)}`],
    ['ПИ.2', `IF(AND($J$13>0,$H$25=2),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=2),ROUND(($D$7+$D$8+$H$15+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=2),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+$F$13,"")`, `IF(AND($J$13>0,$H$25=2),1/37+$J$7+$J$8+2*$K$15/0.03+$J$13,"")`, false, true],
    [6, '"★ Середина утеплителя ("&ROUND($D$10*500,0)&" мм)"', `ROUND(($D$7+$D$8+$H$15+$D$10/2)*1000+${rVbX(2)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+${rVbR(2)}+$F$10/2`, `1/37+$J$7+$J$8+2*$K$15/0.03+${rVbRp(2)}+$J$10/2`, true, false],
    [7, '"Граница: Утеплитель "&\'Ввод_и_Итоги\'!$C$11', `ROUND(($D$7+$D$8+$H$15+$D$10)*1000+${rVbX(2)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+${rVbR(2)}+$F$10`, `1/37+$J$7+$J$8+2*$K$15/0.03+${rVbRp(2)}+$J$10`],
    ['ПИ.3', `IF(AND($J$13>0,$H$25=3),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=3),ROUND(($D$7+$D$8+$H$15+$D$10+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=3),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+$F$10+$F$13,"")`, `IF(AND($J$13>0,$H$25=3),1/37+$J$7+$J$8+2*$K$15/0.03+$J$10+$J$13,"")`, false, true],
    [8, 'IF($C$12="","(1 нар. слой — пропуск)","Граница: "&$B$11&" (под кровлей)")', `IF($C$12="","",ROUND(($D$7+$D$8+$H$15+$D$10+$D$11)*1000+${rVbX(3)},1))`, `IF($C$12="","",1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+$F$10+$F$11+${rVbR(3)})`, `IF($C$12="","",1/37+$J$7+$J$8+2*$K$15/0.03+$J$10+$J$11+${rVbRp(3)})`],
    [9, '"Наружная поверхность покрытия τ_н"', `ROUND(($D$7+$D$8+$H$15+$D$10+$D$11+$D$12)*1000+${rVbX(3)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+2*$K$15/$H$18+0.15+$F$10+$F$11+$F$12+${rVbR(3)}`, `1/37+$J$7+$J$8+2*$K$15/0.03+$J$10+$J$11+$J$12+${rVbRp(3)}`],
  ];

  roofVoidPts.forEach(([idx, nameF, xF, rF, rpF, isMid, isVb], i) => {
    const r = 34 + i; // 34..46
    wsRoofMain.getRow(r).height = 20;
    wsRoofMain.getCell(`A${r}`).value = idx;
    styleFormulaCell(wsRoofMain.getCell(`A${r}`), '@', Boolean(isVb));
    wsRoofMain.getCell(`B${r}`).value = { formula: nameF };
    styleLabelCell(wsRoofMain.getCell(`B${r}`), Boolean(isMid || isVb));
    wsRoofMain.getCell(`C${r}`).value = { formula: xF };
    styleFormulaCell(wsRoofMain.getCell(`C${r}`), 'General');
    wsRoofMain.getCell(`D${r}`).value = { formula: rF };
    styleFormulaCell(wsRoofMain.getCell(`D${r}`), '0.000');
    wsRoofMain.getCell(`E${r}`).value = { formula: rpF };
    styleFormulaCell(wsRoofMain.getCell(`E${r}`), '0.000');
    wsRoofMain.getCell(`F${r}`).value = { formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-$C$22)/${R_roof_void_exact})*D${r})` };
    styleFormulaCell(wsRoofMain.getCell(`F${r}`), '0.00');
    wsRoofMain.getCell(`G${r}`).value = { formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-'Ввод_и_Итоги'!$F$13)/${R_roof_void_exact})*D${r})` };
    styleFormulaCell(wsRoofMain.getCell(`G${r}`), '0.00', true);
    wsRoofMain.getCell(`H${r}`).value = { formula: `IF(G${r}="","",${excelInterpE(`G${r}`, e1EndRow)})` };
    styleFormulaCell(wsRoofMain.getCell(`H${r}`), '0.0');
    wsRoofMain.getCell(`I${r}`).value = { formula: `IF(E${r}="","",ROUND('Ввод_и_Итоги'!$C$29-(('Ввод_и_Итоги'!$C$29-'Ввод_и_Итоги'!$F$17)/${Rp_roof_void_exact})*E${r},2))` };
    styleFormulaCell(wsRoofMain.getCell(`I${r}`), '0.00');
    wsRoofMain.getCell(`J${r}`).value = { formula: `IF(H${r}="","",ROUND(H${r}-I${r},1))` };
    styleFormulaCell(wsRoofMain.getCell(`J${r}`), '0.0', true);
    wsRoofMain.getCell(`K${r}`).value = { formula: `IF(J${r}="","",IF(J${r}>0,"Нет конденсата ✓","НУЖНА ПАРОИЗОЛЯЦИЯ ✗"))` };
    styleFormulaCell(wsRoofMain.getCell(`K${r}`), '@', true);
    wsRoofMain.getCell(`L${r}`).value =
      r === 34 ? 1 : { formula: `IF(C${r}="","",MAX($L$34:L${r - 1})+1)` };
    styleFormulaCell(wsRoofMain.getCell(`L${r}`), '0');
    if (isMid) {
      wsRoofMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.midFill } };
    }
    if (isVb) {
      wsRoofMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.vbFill } };
      wsRoofMain.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.vbFont } };
    }
  });

  // Строка 47: Наружный воздух (t_н — зима / t_н.от — отоп. период, E_н.от, e_н.от)
  wsRoofMain.getRow(47).height = 21;
  wsRoofMain.getCell('A47').value = 'Воздух нар.';
  styleFormulaCell(wsRoofMain.getCell('A47'), '@', true);
  wsRoofMain.getCell('B47').value = {
    formula: '"Наружный воздух (зима t_н = "&$C$22&"°C / от. пер. t_н.от = "&\'Ввод_и_Итоги\'!$F$13&"°C)"',
  };
  styleLabelCell(wsRoofMain.getCell('B47'), true);
  wsRoofMain.getCell('C47').value = { formula: 'ROUND(SUM($D$7:$D$13)*1000,1)' };
  styleFormulaCell(wsRoofMain.getCell('C47'), 'General');
  wsRoofMain.getCell('D47').value = { formula: R_roof_void_exact };
  styleFormulaCell(wsRoofMain.getCell('D47'), '0.000');
  wsRoofMain.getCell('E47').value = { formula: Rp_roof_void_exact };
  styleFormulaCell(wsRoofMain.getCell('E47'), '0.000');
  wsRoofMain.getCell('F47').value = { formula: '$C$22' };
  styleFormulaCell(wsRoofMain.getCell('F47'), '0.00', true);
  wsRoofMain.getCell('G47').value = { formula: "'Ввод_и_Итоги'!$F$13" };
  styleFormulaCell(wsRoofMain.getCell('G47'), '0.00', true);
  wsRoofMain.getCell('H47').value = { formula: "'Ввод_и_Итоги'!$F$16" };
  styleFormulaCell(wsRoofMain.getCell('H47'), '0.0', true);
  wsRoofMain.getCell('I47').value = { formula: "ROUND('Ввод_и_Итоги'!$F$17,2)" };
  styleFormulaCell(wsRoofMain.getCell('I47'), '0.00', true);
  wsRoofMain.getCell('J47').value = { formula: 'ROUND(H47-I47,1)' };
  styleFormulaCell(wsRoofMain.getCell('J47'), '0.0', true);
  wsRoofMain.getCell('K47').value = 'Нар. воздух';
  styleFormulaCell(wsRoofMain.getCell('K47'), '@', true);
  wsRoofMain.getCell('L47').value = '';
  styleFormulaCell(wsRoofMain.getCell('L47'), '@');
  for (let c = 1; c <= 11; c++) {
    wsRoofMain.getCell(47, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }

  // Таблица 4 (строки 49..62): Худшее сечение (Сечение II по сплошному бетонному ребру плиты — с явной строкой ПИ и ранжированием L52:L61)
  styleSectionRow(wsRoofMain, 49, 12, '4. ХУДШЕЕ СЕЧЕНИЕ ПОКРЫТИЯ (СЕЧЕНИЕ II ПО СПЛОШНОМУ БЕТОННОМУ РЕБРУ ПЛИТЫ)');
  styleTableHeader(wsRoofMain, 50, [
    '№', 'Сечение / граница слоя (по ребру)', 'x, мм', 'R_накопл',
    'R_п.накопл', 't_зима, °C\n(при t_н — для τ_в)', 't_от.пер, °C\n(при t_н.от — для E, e)', 'E(t), Па\n(интерп. Е.1)',
    'e_x, Па', 'Δ = E - e, Па', 'Конденсация', '№ акт.',
  ]);
  wsRoofMain.getRow(50).height = 34;

  // Строка 51: Внутренний воздух (ребро)
  wsRoofMain.getRow(51).height = 21;
  wsRoofMain.getCell('A51').value = 'Воздух вн.';
  styleFormulaCell(wsRoofMain.getCell('A51'), '@', true);
  wsRoofMain.getCell('B51').value = {
    formula: '"Внутренний воздух помещения (t_в = "&\'Ввод_и_Итоги\'!$C$26&"°C, φ_в = "&\'Ввод_и_Итоги\'!$C$27&"%)"',
  };
  styleLabelCell(wsRoofMain.getCell('B51'), true);
  wsRoofMain.getCell('C51').value = 0;
  styleFormulaCell(wsRoofMain.getCell('C51'), '0');
  wsRoofMain.getCell('D51').value = 0;
  styleFormulaCell(wsRoofMain.getCell('D51'), '0.000');
  wsRoofMain.getCell('E51').value = 0;
  styleFormulaCell(wsRoofMain.getCell('E51'), '0.000');
  wsRoofMain.getCell('F51').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsRoofMain.getCell('F51'), '0.00', true);
  wsRoofMain.getCell('G51').value = { formula: "'Ввод_и_Итоги'!$C$26" };
  styleFormulaCell(wsRoofMain.getCell('G51'), '0.00', true);
  wsRoofMain.getCell('H51').value = { formula: "'Ввод_и_Итоги'!$C$28" };
  styleFormulaCell(wsRoofMain.getCell('H51'), '0.0', true);
  wsRoofMain.getCell('I51').value = { formula: "ROUND('Ввод_и_Итоги'!$C$29,2)" };
  styleFormulaCell(wsRoofMain.getCell('I51'), '0.00', true);
  wsRoofMain.getCell('J51').value = { formula: 'ROUND(H51-I51,1)' };
  styleFormulaCell(wsRoofMain.getCell('J51'), '0.0', true);
  wsRoofMain.getCell('K51').value = 'Внутр. воздух';
  styleFormulaCell(wsRoofMain.getCell('K51'), '@', true);
  wsRoofMain.getCell('L51').value = '';
  styleFormulaCell(wsRoofMain.getCell('L51'), '@');
  for (let c = 1; c <= 11; c++) {
    wsRoofMain.getCell(51, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
  }

  const roofRibPts: [string | number, string, string, string, string, boolean?, boolean?][] = [
    [1, '"Внутренняя поверхность потолка τ_в (по ребру)"', '0', "1/'Ввод_и_Итоги'!$C$34", '1/37'],
    ['ПИ.0', `IF(AND($J$13>0,$H$25=0),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=0),ROUND($D$13*1000,1),"")`, `IF(AND($J$13>0,$H$25=0),1/'Ввод_и_Итоги'!$C$34+$F$13,"")`, `IF(AND($J$13>0,$H$25=0),1/37+$J$13,"")`, false, true],
    [2, 'IF($C$7="","(нет внутр. слоя — пропуск)","Граница: "&$B$7)', `IF($C$7="","",ROUND(($D$7+$D$8)*1000+${rVbX(0)},1))`, `IF($C$7="","",1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+${rVbR(0)})`, `IF($C$7="","",1/37+$J$7+$J$8+${rVbRp(0)})`],
    ['ПИ.1', `IF(AND($J$13>0,$H$25=1),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=1),ROUND(($D$7+$D$8+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=1),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$F$13,"")`, `IF(AND($J$13>0,$H$25=1),1/37+$J$7+$J$8+$J$13,"")`, false, true],
    [3, '"Граница: Сплошное ж/б ребро плиты"', `ROUND(($D$7+$D$8+$H$15)*1000+${rVbX(1)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+${rVbR(1)}`, `1/37+$J$7+$J$8+$H$15/0.03+${rVbRp(1)}`],
    ['ПИ.2', `IF(AND($J$13>0,$H$25=2),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=2),ROUND(($D$7+$D$8+$H$15+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=2),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+$F$13,"")`, `IF(AND($J$13>0,$H$25=2),1/37+$J$7+$J$8+$H$15/0.03+$J$13,"")`, false, true],
    [4, '"★ Середина утеплителя ("&ROUND($D$10*500,0)&" мм)"', `ROUND(($D$7+$D$8+$H$15+$D$10/2)*1000+${rVbX(2)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+${rVbR(2)}+$F$10/2`, `1/37+$J$7+$J$8+$H$15/0.03+${rVbRp(2)}+$J$10/2`, true, false],
    [5, '"Граница: Утеплитель "&\'Ввод_и_Итоги\'!$C$11', `ROUND(($D$7+$D$8+$H$15+$D$10)*1000+${rVbX(2)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+${rVbR(2)}+$F$10`, `1/37+$J$7+$J$8+$H$15/0.03+${rVbRp(2)}+$J$10`],
    ['ПИ.3', `IF(AND($J$13>0,$H$25=3),${rVbLabel},"(позиция ПИ не здесь — пропуск)")`, `IF(AND($J$13>0,$H$25=3),ROUND(($D$7+$D$8+$H$15+$D$10+$D$13)*1000,1),"")`, `IF(AND($J$13>0,$H$25=3),1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+$F$10+$F$13,"")`, `IF(AND($J$13>0,$H$25=3),1/37+$J$7+$J$8+$H$15/0.03+$J$10+$J$13,"")`, false, true],
    [6, '"Наружная поверхность покрытия τ_н"', `ROUND(($D$7+$D$8+$H$15+$D$10+$D$11+$D$12)*1000+${rVbX(3)},1)`, `1/'Ввод_и_Итоги'!$C$34+$F$7+$F$8+$H$20+$F$10+$F$11+$F$12+${rVbR(3)}`, `1/37+$J$7+$J$8+$H$15/0.03+$J$10+$J$11+$J$12+${rVbRp(3)}`],
  ];
  roofRibPts.forEach(([idx, nameF, xF, rF, rpF, isMid, isVb], i) => {
    const r = 52 + i; // 52..61
    wsRoofMain.getRow(r).height = 20;
    wsRoofMain.getCell(`A${r}`).value = idx;
    styleFormulaCell(wsRoofMain.getCell(`A${r}`), '@', Boolean(isVb));
    wsRoofMain.getCell(`B${r}`).value = { formula: nameF };
    styleLabelCell(wsRoofMain.getCell(`B${r}`), Boolean(isMid || isVb));
    wsRoofMain.getCell(`C${r}`).value = { formula: xF };
    styleFormulaCell(wsRoofMain.getCell(`C${r}`), 'General');
    wsRoofMain.getCell(`D${r}`).value = { formula: rF };
    styleFormulaCell(wsRoofMain.getCell(`D${r}`), '0.000');
    wsRoofMain.getCell(`E${r}`).value = { formula: rpF };
    styleFormulaCell(wsRoofMain.getCell(`E${r}`), '0.000');
    wsRoofMain.getCell(`F${r}`).value = { formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-$C$22)/${R_roof_rib_exact})*D${r})` };
    styleFormulaCell(wsRoofMain.getCell(`F${r}`), '0.00');
    wsRoofMain.getCell(`G${r}`).value = { formula: `IF(D${r}="","",'Ввод_и_Итоги'!$C$26-(('Ввод_и_Итоги'!$C$26-'Ввод_и_Итоги'!$F$13)/${R_roof_rib_exact})*D${r})` };
    styleFormulaCell(wsRoofMain.getCell(`G${r}`), '0.00', true);
    wsRoofMain.getCell(`H${r}`).value = { formula: `IF(G${r}="","",${excelInterpE(`G${r}`, e1EndRow)})` };
    styleFormulaCell(wsRoofMain.getCell(`H${r}`), '0.0');
    wsRoofMain.getCell(`I${r}`).value = { formula: `IF(E${r}="","",ROUND('Ввод_и_Итоги'!$C$29-(('Ввод_и_Итоги'!$C$29-'Ввод_и_Итоги'!$F$17)/${Rp_roof_rib_exact})*E${r},2))` };
    styleFormulaCell(wsRoofMain.getCell(`I${r}`), '0.00');
    wsRoofMain.getCell(`J${r}`).value = { formula: `IF(H${r}="","",ROUND(H${r}-I${r},1))` };
    styleFormulaCell(wsRoofMain.getCell(`J${r}`), '0.0', true);
    wsRoofMain.getCell(`K${r}`).value = { formula: `IF(J${r}="","",IF(J${r}>0,"Нет конденсата ✓","НУЖНА ПАРОИЗОЛЯЦИЯ ✗"))` };
    styleFormulaCell(wsRoofMain.getCell(`K${r}`), '@', true);
    wsRoofMain.getCell(`L${r}`).value =
      r === 52 ? 1 : { formula: `IF(C${r}="","",MAX($L$52:L${r - 1})+1)` };
    styleFormulaCell(wsRoofMain.getCell(`L${r}`), '0');
    if (isMid) {
      wsRoofMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.midFill } };
    }
    if (isVb) {
      wsRoofMain.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.vbFill } };
      wsRoofMain.getCell(`B${r}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.vbFont } };
    }
  });

  // Строка 62: Наружный воздух (ребро)
  wsRoofMain.getRow(62).height = 21;
  wsRoofMain.getCell('A62').value = 'Воздух нар.';
  styleFormulaCell(wsRoofMain.getCell('A62'), '@', true);
  wsRoofMain.getCell('B62').value = {
    formula: '"Наружный воздух (зима t_н = "&$C$22&"°C / от. пер. t_н.от = "&\'Ввод_и_Итоги\'!$F$13&"°C)"',
  };
  styleLabelCell(wsRoofMain.getCell('B62'), true);
  wsRoofMain.getCell('C62').value = { formula: 'ROUND(SUM($D$7:$D$13)*1000,1)' };
  styleFormulaCell(wsRoofMain.getCell('C62'), 'General');
  wsRoofMain.getCell('D62').value = { formula: R_roof_rib_exact };
  styleFormulaCell(wsRoofMain.getCell('D62'), '0.000');
  wsRoofMain.getCell('E62').value = { formula: Rp_roof_rib_exact };
  styleFormulaCell(wsRoofMain.getCell('E62'), '0.000');
  wsRoofMain.getCell('F62').value = { formula: '$C$22' };
  styleFormulaCell(wsRoofMain.getCell('F62'), '0.00', true);
  wsRoofMain.getCell('G62').value = { formula: "'Ввод_и_Итоги'!$F$13" };
  styleFormulaCell(wsRoofMain.getCell('G62'), '0.00', true);
  wsRoofMain.getCell('H62').value = { formula: "'Ввод_и_Итоги'!$F$16" };
  styleFormulaCell(wsRoofMain.getCell('H62'), '0.0', true);
  wsRoofMain.getCell('I62').value = { formula: "ROUND('Ввод_и_Итоги'!$F$17,2)" };
  styleFormulaCell(wsRoofMain.getCell('I62'), '0.00', true);
  wsRoofMain.getCell('J62').value = { formula: 'ROUND(H62-I62,1)' };
  styleFormulaCell(wsRoofMain.getCell('J62'), '0.0', true);
  wsRoofMain.getCell('K62').value = 'Нар. воздух';
  styleFormulaCell(wsRoofMain.getCell('K62'), '@', true);
  wsRoofMain.getCell('L62').value = '';
  styleFormulaCell(wsRoofMain.getCell('L62'), '@');
  for (let c = 1; c <= 11; c++) {
    wsRoofMain.getCell(62, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  }

  // =========================================================================
  // 6. ЛИСТ 5: «Покрытия_Все_Схемы» (СРАВНЕНИЕ ВСЕХ 30 ПОКРЫТИЙ П1–П30)
  // =========================================================================
  styleTitleBanner(
    wsRoofAll,
    'A1:O2',
    'СРАВНИТЕЛЬНЫЙ РАСЧЕТ ВСЕХ 30 ПОКРЫТИЙ И ЧЕРДАЧНЫХ ПЕРЕКРЫТИЙ (П1–П30, СХЕМЫ «а»–«е»)',
    'Все 30 вариантов покрытий пересчитываются автоматически по выбранному городу, типу здания, условиям А/Б и утеплителю с листа «Ввод_и_Итоги»'
  );
  wsRoofAll.columns = [
    { width: 8 }, { width: 8 }, { width: 34 }, { width: 8 },
    { width: 8 }, { width: 8 }, { width: 9 }, { width: 10 },
    { width: 10 }, { width: 11 }, { width: 11 }, { width: 10 },
    { width: 10 }, { width: 10 }, { width: 16 },
  ];
  styleTableHeader(wsRoofAll, 4, [
    'Шифр', 'Схема', 'Тип покрытия / перекрытия', 'h, мм',
    'd, мм', 'шаг, мм', 'a, м', 'R_пл',
    'R_без_ут', 'δ_ут.расч', 'δ_ут.прин', 'R_0',
    'D_покр', 't_н, °C', 'Статус',
  ]);
  roofList.forEach((rf, idx) => {
    const r = 5 + idx;
    wsRoofAll.getRow(r).height = 21;
    wsRoofAll.getCell(`A${r}`).value = rf.id;
    styleFormulaCell(wsRoofAll.getCell(`A${r}`), '@', true, rf.id === calc.cipher.roofCode);
    wsRoofAll.getCell(`B${r}`).value = `«${rf.type}»`;
    styleFormulaCell(wsRoofAll.getCell(`B${r}`), '@');
    wsRoofAll.getCell(`C${r}`).value = rf.name;
    styleLabelCell(wsRoofAll.getCell(`C${r}`));
    wsRoofAll.getCell(`D${r}`).value = rf.slab.height;
    styleFormulaCell(wsRoofAll.getCell(`D${r}`), '0');
    wsRoofAll.getCell(`E${r}`).value = rf.slab.voidDiameter;
    styleFormulaCell(wsRoofAll.getCell(`E${r}`), '0');
    wsRoofAll.getCell(`F${r}`).value = rf.slab.spacing;
    styleFormulaCell(wsRoofAll.getCell(`F${r}`), '0');
    wsRoofAll.getCell(`G${r}`).value = { formula: `ROUND(SQRT(PI()*(E${r}/1000)^2/4),4)` };
    styleFormulaCell(wsRoofAll.getCell(`G${r}`), '0.0000');

    const lamB = `IF('Ввод_и_Итоги'!$C$33="А",1.92,2.04)`;
    const sB = `IF('Ввод_и_Итоги'!$C$33="А",17.98,19.4)`;
    wsRoofAll.getCell(`H${r}`).value = {
      formula: `ROUND((F${r}/1000)/(((F${r}/1000-G${r})/((D${r}/1000)/${lamB}))+(G${r}/(((D${r}/1000-G${r})/${lamB})+0.15))),3)`,
    };
    styleFormulaCell(wsRoofAll.getCell(`H${r}`), '0.000', true);

    const nonSlabLayers = rf.layers.filter(
      (l) => !l.isInsulation && l.materialId && l.materialId !== 'reinforced_concrete'
    );
    const extraR = nonSlabLayers.map(
      (l) =>
        `${l.thickness}/IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)))`
    );
    const extraRStr = extraR.length > 0 ? `+${extraR.join('+')}` : '';
    wsRoofAll.getCell(`I${r}`).value = {
      formula: `ROUND(1/'Ввод_и_Итоги'!$C$34+H${r}${extraRStr}+1/'Ввод_и_Итоги'!$C$35,3)`,
    };
    styleFormulaCell(wsRoofAll.getCell(`I${r}`), '0.000');
    wsRoofAll.getCell(`J${r}`).value = {
      formula: `ROUND(('Ввод_и_Итоги'!$F$27*${rf.increasingFactor_n}-I${r})*'Ввод_и_Итоги'!$F$33,3)`,
    };
    styleFormulaCell(wsRoofAll.getCell(`J${r}`), '0.000');
    wsRoofAll.getCell(`K${r}`).value = { formula: `MAX(0.05,ROUNDUP(J${r},2))` };
    styleFormulaCell(wsRoofAll.getCell(`K${r}`), '0.00', true, true);
    wsRoofAll.getCell(`L${r}`).value = { formula: `ROUND(I${r}+K${r}/'Ввод_и_Итоги'!$F$33,2)` };
    styleFormulaCell(wsRoofAll.getCell(`L${r}`), '0.00', true);

    // D покрытия по сечению через пустоту (s_возд = 0)
    const extraD = nonSlabLayers.map(
      (l) =>
        `(${l.thickness}/IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0))))*IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$G$2:$G$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$H$2:$H$${matEndRow},MATCH("${l.materialId}",'Справ_Материалы'!$A$2:$A$${matEndRow},0)))`
    );
    const extraDStr = extraD.length > 0 ? `+${extraD.join('+')}` : '';
    wsRoofAll.getCell(`M${r}`).value = {
      formula: `ROUND((((D${r}-E${r})/1000)/${lamB})*${sB}+(K${r}/'Ввод_и_Итоги'!$F$33)*'Ввод_и_Итоги'!$F$34${extraDStr},2)`,
    };
    styleFormulaCell(wsRoofAll.getCell(`M${r}`), '0.00');
    wsRoofAll.getCell(`N${r}`).value = { formula: excelDesignTempByD(`M${r}`) };
    styleFormulaCell(wsRoofAll.getCell(`N${r}`), '0.0');
    wsRoofAll.getCell(`O${r}`).value = {
      formula: `IF(L${r}>='Ввод_и_Итоги'!$F$27*${rf.increasingFactor_n},"СООТВЕТСТВУЕТ ✓","ПРОВЕРИТЬ ✗")`,
    };
    styleFormulaCell(wsRoofAll.getCell(`O${r}`), '@', true);
  });

  // =========================================================================
  // 7. ЛИСТ 6: «Подполье_ПТП» (ТЕХНИЧЕСКОЕ ПОДПОЛЬЕ И ТРУБОПРОВОДЫ)
  // =========================================================================
  styleTitleBanner(
    wsBasement,
    'A1:I2',
    'РАСЧЕТ ПЕРЕКРЫТИЯ НАД ТЕХНИЧЕСКИМ ПОДПОЛЬЕМ И ТЕПЛОВОГО БАЛАНСА (ПТП1–ПТП20)',
    'Все 5 слоев перекрытия + пароизоляция, расчет R_ПТП и сопротивления паропроницанию R_п.ПТП, теплопотери трубопроводов (Прил. О), Δt_п и проверка цокольной стены'
  );
  wsBasement.columns = [
    { width: 38 }, { width: 15 }, { width: 11 }, { width: 11 },
    { width: 11 }, { width: 11 }, { width: 10 }, { width: 11 },
    { width: 12 }, { width: 3 },
  ];

  styleSectionRow(wsBasement, 4, 9, '1. СОСТАВ ПЕРЕКРЫТИЯ ПТП, РАСЧЕТ УТЕПЛИТЕЛЯ И ПАРОПРОНИЦАНИЯ R_п.ПТП');
  wsBasement.getCell('A5').value = 'Шифр ПТП:';
  styleLabelCell(wsBasement.getCell('A5'), true);
  wsBasement.getCell('B5').value = { formula: "'Ввод_и_Итоги'!$C$10" };
  styleFormulaCell(wsBasement.getCell('B5'), '@', true, true);
  wsBasement.mergeCells('C5:I5');
  wsBasement.getCell('C5').value = {
    formula: `INDEX('Справ_Конструкции'!$C$${baseStartRow}:$C$${baseEndRow},MATCH($B$5,'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow},0))`,
  };
  styleFormulaCell(wsBasement.getCell('C5'), '@', true);
  wsBasement.getCell('C5').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  styleTableHeader(wsBasement, 6, ['Наименование слоя', 'Код мат.', 'δ, м', 'λ', 'R_i', 's_i', 'D_i', 'μ', 'R_п.i']);
  const baseColTriplets: [string, string, string][] = [
    ['E', 'F', 'G'], ['H', 'I', 'J'], ['K', 'L', 'M'], ['N', 'O', 'P'], ['Q', 'R', 'S'],
  ];
  baseColTriplets.forEach(([cN, cM, cD], idx) => {
    const r = 7 + idx; // 7..11 (все 5 слоев!)
    wsBasement.getRow(r).height = 20;
    const fName = `INDEX('Справ_Конструкции'!$${cN}$${baseStartRow}:$${cN}$${baseEndRow},MATCH($B$5,'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow},0))`;
    const fMat = `INDEX('Справ_Конструкции'!$${cM}$${baseStartRow}:$${cM}$${baseEndRow},MATCH($B$5,'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow},0))`;
    const fThk = `INDEX('Справ_Конструкции'!$${cD}$${baseStartRow}:$${cD}$${baseEndRow},MATCH($B$5,'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow},0))`;
    wsBasement.getCell(`A${r}`).value = { formula: `IF(B${r}="","(нет слоя)",IF(B${r}="INSULATION","Утеплитель "&'Ввод_и_Итоги'!$C$11,${fName}))` };
    styleLabelCell(wsBasement.getCell(`A${r}`));
    wsBasement.getCell(`B${r}`).value = { formula: fMat };
    styleFormulaCell(wsBasement.getCell(`B${r}`), '@');
    wsBasement.getCell(`C${r}`).value = { formula: `IF(B${r}="",0,IF(B${r}="INSULATION",$C$15,${fThk}))` };
    styleFormulaCell(wsBasement.getCell(`C${r}`), '0.000');
    wsBasement.getCell(`D${r}`).value = {
      formula: `IF(B${r}="",0,IF(B${r}="INSULATION",'Ввод_и_Итоги'!$F$33,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$E$2:$E$${matEndRow},MATCH(B${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$F$2:$F$${matEndRow},MATCH(B${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)))))`,
    };
    styleFormulaCell(wsBasement.getCell(`D${r}`), '0.0000');
    wsBasement.getCell(`E${r}`).value = { formula: `IF(D${r}>0,ROUND(C${r}/D${r},4),0)` };
    styleFormulaCell(wsBasement.getCell(`E${r}`), '0.000');
    wsBasement.getCell(`F${r}`).value = {
      formula: `IF(B${r}="",0,IF(B${r}="INSULATION",'Ввод_и_Итоги'!$F$34,IF('Ввод_и_Итоги'!$C$33="А",INDEX('Справ_Материалы'!$G$2:$G$${matEndRow},MATCH(B${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)),INDEX('Справ_Материалы'!$H$2:$H$${matEndRow},MATCH(B${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0)))))`,
    };
    styleFormulaCell(wsBasement.getCell(`F${r}`), '0.00');
    wsBasement.getCell(`G${r}`).value = { formula: `ROUND(E${r}*F${r},3)` };
    styleFormulaCell(wsBasement.getCell(`G${r}`), '0.000');
    wsBasement.getCell(`H${r}`).value = {
      formula: `IF(B${r}="",0,IF(B${r}="INSULATION",'Ввод_и_Итоги'!$F$35,INDEX('Справ_Материалы'!$I$2:$I$${matEndRow},MATCH(B${r},'Справ_Материалы'!$A$2:$A$${matEndRow},0))))`,
    };
    styleFormulaCell(wsBasement.getCell(`H${r}`), '0.000');
    wsBasement.getCell(`I${r}`).value = {
      formula: `IF(H${r}>0,ROUND(C${r}/H${r},3),0)`,
    };
    styleFormulaCell(wsBasement.getCell(`I${r}`), '0.000');
  });

  // Строка 12: Пароизоляция перекрытия ПТП (редактируемые параметры при наличии)
  const bVb = calc.basement.vaporBarrier;
  wsBasement.getRow(12).height = 20;
  wsBasement.getCell('A12').value = bVb
    ? `Пароизоляция: ${bVb.name}`
    : 'Пароизоляция ПТП (не задана — введите R_п в I12 при необходимости)';
  styleLabelCell(wsBasement.getCell('A12'), Boolean(bVb));
  wsBasement.getCell('B12').value = bVb ? 'ПАРОИЗОЛ.' : '';
  styleFormulaCell(wsBasement.getCell('B12'), '@', Boolean(bVb));
  wsBasement.getCell('C12').value = bVb ? +(bVb.thicknessMm / 1000).toFixed(4) : 0;
  styleInputCell(wsBasement.getCell('C12'), '0.0000');
  wsBasement.getCell('D12').value = bVb ? (bVb.lambda ?? 0.2) : 0;
  styleInputCell(wsBasement.getCell('D12'), '0.00');
  wsBasement.getCell('E12').value = { formula: 'IF(AND(C12>0,D12>0),ROUND(C12/D12,4),0)' };
  styleFormulaCell(wsBasement.getCell('E12'), '0.0000');
  wsBasement.getCell('F12').value = bVb ? (bVb.s ?? 4.0) : 0;
  styleInputCell(wsBasement.getCell('F12'), '0.0');
  wsBasement.getCell('G12').value = { formula: 'ROUND(E12*F12,3)' };
  styleFormulaCell(wsBasement.getCell('G12'), '0.000');
  wsBasement.getCell('H12').value = { formula: 'IF(I12>0,C12/I12,0)' };
  styleFormulaCell(wsBasement.getCell('H12'), '0.00000');
  wsBasement.getCell('I12').value = bVb ? bVb.R_p : 0;
  styleInputCell(wsBasement.getCell('I12'), '0.000');

  const baseNonInsRTerms = baseColTriplets
    .map(([, , cD], idx) => {
      const lr = 7 + idx;
      const fThk = `INDEX('Справ_Конструкции'!$${cD}$${baseStartRow}:$${cD}$${baseEndRow},MATCH($B$5,'Справ_Конструкции'!$A$${baseStartRow}:$A$${baseEndRow},0))`;
      return `IF(OR(B${lr}="",B${lr}="INSULATION",D${lr}<=0),0,${fThk}/D${lr})`;
    })
    .join('+');

  const MAX_EXCEL_PIPE_SLOTS = Math.max(18, calc.basement.pipesDetails.length + 5);
  const baseCalcRows: [number, string, string | number, string, string, boolean, boolean][] = [
    [13, 'Нормативное сопротивление перекрытия R_норм.ПТП', "'Ввод_и_Итоги'!$F$28", '0.00', 'м²·°C/Вт', true, false],
    [14, 'Расчетная толщина утеплителя δ_ут.расч, м', `ROUND((C13-(1/8.7+1/17+${baseNonInsRTerms}+E12))*'Ввод_и_Итоги'!$F$33,3)`, '0.000', 'м', false, false],
    [15, 'Принятая толщина утеплителя δ_ут.прин, м', 'MAX(0.05,ROUNDUP(C14,2))', '0.00', 'м', true, true],
    [16, 'Фактическое сопротивление перекрытия R_ПТП, м²·°C/Вт', 'ROUND(1/8.7+SUM(E7:E12)+1/17,2)', '0.00', 'м²·°C/Вт', true, true],
    [17, 'Суммарное сопротивление паропроницанию R_п.ПТП = 1/37 + ΣR_п.i + 1/77', 'ROUND(1/37+SUM(I7:I12)+1/77,2)', '0.00', 'м²·ч·Па/мг', true, true],
    [18, 'Температура воздуха в подполье t_п, °C (редактируемая)', calc.basement.crawlSpaceTemp_t_p, '0.0', '°C', true, false],
    [19, 'Относительная влажность в подполье φ_п, % (редактируемая)', calc.basement.crawlSpaceRH, '0', '%', false, false],
    [20, 'Точка росы в техподполье t_р.п, °C (интерп. Е.1)', excelInterpDewPoint(`(C19/100)*${excelInterpE('C18', e1EndRow)}`, e1EndRow), '0.00', '°C', false, false],
    [21, 'Температурный перепад на полу 1 этажа Δt_п, °C', `ROUND(('Ввод_и_Итоги'!$C$26-C18)/(C16*8.7),2)`, '0.00', '°C', true, false],
    [22, 'Температура поверхности пола 1 этажа τ_в.пол, °C', `ROUND('Ввод_и_Итоги'!$C$26-C21,2)`, '0.00', '°C', true, false],
    [23, 'Температура внутренней поверхности цокольной стены τ_в.цок, °C', `ROUND(C18-(C18-'Ввод_и_Итоги'!$F$13)/(1.25*17),2)`, '0.00', '°C', false, false],
    [24, 'Суммарные тепловыделения от трубопроводов ΣQ_тр, Вт', `ROUND(SUM(F29:F${28 + MAX_EXCEL_PIPE_SLOTS}),1)`, '0.0', 'Вт', true, false],
    [25, 'Заключение по техническому подполью', `IF(AND(C16>=C13,C21<=INDEX('Справ_ТипыЗданий'!$I$2:$I$${bTypesEndRow},MATCH('Ввод_и_Итоги'!$C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0)),C23>C20),"СООТВЕТСТВУЕТ ✓","ПРОВЕРИТЬ ✗")`, '@', 'СП 2.04.01-2020', true, true],
  ];

  baseCalcRows.forEach(([r, lbl, valOrF, fmt, unit, bold, accent]) => {
    wsBasement.getRow(r).height = 20;
    wsBasement.mergeCells(`A${r}:B${r}`);
    wsBasement.getCell(`A${r}`).value = lbl;
    styleLabelCell(wsBasement.getCell(`A${r}`), bold);
    const cCell = wsBasement.getCell(`C${r}`);
    if (typeof valOrF === 'number') {
      cCell.value = valOrF;
      styleInputCell(cCell, fmt);
    } else {
      cCell.value = { formula: valOrF };
      styleFormulaCell(cCell, fmt, bold, accent);
    }
    wsBasement.mergeCells(`D${r}:E${r}`);
    wsBasement.getCell(`D${r}`).value = unit;
    styleLabelCell(wsBasement.getCell(`D${r}`));
  });

  // Справа на строках 5..19 (K5:S19): Справочная таблица Приложения О (Шибеко стр. 108) для точного выбора q_i^5 (Вт/м)
  wsBasement.mergeCells('K5:S5');
  wsBasement.getCell('K5').value = 'Приложение О (Шибеко 2018, стр. 108): линейная плотность теплового потока q_i^5, Вт/м';
  wsBasement.getCell('K5').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  wsBasement.getCell('K5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSubHeader } };
  wsBasement.getCell('K5').alignment = { vertical: 'middle', horizontal: 'center' };
  const appOTemps = [50, 60, 70, 80, 90, 95, 100, 105];
  styleTableHeader(wsBasement, 6, ['d_у, мм', '50°C', '60°C', '70°C', '80°C', '90°C', '95°C', '100°C', '105°C'], 11);
  const appODys = [10, 15, 20, 25, 32, 40, 50, 65, 70, 80, 100, 125, 150];
  const appOQTable: Record<number, number[]> = {
    10: [11, 12, 14, 15, 17, 17.5, 18, 19],
    15: [12, 14, 16, 17, 19, 20, 21, 22],
    20: [14, 16, 18, 20, 21, 22, 23, 24.5],
    25: [16, 18, 20, 22, 24, 25, 26, 27.5],
    32: [17, 20, 22, 24, 27, 28, 29, 30.5],
    40: [19, 22, 24, 26, 29, 30.5, 32, 33.5],
    50: [21, 24, 27, 30, 32, 33.5, 35, 37],
    65: [24, 27, 31, 34, 37, 38.5, 40, 42],
    70: [25, 28, 32, 35, 38.5, 40, 41.5, 43.5],
    80: [27, 30, 34, 38, 42, 44, 46, 48],
    100: [30, 34, 39, 43, 47, 49.5, 52, 54.5],
    125: [35, 40, 45, 50, 55, 57.5, 60, 63],
    150: [40, 46, 51, 57, 63, 66, 69, 72],
  };
  appOTemps.forEach((tVal, cIdx) => {
    wsBasement.getCell(6, 12 + cIdx).value = tVal;
    styleFormulaCell(wsBasement.getCell(6, 12 + cIdx), '0"°C"', true);
  });
  appODys.forEach((dVal, rIdx) => {
    const rr = 7 + rIdx; // 7..19
    wsBasement.getCell(rr, 11).value = dVal;
    styleFormulaCell(wsBasement.getCell(rr, 11), '0', true);
    appOQTable[dVal].forEach((qVal, cIdx) => {
      wsBasement.getCell(rr, 12 + cIdx).value = qVal;
      styleFormulaCell(wsBasement.getCell(rr, 12 + cIdx), '0.0');
    });
  });

  styleSectionRow(wsBasement, 27, 9, `2. ТЕПЛОПОТЕРИ ТРУБОПРОВОДОВ В ТЕХПОДПОЛЬЕ (${MAX_EXCEL_PIPE_SLOTS} УЧАСТКОВ — РЕДАКТИРУЕМЫЕ ЖЕЛТЫЕ ЯЧЕЙКИ, ПРИЛ. О ШИБЕКО)`);
  styleTableHeader(wsBasement, 28, [
    'Назначение / № участка', 't_т, °C', 'd_у, мм', 'Длина l_i, м', 'q_i^5, Вт/м (Прил. О)', 'Q_i = q_i^5·l_i, Вт', 'Примечание',
  ]);
  wsBasement.mergeCells('G28:I28');
  for (let idx = 0; idx < MAX_EXCEL_PIPE_SLOTS; idx++) {
    const r = 29 + idx; // 29..46+
    const p = calc.basement.pipesDetails[idx];
    wsBasement.getRow(r).height = 19;
    wsBasement.getCell(`A${r}`).value = p
      ? `Участок ${idx + 1} (${p.temp >= 85 ? 'Отопление подача Т1' : p.temp >= 65 ? 'Отопление обратка Т2' : 'ГВС Т3'})`
      : `Доп. участок ${idx + 1} (введите t_т, d_у, l_i)`;
    styleLabelCell(wsBasement.getCell(`A${r}`));
    wsBasement.getCell(`B${r}`).value = p ? p.temp : null;
    styleInputCell(wsBasement.getCell(`B${r}`), '0');
    wsBasement.getCell(`C${r}`).value = p ? p.dy : null;
    styleInputCell(wsBasement.getCell(`C${r}`), '0');
    wsBasement.getCell(`D${r}`).value = p ? p.length : null;
    styleInputCell(wsBasement.getCell(`D${r}`), '0.0');
    wsBasement.getCell(`E${r}`).value = {
      formula: `IF(OR(B${r}="",C${r}="",D${r}="",D${r}<=0),0,IFERROR(INDEX($L$7:$S$19,MATCH(C${r},$K$7:$K$19,1),MATCH(B${r},$L$6:$S$6,1)),ROUND(0.28*(C${r}/50)*(B${r}-5)+3.5,1)))`,
    };
    styleFormulaCell(wsBasement.getCell(`E${r}`), '0.0');
    wsBasement.getCell(`F${r}`).value = { formula: `IF(OR(D${r}="",D${r}<=0),0,ROUND(E${r}*D${r},1))` };
    styleFormulaCell(wsBasement.getCell(`F${r}`), '0.0', true);
    wsBasement.mergeCells(`G${r}:I${r}`);
    wsBasement.getCell(`G${r}`).value = {
      formula: `IF(F${r}>0,"Учтен в тепловом балансе","Свободный слот")`,
    };
    styleLabelCell(wsBasement.getCell(`G${r}`));
  }

  // =========================================================================
  // 8. ЛИСТ 7: «Окна_Расчет» — ПОЛНАЯ МЕТОДИКА ШИБЕКО (ТАБЛ. 6.1–6.4, БЕЗ ДВЕРЕЙ!)
  // =========================================================================
  styleTitleBanner(
    wsWindows,
    'A1:K2',
    'ТЕПЛОТЕХНИЧЕСКИЙ РАСЧЕТ ОКОННЫХ ЗАПОЛНЕНИЙ ПО МЕТОДИКЕ А. С. ШИБЕКО (О1–О44)',
    'Таблицы 6.1 (классы СТБ 939-2013), 6.2 (поучастковый расчет R_т.ок), 6.3 (поэтажный расчет Δp и R_в.тр с интерполяцией k_i по Прил. М) и 6.4 (назначение классов по этажам)'
  );
  wsWindows.columns = [
    { width: 10 }, // A
    { width: 32 }, // B
    { width: 14 }, // C
    { width: 13 }, // D
    { width: 13 }, // E
    { width: 22 }, // F
    { width: 13 }, // G
    { width: 13 }, // H
    { width: 13 }, // I
    { width: 13 }, // J
    { width: 15 }, // K
  ];

  // Блок 1 (строки 4..16): Исходные данные и итоги теплопередачи окна (БЕЗ ДВЕРЕЙ!)
  styleSectionRow(wsWindows, 4, 11, '1. ИСХОДНЫЕ ДАННЫЕ ОКОННОГО БЛОКА И ИТОГИ РАСЧЕТА ТЕПЛОПЕРЕДАЧИ');

  const winMetaRows: [number, string, string, string, string, string, string][] = [
    [5, 'Шифр оконного блока', "'Ввод_и_Итоги'!$C$12", '@', 'Схема окна (Вариант I / II)', `INDEX('Справ_Конструкции'!$B$${winStartRow}:$B$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '@'],
    [6, 'Профильная система', `INDEX('Справ_Конструкции'!$C$${winStartRow}:$C$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '@', 'Стеклопакет', `INDEX('Справ_Конструкции'!$D$${winStartRow}:$D$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '@'],
    [7, 'Высота проема H, мм', `INDEX('Справ_Конструкции'!$G$${winStartRow}:$G$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0', 'Ширина проема B, мм', `INDEX('Справ_Конструкции'!$H$${winStartRow}:$H$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0'],
    [8, 'Коробка b1 (h1), мм', `INDEX('Справ_Конструкции'!$I$${winStartRow}:$I$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0', "Коробка глух. b1' (h1'), мм", `INDEX('Справ_Конструкции'!$J$${winStartRow}:$J$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0'],
    [9, 'Створка b2 (h2), мм', `INDEX('Справ_Конструкции'!$K$${winStartRow}:$K$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0', 'Остекление b3, мм', `INDEX('Справ_Конструкции'!$L$${winStartRow}:$L$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0'],
    [10, "Остекление глух. b3', мм", `INDEX('Справ_Конструкции'!$M$${winStartRow}:$M$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0', 'Ширина импоста b4, мм', `INDEX('Справ_Конструкции'!$N$${winStartRow}:$N$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0'],
    [11, 'R_непр профильной части, м²·°C/Вт', `INDEX('Справ_Конструкции'!$E$${winStartRow}:$E$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0.00', 'R_св стеклопакета, м²·°C/Вт', `INDEX('Справ_Конструкции'!$F$${winStartRow}:$F$${winEndRow},MATCH($C$5,'Справ_Конструкции'!$A$${winStartRow}:$A$${winEndRow},0))`, '0.00'],
    [12, 'Общая площадь окна F_ок = ΣF_i, м²', 'ROUND(SUM(E31:E43),5)', '0.00000', 'Плотность нар. возд. ρ_н, кг/м³', `ROUND(353/(273+'Ввод_и_Итоги'!$F$11),2)`, '0.00'],
    [13, 'Светопрозрачная часть F_св (I+II), м²', 'ROUND(SUM(E42:E43),5)', '0.00000', 'Плотность внутр. возд. ρ_в, кг/м³', `ROUND(353/(273+'Ввод_и_Итоги'!$C$26),2)`, '0.00'],
    [14, 'Приведенное R_т.ок = ΣF_i / Σ(F_i/R_i)', 'ROUND(E44/G44,2)', '0.00', 'Разность плотностей ρ_н − ρ_в', 'ROUND(F12-F13,2)', '0.00'],
    [15, 'Нормативное R_т.норм (СН 2.04.02 табл. 7.1)', `INDEX('Справ_ТипыЗданий'!$M$2:$M$${bTypesEndRow},MATCH('Ввод_и_Итоги'!$C$5,'Справ_ТипыЗданий'!$B$2:$B$${bTypesEndRow},0))`, '0.00', 'Расчетная высота H (рис. 6.4), м', "'Ввод_и_Итоги'!$F$7", '0.0'],
    [16, 'Заключение по теплозащите окна', 'IF(C14>=C15,"СООТВЕТСТВУЕТ ✓","ТРЕБУЕТ ЗАМЕНЫ ✗")', '@', 'Тип местности (Прил. М) / G_норм', `'Ввод_и_Итоги'!$C$14&" / G_норм = 10,0 кг/(м²·ч)"`, '@'],
  ];

  winMetaRows.forEach(([r, l1, f1, fmt1, l2, f2, fmt2]) => {
    wsWindows.getRow(r).height = 20;
    wsWindows.mergeCells(`A${r}:B${r}`);
    wsWindows.getCell(`A${r}`).value = l1;
    styleLabelCell(wsWindows.getCell(`A${r}`), r === 14 || r === 16);
    wsWindows.getCell(`C${r}`).value = { formula: f1 };
    styleFormulaCell(wsWindows.getCell(`C${r}`), fmt1, r === 14 || r === 16, r === 14);

    wsWindows.mergeCells(`D${r}:E${r}`);
    wsWindows.getCell(`D${r}`).value = l2;
    styleLabelCell(wsWindows.getCell(`D${r}`), r === 14);
    wsWindows.mergeCells(`F${r}:G${r}`);
    wsWindows.getCell(`F${r}`).value = { formula: f2 };
    styleFormulaCell(wsWindows.getCell(`F${r}`), fmt2, r === 14 || r === 15);
  });

  // Справа на строках 5..12 (H5:K12): Справочная таблица Приложения М (коэффициенты k_i) для живой интерполяции в Таблице 6.3!
  wsWindows.mergeCells('H5:K5');
  wsWindows.getCell('H5').value = 'Приложение М (Шибеко): коэфф. k_i';
  wsWindows.getCell('H5').font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
  wsWindows.getCell('H5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSubHeader } };
  wsWindows.getCell('H5').alignment = { vertical: 'middle', horizontal: 'center' };
  styleTableHeader(wsWindows, 6, ['z, м', 'Тип A', 'Тип B', 'Тип C'], 8);
  WIND_HEIGHT_COEFF_TABLE.forEach((rowK, idx) => {
    const r = 7 + idx; // 7..13
    wsWindows.getCell(`H${r}`).value = rowK.z;
    wsWindows.getCell(`I${r}`).value = rowK.A;
    wsWindows.getCell(`J${r}`).value = rowK.B;
    wsWindows.getCell(`K${r}`).value = rowK.C;
    ['H', 'I', 'J', 'K'].forEach((col, cIdx) => {
      styleFormulaCell(wsWindows.getCell(`${col}${r}`), cIdx === 0 ? '0' : '0.00');
    });
  });

  // ТАБЛИЦА 6.1 (строки 18..25): Классификация окон по воздухопроницаемости СТБ 939-2013
  styleSectionRow(wsWindows, 18, 11, '2. ТАБЛИЦА 6.1 — КЛАССИФИКАЦИЯ ОКОН ПО ВОЗДУХОПРОНИЦАЕМОСТИ (СТБ 939-2013, ШИБЕКО СТР. 46)');
  styleTableHeader(wsWindows, 19, [
    'Класс', 'Объемная воздухопроницаемость, м³/(ч·м²)', 'Нижн. R_в', 'Верхн. R_в',
    'Диапазон R_в, м²·ч/кг', 'Характеристика воздухонепроницаемости',
  ]);
  wsWindows.mergeCells('F19:K19');
  WINDOW_AIR_PERMEABILITY_CLASSES.forEach((cls, idx) => {
    const r = 20 + idx; // 20..24
    wsWindows.getRow(r).height = 19;
    wsWindows.getCell(`A${r}`).value = cls.classLetter;
    styleFormulaCell(wsWindows.getCell(`A${r}`), '@', true, true);
    wsWindows.getCell(`B${r}`).value = cls.volumePermeabilityRange;
    styleFormulaCell(wsWindows.getCell(`B${r}`), '@');
    wsWindows.getCell(`C${r}`).value = cls.rvMin;
    styleFormulaCell(wsWindows.getCell(`C${r}`), '0.000');
    wsWindows.getCell(`D${r}`).value = cls.rvMax ?? '∞';
    styleFormulaCell(wsWindows.getCell(`D${r}`), cls.rvMax ? '0.000' : '@');
    wsWindows.getCell(`E${r}`).value = cls.rvRangeText;
    styleFormulaCell(wsWindows.getCell(`E${r}`), '@', true);
    wsWindows.mergeCells(`F${r}:K${r}`);
    wsWindows.getCell(`F${r}`).value = cls.description;
    styleLabelCell(wsWindows.getCell(`F${r}`));
  });

  // ТАБЛИЦА 6.2 (строки 29..44): Поучастковый расчет приведенного сопротивления теплопередаче окна
  // Ссылки на размеры: H=C7, B=F7, b1=C8, b1'=F8, b2=C9, b3=F9, b3'=C10, b4=F10, R_непр=C11, R_св=F11, Схема=F5
  styleSectionRow(wsWindows, 29, 11, '3. ТАБЛИЦА 6.2 — РАСЧЕТ ПРИВЕДЕННОГО СОПРОТИВЛЕНИЯ ТЕПЛОПЕРЕДАЧЕ ОКНА ПО УЧАСТКАМ (ШИБЕКО СТР. 48)');
  styleTableHeader(wsWindows, 30, [
    'Участок', 'Наименование элемента окна', 'Ширина, мм', 'Высота, мм',
    'Площадь F_i, м²', 'R_i, м²·°C/Вт', 'F_i / R_i, Вт/°C', 'Доля, %',
  ]);
  wsWindows.mergeCells('I30:K30');
  wsWindows.getCell('I30').value = 'Тип элемента';
  wsWindows.getCell('I30').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  wsWindows.getCell('I30').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.slateSubHeader } };
  wsWindows.getCell('I30').alignment = { vertical: 'middle', horizontal: 'center' };
  ['I30', 'J30', 'K30'].forEach((ref) => { wsWindows.getCell(ref).border = HEADER_BORDER; });

  // 13 строк участков (31..43): 11 непрозрачных + 2 светопрозрачных (I, II)
  // Для Варианта I участки 1'' и 2'' обнуляются (их площадь объединена в 1 и 2), так что сумма ВСЕГДА равна B*H!
  const bR_expr = `($C$8+2*$C$9+$F$9)`;
  const bL_expr = `MAX(0,$F$7-${bR_expr})`;
  const zoneRowsDef: [string, string, string, string, boolean][] = [
    ["1 (1')", 'Верхняя коробка (глухая / вся для I)', `IF($F$5="I",$F$7,${bL_expr})`, `IF($F$5="I",$C$8,$F$8)`, false],
    ["1''", 'Верхняя коробка створки (только вар. II)', `IF($F$5="I",0,${bR_expr})`, `IF($F$5="I",0,$C$8)`, false],
    ["2 (2')", 'Нижняя коробка (глухая / вся для I)', `IF($F$5="I",$F$7,${bL_expr})`, `IF($F$5="I",$C$8,$F$8)`, false],
    ["2''", 'Нижняя коробка створки (только вар. II)', `IF($F$5="I",0,${bR_expr})`, `IF($F$5="I",0,$C$8)`, false],
    ['3', 'Боковая коробка левая (глухая)', `IF($F$5="I",$C$8,$F$8)`, `IF($F$5="I",$C$7-2*$C$8,$C$7-2*$F$8)`, false],
    ['4', 'Боковая коробка правая (створка)', '$C$8', '$C$7-2*$C$8', false],
    ['5', 'Вертикальный импост', '$F$10', `IF($F$5="I",$C$7-2*$C$8,$C$7-2*$F$8)`, false],
    ['6', 'Верхние бруски створок', `IF($F$5="I",$F$9+$C$10+4*$C$9,$F$9+2*$C$9)`, '$C$9', false],
    ['7', 'Нижние бруски створок', `IF($F$5="I",$F$9+$C$10+4*$C$9,$F$9+2*$C$9)`, '$C$9', false],
    ['8', 'Левые вертикальные бруски створок', `IF($F$5="I",2*$C$9,$C$9)`, '$C$7-2*$C$8-2*$C$9', false],
    ['9', 'Правые вертикальные бруски створок', `IF($F$5="I",2*$C$9,$C$9)`, '$C$7-2*$C$8-2*$C$9', false],
    ['I', 'Светопрозрачная часть I (левая / глухая)', `IF($F$5="I",$F$9,$C$10)`, `IF($F$5="I",$C$7-2*$C$8-2*$C$9,$C$7-2*$F$8)`, true],
    ['II', 'Светопрозрачная часть II (правая створка)', `IF($F$5="I",$C$10,$F$9)`, '$C$7-2*$C$8-2*$C$9', true],
  ];

  zoneRowsDef.forEach(([code, name, wF, hF, isGlaz], idx) => {
    const r = 31 + idx; // 31..43
    wsWindows.getRow(r).height = 19;
    wsWindows.getCell(`A${r}`).value = code;
    styleFormulaCell(wsWindows.getCell(`A${r}`), '@', true, isGlaz);
    wsWindows.getCell(`B${r}`).value = name;
    styleLabelCell(wsWindows.getCell(`B${r}`), isGlaz);
    wsWindows.getCell(`C${r}`).value = { formula: wF };
    styleFormulaCell(wsWindows.getCell(`C${r}`), '0');
    wsWindows.getCell(`D${r}`).value = { formula: hF };
    styleFormulaCell(wsWindows.getCell(`D${r}`), '0');
    wsWindows.getCell(`E${r}`).value = { formula: `ROUND((C${r}*D${r})/1000000,5)` };
    styleFormulaCell(wsWindows.getCell(`E${r}`), '0.00000', isGlaz);
    wsWindows.getCell(`F${r}`).value = { formula: isGlaz ? '$F$11' : '$C$11' };
    styleFormulaCell(wsWindows.getCell(`F${r}`), '0.00');
    wsWindows.getCell(`G${r}`).value = { formula: `IF(F${r}>0,ROUND(E${r}/F${r},4),0)` };
    styleFormulaCell(wsWindows.getCell(`G${r}`), '0.0000');
    wsWindows.getCell(`H${r}`).value = { formula: `IF($E$44>0,ROUND(E${r}/$E$44*100,1),0)` };
    styleFormulaCell(wsWindows.getCell(`H${r}`), '0.0');
    wsWindows.mergeCells(`I${r}:K${r}`);
    wsWindows.getCell(`I${r}`).value = isGlaz ? 'Светопрозрачная (стеклопакет)' : 'Непрозрачная (профиль)';
    styleLabelCell(wsWindows.getCell(`I${r}`));
  });

  // Итоговая строка Таблицы 6.2 (строка 44) + подитоги по непрозрачной и светопрозрачной частям (строки 45..46)
  wsWindows.getRow(44).height = 22;
  wsWindows.mergeCells('A44:D44');
  wsWindows.getCell('A44').value = 'ИТОГО ПО ОКОННОМУ БЛОКУ (F_ок = ΣF_i; R_т.ок = ΣF_i / Σ(F_i/R_i)):';
  styleLabelCell(wsWindows.getCell('A44'), true);
  wsWindows.getCell('E44').value = { formula: 'ROUND(SUM(E31:E43),5)' };
  styleFormulaCell(wsWindows.getCell('E44'), '0.00000', true, true);
  wsWindows.getCell('F44').value = { formula: 'ROUND(E44/G44,2)' };
  styleFormulaCell(wsWindows.getCell('F44'), '0.00', true, true);
  wsWindows.getCell('G44').value = { formula: 'ROUND(G45+G46,4)' };
  styleFormulaCell(wsWindows.getCell('G44'), '0.0000', true);
  wsWindows.getCell('H44').value = { formula: 'ROUND(SUM(H31:H43),1)' };
  styleFormulaCell(wsWindows.getCell('H44'), '0.0', true);
  wsWindows.mergeCells('I44:K44');
  wsWindows.getCell('I44').value = {
    formula: `"R_т.ок = "&ROUND(F44,2)&" м²·°C/Вт"`,
    result: `R_т.ок = ${calc.window.R_actual.toFixed(2).replace('.', ',')} м²·°C/Вт`,
  };
  styleFormulaCell(wsWindows.getCell('I44'), '@', true, true);

  wsWindows.getRow(45).height = 19;
  wsWindows.mergeCells('A45:D45');
  wsWindows.getCell('A45').value = 'В т.ч. Итого по непрозрачной части (F_непр, R_т.непр, F_непр / R_т.непр):';
  styleLabelCell(wsWindows.getCell('A45'));
  wsWindows.getCell('E45').value = { formula: 'ROUND(SUM(E31:E41),5)' };
  styleFormulaCell(wsWindows.getCell('E45'), '0.00000');
  wsWindows.getCell('F45').value = { formula: '$C$11' };
  styleFormulaCell(wsWindows.getCell('F45'), '0.00');
  wsWindows.getCell('G45').value = { formula: 'ROUND(E45/F45,4)' };
  styleFormulaCell(wsWindows.getCell('G45'), '0.0000');
  wsWindows.getCell('H45').value = { formula: 'IF($E$44>0,ROUND(E45/$E$44*100,1),0)' };
  styleFormulaCell(wsWindows.getCell('H45'), '0.0');
  wsWindows.mergeCells('I45:K45');
  wsWindows.getCell('I45').value = 'Непрозрачная часть (коробка, створка, импост)';
  styleLabelCell(wsWindows.getCell('I45'));

  wsWindows.getRow(46).height = 19;
  wsWindows.mergeCells('A46:D46');
  wsWindows.getCell('A46').value = 'В т.ч. Итого по светопрозрачной части (F_св, R_т.св, F_св / R_т.св):';
  styleLabelCell(wsWindows.getCell('A46'));
  wsWindows.getCell('E46').value = { formula: 'ROUND(SUM(E42:E43),5)' };
  styleFormulaCell(wsWindows.getCell('E46'), '0.00000');
  wsWindows.getCell('F46').value = { formula: '$F$11' };
  styleFormulaCell(wsWindows.getCell('F46'), '0.00');
  wsWindows.getCell('G46').value = { formula: 'ROUND(E46/F46,4)' };
  styleFormulaCell(wsWindows.getCell('G46'), '0.0000');
  wsWindows.getCell('H46').value = { formula: 'IF($E$44>0,ROUND(E46/$E$44*100,1),0)' };
  styleFormulaCell(wsWindows.getCell('H46'), '0.0');
  wsWindows.mergeCells('I46:K46');
  wsWindows.getCell('I46').value = 'Светопрозрачная часть (стеклопакеты I + II)';
  styleLabelCell(wsWindows.getCell('I46'));

  // ТАБЛИЦА 6.3 (строки 47..83): Поэтажный расчет требуемого сопротивления воздухопроницанию R_в.тр (этажи 1..35)
  styleSectionRow(wsWindows, 47, 11, '4. ТАБЛИЦА 6.3 — РАСЧЕТ ТРЕБУЕМОГО СОПРОТИВЛЕНИЯ ВОЗДУХОПРОНИЦАНИЮ ОКОН R_в.тр ПО ЭТАЖАМ (ШИБЕКО СТР. 50)');
  styleTableHeader(wsWindows, 48, [
    'Этаж', 'H, м', 'h_i, м', 'ρ_н − ρ_в', 'ρ_н, кг/м³',
    'v_ср, м/с', 'c_н − c_п', 'k_i (Прил. М)', 'Δp, Па',
    'G_норм', 'R_в.тр, м²·ч/кг',
  ]);

  // Формула линейной интерполяции k_i по таблице Приложения М (H7:K13) с выбором столбца по 'Ввод_и_Итоги'!$C$14 (A/B/C)
  const kColRef = `IF('Ввод_и_Итоги'!$C$14="A",$I$7:$I$13,IF('Ввод_и_Итоги'!$C$14="C",$K$7:$K$13,$J$7:$J$13))`;

  for (let fl = 1; fl <= 35; fl++) {
    const r = 48 + fl; // строки 49..83
    wsWindows.getRow(r).height = 19;
    const activeCond = `${fl}<='Ввод_и_Итоги'!$C$7`;
    const hCell = `C${r}`;
    const kInterp =
      `IF(${hCell}<=5,INDEX(${kColRef},1),` +
      `IF(${hCell}>=100,INDEX(${kColRef},7),` +
      `ROUND(INDEX(${kColRef},MATCH(${hCell},$H$7:$H$13,1))+(${hCell}-INDEX($H$7:$H$13,MATCH(${hCell},$H$7:$H$13,1)))/(INDEX($H$7:$H$13,MATCH(${hCell},$H$7:$H$13,1)+1)-INDEX($H$7:$H$13,MATCH(${hCell},$H$7:$H$13,1)))*(INDEX(${kColRef},MATCH(${hCell},$H$7:$H$13,1)+1)-INDEX(${kColRef},MATCH(${hCell},$H$7:$H$13,1))),3)))`;

    wsWindows.getCell(`A${r}`).value = { formula: `IF(${activeCond},${fl},"")` };
    styleFormulaCell(wsWindows.getCell(`A${r}`), '0', true);
    wsWindows.getCell(`B${r}`).value = { formula: `IF(A${r}="","",'Ввод_и_Итоги'!$F$7)` };
    styleFormulaCell(wsWindows.getCell(`B${r}`), '0.0');
    wsWindows.getCell(`C${r}`).value = { formula: `IF(A${r}="","",ROUND(2.5+3*(A${r}-1),1))` };
    styleFormulaCell(wsWindows.getCell(`C${r}`), '0.0');
    wsWindows.getCell(`D${r}`).value = { formula: `IF(A${r}="","",$F$14)` };
    styleFormulaCell(wsWindows.getCell(`D${r}`), '0.00');
    wsWindows.getCell(`E${r}`).value = { formula: `IF(A${r}="","",$F$12)` };
    styleFormulaCell(wsWindows.getCell(`E${r}`), '0.00');
    wsWindows.getCell(`F${r}`).value = { formula: `IF(A${r}="","",'Ввод_и_Итоги'!$F$12)` };
    styleFormulaCell(wsWindows.getCell(`F${r}`), '0.0');
    wsWindows.getCell(`G${r}`).value = { formula: `IF(A${r}="","",1.4)` };
    styleFormulaCell(wsWindows.getCell(`G${r}`), '0.0');
    wsWindows.getCell(`H${r}`).value = { formula: `IF(A${r}="","",${kInterp})` };
    styleFormulaCell(wsWindows.getCell(`H${r}`), '0.000');
    wsWindows.getCell(`I${r}`).value = {
      formula: `IF(A${r}="","",ROUND((B${r}-C${r})*9.81*D${r}+0.5*E${r}*F${r}^2*G${r}*H${r},2))`,
    };
    styleFormulaCell(wsWindows.getCell(`I${r}`), '0.00', true);
    wsWindows.getCell(`J${r}`).value = { formula: `IF(A${r}="","",10)` };
    styleFormulaCell(wsWindows.getCell(`J${r}`), '0.0');
    wsWindows.getCell(`K${r}`).value = {
      formula: `IF(A${r}="","",ROUND((1/J${r})*(MAX(1,I${r})/10)^(2/3),3))`,
    };
    styleFormulaCell(wsWindows.getCell(`K${r}`), '0.000', true, true);
  }

  // ТАБЛИЦА 6.4 (строки 85..121): Назначение класса окон по воздухопроницаемости по этажам (1..35)
  styleSectionRow(wsWindows, 85, 11, '5. ТАБЛИЦА 6.4 — НАЗНАЧЕНИЕ КЛАССА ОКОН ПО ВОЗДУХОПРОНИЦАЕМОСТИ (СТБ 939-2013, ШИБЕКО СТР. 50)');
  styleTableHeader(wsWindows, 86, [
    'Этаж', 'R_в.тр, м²·ч/кг', '1,0·R_в.тр', '1,2·R_в.тр',
    'Диапазон R_в.ок = (1,0–1,2)·R_в.тр', 'Требуемый класс оконного блока по СТБ 939-2013',
  ]);
  wsWindows.mergeCells('F86:K86');

  for (let fl = 1; fl <= 35; fl++) {
    const srcRow = 48 + fl; // строка в Таблице 6.3
    const r = 86 + fl; // строки 87..121
    wsWindows.getRow(r).height = 20;
    wsWindows.getCell(`A${r}`).value = { formula: `IF(A${srcRow}="","",A${srcRow})` };
    styleFormulaCell(wsWindows.getCell(`A${r}`), '0', true);
    wsWindows.getCell(`B${r}`).value = { formula: `IF(A${r}="","",K${srcRow})` };
    styleFormulaCell(wsWindows.getCell(`B${r}`), '0.000');
    wsWindows.getCell(`C${r}`).value = { formula: `IF(A${r}="","",B${r})` };
    styleFormulaCell(wsWindows.getCell(`C${r}`), '0.000');
    wsWindows.getCell(`D${r}`).value = { formula: `IF(A${r}="","",ROUND(1.2*B${r},3))` };
    styleFormulaCell(wsWindows.getCell(`D${r}`), '0.000');
    wsWindows.getCell(`E${r}`).value = {
      formula: `IF(A${r}="","",ROUND(C${r},3)&" – "&ROUND(D${r},3))`,
    };
    styleFormulaCell(wsWindows.getCell(`E${r}`), '@', true);
    wsWindows.mergeCells(`F${r}:K${r}`);
    wsWindows.getCell(`F${r}`).value = {
      formula: `IF(A${r}="","",${excelWindowClassRange(`C${r}`, `D${r}`)})`,
    };
    styleFormulaCell(wsWindows.getCell(`F${r}`), '@', true, fl === 1);
  }

  // =========================================================================
  // 9. ЛИСТ 8: «Графики_Шибеко» (4 ЖИВЫЕ ДИАГРАММЫ + БЕЗРАЗРЫВНЫЕ ТАБЛИЦЫ ДАННЫХ)
  // =========================================================================
  styleTitleBanner(
    wsCharts,
    'A1:U2',
    'ГРАФИКИ ТЕПЛОВЛАЖНОСТНОГО РЕЖИМА ПО МЕТОДИКЕ А. С. ШИБЕКО (РАЗДЕЛ 7)',
    'Все 4 диаграммы автоматически перестраиваются при изменении шифра, города, толщины утеплителя или пароизоляции на листе «Ввод_и_Итоги». Слева — масштаб толщин x (мм, две оси Y: t °C и E/e Па), справа — масштаб R_п (п. 7.1.4).'
  );
  for (let c = 1; c <= 21; c++) {
    wsCharts.getColumn(c).width = c === 1 ? 7 : c === 2 ? 32 : 11;
  }

  // Строки 4..46: зона размещения 4 нативных диаграмм Excel (2x2)
  wsCharts.mergeCells('A3:U3');
  wsCharts.getCell('A3').value =
    'Диаграммы 1–2 (верхний ряд): Наружная стена • Диаграммы 3–4 (нижний ряд): Покрытие / чердачное перекрытие (сечение по пустоте). Ниже строки 48 находятся живые таблицы данных для графиков.';
  wsCharts.getCell('A3').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF475569' } };
  wsCharts.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsCharts.getRow(3).height = 18;

  // Живая безразрывная таблица данных для графиков Наружной стены (строки 51..60, NA() для пустых хвостовых слотов!)
  styleSectionRow(wsCharts, 49, 7, 'ДАННЫЕ ДЛЯ ГРАФИКОВ НАРУЖНОЙ СТЕНЫ (АВТОСЖАТИЕ АКТИВНЫХ СЕЧЕНИЙ С ЛИСТА «Стена_Расчет»)');
  styleTableHeader(wsCharts, 50, [
    '№', 'Сечение / граница слоя', 'x, мм', 'R_п.накопл', 't_от.пер, °C', 'E(t), Па', 'e_x, Па',
  ]);
  for (let slot = 1; slot <= 10; slot++) {
    const r = 50 + slot; // 51..60
    wsCharts.getRow(r).height = 19;
    const rankMax = `MAX('Стена_Расчет'!$L$28:$L$44)`;
    const matchSlot = `MATCH(${slot},'Стена_Расчет'!$L$28:$L$44,0)`;
    wsCharts.getCell(`A${r}`).value = slot;
    styleFormulaCell(wsCharts.getCell(`A${r}`), '0');
    wsCharts.getCell(`B${r}`).value = {
      formula: `IF(${slot}>${rankMax},"",INDEX('Стена_Расчет'!$B$28:$B$44,${matchSlot}))`,
    };
    styleLabelCell(wsCharts.getCell(`B${r}`));
    wsCharts.getCell(`C${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Стена_Расчет'!$C$28:$C$44,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`C${r}`), '0');
    wsCharts.getCell(`D${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),ROUND(INDEX('Стена_Расчет'!$E$28:$E$44,${matchSlot}),3))`,
    };
    styleFormulaCell(wsCharts.getCell(`D${r}`), '0.000');
    wsCharts.getCell(`E${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),ROUND(INDEX('Стена_Расчет'!$G$28:$G$44,${matchSlot}),2))`,
    };
    styleFormulaCell(wsCharts.getCell(`E${r}`), '0.00');
    wsCharts.getCell(`F${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Стена_Расчет'!$H$28:$H$44,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`F${r}`), '0.0');
    wsCharts.getCell(`G${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Стена_Расчет'!$I$28:$I$44,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`G${r}`), '0.00');
  }

  // Живая безразрывная таблица данных для графиков Покрытия (строки 64..73 — до 10 активных точек сечения по пустоте)
  styleSectionRow(wsCharts, 62, 7, 'ДАННЫЕ ДЛЯ ГРАФИКОВ ПОКРЫТИЯ / ПЕРЕКРЫТИЯ (АВТОСЖАТИЕ АКТИВНЫХ СЕЧЕНИЙ С ЛИСТА «Покрытие_Расчет»)');
  styleTableHeader(wsCharts, 63, [
    '№', 'Сечение / граница слоя', 'x, мм', 'R_п.накопл', 't_от.пер, °C', 'E(t), Па', 'e_x, Па',
  ]);
  for (let slot = 1; slot <= 10; slot++) {
    const r = 63 + slot; // 64..73
    wsCharts.getRow(r).height = 19;
    const rankMax = `MAX('Покрытие_Расчет'!$L$34:$L$46)`;
    const matchSlot = `MATCH(${slot},'Покрытие_Расчет'!$L$34:$L$46,0)`;
    wsCharts.getCell(`A${r}`).value = slot;
    styleFormulaCell(wsCharts.getCell(`A${r}`), '0');
    wsCharts.getCell(`B${r}`).value = {
      formula: `IF(${slot}>${rankMax},"",INDEX('Покрытие_Расчет'!$B$34:$B$46,${matchSlot}))`,
    };
    styleLabelCell(wsCharts.getCell(`B${r}`));
    wsCharts.getCell(`C${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Покрытие_Расчет'!$C$34:$C$46,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`C${r}`), '0');
    wsCharts.getCell(`D${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),ROUND(INDEX('Покрытие_Расчет'!$E$34:$E$46,${matchSlot}),3))`,
    };
    styleFormulaCell(wsCharts.getCell(`D${r}`), '0.000');
    wsCharts.getCell(`E${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),ROUND(INDEX('Покрытие_Расчет'!$G$34:$G$46,${matchSlot}),2))`,
    };
    styleFormulaCell(wsCharts.getCell(`E${r}`), '0.00');
    wsCharts.getCell(`F${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Покрытие_Расчет'!$H$34:$H$46,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`F${r}`), '0.0');
    wsCharts.getCell(`G${r}`).value = {
      formula: `IF(${slot}>${rankMax},NA(),INDEX('Покрытие_Расчет'!$I$34:$I$46,${matchSlot}))`,
    };
    styleFormulaCell(wsCharts.getCell(`G${r}`), '0.00');
  }

  // =========================================================================
  // 10. ЛИСТ 9: «AutoCAD_Графики» (КАЛЬКУЛЯТОР КООРДИНАТ ПОЛИЛИНИИ + ИНСТРУКЦИЯ)
  // =========================================================================
  styleTitleBanner(
    wsAutoCad,
    'A1:H2',
    'КАЛЬКУЛЯТОР ВВОДА ГРАФИКОВ В AUTOCAD (ПОЛИЛИНИЯ / PLINE) И ПОШАГОВАЯ ИНСТРУКЦИЯ',
    'Меняйте желтые ячейки высоты рамки H и пределов шкал — координаты X,Y пересчитываются автоматически. Скопируйте столбцы E, F, G и вставьте прямо в командную строку AutoCAD!'
  );
  wsAutoCad.columns = [
    { width: 22 }, // A: X (накопл.), мм / Параметр
    { width: 12 }, // B: t, °C / мин / H
    { width: 12 }, // C: E, Па / макс
    { width: 12 }, // D: e, Па
    { width: 22 }, // E: Коорд. для t
    { width: 22 }, // F: Коорд. для E
    { width: 22 }, // G: Коорд. для e
    { width: 32 }, // H: Плоскость / Примечание
  ];

  // --- БЛОК 1: НАРУЖНАЯ СТЕНА (строки 4..17) ---
  styleSectionRow(wsAutoCad, 4, 8, '1. НАРУЖНАЯ СТЕНА — ГЕНЕРАТОР КООРДИНАТ AUTOCAD (СВЯЗАН С «Стена_Расчет»)');

  // Настройки стены (строки 5..7)
  wsAutoCad.getRow(5).height = 20;
  wsAutoCad.getCell('A5').value = 'Высота рамки (H), мм';
  styleLabelCell(wsAutoCad.getCell('A5'), true);
  wsAutoCad.getCell('B5').value = 500;
  styleInputCell(wsAutoCad.getCell('B5'), '0');
  wsAutoCad.getCell('C5').value = 'мм (или 210)';
  styleLabelCell(wsAutoCad.getCell('C5'));
  wsAutoCad.getCell('D5').value = 'Ширина W:';
  styleLabelCell(wsAutoCad.getCell('D5'), true);
  wsAutoCad.getCell('E5').value = { formula: 'MAX(A10:A19)' };
  styleFormulaCell(wsAutoCad.getCell('E5'), '0" мм"', true, true);
  wsAutoCad.getCell('F5').value = 'Шаг оси t (1°C):';
  styleLabelCell(wsAutoCad.getCell('F5'));
  wsAutoCad.getCell('G5').value = { formula: 'ROUND(B5/(C6-B6),2)' };
  styleFormulaCell(wsAutoCad.getCell('G5'), '0.00" мм"', true);
  wsAutoCad.getCell('H5').value = { formula: '"ARRAYRECT: "&(C6-B6+1)&" строк (ось t)"' };
  styleFormulaCell(wsAutoCad.getCell('H5'), '@');

  wsAutoCad.getRow(6).height = 20;
  wsAutoCad.getCell('A6').value = 'Шкала t (мин / макс), °C';
  styleLabelCell(wsAutoCad.getCell('A6'), true);
  wsAutoCad.getCell('B6').value = -2;
  styleInputCell(wsAutoCad.getCell('B6'), '0');
  wsAutoCad.getCell('C6').value = 19;
  styleInputCell(wsAutoCad.getCell('C6'), '0');
  wsAutoCad.getCell('D6').value = 'Диапазон:';
  styleLabelCell(wsAutoCad.getCell('D6'));
  wsAutoCad.getCell('E6').value = { formula: 'C6-B6' };
  styleFormulaCell(wsAutoCad.getCell('E6'), '0" °C"');
  wsAutoCad.getCell('F6').value = 'Шаг оси E,e (100 Па):';
  styleLabelCell(wsAutoCad.getCell('F6'));
  wsAutoCad.getCell('G6').value = { formula: 'ROUND(B5/((C7-B7)/100),2)' };
  styleFormulaCell(wsAutoCad.getCell('G6'), '0.00" мм"', true);
  wsAutoCad.getCell('H6').value = { formula: '"ARRAYRECT: "&ROUND((C7-B7)/100+1,0)&" строк (ось E,e)"' };
  styleFormulaCell(wsAutoCad.getCell('H6'), '@');

  wsAutoCad.getRow(7).height = 20;
  wsAutoCad.getCell('A7').value = 'Шкала E, e (мин / макс), Па';
  styleLabelCell(wsAutoCad.getCell('A7'), true);
  wsAutoCad.getCell('B7').value = 300;
  styleInputCell(wsAutoCad.getCell('B7'), '0');
  wsAutoCad.getCell('C7').value = 2200;
  styleInputCell(wsAutoCad.getCell('C7'), '0');
  wsAutoCad.getCell('D7').value = 'Диапазон:';
  styleLabelCell(wsAutoCad.getCell('D7'));
  wsAutoCad.getCell('E7').value = { formula: 'C7-B7' };
  styleFormulaCell(wsAutoCad.getCell('E7'), '0" Па"');
  wsAutoCad.mergeCells('F7:H7');
  wsAutoCad.getCell('F7').value = 'Совет: для H=500 и ровного шага 25 мм задайте t: -2..18 (20°C) и E: 300..2300 (2000 Па)';
  styleLabelCell(wsAutoCad.getCell('F7'));

  styleTableHeader(wsAutoCad, 9, [
    'X (накопл.), мм', 't, °C', 'E, Па', 'e, Па',
    'Коорд. для t (PLINE)', 'Коорд. для E (PLINE)', 'Коорд. для e (PLINE)', 'Плоскость сечения стены',
  ]);

  for (let slot = 1; slot <= 10; slot++) {
    const r = 9 + slot; // строки 10..19
    wsAutoCad.getRow(r).height = 20;
    const rankMax = `MAX('Стена_Расчет'!$L$28:$L$44)`;
    const matchSlot = `MATCH(${slot},'Стена_Расчет'!$L$28:$L$44,0)`;

    wsAutoCad.getCell(`A${r}`).value = {
      formula: `IF(${slot}>${rankMax},"",INDEX('Стена_Расчет'!$C$28:$C$44,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`A${r}`), '0', true);
    wsAutoCad.getCell(`B${r}`).value = {
      formula: `IF(A${r}="","",ROUND(INDEX('Стена_Расчет'!$G$28:$G$44,${matchSlot}),2))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`B${r}`), '0.00');
    wsAutoCad.getCell(`C${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Стена_Расчет'!$H$28:$H$44,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`C${r}`), '0.0');
    wsAutoCad.getCell(`D${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Стена_Расчет'!$I$28:$I$44,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`D${r}`), '0.00');
    wsAutoCad.getCell(`E${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((B${r}-$B$6)/($C$6-$B$6)*$B$5,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`E${r}`), '@', true, true);
    wsAutoCad.getCell(`F${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((C${r}-$B$7)/($C$7-$B$7)*$B$5,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`F${r}`), '@', true, true);
    wsAutoCad.getCell(`G${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((D${r}-$B$7)/($C$7-$B$7)*$B$5,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`G${r}`), '@', true, true);
    wsAutoCad.getCell(`H${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Стена_Расчет'!$B$28:$B$44,${matchSlot}))`,
    };
    styleLabelCell(wsAutoCad.getCell(`H${r}`));
  }

  // --- БЛОК 2: ПОКРЫТИЕ / ПЕРЕКРЫТИЕ (СЕЧЕНИЕ ПО ПУСТОТЕ, строки 21..36) ---
  styleSectionRow(wsAutoCad, 21, 8, '2. ПОКРЫТИЕ / ЧЕРДАЧНОЕ ПЕРЕКРЫТИЕ (СЕЧЕНИЕ ПО ПУСТОТЕ) — КООРДИНАТЫ AUTOCAD');

  wsAutoCad.getRow(22).height = 20;
  wsAutoCad.getCell('A22').value = 'Высота рамки (H), мм';
  styleLabelCell(wsAutoCad.getCell('A22'), true);
  wsAutoCad.getCell('B22').value = 500;
  styleInputCell(wsAutoCad.getCell('B22'), '0');
  wsAutoCad.getCell('C22').value = 'мм (или 210)';
  styleLabelCell(wsAutoCad.getCell('C22'));
  wsAutoCad.getCell('D22').value = 'Ширина W:';
  styleLabelCell(wsAutoCad.getCell('D22'), true);
  wsAutoCad.getCell('E22').value = { formula: 'MAX(A27:A36)' };
  styleFormulaCell(wsAutoCad.getCell('E22'), '0" мм"', true, true);
  wsAutoCad.getCell('F22').value = 'Шаг оси t (1°C):';
  styleLabelCell(wsAutoCad.getCell('F22'));
  wsAutoCad.getCell('G22').value = { formula: 'ROUND(B22/(C23-B23),2)' };
  styleFormulaCell(wsAutoCad.getCell('G22'), '0.00" мм"', true);
  wsAutoCad.getCell('H22').value = { formula: '"ARRAYRECT: "&(C23-B23+1)&" строк (ось t)"' };
  styleFormulaCell(wsAutoCad.getCell('H22'), '@');

  wsAutoCad.getRow(23).height = 20;
  wsAutoCad.getCell('A23').value = 'Шкала t (мин / макс), °C';
  styleLabelCell(wsAutoCad.getCell('A23'), true);
  wsAutoCad.getCell('B23').value = -2;
  styleInputCell(wsAutoCad.getCell('B23'), '0');
  wsAutoCad.getCell('C23').value = 19;
  styleInputCell(wsAutoCad.getCell('C23'), '0');
  wsAutoCad.getCell('D23').value = 'Диапазон:';
  styleLabelCell(wsAutoCad.getCell('D23'));
  wsAutoCad.getCell('E23').value = { formula: 'C23-B23' };
  styleFormulaCell(wsAutoCad.getCell('E23'), '0" °C"');
  wsAutoCad.getCell('F23').value = 'Шаг оси E,e (100 Па):';
  styleLabelCell(wsAutoCad.getCell('F23'));
  wsAutoCad.getCell('G23').value = { formula: 'ROUND(B22/((C24-B24)/100),2)' };
  styleFormulaCell(wsAutoCad.getCell('G23'), '0.00" мм"', true);
  wsAutoCad.getCell('H23').value = { formula: '"ARRAYRECT: "&ROUND((C24-B24)/100+1,0)&" строк (ось E,e)"' };
  styleFormulaCell(wsAutoCad.getCell('H23'), '@');

  wsAutoCad.getRow(24).height = 20;
  wsAutoCad.getCell('A24').value = 'Шкала E, e (мин / макс), Па';
  styleLabelCell(wsAutoCad.getCell('A24'), true);
  wsAutoCad.getCell('B24').value = 300;
  styleInputCell(wsAutoCad.getCell('B24'), '0');
  wsAutoCad.getCell('C24').value = 2200;
  styleInputCell(wsAutoCad.getCell('C24'), '0');
  wsAutoCad.getCell('D24').value = 'Диапазон:';
  styleLabelCell(wsAutoCad.getCell('D24'));
  wsAutoCad.getCell('E24').value = { formula: 'C24-B24' };
  styleFormulaCell(wsAutoCad.getCell('E24'), '0" Па"');
  wsAutoCad.mergeCells('F24:H24');
  wsAutoCad.getCell('F24').value = 'Все активные сечения покрытия (вкл. пустоту с R_п=0 и стяжку под кровлей) связаны с «Покрытие_Расчет»';
  styleLabelCell(wsAutoCad.getCell('F24'));

  styleTableHeader(wsAutoCad, 26, [
    'X (накопл.), мм', 't, °C', 'E, Па', 'e, Па',
    'Коорд. для t (PLINE)', 'Коорд. для E (PLINE)', 'Коорд. для e (PLINE)', 'Плоскость сечения покрытия (пустота)',
  ]);

  for (let slot = 1; slot <= 10; slot++) {
    const r = 26 + slot; // строки 27..36
    wsAutoCad.getRow(r).height = 20;
    const rankMax = `MAX('Покрытие_Расчет'!$L$34:$L$46)`;
    const matchSlot = `MATCH(${slot},'Покрытие_Расчет'!$L$34:$L$46,0)`;

    wsAutoCad.getCell(`A${r}`).value = {
      formula: `IF(${slot}>${rankMax},"",INDEX('Покрытие_Расчет'!$C$34:$C$46,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`A${r}`), '0', true);
    wsAutoCad.getCell(`B${r}`).value = {
      formula: `IF(A${r}="","",ROUND(INDEX('Покрытие_Расчет'!$G$34:$G$46,${matchSlot}),2))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`B${r}`), '0.00');
    wsAutoCad.getCell(`C${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$H$34:$H$46,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`C${r}`), '0.0');
    wsAutoCad.getCell(`D${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$I$34:$I$46,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`D${r}`), '0.00');
    wsAutoCad.getCell(`E${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((B${r}-$B$23)/($C$23-$B$23)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`E${r}`), '@', true, true);
    wsAutoCad.getCell(`F${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((C${r}-$B$24)/($C$24-$B$24)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`F${r}`), '@', true, true);
    wsAutoCad.getCell(`G${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((D${r}-$B$24)/($C$24-$B$24)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`G${r}`), '@', true, true);
    wsAutoCad.getCell(`H${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$B$34:$B$46,${matchSlot}))`,
    };
    styleLabelCell(wsAutoCad.getCell(`H${r}`));
  }

  // --- БЛОК 3: ПОКРЫТИЕ — ХУДШЕЕ СЕЧЕНИЕ ПО РЕБРУ (строки 38..44) ---
  styleSectionRow(wsAutoCad, 38, 8, '3. ПОКРЫТИЕ — ХУДШЕЕ СЕЧЕНИЕ ПО БЕТОННОМУ РЕБРУ (ИСПОЛЬЗУЕТ ШКАЛУ БЛОКА 2)');
  styleTableHeader(wsAutoCad, 39, [
    'X (накопл.), мм', 't, °C', 'E, Па', 'e, Па',
    'Коорд. для t (PLINE)', 'Коорд. для E (PLINE)', 'Коорд. для e (PLINE)', 'Плоскость сечения (по ребру)',
  ]);
  for (let slot = 1; slot <= 5; slot++) {
    const r = 39 + slot; // строки 40..44
    wsAutoCad.getRow(r).height = 20;
    const rankMax = `MAX('Покрытие_Расчет'!$L$52:$L$61)`;
    const matchSlot = `MATCH(${slot},'Покрытие_Расчет'!$L$52:$L$61,0)`;
    wsAutoCad.getCell(`A${r}`).value = {
      formula: `IF(${slot}>${rankMax},"",INDEX('Покрытие_Расчет'!$C$52:$C$61,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`A${r}`), '0', true);
    wsAutoCad.getCell(`B${r}`).value = {
      formula: `IF(A${r}="","",ROUND(INDEX('Покрытие_Расчет'!$G$52:$G$61,${matchSlot}),2))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`B${r}`), '0.00');
    wsAutoCad.getCell(`C${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$H$52:$H$61,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`C${r}`), '0.0');
    wsAutoCad.getCell(`D${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$I$52:$I$61,${matchSlot}))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`D${r}`), '0.00');
    wsAutoCad.getCell(`E${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((B${r}-$B$23)/($C$23-$B$23)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`E${r}`), '@', true, true);
    wsAutoCad.getCell(`F${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((C${r}-$B$24)/($C$24-$B$24)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`F${r}`), '@', true, true);
    wsAutoCad.getCell(`G${r}`).value = {
      formula: `IF(A${r}="","",SUBSTITUTE(A${r},",",".")&","&SUBSTITUTE(ROUND((D${r}-$B$24)/($C$24-$B$24)*$B$22,2),",","."))`,
    };
    styleFormulaCell(wsAutoCad.getCell(`G${r}`), '@', true, true);
    wsAutoCad.getCell(`H${r}`).value = {
      formula: `IF(A${r}="","",INDEX('Покрытие_Расчет'!$B$52:$B$61,${matchSlot}))`,
    };
    styleLabelCell(wsAutoCad.getCell(`H${r}`));
  }

  // --- БЛОК 4: ПОЛНАЯ ПОШАГОВАЯ ИНСТРУКЦИЯ ПО ПОСТРОЕНИЮ В AUTOCAD ---
  styleSectionRow(wsAutoCad, 46, 8, '4. ПОШАГОВАЯ ИНСТРУКЦИЯ ПО АВТОМАТИЧЕСКОМУ ПОСТРОЕНИЮ ГРАФИКА В AUTOCAD');
  const autocadGuideSteps: [string, string][] = [
    [
      'Шаг 1. Подготовка чертежа, слоев и рамки (масштаб 1:1 в мм)',
      'Создайте слои в AutoCAD: «Конструкция» (черный, 0.30 мм), «Штриховка» (серый, 0.13 мм), «Оси» (темно-серый, 0.18 мм), «График_t» (красный, 0.35 мм), «График_E» (синий, 0.35 мм), «График_e» (зеленый/оранжевый, штриховой DASHED, 0.30 мм). Начертите прямоугольную рамку: ширина W = суммарная толщина конструкции (ячейка E5 для стены или E22 для покрытия), высота H = 500 мм (или 210 мм). Проведите вертикальные линии границ всех слоев на расстояниях X из столбца A и тонкую пунктирную линию середины утеплителя.',
    ],
    [
      'Шаг 2. Штриховка слоев конструкции (ШТРИХ / HATCH)',
      'Переключитесь на слой «Штриховка» и заштрихуйте материалы слоев (например, ANSI31 — кирпич/камень/штукатурка, ANSI37 — утеплитель, бетон — AR-CONC; воздушную прослойку пустотной плиты оставьте БЕЗ штриховки). Выделите все штриховки → Правая кнопка → Порядок прорисовки → «На задний план», чтобы линии графиков не перекрывались штриховкой.',
    ],
    [
      'Шаг 3. КРИТИЧЕСКИ ВАЖНО — Привязка начала координат в (0,0) и отключение F3 / F12',
      '1) Выделите всю рамку со слоями → введите ПЕРЕНЕСТИ (MOVE) → укажите базовой точкой НИЖНИЙ ЛЕВЫЙ угол рамки → введите #0,0 и нажмите Enter (символ # задает абсолютные координаты!).\n2) ПЕРЕД вставкой кривых ОБЯЗАТЕЛЬНО отключите Объектную привязку (клавиша F3 — должна быть выключена) и Динамический ввод (клавиша F12 — должна быть выключена), иначе AutoCAD будет притягивать точки к углам слоев и искажать график!',
    ],
    [
      'Шаг 4. Автоматическое построение кривых t, E, e вставкой из Excel (ПОЛИЛИНИЯ / PLINE)',
      '1) Сделайте текущим слой «График_t». Выделите в Excel непустые ячейки столбца E (для стены E10:E19, для покрытия E27:E36) и нажмите Ctrl+C.\n2) В AutoCAD введите команду ПОЛИЛИНИЯ (или _PLINE) → нажмите Enter → кликните мышью ВНУТРЬ командной строки внизу экрана → нажмите Ctrl+V → затем Enter/Esc! Ломаная t(x) построится мгновенно с точностью до 0.01 мм!\n3) Повторите то же самое на слое «График_E» (столбец F) и на слое «График_e» (столбец G). Для плавного вида кривой E(x) можно выполнить ПОЛРЕД (PEDIT) → выбрать кривую E → «Сгладить» (Fit) или оставить точной полилинией.',
    ],
    [
      'Шаг 5. Построение двух осей Y (t °C и E, e Па) и авторазметка засечек (МАССИВПРЯМОУГ / ARRAYRECT)',
      'Слева от рамки проведите две вертикальные оси высотой H (например, на расстоянии 25 мм от рамки для t, °C и еще на 35 мм левее для E, e, Па). Внизу каждой оси начертите горизонтальную засечку длиной 4–6 мм.\nВыделите засечку оси t → введите МАССИВПРЯМОУГ (ARRAYRECT) → задайте: Столбцы = 1, Строки = значение из H5 (или H22), Между строками = точный шаг из ячейки G5 (или G22, мм)! Повторите для оси E, e с шагом из G6 (или G23) и числом строк из H6 (или H23). При необходимости расчлените массив (РАСЧЛЕНИТЬ / EXPLODE).',
    ],
    [
      'Шаг 6. Подписи значений, знак градуса (°C) и скрытие штриховки под текстом',
      'Подпишите значения шкал t (°C) и E, e (Па), а также проставьте значения в характерных точках графиков. Чтобы быстро набрать символ градуса ° в AutoCAD, введите %%d (например, 17,65%%dC → отобразится 17,65°C).\nЧтобы штриховка не мешала читать подписи и легенду поверх конструкции: при редактировании текста (МТЕКСТ / MTEXT) откройте на ленте «Маскировка фона» → включите галочки «Использовать маскировку фона» и «Использовать цвет фона чертежа» (отступ 1.15). Для рамки легенды можно также применить команду МАСКИРОВКА (WIPEOUT).',
    ],
  ];

  autocadGuideSteps.forEach(([title, body], idx) => {
    const r = 47 + idx;
    wsAutoCad.getRow(r).height = idx === 2 || idx === 3 ? 66 : 54;
    wsAutoCad.mergeCells(`A${r}:B${r}`);
    wsAutoCad.getCell(`A${r}`).value = title;
    styleLabelCell(wsAutoCad.getCell(`A${r}`), true);
    wsAutoCad.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accentFill } };
    wsAutoCad.mergeCells(`C${r}:H${r}`);
    wsAutoCad.getCell(`C${r}`).value = body;
    styleLabelCell(wsAutoCad.getCell(`C${r}`));
  });

  // =========================================================================
  // 11. ЛИСТ 2: «В_отчет» — ВСЕ ТАБЛИЦЫ В СТРУКТУРЕ ПОЯСНИТЕЛЬНОЙ ЗАПИСКИ (PDF)
  // =========================================================================
  populateReportTablesSheet(
    wsReport,
    {
      citiesEndRow,
      bTypesEndRow,
      matEndRow,
      vbEndRow,
      maxPipeSlots: MAX_EXCEL_PIPE_SLOTS,
    },
    calc
  );

  // =========================================================================
  // 12. ЛИСТ 3: «Формулы_расчета» — ВСЕ ФОРМУЛЫ ОТЧЕТА И ПОДРОБНЫЕ ПОДСТАНОВКИ
  // =========================================================================
  populateFormulasSheet(wsFormulas, calc);

  return wb;
}

interface ReportSheetContext {
  citiesEndRow: number;
  bTypesEndRow: number;
  matEndRow: number;
  vbEndRow: number;
  maxPipeSlots: number;
}

/**
 * Заполняет лист «В_отчет» всеми таблицами курсовой работы в структуре пояснительной записки
 * (на основе динамических формул и ссылок на расчетные листы, чтобы при любом изменении
 * исходных данных или пароизоляции все таблицы автоматически обновлялись).
 */
function populateReportTablesSheet(
  ws: ExcelJS.Worksheet,
  ctx: ReportSheetContext,
  calc: FullCourseworkCalculation
) {
  ws.columns = [
    { width: 8 },  // A: № / поз.
    { width: 42 }, // B: Наименование / расчетная плоскость / параметр
    { width: 14 }, // C: δ / x / Значение
    { width: 14 }, // D: ρ / ΣR_i / Ед. изм.
    { width: 14 }, // E: λ / t_x зима
    { width: 14 }, // F: s / t_x отоп.
    { width: 14 }, // G: μ / e_x
    { width: 14 }, // H: R_i / E_x
    { width: 16 }, // I: R_п.i / Запас
    { width: 16 }, // J: Класс / Статус
    { width: 24 }, // K: Источник / Примечание
  ];

  styleTitleBanner(
    ws,
    11,
    'ТАБЛИЦЫ ДЛЯ ВСТАВКИ В ПОЯСНИТЕЛЬНУЮ ЗАПИСКУ (ЛИСТ «В_отчет»)',
    'Все таблицы полностью синхронизированы с пояснительной запиской в Word / PDF и расчетными листами Excel'
  );

  let r = 4;

  // =========================================================================
  // ТАБЛИЦА 1.1 — Климатические параметры пункта строительства
  // =========================================================================
  styleSectionRow(ws, r, 11, 'Таблица 1.1 – Климатические параметры пункта строительства (СН 2.04.02-2020 / СП 2.04.04-2026)');
  r++;
  ws.getRow(r).height = 28;
  ws.mergeCells(`A${r}:D${r}`);
  ws.getCell(`A${r}`).value = 'Параметры наружного климата';
  styleTableHeader(ws.getCell(`A${r}`));
  ws.getCell(`E${r}`).value = 'Обозначение';
  styleTableHeader(ws.getCell(`E${r}`));
  ws.getCell(`F${r}`).value = 'Ед. изм.';
  styleTableHeader(ws.getCell(`F${r}`));
  ws.getCell(`G${r}`).value = 'Числовые значения';
  styleTableHeader(ws.getCell(`G${r}`));
  ws.mergeCells(`H${r}:K${r}`);
  ws.getCell(`H${r}`).value = 'Нормативный источник (СП 2.04.04-2026 / СП 2.04.01-2020)';
  styleTableHeader(ws.getCell(`H${r}`));
  r++;

  const climateTableRows: [string, string, string, string, string, string][] = [
    ['Температура воздуха наиболее холодных суток обеспеченностью 0,98', 't_х.с^(0,98)', '°C', 'Ввод_и_Итоги!F8', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 3'],
    ['Температура воздуха наиболее холодных суток обеспеченностью 0,92', 't_х.с^(0,92)', '°C', 'Ввод_и_Итоги!F9', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 4'],
    ['Температура воздуха наиболее холодной пятидневки обеспеченностью 0,98', 't_х.п^(0,98)', '°C', 'Ввод_и_Итоги!F10', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 5'],
    ['Температура воздуха наиболее холодной пятидневки обеспеченностью 0,92', 't_х.п^(0,92)', '°C', 'Ввод_и_Итоги!F11', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 6'],
    ['Температура воздуха наиболее холодных трёх суток обеспеченностью 0,92', 't_х.тр.с^(0,92)', '°C', 'Ввод_и_Итоги!F22', '0.0', 'СП 2.04.01-2020, табл. 6.3 (расчетная)'],
    ['Средняя скорость ветра за отопительный период (три наиболее холодных месяца)', 'v_ср', 'м/с', 'Ввод_и_Итоги!F12', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 19'],
    ['Средняя температура воздуха за отопительный период', 't_н.от', '°C', 'Ввод_и_Итоги!F13', '0.0', 'СП 2.04.04-2026, табл. 5.1, графа 11'],
    ['Продолжительность отопительного периода', 'z_от', 'сут.', 'Ввод_и_Итоги!F14', '0', 'СП 2.04.04-2026, табл. 5.1, графа 12'],
    ['Средняя относительная влажность воздуха за отопительный период', 'φ_н.от', '%', 'Ввод_и_Итоги!F15', '0', 'СП 2.04.04-2026, табл. 5.1, графа 15'],
  ];

  for (const [label, sym, unit, formula, fmt, source] of climateTableRows) {
    ws.getRow(r).height = 20;
    ws.mergeCells(`A${r}:D${r}`);
    ws.getCell(`A${r}`).value = label;
    styleLabelCell(ws.getCell(`A${r}`));
    ws.getCell(`E${r}`).value = sym;
    styleFormulaCell(ws.getCell(`E${r}`), '@', 'center');
    ws.getCell(`F${r}`).value = unit;
    styleFormulaCell(ws.getCell(`F${r}`), '@', 'center');
    ws.getCell(`G${r}`).value = { formula };
    styleFormulaCell(ws.getCell(`G${r}`), fmt, 'center', true);
    ws.mergeCells(`H${r}:K${r}`);
    ws.getCell(`H${r}`).value = source;
    styleLabelCell(ws.getCell(`H${r}`));
    r++;
  }

  r++;

  // =========================================================================
  // ТАБЛИЦА 1.2 — Параметры микроклимата помещений и нормативные требования
  // =========================================================================
  styleSectionRow(ws, r, 11, 'Таблица 1.2 – Параметры микроклимата помещений и нормативные требования (СН 2.04.02-2020 / СП 2.04.01-2020)');
  r++;
  ws.getRow(r).height = 28;
  ws.mergeCells(`A${r}:D${r}`);
  ws.getCell(`A${r}`).value = 'Параметр внутреннего микроклимата и теплозащиты';
  styleTableHeader(ws.getCell(`A${r}`));
  ws.getCell(`E${r}`).value = 'Обозначение';
  styleTableHeader(ws.getCell(`E${r}`));
  ws.getCell(`F${r}`).value = 'Ед. изм.';
  styleTableHeader(ws.getCell(`F${r}`));
  ws.getCell(`G${r}`).value = 'Значение';
  styleTableHeader(ws.getCell(`G${r}`));
  ws.mergeCells(`H${r}:K${r}`);
  ws.getCell(`H${r}`).value = 'Нормативный источник';
  styleTableHeader(ws.getCell(`H${r}`));
  r++;

  const microclimateTableRows: [string, string, string, string | number, string, string][] = [
    ['Расчетная температура внутреннего воздуха', 't_в', '°C', 'Ввод_и_Итоги!C26', '0.0', 'ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1'],
    ['Расчетная относительная влажность внутреннего воздуха', 'φ_в', '%', 'Ввод_и_Итоги!C27', '0', 'ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1'],
    ['Минимально допустимая температура воздуха в техподполье', 't_п.мин', '°C', 2, '0.0', 'СП 2.04.01-2020, п. К.3'],
    ['Нормативное сопротивление теплопередаче наружной стены', 'R_т.норм.ст', 'м²·°C/Вт', 'Ввод_и_Итоги!F26', '0.00', 'СН 2.04.02-2020, табл. 5.1'],
    ['Нормативное сопротивление теплопередаче покрытия (чердака)', 'R_т.норм.пк', 'м²·°C/Вт', 'Ввод_и_Итоги!F27', '0.00', 'СН 2.04.02-2020, табл. 5.1'],
    ['Нормативное сопротивление теплопередаче перекрытия ПТП', 'R_т.норм.птп', 'м²·°C/Вт', 'Ввод_и_Итоги!F28', '0.00', 'СН 2.04.02-2020, табл. 5.1'],
    ['Нормируемый температурный перепад для наружных стен', 'Δt_в.норм.ст', '°C', 'Ввод_и_Итоги!F29', '0.0', 'СП 2.04.01-2020, табл. 6.5'],
    ['Нормируемый температурный перепад для покрытия (чердака)', 'Δt_в.норм.пк', '°C', 'Ввод_и_Итоги!F30', '0.0', 'СП 2.04.01-2020, табл. 6.5'],
    ['Нормируемый температурный перепад для перекрытия ПТП', 'Δt_в.норм.птп', '°C', 2.0, '0.0', 'СП 2.04.01-2020, табл. 6.5'],
  ];

  for (const [label, sym, unit, valOrF, fmt, source] of microclimateTableRows) {
    ws.getRow(r).height = 20;
    ws.mergeCells(`A${r}:D${r}`);
    ws.getCell(`A${r}`).value = label;
    styleLabelCell(ws.getCell(`A${r}`));
    ws.getCell(`E${r}`).value = sym;
    styleFormulaCell(ws.getCell(`E${r}`), '@', 'center');
    ws.getCell(`F${r}`).value = unit;
    styleFormulaCell(ws.getCell(`F${r}`), '@', 'center');
    if (typeof valOrF === 'number') {
      ws.getCell(`G${r}`).value = valOrF;
      styleFormulaCell(ws.getCell(`G${r}`), fmt, 'center', true);
    } else {
      ws.getCell(`G${r}`).value = { formula: valOrF };
      styleFormulaCell(ws.getCell(`G${r}`), fmt, 'center', true);
    }
    ws.mergeCells(`H${r}:K${r}`);
    ws.getCell(`H${r}`).value = source;
    styleLabelCell(ws.getCell(`H${r}`));
    r++;
  }

  r++;

  // =========================================================================
  // ТАБЛИЦА 2.1 — Теплотехнические характеристики материалов слоев наружной стены
  // =========================================================================
  styleSectionRow(ws, r, 11, 'Таблица 2.1 – Теплотехнические характеристики материалов слоев наружной стены');
  r++;
  ws.getRow(r).height = 36;
  const wallMatHeaders = [
    '№',
    'Наименование материала слоев (изнутри наружу)',
    'Толщина δ_i, м',
    'Плотность ρ_0, кг/м³',
    'λ, Вт/(м·°C)',
    's, Вт/(м²·°C)',
    'μ, мг/(м·ч·Па)',
    'R_i, м²·°C/Вт',
    'R_п.i, м²·ч·Па/мг',
  ];
  wallMatHeaders.forEach((h, idx) => {
    const colIdx = idx + 1;
    if (colIdx < 9) {
      const cell = ws.getRow(r).getCell(colIdx);
      cell.value = h;
      styleTableHeader(cell);
    } else {
      ws.mergeCells(`I${r}:K${r}`);
      ws.getCell(`I${r}`).value = h;
      styleTableHeader(ws.getCell(`I${r}`));
    }
  });
  r++;

  // Слои 1..5 наружной стены
  for (let i = 0; i < 5; i++) {
    const srcRow = 7 + i;
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = { formula: `Стена_Расчет!A${srcRow}` };
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center');
    ws.getCell(`B${r}`).value = { formula: `Стена_Расчет!B${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '@', 'left');
    ws.getCell(`C${r}`).value = { formula: `Стена_Расчет!D${srcRow}` };
    styleFormulaCell(ws.getCell(`C${r}`), '0.000', 'right', true);
    ws.getCell(`D${r}`).value = {
      formula: `IF(Стена_Расчет!C${srcRow}="INSULATION",'Ввод_и_Итоги'!$F$32,IFERROR(INDEX('Справ_Материалы'!$C$2:$C$${ctx.matEndRow},MATCH(Стена_Расчет!C${srcRow},'Справ_Материалы'!$A$2:$A$${ctx.matEndRow},0)),""))`,
    };
    styleFormulaCell(ws.getCell(`D${r}`), '0', 'right');
    ws.getCell(`E${r}`).value = { formula: `Стена_Расчет!E${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '0.0000', 'right');
    ws.getCell(`F${r}`).value = { formula: `Стена_Расчет!G${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right');
    ws.getCell(`G${r}`).value = { formula: `Стена_Расчет!I${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), '0.0000', 'right');
    ws.getCell(`H${r}`).value = { formula: `Стена_Расчет!F${srcRow}` };
    styleFormulaCell(ws.getCell(`H${r}`), '0.0000', 'right');
    ws.mergeCells(`I${r}:K${r}`);
    ws.getCell(`I${r}`).value = { formula: `Стена_Расчет!J${srcRow}` };
    styleFormulaCell(ws.getCell(`I${r}`), '0.000', 'right');
    r++;
  }

  // Строка пароизоляции стены
  ws.getRow(r).height = 20;
  ws.getCell(`A${r}`).value = 'ПИ';
  styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', true);
  ws.getCell(`B${r}`).value = { formula: `Стена_Расчет!B12` };
  styleFormulaCell(ws.getCell(`B${r}`), '@', 'left', true);
  ws.getCell(`C${r}`).value = { formula: `Стена_Расчет!D12` };
  styleFormulaCell(ws.getCell(`C${r}`), '0.000', 'right', true);
  ws.getCell(`D${r}`).value = '—';
  styleFormulaCell(ws.getCell(`D${r}`), '@', 'center');
  ws.getCell(`E${r}`).value = { formula: `Стена_Расчет!E12` };
  styleFormulaCell(ws.getCell(`E${r}`), '0.00', 'right');
  ws.getCell(`F${r}`).value = { formula: `Стена_Расчет!G12` };
  styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right');
  ws.getCell(`G${r}`).value = { formula: `Стена_Расчет!I12` };
  styleFormulaCell(ws.getCell(`G${r}`), '0.0000', 'right');
  ws.getCell(`H${r}`).value = { formula: `Стена_Расчет!F12` };
  styleFormulaCell(ws.getCell(`H${r}`), '0.0000', 'right');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = { formula: `Стена_Расчет!J12` };
  styleFormulaCell(ws.getCell(`I${r}`), '0.000', 'right', true);
  r++;

  // Итого по стене
  ws.getRow(r).height = 24;
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = 'Итого по наружной стене (R_0, R_п, D):';
  styleResultCell(ws.getCell(`A${r}`), '@', 'right');
  ws.getCell(`C${r}`).value = { formula: 'SUM(Стена_Расчет!D7:D12)' };
  styleResultCell(ws.getCell(`C${r}`), '0.000');
  ws.getCell(`D${r}`).value = '—';
  styleResultCell(ws.getCell(`D${r}`), '@', 'center');
  ws.getCell(`E${r}`).value = '—';
  styleResultCell(ws.getCell(`E${r}`), '@', 'center');
  ws.getCell(`F${r}`).value = '—';
  styleResultCell(ws.getCell(`F${r}`), '@', 'center');
  ws.getCell(`G${r}`).value = '—';
  styleResultCell(ws.getCell(`G${r}`), '@', 'center');
  ws.getCell(`H${r}`).value = { formula: '"R₀ = "&ROUND(Стена_Расчет!C16,3)' };
  styleResultCell(ws.getCell(`H${r}`), '@', 'center');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = { formula: '"Rп = "&ROUND(Стена_Расчет!C21,3)' };
  styleResultCell(ws.getCell(`I${r}`), '@', 'center');
  r += 2;

  // =========================================================================
  // ТАБЛИЦА 2.2 — Распределение температуры и упругости водяного пара в наружной стене
  // Если есть конденсация — выводим ДВА ВАРИАНТА (Вариант 1 без ПИ и Вариант 2 с ПИ)
  // =========================================================================
  const hasWallCondensation = Boolean(
    calc.wall.condensationRisk ||
    calc.wall.unprotectedVariant?.condensationRisk ||
    calc.wall.protectedVariant
  );

  const renderWallMoistureProfileTable = (
    subTitle: string,
    profilePts: CrossSectionTemperaturePoint[],
    isProtected: boolean
  ) => {
    styleSectionRow(ws, r, 11, subTitle);
    r++;
    ws.getRow(r).height = 36;
    [
      '№ пл.',
      'Расчетная плоскость / граница слоя',
      'x, мм',
      'ΣR_i, м²·°C/Вт',
      't_x (зима), °C',
      't_x (от. пер.), °C',
      'e_x, Па',
      'E_x, Па',
      'E_x − e_x, Па',
    ].forEach((h, idx) => {
      const cell = ws.getRow(r).getCell(idx + 1);
      cell.value = h;
      styleTableHeader(cell);
    });
    ws.mergeCells(`J${r}:K${r}`);
    ws.getCell(`J${r}`).value = 'Условие e_x ≤ E_x / Заключение';
    styleTableHeader(ws.getCell(`J${r}`));
    r++;

    profilePts.forEach((pt, pIdx) => {
      ws.getRow(r).height = 20;
      ws.getCell(`A${r}`).value =
        pIdx === 0
          ? 'вн.'
          : pIdx === profilePts.length - 1
          ? 'нар.'
          : `${pIdx}${pt.isVaporBarrier ? ' (ПИ)' : pt.isInsulationMidpoint ? ' (сер.)' : ''}`;
      styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', Boolean(pt.isVaporBarrier || pt.isInsulationMidpoint));
      ws.getCell(`B${r}`).value = pt.planeName;
      styleFormulaCell(ws.getCell(`B${r}`), '@', 'left', Boolean(pt.isVaporBarrier || pt.isInsulationMidpoint));
      ws.getCell(`C${r}`).value = Math.round(pt.coord_x_mm);
      styleFormulaCell(ws.getCell(`C${r}`), '0', 'right');
      ws.getCell(`D${r}`).value = +pt.R_cumulative.toFixed(3);
      styleFormulaCell(ws.getCell(`D${r}`), '0.000', 'right');
      ws.getCell(`E${r}`).value = +pt.temp_winter.toFixed(2);
      styleFormulaCell(ws.getCell(`E${r}`), '0.00', 'right');
      ws.getCell(`F${r}`).value = +pt.temp_heating.toFixed(2);
      styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right', true);
      ws.getCell(`G${r}`).value = +pt.e_partial.toFixed(2);
      styleFormulaCell(ws.getCell(`G${r}`), '0.00', 'right', true);
      ws.getCell(`H${r}`).value = +pt.E_sat.toFixed(1);
      styleFormulaCell(ws.getCell(`H${r}`), '0.0', 'right', true);
      ws.getCell(`I${r}`).value = +pt.delta_margin.toFixed(1);
      styleFormulaCell(ws.getCell(`I${r}`), '0.0', 'right', true);
      ws.mergeCells(`J${r}:K${r}`);
      const isCond = pt.delta_margin < 0 && pIdx > 0 && pIdx < profilePts.length - 1;
      ws.getCell(`J${r}`).value = isCond ? 'e_x > E_x — ЗОНА КОНДЕНСАЦИИ ✗' : 'e_x ≤ E_x — норма ✓';
      styleFormulaCell(ws.getCell(`J${r}`), '@', 'center', isCond);
      r++;
    });

    ws.getRow(r).height = 24;
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = isProtected
      ? 'Вывод по Варианту 2 (с пароизоляцией): При установке расчетного слоя пароизоляции во всех сечениях стены e_x < E_x — выпадение конденсата полностью исключено.'
      : 'Вывод по Варианту 1 (без пароизоляции): В толще стены возникает зона конденсации (e_x ≥ E_x) — требуется обязательное устройство пароизоляционного слоя с теплой стороны (СП 2.04.01-2020 п. 10.6).';
    styleResultCell(ws.getCell(`A${r}`), '@', 'left');
    r += 2;
  };

  if (hasWallCondensation && calc.wall.unprotectedVariant) {
    renderWallMoistureProfileTable(
      'Таблица 2.2а – Тепловлажностный режим наружной стены БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1)',
      calc.wall.unprotectedVariant.crossSectionProfile,
      false
    );
    renderWallMoistureProfileTable(
      'Таблица 2.2б – Тепловлажностный режим наружной стены С ПАРОИЗОЛЯЦИЕЙ (Вариант 2)',
      (calc.wall.protectedVariant ?? calc.wall).crossSectionProfile,
      true
    );
  } else {
    renderWallMoistureProfileTable(
      'Таблица 2.2 – Распределение температуры и парциального давления водяного пара в наружной стене',
      calc.wall.crossSectionProfile,
      true
    );
  }

  // =========================================================================
  // ТАБЛИЦА 3.1 — Характеристики материалов покрытия / чердачного перекрытия
  // =========================================================================
  styleSectionRow(
    ws,
    r,
    11,
    'Таблица 3.1 – Теплотехнические характеристики материалов слоев покрытия (чердачного перекрытия)'
  );
  r++;
  ws.getRow(r).height = 36;
  [
    '№',
    'Наименование материала слоев конструкции',
    'Толщина δ_i, м',
    'Плотность ρ_0, кг/м³',
    'λ, Вт/(м·°C)',
    's, Вт/(м²·°C)',
    'μ, мг/(м·ч·Па)',
    'R_i, м²·°C/Вт',
    'R_п.i, м²·ч·Па/мг',
  ].forEach((h, idx) => {
    const colIdx = idx + 1;
    if (colIdx < 9) {
      const cell = ws.getRow(r).getCell(colIdx);
      cell.value = h;
      styleTableHeader(cell);
    } else {
      ws.mergeCells(`I${r}:K${r}`);
      ws.getCell(`I${r}`).value = h;
      styleTableHeader(ws.getCell(`I${r}`));
    }
  });
  r++;

  // Слои 1..6 + ПИ покрытия из единой таблицы Покрытие_Расчет!A7:K13 (аналогично Стена_Расчет!)
  for (let srcRow = 7; srcRow <= 13; srcRow++) {
    const isSlab = srcRow === 9;
    const isIns = srcRow === 10;
    const isVb = srcRow === 13;
    const isBoldRow = isSlab || isIns || isVb;
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = { formula: `Покрытие_Расчет!A${srcRow}` };
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', isBoldRow);
    ws.getCell(`B${r}`).value = { formula: `Покрытие_Расчет!B${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '@', 'left', isBoldRow);
    ws.getCell(`C${r}`).value = { formula: `Покрытие_Расчет!D${srcRow}` };
    styleFormulaCell(ws.getCell(`C${r}`), isVb ? '0.0000' : '0.000', 'right', isBoldRow);
    ws.getCell(`D${r}`).value = isSlab
      ? 2500
      : isIns
      ? { formula: "'Ввод_и_Итоги'!$F$32" }
      : isVb
      ? '—'
      : {
          formula: `IF(Покрытие_Расчет!C${srcRow}="","—",IFERROR(INDEX('Справ_Материалы'!$C$2:$C$${ctx.matEndRow},MATCH(Покрытие_Расчет!C${srcRow},'Справ_Материалы'!$A$2:$A$${ctx.matEndRow},0)),"—"))`,
        };
    styleFormulaCell(ws.getCell(`D${r}`), isVb ? '@' : '0', isVb ? 'center' : 'right');
    ws.getCell(`E${r}`).value = { formula: `Покрытие_Расчет!E${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), isIns ? '0.0000' : '0.00', 'right');
    ws.getCell(`F${r}`).value = { formula: `Покрытие_Расчет!G${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right');
    ws.getCell(`G${r}`).value = { formula: `Покрытие_Расчет!I${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), isVb ? '0.00000' : '0.0000', 'right');
    ws.getCell(`H${r}`).value = { formula: `Покрытие_Расчет!F${srcRow}` };
    styleFormulaCell(ws.getCell(`H${r}`), '0.0000', 'right', isBoldRow);
    ws.mergeCells(`I${r}:K${r}`);
    ws.getCell(`I${r}`).value = { formula: `Покрытие_Расчет!J${srcRow}` };
    styleFormulaCell(ws.getCell(`I${r}`), '0.000', 'right', isBoldRow);
    r++;
  }

  // Справочная строка воздушной прослойки многопустотной плиты (R_в.п = 0,15, R_п.возд = 0 по СП 2.04.01 п. 10.5)
  ws.getRow(r).height = 20;
  ws.getCell(`A${r}`).value = '3.а';
  styleFormulaCell(ws.getCell(`A${r}`), '@', 'center');
  ws.getCell(`B${r}`).value = 'в т.ч. воздушная прослойка плиты (пустота d, R_в.п = 0,15, R_п.возд = 0)';
  styleFormulaCell(ws.getCell(`B${r}`), '@', 'left');
  ws.getCell(`C${r}`).value = { formula: 'Покрытие_Расчет!H16' };
  styleFormulaCell(ws.getCell(`C${r}`), '0.000', 'right');
  ws.getCell(`D${r}`).value = '—';
  styleFormulaCell(ws.getCell(`D${r}`), '@', 'center');
  ws.getCell(`E${r}`).value = '—';
  styleFormulaCell(ws.getCell(`E${r}`), '@', 'center');
  ws.getCell(`F${r}`).value = 0;
  styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right');
  ws.getCell(`G${r}`).value = '—';
  styleFormulaCell(ws.getCell(`G${r}`), '@', 'center');
  ws.getCell(`H${r}`).value = 0.15;
  styleFormulaCell(ws.getCell(`H${r}`), '0.0000', 'right');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = 0;
  styleFormulaCell(ws.getCell(`I${r}`), '0.000', 'right');
  r++;

  // Итого по покрытию (с отображением R_п по пустоте и по ребру, без локалезависимого TEXT)
  ws.getRow(r).height = 24;
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = 'Итого по покрытию (R_0, R_0^пуст, D_пуст, R_п):';
  styleResultCell(ws.getCell(`A${r}`), '@', 'right');
  ws.getCell(`C${r}`).value = { formula: 'SUM(Покрытие_Расчет!D7:D13)' };
  styleResultCell(ws.getCell(`C${r}`), '0.000');
  ws.getCell(`D${r}`).value = '—';
  styleResultCell(ws.getCell(`D${r}`), '@', 'center');
  ws.getCell(`E${r}`).value = { formula: '"R₀ = "&ROUND(Покрытие_Расчет!C19,3)' };
  styleResultCell(ws.getCell(`E${r}`), '@', 'center');
  ws.getCell(`F${r}`).value = { formula: '"R₀.пуст = "&ROUND(Покрытие_Расчет!C20,3)' };
  styleResultCell(ws.getCell(`F${r}`), '@', 'center');
  ws.getCell(`G${r}`).value = { formula: '"Dпуст = "&ROUND(Покрытие_Расчет!C21,2)' };
  styleResultCell(ws.getCell(`G${r}`), '@', 'center');
  ws.getCell(`H${r}`).value = { formula: '"Rп.реб = "&ROUND(Покрытие_Расчет!C25,2)' };
  styleResultCell(ws.getCell(`H${r}`), '@', 'center');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = { formula: '"Rп.пуст = "&ROUND(Покрытие_Расчет!C24,2)' };
  styleResultCell(ws.getCell(`I${r}`), '@', 'center');
  r += 2;

  // =========================================================================
  // ТАБЛИЦА 3.2 — Распределение t_x, E_x, e_x в покрытии (сечение по пустоте)
  // Если есть конденсация — выводим ДВА ВАРИАНТА (Вариант 1 без ПИ и Вариант 2 с ПИ)
  // =========================================================================
  const hasRoofCondensation = Boolean(
    calc.roof.moistureCondensationRisk ||
    calc.roof.voidSection?.condensationRisk ||
    calc.roof.unprotectedVoidSection?.condensationRisk ||
    calc.roof.protectedVoidSection
  );

  const renderRoofMoistureProfileTable = (
    subTitle: string,
    profilePts: CrossSectionTemperaturePoint[],
    isProtected: boolean
  ) => {
    styleSectionRow(ws, r, 11, subTitle);
    r++;
    ws.getRow(r).height = 36;
    [
      '№ пл.',
      'Расчетная плоскость / граница слоя',
      'x, мм',
      'ΣR_i, м²·°C/Вт',
      't_x (зима), °C',
      't_x (от. пер.), °C',
      'e_x, Па',
      'E_x, Па',
      'E_x − e_x, Па',
    ].forEach((h, idx) => {
      const cell = ws.getRow(r).getCell(idx + 1);
      cell.value = h;
      styleTableHeader(cell);
    });
    ws.mergeCells(`J${r}:K${r}`);
    ws.getCell(`J${r}`).value = 'Условие e_x ≤ E_x / Заключение';
    styleTableHeader(ws.getCell(`J${r}`));
    r++;

    profilePts.forEach((pt, pIdx) => {
      ws.getRow(r).height = 20;
      ws.getCell(`A${r}`).value =
        pIdx === 0
          ? 'вн.'
          : pIdx === profilePts.length - 1
          ? 'нар.'
          : `${pIdx}${pt.isVaporBarrier ? ' (ПИ)' : pt.isInsulationMidpoint ? ' (сер.)' : ''}`;
      styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', Boolean(pt.isVaporBarrier || pt.isInsulationMidpoint));
      ws.getCell(`B${r}`).value = pt.planeName;
      styleFormulaCell(ws.getCell(`B${r}`), '@', 'left', Boolean(pt.isVaporBarrier || pt.isInsulationMidpoint));
      ws.getCell(`C${r}`).value = Math.round(pt.coord_x_mm);
      styleFormulaCell(ws.getCell(`C${r}`), '0', 'right');
      ws.getCell(`D${r}`).value = +pt.R_cumulative.toFixed(3);
      styleFormulaCell(ws.getCell(`D${r}`), '0.000', 'right');
      ws.getCell(`E${r}`).value = +pt.temp_winter.toFixed(2);
      styleFormulaCell(ws.getCell(`E${r}`), '0.00', 'right');
      ws.getCell(`F${r}`).value = +pt.temp_heating.toFixed(2);
      styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right', true);
      ws.getCell(`G${r}`).value = +pt.e_partial.toFixed(2);
      styleFormulaCell(ws.getCell(`G${r}`), '0.00', 'right', true);
      ws.getCell(`H${r}`).value = +pt.E_sat.toFixed(1);
      styleFormulaCell(ws.getCell(`H${r}`), '0.0', 'right', true);
      ws.getCell(`I${r}`).value = +pt.delta_margin.toFixed(1);
      styleFormulaCell(ws.getCell(`I${r}`), '0.0', 'right', true);
      ws.mergeCells(`J${r}:K${r}`);
      const isCond = pt.delta_margin < 0 && pIdx > 0 && pIdx < profilePts.length - 1;
      ws.getCell(`J${r}`).value = isCond ? 'e_x > E_x — ЗОНА КОНДЕНСАЦИИ ✗' : 'e_x ≤ E_x — норма ✓';
      styleFormulaCell(ws.getCell(`J${r}`), '@', 'center', isCond);
      r++;
    });

    ws.getRow(r).height = 24;
    ws.mergeCells(`A${r}:K${r}`);
    ws.getCell(`A${r}`).value = isProtected
      ? 'Вывод по Варианту 2 (с пароизоляцией): При установке расчетного слоя пароизоляции по плите во всех сечениях e_x < E_x — конденсат в покрытии исключен.'
      : 'Вывод по Варианту 1 (без пароизоляции): Без пароизоляции в толще покрытия возникает зона конденсации (e_x ≥ E_x) — требуется устройство пароизоляционного слоя по ж/б плите.';
    styleResultCell(ws.getCell(`A${r}`), '@', 'left');
    r += 2;
  };

  const roofVoidPts =
    calc.roof.voidSection?.crossSectionProfile ??
    calc.roof.worstSection?.crossSectionProfile ??
    [];

  if (hasRoofCondensation && calc.roof.unprotectedVoidSection) {
    renderRoofMoistureProfileTable(
      'Таблица 3.2а – Тепловлажностный режим покрытия БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1)',
      calc.roof.unprotectedVoidSection.crossSectionProfile,
      false
    );
    renderRoofMoistureProfileTable(
      'Таблица 3.2б – Тепловлажностный режим покрытия С ПАРОИЗОЛЯЦИЕЙ (Вариант 2)',
      (calc.roof.protectedVoidSection ?? calc.roof.voidSection).crossSectionProfile,
      true
    );
  } else {
    renderRoofMoistureProfileTable(
      'Таблица 3.2 – Распределение температуры и парциального давления водяного пара в покрытии (по пустоте)',
      roofVoidPts,
      true
    );
  }

  // =========================================================================
  // ТАБЛИЦА 4.1 — Тепловыделения от трубопроводов в техническом подполье
  // ВЫВОДИМ ТОЛЬКО ДЕЙСТВУЮЩИЕ УЧАСТКИ ТРУБОПРОВОДОВ (БЕЗ ПУСТЫХ СТРОК!)
  // =========================================================================
  styleSectionRow(
    ws,
    r,
    11,
    'Таблица 4.1 – Тепловыделения от трубопроводов в техническом подполье (Приложение О Шибеко 2018)'
  );
  r++;
  ws.getRow(r).height = 30;
  ws.getCell(`A${r}`).value = '№';
  styleTableHeader(ws.getCell(`A${r}`));
  ws.mergeCells(`B${r}:C${r}`);
  ws.getCell(`B${r}`).value = 'Назначение участка трубопровода';
  styleTableHeader(ws.getCell(`B${r}`));
  ws.getCell(`D${r}`).value = 't_т, °C';
  styleTableHeader(ws.getCell(`D${r}`));
  ws.getCell(`E${r}`).value = 'd_у, мм';
  styleTableHeader(ws.getCell(`E${r}`));
  ws.getCell(`F${r}`).value = 'Длина l_i, м';
  styleTableHeader(ws.getCell(`F${r}`));
  ws.mergeCells(`G${r}:H${r}`);
  ws.getCell(`G${r}`).value = 'q_i^5, Вт/м (Прил. О)';
  styleTableHeader(ws.getCell(`G${r}`));
  ws.mergeCells(`I${r}:J${r}`);
  ws.getCell(`I${r}`).value = 'Тепловой поток Q_i = q_i^5·l_i, Вт';
  styleTableHeader(ws.getCell(`I${r}`));
  ws.getCell(`K${r}`).value = 'Статус';
  styleTableHeader(ws.getCell(`K${r}`));
  r++;

  calc.basement.pipesDetails.forEach((p, idx) => {
    const srcRow = 29 + idx;
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = idx + 1;
    styleFormulaCell(ws.getCell(`A${r}`), '0', 'center');
    ws.mergeCells(`B${r}:C${r}`);
    ws.getCell(`B${r}`).value =
      p.temp >= 85 ? 'Отопление (подающий Т1)' : p.temp >= 65 ? 'Отопление (обратный Т2)' : 'Горячее водоснабжение (Т3)';
    styleLabelCell(ws.getCell(`B${r}`));
    ws.getCell(`D${r}`).value = { formula: `Подполье_ПТП!B${srcRow}` };
    styleFormulaCell(ws.getCell(`D${r}`), '0', 'center');
    ws.getCell(`E${r}`).value = { formula: `Подполье_ПТП!C${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '0', 'center');
    ws.getCell(`F${r}`).value = { formula: `Подполье_ПТП!D${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), '0.0', 'right');
    ws.mergeCells(`G${r}:H${r}`);
    ws.getCell(`G${r}`).value = { formula: `Подполье_ПТП!E${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), '0.0', 'right');
    ws.mergeCells(`I${r}:J${r}`);
    ws.getCell(`I${r}`).value = { formula: `Подполье_ПТП!F${srcRow}` };
    styleFormulaCell(ws.getCell(`I${r}`), '0.0', 'right', true);
    ws.getCell(`K${r}`).value = 'Учтен в балансе ✓';
    styleLabelCell(ws.getCell(`K${r}`));
    r++;
  });

  ws.getRow(r).height = 24;
  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = 'Итого суммарные тепловыделения от трубопроводов Σ(q_i^5 · l_i), Вт:';
  styleResultCell(ws.getCell(`A${r}`), '@', 'right');
  ws.mergeCells(`G${r}:H${r}`);
  ws.getCell(`G${r}`).value = { formula: 'Подполье_ПТП!C24' };
  styleResultCell(ws.getCell(`G${r}`), '0.0');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = { formula: '"Qтр = 1,15·Σ = "&ROUND(1.15*Подполье_ПТП!C24,1)&" Вт"' };
  styleResultCell(ws.getCell(`I${r}`), '@', 'center');
  r += 2;

  // =========================================================================
  // ТАБЛИЦА 4.2 — Слои и результаты расчета перекрытия над техподпольем (ПТП)
  // =========================================================================
  styleSectionRow(
    ws,
    r,
    11,
    'Таблица 4.2 – Теплотехнические характеристики слоев перекрытия над техподпольем, R_п.ПТП и проверка конденсации'
  );
  r++;
  ws.getRow(r).height = 32;
  [
    '№',
    'Материал слоя перекрытия ПТП',
    'Толщина δ, м',
    'λ, Вт/(м·°C)',
    's, Вт/(м²·°C)',
    'μ, мг/(м·ч·Па)',
    'R_i, м²·°C/Вт',
    'R_п.i, м²·ч·Па/мг',
  ].forEach((h, idx) => {
    const colIdx = idx + 1;
    if (colIdx < 8) {
      const cell = ws.getRow(r).getCell(colIdx);
      cell.value = h;
      styleTableHeader(cell);
    } else {
      ws.mergeCells(`H${r}:K${r}`);
      ws.getCell(`H${r}`).value = h;
      styleTableHeader(ws.getCell(`H${r}`));
    }
  });
  r++;

  // Все 5 слоев ПТП (строки 7..11) + строка пароизоляции ПТП (строка 12)
  for (let srcRow = 7; srcRow <= 12; srcRow++) {
    const isVb = srcRow === 12;
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = isVb ? 'ПИ' : srcRow - 6;
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', isVb);
    ws.getCell(`B${r}`).value = { formula: `Подполье_ПТП!A${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '@', 'left', isVb);
    ws.getCell(`C${r}`).value = { formula: `Подполье_ПТП!C${srcRow}` };
    styleFormulaCell(ws.getCell(`C${r}`), isVb ? '0.0000' : '0.000', 'right');
    ws.getCell(`D${r}`).value = { formula: `Подполье_ПТП!D${srcRow}` };
    styleFormulaCell(ws.getCell(`D${r}`), '0.0000', 'right');
    ws.getCell(`E${r}`).value = { formula: `Подполье_ПТП!F${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '0.00', 'right');
    ws.getCell(`F${r}`).value = { formula: `Подполье_ПТП!H${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), isVb ? '0.00000' : '0.0000', 'right');
    ws.getCell(`G${r}`).value = { formula: `Подполье_ПТП!E${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), '0.0000', 'right', true);
    ws.mergeCells(`H${r}:K${r}`);
    ws.getCell(`H${r}`).value = { formula: `Подполье_ПТП!I${srcRow}` };
    styleFormulaCell(ws.getCell(`H${r}`), '0.000', 'right', isVb);
    r++;
  }

  // Итоговая строка ПТП с отображением R_ПТП и R_п.ПТП (без TEXT)
  ws.getRow(r).height = 24;
  ws.mergeCells(`A${r}:B${r}`);
  ws.getCell(`A${r}`).value = 'Итого по техподполью (R_ПТП, R_п.ПТП, t_п, Δt_п, τ_в.цок):';
  styleResultCell(ws.getCell(`A${r}`), '@', 'right');
  ws.mergeCells(`C${r}:D${r}`);
  ws.getCell(`C${r}`).value = { formula: '"Rптп = "&ROUND(Подполье_ПТП!C16,2)' };
  styleResultCell(ws.getCell(`C${r}`), '@', 'center');
  ws.getCell(`E${r}`).value = { formula: '"Rп.ПТП = "&ROUND(Подполье_ПТП!C17,2)' };
  styleResultCell(ws.getCell(`E${r}`), '@', 'center');
  ws.getCell(`F${r}`).value = { formula: '"tп = "&ROUND(Подполье_ПТП!C18,1)&" °C"' };
  styleResultCell(ws.getCell(`F${r}`), '@', 'center');
  ws.mergeCells(`G${r}:H${r}`);
  ws.getCell(`G${r}`).value = { formula: '"Δtп = "&ROUND(Подполье_ПТП!C21,2)&" °C"' };
  styleResultCell(ws.getCell(`G${r}`), '@', 'center');
  ws.mergeCells(`I${r}:K${r}`);
  ws.getCell(`I${r}`).value = { formula: '"τв.цок = "&ROUND(Подполье_ПТП!C23,2)&" > tр.п = "&ROUND(Подполье_ПТП!C20,2)&" °C"' };
  styleResultCell(ws.getCell(`I${r}`), '@', 'center');
  r += 2;

  // =========================================================================
  // ТАБЛИЦА 5.1 — Приведенное сопротивление теплопередаче окна по участкам
  // =========================================================================
  styleSectionRow(ws, r, 11, 'Таблица 5.1 (6.2) – Расчет приведенного сопротивления теплопередаче окна по участкам (Шибеко 2018)');
  r++;
  ws.getRow(r).height = 32;
  ['№ зоны', 'Тип участка', 'Ширина a_i, мм', 'Длина b_i, мм', 'Площадь F_i, м²', 'R_тi, м²·°C/Вт', 'F_i / R_тi, Вт/°C'].forEach(
    (h, idx) => {
      const cell = ws.getRow(r).getCell(idx + 1);
      cell.value = h;
      styleTableHeader(cell);
    }
  );
  ws.mergeCells(`H${r}:K${r}`);
  ws.getCell(`H${r}`).value = 'Категория участка окна';
  styleTableHeader(ws.getCell(`H${r}`));
  r++;

  for (let srcRow = 31; srcRow <= 43; srcRow++) {
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = { formula: `Окна_Расчет!A${srcRow}` };
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center');
    ws.getCell(`B${r}`).value = { formula: `Окна_Расчет!B${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '@', 'left');
    ws.getCell(`C${r}`).value = { formula: `Окна_Расчет!C${srcRow}` };
    styleFormulaCell(ws.getCell(`C${r}`), '0', 'right');
    ws.getCell(`D${r}`).value = { formula: `Окна_Расчет!D${srcRow}` };
    styleFormulaCell(ws.getCell(`D${r}`), '0', 'right');
    ws.getCell(`E${r}`).value = { formula: `Окна_Расчет!E${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '0.00000', 'right');
    ws.getCell(`F${r}`).value = { formula: `Окна_Расчет!F${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), '0.00', 'right');
    ws.getCell(`G${r}`).value = { formula: `Окна_Расчет!G${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), '0.0000', 'right', true);
    ws.mergeCells(`H${r}:K${r}`);
    ws.getCell(`H${r}`).value = { formula: `Окна_Расчет!I${srcRow}` };
    styleLabelCell(ws.getCell(`H${r}`));
    r++;
  }

  // Подытоги окна
  for (const srcRow of [45, 46, 44]) {
    ws.getRow(r).height = 22;
    ws.mergeCells(`A${r}:D${r}`);
    ws.getCell(`A${r}`).value = { formula: `Окна_Расчет!A${srcRow}` };
    styleResultCell(ws.getCell(`A${r}`), '@', 'right');
    ws.getCell(`E${r}`).value = { formula: `Окна_Расчет!E${srcRow}` };
    styleResultCell(ws.getCell(`E${r}`), '0.00000');
    ws.getCell(`F${r}`).value = { formula: `Окна_Расчет!F${srcRow}` };
    styleResultCell(ws.getCell(`F${r}`), srcRow === 44 ? '0.00' : '@', 'center');
    ws.getCell(`G${r}`).value = { formula: `Окна_Расчет!G${srcRow}` };
    styleResultCell(ws.getCell(`G${r}`), '0.0000');
    ws.mergeCells(`H${r}:K${r}`);
    ws.getCell(`H${r}`).value =
      srcRow === 44 ? { formula: `Окна_Расчет!I44` } : srcRow === 45 ? 'Непрозрачная часть (профиль)' : 'Светопрозрачная часть (стеклопакет)';
    styleResultCell(ws.getCell(`H${r}`), '@', 'center');
    r++;
  }
  r++;

  // =========================================================================
  // ТАБЛИЦА 5.2 — Классификация окон по воздухопроницаемости (СТБ 939-2013)
  // =========================================================================
  styleSectionRow(ws, r, 11, 'Таблица 5.2 (6.1) – Классификация окон по воздухопроницаемости (СТБ 939-2013)');
  r++;
  ws.getRow(r).height = 28;
  ws.getCell(`A${r}`).value = 'Класс';
  styleTableHeader(ws.getCell(`A${r}`));
  ws.mergeCells(`B${r}:D${r}`);
  ws.getCell(`B${r}`).value = 'Объемная воздухопроницаемость Q, м³/(ч·м²)';
  styleTableHeader(ws.getCell(`B${r}`));
  ws.mergeCells(`E${r}:F${r}`);
  ws.getCell(`E${r}`).value = 'Диапазон R_в, (м²·ч)/кг';
  styleTableHeader(ws.getCell(`E${r}`));
  ws.mergeCells(`G${r}:K${r}`);
  ws.getCell(`G${r}`).value = 'Характеристика воздухопроницаемости';
  styleTableHeader(ws.getCell(`G${r}`));
  r++;

  for (let srcRow = 20; srcRow <= 24; srcRow++) {
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = { formula: `Окна_Расчет!A${srcRow}` };
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', true);
    ws.mergeCells(`B${r}:D${r}`);
    ws.getCell(`B${r}`).value = { formula: `Окна_Расчет!B${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '@', 'center');
    ws.mergeCells(`E${r}:F${r}`);
    ws.getCell(`E${r}`).value = { formula: `Окна_Расчет!E${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '@', 'center', true);
    ws.mergeCells(`G${r}:K${r}`);
    ws.getCell(`G${r}`).value = { formula: `Окна_Расчет!F${srcRow}` };
    styleLabelCell(ws.getCell(`G${r}`));
    r++;
  }
  r++;

  // =========================================================================
  // ТАБЛИЦА 5.3 — Поэтажный расчет Δp_i, R_в.тр и выбор класса окна
  // =========================================================================
  styleSectionRow(
    ws,
    r,
    11,
    'Таблица 5.3 (6.3 и 6.4) – Поэтажный расчет разности давлений Δp_i, требуемого сопротивления воздухопроницанию и класса окон'
  );
  r++;
  ws.getRow(r).height = 36;
  [
    'Этаж',
    'Высота h_i, м',
    'Коэф. ветра k_i',
    'ρ_н, кг/м³',
    'ρ_н − ρ_в, кг/м³',
    'v_ср, м/с',
    'Δp_i, Па',
    'R_в.тр (10 Па)',
    '1,2·R_в.тр',
  ].forEach((h, idx) => {
    const cell = ws.getRow(r).getCell(idx + 1);
    cell.value = h;
    styleTableHeader(cell);
  });
  ws.mergeCells(`J${r}:K${r}`);
  ws.getCell(`J${r}`).value = 'Класс окна (СТБ 939-2013)';
  styleTableHeader(ws.getCell(`J${r}`));
  r++;

  const floorsToOutput = Math.min(35, Math.max(1, calc.cipher.floorsCount));
  for (let fl = 1; fl <= floorsToOutput; fl++) {
    const srcRow = 48 + fl;
    const classRow = 86 + fl;
    ws.getRow(r).height = 20;
    ws.getCell(`A${r}`).value = { formula: `Окна_Расчет!A${srcRow}` };
    styleFormulaCell(ws.getCell(`A${r}`), '0', 'center', true);
    ws.getCell(`B${r}`).value = { formula: `Окна_Расчет!C${srcRow}` };
    styleFormulaCell(ws.getCell(`B${r}`), '0.0', 'right');
    ws.getCell(`C${r}`).value = { formula: `Окна_Расчет!H${srcRow}` };
    styleFormulaCell(ws.getCell(`C${r}`), '0.000', 'right');
    ws.getCell(`D${r}`).value = { formula: `Окна_Расчет!E${srcRow}` };
    styleFormulaCell(ws.getCell(`D${r}`), '0.00', 'right');
    ws.getCell(`E${r}`).value = { formula: `Окна_Расчет!D${srcRow}` };
    styleFormulaCell(ws.getCell(`E${r}`), '0.00', 'right');
    ws.getCell(`F${r}`).value = { formula: `Окна_Расчет!F${srcRow}` };
    styleFormulaCell(ws.getCell(`F${r}`), '0.0', 'right');
    ws.getCell(`G${r}`).value = { formula: `Окна_Расчет!I${srcRow}` };
    styleFormulaCell(ws.getCell(`G${r}`), '0.00', 'right', true);
    ws.getCell(`H${r}`).value = { formula: `Окна_Расчет!K${srcRow}` };
    styleFormulaCell(ws.getCell(`H${r}`), '0.000', 'right', true);
    ws.getCell(`I${r}`).value = { formula: `Окна_Расчет!D${classRow}` };
    styleFormulaCell(ws.getCell(`I${r}`), '0.000', 'right', true);
    ws.mergeCells(`J${r}:K${r}`);
    ws.getCell(`J${r}`).value = { formula: `Окна_Расчет!F${classRow}` };
    styleFormulaCell(ws.getCell(`J${r}`), '@', 'center', true);
    r++;
  }
}

/**
 * Заполняет лист «Формулы_расчета» всеми формулами в учебно-методической записи
 * (как в отчете/пояснительной записке, а не синтаксисом Excel) и подробными
 * пошаговыми числовыми подстановками, динамически связанными с расчетными листами.
 */
function populateFormulasSheet(ws: ExcelJS.Worksheet, calc: FullCourseworkCalculation) {
  ws.columns = [
    { width: 10 }, // A: № ф-лы
    { width: 34 }, // B: Раздел и наименование расчетной величины
    { width: 46 }, // C: Расчетная формула (как в пояснительной записке)
    { width: 64 }, // D: Подстановка численных значений и результат
    { width: 14 }, // E: Ед. изм.
    { width: 26 }, // F: Нормативный источник
  ];

  styleTitleBanner(
    ws,
    6,
    'СВОДНЫЙ СПРАВОЧНИК ВСЕХ ФОРМУЛ И ПОДРОБНЫХ ВЫЧИСЛЕНИЙ ДЛЯ ОТЧЕТА («Формулы_расчета»)',
    'Все формулы записаны в стандартной математической нотации ТКП 45-2.04-43-2006 / СП 2.04.01-2020 / Шибеко 2018 с живой подстановкой чисел вашего варианта'
  );

  ws.getRow(4).height = 30;
  [
    '№ ф-лы',
    'Раздел и наименование расчетной величины',
    'Расчетная формула (как в пояснительной записке)',
    'Подробная подстановка численных значений и результат',
    'Ед. изм.',
    'Нормативный источник / метод. указания',
  ].forEach((h, idx) => {
    const cell = ws.getRow(4).getCell(idx + 1);
    cell.value = h;
    styleTableHeader(cell);
  });

  let r = 5;

  const addSection = (title: string) => {
    styleSectionRow(ws, r, 6, title);
    r++;
  };

  const addFormulaRow = (
    num: string,
    name: string,
    mathFormula: string,
    substitutionExcelFormula: string,
    unit: string,
    source: string
  ) => {
    ws.getRow(r).height = 30;
    ws.getCell(`A${r}`).value = num;
    styleFormulaCell(ws.getCell(`A${r}`), '@', 'center', true);
    ws.getCell(`B${r}`).value = name;
    styleLabelCell(ws.getCell(`B${r}`), true);
    ws.getCell(`C${r}`).value = mathFormula;
    styleFormulaCell(ws.getCell(`C${r}`), '@', 'left', true);
    ws.getCell(`D${r}`).value = { formula: substitutionExcelFormula };
    styleFormulaCell(ws.getCell(`D${r}`), '@', 'left');
    ws.getCell(`E${r}`).value = unit;
    styleFormulaCell(ws.getCell(`E${r}`), '@', 'center');
    ws.getCell(`F${r}`).value = source;
    styleLabelCell(ws.getCell(`F${r}`));
    r++;
  };

  // =========================================================================
  // РАЗДЕЛ 1. ПАРАМЕТРЫ МИКРОКЛИМАТА И ТОЧКА РОСЫ
  // =========================================================================
  addSection('РАЗДЕЛ 1. ВНУТРЕННИЙ И НАРУЖНЫЙ ВОЗДУХ, УПРУГОСТЬ ПАРА И ТОЧКА РОСЫ');

  addFormulaRow(
    '(1.1)',
    'Высота здания H',
    'H = 1,0 + 3,0 · N + 2,7 (или H = 3,7 + 3,0 · N)',
    `"H = 3,7 + 3,0 · "&Ввод_и_Итоги!C7&" = "&ROUND(Ввод_и_Итоги!F7,1)`,
    'м',
    'Шибеко 2018, рис. 6.4'
  );

  addFormulaRow(
    '(1.2)',
    'Максимальная упругость водяного пара внутреннего воздуха E_в при t_в ≥ 0 °C',
    'E_в = 610,5 · exp((17,269 · t_в) / (237,3 + t_в)) (по табл. Прил. К Шибеко)',
    `"При t_в = "&ROUND(Ввод_и_Итоги!C26,1)&" °C: E_в = "&ROUND(Ввод_и_Итоги!C28,1)`,
    'Па',
    'Шибеко 2018, Прил. К, с. 95'
  );

  addFormulaRow(
    '(1.3)',
    'Действительная упругость (парциальное давление) водяного пара внутреннего воздуха e_в',
    'e_в = (φ_в / 100) · E_в',
    `"e_в = ("&ROUND(Ввод_и_Итоги!C27,0)&" / 100) · "&ROUND(Ввод_и_Итоги!C28,1)&" = "&ROUND(Ввод_и_Итоги!C29,2)`,
    'Па',
    'ТКП 45-2.04-43-2006, п. 9.1'
  );

  addFormulaRow(
    '(1.4)',
    'Температура точки росы внутреннего воздуха t_р',
    't_р определяется интерполяцией по таблице E(t) Прил. К при E(t_р) = e_в',
    `"При e_в = "&ROUND(Ввод_и_Итоги!C29,2)&" Па: t_р = "&ROUND(Ввод_и_Итоги!C30,2)`,
    '°C',
    'Шибеко 2018, Прил. К'
  );

  addFormulaRow(
    '(1.5)',
    'Максимальная и действительная упругость пара наружного воздуха за отопительный период E_н.от, e_н.от',
    'E_н.от = E(t_н.от);   e_н.от = (φ_н.от / 100) · E_н.от',
    `"При t_н.от = "&ROUND(Ввод_и_Итоги!F13,1)&" °C и φ_н.от = "&ROUND(Ввод_и_Итоги!F15,0)&"%: E_н.от = "&ROUND(Ввод_и_Итоги!F16,1)&" Па; e_н.от = ("&ROUND(Ввод_и_Итоги!F15,0)&"/100)·"&ROUND(Ввод_и_Итоги!F16,1)&" = "&ROUND(Ввод_и_Итоги!F17,2)`,
    'Па',
    'СН 2.04.02-2019 / Прил. К'
  );

  // =========================================================================
  // РАЗДЕЛ 2. ТЕПЛОТЕХНИЧЕСКИЙ И ВЛАЖНОСТНЫЙ РАСЧЕТ НАРУЖНОЙ СТЕНЫ
  // =========================================================================
  addSection('РАЗДЕЛ 2. ТЕПЛОТЕХНИЧЕСКИЙ И ТЕПЛОВЛАЖНОСТНЫЙ РАСЧЕТ НАРУЖНОЙ СТЕНЫ');

  addFormulaRow(
    '(2.1)',
    'Термическое сопротивление отдельного слоя стены R_i',
    'R_i = δ_i / λ_i',
    `"R_1 = "&ROUND(Стена_Расчет!D7,3)&"/"&ROUND(Стена_Расчет!E7,3)&" = "&ROUND(Стена_Расчет!F7,3)&"; R_2 = "&ROUND(Стена_Расчет!D8,3)&"/"&ROUND(Стена_Расчет!E8,3)&" = "&ROUND(Стена_Расчет!F8,3)&"; R_4 = "&ROUND(Стена_Расчет!D10,3)&"/"&ROUND(Стена_Расчет!E10,3)&" = "&ROUND(Стена_Расчет!F10,3)`,
    'м²·°C/Вт',
    'ТКП 45-2.04-43-2006, ф-ла (5.1)'
  );

  addFormulaRow(
    '(2.2)',
    'Сопротивление теплопередаче слоев стены без утеплителя R_без_ут и требуемое R_пр',
    'R_пр = R_т.норм · n;   R_без_ут = 1/α_в + Σ R_i(без утепл.) + 1/α_н',
    `"R_пр = "&ROUND(Ввод_и_Итоги!F26,2)&" · "&ROUND(Стена_Расчет!J5,2)&" = "&ROUND(Стена_Расчет!C13,2)&" м²·°C/Вт; ΣR_слоев = "&ROUND(SUM(Стена_Расчет!F7:F12),3)`,
    'м²·°C/Вт',
    'Шибеко 2018, ф-ла (2.3)'
  );

  addFormulaRow(
    '(2.3)',
    'Расчетная и принятая толщина теплоизоляционного слоя стены δ_ут.ст',
    'δ_ут.расч = (R_пр − R_без_ут) · λ_ут;   δ_ут.прин кратно 10 мм в большую сторону',
    `"δ_ут.расч = "&ROUND(Стена_Расчет!C14,3)&" м → принято δ_ут = "&ROUND(Стена_Расчет!C15,3)&" м ("&ROUND(Стена_Расчет!C15*1000,0)&" мм)"`,
    'м',
    'Шибеко 2018, ф-ла (2.4)'
  );

  addFormulaRow(
    '(2.4)',
    'Общее (условное) сопротивление теплопередаче наружной стены R_0',
    'R_0 = 1/α_в + Σ(δ_i / λ_i) + 1/α_н',
    `"R_0 = 1/"&ROUND(Ввод_и_Итоги!C34,1)&" + "&ROUND(SUM(Стена_Расчет!F7:F12),3)&" + 1/"&ROUND(Ввод_и_Итоги!C35,0)&" = "&ROUND(Стена_Расчет!C16,2)&" ≥ R_пр = "&ROUND(Стена_Расчет!C13,2)`,
    'м²·°C/Вт',
    'ТКП 45-2.04-43-2006, ф-ла (5.2)'
  );

  addFormulaRow(
    '(2.5)',
    'Тепловая инерция слоев и всей наружной стены D',
    'D_i = R_i · s_i;   D = Σ D_i',
    `"D = "&ROUND(Стена_Расчет!H7,2)&" + "&ROUND(Стена_Расчет!H8,2)&" + "&ROUND(Стена_Расчет!H9,2)&" + "&ROUND(Стена_Расчет!H10,2)&" + "&ROUND(Стена_Расчет!H11,2)&" = "&ROUND(Стена_Расчет!C17,2)`,
    '—',
    'ТКП 45-2.04-43-2006, ф-ла (5.3)'
  );

  addFormulaRow(
    '(2.6)',
    'Расчетная зимняя температура наружного воздуха t_н в зависимости от тепловой инерции D',
    'При D ≤ 4: t_н = t_х.с; при 4 < D ≤ 7: t_н = (t_х.с + t_х.п)/2; при D > 7: t_н = t_х.п',
    `"При D = "&ROUND(Стена_Расчет!C17,2)&": t_н = "&ROUND(Стена_Расчет!C18,1)`,
    '°C',
    'ТКП 45-2.04-43-2006, табл. 5.2'
  );

  addFormulaRow(
    '(2.7)',
    'Расчетный температурный перепад Δt_в между внутренним воздухом и внутренней поверхностью стены',
    'Δt_в = (t_в − t_н) / (R_0 · α_в) ≤ Δt_в.норм',
    `"Δt_в = ("&ROUND(Ввод_и_Итоги!C26,1)&" − ("&ROUND(Стена_Расчет!C18,1)&")) / ("&ROUND(Стена_Расчет!C16,2)&" · "&ROUND(Ввод_и_Итоги!C34,1)&") = "&ROUND(Стена_Расчет!C19,2)&" °C ≤ Δt_в.норм = "&ROUND(Ввод_и_Итоги!F29,1)`,
    '°C',
    'ТКП 45-2.04-43-2006, ф-ла (6.2)'
  );

  addFormulaRow(
    '(2.8)',
    'Температура внутренней поверхности наружной стены τ_в',
    'τ_в = t_в − (t_в − t_н) / (R_0 · α_в) > t_р',
    `"τ_в = "&ROUND(Ввод_и_Итоги!C26,1)&" − "&ROUND(Стена_Расчет!C19,2)&" = "&ROUND(Стена_Расчет!C20,2)&" °C > t_р = "&ROUND(Ввод_и_Итоги!C30,2)`,
    '°C',
    'Шибеко 2018, ф-ла (2.8)'
  );

  addFormulaRow(
    '(2.9)',
    'Сопротивление паропроницанию слоя R_пi и общее сопротивление паропроницанию стены R_п',
    'R_пi = δ_i / μ_i;   R_п = R_п.в + Σ R_пi + R_п.пи + R_п.н (где R_п.в = 1/37 = 0,027; R_п.н = 1/77 = 0,013)',
    `"R_п = 0,027 + "&ROUND(SUM(Стена_Расчет!J7:J11),3)&" + "&ROUND(Стена_Расчет!J12,3)&" + 0,013 = "&ROUND(Стена_Расчет!C21,2)`,
    'м²·ч·Па/мг',
    'Шибеко 2018, п. 7.1, ф-ла (7.1)'
  );

  addFormulaRow(
    '(2.10)',
    'Температура t_x в произвольной плоскости x стены (метод К.Ф. Фокина за отопительный период)',
    't_x = t_в − ((t_в − t_н.от) / R_0) · (1/α_в + Σ_{i=1}^x R_i)',
    `"На вн. пов-ти (1/α_в = 0,115): t_1 = "&ROUND(Ввод_и_Итоги!C26,1)&" − (("&ROUND(Ввод_и_Итоги!C26,1)&" − ("&ROUND(Ввод_и_Итоги!F13,1)&")) / "&ROUND(Стена_Расчет!C16,2)&") · 0,115 = "&ROUND(Стена_Расчет!G28,2)`,
    '°C',
    'Шибеко 2018, ф-ла (7.2)'
  );

  addFormulaRow(
    '(2.11)',
    'Действительная упругость водяного пара e_x в плоскости x стены',
    'e_x = e_в − ((e_в − e_н.от) / R_п) · (R_п.в + Σ_{i=1}^x R_пi)',
    `"На вн. пов-ти: e_1 = "&ROUND(Ввод_и_Итоги!C29,2)&" − (("&ROUND(Ввод_и_Итоги!C29,2)&" − "&ROUND(Ввод_и_Итоги!F17,2)&") / "&ROUND(Стена_Расчет!C21,2)&") · 0,027 = "&ROUND(Стена_Расчет!I28,2)`,
    'Па',
    'Шибеко 2018, ф-ла (7.3)'
  );

  // Пошаговые вычисления t_x (G), E_x (H), e_x (I), Δ (J) по всем активным плоскостям стены (ранги 1..15)
  for (let rank = 1; rank <= 15; rank++) {
    const matchExpr = `MATCH(${rank},Стена_Расчет!$L$28:$L$44,0)`;
    addFormulaRow(
      `(2.11.${rank})`,
      `Стена — плоскость ${rank} таблицы тепловлажностного режима`,
      't_x = t_в − ((t_в − t_н.от)/R_0)·ΣR_i;   e_x = e_в − ((e_в − e_н.от)/R_п)·ΣR_пi;   проверка e_x ≤ E(t_x)',
      `IFERROR(INDEX(Стена_Расчет!$B$28:$B$44,${matchExpr})&": t_от = "&ROUND(INDEX(Стена_Расчет!$G$28:$G$44,${matchExpr}),2)&" °C; ΣR_п = "&ROUND(INDEX(Стена_Расчет!$E$28:$E$44,${matchExpr}),3)&"; e_x = "&ROUND(INDEX(Стена_Расчет!$I$28:$I$44,${matchExpr}),2)&" Па; E_x = "&ROUND(INDEX(Стена_Расчет!$H$28:$H$44,${matchExpr}),1)&" Па ("&IF(INDEX(Стена_Расчет!$J$28:$J$44,${matchExpr})>=0,"e_x ≤ E_x — без конд.","e_x > E_x — ЗОНА КОНДЕНСАЦИИ")&")","—")`,
      '°C / Па',
      'Табл. 2.2 (Шибеко разд. 7)'
    );
  }

  // =========================================================================
  // РАЗДЕЛ 3. ТЕПЛОТЕХНИЧЕСКИЙ И ВЛАЖНОСТНЫЙ РАСЧЕТ ПОКРЫТИЯ (ПЕРЕКРЫТИЯ)
  // =========================================================================
  addSection('РАЗДЕЛ 3. ТЕПЛОТЕХНИЧЕСКИЙ И ТЕПЛОВЛАЖНОСТНЫЙ РАСЧЕТ ПОКРЫТИЯ');

  addFormulaRow(
    '(3.1)',
    'Требуемое сопротивление R_пр.пк и сопротивление покрытия без утеплителя R_без_ут',
    'R_пр.пк = R_т.норм.пк · n;   R_без_ут = 1/α_в + R_внутр + R_пл + R_нар + R_пи + 1/α_н',
    `"R_пр.пк = "&ROUND(Ввод_и_Итоги!F27,2)&" · "&ROUND(Покрытие_Расчет!J5,2)&" = "&ROUND(Покрытие_Расчет!C16,2)&" м²·°C/Вт (R_без_ут = "&ROUND(Покрытие_Расчет!C15,3)&" м²·°C/Вт)"`,
    'м²·°C/Вт',
    'Шибеко 2018, разд. 3'
  );

  addFormulaRow(
    '(3.2)',
    'Расчетная и принятая толщина утеплителя покрытия δ_ут.пк',
    'δ_ут.расч = (R_пр.пк − R_без_ут) · λ_ут;   δ_ут.прин кратно 10 мм в большую сторону',
    `"δ_ут.расч = ("&ROUND(Покрытие_Расчет!C16,2)&" − "&ROUND(Покрытие_Расчет!C15,3)&") · "&ROUND(Ввод_и_Итоги!$F$33,4)&" = "&ROUND(Покрытие_Расчет!C17,3)&" м → принято δ_ут = "&ROUND(Покрытие_Расчет!C18,2)&" м ("&ROUND(Покрытие_Расчет!C18*1000,0)&" мм)"`,
    'м',
    'Шибеко 2018, разд. 3'
  );

  addFormulaRow(
    '(3.3)',
    'Общее сопротивление теплопередаче покрытия (приведенное R_0, по пустоте R_0^пуст и по ребру)',
    'R_0 = 1/α_в + ΣR_i + 1/α_н;   R_0^пуст = R_без_пл + 2·δ_ф/λ_б + 0,15 + R_ут',
    `"R_0 (прив.) = "&ROUND(Покрытие_Расчет!C19,2)&"; R_0^пуст = "&ROUND(Покрытие_Расчет!C20,2)&"; R_0^реб = "&ROUND(Покрытие_Расчет!K23,2)&" м²·°C/Вт"`,
    'м²·°C/Вт',
    'Шибеко 2018, разд. 3, 7'
  );

  addFormulaRow(
    '(3.4)',
    'Тепловая инерция покрытия по пустоте D_пуст и выбор расчетной зимней температуры t_н',
    'D_пуст = Σ(R_i · s_i) (для воздушной прослойки s_в.п = 0)',
    `"D_пуст = "&ROUND(Покрытие_Расчет!C21,2)&" → расчетная температура зимы t_н = "&ROUND(Покрытие_Расчет!C22,1)&" °C"`,
    '— / °C',
    'ТКП 45-2.04-43-2006, табл. 5.2'
  );

  addFormulaRow(
    '(3.5)',
    'Температура внутренней поверхности покрытия τ_в.пуст и τ_в.ребро',
    'τ_в.пуст = t_в − (t_в − t_н) / (R_0^пуст · α_в);   τ_в.ребро = t_в − (t_в − t_н) / (R_0^реб · α_в)',
    `"τ_в.пуст = "&ROUND(Покрытие_Расчет!C23,2)&" °C; τ_в.ребро = "&ROUND(Покрытие_Расчет!H23,2)&" °C > t_р = "&ROUND(Ввод_и_Итоги!C30,2)&" °C"`,
    '°C',
    'ТКП 45-2.04-43-2006, п. 6.2'
  );

  addFormulaRow(
    '(3.5а)',
    'Общее сопротивление паропроницанию покрытия R_п (по пустоте и по ребру, R_п.возд = 0)',
    'R_п.пуст = 1/37 + ΣR_п.вн + 2·δ_ф/0,03 + 0 + R_п.ут + R_п.нар + R_п.пи + 1/77;   R_п.реб (вместо 2·δ_ф — h/0,03)',
    `"R_п (по пустоте, R_п.возд=0) = "&ROUND(Покрытие_Расчет!C24,2)&" м²·ч·Па/мг; R_п (по ребру) = "&ROUND(Покрытие_Расчет!C25,2)&" м²·ч·Па/мг (R_п.пи = "&ROUND(Покрытие_Расчет!J13,3)&")"`,
    'м²·ч·Па/мг',
    'СП 2.04.01-2020, п. 10.5; Шибеко п. 7.1.3'
  );

  for (let rank = 1; rank <= 13; rank++) {
    const matchExpr = `MATCH(${rank},Покрытие_Расчет!$L$34:$L$46,0)`;
    addFormulaRow(
      `(3.6.${rank})`,
      `Покрытие (по пустоте) — плоскость ${rank} таблицы тепловлажностного режима`,
      't_x = t_в − ((t_в − t_н.от)/R_0^пуст)·ΣR_i;   e_x = e_в − ((e_в − e_н.от)/R_п.пуст)·ΣR_пi',
      `IFERROR(INDEX(Покрытие_Расчет!$B$34:$B$46,${matchExpr})&": t_от = "&ROUND(INDEX(Покрытие_Расчет!$G$34:$G$46,${matchExpr}),2)&" °C; ΣR_п = "&ROUND(INDEX(Покрытие_Расчет!$E$34:$E$46,${matchExpr}),3)&"; e_x = "&ROUND(INDEX(Покрытие_Расчет!$I$34:$I$46,${matchExpr}),2)&" Па; E_x = "&ROUND(INDEX(Покрытие_Расчет!$H$34:$H$46,${matchExpr}),1)&" Па ("&IF(INDEX(Покрытие_Расчет!$J$34:$J$46,${matchExpr})>=0,"e_x ≤ E_x — без конд.","e_x > E_x — ЗОНА КОНДЕНСАЦИИ")&")","—")`,
      '°C / Па',
      'Табл. 3.2 (Шибеко разд. 7)'
    );
  }

  // =========================================================================
  // РАЗДЕЛ 4. РАСЧЕТ ТЕПЛОВОГО БАЛАНСА И ВЛАЖНОСТНОГО РЕЖИМА ТЕХПОДПОЛЬЯ (ПТП)
  // =========================================================================
  addSection('РАЗДЕЛ 4. ТЕПЛОВОЙ БАЛАНС И ВЛАЖНОСТНЫЙ РЕЖИМ ТЕХНИЧЕСКОГО ПОДПОЛЬЯ');

  addFormulaRow(
    '(4.1)',
    'Сопротивление теплопередаче перекрытия над техподпольем R_ПТП',
    'R_ПТП = 1/α_в.п + Σ(δ_i / λ_i) + 1/α_н.п (где α_в.п = 8,7; α_н.п = 17,0 Вт/(м²·°C))',
    `"R_ПТП = 1/8,7 + "&ROUND(SUM(Подполье_ПТП!E7:E12),3)&" + 1/17 = "&ROUND(Подполье_ПТП!C16,2)&" ≥ R_норм = "&ROUND(Подполье_ПТП!C13,2)`,
    'м²·°C/Вт',
    'Шибеко 2018, разд. 4, ф-ла (4.2)'
  );

  addFormulaRow(
    '(4.1а)',
    'Сопротивление паропроницанию перекрытия над техподпольем R_п.ПТП',
    'R_п.ПТП = 1/37 + Σ(δ_i / μ_i) + R_п.пи + 1/77',
    `"R_п.ПТП = 0,027 + "&ROUND(SUM(Подполье_ПТП!I7:I11),3)&" + "&ROUND(Подполье_ПТП!I12,3)&" + 0,013 = "&ROUND(Подполье_ПТП!C17,2)`,
    'м²·ч·Па/мг',
    'СП 2.04.01-2020, п. 10.5'
  );

  addFormulaRow(
    '(4.2)',
    'Суммарные тепловыделения от трубопроводов в техподполье Q_тр',
    'Q_тр = 1,15 · Σ(q_i^5 · l_i), где q_i^5 — по табл. Прил. О Шибеко при t_окр = 5 °C',
    `"Σ(q_i^5 · l_i) = "&ROUND(Подполье_ПТП!C24,1)&" Вт; Q_тр = 1,15 · "&ROUND(Подполье_ПТП!C24,1)&" = "&ROUND(1.15*Подполье_ПТП!C24,1)`,
    'Вт',
    'Шибеко 2018, ф-ла (4.6), Прил. О'
  );

  addFormulaRow(
    '(4.3)',
    'Расчетная температура воздуха в техническом подполье t_п из уравнения теплового баланса',
    't_п = (t_в·(F_п/R_ПТП) + t_н·(F_ц/R_ц + F_п/R_п.гр + 0,28·L·n_в·V_п·c·ρ_в.п) + 1,15·Σ(q_i^5·l_i)) / (F_п/R_ПТП + F_ц/R_ц + F_п/R_п.гр + 0,28·L·n_в·V_п·c·ρ_в.п)',
    `"Из уравнения теплового баланса: t_п = "&ROUND(Подполье_ПТП!C18,2)&" °C (норма: ≥ +2 °C)"`,
    '°C',
    'Шибеко 2018, ф-ла (4.1)–(4.8)'
  );

  addFormulaRow(
    '(4.4)',
    'Проверка температурного перепада на полу первого этажа Δt_п',
    'Δt_п = (t_в − t_п) / (R_ПТП · α_в.п) ≤ 2,0 °C',
    `"Δt_п = ("&ROUND(Ввод_и_Итоги!C26,1)&" − "&ROUND(Подполье_ПТП!C18,2)&") / ("&ROUND(Подполье_ПТП!C16,2)&" · 8,7) = "&ROUND(Подполье_ПТП!C21,2)&" °C ≤ 2,0 °C"`,
    '°C',
    'Шибеко 2018, ф-ла (4.9)'
  );

  addFormulaRow(
    '(4.5)',
    'Температура внутренней поверхности цокольной стены техподполья τ_в.цок и проверка невыпадения конденсата',
    'τ_в.цок = t_п − (t_п − t_н) / (R_0.цок · α_в.цок) > t_р.п (при t_п и φ_п)',
    `"τ_в.цок = "&ROUND(Подполье_ПТП!C18,2)&" − ("&ROUND(Подполье_ПТП!C18,2)&" − ("&ROUND(Ввод_и_Итоги!F13,1)&")) / (1,25 · 17) = "&ROUND(Подполье_ПТП!C23,2)&" °C > t_р.п = "&ROUND(Подполье_ПТП!C20,2)&" °C"`,
    '°C',
    'Шибеко 2018, ф-ла (4.10)'
  );

  // =========================================================================
  // РАЗДЕЛ 5. ТЕПЛОТЕХНИЧЕСКИЙ РАСЧЕТ И ВОЗДУХОПРОНИЦАЕМОСТЬ ОКОН
  // =========================================================================
  addSection('РАЗДЕЛ 5. ТЕПЛОТЕХНИЧЕСКИЙ РАСЧЕТ И ВОЗДУХОПРОНИЦАЕМОСТЬ ОКОН (ШИБЕКО РАЗД. 6)');

  addFormulaRow(
    '(5.1)',
    'Приведенное сопротивление теплопередаче окна R_т.ок',
    'R_т.ок = Σ F_i / Σ(F_i / R_тi) = (Σ F_непр + Σ F_св) / (Σ(F_непр/R_т.непр) + Σ(F_св/R_т.св)) ≥ R_т.норм.ок',
    `"R_т.ок = "&ROUND(Окна_Расчет!E44,5)&" / ("&ROUND(Окна_Расчет!G45,4)&" + "&ROUND(Окна_Расчет!G46,4)&") = "&ROUND(Окна_Расчет!E44,5)&" / "&ROUND(Окна_Расчет!G44,4)&" = "&ROUND(Окна_Расчет!F44,2)&" м²·°C/Вт ≥ R_т.норм = "&ROUND(Окна_Расчет!C15,2)`,
    'м²·°C/Вт',
    'Шибеко 2018, ф-ла (6.1), табл. 6.2'
  );

  addFormulaRow(
    '(5.2)',
    'Плотность наружного и внутреннего воздуха ρ_н, ρ_в',
    'ρ_н = 353 / (273 + t_н);   ρ_в = 353 / (273 + t_в)',
    `"ρ_н = 353 / (273 + ("&ROUND(Ввод_и_Итоги!F11,1)&")) = "&ROUND(Окна_Расчет!F12,2)&" кг/м³; ρ_в = 353 / (273 + "&ROUND(Ввод_и_Итоги!C26,1)&") = "&ROUND(Окна_Расчет!F13,2)&" кг/м³; ρ_н − ρ_в = "&ROUND(Окна_Расчет!F14,2)&" кг/м³"`,
    'кг/м³',
    'Шибеко 2018, с. 48'
  );

  addFormulaRow(
    '(5.3 / 6.2)',
    'Разность давлений воздуха на наружной и внутренней поверхностях окна i-го этажа Δp_i',
    'Δp_i = (H − h_i) · g · (ρ_н − ρ_в) + 0,5 · ρ_н · v_ср² · (c_н − c_п) · k_i',
    `"Для 1-го этажа (h_1 = "&ROUND(Окна_Расчет!C49,1)&" м, k_1 = "&ROUND(Окна_Расчет!H49,3)&"): Δp_1 = ("&ROUND(Ввод_и_Итоги!F7,1)&" − "&ROUND(Окна_Расчет!C49,1)&")·9,81·"&ROUND(Окна_Расчет!D49,2)&" + 0,5·"&ROUND(Окна_Расчет!E49,2)&"·"&ROUND(Ввод_и_Итоги!F12,1)&"²·1,4·"&ROUND(Окна_Расчет!H49,3)&" = "&ROUND(Окна_Расчет!I49,2)&" Па"`,
    'Па',
    'Шибеко 2018, ф-ла (6.2), с. 48'
  );

  addFormulaRow(
    '(5.4 / 6.3)',
    'Требуемое сопротивление воздухопроницанию окна R_в.тр (при Δp = 10 Па и при Δp = 100 Па)',
    'R_в.тр = (1 / G_н) · (Δp_i / 10)^(2/3);   1,2·R_в.тр — верхняя граница диапазона',
    `"Для 1-го этажа (Δp_1 = "&ROUND(Окна_Расчет!I49,2)&" Па, G_н = 10 кг/(м²·ч)): R_в.тр = (1/10)·("&ROUND(Окна_Расчет!I49,2)&"/10)^(2/3) = "&ROUND(Окна_Расчет!K49,3)&" (м²·ч)/кг → 1,2·R_в.тр = "&ROUND(Окна_Расчет!D87,3)&" → класс "&Окна_Расчет!F87`,
    '(м²·ч)/кг',
    'Шибеко 2018, ф-ла (6.3), СТБ 939-2013'
  );

  // Добавим сводку количества формул внизу
  ws.getRow(r).height = 24;
  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = `Итого на листе приведено формул и пошаговых подстановок для пояснительной записки: ${r - 5} позиций (для варианта ${calc.cipher.rawCipher}, г. ${calc.climate.name}).`;
  styleResultCell(ws.getCell(`A${r}`), '@', 'left');
}

/**
 * Формирует спецификацию 4 нативных диаграмм Шибеко для листа «Графики_Шибеко»
 * с предвычисленным кэшем значений из calc и живыми ссылками на формулы Excel.
 */
function buildShibekoChartSpecs(calc: FullCourseworkCalculation): ExcelChartSpec[] {
  const wallPts = extractSurfaceProfilePoints(calc.wall.crossSectionProfile);
  const roofPts = extractSurfaceProfilePoints(calc.roof.voidSection.crossSectionProfile);

  // Накопленное R_п для кэша графиков в масштабе сопротивлений паропроницанию
  const buildWallRpCache = () => {
    const res: number[] = [+(1 / 37).toFixed(3)];
    let cumRp = 1 / 37;
    for (const l of calc.wall.layers) {
      const isIns =
        l.name.toLowerCase().includes('утепл') ||
        l.materialName.toLowerCase().includes('утепл') ||
        (l.lambda <= 0.08 && l.thickness >= 0.03);
      if (isIns) {
        res.push(+(cumRp + l.R_p / 2).toFixed(3));
      }
      cumRp += l.R_p;
      res.push(+cumRp.toFixed(3));
    }
    return res.slice(0, wallPts.length);
  };

  const buildRoofVoidRpCache = () => {
    // Соответствует 8 точкам roofVoidPts (от 1/37 до наружной поверхности)
    const eV = calc.internalConditions.e_v;
    const eN = calc.roof.voidSection.crossSectionProfile[calc.roof.voidSection.crossSectionProfile.length - 1]?.e_partial ?? 490.78;
    const totalRp = calc.roof.total_R_p;
    const denom = Math.max(0.01, eV - eN);
    return roofPts.map((pt) => +(((eV - pt.e) / denom) * totalRp).toFixed(3));
  };

  const wallRpVals = buildWallRpCache();
  const roofRpVals = buildRoofVoidRpCache();
  const wallMaxX = wallPts.length > 0 ? Math.max(...wallPts.map((p) => p.xMm)) : 550;
  const roofMaxX = roofPts.length > 0 ? Math.max(...roofPts.map((p) => p.xMm)) : 470;

  return [
    // График 1: Стена в масштабе толщин x, мм (t на левой оси °C, E и e на правой оси Па)
    {
      title: `Наружная стена (${calc.wall.construction.id}): распределение t, E, e по толщине x`,
      xAxisTitle: 'Толщина конструкции x, мм',
      yAxisTitle: 'Температура t, °C',
      y2AxisTitle: 'Парциальное давление E, e, Па',
      xMaxHint: wallMaxX,
      primarySeries: [
        {
          name: 'Температура t(x), °C',
          xFormula: "'Графики_Шибеко'!$C$51:$C$60",
          yFormula: "'Графики_Шибеко'!$E$51:$E$60",
          xValues: wallPts.map((p) => p.xMm),
          yValues: wallPts.map((p) => p.t),
          colorHex: 'DC2626',
          dash: 'solid',
          smooth: false,
          markerSymbol: 'circle',
        },
      ],
      secondarySeries: [
        {
          name: 'Макс. давление E(x), Па',
          xFormula: "'Графики_Шибеко'!$C$51:$C$60",
          yFormula: "'Графики_Шибеко'!$F$51:$F$60",
          xValues: wallPts.map((p) => p.xMm),
          yValues: wallPts.map((p) => p.E),
          colorHex: '2563EB',
          dash: 'solid',
          smooth: true,
          markerSymbol: 'diamond',
        },
        {
          name: 'Парциальное давление e(x), Па',
          xFormula: "'Графики_Шибеко'!$C$51:$C$60",
          yFormula: "'Графики_Шибеко'!$G$51:$G$60",
          xValues: wallPts.map((p) => p.xMm),
          yValues: wallPts.map((p) => p.e),
          colorHex: 'EA580C',
          dash: 'dash',
          smooth: false,
          markerSymbol: 'square',
        },
      ],
      fromCol: 0,
      fromRow: 3,
      toCol: 10,
      toRow: 24,
    },
    // График 2: Стена в масштабе сопротивлений паропроницанию R_п (Шибеко п. 7.1.4)
    {
      title: `Наружная стена (${calc.wall.construction.id}): E и e в масштабе Rп (Шибеко п. 7.1.4)`,
      xAxisTitle: 'Сопротивление паропроницанию Rп, м²·ч·Па/мг',
      yAxisTitle: 'Парциальное давление E, e, Па',
      primarySeries: [
        {
          name: 'Макс. давление E(Rп), Па',
          xFormula: "'Графики_Шибеко'!$D$51:$D$60",
          yFormula: "'Графики_Шибеко'!$F$51:$F$60",
          xValues: wallRpVals,
          yValues: wallPts.map((p) => p.E),
          colorHex: '2563EB',
          dash: 'solid',
          smooth: true,
          markerSymbol: 'diamond',
        },
        {
          name: 'Факт. давление e(Rп), Па',
          xFormula: "'Графики_Шибеко'!$D$51:$D$60",
          yFormula: "'Графики_Шибеко'!$G$51:$G$60",
          xValues: wallRpVals,
          yValues: wallPts.map((p) => p.e),
          colorHex: 'EA580C',
          dash: 'dash',
          smooth: false,
          markerSymbol: 'square',
        },
      ],
      fromCol: 11,
      fromRow: 3,
      toCol: 21,
      toRow: 24,
    },
    // График 3: Покрытие (сечение по пустоте) в масштабе толщин x, мм
    {
      title: `Покрытие (${calc.roof.construction.id}, по пустоте): распределение t, E, e по толщине x`,
      xAxisTitle: 'Толщина конструкции x, мм',
      yAxisTitle: 'Температура t, °C',
      y2AxisTitle: 'Парциальное давление E, e, Па',
      xMaxHint: roofMaxX,
      primarySeries: [
        {
          name: 'Температура t(x), °C',
          xFormula: "'Графики_Шибеко'!$C$64:$C$73",
          yFormula: "'Графики_Шибеко'!$E$64:$E$73",
          xValues: roofPts.map((p) => p.xMm),
          yValues: roofPts.map((p) => p.t),
          colorHex: 'DC2626',
          dash: 'solid',
          smooth: false,
          markerSymbol: 'circle',
        },
      ],
      secondarySeries: [
        {
          name: 'Макс. давление E(x), Па',
          xFormula: "'Графики_Шибеко'!$C$64:$C$73",
          yFormula: "'Графики_Шибеко'!$F$64:$F$73",
          xValues: roofPts.map((p) => p.xMm),
          yValues: roofPts.map((p) => p.E),
          colorHex: '2563EB',
          dash: 'solid',
          smooth: true,
          markerSymbol: 'diamond',
        },
        {
          name: 'Парциальное давление e(x), Па',
          xFormula: "'Графики_Шибеко'!$C$64:$C$73",
          yFormula: "'Графики_Шибеко'!$G$64:$G$73",
          xValues: roofPts.map((p) => p.xMm),
          yValues: roofPts.map((p) => p.e),
          colorHex: 'EA580C',
          dash: 'dash',
          smooth: false,
          markerSymbol: 'square',
        },
      ],
      fromCol: 0,
      fromRow: 25,
      toCol: 10,
      toRow: 46,
    },
    // График 4: Покрытие (сечение по пустоте) в масштабе R_п (Шибеко п. 7.1.4)
    {
      title: `Покрытие (${calc.roof.construction.id}, по пустоте): E и e в масштабе Rп (Шибеко п. 7.1.4)`,
      xAxisTitle: 'Сопротивление паропроницанию Rп, м²·ч·Па/мг',
      yAxisTitle: 'Парциальное давление E, e, Па',
      primarySeries: [
        {
          name: 'Макс. давление E(Rп), Па',
          xFormula: "'Графики_Шибеко'!$D$64:$D$73",
          yFormula: "'Графики_Шибеко'!$F$64:$F$73",
          xValues: roofRpVals,
          yValues: roofPts.map((p) => p.E),
          colorHex: '2563EB',
          dash: 'solid',
          smooth: true,
          markerSymbol: 'diamond',
        },
        {
          name: 'Факт. давление e(Rп), Па',
          xFormula: "'Графики_Шибеко'!$D$64:$D$73",
          yFormula: "'Графики_Шибеко'!$G$64:$G$73",
          xValues: roofRpVals,
          yValues: roofPts.map((p) => p.e),
          colorHex: 'EA580C',
          dash: 'dash',
          smooth: false,
          markerSymbol: 'square',
        },
      ],
      fromCol: 11,
      fromRow: 25,
      toCol: 21,
      toRow: 46,
    },
  ];
}

/**
 * Генерирует готовый бинарный буфер .xlsx (16 листов + 4 нативные диаграммы Шибеко + AutoCAD).
 */
export async function buildCourseworkXlsxBuffer(
  calc: FullCourseworkCalculation
): Promise<Uint8Array> {
  const wb = await buildCourseworkWorkbook(calc);
  const rawBuffer = await wb.xlsx.writeBuffer();
  const chartSpecs = buildShibekoChartSpecs(calc);
  return injectChartsIntoXlsx(rawBuffer as ArrayBuffer, 'Графики_Шибеко', chartSpecs);
}

// ---------------------------------------------------------------------------
// ЭКСПОРТ В БРАУЗЕРЕ (СКАЧИВАНИЕ .xlsx)
// ---------------------------------------------------------------------------

export async function exportCourseworkToExcel(calc: FullCourseworkCalculation): Promise<void> {
  const finalBytes = await buildCourseworkXlsxBuffer(calc);
  const blob = new Blob([finalBytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeCity = calc.climate.name.replace(/[^\wа-яА-ЯёЁ-]+/g, '_');
  link.href = url;
  link.download = `Теплофизика_БНТУ_${safeCity}_${calc.cipher.wallCode}_${calc.cipher.roofCode}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
