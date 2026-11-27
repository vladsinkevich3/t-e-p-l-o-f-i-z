/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Модульные тесты чистого математического расчета, линейной интерполяции E(t),
 * выбираемой пароизоляции, методики окон Шибеко (табл. 6.1–6.4) и 14-листной книги Excel (.xlsx).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  calculateCoursework,
  calculateSurfaceHeatAssimilation,
  calculateShibekoMinSurfaceTemp,
  selectDesignWinterTemp,
} from './calculations';
import { DEFAULT_CIPHER, PDF_REFERENCE_CIPHER, parseTaskCipher } from './decodeCipher';
import { CITIES_DATA } from '../data/climate';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { MATERIALS, MATERIAL_CATEGORY_ORDER } from '../data/materials';
import { WALL_CONSTRUCTIONS } from '../data/constructions';
import { getSaturatedVaporPressure, getWindPressureHeightCoeff } from '../data/normative';
import { calculateVaporBarrierRp } from '../data/vaporBarriers';
import { buildCourseworkWorkbook, buildCourseworkXlsxBuffer } from '../export/excelExport';
import {
  buildAutoCadCoordinates,
  extractSurfaceProfilePoints,
} from './autocadExport';

test('Парсер шифра корректно извлекает компоненты из строки', () => {
  const cipherStr = 'Жилое – Г27 – 12 – С11 – П3 – ПТП10 – У11 – О5';
  const parsed = parseTaskCipher(cipherStr);

  assert.equal(parsed.buildingType, 'Жилое');
  assert.equal(parsed.cityCode, 'Г27');
  assert.equal(parsed.floorsCount, 12);
  assert.equal(parsed.wallCode, 'С11');
  assert.equal(parsed.roofCode, 'П3');
  assert.equal(parsed.basementCode, 'ПТП10');
  assert.equal(parsed.insulationCode, 'У11');
  assert.equal(parsed.windowCode, 'О5');
});

test('Точная линейная интерполяция E(t) по Приложению Е (шаг 0.1°C, без округления t)', () => {
  // Опорные точки Приложения Е (Шибеко стр. 97-99)
  assert.equal(getSaturatedVaporPressure(0), 611.2);
  assert.equal(getSaturatedVaporPressure(-1), 562.7);
  assert.equal(getSaturatedVaporPressure(17.6), 2012.9);
  assert.equal(getSaturatedVaporPressure(17.7), 2025.7);
  assert.equal(getSaturatedVaporPressure(-0.2), 601.2);
  assert.equal(getSaturatedVaporPressure(-0.3), 596.2);

  // Точная линейная интерполяция между узлами 0.1°C:
  // E(17.69) = 2012.9 + 0.9 * (2025.7 - 2012.9) = 2024.42 -> 2024.4 (НЕ округление к 17.7 -> 2025.7!)
  assert.equal(getSaturatedVaporPressure(17.69), 2024.4);
  assert.notEqual(getSaturatedVaporPressure(17.69), getSaturatedVaporPressure(17.7));

  // E(-0.24) = 596.2 + 0.6 * (601.2 - 596.2) = 599.2 (НЕ округление к -0.2 -> 601.2!)
  assert.equal(getSaturatedVaporPressure(-0.24), 599.2);
  assert.notEqual(getSaturatedVaporPressure(-0.24), getSaturatedVaporPressure(-0.2));

  // Строгая монотонность на шаге 0.1°C
  for (let i = -250; i < 250; i++) {
    const t0 = +(i / 10).toFixed(1);
    const t1 = +((i + 1) / 10).toFixed(1);
    assert.ok(
      getSaturatedVaporPressure(t0) < getSaturatedVaporPressure(t1),
      `E(${t0}) должно быть меньше E(${t1})`
    );
  }
});

test('Расчет эталонного варианта (Гродно, С11-П3-ПТП10-У11-О5) без раздела дверей', () => {
  const result = calculateCoursework(DEFAULT_CIPHER);

  // 1. Климат
  assert.equal(result.climate.id, 'Г27');
  assert.equal(result.climate.t_coldest_5days_092, -22);
  assert.equal(result.climate.wind_speed_winter, 5.7);

  // 2. Внутренний климат (линейная интерполяция по полному Приложению Е Шибеко: e_v=1135.37 Па -> t_р = 8.83°C)
  assert.equal(result.internalConditions.t_v, 18);
  assert.equal(result.internalConditions.dew_point, 8.83);

  // 3. Стена С11
  assert.equal(result.wall.construction.id, 'С11');
  assert.equal(result.wall.construction.increasingFactor_n, 1.84);
  assert.equal(result.wall.R_required, 5.89);
  assert.equal(result.wall.delta_insulation_adopted, 0.23);
  assert.ok(result.wall.R_total >= 5.89);
  assert.ok(result.wall.thermalInertia_D > 7);
  assert.equal(result.wall.design_t_out, -22);
  assert.ok(result.wall.tau_v_min > result.wall.dew_point);
  assert.equal(result.wall.isCompliant, true);

  // 4. Покрытие П3
  assert.equal(result.roof.hollowCore.R_slab, 0.175);
  assert.equal(result.roof.R_required, 6.6);
  assert.equal(result.roof.delta_insulation_adopted, 0.27);
  assert.ok(result.roof.R_total >= 6.6);
  assert.equal(result.roof.vaporBarrierAdded, true);
  assert.equal(result.roof.moistureCondensationRisk, false);
  assert.equal(result.roof.isCompliant, true);

  // 5. Подполье ПТП10
  assert.equal(result.basement.delta_insulation_adopted, 0.05);
  assert.ok(result.basement.R_ptp >= 1.87);
  assert.ok(result.basement.delta_t_floor <= 0.8);
  assert.ok(result.basement.tau_v_basement_wall > result.basement.dew_point_basement);
  assert.equal(result.basement.isCompliant, true);

  // 6. Окна О5 (методика Шибеко)
  assert.equal(result.window.windowDef.id, 'О5');
  assert.equal(result.window.R_actual, 1.35);
  assert.ok(result.window.R_actual >= 1.0);
  assert.equal(result.window.isCompliant, true);
  assert.equal(result.window.floors.length, 12);
  assert.ok(result.window.zones.length >= 10);

  // Раздел дверей удален
  assert.equal('door' in result, false);

  // Общее соответствие
  assert.equal(result.summary.totalCompliance, true);
});

