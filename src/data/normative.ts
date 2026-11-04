/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Нормативные справочные данные строительной теплофизики
 * Источники: СП 2.04.01-2020, СН 2.04.02-2020, пособие А.С. Шибеко (2018).
 */

/**
 * Таблица П.1 СП 2.04.01-2020:
 * Давление насыщенного водяного пара E(t), Па, при температуре t, °C
 */
export const SATURATED_VAPOR_PRESSURE_TABLE: { t: number; E: number }[] = [
  { t: -35, E: 22 },
  { t: -30, E: 38 },
  { t: -28, E: 47 },
  { t: -26, E: 58 },
  { t: -24, E: 72 },
  { t: -22, E: 88 },
  { t: -20, E: 107 },
  { t: -19, E: 119 },
  { t: -18, E: 131 },
  { t: -17, E: 145 },
  { t: -16, E: 160 },
  { t: -15, E: 176 },
  { t: -14, E: 194 },
  { t: -13, E: 213 },
  { t: -12, E: 234 },
  { t: -11, E: 257 },
  { t: -10, E: 282 },
  { t: -9, E: 309 },
  { t: -8, E: 338 },
  { t: -7, E: 370 },
  { t: -6, E: 404 },
  { t: -5, E: 441 },
  { t: -4, E: 481 },
  { t: -3, E: 524 },
  { t: -2, E: 571 },
  { t: -1, E: 622 },
  { t: 0, E: 611 }, // при t >= 0 над водой
  { t: 1, E: 657 },
  { t: 2, E: 706 },
  { t: 3, E: 758 },
  { t: 4, E: 813 },
  { t: 5, E: 872 },
  { t: 6, E: 935 },
  { t: 7, E: 1002 },
  { t: 8, E: 1073 },
  { t: 9, E: 1148 },
  { t: 10, E: 1228 },
  { t: 11, E: 1313 },
  { t: 12, E: 1403 },
  { t: 13, E: 1498 },
  { t: 14, E: 1599 },
  { t: 15, E: 1706 },
  { t: 16, E: 1819 },
  { t: 17, E: 1938 },
  { t: 18, E: 2064 },
  { t: 19, E: 2198 },
  { t: 20, E: 2339 },
  { t: 21, E: 2488 },
  { t: 22, E: 2645 },
  { t: 23, E: 2810 },
  { t: 24, E: 2985 },
  { t: 25, E: 3169 },
  { t: 26, E: 3363 },
  { t: 27, E: 3567 },
  { t: 28, E: 3782 },
  { t: 29, E: 4008 },
  { t: 30, E: 4246 },
  { t: 35, E: 5628 },
  { t: 40, E: 7384 },
];

/**
 * Расчет давления насыщенного пара E(t), Па
 * По нормативной таблице П.1 СП 2.04.01 с интерполяцией
 * или точной формуле Магнуса-Тетенса
 */
export function getSaturatedVaporPressure(temp: number): number {
  const table = SATURATED_VAPOR_PRESSURE_TABLE;
  if (temp <= table[0].t) return table[0].E;
  if (temp >= table[table.length - 1].t) return table[table.length - 1].E;

  for (let i = 0; i < table.length - 1; i++) {
    const t0 = table[i].t;
    const t1 = table[i + 1].t;
    if (temp >= t0 && temp <= t1) {
      const e0 = table[i].E;
      const e1 = table[i + 1].E;
      return +(e0 + ((temp - t0) / (t1 - t0)) * (e1 - e0)).toFixed(1);
    }
  }

  // Запасная формула
  if (temp >= 0) {
    return +(610.78 * Math.exp((17.27 * temp) / (temp + 237.3))).toFixed(1);
  } else {
    return +(610.78 * Math.exp((21.875 * temp) / (temp + 265.5))).toFixed(1);
  }
}

/**
 * Расчет точки росы tр по парциальному давлению водяного пара e, Па
 * По таблице Е.1 СП 2.04.01-2020 / обратной интерполяции
 */
