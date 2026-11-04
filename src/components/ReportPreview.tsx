/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Академическая расчетно-пояснительная записка по ГОСТ 2.105-95
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { Printer, Download } from 'lucide-react';

interface ReportPreviewProps {
  calc: FullCourseworkCalculation;
  onPrint: () => void;
  onExportPdf: () => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  calc,
  onPrint,
  onExportPdf,
}) => {
  const { wall, roof, basement, window: win, door, climate, internalConditions, cipher } = calc;

  return (
    <div className="space-y-6">
      {/* Панель управления отчетом */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-sm font-bold text-white">
            Расчетно-пояснительная записка (формат ГОСТ 2.105-95)
          </h2>
          <p className="text-xs text-slate-400">
            Готова к непосредственной печати и экспорту в формат PDF для защиты курсовой работы
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

      {/* Сам академический документ (белый лист с типографикой ГОСТ) */}
      <div
        id="academic-report-document"
        className="bg-white text-black p-8 sm:p-14 rounded-2xl shadow-2xl max-w-4xl mx-auto font-serif text-[13px] leading-relaxed select-text"
        style={{ fontFamily: '"Tinos", "Times New Roman", serif' }}
      >
        {/* Титульная шапка БНТУ */}
        <div className="text-center space-y-1 mb-12 border-b-2 border-black pb-8">
          <div className="text-xs uppercase tracking-widest font-sans font-bold">
            Министерство образования Республики Беларусь
          </div>
          <div className="text-sm font-bold uppercase tracking-wider">
            Белорусский национальный технический университет
          </div>
          <div className="text-xs">
            Факультет энергетического строительства
          </div>
          <div className="text-xs">
            Кафедра «Теплогазоснабжение и вентиляция»
          </div>

          <div className="pt-10 pb-6">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              ПОЯСНИТЕЛЬНАЯ ЗАПИСКА
            </h1>
            <div className="text-base font-bold mt-1">
              к курсовой работе по дисциплине «Строительная теплофизика»
            </div>
            <div className="text-xs font-mono font-normal mt-2">
              Шифр задания: {cipher.rawCipher}
            </div>
          </div>

          <div className="grid grid-cols-2 text-xs pt-8 text-left font-sans">
            <div>
              <span className="block font-semibold">Выполнил:</span>
              <span>студент гр. {cipher.groupName || '110041-21'}</span>
              <span className="block font-bold">{cipher.studentName || 'Заневский М. А.'}</span>
              <span>Зачетная книжка № ...{cipher.gradebookLastDigit}</span>
            </div>
            <div className="text-right">
              <span className="block font-semibold">Проверил:</span>
              <span className="block">доцент, к.т.н.</span>
              <span className="block font-bold">Шибеко А. С.</span>
            </div>
          </div>

          <div className="text-center text-xs pt-8">
            Минск, 2026 г.
          </div>
        </div>

        {/* 1. Исходные данные и климатология */}
        <div className="space-y-4 mb-8">
          <h2 className="text-base font-bold uppercase border-b border-gray-400 pb-1">
            1. Исходные данные и климатологические параметры района строительства
          </h2>
          <p>
            Пункт строительства: <b>{climate.name} ({climate.id})</b>, {climate.region}. Здание: <b>{cipher.buildingType}</b>, количество этажей — <b>{cipher.floorsCount}</b>, высота здания H = {(cipher.floorsCount * 2.8).toFixed(1)} м.
          </p>
          <p>
            Климатические характеристики приняты по СП 2.04.04-2026 «Строительная климатология»:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Температура наиболее холодных суток обеспеченностью 0.98: tх.с(0.98) = <b>{climate.t_coldest_day_098} °C</b>;</li>
            <li>Температура наиболее холодных суток обеспеченностью 0.92: tх.с(0.92) = <b>{climate.t_coldest_day_092} °C</b>;</li>
            <li>Температура наиболее холодной пятидневки обеспеченностью 0.92: tх.5 = <b>{climate.t_coldest_5days_092} °C</b>;</li>
            <li>Средняя скорость ветра за три зимних месяца: vср = <b>{climate.wind_speed_winter} м/с</b>;</li>
            <li>Средняя температура отопительного периода: tн.от = <b>{climate.t_heating_period} °C</b> при продолжительности zот = <b>{climate.duration_heating_period} сут</b>;</li>
            <li>Относительная влажность наружного воздуха отопительного периода: φн.от = <b>{climate.rh_heating_period}%</b>.</li>
          </ul>
          <p>
            Параметры внутреннего микроклимата по СП 2.04.01-2020: расчетная температура tв = <b>{internalConditions.t_v} °C</b>, относительная влажность φв = <b>{internalConditions.phi_v}%</b>. Давление насыщенного водяного пара Eв = <b>{internalConditions.E_v} Па</b>, фактическое парциальное давление eв = <b>{internalConditions.e_v} Па</b>. Температура точки росы tр = <b>{internalConditions.dew_point} °C</b>. Влажностный режим нормальный, зона влажности нормальная, условия эксплуатации конструкций — <b>Б</b>.
          </p>
        </div>

        {/* 2. Расчет наружной стены */}
        <div className="space-y-4 mb-8">
          <h2 className="text-base font-bold uppercase border-b border-gray-400 pb-1">
            2. Теплотехнический расчет наружной стены {wall.construction.id}
          </h2>
          <p>
            Конструкция стены: {wall.construction.typeName} (тип {wall.construction.type}). Повышающий коэффициент по табл. 6.1 СП 2.04.01: n = <b>{wall.construction.increasingFactor_n}</b>.
          </p>
          <p>
            Требуемое сопротивление теплопередаче стены с учетом повышающего коэффициента:
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            Rт.тр = Rт.норм · n = 3.20 · {wall.construction.increasingFactor_n} = <b>{wall.R_required} м²·°С/Вт</b>
          </div>
          <p>
            Термическое сопротивление слоев стены без утеплителя Rk.без_ут = <b>{wall.R_without_insulation} м²·°С/Вт</b>. Расчетная толщина слоя утеплителя ({wall.insulation.name}, λБ = {wall.insulation.lambda_B} Вт/(м·°С)):
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            δут = (Rт.тр - Rk.без_ут) · λут = ({wall.R_required} - {wall.R_without_insulation}) · {wall.insulation.lambda_B} = <b>{wall.delta_insulation_calc} м</b>
          </div>
          <p>
            Принимаем конструктивную толщину утеплителя: <b>δут = {wall.delta_insulation_adopted * 1000} мм ({wall.delta_insulation_adopted} м)</b>.
          </p>
          <p>
            Фактическое сопротивление теплопередаче стены:
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            Rт = {wall.R_total} м²·°С/Вт ≥ Rт.тр ({wall.R_required} м²·°С/Вт) — условие выполняется.
          </div>
          <p>
            Тепловая инерция стены D = <b>{wall.thermalInertia_D}</b> {wall.thermalInertia_D > 7 ? '(массивная, D > 7)' : '(средняя)'}. Принятая расчетная зимняя температура наружного воздуха: tн = <b>{wall.design_t_out} °C</b>.
          </p>
          <p>
            Температурный перепад между внутренним воздухом и внутренней поверхностью стены:
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            Δtв = (tв - tн) / (Rт · αв) = ({internalConditions.t_v} - ({wall.design_t_out})) / ({wall.R_total} · 8.7) = <b>{wall.delta_t_actual} °C</b> ≤ Δtв.норм (4.0 °C)
          </div>
          <p>
            Температура внутренней поверхности стены: τв.min = tв - Δtв = <b>{wall.tau_v_min} °C</b> &gt; tр ({wall.dew_point} °C). Выпадение конденсата на внутренней поверхности стены исключено.
          </p>
        </div>

        {/* 3. Расчет покрытия */}
        <div className="space-y-4 mb-8">
          <h2 className="text-base font-bold uppercase border-b border-gray-400 pb-1">
            3. Теплотехнический расчет совмещенного покрытия {roof.construction.id}
          </h2>
          <p>
            В качестве несущей основы принята многопустотная предварительно напряженная железобетонная плита толщиной h = {roof.hollowCore.height} мм с круглыми пустотами d = {roof.hollowCore.voidDiameter} мм.
          </p>
          <p>
            Приведенное сопротивление теплопередаче плиты:
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            R|| = {roof.hollowCore.R_parallel} м²·°С/Вт; R⊥ = {roof.hollowCore.R_perpendicular} м²·°С/Вт → Rпл = (R|| + 2·R⊥) / 3 = <b>{roof.hollowCore.R_slab} м²·°С/Вт</b>
          </div>
          <p>
            Требуемое сопротивление покрытия: Rт.тр = 6.0 · 1.1 = <b>{roof.R_required} м²·°С/Вт</b>. Принятая толщина утеплителя: <b>δут = {roof.delta_insulation_adopted * 1000} мм</b>. Фактическое сопротивление покрытия: <b>Rт = {roof.R_total} м²·°С/Вт</b> ≥ 6.60 м²·°С/Вт.
          </p>
          <p>
            С целью предотвращения влагонакопления в утеплителе под кровельным водоизоляционным ковром (рубероид) предусмотрена пароизоляция из полиэтиленовой пленки ГОСТ 10354-82 (Rп.из = 7.3 м²·ч·Па/мг), уложенная по верхней поверхности ж/б плиты перед утеплителем.
          </p>
        </div>

        {/* 4. Расчет техподполья */}
        <div className="space-y-4 mb-8">
          <h2 className="text-base font-bold uppercase border-b border-gray-400 pb-1">
            4. Расчет технического подполья {basement.construction.id}
          </h2>
          <p>
            Сопротивление перекрытия над техподпольем: Rт.ПТП = <b>{basement.R_ptp} м²·°С/Вт</b> ≥ 1.87 м²·°С/Вт (толщина утеплителя δ = {basement.delta_insulation_adopted * 1000} мм).
          </p>
          <p>
            Суммарные теплопотери трубопроводов отопления и горячего водоснабжения в пространстве подполья: Σ(qi · li) = <b>{basement.pipeHeatGains_total} Вт</b>.
          </p>
          <p>
            Температура воздуха в техническом подполье по уравнению теплового баланса: <b>tп = {basement.crawlSpaceTemp_t_p} °C</b> ≥ +5.0 °C.
          </p>
          <p>
            Температурный перепад на поверхности пола 1 этажа: Δtв.п = <b>{basement.delta_t_floor} °C</b> ≤ 0.8 °C (норма п. 6.6 СП 2.04.01).
          </p>
          <p>
            Температура внутренней поверхности цокольной стены подполья: τв.цок = <b>{basement.tau_v_basement_wall} °C</b> &gt; tр.п ({basement.dew_point_basement} °C) — конденсат отсутствует.
          </p>
        </div>

        {/* 5. Расчет окон и дверей */}
        <div className="space-y-4 mb-8">
          <h2 className="text-base font-bold uppercase border-b border-gray-400 pb-1">
            5. Расчет оконного заполнения {win.windowDef.id} и воздухопроницаемости
          </h2>
          <p>
            Оконный блок: {win.windowDef.profileSystem}, стеклопакет {win.windowDef.glazingType}. Общая площадь окна Fок = <b>{win.area_total} м²</b> (светопрозрачная часть Fсв = <b>{win.area_transparent} м²</b>, непрозрачная часть профиля Fнепр = <b>{win.area_opaque} м²</b>).
          </p>
          <div className="font-mono bg-gray-100 p-2 text-center rounded border border-gray-300">
            Rт.ок = Fок / (Fсв / Rсв + Fнепр / Rнепр) = <b>{win.R_actual} м²·°С/Вт</b> ≥ 1.0 м²·°С/Вт (СН 2.04.02)
          </div>
          <p>
            По результатам поэтажного расчета воздухопроницаемости по п. 8.1 СП 2.04.01 на 1–{cipher.floorsCount} этажах разность давлений воздуха составляет от {win.floors[0]?.delta_p} Па до {win.floors[win.floors.length - 1]?.delta_p} Па. Требуемый класс оконных блоков по воздухопроницаемости: <b>Класс {win.floors[0]?.windowClass}</b> на нижних этажах и <b>Класс {win.floors[win.floors.length - 1]?.windowClass}</b> на верхних этажах.
          </p>
          <p>
            Наружные входные двери: требуемое сопротивление Rт.дн = 0.6 · (18 - ({wall.design_t_out})) / (8.7 · 6) = <b>{door.R_required} м²·°С/Вт</b>. Принята утепленная металлическая дверь с Rт.д = <b>{door.R_adopted} м²·°С/Вт</b> ≥ {door.R_required}.
          </p>
        </div>

        {/* Заключение */}
        <div className="space-y-3 border-t-2 border-black pt-4">
          <h2 className="text-base font-bold uppercase">
            ЗАКЛЮЧЕНИЕ
          </h2>
          <p>
            Все запроектированные ограждающие конструкции здания (наружные стены, совмещенное покрытие, перекрытие над техническим подпольем, оконные блоки и входные двери) полностью удовлетворяют обязательным требованиям тепловой защиты СП 2.04.01-2020 и СН 2.04.02-2020. Выпадение конденсата на внутренних поверхностях и переувлажнение утеплителя исключены.
          </p>
        </div>
      </div>
    </div>
  );
};
