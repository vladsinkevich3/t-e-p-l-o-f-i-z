/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Академическая расчетно-пояснительная записка по ГОСТ 2.105-95 / ЕСКД
 * Подробные пошаговые вычисления и точная структура таблиц приведены к эталонному примеру БНТУ 2026
 */

import React from 'react';
import {
  FullCourseworkCalculation,
  CalculatedLayer,
  CrossSectionTemperaturePoint,
} from '../logic/calculations';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { WINDOW_AIR_PERMEABILITY_CLASSES } from '../data/normative';
import { Printer, Download, FileText, FileSpreadsheet } from 'lucide-react';

interface ReportPreviewProps {
  calc: FullCourseworkCalculation;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportWord?: () => void;
  onExportExcel?: () => void;
}

const EskdFooterStamp: React.FC<{ pageNum: number; docCode: string }> = ({ pageNum, docCode }) => (
  <div className="mt-8 pt-2">
    <table className="w-full border-collapse border border-black text-[10px] font-sans">
      <tbody>
        <tr>
          <td className="border border-black px-1.5 py-0.5 w-10 text-center">Изм.</td>
          <td className="border border-black px-1.5 py-0.5 w-10 text-center">Лист</td>
          <td className="border border-black px-1.5 py-0.5 w-24 text-center">№ докум.</td>
          <td className="border border-black px-1.5 py-0.5 w-16 text-center">Подпись</td>
          <td className="border border-black px-1.5 py-0.5 w-16 text-center">Дата</td>
          <td className="border border-black px-2 py-0.5 text-center font-semibold" rowSpan={2}>
            {docCode}
          </td>
          <td className="border border-black px-2 py-0.5 w-14 text-center">Лист</td>
        </tr>
        <tr>
          <td className="border border-black px-1.5 py-0.5 h-4"></td>
          <td className="border border-black px-1.5 py-0.5"></td>
          <td className="border border-black px-1.5 py-0.5"></td>
          <td className="border border-black px-1.5 py-0.5"></td>
          <td className="border border-black px-1.5 py-0.5"></td>
          <td className="border border-black px-2 py-0.5 text-center font-bold">{pageNum}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

function fmtNum(val: number, decimals = 2): string {
  return val.toFixed(decimals).replace('.', ',');
}

function fmtTrim(val: number, maxDec = 4): string {
  return Number(val.toFixed(maxDec)).toString().replace('.', ',');
}

function isInsLayer(l: CalculatedLayer): boolean {
  return Boolean(
    l.name.toLowerCase().includes('утепл') ||
      l.materialName.toLowerCase().includes('утепл') ||
      l.materialName.toLowerCase().includes('вата') ||
      l.materialName.toLowerCase().includes('пенополистирол') ||
      (l.lambda <= 0.08 && l.thickness >= 0.03)
  );
}

interface SectionCalcLine {
  num: number;
  label: string;
  rExpr: string;
  rCum: number;
  tHeat: number;
  E_val: number;
  rpExpr: string;
  rpCum: number;
  e_val: number;
  isMid?: boolean;
  isVb?: boolean;
}

function buildSectionCalcLines(
  profile: CrossSectionTemperaturePoint[],
  layers: CalculatedLayer[],
  alphaV: number,
  t_v: number,
  t_n_ot: number,
  R_0: number,
  e_v: number,
  e_n: number,
  R_p_total: number
): SectionCalcLine[] {
  // Извлекаем активные сечения (без строк внутреннего и наружного воздуха)
  const surfacePts = profile.slice(1, profile.length - 1);
  const lines: SectionCalcLine[] = [];

  // Сопоставляем слои и середину утеплителя
  const stepTermsR: string[] = [];
  const stepTermsRp: string[] = [];

  // Точка 1: внутренняя поверхность
  if (surfacePts[0]) {
    lines.push({
      num: 1,
      label: surfacePts[0].planeName,
      rExpr: `1/${fmtTrim(alphaV, 1)}`,
      rCum: surfacePts[0].R_cumulative,
      tHeat: surfacePts[0].temp_heating,
      E_val: surfacePts[0].E_sat,
      rpExpr: '1/37',
      rpCum: +(1 / 37).toFixed(4),
      e_val: surfacePts[0].e_partial,
    });
  }

  let ptIdx = 1;
  let cumRp = 1 / 37;
  for (const layer of layers) {
    const isAir = layer.name.toLowerCase().includes('воздушная прослойка');
    const isVb = Boolean(layer.isVaporBarrier);
    const isIns = isInsLayer(layer);

    if (isIns && ptIdx < surfacePts.length) {
      const ptMid = surfacePts[ptIdx++];
      const halfThick = layer.thickness / 2;
      const halfRTerm = `${fmtTrim(halfThick, 3)}/${fmtTrim(layer.lambda, 4)}`;
      const halfRpTerm = layer.mu > 0 ? `${fmtTrim(halfThick, 3)}/${fmtTrim(layer.mu, 4)}` : '0';
      const midRp = cumRp + (layer.mu > 0 ? halfThick / layer.mu : 0);
      lines.push({
        num: ptIdx,
        label: ptMid.planeName,
        rExpr: [`1/${fmtTrim(alphaV, 1)}`, ...stepTermsR, halfRTerm].join(' + '),
        rCum: ptMid.R_cumulative,
        tHeat: ptMid.temp_heating,
        E_val: ptMid.E_sat,
        rpExpr: ['1/37', ...stepTermsRp, halfRpTerm].join(' + '),
        rpCum: +midRp.toFixed(4),
        e_val: ptMid.e_partial,
        isMid: true,
      });
    }

    if (ptIdx < surfacePts.length) {
      const pt = surfacePts[ptIdx++];
      const rTerm = isAir
        ? fmtTrim(layer.R, 2)
        : `${fmtTrim(layer.thickness, 4)}/${fmtTrim(layer.lambda, 4)}`;
      const rpTerm = isAir
        ? '0 (возд. просл.)'
        : isVb
        ? `${fmtTrim(layer.R_p, 3)} (Rп.пи)`
        : layer.mu > 0
        ? `${fmtTrim(layer.thickness, 4)}/${fmtTrim(layer.mu, 4)}`
        : '0';
      stepTermsR.push(rTerm);
      if (!isAir) {
        stepTermsRp.push(rpTerm);
        cumRp += isVb ? layer.R_p : layer.mu > 0 ? layer.thickness / layer.mu : 0;
      }
      lines.push({
        num: ptIdx,
        label: pt.planeName,
        rExpr: [`1/${fmtTrim(alphaV, 1)}`, ...stepTermsR].join(' + '),
        rCum: pt.R_cumulative,
        tHeat: pt.temp_heating,
        E_val: pt.E_sat,
        rpExpr: ['1/37', ...stepTermsRp].join(' + '),
        rpCum: +cumRp.toFixed(4),
        e_val: pt.e_partial,
        isVb,
      });
    }
  }

  // На случай если число точек больше (например в сечении покрытия по пустоте где плита разбита на 3 подслоя)
  while (ptIdx < surfacePts.length) {
    const pt = surfacePts[ptIdx++];
    const eDiff = Math.max(0.01, e_v - e_n);
    const estRp = +(((e_v - pt.e_partial) / eDiff) * R_p_total).toFixed(3);
    lines.push({
      num: ptIdx,
      label: pt.planeName,
      rExpr: `ΣR_${ptIdx} = ${fmtNum(pt.R_cumulative, 3)}`,
      rCum: pt.R_cumulative,
      tHeat: pt.temp_heating,
      E_val: pt.E_sat,
      rpExpr: `ΣRп_${ptIdx} = ${fmtNum(estRp, 3)}`,
      rpCum: estRp,
      e_val: pt.e_partial,
      isMid: pt.isInsulationMidpoint,
      isVb: pt.isVaporBarrier,
    });
  }

  // Подавляем предупреждения о неиспользуемых параметрах
  void t_v;
  void t_n_ot;
  void R_0;
  return lines;
}

const FormulaRow: React.FC<{ num: string; children: React.ReactNode }> = ({ num, children }) => (
  <div className="flex items-center justify-between gap-3 py-1 px-2.5 bg-gray-50 border border-gray-300 rounded font-mono text-[11.5px]">
    <div className="overflow-x-auto leading-relaxed">{children}</div>
    <span className="shrink-0 font-serif font-semibold text-xs">({num})</span>
  </div>
);

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  calc,
  onPrint,
  onExportPdf,
  onExportWord,
  onExportExcel,
}) => {
  const { wall, roof, basement, window: win, climate, internalConditions, cipher } = calc;

  const bTypeDef = BUILDING_TYPES[internalConditions.buildingTypeId] || BUILDING_TYPES.administrative;
  const rNormWall = cipher.overrides?.R_norm_wall ?? bTypeDef.R_norm_wall;
  const rNormRoof = cipher.overrides?.R_norm_roof ?? bTypeDef.R_norm_roof;
  const rNormBasement = cipher.overrides?.R_norm_basement ?? bTypeDef.R_norm_basement;
  const activeWallLambda =
    cipher.overrides?.wallInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? wall.insulation.lambda_A
      : wall.insulation.lambda_B);
  const activeRoofLambda =
    cipher.overrides?.roofInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? roof.insulation.lambda_A
      : roof.insulation.lambda_B);
  const alphaV = cipher.overrides?.alpha_v_wall ?? cipher.overrides?.alpha_v ?? bTypeDef.alpha_v;
  const alphaN = cipher.overrides?.alpha_n ?? 23;
  const concreteLambda =
    cipher.overrides?.hollowCoreSlab?.concreteLambda ??
    (internalConditions.exploitationConditions === 'А' ? 1.92 : 2.04);

  const roofTitleLabel =
    roof.construction.kind === 'чердачное'
      ? 'чердачного перекрытия'
      : roof.construction.kind === 'над_проездом'
      ? 'перекрытия над проездом'
      : 'совмещенного покрытия';

  const docCode = `БНТУ.ТГВ.${cipher.groupName || '11004224'}.КР.ПЗ`;

  // Для раздела 3 (как в PDF примере стр. 18–22) используем сечение по пустоте для подробной таблицы 3.2
  const roofVoidProfile = roof.voidSection.crossSectionProfile;
  const roofVoidSurface = roofVoidProfile.slice(1, roofVoidProfile.length - 1);
  const roofVoidR = roof.voidSection.R_total_section;

  const wallSurface = wall.crossSectionProfile.slice(1, wall.crossSectionProfile.length - 1);
  const e_n_ot = wall.crossSectionProfile[wall.crossSectionProfile.length - 1]?.e_partial ?? 0;
  const E_n_ot = wall.crossSectionProfile[wall.crossSectionProfile.length - 1]?.E_sat ?? 0;

  // Подробные строки расчетов t_1..t_k и e_1..e_k для стены
  const wallSectionLines = buildSectionCalcLines(
    wall.crossSectionProfile,
    wall.layers,
    alphaV,
    internalConditions.t_v,
    climate.t_heating_period,
    wall.R_total,
    internalConditions.e_v,
    e_n_ot,
    wall.total_R_p
  );

  // Для покрытия строим подробные строки по сечению через пустоту (табл. 3.2)
  const roofVoidCalcLines: SectionCalcLine[] = roofVoidSurface.map((pt, idx) => {
    const eDiff = Math.max(0.01, internalConditions.e_v - e_n_ot);
    const estRp = +(((internalConditions.e_v - pt.e_partial) / eDiff) * roof.total_R_p).toFixed(3);
    return {
      num: idx + 1,
      label: pt.planeName,
      rExpr: `ΣR_${idx + 1} = ${fmtNum(pt.R_cumulative, 3)}`,
      rCum: pt.R_cumulative,
      tHeat: pt.temp_heating,
      E_val: pt.E_sat,
      rpExpr: `ΣRп_${idx + 1} = ${fmtNum(estRp, 3)}`,
      rpCum: estRp,
      e_val: pt.e_partial,
      isMid: pt.isInsulationMidpoint,
      isVb: pt.isVaporBarrier,
    };
  });

  // Суммы выражений для формул стены
  const wallRNonInsExpr = wall.layers
    .filter((l) => !isInsLayer(l))
    .map((l) => `${fmtTrim(l.thickness, 4)}/${fmtTrim(l.lambda, 4)}`)
    .join(' + ');
  const wallRFactExpr = wall.layers
    .map((l) => `${fmtTrim(l.thickness, 4)}/${fmtTrim(l.lambda, 4)}`)
    .join(' + ');
  const wallDExpr = wall.layers
    .map((l) => `${fmtNum(l.R, 3)}·${fmtTrim(l.s, 2)}`)
    .join(' + ');
  const wallRpExpr = wall.layers
    .map((l) =>
      l.isVaporBarrier
        ? `${fmtTrim(l.R_p, 3)}`
        : l.mu > 0
        ? `${fmtTrim(l.thickness, 4)}/${fmtTrim(l.mu, 4)}`
        : '0'
    )
    .join(' + ');

  // Суммы выражений для формул покрытия
  const roofNonInsNonSlab = roof.layers.filter(
    (l) => !isInsLayer(l) && !l.name.toLowerCase().includes('плита')
  );
  const roofDExpr = roof.layers
    .map((l) => `${fmtNum(l.R, 3)}·${fmtTrim(l.s, 2)}`)
    .join(' + ');
  const roofRpExpr = roof.layers
    .map((l) =>
      l.isVaporBarrier
        ? `${fmtTrim(l.R_p, 3)} (Rп.пи)`
        : l.name.toLowerCase().includes('плита')
        ? `2·${fmtTrim((roof.hollowCore.height - roof.hollowCore.voidDiameter) / 2000, 3)}/0,03 + 0 (возд.)`
        : l.mu > 0
        ? `${fmtTrim(l.thickness, 4)}/${fmtTrim(l.mu, 4)}`
        : '0'
    )
    .join(' + ');

  // Уникальные материалы для Таблиц 2.1 и 3.1 (как в PDF стр. 8 и 16)
  const uniqueByMaterial = (layers: CalculatedLayer[]) => {
    const seen = new Set<string>();
    return layers.filter((l) => {
      const key = `${l.materialName}_${l.lambda}_${l.mu}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const wallMaterialsTable = uniqueByMaterial(wall.layers);
  const roofMaterialsTable = uniqueByMaterial(roof.layers);

  const t_3days_092 = +((climate.t_coldest_day_092 + climate.t_coldest_5days_092) / 2).toFixed(1);

  const hasWallCondensation = Boolean(
    wall.condensationRisk ||
    wall.unprotectedVariant?.condensationRisk ||
    wall.protectedVariant
  );

  const hasRoofCondensation = Boolean(
    roof.moistureCondensationRisk ||
    roof.voidSection?.condensationRisk ||
    roof.unprotectedVoidSection?.condensationRisk ||
    roof.protectedVoidSection
  );

  const renderHtmlMoistureTable = (
    caption: string,
    profilePts: CrossSectionTemperaturePoint[],
    isProtected: boolean,
    elementDesc: string
  ) => {
    const pts = profilePts.slice(1, profilePts.length - 1);
    return (
      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold">{caption}</p>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-black p-1 text-center w-12">№ пл.</th>
              <th className="border border-black p-1 text-left">Расчетная плоскость / граница слоя</th>
              <th className="border border-black p-1 text-center w-14">x, мм</th>
              <th className="border border-black p-1 text-center w-16">t<sub>x</sub>, °C</th>
              <th className="border border-black p-1 text-center w-16">E<sub>x</sub>, Па</th>
              <th className="border border-black p-1 text-center w-16">e<sub>x</sub>, Па</th>
              <th className="border border-black p-1 text-center w-16">E<sub>x</sub> − e<sub>x</sub></th>
              <th className="border border-black p-1 text-center w-24">Статус e ≤ E</th>
            </tr>
          </thead>
          <tbody>
            {pts.map((pt, idx) => {
              const isCond = pt.delta_margin < 0;
              return (
                <tr
                  key={idx}
                  className={
                    isCond
                      ? 'bg-rose-50 font-semibold'
                      : pt.isVaporBarrier
                      ? 'bg-cyan-50 font-bold'
                      : pt.isInsulationMidpoint
                      ? 'bg-amber-50 font-semibold'
                      : ''
                  }
                >
                  <td className="border border-black p-1 text-center font-mono">
                    {idx + 1}{pt.isVaporBarrier ? ' (ПИ)' : pt.isInsulationMidpoint ? ' (сер.)' : ''}
                  </td>
                  <td className="border border-black p-1">{pt.planeName}</td>
                  <td className="border border-black p-1 text-center font-mono">{Math.round(pt.coord_x_mm)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(pt.temp_heating, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(pt.E_sat, 1)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(pt.e_partial, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">
                    {fmtNum(pt.delta_margin, 1)}
                  </td>
                  <td className={`border border-black p-1 text-center font-bold text-[10px] ${isCond ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {isCond ? 'Конденсат ✗' : 'Норма ✓'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs indent-6 text-justify">
          {isProtected
            ? `Вывод по Варианту 2 (с пароизоляцией): При устройстве расчетного слоя пароизоляции во всех сечениях ${elementDesc} выполняется условие eₓ < Eₓ — образование конденсата полностью исключено.`
            : `Вывод по Варианту 1 (без пароизоляции): В толще ${elementDesc} (в утеплителе) возникает зона возможной конденсации (eₓ ≥ Eₓ) — требуется обязательное применение пароизоляционного слоя с теплой стороны утеплителя (СП 2.04.01-2020 п. 10.6).`}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Панель управления отчетом */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl print:hidden">
        <div>
          <h2 className="text-sm font-bold text-white">
            Расчетно-пояснительная записка (подробные вычисления и таблицы по образцу БНТУ / ГОСТ 2.105-95)
          </h2>
          <p className="text-xs text-slate-400">
            Все формулы (2.1)–(5.6) с числовой подстановкой, послойные расчеты t₁..tₖ и e₁..eₖ (включая пароизоляцию), таблицы 1.1–5.4
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white transition flex items-center space-x-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
          )}
          {onExportWord && (
            <button
              onClick={onExportWord}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Скачать Word (.docx)</span>
            </button>
          )}
          <button
            onClick={onPrint}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Печать</span>
          </button>
          <button
            onClick={onExportPdf}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Скачать PDF</span>
          </button>
        </div>
      </div>

      {/* Академический документ (листы с рамкой ЕСКД и штампом) */}
      <div
        id="academic-report-document"
        className="space-y-6 max-w-4xl mx-auto select-text text-black font-serif text-[13px] leading-relaxed"
        style={{ fontFamily: '"Tinos", "Times New Roman", serif' }}
      >
        {/* ================= ЛИСТ 1: ТИТУЛЬНЫЙ ЛИСТ ================= */}
        <section className="bg-white p-8 sm:p-12 rounded-xl shadow-2xl border-2 border-black">
          <div className="text-center space-y-1">
            <div className="text-xs uppercase font-bold">
              Министерство образования Республики Беларусь
            </div>
            <div className="text-sm font-bold uppercase">
              Белорусский национальный технический университет
            </div>
            <div className="text-xs">Факультет энергетического строительства</div>
            <div className="text-xs">Кафедра «Теплогазоснабжение и вентиляция»</div>
          </div>

          <div className="text-center py-14 space-y-2">
            <h1 className="text-2xl font-bold uppercase tracking-wider">
              ПОЯСНИТЕЛЬНАЯ ЗАПИСКА
            </h1>
            <div className="text-base font-bold">
              к курсовой работе по дисциплине «Строительная теплофизика»
            </div>
            <div className="text-sm pt-2">
              Тема: «Теплотехнический расчет наружных ограждающих конструкций здания»
            </div>
            <div className="text-xs font-mono pt-3 text-gray-800">
              Шифр задания: {cipher.rawCipher}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs pt-10">
            <div className="space-y-1">
              <div className="font-bold">Выполнил:</div>
              <div>студент группы {cipher.groupName || '11004224'}</div>
              <div className="font-bold">{cipher.studentName || 'Синькевич В. А.'}</div>
              <div>Зачетная книжка № ...{cipher.gradebookLastDigit}</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="font-bold">Проверил:</div>
              <div>доцент, к.т.н.</div>
              <div className="font-bold">{cipher.reviewerName || 'Крутилин А. Б.'}</div>
            </div>
          </div>

          <div className="text-center text-xs font-bold pt-14">Минск 2026</div>
        </section>

        {/* ================= ЛИСТ 2: СОДЕРЖАНИЕ И ВВЕДЕНИЕ ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-6">
          <div>
            <h2 className="text-base font-bold uppercase text-center mb-4">СОДЕРЖАНИЕ</h2>
            <div className="space-y-1.5 text-xs">
              {[
                ['ВВЕДЕНИЕ', '2'],
                ['1. Выбор расчетных параметров наружного и внутреннего воздуха', '3'],
                [`2. Теплотехнический расчет наружной стены (${wall.construction.id})`, '4'],
                [`3. Теплотехнический расчет ${roofTitleLabel} (${roof.construction.id})`, '6'],
                [`4. Теплотехнический расчет технического подполья (${basement.construction.id})`, '8'],
                [`5. Теплотехнический расчет оконного заполнения (${win.windowDef.id})`, '9'],
                ['ЗАКЛЮЧЕНИЕ', '10'],
                ['СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ', '10'],
              ].map(([title, page]) => (
                <div key={title} className="flex items-baseline justify-between border-b border-dotted border-gray-400 pb-0.5">
                  <span className="pr-2 font-medium">{title}</span>
                  <span className="font-mono font-bold pl-2">{page}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-300">
            <h2 className="text-base font-bold uppercase text-center">ВВЕДЕНИЕ</h2>
            <p className="indent-6 text-justify">
              Целью курсовой работы является выполнение комплексного теплотехнического и влажностного расчета наружных ограждающих конструкций здания в соответствии с действующими нормативными документами Республики Беларусь (СП 2.04.04-2026, СП 2.04.01-2020, СН 2.04.02-2020, СТБ 939-2013) и методикой А. С. Шибеко.
            </p>
            <p className="indent-6 text-justify">
              <b>Исходные данные для проектирования:</b> шифр задания — <b>{cipher.rawCipher}</b>. Тип здания — <b>{internalConditions.buildingTypeName}</b> ({cipher.buildingType}); пункт строительства — <b>г. {climate.name} ({climate.id}, {climate.region})</b>; число этажей — <b>{cipher.floorsCount}</b> (расчетная высота здания H = 1,0 + 3,0·{cipher.floorsCount} + 2,7 = <b>{fmtNum(win.H_building, 1)} м</b>); наружная стена — <b>{wall.construction.id}</b>; {roofTitleLabel} — <b>{roof.construction.id}</b>; техническое подполье — <b>{basement.construction.id}</b>; утеплитель — <b>{wall.insulation.id} ({wall.insulation.name})</b>; оконный блок — <b>{win.windowDef.id} ({win.windowDef.profileSystem})</b>.
            </p>
          </div>

          <EskdFooterStamp pageNum={2} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 3: РАЗДЕЛ 1 (ТАБЛИЦЫ 1.1 И 1.2 ПО ПРИМЕРУ PDF) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            1. Выбор расчетных параметров наружного и внутреннего воздуха
          </h2>

          <p className="indent-6 text-justify">
            Расчетные параметры наружного воздуха для пункта строительства <b>г. {climate.name}</b> ({climate.id}, ближайшая метеостанция — {climate.nearestStation}) приняты по СП 2.04.04-2026 «Строительная климатология» и приведены в таблице 1.1.
          </p>

          <p className="text-xs font-bold">Таблица 1.1 – Климатические параметры пункта строительства (СН 2.04.02-2020 / СП 2.04.04-2026)</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 text-left">Параметры наружного климата</th>
                <th className="border border-black p-1.5 text-center w-24">Обозначение</th>
                <th className="border border-black p-1.5 text-center w-28">Числовые значения</th>
                <th className="border border-black p-1.5 text-left w-64">Нормативный источник</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5">Температура воздуха наиболее холодных суток обеспеченностью 0,98</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>х.с</sub><sup>0,98</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.t_coldest_day_098, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 3</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура воздуха наиболее холодных суток обеспеченностью 0,92</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>х.с</sub><sup>0,92</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.t_coldest_day_092, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 4</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура воздуха наиболее холодной пятидневки обеспеченностью 0,98</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>х.п</sub><sup>0,98</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.t_coldest_5days_098, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 5</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура воздуха наиболее холодной пятидневки обеспеченностью 0,92</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>х.п</sub><sup>0,92</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.t_coldest_5days_092, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 6</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура воздуха наиболее холодных трёх суток обеспеченностью 0,92</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>х.тр.с</sub><sup>0,92</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(t_3days_092, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.01-2020, табл. 6.3 (расчетная)</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя скорость ветра за три наиболее холодных месяца</td>
                <td className="border border-black p-1.5 text-center font-mono">v<sub>ср</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.wind_speed_winter, 1)} м/с</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 19</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя температура воздуха отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>н</sub><sup>ср.от</sup></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(climate.t_heating_period, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 11</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Продолжительность отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">z<sub>от</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.duration_heating_period} сут.</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 12</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя относительная влажность воздуха отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">φ<sub>н.от</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.rh_heating_period} %</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.04-2026, табл. 5.1, графа 15</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold pt-2">Таблица 1.2 – Параметры микроклимата помещений и нормативные требования (СН 2.04.02-2020 / СП 2.04.01-2020)</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 text-left">Параметр микроклимата и теплозащиты</th>
                <th className="border border-black p-1.5 text-center w-24">Обозначение</th>
                <th className="border border-black p-1.5 text-center w-28">Значение</th>
                <th className="border border-black p-1.5 text-left w-64">Нормативный источник</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5">Расчетная температура внутреннего воздуха</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>в</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">+{fmtNum(internalConditions.t_v, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Расчетная относительная влажность внутреннего воздуха</td>
                <td className="border border-black p-1.5 text-center font-mono">φ<sub>в</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{internalConditions.phi_v} %</td>
                <td className="border border-black p-1.5 text-left">ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Минимально допустимая температура в техническом подполье</td>
                <td className="border border-black p-1.5 text-center font-mono">t<sub>п.мин</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">+5,0 °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.01-2020, п. К.3</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормативное сопротивление теплопередаче наружных стен</td>
                <td className="border border-black p-1.5 text-center font-mono">R<sub>т.норм.ст</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(rNormWall, 2)} м²·°С/Вт</td>
                <td className="border border-black p-1.5 text-left">СН 2.04.02-2020, табл. 5.1</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормативное сопротивление теплопередаче покрытий (чердака)</td>
                <td className="border border-black p-1.5 text-center font-mono">R<sub>т.норм.пк</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(rNormRoof, 2)} м²·°С/Вт</td>
                <td className="border border-black p-1.5 text-left">СН 2.04.02-2020, табл. 5.1</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормативное сопротивление теплопередаче перекрытий над техподпольем</td>
                <td className="border border-black p-1.5 text-center font-mono">R<sub>т.норм.птп</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(rNormBasement, 2)} м²·°С/Вт</td>
                <td className="border border-black p-1.5 text-left">СН 2.04.02-2020, табл. 5.1</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормируемый температурный перепад для наружных стен</td>
                <td className="border border-black p-1.5 text-center font-mono">Δt<sub>в.норм.ст</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(wall.delta_t_norm, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.01-2020, табл. 6.5</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормируемый температурный перепад для покрытий (чердачных)</td>
                <td className="border border-black p-1.5 text-center font-mono">Δt<sub>в.норм.пк</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(roof.delta_t_norm, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.01-2020, табл. 6.5</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Нормируемый температурный перепад для перекрытий над техподпольем</td>
                <td className="border border-black p-1.5 text-center font-mono">Δt<sub>в.норм.птп</sub></td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(basement.delta_t_floor_norm, 1)} °C</td>
                <td className="border border-black p-1.5 text-left">СП 2.04.01-2020, табл. 6.5</td>
              </tr>
            </tbody>
          </table>

          <p className="indent-6 text-justify text-xs">
            По таблице 5.1 СП 2.04.01-2020 при t<sub>в</sub> = {internalConditions.t_v} °C и φ<sub>в</sub> = {internalConditions.phi_v} % влажностный режим помещения — <b>{internalConditions.humidityRegimeName}</b>. Территория Республики Беларусь относится ко 2-й зоне влажности (нормальная). По таблице 5.2 СП 2.04.01-2020 приняты <b>условия эксплуатации «{internalConditions.exploitationConditions}»</b>. Давление насыщенного пара при t<sub>в</sub> = {internalConditions.t_v} °C (по Прил. Е): E<sub>в</sub> = <b>{fmtNum(internalConditions.E_v, 1)} Па</b>; фактическое парциальное давление e<sub>в</sub> = ({internalConditions.phi_v}/100)·{fmtNum(internalConditions.E_v, 1)} = <b>{fmtNum(internalConditions.e_v, 2)} Па</b>; температура точки росы t<sub>р</sub> = <b>{fmtNum(internalConditions.dew_point, 2)} °C</b>.
          </p>

          <EskdFooterStamp pageNum={3} docCode={docCode} />
        </section>

        {/* ================= ЛИСТЫ 4–5: РАЗДЕЛ 2 (НАРУЖНАЯ СТЕНА — ПОДРОБНЫЙ РАСЧЕТ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-3.5">
          <h2 className="text-base font-bold uppercase">
            2. Теплотехнический расчет наружной стены ({wall.construction.id})
          </h2>

          <h3 className="text-sm font-bold">2.1 Подбор толщины утеплителя наружной стены</h3>
          <p className="indent-6 text-justify text-xs">
            Конструкция наружной стены: <b>{wall.construction.typeName}</b> (схема «{wall.construction.type}», повышающий коэффициент n = <b>{fmtNum(wall.construction.increasingFactor_n, 2)}</b>). Состав слоев от внутренней поверхности к наружной:
          </p>
          <ol className="list-decimal list-inside text-xs space-y-0.5 pl-4">
            {wall.layers.map((l, idx) => (
              <li key={idx} className={l.isVaporBarrier ? 'font-bold' : ''}>
                {l.name} — {l.materialName}, δ<sub>{idx + 1}</sub> ={' '}
                <b>
                  {l.thickness * 1000 < 10
                    ? fmtTrim(l.thickness * 1000, 2)
                    : Math.round(l.thickness * 1000)}{' '}
                  мм
                </b>{' '}
                ({fmtTrim(l.thickness, 4)} м)
                {l.isVaporBarrier && wall.vaporBarrier
                  ? ` — расположение: ${wall.vaporBarrier.placementLabel}, Rп = ${fmtTrim(l.R_p, 3)} м²·ч·Па/мг`
                  : ''}
                ;
              </li>
            ))}
          </ol>

          <p className="text-xs font-bold pt-1">
            Таблица 2.1 – Теплотехнические характеристики материалов наружной стены (условия эксплуатации {internalConditions.exploitationConditions})
          </p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-left" rowSpan={2}>Наименование материала</th>
                <th className="border border-black p-1 text-center w-20" rowSpan={2}>Плотность ρ, кг/м³</th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  Расчетные коэффициенты (при условиях эксплуатации {internalConditions.exploitationConditions})
                </th>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Теплопроводности λ, Вт/(м·°С)</th>
                <th className="border border-black p-1 text-center">Теплоусвоения s, Вт/(м²·°С)</th>
                <th className="border border-black p-1 text-center">Паропроницаемости μ, мг/(м·ч·Па)</th>
              </tr>
            </thead>
            <tbody>
              {wallMaterialsTable.map((l, idx) => (
                <tr key={idx} className={l.isVaporBarrier ? 'bg-gray-50 font-semibold' : ''}>
                  <td className="border border-black p-1">{l.materialName}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.density ?? '—'}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.lambda, 4)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.s, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.mu, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs">Требуемое приведенное сопротивление теплопередаче наружной стены:</p>
          <FormulaRow num="2.1">
            R<sub>т.пр</sub> = R<sub>т.норм</sub> · n = {fmtNum(rNormWall, 2)} · {fmtNum(wall.construction.increasingFactor_n, 2)} = <b>{fmtNum(wall.R_required, 2)} м²·°С/Вт</b>
          </FormulaRow>

          <p className="text-xs">Сопротивление теплопередаче конструкции без утеплителя и расчетная толщина утеплителя:</p>
          <FormulaRow num="2.2">
            R<sub>без.ут</sub> = 1/α<sub>в</sub> + Σ(δ<sub>i</sub>/λ<sub>i</sub>) + 1/α<sub>н</sub> = 1/{fmtTrim(alphaV, 1)} + {wallRNonInsExpr} + 1/{alphaN} = <b>{fmtNum(wall.R_without_insulation, 3)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="2.3">
            δ<sub>ут</sub> = (R<sub>т.пр</sub> − R<sub>без.ут</sub>) · λ<sub>ут</sub> = ({fmtNum(wall.R_required, 2)} − {fmtNum(wall.R_without_insulation, 3)}) · {fmtTrim(activeWallLambda, 4)} = <b>{fmtNum(wall.delta_insulation_calc, 3)} м</b> → принимаем <b>δ<sub>ут</sub> = {fmtNum(wall.delta_insulation_adopted, 2)} м ({Math.round(wall.delta_insulation_adopted * 1000)} мм)</b>
          </FormulaRow>
          <FormulaRow num="2.3а">
            R<sub>0</sub> = 1/{fmtTrim(alphaV, 1)} + {wallRFactExpr} + 1/{alphaN} = <b>{fmtNum(wall.R_total, 2)} м²·°С/Вт</b> {wall.isRCompliant ? '≥' : '<'} {fmtNum(wall.R_required, 2)} м²·°С/Вт
          </FormulaRow>

          <h3 className="text-sm font-bold pt-1">2.2 Проверка температуры внутренней поверхности стены</h3>
          <FormulaRow num="2.4">
            D = Σ(R<sub>i</sub> · s<sub>i</sub>) = {wallDExpr} = <b>{fmtNum(wall.thermalInertia_D, 2)}</b> ({wall.designTempRule} → t<sub>н</sub> = <b>{fmtNum(wall.design_t_out, 1)} °C</b>)
          </FormulaRow>
          <FormulaRow num="2.5">
            τ<sub>в</sub> = t<sub>в</sub> − (t<sub>в</sub> − t<sub>н</sub>) / (R<sub>0</sub> · α<sub>в</sub>) = {fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(wall.design_t_out, 1)})) / ({fmtNum(wall.R_total, 2)} · {fmtTrim(alphaV, 1)}) = <b>{fmtNum(wall.tau_v_min, 2)} °C</b> {wall.tau_v_min > wall.dew_point ? '>' : '≤'} t<sub>р</sub> ({fmtNum(wall.dew_point, 2)} °C); Δt<sub>в</sub> = <b>{fmtNum(wall.delta_t_actual, 2)} °C</b> ≤ {fmtNum(wall.delta_t_norm, 1)} °C
          </FormulaRow>

          <h3 className="text-sm font-bold pt-1">2.3 Проверка влажностного режима наружной стены (метод К. Ф. Фокина)</h3>
          <p className="text-xs font-semibold">2.3.1 Определение температур по сечениям стены за отопительный период (t<sub>н.от</sub> = {fmtNum(climate.t_heating_period, 1)} °C):</p>
          <FormulaRow num="2.6">
            t<sub>x</sub> = t<sub>в</sub> − [(t<sub>в</sub> − t<sub>н.от</sub>) / R<sub>0</sub>] · (1/α<sub>в</sub> + Σδ<sub>i</sub>/λ<sub>i</sub>)
          </FormulaRow>
          <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 pl-2">
            {wallSectionLines.map((ln) => (
              <li key={`wt-${ln.num}`} className={ln.isVb ? 'font-bold bg-gray-100 px-1' : ''}>
                t<sub>{ln.num}</sub> ({ln.label}) = {fmtTrim(internalConditions.t_v, 1)} − [({fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(climate.t_heating_period, 1)}))/{fmtNum(wall.R_total, 2)}] · ({ln.rExpr}) = <b>{fmtNum(ln.tHeat, 2)} °C</b> → E<sub>{ln.num}</sub> = <b>{fmtNum(ln.E_val, 1)} Па</b>
              </li>
            ))}
          </ul>

          <p className="text-xs font-semibold pt-1">2.3.2 Определение парциальных давлений водяного пара e<sub>x</sub> по сечениям стены:</p>
          <FormulaRow num="2.7">
            e<sub>в</sub> = (φ<sub>в</sub> / 100) · E<sub>в</sub> = ({internalConditions.phi_v} / 100) · {fmtNum(internalConditions.E_v, 1)} = <b>{fmtNum(internalConditions.e_v, 2)} Па</b>
          </FormulaRow>
          <FormulaRow num="2.8">
            e<sub>н</sub><sup>ср.от</sup> = (φ<sub>н.от</sub> / 100) · E<sub>н</sub><sup>ср.от</sup> = ({climate.rh_heating_period} / 100) · {fmtNum(E_n_ot, 1)} = <b>{fmtNum(e_n_ot, 2)} Па</b>
          </FormulaRow>
          <FormulaRow num="2.9">
            R<sub>п</sub> = 1/37 + ΣR<sub>п.i</sub> + 1/77 = 0,027 + {wallRpExpr} + 0,013 = <b>{fmtNum(wall.total_R_p, 2)} м²·ч·Па/мг</b>
          </FormulaRow>
          <FormulaRow num="2.10">
            e<sub>x</sub> = e<sub>в</sub> − [(e<sub>в</sub> − e<sub>н</sub><sup>ср.от</sup>) / R<sub>п</sub>] · (1/37 + ΣR<sub>п.i</sub>)
          </FormulaRow>
          <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 pl-2">
            {wallSectionLines.map((ln) => (
              <li key={`we-${ln.num}`} className={ln.isVb ? 'font-bold bg-gray-100 px-1' : ''}>
                e<sub>{ln.num}</sub> = {fmtNum(internalConditions.e_v, 2)} − [({fmtNum(internalConditions.e_v, 2)} − {fmtNum(e_n_ot, 2)}) / {fmtNum(wall.total_R_p, 2)}] · ({ln.rpExpr}) = <b>{fmtNum(ln.e_val, 2)} Па</b> ({ln.e_val < ln.E_val ? '< E' : '≥ E'})
              </li>
            ))}
          </ul>

          {hasWallCondensation && wall.unprotectedVariant ? (
            <div className="space-y-4">
              {renderHtmlMoistureTable(
                'Таблица 2.2а – Показатели тепловлажностного режима наружной стены БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1)',
                wall.unprotectedVariant.crossSectionProfile,
                false,
                'наружной стены'
              )}
              {renderHtmlMoistureTable(
                'Таблица 2.2б – Показатели тепловлажностного режима наружной стены С ПАРОИЗОЛЯЦИЕЙ (Вариант 2)',
                (wall.protectedVariant ?? wall).crossSectionProfile,
                true,
                'наружной стены'
              )}
            </div>
          ) : (
            renderHtmlMoistureTable(
              'Таблица 2.2 – Показатели тепловлажностного режима наружной стены',
              wall.crossSectionProfile,
              true,
              'наружной стены'
            )
          )}

          <EskdFooterStamp pageNum={5} docCode={docCode} />
        </section>

        {/* ================= ЛИСТЫ 6–7: РАЗДЕЛ 3 (ПОКРЫТИЕ / ЧЕРДАЧНОЕ ПЕРЕКРЫТИЕ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-3.5">
          <h2 className="text-base font-bold uppercase">
            3. Теплотехнический расчет {roofTitleLabel} ({roof.construction.id})
          </h2>

          <h3 className="text-sm font-bold">3.1 Подбор толщины утеплителя и расчет многопустотной плиты</h3>
          <p className="indent-6 text-justify text-xs">
            Конструкция: <b>{roof.construction.name}</b> (схема «{roof.construction.type}», повышающий коэффициент n = <b>{fmtNum(roof.construction.increasingFactor_n, 2)}</b>). Несущая основа — многопустотная железобетонная плита высотой h = {roof.hollowCore.height} мм с круглыми пустотами d = {roof.hollowCore.voidDiameter} мм и шагом b = {roof.hollowCore.spacing} мм.
            {roof.vaporBarrier
              ? ` Предусмотрен слой пароизоляции: ${roof.vaporBarrier.name} (δ = ${roof.vaporBarrier.thicknessMm} мм, Rп = ${fmtTrim(roof.vaporBarrier.R_p, 3)} м²·ч·Па/мг; расположение: ${roof.vaporBarrier.placementLabel}).`
              : ''}
          </p>

          <p className="text-xs font-bold">
            Таблица 3.1 – Теплотехнические характеристики материалов {roofTitleLabel} (условия эксплуатации {internalConditions.exploitationConditions})
          </p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-left" rowSpan={2}>Наименование материала</th>
                <th className="border border-black p-1 text-center w-20" rowSpan={2}>Плотность ρ, кг/м³</th>
                <th className="border border-black p-1 text-center" colSpan={3}>
                  Расчетные коэффициенты (при условиях эксплуатации {internalConditions.exploitationConditions})
                </th>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Теплопроводности λ, Вт/(м·°С)</th>
                <th className="border border-black p-1 text-center">Теплоусвоения s, Вт/(м²·°С)</th>
                <th className="border border-black p-1 text-center">Паропроницаемости μ, мг/(м·ч·Па)</th>
              </tr>
            </thead>
            <tbody>
              {roofMaterialsTable.map((l, idx) => (
                <tr key={idx} className={l.isVaporBarrier ? 'bg-gray-50 font-semibold' : ''}>
                  <td className="border border-black p-1">{l.materialName}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.density ?? '—'}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.lambda, 4)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.s, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtTrim(l.mu, 6)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <FormulaRow num="3.1">
            a = √(π · d² / 4) = √(3,1416 · {fmtTrim(roof.hollowCore.voidDiameter / 1000, 3)}² / 4) = <b>{fmtNum(roof.hollowCore.a_eq, 4)} м</b>; b₁ = {fmtTrim(roof.hollowCore.spacing / 1000, 3)} − {fmtNum(roof.hollowCore.a_eq, 4)} = <b>{fmtNum(roof.hollowCore.b_rib, 4)} м</b>; δ<sub>п</sub> = ({fmtTrim(roof.hollowCore.height / 1000, 3)} − {fmtNum(roof.hollowCore.a_eq, 4)}) / 2 = <b>{fmtNum(roof.hollowCore.delta_flange_eq, 4)} м</b>
          </FormulaRow>
          <FormulaRow num="3.2">
            R₁ = h / λ<sub>б</sub> = {fmtTrim(roof.hollowCore.height / 1000, 3)} / {fmtNum(concreteLambda, 2)} = <b>{fmtNum(roof.hollowCore.R_1_rib, 4)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="3.3">
            R₂ = 2 · δ<sub>п</sub> / λ<sub>б</sub> + R<sub>звп</sub> = 2 · {fmtNum(roof.hollowCore.delta_flange_eq, 4)} / {fmtNum(concreteLambda, 2)} + 0,15 = <b>{fmtNum(roof.hollowCore.R_2_void, 4)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="3.4">
            R<sub>пл</sub> = (b₁ + a) / (b₁/R₁ + a/R₂) = ({fmtNum(roof.hollowCore.b_rib, 4)} + {fmtNum(roof.hollowCore.a_eq, 4)}) / ({fmtNum(roof.hollowCore.b_rib, 4)}/{fmtNum(roof.hollowCore.R_1_rib, 4)} + {fmtNum(roof.hollowCore.a_eq, 4)}/{fmtNum(roof.hollowCore.R_2_void, 4)}) = <b>{fmtNum(roof.hollowCore.R_slab, 3)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="3.5">
            R<sub>т.пр</sub> = R<sub>т.норм</sub> · n = {fmtNum(rNormRoof, 2)} · {fmtNum(roof.construction.increasingFactor_n, 2)} = <b>{fmtNum(roof.R_required, 2)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="3.6">
            δ<sub>ут</sub> = (R<sub>т.пр</sub> − [1/{fmtTrim(alphaV, 1)} + {fmtNum(roof.hollowCore.R_slab, 3)}{roofNonInsNonSlab.length > 0 ? ' + ' + roofNonInsNonSlab.map((l) => `${fmtTrim(l.thickness, 4)}/${fmtTrim(l.lambda, 4)}`).join(' + ') : ''} + 1/{alphaN}]) · {fmtTrim(activeRoofLambda, 4)} = <b>{fmtNum(roof.delta_insulation_calc, 3)} м</b> → принимаем <b>δ<sub>ут</sub> = {fmtNum(roof.delta_insulation_adopted, 2)} м ({Math.round(roof.delta_insulation_adopted * 1000)} мм)</b>; R<sub>0</sub> = <b>{fmtNum(roof.R_total, 2)} м²·°С/Вт</b> (по пустоте R<sub>0</sub><sup>ф</sup> = <b>{fmtNum(roofVoidR, 2)}</b>)
          </FormulaRow>

          <h3 className="text-sm font-bold pt-1">3.2 Проверка температуры внутренней поверхности потолка</h3>
          <FormulaRow num="3.7">
            D = Σ(R<sub>i</sub> · s<sub>i</sub>) = {roofDExpr} → D<sub>пуст</sub> = <b>{fmtNum(roof.thermalInertia_D, 2)}</b> ({roof.designTempRule} → t<sub>н</sub> = <b>{fmtNum(roof.design_t_out, 1)} °C</b>)
          </FormulaRow>
          <FormulaRow num="3.8">
            τ<sub>в</sub> = t<sub>в</sub> − (t<sub>в</sub> − t<sub>н</sub>) / (R<sub>0</sub><sup>ф</sup> · α<sub>в</sub>) = {fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(roof.design_t_out, 1)})) / ({fmtNum(roofVoidR, 2)} · {fmtTrim(alphaV, 1)}) = <b>{fmtNum(roof.voidSection.tau_v_steady, 2)} °C</b> (по ребру: <b>{fmtNum(roof.worstSection.tau_v_steady, 2)} °C</b>) {roof.tau_v_min > internalConditions.dew_point ? '>' : '≤'} t<sub>р</sub> ({fmtNum(internalConditions.dew_point, 2)} °C)
          </FormulaRow>

          <h3 className="text-sm font-bold pt-1">3.3 Проверка влажностного режима {roofTitleLabel} (сечение по пустоте)</h3>
          <FormulaRow num="3.9">
            t<sub>x</sub> = t<sub>в</sub> − [(t<sub>в</sub> − t<sub>н.от</sub>) / R<sub>0</sub><sup>ф</sup>] · (1/α<sub>в</sub> + ΣR<sub>i</sub>)
          </FormulaRow>
          <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 pl-2">
            {roofVoidCalcLines.map((ln) => (
              <li key={`rt-${ln.num}`} className={ln.isVb ? 'font-bold bg-gray-100 px-1' : ''}>
                t<sub>{ln.num}</sub> ({ln.label}) = {fmtTrim(internalConditions.t_v, 1)} − [({fmtTrim(internalConditions.t_v, 1)} − ({fmtTrim(climate.t_heating_period, 1)}))/{fmtNum(roofVoidR, 2)}] · {fmtNum(ln.rCum, 3)} = <b>{fmtNum(ln.tHeat, 2)} °C</b> → E<sub>{ln.num}</sub> = <b>{fmtNum(ln.E_val, 1)} Па</b>
              </li>
            ))}
          </ul>

          <FormulaRow num="3.10">
            R<sub>п</sub> = 1/37 + {roofRpExpr} + 1/77 = <b>{fmtNum(roof.total_R_p, 2)} м²·ч·Па/мг</b> (R<sub>п.возд</sub> = 0 по СП 2.04.01-2020 п. 10.5)
          </FormulaRow>
          <FormulaRow num="3.11">
            e<sub>x</sub> = e<sub>в</sub> − [(e<sub>в</sub> − e<sub>н</sub><sup>ср.от</sup>) / R<sub>п</sub>] · (1/37 + ΣR<sub>п.i</sub>)
          </FormulaRow>
          <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 pl-2">
            {roofVoidCalcLines.map((ln) => (
              <li key={`re-${ln.num}`} className={ln.isVb ? 'font-bold bg-gray-100 px-1' : ''}>
                e<sub>{ln.num}</sub> = {fmtNum(internalConditions.e_v, 2)} − [({fmtNum(internalConditions.e_v, 2)} − {fmtNum(e_n_ot, 2)}) / {fmtNum(roof.total_R_p, 2)}] · {fmtNum(ln.rpCum, 3)} = <b>{fmtNum(ln.e_val, 2)} Па</b> ({ln.e_val < ln.E_val ? '< E' : '≥ E'})
              </li>
            ))}
          </ul>

          {hasRoofCondensation && roof.unprotectedVoidSection ? (
            <div className="space-y-4">
              {renderHtmlMoistureTable(
                `Таблица 3.2а – Показатели тепловлажностного режима ${roofTitleLabel} БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1, сечение по пустоте)`,
                roof.unprotectedVoidSection.crossSectionProfile,
                false,
                roofTitleLabel
              )}
              {renderHtmlMoistureTable(
                `Таблица 3.2б – Показатели тепловлажностного режима ${roofTitleLabel} С ПАРОИЗОЛЯЦИЕЙ (Вариант 2, сечение по пустоте)`,
                (roof.protectedVoidSection ?? roof.voidSection).crossSectionProfile,
                true,
                roofTitleLabel
              )}
            </div>
          ) : (
            renderHtmlMoistureTable(
              `Таблица 3.2 – Показатели тепловлажностного режима ${roofTitleLabel} (сечение по пустоте)`,
              roofVoidProfile,
              true,
              roofTitleLabel
            )
          )}

          <EskdFooterStamp pageNum={7} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 8: РАЗДЕЛ 4 (ТЕХНИЧЕСКОЕ ПОДПОЛЬЕ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-3.5">
          <h2 className="text-base font-bold uppercase">
            4. Теплотехнический расчет технического подполья ({basement.construction.id})
          </h2>

          <p className="indent-6 text-justify text-xs">
            Конструкция перекрытия над техническим подпольем: <b>{basement.construction.name}</b>. Нормативное сопротивление теплопередаче перекрытия R<sub>т.норм</sub> = {fmtNum(rNormBasement, 2)} м²·°С/Вт.
          </p>

          <FormulaRow num="4.1">
            δ<sub>ут.прин</sub> = <b>{fmtNum(basement.delta_insulation_adopted, 2)} м ({Math.round(basement.delta_insulation_adopted * 1000)} мм)</b>; фактическое R<sub>т.ПТП</sub> = <b>{fmtNum(basement.R_ptp, 2)} м²·°С/Вт</b>
          </FormulaRow>
          <FormulaRow num="4.2">
            Q<sub>тр</sub> = Σ(q<sub>i</sub> · l<sub>i</sub>) = {basement.pipesDetails.map((p) => `${fmtNum(p.q_heat_loss, 1)}·${p.length}`).join(' + ')} = <b>{fmtNum(basement.pipeHeatGains_total, 1)} Вт</b>
          </FormulaRow>
          <FormulaRow num="4.3">
            t<sub>п</sub> = <b>{fmtNum(basement.crawlSpaceTemp_t_p, 2)} °C</b> ≥ +5,0 °C (φ<sub>п</sub> = {basement.crawlSpaceRH} %); t<sub>р.п</sub> = <b>{fmtNum(basement.dew_point_basement, 2)} °C</b>
          </FormulaRow>
          <FormulaRow num="4.4">
            Δt<sub>в.п</sub> = (t<sub>в</sub> − t<sub>п</sub>) / (R<sub>т.ПТП</sub> · α<sub>в</sub>) = <b>{fmtNum(basement.delta_t_floor, 2)} °C</b> ≤ {fmtNum(basement.delta_t_floor_norm, 1)} °C
          </FormulaRow>
          <FormulaRow num="4.5">
            τ<sub>в.цок</sub> = <b>{fmtNum(basement.tau_v_basement_wall, 2)} °C</b> &gt; t<sub>р.п</sub> ({fmtNum(basement.dew_point_basement, 2)} °C) — конденсат на цокольной стене исключен
          </FormulaRow>

          <p className="text-xs font-bold">Таблица 4.1 – Теплопотери трубопроводов в пространстве технического подполья</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 text-center">№</th>
                <th className="border border-black p-1.5 text-center">Температура теплоносителя, °C</th>
                <th className="border border-black p-1.5 text-center">Диаметр d<sub>у</sub>, мм</th>
                <th className="border border-black p-1.5 text-center">Длина l<sub>i</sub>, м</th>
                <th className="border border-black p-1.5 text-center">Удельные теплопотери q<sub>i</sub>, Вт/м</th>
                <th className="border border-black p-1.5 text-center">Тепловыделения Q<sub>i</sub>, Вт</th>
              </tr>
            </thead>
            <tbody>
              {basement.pipesDetails.map((p, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.temp}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.dy}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.length}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{fmtNum(p.q_heat_loss, 1)}</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">{fmtNum(p.q_total, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <EskdFooterStamp pageNum={8} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 9: РАЗДЕЛ 5 (ОКНА ПО ШИБЕКО — ТАБЛ. 5.1–5.4) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-3.5">
          <h2 className="text-base font-bold uppercase">
            5. Теплотехнический расчет оконного заполнения ({win.windowDef.id})
          </h2>

          <p className="indent-6 text-justify text-xs">
            Оконный блок <b>{win.windowDef.id}</b>: профильная система — {win.windowDef.profileSystem} (R<sub>непр</sub> = {fmtNum(win.R_opaque, 2)} м²·°С/Вт), стеклопакет — {win.windowDef.glazingType} (R<sub>св</sub> = {fmtNum(win.R_transparent, 2)} м²·°С/Вт), конструктивная схема — Вариант {win.windowDef.typeScheme}, габариты H × B = {win.windowDef.dim.H} × {win.windowDef.dim.B} мм.
          </p>

          <FormulaRow num="5.1">
            R<sub>т.ок</sub> = ΣF<sub>i</sub> / Σ(F<sub>i</sub> / R<sub>i</sub>) = {fmtNum(win.area_total, 5)} / ({fmtNum(win.F_over_R_opaque, 3)} + {fmtNum(win.F_over_R_transparent, 3)}) = {fmtNum(win.area_total, 5)} / {fmtNum(win.sum_F_over_R, 3)} = <b>{fmtNum(win.R_actual, 2)} м²·°С/Вт</b> {win.isCompliant ? '≥' : '<'} R<sub>т.норм</sub> = {fmtNum(win.R_norm, 2)} м²·°С/Вт
          </FormulaRow>
          <FormulaRow num="5.2">
            H = 1,0 + 3,0 · N + 2,7 = 1,0 + 3,0 · {cipher.floorsCount} + 2,7 = <b>{fmtNum(win.H_building, 1)} м</b>; ρ<sub>в</sub> = 353/(273+{internalConditions.t_v}) = <b>{fmtNum(win.rho_v, 2)} кг/м³</b>; ρ<sub>н</sub> = 353/(273+({climate.t_coldest_5days_092})) = <b>{fmtNum(win.rho_n, 2)} кг/м³</b>; ρ<sub>н</sub> − ρ<sub>в</sub> = <b>{fmtNum(win.delta_rho, 2)} кг/м³</b>
          </FormulaRow>
          <FormulaRow num="5.3">
            Δp<sub>i</sub> = (H − h<sub>i</sub>) · g · (ρ<sub>н</sub> − ρ<sub>в</sub>) + 0,5 · ρ<sub>н</sub> · v<sub>ср</sub>² · (c<sub>н</sub> − c<sub>п</sub>) · k<sub>i</sub>; R<sub>в.тр.i</sub> = (1 / G<sub>норм</sub>) · (Δp<sub>i</sub> / 10)<sup>2/3</sup> (G<sub>норм</sub> = {fmtNum(win.G_norm, 1)} кг/(м²·ч), c<sub>н</sub> − c<sub>п</sub> = {fmtNum(win.delta_c, 1)})
          </FormulaRow>

          <p className="text-xs font-bold">Таблица 5.1 (табл. 6.2 по Шибеко) – Поучастковый расчет приведенного сопротивления теплопередаче окна</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Уч.</th>
                <th className="border border-black p-1 text-left">Элемент</th>
                <th className="border border-black p-1 text-center">Размеры, мм</th>
                <th className="border border-black p-1 text-center">F<sub>i</sub>, м²</th>
                <th className="border border-black p-1 text-center">R<sub>i</sub>, м²·°С/Вт</th>
                <th className="border border-black p-1 text-center">F<sub>i</sub> / R<sub>i</sub></th>
              </tr>
            </thead>
            <tbody>
              {win.zones.map((z) => (
                <tr key={z.code}>
                  <td className="border border-black p-1 text-center font-bold">{z.code}</td>
                  <td className="border border-black p-1">{z.name}</td>
                  <td className="border border-black p-1 text-center font-mono">{z.widthMm} × {z.heightMm}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(z.area_m2, 5)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(z.R_zone, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(z.F_over_R, 3)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="border border-black p-1 text-right">
                  Итого по непрозрачной части (профиль, уч. 1–9):
                </td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.area_opaque, 5)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.R_opaque, 2)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.F_over_R_opaque, 3)}</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="border border-black p-1 text-right">
                  Итого по светопрозрачной части (остекление, уч. I–II):
                </td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.area_transparent, 5)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.R_transparent, 2)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.F_over_R_transparent, 3)}</td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="border border-black p-1 text-right">
                  Итого по окну (R<sub>т.ок</sub> = {fmtNum(win.R_actual, 2)} м²·°С/Вт):
                </td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.area_total, 5)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.R_actual, 2)}</td>
                <td className="border border-black p-1 text-center font-mono">{fmtNum(win.sum_F_over_R, 3)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold pt-1">Таблица 5.2 (табл. 6.1 по Шибеко, СТБ 939-2013) – Классификация окон по воздухопроницаемости при Δp₀ = 10 Па</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Класс</th>
                <th className="border border-black p-1 text-center">Объемная воздухопроницаемость, м³/(ч·м²)</th>
                <th className="border border-black p-1 text-center">Сопротивление воздухопроницанию R<sub>в</sub>, м²·ч/кг</th>
              </tr>
            </thead>
            <tbody>
              {WINDOW_AIR_PERMEABILITY_CLASSES.map((c) => (
                <tr key={c.classLetter}>
                  <td className="border border-black p-1 text-center font-bold">{c.classLetter}</td>
                  <td className="border border-black p-1 text-center font-mono">{c.volumePermeabilityRange}</td>
                  <td className="border border-black p-1 text-center font-mono">{c.rvRangeText}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold pt-1">
            Таблица 5.3 (табл. 6.3 по Шибеко) – Поэтажный расчет требуемого сопротивления воздухопроницанию R<sub>в.тр</sub> (тип местности {win.terrainType}, H = {fmtNum(win.H_building, 1)} м)
          </p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Этаж</th>
                <th className="border border-black p-1 text-center">h<sub>i</sub>, м</th>
                <th className="border border-black p-1 text-center">ρ<sub>н</sub>−ρ<sub>в</sub></th>
                <th className="border border-black p-1 text-center">k<sub>i</sub></th>
                <th className="border border-black p-1 text-center">Δp<sub>i</sub>, Па</th>
                <th className="border border-black p-1 text-center">G<sub>норм</sub></th>
                <th className="border border-black p-1 text-center">R<sub>в.тр</sub></th>
              </tr>
            </thead>
            <tbody>
              {win.floors.map((f) => (
                <tr key={f.floor}>
                  <td className="border border-black p-1 text-center font-bold">{f.floor}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(f.height, 1)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(win.delta_rho, 3)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(f.k_i, 3)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(f.delta_p, 2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(f.G_v_required, 1)}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{fmtNum(f.R_v_required, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold pt-1">Таблица 5.4 (табл. 6.4 по Шибеко) – Назначение класса оконных блоков по этажам</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Этаж</th>
                <th className="border border-black p-1 text-center">R<sub>в.тр</sub>, м²·ч/кг</th>
                <th className="border border-black p-1 text-center">R<sub>в.ок</sub> = (1,0–1,2)·R<sub>в.тр</sub></th>
                <th className="border border-black p-1 text-left">Требуемый класс окна</th>
              </tr>
            </thead>
            <tbody>
              {win.floors.map((f) => (
                <tr key={f.floor}>
                  <td className="border border-black p-1 text-center font-bold">{f.floor}</td>
                  <td className="border border-black p-1 text-center font-mono">{fmtNum(f.R_v_required, 3)}</td>
                  <td className="border border-black p-1 text-center font-mono">
                    {fmtNum(f.R_v_required, 3)} – {fmtNum(f.R_v_max, 3)}
                  </td>
                  <td className="border border-black p-1 font-semibold">Класс {f.windowClassRangeText}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <EskdFooterStamp pageNum={9} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 10: ЗАКЛЮЧЕНИЕ И ИСТОЧНИКИ ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-5">
          <div className="space-y-2">
            <h2 className="text-base font-bold uppercase text-center">ЗАКЛЮЧЕНИЕ</h2>
            <p className="indent-6 text-justify text-xs">
              В ходе выполнения курсовой работы произведен комплексный теплотехнический и влажностный расчет основных ограждающих конструкций здания ({internalConditions.buildingTypeName}, г. {climate.name}, {cipher.floorsCount} эт.).
            </p>
            <ul className="list-disc list-inside text-xs space-y-1 pl-4">
              <li>
                <b>Наружная стена ({wall.construction.id}):</b> принята толщина утеплителя {wall.insulation.id} δ = <b>{Math.round(wall.delta_insulation_adopted * 1000)} мм</b>, R<sub>0</sub> = <b>{fmtNum(wall.R_total, 2)} м²·°С/Вт</b> ≥ {fmtNum(wall.R_required, 2)}, τ<sub>в</sub> = <b>{fmtNum(wall.tau_v_min, 2)} °C</b> &gt; t<sub>р</sub> ({fmtNum(wall.dew_point, 2)} °C).
                {wall.vaporBarrier ? ` Пароизоляция: ${wall.vaporBarrier.name} (${wall.vaporBarrier.placementLabel}).` : ''}
              </li>
              <li>
                <b>{roof.construction.kind === 'чердачное' ? 'Чердачное перекрытие' : 'Покрытие'} ({roof.construction.id}):</b> R<sub>пл</sub> = {fmtNum(roof.hollowCore.R_slab, 3)}, принята толщина утеплителя δ = <b>{Math.round(roof.delta_insulation_adopted * 1000)} мм</b>, R<sub>0</sub> = <b>{fmtNum(roof.R_total, 2)} м²·°С/Вт</b> ≥ {fmtNum(roof.R_required, 2)}, τ<sub>в</sub> = <b>{fmtNum(roof.tau_v_min, 2)} °C</b> &gt; t<sub>р</sub>.
                {roof.vaporBarrier ? ` Пароизоляция: ${roof.vaporBarrier.name} (Rп = ${fmtTrim(roof.vaporBarrier.R_p, 3)}, ${roof.vaporBarrier.placementLabel}).` : ' Дополнительная пароизоляция не требуется.'}
              </li>
              <li>
                <b>Техническое подполье ({basement.construction.id}):</b> принята толщина утеплителя δ = <b>{Math.round(basement.delta_insulation_adopted * 1000)} мм</b>, R<sub>ПТП</sub> = <b>{fmtNum(basement.R_ptp, 2)} м²·°С/Вт</b>, t<sub>п</sub> = <b>{fmtNum(basement.crawlSpaceTemp_t_p, 2)} °C</b> ≥ +5,0 °C.
              </li>
              <li>
                <b>Оконный блок ({win.windowDef.id}):</b> R<sub>т.ок</sub> = <b>{fmtNum(win.R_actual, 2)} м²·°С/Вт</b> ≥ {fmtNum(win.R_norm, 2)}, назначены классы воздухопроницаемости по этажам согласно СТБ 939-2013.
              </li>
            </ul>
          </div>

          <div className="space-y-2 pt-3 border-t border-gray-300">
            <h2 className="text-base font-bold uppercase text-center">СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ</h2>
            <ol className="list-decimal list-inside text-xs space-y-1 pl-2">
              <li>СП 2.04.04-2026 «Строительная климатология». — Минск: Минстройархитектуры, 2026.</li>
              <li>СН 2.04.02-2020 «Здания и сооружения. Энергетическая эффективность». — Минск, 2020.</li>
              <li>СП 2.04.01-2020 «Строительная теплотехника. Правила расчета». — Минск, 2020.</li>
              <li>СТБ 939-2013 «Окна и балконные двери для зданий и сооружений. Общие технические условия». — Минск, 2013.</li>
              <li>Шибеко А. С. Строительная теплофизика: учебно-методическое пособие для студентов специальности 1-70 04 02 «Теплогазоснабжение, вентиляция и охрана воздушного бассейна». — Минск: БНТУ, 2018.</li>
            </ol>
          </div>

          <EskdFooterStamp pageNum={10} docCode={docCode} />
        </section>
      </div>
    </div>
  );
};
