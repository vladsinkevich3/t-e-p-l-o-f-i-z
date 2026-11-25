/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Нормативные справочные данные строительной теплофизики
 * Источники: СП 2.04.01-2020, СН 2.04.02-2020, СТБ 939-2013, пособие А.С. Шибеко (2018).
 */

/**
 * Точная оцифровка Приложения Е пособия А. С. Шибеко (2018, стр. 97–99) / Табл. Е.1 СП 2.04.01-2020:
 * Максимальное парциальное давление водяного пара E(t), Па, над льдом (t < 0 °C) и над водой (t >= 0 °C).
 * Каждая строка: 10 значений для десятых долей 0.0 .. 0.9:
 * - Для отрицательных ключей '-N' температура равна -(N + 0.d) (например, '-25'[9] -> -25.9 °C, '-0'[4] -> -0.4 °C).
 * - Для неотрицательных ключей 'N' температура равна +(N + 0.d) (например, '15'[5] -> +15.5 °C).
 */
const APPENDIX_E_NEGATIVE_ROWS: Record<number, readonly number[]> = {
  25: [63.3, 62.7, 62.0, 61.4, 60.8, 60.2, 59.6, 59.0, 58.4, 57.8],
  24: [69.9, 69.2, 68.5, 67.9, 67.2, 66.5, 65.9, 65.2, 64.6, 63.9],
  23: [77.2, 76.4, 75.7, 74.9, 74.2, 73.5, 72.7, 72.0, 71.3, 70.6],
  22: [85.1, 84.3, 83.5, 82.6, 81.8, 81.0, 80.3, 79.5, 78.7, 77.9],
  21: [93.8, 92.9, 92.0, 91.1, 90.2, 89.3, 88.5, 87.6, 86.8, 85.9],
  20: [103.3, 102.3, 101.3, 100.3, 99.4, 98.4, 97.5, 96.5, 95.6, 94.7],
  19: [113.6, 112.5, 111.5, 110.4, 109.4, 108.3, 107.3, 106.3, 105.3, 104.3],
  18: [124.9, 123.8, 122.6, 121.4, 120.3, 119.2, 118.0, 116.9, 115.8, 114.7],
  17: [137.3, 136.0, 134.7, 133.4, 132.2, 131.0, 129.7, 128.5, 127.3, 126.1],
  16: [150.7, 149.3, 147.9, 146.5, 145.2, 143.8, 142.5, 141.2, 139.8, 138.5],
  15: [165.3, 163.8, 162.3, 160.8, 159.3, 157.8, 156.4, 154.9, 153.5, 152.1],
  14: [181.2, 179.6, 177.9, 176.3, 174.7, 173.1, 171.5, 169.9, 168.4, 166.8],
  13: [198.5, 196.7, 194.9, 193.2, 191.4, 189.7, 188.0, 186.3, 184.6, 182.9],
  12: [217.3, 215.4, 213.4, 211.5, 209.6, 207.7, 205.9, 204.0, 202.2, 200.3],
  11: [237.7, 235.6, 233.5, 231.4, 229.4, 227.3, 225.3, 223.3, 221.3, 219.3],
  10: [259.9, 257.6, 255.3, 253.1, 250.8, 248.6, 246.4, 244.2, 242.0, 239.9],
  9: [283.9, 281.4, 279.0, 276.5, 274.1, 271.7, 269.3, 266.9, 264.6, 262.2],
  8: [310.0, 307.3, 304.6, 302.0, 299.3, 296.7, 294.1, 291.5, 289.0, 286.5],
  7: [338.2, 335.3, 332.4, 329.5, 326.6, 323.8, 321.0, 318.2, 315.5, 312.7],
  6: [368.7, 365.6, 362.4, 359.3, 356.2, 353.2, 350.1, 347.1, 344.1, 341.1],
  5: [401.8, 398.3, 395.0, 391.6, 388.2, 384.9, 381.6, 378.4, 375.1, 371.9],
  4: [437.5, 433.8, 430.1, 426.5, 422.9, 419.3, 415.7, 412.2, 408.7, 405.2],
  3: [476.1, 472.1, 468.1, 464.2, 460.3, 456.4, 452.6, 448.7, 445.0, 441.2],
  2: [517.7, 513.4, 509.1, 504.9, 500.7, 496.5, 492.3, 488.2, 484.1, 480.1],
  1: [562.7, 558.0, 553.4, 548.8, 544.3, 539.8, 535.3, 530.9, 526.4, 522.1],
  0: [611.2, 606.1, 601.2, 596.2, 591.3, 586.5, 581.6, 576.8, 572.1, 567.4],
};