export function getDewPoint(partialVaporPressure: number): number {
  if (partialVaporPressure <= 0) return -40;
  const table = SATURATED_VAPOR_PRESSURE_TABLE;

  if (partialVaporPressure <= table[0].E) return table[0].t;
  if (partialVaporPressure >= table[table.length - 1].E) return table[table.length - 1].t;

  for (let i = 0; i < table.length - 1; i++) {
    const e0 = table[i].E;
    const e1 = table[i + 1].E;
    if (partialVaporPressure >= e0 && partialVaporPressure <= e1) {
      const t0 = table[i].t;
      const t1 = table[i + 1].t;
      const fraction = (partialVaporPressure - e0) / (e1 - e0);
      return +(t0 + fraction * (t1 - t0)).toFixed(2);
    }
  }

  // Формула Магнуса обратная
  const a = 17.27;
  const b = 237.3;
  const alpha = Math.log(partialVaporPressure / 610.78);
  return +((b * alpha) / (a - alpha)).toFixed(2);
}

/**
 * Нормативные коэффициенты теплоотдачи αв, αн [Вт/(м²·°С)]
 * Таблица 6.4 СП 2.04.01-2020
 */
export const ALPHA_V = {
  wall: 8.7,
  roof: 8.7,
  floor_crawl_space: 8.7,
  window: 8.0,
  internal_partition: 8.7,
};

export const ALPHA_N = {
  exterior: 23.0, // Наружные стены, покрытия
  crawl_space_interior: 17.0, // Стены и пол в техподполье
  underground: 12.0,
};

/**
 * Нормативные значения допустимого температурного перепада Δtв, °C
 * Таблица 6.5 СП 2.04.01-2020
 */
export const DELTA_T_NORM = {
  residential_wall: 4.0,
  residential_roof: 3.0,
  residential_floor: 2.0,
  crawl_space_floor_drop: 0.8, // нормативный перепад для пола над техподпольем
};

/**
 * Нормативные сопротивления теплопередаче Rт.норм [м²·°С/Вт]
 * Таблица 7.1 СН 2.04.02-2020
 */
export const R_NORM = {
  residential_wall: 3.2,
  combined_roof: 6.0,
  attic_floor: 6.0,
  floor_driveway: 4.0,
  window: 1.0,
  door: 0.6, // базовый
};

/**
 * Аэродинамический коэффициент c_n по СП 2.04.01 (п. 8.1)
 */
export const C_N_AERODYNAMIC = 0.8;

/**
 * Коэффициент учета ветрового давления k_i в зависимости от высоты здания h
 * Тип местности B (городские территории, лесные массивы)
 * Таблица 6 [3] / Приложение М СП 2.04.01
 */
export function getWindPressureHeightCoeff(heightMeters: number): number {
  if (heightMeters <= 5) return 0.5;
  if (heightMeters <= 10) return 0.65;
  if (heightMeters <= 20) return 0.85;
  if (heightMeters <= 40) return 1.1;
  if (heightMeters <= 60) return 1.3;
  if (heightMeters <= 80) return 1.45;
  if (heightMeters <= 100) return 1.6;
  return +(1.0 + heightMeters * 0.007).toFixed(2);
}

/**
 * Классификация воздухопроницаемости окон и балконных дверей
 * Таблица 6.1 СП 2.04.01-2020
 * При Δp = 10 Па:
 * Класс А: G_v <= 6 кг/(м²·ч)
 * Класс Б: G_v <= 9 кг/(м²·ч)
 * Класс В: G_v <= 17 кг/(м²·ч)
 * Класс Г: G_v <= 27 кг/(м²·ч)
 * Класс Д: G_v <= 50 кг/(м²·ч)
 */
export function getWindowClassByAirPermeability(G_v: number): {
  classLetter: 'А' | 'Б' | 'В' | 'Г' | 'Д';
  maxPermeability: number;
  description: string;
} {
  if (G_v <= 6.0) {
    return {
      classLetter: 'А',
      maxPermeability: 6.0,
      description: 'Высокая воздухонепроницаемость (класс А)',
    };
  }
  if (G_v <= 9.0) {
    return {
      classLetter: 'Б',
      maxPermeability: 9.0,
      description: 'Повышенная воздухонепроницаемость (класс Б)',
    };
  }
  if (G_v <= 17.0) {
    return {
      classLetter: 'В',
      maxPermeability: 17.0,
      description: 'Умеренная воздухонепроницаемость (класс В)',
    };
  }
  if (G_v <= 27.0) {
    return {
      classLetter: 'Г',
      maxPermeability: 27.0,
      description: 'Средняя воздухонепроницаемость (класс Г)',
    };
  }
  return {
    classLetter: 'Д',
    maxPermeability: 50.0,
    description: 'Ограниченная воздухонепроницаемость (класс Д)',
  };
}
