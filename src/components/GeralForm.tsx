import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Zap, RefreshCw, BookOpen, Sparkles, Check, CheckCircle2 } from 'lucide-react';
import { GeralItem, ProductCatalogItem } from '../types';
import { findCatalogProductByCode, generateUniqueNomusId, formatNomusIdInput } from '../services/supabase';

interface GeralFormProps {
  onAddItem: (item: Omit<GeralItem, 'id'>) => Promise<GeralItem | void>;
  operadorPadrao: string;
  autoImprimirAoSalvar?: boolean;
  onOpenPrintModal?: (item: GeralItem) => void;
  catalog?: ProductCatalogItem[];
  onOpenCatalog?: () => void;
  onSaveToCatalog?: (item: Omit<ProductCatalogItem, 'id'>) => Promise<void>;
  prefilledItem?: ProductCatalogItem | null;
  existingNomusIds?: string[];
}

export const GeralForm: React.FC<GeralFormProps> = ({
  onAddItem,
  operadorPadrao,
  autoImprimirAoSalvar,
  onOpenPrintModal,
  catalog = [],
  onOpenCatalog,
  onSaveToCatalog,
  prefilledItem,
  existingNomusIds = []
}) => {
  const [codigoItem, setCodigoItem] = useState('');
  const [descricaoItem, setDescricaoItem] = useState('');
  const [idNomus, setIdNomus] = useState('');
  const [comprimentoMm, setComprimentoMm] = useState<string>('');
  const [larguraMm, setLarguraMm] = useState<string>('');
  const [espessuraMm, setEspessuraMm] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState<string>('peças');
  const [operador, setOperador] = useState<string>(operadorPadrao || 'Operador Produção');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveToCatalogCheck, setSaveToCatalogCheck] = useState(true);
  const [autoFilledBadge, setAutoFilledBadge] = useState<string | null>(null);

  useEffect(() => {
    if (operadorPadrao) {
      setOperador(operadorPadrao);
    }
  }, [operadorPadrao]);

  // Suggestions Dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Respond to prefilledItem if passed from catalog selection
  useEffect(() => {
    if (prefilledItem) {
      applyCatalogItem(prefilledItem);
    }
  }, [prefilledItem]);

  // Handle outside click for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyCatalogItem = (item: ProductCatalogItem) => {
    setCodigoItem(item.codigo);
    setDescricaoItem(item.descricao);
    if (item.unidade) {
      setUnidade(item.unidade);
    }
    if (item.comprimento_padrao_mm) {
      setComprimentoMm(String(item.comprimento_padrao_mm));
    }
    if (item.largura_padrao_mm) {
      setLarguraMm(String(item.largura_padrao_mm));
    }
    if (item.espessura_padrao_mm) {
      setEspessuraMm(String(item.espessura_padrao_mm));
    }
    setAutoFilledBadge(`${item.codigo} - ${item.descricao}`);
    setShowSuggestions(false);
  };

  const handleCodigoChange = (val: string) => {
    setCodigoItem(val);
    setAutoFilledBadge(null);

    if (!val.trim()) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);

    // Try finding exact or matching item
    const match = findCatalogProductByCode(val) || catalog.find(p => p.codigo.toLowerCase() === val.toLowerCase().trim());
    if (match) {
      setDescricaoItem(match.descricao);
      if (match.unidade) setUnidade(match.unidade);
      if (match.comprimento_padrao_mm && !comprimentoMm) setComprimentoMm(String(match.comprimento_padrao_mm));
      if (match.largura_padrao_mm && !larguraMm) setLarguraMm(String(match.largura_padrao_mm));
      if (match.espessura_padrao_mm && !espessuraMm) setEspessuraMm(String(match.espessura_padrao_mm));
      setAutoFilledBadge(`${match.codigo} - ${match.descricao}`);
    }
  };

  // Filter suggestions from catalog
  const filteredSuggestions = catalog.filter(p => {
    const term = codigoItem.toLowerCase().trim();
    if (!term) return false;
    return (
      p.codigo.toLowerCase().includes(term) ||
      p.descricao.toLowerCase().includes(term)
    );
  }).slice(0, 6);

  const handleGenerateId = () => {
    const nextId = generateUniqueNomusId(existingNomusIds, idNomus);
    setIdNomus(nextId);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Format automatically as AAAA.MM.DD.HHMM if user is typing pure digits
    if (/^\d+$/.test(val) && val.length > 4) {
      setIdNomus(formatNomusIdInput(val));
    } else {
      setIdNomus(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoItem.trim()) {
      alert("Por favor, preencha o Código do Item (ex: 023.0105).");
      return;
    }

    const finalIdNomus = idNomus.trim();
    const finalCodigo = codigoItem.trim().toUpperCase();
    const finalDescricao = descricaoItem.trim() || finalCodigo;

    setIsSubmitting(true);

    try {
      // 1. If option enabled and item is not in catalog yet, auto-save to catalog database
      if (saveToCatalogCheck && onSaveToCatalog) {
        const existing = catalog.find(p => p.codigo.toUpperCase() === finalCodigo);
        if (!existing) {
          await onSaveToCatalog({
            codigo: finalCodigo,
            descricao: finalDescricao,
            categoria: 'Chapas & Insumos',
            unidade,
            comprimento_padrao_mm: Number(comprimentoMm) || undefined,
            largura_padrao_mm: Number(larguraMm) || undefined,
            espessura_padrao_mm: Number(espessuraMm) || undefined
          });
        }
      }

      let finalQuantidade = Math.max(1, quantidade);
      const compNum = Number(comprimentoMm) || 0;
      const largNum = Number(larguraMm) || 0;
      const isM2Unit = unidade === 'm²' || unidade === 'metros quadrados' || unidade === 'm2';
      if (isM2Unit && compNum > 0 && largNum > 0) {
        finalQuantidade = Number((((compNum * largNum) / 1000000) * quantidade).toFixed(4));
      }

      // 2. Add Item to Inventory
      const newItem = await onAddItem({
        id_nomus: finalIdNomus,
        codigo_item: finalCodigo,
        descricao_item: finalDescricao,
        comprimento_mm: compNum,
        largura_mm: largNum,
        espessura_mm: Number(espessuraMm) || 0,
        quantidade: finalQuantidade,
        unidade,
        operador: operador.trim() || operadorPadrao || 'Operador Produção'
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
      setAutoFilledBadge(null);
    } catch (err) {
      console.error("Erro ao salvar insumo/chapa:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-[#1b367c] rounded-xl">
            <Package size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1b367c] flex items-center gap-2">
              <span>Cadastro de Chapas & Insumos</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                <Sparkles size={11} className="text-emerald-600" />
                Autocompletar Ativo
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Digite o código do produto (ex: 023.0105) para preencher a descrição e medidas automaticamente.
            </p>
          </div>
        </div>

        {onOpenCatalog && (
          <button
            type="button"
            onClick={onOpenCatalog}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-[#1b367c] text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Abrir e gerenciar base de dados do catálogo de produtos"
          >
            <BookOpen size={15} />
            <span>Consultar Catálogo</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ID Nomus & Operador */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              ID Nomus / Barcode (Manual ou Auto)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={idNomus}
                onChange={handleIdChange}
                placeholder="Ex: 2026.08.06.1430 ou digite um ID próprio"
                className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleGenerateId}
                className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs px-3 rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
                title="Gerar ID automático no formato AAAA.MM.DD.HHMM"
              >
                <Zap size={14} className="text-sky-600 fill-sky-600" />
                <span>Gerar ID Auto</span>
              </button>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
              Se deixar em branco, a etiqueta exibirá Cód, Descrição e QR Code.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Operador / Responsável
            </label>
            <input
              type="text"
              value={operador}
              onChange={e => setOperador(e.target.value)}
              placeholder="Nome de quem está fazendo"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
            />
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">
              Nome gravado no inventário.
            </span>
          </div>
        </div>

        {/* Auto-filled notification badge */}
        {autoFilledBadge && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>
                Item identificado no catálogo: <strong className="font-bold text-emerald-950">{autoFilledBadge}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAutoFilledBadge(null)}
              className="text-emerald-600 hover:text-emerald-800 text-[11px] font-bold underline cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Código do Item with Autocomplete suggestions */}
          <div className="md:col-span-1 relative" ref={dropdownRef}>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Código do Item / Produto *
            </label>
            <div className="relative">
              <input
                type="text"
                value={codigoItem}
                onChange={e => handleCodigoChange(e.target.value)}
                onFocus={() => {
                  if (codigoItem.trim()) setShowSuggestions(true);
                }}
                placeholder="Ex: 023.0105 ou 102.8490"
                className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-bold font-mono focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all uppercase"
                required
                autoComplete="off"
              />
              {catalog.length > 0 && onOpenCatalog && (
                <button
                  type="button"
                  onClick={onOpenCatalog}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#1b367c] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Abrir catálogo"
                >
                  <BookOpen size={16} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-[#1b367c] rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Sugestões da Base de Produtos:
                </div>
                {filteredSuggestions.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyCatalogItem(item)}
                    className="w-full p-2.5 text-left hover:bg-blue-50 transition-colors flex flex-col cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-[#1b367c]">
                        {item.codigo}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                        {item.categoria || 'Geral'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-700 font-medium line-clamp-1 mt-0.5">
                      {item.descricao}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Digite o código ou parte da descrição para buscar.
            </span>
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
              placeholder="Ex: CHAPA AC FQ - 3000 X 1200 X 12.50"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Quantidade */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              {(unidade === 'm²' || unidade === 'metros quadrados' || unidade === 'm2') ? 'Quantidade (Nº de Chapas/Peças) *' : 'Quantidade *'}
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-black text-center focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
              required
            />
            {(unidade === 'm²' || unidade === 'metros quadrados' || unidade === 'm2') && (
              <span className="text-[10px] text-sky-800 font-semibold mt-1 block">
                {Number(comprimentoMm) > 0 && Number(larguraMm) > 0
                  ? `Será lançado: ${(((Number(comprimentoMm) * Number(larguraMm)) / 1000000) * quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m² no estoque`
                  : 'Preencha o comprimento e largura para calcular a área em m²'}
              </span>
            )}
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
              <option value="metros quadrados">Metros Quadrados (m²)</option>
              <option value="m²">m²</option>
              <option value="chapas">Chapas</option>
              <option value="peças">Peças (un)</option>
              <option value="metros">Metros Lineares (m)</option>
              <option value="barras">Barras</option>
              <option value="kg">kg (Quilos)</option>
              <option value="rolo">Rolo / Bobina</option>
            </select>
          </div>
        </div>

        {/* Dimensões / Medidas em mm */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 uppercase block">
              Medidas / Dimensões Físicas (mm)
            </span>
            <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              Cálculo Automático de m²
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Comprimento (mm)
              </label>
              <input
                type="number"
                value={comprimentoMm}
                onChange={e => setComprimentoMm(e.target.value)}
                placeholder="Ex: 850"
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
                placeholder="Ex: 1250"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Espessura (mm)
              </label>
              <input
                type="number"
                step="0.01"
                value={espessuraMm}
                onChange={e => setEspessuraMm(e.target.value)}
                placeholder="Ex: 0.50"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white text-center"
              />
            </div>
          </div>

          {/* Real-time m² preview badge */}
          {Number(comprimentoMm) > 0 && Number(larguraMm) > 0 && (
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs text-sky-950">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-sky-600 shrink-0" />
                <span>
                  Área Unitária: <strong className="font-extrabold text-[#1b367c]">{((Number(comprimentoMm) * Number(larguraMm)) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²</strong> / chapa
                </span>
              </div>
              <div className="text-xs font-bold text-sky-900 bg-white/80 px-2 py-0.5 rounded border border-sky-200">
                Área Total ({quantidade} {quantidade === 1 ? 'un' : 'unidades'}): <strong className="text-emerald-700 font-extrabold">{(((Number(comprimentoMm) * Number(larguraMm)) / 1000000) * quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²</strong>
              </div>
            </div>
          )}
        </div>

        {/* Option to automatically remember new product in catalog */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToCatalogCheck}
              onChange={e => setSaveToCatalogCheck(e.target.checked)}
              className="rounded border-slate-300 text-[#1b367c] focus:ring-[#1b367c]"
            />
            <span>Salvar novos produtos automaticamente no Catálogo para futuros lançamentos</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-sm h-12 px-8 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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

