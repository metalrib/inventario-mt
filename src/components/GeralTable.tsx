import React, { useState, useMemo } from 'react';
import { GeralItem, FilterState } from '../types';
import { Search, Printer, Trash2, Edit2, ArrowUpDown, Check, X, Tag, Package, FileSpreadsheet, RefreshCw, CheckSquare, Square, Filter, Layers, CheckCircle, ChevronRight, Eye } from 'lucide-react';
import { exportGeraisXLSX } from '../services/exporter';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface GeralTableProps {
  items?: GeralItem[];
  gerais?: GeralItem[];
  onRefresh?: () => void;
  onDeleteItem?: (id: string | number) => void | Promise<void>;
  onDeleteGeral?: (id: string | number) => void | Promise<void>;
  onDeleteBatch?: (ids: (string | number)[]) => void | Promise<void>;
  onClearAll?: () => void | Promise<void>;
  onClearGerais?: () => void | Promise<void>;
  onUpdateItem?: (id: string | number, updated: Partial<GeralItem>) => void | Promise<void>;
  onEditGeral?: (id: string | number, updated: Partial<GeralItem>) => void | Promise<void>;
  onOpenBatchPrint?: (items: GeralItem[]) => void;
  onPrintBatch?: (items: GeralItem[]) => void;
  onOpenSinglePrint?: (item: GeralItem) => void;
  onPrintSingle?: (item: GeralItem) => void;
  initialProductCodeFilter?: string | null;
  onSelectProductCode?: (code: string | null) => void;
}

