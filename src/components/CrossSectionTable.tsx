import React from 'react';
import { CrossSectionTemperaturePoint } from '../logic/calculations';
import { Layers, Thermometer, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface CrossSectionTableProps {
  title: string;
  points: CrossSectionTemperaturePoint[];
  t_v: number;
  t_n: number;
  t_n_moisture: number;
  R_total: number;
  sectionBadge?: string;
}

export const CrossSectionTable: React.FC<CrossSectionTableProps> = ({
  title,
  points,
  t_v,
  t_n,
  t_n_moisture,
  R_total,
  sectionBadge,
}) => {
  const showRp = points.some((p) => p.R_p_cumulative !== undefined);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-100">{title}</h3>
              {sectionBadge && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {sectionBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Распределение температур при расчетной зимней tн = {t_n}°C и за отопительный период tн.от = {t_n_moisture}°C
            </p>
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 font-mono text-emerald-400 font-bold">
            Rт = {R_total} м²·°С/Вт
          </span>
        </div>
      </div>

      {/* Пояснение назначения столбцов t_зима и t_от.пер */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono font-bold text-[11px] shrink-0">
            t_зима, °C
          </span>
          <p className="text-slate-300 leading-snug">
            При расчетной зимней <span className="font-mono text-sky-300">tн = {t_n}°C</span> — берется для санитарно-гигиенической проверки (<span className="font-mono">τв &gt; tр</span>, <span className="font-mono">Δtв ≤ Δtв.норм</span>) и оценки промерзания (разд. 2.2 / 3.2).
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-[11px] shrink-0">
            t_от.пер, °C
          </span>
          <p className="text-slate-300 leading-snug">
            При средней температуре отоп. периода <span className="font-mono text-emerald-300">tн.от = {t_n_moisture}°C</span> — берется для расчета <span className="font-mono">E(t)</span>, <span className="font-mono">e(x)</span>, проверки конденсации по методу Фокина, графиков Шибеко и AutoCAD (разд. 2.3 / 3.3).
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">№</th>
              <th className="py-2.5 px-3 font-semibold">Плоскость / Граница сечения</th>
              <th className="py-2.5 px-2 text-right font-semibold">x, мм</th>
              <th className="py-2.5 px-2 text-right font-semibold">δ, мм</th>
              <th className="py-2.5 px-2 text-right font-semibold">R, м²·°С/Вт</th>
              <th className="py-2.5 px-2 text-right font-semibold">ΣR, м²·°С/Вт</th>
              {showRp && (
                <th className="py-2.5 px-2 text-right font-semibold text-cyan-400">ΣRп, м²·ч·Па/мг</th>
              )}
              <th className="py-2.5 px-3 text-right font-semibold text-sky-400" title="Расчетная зимняя температура при tн (для τв и Δtв)">
                <div>t_зима, °C</div>
                <div className="text-[10px] font-normal text-sky-400/70">при tн = {t_n}°C</div>
              </th>
              <th className="py-2.5 px-3 text-right font-semibold text-emerald-400" title="Средняя за отопительный период при tн.от (для E, e и графиков)">
                <div>t_от.пер, °C</div>
                <div className="text-[10px] font-normal text-emerald-400/70">при tн.от = {t_n_moisture}°C</div>
              </th>
              <th className="py-2.5 px-2 text-right font-semibold">E(t), Па</th>
              <th className="py-2.5 px-2 text-right font-semibold">e(x), Па</th>
              <th className="py-2.5 px-3 text-right font-semibold">Запас Δ, Па</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
            {points.map((pt, idx) => {
              const isSafe = pt.delta_margin > 0;
              const isMid = Boolean(pt.isInsulationMidpoint);
              const isVb = Boolean(pt.isVaporBarrier);
              const isInnerAir = idx === 0;
              const isOuterAir = idx === points.length - 1;

              const rowClass = isMid
                ? 'bg-amber-950/30 border-l-4 border-l-amber-400 text-amber-100 font-semibold'
                : isVb
                ? 'bg-cyan-950/40 border-l-4 border-l-cyan-400 text-cyan-100 font-semibold'
                : isInnerAir
                ? 'bg-sky-950/35 border-l-4 border-l-sky-400 text-sky-100'
                : isOuterAir
                ? 'bg-indigo-950/35 border-l-4 border-l-indigo-400 text-indigo-100'
                : 'hover:bg-slate-800/40 transition';

              return (
                <tr key={pt.index} className={rowClass}>
                  <td className="py-2 px-3 text-slate-400 font-sans">
                    {isInnerAir ? 'вн' : isOuterAir ? 'нар' : pt.index}
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-medium ${
                          isMid
                            ? 'text-amber-200 font-bold'
                            : isVb
                            ? 'text-cyan-200 font-bold'
                            : isInnerAir
                            ? 'text-sky-200 font-semibold'
                            : isOuterAir
                            ? 'text-indigo-200 font-semibold'
                            : 'text-slate-200'
                        }`}
                      >
                        {pt.planeName}
                      </span>
                      {isInnerAir && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          Воздух вн. (tв = {t_v}°C)
                        </span>
                      )}
                      {isOuterAir && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Воздух нар. (tн / tн.от)
                        </span>
                      )}
                      {isMid && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ★ Середина утеплителя
                        </span>
                      )}
                      {isVb && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-200 border border-cyan-400/50">
                          Пароизоляция
                        </span>
                      )}
                    </div>
                    {pt.layerName && pt.layerName !== pt.planeName && (
                      <div className="text-[11px] text-slate-400 font-sans">{pt.layerName}</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {isInnerAir || isOuterAir ? '—' : pt.coord_x_mm}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {pt.thickness_mm > 0 ? pt.thickness_mm : '—'}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {pt.R_layer > 0 ? pt.R_layer.toFixed(3) : '—'}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-slate-300">
                    {pt.R_cumulative.toFixed(3)}
                  </td>
                  {showRp && (
                    <td className="py-2 px-2 text-right font-medium text-cyan-300">
                      {pt.R_p_cumulative !== undefined ? pt.R_p_cumulative.toFixed(3) : '—'}
                    </td>
                  )}
                  <td className="py-2 px-3 text-right font-bold">
                    <span 
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        pt.temp_winter > 10 
                          ? 'bg-amber-500/10 text-amber-300' 
                          : pt.temp_winter > 0 
                            ? 'bg-sky-500/10 text-sky-300' 
                            : 'bg-blue-600/20 text-blue-300'
                      }`}
                    >
                      {pt.temp_winter > 0 ? `+${pt.temp_winter.toFixed(2)}` : pt.temp_winter.toFixed(2)}°
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-emerald-300">
                    {pt.temp_heating > 0 ? `+${pt.temp_heating.toFixed(2)}` : pt.temp_heating.toFixed(2)}°
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">
                    {pt.E_sat.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">
                    {pt.e_partial.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span 
                      className={`inline-flex items-center gap-1 font-semibold ${
                        isSafe ? 'text-emerald-400' : 'text-rose-400 font-bold'
                      }`}
                    >
                      {isSafe ? '+' : ''}{pt.delta_margin.toFixed(1)}
                      {isSafe ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 inline" />
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            Температура сечения: <code className="text-slate-300 font-mono">t_i = tв − (ΣR_j / Rт) · (tв − tн)</code>.{' '}
            Парциальное давление: <code className="text-cyan-300 font-mono">e(x) = eв − (ΣRп_j / Rп) · (eв − eн)</code>.{' '}
            Запас по пару: <code className="text-slate-300 font-mono">Δ = E(t_от.пер) − e(x) &gt; 0</code> (отсутствие конденсации; строки «Воздух вн.» и «Воздух нар.» задают граничные условия).
          </span>
        </div>
      </div>
    </div>
  );
};
