import React from 'react';
import { X, Save, Database, CheckCircle, ShieldCheck, Printer } from 'lucide-react';
import { AppConfig, LabelFormat } from '../types';
import configJson from '../../firebase-applet-config.json';

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
  const [operador, setOperador] = React.useState(config.operadorPadrao);
  const [formatoEtiqueta, setFormatoEtiqueta] = React.useState<LabelFormat>(
    config.formatoEtiquetaPadrao || (localStorage.getItem('metalrib_label_format') as LabelFormat) || '100x50'
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppConfig = {
      ...config,
      operadorPadrao: operador.trim(),
      formatoEtiquetaPadrao: formatoEtiqueta
    };
    localStorage.setItem('metalrib_label_format', formatoEtiqueta);
    onSaveConfig(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-[#1b367c]" />
            <h2 className="text-base font-extrabold text-[#1b367c]">
              Configurações & Conexão em Nuvem
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

          {/* Formato de Etiqueta Térmica Padrão */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1.5">
              <Printer size={14} className="text-[#1b367c]" />
              Formato Padrão de Etiqueta Térmica
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormatoEtiqueta('100x50')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formatoEtiqueta === '100x50'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-xs ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">100x50 mm</div>
                <div className={`text-[10px] mt-0.5 ${formatoEtiqueta === '100x50' ? 'text-blue-100' : 'text-slate-500'}`}>
                  Fábrica Padrão
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormatoEtiqueta('100x100_dupla')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formatoEtiqueta === '100x100_dupla'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-xs ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">100x100 Dupla</div>
                <div className={`text-[10px] mt-0.5 ${formatoEtiqueta === '100x100_dupla' ? 'text-blue-100' : 'text-slate-500'}`}>
                  PCP (2 em 1)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormatoEtiqueta('100x100_cheia')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  formatoEtiqueta === '100x100_cheia'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-xs ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="font-extrabold text-xs">100x100 Cheia</div>
                <div className={`text-[10px] mt-0.5 ${formatoEtiqueta === '100x100_cheia' ? 'text-blue-100' : 'text-slate-500'}`}>
                  PCP Paletes
                </div>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Define qual tamanho virá selecionado por padrão na hora de emitir etiquetas.
            </span>
          </div>

          {/* Firebase Status Banner */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-600" />
                Firebase Firestore (Nuvem em Tempo Real)
              </span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 flex items-center gap-1">
                <CheckCircle size={12} />
                Ativo & Sincronizado
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              O banco de dados do Firebase está conectado. Qualquer alteração ou cadastro feito no Tablet, Celular ou Computador é sincronizado <strong>instantaneamente</strong> e em tempo real em todos os aparelhos.
            </p>
            <div className="pt-2 border-t border-emerald-200/60 text-[10px] font-mono text-emerald-900/70">
              Projeto: <span className="font-bold">{configJson.projectId}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
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
