import React, { useState } from 'react';
import { Search, Printer, Trash2, Edit3, Download, RefreshCw, FileText, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { PerfilItem, FilterState } from '../types';
import { exportPerfisCSV, exportPerfisXLSX } from '../services/exporter';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface PerfilTableProps {
  perfis?: PerfilItem[];
  onRefresh?: () => void;
  onPrintLabel?: (item: PerfilItem) => void;
  onPrintSingle?: (item: PerfilItem) => void;
  onPrintBatchLabels?: (items: PerfilItem[]) => void;
  onPrintBatch?: (items: PerfilItem[]) => void;
  onEditItem?: (item: PerfilItem) => void;
  onEditPerfil?: (item: PerfilItem) => void;
  onDeleteItem?: (id: string | number) => void;
  onDeletePerfil?: (id: string | number) => void;
  onClearAll?: () => void;
  onClearPerfis?: () => void;
}

export const PerfilTable: React.FC<PerfilTableProps> = ({
  perfis = [],
  onRefresh,
  onPrintLabel,
  onPrintSingle,
  onPrintBatchLabels,
  onPrintBatch,
  onEditItem,
  onEditPerfil,
  onDeleteItem,
  onDeletePerfil,
  onClearAll,
  onClearPerfis
}) => {
  const handlePrintSingle = onPrintSingle || onPrintLabel || (() => {});
  const handlePrintBatch = onPrintBatch || onPrintBatchLabels || (() => {});
  const handleEdit = onEditPerfil || onEditItem || (() => {});
  const handleDelete = onDeletePerfil || onDeleteItem || (() => {});
  const handleClear = onClearPerfis || onClearAll || (() => {});

  const [filter, setFilter] = useState<FilterState>({
    search: '',
    minMedida: '',
    maxMedida: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [itemToDelete, setItemToDelete] = useState<PerfilItem | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const safePerfis = perfis || [];

  // Filtering & Sorting
  const filtered = safePerfis.filter(item => {
    if (!item) return false;
    const q = filter.search.toLowerCase();
    const matchesSearch =
      !q ||
      (item.id_nomus && item.id_nomus.toLowerCase().includes(q)) ||
      (item.codigo_perfil && item.codigo_perfil.toLowerCase().includes(q)) ||
      (item.descricao_perfil && item.descricao_perfil.toLowerCase().includes(q));

    const min = filter.minMedida ? parseInt(filter.minMedida) : 0;
    const max = filter.maxMedida ? parseInt(filter.maxMedida) : Infinity;

    const matchesSize = item.medida_mm >= min && item.medida_mm <= max;

    return matchesSearch && matchesSize;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA: any = a[filter.sortBy as keyof PerfilItem] || '';
    let valB: any = b[filter.sortBy as keyof PerfilItem] || '';

    if (filter.sortBy === 'medida_mm' || filter.sortBy === 'quantidade') {
      valA = Number(valA);
      valB = Number(valB);
    }

    if (valA < valB) return filter.sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return filter.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate totals
  const totalMeters = safePerfis.reduce((acc, p) => acc + (p.medida_mm * p.quantidade) / 1000, 0);
  const totalQty = safePerfis.reduce((acc, p) => acc + p.quantidade, 0);

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
    const itemsToPrint = safePerfis.filter(p => selectedIds.includes(p.id));
    if (itemsToPrint.length === 0) {
      alert("Selecione ao menos um item da tabela.");
      return;
    }
    handlePrintBatch(itemsToPrint);
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col h-full">
      {/* Table Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
        <div>
          <h2 className="font-extrabold text-base text-[#1b367c] flex items-center gap-2">
            <span>Retalhos Coletados</span>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-[#1b367c] rounded-full">
              {safePerfis.length} registros
            </span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Total Linear: <strong className="text-slate-800">{totalMeters.toFixed(2)} metros</strong> ({totalQty} peças)
          </p>
        </div>

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

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={filter.search}
            onChange={e => setFilter({ ...filter, search: e.target.value })}
            placeholder="Filtrar por ID Nomus, código ou descrição..."
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

      {/* Table Container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[620px] 2xl:max-h-[calc(100vh-290px)] border border-slate-200 rounded-lg mb-3 shadow-xs bg-white">
        <table className="w-full text-left border-collapse text-xs min-w-[620px]">
          <thead className="bg-slate-100 text-[#1b367c] font-black sticky top-0 z-10 border-b-2 border-slate-200">
            <tr>
              <th className="p-2.5 w-10 text-center">
                <button type="button" onClick={toggleSelectAll} className="p-1 cursor-pointer">
                  {selectedIds.length > 0 && selectedIds.length === sorted.length ? (
                    <CheckSquare size={17} className="text-[#1b367c]" />
                  ) : (
                    <Square size={17} className="text-slate-400" />
                  )}
                </button>
              </th>
              <th className="p-2.5 w-36 whitespace-nowrap">Status / ID Nomus</th>
              <th className="p-2.5 min-w-[140px]">Código / Descrição</th>
              <th className="p-2.5 text-right w-24">Medida</th>
              <th className="p-2.5 text-center w-16">Qtd</th>
              <th className="p-2.5 text-center w-28">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                  Nenhum retalho registrado nesta consulta.
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
                      <button type="button" onClick={() => toggleSelectItem(item.id)} className="p-1 cursor-pointer">
                        {isSelected ? (
                          <CheckSquare size={17} className="text-[#1b367c]" />
                        ) : (
                          <Square size={17} className="text-slate-300" />
                        )}
                      </button>
                    </td>

                    <td className="p-2.5">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full mb-0.5 ${
                        item.id_nomus ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.id_nomus ? (item.status || 'Com ID Nomus') : 'Sem ID'}
                      </span>
                      <div className="font-mono font-bold text-slate-900 text-xs tracking-tight">
                        {item.id_nomus || '-'}
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="font-extrabold text-[#1b367c] text-xs">
                        {item.codigo_perfil}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 font-medium">
                        {item.descricao_perfil}
                      </div>
                    </td>

                    <td className="p-2.5 text-right font-extrabold text-slate-800 whitespace-nowrap">
                      {item.medida_mm} <span className="text-slate-400 text-[10px]">mm</span>
                    </td>

                    <td className="p-2.5 text-center font-extrabold text-slate-800">
                      {item.quantidade} <span className="text-slate-400 text-[10px]">un</span>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(item)}
                          className="h-8 w-8 flex items-center justify-center bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-700 rounded-lg transition-colors border border-sky-200 cursor-pointer shrink-0"
                          title="Imprimir Etiqueta Térmica"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="h-8 w-8 flex items-center justify-center bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 rounded-lg transition-colors border border-amber-200 cursor-pointer shrink-0"
                          title="Editar Registro"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="h-8 w-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-lg transition-colors border border-rose-200 cursor-pointer shrink-0"
                          title="Excluir Registro"
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
            onClick={() => handlePrintBatch(safePerfis)}
            disabled={safePerfis.length === 0}
            className="bg-[#1b367c] hover:bg-[#13275b] text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Printer size={15} />
            <span>Etiquetas em Lote (Todos)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportPerfisXLSX(safePerfis)}
            disabled={safePerfis.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 flex-1 sm:flex-initial"
            title="Exportar retalhos de perfis para arquivo Excel (.xlsx)"
          >
            <FileSpreadsheet size={15} />
            <span>Baixar Planilha XLSX</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearAllModalOpen(true)}
            disabled={safePerfis.length === 0}
            className="bg-slate-100 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-300 disabled:opacity-50 cursor-pointer"
            title="Limpar todos da lista"
          >
            <Trash2 size={15} />
            <span>Limpar Todos</span>
          </button>
        </div>
      </div>

      {/* Deletion Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="Excluir Retalho de Perfil"
        message="Tem certeza que deseja excluir este retalho de perfil do inventário?"
        itemDescription={
          itemToDelete
            ? `${itemToDelete.codigo_perfil} - ${itemToDelete.descricao_perfil || 'Sem descrição'} (${itemToDelete.medida_mm} mm - ID: ${itemToDelete.id_nomus || 'S/N'})`
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
        title="Limpar Todos os Retalhos"
        message="ATENÇÃO: Deseja apagar TODOS os retalhos de perfil da lista? Esta ação removerá todos os registros permanentemente."
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
