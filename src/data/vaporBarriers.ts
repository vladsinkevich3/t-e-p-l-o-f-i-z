/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Справочник пароизоляционных материалов (Приложение Н пособия А. С. Шибеко, СП 2.04.01-2020)
 * Поддерживает выбор материала, произвольной толщины (мм), расположения по нормам СП 2.04.01-2020 п. 10.6
 * и ввод собственной (пользовательской) пароизоляции.
 */

export interface VaporBarrierMaterial {
  id: string;
  name: string;
  shortName: string;
  /** Нормативная (базовая) толщина слоя из Приложения Н, мм */
  baseThicknessMm: number;
  /** Толщина по умолчанию при выборе в калькуляторе, мм */
  defaultThicknessMm: number;
  /** Сопротивление паропроницанию Rп при базовой толщине, м²·ч·Па/мг */
  baseRp: number;
  /** Расчетная теплопроводность λ, Вт/(м·°C) */
  lambda: number;
  /** Коэффициент теплоусвоения s, Вт/(м²·°C) */
  s: number;
  /** Плотность материала ρ, кг/м³ */
  density: number;
  /** Примечание / нормативный документ */
  note: string;
}

export type WallVaporBarrierPlacement =
  | 'before_insulation'
  | 'inner_surface'
  | 'after_layer_1'
  | 'after_layer_2'
  | 'after_layer_3'
  | 'after_layer_4';

export type RoofVaporBarrierPlacement =
  | 'before_insulation'
  | 'inner_surface'
  | 'after_plaster'
  | 'after_insulation';

export type BasementVaporBarrierPlacement =
  | 'before_insulation'
  | 'inner_surface'
  | 'after_layer_1'
  | 'after_insulation';

export interface VaporBarrierPlacementOption<T extends string> {
  id: T;
  label: string;
  excelLabel: string;
  isNormative: boolean;
  note: string;
}

export const WALL_VB_PLACEMENTS: VaporBarrierPlacementOption<WallVaporBarrierPlacement>[] = [
  {
    id: 'before_insulation',
    label: 'По нормам СП 2.04.01: перед утеплителем (с теплой стороны)',
    excelLabel: 'Перед утеплителем (по нормам СП 2.04.01)',
    isNormative: true,
    note: 'Рекомендуется по СП 2.04.01-2020 п. 10.6 и Шибеко п. 7.1.3 — отсекает пар до входа в зону низких температур утеплителя',
  },
  {
    id: 'inner_surface',
    label: 'На внутренней поверхности стены (перед слоем 1)',
    excelLabel: 'На внутр. поверхности (перед слоем 1)',
    isNormative: false,
    note: 'Укладка пароизоляционного покрытия прямо со стороны помещения (например, пароизоляционная окраска/мембрана)',
  },
  {
    id: 'after_layer_1',
    label: 'После слоя 1 (под внутренней отделкой)',
    excelLabel: 'После слоя 1',
    isNormative: false,
    note: 'Укладка сразу за внутренней штукатуркой / облицовкой (защищает несущую кладку и утеплитель)',
  },
  {
    id: 'after_layer_2',
    label: 'После слоя 2',
    excelLabel: 'После слоя 2',
    isNormative: false,
    note: 'Укладка после 2-го конструктивного слоя от внутренней поверхности стены',
  },
  {
    id: 'after_layer_3',
    label: 'После слоя 3',
    excelLabel: 'После слоя 3',
    isNormative: false,
    note: 'Укладка после 3-го конструктивного слоя (проверка переноса плоскости конденсации)',
  },
  {
    id: 'after_layer_4',
    label: 'После слоя 4',
    excelLabel: 'После слоя 4',
    isNormative: false,
    note: 'Укладка после 4-го конструктивного слоя (ближе к наружной стороне — риск запирания влаги)',
  },
];