const APPENDIX_E_POSITIVE_ROWS: Record<number, readonly number[]> = {
  0: [611.2, 615.7, 620.2, 624.7, 629.2, 633.8, 638.4, 643.0, 647.7, 652.4],
  1: [657.1, 661.8, 666.6, 671.4, 676.3, 681.1, 686.0, 691.0, 695.9, 700.9],
  2: [706.0, 711.0, 716.1, 721.2, 726.4, 731.6, 736.8, 742.1, 747.4, 752.7],
  3: [758.0, 763.4, 768.8, 774.3, 779.8, 785.3, 790.9, 796.5, 802.1, 807.8],
  4: [813.5, 819.2, 825.0, 830.8, 836.6, 842.5, 848.4, 854.4, 860.4, 866.4],
  5: [872.5, 878.6, 884.7, 890.9, 897.1, 903.4, 909.7, 916.0, 922.4, 928.8],
  6: [935.2, 941.7, 948.3, 954.8, 961.4, 968.1, 974.8, 981.5, 988.3, 995.1],
  7: [1002.0, 1008.9, 1015.8, 1022.8, 1029.8, 1036.9, 1044.0, 1051.1, 1058.3, 1065.6],
  8: [1072.8, 1080.2, 1087.5, 1095.0, 1102.4, 1109.9, 1117.5, 1125.1, 1132.7, 1140.4],
  9: [1148.1, 1155.9, 1163.7, 1171.6, 1179.5, 1187.5, 1195.5, 1203.5, 1211.6, 1219.8],
  10: [1228.0, 1236.2, 1244.5, 1252.9, 1261.3, 1269.7, 1278.2, 1286.8, 1295.4, 1304.0],
  11: [1312.7, 1321.5, 1330.3, 1339.1, 1348.1, 1357.0, 1366.0, 1375.1, 1384.2, 1393.4],
  12: [1402.6, 1411.9, 1421.2, 1430.6, 1440.0, 1449.5, 1459.1, 1468.7, 1478.3, 1488.0],
  13: [1497.8, 1507.6, 1517.5, 1527.5, 1537.5, 1547.5, 1557.6, 1567.8, 1578.0, 1588.3],
  14: [1598.7, 1609.1, 1619.5, 1630.1, 1640.7, 1651.3, 1662.0, 1672.8, 1683.6, 1694.5],
  15: [1705.4, 1716.5, 1727.5, 1738.7, 1749.9, 1761.1, 1772.5, 1783.9, 1795.3, 1806.9],
  16: [1818.4, 1830.1, 1841.8, 1853.6, 1865.4, 1877.4, 1889.3, 1901.4, 1913.5, 1925.7],
  17: [1937.9, 1950.3, 1962.7, 1975.1, 1987.6, 2000.2, 2012.9, 2025.7, 2038.5, 2051.3],
  18: [2064.3, 2077.3, 2090.4, 2103.6, 2116.8, 2130.1, 2143.5, 2157.0, 2170.5, 2184.1],
  19: [2197.8, 2211.6, 2225.4, 2239.3, 2253.3, 2267.3, 2281.5, 2295.7, 2310.0, 2324.4],
  20: [2338.8, 2353.3, 2367.9, 2382.6, 2397.4, 2412.2, 2427.2, 2442.2, 2457.2, 2472.4],
  21: [2487.7, 2503.0, 2518.4, 2533.9, 2549.5, 2565.2, 2580.9, 2596.7, 2612.7, 2628.7],
  22: [2644.8, 2660.9, 2677.2, 2693.5, 2710.0, 2726.5, 2743.1, 2759.8, 2776.6, 2793.5],
  23: [2810.4, 2827.5, 2844.6, 2861.9, 2879.2, 2896.6, 2914.1, 2931.8, 2949.5, 2967.2],
  24: [2985.1, 3003.1, 3021.2, 3039.3, 3057.6, 3076.0, 3094.4, 3113.0, 3131.6, 3150.4],
  25: [3169.2, 3188.2, 3207.2, 3226.3, 3245.6, 3264.9, 3284.4, 3303.9, 3323.5, 3343.3],
};

