import React, { useState, useMemo } from 'react';
import { ProductCatalogItem } from '../types';
import {
  X,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Upload,
  RotateCcw,
  Check,
  Package,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { exportCatalogXLSX, parseCatalogExcel } from '../services/exporter';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog?: ProductCatalogItem[];
  onSaveItem: (item: Omit<ProductCatalogItem, 'id'> & { id?: string | number }) => Promise<void>;
  onDeleteItem: (id: string | number) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onImportItems: (items: ProductCatalogItem[]) => Promise<void>;
  onSelectForUse?: (item: ProductCatalogItem) => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  catalog = [],
  onSaveItem,
  onDeleteItem,
  onResetDefaults,
  onImportItems,
  onSelectForUse
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Form State
  const [formCodigo, setFormCodigo] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCategoria, setFormCategoria] = useState('Chapas');
  const [formUnidade, setFormUnidade] = useState('chapas');
  const [formComprimento, setFormComprimento] = useState<string>('');
  const [formLargura, setFormLargura] = useState<string>('');
  const [formEspessura, setFormEspessura] = useState<string>('');

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<ProductCatalogItem | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const safeCatalog = catalog || [];
  const categories = ['Todos', ...Array.from(new Set(safeCatalog.map(p => p.categoria || 'Geral')))];

  const filteredItems = safeCatalog.filter(item => {
    if (!item) return false;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (item.codigo && item.codigo.toLowerCase().includes(term)) ||
      (item.descricao && item.descricao.toLowerCase().includes(term)) ||
      (item.categoria && item.categoria.toLowerCase().includes(term));

    const matchesCategory =
      selectedCategory === 'Todos' || (item.categoria || 'Geral') === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormCodigo('');
    setFormDescricao('');
    setFormCategoria('Chapas');
    setFormUnidade('chapas');
    setFormComprimento('');
    setFormLargura('');
    setFormEspessura('');
    setShowAddForm(true);
  };

  const handleStartEdit = (item: ProductCatalogItem) => {
    setEditingId(item.id);
    setFormCodigo(item.codigo);
    setFormDescricao(item.descricao);
    setFormCategoria(item.categoria || 'Geral');
    setFormUnidade(item.unidade || 'peças');
    setFormComprimento(item.comprimento_padrao_mm ? String(item.comprimento_padrao_mm) : '');
    setFormLargura(item.largura_padrao_mm ? String(item.largura_padrao_mm) : '');
    setFormEspessura(item.espessura_padrao_mm ? String(item.espessura_padrao_mm) : '');
    setShowAddForm(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formDescricao.trim()) {
      alert("Por favor, preencha o Código e a Descrição do produto.");
      return;
    }

    await onSaveItem({
      id: editingId || undefined,
      codigo: formCodigo.trim().toUpperCase(),
      descricao: formDescricao.trim(),
      categoria: formCategoria.trim() || 'Geral',
      unidade: formUnidade.trim() || 'peças',
      comprimento_padrao_mm: formComprimento ? Number(formComprimento) : undefined,
      largura_padrao_mm: formLargura ? Number(formLargura) : undefined,
      espessura_padrao_mm: formEspessura ? Number(formEspessura) : undefined
    });

    setShowAddForm(false);
    setEditingId(null);
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const items = await parseCatalogExcel(file);
      if (items.length === 0) {
        alert("Nenhum item válido encontrado no arquivo.");
        return;
      }
      await onImportItems(items);
      alert(`Sucesso! ${items.length} produtos importados para o banco de dados do catálogo.`);
    } catch (err: any) {
      alert(`Erro na importação: ${err?.message || "Verifique o formato do arquivo."}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="shrink-0 p-4 bg-[#1b367c] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Package size={22} className="text-sky-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>Catálogo & Base de Produtos</span>
                <span className="text-xs font-bold px-2 py-0.5 bg-sky-500/30 text-sky-200 rounded-full border border-sky-400/30">
                  {safeCatalog.length} cadastrados
                </span>
              </h2>
              <p className="text-xs text-blue-200">
                Ao digitar o código nos formulários, a descrição e detalhes serão preenchidos automaticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="shrink-0 p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por código (023.0105) ou descrição..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-lg font-medium focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="bg-[#1b367c] hover:bg-[#13285c] text-white text-xs font-bold px-3 h-9 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>Novo Produto</span>
            </button>

            <button
              type="button"
              onClick={() => exportCatalogXLSX(safeCatalog)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 h-9 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Exportar base completa para planilha Excel (.xlsx)"
            >
              <FileSpreadsheet size={15} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>

            <label className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-2.5 h-9 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300 cursor-pointer">
              <Upload size={14} />
              <span className="hidden sm:inline">Importar Planilha</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInput}
                disabled={isImporting}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium px-2.5 h-9 rounded-lg flex items-center gap-1 transition-colors border border-slate-300 cursor-pointer"
              title="Restaurar lista padrão Metalrib"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>

        {/* Category Pills (Filters) */}
        <div className="shrink-0 px-3 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto min-h-[44px]">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1 pr-1 hidden sm:inline">
            Filtrar:
          </span>
          {categories.map(cat => {
            const count = cat === 'Todos'
              ? safeCatalog.length
              : safeCatalog.filter(i => (i.categoria || 'Geral') === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border-slate-300 shadow-2xs'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add/Edit Modal Inset Form */}
        {showAddForm && (
          <form onSubmit={handleSaveForm} className="shrink-0 p-4 bg-blue-50/90 border-b-2 border-blue-200 space-y-3 overflow-y-auto max-h-[45vh]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1b367c] flex items-center gap-1.5">
                <Sparkles size={15} className="text-amber-500" />
                {editingId ? "Editar Produto no Catálogo" : "Cadastrar Novo Produto no Catálogo"}
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                  Código do Produto *
                </label>
                <input
                  type="text"
                  value={formCodigo}
                  onChange={e => setFormCodigo(e.target.value)}
                  placeholder="Ex: 023.0105"
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:border-[#1b367c]"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                  Descrição Detalhada do Item *
                </label>
                <input
                  type="text"
                  value={formDescricao}
                  onChange={e => setFormDescricao(e.target.value)}
                  placeholder="Ex: CHAPA AC FQ - 3000 X 1200 X 12.50"
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:border-[#1b367c]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Categoria
                </label>
                <input
                  type="text"
                  value={formCategoria}
                  onChange={e => setFormCategoria(e.target.value)}
                  placeholder="Chapas, Perfis..."
                  className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Unidade Padrão
                </label>
                <select
                  value={formUnidade}
                  onChange={e => setFormUnidade(e.target.value)}
                  className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="metros quadrados">metros quadrados (m²)</option>
                  <option value="m²">m²</option>
                  <option value="chapas">chapas</option>
                  <option value="peças">peças</option>
                  <option value="metros">metros (lineares)</option>
                  <option value="barras">barras</option>
                  <option value="kg">kg</option>
                  <option value="rolo">rolo / bobina</option>
                  <option value="un">un</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Comp. Padrão (mm)
                </label>
                <input
                  type="number"
                  value={formComprimento}
                  onChange={e => setFormComprimento(e.target.value)}
                  placeholder="3000"
                  className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Larg. Padrão (mm)
                </label>
                <input
                  type="number"
                  value={formLargura}
                  onChange={e => setFormLargura(e.target.value)}
                  placeholder="1200"
                  className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                  Espess. Padrão (mm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formEspessura}
                  onChange={e => setFormEspessura(e.target.value)}
                  placeholder="12.50"
                  className="w-full h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 h-8 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 h-8 text-xs font-black text-white bg-[#1b367c] hover:bg-[#13285c] rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check size={14} />
                <span>Salvar no Catálogo</span>
              </button>
            </div>
          </form>
        )}

        {/* Product Items Table */}
        <div className="overflow-y-auto flex-1 min-h-0 p-3">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10">
              <tr className="border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase shadow-2xs">
                <th className="p-2.5">Código</th>
                <th className="p-2.5">Descrição Detalhada</th>
                <th className="p-2.5 text-center">Categoria</th>
                <th className="p-2.5 text-center">Dimensões Padrão</th>
                <th className="p-2.5 text-center">Unidade</th>
                <th className="p-2.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Package size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">Nenhum produto encontrado para "{searchTerm}".</p>
                    <p className="text-[11px]">Clique em "Novo Produto" para adicionar à base.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 font-mono font-black text-[#1b367c]">
                      {item.codigo}
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">
                      {item.descricao}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px] border border-slate-200">
                        {item.categoria || 'Geral'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center text-slate-600 font-mono text-[11px]">
                      {item.comprimento_padrao_mm || item.largura_padrao_mm || item.espessura_padrao_mm ? (
                        <span>
                          {item.comprimento_padrao_mm || '-'} x {item.largura_padrao_mm || '-'} x {item.espessura_padrao_mm || '-'} mm
                        </span>
                      ) : item.medida_padrao_mm ? (
                        <span>{item.medida_padrao_mm} mm</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center text-slate-600">
                      {item.unidade || 'peças'}
                    </td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onSelectForUse && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectForUse(item);
                              onClose();
                            }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1b367c] rounded-lg transition-colors font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            title="Usar este produto no formulário agora"
                          >
                            <Check size={13} />
                            <span>Usar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar item"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Excluir item do catálogo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Info size={14} className="text-[#1b367c]" />
            <span>Dica: Nos formulários de cadastro, basta digitar o código (ex: 023.0105) para autocompletar.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Deletion Modals */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="Excluir Produto do Catálogo"
        message="Tem certeza que deseja remover este item do catálogo de produtos?"
        itemDescription={
          itemToDelete
            ? `${itemToDelete.codigo} - ${itemToDelete.descricao} (${itemToDelete.categoria || 'Geral'})`
            : undefined
        }
        onConfirm={async () => {
          if (!itemToDelete) return;
          setIsDeleting(true);
          try {
            await onDeleteItem(itemToDelete.id);
            setItemToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setItemToDelete(null)}
        isDeleting={isDeleting}
      />

      <ConfirmDeleteModal
        isOpen={isResetModalOpen}
        title="Restaurar Catálogo Padrão"
        message="Deseja recarregar o catálogo padrão de fábrica da Metalrib? Seus novos produtos customizados serão mantidos."
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onResetDefaults();
            setIsResetModalOpen(false);
          } finally {
            setIsDeleting(false);
          }
        }}
        onClose={() => setIsResetModalOpen(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
};
