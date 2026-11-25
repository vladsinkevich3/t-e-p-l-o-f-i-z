/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Интерактивный компонент расшифровки шифра и ввода параметров задания
 */

import React, { useState, useMemo } from 'react';
import {
  DecodedCipher,
  DEFAULT_CIPHER,
  PDF_REFERENCE_CIPHER,
  parseTaskCipher,
  formatCipherString,
} from '../logic/decodeCipher';
import { CITIES_DATA } from '../data/climate';
import { WALL_CONSTRUCTIONS } from '../data/constructions';
import { ROOF_CONSTRUCTIONS } from '../data/constructions';
import { BASEMENT_CONSTRUCTIONS } from '../data/constructions';
import { INSULATION_VARIANTS } from '../data/insulation';
import { WINDOW_VARIANTS } from '../data/windows';
import { FullCourseworkCalculation } from '../logic/calculations';
import {
  BuildingTypeId,
  BUILDING_TYPES,
  getHumidityRegimeName,
} from '../data/buildingTypes';
import { Sparkles, MapPin, Building, Layers, ShieldCheck, Thermometer, Sliders, Search, Droplets, Gauge, CheckCircle2, FileSpreadsheet, FileText, Download } from 'lucide-react';

interface TaskCipherInputProps {
  cipher: DecodedCipher;
  calc: FullCourseworkCalculation;
  onChangeCipher: (newCipher: DecodedCipher) => void;
  onOpenOverridesEditor?: () => void;
  onExportExcel?: () => void;
  onExportWord?: () => void;
}

