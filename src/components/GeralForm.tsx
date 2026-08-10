import React, { useState } from 'react';
import { Package, Plus, Zap, RefreshCw } from 'lucide-react';
import { GeralItem } from '../types';

interface GeralFormProps {
  onAddItem: (item: Omit<GeralItem, 'id'>) => Promise<GeralItem | void>;
  operadorPadrao: string;
  autoImprimirAoSalvar?: boolean;
  onOpenPrintModal?: (item: GeralItem) => void;
}

export const GeralForm: React.FC<GeralFormProps> = ({
  onAddItem,
  operadorPadrao,
  autoImprimirAoSalvar,
  onOpenPrintModal
}) => {
  const [codigoItem, setCodigoItem] = useState('');
  const [descricaoItem, setDescricaoItem] = useState('');
  const [idNomus, setIdNomus] = useState('');
  const [comprimentoMm, setComprimentoMm] = useState<string>('');
  const [larguraMm, setLarguraMm] = useState<string>('');
  const [espessuraMm, setEspessuraMm] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState<string>('peças');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerateId = () => {
    const d = new Date();
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const autoNomusId = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}.${pad(d.getHours())}${pad(d.getMinutes())}`;
    setIdNomus(autoNomusId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoItem.trim()) {
      alert("Por favor, preencha o Código do Item (ex: XXX.XXXX).");
      return;
    }

    // Keep idNomus empty if user didn't enter one
    const finalIdNomus = idNomus.trim();

    setIsSubmitting(true);

    try {
      const newItem = await onAddItem({
        id_nomus: finalIdNomus,
        codigo_item: codigoItem.trim(),
        descricao_item: descricaoItem.trim() || codigoItem.trim(),
        comprimento_mm: Number(comprimentoMm) || 0,
        largura_mm: Number(larguraMm) || 0,
        espessura_mm: Number(espessuraMm) || 0,
        quantidade: Math.max(1, quantidade),
        unidade,
        operador: operadorPadrao
      });

      if (autoImprimirAoSalvar && onOpenPrintModal && newItem) {
        onOpenPrintModal(newItem);
      }

      // Reset form fields
      setCodigoItem('');
      setDescricaoItem('');
      setIdNomus('');
      setComprimentoMm('');
      setLarguraMm('');
      setEspessuraMm('');
      setQuantidade(1);
    } catch (err) {
      console.error("Erro ao salvar insumo/chapa:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        <div className="p-2 bg-blue-50 text-[#1b367c] rounded-xl">
          <Package size={22} />
        </div>
        <div>
          <h2 className="text-base font-black text-[#1b367c]">
            Cadastro de Chapas & Insumos de Fábrica
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Registre chapas, placas, perfis especiais e insumos com etiquetas personalizadas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ID Nomus (Manual ou Auto) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            ID Nomus / Barcode (Manual ou Auto)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={idNomus}
              onChange={e => setIdNomus(e.target.value)}
              placeholder="Ex: 2026.08.06.1430 ou digite um ID próprio"
              className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={handleGenerateId}
              className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs px-3 rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
              title="Gerar ID automático no formato AAAA.MM.DD.HHMM"
            >
              <Zap size={14} className="text-sky-600 fill-sky-600" />
              <span>Gerar ID Auto</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block font-medium">
            Se deixar em branco, o item não terá ID (a etiqueta exibirá apenas Cód, Descrição, QR Code e Medida).
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Código do Item */}
          <div className="md:col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Código do Item *
            </label>
            <input
              type="text"
              value={codigoItem}
              onChange={e => setCodigoItem(e.target.value)}
              placeholder="Ex: 102.8490 (Formato XXX.XXXX)"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-bold font-mono focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
              required
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 102.8490 (3 dígitos . 4 dígitos)</span>
          </div>

          {/* Descrição do Item */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Descrição Detalhada do Item
            </label>
            <input
              type="text"
              value={descricaoItem}
              onChange={e => setDescricaoItem(e.target.value)}
              placeholder="Ex: Chapa de Aço Inox Escovado 304 para Porta Frigorífica"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quantidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Quantidade *
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-black text-center focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Unidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Unidade de Medida
            </label>
            <select
              value={unidade}
              onChange={e => setUnidade(e.target.value)}
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-xs font-extrabold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
            >
              <option value="peças">Peças (un)</option>
              <option value="chapas">Chapas</option>
              <option value="m²">m² (Metro Quadrado)</option>
              <option value="m">m (Metro Linear)</option>
              <option value="kg">kg (Quilos)</option>
              <option value="rolo">Rolo / Bobina</option>
            </select>
          </div>
        </div>

        {/* Dimensões / Medidas em mm */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-xs font-extrabold text-slate-700 uppercase block mb-2">
            Medidas / Dimensões Físicas (mm)
          </span>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Comprimento (mm)
              </label>
              <input
                type="number"
                value={comprimentoMm}
                onChange={e => setComprimentoMm(e.target.value)}
                placeholder="Ex: 2400"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Largura (mm)
              </label>
              <input
                type="number"
                value={larguraMm}
                onChange={e => setLarguraMm(e.target.value)}
                placeholder="Ex: 1200"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Espessura (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={espessuraMm}
                onChange={e => setEspessuraMm(e.target.value)}
                placeholder="Ex: 1.5"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white text-center"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-sm h-12 px-8 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>Cadastrar e Gerar Etiqueta</span>
          </button>
        </div>
      </form>
    </div>
  );
};
