import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Plus, AlertTriangle, QrCode, Layers, Shield, Box, Tag, ArrowRight, RefreshCw, Hash } from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem, ProductCatalogItem, AppMode } from '../types';
import { CATALOGO_PERFIS } from '../data/catalog';

interface ScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedCode: string | null;
  perfis?: PerfilItem[];
  bumpers?: BumperItem[];
  gerais?: GeralItem[];
  productCatalog?: ProductCatalogItem[];
  appMode?: AppMode;
  onAddPerfil?: (item: Omit<PerfilItem, 'id'>) => Promise<void>;
  onAddBumper?: (item: Omit<BumperItem, 'id'>) => Promise<void>;
  onAddGeral?: (item: Omit<GeralItem, 'id'>) => Promise<void>;
  onIncrementPerfil?: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementBumper?: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementGeral?: (id: string | number, currentQty: number) => Promise<void>;
  onNavigateToTab?: (tab: 'perfis' | 'bumpers' | 'gerais') => void;
}

export function parseScannedPayload(raw: string) {
  const text = (raw || '').trim();
  let parsedJson: any = null;

  // 1. Try parsing JSON format
  if (text.startsWith('{')) {
    try {
      parsedJson = JSON.parse(text);
    } catch {
      try {
        const sanitized = text.replace(/[\r\n]+/g, ' ').replace(/,\s*}/g, '}');
        parsedJson = JSON.parse(sanitized);
      } catch {
        // Continue to regex
      }
    }
  }

  // 2. If JSON was found or partially formatted
  let parsedIdNomus = '';
  let parsedCodigo = '';
  let parsedDesc = '';
  let parsedMedidaMm = 0;
  let parsedQtd = 1;
  let parsedCategoriaHint = '';

  if (parsedJson) {
    parsedIdNomus = parsedJson.id_nomus || parsedJson.idNomus || parsedJson.id || '';
    parsedCodigo = parsedJson.codigo || parsedJson.codigoItem || parsedJson.code || '';
    parsedDesc = parsedJson.desc || parsedJson.descricao || parsedJson.descricaoItem || '';
    if (parsedJson.medida_mm !== undefined && parsedJson.medida_mm !== null) {
      parsedMedidaMm = Number(parsedJson.medida_mm) || 0;
    } else if (parsedJson.medida) {
      const match = String(parsedJson.medida).match(/\d+/);
      if (match) parsedMedidaMm = parseInt(match[0], 10);
    }
    if (parsedJson.quantidade || parsedJson.qtd) {
      parsedQtd = Number(parsedJson.quantidade || parsedJson.qtd) || 1;
    }
    parsedCategoriaHint = parsedJson.categoria || '';
  } else {
    // 3. Multiline or plaintext key-value parsing (e.g. from OCR or standard label dumps)
    const idNomusMatch = text.match(/(?:id[\s_-]*nomus|nomus[\s_-]*id|id)\s*[:=]\s*([^\r\n,]+)/i);
    const codigoMatch = text.match(/(?:c[oó]digo|cod|item)\s*[:=]\s*([^\r\n,]+)/i);
    const descMatch = text.match(/(?:descri[cç][aã]o|desc)\s*[:=]\s*([^\r\n,]+)/i);
    const medidaMatch = text.match(/(?:medida|comprimento|largura)\s*[:=]?\s*(\d+)/i);
    const qtdMatch = text.match(/(?:quantidade|qtd)\s*[:=]?\s*(\d+)/i);

    if (idNomusMatch) parsedIdNomus = idNomusMatch[1].trim();
    if (codigoMatch) parsedCodigo = codigoMatch[1].trim();
    if (descMatch) parsedDesc = descMatch[1].trim();
    if (medidaMatch) parsedMedidaMm = parseInt(medidaMatch[1], 10);
    if (qtdMatch) parsedQtd = parseInt(qtdMatch[1], 10);

    // If no key-value matched, check if raw string is an ID Nomus date format (e.g. 2026.08.10.1118 or similar)
    if (!parsedIdNomus && !parsedCodigo) {
      if (/^\d{4}\.\d{2}\.\d{2}/.test(text) || (text.includes('.') && text.length >= 10)) {
        parsedIdNomus = text;
      } else {
        // Treat as a product code / barcode
        parsedCodigo = text;
      }
    }
  }

  // Clean strings
  parsedIdNomus = parsedIdNomus.replace(/['"]+/g, '').trim();
  parsedCodigo = parsedCodigo.replace(/['"]+/g, '').trim();
  parsedDesc = parsedDesc.replace(/['"]+/g, '').trim();

  // If code equals ID Nomus or looks like a timestamp, separate them
  if (parsedCodigo === parsedIdNomus && /^\d{4}\.\d{2}/.test(parsedCodigo)) {
    parsedCodigo = '';
  }

  return {
    idNomus: parsedIdNomus,
    codigoItem: parsedCodigo,
    descItem: parsedDesc,
    medidaMm: parsedMedidaMm,
    quantidade: parsedQtd,
    categoriaHint: parsedCategoriaHint,
    rawText: text
  };
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  isOpen,
  onClose,
  scannedCode,
  perfis = [],
  bumpers = [],
  gerais = [],
  productCatalog = [],
  appMode = 'fabrica',
  onAddPerfil,
  onAddBumper,
  onAddGeral,
  onIncrementPerfil,
  onIncrementBumper,
  onIncrementGeral,
  onNavigateToTab
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
  const safeCatalog = productCatalog || [];

  const { idNomus, codigoItem, descItem, medidaMm, quantidade, categoriaHint } = parseScannedPayload(scannedCode || '');

  // Search in current inventory
  const cleanId = (idNomus || '').trim().toLowerCase();
  const cleanCode = (codigoItem || '').trim().toLowerCase();

  const existingPerfil = safePerfis.find(p => 
    (cleanId && (p.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (p.codigo_perfil || '').trim().toLowerCase() === cleanCode)
  );

  const existingBumper = safeBumpers.find(b => 
    (cleanId && (b.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (b.codigo || '').trim().toLowerCase() === cleanCode)
  );

  const existingGeral = safeGerais.find(g => 
    (cleanId && (g.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (g.codigo_item || '').trim().toLowerCase() === cleanCode)
  );

  const existingItem = existingPerfil || existingBumper || existingGeral;
  const existingType = existingPerfil ? 'perfis' : existingBumper ? 'bumpers' : existingGeral ? 'gerais' : null;

  useEffect(() => {
    if (scannedCode) {
      setFeedbackMsg(null);
      setMedidaMmInput(medidaMm ? String(medidaMm) : (existingItem && 'medida_mm' in existingItem ? String((existingItem as any).medida_mm) : '1000'));
      setQuantidadeInput(quantidade > 0 ? quantidade : 1);

      // Determine initial category
      if (existingType === 'bumpers' || categoriaHint === 'bumper' || appMode === 'pcp') {
        setTargetCategory('bumper');
      } else if (existingType === 'gerais' || categoriaHint === 'geral') {
        setTargetCategory('geral');
      } else if (existingType === 'perfis' || categoriaHint === 'perfil') {
        setTargetCategory('perfil');
      } else {
        // Infer from code or description
        const dLower = (descItem || '').toLowerCase();
        const cLower = (codigoItem || '').toLowerCase();
        if (cLower.startsWith('op') || dLower.includes('bumper')) {
          setTargetCategory('bumper');
        } else if (dLower.includes('chapa') || dLower.includes('placa') || dLower.includes('fq') || dLower.includes('geral')) {
          setTargetCategory('geral');
        } else {
          setTargetCategory('perfil');
        }
      }

      // Check code against catalog
      const codeToMatch = codigoItem || (existingItem ? (
        (existingItem as any).codigo_perfil || (existingItem as any).codigo || (existingItem as any).codigo_item
      ) : '');

      if (codeToMatch) {
        setCustomCodigo(codeToMatch);
        // Find in CATALOGO_PERFIS or productCatalog
        const perfMatch = CATALOGO_PERFIS.find(c => c.code.toLowerCase() === codeToMatch.toLowerCase());
        const catMatch = safeCatalog.find(c => c.codigo.toLowerCase() === codeToMatch.toLowerCase());

        if (perfMatch) {
          setSelectedCatalogCode(perfMatch.code);
          setCustomDesc(descItem || perfMatch.desc);
        } else if (catMatch) {
          setSelectedCatalogCode('CUSTOM');
          setCustomDesc(descItem || catMatch.descricao);
        } else {
          setSelectedCatalogCode('CUSTOM');
          setCustomDesc(descItem || `Item ${codeToMatch}`);
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
    }
  }, [scannedCode, isOpen]);

  if (!isOpen || !scannedCode) return null;

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
      if (existingPerfil && onIncrementPerfil) {
        await onIncrementPerfil(existingPerfil.id, existingPerfil.quantidade + 1);
      } else if (existingBumper && onIncrementBumper) {
        await onIncrementBumper(existingBumper.id, existingBumper.quantidade + 1);
      } else if (existingGeral && onIncrementGeral) {
        await onIncrementGeral(existingGeral.id, existingGeral.quantidade + 1);
      }
      setFeedbackMsg('✅ Quantidade incrementada com sucesso (+1 un)!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
        if (existingType && onNavigateToTab) {
          onNavigateToTab(existingType);
        }
      }, 1200);
    } catch (err) {
      console.error("Increment error:", err);
      setFeedbackMsg('Erro ao atualizar o item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveOrReInventoriar = async () => {
    setIsSubmitting(true);
    try {
      const parsedTyped = parseInt(medidaMmInput, 10);
      const finalMedida = (!isNaN(parsedTyped) && parsedTyped > 0) ? parsedTyped : (medidaMm || 1000);
      const qty = Math.max(1, quantidadeInput);

      const finalId = idNomus || (scannedCode && scannedCode.includes('.') ? scannedCode : `ID-${Date.now()}`);
      const finalCode = customCodigo.trim() || (selectedCatalogCode !== 'CUSTOM' ? selectedCatalogCode : 'ITEM-01');
      const catalogMatch = CATALOGO_PERFIS.find(c => c.code === finalCode || c.code === selectedCatalogCode);
      const finalDescription = (customDesc.trim() && !customDesc.trim().toLowerCase().startsWith('item'))
        ? customDesc.trim()
        : (catalogMatch ? catalogMatch.desc : `Item ${finalCode}`);

      if (targetCategory === 'perfil') {
        if (onAddPerfil) {
          await onAddPerfil({
            id_nomus: finalId,
            codigo_perfil: finalCode,
            descricao_perfil: finalDescription,
            medida_mm: finalMedida,
            quantidade: qty,
            status: 'Inventoriado'
          });
        }
      } else if (targetCategory === 'bumper') {
        if (onAddBumper) {
          await onAddBumper({
            id_nomus: finalId,
            codigo: finalCode,
            tipo: finalCode.toUpperCase().startsWith('OP') ? 'OP' : 'ID',
            medida_mm: finalMedida,
            quantidade: qty
          });
        }
      } else {
        if (onAddGeral) {
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
      }

      setFeedbackMsg('✨ Item registrado e adicionado ao inventário com sucesso!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
        if (onNavigateToTab) {
          onNavigateToTab(targetCategory === 'perfil' ? 'perfis' : targetCategory === 'bumper' ? 'bumpers' : 'gerais');
        }
      }, 1200);
    } catch (err) {
      console.error("Save error:", err);
      setFeedbackMsg('Erro ao salvar no inventário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#1b367c] text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-bold text-base">
            <QrCode size={20} className="text-emerald-400" />
            <span>Resultado do Leitor de Etiquetas</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {feedbackMsg ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-center text-sm flex flex-col items-center gap-3">
              <CheckCircle size={36} className="text-emerald-600 animate-bounce" />
              <span className="text-base">{feedbackMsg}</span>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              {existingItem ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-start gap-3 text-emerald-950 text-xs">
                  <CheckCircle size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-black text-sm text-emerald-950">
                      Item Encontrado no Inventário!
                    </p>
                    <p className="text-emerald-800 font-medium">
                      Este item já está cadastrado na aba <strong className="uppercase font-bold underline">{existingType}</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 text-blue-950 text-xs">
                  <Tag size={20} className="text-[#1b367c] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-black text-sm text-[#1b367c]">
                      Etiqueta Lida com Sucesso!
                    </p>
                    <p className="text-slate-600 font-medium">
                      Verifique os dados abaixo para adicionar ou atualizar no inventário.
                    </p>
                  </div>
                </div>
              )}

              {/* Tag / ID Nomus info badge */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-extrabold text-[#1b367c]">
                  <Hash size={16} className="text-amber-600" />
                  <span>ID Nomus Identificado:</span>
                </div>
                <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs">
                  {idNomus || (cleanCode && !cleanCode.startsWith('{') ? cleanCode : 'Sem ID Nomus')}
                </span>
              </div>

              {/* Actions based on existence */}
              {existingItem ? (
                <div className="space-y-3 pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                      <span className="text-slate-500 font-medium">Localização:</span>
                      <span className="font-extrabold uppercase bg-blue-100 text-[#1b367c] px-2 py-0.5 rounded text-[11px]">
                        Aba {existingType}
                      </span>
                    </div>
                    <p>
                      <span className="text-slate-500 font-medium">Código:</span>{' '}
                      <strong className="text-slate-900">
                        {(existingItem as any).codigo_perfil || (existingItem as any).codigo || (existingItem as any).codigo_item}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Descrição:</span>{' '}
                      <strong className="text-slate-900">
                        {(existingItem as any).descricao_perfil || (existingItem as any).descricao_item || 'Item inventoriado'}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Medida:</span>{' '}
                      <strong className="text-slate-900">
                        {'medida_mm' in existingItem && (existingItem as any).medida_mm 
                          ? `${(existingItem as any).medida_mm} mm`
                          : ('comprimento_mm' in existingItem && (existingItem as any).comprimento_mm ? `${(existingItem as any).comprimento_mm} mm` : '-')}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Quantidade Atual:</span>{' '}
                      <strong className="text-emerald-700 font-black text-sm">
                        {existingItem.quantidade} un
                      </strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleIncrementExisting}
                      disabled={isSubmitting}
                      className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Plus size={18} />
                      <span>Incrementar (+1 un)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveOrReInventoriar}
                      disabled={isSubmitting}
                      className="py-3 px-3 bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={16} />
                      <span>Salvar Nova Medida</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Form to Register or Adjust New/Scanned Item */}
              <div className={`space-y-3.5 pt-2 ${existingItem ? 'border-t border-slate-200 mt-2' : ''}`}>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    {existingItem ? 'Ou Ajustar Dados e Adicionar:' : '1. Categoria do Produto:'}
                  </label>
                  {appMode === 'pcp' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold">
                      Modo PCP Ativo
                    </span>
                  )}
                </div>

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
                    Perfis
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
                    Bumpers
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
                    Gerais/Chapas
                  </button>
                </div>

                {/* Product Code / Catalog Selection */}
                {targetCategory === 'perfil' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Selecione do Catálogo Metalrib (Opcional):
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
                      <option value="CUSTOM">-- Outro Código / Personalizado --</option>
                    </select>
                  </div>
                )}

                {/* Product Code & Description Inputs */}
                <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Código do Item / Produto:
                    </label>
                    <input
                      type="text"
                      value={customCodigo}
                      onChange={e => setCustomCodigo(e.target.value)}
                      placeholder="Ex: 70.02.0003 ou BUMPER-500"
                      className="w-full h-9 px-2.5 border border-slate-300 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">
                      Descrição do Item:
                    </label>
                    <input
                      type="text"
                      value={customDesc}
                      onChange={e => setCustomDesc(e.target.value)}
                      placeholder="Ex: Perfil Guia U 70x30..."
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
                      placeholder="Ex: 6000"
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

                {!existingItem && (
                  <button
                    type="button"
                    onClick={handleSaveOrReInventoriar}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#1b367c] hover:bg-[#14295e] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={18} />
                    <span>{isSubmitting ? 'Salvando no Inventário...' : '➕ Salvar e Adicionar ao Inventário'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
