import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Plus, AlertTriangle, QrCode, Layers, Shield, Box, Tag } from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem } from '../types';
import { CATALOGO_PERFIS } from '../data/catalog';

interface ScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedCode: string | null;
  perfis?: PerfilItem[];
  bumpers?: BumperItem[];
  gerais?: GeralItem[];
  onAddPerfil: (item: Omit<PerfilItem, 'id'>) => Promise<void>;
  onAddBumper: (item: Omit<BumperItem, 'id'>) => Promise<void>;
  onAddGeral: (item: Omit<GeralItem, 'id'>) => Promise<void>;
  onIncrementPerfil: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementBumper: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementGeral: (id: string | number, currentQty: number) => Promise<void>;
}

export function parseScannedPayload(raw: string) {
  const text = (raw || '').trim();
  let parsedJson: any = null;

  if (text.startsWith('{')) {
    try {
      parsedJson = JSON.parse(text);
    } catch (e) {
      try {
        const sanitized = text.replace(/[\r\n]+/g, ' ');
        parsedJson = JSON.parse(sanitized);
      } catch (e2) {}
    }
  }

  if (!parsedJson && text.includes('"')) {
    const idNomusMatch = text.match(/["']?id_nomus["']?\s*:\s*["']?([^"',}]+)/i);
    const codigoMatch = text.match(/["']?codigo["']?\s*:\s*["']?([^"',}]+)/i);
    const descMatch = text.match(/["']?desc["']?\s*:\s*["']?([^"',}]+)/i);
    const medidaMatch = text.match(/["']?medida_mm["']?\s*:\s*(\d+)/i);
    const catMatch = text.match(/["']?categoria["']?\s*:\s*["']?([^"',}]+)/i);

    if (idNomusMatch || codigoMatch) {
      parsedJson = {
        id_nomus: idNomusMatch ? idNomusMatch[1].trim() : undefined,
        codigo: codigoMatch ? codigoMatch[1].trim() : undefined,
        desc: descMatch ? descMatch[1].trim() : undefined,
        medida_mm: medidaMatch ? parseInt(medidaMatch[1]) : undefined,
        categoria: catMatch ? catMatch[1].trim() : undefined
      };
    }
  }

  const rawId = parsedJson?.id_nomus || (text.includes('.') && text.length >= 10 && !text.startsWith('{') ? text : '');
  let rawCode = parsedJson?.codigo || (!text.startsWith('{') ? text : '');

  // If rawCode is a date-timestamp ID (e.g. 2026.08.10.1118) or matches rawId, it is NOT a catalog product code!
  const isDateIdFormat = rawCode === rawId || (rawCode.includes('.') && rawCode.length >= 10 && /^\d{4}\.\d{2}/.test(rawCode));
  if (isDateIdFormat) {
    rawCode = '';
  }

  const idNomus = rawId || (isDateIdFormat ? (!text.startsWith('{') ? text : '') : '');
  const codigoItem = rawCode;
  const rawDesc = parsedJson?.desc || '';
  const descItem = (rawDesc && !rawDesc.toLowerCase().startsWith('item') && rawDesc !== idNomus) ? rawDesc : '';
  const medidaMm = parsedJson?.medida_mm || 0;
  const categoriaHint = parsedJson?.categoria || '';

  return { idNomus, codigoItem, descItem, medidaMm, categoriaHint, rawText: text };
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  isOpen,
  onClose,
  scannedCode,
  perfis = [],
  bumpers = [],
  gerais = [],
  onAddPerfil,
  onAddBumper,
  onAddGeral,
  onIncrementPerfil,
  onIncrementBumper,
  onIncrementGeral
}) => {
  const [targetCategory, setTargetCategory] = useState<'perfil' | 'bumper' | 'geral'>('perfil');
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string>('');
  const [customCodigo, setCustomCodigo] = useState<string>('');
  const [customDesc, setCustomDesc] = useState<string>('');
  const [medidaMmInput, setMedidaMmInput] = useState('');
  const [quantidadeInput, setQuantidadeInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const safePerfis = perfis || [];
  const safeBumpers = bumpers || [];
  const safeGerais = gerais || [];

  const { idNomus, codigoItem, descItem, medidaMm, categoriaHint } = parseScannedPayload(scannedCode || '');

  useEffect(() => {
    if (scannedCode) {
      setFeedbackMsg(null);
      setMedidaMmInput(medidaMm ? String(medidaMm) : '1000');
      setQuantidadeInput(1);

      if (codigoItem) {
        setCustomCodigo(codigoItem);
        const match = CATALOGO_PERFIS.find(c => c.code === codigoItem);
        if (match) {
          setSelectedCatalogCode(match.code);
          setCustomDesc(descItem || match.desc);
        } else {
          setSelectedCatalogCode('CUSTOM');
          setCustomDesc(descItem || `Perfil ${codigoItem}`);
        }
      } else {
        const first = CATALOGO_PERFIS[0];
        if (first) {
          setSelectedCatalogCode(first.code);
          setCustomCodigo(first.code);
          setCustomDesc(first.desc);
        } else {
          setSelectedCatalogCode('CUSTOM');
          setCustomCodigo('');
          setCustomDesc('');
        }
      }

      const dLower = (descItem || '').toLowerCase();
      const cLower = (codigoItem || '').toLowerCase();

      if (categoriaHint === 'bumper' || cLower.startsWith('op') || dLower.includes('bumper')) {
        setTargetCategory('bumper');
      } else if (categoriaHint === 'geral' || dLower.includes('chapa') || dLower.includes('placa') || dLower.includes('fq') || dLower.includes('geral')) {
        setTargetCategory('geral');
      } else {
        setTargetCategory('perfil');
      }
    }
  }, [scannedCode, isOpen]);

  if (!isOpen || !scannedCode) return null;

  // Search in current inventory strictly by id_nomus first if present, otherwise by code
  let existingPerfil: PerfilItem | undefined;
  let existingBumper: BumperItem | undefined;
  let existingGeral: GeralItem | undefined;

  if (idNomus) {
    existingPerfil = safePerfis.find(p => p.id_nomus === idNomus);
    existingBumper = safeBumpers.find(b => b.id_nomus === idNomus);
    existingGeral = safeGerais.find(g => g.id_nomus === idNomus);
  } else if (codigoItem) {
    existingPerfil = safePerfis.find(p => p.codigo_perfil === codigoItem);
    existingBumper = safeBumpers.find(b => b.codigo === codigoItem);
    existingGeral = safeGerais.find(g => g.codigo_item === codigoItem);
  }

  const existingItem = existingPerfil || existingBumper || existingGeral;
  const existingType = existingPerfil ? 'perfil' : existingBumper ? 'bumper' : existingGeral ? 'geral' : null;

  const handleCatalogSelect = (code: string) => {
    setSelectedCatalogCode(code);
    if (code === 'CUSTOM') {
      setCustomCodigo('');
      setCustomDesc('');
    } else {
      const found = CATALOGO_PERFIS.find(c => c.code === code);
      if (found) {
        setCustomCodigo(found.code);
        setCustomDesc(found.desc);
      }
    }
  };

  const handleIncrementExisting = async () => {
    setIsSubmitting(true);
    try {
      if (existingPerfil) {
        await onIncrementPerfil(existingPerfil.id, existingPerfil.quantidade + 1);
      } else if (existingBumper) {
        await onIncrementBumper(existingBumper.id, existingBumper.quantidade + 1);
      } else if (existingGeral) {
        await onIncrementGeral(existingGeral.id, existingGeral.quantidade + 1);
      }
      setFeedbackMsg('✅ Quantidade incrementada no inventário com sucesso!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReInventoriar = async () => {
    setIsSubmitting(true);
    try {
      const parsedTyped = parseInt(medidaMmInput, 10);
      const finalMedida = (!isNaN(parsedTyped) && parsedTyped > 0) ? parsedTyped : (medidaMm || 1000);
      const qty = Math.max(1, quantidadeInput);

      const finalId = idNomus || (scannedCode && scannedCode.includes('.') ? scannedCode : `ID-${Date.now()}`);
      const finalCode = customCodigo.trim() || (selectedCatalogCode !== 'CUSTOM' ? selectedCatalogCode : 'PERFIL');
      const catalogMatch = CATALOGO_PERFIS.find(c => c.code === finalCode || c.code === selectedCatalogCode);
      const finalDescription = (customDesc.trim() && !customDesc.trim().toLowerCase().startsWith('item'))
        ? customDesc.trim()
        : (catalogMatch ? catalogMatch.desc : `Perfil ${finalCode}`);

      if (targetCategory === 'perfil') {
        await onAddPerfil({
          id_nomus: finalId,
          codigo_perfil: finalCode,
          descricao_perfil: finalDescription,
          medida_mm: finalMedida,
          quantidade: qty,
          status: 'Inventoriado'
        });
      } else if (targetCategory === 'bumper') {
        await onAddBumper({
          id_nomus: finalId,
          codigo: finalCode,
          tipo: finalCode.toUpperCase().startsWith('OP') ? 'OP' : 'ID',
          medida_mm: finalMedida,
          quantidade: qty
        });
      } else {
        await onAddGeral({
          id_nomus: finalId,
          codigo_item: finalCode,
          descricao_item: finalDescription,
          comprimento_mm: finalMedida,
          largura_mm: 0,
          espessura_mm: 0,
          quantidade: qty,
          unidade: 'MM'
        });
      }

      setFeedbackMsg('✨ Item reinventoriado e adicionado à lista com sucesso!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1b367c] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base">
            <QrCode size={20} className="text-emerald-400" />
            <span>Resultado do Leitor de Código</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {feedbackMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-center text-sm flex flex-col items-center gap-2">
              <CheckCircle size={32} className="text-emerald-600 animate-bounce" />
              <span>{feedbackMsg}</span>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {existingItem ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-emerald-900 text-xs font-semibold">
                  <CheckCircle size={22} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm text-emerald-950">Item Encontrado no Inventário!</p>
                    <p className="text-emerald-800 font-medium">Este código já está registrado na aba {existingType?.toUpperCase()}.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-amber-900 text-xs font-semibold">
                  <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-sm text-amber-950">Etiqueta Lida com Sucesso!</p>
                    <p className="text-amber-800 font-medium">Selecione o código/modelo do produto e confirme a medida para salvar na lista.</p>
                  </div>
                </div>
              )}

              {/* Tag / ID Nomus info badge */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-extrabold text-[#1b367c]">
                  <Tag size={16} className="text-amber-600" />
                  <span>ID Nomus (Etiqueta Escaneada):</span>
                </div>
                <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs">
                  {idNomus || scannedCode || 'Sem ID'}
                </span>
              </div>

              {/* Actions based on existence */}
              {existingItem ? (
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <p><span className="text-slate-500 font-medium">Código:</span> <strong className="text-slate-900">{(existingItem as any).codigo_perfil || (existingItem as any).codigo || (existingItem as any).codigo_item}</strong></p>
                    <p><span className="text-slate-500 font-medium">Descrição:</span> <strong className="text-slate-900">{(existingItem as any).descricao_perfil || (existingItem as any).descricao_item || 'Item inventoriado'}</strong></p>
                    <p><span className="text-slate-500 font-medium">Qtd atual:</span> <strong className="text-emerald-700 font-bold">{existingItem.quantidade} un</strong></p>
                  </div>

                  <button
                    onClick={handleIncrementExisting}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={18} />
                    <span>Incrementar Quantidade (+1 un) no Inventário</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                      1. Categoria do Item:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetCategory('perfil')}
                        className={`py-2 px-3 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          targetCategory === 'perfil'
                            ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Layers size={14} />
                        Perfil
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetCategory('bumper')}
                        className={`py-2 px-3 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          targetCategory === 'bumper'
                            ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Shield size={14} />
                        Bumper
                      </button>

                      <button
                        type="button"
                        onClick={() => setTargetCategory('geral')}
                        className={`py-2 px-3 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          targetCategory === 'geral'
                            ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Box size={14} />
                        Geral
                      </button>
                    </div>
                  </div>

                  {/* Product Code / Catalog Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      2. Selecione o Produto / Código (Catálogo Metalrib):
                    </label>
                    <select
                      value={selectedCatalogCode}
                      onChange={e => handleCatalogSelect(e.target.value)}
                      className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#1b367c]"
                    >
                      {CATALOGO_PERFIS.map(cat => (
                        <option key={cat.code} value={cat.code}>
                          {cat.code} - {cat.desc}
                        </option>
                      ))}
                      <option value="CUSTOM">-- Digitar Outro Código / Descrição --</option>
                    </select>
                  </div>

                  {/* Product Code & Description Inputs */}
                  <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                        Código do Produto:
                      </label>
                      <input
                        type="text"
                        value={customCodigo}
                        onChange={e => setCustomCodigo(e.target.value)}
                        placeholder="Ex: MP-001"
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                        Descrição do Produto:
                      </label>
                      <input
                        type="text"
                        value={customDesc}
                        onChange={e => setCustomDesc(e.target.value)}
                        placeholder="Ex: Perfil de Alumínio..."
                        className="w-full h-9 px-2.5 border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                      />
                    </div>
                  </div>

                  {/* Measure & Quantity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Medida (MM):
                      </label>
                      <input
                        type="number"
                        value={medidaMmInput}
                        onChange={e => setMedidaMmInput(e.target.value)}
                        placeholder="Ex: 1000"
                        className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quantidade:
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantidadeInput}
                        onChange={e => setQuantidadeInput(parseInt(e.target.value, 10) || 1)}
                        className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleReInventoriar}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#1b367c] hover:bg-[#14295e] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={18} />
                    <span>{isSubmitting ? 'Salvando...' : '➕ Re-inventoriar e Colocar na Lista'}</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
