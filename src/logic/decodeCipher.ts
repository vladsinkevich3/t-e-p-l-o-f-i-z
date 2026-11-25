/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Парсер и расшифровщик шифра курсового задания по строительной теплофизике
 */

import { CITIES_DATA } from '../data/climate';
import { BuildingTypeId, BUILDING_TYPES } from '../data/buildingTypes';

export interface CustomLayerOverride {
  id?: string;
  name: string;
  materialName?: string;
  thickness: number; // м
  lambda: number; // Вт/(м·°C)
  s: number; // Вт/(м²·°C)
  mu: number; // мг/(м·ч·Па)
  isInsulation?: boolean;
}

export interface HollowCoreSlabOverride {
  height?: number; // мм (220, 260)
  voidDiameter?: number; // мм (140, 159)
  concreteLambda?: number; // Вт/(м·°С), по умолчанию 2.04
  R_zvp?: number; // сопротивление замкнутой воздушной полости, по умолчанию 0.15
  R_parallel?: number; // м²·°С/Вт
  R_perpendicular?: number; // м²·°С/Вт
  R_slab_override?: number; // м²·°С/Вт
}

export interface CrawlSpacePipesOverride {
  pipe1_temp?: number;
  pipe1_dy?: number;
  pipe1_length?: number;
  pipe2_temp?: number;
  pipe2_dy?: number;
  pipe2_length?: number;
  pipe3_temp?: number;
  pipe3_dy?: number;
  pipe3_length?: number;
  crawlSpaceTempOverride?: number;
  crawlSpaceRHOverride?: number;
}

export interface WindowOverride {
  R_glazing?: number;
  R_profile?: number;
  windowWidth?: number;
  windowHeight?: number;
  airPermeabilityClass?: string;
}

export interface VaporBarrierConfig {
  materialId: string; // ID из VAPOR_BARRIER_MATERIALS ('none' | 'pe_film_1' | ...)
  thicknessMm?: number; // Толщина в мм (если не задана — базовая для материала)
}

export interface CalculationOverrides {
  // Толщины утеплителей (м)
  wallInsulationThickness?: number;
  roofInsulationThickness?: number;
  basementInsulationThickness?: number;

  // Теплопроводности утеплителей (Вт/м·°C)
  wallInsulationConductivity?: number;
  roofInsulationConductivity?: number;
  basementInsulationConductivity?: number;

  // Выбираемая пароизоляция (материал + толщина, мм) для стены и покрытия/перекрытия
  wallVaporBarrier?: VaporBarrierConfig;
  roofVaporBarrier?: VaporBarrierConfig;

  // Тип местности для ветрового коэффициента k_i (Приложение М: 'A' | 'B' | 'C')
  windowTerrainType?: 'A' | 'B' | 'C';

  // Кастомные слои конструкций (позволяет редактировать любой слой, толщину, лямбда)
  wallCustomLayers?: CustomLayerOverride[];
  roofCustomLayers?: CustomLayerOverride[];
  basementCustomLayers?: CustomLayerOverride[];

  // Параметры многопустотной плиты
  hollowCoreSlab?: HollowCoreSlabOverride;

  // Режим расчетного сечения покрытия: 'worst' (по сплошному ребру) | 'void' (по пустоте) | 'average'
  roofCrossSectionMode?: 'worst' | 'void' | 'average';

  // Климатические параметры (СП 2.04.04-2026)
  t_coldest_5days_092?: number; // tх.5 (0.92), °C
  t_coldest_5days_098?: number; // tх.5 (0.98), °C
  t_coldest_day_098?: number; // tх.с (0.98), °C
  t_coldest_day_092?: number; // tх.с (0.92), °C
  t_heating_period?: number; // tн.от, °C
  duration_heating_period?: number; // zот, сут
  wind_speed_winter?: number; // vср, м/с
  rh_heating_period?: number; // φн.от, %
  barometric_pressure_winter?: number; // гПа

  // Тип здания и условия эксплуатации (СП 2.04.01-2020)
  buildingTypeId?: BuildingTypeId;
  operatingConditionMode?: 'auto' | 'A' | 'B';
  operatingConditionOverride?: 'A' | 'B';

  // Внутренний микроклимат (СП 2.04.01-2020)
  t_indoor?: number; // tв, °C
  phi_indoor?: number; // φв, %

  // Нормативные коэффициенты и сопротивления
  n_wall?: number;
  n_roof?: number;
  n_basement?: number;
  alpha_v?: number;
  alpha_v_wall?: number;
  alpha_v_roof?: number;
  alpha_v_basement?: number;
  alpha_n?: number;
  alpha_n_ext?: number;
  alpha_n_basement?: number;
  R_norm_wall?: number;
  R_norm_roof?: number;
  R_norm_basement?: number;
  R_norm_window?: number;
  heatingSystemM?: number; // коэффициент неравномерности теплоотдачи системы отопления m (табл. 7.1 СП 2.04.01, по умолч. 0.1)
  delta_t_norm_wall?: number;
  delta_t_norm_roof?: number;
  delta_t_norm_basement?: number;

