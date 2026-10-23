import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Zap, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Shield, 
  Box, 
  Tag, 
  ArrowUpRight, 
  HelpCircle,
  Clock,
  Sparkles,
  Camera,
  Play
} from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem, ProductCatalogItem, AppMode } from '../types';
import { parseScannedPayload } from './ScanResultModal';
import { playBeepSuccess, playBeepDouble, playBeepChime, playBeepError } from '../utils/scannerAudio';
import { generateNomusIdSequence } from '../services/firebase';
import { DEFAULT_PRODUCT_CATALOG } from '../data/catalog';

export interface ScanSessionItem {
  id: string;
  timestamp: string;
  rawCode: string;
  action: 'incremented' | 'added' | 'unrecognized';
  itemType: 'geral' | 'perfil' | 'bumper';
  itemId?: string | number;
  codigo: string;
  descricao: string;
  idNomus?: string;
  medidaFormatted?: string;
  quantityAdded: number;
  newTotalQuantity?: number;
}

interface BluetoothCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string | null;
  perfis: PerfilItem[];
  bumpers: BumperItem[];
  gerais: GeralItem[];
  productCatalog: ProductCatalogItem[];
  appMode: AppMode;
  operadorPadrao: string;
  onAddPerfil: (item: Omit<PerfilItem, 'id'>) => Promise<void>;
  onAddBumper: (item: Omit<BumperItem, 'id'>) => Promise<void>;
  onAddGeral: (item: Omit<GeralItem, 'id'>) => Promise<void>;
  onUpdatePerfil: (id: string | number, updated: Partial<PerfilItem>) => Promise<void>;
  onUpdateBumper: (id: string | number, updated: Partial<BumperItem>) => Promise<void>;
  onUpdateGeral: (id: string | number, updated: Partial<GeralItem>) => Promise<void>;
  onOpenManualModal?: (code: string) => void;
  onOpenCameraScanner?: () => void;
}

