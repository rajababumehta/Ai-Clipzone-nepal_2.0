import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, Share2, ShieldCheck, Award, Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import { LOGO_DATA_URL, REMOTE_LOGO_URL } from '../logo';
import { CERTIFICATE_EMBEDDED_FONTS_CSS } from '../certificateFonts';
import { Course } from '../types';

interface CertificateModalProps {
  studentName: string;
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

export const CertificateModal: React.FC<CertificateModalProps> = ({
  studentName = 'Student Learner',
  courseTitle,
  issueDate = '2083/01/14',
  certificateId: initialCertId,
  instituteName = 'AI Clipzone',
  certificateInstituteName = 'AI CLIPZONE NEPAL',
  logoUrl,
  certificateTitle = 'CERTIFICATE',
  certificateSubtitle = 'OF ACHIEVEMENT',
  certificateDescription,
  directorName = 'Director',
  directorTitle = 'Course Director',
  directorSignatureUrl,
  ceoName = 'Founder/CEO (AI Clipzone)',
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [embeddedLogo, setEmbeddedLogo] = useState<string>(() => {
    if (logoUrl && logoUrl.startsWith('data:image/')) return logoUrl;
    return LOGO_DATA_URL;
  });

  useEffect(() => {
    if (logoUrl && logoUrl.trim() && !logoUrl.startsWith('data:image/')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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
          }
        } catch (e) {
          setEmbeddedLogo(LOGO_DATA_URL);
        }
      };
      img.onerror = () => {
        setEmbeddedLogo(LOGO_DATA_URL);
      };
      img.src = logoUrl.trim();
    } else if (logoUrl && logoUrl.startsWith('data:image/')) {
      setEmbeddedLogo(logoUrl);
    } else {
      setEmbeddedLogo(LOGO_DATA_URL);
    }
  }, [logoUrl]);

  // Theme color palette definitions
  const getThemeColors = (theme: string) => {
    switch (theme) {
      case 'cyber-purple':
        return {
          primary: '#c084fc',
          secondary: '#9333ea',
          border: '#a855f7',
          darkBorder: '#581c87',
          highlight: '#f3e8ff',
          shadow: 'rgba(168, 85, 247, 0.4)',
        };
      case 'emerald':
        return {
          primary: '#34d399',
          secondary: '#059669',
          border: '#10b981',
          darkBorder: '#064e3b',
          highlight: '#d1fae5',
          shadow: 'rgba(16, 185, 129, 0.4)',
        };
      case 'crimson':
        return {
          primary: '#fb7185',
          secondary: '#e11d48',
          border: '#f43f5e',
          darkBorder: '#881337',
          highlight: '#ffe4e6',
          shadow: 'rgba(244, 63, 94, 0.4)',
        };
      case 'gold':
      default:
        return {
          primary: '#38bdf8',
          secondary: '#2563eb',
          border: '#38bdf8',
          darkBorder: '#1e3a8a',
          highlight: '#e0f2fe',
          shadow: 'rgba(59, 130, 246, 0.35)',
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
    .replace(/by Dhruv Rathee/gi, 'by AI Clipzone')
    .replace(/Dhruv Rathee/gi, 'AI Clipzone');

  // Auto-scale certificate canvas to fit user's modal screen smoothly (mobile or desktop)
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 16;
        const targetWidth = 1000;
        const newScale = Math.min(1, Math.max(0.28, containerWidth / targetWidth));
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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
          backgroundColor: '#000000',
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
        const link = document.createElement('a');
        const sanitizedName = (studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        link.download = `AI_Clipzone_Certificate_${sanitizedName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download image. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const text = `Verified Certificate of Completion - ${studentName} (${courseTitle}) - ID: ${certId} - AI Clipzone Nepal`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[3000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-start p-2 sm:p-6 overflow-y-auto min-h-screen">
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
              background-color: #060b1e !important;
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
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 mb-2 sm:mb-4 flex flex-wrap items-center justify-between gap-2.5 text-white shadow-xl z-20 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-400 shrink-0 animate-pulse" />
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-1.5">
                Official Course Certificate 📜
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
                  ID: {certId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Verified Certificate issued by AI Clipzone Nepal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Course Switcher if multiple courses available */}
            {courses && courses.length > 1 && onSelectCourseId && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/90 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">🎓 Course:</span>
                <select
                  value={selectedCourseId || ''}
                  onChange={(e) => onSelectCourseId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.title.replace(/by Dhruv Rathee/gi, 'by AI Clipzone')}
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
                  <Download className="w-4.5 h-4.5" />
                  <span>Download Certificate</span>
                </>
              )}
            </button>

            {/* Copy Verification Link - Blue (Info/Share Action) */}
            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-750 text-blue-300 text-xs font-bold px-3 py-2.5 rounded-xl border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
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

        {/* MAIN CERTIFICATE CANVAS SCALED CONTAINER */}
        <div ref={containerRef} className="w-full flex-1 flex flex-col items-center justify-center my-auto py-2 px-1 overflow-hidden">
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
                backgroundColor: '#000000',
                borderColor: themeColors.border,
                boxShadow: `0 25px 60px -15px rgba(0,0,0,0.95), inset 0 0 35px ${themeColors.shadow}`,
              }}
              className="absolute top-0 left-0 bg-black rounded-2xl p-9 shadow-2xl overflow-hidden border-4 flex flex-col justify-between text-center select-none font-sans shrink-0"
            >
              {/* Embedded Font Definitions for Image Capture Canvas Engine */}
              <style>{`
                ${CERTIFICATE_EMBEDDED_FONTS_CSS}
                .cert-font-script { font-family: 'Great Vibes', cursive !important; font-weight: normal !important; }
                .cert-font-cinzel { font-family: 'Cinzel', Georgia, serif !important; }
                .cert-font-playfair { font-family: 'Playfair Display', Georgia, serif !important; }
              `}</style>

              {/* Outer Luxury Metallic Border Multi-Layers */}
              <div 
                style={{ borderColor: themeColors.primary }}
                className="absolute inset-3 border-2 rounded-lg pointer-events-none opacity-90" 
              />
              <div 
                style={{ borderColor: themeColors.darkBorder }}
                className="absolute inset-4 border rounded-md pointer-events-none opacity-80" 
              />

              {/* Corner Ornate Baroque Flourish Decorations (4 Corners) */}
              <svg 
                style={{ color: themeColors.primary }}
                className="absolute top-3 left-3 w-16 h-16 opacity-85 pointer-events-none z-10" 
                viewBox="0 0 100 100" 
                fill="currentColor"
              >
                <path d="M10,10 L40,10 C25,10 10,25 10,40 Z M15,15 L15,50 C15,30 30,15 50,15 L15,15 Z" />
                <circle cx="20" cy="20" r="3" />
                <path d="M0,0 L35,0 C20,0 0,20 0,35 Z M0,0 L0,35 C0,20 20,0 35,0 Z" />
              </svg>
              <svg 
                style={{ color: themeColors.primary }}
                className="absolute top-3 right-3 w-16 h-16 opacity-85 pointer-events-none transform rotate-90 z-10" 
                viewBox="0 0 100 100" 
                fill="currentColor"
              >
                <path d="M10,10 L40,10 C25,10 10,25 10,40 Z M15,15 L15,50 C15,30 30,15 50,15 L15,15 Z" />
                <circle cx="20" cy="20" r="3" />
              </svg>
              <svg 
                style={{ color: themeColors.primary }}
                className="absolute bottom-3 left-3 w-16 h-16 opacity-85 pointer-events-none transform -rotate-90 z-10" 
                viewBox="0 0 100 100" 
                fill="currentColor"
              >
                <path d="M10,10 L40,10 C25,10 10,25 10,40 Z M15,15 L15,50 C15,30 30,15 50,15 L15,15 Z" />
                <circle cx="20" cy="20" r="3" />
              </svg>
              <svg 
                style={{ color: themeColors.primary }}
                className="absolute bottom-3 right-3 w-16 h-16 opacity-85 pointer-events-none transform rotate-180 z-10" 
                viewBox="0 0 100 100" 
                fill="currentColor"
              >
                <path d="M10,10 L40,10 C25,10 10,25 10,40 Z M15,15 L15,50 C15,30 30,15 50,15 L15,15 Z" />
                <circle cx="20" cy="20" r="3" />
              </svg>

              {/* Background Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <span 
                  style={{ color: themeColors.primary }}
                  className="cert-font-cinzel text-[160px] font-black tracking-widest uppercase truncate max-w-4xl px-4"
                >
                  {certificateInstituteName || instituteName || 'Ai'}
                </span>
              </div>

              {/* HEADER SECTION: LOGO (TOP LEFT) & MAIN TITLE (CENTERED EQUALLY) */}
              <div className="relative z-10 flex items-center justify-between w-full px-4 pt-2">
                {/* Official Institute Logo */}
                <div className="w-72 sm:w-80 shrink-0 flex items-center justify-start pl-6 sm:pl-8 md:pl-10">
                  <div className="h-28 sm:h-32 md:h-36 flex items-center justify-start shrink-0 bg-transparent mt-1">
                    <img 
                      src={embeddedLogo || LOGO_DATA_URL} 
                      alt={instituteName || 'Institute Logo'}
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      loading="eager"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== LOGO_DATA_URL) {
                          target.src = LOGO_DATA_URL;
                        }
                      }}
                      className="h-28 sm:h-32 md:h-36 w-auto max-w-[280px] sm:max-w-[340px] object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]"
                    />
                  </div>
                </div>

                {/* CENTER TITLE */}
                <div className="flex-1 text-center px-1">
                  <h1
                    style={{ 
                      color: themeColors.highlight,
                      textShadow: `0 2px 10px ${themeColors.shadow}` 
                    }}
                    className="cert-font-cinzel text-4xl sm:text-5xl font-black tracking-[0.16em] uppercase drop-shadow-md"
                  >
                    {certificateTitle || 'CERTIFICATE'}
                  </h1>
                  <h2
                    style={{ color: themeColors.primary }}
                    className="cert-font-cinzel text-sm sm:text-base font-black tracking-[0.32em] uppercase mt-1"
                  >
                    {certificateSubtitle || 'OF ACHIEVEMENT'}
                  </h2>
                  {certificateInstituteName && (
                    <p 
                      style={{ color: themeColors.primary }}
                      className="text-[10px] tracking-[0.25em] font-bold uppercase opacity-80 mt-0.5"
                    >
                      {certificateInstituteName}
                    </p>
                  )}
                </div>

                {/* Right Spacer to Balance Emblem Width */}
                <div className="w-72 sm:w-80 shrink-0 pr-6 sm:pr-8 md:pr-10" />
              </div>

              {/* CERTIFICATION BODY STATEMENT */}
              <div className="relative z-10 py-1 px-8 my-auto">
                <p className="font-serif italic text-slate-300 text-xl tracking-wide">
                  This is to certify that
                </p>

                {/* STUDENT CALLIGRAPHIC NAME */}
                <div className="my-2 relative block w-full max-w-full px-4 text-center">
                  <h2
                    className="cert-font-script text-7xl md:text-8xl font-normal tracking-wide leading-tight px-2 block mx-auto"
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontWeight: 400,
                      color: themeColors.highlight,
                      textShadow: `0 2px 14px ${themeColors.shadow}`,
                    }}
                  >
                    {studentName}
                  </h2>

                  {/* Golden Horizontal Divider Line with Flourish Tips & Center Sparkle */}
                  <div className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 mt-1">
                    <div 
                      style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary})` }}
                      className="h-[2px] flex-1" 
                    />
                    <span style={{ color: themeColors.highlight }} className="text-base font-serif">♦ ✦ ♦</span>
                    <div 
                      style={{ background: `linear-gradient(to left, transparent, ${themeColors.primary})` }}
                      className="h-[2px] flex-1" 
                    />
                  </div>
                </div>

                {/* ACHIEVEMENT STATEMENT */}
                <p
                  style={{ color: themeColors.primary }}
                  className="cert-font-cinzel text-base font-bold tracking-[0.25em] uppercase mt-2"
                >
                  HAS SUCCESSFULLY COMPLETED
                </p>

                {/* COURSE TITLE */}
                <h3
                  style={{ 
                    color: themeColors.highlight,
                    textShadow: `0 2px 8px ${themeColors.shadow}` 
                  }}
                  className="font-sans font-black text-3xl tracking-wider uppercase my-2 leading-snug max-w-3xl mx-auto px-4"
                >
                  {cleanCourseTitle}
                </h3>

                {/* COURSE DESCRIPTION SUMMARY */}
                <p className="text-slate-300/90 text-base font-normal max-w-2xl mx-auto leading-relaxed px-4 my-1">
                  {certificateDescription || 'an advanced training in 30+ AI Tools covering AI Video Creation, AI Image Generation, AI Music & Song Creation, Graphic Design, Website Development, Professional Presentations, and other AI-powered digital skills.'}
                </p>
              </div>

              {/* BOTTOM SIGNATURES & ISSUE DATE SECTION */}
              <div 
                style={{ borderColor: `${themeColors.primary}33` }}
                className="relative z-10 grid grid-cols-3 items-end text-center pt-2 border-t px-6 pb-1"
              >
                {/* Left Signature: Director */}
                <div className="flex flex-col items-center justify-end">
                  {directorSignatureUrl && directorSignatureUrl.trim() ? (
                    <img 
                      src={directorSignatureUrl.trim()} 
                      alt="Director Signature" 
                      className="h-12 w-auto max-w-[170px] object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)] mx-auto"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <svg 
                      style={{ color: themeColors.highlight }}
                      className="w-40 h-12 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]" 
                      viewBox="0 0 180 55" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M 22 42 C 14 38, 12 12, 28 8 C 42 5, 40 38, 25 44 C 18 47, 24 24, 46 20 C 62 17, 56 36, 72 28 C 80 24, 84 32, 96 26 C 104 22, 112 30, 128 24" strokeWidth="2.4" />
                      <path d="M 120 18 Q 138 12, 148 22 Q 132 38, 108 42 C 80 47, 130 42, 162 40" strokeWidth="1.8" />
                      <circle cx="166" cy="39" r="1.8" fill="currentColor" />
                    </svg>
                  )}
                  <div 
                    style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
                    className="w-32 h-[1px] my-1" 
                  />
                  <span className="font-sans text-sm font-bold text-slate-100">
                    {directorName || 'Director'}
                  </span>
                  <span style={{ color: themeColors.primary }} className="text-[10px] font-semibold uppercase tracking-wider">
                    {directorTitle || 'Course Director'}
                  </span>
                </div>

                {/* Center: Date of Issue & Seal */}
                <div className="flex flex-col items-center justify-end pb-1">
                  {certificateStampUrl && certificateStampUrl.trim() && (
                    <img 
                      src={certificateStampUrl.trim()} 
                      alt="Official Seal" 
                      className="w-14 h-14 object-contain mx-auto mb-1 drop-shadow-lg"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  <span style={{ color: themeColors.highlight }} className="font-sans text-sm font-bold tracking-wider">
                    Date of issue: {issueDate}
                  </span>
                  <span style={{ color: themeColors.primary }} className="text-xs font-mono mt-0.5 opacity-90">
                    Verify: {certId}
                  </span>
                  {certificateSealText && (
                    <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                      {certificateSealText}
                    </span>
                  )}
                </div>

                {/* Right Signature: Founder/CEO */}
                <div className="flex flex-col items-center justify-end">
                  {ceoSignatureUrl && ceoSignatureUrl.trim() ? (
                    <img 
                      src={ceoSignatureUrl.trim()} 
                      alt="CEO Signature" 
                      className="h-12 w-auto max-w-[170px] object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)] mx-auto"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <svg 
                      style={{ color: themeColors.highlight }}
                      className="w-40 h-12 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)]" 
                      viewBox="0 0 180 55" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M 18 45 C 10 18, 30 4, 48 10 C 62 15, 42 42, 28 32 C 18 24, 38 10, 68 18 C 88 23, 80 38, 98 28 C 110 21, 118 32, 134 22 C 144 16, 150 24, 158 20" strokeWidth="2.5" />
                      <path d="M 32 36 C 65 28, 110 26, 152 32 C 165 34, 172 30, 166 26 C 158 21, 145 28, 135 34 C 120 42, 148 44, 170 42" strokeWidth="1.7" />
                      <circle cx="174" cy="41" r="1.8" fill="currentColor" />
                    </svg>
                  )}
                  <div 
                    style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
                    className="w-32 h-[1px] my-1" 
                  />
                  <span className="font-sans text-sm font-bold text-slate-100 text-center max-w-[160px]">
                    {ceoName || 'Founder/CEO (AI Clipzone)'}
                  </span>
                  <span style={{ color: themeColors.primary }} className="text-[10px] font-semibold uppercase tracking-wider">
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
            <span>Official digital credential verified by AI Clipzone. Download high-resolution PNG image directly.</span>
          </p>
        </div>
      </div>
    </AnimatePresence>
  );
};