test('Выбираемая пароизоляция (материал + толщина) корректно работает и для стены, и для покрытия', () => {
  // Пропорциональный пересчет R_p по толщине
  assert.equal(calculateVaporBarrierRp('pe_film_1', 0.16), 7.3);
  assert.equal(calculateVaporBarrierRp('pe_film_1', 0.32), 14.6);
  assert.equal(calculateVaporBarrierRp('ruberoid', 3.0), 2.2);
  assert.equal(calculateVaporBarrierRp('none', 5.0), 0);

  // Без пароизоляции в стене vs с ПЭ пленкой 0.32 мм в стене
  const base = calculateCoursework(PDF_REFERENCE_CIPHER);
  assert.equal(base.wall.vaporBarrier, null);

  const withWallVb = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    overrides: {
      ...PDF_REFERENCE_CIPHER.overrides,
      wallVaporBarrier: { materialId: 'pe_film_1', thicknessMm: 0.32 },
    },
  });
  assert.ok(withWallVb.wall.vaporBarrier);
  assert.equal(withWallVb.wall.vaporBarrier.R_p, 14.6);
  assert.equal(withWallVb.wall.vaporBarrier.thicknessMm, 0.32);
  assert.ok(withWallVb.wall.total_R_p > base.wall.total_R_p + 14.0);
  assert.ok(withWallVb.wall.layers.some((l) => l.name.includes('Пароизоляция')));

  // Ручная пароизоляция в покрытии (Рубероид 3.0 мм -> Rп = 2.2)
  const withRoofVb = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    overrides: {
      ...PDF_REFERENCE_CIPHER.overrides,
      roofVaporBarrier: { materialId: 'ruberoid', thicknessMm: 3.0 },
    },
  });
  assert.ok(withRoofVb.roof.vaporBarrier);
  assert.equal(withRoofVb.roof.vaporBarrier.R_p, 2.2);
  assert.equal(withRoofVb.roof.vaporBarrier.isAuto, false);
  assert.equal(withRoofVb.roof.vaporBarrierAdded, true);
  assert.ok(withRoofVb.roof.total_R_p > base.roof.total_R_p + 2.0);
});

test('Методика расчета окон по А. С. Шибеко (табл. 6.1–6.4, H=3.7+3N, интерполяция k_i по Прил. М)', () => {
  const res = calculateCoursework(PDF_REFERENCE_CIPHER);
  const win = res.window;

  // Высота здания: 3.7 + 3.0 * 9 = 30.7 м
  assert.equal(win.H_building, 30.7);
  assert.equal(win.terrainType, 'B');
  assert.equal(win.G_norm, 10.0);
  assert.equal(win.delta_c, 1.4);

  // Таблица 6.2: сумма площадей зон совпадает с общей площадью окна О18 (2.2925 м²)
  const zoneSumArea = +win.zones.reduce((acc, z) => acc + z.area_m2, 0).toFixed(4);
  assert.equal(zoneSumArea, win.area_total);
  assert.equal(win.area_total, 2.2925);

  // Точная линейная интерполяция k_i для 9 этажей (h_i = 2.5, 5.5, 8.5, 11.5, 14.5, 17.5, 20.5, 23.5, 26.5) Тип B
  const expectedK = [0.5, 0.515, 0.605, 0.68, 0.74, 0.8, 0.856, 0.894, 0.931];
  const actualK = win.floors.map((f) => f.k_i);
  assert.deepEqual(actualK, expectedK);
  assert.equal(getWindPressureHeightCoeff(5.5, 'B'), 0.515);
  assert.equal(getWindPressureHeightCoeff(26.5, 'B'), 0.931);

  // Таблица 6.4: проверка расщепления пограничного класса на 1 этаже (R_v_req .. 1.2*R_v_req)
  const floor1 = win.floors[0];
  assert.ok(floor1.R_v_max > floor1.R_v_required);
  assert.ok(floor1.windowClassRangeText.length >= 1);
});

test('Парсер шифра распознает названия городов (Минск, Брест, Гродно) и номера городов', () => {
  const p1 = parseTaskCipher('Жилое – Минск – 9 – С1 – П1 – ПТП1 – У1 – О1');
  assert.equal(p1.cityCode, 'Г69');

  const p2 = parseTaskCipher('Жилое – Брест – 5 – С5 – П2 – ПТП5 – У5 – О3');
  assert.equal(p2.cityCode, 'Г12');

  const p3 = parseTaskCipher('Жилое – Гродно – 12 – С11 – П3 – ПТП10 – У11 – О5');
  assert.equal(p3.cityCode, 'Г27');

  const p4 = parseTaskCipher('Жилое – 27 – 12 – С11 – П3 – ПТП10 – У11 – О5');
  assert.equal(p4.cityCode, 'Г27');

  const p5 = parseTaskCipher('Жилое – Г-69 – 9 – С1 – П1 – ПТП1 – У1 – О1');
  assert.equal(p5.cityCode, 'Г69');
});

test('Расчет содержит худшее сечение и контрольную точку в середине утеплителя', () => {
  const result = calculateCoursework(DEFAULT_CIPHER);

  assert.equal(result.roof.hollowCore.R_rib_worst, 0.127);
  assert.equal(result.roof.worstSection.type, 'worst');
  assert.equal(result.roof.voidSection.type, 'void');
  assert.ok(result.roof.worstSection.R_slab_section < result.roof.voidSection.R_slab_section);
  assert.ok(result.roof.worstSection.tau_v_steady <= result.roof.voidSection.tau_v_steady);
  assert.ok(result.roof.worstSection.tau_v_winter <= result.roof.worstSection.tau_v_steady);
  assert.ok(result.roof.voidSection.tau_v_winter <= result.roof.voidSection.tau_v_steady);

  const wallMidpoint = result.wall.crossSectionProfile.find((p) => p.isInsulationMidpoint);
  assert.ok(wallMidpoint);
  assert.equal(wallMidpoint.coord_x_mm, Math.round(10 + 380 + 230 / 2));

  const roofMidpoint = result.roof.crossSectionProfile.find((p) => p.isInsulationMidpoint);
  assert.ok(roofMidpoint);

  const basementMidpoint = result.basement.crossSectionProfile.find((p) => p.isInsulationMidpoint);
  assert.ok(basementMidpoint);
});

