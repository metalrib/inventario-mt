import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Tag, QrCode, Scissors, Maximize2, Layers } from 'lucide-react';
import QRCode from 'qrcode';
import { LabelFormat } from '../types';

export interface PrintItem {
  idNomus?: string;
  idNomusOrCode?: string;
  codigoItem?: string;
  descricaoItem?: string;
  medidaFormatted?: string;
  medidaMm?: number;
  descricaoExtra?: string;
  quantidade?: number;
  unidade?: string;
  operador?: string;
  dataFormatted?: string;
}

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemsToPrint?: PrintItem[];
  items?: PrintItem[];
}

// Helper component for previewing QR Code on UI
const QRCodePreview: React.FC<{ value: string; size?: number }> = ({ value, size = 82 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const codeVal = value || '000000';
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, codeVal, {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).catch(err => console.error("QR Code generation error:", err));
    }
  }, [value, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="shrink-0" />;
};

// Helper function to create base64 QR code image for print
async function generateQRCodeBase64(value: string, size = 220): Promise<string> {
  try {
    return await QRCode.toDataURL(value || '000000', {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (e) {
    console.error("Error creating QR Code:", e);
    return "";
  }
}

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({
  isOpen,
  onClose,
  itemsToPrint,
  items
}) => {
  const safeItems = itemsToPrint || items || [];
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [customId, setCustomId] = useState('');
  const [customMedida, setCustomMedida] = useState('');

  // Label format state with persistent memory
  const [labelFormat, setLabelFormat] = useState<LabelFormat>(() => {
    const saved = localStorage.getItem('metalrib_label_format') as LabelFormat;
    if (saved && ['100x50', '100x100_dupla', '100x100_cheia'].includes(saved)) {
      return saved;
    }
    return '100x50';
  });

  const handleSelectFormat = (fmt: LabelFormat) => {
    setLabelFormat(fmt);
    localStorage.setItem('metalrib_label_format', fmt);
  };

  useEffect(() => {
    if (safeItems.length > 0) {
      const first = safeItems[0];
      setCustomId(first?.idNomus || '');
      setCustomMedida(first?.medidaFormatted || (first?.medidaMm ? `${first.medidaMm} MM` : ''));
    }
  }, [safeItems]);

  if (!isOpen || safeItems.length === 0) return null;

  const totalLabelCount = safeItems.length * copiesPerItem;
  const totalSheetsCount = labelFormat === '100x100_dupla'
    ? Math.ceil(totalLabelCount / 2)
    : totalLabelCount;

  const handleExecutePrint = async () => {
    const printArea = document.getElementById("printArea");
    if (!printArea) return;

    // Set body attribute
    document.body.setAttribute('data-label-format', labelFormat);

    // Dynamically inject @page size
    let styleEl = document.getElementById('dynamic-print-page-style') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-page-style';
      document.head.appendChild(styleEl);
    }

    const isSquare = labelFormat === '100x100_dupla' || labelFormat === '100x100_cheia';
    styleEl.innerHTML = `
      @media print {
        @page {
          size: ${isSquare ? '100mm 100mm' : '100mm 50mm'} !important;
          margin: 0mm !important;
        }
      }
    `;

    // Flatten all labels according to copies
    const copies = Math.max(1, copiesPerItem);
    const flatLabels: Array<{
      itemCode: string;
      itemDesc: string;
      displayMedida: string;
      idVal: string;
      operadorVal: string;
      dateVal: string;
      qrImg: string;
    }> = [];

    for (const item of safeItems) {
      const itemCode = item.codigoItem || '';
      const itemDesc = item.descricaoItem || item.descricaoExtra || '';
      const displayMedida = safeItems.length === 1 ? customMedida : (item.medidaFormatted || (item.medidaMm ? `${item.medidaMm} MM` : ''));
      const idVal = safeItems.length === 1 ? customId.trim() : (item.idNomus || '').trim();
      const operadorVal = item.operador || 'Operador Metalrib';
      const dateVal = item.dataFormatted || new Date().toLocaleDateString('pt-BR');

      const payloadObj = {
        v: 1,
        id_nomus: idVal,
        codigo: itemCode,
        desc: itemDesc,
        medida_mm: item.medidaMm || 0,
        medida: displayMedida
      };
      const codeToEncode = JSON.stringify(payloadObj);
      const qrImg = await generateQRCodeBase64(codeToEncode, labelFormat === '100x100_cheia' ? 300 : 200);

      for (let c = 0; c < copies; c++) {
        flatLabels.push({
          itemCode,
          itemDesc,
          displayMedida,
          idVal,
          operadorVal,
          dateVal,
          qrImg
        });
      }
    }

    let html = "";

    const render50Content = (lbl: typeof flatLabels[0]) => `
      <div class="sticker-top-row">
        ${lbl.itemCode ? `<span class="sticker-cod-text">Cód: ${lbl.itemCode}</span>` : '<span></span>'}
      </div>

      <div class="sticker-desc-box">
        <span class="sticker-desc-title">Descrição do Produto:</span>
        <span class="sticker-desc-value">${lbl.itemDesc}</span>
      </div>

      <div class="sticker-mid-row">
        <div class="sticker-qr-container">
          ${lbl.qrImg ? `<img src="${lbl.qrImg}" class="sticker-qr-img" alt="QR Code" />` : ''}
        </div>

        <div class="sticker-right-info">
          ${lbl.displayMedida ? `
            <div class="sticker-medida-group">
              <span class="sticker-small-label">Medida:</span>
              <span class="sticker-medida-value">${lbl.displayMedida}</span>
            </div>
          ` : ''}

          ${lbl.idVal ? `
            <div class="sticker-id-group">
              <span class="sticker-small-label">ID:</span>
              <span class="sticker-id-value">${lbl.idVal}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    if (labelFormat === '100x50') {
      for (const lbl of flatLabels) {
        html += `
          <div class="sticker-container">
            ${render50Content(lbl)}
          </div>
        `;
      }
    } else if (labelFormat === '100x100_dupla') {
      for (let i = 0; i < flatLabels.length; i += 2) {
        const first = flatLabels[i];
        const second = flatLabels[i + 1] || null;

        html += `
          <div class="sticker-sheet-dupla">
            <div class="sticker-half-slot">
              ${render50Content(first)}
            </div>

            <div class="sticker-cut-divider">
              <span class="sticker-cut-label">✂ CORTE AO MEIO ✂</span>
            </div>

            <div class="sticker-half-slot ${second ? '' : 'empty-slot'}">
              ${second ? render50Content(second) : '<span style="font-size:7pt;color:#888888;font-family:sans-serif;font-weight:bold;text-transform:uppercase;">[ 2ª Metade Livre ]</span>'}
            </div>
          </div>
        `;
      }
    } else if (labelFormat === '100x100_cheia') {
      for (const lbl of flatLabels) {
        html += `
          <div class="sticker-sheet-cheia">
            <div class="sticker-cheia-top">
              <span class="sticker-cheia-cod">${lbl.itemCode ? `CÓD: ${lbl.itemCode}` : 'IDENTIFICAÇÃO'}</span>
              <span class="sticker-cheia-badge">METALRIB • PCP</span>
            </div>

            <div class="sticker-cheia-desc-box">
              <span class="sticker-cheia-desc-title">Descrição do Produto:</span>
              <span class="sticker-cheia-desc-val">${lbl.itemDesc || 'PRODUTO NÃO ESPECIFICADO'}</span>
            </div>

            <div class="sticker-cheia-mid">
              <div class="sticker-qr-container">
                ${lbl.qrImg ? `<img src="${lbl.qrImg}" class="sticker-cheia-qr" alt="QR Code" />` : ''}
              </div>

              <div class="sticker-cheia-details">
                ${lbl.displayMedida ? `
                  <div class="sticker-medida-group">
                    <span class="sticker-small-label">MEDIDA (MM):</span>
                    <span class="sticker-cheia-medida-val">${lbl.displayMedida}</span>
                  </div>
                ` : ''}

                ${lbl.idVal ? `
                  <div class="sticker-id-group">
                    <span class="sticker-small-label">ID DO PRODUTO:</span>
                    <span class="sticker-cheia-id-val">${lbl.idVal}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="sticker-cheia-footer">
              <span>OP: <strong>${lbl.operadorVal}</strong></span>
              <span>DATA: <strong>${lbl.dateVal}</strong></span>
            </div>
          </div>
        `;
      }
    }

    printArea.innerHTML = html;

    // Wait for all base64 QR Code images to be loaded
    const images = Array.from(printArea.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    // Force DOM layout reflow
    void printArea.offsetHeight;

    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 300)));

    window.print();
  };

  const previewItem = safeItems[0] || {};
  const previewItemCode = previewItem.codigoItem || '';
  const previewDesc = previewItem.descricaoItem || previewItem.descricaoExtra || '';
  const previewMedida = safeItems.length === 1 ? customMedida : (previewItem.medidaFormatted || (previewItem.medidaMm ? `${previewItem.medidaMm} MM` : ''));
  const previewId = safeItems.length === 1 ? customId.trim() : (previewItem.idNomus || '').trim();
  const previewOperador = previewItem.operador || 'Operador Metalrib';
  const previewDate = previewItem.dataFormatted || new Date().toLocaleDateString('pt-BR');

  const previewEncodeValue = JSON.stringify({
    v: 1,
    id_nomus: previewId,
    codigo: previewItemCode,
    desc: previewDesc,
    medida_mm: previewItem.medidaMm || 0,
    medida: previewMedida
  });

  // Second preview item (for 100x100 dupla preview)
  const secondItem = safeItems.length > 1 ? safeItems[1] : (copiesPerItem > 1 ? previewItem : null);
  const secondCode = secondItem?.codigoItem || previewItemCode;
  const secondDesc = secondItem?.descricaoItem || secondItem?.descricaoExtra || previewDesc;
  const secondMedida = secondItem ? (secondItem.medidaFormatted || (secondItem.medidaMm ? `${secondItem.medidaMm} MM` : previewMedida)) : previewMedida;
  const secondId = secondItem ? (secondItem.idNomus || previewId) : previewId;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-[#1b367c]" />
            <div>
              <h2 className="text-base font-extrabold text-[#1b367c] leading-tight">
                Emissão & Impressão de Etiquetas Térmicas
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Selecione o tamanho da folha da sua impressora
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 bg-white overflow-y-auto max-h-[82vh]">

          {/* Format Selector */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers size={14} className="text-[#1b367c]" />
                Tamanho da Bobina / Formato:
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                Salvo automaticamente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Option 1: 100x50mm */}
              <button
                type="button"
                onClick={() => handleSelectFormat('100x50')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  labelFormat === '100x50'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-sm ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs">100x50 mm</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                    labelFormat === '100x50' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Padrão
                  </span>
                </div>
                <span className={`text-[10px] ${labelFormat === '100x50' ? 'text-blue-100' : 'text-slate-500'}`}>
                  1 etiqueta por folha (fábrica)
                </span>
              </button>

              {/* Option 2: 100x100mm Dupla */}
              <button
                type="button"
                onClick={() => handleSelectFormat('100x100_dupla')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  labelFormat === '100x100_dupla'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-sm ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs flex items-center gap-1">
                    <Scissors size={12} />
                    100x100 Dupla
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                    labelFormat === '100x100_dupla' ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    PCP 2 em 1
                  </span>
                </div>
                <span className={`text-[10px] ${labelFormat === '100x100_dupla' ? 'text-blue-100' : 'text-slate-500'}`}>
                  2 etiquetas de 50mm por folha
                </span>
              </button>

              {/* Option 3: 100x100mm Cheia */}
              <button
                type="button"
                onClick={() => handleSelectFormat('100x100_cheia')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  labelFormat === '100x100_cheia'
                    ? 'bg-[#1b367c] text-white border-blue-900 shadow-sm ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs flex items-center gap-1">
                    <Maximize2 size={12} />
                    100x100 Cheia
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                    labelFormat === '100x100_cheia' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Paletes
                  </span>
                </div>
                <span className={`text-[10px] ${labelFormat === '100x100_cheia' ? 'text-blue-100' : 'text-slate-500'}`}>
                  1 etiqueta grande ampliada
                </span>
              </button>
            </div>
          </div>

          {/* Thermal Label Live Visual Replica */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Pré-visualização da Impressão ({safeItems.length} modelo(s))
              </span>
              <span className="text-[10px] bg-[#1b367c] text-white font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <QrCode size={12} />
                {labelFormat === '100x50' ? '100mm x 50mm' : labelFormat === '100x100_dupla' ? '100mm x 100mm (2 em 1)' : '100mm x 100mm (Cheia)'}
              </span>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex items-center justify-center overflow-hidden">
              
              {/* PREVIEW FORMAT 1: 100x50mm Standard */}
              {labelFormat === '100x50' && (
                <div className="w-[330px] h-[175px] bg-white border-2 border-slate-900 rounded-lg p-3 flex flex-col justify-between items-stretch text-left shadow-md font-sans text-slate-900">
                  {/* Top Row */}
                  <div className="w-full flex justify-between items-center border-b-2 border-slate-900 pb-1">
                    {previewItemCode ? (
                      <span className="font-mono font-black text-xs text-slate-900">
                        Cód: {previewItemCode}
                      </span>
                    ) : (
                      <span></span>
                    )}
                  </div>

                  {/* Description Box */}
                  <div className="w-full py-1 border-b border-slate-300 flex flex-col">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-wider">
                      Descrição do Produto:
                    </span>
                    <span className="text-[11px] font-black text-slate-900 uppercase leading-tight line-clamp-2">
                      {previewDesc || 'DESCRIÇÃO DO PRODUTO'}
                    </span>
                  </div>

                  {/* Middle Row: QR Code + Medida & ID */}
                  <div className="py-1 flex items-center justify-between w-full gap-2 flex-1">
                    <div className="flex items-center justify-center">
                      <QRCodePreview value={previewEncodeValue} size={78} />
                    </div>

                    <div className="flex flex-col items-end text-right justify-center gap-1.5 flex-1">
                      {previewMedida ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-slate-600 uppercase">
                            Medida:
                          </span>
                          <span className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                            {previewMedida}
                          </span>
                        </div>
                      ) : null}

                      {previewId ? (
                        <div className="flex flex-col items-end pt-0.5">
                          <span className="text-[8px] font-black text-slate-600 uppercase">
                            ID:
                          </span>
                          <span className="text-xs font-mono font-black tracking-wider text-slate-900 leading-tight">
                            {previewId}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* PREVIEW FORMAT 2: 100x100mm Dupla (2 em 1) */}
              {labelFormat === '100x100_dupla' && (
                <div className="w-[330px] h-[330px] bg-white border-2 border-slate-900 rounded-lg flex flex-col justify-between shadow-md font-sans text-slate-900 overflow-hidden">
                  {/* Top Half Slot (100x50) */}
                  <div className="p-3 h-[164px] flex flex-col justify-between">
                    <div className="w-full flex justify-between items-center border-b-2 border-slate-900 pb-0.5">
                      <span className="font-mono font-black text-[11px] text-slate-900">
                        {previewItemCode ? `Cód: ${previewItemCode}` : ''}
                      </span>
                      <span className="text-[8px] font-black text-slate-500 uppercase">
                        Etiqueta 1
                      </span>
                    </div>

                    <div className="w-full py-0.5 border-b border-slate-200 flex flex-col">
                      <span className="text-[7px] font-black text-slate-600 uppercase">
                        Descrição:
                      </span>
                      <span className="text-[10px] font-black text-slate-900 uppercase leading-tight line-clamp-1">
                        {previewDesc || 'DESCRIÇÃO DO PRODUTO'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full gap-2 flex-1 pt-0.5">
                      <QRCodePreview value={previewEncodeValue} size={68} />
                      <div className="flex flex-col items-end text-right justify-center gap-1">
                        {previewMedida && (
                          <div>
                            <span className="text-[7px] font-black text-slate-600 uppercase block">Medida:</span>
                            <span className="text-xs font-black text-slate-900">{previewMedida}</span>
                          </div>
                        )}
                        {previewId && (
                          <div>
                            <span className="text-[7px] font-black text-slate-600 uppercase block">ID:</span>
                            <span className="text-[11px] font-mono font-black text-slate-900">{previewId}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cut Divider */}
                  <div className="w-full h-4 border-y border-dashed border-slate-500 bg-slate-50 flex items-center justify-center relative">
                    <span className="text-[8px] font-bold font-mono text-slate-600 tracking-wider flex items-center gap-1">
                      <Scissors size={10} /> CORTE AO MEIO <Scissors size={10} />
                    </span>
                  </div>

                  {/* Bottom Half Slot (100x50) */}
                  {secondItem ? (
                    <div className="p-3 h-[164px] flex flex-col justify-between">
                      <div className="w-full flex justify-between items-center border-b-2 border-slate-900 pb-0.5">
                        <span className="font-mono font-black text-[11px] text-slate-900">
                          {secondCode ? `Cód: ${secondCode}` : ''}
                        </span>
                        <span className="text-[8px] font-black text-slate-500 uppercase">
                          Etiqueta 2
                        </span>
                      </div>

                      <div className="w-full py-0.5 border-b border-slate-200 flex flex-col">
                        <span className="text-[7px] font-black text-slate-600 uppercase">
                          Descrição:
                        </span>
                        <span className="text-[10px] font-black text-slate-900 uppercase leading-tight line-clamp-1">
                          {secondDesc || 'DESCRIÇÃO DO PRODUTO'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between w-full gap-2 flex-1 pt-0.5">
                        <QRCodePreview value={secondItem ? JSON.stringify({
                          v: 1,
                          id_nomus: secondId,
                          codigo: secondCode,
                          desc: secondDesc,
                          medida_mm: secondItem.medidaMm || 0,
                          medida: secondMedida
                        }) : previewEncodeValue} size={68} />
                        <div className="flex flex-col items-end text-right justify-center gap-1">
                          {secondMedida && (
                            <div>
                              <span className="text-[7px] font-black text-slate-600 uppercase block">Medida:</span>
                              <span className="text-xs font-black text-slate-900">{secondMedida}</span>
                            </div>
                          )}
                          {secondId && (
                            <div>
                              <span className="text-[7px] font-black text-slate-600 uppercase block">ID:</span>
                              <span className="text-[11px] font-mono font-black text-slate-900">{secondId}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[164px] bg-slate-50 border-2 border-dashed border-slate-300 m-2 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-xs font-extrabold text-slate-500 uppercase">
                        2ª Metade Livre
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                        Como só há 1 etiqueta a imprimir, esta metade fica em branco para corte sem gastar papel extra nem tinta.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* PREVIEW FORMAT 3: 100x100mm Cheia (Paletes) */}
              {labelFormat === '100x100_cheia' && (
                <div className="w-[330px] h-[330px] bg-white border-2 border-slate-900 rounded-lg p-4 flex flex-col justify-between shadow-md font-sans text-slate-900">
                  {/* Top */}
                  <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                    <span className="font-mono font-black text-sm text-slate-900">
                      {previewItemCode ? `CÓD: ${previewItemCode}` : 'IDENTIFICAÇÃO'}
                    </span>
                    <span className="text-[10px] bg-slate-900 text-white font-black px-2 py-0.5 rounded">
                      METALRIB • PCP
                    </span>
                  </div>

                  {/* Descrição */}
                  <div className="py-2 border-b-2 border-slate-900 flex flex-col">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">
                      Descrição do Produto:
                    </span>
                    <span className="text-sm font-black text-slate-900 uppercase leading-snug line-clamp-2">
                      {previewDesc || 'DESCRIÇÃO DO PRODUTO'}
                    </span>
                  </div>

                  {/* Mid */}
                  <div className="py-2 flex items-center justify-between gap-3 flex-1">
                    <QRCodePreview value={previewEncodeValue} size={105} />
                    <div className="flex flex-col items-end text-right justify-center gap-2">
                      {previewMedida && (
                        <div>
                          <span className="text-[9px] font-black text-slate-600 uppercase block">MEDIDA (MM):</span>
                          <span className="text-base font-black text-slate-900 leading-none">{previewMedida}</span>
                        </div>
                      )}
                      {previewId && (
                        <div>
                          <span className="text-[9px] font-black text-slate-600 uppercase block">ID DO PRODUTO:</span>
                          <span className="text-xs font-mono font-black text-slate-900 tracking-wider leading-none">{previewId}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t-2 border-slate-900 pt-1.5 flex justify-between items-center text-[10px] font-extrabold text-slate-700">
                    <span>OP: <strong>{previewOperador}</strong></span>
                    <span>DATA: <strong>{previewDate}</strong></span>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Quick Edit Inputs */}
          {safeItems.length === 1 && (
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  ID (Aparece se preenchido)
                </label>
                <input
                  type="text"
                  value={customId}
                  onChange={e => setCustomId(e.target.value)}
                  placeholder="Se não tiver, fica em branco"
                  className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-[#1b367c] bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Medida (Aparece se preenchido)
                </label>
                <input
                  type="text"
                  value={customMedida}
                  onChange={e => setCustomMedida(e.target.value)}
                  placeholder="Ex: 3000 x 1200 x 12.5 MM"
                  className="w-full h-9 px-2.5 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:border-[#1b367c] bg-white"
                />
              </div>
            </div>
          )}

          {/* Copies counter & Totals */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase block">
                Quantidade de Cópias
              </label>
              <span className="text-[11px] text-slate-500">
                {labelFormat === '100x100_dupla'
                  ? `Folhas térmicas 100x100: ${totalSheetsCount} folha(s)`
                  : `Total: ${totalLabelCount} etiqueta(s)`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={copiesPerItem}
                onChange={e => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="100"
                className="w-20 h-9 px-2 border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#1b367c] bg-white"
              />
              <span className="text-xs text-slate-700 font-extrabold">
                {totalLabelCount} etiqueta(s)
              </span>
            </div>
          </div>

          {/* Thermal Printer Settings Advice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed">
            <p className="font-extrabold text-amber-900 uppercase text-[10px] mb-1">
              ⚠️ Configuração da Impressora Térmica (Zebra / Elgin):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 font-medium">
              <li>
                Tamanho do Papel: <strong>{labelFormat === '100x50' ? '100mm x 50mm' : '100mm x 100mm'}</strong>
              </li>
              {labelFormat === '100x100_dupla' && (
                <li>
                  Modo 2 em 1 PCP: Duas etiquetas montadas na mesma folha com linha guia pontilhada (✂).
                </li>
              )}
              {labelFormat === '100x100_cheia' && (
                <li>
                  Modo Cheio PCP: Etiqueta de 100x100mm ampliada para identificação de fardos e paletes.
                </li>
              )}
              <li>Margens: selecione <strong>Nenhuma (None)</strong> no navegador</li>
              <li>Desmarque a caixa <strong>"Cabeçalhos e rodapés"</strong></li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-600 font-semibold">
            {labelFormat === '100x100_dupla' ? (
              <span><strong>{totalLabelCount}</strong> etiqueta(s) em <strong>{totalSheetsCount}</strong> folha(s) 100x100mm</span>
            ) : (
              <span><strong>{totalLabelCount}</strong> etiqueta(s) / folha(s)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleExecutePrint}
              className="bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir ({totalLabelCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
