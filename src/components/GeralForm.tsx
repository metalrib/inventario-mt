import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Zap, RefreshCw, BookOpen, Sparkles, Check, CheckCircle2, Pin, PinOff, CheckSquare, Square, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { GeralItem, ProductCatalogItem } from '../types';
import { findCatalogProductByCode, generateUniqueNomusId, formatNomusIdInput } from '../services/firebase';

interface GeralFormProps {
  onAddItem?: (item: Omit<GeralItem, 'id'>) => Promise<GeralItem | void>;
  onSaveGeral?: (item: Omit<GeralItem, 'id'>) => Promise<GeralItem | void>;
  operadorPadrao?: string;
  autoImprimirAoSalvar?: boolean;
  onOpenPrintModal?: (item: GeralItem) => void;
  onPrintGeralItem?: (item: GeralItem) => void;
  catalog?: ProductCatalogItem[];
  productCatalog?: ProductCatalogItem[];
  onOpenCatalog?: () => void;
  onOpenCatalogModal?: () => void;
  onSaveToCatalog?: (item: Omit<ProductCatalogItem, 'id'>) => Promise<void>;
  prefilledItem?: ProductCatalogItem | null;
  prefilledProductItem?: ProductCatalogItem | null;
  onClearPrefilledProduct?: () => void;
  existingNomusIds?: string[];
}