test('Поддержка всех 9 типов зданий (СП 2.04.01-2020 табл. 5.1/6.5) и условий эксплуатации А/Б', () => {
  assert.equal(Object.keys(BUILDING_TYPES).length, 9);
  assert.ok(BUILDING_TYPES['school'], 'Должен присутствовать тип здания school (Школа / Поликлиника)');
  assert.equal(BUILDING_TYPES['residential'].delta_t_norm_wall, 6.0);
  assert.equal(BUILDING_TYPES['residential'].delta_t_norm_roof, 4.0);
  assert.equal(BUILDING_TYPES['residential'].delta_t_norm_floor, 2.0);
  assert.equal(BUILDING_TYPES['kindergarten'].default_t_v, 21);
  assert.equal(BUILDING_TYPES['hospital'].default_t_v, 21);
  assert.equal(Object.keys(CITIES_DATA).length, 129);
  assert.equal(CITIES_DATA['Г118']?.name, 'Новополоцк');
  assert.equal(CITIES_DATA['Г28']?.name, 'Дзержинск');

  const resAdmin = calculateCoursework(PDF_REFERENCE_CIPHER);
  assert.equal(resAdmin.internalConditions.humidityRegime, 'dry');
  assert.equal(resAdmin.internalConditions.exploitationConditions, 'А');
  assert.equal(resAdmin.wall.R_required, 5.89);
  assert.equal(resAdmin.wall.delta_insulation_adopted, 0.15);
  assert.equal(resAdmin.roof.delta_insulation_adopted, 0.19);
  assert.equal(resAdmin.roof.vaporBarrierAdded, false);
  assert.equal(resAdmin.summary.totalCompliance, true);

  // Принудительный режим Б при сухом помещении
  const resOverrideB = calculateCoursework({
    ...DEFAULT_CIPHER,
    overrides: { t_indoor: 20, phi_indoor: 30, operatingConditionMode: 'B' },
  });
  assert.equal(resOverrideB.internalConditions.exploitationConditions, 'Б');
});

test('Генератор автономной книги Excel (.xlsx) создает 18 листов с живыми формулами без TEXT(), нативными графиками Шибеко и AutoCAD_Графики', async () => {
  const calc = calculateCoursework(PDF_REFERENCE_CIPHER);
  const wb = await buildCourseworkWorkbook(calc);

  // 1. Проверяем количество и точные имена всех 18 листов
  const expectedSheets = [
    'Ввод_и_Итоги',
    'В_отчет',
    'Формулы_расчета',
    'Стена_Расчет',
    'Стены_Все_Схемы',
    'Покрытие_Расчет',
    'Покрытия_Все_Схемы',
    'Подполье_ПТП',
    'Окна_Расчет',
    'Графики_Шибеко',
    'AutoCAD_Графики',
    'Справ_Города',
    'Справ_ТипыЗданий',
    'Справ_Утеплители',
    'Справ_Материалы',
    'Справ_Пароизоляция',
    'Справ_Конструкции',
    'Справ_Таблица_Е1',
  ];
  const actualNames = wb.worksheets.map((w) => w.name);
  assert.deepEqual(actualNames, expectedSheets);

  // 2. Сериализуем через buildCourseworkXlsxBuffer (включая внедрение 4 нативных графиков Шибеко)
  const buffer = await buildCourseworkXlsxBuffer(calc);
  assert.ok(buffer.byteLength > 30000, `Размер .xlsx буфера должен быть > 30 КБ, получено ${buffer.byteLength}`);

  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);
  assert.equal(reloaded.worksheets.length, expectedSheets.length);

  // 3. Проверяем справочники: 129 городов, 9 типов зданий, 16 пароизоляций + 3 пользовательских слота, 531 точка E(t)
  assert.equal(reloaded.getWorksheet('Справ_Города')!.rowCount, 130);
  assert.equal(reloaded.getWorksheet('Справ_ТипыЗданий')!.rowCount, 10);
  assert.equal(reloaded.getWorksheet('Справ_Пароизоляция')!.rowCount, 20);
  assert.equal(reloaded.getWorksheet('Справ_Таблица_Е1')!.rowCount, 532); // 1 заголовок + 531 строка

  // 4. Проверяем Data Validation (выпадающие списки) на Ввод_и_Итоги (включая C24 — режим выбора t_н)
  const inputWs = reloaded.getWorksheet('Ввод_и_Итоги')!;
  for (const addr of ['C5', 'C6', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14', 'C17', 'C19', 'C24']) {
    assert.equal(
      inputWs.getCell(addr).dataValidation?.type,
      'list',
      `Ячейка Ввод_и_Итоги!${addr} должна иметь выпадающий список`
    );
  }
  assert.equal(
    reloaded.getWorksheet('Справ_Материалы')!.rowCount,
    Object.keys(MATERIALS).length + 1,
    'Справ_Материалы должен содержать все материалы СП 2.04.01-2020'
  );

  // 5. Проверяем, что на листе Стена_Расчет нет коэффициента неравномерности m (формула C20 без H17/H18)
  const wallWs = reloaded.getWorksheet('Стена_Расчет')!;
  const wallTauFormula = (wallWs.getCell('C20').value as { formula?: string })?.formula || '';
  assert.ok(!wallTauFormula.includes('H17'), `Формула τв стены не должна содержать коэффициент m: ${wallTauFormula}`);
  assert.ok(wallTauFormula.includes('C18') && wallTauFormula.includes("'Ввод_и_Итоги'!$C$34"));

  // 6. Проверяем формулы линейной интерполяции E(t), AutoCAD SUBSTITUTE, отсутствие TEXT() и ошибок
  let totalFormulas = 0;
  let interpolationFormulaCount = 0;
  let autocadSubstituteCount = 0;
  for (const ws of reloaded.worksheets) {
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const val = cell.value as { formula?: string } | null;
        if (val && typeof val === 'object' && typeof val.formula === 'string') {
          totalFormulas++;
          assert.ok(!val.formula.startsWith('='), `Лист ${ws.name} ${cell.address}: лишний знак '='`);
          assert.ok(!val.formula.includes('#REF!'), `Лист ${ws.name} ${cell.address}: битая ссылка #REF!`);
          assert.ok(!val.formula.includes('#VALUE!'), `Лист ${ws.name} ${cell.address}: ошибка #VALUE!`);
          assert.ok(!val.formula.includes('#NAME?'), `Лист ${ws.name} ${cell.address}: ошибка #NAME?`);
          assert.ok(!val.formula.includes('TEXT('), `Лист ${ws.name} ${cell.address}: локалезависимая функция TEXT() вызывает #ЗНАЧ!: ${val.formula}`);
          assert.ok(!val.formula.includes('XLOOKUP'), `Лист ${ws.name} ${cell.address}: несовместимая XLOOKUP`);
          assert.ok(!val.formula.includes('Окна_и_Двери'), `Лист ${ws.name} ${cell.address}: устаревшая ссылка на двери`);
          if (val.formula.includes("MATCH(") && val.formula.includes("'Справ_Таблица_Е1'!$A$2:$A$532,1)")) {
            interpolationFormulaCount++;
          }
          if (ws.name === 'AutoCAD_Графики' && val.formula.includes('SUBSTITUTE(ROUND(')) {
            autocadSubstituteCount++;
          }
        }
      });
    });
  }
  assert.ok(totalFormulas > 1000, `Ожидалось > 1000 живых формул, найдено ${totalFormulas}`);
  assert.ok(
    interpolationFormulaCount >= 20,
    `Ожидалось >= 20 формул линейной интерполяции E(t), найдено ${interpolationFormulaCount}`
  );
  assert.ok(
    autocadSubstituteCount >= 60,
    `Ожидалось >= 60 формул AutoCAD SUBSTITUTE(ROUND(...)), найдено ${autocadSubstituteCount}`
  );

  // 7. Проверяем наличие 4 нативных графиков Шибеко в OOXML архиве (.xlsx)
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file('xl/drawings/drawing1.xml'), 'Отсутствует xl/drawings/drawing1.xml');
  assert.ok(zip.file('xl/drawings/_rels/drawing1.xml.rels'), 'Отсутствует xl/drawings/_rels/drawing1.xml.rels');
  for (let i = 1; i <= 4; i++) {
    const chartFile = zip.file(`xl/charts/chart${i}.xml`);
    assert.ok(chartFile, `Отсутствует нативный график xl/charts/chart${i}.xml`);
    const chartXml = await chartFile.async('string');
    assert.ok(chartXml.includes('<c:scatterChart>'), `chart${i}.xml должен содержать scatterChart`);
    assert.ok(chartXml.includes("'Графики_Шибеко'!"), `chart${i}.xml должен ссылаться на лист Графики_Шибеко`);
  }
  const contentTypes = await zip.file('[Content_Types].xml')!.async('string');
  assert.ok(contentTypes.includes('/xl/drawings/drawing1.xml'));
  assert.ok(contentTypes.includes('/xl/charts/chart1.xml'));
  assert.ok(contentTypes.includes('/xl/charts/chart4.xml'));
});

