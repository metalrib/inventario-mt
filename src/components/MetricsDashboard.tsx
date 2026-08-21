import React, { useState } from 'react';
import { Layers, Shield, PieChart, BarChart2, Package, Users, Ruler, TrendingUp } from 'lucide-react';
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
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'perfis' | 'chapas' | 'bumpers'>('geral');

  const safePerfis = perfis || [];
  const safeBumpers = bumpers || [];
  const safeGerais = gerais || [];

  // Perfis metrics
  const totalPerfisMeters = safePerfis.reduce((acc, p) => acc + ((p.medida_mm || 0) * (p.quantidade || 0)) / 1000, 0);
  const totalPerfisQty = safePerfis.reduce((acc, p) => acc + (p.quantidade || 0), 0);

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

  const sortedProfiles = Object.entries(profileDistribution).sort(
    (a, b) => b[1].meters - a[1].meters
  );

  // Bumpers metrics
  const totalBumpersQty = safeBumpers.reduce((acc, b) => acc + (b.quantidade || 0), 0);
  const totalBumpersMeters = safeBumpers.reduce((acc, b) => acc + ((b.medida_mm || 0) * (b.quantidade || 0)) / 1000, 0);
  const bumpersByType: Record<string, { count: number; meters: number }> = {
    ID: { count: 0, meters: 0 },
    OP: { count: 0, meters: 0 }
  };
  safeBumpers.forEach(b => {
    const type = b.tipo === 'OP' ? 'OP' : 'ID';
    bumpersByType[type].count += (b.quantidade || 0);
    bumpersByType[type].meters += ((b.medida_mm || 0) * (b.quantidade || 0)) / 1000;
  });

  // Chapas / Gerais metrics
  const totalGeraisQty = safeGerais.reduce((acc, g) => acc + (g.quantidade || 0), 0);
  const totalGeraisM2 = safeGerais.reduce((acc, item) => {
    const c = item.comprimento_mm || 0;
    const l = item.largura_mm || 0;
    const q = item.quantidade || 1;
    if (c > 0 && l > 0) {
      return acc + ((c * l) / 1000000) * q;
    }
    return acc;
  }, 0);

  const geraisDistribution: Record<string, { desc: string; count: number; m2: number }> = {};
  safeGerais.forEach(g => {
    if (!g) return;
    const code = g.codigo_item || 'Outro';
    if (!geraisDistribution[code]) {
      geraisDistribution[code] = { desc: g.descricao_item || code, count: 0, m2: 0 };
    }
    const c = g.comprimento_mm || 0;
    const l = g.largura_mm || 0;
    const q = g.quantidade || 1;
    const area = (c > 0 && l > 0) ? ((c * l) / 1000000) * q : 0;

    geraisDistribution[code].count += q;
    geraisDistribution[code].m2 += area;
  });

  const sortedGerais = Object.entries(geraisDistribution).sort(
    (a, b) => b[1].m2 - a[1].m2
  );

  // Operadores stats
  const operadorStats: Record<string, number> = {};
  [...safePerfis, ...safeBumpers, ...safeGerais].forEach(item => {
    const op = (item.operador || 'Não informado').trim();
    operadorStats[op] = (operadorStats[op] || 0) + (item.quantidade || 1);
  });
  const sortedOperadores = Object.entries(operadorStats).sort((a, b) => b[1] - a[1]);

  const totalGeralRegistros = safePerfis.length + safeBumpers.length + safeGerais.length;
  const totalGeralPecas = totalPerfisQty + totalBumpersQty + totalGeraisQty;

  return (
    <div className="space-y-4">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Retalhos de Perfil
            </span>
            <Layers size={20} className="text-[#1b367c]" />
          </div>
          <div className="text-2xl font-black text-[#1b367c]">
            {totalPerfisMeters.toFixed(2)} <span className="text-sm font-semibold text-slate-500">m</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>{totalPerfisQty} peças no total</span>
            <span>{safePerfis.length} registros</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Chapas & Insumos
            </span>
            <Package size={20} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {totalGeraisM2 > 0 ? totalGeraisM2.toFixed(3) : '0.000'} <span className="text-sm font-semibold text-slate-500">m²</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>{totalGeraisQty} unidades/peças</span>
            <span>{safeGerais.length} registros</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Bumpers (Calços)
            </span>
            <Shield size={20} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {totalBumpersQty} <span className="text-sm font-semibold text-slate-500">unidades</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>{totalBumpersMeters.toFixed(1)}m acumulados</span>
            <span>{safeBumpers.length} registros</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-extrabold uppercase text-slate-500">
              Inventário Geral
            </span>
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {totalGeralPecas} <span className="text-sm font-semibold text-slate-500">peças coletadas</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-medium">
            <span>{totalGeralRegistros} etiquetas / lotes</span>
            <span className="text-emerald-600 font-bold">100% Sincronizado</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('geral')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'geral'
              ? 'bg-[#1b367c] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart2 size={14} />
          Visão Consolidada
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('perfis')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'perfis'
              ? 'bg-[#1b367c] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers size={14} />
          Perfis ({sortedProfiles.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('chapas')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'chapas'
              ? 'bg-[#1b367c] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Package size={14} />
          Chapas ({sortedGerais.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('bumpers')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'bumpers'
              ? 'bg-[#1b367c] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Shield size={14} />
          Bumpers (ID x OP)
        </button>
      </div>

      {/* Sub-Tab: Geral */}
      {activeSubTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Perfis */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-[#1b367c] mb-3 flex items-center gap-2">
              <Layers size={16} />
              Principais Retalhos de Perfis por Metragem
            </h3>
            {sortedProfiles.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">Nenhum retalho cadastrado.</div>
            ) : (
              <div className="space-y-3">
                {sortedProfiles.slice(0, 5).map(([code, data]) => {
                  const pct = totalPerfisMeters > 0 ? ((data.meters / totalPerfisMeters) * 100).toFixed(1) : '0';
                  return (
                    <div key={code} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-[#1b367c]">{code} <span className="text-slate-500 font-normal">- {data.desc}</span></span>
                        <span className="text-slate-800 font-black">{data.meters.toFixed(1)}m ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#1b367c] h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Operadores */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-extrabold text-sm text-[#1b367c] mb-3 flex items-center gap-2">
              <Users size={16} />
              Coleta por Operador
            </h3>
            {sortedOperadores.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">Nenhum operador registrado.</div>
            ) : (
              <div className="space-y-2.5">
                {sortedOperadores.map(([opName, count]) => {
                  const pct = totalGeralPecas > 0 ? ((count / totalGeralPecas) * 100).toFixed(1) : '0';
                  return (
                    <div key={opName} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-[#1b367c] font-black text-xs flex items-center justify-center">
                          {opName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{opName}</div>
                          <div className="text-[10px] text-slate-500 font-medium">{pct}% de todo o inventário</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-[#1b367c]">{count} un</div>
                        <div className="text-[10px] text-slate-400 font-semibold">contadas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab: Perfis */}
      {activeSubTab === 'perfis' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-extrabold text-base text-[#1b367c] mb-3 flex items-center gap-2">
            <PieChart size={18} />
            Distribuição Completa de Retalhos de Perfis
          </h3>
          {sortedProfiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Nenhum dado disponível.</div>
          ) : (
            <div className="space-y-3">
              {sortedProfiles.map(([code, data]) => {
                const percentage =
                  totalPerfisMeters > 0 ? ((data.meters / totalPerfisMeters) * 100).toFixed(1) : '0';
                return (
                  <div key={code} className="space-y-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#1b367c]">
                        {code} <span className="text-slate-500 font-medium">- {data.desc}</span>
                      </span>
                      <span className="text-slate-800 font-black">
                        {data.meters.toFixed(2)}m ({data.count} un) - {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
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
      )}

      {/* Sub-Tab: Chapas */}
      {activeSubTab === 'chapas' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-extrabold text-base text-[#1b367c] mb-3 flex items-center gap-2">
            <Package size={18} />
            Distribuição de Chapas e Insumos por Área (m²)
          </h3>
          {sortedGerais.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Nenhuma chapa cadastrada.</div>
          ) : (
            <div className="space-y-3">
              {sortedGerais.map(([code, data]) => {
                const percentage =
                  totalGeraisM2 > 0 ? ((data.m2 / totalGeraisM2) * 100).toFixed(1) : '0';
                return (
                  <div key={code} className="space-y-1 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-purple-900">
                        {code} <span className="text-slate-500 font-medium">- {data.desc}</span>
                      </span>
                      <span className="text-purple-800 font-black">
                        {data.m2.toFixed(3)} m² ({data.count} un) - {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab: Bumpers */}
      {activeSubTab === 'bumpers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-sm text-[#1b367c] mb-2 flex items-center gap-1.5">
              <Shield size={16} />
              Bumpers de Identificação (ID)
            </h4>
            <div className="text-3xl font-black text-[#1b367c] mb-1">
              {bumpersByType.ID.count} <span className="text-sm font-normal text-slate-500">peças</span>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Metragem total: {bumpersByType.ID.meters.toFixed(1)} metros lineares
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-sm text-amber-700 mb-2 flex items-center gap-1.5">
              <Shield size={16} />
              Bumpers de Ordem de Produção (OP)
            </h4>
            <div className="text-3xl font-black text-amber-700 mb-1">
              {bumpersByType.OP.count} <span className="text-sm font-normal text-slate-500">peças</span>
            </div>
            <div className="text-xs text-slate-600 font-medium">
              Metragem total: {bumpersByType.OP.meters.toFixed(1)} metros lineares
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