export const ROOF_VB_PLACEMENTS: VaporBarrierPlacementOption<RoofVaporBarrierPlacement>[] = [
  {
    id: 'before_insulation',
    label: 'По нормам СП 2.04.01: поверх ж/б плиты перед утеплителем',
    excelLabel: 'Перед утеплителем (по нормам СП 2.04.01)',
    isNormative: true,
    note: 'Нормативное расположение по СП 2.04.01-2020 п. 10.6 — пароизоляция укладывается поверх ж/б плиты с теплой стороны утеплителя',
  },
  {
    id: 'inner_surface',
    label: 'На внутренней поверхности потолка (перед отделкой)',
    excelLabel: 'На внутр. поверхности потолка',
    isNormative: false,
    note: 'Пароизоляция наносится непосредственно на внутреннюю поверхность потолка со стороны помещения',
  },
  {
    id: 'after_plaster',
    label: 'После внутренней отделки (под ж/б плитой)',
    excelLabel: 'После внутр. отделки (под плитой)',
    isNormative: false,
    note: 'Укладка между отделочным слоем потолка и железобетонной плитой перекрытия',
  },
  {
    id: 'after_insulation',
    label: 'После утеплителя (под стяжкой — проверка ошибки монтажа)',
    excelLabel: 'После утеплителя (ошибочное расположение)',
    isNormative: false,
    note: 'Нарушение норм: пароизоляция с холодной стороны утеплителя запирает водяной пар и вызывает конденсацию!',
  },
];

export const BASEMENT_VB_PLACEMENTS: VaporBarrierPlacementOption<BasementVaporBarrierPlacement>[] = [
  {
    id: 'before_insulation',
    label: 'По нормам СП 2.04.01: перед утеплителем (с теплой стороны пола)',
    excelLabel: 'Перед утеплителем (по нормам СП 2.04.01)',
    isNormative: true,
    note: 'Рекомендуется со стороны отапливаемого помещения 1-го этажа перед теплоизоляционным слоем',
  },
  {
    id: 'inner_surface',
    label: 'Под покрытием пола 1-го этажа (верхняя поверхность)',
    excelLabel: 'Под покрытием пола (верх)',
    isNormative: false,
    note: 'Укладка пароизоляционного слоя непосредственно на верхней границе перекрытия',
  },
  {
    id: 'after_layer_1',
    label: 'После 1-го слоя пола',
    excelLabel: 'После слоя 1',
    isNormative: false,
    note: 'Укладка сразу за верхним отделочным слоем пола 1-го этажа',
  },
  {
    id: 'after_insulation',
    label: 'После утеплителя (со стороны техподполья)',
    excelLabel: 'После утеплителя (со стороны подполья)',
    isNormative: false,
    note: 'Размещение со стороны холодного техподполья — проверяйте отсутствие накопления влаги',
  },
];

export function getWallPlacementOption(
  placement?: string
): VaporBarrierPlacementOption<WallVaporBarrierPlacement> {
  return (
    WALL_VB_PLACEMENTS.find((p) => p.id === placement) ?? WALL_VB_PLACEMENTS[0]
  );
}

export function getRoofPlacementOption(
  placement?: string
): VaporBarrierPlacementOption<RoofVaporBarrierPlacement> {
  return (
    ROOF_VB_PLACEMENTS.find((p) => p.id === placement) ?? ROOF_VB_PLACEMENTS[0]
  );
}

export function getBasementPlacementOption(
  placement?: string
): VaporBarrierPlacementOption<BasementVaporBarrierPlacement> {
  return (
    BASEMENT_VB_PLACEMENTS.find((p) => p.id === placement) ?? BASEMENT_VB_PLACEMENTS[0]
  );
}

export interface CustomVaporBarrierParams {
  name: string;
  thicknessMm: number;
  /** Способ задания паропроницаемости: прямое Rп (м²·ч·Па/мг) или коэффициент μ (мг/(м·ч·Па)) */
  inputMode?: 'rp' | 'mu';
  R_p?: number;
  mu?: number;
  lambda?: number;
  s?: number;
  density?: number;
}

export const DEFAULT_CUSTOM_VAPOR_BARRIER: CustomVaporBarrierParams = {
  name: 'Своя пароизоляция',
  thicknessMm: 1.0,
  inputMode: 'rp',
  R_p: 5.0,
  mu: 0.0002,
  lambda: 0.2,
  s: 3.5,
  density: 1000,
};

export interface ResolvedVaporBarrier {
  materialId: string;
  name: string;
  shortName: string;
  thicknessMm: number;
  R_p: number;
  mu: number;
  lambda: number;
  s: number;
  density: number;
  isCustom: boolean;
}

