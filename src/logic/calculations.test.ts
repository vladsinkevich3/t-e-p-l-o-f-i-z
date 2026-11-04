/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Модульные тесты чистого математического расчета по эталонному примеру
 * (Гродно, 12 этажей, С11-П3-ПТП10-У11-О5)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCoursework } from './calculations';
import { DEFAULT_CIPHER, parseTaskCipher } from './decodeCipher';

test('Парсер шифра корректно извлекает компоненты из строки', () => {
  const cipherStr = 'Жилое – Г27 – 12 – С11 – П3 – ПТП10 – У11 – О5';
  const parsed = parseTaskCipher(cipherStr);

  assert.equal(parsed.buildingType, 'Жилое');
  assert.equal(parsed.cityCode, 'Г27');
  assert.equal(parsed.floorsCount, 12);
  assert.equal(parsed.wallCode, 'С11');
  assert.equal(parsed.roofCode, 'П3');
  assert.equal(parsed.basementCode, 'ПТП10');
  assert.equal(parsed.insulationCode, 'У11');
  assert.equal(parsed.windowCode, 'О5');
});

test('Расчет эталонного варианта (Гродно, С11-П3-ПТП10-У11-О5)', () => {
  const result = calculateCoursework(DEFAULT_CIPHER);

  // 1. Климат
  assert.equal(result.climate.id, 'Г27');
  assert.equal(result.climate.t_coldest_5days_092, -22);
  assert.equal(result.climate.wind_speed_winter, 5.7);

  // 2. Внутренний климат
  assert.equal(result.internalConditions.t_v, 18);
  assert.equal(result.internalConditions.dew_point, 8.83);

  // 3. Стена С11
  assert.equal(result.wall.construction.id, 'С11');
  assert.equal(result.wall.construction.increasingFactor_n, 1.84);
  assert.equal(result.wall.R_required, 5.89);
  // Принятая толщина утеплителя 0.23 м
  assert.equal(result.wall.delta_insulation_adopted, 0.23);
  assert.ok(result.wall.R_total >= 5.89);
  assert.ok(result.wall.thermalInertia_D > 7);
  assert.equal(result.wall.design_t_out, -22);
  assert.ok(result.wall.tau_v_min > result.wall.dew_point);
  assert.equal(result.wall.isCompliant, true);

  // 4. Покрытие П3
  assert.equal(result.roof.hollowCore.R_slab, 0.173);
  assert.equal(result.roof.R_required, 6.6);
  assert.equal(result.roof.delta_insulation_adopted, 0.27);
  assert.ok(result.roof.R_total >= 6.6);
  assert.equal(result.roof.isCompliant, true);

  // 5. Подполье ПТП10
  assert.equal(result.basement.delta_insulation_adopted, 0.05);
  assert.ok(result.basement.R_ptp >= 1.87);
  assert.ok(result.basement.delta_t_floor <= 0.8);
  assert.ok(result.basement.tau_v_basement_wall > result.basement.dew_point_basement);
  assert.equal(result.basement.isCompliant, true);

  // 6. Окна О5
  assert.equal(result.window.windowDef.id, 'О5');
  assert.equal(result.window.R_actual, 1.35);
  assert.ok(result.window.R_actual >= 1.0);
  assert.equal(result.window.isCompliant, true);
  assert.equal(result.window.floors.length, 12);

  // 7. Двери
  assert.equal(result.door.R_required, 0.46);
  assert.equal(result.door.isCompliant, true);

  // Общее соответствие
  assert.equal(result.summary.totalCompliance, true);
});
