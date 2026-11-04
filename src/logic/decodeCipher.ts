/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Парсер и расшифровщик шифра курсового задания по строительной теплофизике
 */

export interface DecodedCipher {
  rawCipher: string;
  buildingType: string; // 'Жилое', 'Общественное'
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
  academicYear?: string;
}

export const DEFAULT_CIPHER: DecodedCipher = {
  rawCipher: 'Жилое – Г27 – 12 – С11 – П3 – ПТП10 – У11 – О5',
  buildingType: 'Жилое',
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
};

/**
 * Разбор произвольной строки шифра задания
 */
export function parseTaskCipher(text: string): Partial<DecodedCipher> {
  const result: Partial<DecodedCipher> = {
    rawCipher: text.trim(),
  };

  const clean = text.replace(/[\n\r]/g, ' ').trim();
  const tokens = clean.split(/[-–—,;\s]+/).filter(Boolean);

  for (const token of tokens) {
    const upper = token.toUpperCase();

    // Тип здания
    if (upper.includes('ЖИЛ') || upper === 'Ж') {
      result.buildingType = 'Жилое';
    } else if (upper.includes('ОБЩ') || upper.includes('АДМ')) {
      result.buildingType = 'Общественное';
    }

    // Город: Г27
    const cityMatch = upper.match(/^Г(\d+)$/);
    if (cityMatch) {
      result.cityCode = `Г${cityMatch[1]}`;
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

    // Этажность: одиночное число 1..30
    if (/^\d+$/.test(token)) {
      const num = parseInt(token, 10);
      if (num >= 1 && num <= 35 && !result.floorsCount) {
        result.floorsCount = num;
      }
    }
  }

  return result;
}

/**
 * Сборка строки шифра из параметров
 */
export function formatCipherString(c: DecodedCipher): string {
  return `${c.buildingType} – ${c.cityCode} – ${c.floorsCount} – ${c.wallCode} – ${c.roofCode} – ${c.basementCode} – ${c.insulationCode} – ${c.windowCode}`;
}