  // Режим выбора расчетной зимней температуры tн (табл. 6.3 СП 2.04.01-2020)
  designTemperatureMode?:
    | 'auto'
    | 't_coldest_5days'
    | 't_coldest_3days'
    | 't_coldest_day_092'
    | 't_coldest_day_098'
    | 'custom';
  customDesignTemp?: number;

  // Трубы и техподполье
  crawlSpacePipes?: CrawlSpacePipesOverride;

  // Окна
  windowOverride?: WindowOverride;
}

export interface DecodedCipher {
  rawCipher: string;
  buildingType: string; // 'Жилое', 'Общественное', 'Детский сад', 'Больница', 'Производственное'
  buildingTypeId?: BuildingTypeId; // 'residential' | 'public' | 'kindergarten' | 'hospital' | 'industrial'
  cityCode: string; // 'Г27'
  floorsCount: number; // 12
  wallCode: string; // 'С11'
  roofCode: string; // 'П3'
  basementCode: string; // 'ПТП10'
  insulationCode: string; // 'У11'
  windowCode: string; // 'О5'
  gradebookLastDigit: number; // N (0..9)
  studentName?: string;
  groupName?: string;
  reviewerName?: string;
  academicYear?: string;
  overrides?: CalculationOverrides;
}

export const SHIBEKO_LEGACY_GRODNO: CalculationOverrides = {
  t_coldest_5days_092: -22,
  t_coldest_day_098: -31,
  wind_speed_winter: 5.7,
  t_heating_period: 0.1,
  duration_heating_period: 194,
  rh_heating_period: 85,
  roofCrossSectionMode: 'worst',
};

export const DEFAULT_CIPHER: DecodedCipher = {
  rawCipher: 'Жилое – Г27 – 12 – С11 – П3 – ПТП10 – У11 – О5',
  buildingType: 'Жилое',
  buildingTypeId: 'residential',
  cityCode: 'Г27',
  floorsCount: 12,
  wallCode: 'С11',
  roofCode: 'П3',
  basementCode: 'ПТП10',
  insulationCode: 'У11',
  windowCode: 'О5',
  gradebookLastDigit: 6,
  studentName: 'Заневский М. А.',
  groupName: '110041-21',
  academicYear: '2025/2026',
  overrides: {
    ...SHIBEKO_LEGACY_GRODNO,
  },
};

export const PDF_REFERENCE_CIPHER: DecodedCipher = {
  rawCipher: 'Административное – Г15 – 9 – С13 – П9 – ПТП2 – У40 – О18',
  buildingType: 'Административное',
  buildingTypeId: 'administrative',
  cityCode: 'Г15',
  floorsCount: 9,
  wallCode: 'С13',
  roofCode: 'П9',
  basementCode: 'ПТП2',
  insulationCode: 'У40',
  windowCode: 'О18',
  gradebookLastDigit: 4,
  studentName: 'Синькевич В. А.',
  groupName: '11004224',
  academicYear: '2025/2026',
  overrides: {
    roofCrossSectionMode: 'void',
  },
};

// Нормализованный словарь названий всех 117 городов в шифры Г1..Г117
const CITY_NAME_TO_CODE: Record<string, string> = {};
for (const [code, data] of Object.entries(CITIES_DATA)) {
  const normName = data.name.toLowerCase().replace(/[\s\-]/g, '');
  CITY_NAME_TO_CODE[normName] = code;
}

/**
 * Разбор произвольной строки шифра задания
 */