test('Точные табличные значения Приложения Е (Шибеко 2018, стр. 97–99) без формульной погрешности', () => {
  assert.equal(getSaturatedVaporPressure(15.5), 1761.1);
  assert.equal(getSaturatedVaporPressure(17.5), 2000.2);
  assert.equal(getSaturatedVaporPressure(18.0), 2064.3);
  assert.equal(getSaturatedVaporPressure(7.6), 1044.0);
  assert.equal(getSaturatedVaporPressure(-0.4), 591.3);
  // Интерполяция между 17.1 (1950.2) и 17.2 (1962.7): 1950.2 + 0.9 * 12.5 = 1961.45 -> 1961.5
  assert.equal(getSaturatedVaporPressure(17.19), 1961.5);
});

test('Стационарный расчет температуры внутренней поверхности τв без коэффициента неравномерности m', () => {
  // Эталонный пример из отчета пользователя (С13, Административное, Гродно):
  // Стационарная температура без m: τв = 18 - (18 - (-22)) / (5.975 * 8.7) = 17.23 °C
  const pdfCalc = calculateCoursework(PDF_REFERENCE_CIPHER);
  assert.equal(pdfCalc.wall.heatingIrregularity_m, 0);
  assert.equal(pdfCalc.wall.tau_v_steady, 17.23);
  assert.equal(pdfCalc.wall.tau_v_min, 17.23);

  // Покрытие П9 в Верхнедвинске (D_пуст = 3.05 -> t_н = t_х.с(0.92) = -26°C по табл. 6.3 и стр. 18 PDF):
  // τв по пустоте = 17.26 °C, по ребру (худшему сечению) = 17.25 °C (строго холоднее пустоты!)
  assert.equal(pdfCalc.roof.thermalInertia_D, 3.05);
  assert.equal(pdfCalc.roof.design_t_out, -26);
  assert.equal(pdfCalc.roof.voidSection.tau_v_steady, 17.26);
  assert.equal(pdfCalc.roof.worstSection.tau_v_steady, 17.25);
  assert.ok(pdfCalc.roof.worstSection.tau_v_steady <= pdfCalc.roof.voidSection.tau_v_steady);

  // Отдельный хелпер с явным m=0.1 сохраняет корректную математику формулы 5.1 при вызове напрямую
  const yInfo = calculateSurfaceHeatAssimilation([
    { R_exact: 1.93 / 19.7, s: 19.7, D_exact: 1.93 },
  ]);
  assert.equal(yInfo.caseUsed, 'a');
  assert.equal(yInfo.Y_v, 19.7);
  const shibekoTemp = calculateShibekoMinSurfaceTemp(18, -30, 3.34, 8.7, yInfo.Y_v, 0.1);
  assert.equal(shibekoTemp.tau_v_min, 16.28);
});

