/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Экспорт результатов теплофизического расчета в формате книги Microsoft Excel (.xlsx)
 */

import * as XLSX from 'xlsx';
import { FullCourseworkCalculation } from '../logic/calculations';

export function exportCourseworkToExcel(calc: FullCourseworkCalculation) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // ЛИСТ 1: ИСХОДНЫЕ ДАННЫЕ И КЛИМАТ
  // -------------------------------------------------------------
  const sheet1Data = [
    ['РАСЧЕТ КУРСОВОЙ РАБОТЫ ПО СТРОИТЕЛЬНОЙ ТЕПЛОФИЗИКЕ (БНТУ)'],
    ['Специальность: 1-70 04 02 «Теплогазоснабжение, вентиляция и охрана воздушного бассейна»'],
    [''],
    ['1. ИСХОДНЫЕ ДАННЫЕ ЗАДАНИЯ'],
    ['Параметр', 'Обозначение', 'Значение', 'Единица измерения'],
    ['Шифр задания', '-', calc.cipher.rawCipher || '', ''],
    ['Тип здания', '-', calc.cipher.buildingType, ''],
    ['Пункт строительства', '-', `${calc.climate.name} (${calc.climate.id})`, calc.climate.region],
    ['Количество этажей', 'N_эт', calc.cipher.floorsCount, 'эт.'],
    ['Конструкция наружной стены', 'Шифр С', calc.cipher.wallCode, calc.wall.construction.typeName],
    ['Конструкция покрытия/перекрытия', 'Шифр П', calc.cipher.roofCode, calc.roof.construction.name],
    ['Конструкция перекрытия подполья', 'Шифр ПТП', calc.cipher.basementCode, calc.basement.construction.name],
    ['Вид утеплителя', 'Шифр У', calc.cipher.insulationCode, calc.wall.insulation.name],
    ['Оконный блок', 'Шифр О', calc.cipher.windowCode, `${calc.window.windowDef.profileSystem}, ${calc.window.windowDef.glazingType}`],
    ['Последняя цифра зачетки', 'N', calc.cipher.gradebookLastDigit, ''],
    ['Студент', '-', calc.cipher.studentName || '-', ''],
    ['Группа', '-', calc.cipher.groupName || '-', ''],
    [''],
    ['2. КЛИМАТИЧЕСКИЕ И НОРМАТИВНЫЕ ДАННЫЕ (СП 2.04.04-2026, СП 2.04.01-2020)'],
    ['Температура наиболее холодных суток (0.98)', 'tх.с (0.98)', calc.climate.t_coldest_day_098, '°C'],
    ['Температура наиболее холодных суток (0.92)', 'tх.с (0.92)', calc.climate.t_coldest_day_092, '°C'],
    ['Температура наиболее холодной пятидневки (0.92)', 'tх.5 (0.92)', calc.climate.t_coldest_5days_092, '°C'],
    ['Средняя скорость ветра зимнего периода', 'vср', calc.climate.wind_speed_winter, 'м/с'],
    ['Температура отопительного периода', 'tн.от', calc.climate.t_heating_period, '°C'],
    ['Продолжительность отопительного периода', 'zот', calc.climate.duration_heating_period, 'сут'],
    ['Относительная влажность отопительного периода', 'φн.от', calc.climate.rh_heating_period, '%'],
    [''],
    ['3. ПАРАМЕТРЫ ВНУТРЕННЕГО ВОЗДУХА'],
    ['Расчетная внутренняя температура', 'tв', calc.internalConditions.t_v, '°C'],
    ['Относительная влажность воздуха', 'φв', calc.internalConditions.phi_v, '%'],
    ['Давление насыщенного водяного пара', 'Eв', calc.internalConditions.E_v, 'Па'],
    ['Фактическое парциальное давление пара', 'eв', calc.internalConditions.e_v, 'Па'],
    ['Температура точки росы', 'tр', calc.internalConditions.dew_point, '°C'],
    ['Влажностный режим помещения', '-', 'Нормальный', ''],
    ['Условия эксплуатации конструкций', '-', calc.internalConditions.exploitationConditions, 'по табл. 5.2'],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, '1. Исходные данные');

  // -------------------------------------------------------------
  // ЛИСТ 2: НАРУЖНАЯ СТЕНА
  // -------------------------------------------------------------
  const sheet2Data = [
    ['РАСЧЕТ НАРУЖНОЙ СТЕНЫ ' + calc.wall.construction.id],
    ['Конструкция:', calc.wall.construction.typeName],
    ['Повышающий коэффициент n:', calc.wall.construction.increasingFactor_n],
    ['Требуемое сопротивление Rт.тр (3.2 * n):', calc.wall.R_required, 'м²·°С/Вт'],
    ['Сопротивление стены без утеплителя Rбез_ут:', calc.wall.R_without_insulation, 'м²·°С/Вт'],
    ['Расчетная толщина утеплителя δут.расч:', calc.wall.delta_insulation_calc, 'м'],
    ['Принятая толщина утеплителя δут:', calc.wall.delta_insulation_adopted, 'м'],
    ['Фактическое термическое сопротивление Rт:', calc.wall.R_total, 'м²·°С/Вт'],
    ['Тепловая инерция стены D:', calc.wall.thermalInertia_D, calc.wall.thermalInertia_D > 7 ? 'Массивная (D > 7)' : 'Средняя (4 < D <= 7)'],
    ['Принятая расчетная зимняя tн:', calc.wall.design_t_out, '°C'],
    ['Фактический температурный перепад Δtв:', calc.wall.delta_t_actual, '°C', '<= 4.0 °C (норма)'],
    ['Температура внутренней поверхности τв.min:', calc.wall.tau_v_min, '°C', `> ${calc.wall.dew_point} °C (точка росы)`],
    ['Вывод по тепловой защите:', calc.wall.isCompliant ? 'СООТВЕТСТВУЕТ НОРМАМ' : 'НЕ СООТВЕТСТВУЕТ'],
    [''],
    ['ТАБЛИЦА СЛОЕВ СТЕНЫ'],
    ['№', 'Слой', 'Материал', 'Толщина δ (м)', 'λ (Вт/м·°С)', 'R (м²·°С/Вт)', 's (Вт/м²·°С)', 'D (R·s)', 'μ (мг/м·ч·Па)', 'Rп (м²·ч·Па/мг)'],
  ];

  calc.wall.layers.forEach((l, idx) => {
    sheet2Data.push([
      idx + 1,
      l.name,
      l.materialName,
      l.thickness,
      l.lambda,
      l.R,
      l.s,
      l.D,
      l.mu,
      l.R_p,
    ]);
  });

  sheet2Data.push(['']);
  sheet2Data.push(['РАСПРЕДЕЛЕНИЕ ТЕМПЕРАТУР И ДАВЛЕНИЙ ПАРА ПО СЕЧЕНИЮ СТЕНЫ (МЕТОД ФОКИНА)']);
  sheet2Data.push(['Расстояние от вн. пов-ти x (м)', 'Сечение', 'Температура t (°C)', 'E(t) упругость насыщения (Па)', 'e(x) парциальное давление (Па)', 'Конденсация (e >= E)']);

  calc.wall.moisturePoints.forEach((p) => {
    sheet2Data.push([
      p.x,
      p.name,
      p.temp,
      p.E,
      p.e,
      p.e >= p.E ? 'ДА (ЗОНА КОНДЕНСАЦИИ)' : 'НЕТ',
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, '2. Наружная стена');

  // -------------------------------------------------------------
  // ЛИСТ 3: ПОКРЫТИЕ И МНОГОПУСТОТНАЯ ПЛИТА
  // -------------------------------------------------------------
  const sheet3Data = [
    ['РАСЧЕТ СОВМЕЩЕННОГО ПОКРЫТИЯ / ПЕРЕКРЫТИЯ ' + calc.roof.construction.id],
    ['Тип покрытия:', calc.roof.construction.name],
    ['Параметры многопустотной ж/б плиты:'],
    ['Высота плиты h:', calc.roof.hollowCore.height, 'мм'],
    ['Диаметр круглых пустот d:', calc.roof.hollowCore.voidDiameter, 'мм'],
    ['Термическое сопротивление вдоль потока R||:', calc.roof.hollowCore.R_parallel, 'м²·°С/Вт'],
    ['Термическое сопротивление поперек потока R_|_:', calc.roof.hollowCore.R_perpendicular, 'м²·°С/Вт'],
    ['Приведенное сопротивление плиты Rпл:', calc.roof.hollowCore.R_slab, 'м²·°С/Вт'],
    ['Требуемое сопротивление Rт.тр (6.0 * 1.1):', calc.roof.R_required, 'м²·°С/Вт'],
    ['Расчетная толщина утеплителя δут.расч:', calc.roof.delta_insulation_calc, 'м'],
    ['Принятая толщина утеплителя δут:', calc.roof.delta_insulation_adopted, 'м'],
    ['Фактическое сопротивление покрытия Rт:', calc.roof.R_total, 'м²·°С/Вт'],
    ['Температурный перепад покрытия Δtв:', calc.roof.delta_t_actual, '°C', '<= 3.0 °C (норма)'],
    ['Температура поверхности потолка τв:', calc.roof.tau_v_min, '°C', `> ${calc.roof.dew_point} °C (точка росы)`],
    ['Наличие пароизоляционного слоя:', calc.roof.vaporBarrierAdded ? 'ПРЕДУСМОТРЕНА (полиэтилен 0.2 мм)' : 'НЕТ'],
    ['Вывод по покрытию:', calc.roof.isCompliant ? 'СООТВЕТСТВУЕТ НОРМАМ' : 'НЕ СООТВЕТСТВУЕТ'],
    [''],
    ['ТАБЛИЦА СЛОЕВ ПОКРЫТИЯ'],
    ['№', 'Слой', 'Материал', 'Толщина δ (м)', 'λ (Вт/м·°С)', 'R (м²·°С/Вт)', 's (Вт/м²·°С)', 'D (R·s)', 'μ (мг/м·ч·Па)', 'Rп (м²·ч·Па/мг)'],
  ];

  calc.roof.layers.forEach((l, idx) => {
    sheet3Data.push([
      idx + 1,
      l.name,
      l.materialName,
      l.thickness,
      l.lambda,
      l.R,
      l.s,
      l.D,
      l.mu,
      l.R_p,
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  XLSX.utils.book_append_sheet(wb, ws3, '3. Покрытие');

  // -------------------------------------------------------------
  // ЛИСТ 4: ТЕХНИЧЕСКОЕ ПОДПОЛЬЕ
  // -------------------------------------------------------------
  const sheet4Data = [
    ['РАСЧЕТ ТЕХНИЧЕСКОГО ПОДПОЛЬЯ И ПЕРЕКРЫТИЯ ' + calc.basement.construction.id],
    ['Конструкция перекрытия:', calc.basement.construction.name],
    ['Сопротивление перекрытия Rт.ПТП:', calc.basement.R_ptp, 'м²·°С/Вт', '>= 1.87 (норма)'],
    ['Принятая толщина утеплителя перекрытия:', calc.basement.delta_insulation_adopted, 'м'],
    ['Температура воздуха в техподполье tп:', calc.basement.crawlSpaceTemp_t_p, '°C', '>= 5.0 °C (норма)'],
    ['Относительная влажность в техподполье φп:', calc.basement.crawlSpaceRH, '%'],
    ['Точка росы воздуха в подполье tр.п:', calc.basement.dew_point_basement, '°C'],
    ['Температурный перепад на полу 1 этажа Δtв.п:', calc.basement.delta_t_floor, '°C', '<= 0.8 °C (норма п. 6.6 СП 2.04.01)'],
    ['Температура поверхности цокольной стены τв.цок:', calc.basement.tau_v_basement_wall, '°C', `> ${calc.basement.dew_point_basement} °C`],
    ['Выпадение конденсата на стене подполья:', calc.basement.isCondensationOnWall ? 'ЕСТЬ' : 'ОТСУТСТВУЕТ'],
    ['Суммарные тепловыделения от трубопроводов:', calc.basement.pipeHeatGains_total, 'Вт'],
    [''],
    ['ТЕПЛОПОТЕРИ ТРУБОПРОВОДОВ В ТЕХПОДПОЛЬЕ (Таблица 1.6)'],
    ['Температура теплоносителя (°C)', 'Условный диаметр Dy (мм)', 'Длина li (м)', 'Погонные теплопотери qi (Вт/м)', 'Суммарные потери Qi (Вт)'],
  ];

  calc.basement.pipesDetails.forEach((p) => {
    sheet4Data.push([p.temp, p.dy, p.length, p.q_heat_loss, p.q_total]);
  });

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  XLSX.utils.book_append_sheet(wb, ws4, '4. Техподполье');

  // -------------------------------------------------------------
  // ЛИСТ 5: ОКНА И ДВЕРИ
  // -------------------------------------------------------------
  const sheet5Data = [
    ['РАСЧЕТ ОКНА ' + calc.window.windowDef.id],
    ['Профильная система:', calc.window.windowDef.profileSystem],
    ['Стеклопакет:', calc.window.windowDef.glazingType],
    ['Размеры окна H x B:', `${calc.window.windowDef.dim.H} x ${calc.window.windowDef.dim.B} мм`],
    ['Общая площадь окна Fок:', calc.window.area_total, 'м²'],
    ['Площадь светопрозрачной части Fсв:', calc.window.area_transparent, 'м²'],
    ['Площадь непрозрачной части (профиль) Fнепр:', calc.window.area_opaque, 'м²'],
    ['Сопротивление стеклопакета Rсв:', calc.window.R_transparent, 'м²·°С/Вт'],
    ['Сопротивление профиля Rнепр:', calc.window.R_opaque, 'м²·°С/Вт'],
    ['Приведенное сопротивление окна Rт.ок:', calc.window.R_actual, 'м²·°С/Вт', '>= 1.0 м²·°С/Вт (норма)'],
    ['Вывод по теплозащите окна:', calc.window.isCompliant ? 'СООТВЕТСТВУЕТ' : 'НЕ СООТВЕТСТВУЕТ'],
    [''],
    ['ПОЭТАЖНЫЙ РАСЧЕТ ВОЗДУХОПРОНИЦАЕМОСТИ ОКОН (СП 2.04.01 п. 8.1)'],
    ['Этаж', 'Высота hi (м)', 'Ветровой коэфф. ki', 'Разность давлений Δp (Па)', 'Норматив Gн (кг/м²·ч)', 'Требуемое Rв.тр (м²·ч·Па/кг)', 'Требуемый класс окна'],
  ];

  calc.window.floors.forEach((f) => {
    sheet5Data.push([
      f.floor,
      f.height,
      f.k_i,
      f.delta_p,
      f.G_v_required,
      f.R_v_required,
      `Класс ${f.windowClass}`,
    ]);
  });

  sheet5Data.push(['']);
  sheet5Data.push(['РАСЧЕТ НАРУЖНЫХ ВХОДНЫХ ДВЕРЕЙ']);
  sheet5Data.push(['Требуемое сопротивление Rт.дн:', calc.door.R_required, 'м²·°С/Вт']);
  sheet5Data.push(['Принятое сопротивление Rт.д:', calc.door.R_adopted, 'м²·°С/Вт']);
  sheet5Data.push(['Вывод по двери:', calc.door.isCompliant ? 'СООТВЕТСТВУЕТ' : 'НЕ СООТВЕТСТВУЕТ']);

  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Data);
  XLSX.utils.book_append_sheet(wb, ws5, '5. Окна и двери');

  // Генерируем файл и инициируем скачивание
  const fileName = `Курсовая_Теплофизика_${calc.cipher.cityCode}_${calc.cipher.wallCode}_${calc.cipher.roofCode}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
