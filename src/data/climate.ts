/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Климатические данные всех 129 городов Республики Беларусь (Г1–Г117 из табл. 1.1 А. С. Шибеко + Г118–Г129 доп. райцентры и метеостанции).
 * Все расчетные параметры наружного воздуха приведены СТРОГО по официальным таблицам 4.1, 4.2, 4.3, 4.4 и 4.5
 * СП 2.04.04-2026 «Строительная климатология» (44 опорные метеостанции Республики Беларусь).
 */

export interface ClimateCity {
  id: string; // 'Г1' ... 'Г129'
  name: string;
  region: string;
  nearestStation: string;
  t_coldest_day_098: number; // tх.с (0.98), °C (табл. 4.1 СП 2.04.04-2026)
  t_coldest_day_092: number; // tх.с (0.92), °C (табл. 4.1)
  t_coldest_5days_098: number; // tх.5 (0.98), °C (табл. 4.1)
  t_coldest_5days_092: number; // tх.5 (0.92), °C (табл. 4.1)
  wind_speed_winter: number; // vср (макс. из средних по румбам в январе), м/с (табл. 4.5)
  t_heating_period: number; // tн.от, °C (период со ср. сут. температурой <= 8 °C, табл. 4.2)
  duration_heating_period: number; // zот, сут (период <= 8 °C, табл. 4.2)
  t_heating_period_10?: number; // tн.от (<= 10 °C для детсадов, школ, больниц — табл. 4.2)
  duration_heating_period_10?: number; // zот (<= 10 °C — табл. 4.2)
  rh_heating_period: number; // φн.от, % (табл. 4.3)
  barometric_pressure_winter: number; // гПа (среднее давление января, табл. 4.4)
}

interface StationClimate {
  nearestStation: string;
  t_coldest_day_098: number;
  t_coldest_day_092: number;
  t_coldest_5days_098: number;
  t_coldest_5days_092: number;
  wind_speed_winter: number;
  t_heating_period: number;
  duration_heating_period: number;
  t_heating_period_10: number;
  duration_heating_period_10: number;
  rh_heating_period: number;
  barometric_pressure_winter: number;
}

/**
 * 44 опорные метеостанции Республики Беларусь по СП 2.04.04-2026 (Таблицы 4.1, 4.2, 4.3, 4.4, 4.5).
 */