export const VAPOR_BARRIER_MATERIALS: VaporBarrierMaterial[] = [
  {
    id: 'none',
    name: 'Нет (без пароизоляции)',
    shortName: 'Нет',
    baseThicknessMm: 0,
    defaultThicknessMm: 0,
    baseRp: 0,
    lambda: 0.33,
    s: 0,
    density: 0,
    note: 'Пароизоляционный слой отсутствует',
  },
  {
    id: 'pe_film_1',
    name: 'Полиэтиленовая пленка (1 слой, ГОСТ 10354)',
    shortName: 'ПЭ пленка (1 слой)',
    baseThicknessMm: 0.16,
    defaultThicknessMm: 0.16,
    baseRp: 7.3,
    lambda: 0.33,
    s: 3.5,
    density: 920,
    note: 'Прил. Н: δ = 0,16 мм, Rп = 7,3 м²·ч·Па/мг',
  },
  {
    id: 'pe_film_2',
    name: 'Полиэтиленовая пленка (2 слоя / мембрана)',
    shortName: 'ПЭ пленка (2 слоя)',
    baseThicknessMm: 0.32,
    defaultThicknessMm: 0.32,
    baseRp: 14.6,
    lambda: 0.33,
    s: 3.5,
    density: 920,
    note: 'Двойной слой ПЭ: δ = 0,32 мм, Rп = 14,6 м²·ч·Па/мг',
  },
  {
    id: 'pergamin',
    name: 'Пергамин кровельный (ГОСТ 2697)',
    shortName: 'Пергамин',
    baseThicknessMm: 0.4,
    defaultThicknessMm: 0.4,
    baseRp: 0.33,
    lambda: 0.17,
    s: 3.5,
    density: 600,
    note: 'Прил. Н: δ = 0,4 мм, Rп = 0,33 м²·ч·Па/мг',
  },
  {
    id: 'ruberoid',
    name: 'Рубероид (ГОСТ 10923)',
    shortName: 'Рубероид',
    baseThicknessMm: 1.5,
    defaultThicknessMm: 1.5,
    baseRp: 1.1,
    lambda: 0.17,
    s: 3.5,
    density: 600,
    note: 'Прил. Н: δ = 1,5 мм, Rп = 1,1 м²·ч·Па/мг',
  },
  {
    id: 'tol',
    name: 'Толь кровельный (ГОСТ 10999)',
    shortName: 'Толь кровельный',
    baseThicknessMm: 1.9,
    defaultThicknessMm: 1.9,
    baseRp: 0.4,
    lambda: 0.17,
    s: 3.5,
    density: 600,
    note: 'Прил. Н: δ = 1,9 мм, Rп = 0,40 м²·ч·Па/мг',
  },
  {
    id: 'bitumen_1',
    name: 'Окраска горячим битумом за 1 раз',
    shortName: 'Битум (1 слой)',
    baseThicknessMm: 2.0,
    defaultThicknessMm: 2.0,
    baseRp: 0.3,
    lambda: 0.17,
    s: 3.5,
    density: 1000,
    note: 'Прил. Н: δ = 2,0 мм, Rп = 0,30 м²·ч·Па/мг',
  },
  {
    id: 'bitumen_2',
    name: 'Окраска горячим битумом за 2 раза',
    shortName: 'Битум (2 слоя)',
    baseThicknessMm: 4.0,
    defaultThicknessMm: 4.0,
    baseRp: 0.48,
    lambda: 0.17,
    s: 3.5,
    density: 1000,
    note: 'Прил. Н: δ = 4,0 мм, Rп = 0,48 м²·ч·Па/мг',
  },
  {
    id: 'oil_paint_2',
    name: 'Окраска масляной краской за 2 раза',
    shortName: 'Масляная краска (2 слоя)',
    baseThicknessMm: 0.5,
    defaultThicknessMm: 0.5,
    baseRp: 0.64,
    lambda: 0.2,
    s: 3.0,
    density: 1300,
    note: 'Прил. Н: δ = 0,5 мм, Rп = 0,64 м²·ч·Па/мг',
  },
  {
    id: 'enamel_paint',
    name: 'Окраска эмалевой краской',
    shortName: 'Эмалевая краска',
    baseThicknessMm: 0.5,
    defaultThicknessMm: 0.5,
    baseRp: 0.48,
    lambda: 0.2,
    s: 3.0,
    density: 1300,
    note: 'Прил. Н: δ = 0,5 мм, Rп = 0,48 м²·ч·Па/мг',
  },
  {
    id: 'izol_mastic_1',
    name: 'Покрытие изольной мастикой за 1 раз',
    shortName: 'Изольная мастика',
    baseThicknessMm: 2.0,
    defaultThicknessMm: 2.0,
    baseRp: 0.6,
    lambda: 0.17,
    s: 3.5,
    density: 1200,
    note: 'Прил. Н: δ = 2,0 мм, Rп = 0,60 м²·ч·Па/мг',
  },
  {
    id: 'bitumen_kukersol_1',
    name: 'Покрытие битумно-кукерсольной мастикой (1 слой)',
    shortName: 'Битумно-кукерсольная (1 сл.)',
    baseThicknessMm: 1.0,
    defaultThicknessMm: 1.0,
    baseRp: 0.64,
    lambda: 0.17,
    s: 3.5,
    density: 1150,
    note: 'Прил. Н: δ = 1,0 мм, Rп = 0,64 м²·ч·Па/мг',
  },
  {
    id: 'bitumen_kukersol_2',
    name: 'Покрытие битумно-кукерсольной мастикой (2 слоя)',
    shortName: 'Битумно-кукерсольная (2 сл.)',
    baseThicknessMm: 2.0,
    defaultThicknessMm: 2.0,
    baseRp: 1.1,
    lambda: 0.17,
    s: 3.5,
    density: 1150,
    note: 'Прил. Н: δ = 2,0 мм, Rп = 1,10 м²·ч·Па/мг',
  },
  {
    id: 'foil_membrane',
    name: 'Фольгированная пароизоляция (мембрана с алюминием)',
    shortName: 'Фольгированная мембрана',
    baseThicknessMm: 1.5,
    defaultThicknessMm: 1.5,
    baseRp: 35.0,
    lambda: 0.17,
    s: 3.5,
    density: 950,
    note: 'Усиленная пароизоляция: δ = 1,5 мм, Rп = 35,0 м²·ч·Па/мг',
  },
  {
    id: 'ilmax_4630',
    name: 'Полимерминеральная пароизоляция ilmax 4630 (цементная)',
    shortName: 'ilmax 4630',
    baseThicknessMm: 1.0,
    defaultThicknessMm: 1.0,
    baseRp: 3.0,
    lambda: 0.76,
    s: 9.6,
    density: 1650,
    note: 'ТУ BY / ilmax: полимерминеральная пароизоляция (слой 1–1,5 мм, Rп ≥ 3,0 м²·ч·Па/мг при δ = 1 мм)',
  },
  {
    id: 'ilmax_tezer_v',
    name: 'Пароизоляционный акриловый герметик ilmax tezer V',
    shortName: 'ilmax tezer V',
    baseThicknessMm: 3.0,
    defaultThicknessMm: 3.0,
    baseRp: 2.0,
    lambda: 0.2,
    s: 3.0,
    density: 1450,
    note: 'ТУ BY / ilmax: акриловый пароизоляционный состав для швов и примыканий (δ = 3 мм, Rп ≥ 2,0 м²·ч·Па/мг)',
  },
];

