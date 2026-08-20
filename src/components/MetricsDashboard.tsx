import React from 'react';
import { Layers, Shield, PieChart, Award, BarChart2, Package } from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem } from '../types';

interface MetricsDashboardProps {
  perfis?: PerfilItem[];
  bumpers?: BumperItem[];
  gerais?: GeralItem[];
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  perfis = [],
  bumpers = [],
  gerais = []
}) => {
  const safePerfis = perfis || [];
  const safeBumpers = bumpers || [];
  const safeGerais = gerais || [];

  // Compute profiles analytics
  const totalPerfisMeters = safePerfis.reduce((acc, p) => acc + ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000, 0);
  const totalPerfisQty = safePerfis.reduce((acc, p) => acc + (p.quantidade || 0), 0);

  // Group by profile code
  const profileDistribution: Record<string, { desc: string; count: number; meters: number }> = {};
  safePerfis.forEach(p => {
    if (!p) return;
    const code = p.codigo_perfil || 'Desconhecido';
    if (!profileDistribution[code]) {
      profileDistribution[code] = { desc: p.descricao_perfil || code, count: 0, meters: 0 };
    }
    profileDistribution[code].count += (p.quantidade || 0);
    profileDistribution[code].meters += ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000;
  });

  const sortedDistribution = Object.entries(profileDistribution).sort(
    (a, b) => b[1].meters - a[1].meters
  );

  // Bumpers analytics
  const totalBumpersQty = safeBumpers.reduce((acc, b) => acc + (b.quantidade || 0), 0);
  const totalBumpersMeters = safeBumpers.reduce((acc, b) => acc + ((b.medida_mm || 0) * (b.quantidade || 0)) / 1000, 0);

  // Gerais analytics
  const totalGeraisQty = safeGerais.reduce((acc, g) => acc + (g.quantidade || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Metros Lineares (Retalhos)
            </span>
            <Layers size={20} className="text-[#1b367c]" />
          </div>
          <div className="text-2xl font-black text-[#1b367c]">
            {totalPerfisMeters.toFixed(2)} <span className="text-sm font-semibold text-slate-500">m</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Acumulado de {perfis.length} registros no inventário
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Total de Peças Perfis
            </span>
            <BarChart2 size={20} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {totalPerfisQty} <span className="text-sm font-semibold text-slate-500">unidades</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Disponíveis para reaproveitamento PCP
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Bumpers (Peças)
            </span>
            <Shield size={20} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {totalBumpersQty} <span className="text-sm font-semibold text-slate-500">un</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Totalizando {totalBumpersMeters.toFixed(1)}m de bumpers
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Chapas & Insumos Gerais
            </span>
            <Package size={20} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {totalGeraisQty} <span className="text-sm font-semibold text-slate-500">itens</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
            {gerais.length} tipos de insumos cadastrados
          </p>
        </div>
      </div>


      {/* Distribution Breakdown Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="font-extrabold text-base text-[#1b367c] mb-3 flex items-center gap-2">
          <PieChart size={18} />
          Distribuição de Retalhos por Código de Perfil
        </h3>

        {sortedDistribution.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhum dado disponível para análise gráfica.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDistribution.map(([code, data]) => {
              const percentage =
                totalPerfisMeters > 0
                  ? ((data.meters / totalPerfisMeters) * 100).toFixed(1)
                  : '0';

              return (
                <div key={code} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-[#1b367c]">
                      {code} <span className="text-slate-500 font-medium">- {data.desc}</span>
                    </span>
                    <span className="text-slate-700 font-extrabold">
                      {data.meters.toFixed(1)}m ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1b367c] h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
