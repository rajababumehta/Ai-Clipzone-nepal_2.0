import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, SwitchCamera, Upload, X, AlertCircle } from 'lucide-react';

interface QrCodeScannerPanelProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QrCodeScannerPanel: React.FC<QrCodeScannerPanelProps> = ({
  onScanSuccess,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasScannedRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [retryNonce, setRetryNonce] = useState(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    hasScannedRef.current = false;

    const startCamera = async () => {
      stopCamera();
      setStatus('starting');
      setErrorMsg('');

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg(
          'यो ब्राउजर वा डिभाइसमा लाइभ क्यामेरा उपलब्ध छैन। तलबाट QR फोटो अपलोड गर्न सक्नुहुन्छ।'
        );
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (primaryErr: any) {
        // Fallback to any available camera (e.g., laptop webcam when environment fails)
        if (
          primaryErr?.name === 'OverconstrainedError' ||
          primaryErr?.name === 'ConstraintNotSatisfiedError'
        ) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (fallbackErr: any) {
            primaryErr = fallbackErr;
          }
        }

        if (!stream) {
          if (cancelled) return;
          setStatus('error');
          if (primaryErr?.name === 'NotAllowedError' || primaryErr?.name === 'PermissionDeniedError') {
            setErrorMsg(
              'क्यामेराको अनुमति (Camera Permission) अस्वीकार गरियो। ब्राउजर सेटिङबाट अनुमति दिनुहोस् वा QR फोटो अपलोड गर्नुहोस्।'
            );
          } else if (primaryErr?.name === 'NotFoundError' || primaryErr?.name === 'DevicesNotFoundError') {
            setErrorMsg(
              'डिभाइसमा क्यामेरा भेटिएन। तलबाट QR कोडको फोटो अपलोड गर्न सक्नुहुन्छ।'
            );
          } else {
            setErrorMsg(
              'क्यामेरा खोल्न सकिएन। कृपया पुनः प्रयास गर्नुहोस् वा QR फोटो अपलोड गर्नुहोस्।'
            );
          }
          return;
        }
      }

      if (cancelled) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        return;
      }

      streamRef.current = stream;
      const videoEl = videoRef.current;
      if (!videoEl) return;

      videoEl.srcObject = stream;
      try {
        await videoEl.play();
      } catch {}

      if (cancelled) return;
      setStatus('scanning');

      let lastScanTime = 0;
      const tick = (now: number) => {
        if (cancelled || hasScannedRef.current) return;

        if (
          videoEl.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
          videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0 &&
          now - lastScanTime >= 90
        ) {
          lastScanTime = now;
          const maxDim = 720;
          const scale = Math.min(1, maxDim / Math.max(videoEl.videoWidth, videoEl.videoHeight));
          const targetW = Math.max(1, Math.round(videoEl.videoWidth * scale));
          const targetH = Math.max(1, Math.round(videoEl.videoHeight * scale));

          let canvas = canvasRef.current;
          if (!canvas) {
            canvas = document.createElement('canvas');
            canvasRef.current = canvas;
          }
          if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, targetW, targetH);
            const imageData = ctx.getImageData(0, 0, targetW, targetH);
            const result = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (result && result.data && result.data.trim()) {
              hasScannedRef.current = true;
              stopCamera();
              onScanSuccess(result.data.trim());
              return;
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [facingMode, retryNonce, onScanSuccess, stopCamera]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 300) * scale));
        const h = Math.max(1, Math.round((img.height || 300) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (decoded && decoded.data && decoded.data.trim()) {
          stopCamera();
          onScanSuccess(decoded.data.trim());
        } else {
          setStatus('error');
          setErrorMsg('छनोट गरिएको फोटोमा मान्य QR कोड भेटिएन। कृपया स्पष्ट QR फोटो छान्नुहोस्।');
        }
      };
      img.onerror = () => {
        setStatus('error');
        setErrorMsg('फोटो पढ्न सकिएन। कृपया अर्को QR फोटो प्रयास गर्नुहोस्।');
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-zinc-950 border border-blue-500/40 rounded-2xl p-3.5 space-y-3 shadow-inner">
      {/* Scanner Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </span>
          <div>
            <p className="text-xs font-black text-white leading-tight">
              Scan Activation QR Code
            </p>
            <p className="text-[10px] text-zinc-400">
              क्यामेरा अगाडि QR कोड राख्नुहोस् — स्वतः Paste हुनेछ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            title="Switch Camera"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            title="Close Scanner"
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 text-zinc-300 hover:text-rose-300 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Camera Viewport */}
      <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${status === 'error' ? 'opacity-20' : 'opacity-100'}`}
        />

        {/* Viewfinder Frame */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-44 h-44 sm:w-48 sm:h-48 relative">
              <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-blue-400/80 shadow-[0_0_10px_rgba(96,165,250,0.9)] animate-pulse" />
            </div>
          </div>
        )}

        {/* Starting State */}
        {status === 'starting' && (
          <div className="absolute inset-0 bg-zinc-950/85 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <p className="text-xs font-bold text-zinc-200">क्यामेरा खुल्दैछ...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="absolute inset-0 bg-zinc-950/92 flex flex-col items-center justify-center gap-2.5 p-4 text-center">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <p className="text-xs text-zinc-300 font-medium leading-relaxed max-w-xs">
              {errorMsg}
            </p>
            <button
              type="button"
              onClick={() => setRetryNonce((n) => n + 1)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Camera</span>
            </button>
          </div>
        )}
      </div>

      {/* Upload QR Image Fallback + Cancel */}
      <div className="flex items-center justify-between gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] font-bold py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5 text-blue-400" />
          <span>Upload QR Photo</span>
        </button>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold py-2 px-3 rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
