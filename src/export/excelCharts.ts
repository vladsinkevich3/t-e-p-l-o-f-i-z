/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Генератор нативных диаграмм Excel (OOXML DrawingML Charts) для графиков
 * тепловлажностного режима по методике А. С. Шибеко (раздел 7):
 *   - Масштаб толщин x (мм): кривые t(x) на левой оси Y (°C), E(x) и e(x) на правой оси Y (Па)
 *   - Масштаб сопротивлений паропроницанию R_п: кривые E(R_п) и e(R_п)
 * Инжектирует валидные xl/charts/chartN.xml + xl/drawings/drawing1.xml в .xlsx архив.
 */

import JSZip from 'jszip';

export interface ExcelScatterSeriesSpec {
  name: string;
  xFormula: string; // например: "'Графики_Шибеко'!$B$51:$B$58"
  yFormula: string; // например: "'Графики_Шибеко'!$D$51:$D$58"
  xValues: number[];
  yValues: number[];
  colorHex: string; // 6-значный HEX без '#', например "DC2626"
  dash?: 'solid' | 'dash' | 'sysDash';
  smooth?: boolean;
  markerSymbol?: 'circle' | 'diamond' | 'square' | 'triangle';
}

export interface ExcelChartSpec {
  title: string;
  xAxisTitle: string;
  yAxisTitle: string;
  y2AxisTitle?: string;
  primarySeries: ExcelScatterSeriesSpec[];
  secondarySeries?: ExcelScatterSeriesSpec[];
  xMaxHint?: number;
  // Позиция якоря (0-индексированные колонки и строки)
  fromCol: number;
  fromRow: number;
  toCol: number;
  toRow: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlFormula(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildNumCacheXml(values: number[], formatCode = 'General'): string {
  const pts = values
    .map((v, idx) =>
      Number.isFinite(v) ? `<c:pt idx="${idx}"><c:v>${v}</c:v></c:pt>` : ''
    )
    .filter(Boolean)
    .join('');
  return `<c:numCache><c:formatCode>${escapeXml(formatCode)}</c:formatCode><c:ptCount val="${values.length}"/>${pts}</c:numCache>`;
}

function buildAxisTitleXml(text: string, colorHex = '334155'): string {
  return (
    `<c:title>` +
    `<c:tx><c:rich>` +
    `<a:bodyPr/>` +
    `<a:lstStyle/>` +
    `<a:p><a:pPr><a:defRPr sz="950" b="1"><a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr>` +
    `<a:r><a:rPr lang="ru-RU" sz="950" b="1"><a:solidFill><a:srgbClr val="${colorHex}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r>` +
    `</a:p></c:rich></c:tx>` +
    `<c:layout/>` +
    `<c:overlay val="0"/>` +
    `</c:title>`
  );
}

function buildChartTitleXml(text: string): string {
  return (
    `<c:title>` +
    `<c:tx><c:rich>` +
    `<a:bodyPr/>` +
    `<a:lstStyle/>` +
    `<a:p><a:pPr><a:defRPr sz="1150" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr>` +
    `<a:r><a:rPr lang="ru-RU" sz="1150" b="1"><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r>` +
    `</a:p></c:rich></c:tx>` +
    `<c:layout/>` +
    `<c:overlay val="0"/>` +
    `</c:title>`
  );
}

function buildSeriesXml(s: ExcelScatterSeriesSpec, idx: number, order: number): string {
  const dashXml = s.dash && s.dash !== 'solid' ? `<a:prstDash val="${s.dash}"/>` : '<a:prstDash val="solid"/>';
  const symbol = s.markerSymbol || 'circle';
  return (
    `<c:ser>` +
    `<c:idx val="${idx}"/>` +
    `<c:order val="${order}"/>` +
    `<c:tx><c:v>${escapeXml(s.name)}</c:v></c:tx>` +
    `<c:spPr>` +
    `<a:ln w="25400" cap="rnd">` +
    `<a:solidFill><a:srgbClr val="${s.colorHex}"/></a:solidFill>` +
    `${dashXml}` +
    `</a:ln>` +
    `</c:spPr>` +
    `<c:marker>` +
    `<c:symbol val="${symbol}"/>` +
    `<c:size val="6"/>` +
    `<c:spPr>` +
    `<a:solidFill><a:srgbClr val="${s.colorHex}"/></a:solidFill>` +
    `<a:ln w="12700"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>` +
    `</c:spPr>` +
    `</c:marker>` +
    `<c:xVal><c:numRef><c:f>${escapeXmlFormula(s.xFormula)}</c:f>${buildNumCacheXml(s.xValues, '0.00')}</c:numRef></c:xVal>` +
    `<c:yVal><c:numRef><c:f>${escapeXmlFormula(s.yFormula)}</c:f>${buildNumCacheXml(s.yValues, '0.0')}</c:numRef></c:yVal>` +
    `<c:smooth val="${s.smooth ? 1 : 0}"/>` +
    `</c:ser>`
  );
}

function buildChartXml(spec: ExcelChartSpec): string {
  const hasSecondary = Boolean(spec.secondarySeries && spec.secondarySeries.length > 0);
  const primarySeriesXml = spec.primarySeries
    .map((s, i) => buildSeriesXml(s, i, i))
    .join('');

  const secondarySeriesXml = hasSecondary
    ? spec.secondarySeries!
        .map((s, i) => {
          const globalIdx = spec.primarySeries.length + i;
          return buildSeriesXml(s, globalIdx, globalIdx);
        })
        .join('')
    : '';

  const secondaryPlotXml = hasSecondary
    ? `<c:scatterChart>` +
      `<c:scatterStyle val="smoothMarker"/>` +
      `<c:varyColors val="0"/>` +
      `${secondarySeriesXml}` +
      `<c:axId val="1003"/>` +
      `<c:axId val="1004"/>` +
      `</c:scatterChart>`
    : '';

  const secondaryAxesXml = hasSecondary
    ? `<c:valAx>` +
      `<c:axId val="1003"/>` +
      `<c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling>` +
      `<c:delete val="1"/>` +
      `<c:axPos val="t"/>` +
      `<c:numFmt formatCode="General" sourceLinked="1"/>` +
      `<c:majorTickMark val="none"/>` +
      `<c:minorTickMark val="none"/>` +
      `<c:tickLblPos val="none"/>` +
      `<c:crossAx val="1004"/>` +
      `<c:crosses val="max"/>` +
      `<c:crossBetween val="midCat"/>` +
      `</c:valAx>` +
      `<c:valAx>` +
      `<c:axId val="1004"/>` +
      `<c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling>` +
      `<c:delete val="0"/>` +
      `<c:axPos val="r"/>` +
      `${buildAxisTitleXml(spec.y2AxisTitle || 'Парциальное давление E, e, Па', '1D4ED8')}` +
      `<c:numFmt formatCode="0" sourceLinked="0"/>` +
      `<c:majorTickMark val="out"/>` +
      `<c:minorTickMark val="none"/>` +
      `<c:tickLblPos val="nextTo"/>` +
      `<c:spPr><a:ln w="12700"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill></a:ln></c:spPr>` +
      `<c:crossAx val="1003"/>` +
      `<c:crosses val="max"/>` +
      `<c:crossBetween val="midCat"/>` +
      `</c:valAx>`
    : '';

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<c:date1904 val="0"/>` +
    `<c:lang val="ru-RU"/>` +
    `<c:roundedCorners val="0"/>` +
    `<c:chart>` +
    `${buildChartTitleXml(spec.title)}` +
    `<c:autoTitleDeleted val="0"/>` +
    `<c:plotArea>` +
    `<c:layout/>` +
    `<c:scatterChart>` +
    `<c:scatterStyle val="lineMarker"/>` +
    `<c:varyColors val="0"/>` +
    `${primarySeriesXml}` +
    `<c:axId val="1001"/>` +
    `<c:axId val="1002"/>` +
    `</c:scatterChart>` +
    `${secondaryPlotXml}` +
    `<c:valAx>` +
    `<c:axId val="1001"/>` +
    `<c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling>` +
    `<c:delete val="0"/>` +
    `<c:axPos val="b"/>` +
    `<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `${buildAxisTitleXml(spec.xAxisTitle, '334155')}` +
    `<c:numFmt formatCode="General" sourceLinked="1"/>` +
    `<c:majorTickMark val="out"/>` +
    `<c:minorTickMark val="none"/>` +
    `<c:tickLblPos val="low"/>` +
    `<c:spPr><a:ln w="12700"><a:solidFill><a:srgbClr val="64748B"/></a:solidFill></a:ln></c:spPr>` +
    `<c:crossAx val="1002"/>` +
    `<c:crosses val="autoZero"/>` +
    `<c:crossBetween val="midCat"/>` +
    `</c:valAx>` +
    `<c:valAx>` +
    `<c:axId val="1002"/>` +
    `<c:scaling><c:orientation val="minMax"/>${hasSecondary ? '' : '<c:min val="0"/>'}</c:scaling>` +
    `<c:delete val="0"/>` +
    `<c:axPos val="l"/>` +
    `<c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` +
    `${buildAxisTitleXml(spec.yAxisTitle, hasSecondary ? 'B91C1C' : '1D4ED8')}` +
    `<c:numFmt formatCode="0" sourceLinked="0"/>` +
    `<c:majorTickMark val="out"/>` +
    `<c:minorTickMark val="none"/>` +
    `<c:tickLblPos val="nextTo"/>` +
    `<c:spPr><a:ln w="12700"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill></a:ln></c:spPr>` +
    `<c:crossAx val="1001"/>` +
    `<c:crosses val="autoZero"/>` +
    `<c:crossBetween val="midCat"/>` +
    `</c:valAx>` +
    `${secondaryAxesXml}` +
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr>` +
    `</c:plotArea>` +
    `<c:legend>` +
    `<c:legendPos val="b"/>` +
    `<c:layout/>` +
    `<c:overlay val="0"/>` +
    `</c:legend>` +
    `<c:plotVisOnly val="1"/>` +
    `<c:dispBlanksAs val="gap"/>` +
    `</c:chart>` +
    `<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:ln></c:spPr>` +
    `</c:chartSpace>`
  );
}

function buildDrawingXml(charts: ExcelChartSpec[]): string {
  const anchors = charts
    .map((ch, idx) => {
      const rId = `rId${idx + 1}`;
      const shapeId = idx + 2;
      return (
        `<xdr:twoCellAnchor>` +
        `<xdr:from><xdr:col>${ch.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:to><xdr:col>${ch.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${ch.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
        `<xdr:graphicFrame macro="">` +
        `<xdr:nvGraphicFramePr>` +
        `<xdr:cNvPr id="${shapeId}" name="Chart ${idx + 1}"/>` +
        `<xdr:cNvGraphicFramePr/>` +
        `</xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<a:graphic>` +
        `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">` +
        `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rId}"/>` +
        `</a:graphicData>` +
        `</a:graphic>` +
        `</xdr:graphicFrame>` +
        `<xdr:clientData/>` +
        `</xdr:twoCellAnchor>`
      );
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `${anchors}` +
    `</xdr:wsDr>`
  );
}

function buildDrawingRelsXml(chartCount: number): string {
  const rels = Array.from({ length: chartCount }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${i + 1}.xml"/>`
  ).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `${rels}` +
    `</Relationships>`
  );
}

/**
 * Инжектирует нативные Excel-диаграммы на указанный лист готового .xlsx буфера.
 */
export async function injectChartsIntoXlsx(
  xlsxBuffer: ArrayBuffer | Uint8Array,
  targetSheetName: string,
  charts: ExcelChartSpec[]
): Promise<Uint8Array> {
  if (charts.length === 0) {
    return xlsxBuffer instanceof Uint8Array ? xlsxBuffer : new Uint8Array(xlsxBuffer);
  }

  const zip = await JSZip.loadAsync(xlsxBuffer);

  // 1. Находим файл листа (xl/worksheets/sheetN.xml) по его имени в xl/workbook.xml
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const workbookRelsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbookXml || !workbookRelsXml) {
    throw new Error('Некорректный .xlsx архив: отсутствует xl/workbook.xml');
  }

  const escapedName = targetSheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sheetTagMatch = workbookXml.match(
    new RegExp(`<sheet[^>]*name="${escapedName}"[^>]*>`, 'i')
  );
  if (!sheetTagMatch) {
    throw new Error(`Лист "${targetSheetName}" не найден в xl/workbook.xml`);
  }
  const rIdMatch = sheetTagMatch[0].match(/r:id="([^"]+)"/);
  if (!rIdMatch) {
    throw new Error(`Не найден r:id для листа "${targetSheetName}"`);
  }
  const sheetRelId = rIdMatch[1];