test('Точный расчет парциальных давлений e(x) по слоям с учетом R_п.возд = 0 (СП 2.04.01-2020 п. 10.5)', () => {
  const pdfCalc = calculateCoursework(PDF_REFERENCE_CIPHER);
  // e_в = 0.50 * 2064.3 = 1032.15 Па
  assert.equal(pdfCalc.internalConditions.E_v, 2064.3);
  assert.equal(pdfCalc.internalConditions.e_v, 1032.15);

  // Точки по пустоте покрытия П9 (от внутренней до наружной поверхности, 8 точек)
  const roofVoidSurface = extractSurfaceProfilePoints(pdfCalc.roof.voidSection.crossSectionProfile);
  assert.equal(roofVoidSurface.length, 8);
  const actualPartials = roofVoidSurface.map((p) => p.e);
  // Через замкнутую воздушную прослойку пустотной плиты (между инд. 2 и 3) R_п.возд = 0 => падение e = 0
  assert.equal(
    actualPartials[2],
    actualPartials[3],
    'По СП 2.04.01-2020 п. 10.5 сопротивление паропроницанию воздушной прослойки равно 0 (e не падает)'
  );
  for (let i = 1; i < actualPartials.length; i++) {
    assert.ok(
      actualPartials[i] <= actualPartials[i - 1],
      `Точка ${i + 1}: парциальное давление e(x) должно не возрастать (${actualPartials[i]} <= ${actualPartials[i - 1]})`
    );
  }
  assert.ok(actualPartials[0] < pdfCalc.internalConditions.e_v);
  assert.ok(actualPartials[actualPartials.length - 1] > 490 && actualPartials[actualPartials.length - 1] < 495);

  // Внутренний и наружный воздух присутствуют в полном профиле стены и покрытия
  const wallFull = pdfCalc.wall.crossSectionProfile;
  assert.equal(wallFull[0].temp_winter, pdfCalc.internalConditions.t_v);
  assert.equal(wallFull[0].E_sat, pdfCalc.internalConditions.E_v);
  assert.equal(wallFull[0].e_partial, pdfCalc.internalConditions.e_v);
  assert.equal(wallFull[wallFull.length - 1].temp_winter, pdfCalc.wall.design_t_out);
  assert.equal(wallFull[wallFull.length - 1].temp_heating, pdfCalc.climate.t_heating_period);

  // В стене С13 также сохраняется точность до сотых и монотонное убывание e(x)
  const wallSurface = extractSurfaceProfilePoints(pdfCalc.wall.crossSectionProfile);
  assert.ok(wallSurface.length >= 6);
  for (let i = 1; i < wallSurface.length; i++) {
    assert.ok(wallSurface[i].e <= wallSurface[i - 1].e, 'Парциальное давление e(x) должно убывать к наружной поверхности');
  }
});

test('Калькулятор координат AutoCAD (ПОЛИЛИНИЯ и МАССИВПРЯМОУГ) совпадает с проверочными значениями методики', () => {
  // Проверочный пример из гр в авт.pdf (Покрытие П9, H=500, t:-2..19, E:300..2200)
  const pdfPoints = [
    { index: 1, planeName: 'Внутренняя поверхность', xMm: 0, t: 17.69, E: 2025.7, e: 1031.71 },
    { index: 8, planeName: 'Наружная поверхность', xMm: 470, t: -0.28, E: 596.2, e: 491.01 },
  ];
  const ac = buildAutoCadCoordinates(pdfPoints, {
    frameHeightMm: 500,
    tMin: -2,
    tMax: 19,
    eMin: 300,
    eMax: 2200,
  });

  assert.equal(ac.frameWidthMm, 470);
  assert.equal(ac.rows[0].coordT, '0,468.81');
  assert.equal(ac.rows[0].coordE, '0,454.13');
  assert.equal(ac.rows[0].coord_e, '0,192.56');
  assert.equal(ac.rows[1].coordT, '470,40.95');
  assert.equal(ac.rows[1].coordE, '470,77.95');
  assert.equal(ac.rows[1].coord_e, '470,50.27');

  // Шаг засечек МАССИВПРЯМОУГ: 500 / 21 = 23.81 мм (22 строки), 500 / 19 = 26.32 мм (20 строк)
  assert.equal(ac.tTickSpacingMm, 23.81);
  assert.equal(ac.tTickCount, 22);
  assert.equal(ac.eTickSpacingMm, 26.32);
  assert.equal(ac.eTickCount, 20);

  // Пресет H = 210 мм (1 см = 1°C, 1 см = 100 Па)
  const compact = buildAutoCadCoordinates(pdfPoints, {
    frameHeightMm: 210,
    tMin: -2,
    tMax: 19,
    eMin: 300,
    eMax: 2400,
  });
  assert.equal(compact.tTickSpacingMm, 10);
  assert.equal(compact.eTickSpacingMm, 10);
});

test('Проверка соответствия требуемому Rт по последним нормам (СН 2.04.02-2020 табл. 7.1) и генерация предупреждений', () => {
  // 1. Для исправных вариантов предупреждений быть не должно
  const okPdf = calculateCoursework(PDF_REFERENCE_CIPHER);
  assert.equal(okPdf.normativeChecks.length, 4);
  assert.equal(okPdf.normativeWarnings.length, 0);
  assert.equal(okPdf.summary.totalCompliance, true);

  // 2. Заниженная толщина утеплителя стены, покрытия, ПТП и слабое окно О35 вызывают 4 предупреждения
  const failing = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    windowCode: 'О35', // R_actual = 0.95 < 1.00 для административного здания
    overrides: {
      ...PDF_REFERENCE_CIPHER.overrides,
      wallInsulationThickness: 0.08,
      roofInsulationThickness: 0.08,
      basementInsulationThickness: 0.01,
    },
  });
  assert.equal(failing.summary.totalCompliance, false);
  assert.equal(failing.wall.isRCompliant, false);
  assert.equal(failing.roof.isRCompliant, false);
  assert.equal(failing.basement.isRCompliant, false);
  assert.equal(failing.window.isCompliant, false);
  assert.equal(failing.normativeWarnings.length, 4);
  for (const warn of failing.normativeWarnings) {
    assert.equal(warn.isRCompliant, false);
    assert.ok(warn.deficit > 0, `Ожидался положительный дефицит Rт для ${warn.id}`);
    assert.ok(warn.warningMessage && warn.warningMessage.length > 10);
    assert.ok(warn.recommendation && warn.recommendation.length > 10);
  }

  // 3. Для производственного здания (СН 2.04.02-2020 табл. 7.1: Rнорм.стена = 2.0, Rнорм.покр = 3.0, Rнорм.окно = 0.6)
  // окно О35 (R = 0.95) проходит норматив!
  const industrial = calculateCoursework({
    ...DEFAULT_CIPHER,
    buildingType: 'Производственное',
    buildingTypeId: 'industrial',
    windowCode: 'О35',
  });
  assert.equal(industrial.wall.R_norm_latest, 2.0);
  assert.equal(industrial.roof.R_norm_latest, 3.0);
  assert.equal(industrial.window.R_norm, 0.6);
  assert.equal(industrial.window.isCompliant, true);
  assert.equal(industrial.normativeWarnings.length, 0);
});

