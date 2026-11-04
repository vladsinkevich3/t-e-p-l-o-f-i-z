/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Модуль локальной базы данных проектов (IndexedDB через localforage)
 */

import localforage from 'localforage';
import { DecodedCipher, DEFAULT_CIPHER } from '../logic/decodeCipher';

export interface SavedProject {
  id: string;
  name: string;
  cipher: DecodedCipher;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

const projectsStorage = localforage.createInstance({
  name: 'teplofizika_calculator_db',
  storeName: 'saved_projects',
  description: 'Локальное хранилище вариантов курсовой работы по строительной теплофизике',
});

export const PRESET_PROJECTS: SavedProject[] = [
  {
    id: 'preset-grodno-12',
    name: 'Эталонный вариант (Гродно, 12 эт., С11-П3-ПТП10-У11-О5, N=6)',
    cipher: DEFAULT_CIPHER,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
    notes: 'Эталонный пример расчета из методических указаний БНТУ',
  },
  {
    id: 'preset-minsk-9',
    name: 'Вариант 2: Минск (9 эт., С1-П1-ПТП1-У1-О1, N=1)',
    cipher: {
      rawCipher: 'Жилое – Г60 – 9 – С1 – П1 – ПТП1 – У1 – О1',
      buildingType: 'Жилое',
      cityCode: 'Г60',
      floorsCount: 9,
      wallCode: 'С1',
      roofCode: 'П1',
      basementCode: 'ПТП1',
      insulationCode: 'У1',
      windowCode: 'О1',
      gradebookLastDigit: 1,
      studentName: 'Иванов И. И.',
      groupName: '110041-21',
      academicYear: '2025/2026',
    },
    createdAt: 1710000001000,
    updatedAt: 1710000001000,
    notes: 'Пример для г. Минск с кирпичной стеной и минераловатным утеплителем',
  },
  {
    id: 'preset-brest-5',
    name: 'Вариант 3: Брест (5 эт., С5-П2-ПТП5-У5-О3, N=3)',
    cipher: {
      rawCipher: 'Жилое – Г5 – 5 – С5 – П2 – ПТП5 – У5 – О3',
      buildingType: 'Жилое',
      cityCode: 'Г5',
      floorsCount: 5,
      wallCode: 'С5',
      roofCode: 'П2',
      basementCode: 'ПТП5',
      insulationCode: 'У5',
      windowCode: 'О3',
      gradebookLastDigit: 3,
      studentName: 'Петров П. П.',
      groupName: '110041-21',
      academicYear: '2025/2026',
    },
    createdAt: 1710000002000,
    updatedAt: 1710000002000,
    notes: 'Малоэтажное здание в юго-западном климатическом поясе',
  },
];

/**
 * Получить список всех сохраненных проектов
 */
export async function getAllProjects(): Promise<SavedProject[]> {
  const projects: SavedProject[] = [];
  try {
    await projectsStorage.iterate<SavedProject, void>((value) => {
      projects.push(value);
    });
    // Если база пустая, инициализируем пресетами
    if (projects.length === 0) {
      for (const p of PRESET_PROJECTS) {
        await projectsStorage.setItem(p.id, p);
        projects.push(p);
      }
    }
  } catch (err) {
    console.error('Ошибка доступа к IndexedDB:', err);
    return PRESET_PROJECTS;
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Сохранить проект в локальную базу данных
 */
export async function saveProject(project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SavedProject> {
  const id = project.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  const existing = await projectsStorage.getItem<SavedProject>(id);

  const saved: SavedProject = {
    ...project,
    id,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };

  await projectsStorage.setItem(id, saved);
  return saved;
}

/**
 * Загрузить конкретный проект
 */
export async function getProjectById(id: string): Promise<SavedProject | null> {
  return await projectsStorage.getItem<SavedProject>(id);
}

/**
 * Удалить проект
 */
export async function deleteProject(id: string): Promise<void> {
  await projectsStorage.removeItem(id);
}

/**
 * Экспорт всех проектов в JSON файл для резервного копирования
 */
export async function exportProjectsToJson(): Promise<string> {
  const list = await getAllProjects();
  return JSON.stringify(list, null, 2);
}

/**
 * Импорт проектов из JSON
 */
export async function importProjectsFromJson(jsonText: string): Promise<number> {
  const items = JSON.parse(jsonText) as SavedProject[];
  if (!Array.isArray(items)) throw new Error('Некорректный формат JSON');

  let count = 0;
  for (const item of items) {
    if (item.id && item.cipher) {
      await projectsStorage.setItem(item.id, item);
      count++;
    }
  }
  return count;
}