export const VAPOR_BARRIER_MAP: Record<string, VaporBarrierMaterial> = Object.fromEntries(
  VAPOR_BARRIER_MATERIALS.map((m) => [m.id, m])
);

export function getVaporBarrierById(id?: string): VaporBarrierMaterial {
  if (!id || !VAPOR_BARRIER_MAP[id]) return VAPOR_BARRIER_MAP['none'];
  return VAPOR_BARRIER_MAP[id];
}

/**
 * Вычисляет сопротивление паропроницанию Rп [м²·ч·Па/мг] для выбранного материала и толщины (мм).
 * Rп = Rп_баз * (δ / δ_баз)
 */
export function calculateVaporBarrierRp(materialId?: string, thicknessMm?: number): number {
  const mat = getVaporBarrierById(materialId);
  if (mat.id === 'none' || mat.baseThicknessMm <= 0 || mat.baseRp <= 0) return 0;
  const effThickness = thicknessMm !== undefined && thicknessMm >= 0 ? thicknessMm : mat.defaultThicknessMm;
  if (effThickness <= 0) return 0;
  return +(mat.baseRp * (effThickness / mat.baseThicknessMm)).toFixed(3);
}

/**
 * Возвращает полный редактируемый набор параметров пароизоляции для UI-редактора,
 * независимо от того, выбран ли материал из справочника Приложения Н или 'custom'.
 */