const STATIONS_SP_2026: Record<string, StationClimate> = {
  // --- Витебская область ---
  'Верхнедвинск': {
    nearestStation: 'Верхнедвинск',
    t_coldest_day_098: -28, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.5, t_heating_period: -0.4, duration_heating_period: 197,
    t_heating_period_10: 0.5, duration_heating_period_10: 216, rh_heating_period: 83, barometric_pressure_winter: 998.5,
  },
  'Езерище': {
    nearestStation: 'Езерище',
    t_coldest_day_098: -30, t_coldest_day_092: -27, t_coldest_5days_098: -26, t_coldest_5days_092: -23,
    wind_speed_winter: 3.6, t_heating_period: -1.0, duration_heating_period: 197,
    t_heating_period_10: 0.1, duration_heating_period_10: 219, rh_heating_period: 83, barometric_pressure_winter: 993.2,
  },
  'Полоцк': {
    nearestStation: 'Полоцк',
    t_coldest_day_098: -27, t_coldest_day_092: -25, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.2, t_heating_period: -0.4, duration_heating_period: 196,
    t_heating_period_10: 0.5, duration_heating_period_10: 215, rh_heating_period: 83, barometric_pressure_winter: 998.8,
  },
  'Шарковщина': {
    nearestStation: 'Шарковщина',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -22,
    wind_speed_winter: 3.3, t_heating_period: -0.2, duration_heating_period: 195,
    t_heating_period_10: 0.7, duration_heating_period_10: 214, rh_heating_period: 84, barometric_pressure_winter: 998.9,
  },
  'Витебск': {
    nearestStation: 'Витебск',
    t_coldest_day_098: -28, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.2, t_heating_period: -0.7, duration_heating_period: 194,
    t_heating_period_10: 0.1, duration_heating_period_10: 212, rh_heating_period: 82, barometric_pressure_winter: 993.9,
  },
  'Лынтупы': {
    nearestStation: 'Лынтупы',
    t_coldest_day_098: -29, t_coldest_day_092: -25, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.1, t_heating_period: -0.3, duration_heating_period: 196,
    t_heating_period_10: 0.8, duration_heating_period_10: 223, rh_heating_period: 86, barometric_pressure_winter: 989.0,
  },
  'Докшицы': {
    nearestStation: 'Докшицы',
    t_coldest_day_098: -29, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 4.8, t_heating_period: -0.6, duration_heating_period: 195,
    t_heating_period_10: 0.5, duration_heating_period_10: 218, rh_heating_period: 84, barometric_pressure_winter: 991.5,
  },
  'Сенно': {
    nearestStation: 'Сенно',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 2.7, t_heating_period: -0.4, duration_heating_period: 195,
    t_heating_period_10: 0.3, duration_heating_period_10: 212, rh_heating_period: 82, barometric_pressure_winter: 994.0,
  },
  'Березинский заповедник': {
    nearestStation: 'Березинский заповедник',
    t_coldest_day_098: -28, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -23,
    wind_speed_winter: 2.9, t_heating_period: -0.5, duration_heating_period: 197,
    t_heating_period_10: 0.5, duration_heating_period_10: 218, rh_heating_period: 84, barometric_pressure_winter: 993.8,
  },
  'Орша': {
    nearestStation: 'Орша',
    t_coldest_day_098: -29, t_coldest_day_092: -25, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.6, t_heating_period: -0.3, duration_heating_period: 197,
    t_heating_period_10: 0.5, duration_heating_period_10: 216, rh_heating_period: 84, barometric_pressure_winter: 993.1,
  },

  // --- Минская область ---
  'Вилейка': {
    nearestStation: 'Вилейка',
    t_coldest_day_098: -29, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 2.4, t_heating_period: -0.4, duration_heating_period: 196,
    t_heating_period_10: 0.4, duration_heating_period_10: 213, rh_heating_period: 84, barometric_pressure_winter: 995.0,
  },
  'Борисов': {
    nearestStation: 'Борисов',
    t_coldest_day_098: -27, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.1, t_heating_period: -0.3, duration_heating_period: 193,
    t_heating_period_10: 0.5, duration_heating_period_10: 213, rh_heating_period: 84, barometric_pressure_winter: 992.7,
  },
  'Воложин': {
    nearestStation: 'Воложин',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.2, t_heating_period: -0.2, duration_heating_period: 191,
    t_heating_period_10: 0.7, duration_heating_period_10: 210, rh_heating_period: 83, barometric_pressure_winter: 987.9,
  },
  'Минск': {
    nearestStation: 'Минск',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 2.6, t_heating_period: -0.2, duration_heating_period: 193,
    t_heating_period_10: 0.4, duration_heating_period_10: 208, rh_heating_period: 83, barometric_pressure_winter: 988.1,
  },
  'Березино': {
    nearestStation: 'Березино',
    t_coldest_day_098: -28, t_coldest_day_092: -26, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 2.9, t_heating_period: -0.3, duration_heating_period: 189,
    t_heating_period_10: 0.6, duration_heating_period_10: 211, rh_heating_period: 84, barometric_pressure_winter: 997.6,
  },
  'Столбцы': {
    nearestStation: 'Столбцы',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 2.6, t_heating_period: 0.0, duration_heating_period: 188,
    t_heating_period_10: 0.8, duration_heating_period_10: 207, rh_heating_period: 85, barometric_pressure_winter: 995.3,
  },
  'Марьина Горка': {
    nearestStation: 'Марьина Горка',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.5, t_heating_period: -0.3, duration_heating_period: 186,
    t_heating_period_10: 0.7, duration_heating_period_10: 206, rh_heating_period: 84, barometric_pressure_winter: 995.1,
  },
  'Слуцк': {
    nearestStation: 'Слуцк',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 4.8, t_heating_period: -0.1, duration_heating_period: 187,
    t_heating_period_10: 0.9, duration_heating_period_10: 208, rh_heating_period: 85, barometric_pressure_winter: 997.1,
  },

  // --- Гродненская область ---
  'Ошмяны': {
    nearestStation: 'Ошмяны',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 4.4, t_heating_period: -0.1, duration_heating_period: 192,
    t_heating_period_10: 0.8, duration_heating_period_10: 213, rh_heating_period: 85, barometric_pressure_winter: 989.5,
  },
  'Лида': {
    nearestStation: 'Лида',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 3.4, t_heating_period: 0.4, duration_heating_period: 187,
    t_heating_period_10: 1.2, duration_heating_period_10: 207, rh_heating_period: 84, barometric_pressure_winter: 997.3,
  },
  'Гродно': {
    nearestStation: 'Гродно',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 4.7, t_heating_period: 0.5, duration_heating_period: 184,
    t_heating_period_10: 1.4, duration_heating_period_10: 206, rh_heating_period: 85, barometric_pressure_winter: 998.6,
  },
  'Новогрудок': {
    nearestStation: 'Новогрудок',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -20,
    wind_speed_winter: 5.0, t_heating_period: 0.2, duration_heating_period: 190,
    t_heating_period_10: 0.7, duration_heating_period_10: 210, rh_heating_period: 85, barometric_pressure_winter: 981.8,
  },
  'Волковыск': {
    nearestStation: 'Волковыск',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 3.8, t_heating_period: 0.6, duration_heating_period: 182,
    t_heating_period_10: 1.5, duration_heating_period_10: 204, rh_heating_period: 85, barometric_pressure_winter: 994.3,
  },

  // --- Могилевская область ---
  'Горки': {
    nearestStation: 'Горки',
    t_coldest_day_098: -29, t_coldest_day_092: -27, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 4.9, t_heating_period: -1.1, duration_heating_period: 196,
    t_heating_period_10: -0.1, duration_heating_period_10: 218, rh_heating_period: 86, barometric_pressure_winter: 991.1,
  },
  'Могилев': {
    nearestStation: 'Могилев',
    t_coldest_day_098: -29, t_coldest_day_092: -26, t_coldest_5days_098: -24, t_coldest_5days_092: -22,
    wind_speed_winter: 4.7, t_heating_period: -0.8, duration_heating_period: 192,
    t_heating_period_10: 0.2, duration_heating_period_10: 214, rh_heating_period: 85, barometric_pressure_winter: 992.5,
  },
  'Кличев': {
    nearestStation: 'Кличев',
    t_coldest_day_098: -30, t_coldest_day_092: -27, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.4, t_heating_period: -0.5, duration_heating_period: 190,
    t_heating_period_10: 0.5, duration_heating_period_10: 211, rh_heating_period: 85, barometric_pressure_winter: 997.6,
  },
  'Славгород': {
    nearestStation: 'Славгород',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -22,
    wind_speed_winter: 3.6, t_heating_period: -0.6, duration_heating_period: 190,
    t_heating_period_10: 0.3, duration_heating_period_10: 210, rh_heating_period: 82, barometric_pressure_winter: 995.9,
  },
  'Костюковичи': {
    nearestStation: 'Костюковичи',
    t_coldest_day_098: -29, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 4.0, t_heating_period: -0.9, duration_heating_period: 190,
    t_heating_period_10: 0.2, duration_heating_period_10: 213, rh_heating_period: 83, barometric_pressure_winter: 996.3,
  },
  'Бобруйск': {
    nearestStation: 'Бобруйск',
    t_coldest_day_098: -29, t_coldest_day_092: -26, t_coldest_5days_098: -25, t_coldest_5days_092: -22,
    wind_speed_winter: 3.8, t_heating_period: -0.3, duration_heating_period: 190,
    t_heating_period_10: 0.7, duration_heating_period_10: 211, rh_heating_period: 83, barometric_pressure_winter: 997.6,
  },

  // --- Брестская область ---
  'Барановичи': {
    nearestStation: 'Барановичи',
    t_coldest_day_098: -28, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.7, t_heating_period: 0.14, duration_heating_period: 184,
    t_heating_period_10: 1.1, duration_heating_period_10: 206, rh_heating_period: 84, barometric_pressure_winter: 993.0,
  },
  'Ганцевичи': {
    nearestStation: 'Ганцевичи',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.3, t_heating_period: 0.3, duration_heating_period: 184,
    t_heating_period_10: 1.3, duration_heating_period_10: 209, rh_heating_period: 83, barometric_pressure_winter: 997.6,
  },
  'Ивацевичи': {
    nearestStation: 'Ивацевичи',
    t_coldest_day_098: -26, t_coldest_day_092: -23, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 2.6, t_heating_period: 0.5, duration_heating_period: 181,
    t_heating_period_10: 1.4, duration_heating_period_10: 202, rh_heating_period: 83, barometric_pressure_winter: 998.2,
  },
  'Пружаны': {
    nearestStation: 'Пружаны',
    t_coldest_day_098: -26, t_coldest_day_092: -23, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 4.2, t_heating_period: 0.6, duration_heating_period: 179,
    t_heating_period_10: 1.5, duration_heating_period_10: 203, rh_heating_period: 85, barometric_pressure_winter: 997.6,
  },
  'Высокое': {
    nearestStation: 'Высокое',
    t_coldest_day_098: -25, t_coldest_day_092: -22, t_coldest_5days_098: -22, t_coldest_5days_092: -19,
    wind_speed_winter: 3.3, t_heating_period: 1.3, duration_heating_period: 178,
    t_heating_period_10: 1.7, duration_heating_period_10: 199, rh_heating_period: 84, barometric_pressure_winter: 997.1,
  },
  'Полесская': {
    nearestStation: 'Полесская',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 4.8, t_heating_period: 0.4, duration_heating_period: 183,
    t_heating_period_10: 1.3, duration_heating_period_10: 208, rh_heating_period: 84, barometric_pressure_winter: 1001.1,
  },
  'Брест': {
    nearestStation: 'Брест',
    t_coldest_day_098: -24, t_coldest_day_092: -21, t_coldest_5days_098: -22, t_coldest_5days_092: -19,
    wind_speed_winter: 3.2, t_heating_period: 1.2, duration_heating_period: 174,
    t_heating_period_10: 2.1, duration_heating_period_10: 196, rh_heating_period: 82, barometric_pressure_winter: 999.8,
  },
  'Пинск': {
    nearestStation: 'Пинск',
    t_coldest_day_098: -25, t_coldest_day_092: -22, t_coldest_5days_098: -22, t_coldest_5days_092: -19,
    wind_speed_winter: 2.8, t_heating_period: 0.6, duration_heating_period: 176,
    t_heating_period_10: 1.5, duration_heating_period_10: 197, rh_heating_period: 83, barometric_pressure_winter: 1000.2,
  },

  // --- Гомельская область ---
  'Жлобин': {
    nearestStation: 'Жлобин',
    t_coldest_day_098: -27, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 2.7, t_heating_period: -0.2, duration_heating_period: 183,
    t_heating_period_10: 1.2, duration_heating_period_10: 209, rh_heating_period: 82, barometric_pressure_winter: 999.7,
  },
  'Октябрь': {
    nearestStation: 'Октябрь',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.6, t_heating_period: -0.1, duration_heating_period: 183,
    t_heating_period_10: 1.1, duration_heating_period_10: 203, rh_heating_period: 82, barometric_pressure_winter: 1000.2,
  },
  'Гомель': {
    nearestStation: 'Гомель',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -20,
    wind_speed_winter: 2.8, t_heating_period: -0.2, duration_heating_period: 182,
    t_heating_period_10: 0.6, duration_heating_period_10: 199, rh_heating_period: 82, barometric_pressure_winter: 1002.1,
  },
  'Василевичи': {
    nearestStation: 'Василевичи',
    t_coldest_day_098: -28, t_coldest_day_092: -25, t_coldest_5days_098: -25, t_coldest_5days_092: -21,
    wind_speed_winter: 2.6, t_heating_period: 0.0, duration_heating_period: 181,
    t_heating_period_10: 1.1, duration_heating_period_10: 204, rh_heating_period: 82, barometric_pressure_winter: 1000.4,
  },
  'Житковичи': {
    nearestStation: 'Житковичи',
    t_coldest_day_098: -26, t_coldest_day_092: -23, t_coldest_5days_098: -23, t_coldest_5days_092: -20,
    wind_speed_winter: 2.6, t_heating_period: 0.3, duration_heating_period: 180,
    t_heating_period_10: 1.3, duration_heating_period_10: 202, rh_heating_period: 82, barometric_pressure_winter: 1001.2,
  },
  'Мозырь': {
    nearestStation: 'Мозырь',
    t_coldest_day_098: -28, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -20,
    wind_speed_winter: 2.5, t_heating_period: 0.0, duration_heating_period: 181,
    t_heating_period_10: 0.9, duration_heating_period_10: 201, rh_heating_period: 82, barometric_pressure_winter: 995.0,
  },
  'Брагин': {
    nearestStation: 'Брагин',
    t_coldest_day_098: -27, t_coldest_day_092: -24, t_coldest_5days_098: -24, t_coldest_5days_092: -21,
    wind_speed_winter: 3.4, t_heating_period: -0.1, duration_heating_period: 181,
    t_heating_period_10: 0.8, duration_heating_period_10: 201, rh_heating_period: 84, barometric_pressure_winter: 1004.2,
  },
};