test('Полный справочник материалов СП 2.04.01-2020 (Табл. Д.1) и проверка всех 8 категорий', () => {
  const allMaterials = Object.values(MATERIALS);
  assert.ok(
    allMaterials.length >= 120,
    `Ожидалось >= 120 материалов СП 2.04.01-2020, найдено ${allMaterials.length}`
  );
  for (const cat of MATERIAL_CATEGORY_ORDER) {
    const count = allMaterials.filter((m) => m.category === cat).length;
    assert.ok(count >= 4, `В категории ${cat} должно быть минимум 4 материала, найдено ${count}`);
  }
  for (const m of allMaterials) {
    assert.ok(m.lambda_A > 0 && m.lambda_B > 0, `Нулевая λ для ${m.id}`);
    assert.ok(m.s_A > 0 && m.s_B > 0, `Нулевая s для ${m.id}`);
    assert.ok(m.density > 0 && m.heatCapacity > 0, `Некорректная ρ/c для ${m.id}`);
  }
});

test('Исправление слоев наружных стен С6–С10 (схема «б»: 4-1-2-3-4 с двумя слоями штукатурки) и экспорт С8 в Excel', async () => {
  for (const code of ['С6', 'С7', 'С8', 'С9', 'С10']) {
    const def = WALL_CONSTRUCTIONS[code];
    assert.equal(def.type, 'б', `${code} должна иметь схему «б»`);
    assert.equal(def.layers.length, 5, `${code} должна содержать 5 слоев (2 штукатурки + 2 кладки + утеплитель)`);
    assert.equal(def.layers[0].materialId, 'cement_sand_mortar_1800', `${code}: 1-й слой — внутр. штукатурка`);
    assert.equal(def.layers[0].thickness, 0.01);
    assert.equal(def.layers[2].isInsulation, true, `${code}: 3-й слой — утеплитель`);
    assert.equal(def.layers[4].materialId, 'cement_sand_mortar_1800', `${code}: 5-й слой — нар. штукатурка`);
    assert.equal(def.layers[4].thickness, 0.01);
  }

  // Полный расчет и экспорт Excel для С8 (5 слоев + точка в середине утеплителя = 7 активных точек)
  const calcC8 = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    wallCode: 'С8',
  });
  assert.equal(calcC8.wall.layers.length, 5);
  assert.equal(calcC8.wall.layers[0].thickness, 0.01);
  assert.equal(calcC8.wall.layers[4].thickness, 0.01);
  const surfacePts = extractSurfaceProfilePoints(calcC8.wall.crossSectionProfile);
  assert.equal(surfacePts.length, 7);

  const buf = await buildCourseworkXlsxBuffer(calcC8);
  assert.ok(buf.byteLength > 30000);
});

test('Выбор расчетной зимней температуры t_н по Таблице 6.3 СП 2.04.01-2020 (все 4 интервала D + ручные режимы)', () => {
  const g15 = CITIES_DATA['Г15']; // Верхнедвинск: t_х.с(0.98)=-28, t_х.с(0.92)=-26, t_х.5(0.92)=-22 -> t_х.3(0.92)=-24
  assert.equal(g15.t_coldest_day_098, -28);
  assert.equal(g15.t_coldest_day_092, -26);
  assert.equal(g15.t_coldest_5days_092, -22);

  assert.equal(selectDesignWinterTemp(1.2, g15).t_n, -28);
  assert.equal(selectDesignWinterTemp(1.5, g15).t_n, -28);
  assert.equal(selectDesignWinterTemp(3.05, g15).t_n, -26);
  assert.equal(selectDesignWinterTemp(4.0, g15).t_n, -26);
  assert.equal(selectDesignWinterTemp(5.5, g15).t_n, -24);
  assert.equal(selectDesignWinterTemp(7.0, g15).t_n, -24);
  assert.equal(selectDesignWinterTemp(7.67, g15).t_n, -22);

  // Ручные режимы
  assert.equal(selectDesignWinterTemp(8.0, g15, 't_coldest_day_098').t_n, -28);
  assert.equal(selectDesignWinterTemp(8.0, g15, 't_coldest_day_092').t_n, -26);
  assert.equal(selectDesignWinterTemp(8.0, g15, 't_coldest_3days').t_n, -24);
  assert.equal(selectDesignWinterTemp(1.0, g15, 't_coldest_5days').t_n, -22);
  assert.equal(selectDesignWinterTemp(8.0, g15, 'custom', -28.5).t_n, -28.5);
});

