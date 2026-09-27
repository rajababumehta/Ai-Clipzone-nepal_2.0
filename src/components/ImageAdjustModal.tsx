import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, RotateCcw } from 'lucide-react';

interface ImageAdjustModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

const CROP_BOX_SIZE = 260; // 260px on screen
const OUTPUT_SIZE = 512; // 512px output canvas
const SCALE_FACTOR = OUTPUT_SIZE / CROP_BOX_SIZE; // ~1.96923

export const ImageAdjustModal: React.FC<ImageAdjustModalProps> = ({
  imageUrl,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number }>({
    width: CROP_BOX_SIZE,
    height: CROP_BOX_SIZE,
  });

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Compute base rendered size when image loads (cover the 260x260 box by default like WhatsApp)
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth || CROP_BOX_SIZE;
      const nh = img.naturalHeight || CROP_BOX_SIZE;
      const aspect = nw / nh;

      let bw = CROP_BOX_SIZE;
      let bh = CROP_BOX_SIZE;

      if (aspect >= 1) {
        // Landscape: height matches crop box, width expands proportionally
        bh = CROP_BOX_SIZE;
        bw = Math.round(CROP_BOX_SIZE * aspect);
      } else {
        // Portrait: width matches crop box, height expands proportionally
        bw = CROP_BOX_SIZE;
        bh = Math.round(CROP_BOX_SIZE / aspect);
      }

      setBaseDimensions({ width: bw, height: bh });
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  // Pointer drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // 100% WYSIWYG export to canvas:
  const handleDone = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.save();

    // 1. Move to canvas center (equivalent to center of 260x260 crop box)
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // 2. Translate by user offset (scaled directly to canvas coordinate system)
    ctx.translate(offset.x * SCALE_FACTOR, offset.y * SCALE_FACTOR);

    // 3. Rotate around center
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Scale around center
    ctx.scale(zoom, zoom);

    // 5. Draw image with exactly scaled base dimensions
    const drawWidth = baseDimensions.width * SCALE_FACTOR;
    const drawHeight = baseDimensions.height * SCALE_FACTOR;
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onConfirm(croppedDataUrl);
  }, [offset, rotation, zoom, baseDimensions, onConfirm]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[5000] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col font-sans"
        >
          {/* Top Bar Header */}
          <div className="p-4 sm:p-4.5 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/60">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1.5">
                <span>📸</span> Adjust & Crop Photo
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReset}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition cursor-pointer text-xs font-bold flex items-center gap-1"
                title="Reset Position"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800 transition cursor-pointer"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center WhatsApp Square Cropping Viewport */}
          <div className="relative w-full aspect-square max-w-[340px] mx-auto p-4 flex items-center justify-center overflow-hidden bg-black/40">
            {/* The 260x260 Square Crop Area */}
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ width: `${CROP_BOX_SIZE}px`, height: `${CROP_BOX_SIZE}px` }}
              className="relative overflow-hidden rounded-xl border-2 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)] cursor-grab active:cursor-grabbing touch-none select-none bg-zinc-900"
            >
              {/* Centered Image with exact base dimensions and transforms */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                draggable={false}
                style={{
                  width: `${baseDimensions.width}px`,
                  height: `${baseDimensions.height}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  marginLeft: `-${baseDimensions.width / 2}px`,
                  marginTop: `-${baseDimensions.height / 2}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  pointerEvents: 'none',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="select-none"
              />

              {/* Grid / Guide Lines when dragging or adjusting */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0">
                {/* 3x3 Grid Lines */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
                </div>

                {/* Subtle circular boundary guide for round avatar display */}
                <div className="absolute inset-1 rounded-full border border-dashed border-white/30 pointer-events-none" />
              </div>

              {/* Corner brackets */}
              <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
              <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
              <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
              <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />
            </div>

            {/* Subtle Helper Hint */}
            <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/80 backdrop-blur-xs text-[10px] text-zinc-300 font-bold px-3 py-1 rounded-full border border-white/10 shadow-md">
                👆 फोटो तान्नुहोस् र मिलाउनुहोस् (Drag to position)
              </span>
            </div>
          </div>

          {/* Zoom & Rotate Controls */}
          <div className="px-5 py-3 space-y-3 bg-zinc-900/40 border-t border-zinc-850">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1, +(prev - 0.2).toFixed(2)))}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer appearance-none"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.5, +(prev + 0.2).toFixed(2)))}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Rotate Button */}
              <button
                type="button"
                onClick={handleRotate}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-zinc-700 transition cursor-pointer flex items-center gap-1 active:scale-95 ml-1"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                <span>{rotation}°</span>
              </button>
            </div>
          </div>

          {/* Bottom Actions: Cancel & Set Profile Photo */}
          <div className="p-4 bg-zinc-950 border-t border-zinc-850 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-black py-3 rounded-2xl border border-zinc-800 transition cursor-pointer active:scale-98"
            >
              रद्द गर्नुहोस् (Cancel)
            </button>

            <button
              type="button"
              onClick={handleDone}
              className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black py-3 rounded-2xl shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>फोटो सेट गर्नुहोस् (Done)</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
