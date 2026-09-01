import React, { useState } from 'react';
import { Plus, Shield, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { BumperType } from '../types';
import { generateUniqueNomusId } from '../services/firebase';

interface BumperFormProps {
  onSaveBumper: (bumperData: {
    tipo: BumperType;
    codigo: string;
    id_nomus?: string;
    medida_mm: number;
    quantidade: number;
    operador?: string;
  }) => Promise<void>;
  manterMedidaBumpers: boolean;
  onToggleManterMedida: (val: boolean) => void;
  existingNomusIds?: string[];
  operadorPadrao?: string;
}

export const BumperForm: React.FC<BumperFormProps> = ({
  onSaveBumper,
  manterMedidaBumpers,
  onToggleManterMedida,
  existingNomusIds = [],
  operadorPadrao = 'Operador Produção'
}) => {
  const [bumperType, setBumperType] = useState<BumperType>('ID');
  const [codigo, setCodigo] = useState('');
  const [medidaMm, setMedidaMm] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [operador, setOperador] = useState(operadorPadrao);
  const [isSaving, setIsSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  React.useEffect(() => {
    if (bumperType === 'ID' && (!codigo || (codigo && existingNomusIds.includes(codigo.trim())))) {
      setCodigo(generateUniqueNomusId(existingNomusIds, codigo));
    }
  }, [bumperType, existingNomusIds]);

  React.useEffect(() => {
    if (operadorPadrao) setOperador(operadorPadrao);
  }, [operadorPadrao]);

  const generateNomusId = () => {
    const nextId = generateUniqueNomusId(existingNomusIds, codigo);
    setCodigo(nextId);
  };

  const handleTypeChange = (type: BumperType) => {
    setBumperType(type);
    if (type === 'ID') {
      setCodigo(generateUniqueNomusId(existingNomusIds));
    } else {
      setCodigo('');
    }
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');

    if (bumperType === 'ID') {
      if (raw.length > 12) raw = raw.slice(0, 12);
      let formatted = '';
      if (raw.length > 0) formatted += raw.substring(0, 4);
      if (raw.length > 4) formatted += '.' + raw.substring(4, 6);
      if (raw.length > 6) formatted += '.' + raw.substring(6, 8);
      if (raw.length > 8) formatted += '.' + raw.substring(8, 12);
      setCodigo(formatted);
    } else {
      if (raw.length > 8) raw = raw.slice(0, 8);
      let formatted = 'OP ';
      if (raw.length > 0) {
        if (raw.length <= 6) formatted += raw;
        else formatted += raw.substring(0, 6) + '-' + raw.substring(6, 8);
      } else formatted = '';
      setCodigo(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bumperType === 'ID' && codigo.length < 15) {
      alert('Digite o ID do produto completo com 12 dígitos (Ex: 2026.08.06.1430).');
      return;
    }

    if (bumperType === 'OP' && codigo.length < 12) {
      alert('Digite a OP completa no formato (Ex: OP 123456-78).');
      return;
    }

    if (!medidaMm || Number(medidaMm) <= 0) {
      alert('Informe a medida do Bumper em milímetros (mm).');
      return;
    }

    setIsSaving(true);
    try {
      const savedCodigo = codigo.trim();
      await onSaveBumper({
        tipo: bumperType,
        codigo: savedCodigo,
        id_nomus: bumperType === 'ID' ? savedCodigo : undefined,
        medida_mm: parseInt(medidaMm),
        quantidade: quantidade,
        operador: operador.trim() || operadorPadrao || 'Operador Produção'
      });

      if (bumperType === 'ID') {
        setCodigo(generateUniqueNomusId([savedCodigo, ...existingNomusIds]));
      } else {
        setCodigo('');
      }
      if (!manterMedidaBumpers) {
        setMedidaMm('');
      }
      setQuantidade(1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
      <div className="font-extrabold text-base text-[#1b367c] pb-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-[#1b367c]" />
          <span>Registrar Bumper / OP</span>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          title={isCollapsed ? "Expandir formulário" : "Recolher formulário"}
        >
          {isCollapsed ? (
            <>
              <ChevronDown size={16} />
              <span className="hidden sm:inline">Expandir Cadastro</span>
            </>
          ) : (
            <>
              <ChevronUp size={16} />
              <span className="hidden sm:inline">Recolher</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-4 animate-fadeIn space-y-4">
          {/* Type Selector (ID x OP) */}
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200 max-w-md">
            <button
              type="button"
              onClick={() => handleTypeChange('ID')}
              className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                bumperType === 'ID'
                  ? 'bg-[#1b367c] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ID do Produto (12 Dígitos)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('OP')}
              className={`flex-1 py-1.5 text-xs font-extrabold rounded-md transition-all cursor-pointer ${
                bumperType === 'OP'
                  ? 'bg-[#1b367c] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nº de OP (Ordem de Produção)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Code / OP input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    {bumperType === 'ID' ? 'ID do Produto (12 Dígitos)' : 'Número de OP (Formatado)'}
                  </label>
                  {bumperType === 'ID' && (
                    <button
                      type="button"
                      onClick={generateNomusId}
                      className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold rounded-md flex items-center gap-1 border border-sky-200 shadow-2xs transition-all cursor-pointer"
                    >
                      <Zap size={12} className="text-sky-600 fill-sky-600" />
                      <span>Gerar ID</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={codigo}
                  onChange={handleCodigoChange}
                  placeholder={bumperType === 'ID' ? 'Ex: 2026.07.28.0900' : 'Ex: OP 000000-00'}
                  required
                  className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#1b367c]"
                />
              </div>

              {/* Operador / Responsável */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Operador / Responsável
                </label>
                <input
                  type="text"
                  value={operador}
                  onChange={e => setOperador(e.target.value)}
                  placeholder="Nome de quem está fazendo o inventário"
                  className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Medida (mm) & Quantidade Row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Medida (mm)
                  </label>
                  <input
                    type="number"
                    value={medidaMm}
                    onChange={e => setMedidaMm(e.target.value)}
                    placeholder="Ex: 500"
                    min="1"
                    required
                    className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:border-[#1b367c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Quantidade
                  </label>
                  <div className="flex items-center h-11 border-2 border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQuantidade(prev => Math.max(1, prev - 1))}
                      className="w-8 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={quantidade}
                      onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full h-full border-none text-center font-extrabold text-slate-800 text-sm focus:outline-none bg-transparent"
                      min="1"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantidade(prev => prev + 1)}
                      className="w-8 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Sizes and Actions Footer */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-100">
              {/* Quick Sizes presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Atalhos:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[300, 500, 800, 1000, 1200, 1500].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setMedidaMm(String(sz))}
                      className="text-xs font-bold px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-[#1b367c] border border-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      {sz} mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Keep measure toggle */}
                <div className="flex items-center gap-2 p-1.5 px-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">
                    Manter medida
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manterMedidaBumpers}
                      onChange={e => onToggleManterMedida(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1b367c]"></div>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-11 px-6 bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>{isSaving ? 'Salvando...' : 'Salvar Bumper'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
