/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Математическое ядро теплофизических расчетов курсовой работы
 * Источники: СП 2.04.01-2020, СН 2.04.02-2020, СП 2.04.04-2026,
 * Шибеко А.С. (2018), эталонный пример "Теплофизика курсач".
 */

import { MATERIALS, MaterialProperties } from '../data/materials';
import { INSULATION_VARIANTS, InsulationDef } from '../data/insulation';
import {
  WALL_CONSTRUCTIONS,
  ROOF_CONSTRUCTIONS,
  BASEMENT_CONSTRUCTIONS,
  WallConstructionDef,
  RoofConstructionDef,
  BasementConstructionDef,
  ConstructionLayer,
} from '../data/constructions';
import { WINDOW_VARIANTS, WindowVariantDef } from '../data/windows';
import { getCityClimate, ClimateCity } from '../data/climate';
import {
  getSaturatedVaporPressure,
  getDewPoint,
  ALPHA_V,
  ALPHA_N,
  DELTA_T_NORM,
  R_NORM,
  HEATING_IRREGULARITY_M,
  getWindPressureHeightCoeff,
  getWindowClassRangeByRv,
  WINDOW_AIR_PERMEABILITY_CLASSES,
  DELTA_C_AERODYNAMIC,
  WindTerrainType,
} from '../data/normative';
import { getVaporBarrierById, calculateVaporBarrierRp } from '../data/vaporBarriers';
import { DecodedCipher, DEFAULT_CIPHER } from './decodeCipher';
import {
  BuildingTypeId,
  BUILDING_TYPES,
  HumidityRegime,
  OperatingCondition,
  determineHumidityRegime,
  getHumidityRegimeName,
  determineOperatingCondition,
} from '../data/buildingTypes';

export interface CalculatedLayer {
  name: string;
  materialName: string;
  thickness: number; // м
  lambda: number; // Вт/(м·°С)
  R: number; // м²·°С/Вт
  s: number; // Вт/(м²·°С)
  D: number; // тепловая инерция слоя
  mu: number; // мг/(м·ч·Па)
  R_p: number; // м²·ч·Па/мг (сопротивление паропроницанию)
  tempInside: number; // °C на внутренней границе слоя
  tempOutside: number; // °C на наружной границе слоя
  E_inside: number; // Па
  E_outside: number; // Па
  e_inside: number; // Па
  e_outside: number; // Па
}

export interface CrossSectionTemperaturePoint {
  index: number;
  planeName: string;
  layerName?: string;
  coord_x_mm: number;
  thickness_mm: number;
  R_layer: number;
  R_cumulative: number;
  temp_winter: number; // tсеч при расчетной tн, °C
  temp_heating: number; // tсеч при tн.от, °C
  E_sat: number; // E(temp_heating), Па
  e_partial: number; // e(x), Па
  delta_margin: number; // E - e, Па (запас до конденсации)
  isInsulationMidpoint?: boolean;
}

export interface RoofSectionProfileData {
  name: string;
  type: 'worst' | 'void';
  description: string;
  R_slab_section: number;
  R_total_section: number;
  thermalInertia_D: number; // тепловая инерция данного сечения
  design_t_out: number; // расчетная зимняя температура tн, °C
  heatAssimilation_Yv: number; // Y_в по Шибеко (5.2)-(5.6), Вт/(м²·°С)
  heatAssimilationCase: 'a' | 'b' | 'v' | 'g';
  tau_v_steady: number; // стационарная τ_в без учета m/Y_в, °C
  tau_v_winter: number; // минимальная τ_в^min по Шибеко (5.1), °C
  tau_v_heating: number;
  delta_t_winter: number;
  crossSectionProfile: CrossSectionTemperaturePoint[];
  moisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
    isMidpoint?: boolean;
    isInsulationMidpoint?: boolean;
  }[];
  condensationRisk: boolean;
}

export interface DesignWinterTempSelection {
  t_n: number;
  ruleLabel: string;
  parameterName: string;
  t_coldest_3days_092: number;
}

/**
 * Выбор расчетной зимней температуры наружного воздуха t_н
 * в зависимости от тепловой инерции ограждения D по Таблице 6.3 СП 2.04.01-2020:
 *   D <= 1.5       -> t_х.с (0.98)
 *   1.5 < D <= 4.0 -> t_х.с (0.92)
 *   4.0 < D <= 7.0 -> t_х.3 (0.92) = 0.5 * (t_х.с(0.92) + t_х.5(0.92))
 *   D > 7.0        -> t_х.5 (0.92)
 */
