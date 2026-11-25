/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Интерактивный график влажностного режима ограждающей конструкции (метод Фокина)
 * Показывает распределение температур t(x), упругости насыщения E(x) и парциального давления e(x).
 */

import React, { useState } from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { AlertCircle, CheckCircle, Compass, Sliders } from 'lucide-react';

interface MoistureChartProps {
  calc: FullCourseworkCalculation;
  onOpenOverridesEditor?: () => void;
  onOpenAutoCad?: () => void;
}

interface MoisturePlotPoint {
  x: number;
  name: string;
  temp: number;
  E: number;
  e: number;
  isInsulationMidpoint?: boolean;
}

type MoistureConstructionType = 'wall' | 'roof_worst' | 'roof_void' | 'basement';

export const MoistureChart: React.FC<MoistureChartProps> = ({
  calc,
  onOpenOverridesEditor,
  onOpenAutoCad,
}) => {
  const [selectedConstruction, setSelectedConstruction] = useState<MoistureConstructionType>('wall');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, layers, constructionLabel, description } = React.useMemo(() => {
    if (selectedConstruction === 'wall') {
      const pts: MoisturePlotPoint[] = calc.wall.moisturePoints.map((p) => ({
        x: p.x,
        name: p.name,
        temp: p.temp,
        E: p.E,
        e: p.e,
        isInsulationMidpoint: p.isInsulationMidpoint,
      }));
      return {
        points: pts,
        layers: calc.wall.layers,
        constructionLabel: `Наружная стена ${calc.wall.construction.id}`,
        description: 'Конденсация водяного пара в толще наружной стены отсутствует. Паропроницаемость слоев увеличивается в сторону наружного холодного воздуха.',
      };
    }
    if (selectedConstruction === 'roof_worst') {
      const pts: MoisturePlotPoint[] = (calc.roof.worstSection?.crossSectionProfile || calc.roof.crossSectionProfile).map((pt) => ({
        x: pt.coord_x_mm / 1000,
        name: pt.planeName,
        temp: pt.temp_heating,
        E: pt.E_sat,
        e: pt.e_partial,
        isInsulationMidpoint: pt.isInsulationMidpoint,
      }));
      return {
        points: pts,
        layers: calc.roof.layers,
        constructionLabel: `Покрытие ${calc.roof.construction.id} (Худшее сечение по ребру плиты)`,
        description: 'Расчет по участку сплошного бетона ребра плиты перекрытия (Rребро = 0.127). Пароизоляционный слой отсекает влагу.',
      };
    }
    if (selectedConstruction === 'roof_void') {
      const pts: MoisturePlotPoint[] = (calc.roof.voidSection?.crossSectionProfile || calc.roof.crossSectionProfile).map((pt) => ({
        x: pt.coord_x_mm / 1000,
        name: pt.planeName,
        temp: pt.temp_heating,
        E: pt.E_sat,
        e: pt.e_partial,
        isInsulationMidpoint: pt.isInsulationMidpoint,
      }));
      return {
        points: pts,
        layers: calc.roof.layers,
        constructionLabel: `Покрытие ${calc.roof.construction.id} (Сечение по пустоте плиты)`,
        description: 'Расчет по сечению через круглую невентилируемую воздушную пустоту плиты перекрытия (Rпустота = 0.199).',
      };
    }
    // basement
    const pts: MoisturePlotPoint[] = calc.basement.moisturePoints.map((p) => ({
      x: p.x,
      name: p.name,
      temp: p.temp,
      E: p.E,
      e: p.e,
      isInsulationMidpoint: p.isInsulationMidpoint,
    }));
    return {
      points: pts,
      layers: calc.basement.layers,
      constructionLabel: `Перекрытие над техподпольем ${calc.basement.construction.id}`,
      description: 'Влажностный режим цокольного перекрытия при расчетной температуре и влажности воздуха в техподполье.',
    };
  }, [selectedConstruction, calc]);

  const layersSumThickness = layers.reduce((acc, l) => acc + (l.thickness || 0), 0);
  const totalThickness = Math.max(
    points[points.length - 1]?.x || 0,
    layersSumThickness,
    0.05
  );

  // Размеры SVG графика
  const width = 800;
  const height = 400;
  const padding = { top: 40, right: 60, bottom: 60, left: 70 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Масштабирование давления пара (от 0 до макс Eв ~ 2400 Па)
  const maxPressure = Math.max(
    calc.internalConditions.E_v * 1.15,
    ...points.map((p: MoisturePlotPoint) => p.E),
    ...points.map((p: MoisturePlotPoint) => p.e)
  );

  const getXCoord = (x: number) => {
    return padding.left + (x / totalThickness) * plotWidth;
  };

  const getYCoord = (p: number) => {
    return padding.top + plotHeight - (p / maxPressure) * plotHeight;
  };

  // Построение полилиний
  const pathE = points.reduce((acc: string, pt: MoisturePlotPoint, idx: number) => {
    const x = getXCoord(pt.x);
    const y = getYCoord(pt.E);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  const path_e = points.reduce((acc: string, pt: MoisturePlotPoint, idx: number) => {
    const x = getXCoord(pt.x);
    const y = getYCoord(pt.e);
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
  }, '');

  // Проверка зон конденсации (где e >= E)
  const condensationPoints = points.filter((p: MoisturePlotPoint) => p.e >= p.E);
  const hasCondensation = condensationPoints.length > 0;


  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Заголовок и переключатель */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <span>Влажностный режим ограждения (метод В. М. Фокина)</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
              {constructionLabel}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            График распределения упругости водяного пара E(x) и e(x) с контрольной точкой в середине утеплителя
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAutoCad && (
            <button
              onClick={onOpenAutoCad}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Открыть калькулятор координат X,Y для построения графиков в AutoCAD"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Координаты для AutoCAD</span>
            </button>
          )}

          {onOpenOverridesEditor && (
            <button
              onClick={onOpenOverridesEditor}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              title="Настроить толщины утеплителя и параметры расчета"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Параметры и толщины</span>
            </button>
          )}

          {/* 4 вкладки выбора конструкции */}
          <div className="flex flex-wrap p-1 bg-slate-950 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setSelectedConstruction('wall')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedConstruction === 'wall'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Стена {calc.wall.construction.id}
            </button>
            <button
              onClick={() => setSelectedConstruction('roof_worst')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                selectedConstruction === 'roof_worst'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Худшее сечение покрытия по сплошному бетону ребра многопустотной плиты"
            >
              <span>★ Покрытие (ребро)</span>
            </button>
            <button
              onClick={() => setSelectedConstruction('roof_void')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedConstruction === 'roof_void'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Сечение покрытия через круглую пустоту плиты"
            >
              Покрытие (пустота)
            </button>
            <button
              onClick={() => setSelectedConstruction('basement')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                selectedConstruction === 'basement'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Подполье {calc.basement.construction.id}
            </button>
          </div>
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
              : 'Условие влажностного режима выполнено: E(x) > e(x) по всему расчетному сечению!'}
          </span>
          <p className="mt-1 opacity-90">{description}</p>
        </div>
      </div>

      {/* Интерактивный SVG график */}
      <div className="relative overflow-x-auto bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[700px] select-none"
        >
          {/* Фоновые вертикальные полосы слоев материала */}
          {(() => {
            let cumX = 0;
            return layers.map((layer, idx) => {
              const startX = cumX;
              const endX = cumX + (layer.thickness || 0);
              cumX = endX;
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
                    {w > 35 ? `${layer.name.substring(0, 14)} (${Math.round(layer.thickness * 1000)} мм)` : `№${idx + 1}`}
                  </text>
                </g>
              );
            });
          })()}

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
            const isMid = Boolean(pt.isInsulationMidpoint);

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Вертикальная пунктирная линия при наведении или для середины утеплителя */}
                {(isHovered || isMid) && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + plotHeight}
                    stroke={isMid ? '#f59e0b' : '#64748b'}
                    strokeWidth={isMid ? 1.5 : 1}
                    strokeDasharray={isMid ? '3,3' : '2,2'}
                  />
                )}

                {/* Точка E */}
                <circle
                  cx={cx}
                  cy={cyE}
                  r={isMid ? (isHovered ? 7 : 5.5) : isHovered ? 6 : 4}
                  fill={isMid ? '#f59e0b' : '#0284c7'}
                  stroke="#ffffff"
                  strokeWidth={isMid ? 2 : 1.5}
                />
                {/* Точка e */}
                <circle
                  cx={cx}
                  cy={cy_e}
                  r={isMid ? (isHovered ? 7 : 5.5) : isHovered ? 6 : 4}
                  fill={isMid ? '#fbbf24' : '#ea580c'}
                  stroke="#ffffff"
                  strokeWidth={isMid ? 2 : 1.5}
                />

                {/* Маркер середины утеплителя */}
                {isMid && (
                  <text
                    x={cx}
                    y={Math.min(cyE, cy_e) - 10}
                    fill="#f59e0b"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    ★
                  </text>
                )}

                {/* Отметка по оси X */}
                <text
                  x={cx}
                  y={padding.top + plotHeight + 18}
                  fill={isMid ? '#f59e0b' : '#94a3b8'}
                  fontSize={isMid ? '10' : '9'}
                  textAnchor="middle"
                  fontWeight={isMid ? 'bold' : 'normal'}
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
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white inline-block"></span>
            <span className="text-amber-300 font-medium">
              ★ Середина утеплителя (контрольная точка курсача)
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
              const isMid = Boolean(p.isInsulationMidpoint);

              return (
                <tr
                  key={idx}
                  className={`transition ${
                    isMid 
                      ? 'bg-amber-950/30 border-l-4 border-l-amber-400 font-semibold' 
                      : hoveredIndex === idx 
                        ? 'bg-blue-900/20' 
                        : 'hover:bg-slate-800/40'
                  }`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <td className="py-2 px-3 text-white font-medium">{p.x.toFixed(3)}</td>
                  <td className="py-2 px-3 font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={isMid ? 'text-amber-200 font-bold' : 'text-slate-300'}>
                        {p.name}
                      </span>
                      {isMid && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ★ Середина утеплителя
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-blue-300">{p.temp.toFixed(2)} °C</td>
                  <td className="py-2 px-3 text-sky-400">{p.E.toFixed(1)}</td>
                  <td className="py-2 px-3 text-orange-400">{p.e.toFixed(2)}</td>
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