export const TaskCipherInput: React.FC<TaskCipherInputProps> = ({
  cipher,
  calc,
  onChangeCipher,
  onOpenOverridesEditor,
  onExportExcel,
  onExportWord,
}) => {
  const [citySearch, setCitySearch] = useState('');

  const hasOverrides = Boolean(
    cipher.overrides &&
      Object.values(cipher.overrides).some((v) => v !== undefined && v !== null)
  );

  const filteredCities = useMemo(() => {
    const list = Object.values(CITIES_DATA);
    if (!citySearch.trim()) return list;
    const q = citySearch.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.nearestStation.toLowerCase().includes(q)
    );
  }, [citySearch]);

  const displayCities = useMemo(() => {
    if (!cipher.cityCode || filteredCities.some((c) => c.id === cipher.cityCode)) {
      return filteredCities;
    }
    const currentCity = CITIES_DATA[cipher.cityCode];
    return currentCity ? [currentCity, ...filteredCities] : filteredCities;
  }, [filteredCities, cipher.cityCode]);

  // Обработка текстового ввода шифра
  const handleRawCipherChange = (val: string) => {
    const parsed = parseTaskCipher(val);
    onChangeCipher({
      ...cipher,
      ...parsed,
      rawCipher: val,
    });
  };

  // Выбор пресета
  const loadPreset = (preset: DecodedCipher) => {
    onChangeCipher({
      ...preset,
      rawCipher: formatCipherString(preset),
    });
  };

  return (
    <div className="space-y-6">
      {/* Баннер автономной книги Microsoft Excel (.xlsx) с 18 листами и экспорта в Microsoft Word (.docx) */}
      {onExportExcel && (
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-blue-950/60 border border-emerald-500/30 rounded-2xl p-5 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Автономный калькулятор Microsoft Excel (.xlsx, 18 листов) и пояснительная записка Word (.docx)
                  </h2>
                  <p className="text-xs text-slate-300">
                    Скачайте расчетную книгу Excel (включая листы «В_отчет» и «Формулы_расчета», 4 графика Шибеко и AutoCAD) или готовую пояснительную записку Microsoft Word (.docx) с полным сохранением структуры таблиц из листа «В_отчет».
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-300">
                <span className="bg-slate-900/90 border border-slate-700/80 rounded-md px-2 py-0.5">Ввод_и_Итоги</span>
                <span className="bg-slate-900/90 border border-amber-700/70 text-amber-300 rounded-md px-2 py-0.5">В_отчет (таблицы ГОСТ)</span>
                <span className="bg-slate-900/90 border border-indigo-700/70 text-indigo-300 rounded-md px-2 py-0.5">Формулы_расчета</span>
                <span className="bg-slate-900/90 border border-slate-700/80 rounded-md px-2 py-0.5">Стена_Расчет + Покрытие_Расчет</span>
                <span className="bg-slate-900/90 border border-emerald-700/70 text-emerald-300 rounded-md px-2 py-0.5">Графики_Шибеко (4 графика)</span>
                <span className="bg-slate-900/90 border border-cyan-700/70 text-cyan-300 rounded-md px-2 py-0.5">AutoCAD_Графики</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onExportExcel}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Скачать Excel (.xlsx)</span>
              </button>
              {onExportWord && (
                <button
                  type="button"
                  onClick={onExportWord}
                  className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-950/50 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Скачать Word (.docx)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Карточка пресетов и быстрого старта */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">
              Быстрый выбор варианта или ввод шифра задания
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Формат шифра: [Тип] – [Город] – [Этажи] – [Стена] – [Покрытие] – [ПТП] – [Утеплитель] – [Окно]
          </span>
        </div>

        {/* Кнопки типовых пресетов и кнопка ручной корректировки */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadPreset(PDF_REFERENCE_CIPHER)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>★ Пример PDF: Административное – Верхнедвинск (Г15), 9 эт. (С13-П9-ПТП2-У40-О18)</span>
            </button>
            <button
              onClick={() => loadPreset(DEFAULT_CIPHER)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center space-x-1.5 cursor-pointer"
            >
              <span>★ Эталон: Гродно (Г27), 12 эт. (С11-П3-ПТП10-У11-О5)</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Жилое – Г69 – 9 – С1 – П1 – ПТП1 – У1 – О1',
                  buildingType: 'Жилое',
                  cityCode: 'Г69',
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
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <span>Минск (Г69), 9 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Жилое – Г12 – 5 – С5 – П2 – ПТП5 – У5 – О3',
                  buildingType: 'Жилое',
                  cityCode: 'Г12',
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
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <span>Брест (Г12), 5 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Жилое – Г18 – 10 – С10 – П3 – ПТП10 – У11 – О5',
                  buildingType: 'Жилое',
                  cityCode: 'Г18',
                  floorsCount: 10,
                  wallCode: 'С10',
                  roofCode: 'П3',
                  basementCode: 'ПТП10',
                  insulationCode: 'У11',
                  windowCode: 'О5',
                  gradebookLastDigit: 4,
                  studentName: 'Смирнов С. С.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <span>Витебск (Г18), 10 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Жилое – Г24 – 9 – С6 – П2 – ПТП6 – У6 – О4',
                  buildingType: 'Жилое',
                  cityCode: 'Г24',
                  floorsCount: 9,
                  wallCode: 'С6',
                  roofCode: 'П2',
                  basementCode: 'ПТП6',
                  insulationCode: 'У6',
                  windowCode: 'О4',
                  gradebookLastDigit: 7,
                  studentName: 'Кузнецов К. К.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <span>Гомель (Г24), 9 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Жилое – Г71 – 10 – С11 – П3 – ПТП10 – У11 – О5',
                  buildingType: 'Жилое',
                  cityCode: 'Г71',
                  floorsCount: 10,
                  wallCode: 'С11',
                  roofCode: 'П3',
                  basementCode: 'ПТП10',
                  insulationCode: 'У11',
                  windowCode: 'О5',
                  gradebookLastDigit: 8,
                  studentName: 'Могилевский М. М.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <span>Могилев (Г71), 10 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Общественное – Г69 – 6 – С3 – П2 – ПТП3 – У5 – О2',
                  buildingType: 'Общественное',
                  buildingTypeId: 'public',
                  cityCode: 'Г69',
                  floorsCount: 6,
                  wallCode: 'С3',
                  roofCode: 'П2',
                  basementCode: 'ПТП3',
                  insulationCode: 'У5',
                  windowCode: 'О2',
                  gradebookLastDigit: 2,
                  studentName: 'Сидоров С. С.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/40 transition cursor-pointer"
            >
              <span>Общественное: Минск (Г69), 6 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Детский сад – Г27 – 3 – С8 – П1 – ПТП4 – У9 – О4',
                  buildingType: 'Детский сад',
                  buildingTypeId: 'kindergarten',
                  cityCode: 'Г27',
                  floorsCount: 3,
                  wallCode: 'С8',
                  roofCode: 'П1',
                  basementCode: 'ПТП4',
                  insulationCode: 'У9',
                  windowCode: 'О4',
                  gradebookLastDigit: 5,
                  studentName: 'Козлова А. В.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-700/40 transition cursor-pointer"
            >
              <span>Детский сад: Гродно (Г27), 3 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Больница – Г12 – 4 – С11 – П3 – ПТП10 – У11 – О5',
                  buildingType: 'Больница',
                  buildingTypeId: 'hospital',
                  cityCode: 'Г12',
                  floorsCount: 4,
                  wallCode: 'С11',
                  roofCode: 'П3',
                  basementCode: 'ПТП10',
                  insulationCode: 'У11',
                  windowCode: 'О5',
                  gradebookLastDigit: 6,
                  studentName: 'Васильев В. В.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-700/40 transition cursor-pointer"
            >
              <span>Больница: Брест (Г12), 4 эт.</span>
            </button>
            <button
              onClick={() =>
                loadPreset({
                  rawCipher: 'Производственное – Г28 – 2 – С2 – П1 – ПТП2 – У3 – О1',
                  buildingType: 'Производственное',
                  buildingTypeId: 'industrial',
                  cityCode: 'Г28',
                  floorsCount: 2,
                  wallCode: 'С2',
                  roofCode: 'П1',
                  basementCode: 'ПТП2',
                  insulationCode: 'У3',
                  windowCode: 'О1',
                  gradebookLastDigit: 9,
                  studentName: 'Николаев Н. Н.',
                  groupName: '110041-21',
                  academicYear: '2025/2026',
                })
              }
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-700/40 transition cursor-pointer"
            >
              <span>Производственное: Дзержинск (Г28), 2 эт.</span>
            </button>
          </div>

          {onOpenOverridesEditor && (
            <button
              onClick={onOpenOverridesEditor}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                hasOverrides
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30'
                  : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
              }`}
              title="Открыть редактор всех расчетных параметров, слоев конструкций и нормативов"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{hasOverrides ? 'Редактор данных (есть правки)' : 'Редактировать все данные'}</span>
              {hasOverrides && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-1" />
              )}
            </button>
          )}
        </div>

        {/* Текстовое поле для вставки строки шифра целиком */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Строка шифра (вставьте из задания или отредактируйте):
          </label>
          <div className="relative">
            <input
              type="text"
              value={cipher.rawCipher}
              onChange={(e) => handleRawCipherChange(e.target.value)}
              placeholder="Например: Жилое – Г27 – 12 – С11 – П3 – ПТП10 – У11 – О5"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Панель влажностного режима и условий эксплуатации (СП 2.04.01-2020) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Влажностный режим помещения и условия эксплуатации ограждений (СП 2.04.01-2020)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
              <span className="text-slate-400">Влажностный режим помещения (табл. 5.1):</span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                calc.internalConditions.humidityRegime === 'dry'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : calc.internalConditions.humidityRegime === 'normal'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {calc.internalConditions.humidityRegimeName} (при tв = {calc.internalConditions.t_v}°C, φв = {calc.internalConditions.phi_v}%)
              </span>

              <span className="text-slate-500">|</span>

              <span className="text-slate-400">Зона влажности:</span>
              <span className="text-slate-200 font-medium">Зона 2 (Нормальная)</span>

              <span className="text-slate-500">|</span>

              <span className="text-slate-400">Расчетные условия (табл. 5.2):</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                calc.internalConditions.exploitationConditions === 'А'
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-blue-400/20 text-blue-300 border border-blue-400/40'
              }`}>
                Условия {calc.internalConditions.exploitationConditions}
              </span>
            </div>
          </div>

          {/* Переключатель режима: Авто / Принудительно А / Принудительно Б */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-center">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Режим:</span>
            <button
              type="button"
              onClick={() => {
                const nextOverrides = {
                  ...cipher.overrides,
                  operatingConditionMode: 'auto' as const,
                  operatingConditionOverride: undefined,
                };
                onChangeCipher({ ...cipher, overrides: nextOverrides });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                !cipher.overrides?.operatingConditionMode || cipher.overrides?.operatingConditionMode === 'auto'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Авто по СП 2.04.01
            </button>
            <button
              type="button"
              onClick={() => {
                const nextOverrides = {
                  ...cipher.overrides,
                  operatingConditionMode: 'A' as const,
                  operatingConditionOverride: 'A' as const,
                };
                onChangeCipher({ ...cipher, overrides: nextOverrides });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                cipher.overrides?.operatingConditionMode === 'A'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Условия А (λА)
            </button>
            <button
              type="button"
              onClick={() => {
                const nextOverrides = {
                  ...cipher.overrides,
                  operatingConditionMode: 'B' as const,
                  operatingConditionOverride: 'B' as const,
                };
                onChangeCipher({ ...cipher, overrides: nextOverrides });
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                cipher.overrides?.operatingConditionMode === 'B'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Условия Б (λБ)
            </button>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-cyan-300 font-semibold">
              Eв(tв = {calc.internalConditions.t_v}°C) = {calc.internalConditions.E_v} Па
            </span>
            <span className="text-slate-600">→</span>
            <span className="font-mono text-emerald-300 font-semibold">
              eв = ({calc.internalConditions.phi_v}%/100)·Eв = {calc.internalConditions.e_v} Па
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-amber-300 font-semibold">
              tр = {calc.internalConditions.dew_point} °C
            </span>
            <span className="text-slate-500">(табл. Е.1, линейная интерполяция)</span>
          </div>
          <span className="text-slate-500 font-mono">
            {calc.internalConditions.operatingConditionMode === 'auto'
              ? `Авто (${calc.internalConditions.exploitationConditions}: λут = ${
                  calc.internalConditions.exploitationConditions === 'А'
                    ? calc.wall.insulation.lambda_A
                    : calc.wall.insulation.lambda_B
                })`
              : `Принудительно Условия ${calc.internalConditions.exploitationConditions}`}
          </span>
        </div>
      </div>

      {/* Интерактивные селекторы по компонентам задания */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Тип здания */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400 block">
              Тип здания
            </label>
            <span className="text-[10px] text-blue-400 font-mono">СН 2.04.02</span>
          </div>
          <select
            value={calc.internalConditions.buildingTypeId}
            onChange={(e) => {
              const bTypeId = e.target.value as BuildingTypeId;
              const def = BUILDING_TYPES[bTypeId];
              const next = {
                ...cipher,
                buildingType: def.codeName,
                buildingTypeId: bTypeId,
                overrides: {
                  ...cipher.overrides,
                  buildingTypeId: bTypeId,
                  t_indoor: undefined,
                  phi_indoor: undefined,
                },
              };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.values(BUILDING_TYPES).map((bt) => (
              <option key={bt.id} value={bt.id}>
                {bt.codeName} (tв={bt.default_t_v}°C, φв={bt.default_phi_v}%, Rст={bt.R_norm_wall})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-1" title={calc.internalConditions.buildingTypeName}>
            {calc.internalConditions.buildingTypeName}
          </p>
        </div>

        {/* Город строительства */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">
              Пункт строительства (Г1 – Г{Object.keys(CITIES_DATA).length})
            </label>
            <span className="text-[10px] text-slate-500 font-mono">
              {filteredCities.length} из {Object.keys(CITIES_DATA).length}
            </span>
          </div>

          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Поиск города по шифру / названию..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={cipher.cityCode}
            onChange={(e) => {
              const city = e.target.value;
              const next = { ...cipher, cityCode: city };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {displayCities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name} ({c.region})
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
            <span>tх.5 = {calc.climate.t_coldest_5days_092}°C, v = {calc.climate.wind_speed_winter} м/с</span>
            <span className="text-slate-500 font-mono text-[10px]">МС: {calc.climate.nearestStation}</span>
          </div>
        </div>


        {/* Этажность здания */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Количество этажей (N)
          </label>
          <input
            type="number"
            min={1}
            max={35}
            value={cipher.floorsCount}
            onChange={(e) => {
              const fl = parseInt(e.target.value, 10) || 1;
              const next = { ...cipher, floorsCount: fl };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Высота здания (Шибеко): {(3.7 + 3.0 * cipher.floorsCount).toFixed(1)} м
          </p>
        </div>

        {/* Последняя цифра зачетки */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Номер зачетки (последняя цифра N)
          </label>
          <input
            type="number"
            min={0}
            max={9}
            value={cipher.gradebookLastDigit}
            onChange={(e) => {
              const d = parseInt(e.target.value, 10) || 0;
              onChangeCipher({ ...cipher, gradebookLastDigit: d });
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-slate-500 mt-2">
            Используется для расчетов геометрических размеров
          </p>
        </div>

        {/* Наружная стена (С1 - С30) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Конструкция стены (С1 – С30)
          </label>
          <select
            value={cipher.wallCode}
            onChange={(e) => {
              const w = e.target.value;
              const next = { ...cipher, wallCode: w };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(WALL_CONSTRUCTIONS).map((k) => (
              <option key={k} value={k}>
                {k}: {WALL_CONSTRUCTIONS[k].typeName} (n={WALL_CONSTRUCTIONS[k].increasingFactor_n})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
            {calc.wall.construction.typeName}
          </p>
        </div>

        {/* Совмещенное покрытие (П1 - П30) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Покрытие / перекрытие (П1 – П30)
          </label>
          <select
            value={cipher.roofCode}
            onChange={(e) => {
              const r = e.target.value;
              const next = { ...cipher, roofCode: r };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(ROOF_CONSTRUCTIONS).map((k) => (
              <option key={k} value={k}>
                {k}: {ROOF_CONSTRUCTIONS[k].name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            Ж/б плита h={calc.roof.hollowCore.height} мм (d={calc.roof.hollowCore.voidDiameter} мм)
          </p>
        </div>

        {/* Перекрытие над техподпольем (ПТП1 - ПТП20) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Техподполье (ПТП1 – ПТП20)
          </label>
          <select
            value={cipher.basementCode}
            onChange={(e) => {
              const b = e.target.value;
              const next = { ...cipher, basementCode: b };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(BASEMENT_CONSTRUCTIONS).map((k) => (
              <option key={k} value={k}>
                {k}: {BASEMENT_CONSTRUCTIONS[k].name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            Трубопроводов: {calc.basement.pipesDetails.length} типоразмеров
          </p>
        </div>

        {/* Утеплитель (У1 - У50) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Вид утеплителя (У1 – У50)
          </label>
          <select
            value={cipher.insulationCode}
            onChange={(e) => {
              const ins = e.target.value;
              const next = { ...cipher, insulationCode: ins };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(INSULATION_VARIANTS).map((k) => (
              <option key={k} value={k}>
                {k}: {INSULATION_VARIANTS[k].name} ({INSULATION_VARIANTS[k].density} кг/м³, λ={INSULATION_VARIANTS[k].lambda_B})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            {calc.internalConditions.exploitationConditions === 'А'
              ? `λА = ${calc.wall.insulation.lambda_A} Вт/(м·°С), sА = ${calc.wall.insulation.s_A}`
              : `λБ = ${calc.wall.insulation.lambda_B} Вт/(м·°С), sБ = ${calc.wall.insulation.s_B}`}
          </p>
        </div>

        {/* Оконный блок (О1 - О44) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 md:col-span-2">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Оконный блок (О1 – О44)
          </label>
          <select
            value={cipher.windowCode}
            onChange={(e) => {
              const win = e.target.value;
              const next = { ...cipher, windowCode: win };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.keys(WINDOW_VARIANTS).map((k) => (
              <option key={k} value={k}>
                {k}: {WINDOW_VARIANTS[k].profileSystem} | {WINDOW_VARIANTS[k].glazingType} (Rнепр={WINDOW_VARIANTS[k].R_neopr}, Rсв={WINDOW_VARIANTS[k].R_sv})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            {calc.window.windowDef.profileSystem}, стеклопакет {calc.window.windowDef.glazingType}
          </p>
        </div>

        {/* Сведения о студенте */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 md:col-span-2">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Студент и группа (для титульного листа и отчета)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="ФИО студента (напр. Заневский М. А.)"
              value={cipher.studentName || ''}
              onChange={(e) => onChangeCipher({ ...cipher, studentName: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Группа (напр. 110041-21)"
              value={cipher.groupName || ''}
              onChange={(e) => onChangeCipher({ ...cipher, groupName: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Сводная климатическая и нормативная карточка */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
          <Thermometer className="w-4 h-4 text-blue-400" />
          <span>Сводные параметры микроклимата и нормативные требования</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">tх.5 / tх.3 (0.92)</span>
            <span className="text-sm font-bold text-white">
              {calc.climate.t_coldest_5days_092}° / {+((calc.climate.t_coldest_day_092 + calc.climate.t_coldest_5days_092) / 2).toFixed(1)}°
            </span>
            <span className="text-[10px] text-slate-500 block">D &gt; 7 / 4 &lt; D ≤ 7</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">tх.с (0.92 / 0.98)</span>
            <span className="text-sm font-bold text-white">
              {calc.climate.t_coldest_day_092}° / {calc.climate.t_coldest_day_098}°
            </span>
            <span className="text-[10px] text-slate-500 block">1.5 &lt; D ≤ 4 / D ≤ 1.5</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">Ветер vср</span>
            <span className="text-sm font-bold text-white">{calc.climate.wind_speed_winter} м/с</span>
            <span className="text-[10px] text-slate-500 block">Зимний период</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">tн.от / zот</span>
            <span className="text-sm font-bold text-white">{calc.climate.t_heating_period} °C / {calc.climate.duration_heating_period} дн</span>
            <span className="text-[10px] text-slate-500 block">Отопит. период</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-cyan-800/60">
            <span className="text-slate-400 block">Насыщ. пар Eв(tв) / eв</span>
            <span className="text-sm font-bold text-cyan-300 font-mono">
              {calc.internalConditions.E_v} / {calc.internalConditions.e_v} Па
            </span>
            <span className="text-[10px] text-slate-400 block">
              при tв={calc.internalConditions.t_v}°C, φв={calc.internalConditions.phi_v}%
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">Точка росы tр</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{calc.internalConditions.dew_point} °C</span>
            <span className="text-[10px] text-slate-500 block">По eв = {calc.internalConditions.e_v} Па (Табл. Е.1)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
