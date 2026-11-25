/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Нормативные типы зданий, микроклимат и требования тепловой защиты
 * Источники:
 * - СП 2.04.01-2020 «Строительная теплотехника», табл. 5.1 (влажностный режим), табл. 5.2 (условия эксплуатации А/Б), табл. 6.4 (αв), табл. 6.5 (Δtв.норм)
 * - СН 2.04.02-2020 «Здания и сооружения. Энергетическая эффективность», табл. 7.1 (Rт.норм)
 */

export type BuildingTypeId =
  | 'residential'
  | 'administrative'
  | 'public'
  | 'school'
  | 'kindergarten'
  | 'hospital'
  | 'industrial'
  | 'wet_industrial'
  | 'warehouse';

export type HumidityRegime = 'dry' | 'normal' | 'humid' | 'wet';
export type OperatingCondition = 'A' | 'B';

export interface BuildingTypeDefinition {
  id: BuildingTypeId;
  codeName: string; // 'Жилое', 'Административное', 'Общественное', etc.
  name: string;
  description: string;
  default_t_v: number; // °C (СП 2.04.01-2020, табл. 5.1 / нормы микроклимата)
  default_phi_v: number; // %
  alpha_v: number; // Вт/(м²·°С), табл. 6.4 СП 2.04.01-2020
  // Нормативные перепады температур Δtв.норм (°C), табл. 6.5 СП 2.04.01-2020
  delta_t_norm_wall: number;
  delta_t_norm_roof: number;
  delta_t_norm_floor: number;
  // Нормативные сопротивления теплопередаче Rт.норм (м²·°С/Вт), табл. 7.1 СН 2.04.02-2020
  R_norm_wall: number;
  R_norm_roof: number;
  R_norm_basement: number;
  R_norm_window: number;
}

export const BUILDING_TYPES: Record<BuildingTypeId, BuildingTypeDefinition> = {
  residential: {
    id: 'residential',
    codeName: 'Жилое',
    name: 'Жилое здание, общежитие, гостиница',
    description:
      'Квартирные жилые дома, общежития и гостиницы (СП 2.04.01-2020 табл. 5.1: tв = 18 °C, φв = 55% → условия Б; табл. 6.5 поз. 1: Δtв = 6,0 / 4,0 / 2,0 °C)',
    default_t_v: 18.0,
    default_phi_v: 55.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 6.0,
    delta_t_norm_roof: 4.0,
    delta_t_norm_floor: 2.0,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 1.87,
    R_norm_window: 1.0,
  },
  administrative: {
    id: 'administrative',
    codeName: 'Административное',
    name: 'Административное и бытовое здание, офисный центр',
    description:
      'Административно-бытовые и офисные здания (СП 2.04.01-2020 табл. 5.1: tв = 18 °C, φв = 50% → условия А; табл. 6.5 поз. 3: Δtв = 7,0 / 5,5 / 2,5 °C)',
    default_t_v: 18.0,
    default_phi_v: 50.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 7.0,
    delta_t_norm_roof: 5.5,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 1.87,
    R_norm_window: 1.0,
  },
  public: {
    id: 'public',
    codeName: 'Общественное',
    name: 'Общественное здание (кроме школ, детсадов и больниц)',
    description:
      'Учебные корпуса вузов, культурно-просветительные и торговые здания (СП 2.04.01-2020 табл. 5.1: tв = 18 °C, φв = 50% → условия А; табл. 6.5 поз. 3: Δtв = 7,0 / 5,5 / 2,5 °C)',
    default_t_v: 18.0,
    default_phi_v: 50.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 7.0,
    delta_t_norm_roof: 5.5,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 1.87,
    R_norm_window: 1.0,
  },
  school: {
    id: 'school',
    codeName: 'Школа / Поликлиника',
    name: 'Общеобразовательная школа, поликлиника, диспансер',
    description:
      'Учебные здания школ, поликлиники и диспансеры (СП 2.04.01-2020 табл. 5.1: tв = 18 °C, φв = 50% → условия А; табл. 6.5 поз. 2: Δtв = 6,0 / 4,5 / 2,5 °C)',
    default_t_v: 18.0,
    default_phi_v: 50.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 6.0,
    delta_t_norm_roof: 4.5,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 1.87,
    R_norm_window: 1.0,
  },
  kindergarten: {
    id: 'kindergarten',
    codeName: 'Детский сад',
    name: 'Дошкольное и детское учреждение (ясли, детский сад)',
    description:
      'Групповые и спальные помещения детских садов и яслей (СП 2.04.01-2020 табл. 5.1: tв = 21 °C, φв = 50% → условия А; табл. 6.5 поз. 1: Δtв = 6,0 / 4,0 / 2,0 °C)',
    default_t_v: 21.0,
    default_phi_v: 50.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 6.0,
    delta_t_norm_roof: 4.0,
    delta_t_norm_floor: 2.0,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 2.0,
    R_norm_window: 1.0,
  },
  hospital: {
    id: 'hospital',
    codeName: 'Больница',
    name: 'Лечебно-профилактическое учреждение, больница, стационар',
    description:
      'Больничные палаты и стационары (СП 2.04.01-2020 табл. 5.1: tв = 21 °C, φв = 55% → условия Б; табл. 6.5 поз. 1: Δtв = 6,0 / 4,0 / 2,0 °C)',
    default_t_v: 21.0,
    default_phi_v: 55.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 6.0,
    delta_t_norm_roof: 4.0,
    delta_t_norm_floor: 2.0,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 2.0,
    R_norm_window: 1.0,
  },
  industrial: {
    id: 'industrial',
    codeName: 'Производственное',
    name: 'Производственное здание (сухой / нормальный режим)',
    description:
      'Производственные цеха (СП 2.04.01-2020 табл. 6.5 поз. 4: Δtв = 10,0 / 8,0 / 2,5 °C; СН 2.04.02-2020 табл. 7.1: Rст = 2,0, Rпокр = 3,0, Rок = 0,6)',
    default_t_v: 16.0,
    default_phi_v: 50.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 10.0,
    delta_t_norm_roof: 8.0,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 2.0,
    R_norm_roof: 3.0,
    R_norm_basement: 1.5,
    R_norm_window: 0.6,
  },
  wet_industrial: {
    id: 'wet_industrial',
    codeName: 'Влажное / Бассейн',
    name: 'Зал ванн бассейна, баня, помещение с мокрым режимом',
    description:
      'Залы ванн бассейнов, душевые и влажные цеха (СП 2.04.01-2020 табл. 5.1: tв = 27 °C, φв = 67% → мокрый режим, условия Б; табл. 6.5 поз. 6: Δtв = tв − tр)',
    default_t_v: 27.0,
    default_phi_v: 67.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 6.7,
    delta_t_norm_roof: 5.4,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 3.2,
    R_norm_roof: 6.0,
    R_norm_basement: 1.87,
    R_norm_window: 1.0,
  },
  warehouse: {
    id: 'warehouse',
    codeName: 'Складское / С-х',
    name: 'Складское или сельскохозяйственное отапливаемое здание',
    description:
      'Отапливаемые склады и производственно-складские корпуса (СП 2.04.01-2020 табл. 5.1 при tв = 12 °C, φв = 60% → сухой режим, условия А; СН 2.04.02-2020 табл. 7.1)',
    default_t_v: 12.0,
    default_phi_v: 60.0,
    alpha_v: 8.7,
    delta_t_norm_wall: 8.0,
    delta_t_norm_roof: 7.0,
    delta_t_norm_floor: 2.5,
    R_norm_wall: 2.0,
    R_norm_roof: 3.0,
    R_norm_basement: 1.2,
    R_norm_window: 0.6,
  },
};

