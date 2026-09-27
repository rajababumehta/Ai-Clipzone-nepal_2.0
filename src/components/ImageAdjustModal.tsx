import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, RotateCcw } from 'lucide-react';

interface ImageAdjustModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

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
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  // Handle pointer down (mouse or touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer move (dragging image)
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
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset adjustments
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped circle image to 512x512 canvas
  const handleDone = useCallback(() => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport circle diameter in UI
    const viewportSize = 260; // 260px circle in container
    const scaleFactor = outputSize / viewportSize;

    // Clear canvas
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Apply circular clip path
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Center point of output canvas
    ctx.translate(outputSize / 2, outputSize / 2);

    // Apply offset scaled to output canvas
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply zoom
    ctx.scale(zoom, zoom);

    // Compute base image display dimension
    // When displayed in 260px viewport, calculate natural aspect ratio
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect >= 1) {
      drawHeight = outputSize;
      drawWidth = outputSize * imgAspect;
    } else {
      drawWidth = outputSize;
      drawHeight = outputSize / imgAspect;
    }

    // Draw centered
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onConfirm(croppedDataUrl);
  }, [offset, rotation, zoom, onConfirm]);

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
                <span>📸</span> Adjust Photo (WhatsApp Style)
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

          {/* Center WhatsApp Circular Cropping Viewport */}
          <div className="relative w-full aspect-square max-w-[340px] mx-auto p-4 flex items-center justify-center overflow-hidden">
            {/* Draggable Image Container */}
            <div
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                draggable={false}
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  maxHeight: '260px',
                  maxWidth: '260px',
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
                className="select-none"
              />
            </div>

            {/* Circular Overlay Mask (Dark outside, Clear circle inside) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 340 340">
                <defs>
                  <mask id="whatsapp-crop-mask">
                    {/* Fill white everywhere */}
                    <rect width="340" height="340" fill="white" />
                    {/* Cut out black circle in center */}
                    <circle cx="170" cy="170" r="130" fill="black" />
                  </mask>
                </defs>
                {/* Darkened mask around the circle */}
                <rect
                  width="340"
                  height="340"
                  fill="rgba(0, 0, 0, 0.72)"
                  mask="url(#whatsapp-crop-mask)"
                />
                {/* Thin WhatsApp Style Crop Border Guide */}
                <circle
                  cx="170"
                  cy="170"
                  r="130"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.9)"
                  strokeWidth="2"
                  strokeDasharray={isDragging ? '4 4' : 'none'}
                />
                {/* Center crosshair guide when dragging */}
                {isDragging && (
                  <g stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1">
                    <line x1="170" y1="50" x2="170" y2="290" />
                    <line x1="50" y1="170" x2="290" y2="170" />
                  </g>
                )}
              </svg>
            </div>

            {/* Subtle Helper Hint */}
            <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/75 backdrop-blur-xs text-[10px] text-zinc-300 font-bold px-3 py-1 rounded-full border border-white/10 shadow-md">
                👆 फोटो सार्न हातले तान्नुहोस् (Drag to center)
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