export const GeralTable: React.FC<GeralTableProps> = ({
  items,
  gerais,
  onRefresh,
  onDeleteItem,
  onDeleteGeral,
  onDeleteBatch,
  onClearAll,
  onClearGerais,
  onUpdateItem,
  onEditGeral,
  onOpenBatchPrint,
  onPrintBatch,
  onOpenSinglePrint,
  onPrintSingle,
  initialProductCodeFilter = null,
  onSelectProductCode
}) => {
  const itemList = items || gerais || [];
  const handleClear = onClearAll || onClearGerais || (() => {});
  const handleUpdate = onUpdateItem || onEditGeral || (() => {});
  const handleDelete = onDeleteGeral || onDeleteItem || (() => {});
  const handleBatchPrintCallback = onOpenBatchPrint || onPrintBatch || (() => {});
  const handleSinglePrintCallback = onOpenSinglePrint || onPrintSingle || (() => {});

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<GeralItem>>({});

  // Product Code Separation / Focus Mode State (Option A)
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(initialProductCodeFilter);
  const [codeFilterSearch, setCodeFilterSearch] = useState<string>('');

  // Handle setting product code and notifying parent if provided
  const handleSetProductCode = (code: string | null) => {
    setSelectedProductCode(code);
    if (onSelectProductCode) {
      onSelectProductCode(code);
    }
  };

  // Group and summarize inventory items by product code
  const productGroups = useMemo(() => {
    const map = new Map<string, {
      codigo: string;
      descricao: string;
      count: number;
      totalQty: number;
      totalM2: number;
    }>();

    itemList.forEach(item => {
      if (!item) return;
      const code = item.codigo_item?.trim() || 'SEM-CODIGO';
      const existing = map.get(code);

      const isM2 = item.unidade === 'm²' || item.unidade === 'metros quadrados' || item.unidade === 'm2';
      let m2 = 0;
      if (item.comprimento_mm && item.largura_mm) {
        const val = Number(item.quantidade) || 0;
        if (isM2 && val >= 1 && Number.isInteger(val)) {
          m2 = ((item.comprimento_mm * item.largura_mm) / 1000000) * val;
        } else {
          m2 = val > 0 && isM2 ? val : ((item.comprimento_mm * item.largura_mm) / 1000000) * (val || 1);
        }
      } else if (isM2) {
        m2 = Number(item.quantidade) || 0;
      }

      let qty = 1;
      if (isM2) {
        const val = Number(item.quantidade) || 0;
        qty = val >= 1 && Number.isInteger(val) ? val : 1;
      } else {
        qty = Number(item.quantidade) || 0;
      }

      if (existing) {
        existing.count += 1;
        existing.totalQty += qty;
        existing.totalM2 += m2;
        if (!existing.descricao && item.descricao_item) {
          existing.descricao = item.descricao_item;
        }
      } else {
        map.set(code, {
          codigo: code,
          descricao: item.descricao_item || '',
          count: 1,
          totalQty: qty,
          totalM2: m2
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [itemList]);

  // Filtered product groups for code chips search
  const visibleProductGroups = useMemo(() => {
    if (!codeFilterSearch.trim()) return productGroups;
    const term = codeFilterSearch.toLowerCase().trim();
    return productGroups.filter(g =>
      g.codigo.toLowerCase().includes(term) ||
      g.descricao.toLowerCase().includes(term)
    );
  }, [productGroups, codeFilterSearch]);

  // Active product group details
  const activeProductGroup = useMemo(() => {
    if (!selectedProductCode) return null;
    return productGroups.find(g => g.codigo === selectedProductCode) || null;
  }, [productGroups, selectedProductCode]);

  // Deletion modals state
  const [itemToDelete, setItemToDelete] = useState<GeralItem | null>(null);
  const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    minMedida: '',
    maxMedida: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Filter and Sort
  const filteredItems = itemList.filter(item => {
    if (!item) return false;

    // Filter by selected product code (Option A: separação limpa por código)
    if (selectedProductCode) {
      const code = item.codigo_item?.trim() || 'SEM-CODIGO';
      if (code !== selectedProductCode) return false;
    }

    const searchLower = filters.search.toLowerCase();
    const matchSearch =
      !filters.search ||
      (item.codigo_item && item.codigo_item.toLowerCase().includes(searchLower)) ||
      (item.descricao_item && item.descricao_item.toLowerCase().includes(searchLower)) ||
      (item.id_nomus && item.id_nomus.toLowerCase().includes(searchLower)) ||
      (item.operador && item.operador.toLowerCase().includes(searchLower));

    return matchSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let factor = filters.sortOrder === 'asc' ? 1 : -1;
    if (filters.sortBy === 'codigo_item') {
      return a.codigo_item.localeCompare(b.codigo_item) * factor;
    }
    if (filters.sortBy === 'quantidade') {
      return (a.quantidade - b.quantidade) * factor;
    }
    // Default created_at
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return (dateA - dateB) * factor;
  });

  // Global Totals (All items)
  const totalM2 = itemList.reduce((acc, i) => {
    if (!i) return acc;
    const isM2 = i.unidade === 'm²' || i.unidade === 'metros quadrados' || i.unidade === 'm2';
    if (i.comprimento_mm && i.largura_mm) {
      if (isM2) {
        const val = Number(i.quantidade) || 0;
        if (val >= 1 && Number.isInteger(val)) {
          return acc + ((i.comprimento_mm * i.largura_mm) / 1000000) * val;
        }
        return acc + (val > 0 ? val : ((i.comprimento_mm * i.largura_mm) / 1000000));
      }
      return acc + ((i.comprimento_mm * i.largura_mm) / 1000000) * (Number(i.quantidade) || 1);
    }
    if (isM2) {
      return acc + (Number(i.quantidade) || 0);
    }
    return acc;
  }, 0);

  const totalQty = itemList.reduce((acc, i) => {
    if (!i) return acc;
    const isM2 = i.unidade === 'm²' || i.unidade === 'metros quadrados' || i.unidade === 'm2';
    if (isM2) {
      const val = Number(i.quantidade) || 0;
      if (val >= 1 && Number.isInteger(val)) return acc + val;
      return acc + 1;
    }
    return acc + (Number(i.quantidade) || 0);
  }, 0);

  // Focused Totals (Currently visible in view)
  const focusedM2 = filteredItems.reduce((acc, i) => {
    if (!i) return acc;
    const isM2 = i.unidade === 'm²' || i.unidade === 'metros quadrados' || i.unidade === 'm2';
    if (i.comprimento_mm && i.largura_mm) {
      if (isM2) {
        const val = Number(i.quantidade) || 0;
        if (val >= 1 && Number.isInteger(val)) {
          return acc + ((i.comprimento_mm * i.largura_mm) / 1000000) * val;
        }
        return acc + (val > 0 ? val : ((i.comprimento_mm * i.largura_mm) / 1000000));
      }
      return acc + ((i.comprimento_mm * i.largura_mm) / 1000000) * (Number(i.quantidade) || 1);
    }
    if (isM2) {
      return acc + (Number(i.quantidade) || 0);
    }
    return acc;
  }, 0);

  const focusedQty = filteredItems.reduce((acc, i) => {
    if (!i) return acc;
    const isM2 = i.unidade === 'm²' || i.unidade === 'metros quadrados' || i.unidade === 'm2';
    if (isM2) {
      const val = Number(i.quantidade) || 0;
      if (val >= 1 && Number.isInteger(val)) return acc + val;
      return acc + 1;
    }
    return acc + (Number(i.quantidade) || 0);
  }, 0);

  // Batch Select Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === sortedItems.length && sortedItems.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedItems.map(i => i.id));
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchPrint = () => {
    const selectedItems = itemList.filter(i => selectedIds.includes(i.id));
    if (selectedItems.length > 0) {
      handleBatchPrintCallback(selectedItems);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setIsDeleteBatchModalOpen(true);
  };

  const handleConfirmDeleteBatch = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteBatch) {
        await onDeleteBatch(selectedIds);
      } else {
        for (const id of selectedIds) {
          await handleDelete(id);
        }
      }
      setSelectedIds([]);
      setIsDeleteBatchModalOpen(false);
    } catch (err) {
      console.error('Erro ao excluir lote:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllConfirm = () => {
    setIsClearAllModalOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setIsDeleting(true);
    try {
      await handleClear();
      setSelectedIds([]);
      setIsClearAllModalOpen(false);
    } catch (err) {
      console.error('Erro ao limpar lista:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await handleDelete(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Edit Row Handlers
  const handleStartEdit = (item: GeralItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = (id: string | number) => {
    handleUpdate(id, editForm);
    setEditingId(null);
  };

  const formatDimension = (item: GeralItem) => {
    const parts = [];
    if (item.comprimento_mm) parts.push(`${item.comprimento_mm}`);
    if (item.largura_mm) parts.push(`${item.largura_mm}`);
    if (item.espessura_mm) parts.push(`${item.espessura_mm}`);
    return parts.length > 0 ? `${parts.join(' x ')} mm` : 'N/A';
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
      {/* Top Header Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <h2 className="font-extrabold text-base text-[#1b367c] flex items-center gap-2">
            <span>Chapas e Insumos Cadastrados</span>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-[#1b367c] rounded-full">
              {selectedProductCode ? `${filteredItems.length} de ${itemList.length} chapas` : `${itemList.length} registros`}
            </span>
            {selectedProductCode && (
              <span className="text-[11px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                Foco no Código {selectedProductCode}
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {selectedProductCode ? (
                <>Visíveis deste código: <strong className="text-slate-800 font-extrabold">{focusedQty} unidades/chapas</strong></>
              ) : (
                <>Total: <strong className="text-slate-800 font-extrabold">{totalQty} unidades/chapas</strong></>
              )}
            </span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-md font-bold">
              {selectedProductCode ? 'Área Deste Código: ' : 'Área Total Acumulada: '}
              <strong className="text-emerald-800 font-black">
                {(selectedProductCode ? focusedM2 : totalM2).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²
              </strong>
            </span>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Sincronizar</span>
          </button>
        )}
      </div>

      {/* Product Code Selector Bar (Opção A - Pastas / Abas por Código de Produto) */}
      {productGroups.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#1b367c] text-white rounded-lg shadow-xs">
                <Layers size={15} />
              </span>
              <div>
                <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Separar Chapas por Código de Produto
                </span>
                <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1b367c]">
                  {productGroups.length} {productGroups.length === 1 ? 'código no estoque' : 'códigos no estoque'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {productGroups.length > 3 && (
                <div className="relative">
                  <input
                    type="text"
                    value={codeFilterSearch}
                    onChange={e => setCodeFilterSearch(e.target.value)}
                    placeholder="Buscar código..."
                    className="h-7 w-32 sm:w-40 pl-6 pr-6 text-[11px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#1b367c]"
                  />
                  <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  {codeFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setCodeFilterSearch('')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {selectedProductCode !== null && (
                <button
                  type="button"
                  onClick={() => handleSetProductCode(null)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <X size={12} />
                  <span>Ver Todas ({itemList.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards / Chips strip */}
          <div className="flex flex-wrap items-stretch gap-2 pt-1 max-h-48 overflow-y-auto">
            {/* All items card */}
            <button
              type="button"
              onClick={() => handleSetProductCode(null)}
              className={`text-left px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-w-[140px] shrink-0 ${
                selectedProductCode === null
                  ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-md ring-2 ring-blue-300'
                  : 'bg-white hover:bg-slate-100/90 text-slate-700 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black">Todas as Chapas</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedProductCode === null ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {itemList.length}
                </span>
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${selectedProductCode === null ? 'text-blue-100' : 'text-slate-500'}`}>
                {totalM2.toFixed(2)} m² acumulado
              </span>
            </button>

            {/* Individual Product Code Cards */}
            {visibleProductGroups.map(group => {
              const isSelected = selectedProductCode === group.codigo;
              return (
                <button
                  key={group.codigo}
                  type="button"
                  onClick={() => handleSetProductCode(isSelected ? null : group.codigo)}
                  title={`${group.codigo} - ${group.descricao} (${group.count} chapas cadastradas)`}
                  className={`text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-w-[155px] max-w-[240px] shrink-0 ${
                    isSelected
                      ? 'bg-[#1b367c] text-white border-[#13275b] shadow-md ring-2 ring-blue-300'
                      : 'bg-white hover:bg-blue-50/80 text-slate-800 border-slate-200 hover:border-blue-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-xs tracking-tight truncate">
                      {group.codigo}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/25 text-white' : 'bg-blue-100 text-[#1b367c]'
                    }`}>
                      {group.count} {group.count === 1 ? 'pç' : 'pçs'}
                    </span>
                  </div>
                  {group.descricao && (
                    <span className={`text-[10px] truncate max-w-[190px] mt-0.5 ${
                      isSelected ? 'text-blue-100' : 'text-slate-600 font-medium'
                    }`}>
                      {group.descricao}
                    </span>
                  )}
                  <div className="flex items-center justify-between text-[10px] font-bold mt-1">
                    <span className={isSelected ? 'text-emerald-300 font-extrabold' : 'text-emerald-700'}>
                      {group.totalM2.toFixed(2)} m²
                    </span>
                    <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                      {group.totalQty} un.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Focused mode informative banner */}
          {selectedProductCode && activeProductGroup && (
            <div className="p-2.5 bg-blue-100/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-[#1b367c] shrink-0" />
                <span className="text-xs text-[#1b367c]">
                  Modo Focado Ativo: Exibindo <strong>apenas as {filteredItems.length} chapas</strong> do código <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-blue-200 text-slate-900">{selectedProductCode}</strong> {activeProductGroup.descricao ? `— ${activeProductGroup.descricao}` : ''}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold shrink-0">
                {selectedProductCode.toUpperCase().startsWith('ITEM-') && (
                  <button
                    type="button"
                    onClick={async () => {
                      const first = filteredItems[0];
                      const targetCode = prompt('Digite o código correto do produto (ex: 023.0116):', '023.0116');
                      if (!targetCode || !targetCode.trim()) return;
                      const targetDesc = prompt('Descrição do produto:', 'CHAPA INOX 304 ESC - M2');
                      for (const it of filteredItems) {
                        await handleUpdate(it.id, {
                          codigo_item: targetCode.trim(),
                          descricao_item: (targetDesc || '').trim() || 'CHAPA INOX 304 ESC - M2'
                        });
                      }
                      handleSetProductCode(targetCode.trim());
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                    title="Corrigir código provisório deste grupo"
                  >
                    ⚡ Corrigir Código do Produto
                  </button>
                )}
                <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-md shadow-xs">
                  Área do Código: {focusedM2.toFixed(2)} m²
                </span>
                <button
                  type="button"
                  onClick={() => handleSetProductCode(null)}
                  className="text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-xs"
                >
                  ✕ Ver Todos os Códigos
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder={selectedProductCode ? `Buscar nas chapas do código ${selectedProductCode}...` : "Buscar por código (XXX.XXXX), descrição, ID Nomus..."}
            className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportGeraisXLSX(selectedProductCode ? filteredItems : itemList)}
            disabled={filteredItems.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs px-3.5 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            title={selectedProductCode ? `Exportar Excel das ${filteredItems.length} chapas do código ${selectedProductCode}` : "Exportar tabela de insumos e chapas para Excel (.xlsx)"}
          >
            <FileSpreadsheet size={16} />
            <span>{selectedProductCode ? `Exportar Excel (${filteredItems.length})` : 'Exportar Excel (.xlsx)'}</span>
          </button>

          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleBatchPrint}
                className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-3.5 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer size={16} />
                <span>Imprimir Lote ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3.5 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                title="Excluir apenas os itens selecionados"
              >
                <Trash2 size={16} />
                <span>Excluir ({selectedIds.length})</span>
              </button>
            </>
          )}

          {/* Limpar Lista Button */}
          <button
            type="button"
            onClick={handleClearAllConfirm}
            disabled={itemList.length === 0}
            className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs px-3.5 h-10 rounded-xl flex items-center gap-1.5 border border-slate-300 hover:border-rose-300 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Limpar todos os itens e chapas da lista"
          >
            <Trash2 size={15} className="text-rose-600" />
            <span>Limpar Lista</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFilters(prev => ({
                ...prev,
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
              }))
            }
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 h-10 rounded-xl flex items-center gap-1 border border-slate-300 cursor-pointer"
          >
            <ArrowUpDown size={14} />
            <span>{filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[650px] 2xl:max-h-[calc(100vh-290px)] rounded-xl border border-slate-200 shadow-xs bg-white">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs border-b-2 border-slate-200">
            <tr className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center justify-center cursor-pointer p-1"
                  title={selectedIds.length === sortedItems.length && sortedItems.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                >
                  {selectedIds.length > 0 && selectedIds.length === sortedItems.length ? (
                    <CheckSquare size={17} className="text-[#1b367c]" />
                  ) : (
                    <Square size={17} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="p-3 w-36 whitespace-nowrap">Código de Barras</th>
              <th className="p-3 w-28 whitespace-nowrap">Código Item</th>
              <th className="p-3 min-w-[160px]">Descrição</th>
              <th className="p-3 text-center w-36">Dimensões & Área (m²)</th>
              <th className="p-3 text-center w-28">Qtd / Unid.</th>
              <th className="p-3 text-center w-28">Data / Operador</th>
              <th className="p-3 text-right w-28">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-medium">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 text-slate-300" />
                  {selectedProductCode ? (
                    <div className="space-y-2">
                      <p className="font-bold text-slate-700">Nenhuma chapa encontrada para o código "{selectedProductCode}".</p>
                      <button
                        type="button"
                        onClick={() => handleSetProductCode(null)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#1b367c] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      >
                        <X size={13} />
                        <span>Ver todas as chapas ({itemList.length})</span>
                      </button>
                    </div>
                  ) : filters.search ? (
                    <div>
                      <p className="font-bold text-slate-700">Nenhum item encontrado para a busca "{filters.search}".</p>
                      <p className="text-[11px] text-slate-400">Tente buscar por outro código, ID ou descrição.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700">Nenhum item ou chapa cadastrado ainda.</p>
                      <p className="text-[11px]">Use o formulário acima para registrar novos insumos.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sortedItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <tr key={item.id} className="bg-blue-50/70">
                      <td className="p-3 text-center"></td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.id_nomus || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, id_nomus: e.target.value }))}
                          className="w-full h-8 px-2 border rounded font-mono text-xs"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.codigo_item || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, codigo_item: e.target.value }))}
                          className="w-full h-8 px-2 border rounded text-xs font-bold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={editForm.descricao_item || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, descricao_item: e.target.value }))}
                          className="w-full h-8 px-2 border rounded text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <input
                            type="number"
                            value={editForm.comprimento_mm || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, comprimento_mm: Number(e.target.value) }))}
                            placeholder="C"
                            className="w-14 h-8 px-1 border rounded text-center text-xs"
                          />
                          <input
                            type="number"
                            value={editForm.largura_mm || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, largura_mm: Number(e.target.value) }))}
                            placeholder="L"
                            className="w-14 h-8 px-1 border rounded text-center text-xs"
                          />
                          <input
                            type="number"
                            value={editForm.espessura_mm || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, espessura_mm: Number(e.target.value) }))}
                            placeholder="E"
                            className="w-12 h-8 px-1 border rounded text-center text-xs"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={editForm.quantidade || 1}
                          onChange={e => setEditForm(prev => ({ ...prev, quantidade: Number(e.target.value) }))}
                          className="w-16 h-8 px-1 border rounded text-center text-xs font-bold"
                        />
                      </td>
                      <td className="p-3 text-center text-[10px] text-slate-500">
                        {item.operador}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const isM2 = item.unidade === 'm²' || item.unidade === 'metros quadrados' || item.unidade === 'm2';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.id)}
                        className="cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare size={16} className="text-[#1b367c]" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#1b367c]">
                      {item.id_nomus || <span className="text-slate-400 font-normal italic text-xs">Sem ID</span>}
                    </td>
                    <td className="p-3 font-extrabold text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleSetProductCode(selectedProductCode === item.codigo_item ? null : item.codigo_item)}
                        title={selectedProductCode === item.codigo_item ? "Remover foco deste código" : `Filtrar apenas chapas do código ${item.codigo_item}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer group ${
                          selectedProductCode === item.codigo_item
                            ? 'bg-[#1b367c] text-white shadow-xs ring-1 ring-blue-300'
                            : 'bg-slate-100 hover:bg-blue-100/80 text-slate-900 hover:text-[#1b367c] border border-slate-200'
                        }`}
                      >
                        <span>{item.codigo_item}</span>
                        <Filter size={11} className={selectedProductCode === item.codigo_item ? 'text-blue-200' : 'text-slate-400 opacity-60 group-hover:opacity-100'} />
                      </button>
                    </td>
                    <td className="p-3 text-slate-700 max-w-[200px] truncate" title={item.descricao_item}>
                      {item.descricao_item}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-xs font-mono font-bold">
                          {formatDimension(item)}
                        </span>
                        {item.comprimento_mm && item.largura_mm ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-extrabold text-[#1b367c] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 whitespace-nowrap">
                              {((item.comprimento_mm * item.largura_mm) / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²
                            </span>
                            {/* Only show "Tot:" multiplier if the item is registered in pieces/units with integer count > 1 */}
                            {!isM2 && Number.isInteger(Number(item.quantidade)) && Number(item.quantidade) > 1 && (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap" title="Área Total (Quantidade x m² unitário)">
                                Tot: {(((item.comprimento_mm * item.largura_mm) / 1000000) * Number(item.quantidade)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-center font-extrabold text-slate-900">
                      {isM2 ? (
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-black text-[#1b367c] text-xs">
                            {Number(item.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} <span className="text-[10px] text-slate-500 font-semibold">m²</span>
                          </span>
                        </div>
                      ) : (
                        <span>
                          {item.quantidade} <span className="text-[10px] text-slate-500 font-normal">{item.unidade}</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center text-[10px] text-slate-500">
                      <div>{item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : ''}</div>
                      <div className="font-semibold text-slate-700">{item.operador}</div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenSinglePrint(item)}
                          title="Imprimir Etiqueta"
                          className="h-8.5 w-8.5 flex items-center justify-center bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-[#1b367c] rounded-lg transition-colors border border-blue-200 cursor-pointer shrink-0"
                        >
                          <Tag size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Editar Item"
                          className="h-8.5 w-8.5 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          title="Excluir Item"
                          className="h-8.5 w-8.5 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Batch Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleBatchPrint}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={15} />
                <span>Imprimir Selecionados ({selectedIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Trash2 size={15} />
                <span>Excluir Selecionados ({selectedIds.length})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => handleBatchPrintCallback(itemList)}
            disabled={itemList.length === 0}
            className="bg-[#1b367c] hover:bg-[#13275b] text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Printer size={15} />
            <span>Etiquetas em Lote (Todos)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportGeraisXLSX(itemList)}
            disabled={itemList.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 flex-1 sm:flex-initial cursor-pointer shadow-sm"
            title="Exportar chapas e insumos para Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Baixar Planilha XLSX</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllConfirm}
            disabled={itemList.length === 0}
            className="bg-slate-100 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-300 disabled:opacity-50 cursor-pointer shadow-sm"
            title="Limpar todos os itens e chapas da lista"
          >
            <Trash2 size={15} />
            <span>Limpar Todos</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="Excluir Item do Inventário"
        message="Tem certeza que deseja excluir este item permanentemente do inventário?"
        itemDescription={
          itemToDelete
            ? `${itemToDelete.codigo_item} - ${itemToDelete.descricao_item || 'Sem descrição'} (${itemToDelete.id_nomus || 'Sem ID'})`
            : undefined
        }
        onConfirm={handleConfirmSingleDelete}
        onClose={() => setItemToDelete(null)}
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteBatchModalOpen}
        title="Excluir Itens Selecionados"
        message={`Tem certeza que deseja excluir os ${selectedIds.length} itens selecionados? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDeleteBatch}
        onClose={() => setIsDeleteBatchModalOpen(false)}
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        title="Limpar Todos os Registros"
        message="ATENÇÃO: Deseja apagar TODOS os itens e chapas da lista? Esta ação removerá todos os registros permanentemente."
        onConfirm={handleConfirmClearAll}
        onClose={() => setIsClearAllModalOpen(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
