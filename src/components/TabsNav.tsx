import React from 'react';
import { Layers, Shield, Package, PieChart } from 'lucide-react';

export type TabType = 'perfis' | 'bumpers' | 'gerais' | 'metrics';

interface TabsNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  perfisCount: number;
  bumpersCount: number;
  geraisCount: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onChangeTab,
  perfisCount,
  bumpersCount,
  geraisCount
}) => {
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

