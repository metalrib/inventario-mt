import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, Volume2 } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (code: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio context might be restricted
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    setScanError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("interactive-scanner");
      }

      setIsCameraActive(true);

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 240, height: 240 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        },
        (decodedText) => {
          playBeep();
          onScanResult(decodedText);
          stopCamera();
          onClose();
        },
        () => {
          // Continuous frame scan error, ignore
        }
      );
    } catch (e: any) {
      console.error("Camera start error:", e);
      setIsCameraActive(false);
      setScanError("Não foi possível acessar a câmera. Verifique as permissões no seu navegador.");
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error("Stop scanner error:", err);
      }
      scannerRef.current = null;
    }
    setIsCameraActive(false);
  };

  if (!isOpen) return null;

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScanResult(manualCode.trim());
    setManualCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Barcode size={20} className="text-[#1b367c]" />
            <h2 className="text-base font-extrabold text-[#1b367c]">
              Leitor de Código de Barras / ID
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

        <div className="p-4 space-y-4">
          {/* Camera View Area */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[220px] flex flex-col items-center justify-center border border-slate-700">
            <div id="interactive-scanner" className={`w-full ${isCameraActive ? 'block' : 'hidden'}`} />

            {!isCameraActive && (
              <div className="text-center p-6 text-slate-400 my-auto">
                <Camera size={36} className="mx-auto mb-2 text-slate-500" />
                <p className="text-xs font-semibold mb-3 text-slate-300">
                  Apunte a câmera para o Código de Barras (Code 128) da etiqueta
                </p>
                {scanError && (
                  <p className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded-lg mb-3">
                    {scanError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-[#1b367c] hover:bg-[#13275b] text-white text-xs font-extrabold px-5 py-2.5 rounded-lg transition-colors shadow-md inline-flex items-center gap-2"
                >
                  <Camera size={16} />
                  <span>Abrir Câmera</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Scanner Manual Input */}
          <form onSubmit={handleApplyManual} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Leitor Sem Fio / Digitação Rápida
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                USB/Bipador Pronto
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Escaneie com bipador USB ou digite..."
                className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#1b367c]"
                autoFocus
              />
              <button
                type="submit"
                className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-4 rounded-lg flex items-center gap-1 shadow-sm"
              >
                <Check size={16} />
                <span>Usar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

