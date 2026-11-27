/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Раздел 3: Теплотехнический расчет совмещенного покрытия / чердачного перекрытия с многопустотной ж/б плитой
 */

import React from 'react';
import { FullCourseworkCalculation } from '../logic/calculations';
import { DecodedCipher } from '../logic/decodeCipher';
import { BUILDING_TYPES } from '../data/buildingTypes';
import { ROOF_VB_PLACEMENTS } from '../data/vaporBarriers';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  Sliders,
  Droplets,
  Thermometer,
  Calculator,
} from 'lucide-react';
import { CrossSectionTable } from './CrossSectionTable';
import { NormativeWarningBanner } from './NormativeWarningBanner';
import { VaporBarrierEditor } from './VaporBarrierEditor';

interface RoofCalculatorProps {
  calc: FullCourseworkCalculation;
  cipher: DecodedCipher;
  onChangeCipher: (newCipher: DecodedCipher) => void;
  onOpenOverridesEditor?: () => void;
  onViewMoistureChart?: () => void;
}

export const RoofCalculator: React.FC<RoofCalculatorProps> = ({
  calc,
  cipher,
  onChangeCipher,
  onOpenOverridesEditor,
  onViewMoistureChart,
}) => {
  const { roof, internalConditions, climate } = calc;
  const roofCheck = calc.normativeChecks.find((c) => c.id === 'roof');
  const [viewSection, setViewSection] = React.useState<'worst' | 'void'>(
    roof.activeSectionType || 'worst'
  );
  const hasCondensation = roof.moistureCondensationRisk;

  const currentSection = viewSection === 'worst' ? roof.worstSection : roof.voidSection;
  const currentProfile = currentSection?.crossSectionProfile || roof.crossSectionProfile;
  const currentR = currentSection?.R_total_section || roof.R_total;

  const rNormRoof =
    cipher.overrides?.R_norm_roof ??
    BUILDING_TYPES[internalConditions.buildingTypeId]?.R_norm_roof ??
    6.0;
  const activeInsLambda =
    cipher.overrides?.roofInsulationConductivity ??
    (internalConditions.exploitationConditions === 'А'
      ? roof.insulation.lambda_A
      : roof.insulation.lambda_B);
  const alphaV = cipher.overrides?.alpha_v_roof ?? cipher.overrides?.alpha_v ?? 8.7;
  const alphaN = cipher.overrides?.alpha_n ?? 23;
  const roofSumRpLayers = +roof.layers.reduce((sum, l) => sum + l.R_p, 0).toFixed(3);
  const roofSumRLayers = +roof.layers.reduce((sum, l) => sum + l.R, 0).toFixed(3);
  const roofEout =
    roof.crossSectionProfile[roof.crossSectionProfile.length - 1]?.e_partial ?? 0;

  return (
    <div className="space-y-6">
      {/* Карточка заголовка */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm border border-indigo-500/30">
                {roof.construction.id}
              </span>
              <h2 className="text-lg font-bold text-white">
                Расчет{' '}
                {roof.construction.kind === 'чердачное'
                  ? 'чердачного перекрытия'
                  : roof.construction.kind === 'над_проездом'
                  ? 'перекрытия над проездом'
                  : 'совмещенного покрытия'}{' '}
                с многопустотной плитой
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {roof.construction.name} (схема «{roof.construction.type}», D = {roof.thermalInertia_D}, {roof.designTempRule} → tн = {roof.design_t_out}°C)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenOverridesEditor && (
              <button
                onClick={onOpenOverridesEditor}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                title="Ручная корректировка толщины утеплителя и расчетных параметров"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Параметры и толщины</span>
              </button>
            )}

            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border ${
                roof.isCompliant
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/60'
              }`}
            >
              {roof.isCompliant ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{roof.isCompliant ? 'Тепловая защита ВЫПОЛНЕНА' : 'Не соответствует нормам'}</span>
            </div>
          </div>
        </div>

        {/* 5 ключевых метрик покрытия (включая Rп) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Требуемое Rт.тр</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {roof.R_required} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Rнорм({rNormRoof.toFixed(1)}) × n({roof.construction.increasingFactor_n})
            </span>
          </div>

          <div
            className={`p-4 rounded-xl border ${
              roof.isRCompliant
                ? 'bg-slate-950/60 border-slate-800/80'
                : 'bg-rose-950/40 border-rose-500/50'
            }`}
          >
            <span className="text-xs text-slate-400 block">Фактическое Rт</span>
            <div
              className={`text-xl font-bold font-mono mt-1 ${
                roof.isRCompliant ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {roof.R_total} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span
              className={`text-[11px] block mt-1 ${
                roof.isRCompliant ? 'text-emerald-500/80' : 'text-rose-300'
              }`}
            >
              {roof.isRCompliant
                ? `Запас: +${(((roof.R_total - roof.R_required) / roof.R_required) * 100).toFixed(1)}%`
                : `Дефицит: −${(roof.R_required - roof.R_total).toFixed(2)} м²·°С/Вт`}
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Многопустотная плита Rпл</span>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
              {roof.hollowCore.R_slab} <span className="text-xs font-sans text-slate-400">м²·°С/Вт</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              h={roof.hollowCore.height} мм, d={roof.hollowCore.voidDiameter} мм
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <span className="text-xs text-slate-400 block">Толщина утеплителя δут</span>
            <div className="text-xl font-bold font-mono text-blue-400 mt-1">
              {Math.round(roof.delta_insulation_adopted * 1000)} <span className="text-xs font-sans text-slate-400">мм</span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              Расчетная: {(roof.delta_insulation_calc * 1000).toFixed(0)} мм ({roof.insulation.id})
            </span>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/35 col-span-2 lg:col-span-1">
            <span className="text-xs text-slate-400 block">Паропроницание Rп</span>
            <div
              data-testid="roof-summary-rp"
              className="text-xl font-bold font-mono text-cyan-400 mt-1"
            >
              {roof.total_R_p.toFixed(2)} <span className="text-xs font-sans text-slate-400">м²·ч·Па/мг</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono block mt-1">
              пуст.: {roof.total_R_p_void.toFixed(2)} | реб.: {roof.total_R_p_rib.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Температура внутренней поверхности потолка τв (стационарный расчет без m) */}
        <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
          <div className="font-mono text-slate-300">
            <span className="font-sans font-semibold text-slate-200 mr-2">
              Температура внутренней поверхности τв = tв − (tв − tн)/(R₀·αв):
            </span>
            <span className="text-white font-bold">{roof.tau_v_min} °C</span>
            <span className="text-slate-400 ml-2">
              (по ребру {roof.worstSection.tau_v_steady} °C, по пустоте {roof.voidSection.tau_v_steady} °C; Δtв = {roof.delta_t_actual} ≤ {roof.delta_t_norm} °C)
            </span>
          </div>
          <span
            className={`font-mono font-semibold shrink-0 ${
              roof.tau_v_min > roof.dew_point ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {roof.tau_v_min > roof.dew_point
              ? `τв > tр (${roof.dew_point} °C) ✓`
              : `τв ≤ tр (${roof.dew_point} °C) — конденсат!`}
          </span>
        </div>
      </div>

      <NormativeWarningBanner
        variant="section"
        check={roofCheck}
        onOpenOverridesEditor={onOpenOverridesEditor}
      />

      {/* Блок расчета приведенного сопротивления многопустотной ж/б плиты */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center space-x-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Теплотехнический расчет многопустотной железобетонной плиты перекрытия</span>
        </h3>
        <p className="text-xs text-slate-300">
          Приведенное сопротивление теплопередаче плиты с круглыми невентилируемыми пустотами (a = {roof.hollowCore.a_eq} м, b₁ = {roof.hollowCore.b_rib} м, δп = {roof.hollowCore.delta_flange_eq} м) по СП 2.04.01-2020:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              По бетонному ребру R₁ (худшее сечение):
            </span>
            <div className="text-indigo-300 text-sm font-bold">
              R₁ = h / λб = {roof.hollowCore.R_1_rib} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Сплошной бетон ребра шириной b₁ = {roof.hollowCore.b_rib} м при h = {roof.hollowCore.height} мм.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              По круглой пустоте R₂ (с возд. прослойкой):
            </span>
            <div className="text-indigo-300 text-sm font-bold">
              R₂ = 2·δп/λб + 0.15 = {roof.hollowCore.R_2_void} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Эквивалентная сторона пустоты a = {roof.hollowCore.a_eq} м (d = {roof.hollowCore.voidDiameter} мм, Rзвп = 0.15).
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-sans block font-semibold mb-1">
              Приведенное сопротивление плиты Rпл:
            </span>
            <div className="text-emerald-400 text-sm font-bold">
              Rпл = (b₁ + a)/(b₁/R₁ + a/R₂) = {roof.hollowCore.R_slab} м²·°С/Вт
            </div>
            <p className="text-[11px] font-sans text-slate-500 mt-2">
              Шаг пустот {roof.hollowCore.spacing} мм; Условия эксплуатации {internalConditions.exploitationConditions}.
            </p>
          </div>
        </div>
      </div>

      {/* Универсальный выбор и мгновенное редактирование всех параметров пароизоляции покрытия */}
      <VaporBarrierEditor
        title="Пароизоляция покрытия (Приложение Н Шибеко / автоподбор / свои параметры)"
        subtitle="При выборе любого материала пароизоляции (или в режиме автоподбора) все ее характеристики (название, δ, Rп / μ, λ, s, ρ) сразу доступны для правки"
        config={cipher.overrides?.roofVaporBarrier}
        applied={roof.vaporBarrier}
        supportAuto={true}
        totalRp={roof.total_R_p}
        totalRpNote={`(пуст.: ${roof.total_R_p_void.toFixed(2)}, реб.: ${roof.total_R_p_rib.toFixed(2)})`}
        placements={ROOF_VB_PLACEMENTS}
        defaultPlacement="before_insulation"
        accent="emerald"
        testIdPrefix="roof"
        onChange={(next) =>
          onChangeCipher({
            ...cipher,
            overrides: {
              ...cipher.overrides,
              roofVaporBarrier: next,
            },
          })
        }
      />

      {/* Обоснование и влажностный режим покрытия */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Влажностный режим покрытия (метод К. Ф. Фокина, Rп.возд = 0)</span>
          </h3>
          {onViewMoistureChart && (
            <button
              onClick={onViewMoistureChart}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
            >
              <Droplets className="w-3.5 h-3.5" />
              <span>Открыть график E(x) / e(x)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Примененная пароизоляция</span>
            {roof.vaporBarrier ? (
              <>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  Rп.из = {roof.vaporBarrier.R_p.toFixed(2)} м²·ч·Па/мг (δ = {roof.vaporBarrier.thicknessMm} мм)
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {roof.vaporBarrier.name} {roof.vaporBarrier.isAuto ? '(автоподбор)' : '(выбрано вручную)'}.
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-bold font-mono text-emerald-400">
                  Не требуется (Rп.из = 0)
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Суммарное Rп = {roof.total_R_p} м²·ч·Па/мг обеспечивает e(x) &lt; E(x) без доп. пароизоляции.
                </p>
              </>
            )}
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Давление пара Eв(tв), eв и eн</span>
            <div className="text-sm font-bold font-mono text-cyan-300">
              Eв({internalConditions.t_v}°) = {internalConditions.E_v} Па
            </div>
            <div className="text-xs font-bold font-mono text-white">
              eв = {internalConditions.e_v} Па / eн = {roof.crossSectionProfile[roof.crossSectionProfile.length - 1]?.e_partial} Па
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              eв = ({internalConditions.phi_v}%/100)·Eв; снаружи при tн.от = {climate.t_heating_period}°C (φн.от = {climate.rh_heating_period}%).
            </p>
          </div>

          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Риск конденсации в толще конструкции</span>
            <div className={`text-sm font-bold font-mono ${hasCondensation ? 'text-rose-400' : 'text-emerald-400'}`}>
              {hasCondensation ? 'ВНИМАНИЕ: e(x) ≥ E(x)' : 'НЕТ: e(x) < E(x) на всех сечениях'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {hasCondensation
                ? 'Увеличьте сопротивление Rп пароизоляции (выберите ПЭ пленку или фольгированную мембрану).'
                : roof.vaporBarrierAdded
                ? 'Пароизоляция полностью отсекает диффузионный поток пара из помещения.'
                : 'Условие отсутствия конденсации выполняется естественным образом во всех плоскостях.'}
            </p>
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-4 text-xs text-slate-200 space-y-2">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white text-sm">
                Физическое обоснование влажностного режима (СП 2.04.01-2020):
              </p>
              {roof.vaporBarrierAdded ? (
                <>
                  <p className="text-slate-300 mt-1">
                    Перед утеплителем предусмотрен слой пароизоляции ({roof.vaporBarrier?.name}, δ = {roof.vaporBarrier?.thicknessMm} мм, Rп = {roof.vaporBarrier?.R_p} м²·ч·Па/мг).
                  </p>
                  <p className="text-emerald-300 font-medium mt-1">
                    {hasCondensation
                      ? '⚠ Текущего Rп недостаточно — рекомендуется выбрать более плотную пароизоляцию.'
                      : '✓ Условие отсутствия конденсации e(x) < E(x) обеспечено на всех расчетных сечениях (с линейной интерполяцией E(t)).'}
                  </p>
                </>
              ) : (
                <p className="text-emerald-300 font-medium mt-1">
                  ✓ По результатам проверки методом К. Ф. Фокина кривая e(x) лежит ниже кривой E(x) во всех точках, включая середину утеплителя. Устройство дополнительного слоя пароизоляции не требуется.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица слоев покрытия */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-4">
          Слои покрытия и их теплофизические характеристики
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 font-semibold">
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Наименование слоя</th>
                <th className="py-2.5 px-3">Материал</th>
                <th className="py-2.5 px-3">Толщина δ (мм)</th>
                <th className="py-2.5 px-3">λ (Вт/м·°С)</th>
                <th className="py-2.5 px-3">R (м²·°С/Вт)</th>
                <th className="py-2.5 px-3">s (Вт/м²·°С)</th>
                <th className="py-2.5 px-3">D = R·s</th>
                <th className="py-2.5 px-3">μ (мг/м·ч·Па)</th>
                <th className="py-2.5 px-3">Rп (м²·ч·Па/мг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {roof.layers.map((l, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/30 transition ${
                    l.name.toLowerCase().includes('пароизол') ? 'bg-cyan-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3 font-sans text-white font-medium">{l.name}</td>
                  <td className="py-2 px-3 font-sans text-slate-300">{l.materialName}</td>
                  <td className="py-2 px-3 text-blue-300">
                    {l.thickness * 1000 < 10
                      ? +(l.thickness * 1000).toFixed(2)
                      : Math.round(l.thickness * 1000)}
                  </td>
                  <td className="py-2 px-3 text-slate-300">{l.lambda}</td>
                  <td className="py-2 px-3 text-emerald-400 font-semibold">{l.R.toFixed(3)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.s}</td>
                  <td className="py-2 px-3 text-amber-400">{l.D.toFixed(2)}</td>
                  <td className="py-2 px-3 text-slate-300">{l.mu}</td>
                  <td className="py-2 px-3 text-cyan-300">{l.R_p.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-800 bg-slate-950 font-mono font-bold text-slate-200">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 font-sans text-right">
                  Суммарно по конструкции покрытия (с 1/37 и 1/77 для Rп):
                </td>
                <td className="py-2.5 px-3 text-white">
                  {Math.round(roof.layers.reduce((sum, l) => sum + l.thickness, 0) * 1000)} мм
                </td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-emerald-400">{roofSumRLayers.toFixed(3)}</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-amber-400">{roof.thermalInertia_D}</td>
                <td className="py-2.5 px-3">—</td>
                <td className="py-2.5 px-3 text-cyan-400">{roof.total_R_p.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Пошаговые формулы расчета покрытия */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Формулы и этапы теплотехнического и влажностного расчета покрытия
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              1. Требуемое сопротивление Rт.тр и толщина утеплителя δут:
            </span>
            <div className="text-blue-300">
              Rт.тр = Rт.норм × n = {rNormRoof.toFixed(2)} × {roof.construction.increasingFactor_n} ={' '}
              <span className="font-bold text-white">{roof.R_required} м²·°С/Вт</span>
            </div>
            <div className="text-blue-300">
              δут.расч = (Rт.тр − Rбез_ут) × λут = ({roof.R_required} − {roof.R_without_insulation}) × {activeInsLambda} ={' '}
              <span className="font-bold text-white">{roof.delta_insulation_calc} м</span>
            </div>
            <div className="text-emerald-400 font-sans">
              Принята толщина утеплителя: <span className="font-mono font-bold">{Math.round(roof.delta_insulation_adopted * 1000)} мм</span>.
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              2. Приведенное сопротивление R₀ и тепловая инерция D:
            </span>
            <div className="text-blue-300">
              R₀ = 1/αв + Rпл + Σ(δᵢ/λᵢ) + 1/αн = 1/{alphaV} + {roofSumRLayers.toFixed(3)} + 1/{alphaN} ={' '}
              <span className="font-bold text-white">{roof.R_total} м²·°С/Вт</span>
            </div>
            <div className="text-amber-300">
              Dпокрытия = min(Dпуст = {roof.thermalInertia_D_void}, Dреб = {roof.thermalInertia_D_rib}) ={' '}
              <span className="font-bold text-white">{roof.thermalInertia_D}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              {roof.designTempRule} → tн = {roof.design_t_out}°C (при sвозд = 0 в замкнутой пустоте плиты).
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              3. Перепад температур Δtв и температура внутренней поверхности τв:
            </span>
            <div className="text-blue-300">
              Δtв = (tв − tн) / (R₀ · αв) = ({internalConditions.t_v} − ({roof.design_t_out})) / ({currentR} · {alphaV}) ={' '}
              <span className="font-bold text-white">{roof.delta_t_actual} °C</span> ≤ {roof.delta_t_norm} °C
            </div>
            <div className="text-blue-300">
              τв = tв − Δtв = {internalConditions.t_v} − {roof.delta_t_actual} ={' '}
              <span className="font-bold text-white">{roof.tau_v_min} °C</span> &gt; tр ({roof.dew_point} °C)
            </div>
            <p className="text-[11px] text-slate-500 font-sans">
              По ребру: τв = {roof.worstSection.tau_v_steady}°C; по пустоте: τв = {roof.voidSection.tau_v_steady}°C.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2">
            <span className="text-slate-400 font-sans block font-semibold">
              4. Сопротивление паропроницанию Rп (Rп.возд = 0 по СП 2.04.01 п. 10.5):
            </span>
            <div className="text-cyan-300">
              Rп = 1/37 + Σ(δᵢ/μᵢ){roof.vaporBarrier ? ' + Rп.пи' : ''} + 1/77 = 0,027 + {roofSumRpLayers} + 0,013 ={' '}
              <span className="font-bold text-white">{roof.total_R_p.toFixed(2)} м²·ч·Па/мг</span>
            </div>
            <div className="text-slate-300">
              По пустоте (2 полки, Rп.возд = 0): <span className="text-cyan-300 font-bold">{roof.total_R_p_void.toFixed(2)}</span> | По ребру (h={roof.hollowCore.height} мм): <span className="text-indigo-300 font-bold">{roof.total_R_p_rib.toFixed(2)}</span>
            </div>
            <div className="text-slate-400">
              e(x) = eв − ((eв − eн.от) / Rп) · ΣRп = {internalConditions.e_v} − (({internalConditions.e_v} − {roofEout}) / {roof.total_R_p.toFixed(2)}) · ΣRп
            </div>
          </div>
        </div>
      </div>

      {/* Переключатель расчетного сечения (Худшее сечение по ребру vs Сечение по пустоте) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              <span>Расчетное сечение покрытия / перекрытия:</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Переключайтесь между худшим сечением (по сплошному бетонному ребру) и сечением по круглой пустоте
            </p>
          </div>

          <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setViewSection('worst')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewSection === 'worst'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>★ Худшее сечение (по ребру, Rпл = {roof.hollowCore.R_rib_worst})</span>
            </button>
            <button
              onClick={() => setViewSection('void')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewSection === 'void'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Сечение по пустоте (Rпл = {roof.hollowCore.R_void_section})</span>
            </button>
          </div>
        </div>

        <CrossSectionTable
          title={`Расчетное сечение покрытия (${
            viewSection === 'worst'
              ? 'Худшее сечение по сплошному бетону ребра'
              : 'Сечение по круглой воздушной пустоте'
          })`}
          points={currentProfile}
          t_v={internalConditions.t_v}
          t_n={viewSection === 'worst' ? roof.worstSection.design_t_out : roof.voidSection.design_t_out}
          t_n_moisture={climate.t_heating_period}
          R_total={currentR}
          sectionBadge={viewSection === 'worst' ? '★ Худшее сечение (по ребру)' : 'Сечение по пустоте'}
        />
      </div>
    </div>
  );
};