export const GeralForm: React.FC<GeralFormProps> = ({
  onAddItem,
  onSaveGeral,
  operadorPadrao = 'Operador Metalrib',
  autoImprimirAoSalvar,
  onOpenPrintModal,
  onPrintGeralItem,
  catalog = [],
  productCatalog = [],
  onOpenCatalog,
  onOpenCatalogModal,
  onSaveToCatalog,
  prefilledItem,
  prefilledProductItem,
  onClearPrefilledProduct,
  existingNomusIds = []
}) => {
  const activeCatalog = catalog.length > 0 ? catalog : (productCatalog || []);
  const handleSave = onSaveGeral || onAddItem;
  const handleOpenCatalogView = onOpenCatalogModal || onOpenCatalog || (() => {});
  const handlePrintModal = onPrintGeralItem || onOpenPrintModal;
  const activePrefilled = prefilledProductItem || prefilledItem || null;
  const [codigoItem, setCodigoItem] = useState('');
  const [descricaoItem, setDescricaoItem] = useState('');
  const [idNomus, setIdNomus] = useState('');
  const [comprimentoMm, setComprimentoMm] = useState<string>('');
  const [larguraMm, setLarguraMm] = useState<string>('');
  const [espessuraMm, setEspessuraMm] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [unidade, setUnidade] = useState<string>('metros quadrados');
  const [operador, setOperador] = useState<string>(operadorPadrao || 'Operador Produção');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveToCatalogCheck, setSaveToCatalogCheck] = useState(true);
  const [autoFilledBadge, setAutoFilledBadge] = useState<string | null>(null);

  // Fast-counting workflow automation states
  const [autoGerarId, setAutoGerarId] = useState<boolean>(() => {
    const saved = localStorage.getItem('metalrib_auto_gerar_id');
    return saved !== null ? saved === 'true' : true;
  });
  const [fixarProduto, setFixarProduto] = useState<boolean>(() => {
    const saved = localStorage.getItem('metalrib_fixar_produto');
    return saved !== null ? saved === 'true' : true;
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Tone / Tom selection state (stays persistent across subsequent entries)
  const [selectedTom, setSelectedTom] = useState<string>(() => {
    return localStorage.getItem('metalrib_selected_tom') || '';
  });
  const [customTomInput, setCustomTomInput] = useState<string>('');

  const comprimentoInputRef = useRef<HTMLInputElement>(null);
  const codigoInputRef = useRef<HTMLInputElement>(null);

  const formatTomSuffix = (tom: string): string => {
    const clean = (tom || '').trim().toUpperCase();
    if (!clean) return '';
    if (clean.startsWith('T')) return `.${clean}`;
    return `.T${clean}`;
  };

  const applyTomToId = (baseOrFullId: string, tom: string): string => {
    const base = (baseOrFullId || '').replace(/\.T[A-Za-z0-9_-]+$/i, '').trim();
    if (!base) return '';
    const suffix = formatTomSuffix(tom);
    return base + suffix;
  };

  // Auto-generate ID on mount if active or if current ID is already taken
  useEffect(() => {
    if (autoGerarId) {
      if (!idNomus || existingNomusIds.includes(idNomus.trim())) {
        const base = generateUniqueNomusId(existingNomusIds, idNomus.replace(/\.T[A-Za-z0-9_-]+$/i, ''));
        setIdNomus(selectedTom ? applyTomToId(base, selectedTom) : base);
      }
    }
  }, [autoGerarId, existingNomusIds]);

  const handleToggleAutoGerarId = (val: boolean) => {
    setAutoGerarId(val);
    localStorage.setItem('metalrib_auto_gerar_id', String(val));
    if (val) {
      if (!idNomus || existingNomusIds.includes(idNomus.trim())) {
        const base = generateUniqueNomusId(existingNomusIds, idNomus.replace(/\.T[A-Za-z0-9_-]+$/i, ''));
        setIdNomus(selectedTom ? applyTomToId(base, selectedTom) : base);
      }
    }
  };

  const handleToggleFixarProduto = (val: boolean) => {
    setFixarProduto(val);
    localStorage.setItem('metalrib_fixar_produto', String(val));
  };

  const handleSelectTom = (tom: string) => {
    const clean = tom.trim().toUpperCase().replace(/^T/i, '');
    setSelectedTom(clean);
    localStorage.setItem('metalrib_selected_tom', clean);

    if (idNomus) {
      setIdNomus(applyTomToId(idNomus, clean));
    } else if (autoGerarId) {
      const base = generateUniqueNomusId(existingNomusIds);
      setIdNomus(applyTomToId(base, clean));
    }
  };

  const handleApplyCustomTom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customTomInput.trim()) {
      handleSelectTom(customTomInput.trim());
      setCustomTomInput('');
    }
  };

  useEffect(() => {
    if (operadorPadrao) {
      setOperador(operadorPadrao);
    }
  }, [operadorPadrao]);

  // Suggestions Dropdown
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Respond to activePrefilled if passed from catalog selection
  useEffect(() => {
    if (activePrefilled) {
      applyCatalogItem(activePrefilled);
      if (onClearPrefilledProduct) {
        onClearPrefilledProduct();
      }
    }
  }, [activePrefilled]);

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

    // Focus on Comprimento after selecting product
    setTimeout(() => {
      comprimentoInputRef.current?.focus();
    }, 100);
  };

  const handleClearProductSelection = () => {
    setCodigoItem('');
    setDescricaoItem('');
    setAutoFilledBadge(null);
    setComprimentoMm('');
    setLarguraMm('');
    setEspessuraMm('');
    setTimeout(() => {
      codigoInputRef.current?.focus();
    }, 100);
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
    const match = findCatalogProductByCode(val, activeCatalog) || activeCatalog.find(p => (p.codigo || '').toLowerCase() === val.toLowerCase().trim());
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
  const filteredSuggestions = (activeCatalog || []).filter(p => {
    if (!p) return false;
    const term = codigoItem.toLowerCase().trim();
    if (!term) return false;
    return (
      (p.codigo && p.codigo.toLowerCase().includes(term)) ||
      (p.descricao && p.descricao.toLowerCase().includes(term))
    );
  }).slice(0, 6);

  const handleGenerateId = () => {
    const base = generateUniqueNomusId(existingNomusIds, idNomus.replace(/\.T[A-Za-z0-9_-]+$/i, ''));
    const fullId = selectedTom ? applyTomToId(base, selectedTom) : base;
    setIdNomus(fullId);
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Format automatically as AAAA.MM.DD.HHMM if user is typing pure digits
    if (/^\d+$/.test(val) && val.length > 4) {
      const formatted = formatNomusIdInput(val);
      setIdNomus(selectedTom ? applyTomToId(formatted, selectedTom) : formatted);
    } else {
      setIdNomus(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoItem.trim()) {
      alert("Por favor, preencha o Código do Item (ex: 023.0105).");
      codigoInputRef.current?.focus();
      return;
    }

    let finalIdNomus = idNomus.trim();
    if (!finalIdNomus) {
      const base = generateUniqueNomusId(existingNomusIds);
      finalIdNomus = selectedTom ? applyTomToId(base, selectedTom) : base;
    }
    const finalCodigo = codigoItem.trim().toUpperCase();
    const finalDescricao = descricaoItem.trim() || finalCodigo;

    setIsSubmitting(true);

    try {
      // 1. If option enabled and item is not in catalog yet, auto-save to catalog database
      if (saveToCatalogCheck && onSaveToCatalog) {
        const existing = (activeCatalog || []).find(p => (p.codigo || '').toUpperCase() === finalCodigo);
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
      let newItem: any = null;
      if (handleSave) {
        newItem = await handleSave({
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
      }

      if (autoImprimirAoSalvar && handlePrintModal && newItem) {
        handlePrintModal(newItem);
      }

      // 3. Smart Reset according to workflow options:
      if (fixarProduto) {
        // KEEP product code, description, and unit. Clear only dimensions.
        setComprimentoMm('');
        setLarguraMm('');
        setEspessuraMm('');
        setQuantidade(1);

        // Auto-focus on Comprimento to measure next piece immediately
        setTimeout(() => {
          comprimentoInputRef.current?.focus();
        }, 120);
      } else {
        // Full reset
        setCodigoItem('');
        setDescricaoItem('');
        setComprimentoMm('');
        setLarguraMm('');
        setEspessuraMm('');
        setQuantidade(1);
        setAutoFilledBadge(null);

        setTimeout(() => {
          codigoInputRef.current?.focus();
        }, 120);
      }

      // If auto-generate ID is active, generate next ID automatically with active Tom preserved!
      if (autoGerarId) {
        const nextBase = generateUniqueNomusId([finalIdNomus, ...existingNomusIds]);
        setIdNomus(selectedTom ? applyTomToId(nextBase, selectedTom) : nextBase);
      } else {
        setIdNomus('');
      }
    } catch (err) {
      console.error("Erro ao salvar insumo/chapa:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-[#1b367c] rounded-xl shrink-0">
            <Package size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#1b367c] flex items-center gap-2 flex-wrap">
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

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleOpenCatalogView}
            className="bg-slate-100 hover:bg-slate-200 text-[#1b367c] text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Abrir e gerenciar base de dados do catálogo de produtos"
          >
            <BookOpen size={15} />
            <span>Consultar Catálogo</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title={isCollapsed ? "Expandir formulário de cadastro" : "Minimizar formulário para focar na tabela"}
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
      </div>

      {!isCollapsed && (
        <div className="mt-4 animate-fadeIn">
          {/* Fast Inventory Acceleration Toolbar */}
          <div className="mb-4 bg-gradient-to-r from-blue-50/80 via-slate-50 to-emerald-50/70 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Zap size={14} className="text-amber-500 fill-amber-500" />
              <span>Modo Contagem Rápida:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Toggle: Auto-Gerar ID */}
              <button
                type="button"
                onClick={() => handleToggleAutoGerarId(!autoGerarId)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                  autoGerarId
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                title="Gera o ID automaticamente a cada cadastro sem precisar clicar em 'Gerar ID'"
              >
                <Zap size={13} className={autoGerarId ? 'fill-white' : 'text-slate-400'} />
                <span>Auto-Gerar ID: {autoGerarId ? 'LIGADO' : 'DESLIGADO'}</span>
              </button>

              {/* Toggle: Fixar Produto */}
              <button
                type="button"
                onClick={() => handleToggleFixarProduto(!fixarProduto)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer border ${
                  fixarProduto
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
                title="Mantém o produto selecionado para cadastrar várias chapas do mesmo código seguidas"
              >
                <Pin size={13} className={fixarProduto ? 'rotate-45' : 'text-slate-400'} />
                <span>Fixar Produto: {fixarProduto ? 'LIGADO' : 'DESLIGADO'}</span>
              </button>
            </div>
          </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ID Nomus & Operador */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ID Nomus / Barcode
              </label>
              {autoGerarId && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full border border-blue-200 flex items-center gap-1">
                  <Zap size={10} className="fill-blue-600" />
                  Gerado Automaticamente
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={idNomus}
                onChange={handleIdChange}
                placeholder="Ex: 2026.08.19.1430 ou digite um ID próprio"
                className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={handleGenerateId}
                className="bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs px-3 rounded-xl border border-sky-200 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
                title="Regerar novo ID único no formato AAAA.MM.DD.HHMM"
              >
                <RefreshCw size={13} className="text-sky-600" />
                <span>Regerar ID</span>
              </button>
            </div>

            {/* Tom / Tonalidade Selector - Below ID Nomus */}
            <div className="mt-2.5 p-2.5 bg-slate-50/90 border border-slate-200 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Palette size={14} className="text-[#1b367c]" />
                  <span>Tom da Chapa / Sufixo do ID:</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
                    (fixo para as próximas aferições)
                  </span>
                </div>

                {selectedTom ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-[#1b367c] border border-blue-200">
                    <Check size={11} className="text-blue-700" />
                    Sufixo: <strong className="font-mono">{formatTomSuffix(selectedTom)}</strong>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    Sem Tom (padrão)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Botão Sem Tom */}
                <button
                  type="button"
                  onClick={() => handleSelectTom('')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
                    !selectedTom
                      ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Não anexar sufixo de Tom ao ID"
                >
                  Sem Tom
                </button>

                {/* Botões Rápidos: Tom 1 até Tom 5 */}
                {[
                  { label: 'Tom 1', val: '1', suffix: '.T1' },
                  { label: 'Tom 2', val: '2', suffix: '.T2' },
                  { label: 'Tom 3', val: '3', suffix: '.T3' },
                  { label: 'Tom 4', val: '4', suffix: '.T4' },
                  { label: 'Tom 5', val: '5', suffix: '.T5' }
                ].map(t => {
                  const isSelected = selectedTom === t.val || selectedTom === `T${t.val}`;
                  return (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => handleSelectTom(t.val)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#1b367c] text-white border-blue-900 shadow-xs ring-2 ring-blue-300/60'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300 hover:bg-blue-50/60'
                      }`}
                      title={`Definir sufixo ${t.suffix}`}
                    >
                      <span>{t.label}</span>
                      <span className={`text-[10px] font-mono font-bold px-1 py-0.2 rounded ${
                        isSelected ? 'bg-blue-900/60 text-blue-100' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {t.suffix}
                      </span>
                    </button>
                  );
                })}

                {/* Campo para Tom Personalizado */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 pl-2 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 font-mono">T</span>
                  <input
                    type="text"
                    placeholder="Nº"
                    value={customTomInput}
                    onChange={e => setCustomTomInput(e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCustomTom();
                      }
                    }}
                    className="w-10 h-6 text-xs font-bold font-mono text-center border-none focus:outline-none bg-transparent"
                    maxLength={3}
                    title="Digite um número de tom personalizado (ex: 6 para .T6)"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCustomTom()}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-[#1b367c] hover:text-white text-slate-700 text-[11px] font-bold rounded transition-colors cursor-pointer"
                    title="Aplicar Tom personalizado"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
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
                Item selecionado: <strong className="font-bold text-emerald-950">{autoFilledBadge}</strong>
              </span>
              {fixarProduto && (
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded ml-1">
                  Fixado para próximas chapas
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearProductSelection}
              className="text-emerald-700 hover:text-emerald-900 text-[11px] font-bold underline cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-300"
            >
              Trocar Produto
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Código do Item with Autocomplete suggestions */}
          <div className="md:col-span-1 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Código do Item / Produto *
              </label>
              {fixarProduto && codigoItem && (
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                  <Pin size={10} className="rotate-45" />
                  Fixado
                </span>
              )}
            </div>
            <div className="relative">
              <input
                ref={codigoInputRef}
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
                Comprimento (mm) *
              </label>
              <input
                ref={comprimentoInputRef}
                type="number"
                value={comprimentoMm}
                onChange={e => setComprimentoMm(e.target.value)}
                placeholder="Ex: 850"
                className="w-full h-10 px-3 border-2 border-slate-300 focus:border-[#1b367c] rounded-lg text-xs font-black focus:outline-none bg-white text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Largura (mm) *
              </label>
              <input
                type="number"
                value={larguraMm}
                onChange={e => setLarguraMm(e.target.value)}
                placeholder="Ex: 1250"
                className="w-full h-10 px-3 border-2 border-slate-300 focus:border-[#1b367c] rounded-lg text-xs font-black focus:outline-none bg-white text-center"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={saveToCatalogCheck}
              onChange={e => setSaveToCatalogCheck(e.target.checked)}
              className="rounded border-slate-300 text-[#1b367c] focus:ring-[#1b367c]"
            />
            <span>Salvar novos produtos automaticamente no Catálogo</span>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-sm h-12 px-8 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
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
      )}
    </div>
  );
};


