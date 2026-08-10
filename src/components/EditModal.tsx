import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { PerfilItem, BumperItem } from '../types';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PerfilItem | BumperItem | null;
  itemType: 'perfil' | 'bumper';
  onSavePerfil: (id: string | number, updated: Partial<PerfilItem>) => Promise<void>;
  onSaveBumper: (id: string | number, updated: Partial<BumperItem>) => Promise<void>;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  item,
  itemType,
  onSavePerfil,
  onSaveBumper
}) => {
  const [codeOrNomus, setCodeOrNomus] = useState('');
  const [medidaMm, setMedidaMm] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      if (itemType === 'perfil') {
        const p = item as PerfilItem;
        setCodeOrNomus(p.id_nomus || '');
        setMedidaMm(String(p.medida_mm || ''));
        setQuantidade(p.quantidade || 1);
      } else {
        const b = item as BumperItem;
        setCodeOrNomus(b.codigo || '');
        setMedidaMm(String(b.medida_mm || ''));
        setQuantidade(b.quantidade || 1);
      }
    }
  }, [item, itemType]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (itemType === 'perfil') {
        await onSavePerfil(item.id, {
          id_nomus: codeOrNomus,
          medida_mm: Number(medidaMm),
          quantidade: Number(quantidade)
        });
      } else {
        await onSaveBumper(item.id, {
          codigo: codeOrNomus,
          medida_mm: Number(medidaMm),
          quantidade: Number(quantidade)
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-base font-extrabold text-[#1b367c]">
            Editar Registro de {itemType === 'perfil' ? 'Perfil / Retalho' : 'Bumper'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              {itemType === 'perfil' ? 'ID Nomus' : 'Código ID / OP'}
            </label>
            <input
              type="text"
              value={codeOrNomus}
              onChange={e => setCodeOrNomus(e.target.value)}
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Medida (mm)
            </label>
            <input
              type="number"
              value={medidaMm}
              onChange={e => setMedidaMm(e.target.value)}
              min="1"
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Quantidade
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              required
              className="w-full h-10 px-3 border border-slate-300 rounded-lg text-sm font-bold focus:outline-none focus:border-[#1b367c]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