export function getEditableVaporBarrierParams(config?: {
  materialId?: string;
  thicknessMm?: number;
  custom?: CustomVaporBarrierParams;
}): CustomVaporBarrierParams {
  if (!config || !config.materialId || config.materialId === 'none') {
    return { ...DEFAULT_CUSTOM_VAPOR_BARRIER };
  }
  if (config.materialId === 'custom') {
    const c = { ...DEFAULT_CUSTOM_VAPOR_BARRIER, ...(config.custom || {}) };
    const thkMm =
      config.thicknessMm !== undefined && config.thicknessMm > 0
        ? config.thicknessMm
        : c.thicknessMm > 0
        ? c.thicknessMm
        : 1.0;
    const thkM = thkMm / 1000;
    const mode = c.inputMode ?? 'rp';
    const rpVal =
      mode === 'mu'
        ? c.mu && c.mu > 0
          ? +(thkM / c.mu).toFixed(3)
          : 5.0
        : c.R_p !== undefined && c.R_p >= 0
        ? +c.R_p.toFixed(3)
        : 5.0;
    const muVal =
      mode === 'mu'
        ? c.mu && c.mu > 0
          ? c.mu
          : 0.0002
        : rpVal > 0
        ? +(thkM / rpVal).toFixed(7)
        : 0;
    return {
      name: c.name || DEFAULT_CUSTOM_VAPOR_BARRIER.name,
      thicknessMm: thkMm,
      inputMode: mode,
      R_p: rpVal,
      mu: muVal,
      lambda: c.lambda && c.lambda > 0 ? c.lambda : 0.2,
      s: c.s !== undefined && c.s >= 0 ? c.s : 3.5,
      density: c.density !== undefined && c.density >= 0 ? c.density : 1000,
    };
  }

  const mat = getVaporBarrierById(config.materialId);
  if (mat.id === 'none') {
    return { ...DEFAULT_CUSTOM_VAPOR_BARRIER };
  }
  const c = config.custom;
  const thkMm =
    config.thicknessMm !== undefined && config.thicknessMm > 0
      ? config.thicknessMm
      : c?.thicknessMm && c.thicknessMm > 0
      ? c.thicknessMm
      : mat.defaultThicknessMm;
  const thkM = thkMm / 1000;
  const scaledRp = calculateVaporBarrierRp(mat.id, thkMm);
  const mode = c?.inputMode ?? 'rp';
  let rpVal = scaledRp;
  let muVal = scaledRp > 0 ? +(thkM / scaledRp).toFixed(7) : 0;
  if (c) {
    if (mode === 'mu' && c.mu !== undefined && c.mu > 0) {
      muVal = c.mu;
      rpVal = +(thkM / muVal).toFixed(3);
    } else if (c.R_p !== undefined && c.R_p > 0) {
      rpVal = +c.R_p.toFixed(3);
      muVal = +(thkM / rpVal).toFixed(7);
    }
  }
  return {
    name: c?.name?.trim() ? c.name : mat.name,
    thicknessMm: thkMm,
    inputMode: mode,
    R_p: rpVal,
    mu: muVal,
    lambda: c?.lambda && c.lambda > 0 ? c.lambda : mat.lambda,
    s: c?.s !== undefined && c.s >= 0 ? c.s : mat.s,
    density: c?.density !== undefined && c.density >= 0 ? c.density : mat.density,
  };
}

/**
 * Универсальный резолвер пароизоляции: поддерживает справочник Приложения Н (включая ручную правку
 * любых его параметров: названия, δ, Rп, μ, λ, s, ρ) и пользовательский материал ('custom').
 */