  const relEntryMatch = workbookRelsXml.match(
    new RegExp(`<Relationship[^>]*Id="${sheetRelId}"[^>]*Target="([^"]+)"`, 'i')
  );
  if (!relEntryMatch) {
    throw new Error(`Не найден Target для отношения ${sheetRelId}`);
  }
  const sheetTarget = relEntryMatch[1].replace(/^\/?xl\//, '');
  const sheetZipPath = `xl/${sheetTarget}`;
  const sheetFileName = sheetTarget.split('/').pop()!;
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;

  const sheetXml = await zip.file(sheetZipPath)?.async('string');
  if (!sheetXml) {
    throw new Error(`Не найден XML-файл листа ${sheetZipPath}`);
  }

  // 2. Добавляем файлы диаграмм и чертежа (drawing)
  charts.forEach((spec, idx) => {
    zip.file(`xl/charts/chart${idx + 1}.xml`, buildChartXml(spec));
  });
  zip.file('xl/drawings/drawing1.xml', buildDrawingXml(charts));
  zip.file('xl/drawings/_rels/drawing1.xml.rels', buildDrawingRelsXml(charts.length));

  // 3. Привязываем drawing1.xml к целевому листу
  const drawingRelId = 'rIdShibekoDrawing1';
  const drawingRelTag = `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>`;

  const existingSheetRels = await zip.file(sheetRelsPath)?.async('string');
  if (existingSheetRels) {
    const updatedRels = existingSheetRels.replace(
      '</Relationships>',
      `${drawingRelTag}</Relationships>`
    );
    zip.file(sheetRelsPath, updatedRels);
  } else {
    zip.file(
      sheetRelsPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `${drawingRelTag}` +
        `</Relationships>`
    );
  }

  // Вставляем <drawing r:id="..."/> перед <extLst или перед </worksheet>
  let updatedSheetXml = sheetXml;
  if (!updatedSheetXml.includes('xmlns:r=')) {
    updatedSheetXml = updatedSheetXml.replace(
      '<worksheet ',
      '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    );
  }
  const drawingElement = `<drawing r:id="${drawingRelId}"/>`;
  if (updatedSheetXml.includes('<extLst')) {
    updatedSheetXml = updatedSheetXml.replace('<extLst', `${drawingElement}<extLst`);
  } else {
    updatedSheetXml = updatedSheetXml.replace('</worksheet>', `${drawingElement}</worksheet>`);
  }
  zip.file(sheetZipPath, updatedSheetXml);

  // 4. Регистрируем Content Types для drawing1.xml и chart1..N.xml
  const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
  if (!contentTypesXml) {
    throw new Error('Отсутствует [Content_Types].xml');
  }
  const overrides = [
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
    ...charts.map(
      (_, idx) =>
        `<Override PartName="/xl/charts/chart${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
    ),
  ].join('');
  const updatedContentTypes = contentTypesXml.replace('</Types>', `${overrides}</Types>`);
  zip.file('[Content_Types].xml', updatedContentTypes);

  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
