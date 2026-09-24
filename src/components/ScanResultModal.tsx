import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  Plus, 
  AlertTriangle, 
  QrCode, 
  Layers, 
  Shield, 
  Box, 
  Tag, 
  ArrowRight, 
  RefreshCw, 
  Hash, 
  Calculator,
  Camera,
  PlusCircle,
  Clock,
  ListPlus
} from 'lucide-react';
import { PerfilItem, BumperItem, GeralItem, ProductCatalogItem, AppMode } from '../types';
import { CATALOGO_PERFIS } from '../data/catalog';

interface ScanResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanNext?: () => void;
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

    if (parsedJson.unidade) {
      parsedUnidade = String(parsedJson.unidade);
    }
  } else {
    // 2. Parse Multiline Key-Value or Nomus Label Text
    const lines = text.split(/[\r\n]+/);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('id nomus') || lower.includes('id:') || lower.startsWith('id ')) {
        const parts = line.split(/[:=]/);
        if (parts[1]) parsedIdNomus = parts[1].trim();
      } else if (lower.includes('cód') || lower.includes('cod:') || lower.includes('codigo:')) {
        const parts = line.split(/[:=]/);
        if (parts[1]) parsedCodigo = parts[1].trim();
      } else if (lower.includes('desc') || lower.includes('descrição:') || lower.includes('descricao:')) {
        const parts = line.split(/[:=]/);
        if (parts[1]) parsedDesc = parts[1].trim();
      } else if (lower.includes('medida:') || lower.includes('medida') || lower.includes('dimens')) {
        const parts = line.split(/[:=]/);
        const val = parts[1] ? parts[1].trim() : line;
        const dims = parseDimensionString(val);
        if (dims.comprimento > 0) parsedComprimentoMm = dims.comprimento;
        if (dims.largura > 0) parsedLarguraMm = dims.largura;
        if (dims.espessura > 0) parsedEspessuraMm = dims.espessura;
      } else if (lower.includes('qtd') || lower.includes('quantidade:')) {
        const parts = line.split(/[:=]/);
        if (parts[1]) {
          const match = parts[1].match(/\d+/);
          if (match) parsedQtd = parseInt(match[0], 10);
        }
      }
    }

    // 3. Regex extractions if key-value wasn't cleanly split
    if (!parsedIdNomus) {
      const nomusMatch = text.match(/\b\d{4}\.\d{2}\.\d{2}\.\d{4,}\b/);
      if (nomusMatch) {
        parsedIdNomus = nomusMatch[0];
      }
    }

    if (!parsedCodigo) {
      const codMatch = text.match(/C[oó]d\.?:\s*([A-Za-z0-9._-]+)/i);
      if (codMatch) {
        parsedCodigo = codMatch[1].trim();
      }
    }

    if (!parsedComprimentoMm) {
      const dimMatch = text.match(/(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+(?:[.,]\d+)?)(?:\s*[xX*]\s*(\d+(?:[.,]\d+)?))?/);
      if (dimMatch) {
        parsedComprimentoMm = parseFloat(dimMatch[1].replace(',', '.')) || 0;
        parsedLarguraMm = parseFloat(dimMatch[2].replace(',', '.')) || 0;
        if (dimMatch[3]) {
          parsedEspessuraMm = parseFloat(dimMatch[3].replace(',', '.')) || 0;
        }
      } else {
        const singleMm = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|mil[ií]metros)/i);
        if (singleMm) {
          parsedComprimentoMm = parseFloat(singleMm[1].replace(',', '.')) || 0;
        }
      }
    }

    // 4. Single code or plain string fallback
    if (!parsedIdNomus && !parsedCodigo) {
      if (/^\d{4}\.\d{2}\.\d{2}\.\d{4,}$/.test(text)) {
        parsedIdNomus = text;
      } else if (text.length <= 40 && !text.includes('\n')) {
        parsedCodigo = text;
      }
    }
  }

  // 5. Categoria Hint detection
  const combinedText = `${parsedCodigo} ${parsedDesc} ${text}`.toUpperCase();
  if (combinedText.includes('BUMPER') || parsedCodigo.toUpperCase().startsWith('OP')) {
    parsedCategoriaHint = 'bumper';
  } else if (
    combinedText.includes('CHAPA') || 
    combinedText.includes('PLACA') || 
    combinedText.includes('FQ') || 
    combinedText.includes('M2') || 
    parsedLarguraMm > 0
  ) {
    parsedCategoriaHint = 'geral';
  } else if (combinedText.includes('PERFIL') || combinedText.includes('TR-')) {
    parsedCategoriaHint = 'perfil';
  }

  return {
    idNomus: parsedIdNomus,
    codigoItem: parsedCodigo,
    descItem: parsedDesc,
    comprimentoMm: parsedComprimentoMm,
    larguraMm: parsedLarguraMm,
    espessuraMm: parsedEspessuraMm,
    medidaMm: parsedComprimentoMm,
    quantidade: parsedQtd > 0 ? parsedQtd : 1,
    unidade: parsedUnidade || (parsedLarguraMm > 0 ? 'm²' : 'unidade'),
    categoriaHint: parsedCategoriaHint,
    rawText: text
  };
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  isOpen,
  onClose,
  onScanNext,
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
  const [idNomusInput, setIdNomusInput] = useState<string>('');
  
  // Dimensions
  const [comprimentoInput, setComprimentoInput] = useState('');
  const [larguraInput, setLarguraInput] = useState('');
  const [espessuraInput, setEspessuraInput] = useState('');
  const [unidadeInput, setUnidadeInput] = useState('m²');
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

  // Search existing items in inventory for reference (informational only - do NOT replace by default!)
  const cleanId = (idNomus || '').trim().toLowerCase();
  const cleanCode = (codigoItem || '').trim().toLowerCase();

  const matchingPerfis = safePerfis.filter(p => 
    (cleanId && (p.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (p.codigo_perfil || '').trim().toLowerCase() === cleanCode)
  );

  const matchingBumpers = safeBumpers.filter(b => 
    (cleanId && (b.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (b.codigo || '').trim().toLowerCase() === cleanCode)
  );

  const matchingGerais = safeGerais.filter(g => 
    (cleanId && (g.id_nomus || '').trim().toLowerCase() === cleanId) ||
    (cleanCode && (g.codigo_item || '').trim().toLowerCase() === cleanCode)
  );

  const existingCount = matchingPerfis.length + matchingBumpers.length + matchingGerais.length;
  const existingReferenceItem = matchingPerfis[0] || matchingBumpers[0] || matchingGerais[0];
  const existingReferenceType = matchingPerfis[0] ? 'perfis' : matchingBumpers[0] ? 'bumpers' : matchingGerais[0] ? 'gerais' : null;

  useEffect(() => {
    if (scannedCode) {
      setFeedbackMsg(null);
      setQuantidadeInput(quantidade > 0 ? quantidade : 1);
      setIdNomusInput(idNomus || '');

      // 1. Initial Category determination
      let category: 'perfil' | 'bumper' | 'geral' = 'geral';

      if (categoriaHint === 'bumper' || appMode === 'pcp') {
        category = 'bumper';
      } else if (categoriaHint === 'perfil') {
        category = 'perfil';
      } else if (categoriaHint === 'geral') {
        category = 'geral';
      } else if (existingReferenceType) {
        category = existingReferenceType === 'bumpers' ? 'bumper' : existingReferenceType === 'perfis' ? 'perfil' : 'geral';
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

      // If dimensions were not explicitly in the QR, fallback to catalog or matched item
      if (!initialComp && existingReferenceItem) {
        if ('comprimento_mm' in existingReferenceItem && existingReferenceItem.comprimento_mm) {
          initialComp = String(existingReferenceItem.comprimento_mm);
        } else if ('medida_mm' in existingReferenceItem && (existingReferenceItem as any).medida_mm) {
          initialComp = String((existingReferenceItem as any).medida_mm);
        }
        if ('largura_mm' in existingReferenceItem && existingReferenceItem.largura_mm && !initialLarg) {
          initialLarg = String(existingReferenceItem.largura_mm);
        }
        if ('espessura_mm' in existingReferenceItem && existingReferenceItem.espessura_mm && !initialEsp) {
          initialEsp = String(existingReferenceItem.espessura_mm);
        }
      }

      setComprimentoInput(initialComp);
      setLarguraInput(initialLarg);
      setEspessuraInput(initialEsp);
      setUnidadeInput(unidade || (category === 'geral' ? 'm²' : 'unidade'));

      // 3. Match code against catalog
      const codeToMatch = codigoItem || (existingReferenceItem ? (
        (existingReferenceItem as any).codigo_perfil || (existingReferenceItem as any).codigo || (existingReferenceItem as any).codigo_item
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

  // PRIMARY ACTION: Always add as a NEW entry to the inventory list!
  const handleAddNewToInventory = async (scanNext: boolean = false) => {
    setIsSubmitting(true);
    try {
      const finalId = idNomusInput.trim() || idNomus || (scannedCode && scannedCode.includes('.') && !scannedCode.startsWith('{') ? scannedCode : `ID-${Date.now().toString().slice(-6)}`);
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
          unidade: unidadeInput || 'm²'
        };

        if (onAddGeral) {
          await onAddGeral(itemPayload);
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

        if (onAddPerfil) {
          await onAddPerfil(itemPayload);
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

        if (onAddBumper) {
          await onAddBumper(itemPayload);
        }
      }

      setFeedbackMsg(`✅ Inserido no inventário como novo registro (+${qtdNum} un)!`);

      setTimeout(() => {
        setFeedbackMsg(null);
        if (scanNext && onScanNext) {
          onScanNext();
        } else {
          onClose();
          if (onNavigateToTab) {
            onNavigateToTab(targetCategory === 'perfil' ? 'perfis' : targetCategory === 'bumper' ? 'bumpers' : 'gerais');
          }
        }
      }, scanNext ? 600 : 900);
    } catch (err) {
      console.error("Save error:", err);
      setFeedbackMsg('❌ Erro ao adicionar ao inventário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OPTIONAL SECONDARY ACTION: Sum quantity to previously existing record
  const handleIncrementExisting = async () => {
    if (!existingReferenceItem) return;
    setIsSubmitting(true);
    try {
      if (matchingPerfis.length > 0 && onIncrementPerfil) {
        const target = matchingPerfis[0];
        await onIncrementPerfil(target.id, target.quantidade + qtdNum);
      } else if (matchingBumpers.length > 0 && onIncrementBumper) {
        const target = matchingBumpers[0];
        await onIncrementBumper(target.id, target.quantidade + qtdNum);
      } else if (matchingGerais.length > 0 && onIncrementGeral) {
        const target = matchingGerais[0];
        await onIncrementGeral(target.id, target.quantidade + qtdNum);
      }
      setFeedbackMsg(`✅ Quantidade somada ao registro existente (+${qtdNum} un)!`);
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
        if (existingReferenceType && onNavigateToTab) {
          onNavigateToTab(existingReferenceType);
        }
      }, 1000);
    } catch (err) {
      console.error("Increment error:", err);
      setFeedbackMsg('❌ Erro ao atualizar quantidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // OPTIONAL SECONDARY ACTION: Explicitly overwrite/update previous record
  const handleOverwriteExisting = async () => {
    if (!existingReferenceItem) return;
    setIsSubmitting(true);
    try {
      const finalId = idNomusInput.trim() || idNomus || (existingReferenceItem as any).id_nomus || '';
      const finalCode = customCodigo.trim() || (existingReferenceItem as any).codigo_perfil || (existingReferenceItem as any).codigo || (existingReferenceItem as any).codigo_item;
      const finalDesc = customDesc.trim() || (existingReferenceItem as any).descricao_perfil || (existingReferenceItem as any).descricao_item || '';

      if (targetCategory === 'geral' && matchingGerais[0] && onUpdateGeral) {
        await onUpdateGeral(matchingGerais[0].id, {
          id_nomus: finalId,
          codigo_item: finalCode,
          descricao_item: finalDesc,
          comprimento_mm: compNum,
          largura_mm: largNum,
          espessura_mm: espNum,
          quantidade: qtdNum,
          unidade: unidadeInput
        });
      } else if (targetCategory === 'perfil' && matchingPerfis[0] && onUpdatePerfil) {
        await onUpdatePerfil(matchingPerfis[0].id, {
          id_nomus: finalId,
          codigo_perfil: finalCode,
          descricao_perfil: finalDesc,
          medida_mm: compNum,
          quantidade: qtdNum
        });
      } else if (matchingBumpers[0] && onUpdateBumper) {
        await onUpdateBumper(matchingBumpers[0].id, {
          id_nomus: finalId,
          codigo: finalCode,
          medida_mm: compNum,
          quantidade: qtdNum,
          tipo: bumperTipo
        });
      }
      setFeedbackMsg('✨ Registro anterior atualizado com sucesso!');
      setTimeout(() => {
        setFeedbackMsg(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Overwrite error:", err);
      setFeedbackMsg('❌ Erro ao substituir registro.');
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
            <span>Coleta de Inventário - Leitura de Etiqueta</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {feedbackMsg ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold text-center text-sm flex flex-col items-center gap-3 animate-in fade-in">
              <CheckCircle size={40} className="text-emerald-600 animate-bounce" />
              <span className="text-base font-extrabold">{feedbackMsg}</span>
              <p className="text-xs text-emerald-700 font-medium">Os dados foram gravados na lista de inventário.</p>
            </div>
          ) : (
            <>
              {/* Informational Status Card */}
              {existingCount > 0 ? (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-amber-950 text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-amber-950 text-sm">
                        Produto já possui {existingCount} registro(s) no inventário
                      </p>
                      <p className="text-amber-800 font-medium leading-relaxed mt-0.5">
                        Como isto é um inventário físico, cada etiqueta escaneada entrará como um <strong>novo registro independente</strong> na lista.
                      </p>
                    </div>
                  </div>

                  {/* Secondary options if user deliberately wants to sum or overwrite */}
                  <div className="pt-1.5 border-t border-amber-200/80 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-900">Ações alternativas:</span>
                    <button
                      type="button"
                      onClick={handleIncrementExisting}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Somar +{qtdNum} ao anterior
                    </button>
                    <button
                      type="button"
                      onClick={handleOverwriteExisting}
                      disabled={isSubmitting}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Substituir anterior
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3 text-emerald-950 text-xs">
                  <Tag size={20} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-sm text-emerald-950">
                      Etiqueta Lida com Sucesso!
                    </p>
                    <p className="text-slate-600 font-medium mt-0.5">
                      As medidas foram identificadas. O item será adicionado à sua lista de inventário.
                    </p>
                  </div>
                </div>
              )}

              {/* Tag / ID Nomus info badge */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-extrabold text-[#1b367c]">
                  <Hash size={16} className="text-amber-600" />
                  <span>ID Nomus / Etiqueta:</span>
                </div>
                <input
                  type="text"
                  value={idNomusInput}
                  onChange={e => setIdNomusInput(e.target.value)}
                  placeholder="ID da Etiqueta"
                  className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-300 text-xs text-right max-w-[200px]"
                />
              </div>

              {/* Form to Register Scanned Item */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Categoria do Produto:
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
                          <option value="m²">metros quadrados (m²)</option>
                          <option value="unidade">unidade (un)</option>
                          <option value="peça">peça (pç)</option>
                          <option value="kg">quilos (kg)</option>
                          <option value="MM">milímetros (MM)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Quantidade a Inserir:
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

                {/* ACTION BUTTONS: ALWAYS ADD TO INVENTORY LIST */}
                <div className="space-y-2 pt-2">
                  {/* Continuous scan button (fast workflow for inventory) */}
                  <button
                    type="button"
                    onClick={() => handleAddNewToInventory(true)}
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Camera size={18} />
                    <span>{isSubmitting ? 'Salvando...' : 'Salvar e Escanear Próximo Item'}</span>
                  </button>

                  {/* Standard Add button (adds new row and goes to list) */}
                  <button
                    type="button"
                    onClick={() => handleAddNewToInventory(false)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#1b367c] hover:bg-[#14295e] active:bg-[#0e1d44] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <ListPlus size={16} />
                    <span>Adicionar à Lista de Inventário e Visualizar</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
