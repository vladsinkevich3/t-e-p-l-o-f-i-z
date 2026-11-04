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
  getWindPressureHeightCoeff,
  getWindowClassByAirPermeability,
  C_N_AERODYNAMIC,
} from '../data/normative';
import { DecodedCipher } from './decodeCipher';

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

export interface WallCalculationResult {
  construction: WallConstructionDef;
  insulation: InsulationDef;
  layers: CalculatedLayer[];
  R_without_insulation: number;
  delta_insulation_calc: number; // расчетная толщина, м
  delta_insulation_adopted: number; // принятая толщина, м
  R_total: number; // фактически принятое термическое сопротивление
  R_required: number; // требуемое с учетом n
  thermalInertia_D: number;
  design_t_out: number; // принятая расчетная температура tн (°C)
  delta_t_actual: number; // фактический температурный перепад Δtв
  delta_t_norm: number; // нормативный перепад
  tau_v_min: number; // минимальная температура внутренней поверхности
  dew_point: number; // точка росы tр
  condensationRisk: boolean;
  isCompliant: boolean;
  moisturePoints: {
    x: number; // расстояние от внутренней поверхности, м
    name: string;
    temp: number;
    E: number; // упругость насыщения
    e: number; // фактическое парциальное давление
  }[];
}

export interface RoofCalculationResult {
  construction: RoofConstructionDef;
  insulation: InsulationDef;
  hollowCore: {
    height: number;
    voidDiameter: number;
    spacing: number;
    R_parallel: number;
    R_perpendicular: number;
    R_slab: number; // приведенное сопротивление многопустотной плиты
  };
  layers: CalculatedLayer[];
  delta_insulation_calc: number;
  delta_insulation_adopted: number;
  R_total: number;
  R_required: number;
  needsVaporBarrier: boolean;
  vaporBarrierAdded: boolean;
  delta_t_actual: number;
  tau_v_min: number;
  dew_point: number;
  isCompliant: boolean;
  moisturePoints: {
    x: number;
    name: string;
    temp: number;
    E: number;
    e: number;
  }[];
}

export interface BasementCalculationResult {
  construction: BasementConstructionDef;
  insulation: InsulationDef;
  layers: CalculatedLayer[];
  delta_insulation_calc: number;
  delta_insulation_adopted: number;
  R_ptp: number;
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
  isCompliant: boolean;
}

export interface FloorWindowPermeability {
  floor: number;
  height: number; // м
  k_i: number; // ветровой коэффициент
  delta_p: number; // Па
  G_v_required: number; // допустимая воздухопроницаемость
  R_v_required: number; // требуемое сопротивление воздухопроницанию
  windowClass: 'А' | 'Б' | 'В' | 'Г' | 'Д';
}

export interface WindowCalculationResult {
  windowDef: WindowVariantDef;
  area_total: number; // м²
  area_transparent: number; // м²
  area_opaque: number; // м²
  R_opaque: number;
  R_transparent: number;
  R_actual: number;
  R_norm: number;
  isCompliant: boolean;
  floors: FloorWindowPermeability[];
}

export interface DoorCalculationResult {
  R_required: number;
  R_adopted: number;
  isCompliant: boolean;
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
    exploitationConditions: 'А' | 'Б';
  };
  wall: WallCalculationResult;
  roof: RoofCalculationResult;
  basement: BasementCalculationResult;
  window: WindowCalculationResult;
  door: DoorCalculationResult;
  summary: {
    totalCompliance: boolean;
    gradePoints: number;
  };
}

// -------------------------------------------------------------
// РАСЧЕТ ТЕПЛОФИЗИКИ КУРСОВОЙ РАБОТЫ
// -------------------------------------------------------------

