/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Варианты конструкций ограждений:
 * - Наружные стены (С1 – С30) по табл. 1.2 и рис. 1.1
 * - Совмещенные покрытия и перекрытия (П1 – П30) по табл. 1.3 и рис. 1.2
 * - Перекрытия над техподпольем (ПТП1 – ПТП20) по табл. 1.4, 1.5, 1.6 и рис. 1.3
 */

export interface ConstructionLayer {
  name: string;
  materialId?: string; // id из MATERIALS или 'insulation'
  thickness: number; // толщина в метрах
  isInsulation?: boolean;
  position: 'inside' | 'insulation' | 'outside';
}

export interface WallConstructionDef {
  id: string; // 'C1' ... 'C30'
  type: 'а' | 'б' | 'в' | 'г' | 'д' | 'е';
  typeName: string;
  increasingFactor_n: number; // Повышающий коэффициент n по табл. 6.1 СП 2.04.01
  layers: ConstructionLayer[];
}

export interface RoofConstructionDef {
  id: string; // 'П1' ... 'П30'
  type: 'а' | 'б' | 'в' | 'г' | 'д' | 'е';
  name: string;
  kind: 'совмещенное' | 'чердачное' | 'над_проездом';
  normativeR: number; // 6.0 м²·°С/Вт
  increasingFactor_n: number; // 1.1 по п. 6.3 СП 2.04.01
  slab: {
    height: number; // мм
    voidDiameter: number; // мм
    spacing: number; // мм (шаг пустот)
  };
  layers: ConstructionLayer[];
}

export interface PipeItem {
  temp: 95 | 90 | 70 | 50;
  dy: 50 | 40 | 32 | 25 | 20 | 15;
  length: number; // м
}

export interface BasementConstructionDef {
  id: string; // 'ПТП1' ... 'ПТП20'
  variantNum: number; // 1..6 по рис. 1.3
  name: string;
  slabThickness: number; // м (0.12 или 0.16)
  layers: ConstructionLayer[];
  pipes: PipeItem[];
}

