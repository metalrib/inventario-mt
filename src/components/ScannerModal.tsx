// Componente Modal do Leitor de QR Code e Código de Barras
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, RefreshCw, Zap, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';

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
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateCameraList = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        const backCamIndex = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('traseira') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (backCamIndex >= 0) {
          setSelectedCameraIndex(backCamIndex);
        }
      }
    } catch (err) {
      console.warn("Could not list cameras:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async (overrideCameraId?: string) => {
    setScanError(null);
    setIsCameraActive(true);

    // Give DOM a tick to render #interactive-scanner
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // Ignore
          }
        }
      } else {
        scannerRef.current = new Html5Qrcode("interactive-scanner");
      }

      const scanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = viewfinderWidth || 300;
          const h = viewfinderHeight || 300;
          const minDim = Math.min(w, h);
          const size = Math.max(180, Math.floor(minDim * 0.75));
          return { width: size, height: size };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ]
      };

      const targetCam = overrideCameraId || (cameras.length > 0 ? cameras[selectedCameraIndex]?.id : undefined);

      let cameraConfig: any = targetCam ? { deviceId: { exact: targetCam } } : { facingMode: "environment" };

      try {
        await scannerRef.current.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            playBeep();
            onScanResult(decodedText);
            stopCamera();
            onClose();
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn("First camera start failed, trying fallback facingMode string:", firstErr);
        await scannerRef.current.start(
          { facingMode: "environment" },
          scanConfig,
          (decodedText) => {
            playBeep();
            onScanResult(decodedText);
            stopCamera();
            onClose();
          },
          () => {}
        );
      }

      updateCameraList();

    } catch (e: any) {
      console.error("Camera start error:", e);
      setIsCameraActive(false);
      const msg = e?.message || e?.toString() || '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setScanError("Acesso à câmera negado. Por favor, permita o acesso nas configurações do navegador.");
      } else {
        setScanError("Não foi possível focar na câmera. Você também pode tirar uma foto do QR code usando o botão abaixo.");
      }
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    const nextCamId = cameras[nextIndex].id;
    await startCamera(nextCamId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setScanError(null);

    try {
      let html5QrCode = scannerRef.current;
      if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("interactive-scanner");
        scannerRef.current = html5QrCode;
      }

      if (html5QrCode.isScanning) {
        await html5QrCode.stop();
        setIsCameraActive(false);
      }

      const decodedResult = await html5QrCode.scanFile(file, true);
      if (decodedResult) {
        playBeep();
        onScanResult(decodedResult);
        onClose();
      }
    } catch (err) {
      console.warn("File scan failed:", err);
      setScanError("Não foi possível ler o QR code na foto. Certifique-se de que a imagem esteja nítida.");
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
              Leitor de Código / QR Code
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera View Area */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[260px] flex flex-col items-center justify-center border border-slate-800 shadow-inner">
            <style>{`
              #interactive-scanner video {
                width: 100% !important;
                height: 100% !important;
                object-fit: contain !important;
                background-color: #020617;
              }
              #interactive-scanner canvas {
                max-width: 100% !important;
              }
              #interactive-scanner__scan_region {
                border-color: #3b82f6 !important;
              }
            `}</style>

            <div id="interactive-scanner" className="w-full min-h-[260px] relative z-0 bg-slate-950 flex items-center justify-center" />

            {isCameraActive && cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="absolute top-3 right-3 bg-slate-900/90 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20 cursor-pointer"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Trocar Câmera</span>
              </button>
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 z-10 bg-slate-950 text-center p-6 text-slate-400 flex flex-col items-center justify-center">
                <Camera size={40} className="mx-auto mb-2 text-slate-500 animate-pulse" />
                <p className="text-xs font-semibold mb-3 text-slate-300">
                  Aponte a câmera para o QR Code ou Código de Barras
                </p>
                {scanError && (
                  <p className="text-xs text-rose-400 bg-rose-950/70 border border-rose-800 p-2.5 rounded-lg mb-3 max-w-xs text-center font-medium">
                    {scanError}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="flex-1 bg-[#1b367c] hover:bg-[#13275b] text-white text-xs font-extrabold py-2.5 px-3 rounded-lg transition-colors shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera size={16} />
                    <span>Abrir Câmera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-extrabold py-2.5 px-3 rounded-lg transition-colors shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ImageIcon size={16} />
                    <span>Tirar/Enviar Foto</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center font-bold text-slate-600 bg-slate-100 p-2.5 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5">
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            <span>Mantenha o QR Code bem iluminado e centralizado na tela</span>
          </p>

          {/* Hidden File Input for Foto/Galeria */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {isProcessingImage && (
            <p className="text-xs text-center font-bold text-[#1b367c] animate-pulse">
              Processando foto do QR code...
            </p>
          )}

          {/* Quick Scanner Manual Input */}
          <form onSubmit={handleApplyManual} className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Leitor USB / Digitação Manual
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Bipador Pronto
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Escaneie com leitor USB ou digite..."
                className="flex-1 h-11 px-3 border-2 border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:border-[#1b367c]"
              />
              <button
                type="submit"
                className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-4 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
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



