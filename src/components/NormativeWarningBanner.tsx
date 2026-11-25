/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Компонент предупреждений о несоответствии нормативным требованиям Rт (СН 2.04.02-2020 / СП 2.04.01-2020)
 */

import React from 'react';
import { NormativeRCheck } from '../logic/calculations';
import { AlertTriangle, ShieldAlert, ArrowRight, Sliders } from 'lucide-react';

interface GlobalWarningBannerProps {
  variant: 'global';
  warnings: NormativeRCheck[];
  onNavigateTab?: (tabId: string) => void;
  onOpenOverridesEditor?: () => void;
}

interface SectionWarningBannerProps {
  variant: 'section';
  check: NormativeRCheck | undefined;
  onOpenOverridesEditor?: () => void;
}

type NormativeWarningBannerProps = GlobalWarningBannerProps | SectionWarningBannerProps;

export const NormativeWarningBanner: React.FC<NormativeWarningBannerProps> = (props) => {
  if (props.variant === 'section') {
    const { check, onOpenOverridesEditor } = props;
    if (!check || check.isFullyCompliant) return null;

    return (
      <div
        role="alert"
        data-testid={`section-normative-warning-${check.id}`}
        className="bg-rose-950/50 border border-rose-500/50 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-rose-200">
                  Нарушение норм тепловой защиты: {check.title} ({check.constructionCode})
                </h3>
                <span className="px-2 py-0.5 rounded bg-rose-900/80 border border-rose-500/40 text-[11px] font-mono text-rose-200">
                  {check.normReference}
                </span>
              </div>
              {check.warningMessage && (
                <p className="text-xs text-rose-100/90 leading-relaxed">
                  {check.warningMessage}
                </p>
              )}
              {!check.isRCompliant && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono">
                  <span className="text-rose-300">
                    Rт.факт = <b>{check.R_actual.toFixed(2)}</b> м²·°С/Вт
                  </span>
                  <span className="text-slate-300">
                    Rт.тр = <b>{check.R_required.toFixed(2)}</b> м²·°С/Вт
                  </span>
                  <span className="text-amber-300 font-semibold">
                    Дефицит: −{check.deficit.toFixed(2)} м²·°С/Вт
                  </span>
                </div>
              )}
              {check.recommendation && (
                <p className="text-xs text-amber-200/90 pt-1">
                  Рекомендация: {check.recommendation}
                </p>
              )}
            </div>
          </div>

          {onOpenOverridesEditor && (
            <button
              type="button"
              onClick={onOpenOverridesEditor}
              className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0 self-start cursor-pointer shadow"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Скорректировать</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { warnings, onNavigateTab, onOpenOverridesEditor } = props;
  if (!warnings || warnings.length === 0) return null;

  return (
    <div
      role="alert"
      data-testid="global-normative-warning-banner"
      className="mb-6 bg-rose-950/60 border border-rose-500/50 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-rose-100">
              Обнаружено несоответствие требуемому сопротивлению Rт ({warnings.length}{' '}
              {warnings.length === 1 ? 'конструкция' : warnings.length < 5 ? 'конструкции' : 'конструкций'})
            </h2>
            <p className="text-xs text-rose-200/80">
              Проверка по актуальным нормам СН 2.04.02-2020 (табл. 7.1) и СП 2.04.01-2020
            </p>
          </div>
        </div>

        {onOpenOverridesEditor && (
          <button
            type="button"
            onClick={onOpenOverridesEditor}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Редактировать расчет</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {warnings.map((w) => (
          <div
            key={w.id}
            data-testid={`global-warning-item-${w.id}`}
            className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 font-mono font-bold text-xs border border-rose-500/40">
                  {w.constructionCode}
                </span>
                <span className="text-xs font-bold text-white">{w.title}</span>
                {!w.isRCompliant && (
                  <span className="text-xs font-mono text-rose-300">
                    Rт = {w.R_actual.toFixed(2)} &lt; {w.R_required.toFixed(2)} м²·°С/Вт (−{w.deficit.toFixed(2)})
                  </span>
                )}
              </div>
              {w.warningMessage && (
                <p className="text-xs text-slate-300">{w.warningMessage}</p>
              )}
              {w.recommendation && (
                <p className="text-[11px] text-amber-300/90">{w.recommendation}</p>
              )}
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab(w.tabId)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-200 border border-rose-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 shrink-0 self-start md:self-center cursor-pointer"
              >
                <span>К разделу</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