export const BluetoothCollectorModal: React.FC<BluetoothCollectorModalProps> = ({
  isOpen,
  onClose,
  initialCode,
  perfis,
  bumpers,
  gerais,
  productCatalog,
  appMode,
  operadorPadrao,
  onAddPerfil,
  onAddBumper,
  onAddGeral,
  onUpdatePerfil,
  onUpdateBumper,
  onUpdateGeral,
  onOpenManualModal,
  onOpenCameraScanner,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoProcessMode, setAutoProcessMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('metalrib_collector_auto_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [sessionHistory, setSessionHistory] = useState<ScanSessionItem[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    details: string;
  } | null>(null);
  const [lastRawScanned, setLastRawScanned] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<any>(null);

  // Auto-focus retention: Keep the hidden/active input focused so Bluetooth gun keystrokes land immediately
  const claimFocus = useCallback(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      claimFocus();
      const interval = setInterval(() => {
        // Only reclaim if active element is not an interactive input inside the modal
        if (document.activeElement !== inputRef.current) {
          claimFocus();
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isOpen, claimFocus]);

  const triggerFeedback = (type: 'success' | 'info' | 'error', title: string, details: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setLastFeedback({ type, title, details });
    feedbackTimerRef.current = setTimeout(() => {
      setLastFeedback(null);
    }, 4500);
  };

  const handleToggleAutoMode = (val: boolean) => {
    setAutoProcessMode(val);
    localStorage.setItem('metalrib_collector_auto_mode', String(val));
  };

  useEffect(() => {
    if (isOpen && initialCode) {
      processScan(initialCode);
    }
  }, [isOpen, initialCode]);

  // Main Barcode / QR Code Processor
  const processScan = async (rawCode: string) => {
    const trimmed = (rawCode || '').trim();
    if (!trimmed) return;

    setIsProcessing(true);
    setLastRawScanned(trimmed);

    try {
      const parsed = parseScannedPayload(trimmed, productCatalog, gerais, perfis);
      const cleanId = (parsed.idNomus || '').trim().toLowerCase();
      const cleanCode = (parsed.codigoItem || '').trim().toLowerCase();
      const qtyToAdd = parsed.quantidade > 0 ? parsed.quantidade : 1;

      // 1. Check if matches existing GERAL / CHAPA
      const existingGeral = gerais.find(g => {
        // If scan contains a specific Nomus ID, match ONLY against that same ID
        if (cleanId) {
          return (g.id_nomus || '').trim().toLowerCase() === cleanId;
        }
        // If no Nomus ID is present, match by exact product code and dimensions
        if (cleanCode && (g.codigo_item || '').trim().toLowerCase() === cleanCode) {
          if (parsed.comprimentoMm && parsed.larguraMm) {
            return (
              Math.abs((g.comprimento_mm || 0) - parsed.comprimentoMm) < 2 &&
              Math.abs((g.largura_mm || 0) - parsed.larguraMm) < 2
            );
          }
          return true;
        }
        return false;
      });

      // 2. Check if matches existing PERFIL
      const existingPerfil = perfis.find(p => {
        if (cleanId) {
          return (p.id_nomus || '').trim().toLowerCase() === cleanId;
        }
        if (cleanCode && (p.codigo_perfil || '').trim().toLowerCase() === cleanCode) {
          if (parsed.comprimentoMm) {
            return Math.abs((p.medida_mm || 0) - parsed.comprimentoMm) < 2;
          }
          return true;
        }
        return false;
      });

      // 3. Check if matches existing BUMPER
      const existingBumper = bumpers.find(b => {
        if (cleanId) {
          return (b.id_nomus || '').trim().toLowerCase() === cleanId;
        }
        if (cleanCode && (b.codigo || '').trim().toLowerCase() === cleanCode) return true;
        return false;
      });

      // CASE A-HEAL: If existing item was saved as ITEM-xxxx (e.g. from earlier scan issue) and we now have the true product code
      if (existingGeral && (existingGeral.codigo_item || '').toUpperCase().startsWith('ITEM-') && parsed.codigoItem) {
        const updatePayload: Partial<GeralItem> = {
          codigo_item: parsed.codigoItem,
          descricao_item: parsed.descItem || existingGeral.descricao_item,
        };
        if (parsed.comprimentoMm) updatePayload.comprimento_mm = parsed.comprimentoMm;
        if (parsed.larguraMm) updatePayload.largura_mm = parsed.larguraMm;
        if (parsed.espessuraMm) updatePayload.espessura_mm = parsed.espessuraMm;

        await onUpdateGeral(existingGeral.id, updatePayload);
        if (soundEnabled) playBeepDouble();

        const historyItem: ScanSessionItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rawCode: trimmed,
          action: 'incremented',
          itemType: 'geral',
          itemId: existingGeral.id,
          codigo: parsed.codigoItem,
          descricao: parsed.descItem || existingGeral.descricao_item,
          idNomus: existingGeral.id_nomus,
          medidaFormatted: `${parsed.comprimentoMm || existingGeral.comprimento_mm}x${parsed.larguraMm || existingGeral.largura_mm}mm`,
          quantityAdded: 0,
          newTotalQuantity: Number(existingGeral.quantidade) || 1,
        };
        setSessionHistory(prev => [historyItem, ...prev]);
        triggerFeedback('success', `Item Corrigido para ${parsed.codigoItem}!`, `${parsed.descItem || 'Chapa'} atualizada com sucesso`);
        return;
      }

      // CASE A: Existing item found -> AUTO INCREMENT
      if (existingGeral) {
        const currentQty = Number(existingGeral.quantidade) || 0;
        const newQty = currentQty + qtyToAdd;
        await onUpdateGeral(existingGeral.id, { quantidade: newQty });

        if (soundEnabled) playBeepDouble();

        const historyItem: ScanSessionItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rawCode: trimmed,
          action: 'incremented',
          itemType: 'geral',
          itemId: existingGeral.id,
          codigo: existingGeral.codigo_item,
          descricao: existingGeral.descricao_item,
          idNomus: existingGeral.id_nomus,
          medidaFormatted: `${existingGeral.comprimento_mm}x${existingGeral.largura_mm}${existingGeral.espessura_mm ? `x${existingGeral.espessura_mm}` : ''}mm`,
          quantityAdded: qtyToAdd,
          newTotalQuantity: newQty,
        };

        setSessionHistory(prev => [historyItem, ...prev]);
        triggerFeedback('success', `+${qtyToAdd} ${existingGeral.codigo_item}`, `Quantidade atualizada para ${newQty} ${existingGeral.unidade || 'un'}`);
        return;
      }

      if (existingPerfil) {
        const currentQty = Number(existingPerfil.quantidade) || 0;
        const newQty = currentQty + qtyToAdd;
        await onUpdatePerfil(existingPerfil.id, { quantidade: newQty });

        if (soundEnabled) playBeepDouble();

        const historyItem: ScanSessionItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rawCode: trimmed,
          action: 'incremented',
          itemType: 'perfil',
          itemId: existingPerfil.id,
          codigo: existingPerfil.codigo_perfil,
          descricao: existingPerfil.descricao_perfil,
          idNomus: existingPerfil.id_nomus,
          medidaFormatted: `${existingPerfil.medida_mm} mm`,
          quantityAdded: qtyToAdd,
          newTotalQuantity: newQty,
        };

        setSessionHistory(prev => [historyItem, ...prev]);
        triggerFeedback('success', `+${qtyToAdd} Perfil ${existingPerfil.codigo_perfil}`, `Novo saldo: ${newQty} barras`);
        return;
      }

      if (existingBumper) {
        const currentQty = Number(existingBumper.quantidade) || 0;
        const newQty = currentQty + qtyToAdd;
        await onUpdateBumper(existingBumper.id, { quantidade: newQty });

        if (soundEnabled) playBeepDouble();

        const historyItem: ScanSessionItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rawCode: trimmed,
          action: 'incremented',
          itemType: 'bumper',
          itemId: existingBumper.id,
          codigo: existingBumper.codigo,
          descricao: `BUMPER (${existingBumper.tipo})`,
          idNomus: existingBumper.id_nomus,
          medidaFormatted: `${existingBumper.medida_mm} mm`,
          quantityAdded: qtyToAdd,
          newTotalQuantity: newQty,
        };

        setSessionHistory(prev => [historyItem, ...prev]);
        triggerFeedback('success', `+${qtyToAdd} Bumper ${existingBumper.codigo}`, `Novo saldo: ${newQty} unidades`);
        return;
      }

      // CASE B: Item is NEW in Inventory
      // Check if code matches Product Catalog or is full QR Code with specs
      const allCatalog = [...(productCatalog || []), ...DEFAULT_PRODUCT_CATALOG];
      const matchedCatalog = allCatalog.find(c => 
        (cleanCode && (c.codigo || '').trim().toLowerCase() === cleanCode) ||
        (cleanId && (c.codigo || '').trim().toLowerCase() === cleanId)
      );

      // Determine Category
      let targetCat: 'geral' | 'perfil' | 'bumper' = 'geral';
      if (parsed.categoriaHint === 'bumper' || appMode === 'pcp') {
        targetCat = 'bumper';
      } else if (parsed.categoriaHint === 'perfil') {
        targetCat = 'perfil';
      } else if (parsed.categoriaHint === 'geral' || parsed.larguraMm > 0) {
        targetCat = 'geral';
      } else if (matchedCatalog?.categoria?.toLowerCase().includes('perfil')) {
        targetCat = 'perfil';
      }

      const finalCodigo = parsed.codigoItem || matchedCatalog?.codigo || '';
      const finalDesc = parsed.descItem || matchedCatalog?.descricao || (targetCat === 'bumper' ? 'BUMPER' : (finalCodigo ? `Item ${finalCodigo}` : ''));
      const finalComprimento = parsed.comprimentoMm || matchedCatalog?.comprimento_padrao_mm || matchedCatalog?.medida_padrao_mm || 0;
      const finalLargura = parsed.larguraMm || matchedCatalog?.largura_padrao_mm || 0;
      const finalEspessura = parsed.espessuraMm || matchedCatalog?.espessura_padrao_mm || 0;
      const finalNomus = parsed.idNomus || generateNomusIdSequence(1)[0];

      if (autoProcessMode && finalCodigo) {
        // Auto-register new item with true product code
        if (targetCat === 'geral') {
          await onAddGeral({
            id_nomus: finalNomus,
            codigo_item: finalCodigo,
            descricao_item: finalDesc,
            comprimento_mm: finalComprimento,
            largura_mm: finalLargura,
            espessura_mm: finalEspessura,
            quantidade: qtyToAdd,
            unidade: parsed.unidade || (finalLargura > 0 ? 'm²' : 'unidade'),
            operador: operadorPadrao
          });
        } else if (targetCat === 'perfil') {
          await onAddPerfil({
            id_nomus: finalNomus,
            codigo_perfil: finalCodigo,
            descricao_perfil: finalDesc,
            medida_mm: finalComprimento,
            quantidade: qtyToAdd,
            status: 'Com ID Nomus',
            operador: operadorPadrao
          });
        } else {
          await onAddBumper({
            tipo: finalCodigo.toUpperCase().startsWith('OP') ? 'OP' : 'ID',
            codigo: finalCodigo,
            medida_mm: finalComprimento,
            quantidade: qtyToAdd,
            id_nomus: finalNomus,
            operador: operadorPadrao
          });
        }

        if (soundEnabled) playBeepChime();

        const historyItem: ScanSessionItem = {
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          rawCode: trimmed,
          action: 'added',
          itemType: targetCat,
          codigo: finalCodigo,
          descricao: finalDesc,
          idNomus: finalNomus,
          medidaFormatted: targetCat === 'geral' 
            ? `${finalComprimento}x${finalLargura}${finalEspessura ? `x${finalEspessura}` : ''}mm`
            : `${finalComprimento} mm`,
          quantityAdded: qtyToAdd,
          newTotalQuantity: qtyToAdd,
        };

        setSessionHistory(prev => [historyItem, ...prev]);
        triggerFeedback('success', `Novo item adicionado!`, `${finalCodigo} (${qtyToAdd} un) cadastrado no inventário`);
        return;
      }

      // CASE C: Code is unrecognized or autoProcessMode is off -> Open manual modal with pre-parsed info
      if (soundEnabled) playBeepSuccess();
      if (onOpenManualModal) {
        onOpenManualModal(trimmed);
      } else {
        triggerFeedback('info', 'Código Lido - Aguardando Confirmação', trimmed);
      }

    } catch (err) {
      console.error('Scan processing error:', err);
      if (soundEnabled) playBeepError();
      triggerFeedback('error', 'Falha ao processar código', String(err));
    } finally {
      setIsProcessing(false);
      setInputValue('');
      claimFocus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputValue.trim();
      if (code) {
        processScan(code);
      }
    }
  };

  const handleUndoLast = async () => {
    if (sessionHistory.length === 0) return;
    const last = sessionHistory[0];

    try {
      if (last.action === 'incremented' && last.itemId) {
        const revertQty = Math.max(0, (last.newTotalQuantity || 0) - last.quantityAdded);
        if (last.itemType === 'geral') {
          await onUpdateGeral(last.itemId, { quantidade: revertQty });
        } else if (last.itemType === 'perfil') {
          await onUpdatePerfil(last.itemId, { quantidade: revertQty });
        } else if (last.itemType === 'bumper') {
          await onUpdateBumper(last.itemId, { quantidade: revertQty });
        }
      }
      setSessionHistory(prev => prev.slice(1));
      triggerFeedback('info', 'Desfeito com Sucesso', `Última leitura de ${last.codigo} foi revertida.`);
      if (soundEnabled) playBeepSuccess();
    } catch (err) {
      triggerFeedback('error', 'Erro ao desfazer', String(err));
    } finally {
      claimFocus();
    }
  };

  const totalPiecesScanned = sessionHistory.reduce((acc, curr) => acc + curr.quantityAdded, 0);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150"
      onClick={claimFocus}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={e => {
          e.stopPropagation();
          claimFocus();
        }}
      >
        {/* Header Bar */}
        <div className="bg-[#1b367c] text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-blue-900 shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <span className="text-xl">🔫</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Modo Bipador Rápido Bluetooth
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  HID Pronto
                </span>
              </div>
              <p className="text-blue-100 text-[11px] font-medium leading-none mt-0.5">
                Pistola Bluetooth / Leitor USB • Não precisa clicar, basta apontar e bipar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                soundEnabled 
                  ? 'bg-blue-800 text-white hover:bg-blue-700' 
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
              title={soundEnabled ? 'Som do bipador ativado' : 'Som silenciado'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Fechar leitor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status & Hidden Active Input Bar */}
        <div className="p-4 space-y-3 shrink-0 bg-slate-50 border-b border-slate-200">
          {/* Main Visual Trigger Zone */}
          <div 
            onClick={claimFocus}
            className="bg-white border-2 border-emerald-500 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer group hover:border-emerald-600 transition-all ring-4 ring-emerald-50"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 shadow-inner">
                <Zap size={24} className="fill-emerald-600 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                    Leitor Pronto para Disparo
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">
                    FOCO FIXO
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Aponte o leitor para o QR Code ou Código de Barras da chapa / perfil e puxe o gatilho.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {soundEnabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playBeepSuccess();
                    claimFocus();
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Testar áudio de bip"
                >
                  <Play size={12} />
                  <span>Testar Bip</span>
                </button>
              )}
            </div>
          </div>

          {/* Real Input Element (receives the Bluetooth bursts) */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              placeholder="Aguardando disparo do leitor Bluetooth... (ou digite e dê Enter)"
              className="w-full h-11 px-3.5 bg-white border-2 border-slate-300 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1b367c] focus:ring-2 focus:ring-blue-100 transition-all shadow-inner"
            />
            {isProcessing && (
              <span className="absolute right-3 top-3 text-[11px] font-bold text-[#1b367c] flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded">
                <span className="w-2 h-2 rounded-full bg-[#1b367c] animate-ping"></span>
                Processando...
              </span>
            )}
          </div>

          {/* Quick Config Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={autoProcessMode}
                  onChange={e => handleToggleAutoMode(e.target.checked)}
                  className="rounded text-[#1b367c] focus:ring-[#1b367c] h-4 w-4"
                />
                <span>Modo Contínuo Super Rápido (Auto-incrementar / cadastrar)</span>
              </label>
            </div>

            {onOpenCameraScanner && (
              <button
                type="button"
                onClick={onOpenCameraScanner}
                className="text-[#1b367c] hover:underline font-extrabold flex items-center gap-1 cursor-pointer text-xs"
              >
                <Camera size={14} />
                <span>Alternar para Câmera do Celular</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Feedback Banner */}
        {lastFeedback && (
          <div className={`p-3 border-b flex items-start gap-2.5 transition-all animate-in slide-in-from-top-2 shrink-0 ${
            lastFeedback.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : lastFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}>
            <CheckCircle2 size={18} className={`shrink-0 mt-0.5 ${
              lastFeedback.type === 'success' ? 'text-emerald-600' : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <p className="text-xs font-black">{lastFeedback.title}</p>
              <p className="text-[11px] opacity-90">{lastFeedback.details}</p>
            </div>
          </div>
        )}

        {/* Session Stats & Feed Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px]">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Histórico Desta Sessão de Bipagem
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                Total: <strong className="text-[#1b367c]">{totalPiecesScanned} peças</strong> ({sessionHistory.length} bipagens)
              </span>
              {sessionHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndoLast}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded flex items-center gap-1 cursor-pointer transition-colors"
                  title="Desfazer a última leitura registrada"
                >
                  <RotateCcw size={12} />
                  <span>Desfazer Último</span>
                </button>
              )}
            </div>
          </div>

          {sessionHistory.length === 0 ? (
            <div className="py-10 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Tag size={24} />
              </div>
              <p className="text-xs font-bold text-slate-600">Nenhum item bipado nesta sessão ainda.</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                Dispare a pistola Bluetooth na etiqueta de uma chapa, perfil ou bumper para ver a atualização em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionHistory.map((item, idx) => (
                <div 
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    idx === 0 
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100 shadow-sm' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      item.itemType === 'geral' 
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                        : item.itemType === 'perfil'
                        ? 'bg-blue-100 text-[#1b367c] border-blue-200'
                        : 'bg-purple-100 text-purple-700 border-purple-200'
                    }`}>
                      {item.itemType === 'geral' && <Layers size={17} />}
                      {item.itemType === 'perfil' && <Box size={17} />}
                      {item.itemType === 'bumper' && <Shield size={17} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          {item.codigo}
                        </span>
                        {item.idNomus && (
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.idNomus}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.action === 'incremented' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {item.action === 'incremented' ? 'Estoque + ' + item.quantityAdded : 'Novo Cadastrado'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="truncate max-w-[220px]">{item.descricao}</span>
                        {item.medidaFormatted && (
                          <>
                            <span>•</span>
                            <span className="font-bold text-slate-700">{item.medidaFormatted}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {item.timestamp}
                    </span>
                    {item.newTotalQuantity !== undefined && (
                      <span className="text-xs font-black text-slate-800">
                        Total: <strong className="text-emerald-700">{item.newTotalQuantity}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info & tips */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500 shrink-0" />
            <span>
              <strong>Dica:</strong> A pistola Bluetooth funciona em modo teclado (HID). Qualquer código lido é capturado sem precisar clicar em nada.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Concluir Sessão
          </button>
        </div>
      </div>
    </div>
  );
};