/**
 * Экстраполяция вне диапазона таблицы Приложения Е (-25.9 .. +25.9 °C)
 * по уравнению Гоффа-Грэтча / Бака (согласуется с границами -25.9 и +25.9 °C).
 */
function computeTailVaporPressure(t: number): number {
  if (t === -26) return 57.2;
  if (t === 26) return 3363.2;
  if (t >= 0) {
    // Формула Магнуса-Тетенса, откалиброванная под советскую Табл. Е.1 (E(25.9)=3343.3, E(30)=4246.0)
    return +(611.21 * Math.exp((17.502 * t) / (240.97 + t))).toFixed(1);
  }
  return +(611.15 * Math.exp((22.452 * t) / (272.55 + t))).toFixed(1);
}

/**
 * Таблица Е.1 (Приложение Е, А. С. Шибеко 2018, стр. 97–99; СП 2.04.01-2020):
 * Давление насыщенного водяного пара E(t), Па, с шагом 0,1 °C от -26,0 °C до +26,0 °C
 * и граничными узлами до -35 °C и +40 °C (отсортирована строго по возрастанию t, 531 строка).
 */
function buildAppendixETable(): { t: number; E: number }[] {
  const rows: { t: number; E: number }[] = [];

  // Нижний хвост (-35..-27 °C)
  for (const t of [-35, -30, -28, -27]) {
    rows.push({ t, E: computeTailVaporPressure(t) });
  }

  // -26.0 °C
  rows.push({ t: -26.0, E: computeTailVaporPressure(-26) });

  // Точные значения Приложения Е для отрицательных температур (-25.9 .. -0.1 °C)
  for (let i = -259; i <= -1; i++) {
    const absTenths = -i;
    const whole = Math.floor(absTenths / 10);
    const frac = absTenths % 10;
    const t = +(i / 10).toFixed(1);
    const E = APPENDIX_E_NEGATIVE_ROWS[whole][frac];
    rows.push({ t, E });
  }

  // Точные значения Приложения Е для неотрицательных температур (0.0 .. +25.9 °C)
  for (let i = 0; i <= 259; i++) {
    const whole = Math.floor(i / 10);
    const frac = i % 10;
    const t = +(i / 10).toFixed(1);
    const E = APPENDIX_E_POSITIVE_ROWS[whole][frac];
    rows.push({ t, E });
  }

  // +26.0 °C
  rows.push({ t: 26.0, E: computeTailVaporPressure(26) });

  // Верхний хвост (+27..+40 °C)
  for (const t of [27, 28, 29, 30, 35, 40]) {
    rows.push({ t, E: computeTailVaporPressure(t) });
  }

  return rows;
}

export const SATURATED_VAPOR_PRESSURE_TABLE: { t: number; E: number }[] = buildAppendixETable();

/**
 * Расчет давления насыщенного водяного пара E(t), Па
 * Методом точной линейной интерполяции по Приложению Е (А. С. Шибеко, стр. 97–99, шаг 0,1 °C)
 * БЕЗ предварительного округления температуры t.
 */
export function getSaturatedVaporPressure(temp: number): number {
  const table = SATURATED_VAPOR_PRESSURE_TABLE;
  if (temp <= table[0].t) return table[0].E;
  if (temp >= table[table.length - 1].t) return table[table.length - 1].E;

  // Бинарный поиск нижнего соседа t0 <= temp <= t1
  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].t <= temp) lo = mid;
    else hi = mid;
  }

  const p0 = table[lo];
  const p1 = table[hi];
  if (temp === p0.t) return p0.E;
  if (temp === p1.t) return p1.E;

  const fraction = (temp - p0.t) / (p1.t - p0.t);
  return +(p0.E + fraction * (p1.E - p0.E)).toFixed(1);
}

