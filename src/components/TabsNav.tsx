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
    <nav className="flex flex-wrap sm:flex-nowrap bg-slate-200 p-1 rounded-xl mb-4 gap-1">
      <button
        type="button"
        onClick={() => onChangeTab('perfis')}
        className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          activeTab === 'perfis'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
        }`}
      >
        <Layers size={18} />
        <span>Perfis & Retalhos</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
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
        className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          activeTab === 'bumpers'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
        }`}
      >
        <Shield size={18} />
        <span>Bumpers</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
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
        className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          activeTab === 'gerais'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
        }`}
      >
        <Package size={18} />
        <span>Chapas & Insumos</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
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
        className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
          activeTab === 'metrics'
            ? 'bg-[#1b367c] text-white shadow-md'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
        }`}
      >
        <PieChart size={18} />
        <span>Dashboard</span>
      </button>
    </nav>
  );
};

