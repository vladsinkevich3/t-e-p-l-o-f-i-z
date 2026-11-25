import React, { useState } from 'react';
import { 
  X, 
  Sliders, 
  RotateCcw, 
  Thermometer, 
  Layers, 
  FileCheck2, 
  Sparkles, 
  Building, 
  Plus, 
  Trash2, 
  Settings, 
  Droplets, 
  Grid 
} from 'lucide-react';
import { 
  DecodedCipher, 
  CalculationOverrides, 
  CustomLayerOverride, 
  SHIBEKO_LEGACY_GRODNO 
} from '../logic/decodeCipher';
import { FullCourseworkCalculation } from '../logic/calculations';
import { getCityClimate } from '../data/climate';
import { BuildingTypeId, BUILDING_TYPES } from '../data/buildingTypes';
import {
  MATERIALS,
  MATERIAL_CATEGORY_ORDER,
  MATERIAL_CATEGORY_LABELS,
  getSortedMaterialsList,
} from '../data/materials';

interface CalculationOverridesEditorProps {
  isOpen: boolean;
  onClose: () => void;
  cipher: DecodedCipher;
  calc: FullCourseworkCalculation;
  onUpdateCipher: (updated: DecodedCipher) => void;
}

type EditorTab = 'insulation' | 'layers' | 'slab' | 'climate' | 'microclimate' | 'engineering';

interface EditableLayerRow {
  id: string;
  materialName: string;
  thickness_mm: number;
  lambda: number;
  s: number;
  mu: number;
  isInsulation: boolean;
}

