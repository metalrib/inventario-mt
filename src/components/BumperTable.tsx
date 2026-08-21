import React, { useState } from 'react';
import { Search, Printer, Trash2, Edit3, FileSpreadsheet, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { BumperItem, FilterState } from '../types';
import { exportBumpersXLSX } from '../services/exporter';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface BumperTableProps {
  bumpers?: BumperItem[];
  onRefresh?: () => void;
  onPrintLabel?: (item: BumperItem) => void;
  onPrintSingle?: (item: BumperItem) => void;
  onPrintBatchLabels?: (items: BumperItem[]) => void;
  onPrintBatch?: (items: BumperItem[]) => void;
  onEditItem?: (item: BumperItem) => void;
  onEditBumper?: (item: BumperItem) => void;
  onDeleteItem?: (id: string | number) => void;
  onDeleteBumper?: (id: string | number) => void;
  onClearAll?: () => void;
  onClearBumpers?: () => void;
}

export const BumperTable: React.FC<BumperTableProps> = ({
  bumpers = [],
  onRefresh,
  onPrintLabel,
  onPrintSingle,
  onPrintBatchLabels,
  onPrintBatch,
  onEditItem,
  onEditBumper,
  onDeleteItem,
  onDeleteBumper,
  onClearAll,
  onClearBumpers
}) => {
  const handlePrintSingle = onPrintSingle || onPrintLabel || (() => {});
  const handlePrintBatch = onPrintBatch || onPrintBatchLabels || (() => {});
  const handleEdit = onEditBumper || onEditItem || (() => {});
  const handleDelete = onDeleteBumper || onDeleteItem || (() => {});
  const handleClear = onClearBumpers || onClearAll || (() => {});

  const [filter, setFilter] = useState<FilterState>({
    search: '',
    minMedida: '',
    maxMedida: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [itemToDelete, setItemToDelete] = useState<BumperItem | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const safeBumpers = bumpers || [];

  // Filtering & Sorting
  const filtered = safeBumpers.filter(item => {
    if (!item) return false;
    const q = filter.search.toLowerCase();
    const matchesSearch =
      !q ||
      (item.codigo && item.codigo.toLowerCase().includes(q)) ||
      (item.tipo && item.tipo.toLowerCase().includes(q));

    return matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA: any = a[filter.sortBy as keyof BumperItem] || '';
    let valB: any = b[filter.sortBy as keyof BumperItem] || '';

    if (filter.sortBy === 'medida_mm' || filter.sortBy === 'quantidade') {
      valA = Number(valA);
      valB = Number(valB);
    }

    if (valA < valB) return filter.sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return filter.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate totals
  const totalQty = safeBumpers.reduce((acc, b) => acc + (b.quantidade || 0), 0);
  const totalMeters = safeBumpers.reduce((acc, b) => acc + ((b.medida_mm || 0) * (b.quantidade || 0)) / 1000, 0);

  const toggleSelectAll = () => {
    if (selectedIds.length === sorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map(s => s.id));
    }
  };

  const toggleSelectItem = (id: string | number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePrintSelected = () => {
    const itemsToPrint = safeBumpers.filter(b => selectedIds.includes(b.id));
    if (itemsToPrint.length === 0) {
      alert("Selecione ao menos um bumper da lista.");
      return;
    }
    handlePrintBatch(itemsToPrint);
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col h-full">
      {/* Top Bar Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <div>
          <div className="text-xl font-extrabold text-[#1b367c]">
            {safeBumpers.length}
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Linhas Registradas
          </div>
        </div>
        <div>
          <div className="text-xl font-extrabold text-[#1b367c]">
            {totalQty} <span className="text-xs text-slate-500 font-semibold">({totalMeters.toFixed(1)}m)</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Peças
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
        <h2 className="font-extrabold text-base text-[#1b367c]">
          Bumpers Cadastrados
        </h2>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="self-start sm:self-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={14} />
            <span>Sincronizar</span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
            placeholder="Filtrar por Código ID ou OP..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#1b367c]"
          />
        </div>

        <select
          value={`${filter.sortBy}-${filter.sortOrder}`}
          onChange={e => {
            const [sortBy, sortOrder] = e.target.value.split('-') as [any, any];
            setFilter({ ...filter, sortBy, sortOrder });
          }}
          className="border border-slate-300 rounded-lg text-xs font-medium px-2 py-1.5 focus:outline-none focus:border-[#1b367c] bg-white text-slate-700"
        >
          <option value="created_at-desc">Mais Recentes</option>
          <option value="created_at-asc">Mais Antigos</option>
          <option value="medida_mm-desc">Maior Medida (mm)</option>
          <option value="medida_mm-asc">Menor Medida (mm)</option>
          <option value="quantidade-desc">Maior Quantidade</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[620px] 2xl:max-h-[calc(100vh-290px)] border border-slate-200 rounded-lg mb-3 shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100 text-[#1b367c] font-black sticky top-0 z-10 border-b-2 border-slate-200">
            <tr>
              <th className="p-2.5 w-10 text-center">
                <button type="button" onClick={toggleSelectAll}>
                  {selectedIds.length > 0 && selectedIds.length === sorted.length ? (
                    <CheckSquare size={16} className="text-[#1b367c]" />
                  ) : (
                    <Square size={16} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="p-2.5">Tipo / Código</th>
              <th className="p-2.5 text-right">Medida (mm)</th>
              <th className="p-2.5 text-center">Qtd</th>
              <th className="p-2.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Nenhum bumper cadastrado nesta consulta.
                </td>
              </tr>
            ) : (
              sorted.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      isSelected ? 'bg-blue-50/60' : ''
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <button type="button" onClick={() => toggleSelectItem(item.id)}>
                        {isSelected ? (
                          <CheckSquare size={16} className="text-[#1b367c]" />
                        ) : (
                          <Square size={16} className="text-slate-300" />
                        )}
                      </button>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-extrabold text-slate-900 text-xs">
                          {item.codigo}
                        </span>
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                            item.tipo === 'OP'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </div>
                    </td>

                    <td className="p-2.5 text-right font-extrabold text-slate-800">
                      {item.medida_mm} <span className="text-slate-400 text-[10px]">mm</span>
                    </td>

                    <td className="p-2.5 text-center font-extrabold text-slate-800">
                      {item.quantidade} <span className="text-slate-400 text-[10px]">un</span>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(item)}
                          className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded-md transition-colors"
                          title="Imprimir Etiqueta Térmica"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 p-1.5 rounded-md transition-colors"
                          title="Editar Bumper"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-md transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
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
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handlePrintSelected}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer size={15} />
              <span>Imprimir Selecionados ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrintBatch(safeBumpers)}
            disabled={safeBumpers.length === 0}
            className="bg-[#1b367c] hover:bg-[#13275b] text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Printer size={15} />
            <span>Etiquetas em Lote (Todos)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportBumpersXLSX(safeBumpers)}
            disabled={safeBumpers.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 flex-1 sm:flex-initial"
          >
            <FileSpreadsheet size={15} />
            <span>Baixar Planilha XLSX</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearAllModalOpen(true)}
            disabled={safeBumpers.length === 0}
            className="bg-slate-100 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-300 disabled:opacity-50 cursor-pointer"
            title="Limpar todos os bumpers"
          >
            <Trash2 size={15} />
            <span>Limpar Todos</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="Excluir Bumper"
        message="Tem certeza que deseja excluir este bumper do inventário?"
        itemDescription={
          itemToDelete
            ? `${itemToDelete.codigo} (${itemToDelete.tipo}) - ${itemToDelete.medida_mm} mm x ${itemToDelete.quantidade} un`
            : undefined
        }
        onConfirm={async () => {
          if (!itemToDelete) return;
          setIsDeleting(true);
          try {
            await handleDelete(itemToDelete.id);
            setItemToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setItemToDelete(null)}
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={isClearAllModalOpen}
        title="Limpar Todos os Bumpers"
        message="ATENÇÃO: Deseja apagar TODOS os bumpers salvos da lista? Esta ação removerá todos os registros permanentemente."
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await handleClear();
            setSelectedIds([]);
            setIsClearAllModalOpen(false);
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setIsClearAllModalOpen(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
