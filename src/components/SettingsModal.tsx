import React, { useState } from 'react';
import { X, Save, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { AppConfig } from '../types';
import { checkSupabaseStatus, resetSupabaseClient } from '../services/supabase';

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
  const [testingStatus, setTestingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestingStatus('testing');
    try {
      resetSupabaseClient();
      const isOk = await checkSupabaseStatus();
      setTestingStatus(isOk ? 'success' : 'error');
    } catch {
      setTestingStatus('error');
    }
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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-[#1b367c]" />
            <h2 className="text-base font-extrabold text-[#1b367c]">
              Configurações de Conexão Supabase
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

          {/* Test Status Banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={handleTestConnection}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={testingStatus === 'testing' ? 'animate-spin' : ''} />
              <span>Testar Conexão</span>
            </button>

            {testingStatus === 'success' && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle size={16} />
                Conectado com Sucesso!
              </span>
            )}

            {testingStatus === 'error' && (
              <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <AlertCircle size={16} />
                Falha ao conectar
              </span>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md"
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
