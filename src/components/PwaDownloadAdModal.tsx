import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Sparkles, Bell, ShieldCheck, X } from 'lucide-react';

interface PwaDownloadAdModalProps {
  isOpen: boolean;
  appName: string;
  logoUrl: string;
  onDownloadClick: () => void;
  onClose: () => void;
}

export const PwaDownloadAdModal: React.FC<PwaDownloadAdModalProps> = ({
  isOpen,
  appName,
  logoUrl,
  onDownloadClick,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="pwa-download-advertisement-modal"
          className="fixed inset-0 z-[4500] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ad-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800/90 shadow-2xl shadow-blue-950/30 overflow-hidden"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close app download advertisement"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 space-y-5">
              {/* App Identity Header */}
              <div className="flex items-center gap-3.5 pr-8">
                <div className="w-14 h-14 rounded-2xl bg-black border border-zinc-700/80 p-1.5 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
                  <img
                    src={logoUrl || '/logo.png'}
                    alt={`${appName} App Icon`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.src.includes('/logo.png')) {
                        img.src = '/logo.png';
                      }
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                    <Sparkles className="w-3 h-3" /> Official App
                  </span>
                  <h3
                    id="pwa-ad-title"
                    className="text-lg font-black text-white tracking-tight truncate mt-0.5"
                  >
                    {appName} App
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    Fast &amp; Distraction-Free Learning
                  </p>
                </div>
              </div>

              {/* Concise App Highlights */}
              <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-3.5 space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>One-tap launch directly from your home screen</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Instant live class reminders &amp; course updates</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Lightweight, fast &amp; secure student classroom</span>
                </div>
              </div>

              {/* Primary CTA: Download App */}
              <button
                id="pwa-ad-download-app-btn"
                type="button"
                onClick={onDownloadClick}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Download App</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
