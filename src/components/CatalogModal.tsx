import React, { useState } from 'react';
import { X, Search, Check, Info } from 'lucide-react';
import { CATALOGO_PERFIS } from '../data/catalog';
import { ProfileCatalogItem } from '../types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (item: ProfileCatalogItem) => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectProfile
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  if (!isOpen) return null;

  const categories = ['Todos', ...Array.from(new Set(CATALOGO_PERFIS.map(p => p.categoria)))];

  const filtered = CATALOGO_PERFIS.filter(item => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-extrabold text-[#1b367c]">
              Catálogo de Perfis Metalrib
            </h2>
            <p className="text-xs text-slate-500">
              Selecione a geometria e código do perfil para registro
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="shrink-0 p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por código ou descrição (ex: 022.0001, VAI E VEM, U, L)..."
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#1b367c]"
              autoFocus
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer border ${
                  selectedCategory === cat
                    ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              <Info size={32} className="mx-auto mb-2 text-slate-400" />
              Nenhum perfil encontrado para "{searchTerm}".
            </div>
          ) : (
            filtered.map(item => (
              <div
                key={item.code}
                onClick={() => {
                  onSelectProfile(item);
                  onClose();
                }}
                className="bg-white border-2 border-slate-200 hover:border-[#1b367c] rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:shadow-md transition-all group"
              >
                <div
                  className="w-16 h-16 mb-2 flex items-center justify-center p-1 bg-slate-50 border border-slate-200 rounded-lg group-hover:scale-105 transition-transform"
                  dangerouslySetInnerHTML={{
                    __html: `<svg viewBox="0 0 100 100" class="w-full h-full">${item.svg}</svg>`
                  }}
                />
                <span className="font-extrabold text-xs text-[#1b367c]">
                  {item.code}
                </span>
                <span className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight mt-0.5">
                  {item.desc}
                </span>
                <span className="mt-2 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {item.categoria}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
