import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Tag, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

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
  itemsToPrint: PrintItem[];
}

// Helper component for previewing QR Code on UI
const QRCodePreview: React.FC<{ value: string }> = ({ value }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const codeVal = value || '000000';
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, codeVal, {
        width: 82,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      }).catch(err => console.error("QR Code generation error:", err));
    }
  }, [value]);

  return <canvas ref={canvasRef} className="w-[82px] h-[82px]" />;
};

// Helper function to create base64 QR code image for print
async function generateQRCodeBase64(value: string): Promise<string> {
  try {
    return await QRCode.toDataURL(value || '000000', {
      width: 200,
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
  itemsToPrint
}) => {
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const [customId, setCustomId] = useState('');
  const [customMedida, setCustomMedida] = useState('');

  useEffect(() => {
    if (itemsToPrint.length > 0) {
      const first = itemsToPrint[0];
      setCustomId(first.idNomus || '');
      setCustomMedida(first.medidaFormatted || (first.medidaMm ? `${first.medidaMm} MM` : ''));
    }
  }, [itemsToPrint]);

  if (!isOpen || itemsToPrint.length === 0) return null;

  const handleExecutePrint = async () => {
    const printArea = document.getElementById("printArea");
    if (!printArea) return;

    let html = "";
    const copies = Math.max(1, copiesPerItem);

    for (const item of itemsToPrint) {
      const itemCode = item.codigoItem || '';
      const itemDesc = item.descricaoItem || item.descricaoExtra || '';
      const displayMedida = itemsToPrint.length === 1 ? customMedida : (item.medidaFormatted || (item.medidaMm ? `${item.medidaMm} MM` : ''));
      const idVal = itemsToPrint.length === 1 ? customId.trim() : (item.idNomus || '').trim();
      
      const payloadObj = {
        v: 1,
        id_nomus: idVal,
        codigo: itemCode,
        desc: itemDesc,
        medida_mm: item.medidaMm || 0,
        medida: displayMedida
      };
      const codeToEncode = JSON.stringify(payloadObj);

      const qrImg = await generateQRCodeBase64(codeToEncode);

      for (let c = 0; c < copies; c++) {
        html += `
          <div class="sticker-container">
            <div class="sticker-top-row">
              ${itemCode ? `<span class="sticker-cod-text">Cód: ${itemCode}</span>` : '<span></span>'}
            </div>

            <div class="sticker-desc-box">
              <span class="sticker-desc-title">Descrição do Produto:</span>
              <span class="sticker-desc-value">${itemDesc}</span>
            </div>

            <div class="sticker-mid-row">
              <div class="sticker-qr-container">
                ${qrImg ? `<img src="${qrImg}" class="sticker-qr-img" alt="QR Code" />` : ''}
              </div>

              <div class="sticker-right-info">
                ${displayMedida ? `
                  <div class="sticker-medida-group">
                    <span class="sticker-small-label">Medida:</span>
                    <span class="sticker-medida-value">${displayMedida}</span>
                  </div>
                ` : ''}

                ${idVal ? `
                  <div class="sticker-id-group">
                    <span class="sticker-small-label">ID:</span>
                    <span class="sticker-id-value">${idVal}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }
    }

    printArea.innerHTML = html;
    
    // Wait for all base64 QR Code images to be loaded by the browser rendering engine
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

    // Double frame delay so the browser repaints the print container before print preview snapshot
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 300)));

    window.print();
  };

  const previewItem = itemsToPrint[0];
  const previewItemCode = previewItem.codigoItem || '';
  const previewDesc = previewItem.descricaoItem || previewItem.descricaoExtra || '';
  const previewMedida = itemsToPrint.length === 1 ? customMedida : (previewItem.medidaFormatted || (previewItem.medidaMm ? `${previewItem.medidaMm} MM` : ''));
  const previewId = itemsToPrint.length === 1 ? customId.trim() : (previewItem.idNomus || '').trim();
  const previewEncodeValue = JSON.stringify({
    v: 1,
    id_nomus: previewId,
    codigo: previewItemCode,
    desc: previewDesc,
    medida_mm: previewItem.medidaMm || 0,
    medida: previewMedida
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-[#1b367c]" />
            <h2 className="text-base font-extrabold text-[#1b367c]">
              Etiqueta Térmica QR Code (100mm x 50mm)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-4 bg-white overflow-y-auto max-h-[80vh]">

          {/* Thermal Label Live Visual Replica */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase">
                Pré-visualização da Etiqueta ({itemsToPrint.length} modelo(s))
              </span>
              <span className="text-[10px] bg-[#1b367c] text-white font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <QrCode size={12} />
                100mm x 50mm
              </span>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex items-center justify-center">
              {/* Sticker 100x50 Exact Scale Replica */}
              <div className="w-[330px] h-[175px] bg-white border-2 border-slate-900 rounded-lg p-3 flex flex-col justify-between items-stretch text-left shadow-md font-sans text-slate-900">
                
                {/* Top Row: Cód */}
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

                {/* Middle Row: QR Code + Right Side Info (Medida on top, ID underneath) */}
                <div className="py-1 flex items-center justify-between w-full gap-2 flex-1">
                  <div className="flex items-center justify-center">
                    <QRCodePreview value={previewEncodeValue} />
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
            </div>
          </div>

          {/* Quick Edit Inputs */}
          {itemsToPrint.length === 1 && (
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

          {/* Copies counter */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-600 uppercase">
              Quantidade de Cópias
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={copiesPerItem}
                onChange={e => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="50"
                className="w-20 h-9 px-2 border border-slate-300 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-[#1b367c] bg-white"
              />
              <span className="text-xs text-slate-500 font-semibold">
                Total: <strong>{itemsToPrint.length * copiesPerItem} etiqueta(s)</strong>
              </span>
            </div>
          </div>

          {/* Thermal Printer Settings Advice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed">
            <p className="font-extrabold text-amber-900 uppercase text-[10px] mb-1">
              ⚠️ Configuração para Impressora Térmica (Zebra ZD220):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 font-medium">
              <li>Tamanho do Papel: <strong>100mm x 50mm</strong></li>
              <li>Margens: selecione <strong>Nenhuma (None)</strong></li>
              <li>Desmarque <strong>"Cabeçalhos e rodapés"</strong></li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleExecutePrint}
            className="bg-[#1b367c] hover:bg-[#13275b] active:bg-blue-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md"
          >
            <Printer size={16} />
            <span>Imprimir ({itemsToPrint.length * copiesPerItem})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

