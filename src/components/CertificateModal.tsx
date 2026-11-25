import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const renderStarPoints = (cx: number, cy: number, outerR: number, innerR: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return pts.join(' ');
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
  directorTitle = 'PROGRAM DIRECTOR',
  directorSignatureUrl,
  ceoName = 'Founder/CEO (HamroLms)',
  ceoTitle = 'FOUNDER & CEO',
  ceoSignatureUrl,
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
    return logoUrl?.trim() || '';
  });

  useEffect(() => {
    const targetUrl = logoUrl && logoUrl.trim() ? logoUrl.trim() : '';
    if (!targetUrl) {
      setEmbeddedLogo('');
      return;
    }

    if (targetUrl.startsWith('data:image/')) {
      setEmbeddedLogo(targetUrl);
      return;
    }

    const img = new Image();
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
          setEmbeddedLogo(canvas.toDataURL('image/png'));
        } else {
          setEmbeddedLogo(targetUrl);
        }
      } catch {
        setEmbeddedLogo(targetUrl);
      }
    };
    img.onerror = () => {
      setEmbeddedLogo('');
    };
    img.src = targetUrl;
  }, [logoUrl]);

  // Deterministic certificate verification ID reactive to selected course
  const certId = useMemo(() => {
    if (initialCertId && initialCertId.trim()) {
      return initialCertId.trim();
    }
    const cleanName = (studentName || 'Student').trim();
    const cleanTitle = (courseTitle || 'Course').trim();
    const storageKey = `clipzone_cert_code_${cleanName}_${cleanTitle}`;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return saved;
    } catch {}

    try {
      const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      if (Array.isArray(activeCodes) && activeCodes.length > 0 && activeCodes[0]) {
        try {
          localStorage.setItem(storageKey, activeCodes[0]);
        } catch {}
        return activeCodes[0];
      }
    } catch {}

    let hash = 0;
    const str = `${cleanName}_${cleanTitle}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const codeNum = (Math.abs(hash) % 900000) + 100000;
    const stableCode = `CLIP-${codeNum}`;
    try {
      localStorage.setItem(storageKey, stableCode);
    } catch {}
    return stableCode;
  }, [initialCertId, studentName, courseTitle]);

  const cleanCourseTitle = (courseTitle || 'AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS')
    .replace(/by Dhruv Rathee/gi, 'by HamroLms')
    .replace(/Dhruv Rathee/gi, 'HamroLms')
    .trim();

  const formattedAdDate = formatInternationalAdDate(issueDate);

  // Auto-scale certificate canvas cleanly across mobile and desktop viewports
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
        newScale = Math.min(1.0, Math.max(0.3, scaleByWidth));
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
    const node = document.getElementById('certificate-print-area');
    if (!node) {
      setIsDownloading(false);
      return;
    }

    const origTransform = node.style.transform;
    const origTransformOrigin = node.style.transformOrigin;

    try {
      if (document.fonts && document.fonts.ready) {
        try {
          await Promise.all([
            document.fonts.load('400 64px "Great Vibes"'),
            document.fonts.load('700 64px "Great Vibes"'),
            document.fonts.load('900 48px "Cinzel"'),
            document.fonts.load('700 48px "Cinzel"'),
            document.fonts.load('400 48px "Cinzel"'),
            document.fonts.load('600 22px "Playfair Display"'),
            document.fonts.ready,
          ]);
        } catch (e) {
          console.warn('Font preload exception:', e);
        }
      }

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
            } catch {}
          }
        })
      );

      node.style.transform = 'none';
      await new Promise((resolve) => setTimeout(resolve, 150));

      let dataUrl = '';

      try {
        const canvas = await html2canvas(node, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#f8f7f3',
          width: 1000,
          height: 707,
          scrollX: 0,
          scrollY: 0,
          logging: false,
          imageTimeout: 10000,
        });
        dataUrl = canvas.toDataURL('image/png', 1.0);
      } catch (canvasErr) {
        console.warn('html2canvas export failed, trying toPng fallback:', canvasErr);
        const placeholderPixel =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        dataUrl = await toPng(node, {
          quality: 1.0,
          pixelRatio: 2.5,
          cacheBust: false,
          fontEmbedCSS: CERTIFICATE_EMBEDDED_FONTS_CSS,
          skipFonts: false,
          width: 1000,
          height: 707,
          filter: () => true,
          imagePlaceholder: placeholderPixel,
        });
      }

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
      node.style.transform = origTransform;
      node.style.transformOrigin = origTransformOrigin;
      setIsDownloading(false);
    }
  };

  const handleCopyLink = () => {
    const text = `Verified Certificate of Completion - ${studentName} (${cleanCourseTitle}) - ID: ${certId} - HamroLms`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const studentInitials = useMemo(() => {
    const parts = (studentName || 'SL').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || 'SL').slice(0, 2).toUpperCase();
  }, [studentName]);

  const brandWordmark = (certificateInstituteName || instituteName || 'HAMROLMS')
    .trim()
    .toUpperCase();

  const sealWordmark = brandWordmark.length > 14 ? brandWordmark.slice(0, 14) : brandWordmark;
  const sealFontSize =
    sealWordmark.length > 11 ? '8.5' : sealWordmark.length > 8 ? '10.5' : '13';

  const resolvedTitle = (certificateTitle || 'CERTIFICATE').trim().toUpperCase();
  const titleFontSize =
    resolvedTitle.length > 18 ? '32px' : resolvedTitle.length > 13 ? '39px' : '46px';

  const resolvedSubtitle = (certificateSubtitle || 'OF ACHIEVEMENT').trim().toUpperCase();
  const subtitleFontSize = resolvedSubtitle.length > 22 ? '13.5px' : '16.5px';

  const cleanStudentName = (studentName || 'Student Learner').trim();
  const studentNameFontSize =
    cleanStudentName.length > 32
      ? '34px'
      : cleanStudentName.length > 26
        ? '40px'
        : cleanStudentName.length > 20
          ? '48px'
          : cleanStudentName.length > 15
            ? '56px'
            : '62px';

  const resolvedDescription =
    certificateDescription && certificateDescription.trim()
      ? certificateDescription.trim()
      : 'an advanced training in 30+ AI Tools covering AI Video Creation, AI Image Generation, AI Music & Song Creation, Graphic Design, Website Development, Professional Presentations, and other AI-powered digital skills.';

  const descriptionFontSize =
    resolvedDescription.length > 290
      ? '13px'
      : resolvedDescription.length > 230
        ? '14px'
        : '15.5px';

  const courseTitleFontSize =
    cleanCourseTitle.length > 56
      ? '13px'
      : cleanCourseTitle.length > 42
        ? '14.5px'
        : '16px';

  const resolvedDirectorName = (directorName || 'Director').trim();
  const resolvedDirectorTitle =
    !directorTitle || directorTitle.trim() === 'Course Director'
      ? 'PROGRAM DIRECTOR'
      : directorTitle.trim().toUpperCase();

  const trimmedCeoName = (ceoName || 'Founder/CEO (HamroLms)').trim();
  const isDefaultCeoLabel = trimmedCeoName === 'Founder/CEO (HamroLms)';
  const resolvedCeoPrimary = isDefaultCeoLabel ? 'Founder/CEO' : trimmedCeoName;
  const resolvedCeoSubline = isDefaultCeoLabel ? '(HamroLms)' : '';
  const resolvedCeoTitle = (ceoTitle || 'FOUNDER & CEO').trim().toUpperCase();

  const sealFooterText =
    (certificateSealText && certificateSealText.trim()) ||
    `OFFICIAL VERIFIED CERTIFICATE • ${brandWordmark}`;

  const hasValidPhoto = Boolean(
    studentPhoto && (studentPhoto.startsWith('data:') || studentPhoto.startsWith('http'))
  );

  // Only show custom uploaded image if admin uploaded something other than generic /logo.png
  const hasCustomAdminLogo = Boolean(
    embeddedLogo && logoUrl && logoUrl.trim() && !logoUrl.trim().endsWith('/logo.png')
  );

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
              background-color: #f8f7f3 !important;
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
        <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 sm:p-3 mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2.5 text-white shadow-xl z-20 print:hidden shrink-0">
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
                Verified Certificate issued by HamroLms
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {courses && courses.length > 1 && onSelectCourseId && (
              <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/90 rounded-xl px-3 py-1.5 text-xs text-slate-200">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                  🎓 Course:
                </span>
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

            <button
              onClick={handleCopyLink}
              className="bg-slate-800 hover:bg-slate-750 text-blue-300 text-xs font-bold px-3 py-2.5 rounded-xl border border-blue-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{copied ? 'Copied Details!' : 'Share'}</span>
            </button>

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
        <div
          ref={containerRef}
          className="w-full flex-1 flex flex-col items-center justify-center py-2 px-1 sm:px-2"
        >
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
                backgroundColor: '#f8f7f3',
                boxShadow: '0 26px 65px -15px rgba(2, 6, 23, 0.78)',
                boxSizing: 'border-box',
              }}
              className="absolute top-0 left-0 overflow-hidden select-none font-sans shrink-0 text-[#071e46]"
            >
              {/* Embedded Font Definitions for Image Capture */}
              <style>{`
                ${CERTIFICATE_EMBEDDED_FONTS_CSS}
                .cert-font-script { font-family: 'Great Vibes', cursive !important; font-weight: 400 !important; }
                .cert-font-cinzel { font-family: 'Cinzel', Georgia, serif !important; }
                .cert-font-playfair { font-family: 'Playfair Display', Georgia, serif !important; }
              `}</style>

              {/* LAYER 1: PAPER BASE, TECH CONSTELLATION, WATERMARK CAP & SWEEPING NAVY/GOLD WAVES */}
              <svg
                viewBox="0 0 1000 707"
                className="absolute inset-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="certTopRightGlow" cx="92%" cy="8%" r="46%">
                    <stop offset="0%" stopColor="#1e4d94" stopOpacity="0.44" />
                    <stop offset="48%" stopColor="#6090cc" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#f8f7f3" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="certBottomLeftGlow" cx="6%" cy="94%" r="38%">
                    <stop offset="0%" stopColor="#356eb8" stopOpacity="0.32" />
                    <stop offset="55%" stopColor="#8bb0de" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#f8f7f3" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="certTopNavyWave" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#02112e" />
                    <stop offset="55%" stopColor="#052459" />
                    <stop offset="100%" stopColor="#0a397f" />
                  </linearGradient>
                  <linearGradient id="certTopNavyHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0f4999" stopOpacity="0.52" />
                    <stop offset="100%" stopColor="#021332" stopOpacity="0.15" />
                  </linearGradient>
                  <linearGradient id="certGoldCurve" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#b98118" />
                    <stop offset="28%" stopColor="#f8de88" />
                    <stop offset="52%" stopColor="#d8a232" />
                    <stop offset="76%" stopColor="#fae394" />
                    <stop offset="100%" stopColor="#9c690e" />
                  </linearGradient>
                  <linearGradient id="certBottomNavyWave" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#021230" />
                    <stop offset="55%" stopColor="#062860" />
                    <stop offset="100%" stopColor="#0c428c" />
                  </linearGradient>
                </defs>

                {/* Base Warm Ivory Paper */}
                <rect width="1000" height="707" fill="#f8f7f3" />

                {/* Soft Blue Corner Washes */}
                <rect width="1000" height="707" fill="url(#certTopRightGlow)" />
                <rect width="1000" height="707" fill="url(#certBottomLeftGlow)" />

                {/* Faint Geometric Tech Constellation Mesh */}
                <g stroke="#64748b" strokeWidth="0.7" opacity="0.20" fill="#64748b">
                  <line x1="0" y1="450" x2="75" y2="510" />
                  <line x1="75" y1="510" x2="25" y2="590" />
                  <line x1="25" y1="590" x2="120" y2="635" />
                  <line x1="75" y1="510" x2="145" y2="555" />
                  <line x1="145" y1="555" x2="120" y2="635" />
                  <line x1="120" y1="635" x2="180" y2="707" />
                  <line x1="25" y1="590" x2="0" y2="670" />
                  <circle cx="75" cy="510" r="2" />
                  <circle cx="25" cy="590" r="2" />
                  <circle cx="145" cy="555" r="1.8" />
                  <circle cx="120" cy="635" r="2" />

                  <line x1="870" y1="0" x2="925" y2="65" />
                  <line x1="925" y1="65" x2="1000" y2="45" />
                  <line x1="925" y1="65" x2="975" y2="145" />
                  <line x1="910" y1="305" x2="968" y2="358" />
                  <line x1="968" y1="358" x2="922" y2="432" />
                  <line x1="922" y1="432" x2="848" y2="475" />
                  <line x1="968" y1="358" x2="1000" y2="320" />
                  <line x1="848" y1="475" x2="890" y2="545" />
                  <circle cx="925" cy="65" r="2" />
                  <circle cx="975" cy="145" r="1.8" />
                  <circle cx="910" cy="305" r="2" />
                  <circle cx="968" cy="358" r="2" />
                  <circle cx="922" cy="432" r="2" />
                  <circle cx="848" cy="475" r="1.8" />
                </g>

                {/* Faint Graduation Cap Watermark Behind Center-Right Area */}
                <g transform="translate(625, 195) scale(3.4)" fill="#94a3b8" opacity="0.10">
                  <polygon points="50,4 96,24 50,44 4,24" />
                  <polygon points="50,14 78,24 50,34 22,24" fill="#f8f7f3" />
                  <path d="M 24,33 L 24,52 C 24,60 36,66 50,66 C 64,66 76,60 76,52 L 76,33 L 50,44 Z" />
                  <rect x="8" y="25" width="3.5" height="24" />
                </g>

                {/* TOP-LEFT SWEEPING DEEP NAVY WAVE + METALLIC GOLD CURVE
                    Routed cleanly above CERTIFICATE (x=280, y=114) and grad cap ornament (x=385, y=82) */}
                <path
                  d="M 0,0 L 592,0 C 530,30 468,58 380,84 C 260,120 148,170 0,222 Z"
                  fill="url(#certTopNavyWave)"
                />
                <path
                  d="M 0,0 L 415,0 C 312,42 192,100 84,185 L 0,222 Z"
                  fill="url(#certTopNavyHighlight)"
                />
                <path
                  d="M 0,132 C 122,106 268,72 470,0 L 520,0 C 345,74 176,128 0,174 Z"
                  fill="#0b4696"
                  opacity="0.30"
                />
                <path
                  d="M 0,216 C 148,164 260,114 380,78 C 468,52 530,24 584,0 L 598,0 C 540,28 475,58 386,86 C 266,122 152,174 0,229 Z"
                  fill="url(#certGoldCurve)"
                />
                <path
                  d="M 0,229 C 152,174 266,122 386,86 C 475,58 540,28 598,0"
                  fill="none"
                  stroke="#9c6a0f"
                  strokeWidth="1"
                  opacity="0.6"
                />

                {/* BOTTOM-RIGHT SWEEPING DEEP NAVY CORNER + METALLIC GOLD SWOOSH
                    Hugs the bottom-right edge so Founder/CEO stays 100% clear on ivory */}
                <path
                  d="M 800,707 C 898,694 956,598 1000,452 L 1000,707 Z"
                  fill="url(#certBottomNavyWave)"
                />
                <path
                  d="M 860,707 C 928,686 972,606 1000,492 L 1000,707 Z"
                  fill="#02112b"
                  opacity="0.72"
                />
                <path
                  d="M 786,707 C 890,692 950,590 1000,438 L 1000,468 C 958,604 906,692 818,707 Z"
                  fill="url(#certGoldCurve)"
                />
                <path
                  d="M 786,707 C 890,692 950,590 1000,438"
                  fill="none"
                  stroke="#fce79c"
                  strokeWidth="1.4"
                />
              </svg>

              {/* LAYER 2: TOP-LEFT HEADER LOCKUP INSIDE DARK NAVY WAVE */}
              <div
                style={{ left: '46px', top: '20px', height: '58px', maxWidth: '295px' }}
                className="absolute z-20 flex items-center gap-3.5"
              >
                {hasCustomAdminLogo ? (
                  <img
                    src={embeddedLogo}
                    alt={brandWordmark}
                    crossOrigin={embeddedLogo.startsWith('http') ? 'anonymous' : undefined}
                    referrerPolicy="no-referrer"
                    className="h-12 w-auto max-w-[96px] object-contain shrink-0"
                  />
                ) : (
                  <svg viewBox="0 0 88 74" className="w-[58px] h-[49px] shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="46,4 84,21 46,38 8,21" fill="#ffffff" />
                    <polygon points="46,11 67,21 46,31 25,21" fill="#041e49" />
                    <polygon points="42,16 53,21 42,26" fill="#ffffff" />
                    <line x1="13" y1="24" x2="13" y2="44" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="10,44 16,44 17,51 9,51" fill="#ffffff" />
                    <path
                      d="M 22,40 C 31,42 39,46 46,52 C 53,46 61,42 70,40 L 70,56 C 61,58 53,62 46,68 C 39,62 31,58 22,56 Z"
                      fill="#ffffff"
                    />
                    <path d="M 27,45 L 44,53 L 44,62 L 27,54 Z" fill="#041e49" opacity="0.32" />
                    <path d="M 65,45 L 48,53 L 48,62 L 65,54 Z" fill="#041e49" opacity="0.32" />
                  </svg>
                )}

                <div
                  style={{ width: '1.5px', height: '48px', backgroundColor: 'rgba(255,255,255,0.65)' }}
                  className="shrink-0"
                />

                <div className="flex flex-col justify-center text-left leading-none min-w-0">
                  <div
                    style={{
                      fontSize: brandWordmark.length > 12 ? '21px' : '27px',
                      letterSpacing: '0.04em',
                    }}
                    className="font-sans font-black text-white uppercase leading-none whitespace-nowrap truncate max-w-[195px]"
                  >
                    {brandWordmark}
                  </div>
                  <div className="text-[11.5px] font-medium tracking-[0.07em] text-slate-200 mt-1.5 whitespace-nowrap">
                    Learn &nbsp;•&nbsp; Practice &nbsp;•&nbsp; Grow
                  </div>
                </div>
              </div>

              {/* LAYER 3: LEFT GOLD SCALLOPED MEDALLION SEAL WITH NAVY RIBBONS */}
              <div
                style={{ left: '22px', top: '146px', width: '176px', height: '254px' }}
                className="absolute z-20 pointer-events-none"
              >
                <svg viewBox="0 0 176 254" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="certSealRim" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#9d6b10" />
                      <stop offset="25%" stopColor="#f5d36d" />
                      <stop offset="50%" stopColor="#fff1b8" />
                      <stop offset="75%" stopColor="#ce9625" />
                      <stop offset="100%" stopColor="#855608" />
                    </linearGradient>
                    <radialGradient id="certSealFace" cx="42%" cy="35%" r="68%">
                      <stop offset="0%" stopColor="#fff2b5" />
                      <stop offset="45%" stopColor="#ebc357" />
                      <stop offset="85%" stopColor="#c78e20" />
                      <stop offset="100%" stopColor="#9a670c" />
                    </radialGradient>
                    <linearGradient id="certTailNavy" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#04193d" />
                      <stop offset="55%" stopColor="#0b3678" />
                      <stop offset="100%" stopColor="#02112b" />
                    </linearGradient>
                  </defs>

                  <g transform="translate(88, 138) rotate(14)">
                    <polygon points="-44,0 -4,0 -4,104 -24,84 -44,104" fill="url(#certTailNavy)" />
                    <polyline
                      points="-41,0 -41,97 -24,80 -7,97 -7,0"
                      fill="none"
                      stroke="#eab949"
                      strokeWidth="2.2"
                    />
                  </g>

                  <g transform="translate(88, 138) rotate(-14)">
                    <polygon points="4,0 44,0 44,104 24,84 4,104" fill="url(#certTailNavy)" />
                    <polyline
                      points="7,0 7,97 24,80 41,97 41,0"
                      fill="none"
                      stroke="#eab949"
                      strokeWidth="2.2"
                    />
                  </g>

                  <circle cx="88" cy="88" r="80" fill="#041430" opacity="0.28" />

                  <g transform="translate(88, 84)">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <polygon
                        key={i}
                        points="-6,-79 0,-84 6,-79 4,-66 -4,-66"
                        fill="url(#certSealRim)"
                        stroke="#7a4e07"
                        strokeWidth="0.5"
                        transform={`rotate(${i * 9})`}
                      />
                    ))}

                    <circle cx="0" cy="0" r="72" fill="url(#certSealRim)" stroke="#7c5008" strokeWidth="1.2" />
                    <circle cx="0" cy="0" r="65" fill="url(#certSealFace)" stroke="#8c5c0c" strokeWidth="1.4" />
                    <circle cx="0" cy="0" r="59" fill="none" stroke="#fff3c4" strokeWidth="1" opacity="0.7" />
                    <circle cx="0" cy="0" r="54" fill="none" stroke="#6f4607" strokeWidth="1.2" opacity="0.65" />

                    {[-1, 1].map((side) => (
                      <g key={side} transform={`scale(${side}, 1)`}>
                        <path
                          d="M -16,42 C -40,34 -50,8 -42,-22"
                          fill="none"
                          stroke="#593605"
                          strokeWidth="1.3"
                        />
                        {[
                          [-40, -24, -45],
                          [-44, -12, -25],
                          [-45, 0, -5],
                          [-43, 12, 15],
                          [-37, 24, 35],
                          [-28, 34, 52],
                        ].map(([lx, ly, rot], idx) => (
                          <ellipse
                            key={idx}
                            cx={lx}
                            cy={ly}
                            rx="5.4"
                            ry="2.3"
                            fill="#4d2e04"
                            transform={`rotate(${rot} ${lx} ${ly})`}
                          />
                        ))}
                      </g>
                    ))}

                    <g transform="translate(0, -24)">
                      <polygon points="0,-16 21,-6 0,4 -21,-6" fill="#171717" />
                      <polygon points="-4,-8 5,-6 -4,-4" fill="#f5d36d" />
                      <path d="M -11,1 L -11,9 C -11,13 11,13 11,9 L 11,1 L 0,6 Z" fill="#171717" />
                      <line x1="-18" y1="-5" x2="-18" y2="6" stroke="#171717" strokeWidth="1.8" />
                    </g>

                    <text
                      x="0"
                      y="7"
                      textAnchor="middle"
                      fill="#1a1204"
                      fontSize={sealFontSize}
                      fontWeight="900"
                      fontFamily="sans-serif"
                      letterSpacing="0.5"
                    >
                      {sealWordmark}
                    </text>

                    <polygon points={renderStarPoints(-22, 23, 3.6, 1.5)} fill="#1a1204" />
                    <polygon points={renderStarPoints(-11, 26, 4.0, 1.7)} fill="#1a1204" />
                    <polygon points={renderStarPoints(0, 27.5, 4.5, 1.9)} fill="#1a1204" />
                    <polygon points={renderStarPoints(11, 26, 4.0, 1.7)} fill="#1a1204" />
                    <polygon points={renderStarPoints(22, 23, 3.6, 1.5)} fill="#1a1204" />
                  </g>
                </svg>
              </div>

              {/* LAYER 4: TOP-RIGHT STUDENT PHOTO CARD */}
              <div
                style={{
                  right: '46px',
                  top: '116px',
                  width: '148px',
                  height: '148px',
                  borderRadius: '20px',
                  backgroundColor: '#ffffff',
                  padding: '6px',
                  boxShadow: '0 10px 26px rgba(4, 21, 54, 0.16)',
                }}
                className="absolute z-20 flex items-center justify-center"
              >
                <div
                  style={{ borderRadius: '14px' }}
                  className="w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center"
                >
                  {hasValidPhoto ? (
                    <img
                      src={studentPhoto}
                      alt={cleanStudentName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#07295e] to-[#02122b] text-[#f5d36d] font-black text-3xl cert-font-cinzel">
                      {studentInitials}
                    </div>
                  )}
                </div>
              </div>

              {/* LAYER 5: SINGLE UNIFIED VERTICAL FLEX STACK FOR ALL CENTER TEXT (ZERO VERTICAL OVERLAP POSSIBLE) */}
              <div
                style={{ left: '165px', right: '165px', top: '96px', bottom: '140px' }}
                className="absolute z-20 flex flex-col items-center justify-between text-center"
              >
                {/* Upper Header Group (kept strictly inside 550px width away from Seal & Photo) */}
                <div className="w-full max-w-[550px] flex flex-col items-center">
                  {/* Graduation Cap Ornament + Side Gold Lines */}
                  <div className="flex items-center justify-center gap-3 w-[280px]">
                    <div
                      style={{ background: 'linear-gradient(to right, transparent, #c79324)', height: '1.5px' }}
                      className="flex-1"
                    />
                    <svg viewBox="0 0 68 42" className="w-[50px] h-[31px] shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="certTopCapGold" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#9e6d10" />
                          <stop offset="50%" stopColor="#f2cf6c" />
                          <stop offset="100%" stopColor="#9e6d10" />
                        </linearGradient>
                      </defs>
                      <polygon points="34,3 65,16 34,28 3,16" fill="#1b263b" stroke="url(#certTopCapGold)" strokeWidth="1.5" />
                      <path d="M 16,22 L 16,32 C 16,37 24,40 34,40 C 44,40 52,37 52,32 L 52,22 L 34,29 Z" fill="#232c3d" />
                      <path d="M 16,30 C 23,34 45,34 52,30" fill="none" stroke="url(#certTopCapGold)" strokeWidth="1.6" />
                      <line x1="12" y1="19" x2="12" y2="33" stroke="#d9a633" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="12" cy="35" r="2.2" fill="#e8ba48" />
                    </svg>
                    <div
                      style={{ background: 'linear-gradient(to left, transparent, #c79324)', height: '1.5px' }}
                      className="flex-1"
                    />
                  </div>

                  {/* Main Title: CERTIFICATE */}
                  <h1
                    style={{
                      fontSize: titleFontSize,
                      color: '#b68014',
                      textShadow: '0 1.5px 0 #593a05, 0 3px 6px rgba(5, 22, 54, 0.24)',
                      letterSpacing: '0.07em',
                    }}
                    className="cert-font-cinzel font-black uppercase leading-none mt-1 whitespace-nowrap"
                  >
                    {resolvedTitle}
                  </h1>

                  {/* Subtitle: OF ACHIEVEMENT */}
                  <h2
                    style={{
                      fontSize: subtitleFontSize,
                      color: '#0a1f44',
                      letterSpacing: '0.32em',
                    }}
                    className="cert-font-cinzel font-bold uppercase leading-none mt-2 whitespace-nowrap"
                  >
                    {resolvedSubtitle}
                  </h2>

                  {/* Subtle Gold Diamond Accent */}
                  <div className="flex items-center justify-center gap-2 w-[290px] mt-2">
                    <div
                      style={{
                        background: 'linear-gradient(to right, transparent, rgba(212, 162, 56, 0.85))',
                      }}
                      className="h-[1px] flex-1"
                    />
                    <span style={{ color: '#d4a238' }} className="text-[10px] leading-none">◆</span>
                    <div
                      style={{
                        background: 'linear-gradient(to left, transparent, rgba(212, 162, 56, 0.85))',
                      }}
                      className="h-[1px] flex-1"
                    />
                  </div>
                </div>

                {/* Middle Recipient & Achievement Group (strictly inside 550px width away from Seal & Photo) */}
                <div className="w-full max-w-[550px] flex flex-col items-center">
                  <p
                    style={{ color: '#0b2147' }}
                    className="cert-font-playfair italic text-[21px] font-medium leading-tight mb-3.5"
                  >
                    This is to certify that
                  </p>

                  <h2
                    style={{
                      fontFamily: "'Great Vibes', cursive",
                      fontSize: studentNameFontSize,
                      color: '#061c46',
                      lineHeight: 1.12,
                    }}
                    className="cert-font-script font-normal tracking-wide whitespace-nowrap mt-0.5 px-2"
                  >
                    {cleanStudentName}
                  </h2>

                  <div className="flex items-center justify-center gap-2.5 w-[440px] mt-0.5">
                    <div
                      style={{
                        background: 'linear-gradient(to right, transparent, #c99422)',
                        height: '1.5px',
                      }}
                      className="flex-1"
                    />
                    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <polygon points={renderStarPoints(12, 12, 10, 4.2)} fill="#cf9928" />
                    </svg>
                    <div
                      style={{
                        background: 'linear-gradient(to left, transparent, #c99422)',
                        height: '1.5px',
                      }}
                      className="flex-1"
                    />
                  </div>

                  <p
                    style={{
                      color: '#0a1f44',
                      letterSpacing: '0.26em',
                    }}
                    className="cert-font-cinzel text-[14.5px] font-bold uppercase leading-tight mt-2 whitespace-nowrap"
                  >
                    HAS SUCCESSFULLY COMPLETED
                  </p>
                </div>

                {/* Lower Course Title & Description Group (sits below seal ribbons & photo, safely above footer) */}
                <div className="w-full flex flex-col items-center">
                  <h3
                    style={{
                      fontSize: courseTitleFontSize,
                      color: '#051a40',
                      maxWidth: '550px',
                    }}
                    className="font-sans font-extrabold tracking-[0.04em] uppercase leading-tight whitespace-nowrap truncate px-2"
                  >
                    {cleanCourseTitle}
                  </h3>

                  <p
                    style={{
                      fontSize: descriptionFontSize,
                      color: '#0b2147',
                      maxWidth: '650px',
                    }}
                    className="cert-font-playfair italic leading-[1.42] mt-2 px-3"
                  >
                    {resolvedDescription}
                  </p>
                </div>
              </div>

              {/* LAYER 6: FOOTER SIGNATURES, VERTICAL DIVIDERS & CENTER DATE/VERIFY INFO */}
              <div
                style={{ left: '56px', width: '888px', bottom: '28px', height: '110px' }}
                className="absolute z-20 flex items-end justify-between text-center"
              >
                {/* Left Column: Director Signature */}
                <div style={{ width: '215px' }} className="flex flex-col items-center justify-end pb-1 shrink-0">
                  <div className="h-[44px] flex items-end justify-center w-full">
                    {directorSignatureUrl && directorSignatureUrl.trim() ? (
                      <img
                        src={directorSignatureUrl.trim()}
                        alt="Director Signature"
                        className="h-10 w-auto max-w-[155px] object-contain mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg
                        viewBox="0 0 180 56"
                        className="w-[144px] h-[42px]"
                        fill="none"
                        stroke="#0a1c3d"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M 28 40 C 18 35, 16 14, 34 10 C 50 7, 48 36, 30 43 C 20 47, 26 24, 52 20 C 66 18, 60 35, 76 28 C 84 24, 88 32, 102 26 C 110 22, 118 30, 134 24"
                          strokeWidth="2.4"
                        />
                        <path
                          d="M 118 18 Q 138 11, 148 22 Q 130 37, 106 42 C 78 47, 128 42, 160 39"
                          strokeWidth="1.7"
                        />
                        <circle cx="164" cy="38" r="1.7" fill="#0a1c3d" />
                      </svg>
                    )}
                  </div>
                  <div
                    style={{ backgroundColor: '#c79324', height: '1.5px' }}
                    className="w-[154px] my-1.5"
                  />
                  <span className="text-[13.5px] font-bold text-[#071e46] leading-tight whitespace-nowrap truncate max-w-[205px]">
                    {resolvedDirectorName}
                  </span>
                  <span className="text-[10.5px] font-bold text-[#102954] tracking-[0.06em] uppercase leading-tight mt-0.5 whitespace-nowrap truncate max-w-[205px]">
                    {resolvedDirectorTitle}
                  </span>
                </div>

                {/* Vertical Gold Divider 1 */}
                <div
                  style={{ backgroundColor: '#d4a238', height: '62px' }}
                  className="w-[1px] self-center opacity-80 shrink-0"
                />

                {/* Center Column: Date of Issue, Verify Code & Footer Seal Line */}
                <div className="flex-1 flex flex-col items-center justify-end pb-1.5 px-3 min-w-0">
                  {certificateStampUrl && certificateStampUrl.trim() && (
                    <img
                      src={certificateStampUrl.trim()}
                      alt="Official Seal"
                      className="w-9 h-9 object-contain mx-auto mb-1 opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                  <span className="text-[15.5px] font-extrabold text-[#071e46] tracking-wide leading-snug whitespace-nowrap">
                    Date of issue: {formattedAdDate}
                  </span>
                  <span className="text-[14px] font-bold text-[#1d70c8] tracking-wide mt-0.5 leading-snug whitespace-nowrap">
                    Verify: {certId}
                  </span>
                  <span className="text-[9.5px] font-semibold tracking-[0.13em] text-[#0b2147] uppercase mt-1 leading-snug whitespace-nowrap">
                    {sealFooterText}
                  </span>
                </div>

                {/* Vertical Gold Divider 2 */}
                <div
                  style={{ backgroundColor: '#d4a238', height: '62px' }}
                  className="w-[1px] self-center opacity-80 shrink-0"
                />

                {/* Right Column: Founder/CEO Signature */}
                <div style={{ width: '188px', marginRight: '58px' }} className="flex flex-col items-center justify-end pb-1 shrink-0">
                  <div className="h-[44px] flex items-end justify-center w-full">
                    {ceoSignatureUrl && ceoSignatureUrl.trim() ? (
                      <img
                        src={ceoSignatureUrl.trim()}
                        alt="CEO Signature"
                        className="h-10 w-auto max-w-[150px] object-contain mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <svg
                        viewBox="0 0 180 56"
                        className="w-[144px] h-[42px]"
                        fill="none"
                        stroke="#0a1c3d"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path
                          d="M 26 42 C 16 18, 36 8, 54 12 C 66 15, 46 39, 32 31 C 22 25, 42 12, 70 19 C 86 23, 82 37, 98 28 C 110 21, 118 32, 134 22 C 142 17, 148 24, 156 20"
                          strokeWidth="2.4"
                        />
                        <path
                          d="M 34 34 C 66 27, 108 26, 148 31 C 160 33, 166 29, 160 25 C 152 21, 140 27, 132 33 C 118 41, 146 42, 166 40"
                          strokeWidth="1.6"
                        />
                        <circle cx="170" cy="39" r="1.7" fill="#0a1c3d" />
                      </svg>
                    )}
                  </div>
                  <div
                    style={{ backgroundColor: '#c79324', height: '1.5px' }}
                    className="w-[148px] my-1.5"
                  />
                  <span className="text-[13.5px] font-bold text-[#071e46] leading-tight whitespace-nowrap truncate max-w-[170px]">
                    {resolvedCeoPrimary}
                  </span>
                  {resolvedCeoSubline && (
                    <span className="text-[12.5px] font-bold text-[#071e46] leading-tight whitespace-nowrap">
                      {resolvedCeoSubline}
                    </span>
                  )}
                  <span className="text-[10.5px] font-bold text-[#102954] tracking-[0.06em] uppercase leading-tight mt-0.5 whitespace-nowrap truncate max-w-[170px]">
                    {resolvedCeoTitle}
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
            <span>
              Official digital credential verified by HamroLms. Download high-resolution PNG image
              directly.
            </span>
          </p>
        </div>
      </div>
    </AnimatePresence>
  );
};