// ---------------- СТЕНЫ С1 - С30 ----------------
export const WALL_CONSTRUCTIONS: Record<string, WallConstructionDef> = {
  С1: {
    id: 'С1',
    type: 'а',
    typeName: 'Трехслойная железобетонная стеновая панель',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Железобетон (внутренний слой)', materialId: 'reinforced_concrete', thickness: 0.09, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Железобетон (наружный слой)', materialId: 'reinforced_concrete', thickness: 0.08, position: 'outside' },
    ],
  },
  С2: {
    id: 'С2',
    type: 'а',
    typeName: 'Трехслойная панель из аглопоритобетона',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Аглопоритобетон (внутренний)', materialId: 'agloporite_concrete_1800', thickness: 0.11, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Аглопоритобетон (наружный)', materialId: 'agloporite_concrete_1800', thickness: 0.05, position: 'outside' },
    ],
  },
  С3: {
    id: 'С3',
    type: 'а',
    typeName: 'Трехслойная панель из керамзитобетона (1800)',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Керамзитобетон (внутренний)', materialId: 'keramzit_concrete_1800', thickness: 0.10, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Керамзитобетон (наружный)', materialId: 'keramzit_concrete_1800', thickness: 0.06, position: 'outside' },
    ],
  },
  С4: {
    id: 'С4',
    type: 'а',
    typeName: 'Трехслойная панель из керамзитобетона (1400)',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Керамзитобетон (внутренний)', materialId: 'keramzit_concrete_1400', thickness: 0.14, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Керамзитобетон (наружный)', materialId: 'keramzit_concrete_1400', thickness: 0.08, position: 'outside' },
    ],
  },
  С5: {
    id: 'С5',
    type: 'а',
    typeName: 'Трехслойная панель из аглопоритобетона (1400)',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Аглопоритобетон (внутренний)', materialId: 'agloporite_concrete_1400', thickness: 0.11, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Аглопоритобетон (наружный)', materialId: 'agloporite_concrete_1400', thickness: 0.09, position: 'outside' },
    ],
  },
  С6: {
    id: 'С6',
    type: 'б',
    typeName: 'Трехслойная кирпичная кладка с утеплителем (глиняный кирпич)',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Кирпич глиняный сплошной', materialId: 'clay_brick_solid_1800', thickness: 0.25, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Кирпич глиняный сплошной', materialId: 'clay_brick_solid_1800', thickness: 0.12, position: 'outside' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С7: {
    id: 'С7',
    type: 'б',
    typeName: 'Трехслойная кирпичная кладка (керамический пустотный)',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Кирпич керамический пустотный', materialId: 'clay_brick_hollow_1400', thickness: 0.25, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Кирпич керамический пустотный', materialId: 'clay_brick_hollow_1400', thickness: 0.12, position: 'outside' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С8: {
    id: 'С8',
    type: 'б',
    typeName: 'Трехслойная кладка (глиняный + силикатный кирпич)',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Кирпич сплошной глиняный', materialId: 'clay_brick_solid_1800', thickness: 0.25, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Кирпич силикатный 1900', materialId: 'silicate_brick_1900', thickness: 0.12, position: 'outside' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С9: {
    id: 'С9',
    type: 'б',
    typeName: 'Трехслойная силикатная кладка (1700 кг/м³)',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Кирпич силикатный 1700', materialId: 'silicate_brick_1700', thickness: 0.25, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Кирпич силикатный 1700', materialId: 'silicate_brick_1700', thickness: 0.12, position: 'outside' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С10: {
    id: 'С10',
    type: 'б',
    typeName: 'Трехслойная кладка (глиняный + силикатный 1600 кг/м³)',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Кирпич глиняный обыкновенный', materialId: 'clay_brick_solid_1800', thickness: 0.25, position: 'inside' },
      { name: 'Утеплитель', isInsulation: true, thickness: 0.12, position: 'insulation' },
      { name: 'Кирпич силикатный 1600', materialId: 'silicate_brick_1600', thickness: 0.12, position: 'outside' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С11: {
    id: 'С11',
    type: 'в',
    typeName: 'Кирпичная кладка глиняная с наружным утеплением и ГКЛ',
    increasingFactor_n: 1.84, // полнотелый кирпич
    layers: [
      { name: 'Гипсокартонные плиты (внутри)', materialId: 'gypsum_board_1000', thickness: 0.01, position: 'inside' },
      { name: 'Кирпич сплошной глиняный обыкновенный', materialId: 'clay_brick_solid_1800', thickness: 0.38, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.23, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка (снаружи)', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С12: {
    id: 'С12',
    type: 'в',
    typeName: 'Кладка из силикатного камня с наружным утеплением и ГКЛ',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Гипсокартонные плиты', materialId: 'gypsum_board_1000', thickness: 0.01, position: 'inside' },
      { name: 'Камень силикатный (1400 кг/м³)', materialId: 'silicate_stone_1400', thickness: 0.38, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.20, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С13: {
    id: 'С13',
    type: 'в',
    typeName: 'Кладка из керам. 18-щелевого камня с наружным утеплением и ГКЛ',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Гипсокартонные плиты', materialId: 'gypsum_board_1000', thickness: 0.01, position: 'inside' },
      { name: 'Камень керамический 18-щелевой', materialId: 'ceramic_stone_18slot_1600', thickness: 0.38, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.20, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С14: {
    id: 'С14',
    type: 'в',
    typeName: 'Кладка из пустотного керамического кирпича с наружным утеплением',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Гипсокартонные плиты', materialId: 'gypsum_board_1000', thickness: 0.01, position: 'inside' },
      { name: 'Кирпич керамический пустотный', materialId: 'clay_brick_hollow_1400', thickness: 0.38, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.20, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С15: {
    id: 'С15',
    type: 'в',
    typeName: 'Кладка из пустотного утолщенного силикатного кирпича',
    increasingFactor_n: 1.84,
    layers: [
      { name: 'Гипсокартонные плиты', materialId: 'gypsum_board_1000', thickness: 0.01, position: 'inside' },
      { name: 'Кирпич пустотный силикатный утолщенный', materialId: 'silicate_thick_brick_1600', thickness: 0.38, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.20, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С16: {
    id: 'С16',
    type: 'г',
    typeName: 'Монолитная железобетонная стена (140 мм) с наружным утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Железобетон', materialId: 'reinforced_concrete', thickness: 0.14, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С17: {
    id: 'С17',
    type: 'г',
    typeName: 'Стена из керамзитобетона (200 мм) с наружным утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Керамзитобетон (1800 кг/м³)', materialId: 'keramzit_concrete_1800', thickness: 0.20, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С18: {
    id: 'С18',
    type: 'г',
    typeName: 'Монолитная железобетонная стена (180 мм) с наружным утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Железобетон', materialId: 'reinforced_concrete', thickness: 0.18, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С19: {
    id: 'С19',
    type: 'г',
    typeName: 'Стена из керамзитобетона (1200 кг/м³, 200 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Керамзитобетон (1200 кг/м³)', materialId: 'keramzit_concrete_1200', thickness: 0.20, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С20: {
    id: 'С20',
    type: 'г',
    typeName: 'Стена из аглопоритобетона (1800 кг/м³, 200 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Аглопоритобетон (1800 кг/м³)', materialId: 'agloporite_concrete_1800', thickness: 0.20, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С21: {
    id: 'С21',
    type: 'д',
    typeName: 'Кладка из блоков газосиликата (1000 кг/м³, 300 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Газосиликат (1000 кг/м³)', materialId: 'gas_silicate_1000', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С22: {
    id: 'С22',
    type: 'д',
    typeName: 'Кладка из блоков газосиликата (900 кг/м³, 300 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Газосиликат (900 кг/м³)', materialId: 'gas_silicate_900', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С23: {
    id: 'С23',
    type: 'д',
    typeName: 'Кладка из блоков газосиликата (800 кг/м³, 300 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Газосиликат (800 кг/м³)', materialId: 'gas_silicate_800', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С24: {
    id: 'С24',
    type: 'д',
    typeName: 'Кладка из блоков газосиликата (700 кг/м³, 300 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Газосиликат (700 кг/м³)', materialId: 'gas_silicate_700', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С25: {
    id: 'С25',
    type: 'д',
    typeName: 'Кладка из блоков газосиликата (600 кг/м³, 300 мм) с утеплением',
    increasingFactor_n: 1.90,
    layers: [
      { name: 'Газосиликат (600 кг/м³)', materialId: 'gas_silicate_600', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С26: {
    id: 'С26',
    type: 'е',
    typeName: 'Кладка из керамических блоков 250×120×219 на ц-п растворе',
    increasingFactor_n: 1.28,
    layers: [
      { name: 'Штукатурка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'inside' },
      { name: 'Кладка из керам. блоков 250×120×219', materialId: 'ceramic_block_250_cp_1040', thickness: 0.25, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С27: {
    id: 'С27',
    type: 'е',
    typeName: 'Кладка из керамических блоков 250×120×219 на ц-перлит. растворе',
    increasingFactor_n: 1.28,
    layers: [
      { name: 'Штукатурка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'inside' },
      { name: 'Кладка из керам. блоков 250×120×219', materialId: 'ceramic_block_250_perl_930', thickness: 0.25, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С28: {
    id: 'С28',
    type: 'е',
    typeName: 'Кладка из керамических блоков 250×120×138 на ц-п растворе',
    increasingFactor_n: 1.28,
    layers: [
      { name: 'Штукатурка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'inside' },
      { name: 'Кладка из керам. блоков 250×120×138', materialId: 'ceramic_block_138_cp_1060', thickness: 0.25, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С29: {
    id: 'С29',
    type: 'е',
    typeName: 'Кладка из керамических блоков 250×120×138 на ц-перлит. растворе',
    increasingFactor_n: 1.28,
    layers: [
      { name: 'Штукатурка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'inside' },
      { name: 'Кладка из керам. блоков 250×120×138', materialId: 'ceramic_block_138_perl_930', thickness: 0.25, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.15, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
  С30: {
    id: 'С30',
    type: 'е',
    typeName: 'Кладка тычковыми рядами из блоков 510×250×138 на ц-перлит. растворе',
    increasingFactor_n: 1.28,
    layers: [
      { name: 'Штукатурка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'inside' },
      { name: 'Кладка из блоков 510×250×138', materialId: 'ceramic_block_510_perl_1050', thickness: 0.51, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.10, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.01, position: 'outside' },
    ],
  },
};

// ---------------- ПОКРЫТИЯ П1 - П30 ----------------
export function getRoofVariant(id: string): RoofConstructionDef {
  const num = parseInt(id.replace(/\D/g, ''), 10) || 1;
  let type: 'а' | 'б' | 'в' | 'г' | 'д' | 'е' = 'а';
  let kind: 'совмещенное' | 'чердачное' | 'над_проездом' = 'совмещенное';
  let name = 'Совмещенное покрытие (тип а)';
  let slab = { height: 260, voidDiameter: 159, spacing: 200 };
  let layers: ConstructionLayer[] = [];

  if (num >= 1 && num <= 5) {
    type = 'а';
    kind = 'совмещенное';
    name = `Совмещенное покрытие (П${num}, ж/б плита h=260 мм, d=159 мм)`;
    slab = { height: 260, voidDiameter: 159, spacing: 200 };
    layers = [
      { name: 'Многопустотная железобетонная плита покрытия', materialId: 'reinforced_concrete', thickness: 0.26, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.27, position: 'insulation' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.02, position: 'outside' },
      { name: 'Рубероид (4 слоя)', materialId: 'ruberoide_600', thickness: 0.006, position: 'outside' },
    ];
  } else if (num >= 6 && num <= 10) {
    type = 'б';
    kind = 'чердачное';
    name = `Чердачное перекрытие (П${num}, ж/б плита h=260 мм, d=180 мм)`;
    slab = { height: 260, voidDiameter: 180, spacing: 240 };
    layers = [
      { name: 'Многопустотная железобетонная плита покрытия', materialId: 'reinforced_concrete', thickness: 0.26, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.25, position: 'insulation' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.02, position: 'outside' },
      { name: 'Затирка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.01, position: 'outside' },
    ];
  } else if (num >= 11 && num <= 15) {
    type = 'в';
    kind = 'совмещенное';
    name = `Совмещенное покрытие (П${num}, ж/б плита h=220 мм, d=140 мм)`;
    slab = { height: 220, voidDiameter: 140, spacing: 185 };
    layers = [
      { name: 'Многопустотная железобетонная плита покрытия', materialId: 'reinforced_concrete', thickness: 0.22, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.25, position: 'insulation' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.025, position: 'outside' },
      { name: 'Рубероид (4 слоя)', materialId: 'ruberoide_600', thickness: 0.006, position: 'outside' },
    ];
  } else if (num >= 16 && num <= 20) {
    type = 'г';
    kind = 'над_проездом';
    name = `Перекрытие над проездом (П${num}, ж/б плита h=160 мм, d=115 мм)`;
    slab = { height: 160, voidDiameter: 115, spacing: 140 };
    layers = [
      { name: 'Линолеум ПВХ на тканевой подоснове', materialId: 'linoleum_fabric_base_1800', thickness: 0.0035, position: 'inside' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.02, position: 'inside' },
      { name: 'Многопустотная ж/б плита', materialId: 'reinforced_concrete', thickness: 0.16, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.25, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.005, position: 'outside' },
    ];
  } else if (num >= 21 && num <= 25) {
    type = 'д';
    kind = 'совмещенное';
    name = `Совмещенное покрытие (П${num}, ж/б плита h=220 мм, d=127 мм)`;
    slab = { height: 220, voidDiameter: 127, spacing: 185 };
    layers = [
      { name: 'Многопустотная железобетонная плита покрытия', materialId: 'reinforced_concrete', thickness: 0.22, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.25, position: 'insulation' },
      { name: 'Стяжка из сложного раствора', materialId: 'complex_mortar_1700', thickness: 0.03, position: 'outside' },
      { name: 'Рубероид (3 слоя)', materialId: 'ruberoide_600', thickness: 0.0045, position: 'outside' },
    ];
  } else {
    type = 'е';
    kind = 'над_проездом';
    name = `Перекрытие над проездом (П${num}, ж/б плита h=300 мм, d=203 мм)`;
    slab = { height: 300, voidDiameter: 203, spacing: 233 };
    layers = [
      { name: 'Сосновый паркет', materialId: 'pine_spruce_transverse_500', thickness: 0.02, position: 'inside' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.02, position: 'inside' },
      { name: 'Многопустотная ж/б плита', materialId: 'reinforced_concrete', thickness: 0.30, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.25, position: 'insulation' },
      { name: 'Цементно-песчаная штукатурка', materialId: 'cement_sand_mortar_1800', thickness: 0.005, position: 'outside' },
    ];
  }

  return {
    id: `П${num}`,
    type,
    name,
    kind,
    normativeR: 6.0,
    increasingFactor_n: 1.1,
    slab,
    layers,
  };
}

export const ROOF_CONSTRUCTIONS: Record<string, RoofConstructionDef> = Array.from(
  { length: 30 },
  (_, i) => getRoofVariant(`П${i + 1}`)
).reduce(
  (acc, r) => {
    acc[r.id] = r;
    return acc;
  },
  {} as Record<string, RoofConstructionDef>
);

// ---------------- ТЕХНИЧЕСКОЕ ПОДПОЛЬЕ ПТП1 - ПТП20 ----------------
// Таблица 1.6: длины трубопроводов (li, м)
const PIPE_DATA_BY_PTP: Record<number, PipeItem[]> = {
  1: [
    { temp: 90, dy: 50, length: 12.8 },
    { temp: 70, dy: 50, length: 12.5 }, { temp: 70, dy: 40, length: 16.5 }, { temp: 70, dy: 32, length: 9.8 }, { temp: 70, dy: 25, length: 20.9 }, { temp: 70, dy: 20, length: 16.3 }, { temp: 70, dy: 15, length: 37.7 },
    { temp: 50, dy: 40, length: 2.0 }, { temp: 50, dy: 32, length: 2.3 }, { temp: 50, dy: 25, length: 14.9 }, { temp: 50, dy: 20, length: 8.6 }, { temp: 50, dy: 15, length: 20.1 },
  ],
  2: [
    { temp: 90, dy: 50, length: 8.3 }, { temp: 90, dy: 40, length: 4.8 }, { temp: 90, dy: 32, length: 7.4 }, { temp: 90, dy: 25, length: 31.8 }, { temp: 90, dy: 20, length: 14.0 }, { temp: 90, dy: 15, length: 38.7 },
    { temp: 70, dy: 50, length: 8.3 }, { temp: 70, dy: 40, length: 13.1 }, { temp: 70, dy: 32, length: 7.4 }, { temp: 70, dy: 25, length: 31.8 }, { temp: 70, dy: 20, length: 14.0 }, { temp: 70, dy: 15, length: 38.7 },
    { temp: 50, dy: 40, length: 2.1 }, { temp: 50, dy: 32, length: 2.2 }, { temp: 50, dy: 25, length: 14.5 }, { temp: 50, dy: 20, length: 6.6 }, { temp: 50, dy: 15, length: 19.0 },
  ],
  3: [
    { temp: 90, dy: 50, length: 13.1 },
    { temp: 70, dy: 50, length: 12.8 }, { temp: 70, dy: 40, length: 16.8 }, { temp: 70, dy: 32, length: 10.0 }, { temp: 70, dy: 25, length: 21.3 }, { temp: 70, dy: 20, length: 16.7 }, { temp: 70, dy: 15, length: 38.5 },
    { temp: 50, dy: 40, length: 2.1 }, { temp: 50, dy: 32, length: 2.3 }, { temp: 50, dy: 25, length: 15.2 }, { temp: 50, dy: 20, length: 8.7 }, { temp: 50, dy: 15, length: 20.5 },
  ],
  4: [
    { temp: 90, dy: 50, length: 8.5 }, { temp: 90, dy: 40, length: 4.9 }, { temp: 90, dy: 32, length: 7.6 }, { temp: 90, dy: 25, length: 32.4 }, { temp: 90, dy: 20, length: 14.3 }, { temp: 90, dy: 15, length: 39.5 },
    { temp: 70, dy: 50, length: 8.5 }, { temp: 70, dy: 40, length: 13.4 }, { temp: 70, dy: 32, length: 7.6 }, { temp: 70, dy: 25, length: 32.4 }, { temp: 70, dy: 20, length: 14.3 }, { temp: 70, dy: 15, length: 39.5 },
    { temp: 50, dy: 40, length: 2.2 }, { temp: 50, dy: 32, length: 2.3 }, { temp: 50, dy: 25, length: 14.8 }, { temp: 50, dy: 20, length: 6.7 }, { temp: 50, dy: 15, length: 19.3 },
  ],
  5: [
    { temp: 90, dy: 50, length: 13.4 },
    { temp: 70, dy: 50, length: 13.0 }, { temp: 70, dy: 40, length: 17.2 }, { temp: 70, dy: 32, length: 10.2 }, { temp: 70, dy: 25, length: 21.7 }, { temp: 70, dy: 20, length: 17.0 }, { temp: 70, dy: 15, length: 39.2 },
    { temp: 50, dy: 40, length: 2.1 }, { temp: 50, dy: 32, length: 2.4 }, { temp: 50, dy: 25, length: 15.5 }, { temp: 50, dy: 20, length: 8.9 }, { temp: 50, dy: 15, length: 20.9 },
  ],
  6: [
    { temp: 90, dy: 50, length: 8.6 }, { temp: 90, dy: 40, length: 5.0 }, { temp: 90, dy: 32, length: 7.7 }, { temp: 90, dy: 25, length: 33.1 }, { temp: 90, dy: 20, length: 14.6 }, { temp: 90, dy: 15, length: 40.2 },
    { temp: 70, dy: 50, length: 8.6 }, { temp: 70, dy: 40, length: 13.6 }, { temp: 70, dy: 32, length: 7.7 }, { temp: 70, dy: 25, length: 33.1 }, { temp: 70, dy: 20, length: 14.6 }, { temp: 70, dy: 15, length: 40.2 },
    { temp: 50, dy: 40, length: 2.2 }, { temp: 50, dy: 32, length: 2.3 }, { temp: 50, dy: 25, length: 15.1 }, { temp: 50, dy: 20, length: 6.8 }, { temp: 50, dy: 15, length: 19.7 },
  ],
  7: [
    { temp: 90, dy: 50, length: 13.6 },
    { temp: 70, dy: 50, length: 13.3 }, { temp: 70, dy: 40, length: 17.5 }, { temp: 70, dy: 32, length: 10.4 }, { temp: 70, dy: 25, length: 22.1 }, { temp: 70, dy: 20, length: 17.3 }, { temp: 70, dy: 15, length: 40.0 },
    { temp: 50, dy: 40, length: 2.1 }, { temp: 50, dy: 32, length: 2.4 }, { temp: 50, dy: 25, length: 15.8 }, { temp: 50, dy: 20, length: 9.1 }, { temp: 50, dy: 15, length: 21.3 },
  ],
  8: [
    { temp: 90, dy: 50, length: 8.8 }, { temp: 90, dy: 40, length: 5.1 }, { temp: 90, dy: 32, length: 7.9 }, { temp: 90, dy: 25, length: 33.7 }, { temp: 90, dy: 20, length: 14.9 }, { temp: 90, dy: 15, length: 41.0 },
    { temp: 70, dy: 50, length: 8.8 }, { temp: 70, dy: 40, length: 13.9 }, { temp: 70, dy: 32, length: 7.9 }, { temp: 70, dy: 25, length: 33.7 }, { temp: 70, dy: 20, length: 14.9 }, { temp: 70, dy: 15, length: 41.0 },
    { temp: 50, dy: 40, length: 2.2 }, { temp: 50, dy: 32, length: 2.4 }, { temp: 50, dy: 25, length: 15.3 }, { temp: 50, dy: 20, length: 6.9 }, { temp: 50, dy: 15, length: 20.1 },
  ],
  9: [
    { temp: 90, dy: 50, length: 13.9 },
    { temp: 70, dy: 50, length: 13.5 }, { temp: 70, dy: 40, length: 17.8 }, { temp: 70, dy: 32, length: 10.6 }, { temp: 70, dy: 25, length: 22.5 }, { temp: 70, dy: 20, length: 17.6 }, { temp: 70, dy: 15, length: 40.7 },
    { temp: 50, dy: 40, length: 2.2 }, { temp: 50, dy: 32, length: 2.5 }, { temp: 50, dy: 25, length: 16.1 }, { temp: 50, dy: 20, length: 9.2 }, { temp: 50, dy: 15, length: 21.7 },
  ],
  10: [
    // В курсаче Заневского: 90°C/95°C: dy50=9.0, dy40=5.2, dy32=8.0, dy25=34.3, dy20=15.1, dy15=41.8
    { temp: 95, dy: 50, length: 9.0 }, { temp: 95, dy: 40, length: 5.2 }, { temp: 95, dy: 32, length: 8.0 }, { temp: 95, dy: 25, length: 34.3 }, { temp: 95, dy: 20, length: 15.1 }, { temp: 95, dy: 15, length: 41.8 },
    { temp: 70, dy: 50, length: 9.0 }, { temp: 70, dy: 40, length: 14.2 }, { temp: 70, dy: 32, length: 8.0 }, { temp: 70, dy: 25, length: 34.3 }, { temp: 70, dy: 20, length: 15.1 }, { temp: 70, dy: 15, length: 41.8 },
    { temp: 50, dy: 40, length: 2.3 }, { temp: 50, dy: 32, length: 2.4 }, { temp: 50, dy: 25, length: 15.6 }, { temp: 50, dy: 20, length: 7.1 }, { temp: 50, dy: 15, length: 20.5 },
  ],
  11: [
    { temp: 90, dy: 50, length: 14.1 },
    { temp: 70, dy: 50, length: 13.8 }, { temp: 70, dy: 40, length: 18.2 }, { temp: 70, dy: 32, length: 10.8 }, { temp: 70, dy: 25, length: 23.0 }, { temp: 70, dy: 20, length: 18.0 }, { temp: 70, dy: 15, length: 41.5 },
    { temp: 50, dy: 40, length: 2.2 }, { temp: 50, dy: 32, length: 2.5 }, { temp: 50, dy: 25, length: 16.4 }, { temp: 50, dy: 20, length: 9.4 }, { temp: 50, dy: 15, length: 22.1 },
  ],
  12: [
    { temp: 90, dy: 50, length: 9.1 }, { temp: 90, dy: 40, length: 5.3 }, { temp: 90, dy: 32, length: 8.2 }, { temp: 90, dy: 25, length: 35.0 }, { temp: 90, dy: 20, length: 15.4 }, { temp: 90, dy: 15, length: 42.6 },
    { temp: 70, dy: 50, length: 9.1 }, { temp: 70, dy: 40, length: 14.4 }, { temp: 70, dy: 32, length: 8.2 }, { temp: 70, dy: 25, length: 35.0 }, { temp: 70, dy: 20, length: 15.4 }, { temp: 70, dy: 15, length: 42.6 },
    { temp: 50, dy: 40, length: 2.3 }, { temp: 50, dy: 32, length: 2.4 }, { temp: 50, dy: 25, length: 15.9 }, { temp: 50, dy: 20, length: 7.2 }, { temp: 50, dy: 15, length: 20.9 },
  ],
  13: [
    { temp: 90, dy: 50, length: 14.4 },
    { temp: 70, dy: 50, length: 14.0 }, { temp: 70, dy: 40, length: 18.5 }, { temp: 70, dy: 32, length: 11.0 }, { temp: 70, dy: 25, length: 23.4 }, { temp: 70, dy: 20, length: 18.3 }, { temp: 70, dy: 15, length: 42.2 },
    { temp: 50, dy: 40, length: 2.3 }, { temp: 50, dy: 32, length: 2.5 }, { temp: 50, dy: 25, length: 16.7 }, { temp: 50, dy: 20, length: 9.6 }, { temp: 50, dy: 15, length: 22.5 },
  ],
  14: [
    { temp: 90, dy: 50, length: 9.3 }, { temp: 90, dy: 40, length: 5.4 }, { temp: 90, dy: 32, length: 8.3 }, { temp: 90, dy: 25, length: 35.6 }, { temp: 90, dy: 20, length: 15.7 }, { temp: 90, dy: 15, length: 43.3 },
    { temp: 70, dy: 50, length: 9.3 }, { temp: 70, dy: 40, length: 14.7 }, { temp: 70, dy: 32, length: 8.3 }, { temp: 70, dy: 25, length: 35.6 }, { temp: 70, dy: 20, length: 15.7 }, { temp: 70, dy: 15, length: 43.3 },
    { temp: 50, dy: 40, length: 2.4 }, { temp: 50, dy: 32, length: 2.5 }, { temp: 50, dy: 25, length: 16.2 }, { temp: 50, dy: 20, length: 7.3 }, { temp: 50, dy: 15, length: 21.2 },
  ],
  15: [
    { temp: 90, dy: 50, length: 14.6 },
    { temp: 70, dy: 50, length: 14.3 }, { temp: 70, dy: 40, length: 18.8 }, { temp: 70, dy: 32, length: 11.1 }, { temp: 70, dy: 25, length: 23.8 }, { temp: 70, dy: 20, length: 18.6 }, { temp: 70, dy: 15, length: 43.0 },
    { temp: 50, dy: 40, length: 2.3 }, { temp: 50, dy: 32, length: 2.6 }, { temp: 50, dy: 25, length: 17.0 }, { temp: 50, dy: 20, length: 9.7 }, { temp: 50, dy: 15, length: 22.9 },
  ],
  16: [
    { temp: 90, dy: 50, length: 9.5 }, { temp: 90, dy: 40, length: 5.5 }, { temp: 90, dy: 32, length: 8.4 }, { temp: 90, dy: 25, length: 36.2 }, { temp: 90, dy: 20, length: 16.0 }, { temp: 90, dy: 15, length: 44.1 },
    { temp: 70, dy: 50, length: 9.5 }, { temp: 70, dy: 40, length: 15.0 }, { temp: 70, dy: 32, length: 8.4 }, { temp: 70, dy: 25, length: 36.2 }, { temp: 70, dy: 20, length: 16.0 }, { temp: 70, dy: 15, length: 44.1 },
    { temp: 50, dy: 40, length: 2.4 }, { temp: 50, dy: 32, length: 2.5 }, { temp: 50, dy: 25, length: 16.5 }, { temp: 50, dy: 20, length: 7.5 }, { temp: 50, dy: 15, length: 21.6 },
  ],
  17: [
    { temp: 90, dy: 50, length: 14.9 },
    { temp: 70, dy: 50, length: 14.5 }, { temp: 70, dy: 40, length: 19.1 }, { temp: 70, dy: 32, length: 11.3 }, { temp: 70, dy: 25, length: 24.2 }, { temp: 70, dy: 20, length: 19.0 }, { temp: 70, dy: 15, length: 43.7 },
    { temp: 50, dy: 40, length: 2.3 }, { temp: 50, dy: 32, length: 2.6 }, { temp: 50, dy: 25, length: 17.3 }, { temp: 50, dy: 20, length: 9.9 }, { temp: 50, dy: 15, length: 23.3 },
  ],
  18: [
    { temp: 90, dy: 50, length: 9.6 }, { temp: 90, dy: 40, length: 5.6 }, { temp: 90, dy: 32, length: 8.6 }, { temp: 90, dy: 25, length: 36.9 }, { temp: 90, dy: 20, length: 16.3 }, { temp: 90, dy: 15, length: 44.9 },
    { temp: 70, dy: 50, length: 9.6 }, { temp: 70, dy: 40, length: 15.2 }, { temp: 70, dy: 32, length: 8.6 }, { temp: 70, dy: 25, length: 36.9 }, { temp: 70, dy: 20, length: 16.3 }, { temp: 70, dy: 15, length: 44.9 },
    { temp: 50, dy: 40, length: 2.4 }, { temp: 50, dy: 32, length: 2.6 }, { temp: 50, dy: 25, length: 16.8 }, { temp: 50, dy: 20, length: 7.6 }, { temp: 50, dy: 15, length: 22.0 },
  ],
  19: [
    { temp: 90, dy: 50, length: 15.2 },
    { temp: 70, dy: 50, length: 14.8 }, { temp: 70, dy: 40, length: 19.5 }, { temp: 70, dy: 32, length: 11.5 }, { temp: 70, dy: 25, length: 24.6 }, { temp: 70, dy: 20, length: 19.3 }, { temp: 70, dy: 15, length: 44.5 },
    { temp: 50, dy: 40, length: 2.4 }, { temp: 50, dy: 32, length: 2.7 }, { temp: 50, dy: 25, length: 17.6 }, { temp: 50, dy: 20, length: 10.1 }, { temp: 50, dy: 15, length: 23.7 },
  ],
  20: [
    { temp: 90, dy: 50, length: 9.8 }, { temp: 90, dy: 40, length: 5.7 }, { temp: 90, dy: 32, length: 8.7 }, { temp: 90, dy: 25, length: 37.5 }, { temp: 90, dy: 20, length: 16.5 }, { temp: 90, dy: 15, length: 45.7 },
    { temp: 70, dy: 50, length: 9.8 }, { temp: 70, dy: 40, length: 15.5 }, { temp: 70, dy: 32, length: 8.7 }, { temp: 70, dy: 25, length: 37.5 }, { temp: 70, dy: 20, length: 16.5 }, { temp: 70, dy: 15, length: 45.7 },
    { temp: 50, dy: 40, length: 2.5 }, { temp: 50, dy: 32, length: 2.6 }, { temp: 50, dy: 25, length: 17.1 }, { temp: 50, dy: 20, length: 7.7 }, { temp: 50, dy: 15, length: 22.4 },
  ],
};

export function getBasementVariant(id: string): BasementConstructionDef {
  const num = parseInt(id.replace(/\D/g, ''), 10) || 1;
  const pipes = PIPE_DATA_BY_PTP[num] || PIPE_DATA_BY_PTP[10];

  let variantNum = 1;
  let name = '';
  let slabThickness = 0.16;
  let layers: ConstructionLayer[] = [];

  if (num >= 1 && num <= 3) {
    variantNum = 1;
    name = `ПТП${num} (рис. 1.3 вар. 1: ж/б 160 мм + ДВП мягкая + ДВП твердая + дубовый паркет)`;
    slabThickness = 0.16;
    layers = [
      { name: 'Дубовый паркет', materialId: 'oak_transverse_700', thickness: 0.015, position: 'inside' },
      { name: 'ДВП на битумной мастике твердая (1000 кг/м³)', materialId: 'fiberboard_hard_1000', thickness: 0.005, position: 'inside' },
      { name: 'ДВП на битумной мастике мягкая (200 кг/м³)', materialId: 'fiberboard_soft_200', thickness: 0.013, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.16, position: 'outside' },
    ];
  } else if (num >= 4 && num <= 7) {
    variantNum = 2;
    name = `ПТП${num} (рис. 1.3 вар. 2: ж/б 120 мм + утеплитель + еловые лаги 80мм шаг 500 + еловые доски 30мм)`;
    slabThickness = 0.12;
    layers = [
      { name: 'Еловые доски пола', materialId: 'pine_spruce_transverse_500', thickness: 0.03, position: 'inside' },
      { name: 'Еловые лаги (поперек воздушных прослоек)', materialId: 'pine_spruce_transverse_500', thickness: 0.08, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.12, position: 'outside' },
    ];
  } else if (num >= 8 && num <= 9) {
    variantNum = 3;
    name = `ПТП${num} (рис. 1.3 вар. 3: ж/б 160 мм + утеплитель + ДВП мягкая 2 слоя 25мм + дубовый паркет 20мм)`;
    slabThickness = 0.16;
    layers = [
      { name: 'Дубовый паркет', materialId: 'oak_transverse_700', thickness: 0.02, position: 'inside' },
      { name: 'ДВП на битумной мастике мягкая (2 слоя)', materialId: 'fiberboard_soft_200', thickness: 0.025, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.16, position: 'outside' },
    ];
  } else if (num >= 10 && num <= 13) {
    variantNum = 4;
    name = `ПТП${num} (рис. 1.3 вар. 4: ж/б 120 мм + утеплитель + еловые лаги 80мм шаг 600 + еловые доски 30мм)`;
    slabThickness = 0.12;
    layers = [
      { name: 'Еловые доски', materialId: 'pine_spruce_transverse_500', thickness: 0.03, position: 'inside' },
      { name: 'Еловые лаги (80 мм)', materialId: 'pine_spruce_transverse_500', thickness: 0.08, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.12, position: 'outside' },
    ];
  } else if (num >= 14 && num <= 17) {
    variantNum = 5;
    name = `ПТП${num} (рис. 1.3 вар. 5: ж/б 160 мм + утеплитель + стяжка 30 мм + линолеум 3 мм)`;
    slabThickness = 0.16;
    layers = [
      { name: 'Линолеум ПВХ многослойный', materialId: 'linoleum_multi_1800', thickness: 0.003, position: 'inside' },
      { name: 'Цементно-песчаная стяжка', materialId: 'cement_sand_mortar_1800', thickness: 0.03, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.16, position: 'outside' },
    ];
  } else {
    variantNum = 6;
    name = `ПТП${num} (рис. 1.3 вар. 6: ж/б 120 мм + утеплитель + ДВП мягкая + ДВП твердая + дубовый паркет)`;
    slabThickness = 0.12;
    layers = [
      { name: 'Дубовый паркет', materialId: 'oak_transverse_700', thickness: 0.02, position: 'inside' },
      { name: 'ДВП твердая (1000 кг/м³)', materialId: 'fiberboard_hard_1000', thickness: 0.005, position: 'inside' },
      { name: 'ДВП мягкая (200 кг/м³)', materialId: 'fiberboard_soft_200', thickness: 0.013, position: 'inside' },
      { name: 'Слой утеплителя', isInsulation: true, thickness: 0.05, position: 'insulation' },
      { name: 'Железобетонная плита перекрытия', materialId: 'reinforced_concrete', thickness: 0.12, position: 'outside' },
    ];
  }

  return {
    id: `ПТП${num}`,
    variantNum,
    name,
    slabThickness,
    layers,
    pipes,
  };
}

export const BASEMENT_CONSTRUCTIONS: Record<string, BasementConstructionDef> = Array.from(
  { length: 20 },
  (_, i) => getBasementVariant(`ПТП${i + 1}`)
).reduce(
  (acc, b) => {
    acc[b.id] = b;
    return acc;
  },
  {} as Record<string, BasementConstructionDef>
);
