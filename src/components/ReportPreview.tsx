/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Академическая расчетно-пояснительная записка по ГОСТ 2.105-95 / ЕСКД
 * Структура и оформление приведены к эталонному примеру курсовой работы БНТУ 2026
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { WINDOW_AIR_PERMEABILITY_CLASSES } from '../data/normative';
import { Printer, Download } from 'lucide-react';

interface ReportPreviewProps {
  calc: FullCourseworkCalculation;
  onPrint: () => void;
  onExportPdf: () => void;
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

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  calc,
  onPrint,
  onExportPdf,
}) => {
  const { wall, roof, basement, window: win, climate, internalConditions, cipher } = calc;

  const rNormWall =
    cipher.overrides?.R_norm_wall ??
    BUILDING_TYPES[internalConditions.buildingTypeId]?.R_norm_wall ??
    3.2;
  const rNormRoof =
    cipher.overrides?.R_norm_roof ??
    BUILDING_TYPES[internalConditions.buildingTypeId]?.R_norm_roof ??
    6.0;
  const rNormBasement =
    cipher.overrides?.R_norm_basement ??
    BUILDING_TYPES[internalConditions.buildingTypeId]?.R_norm_basement ??
    2.5;
  const activeWallLambda =
    cipher.overrides?.wallInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? wall.insulation.lambda_A
      : wall.insulation.lambda_B);
  const alphaV = cipher.overrides?.alpha_v_wall ?? cipher.overrides?.alpha_v ?? 8.7;

  const roofTitleLabel =
    roof.construction.kind === 'чердачное'
      ? 'чердачного перекрытия'
      : roof.construction.kind === 'над_проездом'
      ? 'перекрытия над проездом'
      : 'совмещенного покрытия';

  const docCode = `БНТУ.ТГВ.${cipher.groupName || '11004224'}.КР.ПЗ`;
  const roofTableProfile =
    roof.activeSectionType === 'void'
      ? roof.voidSection.crossSectionProfile
      : roof.worstSection.crossSectionProfile;
  const roofTableR =
    roof.activeSectionType === 'void'
      ? roof.voidSection.R_total_section
      : roof.worstSection.R_total_section;

  return (
    <div className="space-y-6">
      {/* Панель управления отчетом */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl print:hidden">
        <div>
          <h2 className="text-sm font-bold text-white">
            Расчетно-пояснительная записка (оформление по образцу БНТУ / ГОСТ 2.105-95)
          </h2>
          <p className="text-xs text-slate-400">
            Титульный лист, содержание, введение, разделы 1–5 (с таблицами 6.1–6.4 по окнам, без дверей), заключение и источники
          </p>
        </div>
        <div className="flex space-x-2">
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

      {/* Сам академический документ (листы с рамкой ЕСКД и штампом) */}
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
                [`3. Теплотехнический расчет ${roofTitleLabel} (${roof.construction.id})`, '5'],
                [`4. Теплотехнический расчет технического подполья (${basement.construction.id})`, '6'],
                [`5. Теплотехнический расчет оконного заполнения (${win.windowDef.id})`, '7'],
                ['ЗАКЛЮЧЕНИЕ', '8'],
                ['СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ', '8'],
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
              <b>Исходные данные для проектирования:</b> шифр задания — <b>{cipher.rawCipher}</b>. Тип здания — <b>{internalConditions.buildingTypeName}</b> ({cipher.buildingType}); пункт строительства — <b>г. {climate.name} ({climate.id}, {climate.region})</b>; число этажей — <b>{cipher.floorsCount}</b> (расчетная высота здания H = 3,7 + 3,0·{cipher.floorsCount} = <b>{win.H_building.toFixed(1)} м</b>); наружная стена — <b>{wall.construction.id}</b>; {roofTitleLabel} — <b>{roof.construction.id}</b>; техническое подполье — <b>{basement.construction.id}</b>; утеплитель — <b>{wall.insulation.id} ({wall.insulation.name})</b>; оконный блок — <b>{win.windowDef.id} ({win.windowDef.profileSystem})</b>.
            </p>
          </div>

          <EskdFooterStamp pageNum={2} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 3: РАЗДЕЛ 1 ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            1. Выбор расчетных параметров наружного и внутреннего воздуха
          </h2>

          <p className="indent-6 text-justify">
            Климатические характеристики района строительства (г. {climate.name}, ближайшая метеостанция — {climate.nearestStation}) приняты по СП 2.04.04-2026 «Строительная климатология» и приведены в таблице 1.1.
          </p>

          <p className="text-xs font-bold">Таблица 1.1 — Климатические параметры наружного воздуха (г. {climate.name}, {climate.id})</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 text-left">Наименование параметра</th>
                <th className="border border-black p-1.5 text-center w-28">Обозначение</th>
                <th className="border border-black p-1.5 text-center w-28">Значение</th>
                <th className="border border-black p-1.5 text-center w-24">Ед. изм.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5">Температура наиболее холодных суток обеспеченностью 0,98</td>
                <td className="border border-black p-1.5 text-center font-mono">tх.с(0,98)</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.t_coldest_day_098}</td>
                <td className="border border-black p-1.5 text-center">°C</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура наиболее холодных суток обеспеченностью 0,92</td>
                <td className="border border-black p-1.5 text-center font-mono">tх.с(0,92)</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.t_coldest_day_092}</td>
                <td className="border border-black p-1.5 text-center">°C</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура наиболее холодной пятидневки обеспеченностью 0,92</td>
                <td className="border border-black p-1.5 text-center font-mono">tх.5(0,92)</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.t_coldest_5days_092}</td>
                <td className="border border-black p-1.5 text-center">°C</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя температура отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">tн.от</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.t_heating_period}</td>
                <td className="border border-black p-1.5 text-center">°C</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Продолжительность отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">zот</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.duration_heating_period}</td>
                <td className="border border-black p-1.5 text-center">сут</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя относительная влажность отопительного периода</td>
                <td className="border border-black p-1.5 text-center font-mono">φн.от</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.rh_heating_period}</td>
                <td className="border border-black p-1.5 text-center">%</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Средняя скорость ветра за три наиболее холодных месяца</td>
                <td className="border border-black p-1.5 text-center font-mono">vср</td>
                <td className="border border-black p-1.5 text-center font-mono font-bold">{climate.wind_speed_winter}</td>
                <td className="border border-black p-1.5 text-center">м/с</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold pt-2">Таблица 1.2 — Расчетные параметры внутреннего воздуха и условия эксплуатации (СП 2.04.01-2020)</p>
          <table className="w-full border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td className="border border-black p-1.5">Температура / относительная влажность внутреннего воздуха (tв / φв)</td>
                <td className="border border-black p-1.5 font-mono font-bold text-center">{internalConditions.t_v} °C / {internalConditions.phi_v} %</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Давление насыщенного пара Eв(tв) по табл. Е.1 и фактическое eв = (φв/100)·Eв</td>
                <td className="border border-black p-1.5 font-mono font-bold text-center">
                  Eв({internalConditions.t_v} °C) = {internalConditions.E_v} Па; eв = ({internalConditions.phi_v}/100)·{internalConditions.E_v} = {internalConditions.e_v} Па
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Температура точки росы внутреннего воздуха (tр)</td>
                <td className="border border-black p-1.5 font-mono font-bold text-center">{internalConditions.dew_point} °C</td>
              </tr>
              <tr>
                <td className="border border-black p-1.5">Влажностный режим (табл. 5.1) / Зона влажности / Условия эксплуатации (табл. 5.2)</td>
                <td className="border border-black p-1.5 font-bold text-center">
                  {internalConditions.humidityRegimeName} / {internalConditions.zone} / Условия {internalConditions.exploitationConditions}
                </td>
              </tr>
            </tbody>
          </table>

          <EskdFooterStamp pageNum={3} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 4: РАЗДЕЛ 2 (НАРУЖНАЯ СТЕНА) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            2. Теплотехнический расчет наружной стены ({wall.construction.id})
          </h2>

          <p className="indent-6 text-justify">
            Конструкция наружной стены: <b>{wall.construction.typeName}</b> (схема «{wall.construction.type}», повышающий коэффициент n = <b>{wall.construction.increasingFactor_n}</b>).
            {wall.vaporBarrier
              ? ` Перед слоем утеплителя предусмотрена пароизоляция: ${wall.vaporBarrier.name} (δ = ${wall.vaporBarrier.thicknessMm} мм, Rп = ${wall.vaporBarrier.R_p} м²·ч·Па/мг).`
              : ' Дополнительный пароизоляционный слой в стене не задан.'}
          </p>

          <div className="font-mono text-xs bg-gray-100 border border-gray-400 p-2.5 space-y-1">
            <div>2.1. Rт.тр = Rт.норм · n = {rNormWall.toFixed(2)} · {wall.construction.increasingFactor_n} = <b>{wall.R_required} м²·°С/Вт</b></div>
            <div>2.2. δут.расч = (Rт.тр − Rk.без_ут) · λут = ({wall.R_required} − {wall.R_without_insulation}) · {activeWallLambda} = <b>{wall.delta_insulation_calc} м</b> → принимаем <b>δут = {Math.round(wall.delta_insulation_adopted * 1000)} мм</b></div>
            <div>2.3. Rт.факт = <b>{wall.R_total} м²·°С/Вт</b> {wall.isRCompliant ? '≥' : '<'} {wall.R_required} м²·°С/Вт; D = <b>{wall.thermalInertia_D}</b> ({wall.designTempRule}) → tн = <b>{wall.design_t_out} °C</b></div>
            <div>2.4. Δtв = ({internalConditions.t_v} − ({wall.design_t_out})) / ({wall.R_total} · {alphaV}) = <b>{wall.delta_t_actual} °C</b> {wall.delta_t_actual <= wall.delta_t_norm ? '≤' : '>'} {wall.delta_t_norm} °C; τв = tв − (tв − tн) / (R₀ · αв) = <b>{wall.tau_v_min} °C</b> {wall.tau_v_min > wall.dew_point ? '>' : '≤'} tр ({wall.dew_point} °C)</div>
          </div>

          <p className="text-xs font-bold">Таблица 2.1 — Конструктивные слои наружной стены {wall.construction.id} (Условия {internalConditions.exploitationConditions})</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">№</th>
                <th className="border border-black p-1 text-left">Наименование слоя</th>
                <th className="border border-black p-1 text-center">δ, мм</th>
                <th className="border border-black p-1 text-center">λ</th>
                <th className="border border-black p-1 text-center">R</th>
                <th className="border border-black p-1 text-center">s</th>
                <th className="border border-black p-1 text-center">D</th>
                <th className="border border-black p-1 text-center">μ</th>
                <th className="border border-black p-1 text-center">Rп</th>
              </tr>
            </thead>
            <tbody>
              {wall.layers.map((l, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1 text-center">{idx + 1}</td>
                  <td className="border border-black p-1">{l.name} ({l.materialName})</td>
                  <td className="border border-black p-1 text-center font-mono">
                    {l.thickness * 1000 < 10 ? +(l.thickness * 1000).toFixed(2) : Math.round(l.thickness * 1000)}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">{l.lambda}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.R.toFixed(3)}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.s}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.D.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.mu}</td>
                  <td className="border border-black p-1 text-center font-mono">{l.R_p.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold">Таблица 2.2 — Распределение температур и парциальных давлений по сечению стены (линейная интерполяция E(t))</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">№</th>
                <th className="border border-black p-1 text-left">Плоскость сечения</th>
                <th className="border border-black p-1 text-center">x, мм</th>
                <th className="border border-black p-1 text-center">Rнак</th>
                <th className="border border-black p-1 text-center">tзима, °C</th>
                <th className="border border-black p-1 text-center">tот.пер, °C</th>
                <th className="border border-black p-1 text-center">E(t), Па</th>
                <th className="border border-black p-1 text-center">e(x), Па</th>
                <th className="border border-black p-1 text-center">E − e, Па</th>
              </tr>
            </thead>
            <tbody>
              {wall.crossSectionProfile.map((pt, idx) => {
                const isAirRow = idx === 0 || idx === wall.crossSectionProfile.length - 1;
                return (
                  <tr
                    key={pt.index}
                    className={
                      pt.isInsulationMidpoint
                        ? 'bg-amber-50 font-semibold'
                        : isAirRow
                        ? 'bg-slate-100 italic'
                        : ''
                    }
                  >
                    <td className="border border-black p-1 text-center">{idx === 0 ? 'вн' : idx === wall.crossSectionProfile.length - 1 ? 'нар' : pt.index}</td>
                    <td className="border border-black p-1">{pt.planeName}</td>
                    <td className="border border-black p-1 text-center font-mono">{isAirRow ? '—' : pt.coord_x_mm}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.R_cumulative.toFixed(3)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.temp_winter.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.temp_heating.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.E_sat.toFixed(1)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.e_partial.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">
                      {pt.delta_margin >= 0 ? `+${pt.delta_margin}` : pt.delta_margin}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-700 leading-snug">
            <b>Примечание:</b> столбец <b>t_зима</b> (при tн = {wall.design_t_out} °C) используется для санитарно-гигиенической проверки (τв &gt; tр, Δtв ≤ Δtв.норм); столбец <b>t_от.пер</b> (при tн.от = {climate.t_heating_period} °C) используется для расчета E(t), e(x), проверки конденсации и построения графиков тепловлажностного режима.
          </p>

          <EskdFooterStamp pageNum={4} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 5: РАЗДЕЛ 3 (ПОКРЫТИЕ / ЧЕРДАЧНОЕ ПЕРЕКРЫТИЕ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            3. Теплотехнический расчет {roofTitleLabel} ({roof.construction.id})
          </h2>

          <p className="indent-6 text-justify">
            Конструкция: <b>{roof.construction.name}</b> (схема «{roof.construction.type}», n = <b>{roof.construction.increasingFactor_n}</b>). Несущая основа — многопустотная железобетонная плита высотой h = {roof.hollowCore.height} мм с круглыми пустотами d = {roof.hollowCore.voidDiameter} мм и шагом {roof.hollowCore.spacing} мм.
          </p>

          <div className="font-mono text-xs bg-gray-100 border border-gray-400 p-2.5 space-y-1">
            <div>3.1. Плита: a = {roof.hollowCore.a_eq} м; b₁ = {roof.hollowCore.b_rib} м; δп = {roof.hollowCore.delta_flange_eq} м; R₁ = {roof.hollowCore.R_1_rib}; R₂ = {roof.hollowCore.R_2_void} → <b>Rпл = {roof.hollowCore.R_slab} м²·°С/Вт</b></div>
            <div>3.2. Rт.тр = {rNormRoof.toFixed(1)} · {roof.construction.increasingFactor_n} = <b>{roof.R_required} м²·°С/Вт</b>; δут.расч = {roof.delta_insulation_calc} м → принимаем <b>δут = {Math.round(roof.delta_insulation_adopted * 1000)} мм</b></div>
            <div>3.3. Rт.факт = <b>{roof.R_total} м²·°С/Вт</b> {roof.isRCompliant ? '≥' : '<'} {roof.R_required}; D = <b>{roof.thermalInertia_D}</b> ({roof.designTempRule}) → tн = <b>{roof.design_t_out} °C</b>; τв = tв − (tв − tн) / (R₀ · αв) = <b>{roof.tau_v_min} °C</b> {roof.tau_v_min > internalConditions.dew_point ? '>' : '≤'} tр ({internalConditions.dew_point} °C)</div>
            <div>
              3.4. Пароизоляция:{' '}
              {roof.vaporBarrier
                ? `${roof.vaporBarrier.name} (δ = ${roof.vaporBarrier.thicknessMm} мм, Rп = ${roof.vaporBarrier.R_p} м²·ч·Па/мг)`
                : 'не требуется (E(x) > e(x) во всех сечениях)'}
              ; ΣRп = <b>{roof.total_R_p} м²·ч·Па/мг</b>
            </div>
          </div>

          <p className="text-xs font-bold">
            Таблица 3.1 — Распределение температур и давлений водяного пара по расчетному сечению ({roof.activeSectionType === 'void' ? 'по пустоте' : 'худшее сечение по ребру'}, R₀ = {roofTableR} м²·°С/Вт)
          </p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">№</th>
                <th className="border border-black p-1 text-left">Плоскость сечения</th>
                <th className="border border-black p-1 text-center">x, мм</th>
                <th className="border border-black p-1 text-center">Rнак</th>
                <th className="border border-black p-1 text-center">tзима, °C</th>
                <th className="border border-black p-1 text-center">tот.пер, °C</th>
                <th className="border border-black p-1 text-center">E(t), Па</th>
                <th className="border border-black p-1 text-center">e(x), Па</th>
                <th className="border border-black p-1 text-center">E − e, Па</th>
              </tr>
            </thead>
            <tbody>
              {roofTableProfile.map((pt, idx) => {
                const isAirRow = idx === 0 || idx === roofTableProfile.length - 1;
                return (
                  <tr
                    key={pt.index}
                    className={
                      pt.isInsulationMidpoint
                        ? 'bg-amber-50 font-semibold'
                        : isAirRow
                        ? 'bg-slate-100 italic'
                        : ''
                    }
                  >
                    <td className="border border-black p-1 text-center">{idx === 0 ? 'вн' : idx === roofTableProfile.length - 1 ? 'нар' : pt.index}</td>
                    <td className="border border-black p-1">{pt.planeName}</td>
                    <td className="border border-black p-1 text-center font-mono">{isAirRow ? '—' : pt.coord_x_mm}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.R_cumulative.toFixed(3)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.temp_winter.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.temp_heating.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.E_sat.toFixed(1)}</td>
                    <td className="border border-black p-1 text-center font-mono">{pt.e_partial.toFixed(2)}</td>
                    <td className="border border-black p-1 text-center font-mono">
                      {pt.delta_margin >= 0 ? `+${pt.delta_margin}` : pt.delta_margin}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-700 leading-snug">
            <b>Примечание:</b> столбец <b>t_зима</b> (при tн = {roof.design_t_out} °C) используется для проверки τв &gt; tр и Δtв ≤ Δtв.норм; столбец <b>t_от.пер</b> (при tн.от = {climate.t_heating_period} °C) — для расчета E(t), e(x) (с учетом Rп.возд = 0 по СП 2.04.01-2020 п. 10.5) и графиков тепловлажностного режима.
          </p>

          <EskdFooterStamp pageNum={5} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 6: РАЗДЕЛ 4 (ТЕХНИЧЕСКОЕ ПОДПОЛЬЕ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            4. Теплотехнический расчет технического подполья ({basement.construction.id})
          </h2>

          <p className="indent-6 text-justify">
            Конструкция перекрытия над техническим подпольем: <b>{basement.construction.name}</b>. Нормативное сопротивление теплопередаче перекрытия Rт.норм = {rNormBasement.toFixed(2)} м²·°С/Вт.
          </p>

          <div className="font-mono text-xs bg-gray-100 border border-gray-400 p-2.5 space-y-1">
            <div>4.1. Принятая толщина утеплителя: <b>δут = {Math.round(basement.delta_insulation_adopted * 1000)} мм</b>; фактическое Rт.ПТП = <b>{basement.R_ptp} м²·°С/Вт</b></div>
            <div>4.2. Суммарные теплопоступления от трубопроводов в техподполье: Σ(qᵢ · lᵢ) = <b>{basement.pipeHeatGains_total} Вт</b></div>
            <div>4.3. Расчетная температура воздуха в подполье: <b>tп = {basement.crawlSpaceTemp_t_p} °C</b> ≥ +5,0 °C (φп = {basement.crawlSpaceRH} %)</div>
            <div>4.4. Перепад температур на поверхности пола 1 этажа: <b>Δtв.п = {basement.delta_t_floor} °C</b> ≤ {basement.delta_t_floor_norm} °C</div>
            <div>4.5. Температура внутренней поверхности цокольной стены: <b>τв.цок = {basement.tau_v_basement_wall} °C</b> &gt; tр.п ({basement.dew_point_basement} °C) — конденсат исключен</div>
          </div>

          <p className="text-xs font-bold">Таблица 4.1 — Теплопотери трубопроводов в пространстве технического подполья</p>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1.5 text-center">№</th>
                <th className="border border-black p-1.5 text-center">Температура теплоносителя, °C</th>
                <th className="border border-black p-1.5 text-center">Диаметр dу, мм</th>
                <th className="border border-black p-1.5 text-center">Длина lᵢ, м</th>
                <th className="border border-black p-1.5 text-center">Удельные теплопотери qᵢ, Вт/м</th>
                <th className="border border-black p-1.5 text-center">Тепловыделения Qᵢ, Вт</th>
              </tr>
            </thead>
            <tbody>
              {basement.pipesDetails.map((p, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.temp}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.dy}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.length}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{p.q_heat_loss}</td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">{p.q_total}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <EskdFooterStamp pageNum={6} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 7: РАЗДЕЛ 5 (ОКНА ПО ШИБЕКО — ТАБЛ. 6.1–6.4, БЕЗ ДВЕРЕЙ) ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-4">
          <h2 className="text-base font-bold uppercase">
            5. Теплотехнический расчет оконного заполнения ({win.windowDef.id})
          </h2>

          <p className="indent-6 text-justify">
            Оконный блок <b>{win.windowDef.id}</b>: профильная система — {win.windowDef.profileSystem} (Rнепр = {win.R_opaque} м²·°С/Вт), стеклопакет — {win.windowDef.glazingType} (Rсв = {win.R_transparent} м²·°С/Вт), конструктивная схема — Вариант {win.windowDef.typeScheme}, габариты H × B = {win.windowDef.dim.H} × {win.windowDef.dim.B} мм.
          </p>

          <p className="text-xs font-bold">Таблица 5.1 (табл. 6.2 по Шибеко) — Поучастковый расчет приведенного сопротивления теплопередаче окна</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Уч.</th>
                <th className="border border-black p-1 text-left">Элемент</th>
                <th className="border border-black p-1 text-center">Размеры, мм</th>
                <th className="border border-black p-1 text-center">Fᵢ, м²</th>
                <th className="border border-black p-1 text-center">Rᵢ, м²·°С/Вт</th>
                <th className="border border-black p-1 text-center">Fᵢ / Rᵢ</th>
              </tr>
            </thead>
            <tbody>
              {win.zones.map((z) => (
                <tr key={z.code}>
                  <td className="border border-black p-1 text-center font-bold">{z.code}</td>
                  <td className="border border-black p-1">{z.name}</td>
                  <td className="border border-black p-1 text-center font-mono">{z.widthMm} × {z.heightMm}</td>
                  <td className="border border-black p-1 text-center font-mono">{z.area_m2.toFixed(4)}</td>
                  <td className="border border-black p-1 text-center font-mono">{z.R_zone.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{z.F_over_R.toFixed(4)}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="border border-black p-1 text-right">
                  Итого (Rт.ок = ΣF / Σ(F/R) = {win.area_total} / {win.sum_F_over_R} = {win.R_actual} ≥ {win.R_norm.toFixed(1)} м²·°С/Вт):
                </td>
                <td className="border border-black p-1 text-center font-mono">{win.area_total.toFixed(4)}</td>
                <td className="border border-black p-1 text-center font-mono">{win.R_actual}</td>
                <td className="border border-black p-1 text-center font-mono">{win.sum_F_over_R.toFixed(4)}</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold pt-1">Таблица 5.2 (табл. 6.1 по Шибеко, СТБ 939-2013) — Классификация окон по воздухопроницаемости при Δp₀ = 10 Па</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Класс</th>
                <th className="border border-black p-1 text-center">Объемная воздухопроницаемость, м³/(ч·м²)</th>
                <th className="border border-black p-1 text-center">Сопротивление воздухопроницанию Rв, м²·ч/кг</th>
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
            Таблица 5.3 (табл. 6.3 по Шибеко) — Поэтажный расчет требуемого сопротивления воздухопроницанию Rв.тр (тип местности {win.terrainType}, H = {win.H_building.toFixed(1)} м)
          </p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Этаж</th>
                <th className="border border-black p-1 text-center">hᵢ, м</th>
                <th className="border border-black p-1 text-center">ρн−ρв</th>
                <th className="border border-black p-1 text-center">kᵢ</th>
                <th className="border border-black p-1 text-center">Δpᵢ, Па</th>
                <th className="border border-black p-1 text-center">Gнорм</th>
                <th className="border border-black p-1 text-center">Rв.тр</th>
              </tr>
            </thead>
            <tbody>
              {win.floors.map((f) => (
                <tr key={f.floor}>
                  <td className="border border-black p-1 text-center font-bold">{f.floor}</td>
                  <td className="border border-black p-1 text-center font-mono">{f.height.toFixed(1)}</td>
                  <td className="border border-black p-1 text-center font-mono">{win.delta_rho.toFixed(3)}</td>
                  <td className="border border-black p-1 text-center font-mono">{f.k_i.toFixed(3)}</td>
                  <td className="border border-black p-1 text-center font-mono">{f.delta_p.toFixed(2)}</td>
                  <td className="border border-black p-1 text-center font-mono">{f.G_v_required.toFixed(1)}</td>
                  <td className="border border-black p-1 text-center font-mono font-bold">{f.R_v_required.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs font-bold pt-1">Таблица 5.4 (табл. 6.4 по Шибеко) — Назначение класса оконных блоков по этажам</p>
          <table className="w-full border-collapse border border-black text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold">
                <th className="border border-black p-1 text-center">Этаж</th>
                <th className="border border-black p-1 text-center">Rв.тр, м²·ч/кг</th>
                <th className="border border-black p-1 text-center">Rв.ок = (1,0–1,2)·Rв.тр</th>
                <th className="border border-black p-1 text-left">Требуемый класс окна</th>
              </tr>
            </thead>
            <tbody>
              {win.floors.map((f) => (
                <tr key={f.floor}>
                  <td className="border border-black p-1 text-center font-bold">{f.floor}</td>
                  <td className="border border-black p-1 text-center font-mono">{f.R_v_required.toFixed(3)}</td>
                  <td className="border border-black p-1 text-center font-mono">
                    {f.R_v_required.toFixed(3)} – {f.R_v_max.toFixed(3)}
                  </td>
                  <td className="border border-black p-1 font-semibold">Класс {f.windowClassRangeText}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <EskdFooterStamp pageNum={7} docCode={docCode} />
        </section>

        {/* ================= ЛИСТ 8: ЗАКЛЮЧЕНИЕ И СПИСОК ИСТОЧНИКОВ ================= */}
        <section className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl border-2 border-black space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold uppercase text-center">ЗАКЛЮЧЕНИЕ</h2>
            <p className="indent-6 text-justify">
              В результате выполнения курсовой работы произведен теплотехнический и влажностный расчет наружных ограждающих конструкций здания ({internalConditions.buildingTypeName}, {cipher.floorsCount} этажей, г. {climate.name}):
            </p>
            <ul className="list-disc pl-8 space-y-1 text-xs">
              <li>
                <b>Наружная стена ({wall.construction.id}):</b> принята толщина утеплителя {wall.insulation.id} δут = {Math.round(wall.delta_insulation_adopted * 1000)} мм; Rт = {wall.R_total} {wall.isRCompliant ? '≥' : '<'} {wall.R_required} м²·°С/Вт; Δtв = {wall.delta_t_actual} {wall.delta_t_actual <= wall.delta_t_norm ? '≤' : '>'} {wall.delta_t_norm} °C; τв = {wall.tau_v_min} {wall.tau_v_min > wall.dew_point ? '>' : '≤'} {wall.dew_point} °C.
              </li>
              <li>
                <b>{roofTitleLabel.charAt(0).toUpperCase() + roofTitleLabel.slice(1)} ({roof.construction.id}):</b> Rпл = {roof.hollowCore.R_slab} м²·°С/Вт; δут = {Math.round(roof.delta_insulation_adopted * 1000)} мм; Rт = {roof.R_total} {roof.isRCompliant ? '≥' : '<'} {roof.R_required} м²·°С/Вт; τв = {roof.tau_v_min} °C;{' '}
                {roof.vaporBarrier
                  ? `пароизоляция: ${roof.vaporBarrier.name} (δ = ${roof.vaporBarrier.thicknessMm} мм, Rп = ${roof.vaporBarrier.R_p}).`
                  : 'условие E(x) > e(x) обеспечено без доп. пароизоляции.'}
              </li>
              <li>
                <b>Техническое подполье ({basement.construction.id}):</b> δут = {Math.round(basement.delta_insulation_adopted * 1000)} мм; Rт.ПТП = {basement.R_ptp} {basement.isRCompliant ? '≥' : '<'} {basement.R_required} м²·°С/Вт; tп = {basement.crawlSpaceTemp_t_p} °C; Δtв.п = {basement.delta_t_floor} ≤ {basement.delta_t_floor_norm} °C; τв.цок = {basement.tau_v_basement_wall} &gt; {basement.dew_point_basement} °C.
              </li>
              <li>
                <b>Оконные блоки ({win.windowDef.id}):</b> приведенное сопротивление теплопередаче Rт.ок = {win.R_actual} {win.isCompliant ? '≥' : '<'} {win.R_norm.toFixed(1)} м²·°С/Вт; поэтажные классы воздухопроницаемости по СТБ 939-2013 определены для всех {cipher.floorsCount} этажей.
              </li>
            </ul>
            <p className="indent-6 text-justify">
              {calc.normativeWarnings.length === 0
                ? 'Все запроектированные ограждающие конструкции полностью соответствуют требованиям тепловой защиты СП 2.04.01-2020 и СН 2.04.02-2020. Выпадение конденсата на внутренних поверхностях и недопустимое влагонакопление в толще конструкций исключены.'
                : `ВНИМАНИЕ: выявлено несоответствие нормативным требованиям СН 2.04.02-2020 / СП 2.04.01-2020 для следующих конструкций: ${calc.normativeWarnings.map((w) => `${w.title} (${w.constructionCode}: Rт = ${w.R_actual} < ${w.R_required})`).join('; ')}. Требуется корректировка толщины утеплителя или замена заполнения.`}
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-300">
            <h2 className="text-base font-bold uppercase text-center">
              СПИСОК ИСПОЛЬЗОВАННЫХ ИСТОЧНИКОВ
            </h2>
            <ol className="list-decimal pl-6 space-y-1.5 text-xs">
              <li>СП 2.04.04-2026 «Строительная климатология». — Минск: РУП «Стройтехнорм», 2026.</li>
              <li>СП 2.04.01-2020 «Строительная теплотехника. Правила проектирования». — Минск: РУП «Стройтехнорм», 2020.</li>
              <li>СН 2.04.02-2020 «Здания и сооружения. Энергетическая эффективность». — Минск: Минстройархитектуры РБ, 2020.</li>
              <li>Шибеко, А. С. Строительная теплофизика: учеб.-метод. пособие для выполнения курсовой работы / А. С. Шибеко. — Минск: БНТУ, 2018. — 114 с.</li>
            </ol>
          </div>

          <EskdFooterStamp pageNum={8} docCode={docCode} />
        </section>
      </div>
    </div>
  );
};
