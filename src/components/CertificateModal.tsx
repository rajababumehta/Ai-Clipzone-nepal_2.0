import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Share2, ShieldCheck, Award, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { CERTIFICATE_EMBEDDED_FONTS_CSS } from '../certificateFonts';
import { Course } from '../types';

interface CertificateModalProps {
  studentName: string;
  studentPhoto?: string;
  courseTitle: string;
  issueDate?: string;
  certificateId?: string;
  instituteName?: string;
  certificateInstituteName?: string;
  logoUrl?: string;
  certificateTitle?: string;
  certificateSubtitle?: string;
  certificateDescription?: string;
  directorName?: string;
  directorTitle?: string;
  directorSignatureUrl?: string;
  ceoName?: string;
  ceoTitle?: string;
  ceoSignatureUrl?: string;
  certificateTheme?: string;
  certificateStampUrl?: string;
  certificateSealText?: string;
  courses?: Course[];
  selectedCourseId?: string;
  onSelectCourseId?: (courseId: string) => void;
  onClose: () => void;
}

const formatInternationalAdDate = (input?: string | number | Date): string => {
  const formatAd = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  if (!input) return formatAd(new Date());
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || /^20[789]\d[/-]/.test(trimmed)) {
      return formatAd(new Date());
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1990 && parsed.getFullYear() <= 2045) {
      return formatAd(parsed);
    }
    return trimmed;
  }
  const parsed = input instanceof Date ? input : new Date(input);
  if (!isNaN(parsed.getTime())) {
    return formatAd(parsed);
  }
  return formatAd(new Date());
};