/**
 * Определение влажностного режима помещения по таблице 5.1 СП 2.04.01-2020:
 * - при tв <= 12 °C: сухой <= 60%, нормальный 60..75%, влажный > 75%
 * - при 12 < tв <= 24 °C: сухой <= 50% ("до 50 включительно"), нормальный 50..60%, влажный 60..75%, мокрый > 75%
 * - при tв > 24 °C: сухой <= 40%, нормальный 40..50%, влажный 50..60%, мокрый > 60%
 */
export function determineHumidityRegime(t_v: number, phi_v: number): HumidityRegime {
  if (t_v <= 12) {
    if (phi_v <= 60) return 'dry';
    if (phi_v <= 75) return 'normal';
    return 'humid';
  } else if (t_v <= 24) {
    if (phi_v <= 50) return 'dry';
    if (phi_v <= 60) return 'normal';
    if (phi_v <= 75) return 'humid';
    return 'wet';
  } else {
    // t_v > 24
    if (phi_v <= 40) return 'dry';
    if (phi_v <= 50) return 'normal';
    if (phi_v <= 60) return 'humid';
    return 'wet';
  }
}

export function getHumidityRegimeName(regime: HumidityRegime, t_v: number = 18): string {
  if (t_v <= 12) {
    switch (regime) {
      case 'dry':
        return 'Сухой (φв ≤ 60%)';
      case 'normal':
        return 'Нормальный (60% < φв ≤ 75%)';
      case 'humid':
      case 'wet':
        return 'Влажный (φв > 75%)';
    }
  }
  if (t_v > 24) {
    switch (regime) {
      case 'dry':
        return 'Сухой (φв ≤ 40%)';
      case 'normal':
        return 'Нормальный (40% < φв ≤ 50%)';
      case 'humid':
        return 'Влажный (50% < φв ≤ 60%)';
      case 'wet':
        return 'Мокрый (φв > 60%)';
    }
  }
  switch (regime) {
    case 'dry':
      return 'Сухой (φв ≤ 50%)';
    case 'normal':
      return 'Нормальный (50% < φв ≤ 60%)';
    case 'humid':
      return 'Влажный (60% < φв ≤ 75%)';
    case 'wet':
      return 'Мокрый (φв > 75%)';
  }
}

/**
 * Определение условий эксплуатации А или Б по таблице 5.2 СП 2.04.01-2020
 * Вся территория Республики Беларусь находится во влажностной зоне 2 («Нормальная»).
 */
export function determineOperatingCondition(
  regime: HumidityRegime,
  climateZone: 'dry' | 'normal' | 'humid' = 'normal'
): OperatingCondition {
  if (climateZone === 'dry') {
    if (regime === 'dry' || regime === 'normal') return 'A';
    return 'B';
  }
  if (climateZone === 'normal') {
    // Для Республики Беларусь (зона 2 / нормальная):
    // При сухом режиме помещения -> А
    // При нормальном, влажном или мокром -> Б
    if (regime === 'dry') return 'A';
    return 'B';
  }
  // Влажная зона
  if (regime === 'dry') return 'A';
  return 'B';
}