test('Динамический расчет Eв(tв) по температуре помещения и пароизоляция ILMAX (ilmax 4630, ilmax tezer V)', async () => {
  // 1. Расчет Eв по температуре помещения (18°C, 21°C, 27°C)
  const c18 = calculateCoursework({ ...DEFAULT_CIPHER, overrides: { t_indoor: 18, phi_indoor: 55 } });
  assert.equal(c18.internalConditions.E_v, 2064.3);
  assert.equal(c18.internalConditions.e_v, +(2064.3 * 0.55).toFixed(2));

  const c21 = calculateCoursework({ ...DEFAULT_CIPHER, buildingType: 'Детский сад', buildingTypeId: 'kindergarten', overrides: {} });
  assert.equal(c21.internalConditions.t_v, 21);
  assert.equal(c21.internalConditions.E_v, 2487.7);
  assert.equal(c21.internalConditions.e_v, +(2487.7 * (c21.internalConditions.phi_v / 100)).toFixed(2));

  const c27 = calculateCoursework({ ...DEFAULT_CIPHER, buildingType: 'Влажное / Бассейн', buildingTypeId: 'wet_industrial', overrides: {} });
  assert.equal(c27.internalConditions.t_v, 27);
  assert.equal(c27.internalConditions.E_v, 3564.9);

  // 2. Пароизоляция ILMAX
  assert.equal(calculateVaporBarrierRp('ilmax_4630', 1.0), 3.0);
  assert.equal(calculateVaporBarrierRp('ilmax_4630', 1.5), 4.5);
  assert.equal(calculateVaporBarrierRp('ilmax_tezer_v', 3.0), 2.0);
  assert.ok(MATERIALS['ilmax_4630'], 'ilmax_4630 должен присутствовать в MATERIALS');
  assert.ok(MATERIALS['ilmax_tezer_v'], 'ilmax_tezer_v должен присутствовать в MATERIALS');

  const withIlmaxWall = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    overrides: {
      ...PDF_REFERENCE_CIPHER.overrides,
      wallVaporBarrier: { materialId: 'ilmax_4630', thicknessMm: 1.0 },
    },
  });
  assert.equal(withIlmaxWall.wall.vaporBarrier?.R_p, 3.0);

  // 3. Проверка Excel: строки Воздух вн./нар., пояснение t_зима/t_от.пер, R_п.возд = 0, наличие ILMAX и валидность AutoCAD_Графики
  const wb = await buildCourseworkWorkbook(withIlmaxWall);
  const wallWs = wb.getWorksheet('Стена_Расчет')!;
  assert.ok(String(wallWs.getCell('A25').value).includes('t_зима') && String(wallWs.getCell('A25').value).includes('t_от.пер'));
  assert.equal(wallWs.getCell('A27').value, 'Воздух вн.');
  assert.equal(wallWs.getCell('A45').value, 'Воздух нар.');

  const roofWs = wb.getWorksheet('Покрытие_Расчет')!;
  assert.ok(String(roofWs.getCell('A31').value).includes('t_зима') && String(roofWs.getCell('A31').value).includes('t_от.пер'));
  assert.equal(roofWs.getCell('A33').value, 'Воздух вн.');
  assert.equal(roofWs.getCell('A47').value, 'Воздух нар.');
  assert.equal(roofWs.getCell('A51').value, 'Воздух вн.');
  assert.equal(roofWs.getCell('A62').value, 'Воздух нар.');
  const roofRpTotalFormula = (roofWs.getCell('C24').value as { formula?: string })?.formula || '';
  assert.ok(!roofRpTotalFormula.includes('$C$7'), `R_п.возд должно быть 0 (без +$C$7): ${roofRpTotalFormula}`);
  assert.ok(
    roofRpTotalFormula.includes('$J$7') && roofRpTotalFormula.includes('$J$13') && roofRpTotalFormula.includes('$K$15'),
    `R_п покрытия должно учитывать полки плиты K15 и слои J7..J13: ${roofRpTotalFormula}`
  );
  const roofRpRibFormula = (roofWs.getCell('C25').value as { formula?: string })?.formula || '';
  assert.ok(roofRpRibFormula.includes('$H$15') && roofRpRibFormula.includes('$J$13'), `R_п по ребру должно учитывать полную толщину плиты $H$15: ${roofRpRibFormula}`);

  const vbWs = wb.getWorksheet('Справ_Пароизоляция')!;
  const vbNames: string[] = [];
  vbWs.eachRow((row, idx) => {
    if (idx >= 2) vbNames.push(String(row.getCell(1).value));
  });
  assert.ok(vbNames.some((n) => n.includes('ilmax 4630')), 'В Справ_Пароизоляция должна быть ilmax 4630');
  assert.ok(vbNames.some((n) => n.includes('ilmax tezer V')), 'В Справ_Пароизоляция должна быть ilmax tezer V');

  const acWs = wb.getWorksheet('AutoCAD_Графики')!;
  assert.ok(String(acWs.getCell('A46').value).includes('ПОШАГОВАЯ ИНСТРУКЦИЯ'));
  assert.ok(String(acWs.getCell('A47').value).includes('Шаг 1'));
  assert.ok(String(acWs.getCell('A52').value).includes('Шаг 6'));
});

