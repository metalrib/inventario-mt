import React, { useState } from 'react';
import { Zap, ChevronDown, Plus, Minus, Check, Layers } from 'lucide-react';
import { ProfileCatalogItem } from '../types';
import { generateUniqueNomusId, formatNomusIdInput } from '../services/firebase';

interface PerfilFormProps {
  onSavePerfil: (perfilData: {
    id_nomus: string;
    codigo_perfil: string;
    descricao_perfil: string;
    medida_mm: number;
    quantidade: number;
    operador?: string;
  }) => Promise<void>;
  onOpenCatalog: () => void;
  selectedCatalogItem: ProfileCatalogItem | null;
  manterMedidaPerfis: boolean;
  onToggleManterMedida: (val: boolean) => void;
  existingNomusIds: string[];
  operadorPadrao?: string;
}

export const PerfilForm: React.FC<PerfilFormProps> = ({
  onSavePerfil,
  onOpenCatalog,
  selectedCatalogItem,
  manterMedidaPerfis,
  onToggleManterMedida,
  existingNomusIds = [],
  operadorPadrao = 'Operador Produção'
}) => {
  const [idNomus, setIdNomus] = useState('');
  const [medidaMm, setMedidaMm] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [operador, setOperador] = useState(operadorPadrao);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (!idNomus || (idNomus && existingNomusIds.includes(idNomus.trim()))) {
      setIdNomus(generateUniqueNomusId(existingNomusIds, idNomus));
    }
  }, [existingNomusIds]);

  React.useEffect(() => {
    if (operadorPadrao) setOperador(operadorPadrao);
  }, [operadorPadrao]);

  const generateNomusId = () => {
    const nextId = generateUniqueNomusId(existingNomusIds, idNomus);
    setIdNomus(nextId);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d+$/.test(val) && val.length > 4) {
      setIdNomus(formatNomusIdInput(val));
    } else {
      setIdNomus(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogItem) {
      alert("Por favor, selecione um perfil no catálogo!");
      onOpenCatalog();
      return;
    }

    if (!medidaMm || Number(medidaMm) <= 0) {
      alert("Informe uma medida válida em milímetros (mm).");
      return;
    }

    const finalId = idNomus.trim() || generateUniqueNomusId(existingNomusIds);

    setIsSaving(true);
    try {
      await onSavePerfil({
        id_nomus: finalId,
        codigo_perfil: selectedCatalogItem.code,
        descricao_perfil: selectedCatalogItem.desc,
        medida_mm: parseInt(medidaMm),
        quantidade: quantidade,
        operador: operador.trim() || operadorPadrao || 'Operador Produção'
      });

      // Reset form & generate next unique ID using the freshly saved finalId
      setIdNomus(generateUniqueNomusId([finalId, ...existingNomusIds]));
      if (!manterMedidaPerfis) {
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
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="font-extrabold text-base text-[#1b367c] pb-2 border-b-2 border-slate-100 mb-4 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Layers size={18} />
          Registrar Retalho / Perfil
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ID Nomus */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ID Nomus (Manual ou Auto)
            </label>
            <button
              type="button"
              onClick={generateNomusId}
              className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-sky-200 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
              title="Gerar ID automático no formato AAAA.MM.DD.HHMM"
            >
              <Zap size={13} className="text-sky-600 fill-sky-600" />
              <span>Gerar ID</span>
            </button>
          </div>
          <input
            type="text"
            value={idNomus}
            onChange={handleIdChange}
            placeholder="Ex: 2026.08.19.1430"
            className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg text-sm font-semibold font-mono focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
          />
          <span className="text-[11px] text-slate-500 mt-1 block">
            Se deixar em branco, o ID será gerado com data e hora atual.
          </span>
        </div>

        {/* Operador / Responsável */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Operador / Responsável
          </label>
          <input
            type="text"
            value={operador}
            onChange={e => setOperador(e.target.value)}
            placeholder="Nome de quem está lançando"
            className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
          />
        </div>

        {/* Catalog Selector Button */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
            Perfil / Código (Catálogo)
          </label>
          <button
            type="button"
            onClick={onOpenCatalog}
            className="w-full min-h-[58px] bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-2 flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-slate-300 rounded-md flex items-center justify-center p-1 text-slate-400">
                {selectedCatalogItem ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 100 100" class="w-full h-full">${selectedCatalogItem.svg}</svg>`
                    }}
                  />
                ) : (
                  <span className="text-base">📐</span>
                )}
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#1b367c]">
                  {selectedCatalogItem ? selectedCatalogItem.code : 'Toque para selecionar o perfil'}
                </div>
                <div className="text-xs text-slate-500 line-clamp-1 font-medium">
                  {selectedCatalogItem ? selectedCatalogItem.desc : 'Escolha no catálogo de perfis Metalrib'}
                </div>
              </div>
            </div>
            <ChevronDown size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Size & Quantity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Medida (mm)
            </label>
            <input
              type="number"
              value={medidaMm}
              onChange={e => setMedidaMm(e.target.value)}
              placeholder="Ex: 1500"
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
                className="w-10 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-base flex items-center justify-center"
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
                className="w-10 h-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-base flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Quick Sizes Presets if profile selected */}
        {selectedCatalogItem?.medidasPadrao && selectedCatalogItem.medidasPadrao.length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
              Medidas Padrão Sugeridas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedCatalogItem.medidasPadrao.map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setMedidaMm(String(sz))}
                  className="text-xs font-bold px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-[#1b367c] border border-slate-200 rounded-md transition-colors"
                >
                  {sz} mm
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keep measure toggle */}
        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-xs font-bold text-slate-600">
            Manter medida para o próximo
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={manterMedidaPerfis}
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
          className="w-full h-12 bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          <Plus size={18} />
          <span>{isSaving ? 'Salvando...' : 'Salvar Perfil Online'}</span>
        </button>
      </form>
    </div>
  );
};
