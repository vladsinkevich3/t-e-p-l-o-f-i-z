/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Интерактивный компонент расшифровки шифра и ввода параметров задания
 */

import React from 'react';
import {
  DecodedCipher,
  DEFAULT_CIPHER,
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
import { Sparkles, MapPin, Building, Layers, ShieldCheck, Thermometer } from 'lucide-react';

interface TaskCipherInputProps {
  cipher: DecodedCipher;
  calc: FullCourseworkCalculation;
  onChangeCipher: (newCipher: DecodedCipher) => void;
}

export const TaskCipherInput: React.FC<TaskCipherInputProps> = ({
  cipher,
  calc,
  onChangeCipher,
}) => {
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

        {/* Кнопки типовых пресетов */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => loadPreset(DEFAULT_CIPHER)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>★ Эталонный пример: Гродно, 12 эт. (С11-П3-ПТП10-У11-О5, N=6)</span>
          </button>
          <button
            onClick={() =>
              loadPreset({
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
              })
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <span>Минск, 9 эт. (С1-П1-ПТП1-У1-О1)</span>
          </button>
          <button
            onClick={() =>
              loadPreset({
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
              })
            }
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <span>Брест, 5 эт. (С5-П2-ПТП5-У5-О3)</span>
          </button>
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

      {/* Интерактивные селекторы по компонентам задания */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Тип здания */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Тип здания
          </label>
          <select
            value={cipher.buildingType}
            onChange={(e) => {
              const bType = e.target.value;
              const next = { ...cipher, buildingType: bType };
              next.rawCipher = formatCipherString(next);
              onChangeCipher(next);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Жилое">Жилое (tв = 18°C, φв = 55%)</option>
            <option value="Общественное">Общественное (tв = 20°C, φв = 55%)</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-2">
            Определяет расчетную температуру внутреннего воздуха tв
          </p>
        </div>

        {/* Город строительства */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <label className="text-xs font-medium text-slate-400 block mb-1.5">
            Пункт строительства (Г1 – Г117)
          </label>
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
            {Object.values(CITIES_DATA).map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} — {c.name} ({c.region})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-2">
            tх.5 = {calc.climate.t_coldest_5days_092}°C, vср = {calc.climate.wind_speed_winter} м/с
          </p>
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
            Высота здания: {(cipher.floorsCount * 2.8).toFixed(1)} м
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
            λБ = {calc.wall.insulation.lambda_B} Вт/(м·°С), sБ = {calc.wall.insulation.s_B}
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
            <span className="text-slate-400 block">tх.5 (0.92)</span>
            <span className="text-sm font-bold text-white">{calc.climate.t_coldest_5days_092} °C</span>
            <span className="text-[10px] text-slate-500 block">Хол. пятидневка</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">tх.с (0.98)</span>
            <span className="text-sm font-bold text-white">{calc.climate.t_coldest_day_098} °C</span>
            <span className="text-[10px] text-slate-500 block">Хол. сутки</span>
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
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">Внутри tв / φв</span>
            <span className="text-sm font-bold text-white">{calc.internalConditions.t_v} °C / {calc.internalConditions.phi_v}%</span>
            <span className="text-[10px] text-slate-500 block">eв = {calc.internalConditions.e_v} Па</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block">Точка росы tр</span>
            <span className="text-sm font-bold text-emerald-400">{calc.internalConditions.dew_point} °C</span>
            <span className="text-[10px] text-slate-500 block">При tв={calc.internalConditions.t_v}°C</span>
          </div>
        </div>
      </div>
    </div>
  );
};
