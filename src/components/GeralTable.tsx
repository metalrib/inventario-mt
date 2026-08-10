import React, { useState } from 'react';
import { GeralItem, FilterState } from '../types';
import { Search, Printer, Trash2, Edit2, ArrowUpDown, Check, X, Tag, Package, FileSpreadsheet } from 'lucide-react';
import { exportGeraisXLSX } from '../services/exporter';

interface GeralTableProps {
  items: GeralItem[];
  onDeleteItem: (id: string | number) => void;
  onUpdateItem: (id: string | number, updated: Partial<GeralItem>) => void;
  onOpenBatchPrint: (items: GeralItem[]) => void;
  onOpenSinglePrint: (item: GeralItem) => void;
}

export const GeralTable: React.FC<GeralTableProps> = ({
  items,
  onDeleteItem,
  onUpdateItem,
  onOpenBatchPrint,
  onOpenSinglePrint
}) => {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<GeralItem>>({});

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    minMedida: '',
    maxMedida: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Filter and Sort
  const filteredItems = items.filter(item => {
    const searchLower = filters.search.toLowerCase();
    const matchSearch =
      !filters.search ||
      item.codigo_item.toLowerCase().includes(searchLower) ||
      item.descricao_item.toLowerCase().includes(searchLower) ||
      item.id_nomus.toLowerCase().includes(searchLower) ||
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

  // Batch Select Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedItems.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchPrint = () => {
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    if (selectedItems.length > 0) {
      onOpenBatchPrint(selectedItems);
    }
  };

  // Edit Row Handlers
  const handleStartEdit = (item: GeralItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleSaveEdit = (id: string | number) => {
    onUpdateItem(id, editForm);
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
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Buscar por código (XXX.XXXX), descrição..."
            className="w-full h-10 pl-9 pr-3 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b367c] bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportGeraisXLSX(items)}
            disabled={items.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs px-4 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
            title="Exportar tabela de insumos e chapas para Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBatchPrint}
              className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-4 h-10 rounded-xl transition-all flex items-center gap-1.5 shadow-md"
            >
              <Printer size={16} />
              <span>Imprimir Lote ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setFilters(prev => ({
                ...prev,
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc'
              }))
            }
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 h-10 rounded-xl flex items-center gap-1 border border-slate-300"
          >
            <ArrowUpDown size={14} />
            <span>{filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase tracking-wider">
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === sortedItems.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-[#1b367c] focus:ring-[#1b367c]"
                />
              </th>
              <th className="p-3">Código de Barras</th>
              <th className="p-3">Código Item</th>
              <th className="p-3">Descrição</th>
              <th className="p-3 text-center">Dimensões (C x L x E)</th>
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
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded-lg"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item.id)}
                        className="rounded border-slate-300 text-[#1b367c] focus:ring-[#1b367c]"
                      />
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
                    <td className="p-3 text-center font-bold text-slate-800">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                        {formatDimension(item)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-extrabold text-slate-900">
                      {item.quantidade} <span className="text-[10px] text-slate-500 font-normal">{item.unidade}</span>
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
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1b367c] rounded-lg transition-colors border border-blue-200"
                        >
                          <Tag size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Editar Item"
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Deseja excluir o item ${item.codigo_item}?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          title="Excluir Item"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
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
    </div>
  );
};
