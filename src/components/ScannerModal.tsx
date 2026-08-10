import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, RefreshCw, Zap } from 'lucide-react';
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

  // Fetch cameras list when camera becomes active
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
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // Ignore stop error
          }
        }
      } else {
        scannerRef.current = new Html5Qrcode("interactive-scanner");
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth || 300, viewfinderHeight || 300);
          const boxSize = Math.max(200, Math.floor(minEdge * 0.8));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.DATA_MATRIX
        ]
      };

      const targetCam = overrideCameraId || (cameras.length > 0 ? cameras[selectedCameraIndex]?.id : undefined);

      // Attempt 1: Standard environment or specified target camera
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
        console.warn("First camera start failed, trying fallback facingMode 'user' or default:", firstErr);
        // Attempt 2 Fallback: simple facingMode string or fallback
        await scannerRef.current.start(
          { facingMode: "user" },
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

      // Update camera list after permission granted
      updateCameraList();

    } catch (e: any) {
      console.error("Camera start error:", e);
      setIsCameraActive(false);
      const msg = e?.message || e?.toString() || '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setScanError("Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do seu navegador.");
      } else {
        setScanError("Não foi possível conectar à câmera do dispositivo. Tente usar o leitor manual abaixo.");
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
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Camera View Area */}
          <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[260px] flex flex-col items-center justify-center border border-slate-700">
            <style>{`
              #interactive-scanner video {
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 0.75rem;
              }
              #interactive-scanner canvas {
                max-width: 100% !important;
              }
            `}</style>

            <div id="interactive-scanner" className="w-full min-h-[260px] relative z-0 bg-slate-900" />

            {isCameraActive && cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="absolute top-3 right-3 bg-slate-900/80 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 shadow-lg backdrop-blur-sm z-20 cursor-pointer"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                <span>Trocar Câmera</span>
              </button>
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 z-10 bg-slate-900 text-center p-6 text-slate-400 flex flex-col items-center justify-center">
                <Camera size={40} className="mx-auto mb-2 text-slate-500" />
                <p className="text-xs font-semibold mb-3 text-slate-300">
                  Aponta a câmera do celular diretamente para o QR Code ou Código de Barras
                </p>
                {scanError && (
                  <p className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded-lg mb-3 max-w-xs">
                    {scanError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="bg-[#1b367c] hover:bg-[#13275b] text-white text-xs font-extrabold px-5 py-2.5 rounded-lg transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera size={16} />
                  <span>Abrir Câmera</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-center font-bold text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200 flex items-center justify-center gap-1.5">
            <Zap size={14} className="text-amber-500" />
            <span>Posicione o QR Code no centro do quadrado da câmera.</span>
          </p>

          {/* Quick Scanner Manual Input */}
          <form onSubmit={handleApplyManual} className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">
                Leitor USB / Digitação
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                Bipador Pronto
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Escaneie com leitor USB ou digite aqui..."
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


