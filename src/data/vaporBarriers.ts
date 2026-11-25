/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Справочник пароизоляционных материалов (Приложение Н пособия А. С. Шибеко, СП 2.04.01-2020)
 * Поддерживает выбор материала и произвольной толщины (мм) с пропорциональным расчетом Rп.
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
  /** Примечание / нормативный документ */
  note: string;
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