export function resolveVaporBarrier(config?: {
  materialId?: string;
  thicknessMm?: number;
  custom?: CustomVaporBarrierParams;
}): ResolvedVaporBarrier | null {
  if (!config || !config.materialId || config.materialId === 'none') return null;

  if (config.materialId === 'custom') {
    const c = { ...DEFAULT_CUSTOM_VAPOR_BARRIER, ...(config.custom || {}) };
    const thkMm =
      config.thicknessMm !== undefined && config.thicknessMm > 0
        ? config.thicknessMm
        : c.thicknessMm > 0
        ? c.thicknessMm
        : 1.0;
    const thkM = thkMm / 1000;
    const mode = c.inputMode ?? 'rp';
    let rpVal = 0;
    let muVal = 0;
    if (mode === 'mu') {
      muVal = c.mu && c.mu > 0 ? c.mu : 0.0002;
      rpVal = +(thkM / muVal).toFixed(3);
    } else {
      rpVal = c.R_p !== undefined && c.R_p > 0 ? +c.R_p.toFixed(3) : 0;
      muVal = rpVal > 0 ? +(thkM / rpVal).toFixed(7) : 0;
    }
    if (rpVal <= 0 || thkMm <= 0) return null;
    const cleanName = (c.name || '').trim() || 'Своя пароизоляция';
    return {
      materialId: 'custom',
      name: cleanName,
      shortName: cleanName.length > 26 ? cleanName.slice(0, 26) + '…' : cleanName,
      thicknessMm: thkMm,
      R_p: rpVal,
      mu: muVal,
      lambda: c.lambda && c.lambda > 0 ? c.lambda : 0.2,
      s: c.s !== undefined && c.s >= 0 ? c.s : 3.5,
      density: c.density !== undefined && c.density >= 0 ? c.density : 1000,
      isCustom: true,
    };
  }

  const mat = getVaporBarrierById(config.materialId);
  if (mat.id === 'none') return null;

  const c = config.custom;
  const thkMm =
    config.thicknessMm !== undefined && config.thicknessMm > 0
      ? config.thicknessMm
      : c?.thicknessMm && c.thicknessMm > 0
      ? c.thicknessMm
      : mat.defaultThicknessMm;
  if (thkMm <= 0) return null;
  const thkM = thkMm / 1000;
  const scaledRp = calculateVaporBarrierRp(mat.id, thkMm);

  let rpVal = scaledRp;
  let muVal = scaledRp > 0 ? +(thkM / scaledRp).toFixed(7) : 0;
  let name = mat.name;
  let shortName = mat.shortName;
  let lambda = mat.lambda;
  let s = mat.s;
  let density = mat.density;
  let hasOverrides = false;

  if (c) {
    const mode = c.inputMode ?? 'rp';
    if (mode === 'mu' && c.mu !== undefined && c.mu > 0) {
      muVal = c.mu;
      rpVal = +(thkM / muVal).toFixed(3);
      if (Math.abs(rpVal - scaledRp) > 0.001) hasOverrides = true;
    } else if (c.R_p !== undefined && c.R_p > 0) {
      rpVal = +c.R_p.toFixed(3);
      muVal = +(thkM / rpVal).toFixed(7);
      if (Math.abs(rpVal - scaledRp) > 0.001) hasOverrides = true;
    }
    if (c.name && c.name.trim() && c.name.trim() !== mat.name) {
      name = c.name.trim();
      shortName = name.length > 26 ? name.slice(0, 26) + '…' : name;
      hasOverrides = true;
    }
    if (c.lambda !== undefined && c.lambda > 0 && Math.abs(c.lambda - mat.lambda) > 1e-6) {
      lambda = c.lambda;
      hasOverrides = true;
    }
    if (c.s !== undefined && c.s >= 0 && Math.abs(c.s - mat.s) > 1e-6) {
      s = c.s;
      hasOverrides = true;
    }
    if (c.density !== undefined && c.density >= 0 && Math.abs(c.density - mat.density) > 1e-6) {
      density = c.density;
      hasOverrides = true;
    }
  }

  if (rpVal <= 0) return null;
  return {
    materialId: mat.id,
    name,
    shortName,
    thicknessMm: thkMm,
    R_p: rpVal,
    mu: muVal,
    lambda,
    s,
    density,
    isCustom: hasOverrides,
  };
}
