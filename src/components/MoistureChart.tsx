/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Интерактивный график влажностного режима ограждающей конструкции (метод Фокина)
 * Показывает распределение температур t(x), упругости насыщения E(x) и парциального давления e(x).
 */

import React, { useState } from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

interface MoistureChartProps {
  calc: FullCourseworkCalculation;
}

export const MoistureChart: React.FC<MoistureChartProps> = ({ calc }) => {
  const [selectedConstruction, setSelectedConstruction] = useState<'wall' | 'roof'>('wall');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const points =
    selectedConstruction === 'wall'
      ? calc.wall.moisturePoints
      : calc.roof.moisturePoints;

  const layers =
    selectedConstruction === 'wall' ? calc.wall.layers : calc.roof.layers;

  const totalThickness = points[points.length - 1]?.x || 0.5;

  // Размеры SVG графика
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 60, bottom: 60, left: 70 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Масштабирование давления пара (от 0 до макс Eв ~ 2400 Па)
  const maxPressure = Math.max(
    calc.internalConditions.E_v * 1.15,
    ...points.map((p) => p.E),
    ...points.map((p) => p.e)
  );

  const getXCoord = (x: number) => {
    return padding.left + (x / totalThickness) * plotWidth;
  };

  const getYCoord = (p: number) => {
    return padding.top + plotHeight - (p / maxPressure) * plotHeight;
  };

  // Построение полилиний
  const pathE = points.reduce((acc, pt, idx) => {
    const x = getXCoord(pt.x);
    const y = getYCoord(pt.E);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  const path_e = points.reduce((acc, pt, idx) => {
    const x = getXCoord(pt.x);
    const y = getYCoord(pt.e);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  // Проверка зон конденсации (где e >= E)
  const condensationPoints = points.filter((p) => p.e >= p.E);
  const hasCondensation = condensationPoints.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Заголовок и переключатель */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Влажностный режим ограждения (метод В. М. Фокина)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            График распределения упругости водяного пара E(x) и e(x) по толщине конструкции
          </p>
        </div>

        {/* Переключатель стена / покрытие */}
        <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedConstruction('wall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedConstruction === 'wall'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Наружная стена {calc.wall.construction.id}
          </button>
          <button
            onClick={() => setSelectedConstruction('roof')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              selectedConstruction === 'roof'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Покрытие {calc.roof.construction.id}
          </button>
        </div>
      </div>

      {/* Информационный статус */}
      <div
        className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
          hasCondensation
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
        }`}
      >
        {hasCondensation ? (
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div>
          <span className="font-semibold block text-sm">
            {hasCondensation
              ? 'Обнаружена зона возможной конденсации водяного пара (e ≥ E)!'
              : 'Условие влажностного режима выполнено: E(x) > e(x) по всему сечению!'}
          </span>
          <p className="mt-1 opacity-90">
            {hasCondensation
              ? 'Кривая фактического парциального давления водяного пара пересекает кривую максимальной упругости насыщения. Требуется устройство или усиление пароизоляции с теплой стороны утеплителя.'
              : selectedConstruction === 'wall'
              ? 'Конденсация водяного пара в толще наружной стены отсутствует. Паропроницаемость слоев увеличивается в сторону наружного холодного воздуха.'
              : 'В конструкции покрытия пароизоляционный слой (полиэтиленовая пленка) предотвращает увлажнение утеплителя под кровельным ковром.'}
          </p>
        </div>
      </div>

      {/* Интерактивный SVG график */}
      <div className="relative overflow-x-auto bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[700px] select-none"
        >
          {/* Фоновые вертикальные полосы слоев материала */}
          {layers.map((layer, idx) => {
            const startX = points[idx]?.x || 0;
            const endX = points[idx + 1]?.x || startX + layer.thickness;
            const x1 = getXCoord(startX);
            const x2 = getXCoord(endX);
            const w = Math.max(0, x2 - x1);

            // Чередование фона для визуализации слоев
            const bgFill =
              idx % 2 === 0 ? 'rgba(51, 65, 85, 0.15)' : 'rgba(30, 41, 59, 0.35)';

            return (
              <g key={idx}>
                <rect
                  x={x1}
                  y={padding.top}
                  width={w}
                  height={plotHeight}
                  fill={bgFill}
                  stroke="#334155"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
                {/* Подпись слоя наверху */}
                <text
                  x={x1 + w / 2}
                  y={padding.top - 12}
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="middle"
                  className="font-medium"
                >
                  {w > 35 ? layer.name.substring(0, 16) : `№${idx + 1}`}
                </text>
              </g>
            );
          })}

          {/* Оси координат и сетка */}
          {[0, 500, 1000, 1500, 2000].map((pressureVal) => {
            if (pressureVal > maxPressure) return null;
            const y = getYCoord(pressureVal);
            return (
              <g key={pressureVal}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {pressureVal}
                </text>
              </g>
            );
          })}

          {/* Ось X (толщина x, мм) */}
          <line
            x1={padding.left}
            y1={padding.top + plotHeight}
            x2={width - padding.right}
            y2={padding.top + plotHeight}
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Ось Y (давление, Па) */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + plotHeight}
            stroke="#475569"
            strokeWidth="1.5"
          />

          {/* Подписи осей */}
          <text
            x={width / 2}
            y={height - 15}
            fill="#94a3b8"
            fontSize="11"
            textAnchor="middle"
            className="font-medium"
          >
            Толщина ограждения x (м) [от внутренней поверхности к наружной]
          </text>
          <text
            x={15}
            y={height / 2}
            fill="#94a3b8"
            fontSize="11"
            textAnchor="middle"
            transform={`rotate(-90, 15, ${height / 2})`}
            className="font-medium"
          >
            Давление пара (Па)
          </text>

          {/* Линия E(x) - максимальное давление насыщения (синяя) */}
          <path
            d={pathE}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Линия e(x) - фактическое парциальное давление (оранжевая/красная) */}
          <path
            d={path_e}
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
            strokeDasharray="4,3"
            strokeLinecap="round"
          />

          {/* Узловые расчетные точки */}
          {points.map((pt, idx) => {
            const cx = getXCoord(pt.x);
            const cyE = getYCoord(pt.E);
            const cy_e = getYCoord(pt.e);
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Точка E */}
                <circle
                  cx={cx}
                  cy={cyE}
                  r={isHovered ? 6 : 4}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {/* Точка e */}
                <circle
                  cx={cx}
                  cy={cy_e}
                  r={isHovered ? 6 : 4}
                  fill="#ea580c"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                {/* Отметка по оси X */}
                <text
                  x={cx}
                  y={padding.top + plotHeight + 18}
                  fill="#94a3b8"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {pt.x.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Легенда */}
        <div className="flex flex-wrap items-center justify-center gap-6 mt-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 bg-sky-400 inline-block"></span>
            <span className="text-slate-300">
              E(x) — максимальное давление насыщенного водяного пара
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-4 h-0.5 bg-orange-500 border-b border-dashed inline-block"></span>
            <span className="text-slate-300">
              e(x) — фактическое парциальное давление водяного пара
            </span>
          </div>
        </div>
      </div>

      {/* Таблица значений по расчетным сечениям */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
              <th className="py-2.5 px-3 font-semibold">Расстояние x (м)</th>
              <th className="py-2.5 px-3 font-semibold">Сечение / граница слоя</th>
              <th className="py-2.5 px-3 font-semibold">Температура t (°C)</th>
              <th className="py-2.5 px-3 font-semibold">E(t) насыщение (Па)</th>
              <th className="py-2.5 px-3 font-semibold">e(x) парциальное (Па)</th>
              <th className="py-2.5 px-3 font-semibold">Запас Δ = E - e (Па)</th>
              <th className="py-2.5 px-3 font-semibold">Конденсация</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {points.map((p, idx) => {
              const delta = +(p.E - p.e).toFixed(1);
              const isCond = p.e >= p.E;
              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/40 transition ${
                    hoveredIndex === idx ? 'bg-blue-900/20' : ''
                  }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <td className="py-2 px-3 text-white font-medium">{p.x.toFixed(3)}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{p.name}</td>
                  <td className="py-2 px-3 text-blue-300">{p.temp.toFixed(2)} °C</td>
                  <td className="py-2 px-3 text-sky-400">{p.E.toFixed(1)}</td>
                  <td className="py-2 px-3 text-orange-400">{p.e.toFixed(1)}</td>
                  <td className={`py-2 px-3 font-bold ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    {isCond ? (
                      <span className="text-rose-400 font-bold">ОПАСНОСТЬ</span>
                    ) : (
                      <span className="text-emerald-400">НЕТ</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