function makeCity(
  id: string,
  name: string,
  region: string,
  stationKey: keyof typeof STATIONS_SP_2026
): ClimateCity {
  return {
    id,
    name,
    region,
    ...STATIONS_SP_2026[stationKey],
  };
}

const CITY_DEFS: [string, string, string, keyof typeof STATIONS_SP_2026][] = [
  ['Г1', 'Барановичи', 'Брестская обл.', 'Барановичи'],
  ['Г2', 'Барань', 'Витебская обл.', 'Орша'],
  ['Г3', 'Белыничи', 'Могилевская обл.', 'Могилев'],
  ['Г4', 'Береза', 'Брестская обл.', 'Пружаны'],
  ['Г5', 'Березино', 'Минская обл.', 'Березино'],
  ['Г6', 'Берестовица', 'Гродненская обл.', 'Волковыск'],
  ['Г7', 'Бешенковичи', 'Витебская обл.', 'Сенно'],
  ['Г8', 'Бобруйск', 'Могилевская обл.', 'Бобруйск'],
  ['Г9', 'Борисов', 'Минская обл.', 'Борисов'],
  ['Г10', 'Брагин', 'Гомельская обл.', 'Брагин'],
  ['Г11', 'Браслав', 'Витебская обл.', 'Шарковщина'],
  ['Г12', 'Брест', 'Брестская обл.', 'Брест'],
  ['Г13', 'Буда-Кошелево', 'Гомельская обл.', 'Жлобин'],
  ['Г14', 'Быхов', 'Могилевская обл.', 'Могилев'],
  ['Г15', 'Верхнедвинск', 'Витебская обл.', 'Верхнедвинск'],
  ['Г16', 'Ветка', 'Гомельская обл.', 'Гомель'],
  ['Г17', 'Вилейка', 'Минская обл.', 'Вилейка'],
  ['Г18', 'Витебск', 'Витебская обл.', 'Витебск'],
  ['Г19', 'Волковыск', 'Гродненская обл.', 'Волковыск'],
  ['Г20', 'Воложин', 'Минская обл.', 'Воложин'],
  ['Г21', 'Ганцевичи', 'Брестская обл.', 'Ганцевичи'],
  ['Г22', 'Глубокое', 'Витебская обл.', 'Докшицы'],
  ['Г23', 'Глуск', 'Могилевская обл.', 'Бобруйск'],
  ['Г24', 'Гомель', 'Гомельская обл.', 'Гомель'],
  ['Г25', 'Горки', 'Могилевская обл.', 'Горки'],
  ['Г26', 'Городок', 'Витебская обл.', 'Езерище'],
  ['Г27', 'Гродно', 'Гродненская обл.', 'Гродно'],
  ['Г28', 'Дзержинск', 'Минская обл.', 'Минск'],
  ['Г29', 'Добруш', 'Гомельская обл.', 'Гомель'],
  ['Г30', 'Докшицы', 'Витебская обл.', 'Докшицы'],
  ['Г31', 'Дрогичин', 'Брестская обл.', 'Пинск'],
  ['Г32', 'Дубровно', 'Витебская обл.', 'Орша'],
  ['Г33', 'Дятлово', 'Гродненская обл.', 'Новогрудок'],
  ['Г34', 'Ельск', 'Гомельская обл.', 'Мозырь'],
  ['Г35', 'Жабинка', 'Брестская обл.', 'Брест'],
  ['Г36', 'Житковичи', 'Гомельская обл.', 'Житковичи'],
  ['Г37', 'Жлобин', 'Гомельская обл.', 'Жлобин'],
  ['Г38', 'Жодино', 'Минская обл.', 'Борисов'],
  ['Г39', 'Заславль', 'Минская обл.', 'Минск'],
  ['Г40', 'Зельва', 'Гродненская обл.', 'Волковыск'],
  ['Г41', 'Иваново', 'Брестская обл.', 'Пинск'],
  ['Г42', 'Ивацевичи', 'Брестская обл.', 'Ивацевичи'],
  ['Г43', 'Ивье', 'Гродненская обл.', 'Лида'],
  ['Г44', 'Калинковичи', 'Гомельская обл.', 'Мозырь'],
  ['Г45', 'Каменец', 'Брестская обл.', 'Высокое'],
  ['Г46', 'Кировск', 'Могилевская обл.', 'Бобруйск'],
  ['Г47', 'Клецк', 'Минская обл.', 'Слуцк'],
  ['Г48', 'Климовичи', 'Могилевская обл.', 'Костюковичи'],
  ['Г49', 'Кличев', 'Могилевская обл.', 'Кличев'],
  ['Г50', 'Кобрин', 'Брестская обл.', 'Брест'],
  ['Г51', 'Копыль', 'Минская обл.', 'Слуцк'],
  ['Г52', 'Кореличи', 'Гродненская обл.', 'Новогрудок'],
  ['Г53', 'Корма', 'Гомельская обл.', 'Жлобин'],
  ['Г54', 'Костюковичи', 'Могилевская обл.', 'Костюковичи'],
  ['Г55', 'Краснополье', 'Могилевская обл.', 'Костюковичи'],
  ['Г56', 'Кричев', 'Могилевская обл.', 'Горки'],
  ['Г57', 'Крупки', 'Минская обл.', 'Борисов'],
  ['Г58', 'Лельчицы', 'Гомельская обл.', 'Житковичи'],
  ['Г59', 'Лепель', 'Витебская обл.', 'Березинский заповедник'],
  ['Г60', 'Лида', 'Гродненская обл.', 'Лида'],
  ['Г61', 'Лиозно', 'Витебская обл.', 'Витебск'],
  ['Г62', 'Логойск', 'Минская обл.', 'Минск'],
  ['Г63', 'Лоев', 'Гомельская обл.', 'Брагин'],
  ['Г64', 'Лунинец', 'Брестская обл.', 'Полесская'],
  ['Г65', 'Любань', 'Минская обл.', 'Слуцк'],
  ['Г66', 'Ляховичи', 'Брестская обл.', 'Барановичи'],
  ['Г67', 'Малорита', 'Брестская обл.', 'Брест'],
  ['Г68', 'Марьина Горка', 'Минская обл.', 'Марьина Горка'],
  ['Г69', 'Минск', 'Минская обл.', 'Минск'],
  ['Г70', 'Миоры', 'Витебская обл.', 'Шарковщина'],
  ['Г71', 'Могилев', 'Могилевская обл.', 'Могилев'],
  ['Г72', 'Мозырь', 'Гомельская обл.', 'Мозырь'],
  ['Г73', 'Молодечно', 'Минская обл.', 'Вилейка'],
  ['Г74', 'Мосты', 'Гродненская обл.', 'Гродно'],
  ['Г75', 'Мстиславль', 'Могилевская обл.', 'Горки'],
  ['Г76', 'Мядель', 'Минская обл.', 'Вилейка'],
  ['Г77', 'Наровля', 'Гомельская обл.', 'Мозырь'],
  ['Г78', 'Несвиж', 'Минская обл.', 'Столбцы'],
  ['Г79', 'Новогрудок', 'Гродненская обл.', 'Новогрудок'],
  ['Г80', 'Орша', 'Витебская обл.', 'Орша'],
  ['Г81', 'Осиповичи', 'Могилевская обл.', 'Бобруйск'],
  ['Г82', 'Островец', 'Гродненская обл.', 'Ошмяны'],
  ['Г83', 'Ошмяны', 'Гродненская обл.', 'Ошмяны'],
  ['Г84', 'Петриков', 'Гомельская обл.', 'Житковичи'],
  ['Г85', 'Пинск', 'Брестская обл.', 'Пинск'],
  ['Г86', 'Полоцк', 'Витебская обл.', 'Полоцк'],
  ['Г87', 'Поставы', 'Витебская обл.', 'Лынтупы'],
  ['Г88', 'Пружаны', 'Брестская обл.', 'Пружаны'],
  ['Г89', 'Речица', 'Гомельская обл.', 'Василевичи'],
  ['Г90', 'Рогачев', 'Гомельская обл.', 'Жлобин'],
  ['Г91', 'Россоны', 'Витебская обл.', 'Полоцк'],
  ['Г92', 'Светлогорск', 'Гомельская обл.', 'Жлобин'],
  ['Г93', 'Свислочь', 'Гродненская обл.', 'Волковыск'],
  ['Г94', 'Скидель', 'Гродненская обл.', 'Гродно'],
  ['Г95', 'Славгород', 'Могилевская обл.', 'Славгород'],
  ['Г96', 'Слоним', 'Гродненская обл.', 'Барановичи'],
  ['Г97', 'Слуцк', 'Минская обл.', 'Слуцк'],
  ['Г98', 'Смолевичи', 'Минская обл.', 'Минск'],
  ['Г99', 'Сморгонь', 'Гродненская обл.', 'Ошмяны'],
  ['Г100', 'Солигорск', 'Минская обл.', 'Слуцк'],
  ['Г101', 'Старые Дороги', 'Минская обл.', 'Слуцк'],
  ['Г102', 'Столбцы', 'Минская обл.', 'Столбцы'],
  ['Г103', 'Столин', 'Брестская обл.', 'Пинск'],
  ['Г104', 'Толочин', 'Витебская обл.', 'Орша'],
  ['Г105', 'Узда', 'Минская обл.', 'Столбцы'],
  ['Г106', 'Ушачи', 'Витебская обл.', 'Полоцк'],
  ['Г107', 'Хойники', 'Гомельская обл.', 'Брагин'],
  ['Г108', 'Хотимск', 'Могилевская обл.', 'Костюковичи'],
  ['Г109', 'Чаусы', 'Могилевская обл.', 'Могилев'],
  ['Г110', 'Чашники', 'Витебская обл.', 'Сенно'],
  ['Г111', 'Червень', 'Минская обл.', 'Березино'],
  ['Г112', 'Чериков', 'Могилевская обл.', 'Славгород'],
  ['Г113', 'Чечерск', 'Гомельская обл.', 'Жлобин'],
  ['Г114', 'Шарковщина', 'Витебская обл.', 'Шарковщина'],
  ['Г115', 'Шклов', 'Могилевская обл.', 'Могилев'],
  ['Г116', 'Шумилино', 'Витебская обл.', 'Витебск'],
  ['Г117', 'Щучин', 'Гродненская обл.', 'Гродно'],
  // Дополнительные города, районные центры и опорные метеостанции РБ (СП 2.04.04-2026)
  ['Г118', 'Новополоцк', 'Витебская обл.', 'Полоцк'],
  ['Г119', 'Сенно', 'Витебская обл.', 'Сенно'],
  ['Г120', 'Вороново', 'Гродненская обл.', 'Лида'],
  ['Г121', 'Дрибин', 'Могилевская обл.', 'Горки'],
  ['Г122', 'Круглое', 'Могилевская обл.', 'Могилев'],
  ['Г123', 'Октябрьский', 'Гомельская обл.', 'Октябрь'],
  ['Г124', 'Новолукомль', 'Витебская обл.', 'Сенно'],
  ['Г125', 'Фаниполь', 'Минская обл.', 'Минск'],
  ['Г126', 'Белоозерск', 'Брестская обл.', 'Ивацевичи'],
  ['Г127', 'Микашевичи', 'Брестская обл.', 'Житковичи'],
  ['Г128', 'Лынтупы', 'Витебская обл.', 'Лынтупы'],
  ['Г129', 'Езерище', 'Витебская обл.', 'Езерище'],
];

export const CITIES_DATA: Record<string, ClimateCity> = Object.fromEntries(
  CITY_DEFS.map(([id, name, region, station]) => [id, makeCity(id, name, region, station)])
);

/**
 * Получение климатических параметров по коду города (Г1..Г129) или названию
 */
export function getCityClimate(cityCode: string): ClimateCity {
  const normalized = cityCode.toUpperCase().trim();
  if (CITIES_DATA[normalized]) {
    return CITIES_DATA[normalized];
  }
  for (const c of Object.values(CITIES_DATA)) {
    if (c.name.toLowerCase() === cityCode.toLowerCase().trim()) {
      return c;
    }
  }
  return CITIES_DATA['Г27'];
}

export const CITIES_LIST = Object.values(CITIES_DATA);