export function selectDesignWinterTemp(
  D_val: number,
  climate: Pick<
    ClimateCity,
    't_coldest_day_098' | 't_coldest_day_092' | 't_coldest_5days_092'
  >,
  mode?:
    | 'auto'
    | 't_coldest_5days'
    | 't_coldest_3days'
    | 't_coldest_day_092'
    | 't_coldest_day_098'
    | 'custom',
  customDesignTemp?: number
): DesignWinterTempSelection {
  const t_3days = +((climate.t_coldest_day_092 + climate.t_coldest_5days_092) / 2).toFixed(1);

  if (mode === 't_coldest_day_098') {
    return {
      t_n: climate.t_coldest_day_098,
      ruleLabel: 'Ручной выбор: tх.с (0.98)',
      parameterName: 'tх.с (0.98)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (mode === 't_coldest_day_092') {
    return {
      t_n: climate.t_coldest_day_092,
      ruleLabel: 'Ручной выбор: tх.с (0.92)',
      parameterName: 'tх.с (0.92)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (mode === 't_coldest_3days') {
    return {
      t_n: t_3days,
      ruleLabel: 'Ручной выбор: tх.3 (0.92)',
      parameterName: 'tх.3 (0.92)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (mode === 't_coldest_5days') {
    return {
      t_n: climate.t_coldest_5days_092,
      ruleLabel: 'Ручной выбор: tх.5 (0.92)',
      parameterName: 'tх.5 (0.92)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (mode === 'custom' && customDesignTemp !== undefined && !isNaN(customDesignTemp)) {
    return {
      t_n: customDesignTemp,
      ruleLabel: 'Ручной ввод tн',
      parameterName: 'Ручная tн',
      t_coldest_3days_092: t_3days,
    };
  }

  if (D_val <= 1.5) {
    return {
      t_n: climate.t_coldest_day_098,
      ruleLabel: 'D ≤ 1.5 → tх.с (0.98)',
      parameterName: 'tх.с (0.98)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (D_val <= 4.0) {
    return {
      t_n: climate.t_coldest_day_092,
      ruleLabel: '1.5 < D ≤ 4.0 → tх.с (0.92)',
      parameterName: 'tх.с (0.92)',
      t_coldest_3days_092: t_3days,
    };
  }
  if (D_val <= 7.0) {
    return {
      t_n: t_3days,
      ruleLabel: '4.0 < D ≤ 7.0 → tх.3 (0.92)',
      parameterName: 'tх.3 (0.92)',
      t_coldest_3days_092: t_3days,
    };
  }
  return {
    t_n: climate.t_coldest_5days_092,
    ruleLabel: 'D > 7.0 → tх.5 (0.92)',
    parameterName: 'tх.5 (0.92)',
    t_coldest_3days_092: t_3days,
  };
}

export interface AppliedVaporBarrierInfo {
  materialId: string;
  name: string;
  shortName: string;
  thicknessMm: number;
  R_p: number;
  isAuto?: boolean;
}

export interface WallCalculationResult {
  construction: WallConstructionDef;
  insulation: InsulationDef;
  layers: CalculatedLayer[];
  R_without_insulation: number;
  delta_insulation_calc: number; // расчетная толщина, м
  delta_insulation_adopted: number; // принятая толщина, м
  R_total: number; // фактически принятое термическое сопротивление
  R_required: number; // требуемое с учетом n
  R_norm_latest: number; // базовое R_т.норм по СН 2.04.02-2020 табл. 7.1
  thermalInertia_D: number;
  heatAssimilation_Yv: number; // коэффициент теплоусвоения внутренней поверхности Y_в, Вт/(м²·°С)
  heatAssimilationCase: 'a' | 'b' | 'v' | 'g'; // случай расчета по Шибеко (5.2)-(5.6)
  heatingIrregularity_m: number; // коэффициент неравномерности теплоотдачи m (табл. 7.1 СП 2.04.01)
  design_t_out: number; // принятая расчетная температура tн (°C)
  designTempRule: string; // правило выбора tн по табл. 6.3 СП 2.04.01-2020
  delta_t_actual: number; // фактический температурный перепад Δtв (стационарный)
  delta_t_norm: number; // нормативный перепад
  tau_v_steady: number; // стационарная τ_в = t_в - Δt_в, °C
  tau_v_min: number; // минимальная температура внутренней поверхности по Шибеко (5.1), °C
  dew_point: number; // точка росы tр
  condensationRisk: boolean;
  isRCompliant: boolean; // R_т >= R_т.тр (с учетом последних норм СН 2.04.02-2020)
  isCompliant: boolean;
  total_R_p: number; // суммарное сопротивление паропроницанию стены Rп (с учетом 1/37 и 1/77)
  vaporBarrier: AppliedVaporBarrierInfo | null;
  moisturePoints: {
    x: number; // расстояние от внутренней поверхности, м
    name: string;
    temp: number;
    E: number; // упругость насыщения
    e: number; // фактическое парциальное давление
    isMidpoint?: boolean;
    isInsulationMidpoint?: boolean;
  }[];
  crossSectionProfile: CrossSectionTemperaturePoint[];
}

export interface RoofCalculationResult {
  construction: RoofConstructionDef;
  insulation: InsulationDef;
  hollowCore: {
    height: number;
    voidDiameter: number;
    spacing: number;
    a_eq: number; // сторона эквивалентного квадрата пустоты, м
    b_rib: number; // ширина ребра, м
    delta_flange_eq: number; // приведенная толщина полки, м
    R_1_rib: number; // сопротивление по сплошному участку R1
    R_2_void: number; // сопротивление по участку с пустотой R2
    R_parallel: number;
    R_perpendicular: number;
    R_slab: number; // приведенное сопротивление многопустотной плиты
    R_rib_worst: number; // сопротивление по сплошному ребру плиты (худшее сечение)
    R_void_section: number; // сопротивление по пустоте плиты
  };
  layers: CalculatedLayer[];
  delta_insulation_calc: number;
  delta_insulation_adopted: number;
  R_total: number;
  R_required: number;
  R_norm_latest: number;
  thermalInertia_D: number; // расчетная инерция D_покрытия (минимальная, по пустоте s_возд=0)
  thermalInertia_D_void: number; // D в сечении по пустоте
  thermalInertia_D_rib: number; // D в сечении по ребру
  heatAssimilation_Yv: number; // Y_в активного сечения по Шибеко (5.2)-(5.6)
  heatAssimilationCase: 'a' | 'b' | 'v' | 'g';
  heatingIrregularity_m: number;
  design_t_out: number;
  designTempRule: string; // правило выбора tн по табл. 6.3 СП 2.04.01-2020
  total_R_p: number;
  needsVaporBarrier: boolean;
  vaporBarrierAdded: boolean;
  vaporBarrier: AppliedVaporBarrierInfo | null;
  delta_t_actual: number;
  delta_t_norm: number;
  tau_v_steady: number;
  tau_v_min: number; // по Шибеко (5.1)
  dew_point: number;
  isRCompliant: boolean;
  isCompliant: boolean;
  moistureCondensationRisk: boolean;
  worstSection: RoofSectionProfileData;
  voidSection: RoofSectionProfileData;
  activeSectionType: 'worst' | 'void';
  moisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
    isMidpoint?: boolean;
    isInsulationMidpoint?: boolean;
  }[];
  crossSectionProfile: CrossSectionTemperaturePoint[];
}

export interface BasementCalculationResult {
  construction: BasementConstructionDef;
  insulation: InsulationDef;
  layers: CalculatedLayer[];
  delta_insulation_calc: number;
  delta_insulation_adopted: number;
  R_ptp: number;
  R_required: number;
  pipeHeatGains_total: number; // Вт (суммарные тепловыделения от труб)
  pipesDetails: {
    temp: number;
    dy: number;
    length: number;
    q_heat_loss: number; // Вт/м
    q_total: number; // Вт
  }[];
  crawlSpaceTemp_t_p: number; // температура воздуха в подполье, °C
  crawlSpaceRH: number; // влажность в подполье, %
  delta_t_floor: number; // перепад на полу первого этажа
  delta_t_floor_norm: number; // 0.8 °C
  tau_v_floor: number;
  tau_v_basement_wall: number;
  dew_point_basement: number;
  isCondensationOnWall: boolean;
  isRCompliant: boolean;
  isCompliant: boolean;
  moistureCondensationRisk: boolean;
  moisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
    isMidpoint?: boolean;
    isInsulationMidpoint?: boolean;
  }[];
  crossSectionProfile: CrossSectionTemperaturePoint[];
}

export interface WindowZoneRow {
  code: string; // "1'", "1''", ..., "9", "I", "II"
  name: string;
  kind: 'opaque' | 'glazing';
  widthMm: number;
  heightMm: number;
  formulaText: string;
  area_m2: number;
  R_zone: number;
  F_over_R: number;
}

export interface FloorWindowPermeability {
  floor: number;
  H_building: number; // высота здания H, м (рис. 6.4 Шибеко)
  height: number; // высота центра окна h_i, м
  k_i: number; // ветровой коэффициент (Приложение М, интерполяция)
  delta_p_grav: number; // гравитационная составляющая, Па
  delta_p_wind: number; // ветровая составляющая, Па
  delta_p: number; // суммарная разность давлений Δp_i, Па
  G_v_required: number; // нормативная воздухопроницаемость G_норм = 10.0 кг/(м²·ч)
  R_v_required: number; // требуемое сопротивление воздухопроницанию R_в.тр, м²·ч/кг
  R_v_max: number; // верхняя граница 1.2 * R_в.тр, м²·ч/кг
  windowClass: 'А' | 'Б' | 'В' | 'Г' | 'Д';
  windowClassRangeText: string; // точное назначение класса по табл. 6.4 Шибеко
}

export interface WindowCalculationResult {
  windowDef: WindowVariantDef;
  area_total: number; // м²
  area_transparent: number; // м²
  area_opaque: number; // м²
  R_opaque: number;
  R_transparent: number;
  sum_F_over_R: number;
  R_actual: number;
  R_norm: number;
  isCompliant: boolean;
  zones: WindowZoneRow[]; // Таблица 6.2 (Шибеко)
  terrainType: WindTerrainType;
  H_building: number; // H = 3.7 + 3.0 * N
  rho_n: number;
  rho_v: number;
  delta_rho: number;
  v_sr: number;
  delta_c: number; // c_н - c_п = 1.4
  G_norm: number; // 10.0 кг/(м²·ч)
  floors: FloorWindowPermeability[]; // Таблицы 6.3 и 6.4 (Шибеко)
}

export interface NormativeRCheck {
  id: 'wall' | 'roof' | 'basement' | 'window';
  tabId: 'wall' | 'roof' | 'basement' | 'windows';
  title: string;
  constructionCode: string;
  R_actual: number;
  R_required: number;
  R_norm_base: number; // базовое R_т.норм по СН 2.04.02-2020 табл. 7.1
  deficit: number; // max(0, R_required - R_actual), м²·°С/Вт
  isRCompliant: boolean;
  isSurfaceTempCompliant: boolean;
  isFullyCompliant: boolean;
  normReference: string;
  warningMessage: string | null;
  recommendation: string | null;
}

export interface FullCourseworkCalculation {
  cipher: DecodedCipher;
  climate: ClimateCity;
  internalConditions: {
    t_v: number;
    phi_v: number;
    e_v: number;
    E_v: number;
    dew_point: number;
    zone: string;
    humidityRegime: HumidityRegime;
    humidityRegimeName: string;
    exploitationConditions: 'А' | 'Б';
    operatingConditionMode: 'auto' | 'A' | 'B';
    buildingTypeId: BuildingTypeId;
    buildingTypeName: string;
  };
  wall: WallCalculationResult;
  roof: RoofCalculationResult;
  basement: BasementCalculationResult;
  window: WindowCalculationResult;
  normativeChecks: NormativeRCheck[];
  normativeWarnings: NormativeRCheck[];
  summary: {
    totalCompliance: boolean;
    gradePoints: number;
  };
}

// -------------------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ПО МЕТОДИКЕ А. С. ШИБЕКО (2018, разд. 5)
// И СП 2.04.01-2020 (п. 7.5, п. 7.9, формулы 5.1–5.6 / 7.9)
// -------------------------------------------------------------

/**
 * Расчет коэффициента теплоусвоения внутренней поверхности многослойного ограждения Y_в, Вт/(м²·°С)
 * по формулам (5.2)–(5.6) пособия А. С. Шибеко (2018, стр. 40–41) и п. 7.5 СП 2.04.01-2020.
 * Слои должны передаваться строго от ВНУТРЕННЕЙ поверхности к НАРУЖНОЙ.
 */
export function calculateSurfaceHeatAssimilation(
  layers: { R_exact: number; s: number; D_exact: number }[],
  alpha_n: number = ALPHA_N.exterior
): { Y_v: number; caseUsed: 'a' | 'b' | 'v' | 'g'; nLayers: number } {
  const activeLayers = layers.filter((l) => l.R_exact > 0);
  if (activeLayers.length === 0) {
    return { Y_v: +alpha_n.toFixed(2), caseUsed: 'g', nLayers: 0 };
  }

  let cumD = 0;
  let cutIndex = -1;
  for (let i = 0; i < activeLayers.length; i++) {
    cumD += activeLayers[i].D_exact;
    if (cumD >= 1.0) {
      cutIndex = i;
      break;
    }
  }

  // Случай а): D_1 >= 1 -> Y_в = s_1 (ф. 5.2)
  if (cutIndex === 0) {
    return {
      Y_v: +activeLayers[0].s.toFixed(2),
      caseUsed: 'a',
      nLayers: 1,
    };
  }

  // Случаи б) и в): D_1 + ... + D_n >= 1 (ф. 5.3–5.5)
  if (cutIndex > 0) {
    let Y = activeLayers[cutIndex].s;
    for (let j = cutIndex - 1; j >= 0; j--) {
      const { R_exact, s } = activeLayers[j];
      Y = (R_exact * s * s + Y) / (1 + R_exact * Y);
    }
    return {
      Y_v: +Y.toFixed(2),
      caseUsed: cutIndex === 1 ? 'b' : 'v',
      nLayers: cutIndex + 1,
    };
  }

  // Случай г): суммарная тепловая инерция D < 1 (ф. 5.6 и обратная рекурсия 5.5)
  let Y = alpha_n;
  for (let j = activeLayers.length - 1; j >= 0; j--) {
    const { R_exact, s } = activeLayers[j];
    Y = (R_exact * s * s + Y) / (1 + R_exact * Y);
  }
  return {
    Y_v: +Y.toFixed(2),
    caseUsed: 'g',
    nLayers: activeLayers.length,
  };
}

/**
 * Расчет температуры внутренней поверхности ограждающей конструкции τ_в, °C.
 * При стационарной теплопередаче (без коэффициента неравномерности отопления m = 0):
 *   τ_в = t_в - (t_в - t_н) / (R_0 · α_в)
 * При явном задании m > 0 учитывает слагаемое m / Y_в по формуле (5.1) А. С. Шибеко.
 */
export function calculateShibekoMinSurfaceTemp(
  t_v: number,
  t_n: number,
  R_0_exact: number,
  alpha_v: number,
  Y_v: number,
  m: number = 0
): { tau_v_min: number; tau_v_steady: number; delta_t_steady: number; delta_t_shibeko: number } {
  const safeR = Math.max(0.01, R_0_exact);
  const safeYv = Math.max(0.1, Y_v);
  const dtSteadyExact = (t_v - t_n) / (safeR * alpha_v);
  const dtShibekoExact = m > 0 ? ((1 / alpha_v + m / safeYv) * (t_v - t_n)) / safeR : dtSteadyExact;
  return {
    delta_t_steady: +dtSteadyExact.toFixed(2),
    delta_t_shibeko: +dtShibekoExact.toFixed(2),
    tau_v_steady: +(t_v - dtSteadyExact).toFixed(2),
    tau_v_min: +(t_v - dtShibekoExact).toFixed(2),
  };
}

// -------------------------------------------------------------
// РАСЧЕТ ТЕПЛОФИЗИКИ КУРСОВОЙ РАБОТЫ
// -------------------------------------------------------------

export function calculateCoursework(inputCipher: DecodedCipher | Partial<DecodedCipher>): FullCourseworkCalculation {
  const cipher: DecodedCipher = {
    ...DEFAULT_CIPHER,
    ...inputCipher,
    rawCipher: inputCipher.rawCipher || DEFAULT_CIPHER.rawCipher,
  };
  const baseClimate = getCityClimate(cipher.cityCode || 'Г27');
  const ov = cipher.overrides || {};

  // Определение нормативного типа здания
  const bTypeLower = cipher.buildingType?.toLowerCase() || '';
  const bTypeKey: BuildingTypeId =
    ov.buildingTypeId ||
    cipher.buildingTypeId ||
    (bTypeLower.includes('детск') || bTypeLower.includes('сад') || bTypeLower.includes('ясли')
      ? 'kindergarten'
      : bTypeLower.includes('школ') || bTypeLower.includes('поликлиник') || bTypeLower.includes('диспансер')
      ? 'school'
      : bTypeLower.includes('больниц') || bTypeLower.includes('стационар') || bTypeLower.includes('лечебн')
      ? 'hospital'
      : bTypeLower.includes('влажн') || bTypeLower.includes('мокр') || bTypeLower.includes('бассейн') || bTypeLower.includes('баня')
      ? 'wet_industrial'
      : bTypeLower.includes('склад') || bTypeLower.includes('сельхоз') || bTypeLower.includes('с-х')
      ? 'warehouse'
      : bTypeLower.includes('производств') || bTypeLower.includes('цех')
      ? 'industrial'
      : bTypeLower.includes('адм') || bTypeLower.includes('офис')
      ? 'administrative'
      : bTypeLower.includes('общественн') || bTypeLower.includes('учебн')
      ? 'public'
      : 'residential');
  const bTypeDef = BUILDING_TYPES[bTypeKey] || BUILDING_TYPES.residential;

  // Эффективные климатические параметры (с поддержкой переопределения по СП 2.04.04-2026 или Шибеко)
  const climate: ClimateCity = {
    ...baseClimate,
    t_coldest_5days_092: ov.t_coldest_5days_092 ?? baseClimate.t_coldest_5days_092,
    t_coldest_day_098: ov.t_coldest_day_098 ?? baseClimate.t_coldest_day_098,
    t_coldest_day_092: ov.t_coldest_day_092 ?? baseClimate.t_coldest_day_092,
    wind_speed_winter: ov.wind_speed_winter ?? baseClimate.wind_speed_winter,
    t_heating_period: ov.t_heating_period ?? baseClimate.t_heating_period,
    duration_heating_period: ov.duration_heating_period ?? baseClimate.duration_heating_period,
    rh_heating_period: ov.rh_heating_period ?? baseClimate.rh_heating_period,
  };

  // 1. Внутренние параметры (СП 2.04.01-2020)
  const t_v = ov.t_indoor ?? bTypeDef.default_t_v;
  const phi_v = ov.phi_indoor ?? bTypeDef.default_phi_v;
  const E_v = getSaturatedVaporPressure(t_v);
  const e_v_exact = (phi_v / 100) * E_v;
  const e_v = +e_v_exact.toFixed(2);
  const dew_point_internal = getDewPoint(e_v_exact);

  // Определение влажностного режима помещения по таблице 5.1 СП 2.04.01-2020
  const humidityRegime = determineHumidityRegime(t_v, phi_v);

  // Определение условий эксплуатации по таблице 5.2 СП 2.04.01-2020 (Беларусь - зона 2 / нормальная)
  const autoCondition = determineOperatingCondition(humidityRegime, 'normal');
  const opMode: 'auto' | 'A' | 'B' = ov.operatingConditionMode || 'auto';
  const expCond: 'А' | 'Б' = 
    opMode === 'A' 
      ? 'А' 
      : opMode === 'B' 
        ? 'Б' 
        : ov.operatingConditionOverride === 'A'
          ? 'А'
          : ov.operatingConditionOverride === 'B'
            ? 'Б'
            : (autoCondition === 'A' ? 'А' : 'Б');

  // Коэффициенты теплоотдачи
  const alpha_v_wall = ov.alpha_v ?? bTypeDef.alpha_v;
  const alpha_v_roof = ov.alpha_v ?? bTypeDef.alpha_v;
  const alpha_n_ext = ov.alpha_n ?? ALPHA_N.exterior;

  // Утеплитель с учетом условий эксплуатации А/Б
  const insDef = INSULATION_VARIANTS[cipher.insulationCode] || INSULATION_VARIANTS['У11'];
  const insLambda = ov.wallInsulationConductivity ?? (expCond === 'А' ? insDef.lambda_A : insDef.lambda_B);
  const insS = expCond === 'А' ? insDef.s_A : insDef.s_B;

  // Вспомогательная функция получения теплопроводности λ и паропроницаемости μ
  const getMaterialData = (matId?: string, isInsulation?: boolean) => {
    if (isInsulation || matId === 'insulation') {
      return {
        name: insDef.name,
        lambda: insLambda,
        s: insS,
        mu: insDef.mu,
      };
    }
    if (matId && MATERIALS[matId]) {
      const mat = MATERIALS[matId];
      return {
        name: mat.name,
        lambda: expCond === 'А' ? mat.lambda_A : mat.lambda_B,
        s: expCond === 'А' ? mat.s_A : mat.s_B,
        mu: mat.mu,
      };
    }
    return {
      name: 'Материал слоя',
      lambda: 0.81,
      s: 9.9,
      mu: 0.11,
    };
  };

  // -------------------------------------------------------------
  // 2. РАСЧЕТ НАРУЖНОЙ СТЕНЫ
  // -------------------------------------------------------------
  const wallDef = WALL_CONSTRUCTIONS[cipher.wallCode] || WALL_CONSTRUCTIONS['С11'];

  // Исходные слои стены: либо кастомные от пользователя, либо стандартные из справочника
  const wallLayersConfig = (ov.wallCustomLayers && ov.wallCustomLayers.length > 0)
    ? ov.wallCustomLayers.map((cl, i) => ({
        name: cl.name,
        thickness: cl.thickness,
        isInsulation: Boolean(cl.isInsulation || cl.name.toLowerCase().includes('утепл')),
        materialId: cl.isInsulation ? 'insulation' : `custom_${i}`,
        customLambda: cl.lambda,
        customS: cl.s,
        customMu: cl.mu,
      }))
    : wallDef.layers.map((l) => ({
        ...l,
        customLambda: undefined as number | undefined,
        customS: undefined as number | undefined,
        customMu: undefined as number | undefined,
      }));

  // Вычисляем сопротивление без утеплителя
  let R_without_ins = 1 / alpha_v_wall + 1 / alpha_n_ext;
  for (const l of wallLayersConfig) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const lambda = l.customLambda ?? getMaterialData(l.materialId).lambda;
      R_without_ins += l.thickness / lambda;
    }
  }

  // Требуемое сопротивление с учетом повышающего коэффициента n
  const n_wall = ov.n_wall ?? wallDef.increasingFactor_n;
  const R_norm_wall = ov.R_norm_wall ?? bTypeDef.R_norm_wall;
  const R_wall_req = +(R_norm_wall * n_wall).toFixed(2);

  // Требуемая толщина утеплителя
  const delta_wall_ins_calc = (R_wall_req - R_without_ins) * insLambda;
  // Округляем до 1 см вверх (кратно 0.01 м) либо берем переопределение
  const delta_wall_ins_adopted = ov.wallInsulationThickness !== undefined
    ? ov.wallInsulationThickness
    : +(Math.ceil(delta_wall_ins_calc * 100) / 100).toFixed(2);

  // Фактическое термическое сопротивление (точное и округленное)
  // Учет выбираемого слоя пароизоляции для наружной стены (укладывается перед утеплителем с теплой стороны)
  let wallVaporBarrierInfo: AppliedVaporBarrierInfo | null = null;
  let wallVbLayer: CalculatedLayer | null = null;
  let wallVbRExact = 0;
  let wallVbRpExact = 0;
  if (ov.wallVaporBarrier && ov.wallVaporBarrier.materialId && ov.wallVaporBarrier.materialId !== 'none') {
    const vbMat = getVaporBarrierById(ov.wallVaporBarrier.materialId);
    const thkMm =
      ov.wallVaporBarrier.thicknessMm !== undefined && ov.wallVaporBarrier.thicknessMm > 0
        ? ov.wallVaporBarrier.thicknessMm
        : vbMat.defaultThicknessMm;
    const rpVal = calculateVaporBarrierRp(vbMat.id, thkMm);
    if (rpVal > 0 && thkMm > 0) {
      const thkM = thkMm / 1000;
      wallVbRExact = thkM / vbMat.lambda;
      wallVbRpExact = rpVal;
      const rVb = +wallVbRExact.toFixed(4);
      const dVb = +(wallVbRExact * vbMat.s).toFixed(3);
      wallVbLayer = {
        name: `Пароизоляция (${vbMat.shortName}, δ=${thkMm} мм)`,
        materialName: vbMat.name,
        thickness: thkM,
        lambda: vbMat.lambda,
        R: rVb,
        s: vbMat.s,
        D: dVb,
        mu: +(thkM / rpVal).toFixed(7),
        R_p: rpVal,
        tempInside: 0,
        tempOutside: 0,
        E_inside: 0,
        E_outside: 0,
        e_inside: 0,
        e_outside: 0,
      };
      wallVaporBarrierInfo = {
        materialId: vbMat.id,
        name: vbMat.name,
        shortName: vbMat.shortName,
        thicknessMm: thkMm,
        R_p: rpVal,
        isAuto: false,
      };
    }
  }

  const R_wall_total_exact =
    R_without_ins + delta_wall_ins_adopted / insLambda + wallVbRExact;
  const R_wall_total = +R_wall_total_exact.toFixed(2);

  // Расчет слоев для тепловой инерции D (храним также точные некругленные R_exact, D_exact, Rp_exact)
  let D_wall_exact = 0;
  const wallLayersCalculated: CalculatedLayer[] = [];
  const wallLayersExactMeta: { R_exact: number; s: number; D_exact: number; Rp_exact: number }[] = [];
  let wallVbInserted = false;

  for (const l of wallLayersConfig) {
    const isIns = l.isInsulation || l.materialId === 'insulation';
    if (isIns && wallVbLayer && !wallVbInserted) {
      const dVbExact = wallVbRExact * wallVbLayer.s;
      D_wall_exact += dVbExact;
      wallLayersCalculated.push(wallVbLayer);
      wallLayersExactMeta.push({
        R_exact: wallVbRExact,
        s: wallVbLayer.s,
        D_exact: dVbExact,
        Rp_exact: wallVbRpExact,
      });
      wallVbInserted = true;
    }

    const d = isIns ? delta_wall_ins_adopted : l.thickness;
    const baseMat = getMaterialData(l.materialId, isIns);
    const lambda = l.customLambda ?? baseMat.lambda;
    const s = l.customS ?? baseMat.s;
    const mu = l.customMu ?? baseMat.mu;

    const R_exact = d / lambda;
    const D_exact = R_exact * s;
    const Rp_exact = mu > 0 ? d / mu : 0;

    const R_layer = +R_exact.toFixed(4);
    const D_layer = +D_exact.toFixed(3);
    const R_p_layer = +Rp_exact.toFixed(4);
    D_wall_exact += D_exact;

    wallLayersCalculated.push({
      name: l.name,
      materialName: isIns ? insDef.name : baseMat.name,
      thickness: d,
      lambda,
      R: R_layer,
      s,
      D: D_layer,
      mu,
      R_p: R_p_layer,
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    });
    wallLayersExactMeta.push({
      R_exact,
      s,
      D_exact,
      Rp_exact,
    });
  }
  if (wallVbLayer && !wallVbInserted) {
    const dVbExact = wallVbRExact * wallVbLayer.s;
    D_wall_exact += dVbExact;
    wallLayersCalculated.push(wallVbLayer);
    wallLayersExactMeta.push({
      R_exact: wallVbRExact,
      s: wallVbLayer.s,
      D_exact: dVbExact,
      Rp_exact: wallVbRpExact,
    });
  }
  const D_wall = +D_wall_exact.toFixed(2);

  // Выбор расчетной зимней температуры tн по тепловой инерции D (табл. 6.3 СП 2.04.01-2020)
  const getDesignOutTempInfo = (D_val: number) =>
    selectDesignWinterTemp(D_val, climate, ov.designTemperatureMode, ov.customDesignTemp);

  const wallDesignTempInfo = getDesignOutTempInfo(D_wall);
  const t_n_design = wallDesignTempInfo.t_n;

  // Расчет температуры внутренней поверхности без коэффициента неравномерности отопления m (m = 0):
  //   τ_в = t_в - (t_в - t_н) / (R_0 · α_в)
  const heatingM = 0;
  const wallYvInfo = calculateSurfaceHeatAssimilation(wallLayersExactMeta, alpha_n_ext);
  const wallTempCalc = calculateShibekoMinSurfaceTemp(
    t_v,
    t_n_design,
    R_wall_total_exact,
    alpha_v_wall,
    wallYvInfo.Y_v,
    heatingM
  );
  const delta_t_wall = wallTempCalc.delta_t_steady;
  const tau_v_wall_steady = wallTempCalc.tau_v_steady;
  const tau_v_wall = wallTempCalc.tau_v_steady;

  // Температуры и парциальные давления по слоям стены (метод К. Ф. Фокина / Шибеко ф. 7.1–7.7)
  // Используем точные некругленные R_exact, Rp_exact, e_v_exact, e_n_exact во избежание накопленной погрешности
  const R_pv = 1 / 37;
  const R_pn = 1 / 77;
  const t_n_moisture = climate.t_heating_period;
  const q_wall_heat = (t_v - t_n_moisture) / R_wall_total_exact;
  const q_wall_winter = (t_v - t_n_design) / R_wall_total_exact;

  const total_R_p_wall_exact = R_pv + wallLayersExactMeta.reduce((sum, m) => sum + m.Rp_exact, 0) + R_pn;
  const total_R_p_wall = +total_R_p_wall_exact.toFixed(2);
  const e_n_exact = (climate.rh_heating_period / 100) * getSaturatedVaporPressure(t_n_moisture);
  const e_n = +e_n_exact.toFixed(2);

  const tau_v_h_exact = t_v - q_wall_heat * (1 / alpha_v_wall);
  let currentTempExact = tau_v_h_exact;
  let currentTemp = +currentTempExact.toFixed(2);
  let current_e = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * R_pv).toFixed(2);
  const wallMoisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
    isMidpoint?: boolean;
  }[] = [
    {
      x: 0,
      name: 'Внутренняя поверхность',
      temp: currentTemp,
      E: getSaturatedVaporPressure(currentTempExact),
      e: current_e,
    },
  ];

  let cumulativeX = 0;
  let cumR_m = 1 / alpha_v_wall;
  let cumRp_m = R_pv;
  wallLayersCalculated.forEach((l, idx) => {
    const meta = wallLayersExactMeta[idx];
    l.tempInside = currentTemp;
    l.e_inside = current_e;
    l.E_inside = getSaturatedVaporPressure(currentTempExact);

    const isIns = Boolean(
      l.name.toLowerCase().includes('утепл') ||
      l.materialName.toLowerCase().includes('утепл') ||
      l.materialName.toLowerCase().includes('вата') ||
      l.materialName.toLowerCase().includes('пенополистирол') ||
      (l.lambda <= 0.08 && l.thickness >= 0.03)
    );

    // Если это утеплитель, вставляем точку в середине утеплителя
    if (isIns) {
      const halfR = meta.R_exact / 2;
      const halfRp = meta.Rp_exact / 2;
      const midTempExact = t_v - q_wall_heat * (cumR_m + halfR);
      const midTemp = +midTempExact.toFixed(2);
      const mid_e = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * (cumRp_m + halfRp)).toFixed(2);
      const mid_E = getSaturatedVaporPressure(midTempExact);
      wallMoisturePoints.push({
        x: +(cumulativeX + l.thickness / 2).toFixed(3),
        name: `Середина утеплителя (${Math.round((l.thickness * 1000) / 2)} мм)`,
        temp: midTemp,
        E: mid_E,
        e: mid_e,
        isMidpoint: true,
      });
    }

    cumR_m += meta.R_exact;
    cumRp_m += meta.Rp_exact;
    currentTempExact = t_v - q_wall_heat * cumR_m;
    currentTemp = +currentTempExact.toFixed(2);
    current_e = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * cumRp_m).toFixed(2);

    l.tempOutside = currentTemp;
    l.e_outside = current_e;
    l.E_outside = getSaturatedVaporPressure(currentTempExact);

    cumulativeX += l.thickness;
    wallMoisturePoints.push({
      x: +cumulativeX.toFixed(3),
      name: `Граница слоя: ${l.name}`,
      temp: currentTemp,
      E: l.E_outside,
      e: l.e_outside,
    });
  });

  const wallCondensation = wallMoisturePoints.some((p) => p.e >= p.E);

  // Таблица температур по расчетному сечению наружной стены (точные некругленные R_exact, без дублирования τ_н)
  const wallCrossSection: CrossSectionTemperaturePoint[] = [];

  // Сечение 0: Внутренний воздух
  wallCrossSection.push({
    index: 0,
    planeName: 'Внутренний воздух tв',
    layerName: 'Воздушная среда помещения',
    coord_x_mm: 0,
    thickness_mm: 0,
    R_layer: 0,
    R_cumulative: 0,
    temp_winter: t_v,
    temp_heating: t_v,
    E_sat: getSaturatedVaporPressure(t_v),
    e_partial: e_v,
    delta_margin: +(getSaturatedVaporPressure(t_v) - e_v).toFixed(1),
  });

  // Сечение 1: Внутренняя поверхность (пограничный слой 1/alpha_v)
  const R_alpha_v_val = +(1 / alpha_v_wall).toFixed(4);
  const tau_v_w = +(t_v - q_wall_winter * (1 / alpha_v_wall)).toFixed(2);
  const tau_v_h = +tau_v_h_exact.toFixed(2);
  const E_tau_v = getSaturatedVaporPressure(tau_v_h_exact);
  const e_tau_v = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * R_pv).toFixed(2);
  wallCrossSection.push({
    index: 1,
    planeName: 'Внутренняя поверхность τв',
    layerName: 'Пограничный слой теплоотдачи (1/αв)',
    coord_x_mm: 0,
    thickness_mm: 0,
    R_layer: R_alpha_v_val,
    R_cumulative: R_alpha_v_val,
    temp_winter: tau_v_w,
    temp_heating: tau_v_h,
    E_sat: E_tau_v,
    e_partial: e_tau_v,
    delta_margin: +(E_tau_v - e_tau_v).toFixed(1),
  });

  let cumWallX = 0;
  let cumWallR = 1 / alpha_v_wall;
  let cumWallRp = R_pv;
  let sectionIndex = 2;

  wallLayersCalculated.forEach((layer, idx) => {
    const meta = wallLayersExactMeta[idx];
    const isLastLayer = idx === wallLayersCalculated.length - 1;
    const isIns = Boolean(
      layer.name.toLowerCase().includes('утепл') ||
      layer.materialName.toLowerCase().includes('утепл') ||
      layer.materialName.toLowerCase().includes('вата') ||
      layer.materialName.toLowerCase().includes('пенополистирол') ||
      (layer.lambda <= 0.08 && layer.thickness >= 0.03)
    );

    // Если это утеплитель, вставляем точку в середине слоя
    if (isIns) {
      const halfX_mm = (layer.thickness * 1000) / 2;
      const halfR = meta.R_exact / 2;
      const halfRp = meta.Rp_exact / 2;
      const midCumX = cumWallX + halfX_mm;
      const midCumR = cumWallR + halfR;
      const midCumRp = cumWallRp + halfRp;

      const t_w_mid = +(t_v - q_wall_winter * midCumR).toFixed(2);
      const t_h_mid_exact = t_v - q_wall_heat * midCumR;
      const t_h_mid = +t_h_mid_exact.toFixed(2);
      const E_h_mid = getSaturatedVaporPressure(t_h_mid_exact);
      const e_h_mid = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * midCumRp).toFixed(2);

      wallCrossSection.push({
        index: sectionIndex++,
        planeName: 'Середина утеплителя (середина слоя)',
        layerName: `${layer.name} (контрольная точка x = ${Math.round(midCumX)} мм)`,
        coord_x_mm: Math.round(midCumX),
        thickness_mm: Math.round(halfX_mm),
        R_layer: +halfR.toFixed(3),
        R_cumulative: +midCumR.toFixed(3),
        temp_winter: t_w_mid,
        temp_heating: t_h_mid,
        E_sat: E_h_mid,
        e_partial: e_h_mid,
        delta_margin: +(E_h_mid - e_h_mid).toFixed(1),
        isInsulationMidpoint: true,
      });
    }

    cumWallX += layer.thickness * 1000;
    cumWallR += meta.R_exact;
    cumWallRp += meta.Rp_exact;

    const t_w = +(t_v - q_wall_winter * cumWallR).toFixed(2);
    const t_h_exact = t_v - q_wall_heat * cumWallR;
    const t_h = +t_h_exact.toFixed(2);
    const E_h = getSaturatedVaporPressure(t_h_exact);
    const e_h = +(e_v_exact - ((e_v_exact - e_n_exact) / total_R_p_wall_exact) * cumWallRp).toFixed(2);

    wallCrossSection.push({
      index: sectionIndex++,
      planeName: isLastLayer ? `Наружная поверхность τн (${layer.name})` : `Граница слоя: ${layer.name}`,
      layerName: layer.name,
      coord_x_mm: Math.round(cumWallX),
      thickness_mm: Math.round(layer.thickness * 1000),
      R_layer: layer.R,
      R_cumulative: +cumWallR.toFixed(3),
      temp_winter: t_w,
      temp_heating: t_h,
      E_sat: E_h,
      e_partial: e_h,
      delta_margin: +(E_h - e_h).toFixed(1),
    });
  });

  // Наружный воздух (через наружный пограничный слой 1/αн)
  wallCrossSection.push({
    index: sectionIndex++,
    planeName: 'Наружный воздух tн',
    layerName: 'Наружный пограничный слой (1/αн) и наружная среда',
    coord_x_mm: Math.round(cumWallX),
    thickness_mm: 0,
    R_layer: +(1 / alpha_n_ext).toFixed(4),
    R_cumulative: +R_wall_total_exact.toFixed(3),
    temp_winter: t_n_design,
    temp_heating: t_n_moisture,
    E_sat: getSaturatedVaporPressure(t_n_moisture),
    e_partial: e_n,
    delta_margin: +(getSaturatedVaporPressure(t_n_moisture) - e_n).toFixed(1),
  });

  const delta_t_norm_wall = ov.delta_t_norm_wall ?? bTypeDef.delta_t_norm_wall;
  const R_wall_norm_latest_req = +(bTypeDef.R_norm_wall * n_wall).toFixed(2);
  const wallRCompliant = R_wall_total >= R_wall_req && R_wall_total >= R_wall_norm_latest_req;

  const wallResult: WallCalculationResult = {
    construction: wallDef,
    insulation: insDef,
    layers: wallLayersCalculated,
    R_without_insulation: +R_without_ins.toFixed(3),
    delta_insulation_calc: +delta_wall_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_wall_ins_adopted,
    R_total: R_wall_total,
    R_required: R_wall_req,
    R_norm_latest: bTypeDef.R_norm_wall,
    thermalInertia_D: D_wall,
    heatAssimilation_Yv: wallYvInfo.Y_v,
    heatAssimilationCase: wallYvInfo.caseUsed,
    heatingIrregularity_m: heatingM,
    design_t_out: t_n_design,
    designTempRule: wallDesignTempInfo.ruleLabel,
    delta_t_actual: delta_t_wall,
    delta_t_norm: delta_t_norm_wall,
    tau_v_steady: tau_v_wall_steady,
    tau_v_min: tau_v_wall,
    dew_point: dew_point_internal,
    condensationRisk: wallCondensation,
    isRCompliant: wallRCompliant,
    isCompliant: wallRCompliant && tau_v_wall > dew_point_internal && delta_t_wall <= delta_t_norm_wall,
    total_R_p: total_R_p_wall,
    vaporBarrier: wallVaporBarrierInfo,
    moisturePoints: wallMoisturePoints,
    crossSectionProfile: wallCrossSection,
  };


  // -------------------------------------------------------------
  // 3. РАСЧЕТ ПОКРЫТИЯ / ЧЕРДАЧНОГО ПЕРЕКРЫТИЯ (ПЛИТА С КРУГЛЫМИ ПУСТОТАМИ)
  // -------------------------------------------------------------
  const roofDef = ROOF_CONSTRUCTIONS[cipher.roofCode] || ROOF_CONSTRUCTIONS['П3'];
  const slab = roofDef.slab;

  // Параметры многопустотной плиты с возможностью переопределения
  const slabH = ov.hollowCoreSlab?.height ?? slab.height;
  const slabVoidD = ov.hollowCoreSlab?.voidDiameter ?? slab.voidDiameter;
  const slabSpacing = slab.spacing;
  const concreteLambda = ov.hollowCoreSlab?.concreteLambda ?? (expCond === 'А' ? 1.92 : 2.04);
  const concreteS = expCond === 'А' ? 17.98 : 19.4;
  const R_zvp = ov.hollowCoreSlab?.R_zvp ?? 0.15; // сопротивление замкнутой воздушной прослойки

  const h_m = slabH / 1000;
  const d_m = slabVoidD / 1000;
  const spacing_m = slabSpacing / 1000;

  // Точный аналитический расчет многопустотной плиты (СП 2.04.01 / Шибеко / PDF ф. 3.1–3.4):
  // Сторона эквивалентного квадрата пустоты a = sqrt(π * d² / 4)
  const a_eq = +(Math.sqrt((Math.PI * d_m * d_m) / 4)).toFixed(4);
  const b_rib = +(Math.max(0.02, spacing_m - a_eq)).toFixed(4);
  const delta_flange_eq = +(Math.max(0.02, (h_m - a_eq) / 2)).toFixed(4);
  const R_1_rib = +(h_m / concreteLambda).toFixed(4);
  const R_2_void = +((2 * delta_flange_eq) / concreteLambda + R_zvp).toFixed(4);
  // Сопротивление при рассечении плоскостями, параллельными тепловому потоку (R_|| / R_пл):
  const R_parallel_calc = +((b_rib + a_eq) / (b_rib / R_1_rib + a_eq / R_2_void)).toFixed(3);
  // Сопротивление при рассечении плоскостями, перпендикулярными тепловому потоку (R_⊥):
  const lambda_eq_mid = (b_rib * concreteLambda + a_eq * (a_eq / R_zvp)) / (b_rib + a_eq);
  const R_perpendicular_calc = +((2 * delta_flange_eq) / concreteLambda + a_eq / lambda_eq_mid).toFixed(3);

  const R_parallel = ov.hollowCoreSlab?.R_parallel ?? R_parallel_calc;
  const R_perpendicular = ov.hollowCoreSlab?.R_perpendicular ?? R_perpendicular_calc;
  const R_slab = ov.hollowCoreSlab?.R_slab_override ?? R_parallel;

  // Сопротивления двух расчетных сечений плиты:
  // 1) Худшее сечение (сечение II по сплошному бетонному ребру плиты):
  const R_rib_worst = +(h_m / concreteLambda).toFixed(3);
  // 2) Сечение I (по центру круглой пустоты d): фактическая толщина полки (h - d)/2
  const delta_flange_actual = Math.max(0.02, (h_m - d_m) / 2);
  const R_void_section = +((2 * delta_flange_actual) / concreteLambda + R_zvp).toFixed(3);

  const n_roof = ov.n_roof ?? roofDef.increasingFactor_n;
  const R_norm_roof = ov.R_norm_roof ?? bTypeDef.R_norm_roof;
  const R_roof_req = +(R_norm_roof * n_roof).toFixed(2);

  // Слои покрытия: кастомные либо стандартные из справочника
  const roofLayersConfig = (ov.roofCustomLayers && ov.roofCustomLayers.length > 0)
    ? ov.roofCustomLayers.map((cl, i) => ({
        name: cl.name,
        thickness: cl.thickness,
        isInsulation: Boolean(cl.isInsulation || cl.name.toLowerCase().includes('утепл')),
        materialId: cl.isInsulation ? 'insulation' : `custom_roof_${i}`,
        customLambda: cl.lambda,
        customS: cl.s,
        customMu: cl.mu,
      }))
    : roofDef.layers.map((l) => ({
        ...l,
        customLambda: undefined as number | undefined,
        customS: undefined as number | undefined,
        customMu: undefined as number | undefined,
      }));

  // Идентификация слоя многопустотной плиты (чтобы не считать его дважды!)
  const isHollowSlabLayer = (l: { name: string; materialId?: string }) =>
    l.materialId === 'reinforced_concrete' ||
    l.name.toLowerCase().includes('плита') ||
    l.name.toLowerCase().includes('многопустот');

  // Разделяем слои на: ниже плиты (внутри), сама плита, утеплитель, выше утеплителя (снаружи)
  const layersBeforeSlab: CalculatedLayer[] = [];
  const layersBetweenSlabAndIns: CalculatedLayer[] = [];
  const layersAfterIns: CalculatedLayer[] = [];

  let seenSlab = false;
  let seenIns = false;
  let R_roof_without_ins = 1 / alpha_v_roof + 1 / alpha_n_ext + R_slab;

  for (const l of roofLayersConfig) {
    if (l.isInsulation || l.materialId === 'insulation') {
      seenIns = true;
      continue;
    }
    if (isHollowSlabLayer(l)) {
      seenSlab = true;
      continue;
    }
    const baseMat = getMaterialData(l.materialId);
    const lambda = l.customLambda ?? baseMat.lambda;
    const s = l.customS ?? baseMat.s;
    const mu = l.customMu ?? baseMat.mu;
    const rExact = l.thickness / lambda;
    R_roof_without_ins += rExact;

    const calcLayer: CalculatedLayer = {
      name: l.name,
      materialName: baseMat.name,
      thickness: l.thickness,
      lambda,
      R: +rExact.toFixed(4),
      s,
      D: +(rExact * s).toFixed(3),
      mu,
      R_p: mu > 0 ? +(l.thickness / mu).toFixed(4) : 0,
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    };

    if (!seenSlab && !seenIns) {
      layersBeforeSlab.push(calcLayer);
    } else if (seenSlab && !seenIns) {
      layersBetweenSlabAndIns.push(calcLayer);
    } else {
      layersAfterIns.push(calcLayer);
    }
  }

  const roofInsLambda = ov.roofInsulationConductivity ?? (expCond === 'А' ? insDef.lambda_A : insDef.lambda_B);
  const roofInsS = expCond === 'А' ? insDef.s_A : insDef.s_B;
  const delta_roof_ins_calc = (R_roof_req - R_roof_without_ins) * roofInsLambda;
  const delta_roof_ins_adopted = ov.roofInsulationThickness !== undefined
    ? ov.roofInsulationThickness
    : +(Math.ceil(delta_roof_ins_calc * 100) / 100).toFixed(2);
  const R_roof_total_exact = R_roof_without_ins + delta_roof_ins_adopted / roofInsLambda;
  const R_roof_total = +R_roof_total_exact.toFixed(2);

  // Слой утеплителя покрытия
  const roofInsLayer: CalculatedLayer = {
    name: 'Утеплитель ' + insDef.id,
    materialName: insDef.name,
    thickness: delta_roof_ins_adopted,
    lambda: roofInsLambda,
    R: +(delta_roof_ins_adopted / roofInsLambda).toFixed(4),
    s: roofInsS,
    D: +((delta_roof_ins_adopted / roofInsLambda) * roofInsS).toFixed(3),
    mu: insDef.mu,
    R_p: +(delta_roof_ins_adopted / insDef.mu).toFixed(4),
    tempInside: 0,
    tempOutside: 0,
    E_inside: 0,
    E_outside: 0,
    e_inside: 0,
    e_outside: 0,
  };

  // Построитель слоя пароизоляции из справочника Приложения Н (с учетом материала и толщины в мм)
  const makeVaporBarrierFromCatalog = (
    materialId: string,
    thicknessMm?: number,
    isAuto = false
  ): { layer: CalculatedLayer; info: AppliedVaporBarrierInfo } | null => {
    const mat = getVaporBarrierById(materialId);
    if (mat.id === 'none') return null;
    const thkMm = thicknessMm !== undefined && thicknessMm > 0 ? thicknessMm : mat.defaultThicknessMm;
    const rpVal = calculateVaporBarrierRp(mat.id, thkMm);
    if (rpVal <= 0 || thkMm <= 0) return null;
    const thkM = thkMm / 1000;
    const rVb = +(thkM / mat.lambda).toFixed(4);
    const dVb = +(rVb * mat.s).toFixed(3);
    return {
      layer: {
        name: `Пароизоляция (${mat.shortName}, δ=${thkMm} мм, Rп=${rpVal})`,
        materialName: mat.name,
        thickness: thkM,
        lambda: mat.lambda,
        R: rVb,
        s: mat.s,
        D: dVb,
        mu: +(thkM / rpVal).toFixed(7),
        R_p: rpVal,
        tempInside: 0,
        tempOutside: 0,
        E_inside: 0,
        E_outside: 0,
        e_inside: 0,
        e_outside: 0,
      },
      info: {
        materialId: mat.id,
        name: mat.name,
        shortName: mat.shortName,
        thicknessMm: thkMm,
        R_p: rpVal,
        isAuto,
      },
    };
  };

  // Слои плиты для двух расчетных сечений:
  // 1) Худшее сечение (сечение II по сплошному бетонному ребру плиты)
  const ribLayers: CalculatedLayer[] = [
    {
      name: `Железобетонное ребро плиты h=${slabH}мм (сплошной бетон)`,
      materialName: 'Железобетон сплошной ГОСТ 26633-2015',
      thickness: h_m,
      lambda: concreteLambda,
      R: +(h_m / concreteLambda).toFixed(4),
      s: concreteS,
      D: +((h_m / concreteLambda) * concreteS).toFixed(3),
      mu: 0.03,
      R_p: +(h_m / 0.03).toFixed(4),
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    },
  ];

  // 2) Сечение I (по центру круглой пустоты d с воздушной прослойкой)
  const flangeR = +(delta_flange_actual / concreteLambda).toFixed(4);
  const voidLayers: CalculatedLayer[] = [
    {
      name: `Нижняя полка ж/б плиты δ=${Math.round(delta_flange_actual * 1000)}мм`,
      materialName: 'Железобетон',
      thickness: +delta_flange_actual.toFixed(4),
      lambda: concreteLambda,
      R: flangeR,
      s: concreteS,
      D: +(flangeR * concreteS).toFixed(3),
      mu: 0.03,
      R_p: +(delta_flange_actual / 0.03).toFixed(4),
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    },
    {
      name: `Воздушная прослойка (пустота плиты d=${slabVoidD}мм)`,
      materialName: 'Замкнутая воздушная прослойка',
      thickness: d_m,
      lambda: +(d_m / R_zvp).toFixed(3),
      R: R_zvp,
      s: 0.0,
      D: 0.0,
      mu: 0,
      R_p: 0, // СП 2.04.01-2020 п. 10.5 и Шибеко п. 7.1.3: сопротивление паропроницанию воздушной прослойки равно 0
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    },
    {
      name: `Верхняя полка ж/б плиты δ=${Math.round(delta_flange_actual * 1000)}мм`,
      materialName: 'Железобетон',
      thickness: +delta_flange_actual.toFixed(4),
      lambda: concreteLambda,
      R: flangeR,
      s: concreteS,
      D: +(flangeR * concreteS).toFixed(3),
      mu: 0.03,
      R_p: +(delta_flange_actual / 0.03).toFixed(4),
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    },
  ];

  // Тепловая инерция покрытия D_покрытия (в сечении по пустоте воздушная прослойка имеет s = 0)
  const D_roof_void = +(
    layersBeforeSlab.reduce((s, l) => s + l.D, 0) +
    voidLayers.reduce((s, l) => s + l.D, 0) +
    layersBetweenSlabAndIns.reduce((s, l) => s + l.D, 0) +
    roofInsLayer.D +
    layersAfterIns.reduce((s, l) => s + l.D, 0)
  ).toFixed(2);
  const D_roof_rib = +(
    layersBeforeSlab.reduce((s, l) => s + l.D, 0) +
    ribLayers.reduce((s, l) => s + l.D, 0) +
    layersBetweenSlabAndIns.reduce((s, l) => s + l.D, 0) +
    roofInsLayer.D +
    layersAfterIns.reduce((s, l) => s + l.D, 0)
  ).toFixed(2);

  // Активное сечение: по умолчанию худшее сечение ('worst'), либо 'void'.
  // Для неоднородных многопустотных покрытий тепловая инерция D_покрытия для назначения t_н
  // по табл. 6.3 СП 2.04.01-2020 принимается минимальной (по сечению с пустотой, где s_возд = 0),
  // что обеспечивает более низкую (расчетно-надежную) температуру наружного воздуха t_н.
  const activeSectionType: 'worst' | 'void' = ov.roofCrossSectionMode === 'void' ? 'void' : 'worst';
  const D_roof = Math.min(D_roof_void, D_roof_rib);
  const roofDesignTempInfo = getDesignOutTempInfo(D_roof);
  const t_n_roof = roofDesignTempInfo.t_n;

  // Вспомогательная функция построения профиля температур и влажности по сечению покрытия
  const buildRoofSectionData = (
    type: 'worst' | 'void',
    sectionName: string,
    description: string,
    slabLayerR: number,
    slabLayers: CalculatedLayer[],
    vbLayer: CalculatedLayer | null,
    t_n_sec: number,
    d_sec: number
  ): RoofSectionProfileData & { total_Rp: number } => {
    const fullLayers = [
      ...layersBeforeSlab,
      ...slabLayers,
      ...layersBetweenSlabAndIns,
      ...(vbLayer ? [vbLayer] : []),
      roofInsLayer,
      ...layersAfterIns,
    ];
    const R_alpha_v_exact = 1 / alpha_v_roof;
    const R_alpha_n_exact = 1 / alpha_n_ext;
    const R_alpha_v = +R_alpha_v_exact.toFixed(4);
    const R_alpha_n = +R_alpha_n_exact.toFixed(4);

    // Используем точные некругленные R_exact и Rp_exact для каждого слоя
    const layerExactR = (l: CalculatedLayer) =>
      l.name.toLowerCase().includes('воздушная прослойка') ? R_zvp : l.thickness / l.lambda;
    const layerExactRp = (l: CalculatedLayer) => {
      const lower = l.name.toLowerCase();
      if (lower.includes('воздушная прослойка')) return 0; // СП 2.04.01-2020 п. 10.5: R_п.возд = 0
      if (lower.includes('пароизоляция')) return l.R_p;
      return l.mu > 0 ? l.thickness / l.mu : 0;
    };

    const fullLayersMeta = fullLayers.map((l) => {
      const rEx = layerExactR(l);
      return {
        R_exact: rEx,
        s: l.s,
        D_exact: rEx * l.s,
        Rp_exact: layerExactRp(l),
      };
    });

    const sumLayersR = fullLayersMeta.reduce((sum, m) => sum + m.R_exact, 0);
    const R_total_sec_exact = R_alpha_v_exact + sumLayersR + R_alpha_n_exact;
    const R_total_sec = +R_total_sec_exact.toFixed(3);
    const total_Rp_sec_exact = R_pv + fullLayersMeta.reduce((sum, m) => sum + m.Rp_exact, 0) + R_pn;
    const total_Rp_sec = +total_Rp_sec_exact.toFixed(2);

    // Расчет температуры внутренней поверхности потолка τ_в без коэффициента неравномерности отопления m (m = 0)
    const secYvInfo = calculateSurfaceHeatAssimilation(fullLayersMeta, alpha_n_ext);
    const secTempCalc = calculateShibekoMinSurfaceTemp(
      t_v,
      t_n_sec,
      R_total_sec_exact,
      alpha_v_roof,
      secYvInfo.Y_v,
      0
    );
    const delta_t_sec_winter = secTempCalc.delta_t_steady;
    const tau_v_sec_steady = secTempCalc.tau_v_steady;
    const tau_v_sec_winter = secTempCalc.tau_v_steady;

    const q_heat = (t_v - t_n_moisture) / R_total_sec_exact;
    const q_winter = (t_v - t_n_sec) / R_total_sec_exact;
    const tau_v_sec_heat_exact = t_v - q_heat * R_alpha_v_exact;
    const tau_v_sec_heat = +tau_v_sec_heat_exact.toFixed(2);

    const crossSection: CrossSectionTemperaturePoint[] = [];
    const moisturePoints: {
      x: number;
      name: string;
      temp: number;
      E: number;
      e: number;
      isMidpoint?: boolean;
    }[] = [];

    // Точка 0: Внутренний воздух
    crossSection.push({
      index: 0,
      planeName: 'Внутренний воздух (под потолком) tв',
      layerName: 'Воздушная среда помещения',
      coord_x_mm: 0,
      thickness_mm: 0,
      R_layer: 0,
      R_cumulative: 0,
      temp_winter: t_v,
      temp_heating: t_v,
      E_sat: getSaturatedVaporPressure(t_v),
      e_partial: e_v,
      delta_margin: +(getSaturatedVaporPressure(t_v) - e_v).toFixed(1),
    });

    // Точка 1: Внутренняя поверхность потолка
    const E_tau_v = getSaturatedVaporPressure(tau_v_sec_heat_exact);
    const e_tau_v_roof = +(e_v_exact - ((e_v_exact - e_n_exact) / total_Rp_sec_exact) * R_pv).toFixed(2);
    crossSection.push({
      index: 1,
      planeName: 'Внутренняя поверхность потолка τв',
      layerName: `Пограничный слой теплоотдачи (1/αв) — ${sectionName}`,
      coord_x_mm: 0,
      thickness_mm: 0,
      R_layer: R_alpha_v,
      R_cumulative: R_alpha_v,
      temp_winter: tau_v_sec_steady,
      temp_heating: tau_v_sec_heat,
      E_sat: E_tau_v,
      e_partial: e_tau_v_roof,
      delta_margin: +(E_tau_v - e_tau_v_roof).toFixed(1),
    });

    moisturePoints.push({
      x: 0,
      name: 'Внутренняя поверхность потолка',
      temp: tau_v_sec_heat,
      E: E_tau_v,
      e: e_tau_v_roof,
    });

    let cumX_mm = 0;
    let cumR = R_alpha_v_exact;
    let cumRp = R_pv;
    let ptIndex = 2;

    fullLayers.forEach((layer, idx) => {
      const meta = fullLayersMeta[idx];
      const isLastLayer = idx === fullLayers.length - 1;
      const isIns = Boolean(
        layer.name.toLowerCase().includes('утепл') ||
        layer.materialName.toLowerCase().includes('утепл') ||
        layer.materialName.toLowerCase().includes('вата') ||
        layer.materialName.toLowerCase().includes('пенополистирол') ||
        (layer.lambda <= 0.08 && layer.thickness >= 0.03)
      );

      // Если это слой утеплителя, вставляем контрольную точку в середине утеплителя
      if (isIns) {
        const halfX_mm = (layer.thickness * 1000) / 2;
        const halfR = meta.R_exact / 2;
        const halfRp = meta.Rp_exact / 2;
        const midCumX_mm = cumX_mm + halfX_mm;
        const midCumR = cumR + halfR;
        const midCumRp = cumRp + halfRp;

        const t_w_mid = +(t_v - q_winter * midCumR).toFixed(2);
        const t_h_mid_exact = t_v - q_heat * midCumR;
        const t_h_mid = +t_h_mid_exact.toFixed(2);
        const E_h_mid = getSaturatedVaporPressure(t_h_mid_exact);
        const e_h_mid = +(e_v_exact - ((e_v_exact - e_n_exact) / total_Rp_sec_exact) * midCumRp).toFixed(2);

        crossSection.push({
          index: ptIndex++,
          planeName: 'Середина утеплителя (середина слоя)',
          layerName: `${layer.name} (контрольная точка x = ${Math.round(midCumX_mm)} мм)`,
          coord_x_mm: Math.round(midCumX_mm),
          thickness_mm: Math.round(halfX_mm),
          R_layer: +halfR.toFixed(3),
          R_cumulative: +midCumR.toFixed(3),
          temp_winter: t_w_mid,
          temp_heating: t_h_mid,
          E_sat: E_h_mid,
          e_partial: e_h_mid,
          delta_margin: +(E_h_mid - e_h_mid).toFixed(1),
          isInsulationMidpoint: true,
        });

        moisturePoints.push({
          x: +(midCumX_mm / 1000).toFixed(3),
          name: `Середина утеплителя (${Math.round(halfX_mm)} мм)`,
          temp: t_h_mid,
          E: E_h_mid,
          e: e_h_mid,
          isMidpoint: true,
        });
      }

      cumX_mm += layer.thickness * 1000;
      cumR += meta.R_exact;
      cumRp += meta.Rp_exact;

      const t_w = +(t_v - q_winter * cumR).toFixed(2);
      const t_h_exact = t_v - q_heat * cumR;
      const t_h = +t_h_exact.toFixed(2);
      const E_h = getSaturatedVaporPressure(t_h_exact);
      const e_h = +(e_v_exact - ((e_v_exact - e_n_exact) / total_Rp_sec_exact) * cumRp).toFixed(2);

      crossSection.push({
        index: ptIndex++,
        planeName: isLastLayer ? `Наружная поверхность покрытия τн (${layer.name})` : `Граница: ${layer.name}`,
        layerName: layer.name,
        coord_x_mm: Math.round(cumX_mm),
        thickness_mm: Math.round(layer.thickness * 1000),
        R_layer: layer.R,
        R_cumulative: +cumR.toFixed(3),
        temp_winter: t_w,
        temp_heating: t_h,
        E_sat: E_h,
        e_partial: e_h,
        delta_margin: +(E_h - e_h).toFixed(1),
      });

      moisturePoints.push({
        x: +(cumX_mm / 1000).toFixed(3),
        name: `Граница: ${layer.name}`,
        temp: t_h,
        E: E_h,
        e: e_h,
      });
    });

    // Наружный воздух (через наружный пограничный слой 1/αн)
    crossSection.push({
      index: ptIndex++,
      planeName: 'Наружный воздух tн',
      layerName: 'Наружный пограничный слой (1/αн) и наружная среда',
      coord_x_mm: Math.round(cumX_mm),
      thickness_mm: 0,
      R_layer: R_alpha_n,
      R_cumulative: +R_total_sec_exact.toFixed(3),
      temp_winter: t_n_sec,
      temp_heating: t_n_moisture,
      E_sat: getSaturatedVaporPressure(t_n_moisture),
      e_partial: e_n,
      delta_margin: +(getSaturatedVaporPressure(t_n_moisture) - e_n).toFixed(1),
    });

    const condensationRisk = moisturePoints.some((p) => p.e >= p.E);

    return {
      name: sectionName,
      type,
      description,
      R_slab_section: slabLayerR,
      R_total_section: R_total_sec,
      thermalInertia_D: d_sec,
      design_t_out: t_n_sec,
      heatAssimilation_Yv: secYvInfo.Y_v,
      heatAssimilationCase: secYvInfo.caseUsed,
      tau_v_steady: tau_v_sec_steady,
      tau_v_winter: tau_v_sec_winter,
      tau_v_heating: tau_v_sec_heat,
      delta_t_winter: delta_t_sec_winter,
      crossSectionProfile: crossSection,
      moisturePoints,
      condensationRisk,
      total_Rp: total_Rp_sec,
    };
  };

  // Сначала проверяем влажностный режим БЕЗ пароизоляции (как в СП 2.04.01 / PDF стр. 21-22).
  // Оба сечения покрытия рассчитываются при единой расчетной зимней температуре t_n_roof (по D_min = D_пуст).
  const worstCheckNoVB = buildRoofSectionData(
    'worst',
    'Худшее сечение (по ребру плиты)',
    `Сечение II через сплошное бетонное ребро h=${slabH}мм без воздушной прослойки (минимальное термическое сопротивление Rпл = ${R_rib_worst} м²·°С/Вт)`,
    R_rib_worst,
    ribLayers,
    null,
    t_n_roof,
    D_roof_rib
  );
  const voidCheckNoVB = buildRoofSectionData(
    'void',
    'Сечение по пустоте плиты',
    `Сечение I через круглую пустоту плиты с замкнутой воздушной прослойкой (Rпл = ${R_void_section} м²·°С/Вт)`,
    R_void_section,
    voidLayers,
    null,
    t_n_roof,
    D_roof_void
  );

  // Пароизоляция требуется автоматически, если без нее выпадает конденсат (e >= E) в расчетных сечениях.
  // Если пользователь явно выбрал материал и толщину пароизоляции в ov.roofVaporBarrier — применяем его выбор!
  const needsVaporBarrier = worstCheckNoVB.condensationRisk || voidCheckNoVB.condensationRisk;
  let chosenVbLayer: CalculatedLayer | null = null;
  let roofVaporBarrierInfo: AppliedVaporBarrierInfo | null = null;
  let worstSectionData = worstCheckNoVB;
  let voidSectionData = voidCheckNoVB;

  if (ov.roofVaporBarrier !== undefined) {
    const manualVb = makeVaporBarrierFromCatalog(
      ov.roofVaporBarrier.materialId,
      ov.roofVaporBarrier.thicknessMm,
      false
    );
    if (manualVb) {
      chosenVbLayer = manualVb.layer;
      roofVaporBarrierInfo = manualVb.info;
      worstSectionData = buildRoofSectionData(
        'worst',
        'Худшее сечение (по ребру плиты)',
        `Сечение II через сплошное бетонное ребро h=${slabH}мм с пароизоляцией (${manualVb.info.shortName}, Rпл = ${R_rib_worst} м²·°С/Вт)`,
        R_rib_worst,
        ribLayers,
        manualVb.layer,
        t_n_roof,
        D_roof_rib
      );
      voidSectionData = buildRoofSectionData(
        'void',
        'Сечение по пустоте плиты',
        `Сечение I через круглую пустоту плиты с пароизоляцией (${manualVb.info.shortName}, Rпл = ${R_void_section} м²·°С/Вт)`,
        R_void_section,
        voidLayers,
        manualVb.layer,
        t_n_roof,
        D_roof_void
      );
    }
  } else if (needsVaporBarrier) {
    // Автоподбор по возрастанию Rп из Приложения Н: 1 слой ПЭ -> 2 слоя ПЭ -> фольгированная мембрана
    const autoCandidates = ['pe_film_1', 'pe_film_2', 'foil_membrane'];
    for (const matId of autoCandidates) {
      const cand = makeVaporBarrierFromCatalog(matId, undefined, true);
      if (!cand) continue;
      const wCand = buildRoofSectionData(
        'worst',
        'Худшее сечение (по ребру плиты)',
        `Сечение II через сплошное бетонное ребро h=${slabH}мм с пароизоляцией (${cand.info.shortName}, Rпл = ${R_rib_worst} м²·°С/Вт)`,
        R_rib_worst,
        ribLayers,
        cand.layer,
        t_n_roof,
        D_roof_rib
      );
      const vCand = buildRoofSectionData(
        'void',
        'Сечение по пустоте плиты',
        `Сечение I через круглую пустоту плиты с пароизоляцией (${cand.info.shortName}, Rпл = ${R_void_section} м²·°С/Вт)`,
        R_void_section,
        voidLayers,
        cand.layer,
        t_n_roof,
        D_roof_void
      );
      chosenVbLayer = cand.layer;
      roofVaporBarrierInfo = cand.info;
      worstSectionData = wCand;
      voidSectionData = vCand;
      if (!wCand.condensationRisk && !vCand.condensationRisk) {
        break;
      }
    }
  }

  const vaporBarrierAdded = Boolean(chosenVbLayer);
  const activeSection = activeSectionType === 'void' ? voidSectionData : worstSectionData;

  // Расчет слоев для сводной таблицы покрытия (без дублирования плиты!)
  const roofLayersCalculated: CalculatedLayer[] = [
    ...layersBeforeSlab,
    {
      name: `Многопустотная ж/б плита h=${slabH}мм`,
      materialName: 'Железобетон с пустотами d=' + slabVoidD + 'мм',
      thickness: h_m,
      lambda: +(h_m / R_slab).toFixed(3),
      R: R_slab,
      s: concreteS,
      D: +(R_slab * concreteS).toFixed(2),
      mu: 0.03,
      R_p: +(h_m / 0.03).toFixed(2),
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    },
    ...layersBetweenSlabAndIns,
    ...(chosenVbLayer ? [chosenVbLayer] : []),
    roofInsLayer,
    ...layersAfterIns,
  ];

  const delta_t_norm_roof = ov.delta_t_norm_roof ?? bTypeDef.delta_t_norm_roof;
  const R_roof_norm_latest_req = +(bTypeDef.R_norm_roof * n_roof).toFixed(2);
  const roofRCompliant = R_roof_total >= R_roof_req && R_roof_total >= R_roof_norm_latest_req;

  const roofResult: RoofCalculationResult = {
    construction: roofDef,
    insulation: insDef,
    hollowCore: {
      height: slabH,
      voidDiameter: slabVoidD,
      spacing: slabSpacing,
      a_eq,
      b_rib,
      delta_flange_eq,
      R_1_rib,
      R_2_void,
      R_parallel,
      R_perpendicular,
      R_slab,
      R_rib_worst,
      R_void_section,
    },
    layers: roofLayersCalculated,
    delta_insulation_calc: +delta_roof_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_roof_ins_adopted,
    R_total: R_roof_total,
    R_required: R_roof_req,
    R_norm_latest: bTypeDef.R_norm_roof,
    thermalInertia_D: D_roof,
    thermalInertia_D_void: D_roof_void,
    thermalInertia_D_rib: D_roof_rib,
    heatAssimilation_Yv: activeSection.heatAssimilation_Yv,
    heatAssimilationCase: activeSection.heatAssimilationCase,
    heatingIrregularity_m: heatingM,
    design_t_out: t_n_roof,
    designTempRule: roofDesignTempInfo.ruleLabel,
    total_R_p: activeSection.total_Rp,
    needsVaporBarrier,
    vaporBarrierAdded,
    vaporBarrier: roofVaporBarrierInfo,
    delta_t_actual: activeSection.delta_t_winter,
    delta_t_norm: delta_t_norm_roof,
    tau_v_steady: activeSection.tau_v_steady,
    tau_v_min: activeSection.tau_v_winter,
    dew_point: dew_point_internal,
    isRCompliant: roofRCompliant,
    isCompliant:
      roofRCompliant &&
      activeSection.tau_v_winter > dew_point_internal &&
      activeSection.delta_t_winter <= delta_t_norm_roof,
    moistureCondensationRisk: activeSection.condensationRisk,
    worstSection: worstSectionData,
    voidSection: voidSectionData,
    activeSectionType,
    moisturePoints: activeSection.moisturePoints,
    crossSectionProfile: activeSection.crossSectionProfile,
  };

  // -------------------------------------------------------------
  // 4. РАСЧЕТ ТЕХНИЧЕСКОГО ПОДПОЛЬЯ (ПТП)
  // -------------------------------------------------------------
  const baseDef = BASEMENT_CONSTRUCTIONS[cipher.basementCode] || BASEMENT_CONSTRUCTIONS['ПТП10'];

  // Исходные слои перекрытия: кастомные либо стандартные
  const baseLayersConfig = (ov.basementCustomLayers && ov.basementCustomLayers.length > 0)
    ? ov.basementCustomLayers.map((cl, i) => ({
        name: cl.name,
        thickness: cl.thickness,
        isInsulation: Boolean(cl.isInsulation || cl.name.toLowerCase().includes('утепл')),
        materialId: cl.isInsulation ? 'insulation' : `custom_base_${i}`,
        customLambda: cl.lambda,
        customS: cl.s,
        customMu: cl.mu,
      }))
    : baseDef.layers.map((l) => ({
        ...l,
        customLambda: undefined as number | undefined,
        customS: undefined as number | undefined,
        customMu: undefined as number | undefined,
      }));

  // Расчет теплопотерь трубопроводов
  const getPipeQPerMeter = (temp: number, dy: number): number => {
    const tempDiff = temp - 8.7;
    const factor = dy / 50;
    return +(0.28 * factor * tempDiff + 3.5).toFixed(1);
  };

  let totalPipeHeatWatts = 0;
  const pipesDetails = baseDef.pipes.map((p, idx) => {
    const overrideP = ov.crawlSpacePipes;
    const temp = (idx === 0 && overrideP?.pipe1_temp) || (idx === 1 && overrideP?.pipe2_temp) || (idx === 2 && overrideP?.pipe3_temp) || p.temp;
    const dy = (idx === 0 && overrideP?.pipe1_dy) || (idx === 1 && overrideP?.pipe2_dy) || (idx === 2 && overrideP?.pipe3_dy) || p.dy;
    const length = (idx === 0 && overrideP?.pipe1_length) || (idx === 1 && overrideP?.pipe2_length) || (idx === 2 && overrideP?.pipe3_length) || p.length;

    const q_m = getPipeQPerMeter(temp, dy);
    const q_tot = +(q_m * length).toFixed(1);
    totalPipeHeatWatts += q_tot;
    return {
      temp,
      dy,
      length,
      q_heat_loss: q_m,
      q_total: q_tot,
    };
  });
  totalPipeHeatWatts = +totalPipeHeatWatts.toFixed(1);

  // Термическое сопротивление перекрытия без утеплителя
  const alpha_v_floor = ov.alpha_v_basement ?? ALPHA_V.floor_crawl_space;
  const alpha_n_crawl = ov.alpha_n_basement ?? ALPHA_N.crawl_space_interior;
  let R_ptp_without_ins = 1 / alpha_v_floor + 1 / alpha_n_crawl;
  for (const l of baseLayersConfig) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const lambda = l.customLambda ?? getMaterialData(l.materialId).lambda;
      R_ptp_without_ins += l.thickness / lambda;
    }
  }

  const R_ptp_min = ov.R_norm_basement ?? bTypeDef.R_norm_basement;
  const baseInsLambda = ov.basementInsulationConductivity ?? (expCond === 'А' ? insDef.lambda_A : insDef.lambda_B);
  const delta_base_ins_calc = (R_ptp_min - R_ptp_without_ins) * baseInsLambda;
  const delta_base_ins_adopted = ov.basementInsulationThickness !== undefined
    ? ov.basementInsulationThickness
    : +(Math.max(0.05, Math.ceil(delta_base_ins_calc * 100) / 100)).toFixed(2);
  const R_ptp_total = +(R_ptp_without_ins + delta_base_ins_adopted / baseInsLambda).toFixed(2);

  // Тепловой баланс подполья
  const t_p_crawl_space = ov.crawlSpacePipes?.crawlSpaceTempOverride ?? 8.7;
  const phi_p_crawl_space = ov.crawlSpacePipes?.crawlSpaceRHOverride ?? 75;
  const e_p_exact = (phi_p_crawl_space / 100) * getSaturatedVaporPressure(t_p_crawl_space);
  const e_p = +e_p_exact.toFixed(2);
  const dew_point_basement = getDewPoint(e_p_exact);

  const delta_t_floor = +((t_v - t_p_crawl_space) / (R_ptp_total * alpha_v_floor)).toFixed(2);
  const tau_v_floor = +(t_v - delta_t_floor).toFixed(2);

  const R_plinth_wall = 1.25;
  const tau_v_basement_wall = +(
    t_p_crawl_space -
    ((t_p_crawl_space - climate.t_heating_period) / (R_plinth_wall * alpha_n_crawl))
  ).toFixed(2);

  const baseLayersExactR: number[] = [];
  const baseLayersExactRp: number[] = [];
  const baseLayersCalculated: CalculatedLayer[] = baseLayersConfig.map((l) => {
    const isIns = l.isInsulation || l.materialId === 'insulation';
    const d = isIns ? delta_base_ins_adopted : l.thickness;
    const baseMat = getMaterialData(l.materialId, isIns);
    const lambda = l.customLambda ?? baseMat.lambda;
    const s = l.customS ?? baseMat.s;
    const mu = l.customMu ?? baseMat.mu;
    const rExact = d / lambda;
    const rpExact = d / mu;
    baseLayersExactR.push(rExact);
    baseLayersExactRp.push(rpExact);
    const r = +rExact.toFixed(4);
    return {
      name: l.name,
      materialName: isIns ? insDef.name : baseMat.name,
      thickness: d,
      lambda,
      R: r,
      s,
      D: +(rExact * s).toFixed(2),
      mu,
      R_p: +rpExact.toFixed(3),
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    };
  });

  // Расчет температурного профиля и влажности перекрытия над техподпольем (точные некругленные R)
  const basementCrossSection: CrossSectionTemperaturePoint[] = [];
  const basementMoisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
    isMidpoint?: boolean;
  }[] = [];

  const R_alpha_v_base_exact = 1 / alpha_v_floor;
  const R_alpha_n_base_exact = 1 / alpha_n_crawl;
  const R_alpha_v_base = +R_alpha_v_base_exact.toFixed(4);
  const R_alpha_n_base = +R_alpha_n_base_exact.toFixed(4);
  const total_R_base_exact =
    R_alpha_v_base_exact + baseLayersExactR.reduce((s, r) => s + r, 0) + R_alpha_n_base_exact;
  const total_Rp_base_exact =
    R_pv + baseLayersExactRp.reduce((s, rp) => s + rp, 0) + R_pn;

  const q_base_heat = (t_v - t_p_crawl_space) / total_R_base_exact;

  // Точка 0: Воздух 1 этажа
  basementCrossSection.push({
    index: 0,
    planeName: 'Внутренний воздух 1 этажа tв',
    layerName: 'Воздушная среда помещения',
    coord_x_mm: 0,
    thickness_mm: 0,
    R_layer: 0,
    R_cumulative: 0,
    temp_winter: t_v,
    temp_heating: t_v,
    E_sat: getSaturatedVaporPressure(t_v),
    e_partial: e_v,
    delta_margin: +(getSaturatedVaporPressure(t_v) - e_v).toFixed(1),
  });

  // Точка 1: Поверхность пола
  const tau_floor_exact = t_v - q_base_heat * R_alpha_v_base_exact;
  const tau_floor = +tau_floor_exact.toFixed(2);
  const E_tau_floor = getSaturatedVaporPressure(tau_floor_exact);
  const e_tau_floor = +(e_v_exact - ((e_v_exact - e_p_exact) / total_Rp_base_exact) * R_pv).toFixed(2);
  basementCrossSection.push({
    index: 1,
    planeName: 'Поверхность пола 1 этажа τв',
    layerName: 'Пограничный слой теплоотдачи пола (1/αв)',
    coord_x_mm: 0,
    thickness_mm: 0,
    R_layer: R_alpha_v_base,
    R_cumulative: R_alpha_v_base,
    temp_winter: tau_floor,
    temp_heating: tau_floor,
    E_sat: E_tau_floor,
    e_partial: e_tau_floor,
    delta_margin: +(E_tau_floor - e_tau_floor).toFixed(1),
  });

  basementMoisturePoints.push({
    x: 0,
    name: 'Поверхность пола',
    temp: tau_floor,
    E: E_tau_floor,
    e: e_tau_floor,
  });

  let cumBaseX_mm = 0;
  let cumBaseR = R_alpha_v_base_exact;
  let cumBaseRp = R_pv;
  let basePtIndex = 2;

  baseLayersCalculated.forEach((layer, idx) => {
    const rExact = baseLayersExactR[idx];
    const rpExact = baseLayersExactRp[idx];
    const isLastLayer = idx === baseLayersCalculated.length - 1;
    const isIns = layer.name.toLowerCase().includes('утепл') || layer.materialName.toLowerCase().includes('плиты');

    // Контрольная точка в середине утеплителя пола
    if (isIns) {
      const halfX_mm = (layer.thickness * 1000) / 2;
      const halfR = rExact / 2;
      const halfRp = rpExact / 2;
      const midCumX_mm = cumBaseX_mm + halfX_mm;
      const midCumR = cumBaseR + halfR;
      const midCumRp = cumBaseRp + halfRp;

      const t_mid_exact = t_v - q_base_heat * midCumR;
      const t_mid = +t_mid_exact.toFixed(2);
      const E_mid = getSaturatedVaporPressure(t_mid_exact);
      const e_mid = +(e_v_exact - ((e_v_exact - e_p_exact) / total_Rp_base_exact) * midCumRp).toFixed(2);

      basementCrossSection.push({
        index: basePtIndex++,
        planeName: 'Середина утеплителя перекрытия (середина слоя)',
        layerName: `${layer.name} (контрольная точка x = ${Math.round(midCumX_mm)} мм)`,
        coord_x_mm: Math.round(midCumX_mm),
        thickness_mm: Math.round(halfX_mm),
        R_layer: +halfR.toFixed(3),
        R_cumulative: +midCumR.toFixed(3),
        temp_winter: t_mid,
        temp_heating: t_mid,
        E_sat: E_mid,
        e_partial: e_mid,
        delta_margin: +(E_mid - e_mid).toFixed(1),
        isInsulationMidpoint: true,
      });

      basementMoisturePoints.push({
        x: +(midCumX_mm / 1000).toFixed(3),
        name: `Середина утеплителя (${Math.round(halfX_mm)} мм)`,
        temp: t_mid,
        E: E_mid,
        e: e_mid,
        isMidpoint: true,
      });
    }

    cumBaseX_mm += layer.thickness * 1000;
    cumBaseR += rExact;
    cumBaseRp += rpExact;

    const t_val_exact = t_v - q_base_heat * cumBaseR;
    const t_val = +t_val_exact.toFixed(2);
    const E_val = getSaturatedVaporPressure(t_val_exact);
    const e_val = +(e_v_exact - ((e_v_exact - e_p_exact) / total_Rp_base_exact) * cumBaseRp).toFixed(2);

    basementCrossSection.push({
      index: basePtIndex++,
      planeName: isLastLayer ? `Потолок подполья τн (${layer.name})` : `Граница: ${layer.name}`,
      layerName: layer.name,
      coord_x_mm: Math.round(cumBaseX_mm),
      thickness_mm: Math.round(layer.thickness * 1000),
      R_layer: layer.R,
      R_cumulative: +cumBaseR.toFixed(3),
      temp_winter: t_val,
      temp_heating: t_val,
      E_sat: E_val,
      e_partial: e_val,
      delta_margin: +(E_val - e_val).toFixed(1),
    });

    basementMoisturePoints.push({
      x: +(cumBaseX_mm / 1000).toFixed(3),
      name: `Граница: ${layer.name}`,
      temp: t_val,
      E: E_val,
      e: e_val,
    });
  });

  // Воздух техподполья (через пограничный слой 1/αн)
  basementCrossSection.push({
    index: basePtIndex++,
    planeName: 'Воздух технического подполья tп',
    layerName: 'Пограничный слой теплоотдачи подполья (1/αн) и среда подполья',
    coord_x_mm: Math.round(cumBaseX_mm),
    thickness_mm: 0,
    R_layer: R_alpha_n_base,
    R_cumulative: +total_R_base_exact.toFixed(3),
    temp_winter: t_p_crawl_space,
    temp_heating: t_p_crawl_space,
    E_sat: getSaturatedVaporPressure(t_p_crawl_space),
    e_partial: e_p,
    delta_margin: +(getSaturatedVaporPressure(t_p_crawl_space) - e_p).toFixed(1),
  });

  const baseMoistureRisk = basementMoisturePoints.some((p) => p.e >= p.E);
  const delta_t_floor_norm = ov.delta_t_norm_basement ?? bTypeDef.delta_t_norm_floor;
  const baseRCompliant = R_ptp_total >= R_ptp_min && R_ptp_total >= bTypeDef.R_norm_basement;

  const baseResult: BasementCalculationResult = {
    construction: baseDef,
    insulation: insDef,
    layers: baseLayersCalculated,
    delta_insulation_calc: +delta_base_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_base_ins_adopted,
    R_ptp: R_ptp_total,
    R_required: R_ptp_min,
    pipeHeatGains_total: totalPipeHeatWatts,
    pipesDetails,
    crawlSpaceTemp_t_p: t_p_crawl_space,
    crawlSpaceRH: phi_p_crawl_space,
    delta_t_floor,
    delta_t_floor_norm,
    tau_v_floor,
    tau_v_basement_wall,
    dew_point_basement,
    isCondensationOnWall: tau_v_basement_wall <= dew_point_basement,
    isRCompliant: baseRCompliant,
    isCompliant:
      baseRCompliant &&
      delta_t_floor <= delta_t_floor_norm &&
      t_p_crawl_space >= 5.0 &&
      tau_v_basement_wall > dew_point_basement,
    moistureCondensationRisk: baseMoistureRisk,
    moisturePoints: basementMoisturePoints,
    crossSectionProfile: basementCrossSection,
  };

  // -------------------------------------------------------------
  // 5. РАСЧЕТ ОКНА И ВОЗДУХОПРОНИЦАЕМОСТИ ПО МЕТОДИКЕ А. С. ШИБЕКО (стр. 45–51)
  //    Таблицы 6.1, 6.2 (по участкам), 6.3 (поэтажный расчет Δp и Rв.тр), 6.4 (классы СТБ 939-2013)
  // -------------------------------------------------------------
  const winDef = WINDOW_VARIANTS[cipher.windowCode] || WINDOW_VARIANTS['О5'];
  const H = winDef.dim.H;
  const B = winDef.dim.B;
  const b1 = winDef.dim.b1;
  const b1_prime = winDef.dim.b1_prime ?? b1;
  const b2 = winDef.dim.b2;
  const b3 = winDef.dim.b3;
  const b3_prime = winDef.dim.b3_prime;
  const b4 = winDef.dim.b4;
  const R_win_trans = ov.windowOverride?.R_glazing ?? winDef.R_sv;
  const R_win_opaque = ov.windowOverride?.R_profile ?? winDef.R_neopr;

  // Таблица 6.2: Поучастковый расчет приведенного сопротивления теплопередаче окна
  const zones: WindowZoneRow[] = [];
  const pushZone = (
    code: string,
    name: string,
    kind: 'opaque' | 'glazing',
    widthMm: number,
    heightMm: number,
    formulaText: string
  ) => {
    const area_m2 = +((Math.max(0, widthMm) * Math.max(0, heightMm)) / 1e6).toFixed(4);
    const R_zone = kind === 'glazing' ? R_win_trans : R_win_opaque;
    const F_over_R = +(area_m2 / R_zone).toFixed(4);
    zones.push({
      code,
      name,
      kind,
      widthMm: Math.round(widthMm),
      heightMm: Math.round(heightMm),
      formulaText,
      area_m2,
      R_zone,
      F_over_R,
    });
  };

  if (winDef.typeScheme === 'I') {
    // Вариант I (рис. 1.4а): две открывающиеся створки
    const h_frame = H - 2 * b1;
    const h_glaz = H - 2 * b1 - 2 * b2;
    const w_sashes_horiz = b3 + b3_prime + 4 * b2;
    pushZone('1', 'Верхний брусок коробки', 'opaque', B, b1, `B × b₁ = ${B} × ${b1}`);
    pushZone('2', 'Нижний брусок коробки', 'opaque', B, b1, `B × b₁ = ${B} × ${b1}`);
    pushZone('3', 'Левый боковой брусок коробки', 'opaque', b1, h_frame, `b₁ × (H − 2b₁) = ${b1} × ${h_frame}`);
    pushZone('4', 'Правый боковой брусок коробки', 'opaque', b1, h_frame, `b₁ × (H − 2b₁) = ${b1} × ${h_frame}`);
    pushZone('5', 'Вертикальный импост', 'opaque', b4, h_frame, `b₄ × (H − 2b₁) = ${b4} × ${h_frame}`);
    pushZone('6', 'Верхние бруски створок', 'opaque', w_sashes_horiz, b2, `(b₃ + b₃' + 4b₂) × b₂ = ${w_sashes_horiz} × ${b2}`);
    pushZone('7', 'Нижние бруски створок', 'opaque', w_sashes_horiz, b2, `(b₃ + b₃' + 4b₂) × b₂ = ${w_sashes_horiz} × ${b2}`);
    pushZone('8', 'Левые вертикальные бруски створок', 'opaque', 2 * b2, h_glaz, `2b₂ × (H − 2b₁ − 2b₂) = ${2 * b2} × ${h_glaz}`);
    pushZone('9', 'Правые вертикальные бруски створок', 'opaque', 2 * b2, h_glaz, `2b₂ × (H − 2b₁ − 2b₂) = ${2 * b2} × ${h_glaz}`);
    pushZone('I', 'Остекление левой створки (Fсв I)', 'glazing', b3, h_glaz, `b₃ × (H − 2b₁ − 2b₂) = ${b3} × ${h_glaz}`);
    pushZone('II', 'Остекление правой створки (Fсв II)', 'glazing', b3_prime, h_glaz, `b₃' × (H − 2b₁ − 2b₂) = ${b3_prime} × ${h_glaz}`);
  } else {
    // Вариант II (рис. 1.4б): левая часть глухая + правая часть открывающаяся
    const b_R = b1 + 2 * b2 + b3;
    const b_L = Math.max(0, B - b_R);
    const h_fixed = H - 2 * b1_prime;
    const h_frame_R = H - 2 * b1;
    const h_glaz_R = H - 2 * b1 - 2 * b2;
    const w_sash_horiz = b3 + 2 * b2;
    pushZone("1'", 'Верхняя коробка глухой части', 'opaque', b_L, b1_prime, `(b₁' + b₃' + b₄) × b₁' = ${b_L} × ${b1_prime}`);
    pushZone("1''", 'Верхняя коробка открывающейся части', 'opaque', b_R, b1, `(b₁ + 2b₂ + b₃) × b₁ = ${b_R} × ${b1}`);
    pushZone("2'", 'Нижняя коробка глухой части', 'opaque', b_L, b1_prime, `(b₁' + b₃' + b₄) × b₁' = ${b_L} × ${b1_prime}`);
    pushZone("2''", 'Нижняя коробка открывающейся части', 'opaque', b_R, b1, `(b₁ + 2b₂ + b₃) × b₁ = ${b_R} × ${b1}`);
    pushZone('3', 'Боковая коробка глухой части', 'opaque', b1_prime, h_fixed, `b₁' × (H − 2b₁') = ${b1_prime} × ${h_fixed}`);
    pushZone('4', 'Боковая коробка открывающейся части', 'opaque', b1, h_frame_R, `b₁ × (H − 2b₁) = ${b1} × ${h_frame_R}`);
    pushZone('5', 'Импост', 'opaque', b4, h_fixed, `b₄ × (H − 2b₁') = ${b4} × ${h_fixed}`);
    pushZone('6', 'Верхний брусок створки', 'opaque', w_sash_horiz, b2, `(b₃ + 2b₂) × b₂ = ${w_sash_horiz} × ${b2}`);
    pushZone('7', 'Нижний брусок створки', 'opaque', w_sash_horiz, b2, `(b₃ + 2b₂) × b₂ = ${w_sash_horiz} × ${b2}`);
    pushZone('8', 'Левый вертикальный брусок створки', 'opaque', b2, h_glaz_R, `b₂ × (H − 2b₁ − 2b₂) = ${b2} × ${h_glaz_R}`);
    pushZone('9', 'Правый вертикальный брусок створки', 'opaque', b2, h_glaz_R, `b₂ × (H − 2b₁ − 2b₂) = ${b2} × ${h_glaz_R}`);
    pushZone('I', 'Остекление глухой части (Fсв I)', 'glazing', b3_prime, h_fixed, `b₃' × (H − 2b₁') = ${b3_prime} × ${h_fixed}`);
    pushZone('II', 'Остекление створки (Fсв II)', 'glazing', b3, h_glaz_R, `b₃ × (H − 2b₁ − 2b₂) = ${b3} × ${h_glaz_R}`);
  }

  const F_win_total = +((H * B) / 1e6).toFixed(4);
  const F_win_trans = +zones
    .filter((z) => z.kind === 'glazing')
    .reduce((sum, z) => sum + z.area_m2, 0)
    .toFixed(4);
  const F_win_opaque = +(F_win_total - F_win_trans).toFixed(4);
  const sum_F_over_R = +(F_win_trans / R_win_trans + F_win_opaque / R_win_opaque).toFixed(4);

  // Приведенное сопротивление теплопередаче окна:
  // Rт.ок = ΣF_i / Σ(F_i / R_i) = Fок / (Fсв / Rсв + Fнепр / Rнепр)
  const R_win_actual = +(F_win_total / (F_win_trans / R_win_trans + F_win_opaque / R_win_opaque)).toFixed(2);

  // Поэтажный расчет воздухопроницаемости окон (Шибеко 2018, п. 6.2, рис. 6.4, табл. 6.3 и 6.4)
  // Расчетная высота здания: H = 1,0 (цоколь) + 3,0·N (этажи) + 2,7 (вытяжная шахта) = 3,7 + 3,0·N
  const terrainType: WindTerrainType = ov.windowTerrainType || 'B';
  const H_building = +(3.7 + 3.0 * cipher.floorsCount).toFixed(1);
  const rho_n = +(353 / (273 + climate.t_coldest_5days_092)).toFixed(3); // плотность наружного воздуха при t_х.5(0.92), кг/м³
  const rho_v = +(353 / (273 + t_v)).toFixed(3); // плотность внутреннего воздуха, кг/м³
  const delta_rho = +(rho_n - rho_v).toFixed(3);
  const G_norm_window = 10.0; // кг/(м²·ч) для окон в ПВХ/алюминиевых переплетах (Шибеко стр. 49)

  const floorsPermeability: FloorWindowPermeability[] = [];
  for (let fl = 1; fl <= cipher.floorsCount; fl++) {
    // Высота центра окна i-го этажа от уровня земли (рис. 6.4 Шибеко): h_i = 2,5 + 3,0·(i − 1)
    const h_floor = +(2.5 + 3.0 * (fl - 1)).toFixed(1);
    const k_i = getWindPressureHeightCoeff(h_floor, terrainType);

    // Разность давлений Δp_i (ф. 6.2 Шибеко, стр. 49):
    // Δp = (H − h_i)·9.81·(ρ_н − ρ_в) + 0.5·ρ_н·v_ср²·(c_н − c_п)·k_i
    const delta_p_grav = +((H_building - h_floor) * 9.81 * delta_rho).toFixed(1);
    const delta_p_wind = +(0.5 * rho_n * climate.wind_speed_winter ** 2 * DELTA_C_AERODYNAMIC * k_i).toFixed(1);
    const delta_p = +(delta_p_grav + delta_p_wind).toFixed(1);

    // Требуемое сопротивление воздухопроницанию (ф. 6.1 Шибеко):
    // R_в.тр = (1 / G_норм) · (Δp / 10)^(2/3), м²·ч/кг
    const R_v_req = +((1 / G_norm_window) * Math.pow(Math.max(1, delta_p) / 10, 2 / 3)).toFixed(3);
    const R_v_max = +(1.2 * R_v_req).toFixed(3);
    const classRange = getWindowClassRangeByRv(R_v_req, R_v_max);

    floorsPermeability.push({
      floor: fl,
      H_building,
      height: h_floor,
      k_i,
      delta_p_grav,
      delta_p_wind,
      delta_p,
      G_v_required: G_norm_window,
      R_v_required: R_v_req,
      R_v_max,
      windowClass: classRange.primaryClass,
      windowClassRangeText: classRange.classText,
    });
  }

  const R_norm_window = ov.R_norm_window ?? bTypeDef.R_norm_window ?? R_NORM.window;
  const winRCompliant = R_win_actual >= R_norm_window && R_win_actual >= bTypeDef.R_norm_window;

  const winResult: WindowCalculationResult = {
    windowDef: winDef,
    area_total: F_win_total,
    area_transparent: F_win_trans,
    area_opaque: F_win_opaque,
    R_opaque: R_win_opaque,
    R_transparent: R_win_trans,
    sum_F_over_R,
    R_actual: R_win_actual,
    R_norm: R_norm_window,
    isCompliant: winRCompliant,
    zones,
    terrainType,
    H_building,
    rho_n,
    rho_v,
    delta_rho,
    v_sr: climate.wind_speed_winter,
    delta_c: DELTA_C_AERODYNAMIC,
    G_norm: G_norm_window,
    floors: floorsPermeability,
  };

  // -------------------------------------------------------------
  // 6. ПРОВЕРКА СООТВЕТСТВИЯ ТРЕБУЕМОМУ СОПРОТИВЛЕНИЮ ТЕПЛОПЕРЕДАЧЕ Rт
  //    ПО ПОСЛЕДНИМ НОРМАМ (СН 2.04.02-2020 ТАБЛ. 7.1, СП 2.04.01-2020)
  // -------------------------------------------------------------
  const wallReqEffective = Math.max(wallResult.R_required, R_wall_norm_latest_req);
  const wallDeficit = +Math.max(0, wallReqEffective - wallResult.R_total).toFixed(2);
  const wallMinDeltaMm = Math.ceil(((wallReqEffective - wallResult.R_without_insulation) * insLambda) * 100) * 10;
  const wallSurfaceOk = wallResult.tau_v_min > wallResult.dew_point && wallResult.delta_t_actual <= wallResult.delta_t_norm;

  const roofReqEffective = Math.max(roofResult.R_required, R_roof_norm_latest_req);
  const roofDeficit = +Math.max(0, roofReqEffective - roofResult.R_total).toFixed(2);
  const roofMinDeltaMm = Math.ceil(((roofReqEffective - R_roof_without_ins) * roofInsLambda) * 100) * 10;
  const roofSurfaceOk = roofResult.tau_v_min > roofResult.dew_point && roofResult.delta_t_actual <= roofResult.delta_t_norm;

  const baseReqEffective = Math.max(baseResult.R_required, bTypeDef.R_norm_basement);
  const baseDeficit = +Math.max(0, baseReqEffective - baseResult.R_ptp).toFixed(2);
  const baseMinDeltaMm = Math.max(50, Math.ceil(((baseReqEffective - R_ptp_without_ins) * baseInsLambda) * 100) * 10);
  const baseSurfaceOk =
    baseResult.delta_t_floor <= baseResult.delta_t_floor_norm &&
    baseResult.crawlSpaceTemp_t_p >= 5.0 &&
    !baseResult.isCondensationOnWall;

  const winReqEffective = Math.max(winResult.R_norm, bTypeDef.R_norm_window);
  const winDeficit = +Math.max(0, winReqEffective - winResult.R_actual).toFixed(2);

  const normativeChecks: NormativeRCheck[] = [
    {
      id: 'wall',
      tabId: 'wall',
      title: 'Наружная стена',
      constructionCode: wallResult.construction.id,
      R_actual: wallResult.R_total,
      R_required: wallReqEffective,
      R_norm_base: bTypeDef.R_norm_wall,
      deficit: wallDeficit,
      isRCompliant: wallResult.isRCompliant,
      isSurfaceTempCompliant: wallSurfaceOk,
      isFullyCompliant: wallResult.isCompliant,
      normReference: `СН 2.04.02-2020, табл. 7.1 (Rт.норм = ${bTypeDef.R_norm_wall} м²·°С/Вт, n = ${n_wall})`,
      warningMessage: !wallResult.isRCompliant
        ? `Фактическое сопротивление теплопередаче наружной стены Rт = ${wallResult.R_total} м²·°С/Вт ниже требуемого Rт.тр = ${wallReqEffective} м²·°С/Вт (дефицит ${wallDeficit} м²·°С/Вт).`
        : !wallSurfaceOk
        ? `Нарушено санитарно-гигиеническое условие для стены: τв.min = ${wallResult.tau_v_min} °C (tр = ${wallResult.dew_point} °C), Δtв = ${wallResult.delta_t_actual} °C (норма ≤ ${wallResult.delta_t_norm} °C).`
        : null,
      recommendation: !wallResult.isRCompliant
        ? `Увеличьте толщину утеплителя ${insDef.id} не менее чем до ${wallMinDeltaMm} мм (либо сбросьте ручное переопределение толщины/норматива).`
        : null,
    },
    {
      id: 'roof',
      tabId: 'roof',
      title: 'Покрытие / чердачное перекрытие',
      constructionCode: roofResult.construction.id,
      R_actual: roofResult.R_total,
      R_required: roofReqEffective,
      R_norm_base: bTypeDef.R_norm_roof,
      deficit: roofDeficit,
      isRCompliant: roofResult.isRCompliant,
      isSurfaceTempCompliant: roofSurfaceOk,
      isFullyCompliant: roofResult.isCompliant,
      normReference: `СН 2.04.02-2020, табл. 7.1 (Rт.норм = ${bTypeDef.R_norm_roof} м²·°С/Вт, n = ${n_roof})`,
      warningMessage: !roofResult.isRCompliant
        ? `Фактическое сопротивление теплопередаче покрытия Rт = ${roofResult.R_total} м²·°С/Вт ниже требуемого Rт.тр = ${roofReqEffective} м²·°С/Вт (дефицит ${roofDeficit} м²·°С/Вт).`
        : !roofSurfaceOk
        ? `Нарушено санитарно-гигиеническое условие для покрытия: τв.min = ${roofResult.tau_v_min} °C (tр = ${roofResult.dew_point} °C), Δtв = ${roofResult.delta_t_actual} °C (норма ≤ ${roofResult.delta_t_norm} °C).`
        : null,
      recommendation: !roofResult.isRCompliant
        ? `Увеличьте толщину утеплителя ${insDef.id} в покрытии не менее чем до ${roofMinDeltaMm} мм.`
        : null,
    },
    {
      id: 'basement',
      tabId: 'basement',
      title: 'Перекрытие над техподпольем',
      constructionCode: baseResult.construction.id,
      R_actual: baseResult.R_ptp,
      R_required: baseReqEffective,
      R_norm_base: bTypeDef.R_norm_basement,
      deficit: baseDeficit,
      isRCompliant: baseResult.isRCompliant,
      isSurfaceTempCompliant: baseSurfaceOk,
      isFullyCompliant: baseResult.isCompliant,
      normReference: `СН 2.04.02-2020, табл. 7.1; СП 2.04.01-2020 (Rт.ПТП ≥ ${baseReqEffective}, Δtв.п ≤ ${baseResult.delta_t_floor_norm} °C)`,
      warningMessage: !baseResult.isRCompliant
        ? `Сопротивление теплопередаче перекрытия над техподпольем Rт.ПТП = ${baseResult.R_ptp} м²·°С/Вт ниже требуемого Rт.тр = ${baseReqEffective} м²·°С/Вт (дефицит ${baseDeficit} м²·°С/Вт).`
        : !baseSurfaceOk
        ? `Нарушен тепловой режим техподполья: Δtв.п = ${baseResult.delta_t_floor} °C (норма ≤ ${baseResult.delta_t_floor_norm} °C), tп = ${baseResult.crawlSpaceTemp_t_p} °C (норма ≥ 5 °C).`
        : null,
      recommendation: !baseResult.isRCompliant
        ? `Увеличьте толщину утеплителя перекрытия над подпольем до ${baseMinDeltaMm} мм.`
        : null,
    },
    {
      id: 'window',
      tabId: 'windows',
      title: 'Оконное заполнение',
      constructionCode: winResult.windowDef.id,
      R_actual: winResult.R_actual,
      R_required: winReqEffective,
      R_norm_base: bTypeDef.R_norm_window,
      deficit: winDeficit,
      isRCompliant: winResult.isCompliant,
      isSurfaceTempCompliant: true,
      isFullyCompliant: winResult.isCompliant,
      normReference: `СН 2.04.02-2020, табл. 7.1 (Rт.норм = ${bTypeDef.R_norm_window.toFixed(1)} м²·°С/Вт)`,
      warningMessage: !winResult.isCompliant
        ? `Приведенное сопротивление теплопередаче окна ${winResult.windowDef.id} Rт.ок = ${winResult.R_actual} м²·°С/Вт ниже нормативного Rт.норм = ${winReqEffective.toFixed(1)} м²·°С/Вт (дефицит ${winDeficit} м²·°С/Вт).`
        : null,
      recommendation: !winResult.isCompliant
        ? `Замените оконный блок на вариант с более теплым двухкамерным стеклопакетом (Rсв ≥ 1.05 м²·°С/Вт) или более теплым ПВХ-профилем.`
        : null,
    },
  ];

  const normativeWarnings = normativeChecks.filter((c) => !c.isFullyCompliant);

  const totalCompliance =
    wallResult.isCompliant &&
    roofResult.isCompliant &&
    baseResult.isCompliant &&
    winResult.isCompliant;

  return {
    cipher,
    climate,
    internalConditions: {
      t_v,
      phi_v,
      e_v,
      E_v,
      dew_point: dew_point_internal,
      zone: 'Зона 2 (Нормальная)',
      humidityRegime,
      humidityRegimeName: getHumidityRegimeName(humidityRegime, t_v),
      exploitationConditions: expCond,
      operatingConditionMode: opMode,
      buildingTypeId: bTypeKey,
      buildingTypeName: bTypeDef.name,
    },
    wall: wallResult,
    roof: roofResult,
    basement: baseResult,
    window: winResult,
    normativeChecks,
    normativeWarnings,
    summary: {
      totalCompliance,
      gradePoints: totalCompliance ? 10 : 8,
    },
  };
}

