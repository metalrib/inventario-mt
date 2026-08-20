import React, { useState } from 'react';
import { Wifi, WifiOff, Settings, Camera, RefreshCw, BookOpen, User, Edit3, Check, X } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  onOpenSettings: () => void;
  onOpenScanner: () => void;
  onOpenCatalog?: () => void;
  catalogCount?: number;
  totalPerfisMeters: number;
  totalBumpersQty: number;
  totalGeraisM2?: number;
  operador?: string;
  onChangeOperador?: (newOperador: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isOnline,
  isSyncing = false,
  onSyncNow,
  onOpenSettings,
  onOpenScanner,
  onOpenCatalog,
  catalogCount = 0,
  totalPerfisMeters,
  totalBumpersQty,
  totalGeraisM2 = 0,
  operador = 'Operador Produção',
  onChangeOperador,
}) => {
  const [isEditingOperador, setIsEditingOperador] = useState(false);
  const [tempOperador, setTempOperador] = useState(operador);

  const handleSaveOperador = () => {
    const trimmed = tempOperador.trim();
    if (trimmed && onChangeOperador) {
      onChangeOperador(trimmed);
    }
    setIsEditingOperador(false);
  };

  return (
    <header className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-3 shadow-sm flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3 w-full">
      {/* Top / Left: Brand & Logo + Operador */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1b367c] border-2 border-slate-900 rounded-lg px-2.5 py-1.5 flex flex-col items-center justify-center shadow-md shrink-0">
            <div className="text-white font-black text-base sm:text-lg tracking-wider font-sans border-b-2 border-white pb-0.5 leading-none">
              METALRIB
            </div>
            <div className="text-white text-[8px] sm:text-[9px] font-bold tracking-widest uppercase mt-0.5">
              PORTAS FRIGORÍFICAS
            </div>
          </div>

          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-[#1b367c] leading-tight flex items-center gap-2">
              Inventário Produção
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-blue-50 text-[#1b367c] border border-blue-200 rounded-full">
                v2.5 Pro
              </span>
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Controle de Estoque de Chapas, Insumos, Perfis & Bumpers
            </p>
          </div>
        </div>

        {/* Operador / Responsável */}
        <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-200 rounded-lg px-3 py-1.5 text-xs shadow-2xs">
          <div className="p-1 bg-amber-100 text-amber-800 rounded-md shrink-0">
            <User size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-extrabold text-amber-800 tracking-wider leading-none">
              Operador Atual
            </span>
            {isEditingOperador ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="text"
                  value={tempOperador}
                  onChange={e => setTempOperador(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveOperador();
                    if (e.key === 'Escape') setIsEditingOperador(false);
                  }}
                  autoFocus
                  placeholder="Nome do Operador"
                  className="h-6 px-2 text-xs font-bold bg-white border-2 border-amber-400 rounded-md focus:outline-none w-28 sm:w-36 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleSaveOperador}
                  className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                  title="Salvar Nome"
                >
                  <Check size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOperador(false)}
                  className="p-1 bg-slate-300 hover:bg-slate-400 text-slate-700 rounded cursor-pointer"
                  title="Cancelar"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempOperador(operador || 'Operador Produção');
                  setIsEditingOperador(true);
                }}
                className="text-xs font-black text-amber-950 hover:text-[#1b367c] flex items-center gap-1.5 text-left leading-tight cursor-pointer group mt-0.5"
                title="Clique aqui para alterar o nome do operador do inventário"
              >
                <span className="truncate max-w-[110px] sm:max-w-[160px]">
                  {operador || 'Operador Produção'}
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-200/70 hover:bg-amber-300 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors">
                  <Edit3 size={10} />
                  Trocar
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Metrics & Action Controls */}
      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full xl:w-auto">
        {/* Metrics Quick Summary */}
        <div className="hidden 2xl:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Retalhos</span>
            <span className="text-sm font-extrabold text-[#1b367c]">{totalPerfisMeters.toFixed(1)}m</span>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Bumpers</span>
            <span className="text-sm font-extrabold text-[#1b367c]">{totalBumpersQty} un</span>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Chapas (Área)</span>
            <span className="text-sm font-extrabold text-emerald-700">{totalGeraisM2.toFixed(2)} m²</span>
          </div>
        </div>

        {/* Status Badge & Sync Trigger */}
        <div className="flex items-center gap-1.5">
          <div
            className={`text-xs px-2.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 shrink-0 ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}
            title={isOnline ? 'Conectado à nuvem Firebase Firestore (Tempo Real)' : 'Modo Offline - Dados salvos no navegador'}
          >
            {isOnline ? (
              <>
                <Wifi size={13} className="text-emerald-600 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-amber-600" />
                <span>Offline</span>
              </>
            )}
          </div>

          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="bg-[#1b367c] hover:bg-[#14295e] active:bg-blue-900 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs border border-[#14295e] disabled:opacity-50 cursor-pointer shrink-0"
              title="Atualizar dados com a nuvem"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>Sincronizar</span>
            </button>
          )}
        </div>

        {/* Product Catalog Button */}
        {onOpenCatalog && (
          <button
            type="button"
            onClick={onOpenCatalog}
            className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-[#1b367c] font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-xs shrink-0"
            title="Gerenciar Catálogo & Base de Produtos (Auto-completar)"
          >
            <BookOpen size={14} className="text-[#1b367c]" />
            <span>Catálogo</span>
            {catalogCount > 0 && (
              <span className="text-[10px] bg-[#1b367c] text-white font-black px-1.5 py-0.2 rounded-full">
                {catalogCount}
              </span>
            )}
          </button>
        )}

        {/* Camera Scanner Trigger */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer shrink-0"
          title="Escanear Código de Barras / QR Code com Câmera"
        >
          <Camera size={14} className="text-[#1b367c]" />
          <span>Escanear</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs p-2 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer shrink-0"
          title="Configurações de Conexão e Impressão"
        >
          <Settings size={15} className="text-slate-600" />
        </button>
      </div>
    </header>
  );
};