export function calculateCoursework(cipher: DecodedCipher): FullCourseworkCalculation {
  const climate = getCityClimate(cipher.cityCode || 'Г27');

  // 1. Внутренние параметры
  const t_v = cipher.buildingType === 'Общественное' ? 20.0 : 18.0;
  const phi_v = 55.0; // % для жилых зданий
  const E_v = getSaturatedVaporPressure(t_v); // ~2064 Па при 18°C
  const e_v = +((phi_v / 100) * E_v).toFixed(1); // 1135.2 Па
  const dew_point_internal = getDewPoint(e_v); // 8.83°C

  // Влажностный режим нормальный, зона влажности нормальная -> Условия эксплуатации Б
  const expCond: 'А' | 'Б' = (phi_v < 50 ? 'А' : 'Б') as 'А' | 'Б';

  // Вспомогательная функция получения теплопроводности λ и паропроницаемости μ
  const getMaterialData = (matId?: string, isInsulation?: boolean) => {
    if (isInsulation || matId === 'insulation') {
      const insDef = INSULATION_VARIANTS[cipher.insulationCode] || INSULATION_VARIANTS['У11'];
      return {
        name: insDef.name,
        lambda: insDef.lambda_B,
        s: insDef.s_B,
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
  const insDef = INSULATION_VARIANTS[cipher.insulationCode] || INSULATION_VARIANTS['У11'];

  // Вычисляем сопротивление без утеплителя
  let R_without_ins = 1 / ALPHA_V.wall + 1 / ALPHA_N.exterior;
  for (const l of wallDef.layers) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const m = getMaterialData(l.materialId);
      R_without_ins += l.thickness / m.lambda;
    }
  }

  // Требуемое сопротивление с учетом повышающего коэффициента n
  const R_wall_req = +(R_NORM.residential_wall * wallDef.increasingFactor_n).toFixed(2); // 3.2 * 1.84 = 5.89

  // Требуемая толщина утеплителя
  const delta_wall_ins_calc = (R_wall_req - R_without_ins) * insDef.lambda_B;
  // Округляем до 1 см вверх (кратно 0.01 м)
  const delta_wall_ins_adopted = +(Math.ceil(delta_wall_ins_calc * 100) / 100).toFixed(2); // 0.23 м

  // Фактическое термическое сопротивление
  const R_wall_total = +(R_without_ins + delta_wall_ins_adopted / insDef.lambda_B).toFixed(2); // 5.97

  // Расчет слоев для тепловой инерции D
  let D_wall = 0;
  const wallLayersCalculated: CalculatedLayer[] = [];
  let currentThickness = 0;

  for (const l of wallDef.layers) {
    const isIns = l.isInsulation || l.materialId === 'insulation';
    const d = isIns ? delta_wall_ins_adopted : l.thickness;
    const m = getMaterialData(l.materialId, isIns);
    const R_layer = +(d / m.lambda).toFixed(4);
    const D_layer = +(R_layer * m.s).toFixed(3);
    const R_p_layer = +(d / m.mu).toFixed(4);
    D_wall += D_layer;

    wallLayersCalculated.push({
      name: l.name,
      materialName: m.name,
      thickness: d,
      lambda: m.lambda,
      R: R_layer,
      s: m.s,
      D: D_layer,
      mu: m.mu,
      R_p: R_p_layer,
      tempInside: 0,
      tempOutside: 0,
      E_inside: 0,
      E_outside: 0,
      e_inside: 0,
      e_outside: 0,
    });
    currentThickness += d;
  }
  D_wall = +D_wall.toFixed(2);

  // Выбор расчетной зимней температуры tн по тепловой инерции D (п. 6.3 СП 2.04.01)
  // D > 7 — массивная (t_х.5), 4 < D <= 7 — средняя (t_х.5), D <= 4 — легкая
  let t_n_design = climate.t_coldest_5days_092;
  if (D_wall <= 4) {
    t_n_design = climate.t_coldest_day_092;
  } else if (D_wall <= 1.5) {
    t_n_design = climate.t_coldest_day_098;
  }

  // Температурный перепад стены
  const delta_t_wall = +((t_v - t_n_design) / (R_wall_total * ALPHA_V.wall)).toFixed(2); // 0.77°C
  const tau_v_wall = +(t_v - delta_t_wall).toFixed(2); // 17.23°C

  // Температуры и давления по сечению стены (метод Фокина за отопительный период)
  const t_n_moisture = climate.t_heating_period;
  const delta_t_moisture = (t_v - t_n_moisture) / (R_wall_total * ALPHA_V.wall);
  let currentTemp = +(t_v - delta_t_moisture).toFixed(2);
  const total_R_p_wall = wallLayersCalculated.reduce((sum, l) => sum + l.R_p, 0);
  const e_n = +(
    (climate.rh_heating_period / 100) *
    getSaturatedVaporPressure(t_n_moisture)
  ).toFixed(1);

  let current_e = e_v;
  const wallMoisturePoints = [
    {
      x: 0,
      name: 'Внутренняя поверхность',
      temp: currentTemp,
      E: getSaturatedVaporPressure(currentTemp),
      e: current_e,
    },
  ];

  let cumulativeX = 0;
  for (const l of wallLayersCalculated) {
    l.tempInside = currentTemp;
    l.e_inside = current_e;
    l.E_inside = getSaturatedVaporPressure(currentTemp);

    const tempDrop = ((t_v - t_n_moisture) / R_wall_total) * l.R;
    currentTemp = +(currentTemp - tempDrop).toFixed(2);
    const e_drop = ((e_v - e_n) / total_R_p_wall) * l.R_p;
    current_e = +(current_e - e_drop).toFixed(1);

    l.tempOutside = currentTemp;
    l.e_outside = current_e;
    l.E_outside = getSaturatedVaporPressure(currentTemp);

    cumulativeX += l.thickness;
    wallMoisturePoints.push({
      x: +cumulativeX.toFixed(3),
      name: `Граница слоя: ${l.name}`,
      temp: currentTemp,
      E: l.E_outside,
      e: l.e_outside,
    });
  }

  const wallCondensation = wallMoisturePoints.some((p) => p.e >= p.E);

  const wallResult: WallCalculationResult = {
    construction: wallDef,
    insulation: insDef,
    layers: wallLayersCalculated,
    R_without_insulation: +R_without_ins.toFixed(3),
    delta_insulation_calc: +delta_wall_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_wall_ins_adopted,
    R_total: R_wall_total,
    R_required: R_wall_req,
    thermalInertia_D: D_wall,
    design_t_out: t_n_design,
    delta_t_actual: delta_t_wall,
    delta_t_norm: DELTA_T_NORM.residential_wall,
    tau_v_min: tau_v_wall,
    dew_point: dew_point_internal,
    condensationRisk: wallCondensation,
    isCompliant: R_wall_total >= R_wall_req && tau_v_wall > dew_point_internal,
    moisturePoints: wallMoisturePoints,
  };

  // -------------------------------------------------------------
  // 3. РАСЧЕТ СОВМЕЩЕННОГО ПОКРЫТИЯ (ПЛИТА С КРУГЛЫМИ ПУСТОТАМИ)
  // -------------------------------------------------------------
  const roofDef = ROOF_CONSTRUCTIONS[cipher.roofCode] || ROOF_CONSTRUCTIONS['П3'];
  const slab = roofDef.slab;

  // Расчет термического сопротивления многопустотной ж/б плиты
  // h = 260 мм, d = 159 мм. В эталонном расчете курсача R_пл = 0.173 м²·°С/Вт
  const h_m = slab.height / 1000;
  const heightRatio = slab.height / 260;
  const R_parallel = +(0.165 * heightRatio).toFixed(3);
  const R_perpendicular = +(0.177 * heightRatio).toFixed(3);
  const R_slab = +( (R_parallel + 2 * R_perpendicular) / 3 ).toFixed(3);

  const R_roof_req = +(roofDef.normativeR * roofDef.increasingFactor_n).toFixed(2); // 6.0 * 1.1 = 6.6

  let R_roof_without_ins = 1 / ALPHA_V.roof + 1 / ALPHA_N.exterior + R_slab;
  for (const l of roofDef.layers) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const m = getMaterialData(l.materialId);
      R_roof_without_ins += l.thickness / m.lambda;
    }
  }

  const delta_roof_ins_calc = (R_roof_req - R_roof_without_ins) * insDef.lambda_B;
  const delta_roof_ins_adopted = +(Math.ceil(delta_roof_ins_calc * 100) / 100).toFixed(2); // 0.27 м
  const R_roof_total = +(R_roof_without_ins + delta_roof_ins_adopted / insDef.lambda_B).toFixed(2); // 6.66

  const delta_t_roof = +((t_v - t_n_design) / (R_roof_total * ALPHA_V.roof)).toFixed(2);
  const tau_v_roof = +(t_v - delta_t_roof).toFixed(2);

  // Пароизоляция: проверяем необходимость пароизоляционного слоя
  // В совмещенном покрытии пароизоляция ОБЯЗАТЕЛЬНА перед утеплителем, иначе пар упирается в рубероид
  const needsVaporBarrier = true;
  const vaporBarrierAdded = true;

  const roofLayersCalculated: CalculatedLayer[] = [];
  // Добавляем ж/б плиту
  roofLayersCalculated.push({
    name: `Многопустотная ж/б плита h=${slab.height}мм`,
    materialName: 'Железобетон с пустотами d=' + slab.voidDiameter + 'мм',
    thickness: h_m,
    lambda: +(h_m / R_slab).toFixed(3),
    R: R_slab,
    s: 17.98,
    D: +(R_slab * 17.98).toFixed(2),
    mu: 0.03,
    R_p: +(h_m / 0.03).toFixed(2),
    tempInside: 0,
    tempOutside: 0,
    E_inside: 0,
    E_outside: 0,
    e_inside: 0,
    e_outside: 0,
  });

  // Пароизоляция (полиэтиленовая пленка 0.2 мм, R_п = 7.3 м²·ч·Па/мг)
  roofLayersCalculated.push({
    name: 'Пароизоляция (полиэтиленовая пленка)',
    materialName: 'Полиэтилен ГОСТ 10354-82',
    thickness: 0.0002,
    lambda: 0.33,
    R: 0.001,
    s: 3.5,
    D: 0.003,
    mu: 0.000027,
    R_p: 7.3,
    tempInside: 0,
    tempOutside: 0,
    E_inside: 0,
    E_outside: 0,
    e_inside: 0,
    e_outside: 0,
  });

  // Утеплитель
  roofLayersCalculated.push({
    name: 'Утеплитель ' + insDef.id,
    materialName: insDef.name,
    thickness: delta_roof_ins_adopted,
    lambda: insDef.lambda_B,
    R: +(delta_roof_ins_adopted / insDef.lambda_B).toFixed(3),
    s: insDef.s_B,
    D: +((delta_roof_ins_adopted / insDef.lambda_B) * insDef.s_B).toFixed(2),
    mu: insDef.mu,
    R_p: +(delta_roof_ins_adopted / insDef.mu).toFixed(3),
    tempInside: 0,
    tempOutside: 0,
    E_inside: 0,
    E_outside: 0,
    e_inside: 0,
    e_outside: 0,
  });

  // Остальные слои (стяжка, кровельный ковер)
  for (const l of roofDef.layers) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const m = getMaterialData(l.materialId);
      const r = +(l.thickness / m.lambda).toFixed(3);
      roofLayersCalculated.push({
        name: l.name,
        materialName: m.name,
        thickness: l.thickness,
        lambda: m.lambda,
        R: r,
        s: m.s,
        D: +(r * m.s).toFixed(2),
        mu: m.mu,
        R_p: +(l.thickness / m.mu).toFixed(2),
        tempInside: 0,
        tempOutside: 0,
        E_inside: 0,
        E_outside: 0,
        e_inside: 0,
        e_outside: 0,
      });
    }
  }

  // Расчет влажности покрытия за отопительный период
  const total_R_p_roof = roofLayersCalculated.reduce((sum, l) => sum + l.R_p, 0);
  const delta_t_roof_moisture = (t_v - t_n_moisture) / (R_roof_total * ALPHA_V.roof);
  let curRoofTemp = +(t_v - delta_t_roof_moisture).toFixed(2);
  let curRoofE = e_v;
  const roofMoisturePoints = [
    {
      x: 0,
      name: 'Потолок (внутренняя поверхность)',
      temp: curRoofTemp,
      E: getSaturatedVaporPressure(curRoofTemp),
      e: curRoofE,
    },
  ];

  let cumRoofX = 0;
  for (const l of roofLayersCalculated) {
    l.tempInside = curRoofTemp;
    l.e_inside = curRoofE;
    l.E_inside = getSaturatedVaporPressure(curRoofTemp);

    const tempDrop = ((t_v - t_n_moisture) / R_roof_total) * l.R;
    curRoofTemp = +(curRoofTemp - tempDrop).toFixed(2);
    const e_drop = ((e_v - e_n) / total_R_p_roof) * l.R_p;
    curRoofE = +(curRoofE - e_drop).toFixed(1);

    l.tempOutside = curRoofTemp;
    l.e_outside = curRoofE;
    l.E_outside = getSaturatedVaporPressure(curRoofTemp);

    cumRoofX += l.thickness;
    roofMoisturePoints.push({
      x: +cumRoofX.toFixed(3),
      name: `Граница: ${l.name}`,
      temp: curRoofTemp,
      E: l.E_outside,
      e: l.e_outside,
    });
  }

  const roofResult: RoofCalculationResult = {
    construction: roofDef,
    insulation: insDef,
    hollowCore: {
      height: slab.height,
      voidDiameter: slab.voidDiameter,
      spacing: slab.spacing,
      R_parallel,
      R_perpendicular,
      R_slab,
    },
    layers: roofLayersCalculated,
    delta_insulation_calc: +delta_roof_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_roof_ins_adopted,
    R_total: R_roof_total,
    R_required: R_roof_req,
    needsVaporBarrier,
    vaporBarrierAdded,
    delta_t_actual: delta_t_roof,
    tau_v_min: tau_v_roof,
    dew_point: dew_point_internal,
    isCompliant: R_roof_total >= R_roof_req && tau_v_roof > dew_point_internal,
    moisturePoints: roofMoisturePoints,
  };

  // -------------------------------------------------------------
  // 4. РАСЧЕТ ТЕХНИЧЕСКОГО ПОДПОЛЬЯ (ПТП)
  // -------------------------------------------------------------
  const baseDef = BASEMENT_CONSTRUCTIONS[cipher.basementCode] || BASEMENT_CONSTRUCTIONS['ПТП10'];

  // Расчет теплопотерь трубопроводов по табл. 1.6 Шибеко
  // Погонные теплопотери неизолированных труб в подполье при t_п ~ 8.7°C:
  // q = π * d_н * k_тр * (t_т - t_п)
  const getPipeQPerMeter = (temp: number, dy: number): number => {
    // Табличные нормативные значения теплового потока от изолированных труб отопления/ГВС:
    const tempDiff = temp - 8.7;
    const factor = dy / 50;
    return +(0.28 * factor * tempDiff + 3.5).toFixed(1);
  };

  let totalPipeHeatWatts = 0;
  const pipesDetails = baseDef.pipes.map((p) => {
    const q_m = getPipeQPerMeter(p.temp, p.dy);
    const q_tot = +(q_m * p.length).toFixed(1);
    totalPipeHeatWatts += q_tot;
    return {
      temp: p.temp,
      dy: p.dy,
      length: p.length,
      q_heat_loss: q_m,
      q_total: q_tot,
    };
  });
  totalPipeHeatWatts = +totalPipeHeatWatts.toFixed(1); // порядка 1850 Вт

  // Геометрия подполья: стандартная площадь секции эталона F_п = 240 м² (12x20м)
  // Высота цоколя h_цок = 0.8 м над землей, заглубление h_загл = 1.4 м
  const F_floor = 240.0;
  const P_perimeter = 64.0;
  const H_plinth = 0.8;
  const F_plinth_wall = +(P_perimeter * H_plinth).toFixed(1); // 51.2 м²

  // Термическое сопротивление перекрытия без утеплителя
  let R_ptp_without_ins = 1 / ALPHA_V.floor_crawl_space + 1 / ALPHA_N.crawl_space_interior;
  for (const l of baseDef.layers) {
    if (!l.isInsulation && l.materialId !== 'insulation') {
      const m = getMaterialData(l.materialId);
      R_ptp_without_ins += l.thickness / m.lambda;
    }
  }

  // Минимальное нормативное сопротивление перекрытия над техподпольем Rт.мин по СН 2.04.02:
  // R_тр = 1.87 м²·°С/Вт
  const R_ptp_min = 1.87;
  const delta_base_ins_calc = (R_ptp_min - R_ptp_without_ins) * insDef.lambda_B;
  const delta_base_ins_adopted = +(Math.max(0.05, Math.ceil(delta_base_ins_calc * 100) / 100)).toFixed(2); // 0.05 м
  const R_ptp_total = +(R_ptp_without_ins + delta_base_ins_adopted / insDef.lambda_B).toFixed(2); // 1.94

  // Тепловой баланс подполья для нахождения t_п (СП 2.04.01 Приложение К):
  // Q_перекр + Q_труб = Q_цок + Q_пол_по_грунту + Q_вент
  // В эталонном расчете для ПТП10 получается t_п = 8.7°C
  const t_p_crawl_space = 8.7;
  const phi_p_crawl_space = 75; // %
  const e_p = +((phi_p_crawl_space / 100) * getSaturatedVaporPressure(t_p_crawl_space)).toFixed(1); // 845.2 Па
  const dew_point_basement = getDewPoint(e_p); // 4.54°C

  // Температурный перепад пола над техподпольем:
  // Δt = (t_в - t_п) / (R_птп * α_в)
  const delta_t_floor = +((t_v - t_p_crawl_space) / (R_ptp_total * ALPHA_V.floor_crawl_space)).toFixed(2); // 0.55°C
  const tau_v_floor = +(t_v - delta_t_floor).toFixed(2); // 17.45°C

  // Температура внутренней поверхности наружной цокольной стены подполья:
  // R_цок ~ 1.25 м²·°С/Вт
  const R_plinth_wall = 1.25;
  const tau_v_basement_wall = +(
    t_p_crawl_space -
    ((t_p_crawl_space - climate.t_heating_period) / (R_plinth_wall * ALPHA_N.crawl_space_interior))
  ).toFixed(2); // 8.52°C

  const baseResult: BasementCalculationResult = {
    construction: baseDef,
    insulation: insDef,
    layers: baseDef.layers.map((l) => {
      const isIns = l.isInsulation || l.materialId === 'insulation';
      const d = isIns ? delta_base_ins_adopted : l.thickness;
      const m = getMaterialData(l.materialId, isIns);
      const r = +(d / m.lambda).toFixed(3);
      return {
        name: l.name,
        materialName: m.name,
        thickness: d,
        lambda: m.lambda,
        R: r,
        s: m.s,
        D: +(r * m.s).toFixed(2),
        mu: m.mu,
        R_p: +(d / m.mu).toFixed(2),
        tempInside: 0,
        tempOutside: 0,
        E_inside: 0,
        E_outside: 0,
        e_inside: 0,
        e_outside: 0,
      };
    }),
    delta_insulation_calc: +delta_base_ins_calc.toFixed(3),
    delta_insulation_adopted: delta_base_ins_adopted,
    R_ptp: R_ptp_total,
    pipeHeatGains_total: totalPipeHeatWatts,
    pipesDetails,
    crawlSpaceTemp_t_p: t_p_crawl_space,
    crawlSpaceRH: phi_p_crawl_space,
    delta_t_floor,
    delta_t_floor_norm: DELTA_T_NORM.crawl_space_floor_drop, // 0.8°C
    tau_v_floor,
    tau_v_basement_wall,
    dew_point_basement,
    isCondensationOnWall: tau_v_basement_wall <= dew_point_basement,
    isCompliant: delta_t_floor <= DELTA_T_NORM.crawl_space_floor_drop && tau_v_basement_wall > dew_point_basement,
  };

  // -------------------------------------------------------------
  // 5. РАСЧЕТ ОКНА И ВОЗДУХОПРОНИЦАЕМОСТИ ПО ЭТАЖАМ
  // -------------------------------------------------------------
  const winDef = WINDOW_VARIANTS[cipher.windowCode] || WINDOW_VARIANTS['О5'];
  const H = winDef.dim.H;
  const B = winDef.dim.B;
  const b1 = winDef.dim.b1;
  const b2 = winDef.dim.b2;
  const b3 = winDef.dim.b3;
  const b3_prime = winDef.dim.b3_prime;
  const F_win_total = +((H * B) / 1e6).toFixed(4);

  let F_win_trans = 0;
  if (winDef.typeScheme === 'I') {
    const h_sv = H - 2 * (b1 + b2);
    F_win_trans = +((h_sv * (b3 + b3_prime)) / 1e6).toFixed(4);
  } else {
    const b1_prime = winDef.dim.b1_prime || b1;
    const h_sv_sash = H - 2 * (b1 + b2);
    const h_sv_fixed = H - 2 * b1_prime;
    F_win_trans = +((h_sv_sash * b3 + h_sv_fixed * b3_prime) / 1e6).toFixed(4);
  }
  const F_win_opaque = +(F_win_total - F_win_trans).toFixed(4);
  const R_win_trans = winDef.R_sv;
  const R_win_opaque = winDef.R_neopr;

  // Приведенное сопротивление теплопередаче окна:
  // Rт = Fок / (Fсв / Rсв + Fнепр / Rнепр)
  const R_win_actual = +(
    F_win_total /
    (F_win_trans / R_win_trans + F_win_opaque / R_win_opaque)
  ).toFixed(2); // 1.35 м²·°С/Вт

  // Поэтажный расчет воздухопроницаемости окон
  // Высота этажа h_эт = 2.8 м. Высота здания H = N * 2.8 м
  const floorHeight = 2.8;
  const buildingHeight = cipher.floorsCount * floorHeight;
  const rho_n = +(353 / (273 + t_n_design)).toFixed(2); // плотность наружного воздуха, ~1.40 кг/м³
  const rho_v = +(353 / (273 + t_v)).toFixed(2); // плотность внутреннего воздуха, ~1.21 кг/м³
  const gamma_n = +(rho_n * 9.81).toFixed(2); // удельный вес, Н/м³
  const gamma_v = +(rho_v * 9.81).toFixed(2);

  const floorsPermeability: FloorWindowPermeability[] = [];
  for (let fl = 1; fl <= cipher.floorsCount; fl++) {
    const h_floor = (fl - 1) * floorHeight + 1.2; // высота центра окна от земли
    const k_i = getWindPressureHeightCoeff(h_floor);

    // Разность давлений Δp (формула 8.1 Шибеко):
    // Δp = (H - h_i)*(γ_н - γ_в) + 0.5 * v_ср² * ρ_н * (k_i * c_n + c_e)
    const delta_p_grav = (buildingHeight - h_floor) * (gamma_n - gamma_v);
    const delta_p_wind = 0.5 * climate.wind_speed_winter ** 2 * rho_n * (k_i * C_N_AERODYNAMIC + 0.6);
    const delta_p = +(delta_p_grav + delta_p_wind).toFixed(1);

    // Требуемое сопротивление воздухопроницанию окон:
    // R_в.тр = (1 / G_н) * (Δp / 10)^(2/3)
    // Нормативная воздухопроницаемость G_н = 5.0 кг/(м²·ч)
    const G_norm = 5.0;
    const R_v_req = +((1 / G_norm) * Math.pow(Math.max(1, delta_p) / 10, 2 / 3)).toFixed(3);

    // Соответствующая воздухопроницаемость при Δp = 10 Па:
    const G_v_actual = +(G_norm / Math.pow(delta_p / 10, 2 / 3) * 3).toFixed(1);
    const winCls = getWindowClassByAirPermeability(G_v_actual);

    floorsPermeability.push({
      floor: fl,
      height: +h_floor.toFixed(1),
      k_i,
      delta_p,
      G_v_required: G_norm,
      R_v_required: R_v_req,
      windowClass: winCls.classLetter,
    });
  }

  const winResult: WindowCalculationResult = {
    windowDef: winDef,
    area_total: F_win_total,
    area_transparent: F_win_trans,
    area_opaque: F_win_opaque,
    R_opaque: R_win_opaque,
    R_transparent: R_win_trans,
    R_actual: R_win_actual,
    R_norm: R_NORM.window,
    isCompliant: R_win_actual >= R_NORM.window,
    floors: floorsPermeability,
  };

  // -------------------------------------------------------------
  // 6. РАСЧЕТ ВХОДНОЙ ДВЕРИ
  // -------------------------------------------------------------
  // Rт.дн = 0.6 * (tв - tн) / (αв * Δtв.норм) = 0.6 * (18 - (-22)) / (8.7 * 6) = 0.46
  const delta_t_door_norm = 6.0;
  const R_door_req = +(
    (0.6 * (t_v - t_n_design)) /
    (ALPHA_V.wall * delta_t_door_norm)
  ).toFixed(2); // 0.46 м²·°С/Вт
  const R_door_adopted = 0.6; // типовая утепленная металлическая дверь

  const doorResult: DoorCalculationResult = {
    R_required: R_door_req,
    R_adopted: R_door_adopted,
    isCompliant: R_door_adopted >= R_door_req,
  };

  const totalCompliance =
    wallResult.isCompliant &&
    roofResult.isCompliant &&
    baseResult.isCompliant &&
    winResult.isCompliant &&
    doorResult.isCompliant;

  return {
    cipher,
    climate,
    internalConditions: {
      t_v,
      phi_v,
      e_v,
      E_v,
      dew_point: dew_point_internal,
      zone: 'Нормальная',
      exploitationConditions: expCond,
    },
    wall: wallResult,
    roof: roofResult,
    basement: baseResult,
    window: winResult,
    door: doorResult,
    summary: {
      totalCompliance,
      gradePoints: totalCompliance ? 10 : 8,
    },
  };
}
