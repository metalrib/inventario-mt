import React, { useState } from 'react';
import { X, Save, Database, RefreshCw, CheckCircle, AlertCircle, Copy, Check, Code, Info } from 'lucide-react';
import { AppConfig } from '../types';
import { checkSupabaseTablesStatus, SupabaseTablesStatus, getCatalogSqlScript, resetSupabaseClient } from '../services/supabase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig
}) => {
  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl);
  const [supabaseKey, setSupabaseKey] = useState(config.supabaseKey);
  const [operador, setOperador] = useState(config.operadorPadrao);
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'done'>('idle');
  const [tablesStatus, setTablesStatus] = useState<SupabaseTablesStatus | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlCode, setShowSqlCode] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingStatus('testing');
    try {
      resetSupabaseClient();
      const status = await checkSupabaseTablesStatus();
      setTablesStatus(status);
      setTestingStatus('done');
    } catch {
      setTestingStatus('done');
    }
  };

  const handleCopySql = () => {
    const sql = getCatalogSqlScript();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppConfig = {
      ...config,
      supabaseUrl: supabaseUrl.trim(),
      supabaseKey: supabaseKey.trim(),
      operadorPadrao: operador.trim()
    };
    onSaveConfig(updated);
    resetSupabaseClient();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-[#1b367c]" />
            <h2 className="text-base font-extrabold text-[#1b367c]">
              Configurações de Conexão Supabase
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Operador Padrão do Sistema
            </label>
            <input
              type="text"
              value={operador}
              onChange={e => setOperador(e.target.value)}
              placeholder="Ex: Carlos - Turno A"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              URL do Projeto Supabase
            </label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={e => setSupabaseUrl(e.target.value)}
              placeholder="https://sua-instancia.supabase.co"
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Chave de API Pública (Anon Key)
            </label>
            <textarea
              value={supabaseKey}
              onChange={e => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiI..."
              rows={3}
              required
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          {/* Test Status Banner & Table Diagnostics */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={14} className={testingStatus === 'testing' ? 'animate-spin' : ''} />
                <span>Testar Conexão e Tabelas</span>
              </button>

              {tablesStatus && (
                <span className={`text-xs font-bold flex items-center gap-1 ${
                  tablesStatus.isOnline ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {tablesStatus.isOnline ? (
                    <>
                      <CheckCircle size={16} />
                      Supabase Conectado!
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      Falha de Conexão
                    </>
                  )}
                </span>
              )}
            </div>

            {tablesStatus && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Chapas & Insumos:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    tablesStatus.inventario_geral ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tablesStatus.inventario_geral ? '✓ Online' : '✗ Inacessível'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Perfis:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    tablesStatus.inventario ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tablesStatus.inventario ? '✓ Online' : '✗ Inacessível'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Bumpers:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    tablesStatus.inventario_bumpers ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tablesStatus.inventario_bumpers ? '✓ Online' : '✗ Inacessível'}
                  </span>
                </div>

                <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Catálogo Base:</span>
                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                    tablesStatus.catalogo_produtos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tablesStatus.catalogo_produtos ? '✓ Sincronizado' : '⚠️ Local / Auto-Sync'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SQL Script Box for Supabase */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#1b367c] flex items-center gap-1.5">
                <Code size={15} />
                Sincronizar Catálogo na Nuvem
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="bg-[#1b367c] hover:bg-[#13275b] text-white font-bold text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedSql ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedSql ? 'Copiado!' : 'Copiar Script SQL'}</span>
              </button>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              O sistema sincroniza automaticamente os itens do inventário entre dispositivos. Para habilitar também a tabela remota de produtos no Supabase, basta colar o script SQL no painel (SQL Editor) do seu Supabase.
            </p>
            {copiedSql && (
              <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-semibold">
                ✓ Script SQL copiado para a área de transferência! Cole no SQL Editor do Supabase para criar a tabela.
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Save size={16} />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