export const CalculationOverridesEditor: React.FC<CalculationOverridesEditorProps> = ({
  isOpen,
  onClose,
  cipher,
  calc,
  onUpdateCipher,
}) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('insulation');
  const [selectedLayersTarget, setSelectedLayersTarget] = useState<'wall' | 'roof' | 'basement'>('wall');

  if (!isOpen) return null;

  const currentOverrides = cipher.overrides || {};
  const baseClimate = getCityClimate(cipher.cityCode || 'Г27');

  const updateOverrideFields = (patch: Partial<CalculationOverrides>) => {
    const updated: Record<string, unknown> = { ...currentOverrides };
    for (const [k, value] of Object.entries(patch)) {
      if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
        delete updated[k];
      } else {
        updated[k] = value;
      }
    }
    onUpdateCipher({
      ...cipher,
      overrides:
        Object.keys(updated).length > 0 ? (updated as CalculationOverrides) : undefined,
    });
  };

  const updateOverrideField = <K extends keyof CalculationOverrides>(
    field: K,
    value: CalculationOverrides[K] | undefined
  ) => {
    updateOverrideFields({ [field]: value } as Partial<CalculationOverrides>);
  };

  const sortedMaterials = getSortedMaterialsList();
  const activeExpCond = calc.internalConditions.exploitationConditions;
  const tColdest3Days092 = +(
    (calc.climate.t_coldest_day_092 + calc.climate.t_coldest_5days_092) /
    2
  ).toFixed(1);

  const handleApplySP2026 = () => {
    const updated = { ...currentOverrides };
    delete updated.t_coldest_5days_092;
    delete updated.t_coldest_day_098;
    delete updated.t_coldest_day_092;
    delete updated.t_heating_period;
    delete updated.duration_heating_period;
    delete updated.wind_speed_winter;
    delete updated.rh_heating_period;
    delete updated.designTemperatureMode;
    delete updated.customDesignTemp;

    onUpdateCipher({
      ...cipher,
      overrides: Object.keys(updated).length > 0 ? updated : undefined,
    });
  };

  const handleApplyShibekoLegacy = () => {
    onUpdateCipher({
      ...cipher,
      overrides: {
        ...currentOverrides,
        ...SHIBEKO_LEGACY_GRODNO,
      },
    });
  };

  const handleResetAll = () => {
    onUpdateCipher({
      ...cipher,
      overrides: undefined,
    });
  };

  // Wall insulation calculations
  const wallCalcMm = Math.round(calc.wall.delta_insulation_calc * 1000);
  const wallAdoptedMm = Math.round(calc.wall.delta_insulation_adopted * 1000);

  // Roof insulation calculations
  const roofCalcMm = Math.round(calc.roof.delta_insulation_calc * 1000);
  const roofAdoptedMm = Math.round(calc.roof.delta_insulation_adopted * 1000);

  // Basement insulation calculations
  const baseAdoptedMm = Math.round(calc.basement.delta_insulation_adopted * 1000);

  // Custom layers helper
  const getActiveLayersList = (): EditableLayerRow[] => {
    if (selectedLayersTarget === 'wall') {
      if (currentOverrides.wallCustomLayers && currentOverrides.wallCustomLayers.length > 0) {
        return currentOverrides.wallCustomLayers.map((l, i) => ({
          id: l.id || `wall-layer-${i + 1}`,
          materialName: l.materialName || l.name,
          thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
          lambda: l.lambda,
          s: l.s,
          mu: l.mu,
          isInsulation: Boolean(l.isInsulation),
        }));
      }
      return calc.wall.layers.map((l, i) => ({
        id: `wall-layer-${i + 1}`,
        materialName: l.materialName || l.name,
        thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
        lambda: l.lambda,
        s: l.s,
        mu: l.mu,
        isInsulation: l.name.toLowerCase().includes('утепл') || l.lambda <= 0.08,
      }));
    }
    if (selectedLayersTarget === 'roof') {
      if (currentOverrides.roofCustomLayers && currentOverrides.roofCustomLayers.length > 0) {
        return currentOverrides.roofCustomLayers.map((l, i) => ({
          id: l.id || `roof-layer-${i + 1}`,
          materialName: l.materialName || l.name,
          thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
          lambda: l.lambda,
          s: l.s,
          mu: l.mu,
          isInsulation: Boolean(l.isInsulation),
        }));
      }
      return calc.roof.layers.map((l, i) => ({
        id: `roof-layer-${i + 1}`,
        materialName: l.materialName || l.name,
        thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
        lambda: l.lambda,
        s: l.s,
        mu: l.mu,
        isInsulation: l.name.toLowerCase().includes('утепл') || l.lambda <= 0.08,
      }));
    }
    // basement
    if (currentOverrides.basementCustomLayers && currentOverrides.basementCustomLayers.length > 0) {
      return currentOverrides.basementCustomLayers.map((l, i) => ({
        id: l.id || `basement-layer-${i + 1}`,
        materialName: l.materialName || l.name,
        thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
        lambda: l.lambda,
        s: l.s,
        mu: l.mu,
        isInsulation: Boolean(l.isInsulation),
      }));
    }
    return calc.basement.layers.map((l, i) => ({
      id: `basement-layer-${i + 1}`,
      materialName: l.materialName || l.name,
      thickness_mm: Math.round(l.thickness * 1000 * 10) / 10,
      lambda: l.lambda,
      s: l.s,
      mu: l.mu,
      isInsulation: l.name.toLowerCase().includes('утепл') || l.lambda <= 0.08,
    }));
  };

  const serializeLayers = (list: EditableLayerRow[]): CustomLayerOverride[] => {
    return list.map((r) => ({
      id: r.id,
      name: r.materialName,
      materialName: r.materialName,
      thickness: r.thickness_mm / 1000,
      lambda: r.lambda,
      s: r.s,
      mu: r.mu,
      isInsulation: r.isInsulation,
    }));
  };

  const handleUpdateLayer = (idx: number, patch: Partial<EditableLayerRow>) => {
    const list = [...getActiveLayersList()];
    list[idx] = { ...list[idx], ...patch };
    const serialized = serializeLayers(list);
    if (selectedLayersTarget === 'wall') updateOverrideField('wallCustomLayers', serialized);
    else if (selectedLayersTarget === 'roof') updateOverrideField('roofCustomLayers', serialized);
    else updateOverrideField('basementCustomLayers', serialized);
  };

  const handleAddLayer = () => {
    const list = [...getActiveLayersList()];
    list.push({
      id: `new-layer-${Date.now()}`,
      materialName: 'Новый расчетный слой',
      thickness_mm: 50,
      lambda: 0.045,
      s: 0.5,
      mu: 0.3,
      isInsulation: false,
    });
    const serialized = serializeLayers(list);
    if (selectedLayersTarget === 'wall') updateOverrideField('wallCustomLayers', serialized);
    else if (selectedLayersTarget === 'roof') updateOverrideField('roofCustomLayers', serialized);
    else updateOverrideField('basementCustomLayers', serialized);
  };

  const handleRemoveLayer = (idx: number) => {
    const list = getActiveLayersList().filter((_, i) => i !== idx);
    const serialized = list.length > 0 ? serializeLayers(list) : undefined;
    if (selectedLayersTarget === 'wall') updateOverrideField('wallCustomLayers', serialized);
    else if (selectedLayersTarget === 'roof') updateOverrideField('roofCustomLayers', serialized);
    else updateOverrideField('basementCustomLayers', serialized);
  };

  const handleResetLayers = () => {
    if (selectedLayersTarget === 'wall') updateOverrideField('wallCustomLayers', undefined);
    else if (selectedLayersTarget === 'roof') updateOverrideField('roofCustomLayers', undefined);
    else updateOverrideField('basementCustomLayers', undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Редактор всех расчетных параметров и конструкций курсовой работы
              </h2>
              <p className="text-xs text-slate-400">
                Полная свобода корректировки: толщины утеплителей, послойный состав, худшее сечение, климат СП 2.04.04-2026
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick presets toolbar */}
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-medium">Нормативные пресеты:</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleApplySP2026}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition font-medium flex items-center gap-1.5 cursor-pointer"
              title="Применить климатические нормы СП 2.04.04-2026"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>СП 2.04.04-2026</span>
            </button>

            <button
              onClick={handleApplyShibekoLegacy}
              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 transition font-medium flex items-center gap-1.5 cursor-pointer"
              title="Применить эталонные данные Шибеко 2018 (Гродно tн=-22, z=194)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Эталон Шибеко (Архив)</span>
            </button>

            <button
              onClick={handleResetAll}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition font-medium flex items-center gap-1.5 cursor-pointer"
              title="Сбросить все переопределения к стандартному расчету"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить все</span>
            </button>
          </div>
        </div>

        {/* Tab navigation bar */}
        <div className="flex flex-wrap border-b border-slate-800 bg-slate-950/30 text-xs px-2 pt-2 gap-1">
          <button
            onClick={() => setActiveTab('insulation')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'insulation'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Утеплители (толщины & λ)</span>
          </button>

          <button
            onClick={() => setActiveTab('layers')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'layers'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>2. Послойный состав</span>
          </button>

          <button
            onClick={() => setActiveTab('slab')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'slab'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>3. Сечение покрытия & плита</span>
          </button>

          <button
            onClick={() => setActiveTab('climate')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'climate'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>4. Климат СП 2.04.04-2026</span>
          </button>

          <button
            onClick={() => setActiveTab('microclimate')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'microclimate'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>5. Микроклимат & нормы</span>
          </button>

          <button
            onClick={() => setActiveTab('engineering')}
            className={`px-3 py-2 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'engineering'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-t-blue-500 font-semibold border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>6. Окна & техподполье</span>
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6 space-y-6 text-xs flex-1">
          {/* TAB 1: Толщины утеплителей */}
          {activeTab === 'insulation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Толщины и характеристики теплоизоляционных слоев
                </span>
                <span className="text-slate-400 text-[11px]">
                  Здесь можно вручную скорректировать расчетную и принятую толщину для точного совпадения с заданием
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* СТЕНА */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">Наружная стена ({cipher.wallCode})</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      расчет: {wallCalcMm} мм
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Принятая толщина утеплителя δут, мм:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="5"
                        min="10"
                        max="600"
                        value={currentOverrides.wallInsulationThickness !== undefined ? Math.round(currentOverrides.wallInsulationThickness * 1000) : wallAdoptedMm}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateOverrideField('wallInsulationThickness', isNaN(val) ? undefined : +(val / 1000).toFixed(3));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400">мм</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Теплопроводность λут, Вт/(м·°C):</label>
                    <input
                      type="number"
                      step="0.001"
                      value={currentOverrides.wallInsulationConductivity ?? calc.wall.insulation.lambda_B}
                      onChange={(e) => updateOverrideField('wallInsulationConductivity', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[10px] pt-1">
                    <button
                      onClick={() => updateOverrideField('wallInsulationThickness', +(Math.ceil(calc.wall.delta_insulation_calc * 100) / 100).toFixed(2))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      10 мм ({Math.ceil(wallCalcMm / 10) * 10})
                    </button>
                    <button
                      onClick={() => updateOverrideField('wallInsulationThickness', +(Math.ceil(calc.wall.delta_insulation_calc * 20) / 20).toFixed(2))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      50 мм ({Math.ceil(wallCalcMm / 50) * 50})
                    </button>
                    {currentOverrides.wallInsulationThickness !== undefined && (
                      <button
                        onClick={() => updateOverrideField('wallInsulationThickness', undefined)}
                        className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800/40 transition cursor-pointer"
                      >
                        Авто
                      </button>
                    )}
                  </div>
                </div>

                {/* ПОКРЫТИЕ */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">Покрытие ({cipher.roofCode})</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      расчет: {roofCalcMm} мм
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Принятая толщина утеплителя δут, мм:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="5"
                        min="10"
                        max="600"
                        value={currentOverrides.roofInsulationThickness !== undefined ? Math.round(currentOverrides.roofInsulationThickness * 1000) : roofAdoptedMm}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateOverrideField('roofInsulationThickness', isNaN(val) ? undefined : +(val / 1000).toFixed(3));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400">мм</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Теплопроводность λут, Вт/(м·°C):</label>
                    <input
                      type="number"
                      step="0.001"
                      value={currentOverrides.roofInsulationConductivity ?? calc.roof.insulation.lambda_B}
                      onChange={(e) => updateOverrideField('roofInsulationConductivity', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[10px] pt-1">
                    <button
                      onClick={() => updateOverrideField('roofInsulationThickness', +(Math.ceil(calc.roof.delta_insulation_calc * 100) / 100).toFixed(2))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      10 мм ({Math.ceil(roofCalcMm / 10) * 10})
                    </button>
                    <button
                      onClick={() => updateOverrideField('roofInsulationThickness', +(Math.ceil(calc.roof.delta_insulation_calc * 20) / 20).toFixed(2))}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      50 мм ({Math.ceil(roofCalcMm / 50) * 50})
                    </button>
                    {currentOverrides.roofInsulationThickness !== undefined && (
                      <button
                        onClick={() => updateOverrideField('roofInsulationThickness', undefined)}
                        className="px-2 py-1 rounded bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-800/40 transition cursor-pointer"
                      >
                        Авто
                      </button>
                    )}
                  </div>
                </div>

                {/* ПОДПОЛЬЕ */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm">Подполье ({cipher.basementCode})</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      принято: {baseAdoptedMm} мм
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Толщина утеплителя перекрытия, мм:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="5"
                        min="10"
                        max="300"
                        value={currentOverrides.basementInsulationThickness !== undefined ? Math.round(currentOverrides.basementInsulationThickness * 1000) : baseAdoptedMm}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateOverrideField('basementInsulationThickness', isNaN(val) ? undefined : +(val / 1000).toFixed(3));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="text-slate-400">мм</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Теплопроводность λут, Вт/(м·°C):</label>
                    <input
                      type="number"
                      step="0.001"
                      value={currentOverrides.basementInsulationConductivity ?? calc.basement.insulation.lambda_B}
                      onChange={(e) => updateOverrideField('basementInsulationConductivity', parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-[10px] pt-1">
                    <button
                      onClick={() => updateOverrideField('basementInsulationThickness', 0.05)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      50 мм
                    </button>
                    <button
                      onClick={() => updateOverrideField('basementInsulationThickness', 0.08)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      80 мм
                    </button>
                    <button
                      onClick={() => updateOverrideField('basementInsulationThickness', 0.10)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                    >
                      100 мм
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Послойный состав конструкций */}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200 text-sm">Конструкция для редактирования слоев:</span>
                  <div className="inline-flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setSelectedLayersTarget('wall')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        selectedLayersTarget === 'wall' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Стена {cipher.wallCode}
                    </button>
                    <button
                      onClick={() => setSelectedLayersTarget('roof')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        selectedLayersTarget === 'roof' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Покрытие {cipher.roofCode}
                    </button>
                    <button
                      onClick={() => setSelectedLayersTarget('basement')}
                      className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        selectedLayersTarget === 'basement' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Подполье {cipher.basementCode}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddLayer}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить слой</span>
                  </button>
                  <button
                    onClick={handleResetLayers}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Сбросить слои этой конструкции к стандартным по шифру Шибеко"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>К стандартным</span>
                  </button>
                </div>
              </div>

              {/* Layers table editor */}
              <div className="overflow-x-auto bg-slate-950/60 rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">№</th>
                      <th className="py-2.5 px-3">Наименование материала</th>
                      <th className="py-2.5 px-2">Толщина δ (мм)</th>
                      <th className="py-2.5 px-2">λ (Вт/м·°С)</th>
                      <th className="py-2.5 px-2">s (Вт/м²·°С)</th>
                      <th className="py-2.5 px-2">μ (мг/м·ч·Па)</th>
                      <th className="py-2.5 px-2 text-center">Утеплитель?</th>
                      <th className="py-2.5 px-2 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {getActiveLayersList().map((layer, idx) => (
                      <tr key={layer.id || idx} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-sans space-y-1 min-w-[230px]">
                          <input
                            type="text"
                            value={layer.materialName}
                            onChange={(e) => handleUpdateLayer(idx, { materialName: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                          />
                          <select
                            value=""
                            onChange={(e) => {
                              const mat = MATERIALS[e.target.value];
                              if (!mat) return;
                              handleUpdateLayer(idx, {
                                materialName: mat.name,
                                lambda: activeExpCond === 'А' ? mat.lambda_A : mat.lambda_B,
                                s: activeExpCond === 'А' ? mat.s_A : mat.s_B,
                                mu: mat.mu,
                                isInsulation: mat.category === 'insulation',
                              });
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[10px] text-cyan-300 outline-none focus:border-cyan-500 cursor-pointer"
                            title="Подставить характеристики материала из СП 2.04.01-2020 (табл. Д.1)"
                          >
                            <option value="">↳ Выбрать материал из СП 2.04.01-2020 (усл. {activeExpCond})...</option>
                            {MATERIAL_CATEGORY_ORDER.map((cat) => (
                              <optgroup key={cat} label={MATERIAL_CATEGORY_LABELS[cat]}>
                                {sortedMaterials
                                  .filter((m) => m.category === cat)
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} (λ={activeExpCond === 'А' ? m.lambda_A : m.lambda_B}, s={activeExpCond === 'А' ? m.s_A : m.s_B}, μ={m.mu})
                                    </option>
                                  ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="1"
                            value={layer.thickness_mm}
                            onChange={(e) => handleUpdateLayer(idx, { thickness_mm: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-blue-300 text-xs outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={layer.lambda}
                            onChange={(e) => handleUpdateLayer(idx, { lambda: parseFloat(e.target.value) || 0.01 })}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.1"
                            value={layer.s}
                            onChange={(e) => handleUpdateLayer(idx, { s: parseFloat(e.target.value) || 0 })}
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.001"
                            value={layer.mu}
                            onChange={(e) => handleUpdateLayer(idx, { mu: parseFloat(e.target.value) || 0 })}
                            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(layer.isInsulation)}
                            onChange={(e) => handleUpdateLayer(idx, { isInsulation: e.target.checked })}
                            className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => handleRemoveLayer(idx)}
                            className="p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition cursor-pointer"
                            title="Удалить слой"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Сечение покрытия и пустотная плита */}
          {activeTab === 'slab' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Grid className="w-4 h-4 text-indigo-400" />
                  Сечение совмещенного покрытия и параметры многопустотной ж/б плиты
                </span>
              </div>

              {/* Mode switch */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <span className="font-semibold text-slate-200 block text-xs">
                  Активное сечение для расчета температур и влажности:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    !currentOverrides.roofCrossSectionMode || currentOverrides.roofCrossSectionMode === 'worst'
                      ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="roofCrossSectionMode"
                      checked={!currentOverrides.roofCrossSectionMode || currentOverrides.roofCrossSectionMode === 'worst'}
                      onChange={() => updateOverrideField('roofCrossSectionMode', 'worst')}
                      className="mt-0.5 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold block text-sm">★ Худшее сечение (по ребру, Rпл = 0.127)</span>
                      <p className="text-[11px] opacity-80 mt-1">
                        Сечение через участок сплошного бетона ребра плиты: R = h/λ = 0.26 / 2.04 = 0.127 м²·°С/Вт.
                        Дает наименьшую внутреннюю температуру τв и критическую проверку на выпадение росы.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    currentOverrides.roofCrossSectionMode === 'void'
                      ? 'bg-blue-950/40 border-blue-500/60 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="roofCrossSectionMode"
                      checked={currentOverrides.roofCrossSectionMode === 'void'}
                      onChange={() => updateOverrideField('roofCrossSectionMode', 'void')}
                      className="mt-0.5 text-blue-500 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold block text-sm">Сечение по воздушной пустоте (Rпл = 0.199)</span>
                      <p className="text-[11px] opacity-80 mt-1">
                        Сечение через круглую воздушную пустоту диаметром 159 мм: R = 2·(δп/λ) + Rзвп = 2·0.05/2.04 + 0.15 = 0.199 м²·°С/Вт.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Geometry of hollow core slab */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 font-mono">
                <span className="font-semibold text-slate-200 block text-xs font-sans">
                  Геометрические и теплофизические характеристики плиты перекрытия:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">Высота плиты h (мм):</label>
                    <input
                      type="number"
                      step="5"
                      value={currentOverrides.hollowCoreSlab?.height ?? calc.roof.hollowCore.height}
                      onChange={(e) => updateOverrideField('hollowCoreSlab', {
                        ...currentOverrides.hollowCoreSlab,
                        height: parseFloat(e.target.value) || 260,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">Диаметр пустоты d (мм):</label>
                    <input
                      type="number"
                      step="1"
                      value={currentOverrides.hollowCoreSlab?.voidDiameter ?? calc.roof.hollowCore.voidDiameter}
                      onChange={(e) => updateOverrideField('hollowCoreSlab', {
                        ...currentOverrides.hollowCoreSlab,
                        voidDiameter: parseFloat(e.target.value) || 159,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">λ бетона (Вт/м·°С):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentOverrides.hollowCoreSlab?.concreteLambda ?? 2.04}
                      onChange={(e) => updateOverrideField('hollowCoreSlab', {
                        ...currentOverrides.hollowCoreSlab,
                        concreteLambda: parseFloat(e.target.value) || 2.04,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">R прослойки (м²·°С/Вт):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentOverrides.hollowCoreSlab?.R_zvp ?? 0.15}
                      onChange={(e) => updateOverrideField('hollowCoreSlab', {
                        ...currentOverrides.hollowCoreSlab,
                        R_zvp: parseFloat(e.target.value) || 0.15,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Климат СП 2.04.04-2026 */}
          {activeTab === 'climate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-blue-400" />
                  Климатические параметры наружного воздуха ({calc.climate.name}, {cipher.cityCode})
                </span>
                <span className="text-slate-400 text-[11px]">
                  Метеостанция: <strong className="text-slate-300">{baseClimate.nearestStation}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                {/* t_х.5 (0.92) */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tх.5 (0.92), °C (D &gt; 7):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calc.climate.t_coldest_5days_092}
                    onChange={(e) => updateOverrideField('t_coldest_5days_092', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* t_х.с (0.92) */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tх.с (0.92), °C (1.5&lt;D≤4):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calc.climate.t_coldest_day_092}
                    onChange={(e) => updateOverrideField('t_coldest_day_092', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* t_х.с (0.98) */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tх.с (0.98), °C (D ≤ 1.5):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calc.climate.t_coldest_day_098}
                    onChange={(e) => updateOverrideField('t_coldest_day_098', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* Расчетная t_х.3 (0.92) */}
                <div className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tх.3 (0.92), °C (4&lt;D≤7):</label>
                  <div className="px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-amber-300 text-xs font-bold">
                    {tColdest3Days092} °C
                  </div>
                </div>

                {/* t_н.от */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tн.от, °C:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calc.climate.t_heating_period}
                    onChange={(e) => updateOverrideField('t_heating_period', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* z_от */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">zот, сут:</label>
                  <input
                    type="number"
                    step="1"
                    value={calc.climate.duration_heating_period}
                    onChange={(e) => updateOverrideField('duration_heating_period', parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* v_ср */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">vср (январь), м/с:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calc.climate.wind_speed_winter}
                    onChange={(e) => updateOverrideField('wind_speed_winter', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                {/* φ_н.от */}
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">φн.от, %:</label>
                  <input
                    type="number"
                    step="1"
                    value={calc.climate.rh_heating_period}
                    onChange={(e) => updateOverrideField('rh_heating_period', parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>
              </div>

              {/* Выбор зимней расчетной температуры по Табл. 6.3 СП 2.04.01-2020 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-200">
                    Выбор расчетной зимней температуры tн (Таблица 6.3 СП 2.04.01-2020):
                  </span>
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300">
                      Стена (D={calc.wall.thermalInertia_D}): {calc.wall.design_t_out}°C ({calc.wall.designTempRule})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
                      Покрытие (D={calc.roof.thermalInertia_D}): {calc.roof.design_t_out}°C ({calc.roof.designTempRule})
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                    !currentOverrides.designTemperatureMode || currentOverrides.designTemperatureMode === 'auto'
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="designTempMode"
                      checked={!currentOverrides.designTemperatureMode || currentOverrides.designTemperatureMode === 'auto'}
                      onChange={() => updateOverrideFields({ designTemperatureMode: 'auto', customDesignTemp: undefined })}
                    />
                    <span>Авто (табл. 6.3)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                    currentOverrides.designTemperatureMode === 't_coldest_day_098'
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="designTempMode"
                      checked={currentOverrides.designTemperatureMode === 't_coldest_day_098'}
                      onChange={() => updateOverrideFields({ designTemperatureMode: 't_coldest_day_098', customDesignTemp: undefined })}
                    />
                    <span>tх.с 0.98 ({calc.climate.t_coldest_day_098}°)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                    currentOverrides.designTemperatureMode === 't_coldest_day_092'
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="designTempMode"
                      checked={currentOverrides.designTemperatureMode === 't_coldest_day_092'}
                      onChange={() => updateOverrideFields({ designTemperatureMode: 't_coldest_day_092', customDesignTemp: undefined })}
                    />
                    <span>tх.с 0.92 ({calc.climate.t_coldest_day_092}°)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                    currentOverrides.designTemperatureMode === 't_coldest_3days'
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="designTempMode"
                      checked={currentOverrides.designTemperatureMode === 't_coldest_3days'}
                      onChange={() => updateOverrideFields({ designTemperatureMode: 't_coldest_3days', customDesignTemp: undefined })}
                    />
                    <span>tх.3 0.92 ({tColdest3Days092}°)</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                    currentOverrides.designTemperatureMode === 't_coldest_5days'
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    <input
                      type="radio"
                      name="designTempMode"
                      checked={currentOverrides.designTemperatureMode === 't_coldest_5days'}
                      onChange={() => updateOverrideFields({ designTemperatureMode: 't_coldest_5days', customDesignTemp: undefined })}
                    />
                    <span>tх.5 0.92 ({calc.climate.t_coldest_5days_092}°)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Своя tн, °C"
                      value={currentOverrides.customDesignTemp ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (isNaN(val)) {
                          updateOverrideFields({ designTemperatureMode: 'auto', customDesignTemp: undefined });
                        } else {
                          updateOverrideFields({ designTemperatureMode: 'custom', customDesignTemp: val });
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-white text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Микроклимат & нормы */}
          {activeTab === 'microclimate' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Building className="w-4 h-4 text-indigo-400" />
                  Параметры микроклимата помещений и нормативные требования
                </span>
              </div>

              {/* Выбор типа здания и условий эксплуатации */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Нормативный тип здания (СН 2.04.02-2020 & СП 2.04.01-2020):
                    </label>
                    <select
                      value={calc.internalConditions.buildingTypeId}
                      onChange={(e) => {
                        const bTypeId = e.target.value as BuildingTypeId;
                        const def = BUILDING_TYPES[bTypeId];
                        updateOverrideField('buildingTypeId', bTypeId);
                        onUpdateCipher({
                          ...cipher,
                          buildingType: def.codeName,
                          buildingTypeId: bTypeId,
                          overrides: {
                            ...currentOverrides,
                            buildingTypeId: bTypeId,
                          },
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-indigo-500"
                    >
                      {Object.values(BUILDING_TYPES).map((bt) => (
                        <option key={bt.id} value={bt.id}>
                          {bt.codeName}: {bt.name} (tв={bt.default_t_v}°C, φв={bt.default_phi_v}%)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {calc.internalConditions.buildingTypeName}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Условия эксплуатации конструкций (табл. 5.2 СП 2.04.01-2020):
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...currentOverrides };
                          delete updated.operatingConditionMode;
                          delete updated.operatingConditionOverride;
                          onUpdateCipher({
                            ...cipher,
                            overrides: Object.keys(updated).length > 0 ? updated : undefined,
                          });
                        }}
                        className={`p-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                          !currentOverrides.operatingConditionMode || currentOverrides.operatingConditionMode === 'auto'
                            ? 'bg-blue-950/80 border-blue-500 text-blue-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Авто (СП)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateOverrideFields({
                            operatingConditionMode: 'A',
                            operatingConditionOverride: 'A',
                          })
                        }
                        className={`p-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                          currentOverrides.operatingConditionMode === 'A'
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Условия А
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateOverrideFields({
                            operatingConditionMode: 'B',
                            operatingConditionOverride: 'B',
                          })
                        }
                        className={`p-1.5 rounded-lg border text-center font-medium transition cursor-pointer ${
                          currentOverrides.operatingConditionMode === 'B'
                            ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Условия Б
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>Режим: <strong>{calc.internalConditions.humidityRegimeName}</strong></span>
                      <span>Фактически: <strong>Условия {calc.internalConditions.exploitationConditions}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">tв (помещение), °C:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={calc.internalConditions.t_v}
                    onChange={(e) => updateOverrideField('t_indoor', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">φв (влажность), %:</label>
                  <input
                    type="number"
                    step="1"
                    value={calc.internalConditions.phi_v}
                    onChange={(e) => updateOverrideField('phi_indoor', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">αв, Вт/(м²·°С):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.alpha_v ?? 8.7}
                    onChange={(e) => updateOverrideField('alpha_v', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">αн, Вт/(м²·°С):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.alpha_n ?? 23.0}
                    onChange={(e) => updateOverrideField('alpha_n', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">n стены:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentOverrides.n_wall ?? calc.wall.construction.increasingFactor_n}
                    onChange={(e) => updateOverrideField('n_wall', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">n покрытия:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentOverrides.n_roof ?? calc.roof.construction.increasingFactor_n}
                    onChange={(e) => updateOverrideField('n_roof', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">n подполья:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentOverrides.n_basement ?? 0.6}
                    onChange={(e) => updateOverrideField('n_basement', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">Δtв.норм стены, °C:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={currentOverrides.delta_t_norm_wall ?? calc.wall.delta_t_norm}
                    onChange={(e) => updateOverrideField('delta_t_norm_wall', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">Rт.норм стены, м²·°С/Вт:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.R_norm_wall ?? (BUILDING_TYPES[calc.internalConditions.buildingTypeId]?.R_norm_wall ?? 3.2)}
                    onChange={(e) => updateOverrideField('R_norm_wall', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">Rт.норм кровли, м²·°С/Вт:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.R_norm_roof ?? (BUILDING_TYPES[calc.internalConditions.buildingTypeId]?.R_norm_roof ?? 6.0)}
                    onChange={(e) => updateOverrideField('R_norm_roof', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">Rт.норм пола, м²·°С/Вт:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.R_norm_basement ?? (BUILDING_TYPES[calc.internalConditions.buildingTypeId]?.R_norm_basement ?? 2.5)}
                    onChange={(e) => updateOverrideField('R_norm_basement', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>

                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg">
                  <label className="text-[11px] text-slate-400 font-sans block mb-1">Δt пола подполья, °C:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={currentOverrides.delta_t_norm_basement ?? calc.basement.delta_t_floor_norm}
                    onChange={(e) => updateOverrideField('delta_t_norm_basement', parseFloat(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Окна & техподполье */}
          {activeTab === 'engineering' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-400" />
                  Параметры оконных блоков и коммуникаций техподполья
                </span>
              </div>

              {/* Windows */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 font-mono">
                <span className="font-semibold text-slate-200 block text-xs font-sans">
                  Оконный блок ({cipher.windowCode}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">Rсв (остекление), м²·°С/Вт:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentOverrides.windowOverride?.R_glazing ?? calc.window.R_transparent}
                      onChange={(e) => updateOverrideField('windowOverride', {
                        ...currentOverrides.windowOverride,
                        R_glazing: parseFloat(e.target.value) || 0.6,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">Rнепр (коробка), м²·°С/Вт:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentOverrides.windowOverride?.R_profile ?? calc.window.R_opaque}
                      onChange={(e) => updateOverrideField('windowOverride', {
                        ...currentOverrides.windowOverride,
                        R_profile: parseFloat(e.target.value) || 0.45,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Crawl space */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 font-mono">
                <span className="font-semibold text-slate-200 block text-xs font-sans">
                  Трубопроводы отопления и ГВС в техподполье:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">t1 (подача), °C:</label>
                    <input
                      type="number"
                      step="1"
                      value={currentOverrides.crawlSpacePipes?.pipe1_temp ?? 95}
                      onChange={(e) => updateOverrideField('crawlSpacePipes', {
                        ...currentOverrides.crawlSpacePipes,
                        pipe1_temp: parseFloat(e.target.value) || 95,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">t2 (обратка), °C:</label>
                    <input
                      type="number"
                      step="1"
                      value={currentOverrides.crawlSpacePipes?.pipe2_temp ?? 70}
                      onChange={(e) => updateOverrideField('crawlSpacePipes', {
                        ...currentOverrides.crawlSpacePipes,
                        pipe2_temp: parseFloat(e.target.value) || 70,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">t3 (ГВС), °C:</label>
                    <input
                      type="number"
                      step="1"
                      value={currentOverrides.crawlSpacePipes?.pipe3_temp ?? 60}
                      onChange={(e) => updateOverrideField('crawlSpacePipes', {
                        ...currentOverrides.crawlSpacePipes,
                        pipe3_temp: parseFloat(e.target.value) || 60,
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>

                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <label className="text-[10px] text-slate-400 font-sans block mb-1">t воздуха подполья tп, °C:</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Авто"
                      value={currentOverrides.crawlSpacePipes?.crawlSpaceTempOverride ?? ''}
                      onChange={(e) => updateOverrideField('crawlSpacePipes', {
                        ...currentOverrides.crawlSpacePipes,
                        crawlSpaceTempOverride: isNaN(parseFloat(e.target.value)) ? undefined : parseFloat(e.target.value),
                      })}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {Object.keys(currentOverrides).length > 0 ? (
              <span className="text-amber-400 font-medium">
                • Активно переопределений: {Object.keys(currentOverrides).length} (все формулы и графики пересчитаны)
              </span>
            ) : (
              <span>Используются стандартные нормативные значения и исходные данные</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg transition cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