/**
 * Расчет точки росы tр по парциальному давлению водяного пара e, Па
 * Точной обратной линейной интерполяцией по Приложению Е (шаг 0,1 °C).
 */
export function getDewPoint(partialVaporPressure: number): number {
  if (partialVaporPressure <= 0) return -40;
  const table = SATURATED_VAPOR_PRESSURE_TABLE;

  if (partialVaporPressure <= table[0].E) return table[0].t;
  if (partialVaporPressure >= table[table.length - 1].E) return table[table.length - 1].t;

  let lo = 0;
  let hi = table.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].E <= partialVaporPressure) lo = mid;
    else hi = mid;
  }

  const p0 = table[lo];
  const p1 = table[hi];
  const fraction = (partialVaporPressure - p0.E) / (p1.E - p0.E);
  return +(p0.t + fraction * (p1.t - p0.t)).toFixed(2);
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
 * Коэффициент неравномерности теплоотдачи системы отопления m
 * Таблица 7.1 СП 2.04.01-2020 / Шибеко (2018), п. 5 (стр. 40, 42)
 */
export const HEATING_IRREGULARITY_M = {
  central_water: 0.1, // Центральное водяное отопление (стандарт для курсовой работы)
};

/**
 * Нормативные значения допустимого температурного перепада Δtв, °C
 * Таблица 6.5 СП 2.04.01-2020
 */
export const DELTA_T_NORM = {
  residential_wall: 6.0,
  residential_roof: 4.0,
  residential_floor: 2.0,
  crawl_space_floor_drop: 0.8, // нормативный перепад для пола над техподпольем
};

/**
 * Нормативные сопротивления теплопередаче Rт.норм [м²·°С/Вт]
 * Таблица 7.1 СН 2.04.02-2020
 */
export const R_NORM = {
  residential_wall: 3.2,
  industrial_wall: 2.0,
  combined_roof: 6.0,
  industrial_roof: 3.0,
  attic_floor: 6.0,
  floor_driveway: 6.0,
  window: 1.0,
  industrial_window: 0.6,
};

/**
 * Аэродинамические коэффициенты c_н и c_п по СП 2.04.01 / Шибеко (п. 6.2, стр. 49)
 * c_н = +0,8 (наветренная сторона), c_п = -0,6 (подветренная сторона) => c_н - c_п = 1,4
 */
export const C_N_AERODYNAMIC = 0.8;
export const C_P_AERODYNAMIC = -0.6;
export const DELTA_C_AERODYNAMIC = 1.4;

/**
 * Приложение М (Шибеко 2018, стр. 106):
 * Коэффициент k_i, учитывающий изменение ветрового давления по высоте здания z
 * для типов местности A (открытые побережья/степи), B (городские территории), C (плотная застройка).
 */
export type WindTerrainType = 'A' | 'B' | 'C';

export const WIND_HEIGHT_COEFF_TABLE: { z: number; A: number; B: number; C: number }[] = [
  { z: 5, A: 0.75, B: 0.5, C: 0.4 },
  { z: 10, A: 1.0, B: 0.65, C: 0.4 },
  { z: 20, A: 1.25, B: 0.85, C: 0.55 },
  { z: 40, A: 1.5, B: 1.1, C: 0.8 },
  { z: 60, A: 1.7, B: 1.3, C: 1.0 },
  { z: 80, A: 1.85, B: 1.45, C: 1.15 },
  { z: 100, A: 2.0, B: 1.6, C: 1.25 },
];

/**
 * Линейная интерполяция коэффициента k_i по Приложению М (Шибеко 2018, стр. 50, 106)
 */
export function getWindPressureHeightCoeff(
  heightMeters: number,
  terrainType: WindTerrainType = 'B'
): number {
  const tbl = WIND_HEIGHT_COEFF_TABLE;
  if (heightMeters <= tbl[0].z) return tbl[0][terrainType];
  const last = tbl[tbl.length - 1];
  if (heightMeters >= last.z) return last[terrainType];

  for (let i = 0; i < tbl.length - 1; i++) {
    const p0 = tbl[i];
    const p1 = tbl[i + 1];
    if (heightMeters >= p0.z && heightMeters <= p1.z) {
      const k = p0[terrainType] + ((heightMeters - p0.z) / (p1.z - p0.z)) * (p1[terrainType] - p0[terrainType]);
      return +k.toFixed(3);
    }
  }
  return tbl[0][terrainType];
}

