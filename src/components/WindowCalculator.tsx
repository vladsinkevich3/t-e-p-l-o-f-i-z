/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 5: Теплотехнический расчет оконного заполнения и поэтажной воздухопроницаемости
 * Методика А. С. Шибеко (2018, разд. 6: Таблицы 6.1, 6.2, 6.3, 6.4; Приложение М; СТБ 939-2013)
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { DecodedCipher } from '../logic/decodeCipher';
import { WINDOW_AIR_PERMEABILITY_CLASSES, WindTerrainType } from '../data/normative';
import { CheckCircle2, AlertTriangle, Wind, Table2, Shield, Compass } from 'lucide-react';
import { NormativeWarningBanner } from './NormativeWarningBanner';

interface WindowCalculatorProps {
  calc: FullCourseworkCalculation;
  cipher: DecodedCipher;
  onChangeCipher: (newCipher: DecodedCipher) => void;
  onOpenOverridesEditor?: () => void;
}

export const WindowCalculator: React.FC<WindowCalculatorProps> = ({
  calc,
  cipher,
  onChangeCipher,
  onOpenOverridesEditor,
}) => {
  const { window: win } = calc;
  const windowCheck = calc.normativeChecks.find((c) => c.id === 'window');

  const handleTerrainChange = (terrain: WindTerrainType) => {
    onChangeCipher({
      ...cipher,
      overrides: {
        ...cipher.overrides,
        windowTerrainType: terrain,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Карточка окна и общих показателей */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-sky-600/20 text-sky-400 font-mono font-bold text-sm border border-sky-500/30">
                {win.windowDef.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Расчет оконного заполнения и воздухопроницаемости (методика А. С. Шибеко)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Профиль: {win.windowDef.profileSystem} | Стеклопакет: {win.windowDef.glazingType} (Вариант {win.windowDef.typeScheme})
            </p>
          </div>

          <div
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
              win.isCompliant
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
            }`}
          >
            {win.isCompliant ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Требование СН 2.04.02 (Rт.ок ≥ {win.R_norm.toFixed(1)} м²·°С/Вт) ВЫПОЛНЕНО</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Rт.ок ниже норматива ({win.R_norm.toFixed(1)} м²·°С/Вт)</span>
              </>
            )}
          </div>
        </div>

        {/* Геометрические и теплотехнические показатели окна */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div
            className={`p-4 rounded-xl border ${
              win.isCompliant
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}
          >
            <span className="text-xs text-slate-400 block">Приведенное Rт.ок</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                win.isCompliant ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {win.R_actual} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span
              className={`text-[11px] block mt-1 ${
                win.isCompliant ? 'text-emerald-500/80' : 'text-rose-300'
              }`}
            >
              {win.isCompliant
                ? `Норматив: ≥ ${win.R_norm.toFixed(1)} (ΣF/R = ${win.sum_F_over_R})`
                : `Ниже нормы ${win.R_norm.toFixed(1)} на ${(win.R_norm - win.R_actual).toFixed(2)} м²·°С/Вт`}
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Размеры H × B</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {win.windowDef.dim.H} × {win.windowDef.dim.B} <span className="text-xs font-sans text-slate-400">мм</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Площадь Fок = {win.area_total} м²
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Светопрозрачная часть Fсв</span>
            <div className="text-xl font-bold font-mono text-sky-400 mt-1">
              {win.area_transparent} <span className="text-xs font-sans text-slate-400">м²</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rсв = {win.R_transparent} ({((win.area_transparent / win.area_total) * 100).toFixed(1)}%)
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Непрозрачная часть Fнепр</span>
            <div className="text-xl font-bold font-mono text-slate-300 mt-1">
              {win.area_opaque} <span className="text-xs font-sans text-slate-400">м²</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rнепр = {win.R_opaque} м²·°С/Вт
            </span>
          </div>
        </div>
      </div>

      <NormativeWarningBanner
        variant="section"
        check={windowCheck}
        onOpenOverridesEditor={onOpenOverridesEditor}
      />

      {/* ТАБЛИЦА 6.2 (Шибеко): Поучастковый расчет приведенного R_т.ок */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Table2 className="w-5 h-5 text-sky-400" />
            <span>Таблица 6.2 — Расчет приведенного сопротивления теплопередаче окна {win.windowDef.id} (Вариант {win.windowDef.typeScheme})</span>
          </h3>
          <span className="text-xs font-mono text-sky-300 bg-sky-950/60 border border-sky-800/50 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap">
            Rт.ок = ΣF / Σ(F/R) = {win.area_total} / {win.sum_F_over_R} = {win.R_actual} м²·°С/Вт
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">Участок</th>
                <th className="py-2.5 px-3">Наименование элемента</th>
                <th className="py-2.5 px-3">Тип</th>
                <th className="py-2.5 px-3 text-right">Ширина, мм</th>
                <th className="py-2.5 px-3 text-right">Высота, мм</th>
                <th className="py-2.5 px-3">Формула площади</th>
                <th className="py-2.5 px-3 text-right">Площадь Fᵢ, м²</th>
                <th className="py-2.5 px-3 text-right">Rᵢ, м²·°С/Вт</th>
                <th className="py-2.5 px-3 text-right">Fᵢ / Rᵢ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {win.zones.map((z) => (
                <tr
                  key={z.code}
                  className={`hover:bg-slate-800/30 transition ${
                    z.kind === 'glazing' ? 'bg-sky-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-bold text-white">{z.code}</td>
                  <td className="py-2 px-3 font-sans text-slate-200">{z.name}</td>
                  <td className="py-2 px-3 font-sans">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        z.kind === 'glazing'
                          ? 'bg-sky-900/50 text-sky-300 border border-sky-700/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {z.kind === 'glazing' ? 'Стеклопакет' : 'Профиль'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">{z.widthMm}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{z.heightMm}</td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">{z.formulaText}</td>
                  <td className="py-2 px-3 text-right text-white font-semibold">{z.area_m2.toFixed(4)}</td>
                  <td className="py-2 px-3 text-right text-slate-300">{z.R_zone.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-emerald-400">{z.F_over_R.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-mono font-bold text-white">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 font-sans text-right text-slate-300">
                  Итого по оконному блоку (Fок / Σ(Fᵢ/Rᵢ) → Rт.ок = {win.R_actual} м²·°С/Вт):
                </td>
                <td className="py-2.5 px-3 text-right text-white">{win.area_total.toFixed(4)}</td>
                <td className="py-2.5 px-3 text-right text-sky-400">{win.R_actual}</td>
                <td className="py-2.5 px-3 text-right text-emerald-400">{win.sum_F_over_R.toFixed(4)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ТАБЛИЦА 6.1 (Шибеко / СТБ 939-2013): Классификация окон по воздухопроницаемости */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Таблица 6.1 — Классификация окон по воздухопроницаемости (СТБ 939-2013, Шибеко стр. 46)</span>
          </h3>
          <span className="text-xs text-slate-400">При разности давлений Δp₀ = 10 Па</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">Класс воздухопроницаемости</th>
                <th className="py-2.5 px-3">Объемная воздухопроницаемость, м³/(ч·м²)</th>
                <th className="py-2.5 px-3">Сопротивление воздухопроницанию Rв, м²·ч/кг</th>
                <th className="py-2.5 px-3">Характеристика</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {WINDOW_AIR_PERMEABILITY_CLASSES.map((cls) => (
                <tr key={cls.classLetter} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 font-bold text-indigo-300">Класс {cls.classLetter}</td>
                  <td className="py-2 px-3 font-mono text-slate-300">{cls.volumePermeabilityRange}</td>
                  <td className="py-2 px-3 font-mono text-emerald-400 font-semibold">{cls.rvRangeText}</td>
                  <td className="py-2 px-3 text-slate-400">{cls.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Выбор типа местности (Приложение М) и сводка аэродинамических параметров */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Исходные параметры расчета воздухопроницаемости (Шибеко, п. 6.2 и Приложение М)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-300 pt-1">
              <span>H = 3,7 + 3,0·{win.floors.length} = <b className="text-white">{win.H_building.toFixed(1)} м</b></span>
              <span>ρн = <b className="text-white">{win.rho_n}</b> кг/м³</span>
              <span>ρв = <b className="text-white">{win.rho_v}</b> кг/м³</span>
              <span>ρн−ρв = <b className="text-sky-300">{win.delta_rho}</b> кг/м³</span>
              <span>vср = <b className="text-white">{win.v_sr}</b> м/с</span>
              <span>cн−cп = <b className="text-white">{win.delta_c}</b></span>
              <span>Gнорм = <b className="text-emerald-400">{win.G_norm.toFixed(1)}</b> кг/(м²·ч)</span>
            </div>
          </div>

          {/* Переключатель типа местности A / B / C */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-center">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Тип местности (Прил. М):</span>
            {(['A', 'B', 'C'] as WindTerrainType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTerrainChange(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  win.terrainType === t
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Тип {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ТАБЛИЦА 6.3 (Шибеко): Поэтажный расчет требуемого сопротивления воздухопроницанию R_в.тр */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <Wind className="w-5 h-5 text-blue-400" />
            <span>Таблица 6.3 — Поэтажный расчет требуемого сопротивления воздухопроницанию Rв.тр</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Δpᵢ = 0,55·(H − hᵢ)·g·(ρн − ρв) + 0,03·kᵢ·ρн·v²·(cн − cп); Rв.тр = (1 / Gнорм)·(Δpᵢ / Δp₀)^(2/3), Δp₀ = 10 Па.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-2.5">Этаж</th>
                <th className="py-2.5 px-2.5 text-right">H, м</th>
                <th className="py-2.5 px-2.5 text-right">hᵢ, м</th>
                <th className="py-2.5 px-2.5 text-right">ρн−ρв</th>
                <th className="py-2.5 px-2.5 text-right">ρн</th>
                <th className="py-2.5 px-2.5 text-right">vср, м/с</th>
                <th className="py-2.5 px-2.5 text-right">cн−cп</th>
                <th className="py-2.5 px-2.5 text-right">kᵢ (Тип {win.terrainType})</th>
                <th className="py-2.5 px-2.5 text-right">Δpᵢ, Па</th>
                <th className="py-2.5 px-2.5 text-right">Gнорм</th>
                <th className="py-2.5 px-2.5 text-right">Rв.тр, м²·ч/кг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {win.floors.map((f) => (
                <tr key={f.floor} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-2.5 text-white font-bold">{f.floor}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{f.H_building.toFixed(1)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-300">{f.height.toFixed(1)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{win.delta_rho.toFixed(3)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{win.rho_n.toFixed(3)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{win.v_sr.toFixed(1)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{win.delta_c.toFixed(1)}</td>
                  <td className="py-2 px-2.5 text-right text-sky-300">{f.k_i.toFixed(3)}</td>
                  <td className="py-2 px-2.5 text-right text-blue-300 font-semibold">{f.delta_p.toFixed(2)}</td>
                  <td className="py-2 px-2.5 text-right text-slate-400">{f.G_v_required.toFixed(1)}</td>
                  <td className="py-2 px-2.5 text-right text-emerald-400 font-bold">{f.R_v_required.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ТАБЛИЦА 6.4 (Шибеко): Назначение класса оконных блоков по этажам */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Таблица 6.4 — Назначение требуемого класса оконных блоков по этажам здания</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Принимаемый диапазон сопротивления воздухопроницанию Rв.ок = (1,0–1,2)·Rв.тр по табл. 6.1 (СТБ 939-2013).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">Этаж</th>
                <th className="py-2.5 px-3 text-right">Rв.тр, м²·ч/кг</th>
                <th className="py-2.5 px-3 text-right">Rв.ок = (1,0–1,2)·Rв.тр, м²·ч/кг</th>
                <th className="py-2.5 px-3">Требуемый класс окна по СТБ 939-2013</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {win.floors.map((f) => (
                <tr key={f.floor} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-white font-bold">{f.floor} этаж</td>
                  <td className="py-2 px-3 text-right text-slate-300">{f.R_v_required.toFixed(3)}</td>
                  <td className="py-2 px-3 text-right text-blue-300 font-semibold">
                    {f.R_v_required.toFixed(3)} – {f.R_v_max.toFixed(3)}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <span className="px-2.5 py-0.5 rounded bg-blue-950/80 text-blue-200 font-semibold border border-blue-800/60">
                      Класс {f.windowClassRangeText}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
