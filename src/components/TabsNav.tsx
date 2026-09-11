import React from 'react';
import { Layers, Shield, Package, PieChart, ArrowLeftRight } from 'lucide-react';
import { AppMode } from '../types';

export type TabType = 'perfis' | 'bumpers' | 'gerais' | 'metrics';

interface TabsNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  perfisCount: number;
  bumpersCount: number;
  geraisCount: number;
  appMode?: AppMode;
  onChangeMode?: (mode: AppMode) => void;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onChangeTab,
  perfisCount,
  bumpersCount,
  geraisCount,
  appMode = 'fabrica',
  onChangeMode
}) => {
  if (appMode === 'pcp') {
    return (
      <div className="mb-4 w-full space-y-2">
        {/* PCP Notice / Scope Bar */}
        <div className="bg-indigo-50/90 border border-indigo-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <div>
              <span className="text-xs font-extrabold text-indigo-950 block">
                Ambiente de Trabalho PCP
              </span>
              <span className="text-[11px] text-indigo-800 font-medium">
                Controle e impressão de etiquetas térmicas de Bumpers (100x100mm)
              </span>
            </div>
          </div>

          {onChangeMode && (
            <button
              type="button"
              onClick={() => onChangeMode('fabrica')}
              className="text-xs font-bold text-indigo-900 hover:text-indigo-950 bg-white hover:bg-indigo-100/60 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ArrowLeftRight size={13} />
              <span>Ver Inventário da Fábrica</span>
            </button>
          )}
        </div>

        {/* PCP Navigation Tabs */}
        <nav className="grid grid-cols-2 bg-slate-200 p-1.5 rounded-xl gap-1.5 w-full">
          <button
            type="button"
            onClick={() => onChangeTab('bumpers')}
            className={`w-full py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'bumpers'
                ? 'bg-[#1b367c] text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <Shield size={17} className="shrink-0" />
            <span className="truncate">Bumpers (PCP)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                activeTab === 'bumpers'
                  ? 'bg-blue-400/30 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {bumpersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('metrics')}
            className={`w-full py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-[#1b367c] text-white shadow-md'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
            }`}
          >
            <PieChart size={17} className="shrink-0" />
            <span className="truncate">Dashboard PCP</span>
          </button>
        </nav>
      </div>
    );
  }

  // Standard Fábrica Navigation Tabs
  return (
    <nav className="grid grid-cols-2 sm:grid-cols-4 bg-slate-200 p-1.5 rounded-xl mb-4 gap-1.5 w-full">
      <button
        type="button"
        onClick={() => onChangeTab('perfis')}
        className={`w-full py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'perfis'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
      >
        <Layers size={17} className="shrink-0" />
        <span className="truncate">Perfis & Retalhos</span>
        <span
          className={`text-xs px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
            activeTab === 'perfis'
              ? 'bg-blue-400/30 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}
        >
          {perfisCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('bumpers')}
        className={`w-full py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'bumpers'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
      >
        <Shield size={17} className="shrink-0" />
        <span className="truncate">Bumpers</span>
        <span
          className={`text-xs px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
            activeTab === 'bumpers'
              ? 'bg-blue-400/30 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}
        >
          {bumpersCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('gerais')}
        className={`w-full py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'gerais'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
      >
        <Package size={17} className="shrink-0" />
        <span className="truncate">Chapas & Insumos</span>
        <span
          className={`text-xs px-1.5 py-0.2 rounded-full font-extrabold shrink-0 ${
            activeTab === 'gerais'
              ? 'bg-blue-400/30 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}
        >
          {geraisCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChangeTab('metrics')}
        className={`w-full py-2.5 px-2 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          activeTab === 'metrics'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
        }`}
      >
        <PieChart size={17} className="shrink-0" />
        <span className="truncate">Dashboard</span>
      </button>
    </nav>
  );
};