/**
 * Таблица 6.1 (Шибеко 2018, стр. 46; СТБ 939-2013):
 * Классификация окон по воздухопроницаемости при Δp = 10 Па
 */
export interface WindowAirPermeabilityClassDef {
  classLetter: 'А' | 'Б' | 'В' | 'Г' | 'Д';
  volumePermeabilityRange: string; // м³/(ч·м²)
  rvMin: number; // нижняя граница Rв, м²·ч/кг
  rvMax: number | null; // верхняя граница Rв, м²·ч/кг (null = > 1.279)
  rvRangeText: string;
  description: string;
}

export const WINDOW_AIR_PERMEABILITY_CLASSES: WindowAirPermeabilityClassDef[] = [
  {
    classLetter: 'А',
    volumePermeabilityRange: 'до 3',
    rvMin: 1.279,
    rvMax: null,
    rvRangeText: '> 1,279',
    description: 'Высший класс воздухонепроницаемости',
  },
  {
    classLetter: 'Б',
    volumePermeabilityRange: 'св. 3 до 9',
    rvMin: 0.426,
    rvMax: 1.279,
    rvRangeText: '0,426 – 1,279',
    description: 'Повышенная воздухонепроницаемость',
  },
  {
    classLetter: 'В',
    volumePermeabilityRange: 'св. 9 до 17',
    rvMin: 0.226,
    rvMax: 0.426,
    rvRangeText: '0,226 – 0,426',
    description: 'Умеренная воздухонепроницаемость',
  },
  {
    classLetter: 'Г',
    volumePermeabilityRange: 'св. 17 до 27',
    rvMin: 0.142,
    rvMax: 0.226,
    rvRangeText: '0,142 – 0,226',
    description: 'Средняя воздухонепроницаемость',
  },
  {
    classLetter: 'Д',
    volumePermeabilityRange: 'св. 27 до 50',
    rvMin: 0.077,
    rvMax: 0.142,
    rvRangeText: '0,077 – 0,142',
    description: 'Ограниченная воздухонепроницаемость',
  },
];

export function getWindowClassLetterByRv(rv: number): 'А' | 'Б' | 'В' | 'Г' | 'Д' {
  if (rv > 1.279) return 'А';
  if (rv > 0.426) return 'Б';
  if (rv > 0.226) return 'В';
  if (rv > 0.142) return 'Г';
  return 'Д';
}

/**
 * Назначение класса окна по диапазону Rв.ок = (1,0–1,2)·Rв.тр (Таблица 6.4 Шибеко, стр. 50).
 * Если интервал пересекает границу классов (например, 0,226 между В и Г), выводятся оба класса с поддиапазонами.
 */
export function getWindowClassRangeByRv(
  rvMin: number,
  rvMax: number
): {
  primaryClass: 'А' | 'Б' | 'В' | 'Г' | 'Д';
  classText: string;
} {
  const fmt = (n: number) => n.toFixed(3).replace('.', ',');
  const clsHigh = getWindowClassLetterByRv(rvMax);
  const clsLow = getWindowClassLetterByRv(rvMin);

  if (clsHigh === clsLow) {
    return { primaryClass: clsHigh, classText: clsHigh };
  }

  // Находим все классы, которые пересекает отрезок [rvMin, rvMax], сверху вниз (от А к Д)
  const parts: string[] = [];
  for (const def of WINDOW_AIR_PERMEABILITY_CLASSES) {
    const segLow = Math.max(rvMin, def.rvMin);
    const segHigh = def.rvMax !== null ? Math.min(rvMax, def.rvMax) : rvMax;
    if (segHigh > segLow + 1e-6) {
      parts.push(`${def.classLetter} (при Rв.ок = ${fmt(segLow)}–${fmt(segHigh)})`);
    }
  }

  // Если rvMin < 0.077 (очень низкое сопротивление), все равно попадает в Д
  if (parts.length === 0) {
    return { primaryClass: clsHigh, classText: clsHigh };
  }

  return {
    primaryClass: clsHigh,
    classText: parts.join('; '),
  };
}
