import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import { FullCourseworkCalculation } from '../logic/calculations';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { WINDOW_AIR_PERMEABILITY_CLASSES } from '../data/normative';

const FONT_FAMILY = 'Times New Roman';

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '1E293B' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E293B' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '1E293B' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '1E293B' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '64748B' },
};

function fmtNum(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '—';
  return val.toFixed(decimals).replace('.', ',');
}

function fmtTrim(val: number | undefined | null, maxDec = 4): string {
  if (val === undefined || val === null || Number.isNaN(val)) return '—';
  return Number(val.toFixed(maxDec)).toString().replace('.', ',');
}

function pText(
  text: string,
  opts?: {
    bold?: boolean;
    italic?: boolean;
    sizePt?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    indentFirstLineTwips?: number;
    spaceBeforeTwips?: number;
    spaceAfterTwips?: number;
    color?: string;
  }
): Paragraph {
  const sizeHalfPt = (opts?.sizePt ?? 12) * 2;
  return new Paragraph({
    alignment: opts?.align ?? AlignmentType.JUSTIFIED,
    indent:
      opts?.indentFirstLineTwips !== undefined
        ? { firstLine: opts.indentFirstLineTwips }
        : { firstLine: 709 }, // ~1.25 см по стандарту ПЗ БНТУ
    spacing: {
      before: opts?.spaceBeforeTwips ?? 60,
      after: opts?.spaceAfterTwips ?? 80,
      line: 300,
    },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: sizeHalfPt,
        bold: opts?.bold,
        italics: opts?.italic,
        color: opts?.color,
      }),
    ],
  });
}

function pHeading(text: string, level: 1 | 2 = 1): Paragraph {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    alignment: AlignmentType.LEFT,
    spacing: {
      before: level === 1 ? 260 : 180,
      after: level === 1 ? 140 : 100,
    },
    children: [
      new TextRun({
        text,
        font: FONT_FAMILY,
        size: level === 1 ? 28 : 26,
        bold: true,
        color: '0F172A',
      }),
    ],
  });
}

function pFormula(formulaText: string, formulaNumber: string, explanation?: string): Paragraph[] {
  const res: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: explanation ? 40 : 100 },
      children: [
        new TextRun({
          text: formulaText,
          font: FONT_FAMILY,
          size: 24,
          bold: true,
        }),
        new TextRun({
          text: `     ${formulaNumber}`,
          font: FONT_FAMILY,
          size: 24,
          italics: true,
          color: '334155',
        }),
      ],
    }),
  ];
  if (explanation) {
    res.push(
      pText(explanation, {
        sizePt: 12,
        indentFirstLineTwips: 709,
        spaceBeforeTwips: 20,
        spaceAfterTwips: 100,
      })
    );
  }
  return res;
}

function pTableCaption(caption: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({
        text: caption,
        font: FONT_FAMILY,
        size: 24,
        bold: true,
      }),
    ],
  });
}

function makeCell(
  text: string,
  opts?: {
    bold?: boolean;
    header?: boolean;
    result?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    colSpan?: number;
    rowSpan?: number;
    sizePt?: number;
  }
): TableCell {
  const fill = opts?.header ? 'E2E8F0' : opts?.result ? 'DCFCE7' : undefined;
  return new TableCell({
    columnSpan: opts?.colSpan,
    rowSpan: opts?.rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.CENTER,
        spacing: { before: 20, after: 20, line: 240 },
        children: [
          new TextRun({
            text,
            font: FONT_FAMILY,
            size: (opts?.sizePt ?? 10) * 2,
            bold: opts?.bold || opts?.header || opts?.result,
          }),
        ],
      }),
    ],
  });
}

/**
 * Создает документ Microsoft Word (.docx) со всей пояснительной запиской,
 * подробными пошаговыми формулами и всеми таблицами в структуре листа «В_отчет».
 */
