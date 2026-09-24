// Componente Modal do Leitor de QR Code e Código de Barras
import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, RefreshCw, Zap, Image as ImageIcon, Flashlight, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult?: (code: string) => void;
  onScan?: (code: string) => void;
}

export const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  onScan
}) => {
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

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
    } catch {
      // Audio context might be restricted
    }
  };

  const handleDispatchCode = (rawCode: string) => {
    const trimmed = (rawCode || '').trim();
    if (!trimmed) return;
    playBeep();
    stopCamera();
    onClose();
    if (onScanResult) {
      onScanResult(trimmed);
    }
    if (onScan) {
      onScan(trimmed);
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
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async (overrideCameraId?: string) => {
    setScanError(null);
    setIsCameraActive(true);
    setTorchOn(false);

    // Give DOM a tick to render #interactive-scanner
    await new Promise(resolve => setTimeout(resolve, 150));

    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          try {
            await scannerRef.current.stop();
          } catch {
            // Ignore
          }
        }
      } else {
        scannerRef.current = new Html5Qrcode("interactive-scanner");
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = viewfinderWidth || 320;
          const h = viewfinderHeight || 300;
          return {
            width: Math.min(w - 20, Math.max(240, Math.floor(w * 0.88))),
            height: Math.min(h - 20, Math.max(180, Math.floor(h * 0.7)))
          };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417
        ]
      };

      const targetCam = overrideCameraId || (cameras.length > 0 ? cameras[selectedCameraIndex]?.id : undefined);
      const cameraConfig: any = targetCam ? { deviceId: { exact: targetCam } } : { facingMode: "environment" };

      try {
        await scannerRef.current.start(
          cameraConfig,
          scanConfig,
          (decodedText) => {
            handleDispatchCode(decodedText);
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn("Camera start with exact id failed, fallback to environment facingMode:", firstErr);
        await scannerRef.current.start(
          { facingMode: "environment" },
          scanConfig,
          (decodedText) => {
            handleDispatchCode(decodedText);
          },
          () => {}
        );
      }

      // Check if torch/flashlight is supported
      try {
        const capabilities = scannerRef.current.getRunningTrackCameraCapabilities();
        if (capabilities && (capabilities as any).torchFeature && (capabilities as any).torchFeature().isSupported()) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch {
        setHasTorch(false);
      }

      updateCameraList();

    } catch (e: any) {
      setIsCameraActive(false);
      const msg = e?.message || e?.toString() || '';
      console.warn("Camera start notice:", msg);
      if (msg.includes('NotAllowedError') || msg.includes('Permission') || e?.name === 'NotAllowedError') {
        setIsPermissionDenied(true);
        setScanError("Permissão de câmera bloqueada no navegador.");
      } else {
        setScanError("Não foi possível acessar a câmera. Você pode tirar uma foto da etiqueta ou digitar o código abaixo.");
      }
    }
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const newTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorch } as any]
      });
      setTorchOn(newTorch);
    } catch (err) {
      console.warn("Error toggling torch:", err);
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length < 2) return;
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
    const nextCamId = cameras[nextIndex].id;
    await startCamera(nextCamId);
  };

  // Helper to downscale large smartphone photos before scanning
  const resizeImageFile = async (file: File, maxDim = 1200): Promise<File | Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.92);
      };

      img.onerror = reject;
      reader.readAsDataURL(file);
    });
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

      // First attempt: direct file
      let decodedResult = '';
      try {
        decodedResult = await html5QrCode.scanFile(file, false);
      } catch {
        // Second attempt: downscaled image for high-res smartphone cameras
        try {
          const resizedBlob = await resizeImageFile(file, 1200);
          const resizedFile = new File([resizedBlob], 'resized.jpg', { type: 'image/jpeg' });
          decodedResult = await html5QrCode.scanFile(resizedFile, false);
        } catch {
          // Third attempt: smaller 800px image
          const smallerBlob = await resizeImageFile(file, 800);
          const smallerFile = new File([smallerBlob], 'smaller.jpg', { type: 'image/jpeg' });
          decodedResult = await html5QrCode.scanFile(smallerFile, false);
        }
      }

      if (decodedResult) {
        handleDispatchCode(decodedResult);
      } else {
        throw new Error("Código não identificado");
      }
    } catch (err) {
      console.warn("File scan failed:", err);
      setScanError("Não foi possível ler o código na foto. Certifique-se de que a imagem esteja nítida ou digite o código/ID abaixo.");
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

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDispatchCode(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Barcode size={22} className="text-[#1b367c]" />
            <div>
              <h2 className="text-base font-extrabold text-[#1b367c] leading-tight">
                Leitor de QR Code e Código de Barras
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Inventário Metalrib</p>
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

        <div className="p-4 space-y-3.5">
          {/* Camera View Area */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[270px] flex flex-col items-center justify-center border border-slate-800 shadow-inner">
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

            <div id="interactive-scanner" className="w-full min-h-[270px] relative z-0 bg-slate-950 flex items-center justify-center" />

            {/* In-camera Controls */}
            {isCameraActive && (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 shadow-lg backdrop-blur-sm cursor-pointer transition-colors ${
                      torchOn 
                        ? 'bg-amber-500 text-slate-950 border-amber-400' 
                        : 'bg-slate-900/90 text-white border-slate-700 hover:bg-black'
                    }`}
                  >
                    <Flashlight size={14} className={torchOn ? 'fill-slate-950' : ''} />
                    <span>{torchOn ? 'Lanterna Ligada' : 'Lanterna'}</span>
                  </button>
                )}

                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="bg-slate-900/90 hover:bg-black text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 shadow-lg backdrop-blur-sm cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Câmera</span>
                  </button>
                )}
              </div>
            )}

            {!isCameraActive && (
              <div className="absolute inset-0 z-10 bg-slate-950 text-center p-5 text-slate-300 flex flex-col items-center justify-center">
                {isPermissionDenied ? (
                  <div className="space-y-3 max-w-xs text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/40">
                      <Camera size={26} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">Permissão da Câmera Bloqueada</h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        O navegador bloqueou o vídeo em tempo real. Você pode <strong>Tirar Foto</strong> diretamente ou liberar a câmera no ícone de cadeado na barra do navegador.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2.5 px-3 rounded-xl transition-colors shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon size={16} />
                        <span>📷 Tirar Foto da Etiqueta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPermissionDenied(false);
                          startCamera();
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold py-2 px-3 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={14} />
                        <span>Tentar Abrir Câmera Novamente</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera size={40} className="mx-auto mb-2 text-slate-500 animate-pulse" />
                    <p className="text-xs font-semibold mb-3 text-slate-300">
                      Aponte a câmera para o QR Code ou Código de Barras da etiqueta
                    </p>
                    {scanError && (
                      <div className="text-xs text-rose-300 bg-rose-950/80 border border-rose-800 p-2.5 rounded-lg mb-3 max-w-xs text-left font-medium flex items-start gap-2">
                        <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>{scanError}</span>
                      </div>
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
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
            <span className="flex items-center gap-1.5 font-bold">
              <Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
              <span>Aponte para o QR Code ou Código de Barras</span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#1b367c] hover:underline font-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon size={13} />
              <span>Usar Foto</span>
            </button>
          </div>

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
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs font-bold text-[#1b367c] animate-pulse">
                🔍 Processando foto da etiqueta e decodificando...
              </p>
            </div>
          )}

          {/* Quick Scanner Manual Input / Barcode Gun */}
          <form onSubmit={handleApplyManual} className="space-y-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Digitação Manual / Bipador USB
              </label>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Pronto para bipar
              </span>
            </div>
            <div className="flex gap-2">
              <input
                ref={manualInputRef}
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Cole ou digite ID Nomus, Código ou JSON..."
                className="flex-1 h-10 px-3 border-2 border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#1b367c]"
              />
              <button
                type="submit"
                className="bg-[#1b367c] hover:bg-[#13275b] text-white font-extrabold text-xs px-4 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Check size={16} />
                <span>Buscar</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