test('Редактирование параметров любой выбранной пароизоляции (стена, покрытие, подполье) немедленно пересчитывает Rп и корректно экспортируется в Excel', async () => {
  const edited = calculateCoursework({
    ...PDF_REFERENCE_CIPHER,
    overrides: {
      ...PDF_REFERENCE_CIPHER.overrides,
      wallVaporBarrier: {
        materialId: 'pe_film_1',
        thicknessMm: 0.2,
        custom: {
          name: 'ПЭ пленка (усиленная)',
          thicknessMm: 0.2,
          inputMode: 'rp',
          R_p: 9.5,
          lambda: 0.25,
          s: 3.1,
          density: 950,
        },
      },
      roofVaporBarrier: {
        materialId: 'ilmax_4630',
        thicknessMm: 2.0,
        custom: {
          name: 'ilmax 4630 (пароизоляционный клей)',
          thicknessMm: 2.0,
          inputMode: 'mu',
          R_p: 4.0,
          mu: 0.0005, // Rп = (2.0 / 1000) / 0.0005 = 4.0
        },
      },
      basementVaporBarrier: {
        materialId: 'ruberoid',
        thicknessMm: 3.0,
        custom: {
          name: 'Рубероид (усиленный)',
          thicknessMm: 3.0,
          inputMode: 'rp',
          R_p: 3.5,
        },
      },
    },
  });

  // 1. Стена: пользовательское Rп = 9.5, флаг isCustom = true
  assert.ok(edited.wall.vaporBarrier);
  assert.equal(edited.wall.vaporBarrier.isCustom, true);
  assert.equal(edited.wall.vaporBarrier.R_p, 9.5);
  assert.equal(edited.wall.vaporBarrier.name, 'ПЭ пленка (усиленная)');
  assert.equal(edited.wall.vaporBarrier.lambda, 0.25);

  // 2. Покрытие: расчет через custom.mu -> Rп = 0.002 / 0.0005 = 4.0
  assert.ok(edited.roof.vaporBarrier);
  assert.equal(edited.roof.vaporBarrier.isCustom, true);
  assert.equal(edited.roof.vaporBarrier.R_p, 4.0);
  assert.equal(edited.roof.vaporBarrier.mu, 0.0005);

  // 3. Подполье: опциональная пароизоляция увеличивает Rп перекрытия
  const withoutBasementVb = calculateCoursework(PDF_REFERENCE_CIPHER);
  assert.equal(withoutBasementVb.basement.vaporBarrier, null);
  assert.ok(edited.basement.vaporBarrier);
  assert.equal(edited.basement.vaporBarrier.isCustom, true);
  assert.equal(edited.basement.vaporBarrier.R_p, 3.5);
  assert.ok(
    edited.basement.total_R_p >= withoutBasementVb.basement.total_R_p + 3.45,
    `R_п подполья должно вырасти на ~3.5 (${edited.basement.total_R_p} vs ${withoutBasementVb.basement.total_R_p})`
  );

  // 4. Экспорт в Excel: в Справ_Пароизоляция нет коллизий имен с каталогом
  const wb = await buildCourseworkWorkbook(edited);
  const vbWs = wb.getWorksheet('Справ_Пароизоляция')!;
  const inputWs = wb.getWorksheet('Ввод_и_Итоги')!;
  const names: string[] = [];
  for (let r = 2; r <= 20; r++) {
    names.push(String(vbWs.getCell(`A${r}`).value));
  }
  assert.equal(new Set(names).size, names.length, 'Имена в Справ_Пароизоляция должны быть уникальны без коллизий');
  const wallVbSelected = String(inputWs.getCell('C17').value);
  const roofVbSelected = String(inputWs.getCell('C19').value);
  assert.ok(names.includes(wallVbSelected), `Выбранная ПИ стены (${wallVbSelected}) должна присутствовать в Справ_Пароизоляция`);
  assert.ok(names.includes(roofVbSelected), `Выбранная ПИ покрытия (${roofVbSelected}) должна присутствовать в Справ_Пароизоляция`);
});

test('Rп покрытия (пустота vs ребро), Rп подполья, точное E_п(t_п) и синхронизация листов Excel Покрытие_Расчет / Подполье_ПТП', async () => {
  const calc = calculateCoursework(DEFAULT_CIPHER);

  // 1. Покрытие: Rп по ребру > Rп по пустоте (бетон на всю высоту h > 2*δ_ф, R_п.возд = 0)
  assert.ok(calc.roof.total_R_p_rib > calc.roof.total_R_p_void);
  assert.ok(
    calc.roof.total_R_p === calc.roof.total_R_p_void || calc.roof.total_R_p === calc.roof.total_R_p_rib,
    `calc.roof.total_R_p (${calc.roof.total_R_p}) должен совпадать с Rп по пустоте (${calc.roof.total_R_p_void}) или по ребру (${calc.roof.total_R_p_rib})`
  );
  // Для активного сечения по ребру Rп плиты = h / μ, для сечения по пустоте = 2 * ((h-d)/2) / μ (R_п.возд = 0)
  const slabLayerRib = calc.roof.layers.find((l) => l.name.includes('Многопустотная ж/б плита'));
  assert.ok(slabLayerRib);
  const expectedRibSlabRp = +((calc.roof.hollowCore.height / 1000) / slabLayerRib.mu).toFixed(3);
  assert.equal(slabLayerRib.R_p, expectedRibSlabRp);

  const calcVoid = calculateCoursework({
    ...DEFAULT_CIPHER,
    overrides: { ...DEFAULT_CIPHER.overrides, roofCrossSectionMode: 'void' },
  });
  const slabLayerVoid = calcVoid.roof.layers.find((l) => l.name.includes('Многопустотная ж/б плита'));
  assert.ok(slabLayerVoid);
  const flangeActualM = (calcVoid.roof.hollowCore.height - calcVoid.roof.hollowCore.voidDiameter) / 2 / 1000;
  const expectedVoidSlabRp = +((2 * flangeActualM) / slabLayerVoid.mu).toFixed(3);
  assert.equal(slabLayerVoid.R_p, expectedVoidSlabRp);
  assert.equal(calcVoid.roof.total_R_p, calcVoid.roof.total_R_p_void);

  // 2. Подполье: R_п.ПТП > 0, E_p вычисляется точно через getSaturatedVaporPressure(t_p), без хардкода 1127 Па
  assert.ok(calc.basement.total_R_p > 0.5);
  assert.equal(calc.basement.E_p, getSaturatedVaporPressure(calc.basement.crawlSpaceTemp_t_p));
  assert.equal(calc.basement.e_p, +(calc.basement.E_p * (calc.basement.crawlSpaceRH / 100)).toFixed(2));
  // Точка середины утеплителя должна иметь координату внутри слоя утеплителя, а не бетонной плиты
  const midPt = calc.basement.crossSectionProfile.find((p) => p.isInsulationMidpoint);
  assert.ok(midPt);
  assert.ok(midPt.planeName.includes('утепл'));

  // 3. Проверка единого формата таблицы слоев Покрытие_Расчет (как Стена_Расчет) и R_п.ПТП в Подполье_ПТП
  const wb = await buildCourseworkWorkbook(calc);
  const wallWs = wb.getWorksheet('Стена_Расчет')!;
  const roofWs = wb.getWorksheet('Покрытие_Расчет')!;
  for (let col = 1; col <= 11; col++) {
    assert.equal(
      roofWs.getCell(6, col).value,
      wallWs.getCell(6, col).value,
      `Заголовок столбца ${col} в Покрытие_Расчет должен совпадать со Стена_Расчет`
    );
  }
  assert.equal(roofWs.getCell('C9').value, 'ПЛИТА');
  assert.equal(roofWs.getCell('C10').value, 'INSULATION');

  const baseWs = wb.getWorksheet('Подполье_ПТП')!;
  assert.equal(baseWs.getCell('I6').value, 'R_п.i');
  const baseRpFormula = (baseWs.getCell('C17').value as { formula?: string })?.formula || '';
  assert.ok(baseRpFormula.includes('SUM(I7:I12)'), `Подполье_ПТП!C17 должна считать R_п.ПТП: ${baseRpFormula}`);
});