export function buildCourseworkWordDocument(calc: FullCourseworkCalculation): Document {
  const { cipher, climate, internalConditions, wall, roof, basement, window: win } = calc;
  const bTypeDef = BUILDING_TYPES[internalConditions.buildingTypeId] || BUILDING_TYPES.administrative;
  const rNormWall = cipher.overrides?.R_norm_wall ?? bTypeDef.R_norm_wall;
  const rNormRoof = cipher.overrides?.R_norm_roof ?? bTypeDef.R_norm_roof;
  const rNormBasement = cipher.overrides?.R_norm_basement ?? bTypeDef.R_norm_basement;
  const alphaV = cipher.overrides?.alpha_v_wall ?? cipher.overrides?.alpha_v ?? bTypeDef.alpha_v;
  const alphaN = cipher.overrides?.alpha_n ?? 23;
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

  const t_3days_092 = +((climate.t_coldest_day_092 + climate.t_coldest_5days_092) / 2).toFixed(1);
  const wallSurface = wall.crossSectionProfile.slice(1, wall.crossSectionProfile.length - 1);
  const roofVoidProfile = roof.voidSection.crossSectionProfile;
  const roofVoidSurface = roofVoidProfile.slice(1, roofVoidProfile.length - 1);
  const e_n_ot = wall.crossSectionProfile[wall.crossSectionProfile.length - 1]?.e_partial ?? 475.8;
  const E_n_ot = wall.crossSectionProfile[wall.crossSectionProfile.length - 1]?.E_sat ?? 566.43;

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

  const makeProfileWordTable = (
    caption: string,
    profilePts: typeof wall.crossSectionProfile,
    isProtected: boolean,
    elementDesc: string
  ): (Paragraph | Table)[] => {
    return [
      pTableCaption(caption),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: TABLE_BORDERS,
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              makeCell('№ пл.', { header: true }),
              makeCell('Наименование расчетной плоскости / границы слоя', { header: true }),
              makeCell('x, мм', { header: true }),
              makeCell('ΣR_i, м²·°C/Вт', { header: true }),
              makeCell('t_x (зима), °C', { header: true }),
              makeCell('t_x (отоп.), °C', { header: true }),
              makeCell('e_x, Па', { header: true }),
              makeCell('E_x, Па', { header: true }),
              makeCell('E_x − e_x, Па', { header: true }),
              makeCell('Условие e_x ≤ E_x', { header: true }),
            ],
          }),
          ...profilePts.map((pt, idx) => {
            const isCond = pt.delta_margin < 0 && idx > 0 && idx < profilePts.length - 1;
            return new TableRow({
              children: [
                makeCell(
                  idx === 0
                    ? 'Воздух вн.'
                    : idx === profilePts.length - 1
                      ? 'Воздух нар.'
                      : `${idx}${pt.isVaporBarrier ? ' (ПИ)' : pt.isInsulationMidpoint ? ' (сер.)' : ''}`,
                  { bold: Boolean(pt.isVaporBarrier || pt.isInsulationMidpoint), sizePt: 9 }
                ),
                makeCell(pt.planeName, { align: AlignmentType.LEFT, sizePt: 9 }),
                makeCell(`${Math.round(pt.coord_x_mm)}`, { sizePt: 9 }),
                makeCell(fmtNum(pt.R_cumulative, 3), { sizePt: 9 }),
                makeCell(fmtNum(pt.temp_winter, 2), { sizePt: 9 }),
                makeCell(fmtNum(pt.temp_heating, 2), { bold: true, sizePt: 9 }),
                makeCell(fmtNum(pt.e_partial, 2), { bold: true, sizePt: 9 }),
                makeCell(fmtNum(pt.E_sat, 2), { bold: true, sizePt: 9 }),
                makeCell(fmtNum(pt.delta_margin, 2), {
                  result: idx > 0 && idx < profilePts.length - 1 && pt.delta_margin > 0,
                  sizePt: 9,
                }),
                makeCell(isCond ? 'e_x > E_x ✗' : 'e_x ≤ E_x ✓', {
                  result: !isCond,
                  bold: true,
                  sizePt: 9,
                }),
              ],
            });
          }),
        ],
      }),
      pText(
        isProtected
          ? `Вывод по Варианту 2 (с пароизоляцией): При наличии расчетного слоя пароизоляции во всех сечениях ${elementDesc} выполняется условие e_x < E_x — образование конденсата полностью исключено.`
          : `Вывод по Варианту 1 (без пароизоляции): В толще ${elementDesc} возникает зона возможной конденсации (e_x ≥ E_x) — требуется устройство расчетного пароизоляционного слоя с теплой стороны утеплителя (СП 2.04.01-2020 п. 10.6).`
      ),
    ];
  };

  const children: (Paragraph | Table)[] = [];

  // =========================================================================
  // ТИТУЛЬНЫЙ ЛИСТ БНТУ
  // =========================================================================
  children.push(
    pText('МИНИСТЕРСТВО ОБРАЗОВАНИЯ РЕСПУБЛИКИ БЕЛАРУСЬ', {
      bold: true,
      sizePt: 12,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 40,
    }),
    pText('БЕЛОРУССКИЙ НАЦИОНАЛЬНЫЙ ТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ', {
      bold: true,
      sizePt: 12,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 40,
    }),
    pText('Факультет энергетического строительства', {
      sizePt: 12,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 40,
    }),
    pText('Кафедра «Теплогазоснабжение и вентиляция»', {
      sizePt: 12,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 600,
    }),
    pText('РАСЧЕТНО-ПОЯСНИТЕЛЬНАЯ ЗАПИСКА', {
      bold: true,
      sizePt: 18,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceBeforeTwips: 360,
      spaceAfterTwips: 120,
    }),
    pText('к курсовой работе по дисциплине «Строительная теплофизика»', {
      bold: true,
      sizePt: 14,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 80,
    }),
    pText(
      `Тема: «Теплотехнический и тепловлажностный расчет наружных ограждающих конструкций здания (${internalConditions.buildingTypeName}, г. ${climate.name})»`,
      {
        sizePt: 13,
        align: AlignmentType.CENTER,
        indentFirstLineTwips: 0,
        spaceAfterTwips: 240,
      }
    ),
    pText(
      `Шифр задания: ${cipher.rawCipher} (Город: ${climate.name} [${cipher.cityCode}], этажей: ${cipher.floorsCount}, стена: ${cipher.wallCode}, покрытие: ${cipher.roofCode}, ПТП: ${cipher.basementCode}, утеплитель: ${cipher.insulationCode}, окно: ${cipher.windowCode})`,
      {
        bold: true,
        sizePt: 12,
        align: AlignmentType.CENTER,
        indentFirstLineTwips: 0,
        spaceAfterTwips: 700,
      }
    ),
    pText(`Выполнил студент гр. ${cipher.groupName || '11004224'}: ${cipher.studentName || '________________________'}`, {
      sizePt: 12,
      align: AlignmentType.RIGHT,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 120,
    }),
    pText('Проверил преподаватель: __________________', {
      sizePt: 12,
      align: AlignmentType.RIGHT,
      indentFirstLineTwips: 0,
      spaceAfterTwips: 700,
    }),
    pText(`Минск ${new Date().getFullYear()}`, {
      bold: true,
      sizePt: 12,
      align: AlignmentType.CENTER,
      indentFirstLineTwips: 0,
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // =========================================================================
  // ВВЕДЕНИЕ
  // =========================================================================
  children.push(
    pHeading('ВВЕДЕНИЕ', 1),
    pText(
      `В настоящей курсовой работе выполнен теплотехнический и тепловлажностный расчет наружных ограждающих конструкций многоэтажного здания (${internalConditions.buildingTypeName}, количество этажей N = ${cipher.floorsCount}, расчетная высота здания H = ${fmtNum(win.H_building, 1)} м) для климатических условий пункта строительства — г. ${climate.name} (${climate.region}).`
    ),
    pText(
      'Все расчеты выполнены в соответствии с действующими техническими нормативными правовыми актами Республики Беларусь: СП 2.04.01-2020 «Строительная теплотехника», СН 2.04.02-2020 «Здания и сооружения. Энергетическая эффективность», СП 2.04.04-2026 «Строительная климатология», СТБ 939-2013 «Окна и балконные двери для зданий и сооружений», а также учебно-методическим пособием БНТУ (А. С. Шибеко, 2018).'
    )
  );

  // =========================================================================
  // РАЗДЕЛ 1. ИСХОДНЫЕ КЛИМАТИЧЕСКИЕ И ТЕПЛОТЕХНИЧЕСКИЕ ДАННЫЕ (ТАБЛ. 1.1 И 1.2)
  // =========================================================================
  children.push(
    pHeading('1. ВЫБОР ИСХОДНЫХ КЛИМАТИЧЕСКИХ И ТЕПЛОТЕХНИЧЕСКИХ ДАННЫХ', 1),
    pText(
      `Пункт строительства — г. ${climate.name} (ближайшая опорная метеостанция — ${climate.nearestStation}). Климатические параметры наружного воздуха по СП 2.04.04-2026 сведены в таблицу 1.1 (в точном соответствии с листом «В_отчет»).`
    ),
    pTableCaption('Таблица 1.1 – Климатические параметры пункта строительства (СН 2.04.02-2020 / СП 2.04.04-2026)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Параметры наружного климата', { header: true }),
            makeCell('Обозначение', { header: true }),
            makeCell('Числовые значения', { header: true }),
            makeCell('Нормативный источник (СП 2.04.04-2026 / СП 2.04.01-2020)', { header: true }),
          ],
        }),
        ...[
          [
            'Температура воздуха наиболее холодных суток обеспеченностью 0,98, °C',
            't_х.с^(0,98)',
            fmtNum(climate.t_coldest_day_098, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 3',
          ],
          [
            'Температура воздуха наиболее холодных суток обеспеченностью 0,92, °C',
            't_х.с^(0,92)',
            fmtNum(climate.t_coldest_day_092, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 4',
          ],
          [
            'Температура воздуха наиболее холодной пятидневки обеспеченностью 0,98, °C',
            't_х.п^(0,98)',
            fmtNum(climate.t_coldest_5days_098, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 5',
          ],
          [
            'Температура воздуха наиболее холодной пятидневки обеспеченностью 0,92, °C',
            't_х.п^(0,92)',
            fmtNum(climate.t_coldest_5days_092, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 6',
          ],
          [
            'Температура воздуха наиболее холодных трёх суток обеспеченностью 0,92, °C',
            't_х.тр.с^(0,92)',
            fmtNum(t_3days_092, 1),
            'СП 2.04.01-2020, табл. 6.3 (расчетная)',
          ],
          [
            'Средняя скорость ветра за три наиболее холодных месяца, м/с',
            'v_ср',
            fmtNum(climate.wind_speed_winter, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 19',
          ],
          [
            'Средняя температура воздуха за отопительный период, °C',
            't_н.от',
            fmtNum(climate.t_heating_period, 1),
            'СП 2.04.04-2026, табл. 5.1, графа 11',
          ],
          [
            'Продолжительность отопительного периода, сут.',
            'z_от',
            fmtNum(climate.duration_heating_period, 0),
            'СП 2.04.04-2026, табл. 5.1, графа 12',
          ],
          [
            'Средняя относительная влажность воздуха за отопительный период, %',
            'φ_н.от',
            fmtNum(climate.rh_heating_period, 0),
            'СП 2.04.04-2026, табл. 5.1, графа 15',
          ],
        ].map(
          ([label, sym, val, src]) =>
            new TableRow({
              children: [
                makeCell(label, { align: AlignmentType.LEFT }),
                makeCell(sym),
                makeCell(val, { bold: true }),
                makeCell(src, { align: AlignmentType.LEFT }),
              ],
            })
        ),
      ],
    }),
    pText(
      `Расчетные параметры внутреннего воздуха для здания «${internalConditions.buildingTypeName}» и нормативные теплотехнические показатели ограждающих конструкций сведены в таблицу 1.2.`
    ),
    pTableCaption('Таблица 1.2 – Параметры микроклимата помещений и нормативные требования (СН 2.04.02-2020 / СП 2.04.01-2020)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Параметр микроклимата и теплозащиты', { header: true }),
            makeCell('Обозначение', { header: true }),
            makeCell('Значение', { header: true }),
            makeCell('Нормативный источник', { header: true }),
          ],
        }),
        ...[
          [
            'Расчетная температура внутреннего воздуха, °C',
            't_в',
            fmtNum(internalConditions.t_v, 1),
            'ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1',
          ],
          [
            'Расчетная относительная влажность внутреннего воздуха, %',
            'φ_в',
            fmtNum(internalConditions.phi_v, 0),
            'ГОСТ 30494-2011 / СН 2.04.02-2020, табл. 7.1',
          ],
          [
            'Минимально допустимая температура воздуха в техподполье, °C',
            't_п.мин',
            '+5,0',
            'СП 2.04.01-2020, п. К.3',
          ],
          [
            'Нормативное сопротивление теплопередаче наружной стены, м²·°C/Вт',
            'R_т.норм.ст',
            fmtNum(rNormWall, 2),
            'СН 2.04.02-2020, табл. 5.1',
          ],
          [
            'Нормативное сопротивление теплопередаче покрытия, м²·°C/Вт',
            'R_т.норм.пк',
            fmtNum(rNormRoof, 2),
            'СН 2.04.02-2020, табл. 5.1',
          ],
          [
            'Нормативное сопротивление теплопередаче перекрытия ПТП, м²·°C/Вт',
            'R_т.норм.птп',
            fmtNum(rNormBasement, 2),
            'СН 2.04.02-2020, табл. 5.1',
          ],
          [
            'Нормируемый температурный перепад для наружных стен, °C',
            'Δt_в.норм.ст',
            fmtNum(wall.delta_t_norm, 1),
            'СП 2.04.01-2020, табл. 6.5',
          ],
          [
            'Нормируемый температурный перепад для покрытия, °C',
            'Δt_в.норм.пк',
            fmtNum(roof.delta_t_norm, 1),
            'СП 2.04.01-2020, табл. 6.5',
          ],
          [
            'Нормируемый температурный перепад для перекрытия ПТП, °C',
            'Δt_в.норм.птп',
            fmtNum(basement.delta_t_floor_norm, 1),
            'СП 2.04.01-2020, табл. 6.5',
          ],
        ].map(
          ([label, sym, val, src]) =>
            new TableRow({
              children: [
                makeCell(label, { align: AlignmentType.LEFT }),
                makeCell(sym),
                makeCell(val, { bold: true }),
                makeCell(src, { align: AlignmentType.LEFT }),
              ],
            })
        ),
      ],
    }),
    ...pFormula(
      `E_в = 610,5 · exp((17,269 · t_в) / (237,3 + t_в)) = ${fmtNum(internalConditions.E_v, 2)} Па`,
      '(1.1)'
    ),
    ...pFormula(
      `e_в = (φ_в / 100) · E_в = (${fmtNum(internalConditions.phi_v, 0)} / 100) · ${fmtNum(internalConditions.E_v, 2)} = ${fmtNum(internalConditions.e_v, 2)} Па;   t_р = ${fmtNum(internalConditions.dew_point, 2)} °C`,
      '(1.2)',
      `Влажностный режим помещений — ${internalConditions.humidityRegimeName.toLowerCase()}, зона влажности — ${internalConditions.zone}, условия эксплуатации ограждающих конструкций — «${internalConditions.exploitationConditions}».`
    )
  );

  // =========================================================================
  // РАЗДЕЛ 2. НАРУЖНАЯ СТЕНА (ТАБЛ. 2.1 И 2.2)
  // =========================================================================
  children.push(
    pHeading(`2. ТЕПЛОТЕХНИЧЕСКИЙ И ТЕПЛОВЛАЖНОСТНЫЙ РАСЧЕТ НАРУЖНОЙ СТЕНЫ (${wall.construction.id})`, 1),
    pText(
      `Конструкция наружной стены ${wall.construction.id} (${wall.construction.typeName}, тип «${wall.construction.type}», повышающий коэффициент n = ${fmtNum(wall.construction.increasingFactor_n, 2)}) включает теплоизоляционный слой из материала «${wall.insulation.name}» (${wall.insulation.id}).${
        wall.vaporBarrier
          ? ` В конструкции предусмотрена пароизоляция: ${wall.vaporBarrier.name} (δ = ${wall.vaporBarrier.thicknessMm} мм, R_п = ${fmtTrim(wall.vaporBarrier.R_p, 3)} м²·ч·Па/мг; расположение: ${wall.vaporBarrier.placementLabel}).`
          : ''
      }`
    ),
    pTableCaption('Таблица 2.1 – Теплотехнические характеристики материалов слоев наружной стены'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('№ слоя', { header: true }),
            makeCell('Наименование материала слоев конструкции (изнутри наружу)', { header: true }),
            makeCell('Толщина слоя δ_i, м', { header: true }),
            makeCell('Плотность ρ_0, кг/м³', { header: true }),
            makeCell('λ, Вт/(м·°C)', { header: true }),
            makeCell('s, Вт/(м²·°C)', { header: true }),
            makeCell('μ, мг/(м·ч·Па)', { header: true }),
          ],
        }),
        ...wall.layers.map(
          (l, idx) =>
            new TableRow({
              children: [
                makeCell(l.isVaporBarrier ? `ПИ (${idx + 1})` : `${idx + 1}`),
                makeCell(l.materialName, { align: AlignmentType.LEFT }),
                makeCell(fmtNum(l.thickness, 3), { bold: true }),
                makeCell(l.density !== undefined ? `${l.density}` : '—'),
                makeCell(fmtTrim(l.lambda, 4)),
                makeCell(fmtTrim(l.s, 2)),
                makeCell(fmtTrim(l.mu, 5)),
              ],
            })
        ),
        new TableRow({
          children: [
            makeCell('Итого по наружной стене (R_0, R_п, D):', {
              result: true,
              colSpan: 2,
              align: AlignmentType.RIGHT,
            }),
            makeCell(
              fmtNum(
                wall.layers.reduce((a, l) => a + l.thickness, 0),
                3
              ),
              { result: true }
            ),
            makeCell(`R₀ = ${fmtNum(wall.R_total, 3)}`, { result: true }),
            makeCell(`Rт.тр = ${fmtNum(wall.R_required, 2)}`, { result: true }),
            makeCell(`D = ${fmtNum(wall.thermalInertia_D, 2)}`, { result: true }),
            makeCell(`Rп = ${fmtNum(wall.total_R_p, 3)}`, { result: true }),
          ],
        }),
      ],
    }),
    ...pFormula(
      `R_т.пр = R_т.норм · n = ${fmtNum(rNormWall, 2)} · ${fmtNum(wall.construction.increasingFactor_n, 2)} = ${fmtNum(wall.R_required, 2)} м²·°C/Вт`,
      '(2.1)'
    ),
    ...pFormula(
      `R_пр = 1/α_в + Σ R_i(без утепл.) + 1/α_н = 1/${fmtTrim(alphaV, 1)} + ${fmtNum(wall.R_without_insulation - 1 / alphaV - 1 / alphaN, 3)} + 1/${alphaN} = ${fmtNum(wall.R_without_insulation, 3)} м²·°C/Вт`,
      '(2.2)'
    ),
    ...pFormula(
      `δ_ут.расч = (R_т.пр − R_пр) · λ_ут = (${fmtNum(wall.R_required, 2)} − ${fmtNum(wall.R_without_insulation, 3)}) · ${fmtTrim(activeWallLambda, 4)} = ${fmtNum(wall.delta_insulation_calc, 3)} м → принято δ_ут = ${fmtNum(wall.delta_insulation_adopted, 3)} м (${Math.round(wall.delta_insulation_adopted * 1000)} мм)`,
      '(2.3)'
    ),
    ...pFormula(
      `R_0 = R_пр + δ_ут / λ_ут = ${fmtNum(wall.R_total, 3)} м²·°C/Вт ≥ R_т.пр = ${fmtNum(wall.R_required, 2)} м²·°C/Вт`,
      '(2.4)'
    ),
    ...pFormula(
      `D = Σ(R_i · s_i) = ${fmtNum(wall.thermalInertia_D, 2)} (${wall.designTempRule} → t_н = ${fmtNum(wall.design_t_out, 1)} °C)`,
      '(2.5)'
    ),
    ...pFormula(
      `Δt_в = (t_в − t_н) / (R_0 · α_в) = (${fmtNum(internalConditions.t_v, 1)} − (${fmtNum(wall.design_t_out, 1)})) / (${fmtNum(wall.R_total, 3)} · ${fmtTrim(alphaV, 1)}) = ${fmtNum(wall.delta_t_actual, 2)} °C ≤ ${fmtNum(wall.delta_t_norm, 1)} °C;   τ_в = ${fmtNum(wall.tau_v_min, 2)} °C > t_р = ${fmtNum(wall.dew_point, 2)} °C`,
      '(2.6)'
    ),
    pHeading('2.2. Проверка влажностного режима наружной стены методом К.Ф. Фокина', 2),
    ...pFormula(
      `t_x = t_в − ((t_в − t_н.от) / R_0) · (1/α_в + Σ_{i=1}^x R_i)`,
      '(2.7)'
    ),
    ...pFormula(
      `e_x = e_в − ((e_в − e_н.от) / R_п) · (1/37 + Σ_{i=1}^x R_пi),   где E_н.от = ${fmtNum(E_n_ot, 2)} Па, e_н.от = ${fmtNum(e_n_ot, 2)} Па, R_п = ${fmtNum(wall.total_R_p, 3)} м²·ч·Па/мг`,
      '(2.8)'
    ),
    ...(hasWallCondensation && wall.unprotectedVariant
      ? [
          ...makeProfileWordTable(
            'Таблица 2.2а – Распределение температуры и парциального давления водяного пара в наружной стене БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1)',
            wall.unprotectedVariant.crossSectionProfile,
            false,
            'наружной стены'
          ),
          ...makeProfileWordTable(
            'Таблица 2.2б – Распределение температуры и парциального давления водяного пара в наружной стене С ПАРОИЗОЛЯЦИЕЙ (Вариант 2)',
            (wall.protectedVariant ?? wall).crossSectionProfile,
            true,
            'наружной стены'
          ),
        ]
      : makeProfileWordTable(
          'Таблица 2.2 – Распределение температуры и парциального давления водяного пара в наружной стене',
          wall.crossSectionProfile,
          true,
          'наружной стены'
        ))
  );

  // =========================================================================
  // РАЗДЕЛ 3. ПОКРЫТИЕ / ЧЕРДАЧНОЕ ПЕРЕКРЫТИЕ (ТАБЛ. 3.1 И 3.2)
  // =========================================================================
  children.push(
    pHeading(`3. ТЕПЛОТЕХНИЧЕСКИЙ И ТЕПЛОВЛАЖНОСТНЫЙ РАСЧЕТ ПОКРЫТИЯ (${roof.construction.id})`, 1),
    pText(
      `Конструкция покрытия ${roof.construction.id} (${roof.construction.name}) содержит многопустотную железобетонную плиту высотой h = ${roof.hollowCore.height} мм с круглыми пустотами диаметром d = ${roof.hollowCore.voidDiameter} мм и шагом b = ${roof.hollowCore.spacing} мм. Расчет выполняется по двум сечениям: 2.1 — по ребрам плиты (R_ребро = ${fmtNum(roof.hollowCore.R_rib_worst, 3)} м²·°C/Вт) и 2.2 — по воздушной пустоте (R_пуст = ${fmtNum(roof.hollowCore.R_void_section, 3)} м²·°C/Вт).${
        roof.vaporBarrier
          ? ` Пароизоляция: ${roof.vaporBarrier.name} (δ = ${roof.vaporBarrier.thicknessMm} мм, R_п = ${fmtTrim(roof.vaporBarrier.R_p, 3)} м²·ч·Па/мг; расположение: ${roof.vaporBarrier.placementLabel}).`
          : ''
      }`
    ),
    pTableCaption('Таблица 3.1 – Теплотехнические характеристики материалов слоев покрытия'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('№ слоя', { header: true }),
            makeCell('Наименование материала слоев конструкции', { header: true }),
            makeCell('Толщина δ_i, м', { header: true }),
            makeCell('Плотность ρ_0, кг/м³', { header: true }),
            makeCell('λ, Вт/(м·°C)', { header: true }),
            makeCell('s, Вт/(м²·°C)', { header: true }),
            makeCell('μ, мг/(м·ч·Па)', { header: true }),
          ],
        }),
        ...roof.layers.map(
          (l, idx) =>
            new TableRow({
              children: [
                makeCell(l.isVaporBarrier ? `ПИ (${idx + 1})` : `${idx + 1}`),
                makeCell(l.materialName, { align: AlignmentType.LEFT }),
                makeCell(fmtNum(l.thickness, 3), { bold: true }),
                makeCell(l.density !== undefined ? `${l.density}` : '—'),
                makeCell(fmtTrim(l.lambda, 4)),
                makeCell(fmtTrim(l.s, 2)),
                makeCell(fmtTrim(l.mu, 5)),
              ],
            })
        ),
        new TableRow({
          children: [
            makeCell('Итого по покрытию (R_0, R_0^пуст, D_пуст, R_п):', {
              result: true,
              colSpan: 2,
              align: AlignmentType.RIGHT,
            }),
            makeCell(
              fmtNum(
                roof.layers.reduce((a, l) => a + l.thickness, 0),
                3
              ),
              { result: true }
            ),
            makeCell(`R₀ = ${fmtNum(roof.R_total, 3)}`, { result: true }),
            makeCell(`R₀.пуст = ${fmtNum(roofVoidProfile[roofVoidProfile.length - 1]?.R_cumulative ?? roof.voidSection.R_total_section, 3)}`, {
              result: true,
            }),
            makeCell(`Dпуст = ${fmtNum(roof.thermalInertia_D_void, 2)}`, { result: true }),
            makeCell(`Rп = ${fmtNum(roof.total_R_p, 3)}`, { result: true }),
          ],
        }),
      ],
    }),
    ...pFormula(
      `δ_ут.расч = ${fmtNum(roof.delta_insulation_calc, 3)} м (при λ_ут = ${fmtTrim(activeRoofLambda, 4)} Вт/(м·°C)) → принято δ_ут = ${fmtNum(roof.delta_insulation_adopted, 3)} м (${Math.round(roof.delta_insulation_adopted * 1000)} мм)`,
      '(3.1)'
    ),
    ...pFormula(
      `R_0 (по ребрам) = ${fmtNum(roof.R_total, 3)} м²·°C/Вт;   R_0^пуст (по пустоте) = ${fmtNum(roof.voidSection.R_total_section, 3)} м²·°C/Вт ≥ R_т.пр = ${fmtNum(roof.R_required, 2)} м²·°C/Вт`,
      '(3.2)'
    ),
    ...pFormula(
      `τ_в.пуст = ${fmtNum(roof.voidSection.tau_v_winter, 2)} °C;   τ_в.ребро = ${fmtNum(roof.worstSection.tau_v_winter, 2)} °C > t_р = ${fmtNum(roof.dew_point, 2)} °C`,
      '(3.3)'
    ),
    ...(hasRoofCondensation && roof.unprotectedVoidSection
      ? [
          ...makeProfileWordTable(
            'Таблица 3.2а – Распределение температуры и парциального давления водяного пара в покрытии БЕЗ ПАРОИЗОЛЯЦИИ (Вариант 1, сечение по пустоте)',
            roof.unprotectedVoidSection.crossSectionProfile,
            false,
            'покрытия'
          ),
          ...makeProfileWordTable(
            'Таблица 3.2б – Распределение температуры и парциального давления водяного пара в покрытии С ПАРОИЗОЛЯЦИЕЙ (Вариант 2, сечение по пустоте)',
            (roof.protectedVoidSection ?? roof.voidSection).crossSectionProfile,
            true,
            'покрытия'
          ),
        ]
      : makeProfileWordTable(
          'Таблица 3.2 – Распределение температуры и парциального давления водяного пара в покрытии (сечение по пустоте)',
          roofVoidProfile,
          true,
          'покрытия'
        ))
  );

  // =========================================================================
  // РАЗДЕЛ 4. ПЕРЕКРЫТИЕ НАД ТЕХНИЧЕСКИМ ПОДПОЛЬЕМ (ТАБЛ. 4.1 И 4.2)
  // =========================================================================
  children.push(
    pHeading(`4. ТЕПЛОВОЙ БАЛАНС И ВЛАЖНОСТНЫЙ РЕЖИМ ТЕХНИЧЕСКОГО ПОДПОЛЬЯ (${basement.construction.id})`, 1),
    pText(
      `Перекрытие над техническим подпольем ${basement.construction.id} (${basement.construction.name}) рассчитывается с учетом тепловыделений от трубопроводов инженерных коммуникаций, проложенных в пространстве подполья (по таблице Приложения О методического пособия Шибеко 2018, с. 108).`
    ),
    pTableCaption('Таблица 4.1 – Тепловыделения от трубопроводов в техническом подполье (Приложение О Шибеко 2018)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('№ участка', { header: true }),
            makeCell('Температура теплоносителя t_т, °C', { header: true }),
            makeCell('Условный диаметр d_у, мм', { header: true }),
            makeCell('Длина трубопровода l_i, м', { header: true }),
            makeCell('Линейная плотность теплового потока q_i^5, Вт/м', { header: true }),
            makeCell('Тепловой поток участка q_i^5 · l_i, Вт', { header: true }),
          ],
        }),
        ...basement.pipesDetails.map(
          (p, idx) =>
            new TableRow({
              children: [
                makeCell(`${idx + 1}`),
                makeCell(fmtNum(p.temp, 0)),
                makeCell(fmtNum(p.dy, 0)),
                makeCell(fmtNum(p.length, 1)),
                makeCell(fmtNum(p.q_heat_loss, 1)),
                makeCell(fmtNum(p.q_total, 1), { bold: true }),
              ],
            })
        ),
        new TableRow({
          children: [
            makeCell('Итого суммарные тепловыделения от трубопроводов Σ(q_i^5 · l_i), Вт:', {
              result: true,
              colSpan: 5,
              align: AlignmentType.RIGHT,
            }),
            makeCell(fmtNum(basement.pipeHeatGains_total, 1), { result: true }),
          ],
        }),
      ],
    }),
    pTableCaption('Таблица 4.2 – Теплотехнические характеристики слоев перекрытия над техподпольем и проверка конденсации'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('№ слоя', { header: true }),
            makeCell('Материал слоя ПТП', { header: true }),
            makeCell('Толщина δ, м', { header: true }),
            makeCell('λ, Вт/(м·°C)', { header: true }),
            makeCell('s, Вт/(м²·°C)', { header: true }),
            makeCell('μ, мг/(м·ч·Па)', { header: true }),
            makeCell('R_i, м²·°C/Вт', { header: true }),
            makeCell('R_пi, м²·ч·Па/мг', { header: true }),
          ],
        }),
        ...basement.layers.map(
          (l, idx) =>
            new TableRow({
              children: [
                makeCell(`${idx + 1}`),
                makeCell(l.materialName, { align: AlignmentType.LEFT }),
                makeCell(fmtNum(l.thickness, 3)),
                makeCell(fmtTrim(l.lambda, 4)),
                makeCell(fmtTrim(l.s, 2)),
                makeCell(fmtTrim(l.mu, 4)),
                makeCell(fmtNum(l.R, 3), { bold: true }),
                makeCell(fmtNum(l.R_p, 3)),
              ],
            })
        ),
        new TableRow({
          children: [
            makeCell('Итого по техподполью:', { result: true, colSpan: 2, align: AlignmentType.RIGHT }),
            makeCell(`Rптп = ${fmtNum(basement.R_ptp, 3)}`, { result: true }),
            makeCell(`tп = ${fmtNum(basement.crawlSpaceTemp_t_p, 2)} °C`, { result: true }),
            makeCell(`Δtп = ${fmtNum(basement.delta_t_floor, 2)} °C`, { result: true }),
            makeCell(`τв.цок = ${fmtNum(basement.tau_v_basement_wall, 2)} °C`, { result: true }),
            makeCell(`tр.п = ${fmtNum(basement.dew_point_basement, 2)} °C`, { result: true }),
            makeCell(`Rп = ${fmtNum(basement.total_R_p, 3)}`, { result: true }),
          ],
        }),
      ],
    }),
    ...pFormula(
      `R_ПТП = 1/α_в.п + Σ(δ_i / λ_i) + 1/α_н.п = ${fmtNum(basement.R_ptp, 3)} м²·°C/Вт ≥ R_т.норм = ${fmtNum(basement.R_required, 2)} м²·°C/Вт;   R_п.ПТП = 1/37 + ΣR_пi + 1/77 = ${fmtNum(basement.total_R_p, 2)} м²·ч·Па/мг`,
      '(4.1)'
    ),
    ...pFormula(
      `t_п = ${fmtNum(basement.crawlSpaceTemp_t_p, 2)} °C;   Δt_п = (t_в − t_п) / (R_ПТП · α_в.п) = ${fmtNum(basement.delta_t_floor, 2)} °C ≤ ${fmtNum(basement.delta_t_floor_norm, 1)} °C`,
      '(4.2)'
    ),
    ...pFormula(
      `τ_в.цок = ${fmtNum(basement.tau_v_basement_wall, 2)} °C > t_р.п = ${fmtNum(basement.dew_point_basement, 2)} °C (при φ_п = ${basement.crawlSpaceRH}%)`,
      '(4.3)'
    )
  );

  // =========================================================================
  // РАЗДЕЛ 5. ТЕПЛОТЕХНИЧЕСКИЙ РАСЧЕТ И ВОЗДУХОПРОНИЦАЕМОСТЬ ОКОН (ТАБЛ. 5.1–5.3)
  // =========================================================================
  children.push(
    pHeading(`5. ТЕПЛОТЕХНИЧЕСКИЙ РАСЧЕТ И ВОЗДУХОПРОНИЦАЕМОСТЬ ОКОН (${win.windowDef.id})`, 1),
    pText(
      `Оконный блок ${win.windowDef.id}: профильная система — ${win.windowDef.profileSystem} (R_непр = ${fmtNum(win.R_opaque, 2)} м²·°C/Вт), стеклопакет — ${win.windowDef.glazingType} (R_св = ${fmtNum(win.R_transparent, 2)} м²·°C/Вт), конструктивная схема — Вариант ${win.windowDef.typeScheme}, габариты H × B = ${win.windowDef.dim.H} × ${win.windowDef.dim.B} мм. Площади участков F_i вычисляются с точностью до 5 знаков после запятой, чтобы выполнялось точное равенство ΣF_непр + ΣF_св = F_ок.`
    ),
    pTableCaption('Таблица 5.1 (6.2) – Расчет приведенного сопротивления теплопередаче окна по участкам'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('№ зоны', { header: true }),
            makeCell('Наименование участка окна', { header: true }),
            makeCell('Ширина a_i, мм', { header: true }),
            makeCell('Длина b_i / l_i, мм', { header: true }),
            makeCell('Площадь F_i, м²', { header: true }),
            makeCell('R_тi, м²·°C/Вт', { header: true }),
            makeCell('F_i / R_тi, Вт/°C', { header: true }),
          ],
        }),
        ...win.zones.map(
          (z) =>
            new TableRow({
              children: [
                makeCell(z.code, { bold: true }),
                makeCell(z.name, { align: AlignmentType.LEFT }),
                makeCell(`${z.widthMm}`),
                makeCell(`${z.heightMm}`),
                makeCell(fmtNum(z.area_m2, 5)),
                makeCell(fmtNum(z.R_zone, 2)),
                makeCell(fmtNum(z.F_over_R, 3), { bold: true }),
              ],
            })
        ),
        new TableRow({
          children: [
            makeCell('Итого по непрозрачной части (профиль, уч. 1–9):', {
              result: true,
              colSpan: 4,
              align: AlignmentType.RIGHT,
            }),
            makeCell(fmtNum(win.area_opaque, 5), { result: true }),
            makeCell(fmtNum(win.R_opaque, 2), { result: true }),
            makeCell(fmtNum(win.F_over_R_opaque, 3), { result: true }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Итого по светопрозрачной части (остекление, уч. I–II):', {
              result: true,
              colSpan: 4,
              align: AlignmentType.RIGHT,
            }),
            makeCell(fmtNum(win.area_transparent, 5), { result: true }),
            makeCell(fmtNum(win.R_transparent, 2), { result: true }),
            makeCell(fmtNum(win.F_over_R_transparent, 3), { result: true }),
          ],
        }),
        new TableRow({
          children: [
            makeCell('Итого по окну (F_ок, R_т.ок, Σ(F_i/R_тi)):', {
              result: true,
              colSpan: 4,
              align: AlignmentType.RIGHT,
            }),
            makeCell(fmtNum(win.area_total, 5), { result: true }),
            makeCell(fmtNum(win.R_actual, 2), { result: true }),
            makeCell(fmtNum(win.sum_F_over_R, 3), { result: true }),
          ],
        }),
      ],
    }),
    ...pFormula(
      `R_т.ок = Σ F_i / Σ(F_i / R_тi) = ${fmtNum(win.area_total, 5)} / (${fmtNum(win.F_over_R_opaque, 3)} + ${fmtNum(win.F_over_R_transparent, 3)}) = ${fmtNum(win.area_total, 5)} / ${fmtNum(win.sum_F_over_R, 3)} = ${fmtNum(win.R_actual, 2)} м²·°C/Вт ≥ R_т.норм = ${fmtNum(win.R_norm, 2)} м²·°C/Вт`,
      '(5.1)'
    ),
    pHeading('5.2. Поэтажный расчет разности давлений Δp_i и требуемого класса воздухопроницаемости окон', 2),
    ...pFormula(
      `ρ_н = 353 / (273 + t_н) = 353 / (273 + (${fmtNum(climate.t_coldest_5days_092, 0)})) = ${fmtNum(win.rho_n, 2)} кг/м³;   ρ_в = 353 / (273 + t_в) = 353 / (273 + ${fmtNum(internalConditions.t_v, 0)}) = ${fmtNum(win.rho_v, 2)} кг/м³;   ρ_н − ρ_в = ${fmtNum(win.delta_rho, 2)} кг/м³`,
      '(5.2)'
    ),
    ...pFormula(
      `Δp_i = (H − h_i) · g · (ρ_н − ρ_в) + 0,5 · ρ_н · v_ср² · (c_н − c_п) · k_i`,
      '(5.3 / 6.2)',
      `где H = ${fmtNum(win.H_building, 1)} м — высота здания; h_i — высота центра окна i-го этажа, м; g = 9,81 м/с²; v_ср = ${fmtNum(win.v_sr, 1)} м/с; c_н − c_п = 0,8 − (−0,6) = ${fmtNum(win.delta_c, 1)}; k_i — коэффициент изменения скоростного напора ветра по высоте для типа местности «${win.terrainType}».`
    ),
    ...pFormula(
      `R_в.тр = (1 / G_норм) · (Δp_i / Δp_0)^(2/3),   где G_норм = ${fmtNum(win.G_norm, 1)} кг/(м²·ч), Δp_0 = 10 Па`,
      '(5.4 / 6.3)'
    ),
    pTableCaption('Таблица 5.2 (6.1) – Классификация окон по воздухопроницаемости при Δp_0 = 10 Па (СТБ 939-2013)'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Класс по воздухопроницаемости', { header: true }),
            makeCell('Объемная воздухопроницаемость Q_10, м³/(ч·м²)', { header: true }),
            makeCell('Сопротивление воздухопроницанию R_в, (м²·ч)/кг', { header: true }),
          ],
        }),
        ...WINDOW_AIR_PERMEABILITY_CLASSES.map(
          (row) =>
            new TableRow({
              children: [
                makeCell(`Класс ${row.classLetter}`, { bold: true }),
                makeCell(row.volumePermeabilityRange),
                makeCell(row.rvRangeText, { bold: true }),
              ],
            })
        ),
      ],
    }),
    pTableCaption(
      'Таблица 5.3 (6.3 и 6.4) – Поэтажный расчет разности давлений Δp_i, требуемого сопротивления воздухопроницанию R_в.тр и выбор класса окон по СТБ 939-2013'
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeCell('Этаж', { header: true, sizePt: 9 }),
            makeCell('h_i, м', { header: true, sizePt: 9 }),
            makeCell('k_i', { header: true, sizePt: 9 }),
            makeCell('ρ_н, кг/м³', { header: true, sizePt: 9 }),
            makeCell('ρ_в, кг/м³', { header: true, sizePt: 9 }),
            makeCell('Δp_грав, Па', { header: true, sizePt: 9 }),
            makeCell('Δp_ветр, Па', { header: true, sizePt: 9 }),
            makeCell('Δp_i, Па', { header: true, sizePt: 9 }),
            makeCell('R_в.тр, (м²·ч)/кг', { header: true, sizePt: 9 }),
            makeCell('1,2 · R_в.тр', { header: true, sizePt: 9 }),
            makeCell('Класс окна (СТБ 939)', { header: true, sizePt: 9 }),
          ],
        }),
        ...win.floors.map(
          (fl) =>
            new TableRow({
              children: [
                makeCell(`${fl.floor}`, { bold: true, sizePt: 9 }),
                makeCell(fmtNum(fl.height, 2), { sizePt: 9 }),
                makeCell(fmtNum(fl.k_i, 3), { sizePt: 9 }),
                makeCell(fmtNum(win.rho_n, 2), { sizePt: 9 }),
                makeCell(fmtNum(win.rho_v, 2), { sizePt: 9 }),
                makeCell(fmtNum(fl.delta_p_grav, 2), { sizePt: 9 }),
                makeCell(fmtNum(fl.delta_p_wind, 2), { sizePt: 9 }),
                makeCell(fmtNum(fl.delta_p, 2), { bold: true, sizePt: 9 }),
                makeCell(fmtNum(fl.R_v_required, 3), { bold: true, sizePt: 9 }),
                makeCell(fmtNum(fl.R_v_max, 3), { sizePt: 9 }),
                makeCell(fl.windowClassRangeText || fl.windowClass, { result: true, sizePt: 9 }),
              ],
            })
        ),
      ],
    })
  );

  // =========================================================================
  // ЗАКЛЮЧЕНИЕ И СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ
  // =========================================================================
  children.push(
    pHeading('ЗАКЛЮЧЕНИЕ', 1),
    pText(
      `1. Для наружной стены ${wall.construction.id} принята толщина утеплителя «${wall.insulation.name}» δ_ут = ${fmtNum(wall.delta_insulation_adopted, 3)} м (${Math.round(wall.delta_insulation_adopted * 1000)} мм). Общее сопротивление теплопередаче R_0 = ${fmtNum(wall.R_total, 3)} м²·°C/Вт ≥ R_т.пр = ${fmtNum(wall.R_required, 2)} м²·°C/Вт. Температура внутренней поверхности τ_в = ${fmtNum(wall.tau_v_min, 2)} °C > t_р = ${fmtNum(wall.dew_point, 2)} °C.`
    ),
    pText(
      `2. Для покрытия ${roof.construction.id} принята толщина утеплителя δ_ут = ${fmtNum(roof.delta_insulation_adopted, 3)} м (${Math.round(roof.delta_insulation_adopted * 1000)} мм). Общее сопротивление теплопередаче по ребрам R_0 = ${fmtNum(roof.R_total, 3)} м²·°C/Вт, по пустоте R_0^пуст = ${fmtNum(roof.voidSection.R_total_section, 3)} м²·°C/Вт ≥ R_т.пр = ${fmtNum(roof.R_required, 2)} м²·°C/Вт.`
    ),
    pText(
      `3. Для перекрытия над техническим подпольем ${basement.construction.id} сопротивление теплопередаче R_ПТП = ${fmtNum(basement.R_ptp, 3)} м²·°C/Вт, температура воздуха в подполье из уравнения теплового баланса t_п = ${fmtNum(basement.crawlSpaceTemp_t_p, 2)} °C, температурный перепад на полу первого этажа Δt_п = ${fmtNum(basement.delta_t_floor, 2)} °C ≤ ${fmtNum(basement.delta_t_floor_norm, 1)} °C.`
    ),
    pText(
      `4. Приведенное сопротивление теплопередаче окна ${win.windowDef.id} составляет R_т.ок = ${fmtNum(win.R_actual, 2)} м²·°C/Вт ≥ ${fmtNum(win.R_norm, 2)} м²·°C/Вт. Для всех ${cipher.floorsCount} этажей здания определены разности давлений Δp_i и назначены классы воздухопроницаемости окон по СТБ 939-2013.`
    ),
    pHeading('СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ', 1),
    pText(
      '1. СП 2.04.01-2020. Строительная теплотехника. Строительные правила Республики Беларусь. – Минск : Минстройархитектуры Республики Беларусь, 2020.'
    ),
    pText(
      '2. СН 2.04.02-2020. Здания и сооружения. Энергетическая эффективность. Строительные нормы Республики Беларусь. – Минск : Минстройархитектуры Республики Беларусь, 2020.'
    ),
    pText(
      '3. СП 2.04.04-2026. Строительная климатология. Строительные правила Республики Беларусь. – Минск : Минстройархитектуры Республики Беларусь, 2026.'
    ),
    pText(
      '4. СТБ 939-2013. Окна и балконные двери для зданий и сооружений. Общие технические условия. – Минск : Госстандарт, 2013.'
    ),
    pText(
      '5. Строительная теплофизика : учебно-методическое пособие для выполнения курсовой работы / А. С. Шибеко. – Минск : БНТУ, 2018. – 115 с.'
    )
  );

  void wallSurface;
  void roofVoidSurface;

  return new Document({
    creator: 'БНТУ Строительная теплофизика',
    title: `Пояснительная записка БНТУ — ${climate.name} (${cipher.rawCipher})`,
    description: 'Теплотехнический и тепловлажностный расчет наружных ограждающих конструкций здания',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 20 мм
              bottom: 1134, // 20 мм
              left: 1701, // 30 мм по ГОСТ/БНТУ
              right: 850, // 15 мм
            },
          },
        },
        children,
      },
    ],
  });
}

/**
 * Генерирует бинарный буфер .docx (Uint8Array) для проверки в тестах и скачивания в браузере.
 */
export async function buildCourseworkDocxBuffer(
  calc: FullCourseworkCalculation
): Promise<Uint8Array> {
  const doc = buildCourseworkWordDocument(calc);
  const u8 = await Packer.toBuffer(doc);
  return new Uint8Array(u8);
}

/**
 * Скачивает готовую пояснительную записку в формате Microsoft Word (.docx) в браузере.
 */
export async function exportCourseworkToWord(calc: FullCourseworkCalculation): Promise<void> {
  const doc = buildCourseworkWordDocument(calc);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeCity = calc.climate.name.replace(/[^\wа-яА-ЯёЁ-]+/g, '_');
  link.href = url;
  link.download = `ПЗ_Теплофизика_БНТУ_${safeCity}_${calc.cipher.wallCode}_${calc.cipher.roofCode}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