export const CertificateModal: React.FC<CertificateModalProps> = ({
  studentName = 'Student Learner',
  studentPhoto,
  courseTitle,
  issueDate,
  certificateId: initialCertId,
  instituteName = 'HamroLms',
  certificateInstituteName = 'HAMROLMS',
  logoUrl,
  certificateTitle = 'CERTIFICATE',
  certificateSubtitle = 'OF ACHIEVEMENT',
  certificateDescription,
  directorName = 'Director',
  directorTitle = 'Course Director',
  directorSignatureUrl,
  ceoName = 'Founder/CEO (HamroLms)',
  ceoTitle = 'Founder & CEO',
  ceoSignatureUrl,
  certificateTheme = 'blue',
  certificateStampUrl,
  certificateSealText,
  courses,
  selectedCourseId,
  onSelectCourseId,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [embeddedLogo, setEmbeddedLogo] = useState<string>(() => {
    if (logoUrl && logoUrl.startsWith('data:image/')) return logoUrl;
    return logoUrl?.trim() || '/logo.png';
  });

  useEffect(() => {
    const targetUrl = (logoUrl && logoUrl.trim()) ? logoUrl.trim() : '/logo.png';

    if (targetUrl.startsWith('data:image/')) {
      setEmbeddedLogo(targetUrl);
      return;
    }

    const img = new Image();
    // Only set crossOrigin if it is an external URL
    if (targetUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setEmbeddedLogo(dataUrl);
        } else {
          setEmbeddedLogo(targetUrl);
        }
      } catch (e) {
        setEmbeddedLogo(targetUrl);
      }
    };
    img.onerror = () => {
      // If custom/remote logo fails to load, gracefully fallback to bundled /logo.png
      setEmbeddedLogo('/logo.png');
    };
    img.src = targetUrl;
  }, [logoUrl]);

  // Theme color palette definitions
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'gold':
        return {
          bgBaseHex: '#0b0906',
          bgGradient: 'radial-gradient(ellipse at 50% 42%, #1e180d 0%, #0e0b07 58%, #060503 100%)',
          primary: '#e5c158',
          secondary: '#b8860b',
          border: '#c89d28',
          darkBorder: '#5a4312',
          highlight: '#fdf6e3',
          mutedAccent: '#bfa76a',
          shadow: 'rgba(212, 175, 55, 0.28)',
          foilLine: 'linear-gradient(90deg, transparent 0%, #9a7022 20%, #f5dc88 50%, #9a7022 80%, transparent 100%)',
        };
      case 'cyber-purple':
        return {
          bgBaseHex: '#090714',
          bgGradient: 'radial-gradient(ellipse at 50% 42%, #1b1136 0%, #0e0920 58%, #06040f 100%)',
          primary: '#c084fc',
          secondary: '#9333ea',
          border: '#a855f7',
          darkBorder: '#4c1d95',
          highlight: '#faf5ff',
          mutedAccent: '#b79fd6',
          shadow: 'rgba(168, 85, 247, 0.28)',
          foilLine: 'linear-gradient(90deg, transparent 0%, #7e22ce 20%, #e9d5ff 50%, #7e22ce 80%, transparent 100%)',
        };
      case 'emerald':
        return {
          bgBaseHex: '#04110c',
          bgGradient: 'radial-gradient(ellipse at 50% 42%, #0a251c 0%, #051610 58%, #020a07 100%)',
          primary: '#34d399',
          secondary: '#059669',
          border: '#10b981',
          darkBorder: '#064e3b',
          highlight: '#ecfdf5',
          mutedAccent: '#86bda8',
          shadow: 'rgba(16, 185, 129, 0.26)',
          foilLine: 'linear-gradient(90deg, transparent 0%, #047857 20%, #a7f3d0 50%, #047857 80%, transparent 100%)',
        };
      case 'crimson':
        return {
          bgBaseHex: '#13060a',
          bgGradient: 'radial-gradient(ellipse at 50% 42%, #290c15 0%, #16070c 58%, #090305 100%)',
          primary: '#fb7185',
          secondary: '#e11d48',
          border: '#f43f5e',
          darkBorder: '#6b122b',
          highlight: '#fff1f2',
          mutedAccent: '#c98b96',
          shadow: 'rgba(244, 63, 94, 0.26)',
          foilLine: 'linear-gradient(90deg, transparent 0%, #be123c 20%, #fecdd3 50%, #be123c 80%, transparent 100%)',
        };
      case 'blue':
      default:
        return {
          bgBaseHex: '#060c18',
          bgGradient: 'radial-gradient(ellipse at 50% 42%, #101f3d 0%, #081124 58%, #040812 100%)',
          primary: '#60a5fa',
          secondary: '#d4af37',
          border: '#3b82f6',
          darkBorder: '#1e3a5f',
          highlight: '#f8fafc',
          mutedAccent: '#93c5fd',
          shadow: 'rgba(59, 130, 246, 0.26)',
          foilLine: 'linear-gradient(90deg, transparent 0%, #1d4ed8 20%, #bae6fd 50%, #1d4ed8 80%, transparent 100%)',
        };
    }
  };

  const themeColors = getThemeColors(certificateTheme);

  // Stable certificate code calculation that never changes randomly on re-renders or page updates
  const [certId] = useState(() => {
    if (initialCertId && initialCertId.trim()) {
      return initialCertId.trim();
    }
    const cleanName = (studentName || 'Student').trim();
    const cleanTitle = (courseTitle || 'Course').trim();
    const storageKey = `clipzone_cert_code_${cleanName}_${cleanTitle}`;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch (e) {}

    // Check if there is an active activation code saved locally
    try {
      const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      if (Array.isArray(activeCodes) && activeCodes.length > 0 && activeCodes[0]) {
        try { localStorage.setItem(storageKey, activeCodes[0]); } catch (e) {}
        return activeCodes[0];
      }
    } catch (e) {}

    // Fixed hash fallback code (deterministic)
    let hash = 0;
    const str = `${cleanName}_${cleanTitle}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const codeNum = Math.abs(hash) % 900000 + 100000;
    const stableCode = `CLIP-${codeNum}`;
    try {
      localStorage.setItem(storageKey, stableCode);
    } catch (e) {}
    return stableCode;
  });

  const cleanCourseTitle = (courseTitle || 'AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS')
    .replace(/by Dhruv Rathee/gi, 'by HamroLms')
    .replace(/Dhruv Rathee/gi, 'HamroLms');

  // Auto-scale certificate canvas to fit both width and height clearly (on mobile and desktop)
  useEffect(() => {
    const updateScale = () => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const containerWidth = containerRef.current?.clientWidth || vw;
      const isMobile = vw < 768;
      const paddingX = isMobile ? 16 : 48;
      const reservedTopUi = isMobile ? 150 : 128;

      const availableWidth = Math.max(280, containerWidth - paddingX);
      const availableHeight = Math.max(260, vh - reservedTopUi);

      const scaleByWidth = availableWidth / 1000;
      const scaleByHeight = availableHeight / 707;

      let newScale = Math.min(1.0, scaleByWidth, scaleByHeight);
      if (isMobile) {
        newScale = Math.min(1.0, Math.max(0.30, scaleByWidth));
      } else {
        newScale = Math.min(1.0, Math.max(0.55, newScale));
      }
      setScale(newScale);
    };

    updateScale();
    const raf = requestAnimationFrame(updateScale);
    const timer = setTimeout(updateScale, 80);
    window.addEventListener('resize', updateScale);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const handleDownloadPng = async () => {
    setIsDownloading(true);
    try {
      const node = document.getElementById('certificate-print-area');
      if (!node) return;

      // Ensure document fonts are fully loaded before capturing
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.all([
            document.fonts.load('400 64px "Great Vibes"'),
            document.fonts.load('700 64px "Great Vibes"'),
            document.fonts.load('900 48px "Cinzel"'),
            document.fonts.load('700 48px "Cinzel"'),
            document.fonts.load('400 48px "Cinzel"'),
            document.fonts.ready,
          ]);
        } catch (e) {
          console.warn('Font preload exception:', e);
        }
      }

      // Ensure all images inside node are fully decoded and loaded
      const images = Array.from(node.querySelectorAll('img'));
      await Promise.all(
        images.map(async (img) => {
          if (!img.complete) {
            await new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          }
          if (typeof img.decode === 'function') {
            try {
              await img.decode();
            } catch (e) {}
          }
        })
      );

      // Save original transform style
      const origTransform = node.style.transform;
      const origTransformOrigin = node.style.transformOrigin;

      // Reset transform to 1:1 (full 1000x707 px) for capture
      node.style.transform = 'none';

      // Brief delay to allow layout recalculation
      await new Promise((resolve) => setTimeout(resolve, 150));

      let dataUrl = '';

      try {
        // html2canvas renders directly to 2D context using active loaded fonts and high DPI
        const canvas = await html2canvas(node, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: themeColors.bgBaseHex,
          width: 1000,
          height: 707,
          logging: false,
          imageTimeout: 10000,
        });
        dataUrl = canvas.toDataURL('image/png', 1.0);
      } catch (canvasErr) {
        console.warn('html2canvas export failed, trying toPng fallback:', canvasErr);
        const filterImg = (node: Node) => true;
        const placeholderPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        dataUrl = await toPng(node, {
          quality: 1.0,
          pixelRatio: 2.5,
          cacheBust: false,
          fontEmbedCSS: CERTIFICATE_EMBEDDED_FONTS_CSS,
          skipFonts: false,
          width: 1000,
          height: 707,
          filter: filterImg,
          imagePlaceholder: placeholderPixel,
        });
      }

      // Restore original container transform
      node.style.transform = origTransform;
      node.style.transformOrigin = origTransformOrigin;

      if (dataUrl) {
        setDownloadError(null);
        const link = document.createElement('a');
        const sanitizedName = (studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `HamroLms_Certificate_${sanitizedName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('Could not download certificate image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const text = `Verified Certificate of Completion - ${studentName} (${courseTitle}) - ID: ${certId} - HamroLms`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto min-h-screen">
        {/* Printable CSS style injection */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #certificate-print-area, #certificate-print-area * {
              visibility: visible;
            }
            #certificate-print-area {
              position: fixed;
              left: 0;
              top: 0;
              width: 100vw;
              height: 100vh;
              margin: 0;
              padding: 0;
              box-shadow: none;
              border: none;
              border-radius: 0;
              transform: none !important;
              background-color: ${themeColors.bgBaseHex} !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: landscape;
              margin: 0;
            }
          }
        `}</style>

        {/* Top Floating Bar Controls */}
        <div className="w-full max-w-5xl bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-3 mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2.5 text-white shadow-xl z-20 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5">
                Official Course Certificate
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
                  ID: {certId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Verified Certificate issued by HamroLms
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Course Switcher if multiple courses available */}
            {courses && courses.length > 1 && onSelectCourseId && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/90 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Course:</span>
                <select
                  value={selectedCourseId || ''}
                  onChange={(e) => onSelectCourseId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.title.replace(/by Dhruv Rathee/gi, 'by HamroLms')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Direct Image Download Button - Green (Download Action) */}
            <button
              onClick={handleDownloadPng}
              disabled={isDownloading}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-xs font-black px-5 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Downloading Certificate...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Certificate</span>
                </>
              )}
            </button>

            {/* Copy Verification Link - Blue (Info/Share Action) */}
            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-bold px-3 py-2.5 rounded-xl border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copied ? 'Copied Details!' : 'Share'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
              title="Close Certificate View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="w-full max-w-5xl mb-2 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-between gap-2 print:hidden shrink-0">
            <span>{downloadError}</span>
            <button
              onClick={() => setDownloadError(null)}
              className="text-rose-300 hover:text-white p-1 rounded-lg cursor-pointer"
              aria-label="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN CERTIFICATE CANVAS SCALED CONTAINER */}
        <div ref={containerRef} className="w-full flex-1 flex flex-col items-center justify-center py-2 px-1 sm:px-2">
          <div 
            style={{ 
              width: `${1000 * scale}px`, 
              height: `${707 * scale}px`,
            }} 
            className="relative flex items-center justify-center shrink-0 transition-all duration-150"
          >
            <div
              id="certificate-print-area"
              style={{
                width: '1000px',
                height: '707px',
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                backgroundColor: themeColors.bgBaseHex,
                backgroundImage: themeColors.bgGradient,
                borderColor: themeColors.darkBorder,
                boxShadow: `0 30px 70px -15px rgba(0,0,0,0.95), inset 0 0 48px ${themeColors.shadow}`,
              }}
              className="absolute top-0 left-0 rounded-xl px-10 py-8 shadow-2xl overflow-hidden border-[3px] flex flex-col justify-between text-center select-none font-sans shrink-0"
            >
              {/* Embedded Font Definitions for Image Capture Canvas Engine */}
              <style>{`
                ${CERTIFICATE_EMBEDDED_FONTS_CSS}
                .cert-font-script { font-family: 'Great Vibes', cursive !important; font-weight: normal !important; }
                .cert-font-cinzel { font-family: 'Cinzel', Georgia, serif !important; }
                .cert-font-playfair { font-family: 'Playfair Display', Georgia, serif !important; }
              `}</style>

              {/* Subtle Architectural Guilloché Rosette Background Geometry (Vector Hairlines) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 1000 707"
                fill="none"
                aria-hidden="true"
              >
                {/* Concentric central hairline medallions */}
                <circle cx="500" cy="353.5" r="260" stroke={themeColors.primary} strokeOpacity="0.06" strokeWidth="1" />
                <circle cx="500" cy="353.5" r="244" stroke={themeColors.primary} strokeOpacity="0.05" strokeWidth="0.75" strokeDasharray="4 6" />
                <circle cx="500" cy="353.5" r="196" stroke={themeColors.highlight} strokeOpacity="0.045" strokeWidth="0.8" />
                <circle cx="500" cy="353.5" r="150" stroke={themeColors.primary} strokeOpacity="0.04" strokeWidth="0.75" strokeDasharray="2 5" />
                {/* Subtle axial cross-rules */}
                <line x1="60" y1="353.5" x2="215" y2="353.5" stroke={themeColors.primary} strokeOpacity="0.06" strokeWidth="0.75" />
                <line x1="785" y1="353.5" x2="940" y2="353.5" stroke={themeColors.primary} strokeOpacity="0.06" strokeWidth="0.75" />
                {/* Architectural diamond lattice corners */}
                <polygon points="500,54 510,64 500,74 490,64" stroke={themeColors.primary} strokeOpacity="0.16" strokeWidth="0.9" />
                <polygon points="500,633 510,643 500,653 490,643" stroke={themeColors.primary} strokeOpacity="0.16" strokeWidth="0.9" />
              </svg>

              {/* Multi-Layered Precision Diploma Frames */}
              <div
                style={{ borderColor: themeColors.border }}
                className="absolute inset-[10px] border-[2px] rounded-[8px] pointer-events-none opacity-85"
              />
              <div
                style={{ borderColor: themeColors.darkBorder }}
                className="absolute inset-[17px] border rounded-[5px] pointer-events-none opacity-90"
              />
              <div
                style={{ borderColor: `${themeColors.primary}38` }}
                className="absolute inset-[22px] border rounded-[3px] pointer-events-none"
              />

              {/* Precision Architectural Corner Filigree Ornaments (4 Corners) */}
              {[
                { pos: 'top-[13px] left-[13px]', rot: '' },
                { pos: 'top-[13px] right-[13px]', rot: 'rotate-90' },
                { pos: 'bottom-[13px] right-[13px]', rot: 'rotate-180' },
                { pos: 'bottom-[13px] left-[13px]', rot: '-rotate-90' },
              ].map((corner, idx) => (
                <svg
                  key={idx}
                  style={{ color: themeColors.primary }}
                  className={`absolute ${corner.pos} ${corner.rot} w-14 h-14 opacity-90 pointer-events-none z-10`}
                  viewBox="0 0 80 80"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M 4 42 L 4 4 L 42 4" stroke="currentColor" strokeWidth="2.2" />
                  <path d="M 11 36 L 11 11 L 36 11" stroke="currentColor" strokeWidth="1" strokeOpacity="0.7" />
                  <path d="M 4 4 L 20 20" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.85" />
                  <polygon points="20,14 26,20 20,26 14,20" fill="currentColor" fillOpacity="0.85" />
                  <circle cx="8" cy="42" r="1.8" fill="currentColor" />
                  <circle cx="42" cy="8" r="1.8" fill="currentColor" />
                </svg>
              ))}

              {/* HEADER SECTION: FIXED 1000px CANVAS PROPORTIONS (IDENTICAL ON MOBILE & DESKTOP) */}
              <div className="relative z-10 flex items-center justify-between w-full px-3 pt-1 shrink-0">
                {/* Left: Official Institute Logo */}
                <div className="w-[215px] shrink-0 flex items-center justify-start pl-2">
                  <div className="h-24 flex items-center justify-start shrink-0 bg-transparent">
                    {embeddedLogo ? (
                      <img
                        src={embeddedLogo}
                        alt={instituteName || 'Institute Logo'}
                        crossOrigin={embeddedLogo.startsWith('http') ? 'anonymous' : undefined}
                        referrerPolicy="no-referrer"
                        loading="eager"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.src.includes('/logo.png')) {
                            setEmbeddedLogo('/logo.png');
                          }
                        }}
                        className="h-24 w-auto max-w-[195px] object-contain drop-shadow-[0_4px_14px_rgba(0,0,0,0.85)]"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            borderColor: themeColors.border,
                            color: themeColors.highlight,
                          }}
                          className="w-12 h-12 rounded-xl bg-slate-900/90 border flex items-center justify-center font-black text-xl shadow-md cert-font-cinzel"
                        >
                          {instituteName ? instituteName.trim().charAt(0).toUpperCase() : 'H'}
                        </div>
                        <div className="flex flex-col text-left">
                          <span
                            style={{ color: themeColors.highlight }}
                            className="cert-font-cinzel font-bold text-sm tracking-wider uppercase"
                          >
                            {instituteName || 'HAMROLMS'}
                          </span>
                          <span
                            style={{ color: themeColors.primary }}
                            className="text-[9px] font-mono tracking-[0.22em] uppercase"
                          >
                            OFFICIAL CREDENTIAL
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Center: Institutional Header & Engraved Title */}
                <div className="flex-1 min-w-0 text-center px-2">
                  {(certificateInstituteName || instituteName) && (
                    <div className="flex items-center justify-center gap-2.5 mb-1">
                      <span
                        style={{ backgroundColor: themeColors.primary }}
                        className="h-[1px] w-7 opacity-60"
                      />
                      <span
                        style={{ color: themeColors.mutedAccent }}
                        className="text-[10px] tracking-[0.34em] font-bold uppercase"
                      >
                        {certificateInstituteName || instituteName}
                      </span>
                      <span
                        style={{ backgroundColor: themeColors.primary }}
                        className="h-[1px] w-7 opacity-60"
                      />
                    </div>
                  )}

                  <h1
                    style={{
                      color: themeColors.highlight,
                      textShadow: `0 2px 14px ${themeColors.shadow}`,
                    }}
                    className="cert-font-cinzel text-[38px] leading-[1.08] font-bold tracking-[0.2em] uppercase whitespace-nowrap"
                  >
                    {certificateTitle || 'CERTIFICATE'}
                  </h1>

                  <div className="flex items-center justify-center gap-3 mt-1">
                    <span
                      style={{ backgroundColor: themeColors.primary }}
                      className="h-[1px] w-10 opacity-50"
                    />
                    <h2
                      style={{ color: themeColors.primary }}
                      className="cert-font-cinzel text-[12px] font-bold tracking-[0.36em] uppercase"
                    >
                      {certificateSubtitle || 'OF ACHIEVEMENT'}
                    </h2>
                    <span
                      style={{ backgroundColor: themeColors.primary }}
                      className="h-[1px] w-10 opacity-50"
                    />
                  </div>
                </div>

                {/* Right: Official Student Portrait (Shown ONLY if user uploaded photo) */}
                <div className="w-[215px] shrink-0 flex items-center justify-end pr-2">
                  {studentPhoto && (studentPhoto.startsWith('data:') || studentPhoto.startsWith('http')) ? (
                    <div
                      style={{
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.bgBaseHex,
                        boxShadow: `0 8px 24px -4px rgba(0,0,0,0.85), 0 0 14px ${themeColors.shadow}`,
                      }}
                      className="w-[96px] h-[96px] aspect-square border-[1.5px] p-[3px] relative overflow-hidden flex items-center justify-center shrink-0 rounded-md"
                    >
                      <div
                        style={{ borderColor: themeColors.darkBorder }}
                        className="w-full h-full border rounded-[3px] overflow-hidden"
                      >
                        <img
                          src={studentPhoto}
                          alt=""
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Invisible symmetric spacer when no photo uploaded */
                    <div className="w-[96px] h-[96px] shrink-0 opacity-0 pointer-events-none" />
                  )}
                </div>
              </div>

              {/* CERTIFICATION BODY STATEMENT */}
              <div className="relative z-10 px-10 my-auto flex flex-col items-center">
                <p className="cert-font-playfair italic text-slate-300/90 text-[18px] tracking-wide">
                  This is to certify that
                </p>

                {/* STUDENT CALLIGRAPHIC NAME */}
                <div className="mt-1.5 mb-2 relative w-full max-w-[820px] px-4 text-center">
                  <h2
                    className="cert-font-script text-[62px] font-normal tracking-wide leading-[1.1] px-2 block mx-auto"
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontWeight: 400,
                      color: themeColors.highlight,
                      textShadow: `0 3px 16px ${themeColors.shadow}`,
                    }}
                  >
                    {studentName}
                  </h2>

                  {/* Precision Engraved Foil Rule Under Student Name */}
                  <div className="w-full max-w-[460px] mx-auto flex items-center justify-center gap-3 mt-1.5">
                    <div
                      style={{
                        background: `linear-gradient(to right, transparent, ${themeColors.primary})`,
                      }}
                      className="h-[1px] flex-1 opacity-80"
                    />
                    <svg
                      style={{ color: themeColors.primary }}
                      className="w-5 h-3 shrink-0"
                      viewBox="0 0 24 14"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="12,1 16,7 12,13 8,7" />
                      <circle cx="3" cy="7" r="1.4" opacity="0.75" />
                      <circle cx="21" cy="7" r="1.4" opacity="0.75" />
                    </svg>
                    <div
                      style={{
                        background: `linear-gradient(to left, transparent, ${themeColors.primary})`,
                      }}
                      className="h-[1px] flex-1 opacity-80"
                    />
                  </div>
                </div>

                {/* ACHIEVEMENT STATEMENT */}
                <p
                  style={{ color: themeColors.primary }}
                  className="cert-font-cinzel text-[11px] font-bold tracking-[0.34em] uppercase mt-2"
                >
                  HAS SUCCESSFULLY COMPLETED
                </p>

                {/* COURSE TITLE */}
                <h3
                  style={{
                    color: themeColors.highlight,
                    textShadow: `0 2px 10px ${themeColors.shadow}`,
                  }}
                  className="cert-font-cinzel font-bold text-[23px] tracking-[0.07em] uppercase mt-2 mb-2 leading-[1.3] max-w-[780px] mx-auto px-4"
                >
                  {cleanCourseTitle}
                </h3>

                {/* COURSE DESCRIPTION SUMMARY */}
                <p className="text-slate-300/85 text-[13.5px] font-normal max-w-[660px] mx-auto leading-[1.6] px-4">
                  {certificateDescription || 'an advanced training in 30+ AI Tools covering AI Video Creation, AI Image Generation, AI Music & Song Creation, Graphic Design, Website Development, Professional Presentations, and other AI-powered digital skills.'}
                </p>
              </div>

              {/* BOTTOM SIGNATURES, OFFICIAL ROSETTE SEAL & CREDENTIAL METADATA */}
              <div
                style={{ borderColor: `${themeColors.primary}2b` }}
                className="relative z-10 grid grid-cols-[1fr_270px_1fr] items-end text-center pt-3 border-t px-6 pb-1 shrink-0"
              >
                {/* Left Signature: Course Director */}
                <div className="flex flex-col items-center justify-end">
                  {directorSignatureUrl && directorSignatureUrl.trim() ? (
                    <img
                      src={directorSignatureUrl.trim()}
                      alt="Director Signature"
                      className="h-11 w-auto max-w-[165px] object-contain mx-auto"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <svg
                      style={{ color: themeColors.highlight }}
                      className="w-36 h-11 opacity-95"
                      viewBox="0 0 180 55"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M 22 42 C 14 38, 12 12, 28 8 C 42 5, 40 38, 25 44 C 18 47, 24 24, 46 20 C 62 17, 56 36, 72 28 C 80 24, 84 32, 96 26 C 104 22, 112 30, 128 24" strokeWidth="2.1" />
                      <path d="M 120 18 Q 138 12, 148 22 Q 132 38, 108 42 C 80 47, 130 42, 162 40" strokeWidth="1.5" />
                      <circle cx="166" cy="39" r="1.6" fill="currentColor" />
                    </svg>
                  )}
                  <div
                    style={{ background: themeColors.foilLine }}
                    className="w-44 h-[1px] my-1.5"
                  />
                  <span className="cert-font-playfair text-[14px] font-bold text-slate-100 tracking-wide">
                    {directorName || 'Director'}
                  </span>
                  <span
                    style={{ color: themeColors.primary }}
                    className="text-[9.5px] font-semibold uppercase tracking-[0.2em] mt-0.5"
                  >
                    {directorTitle || 'Course Director'}
                  </span>
                </div>

                {/* Center: Official Seal + Date of Issue & Verification ID */}
                <div className="flex flex-col items-center justify-end pb-0.5">
                  {certificateStampUrl && certificateStampUrl.trim() ? (
                    <img
                      src={certificateStampUrl.trim()}
                      alt="Official Seal"
                      className="w-12 h-12 object-contain mx-auto mb-1.5 drop-shadow-lg"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <svg
                      className="w-12 h-12 mx-auto mb-1.5"
                      viewBox="0 0 64 64"
                      fill="none"
                      aria-hidden="true"
                    >
                      {/* Scalloped Outer Rosette */}
                      <circle cx="32" cy="30" r="23" stroke={themeColors.primary} strokeWidth="1.5" strokeDasharray="3 2" />
                      <circle cx="32" cy="30" r="19" fill={themeColors.bgBaseHex} stroke={themeColors.border} strokeWidth="1.4" />
                      <circle cx="32" cy="30" r="14.5" stroke={themeColors.primary} strokeWidth="0.8" strokeOpacity="0.65" />
                      {/* Ribbon Tails */}
                      <path d="M 22 49 L 17 61 L 24 57 L 28 62 L 29 51" fill={themeColors.darkBorder} stroke={themeColors.primary} strokeWidth="1" />
                      <path d="M 42 49 L 47 61 L 40 57 L 36 62 L 35 51" fill={themeColors.darkBorder} stroke={themeColors.primary} strokeWidth="1" />
                      {/* Inner Crest Checkmark/Star */}
                      <path d="M 25.5 30 L 30 34.5 L 39 25" stroke={themeColors.highlight} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span
                    style={{ color: themeColors.highlight }}
                    className="font-sans text-[12px] font-bold tracking-[0.06em]"
                  >
                    Date of issue: {formatInternationalAdDate(issueDate)}
                  </span>
                  <span
                    style={{ color: themeColors.primary }}
                    className="text-[11px] font-mono tracking-[0.12em] mt-0.5"
                  >
                    Verify: {certId}
                  </span>
                  {certificateSealText && (
                    <span className="text-[9px] text-slate-400 font-mono tracking-[0.18em] uppercase mt-0.5">
                      {certificateSealText}
                    </span>
                  )}
                </div>

                {/* Right Signature: Founder & CEO */}
                <div className="flex flex-col items-center justify-end">
                  {ceoSignatureUrl && ceoSignatureUrl.trim() ? (
                    <img
                      src={ceoSignatureUrl.trim()}
                      alt="CEO Signature"
                      className="h-11 w-auto max-w-[165px] object-contain mx-auto"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <svg
                      style={{ color: themeColors.highlight }}
                      className="w-36 h-11 opacity-95"
                      viewBox="0 0 180 55"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M 18 45 C 10 18, 30 4, 48 10 C 62 15, 42 42, 28 32 C 18 24, 38 10, 68 18 C 88 23, 80 38, 98 28 C 110 21, 118 32, 134 22 C 144 16, 150 24, 158 20" strokeWidth="2.2" />
                      <path d="M 32 36 C 65 28, 110 26, 152 32 C 165 34, 172 30, 166 26 C 158 21, 145 28, 135 34 C 120 42, 148 44, 170 42" strokeWidth="1.4" />
                      <circle cx="174" cy="41" r="1.6" fill="currentColor" />
                    </svg>
                  )}
                  <div
                    style={{ background: themeColors.foilLine }}
                    className="w-44 h-[1px] my-1.5"
                  />
                  <span className="cert-font-playfair text-[14px] font-bold text-slate-100 tracking-wide max-w-[190px] truncate">
                    {ceoName || 'Founder/CEO (HamroLms)'}
                  </span>
                  <span
                    style={{ color: themeColors.primary }}
                    className="text-[9.5px] font-semibold uppercase tracking-[0.2em] mt-0.5"
                  >
                    {ceoTitle || 'Founder & CEO'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Helper Info */}
        <div className="mt-3 text-center text-xs text-slate-400 font-medium print:hidden">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Official digital credential verified by HamroLms. Download high-resolution PNG image directly.</span>
          </p>
        </div>
      </div>
    </AnimatePresence>
  );
};
