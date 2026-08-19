import React from 'react';
import { Wifi, WifiOff, Settings, Camera, RefreshCw, BookOpen, Package } from 'lucide-react';

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
}) => {
  return (
    <header className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mb-3 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-[#1b367c] border-2 border-slate-900 rounded-lg px-3 py-1.5 flex flex-col items-center justify-center shadow-md">
          <div className="text-white font-black text-lg tracking-wider font-sans border-b-2 border-white pb-0.5 leading-none">
            METALRIB
          </div>
          <div className="text-white text-[9px] font-bold tracking-widest uppercase mt-0.5">
            PORTAS FRIGORÍFICAS
          </div>
        </div>

        <div>
          <h1 className="text-lg font-extrabold text-[#1b367c] leading-tight flex items-center gap-2">
            Coleta PCP
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-[#1b367c] border border-blue-200 rounded-full">
              v2.5 Pro
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Controle Inteligente de Estoque, Chapas, Insumos & Retalhos
          </p>
        </div>
      </div>

      {/* Metrics Quick Summary */}
      <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600">
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

      {/* Action Controls */}
      <div className="flex items-center justify-between sm:justify-end gap-2">
        {/* Status Badge & Sync Trigger */}
        <div className="flex items-center gap-1.5">
          <div
            className={`text-xs px-2.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-900 border border-amber-200'
            }`}
            title={isOnline ? 'Conectado à nuvem Supabase' : 'Modo Offline - Dados salvos no navegador'}
          >
            {isOnline ? (
              <>
                <Wifi size={14} className="text-emerald-600 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-amber-600" />
                <span>Offline</span>
              </>
            )}
          </div>

          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="bg-[#1b367c] hover:bg-[#14295e] text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs border border-[#14295e] disabled:opacity-50 cursor-pointer"
              title="Sincronizar agora com a nuvem Supabase"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
          )}
        </div>

        {/* Product Catalog Button */}
        {onOpenCatalog && (
          <button
            type="button"
            onClick={onOpenCatalog}
            className="bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-[#1b367c] font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-xs"
            title="Gerenciar Catálogo & Base de Produtos (Auto-completar)"
          >
            <BookOpen size={15} className="text-[#1b367c]" />
            <span className="hidden sm:inline">Catálogo</span>
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
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer"
          title="Escanear Código de Barras / QR Code com Câmera"
        >
          <Camera size={15} className="text-[#1b367c]" />
          <span className="hidden sm:inline">Escanear</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs p-2 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer"
          title="Configurações de Conexão e Impressão"
        >
          <Settings size={16} className="text-slate-600" />
        </button>
      </div>
    </header>
  );
};

