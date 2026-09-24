import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Plus, AlertTriangle, QrCode, Layers, Shield, Box, Tag, ArrowRight, RefreshCw, Hash, Calculator } from 'lucide-react';
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
  onUpdatePerfil?: (id: string | number, updated: Partial<PerfilItem>) => Promise<void>;
  onUpdateBumper?: (id: string | number, updated: Partial<BumperItem>) => Promise<void>;
  onUpdateGeral?: (id: string | number, updated: Partial<GeralItem>) => Promise<void>;
  onIncrementPerfil?: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementBumper?: (id: string | number, currentQty: number) => Promise<void>;
  onIncrementGeral?: (id: string | number, currentQty: number) => Promise<void>;
  onNavigateToTab?: (tab: 'perfis' | 'bumpers' | 'gerais') => void;
}

export function parseDimensionString(rawMedida: string) {
  if (!rawMedida) return { comprimento: 0, largura: 0, espessura: 0, raw: '' };

  // Clean string and look for dimensions like 1740 x 850 x 0.5 or 1740*850*0.5 or 6000 mm
  const clean = rawMedida.replace(/[^\d.,xX*]/g, ' ').trim();
  const parts = clean.split(/[xX*]+/).map(p => p.trim()).filter(Boolean);

  const nums = parts.map(p => parseFloat(p.replace(',', '.'))).filter(n => !isNaN(n) && n > 0);

  if (nums.length >= 3) {
    return {
      comprimento: nums[0],
      largura: nums[1],
      espessura: nums[2],
      raw: rawMedida
    };
  } else if (nums.length === 2) {
    return {
      comprimento: nums[0],
      largura: nums[1],
      espessura: 0,
      raw: rawMedida
    };
  } else if (nums.length === 1) {
    return {
      comprimento: nums[0],
      largura: 0,
      espessura: 0,
      raw: rawMedida
    };
  }
  return { comprimento: 0, largura: 0, espessura: 0, raw: rawMedida };
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
        // Fallback to text parsing
      }
    }
  }

  let parsedIdNomus = '';
  let parsedCodigo = '';
  let parsedDesc = '';
  let parsedComprimentoMm = 0;
  let parsedLarguraMm = 0;
  let parsedEspessuraMm = 0;
  let parsedQtd = 1;
  let parsedUnidade = '';
  let parsedCategoriaHint = '';

  if (parsedJson) {
    parsedIdNomus = parsedJson.id_nomus || parsedJson.idNomus || parsedJson.id || '';
    parsedCodigo = parsedJson.codigo || parsedJson.codigoItem || parsedJson.code || '';
    parsedDesc = parsedJson.desc || parsedJson.descricao || parsedJson.descricaoItem || '';

    // Check explicit dimension fields first
    if (parsedJson.comprimento_mm !== undefined && parsedJson.comprimento_mm !== null) {
      parsedComprimentoMm = parseFloat(String(parsedJson.comprimento_mm)) || 0;
    }
    if (parsedJson.largura_mm !== undefined && parsedJson.largura_mm !== null) {
      parsedLarguraMm = parseFloat(String(parsedJson.largura_mm)) || 0;
    }
    if (parsedJson.espessura_mm !== undefined && parsedJson.espessura_mm !== null) {
      parsedEspessuraMm = parseFloat(String(parsedJson.espessura_mm)) || 0;
    }

    // Parse 'medida' string (e.g. "1740 x 850 x 0.5 MM" or "6000 MM")
    const rawMedidaStr = String(parsedJson.medida || parsedJson.medidaFormatted || '').trim();
    if (rawMedidaStr) {
      const dims = parseDimensionString(rawMedidaStr);
      if (!parsedComprimentoMm && dims.comprimento > 0) parsedComprimentoMm = dims.comprimento;
      if (!parsedLarguraMm && dims.largura > 0) parsedLarguraMm = dims.largura;
      if (!parsedEspessuraMm && dims.espessura > 0) parsedEspessuraMm = dims.espessura;
    }

    // Fallback to 'medida_mm' if single length
    if (!parsedComprimentoMm && parsedJson.medida_mm) {
      parsedComprimentoMm = parseFloat(String(parsedJson.medida_mm)) || 0;
    }

    if (parsedJson.quantidade || parsedJson.qtd) {
      parsedQtd = Number(parsedJson.quantidade || parsedJson.qtd) || 1;
    }
    parsedUnidade = parsedJson.unidade || '';
    parsedCategoriaHint = parsedJson.categoria || '';
  } else {
    // 2. Multiline or plaintext key-value parsing (e.g. from OCR or standard label dumps)
    const idNomusMatch = text.match(/(?:id[\s_-]*nomus|nomus[\s_-]*id|id)\s*[:=]\s*([^\r\n,]+)/i);
    const codigoMatch = text.match(/(?:c[oó]digo|cod|item)\s*[:=]\s*([^\r\n,]+)/i);
    const descMatch = text.match(/(?:descri[cç][aã]o|desc)\s*[:=]\s*([^\r\n,]+)/i);
    const medidaMatch = text.match(/(?:medida|dimens[aã]o|dimens[oõ]es)\s*[:=]\s*([^\r\n,]+)/i);
    const compMatch = text.match(/(?:comprimento|comp)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    const largMatch = text.match(/(?:largura|larg)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    const espMatch = text.match(/(?:espessura|esp)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    const qtdMatch = text.match(/(?:quantidade|qtd)\s*[:=]?\s*(\d+)/i);
    const uniMatch = text.match(/(?:unidade|unid)\s*[:=]?\s*([^\r\n,]+)/i);

    if (idNomusMatch) parsedIdNomus = idNomusMatch[1].trim();
    if (codigoMatch) parsedCodigo = codigoMatch[1].trim();
    if (descMatch) parsedDesc = descMatch[1].trim();

    if (compMatch) parsedComprimentoMm = parseFloat(compMatch[1].replace(',', '.')) || 0;
    if (largMatch) parsedLarguraMm = parseFloat(largMatch[1].replace(',', '.')) || 0;
    if (espMatch) parsedEspessuraMm = parseFloat(espMatch[1].replace(',', '.')) || 0;

    if (medidaMatch) {
      const dims = parseDimensionString(medidaMatch[1]);
      if (!parsedComprimentoMm && dims.comprimento > 0) parsedComprimentoMm = dims.comprimento;
      if (!parsedLarguraMm && dims.largura > 0) parsedLarguraMm = dims.largura;
      if (!parsedEspessuraMm && dims.espessura > 0) parsedEspessuraMm = dims.espessura;
    }

    if (qtdMatch) parsedQtd = parseInt(qtdMatch[1], 10);
    if (uniMatch) parsedUnidade = uniMatch[1].trim();

    // Check if whole text is dimension format (e.g. "1740 x 850 x 0.5")
    if (!parsedComprimentoMm && text.includes('x')) {
      const dims = parseDimensionString(text);
      if (dims.comprimento > 0) {
        parsedComprimentoMm = dims.comprimento;
        parsedLarguraMm = dims.largura;
        parsedEspessuraMm = dims.espessura;
      }
    }

    // If no key-value matched, check if raw string is an ID Nomus date format (e.g. 2026.08.19.1715)
    if (!parsedIdNomus && !parsedCodigo) {
      if (/^\d{4}\.\d{2}\.\d{2}/.test(text) || (text.includes('.') && text.length >= 10)) {
        parsedIdNomus = text;
      } else {
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

  // Auto-detect unit and category hint from description or code
  const descUpper = parsedDesc.toUpperCase();
  if (descUpper.includes('M2') || descUpper.includes('CHAPA') || descUpper.includes('PLACA') || parsedLarguraMm > 0) {
    if (!parsedUnidade) parsedUnidade = 'metros quadrados';
    if (!parsedCategoriaHint) parsedCategoriaHint = 'geral';
  } else if (descUpper.includes('BUMPER') || parsedCodigo.toUpperCase().startsWith('OP')) {
    if (!parsedCategoriaHint) parsedCategoriaHint = 'bumper';
    if (!parsedUnidade) parsedUnidade = 'unidade';
  }

  return {
    idNomus: parsedIdNomus,
    codigoItem: parsedCodigo,
    descItem: parsedDesc,
    comprimentoMm: parsedComprimentoMm,
    larguraMm: parsedLarguraMm,
    espessuraMm: parsedEspessuraMm,
    medidaMm: parsedComprimentoMm,
    quantidade: parsedQtd,
    unidade: parsedUnidade || 'metros quadrados',
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
  onUpdatePerfil,
  onUpdateBumper,
  onUpdateGeral,
  onIncrementPerfil,
  onIncrementBumper,
  onIncrementGeral,
  onNavigateToTab
}) => {
  const [targetCategory, setTargetCategory] = useState<'perfil' | 'bumper' | 'geral'>('geral');
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string>('');
  const [customCodigo, setCustomCodigo] = useState<string>('');
  const [customDesc, setCustomDesc] = useState<string>('');
  
  // Dimensions
  const [comprimentoInput, setComprimentoInput] = useState('');
  const [larguraInput, setLarguraInput] = useState('');
  const [espessuraInput, setEspessuraInput] = useState('');
  const [unidadeInput, setUnidadeInput] = useState('metros quadrados');
  const [bumperTipo, setBumperTipo] = useState<'ID' | 'OP'>('ID');

  const [quantidadeInput, setQuantidadeInput] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const safePerfis = perfis || [];
  const safeBumpers = bumpers || [];
  const safeGerais = gerais || [];
  const safeCatalog = productCatalog || [];

  const parsed = parseScannedPayload(scannedCode || '');
  const {
    idNomus,
    codigoItem,
    descItem,
    comprimentoMm,
    larguraMm,
    espessuraMm,
    quantidade,
    unidade,
    categoriaHint
  } = parsed;

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
      setQuantidadeInput(quantidade > 0 ? quantidade : 1);

      // 1. Initial Category determination
      let category: 'perfil' | 'bumper' | 'geral' = 'geral';

      if (existingType === 'bumpers' || categoriaHint === 'bumper' || appMode === 'pcp') {
        category = 'bumper';
      } else if (existingType === 'perfis' || categoriaHint === 'perfil') {
        category = 'perfil';
      } else if (existingType === 'gerais' || categoriaHint === 'geral') {
        category = 'geral';
      } else {
        const dUpper = (descItem || '').toUpperCase();
        const cUpper = (codigoItem || '').toUpperCase();
        if (cUpper.startsWith('OP') || dUpper.includes('BUMPER')) {
          category = 'bumper';
        } else if (dUpper.includes('CHAPA') || dUpper.includes('PLACA') || dUpper.includes('FQ') || dUpper.includes('M2') || larguraMm > 0) {
          category = 'geral';
        } else {
          category = 'perfil';
        }
      }
      setTargetCategory(category);

      // 2. Set Dimensions
      let initialComp = comprimentoMm > 0 ? String(comprimentoMm) : '';
      let initialLarg = larguraMm > 0 ? String(larguraMm) : '';
      let initialEsp = espessuraMm > 0 ? String(espessuraMm) : '';

      // If matched an existing item in inventory, fallback to its stored dimensions
      if (existingItem) {
        if ('comprimento_mm' in existingItem && existingItem.comprimento_mm) {
          if (!initialComp) initialComp = String(existingItem.comprimento_mm);
        }
        if ('largura_mm' in existingItem && existingItem.largura_mm) {
          if (!initialLarg) initialLarg = String(existingItem.largura_mm);
        }
        if ('espessura_mm' in existingItem && existingItem.espessura_mm) {
          if (!initialEsp) initialEsp = String(existingItem.espessura_mm);
        }
        if ('medida_mm' in existingItem && (existingItem as any).medida_mm) {
          if (!initialComp) initialComp = String((existingItem as any).medida_mm);
        }
      }

      setComprimentoInput(initialComp);
      setLarguraInput(initialLarg);
      setEspessuraInput(initialEsp);
      setUnidadeInput(unidade || (category === 'geral' ? 'metros quadrados' : 'MM'));

      // 3. Match code against catalog
      const codeToMatch = codigoItem || (existingItem ? (
        (existingItem as any).codigo_perfil || (existingItem as any).codigo || (existingItem as any).codigo_item
      ) : '');

      if (codeToMatch) {
        setCustomCodigo(codeToMatch);
        const perfMatch = CATALOGO_PERFIS.find(c => c.code.toLowerCase() === codeToMatch.toLowerCase());
        const catMatch = safeCatalog.find(c => c.codigo.toLowerCase() === codeToMatch.toLowerCase());

        if (perfMatch) {
          setSelectedCatalogCode(perfMatch.code);
          setCustomDesc(descItem || perfMatch.desc);
        } else if (catMatch) {
          setSelectedCatalogCode('CUSTOM');
          setCustomDesc(descItem || catMatch.descricao);
          if (!initialComp && catMatch.comprimento_padrao_mm) setComprimentoInput(String(catMatch.comprimento_padrao_mm));
          if (!initialLarg && catMatch.largura_padrao_mm) setLarguraInput(String(catMatch.largura_padrao_mm));
          if (!initialEsp && catMatch.espessura_padrao_mm) setEspessuraInput(String(catMatch.espessura_padrao_mm));
        } else {
          setSelectedCatalogCode('CUSTOM');
          setCustomDesc(descItem || `Item ${codeToMatch}`);
        }
      } else {
        if (category === 'perfil') {
          const first = CATALOGO_PERFIS[0];
          setSelectedCatalogCode(first ? first.code : 'CUSTOM');
          setCustomCodigo(first ? first.code : '');
          setCustomDesc(first ? first.desc : '');
        } else {
          setSelectedCatalogCode('CUSTOM');
          setCustomCodigo('');
          setCustomDesc('');
        }
      }

      if (codeToMatch.toUpperCase().startsWith('OP')) {
        setBumperTipo('OP');
      } else {
        setBumperTipo('ID');
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

  // Calculations for preview
  const compNum = parseFloat(comprimentoInput) || 0;
  const largNum = parseFloat(larguraInput) || 0;
  const espNum = parseFloat(espessuraInput) || 0;
  const qtdNum = Math.max(1, quantidadeInput);

  const areaM2Unit = (compNum > 0 && largNum > 0) ? (compNum * largNum) / 1000000 : 0;
  const areaM2Total = areaM2Unit * qtdNum;
  const metrosLinearesTotal = (compNum * qtdNum) / 1000;

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
      const finalId = idNomus || (scannedCode && scannedCode.includes('.') ? scannedCode : `ID-${Date.now()}`);
      const finalCode = customCodigo.trim() || (selectedCatalogCode !== 'CUSTOM' ? selectedCatalogCode : 'ITEM-01');
      const catalogMatch = CATALOGO_PERFIS.find(c => c.code === finalCode || c.code === selectedCatalogCode);
      const finalDescription = (customDesc.trim() && !customDesc.trim().toLowerCase().startsWith('item'))
        ? customDesc.trim()
        : (catalogMatch ? catalogMatch.desc : `Item ${finalCode}`);

      if (targetCategory === 'geral') {
        const itemPayload: Omit<GeralItem, 'id'> = {
          id_nomus: finalId,
          codigo_item: finalCode,
          descricao_item: finalDescription,
          comprimento_mm: compNum,
          largura_mm: largNum,
          espessura_mm: espNum,
          quantidade: qtdNum,
          unidade: unidadeInput || 'metros quadrados'
        };

        if (existingGeral && onUpdateGeral) {
          await onUpdateGeral(existingGeral.id, itemPayload);
          setFeedbackMsg('✨ Chapa/Item atualizado com as novas medidas!');
        } else if (onAddGeral) {
          await onAddGeral(itemPayload);
          setFeedbackMsg('✨ Chapa/Item registrado com todas as medidas!');
        }
      } else if (targetCategory === 'perfil') {
        const itemPayload: Omit<PerfilItem, 'id'> = {
          id_nomus: finalId,
          codigo_perfil: finalCode,
          descricao_perfil: finalDescription,
          medida_mm: compNum || 1000,
          quantidade: qtdNum,
          status: 'Inventoriado'
        };

        if (existingPerfil && onUpdatePerfil) {
          await onUpdatePerfil(existingPerfil.id, itemPayload);
          setFeedbackMsg('✨ Perfil atualizado no inventário!');
        } else if (onAddPerfil) {
          await onAddPerfil(itemPayload);
          setFeedbackMsg('✨ Perfil registrado no inventário!');
        }
      } else {
        // Bumper
        const itemPayload: Omit<BumperItem, 'id'> = {
          id_nomus: finalId,
          codigo: finalCode,
          tipo: bumperTipo || (finalCode.toUpperCase().startsWith('OP') ? 'OP' : 'ID'),
          medida_mm: compNum || 1000,
          quantidade: qtdNum
        };

        if (existingBumper && onUpdateBumper) {
          await onUpdateBumper(existingBumper.id, itemPayload);
          setFeedbackMsg('✨ Bumper atualizado no inventário!');
        } else if (onAddBumper) {
          await onAddBumper(itemPayload);
          setFeedbackMsg('✨ Bumper registrado no inventário!');
        }
      }

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
                      Confira as medidas e informações identificadas na etiqueta:
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
                <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-xs text-sm">
                  {idNomus || (cleanCode && !cleanCode.startsWith('{') ? cleanCode : 'Sem ID')}
                </span>
              </div>

              {/* Existing Item Quick Actions */}
              {existingItem && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                    <span className="text-slate-500 font-medium">Cadastrado em:</span>
                    <span className="font-extrabold uppercase bg-blue-100 text-[#1b367c] px-2 py-0.5 rounded text-[11px]">
                      Aba {existingType}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <p>
                      <span className="text-slate-500 font-medium">Código:</span>{' '}
                      <strong className="text-slate-900">
                        {(existingItem as any).codigo_perfil || (existingItem as any).codigo || (existingItem as any).codigo_item}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-500 font-medium">Qtd Atual:</span>{' '}
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
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>Incrementar (+1 un)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveOrReInventoriar}
                      disabled={isSubmitting}
                      className="py-2.5 px-3 bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw size={15} />
                      <span>Atualizar com Novas Medidas</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form to Register or Adjust Scanned Item */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    {existingItem ? 'Detalhes das Medidas da Etiqueta:' : '1. Categoria do Produto:'}
                  </label>
                  {appMode === 'pcp' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold">
                      Modo PCP Ativo
                    </span>
                  )}
                </div>

                {/* Category Selector Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetCategory('geral')}
                    className={`py-2 px-2.5 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetCategory === 'geral'
                        ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Box size={14} />
                    Gerais / Chapas
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetCategory('perfil')}
                    className={`py-2 px-2.5 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                    className={`py-2 px-2.5 text-xs font-extrabold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      targetCategory === 'bumper'
                        ? 'bg-[#1b367c] text-white border-[#1b367c] shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Shield size={14} />
                    Bumpers
                  </button>
                </div>

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
                      placeholder="Ex: 023.0116 ou 70.02.0003"
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
                      placeholder="Ex: CHAPA INOX 304 ESC - M2..."
                      className="w-full h-9 px-2.5 border border-slate-300 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                    />
                  </div>
                </div>

                {/* SPECIFIC DIMENSIONS SECTION: CHAPA / GERAL (3 DIMENSIONS) */}
                {targetCategory === 'geral' && (
                  <div className="space-y-2.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#1b367c] uppercase tracking-wider flex items-center gap-1.5">
                        <Calculator size={15} />
                        Medidas da Chapa / Geral:
                      </span>
                      <span className="text-[11px] text-blue-700 font-extrabold bg-blue-100 px-2 py-0.5 rounded">
                        Comprimento x Largura x Espessura
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Comprimento (mm):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={comprimentoInput}
                          onChange={e => setComprimentoInput(e.target.value)}
                          placeholder="Ex: 1740"
                          className="w-full h-10 px-2.5 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Largura (mm):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={larguraInput}
                          onChange={e => setLarguraInput(e.target.value)}
                          placeholder="Ex: 850"
                          className="w-full h-10 px-2.5 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Espessura (mm):
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={espessuraInput}
                          onChange={e => setEspessuraInput(e.target.value)}
                          placeholder="Ex: 0.5"
                          className="w-full h-10 px-2.5 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>
                    </div>

                    {/* Real-time Area Calculation Badge */}
                    {areaM2Unit > 0 && (
                      <div className="bg-emerald-100/80 border border-emerald-300 rounded-lg p-2.5 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 font-bold">
                        <span>
                          📐 Área da Chapa:{' '}
                          <strong className="text-emerald-900 font-extrabold">
                            {areaM2Unit.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })} m²
                          </strong>
                        </span>
                        <span>
                          Total ({qtdNum} un):{' '}
                          <strong className="text-emerald-900 font-black">
                            {areaM2Total.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 4 })} m²
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Unidade:
                        </label>
                        <select
                          value={unidadeInput}
                          onChange={e => setUnidadeInput(e.target.value)}
                          className="w-full h-9 px-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#1b367c]"
                        >
                          <option value="metros quadrados">metros quadrados (m²)</option>
                          <option value="unidade">unidade (un)</option>
                          <option value="peça">peça (pç)</option>
                          <option value="kg">quilos (kg)</option>
                          <option value="MM">milímetros (MM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Quantidade (Chapas/Itens):
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={quantidadeInput}
                          onChange={e => setQuantidadeInput(parseInt(e.target.value, 10) || 1)}
                          className="w-full h-9 px-2.5 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SPECIFIC DIMENSIONS SECTION: PERFIL */}
                {targetCategory === 'perfil' && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Catálogo Metalrib (Opcional):
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Comprimento / Medida (MM):
                        </label>
                        <input
                          type="number"
                          value={comprimentoInput}
                          onChange={e => setComprimentoInput(e.target.value)}
                          placeholder="Ex: 6000"
                          className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
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
                          className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>
                    </div>

                    {compNum > 0 && (
                      <p className="text-[11px] font-bold text-slate-600 bg-white p-2 rounded border border-slate-200">
                        Total linear: <strong className="text-[#1b367c]">{metrosLinearesTotal.toFixed(2)} metros</strong>
                      </p>
                    )}
                  </div>
                )}

                {/* SPECIFIC DIMENSIONS SECTION: BUMPER */}
                {targetCategory === 'bumper' && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tipo de Bumper:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBumperTipo('ID')}
                            className={`py-2 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                              bumperTipo === 'ID'
                                ? 'bg-[#1b367c] text-white border-[#1b367c]'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            ID (Código)
                          </button>
                          <button
                            type="button"
                            onClick={() => setBumperTipo('OP')}
                            className={`py-2 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                              bumperTipo === 'OP'
                                ? 'bg-[#1b367c] text-white border-[#1b367c]'
                                : 'bg-white text-slate-700 border-slate-300'
                            }`}
                          >
                            OP (Ordem)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Comprimento / Medida (MM):
                        </label>
                        <input
                          type="number"
                          value={comprimentoInput}
                          onChange={e => setComprimentoInput(e.target.value)}
                          placeholder="Ex: 1000"
                          className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Quantidade de Bumpers:
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantidadeInput}
                        onChange={e => setQuantidadeInput(parseInt(e.target.value, 10) || 1)}
                        className="w-full h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-[#1b367c] bg-white"
                      />
                    </div>
                  </div>
                )}

                {/* Final Submit Button */}
                <button
                  type="button"
                  onClick={handleSaveOrReInventoriar}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#1b367c] hover:bg-[#14295e] text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={18} />
                  <span>
                    {isSubmitting
                      ? 'Salvando no Inventário...'
                      : existingItem
                      ? '💾 Atualizar com Todas as Medidas'
                      : '➕ Salvar e Adicionar ao Inventário'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