export function parseTaskCipher(text: string): Partial<DecodedCipher> {
  const result: Partial<DecodedCipher> = {
    rawCipher: text.trim(),
  };

  const clean = text.replace(/[\n\r]/g, ' ').trim();
  // Поиск типа здания
  const upperClean = clean.toUpperCase();
  if (upperClean.includes('ДЕТСК') || upperClean.includes('САД') || upperClean.includes('ЯСЛИ') || upperClean.startsWith('Д ')) {
    result.buildingType = 'Детский сад';
    result.buildingTypeId = 'kindergarten';
  } else if (upperClean.includes('ШКОЛ') || upperClean.includes('ПОЛИКЛИНИК') || upperClean.includes('ДИСПАНСЕР')) {
    result.buildingType = 'Школа / Поликлиника';
    result.buildingTypeId = 'school';
  } else if (upperClean.includes('БОЛЬНИЦ') || upperClean.includes('СТАЦИОНАР') || upperClean.includes('ЛЕЧЕБН') || upperClean.startsWith('Б ')) {
    result.buildingType = 'Больница';
    result.buildingTypeId = 'hospital';
  } else if (upperClean.includes('ВЛАЖН') || upperClean.includes('МОКР') || upperClean.includes('БАССЕЙН') || upperClean.includes('БАНЯ')) {
    result.buildingType = 'Влажное / Бассейн';
    result.buildingTypeId = 'wet_industrial';
  } else if (upperClean.includes('СКЛАД') || upperClean.includes('СЕЛЬХОЗ') || upperClean.includes('С-Х')) {
    result.buildingType = 'Складское / С-х';
    result.buildingTypeId = 'warehouse';
  } else if (upperClean.includes('ПРОИЗВОДСТВ') || upperClean.includes('ЦЕХ') || upperClean.includes('ПРОМЫШЛ') || upperClean.startsWith('П ')) {
    result.buildingType = 'Производственное';
    result.buildingTypeId = 'industrial';
  } else if (upperClean.includes('АДМ') || upperClean.includes('ОФИС') || upperClean.startsWith('А ')) {
    result.buildingType = 'Административное';
    result.buildingTypeId = 'administrative';
  } else if (upperClean.includes('ОБЩ') || upperClean.includes('УЧЕБН') || upperClean.includes('БНТУ') || upperClean.startsWith('О ')) {
    result.buildingType = 'Общественное';
    result.buildingTypeId = 'public';
  } else if (upperClean.includes('ЖИЛ') || upperClean.includes(' Ж ') || upperClean.startsWith('Ж ')) {
    result.buildingType = 'Жилое';
    result.buildingTypeId = 'residential';
  } else {
    // По умолчанию
    result.buildingType = 'Жилое';
    result.buildingTypeId = 'residential';
  }

  // Нормализуем префиксы городов вроде Г-27, Г.27, Г 27 в Г27
  const preNormalized = clean.replace(/([ГG])\s*[\-_.]\s*(\d+)/gi, '$1$2');

  // Поиск названия города прямо в тексте (например "Гродно", "Минск", "Брест", "Лида")
  for (const [normName, code] of Object.entries(CITY_NAME_TO_CODE)) {
    const regex = new RegExp(`\\b${normName}\\b`, 'i');
    if (regex.test(preNormalized.toLowerCase().replace(/[\s\-]/g, '')) || preNormalized.toLowerCase().includes(normName)) {
      result.cityCode = code;
      break;
    }
  }

  // Токенизация для кодов конструкций и параметров
  const tokens = preNormalized.split(/[-–—,;\s]+/).filter(Boolean);

  let possibleFloorCandidate: number | null = null;
  let possibleCityNumCandidate: number | null = null;

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    const upper = token.toUpperCase();

    // Город в формате Г27, Г-27, Г.27, G27
    const cityMatch = upper.match(/^[ГG][\-_\.]?(\d+)$/);
    if (cityMatch) {
      const cNum = parseInt(cityMatch[1], 10);
      if (cNum >= 1 && cNum <= 129) {
        result.cityCode = `Г${cNum}`;
      }
    }

    // Стены: С1 - С30
    const wallMatch = upper.match(/^С(\d+)$/);
    if (wallMatch) {
      result.wallCode = `С${wallMatch[1]}`;
    }

    // Покрытия/Перекрытия: П1 - П30 (но не ПТП)
    const roofMatch = upper.match(/^П(\d+)$/);
    if (roofMatch && !upper.startsWith('ПТП')) {
      result.roofCode = `П${roofMatch[1]}`;
    }

    // Техподполье: ПТП1 - ПТП20
    const basementMatch = upper.match(/^ПТП(\d+)$/);
    if (basementMatch) {
      result.basementCode = `ПТП${basementMatch[1]}`;
    }

    // Утеплитель: У1 - У50
    const insMatch = upper.match(/^У(\d+)$/);
    if (insMatch) {
      result.insulationCode = `У${insMatch[1]}`;
    }

    // Окна: О1 - О44
    const winMatch = upper.match(/^О(\d+)$/);
    if (winMatch) {
      result.windowCode = `О${winMatch[1]}`;
    }

    // Числа (город, этажность)
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      if (idx === 1 && num >= 1 && num <= 129 && !result.cityCode) {
        // Если второе слово в шифре — число 1..129 (например Жилое - 27 - 12)
        possibleCityNumCandidate = num;
      } else if (num >= 1 && num <= 35 && !result.floorsCount) {
        possibleFloorCandidate = num;
      }
    }
  }

  if (!result.cityCode && possibleCityNumCandidate !== null) {
    result.cityCode = `Г${possibleCityNumCandidate}`;
  }
  if (!result.floorsCount && possibleFloorCandidate !== null) {
    result.floorsCount = possibleFloorCandidate;
  }

  return result;
}

/**
 * Сборка строки шифра из параметров
 */
export function formatCipherString(c: DecodedCipher): string {
  return `${c.buildingType} – ${c.cityCode} – ${c.floorsCount} – ${c.wallCode} – ${c.roofCode} – ${c.basementCode} – ${c.insulationCode} – ${c.windowCode}`;
}

