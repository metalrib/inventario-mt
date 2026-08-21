import React, { useState } from 'react';
import { GeralItem, FilterState } from '../types';
import { Search, Printer, Trash2, Edit2, ArrowUpDown, Check, X, Tag, Package, FileSpreadsheet, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { exportGeraisXLSX } from '../services/exporter';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface GeralTableProps {
  items?: GeralItem[];
  gerais?: GeralItem[];
  onRefresh?: () => void;
  onDeleteItem: (id: string | number) => void;
  onDeleteBatch?: (ids: (string | number)[]) => void;
  onClearAll?: () => void;
  onClearGerais?: () => void;
  onUpdateItem?: (id: string | number, updated: Partial<GeralItem>) => void;
  onEditGeral?: (id: string | number, updated: Partial<GeralItem>) => void;
  onOpenBatchPrint?: (items: GeralItem[]) => void;
  onPrintBatch?: (items: GeralItem[]) => void;
  onOpenSinglePrint?: (item: GeralItem) => void;
  onPrintSingle?: (item: GeralItem) => void;
}

export const GeralTable: React.FC<GeralTableProps> = ({
  items,
  gerais,
  onRefresh,
  onDeleteItem,
  onDeleteBatch,
  onClearAll,
  onClearGerais,
  onUpdateItem,
  onEditGeral,
  onOpenBatchPrint,
  onPrintBatch,
  onOpenSinglePrint,
  onPrintSingle
}) => {
  const itemList = items || gerais || [];
  const handleClear = onClearAll || onClearGerais || (() => {});
  const handleUpdate = onUpdateItem || onEditGeral || (() => {});
  const handleBatchPrintCallback = onOpenBatchPrint || onPrintBatch || (() => {});
  const handleSinglePrintCallback = onOpenSinglePrint || onPrintSingle || (() => {});

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<GeralItem>>({});

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

  // Totals
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
          await onDeleteItem(id);
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
      await onDeleteItem(itemToDelete.id);
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
              {itemList.length} registros
            </span>
          </h2>
          <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Total: <strong className="text-slate-800 font-extrabold">{totalQty} unidades/chapas</strong></span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-md font-bold">
              Área Total Acumulada: <strong className="text-emerald-800 font-black">{totalM2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} m²</strong>
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

      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Buscar por código (XXX.XXXX), descrição, ID Nomus..."
            className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportGeraisXLSX(itemList)}
            disabled={itemList.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs px-3.5 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            title="Exportar tabela de insumos e chapas para Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel (.xlsx)</span>
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
      <div className="overflow-x-auto overflow-y-auto max-h-[650px] 2xl:max-h-[calc(100vh-290px)] rounded-xl border border-slate-200 shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-xs border-b-2 border-slate-200">
            <tr className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center justify-center cursor-pointer"
                  title={selectedIds.length === sortedItems.length && sortedItems.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
                >
                  {selectedIds.length > 0 && selectedIds.length === sortedItems.length ? (
                    <CheckSquare size={16} className="text-[#1b367c]" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="p-3">Código de Barras</th>
              <th className="p-3">Código Item</th>
              <th className="p-3">Descrição</th>
              <th className="p-3 text-center">Dimensões & Área (m²)</th>
              <th className="p-3 text-center">Qtd / Unid.</th>
              <th className="p-3 text-center">Data / Operador</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-xs text-slate-800 font-medium">
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  <Package size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold">Nenhum item ou chapa cadastrado ainda.</p>
                  <p className="text-[11px]">Use o formulário acima para registrar novos insumos.</p>
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
                      {item.codigo_item}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenSinglePrint(item)}
                          title="Imprimir Etiqueta"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1b367c] rounded-lg transition-colors border border-blue-200 cursor-pointer"
                        >
                          <Tag size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Editar Item"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          title="Excluir Item"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
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
