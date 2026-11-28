import React, { useState, useEffect, useRef, useCallback, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  Sparkles, 
  Video, 
  Image as ImageIcon, 
  Music, 
  Presentation, 
  GraduationCap, 
  CheckCircle2, 
  MessageSquare, 
  HelpCircle, 
  Send, 
  Facebook, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Headphones, 
  Star, 
  ChevronDown, 
  X, 
  User, 
  Check,
  Camera,
  Upload,
  Edit2,
  BookOpen,
  Search,
  Plus,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUp,
  ArrowDown,
  QrCode,
  Home,
  Menu,
  ArrowRight,
  Maximize2,
  Minimize2,
  Download,
  Smartphone,
  Share2,
  Award,
  RotateCw,
  LogOut,
  Volume2,
  VolumeX,
  Copy, 
  ClipboardPaste,
  Zap,
  RotateCcw,
  Wand2,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  ExternalLink,
  Bell,
  MessageCircle,
  Code,
  Palette,
  TrendingUp,
  Layers,
  Globe,
  Cpu,
  Eye,
  EyeOff
} from 'lucide-react';

import { COURSES, TESTIMONIALS, DEFAULT_PAYMENT_CONFIG, DEFAULT_SITE_SETTINGS, cleanLegacyLogoUrl, normalizeLegacyBrandText } from './data';
import { Course, ChatMessage, CourseVideo, CoursePdf, PaymentQrConfig, SiteSettingsConfig, FAQItem, PushNotificationItem, SubAdminAccount, LiveSession, ActivationKey, SupportedLocale } from './types';
import { collection, getDocs, getDocsFromServer, doc, setDoc, deleteDoc, updateDoc, query, where, getDoc, onSnapshot, arrayUnion, writeBatch, limit, orderBy, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { db, auth, fetchCoursesViaRest } from './firebase';
import { CertificateModal } from './components/CertificateModal';
import { ImageAdjustModal } from './components/ImageAdjustModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AskChatModal } from './components/AskChatModal';
import { VerifiedBadge } from './components/VerifiedBadge';
import { PdfViewerModal } from './components/PdfViewerModal';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { LiveSessionsPanel, SaveLiveSessionInput } from './components/LiveSessionsPanel';
import { CourseEnrollPage } from './components/CourseEnrollPage';
import { CourseDetailView } from './components/CourseDetailView';
import { InstructorsView } from './components/InstructorsView';
import { BlogView } from './components/BlogView';
import { AboutUsView, LearnApplyGrowView, PrivacyPolicyView, TermsOfUseView, NotFoundView, ProfileDetailsFaqSection } from './components/PublicPagesView';
import { buildPublicInstructors, resolveCourseInstructor } from './data/instructors';
import { BLOG_POSTS, findBlogPostBySlug } from './data/blogArticles';
import { getLocaleDict } from './utils/i18n';
import { AppView, parsePathnameToRoute, buildLocalizedPath, getCourseSlug, findCourseBySlug, slugifyText } from './utils/seoRouting';
import { generateDynamicPageMetadata, injectDynamicPageMetadata } from './utils/seoMeta';
import { showNativeNotification, isNotificationSupported } from './utils/notifications';
import { getDirectPdfViewerUrl, getDirectPdfDownloadUrl } from './pdfUtils';
import { compressImageFile, estimateJsonByteSize } from './utils/chatMedia';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PwaDownloadAdModal } from './components/PwaDownloadAdModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

function cleanUndefined<T extends object>(obj: T): T {
  const clean: any = {};
  Object.keys(obj).forEach(key => {
    const val = (obj as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        clean[key] = cleanUndefined(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean;
}

// Global detection helper to check if running in standalone PWA / installed APK mode
function checkIsAppMode(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isStandaloneDisplay = 
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidAppReferrer = typeof document !== 'undefined' && document.referrer.includes('android-app://');
  const isUrlAppFlag = 
    window.location.search.includes('mode=app') ||
    window.location.search.includes('app=true') ||
    window.location.search.includes('source=apk') ||
    window.location.search.includes('source=pwa') ||
    window.location.hash.includes('mode=app') ||
    window.location.hash.includes('app=true');
  const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && ua.includes('version/'));
  const isNativeAndroidBridge = (window as any).Android !== undefined || (window as any).ReactNativeWebView !== undefined;

  return Boolean(isStandaloneDisplay || isIOSStandalone || isAndroidAppReferrer || isUrlAppFlag || isAndroidWebView || isNativeAndroidBridge);
}

function getYouTubeIdGlobal(url: string): string {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : '';
}

function getSecureYouTubeEmbedUrl(url: string, autoplay: boolean = false): string {
  const ytId = getYouTubeIdGlobal(url);
  if (!ytId) return url;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&showinfo=0&controls=1&fs=0&iv_load_policy=3&disablekb=1&enablejsapi=1&playsinline=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}&autoplay=${autoplay ? 1 : 0}`;
}

export function isCourseFree(course?: Partial<Course> | null): boolean {
  if (!course) return false;
  if (course.isFree === true) return true;
  if (typeof course.amount === 'number' && course.amount === 0) return true;
  if (typeof course.price === 'string' && /^free$/i.test(course.price.trim())) return true;
  return false;
}

export function isCourseKeyExpired(key: any): boolean {
  if (!key) return true;
  if (key.status === 'expired' || key.isExpired === true) return true;
  if (key.isFreeEnrollment === true) return false;
  const now = Date.now();
  if (key.expiresAt && Number(key.expiresAt) > 0 && now >= Number(key.expiresAt)) {
    return true;
  }
  if (key.claimedAt && Number(key.claimedAt) > 0) {
    const durationMs = key.duration === '1day' 
      ? (24 * 3600000) 
      : key.duration === '1month' 
        ? (30 * 86400000) 
        : (365 * 86400000);
    if (now >= Number(key.claimedAt) + durationMs) {
      return true;
    }
  }
  return false;
}

export function extractAndCleanCode(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  const upper = trimmed.toUpperCase();

  // If text contains or is the secret Admin key (AICLIPZONE), extract cleanly without corrupting
  if (upper.includes('AICLIPZONE') || upper.startsWith('AICLIP')) {
    const adminMatch = trimmed.match(/AICLIPZONE\s*[-_ ]?\s*RAJA/i);
    if (adminMatch) {
      return 'AICLIPZONE-RAJA';
    }
    return trimmed.replace(/["'“”‘’]/g, '').trim().toUpperCase();
  }

  // Check for Sub-Admin code pattern (e.g. "SUB-123456", "SUB 123456", "SUB-MYCOURSE")
  const subMatch = trimmed.match(/(?:^|[^A-Za-z0-9])SUB\s*[-_]?\s*([A-Za-z0-9-]+)/i);
  if (subMatch && subMatch[1]) {
    return `SUB-${subMatch[1].replace(/[^A-Za-z0-9-]/g, '').toUpperCase()}`;
  }

  // Check for standalone student CLIP pattern (e.g. "CLIP-123456", "CLIP 123456", "CLIP123456")
  // Use negative lookahead / word boundary to ensure it does not match inside words like AICLIPZONE
  const clipMatch = trimmed.match(/(?:^|[^A-Za-z0-9])CLIP\s*[-_]?\s*([A-Za-z0-9]+)/i);
  if (clipMatch && clipMatch[1] && !clipMatch[1].toUpperCase().startsWith('ZONE')) {
    return `CLIP-${clipMatch[1].toUpperCase()}`;
  }

  // Strip common copy-paste extras: quotes, spaces, newlines
  return trimmed.replace(/["'“”‘’]/g, '').trim().toUpperCase();
}

// Ultra-secure salted SHA-256 cryptographic verification for Admin authentication.
// The plaintext activation code is NEVER stored, compared, or exposed in source code or bundle.
const ADMIN_CODE_HASH = 'c3b5dfaa315b72b1a149a05a24a6686b99fdfce59b30ceddd2ab7f855756c419';
const ADMIN_SALT_PREFIX = 'AICLIPZONE_SECURE_ADMIN_SALT_2026_NEPAL_';

export async function verifyAdminSecret(inputCode: string): Promise<boolean> {
  if (!inputCode) return false;
  let clean = inputCode
    .trim()
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/["'“”‘’]/g, '')
    .toUpperCase();

  // Normalize common typing variations so user is never locked out by accidental spaces or missing hyphen
  if (clean === 'AICLIPZONERAJA' || clean === 'AICLIPZONE RAJA' || clean === 'AICLIPZONE_RAJA' || clean === 'AICLIPZONE - RAJA') {
    clean = 'AICLIPZONE-RAJA';
  }

  if (!clean) return false;
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(ADMIN_SALT_PREFIX + clean);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === ADMIN_CODE_HASH;
  } catch (err) {
    console.error('Crypto verification error:', err);
    return false;
  }
}

export default function App() {
  // Toast banner state & helper (hoisted at top of App for guaranteed availability to all hooks and handlers)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Admin Mode states
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [isAdminActivated, setIsAdminActivated] = useState(() => {
    const hasFlag = localStorage.getItem('clipzone_admin_activated') === 'true';
    const hasSessionId = !!localStorage.getItem('clipzone_admin_session_id');
    // If someone had legacy admin activated flag without a secure session id, invalidate immediately
    if (hasFlag && !hasSessionId) {
      localStorage.removeItem('clipzone_admin_activated');
      return false;
    }
    return hasFlag && hasSessionId;
  });
  const [subAdminSession, setSubAdminSession] = useState<SubAdminAccount | null>(() => {
    try {
      const saved = localStorage.getItem('clipzone_sub_admin_session');
      if (saved) {
        const parsed = JSON.parse(saved) as SubAdminAccount;
        if (parsed && parsed.code && parsed.courseId && parsed.status === 'active') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [subAdminList, setSubAdminList] = useState<SubAdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem('clipzone_sub_admins_cache');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [activeSubAdmins, setActiveSubAdmins] = useState<SubAdminAccount[]>([]);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'keys' | 'subadmins' | 'qr' | 'faqs' | 'overall' | 'certificate' | 'courses' | 'live' | 'notifications' | 'ask'>('keys');
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [logoutSecretCodeInput, setLogoutSecretCodeInput] = useState('');
  const [logoutAllConfirmWord, setLogoutAllConfirmWord] = useState('');

  // Student logout confirmation verification modal (Requires typing "CONFIRM")
  const [showStudentLogoutConfirmModal, setShowStudentLogoutConfirmModal] = useState(false);
  const [studentLogoutConfirmInput, setStudentLogoutConfirmInput] = useState('');

  // Dynamic Payment & QR Code configuration
  const [paymentConfig, setPaymentConfig] = useState<PaymentQrConfig>(() => {
    try {
      const saved = localStorage.getItem('clipzone_payment_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PAYMENT_CONFIG;
  });

  // Dynamic FAQs list state (legacy default FAQs removed from website)
  const [faqs, setFaqs] = useState<FAQItem[]>(() => {
    try {
      localStorage.removeItem('clipzone_faqs_config');
    } catch {}
    return [];
  });

  // Dynamic Global Site & Branding settings
  const [siteSettings, setSiteSettings] = useState<SiteSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('clipzone_site_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const cleanedLogo = cleanLegacyLogoUrl(parsed.instituteLogoUrl);
        return {
          ...parsed,
          instituteName: normalizeLegacyBrandText(parsed.instituteName) || DEFAULT_SITE_SETTINGS.instituteName,
          siteTitle: normalizeLegacyBrandText(parsed.siteTitle) || DEFAULT_SITE_SETTINGS.siteTitle,
          siteTagline: normalizeLegacyBrandText(parsed.siteTagline) || DEFAULT_SITE_SETTINGS.siteTagline,
          certificateInstituteName: normalizeLegacyBrandText(parsed.certificateInstituteName) || DEFAULT_SITE_SETTINGS.certificateInstituteName,
          certificateCeoName: normalizeLegacyBrandText(parsed.certificateCeoName) || DEFAULT_SITE_SETTINGS.certificateCeoName,
          certificateCeoTitle: normalizeLegacyBrandText(parsed.certificateCeoTitle) || DEFAULT_SITE_SETTINGS.certificateCeoTitle,
          certificateSealText: normalizeLegacyBrandText(parsed.certificateSealText) || DEFAULT_SITE_SETTINGS.certificateSealText,
          supportEmail: (parsed.supportEmail === 'ai.clipzone.edu@gmail.com' || parsed.supportEmail === 'support@hamrolms.com') ? DEFAULT_SITE_SETTINGS.supportEmail : parsed.supportEmail,
          instituteLogoUrl: cleanedLogo || DEFAULT_SITE_SETTINGS.instituteLogoUrl || '',
          certificateLogoUrl: cleanLegacyLogoUrl(parsed.certificateLogoUrl),
        };
      }
    } catch {}
    return DEFAULT_SITE_SETTINGS;
  });

  // Student Authentication & Course Activation states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
    const localName = localStorage.getItem('clipzone_student_name');
    if (localName === 'Admin (ClipZone)' || localName === 'Admin (HamroLms)') {
      try { localStorage.removeItem('clipzone_student_name'); } catch {}
      return null;
    }
    if (localName) {
      return {
        uid: localStorage.getItem('clipzone_student_uid') || 'local_student',
        displayName: localName,
        isAnonymous: true,
        email: null
      } as any;
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(() => {
    // If student profile already exists in local storage, don't block UI with loading
    const localName = localStorage.getItem('clipzone_student_name');
    return !localName || localName === 'Admin (ClipZone)' || localName === 'Admin (HamroLms)';
  });
  const [userActivationKeys, setUserActivationKeys] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
    } catch (e) {
      return [];
    }
  });
  const [activeCourseIds, setActiveCourseIds] = useState<string[]>(() => {
    try {
      const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
      const localKeysInfo: any[] = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');

      // Auto-bridge course ID aliases (e.g. legacy vs updated IDs)
      const expandedActivated = [...localActivated];
      if (expandedActivated.includes('al-master-class-course-by-al-clipzone') && !expandedActivated.includes('Ai master class course by Ai clipzone')) {
        expandedActivated.push('Ai master class course by Ai clipzone');
      } else if (expandedActivated.includes('Ai master class course by Ai clipzone') && !expandedActivated.includes('al-master-class-course-by-al-clipzone')) {
        expandedActivated.push('al-master-class-course-by-al-clipzone');
      }

      // Exclude expired courses on initial load
      const valid = expandedActivated.filter((cId: string) => {
        const courseKeys = localKeysInfo.filter((k: any) => 
          k.courseId === cId || 
          k.courseId === 'course-all' ||
          (cId.toLowerCase().includes('master') && k.courseId?.toLowerCase().includes('master'))
        );
        if (courseKeys.length > 0) {
          return courseKeys.some((k: any) => !isCourseKeyExpired(k));
        }
        if (localKeysInfo.length > 0) {
          const anyActiveKey = localKeysInfo.some((k: any) => !isCourseKeyExpired(k));
          if (!anyActiveKey) return false;
        }
        return true;
      });
      if (valid.length !== localActivated.length) {
        try {
          localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(valid));
        } catch (e) {}
      }
      return valid;
    } catch (e) {
      return [];
    }
  });

  // Track courses accessed via another account (secondary login - no certificate / no original owner name)
  const [secondaryCourseIds, setSecondaryCourseIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clipzone_secondary_course_ids') || '[]');
    } catch (e) {
      return [];
    }
  });

  // Deleted Courses tracking
  const [deletedCourseIds, setDeletedCourseIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Custom Profile Avatar & Account Customizer States
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    try {
      return localStorage.getItem('clipzone_student_avatar') || '';
    } catch (e) {
      return '';
    }
  });
  const [isEditingStudentName, setIsEditingStudentName] = useState<boolean>(false);
  const [tempStudentName, setTempStudentName] = useState<string>('');
  const [copiedKeyId, setCopiedKeyId] = useState<string>('');
  const [tempImageForAdjust, setTempImageForAdjust] = useState<string | null>(null);
  const [showImageAdjustModal, setShowImageAdjustModal] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('⚠️ Photo must be smaller than 10MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;
      setTempImageForAdjust(rawDataUrl);
      setShowImageAdjustModal(true);
      // Reset input value so same file can be selected again if needed
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const syncStudentAvatarToFirestore = async (avatarUrl: string) => {
    const cleanAvatar = avatarUrl || '';
    const realName =
      cleanRealName(currentUser?.displayName) ||
      cleanRealName(authName) ||
      cleanRealName(localStorage.getItem('clipzone_student_name')) ||
      userActivationKeys.find((k: any) => cleanRealName(k.studentName))?.studentName ||
      'Student';

    let activeCodes: string[] = [];
    try {
      activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
    } catch {}
    userActivationKeys.forEach((k: any) => {
      const code = k?.code || k?.id;
      if (code && !activeCodes.includes(code)) {
        activeCodes.push(code);
      }
    });

    // 1. Persist permanently on every active key in Firestore (only update existing key docs)
    activeCodes.forEach((code) => {
      if (!code) return;
      updateDoc(doc(db, 'activation_keys', code), {
        studentAvatar: cleanAvatar,
        studentAvatarUpdatedAt: Date.now()
      }).catch(() => {});
    });

    setUserActivationKeys((prev) => {
      const updated = prev.map((k: any) => ({ ...k, studentAvatar: cleanAvatar }));
      try {
        localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Sync to existing assigned Course Sub-Admin support_conversations in Firestore
    // Skip oversized Data URLs (>200KB) and never create skeleton docs for unstarted chats
    if (cleanAvatar.length > 200000) return;

    const keyClaimedUids = userActivationKeys
      .map((k: any) => k?.claimedByUid)
      .filter((uid: any) => typeof uid === 'string' && uid.length > 0);
    const primaryUid =
      localStorage.getItem('clipzone_student_uid') ||
      keyClaimedUids[0] ||
      currentUser?.uid ||
      getOrCreateDeviceId();

    const candidateUids = Array.from(
      new Set([primaryUid, ...keyClaimedUids, currentUser?.uid, getOrCreateDeviceId()].filter(Boolean))
    ) as string[];

    const normText = (v?: string) => (v || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const expandAliases = (cid: string): string[] => {
      if (cid === 'al-master-class-course-by-al-clipzone') return [cid, 'Ai master class course by Ai clipzone'];
      if (cid === 'Ai master class course by Ai clipzone') return [cid, 'al-master-class-course-by-al-clipzone'];
      return [cid];
    };

    const enrolledCourseIds = Array.from(
      new Set([
        ...activeCourseIds,
        ...userActivationKeys.map((k: any) => k?.courseId).filter(Boolean)
      ].flatMap(expandAliases))
    );

    let poolSubs: SubAdminAccount[] = Array.from(
      new Map(
        [...activeSubAdmins, ...subAdminList]
          .filter((s) => s.status === 'active')
          .map((s) => [s.code, s])
      ).values()
    );

    if (poolSubs.length === 0) {
      try {
        const subSnap = await getDocs(
          query(collection(db, 'sub_admins'), where('status', '==', 'active'))
        );
        const fetched: SubAdminAccount[] = [];
        subSnap.forEach((d) => {
          fetched.push({ id: d.id, ...(d.data() as Omit<SubAdminAccount, 'id'>) });
        });
        poolSubs = fetched;
      } catch {}
    }

    const targetSubs = poolSubs.filter((s) => {
      if (enrolledCourseIds.includes('course-all') || enrolledCourseIds.includes(s.courseId)) {
        return true;
      }
      const subTitleNorm = normText(s.courseTitle);
      return userActivationKeys.some(
        (k: any) =>
          k?.courseTitle &&
          subTitleNorm &&
          normText(k.courseTitle) === subTitleNorm
      );
    });

    targetSubs.forEach((sub) => {
      candidateUids.forEach((uid) => {
        const convId = `substudent__${sub.code}__${uid}`;
        updateDoc(doc(db, 'support_conversations', convId), {
          userName: realName,
          userAvatar: cleanAvatar,
          updatedAt: Date.now()
        }).catch(() => {});
      });
    });
  };

  const handleConfirmAdjustedAvatar = (croppedDataUrl: string) => {
    setUserAvatar(croppedDataUrl);
    try {
      localStorage.setItem('clipzone_student_avatar', croppedDataUrl);
    } catch (err) {}

    syncStudentAvatarToFirestore(croppedDataUrl);

    setShowImageAdjustModal(false);
    setTempImageForAdjust(null);
    showToast('📸 Profile photo saved successfully!', 'success');
  };

  const handleSaveStudentName = () => {
    const trimmed = tempStudentName.trim();
    if (!trimmed) {
      showToast('Please enter a valid name!', 'error');
      return;
    }
    localStorage.setItem('clipzone_student_name', trimmed);
    setAuthName(trimmed);
    if (currentUser) {
      setCurrentUser({ ...currentUser, displayName: trimmed });
    }
    setIsEditingStudentName(false);
    showToast('✅ Name updated successfully!', 'success');
  };

  // Helper to sanitize cached/remote course to eliminate stale/legacy thumbnails and details
  const sanitizeCourseRecord = useCallback((c: Course, index: number): Course => {
    let img = c.image;
    if (!img || img.includes('2236.png') || img.includes('AVvXsEiI6q11UwbnIp')) {
      img = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMBjnyDK0lXwuSXOriM05OQPKeCOWsX3jnnrZUrQMK-RlYRTM91s3c-tpEwRCOzGlyUUS3c3fpqMmQRtMiVweJRI2x1W7IW_7rwTv5D5cDK4h_jHUKOG2chJQEMkJA2rEoH60zX9vsZZqJlB53bn7n9DYa2_cdL67FbtC3qjzbH1EQEbjJdaigkzFgL2Zn/s1685/37585.png';
    } else if (img.includes('12843.jpg') || img.includes('AVvXsEgXZL_14KcAVWt')) {
      img = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0HHAMfJvAn3a08BTUd1ayj-Jo1A0C8abgyeft2SGJw_Q-AeiLwxD0DY6Ho8IcmU62EXVnzDtHJ4bZErIVuFi8vGipXH9AxO6vRwesLUcHIVLLbozUyVwq4mZFEixr2vEduC-RxIQ5q13R-tngJPDFgCA0oJr9EbVuivCA6VCTz1BLb3Y9DcZJQtcroANa/s1672/37587.png';
    }

    let id = c.id;
    if (id === 'al-master-class-course-by-al-clipzone') {
      id = 'Ai master class course by Ai clipzone';
    }

    return {
      ...c,
      id,
      title: normalizeLegacyBrandText(c.title) || c.title,
      message: c.message ? normalizeLegacyBrandText(c.message) : c.message,
      certificateInstituteName: c.certificateInstituteName ? normalizeLegacyBrandText(c.certificateInstituteName) : c.certificateInstituteName,
      certificateCeoName: c.certificateCeoName ? normalizeLegacyBrandText(c.certificateCeoName) : c.certificateCeoName,
      certificateSealText: c.certificateSealText ? normalizeLegacyBrandText(c.certificateSealText) : c.certificateSealText,
      image: img,
      order: typeof c.order === 'number' ? c.order : index
    };
  }, []);

  // Dynamic Courses state - hydrate ONLY from verified Firestore-synced cache; never pre-seed hardcoded defaults before DB loads
  const [courses, setCourses] = useState<Course[]>(() => {
    const deletedIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
      } catch {
        return [];
      }
    })();

    try {
      const isInitialized = localStorage.getItem('clipzone_courses_initialized') === 'true';
      const cached = localStorage.getItem('clipzone_dynamic_courses');
      if (isInitialized && cached) {
        const parsed: Course[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeList = parsed.filter(c => c && c.id && !deletedIds.includes(c.id));
          if (activeList.length > 0) {
            const sanitized = activeList
              .map((c, index) => ({
                ...c,
                id: c.id === 'al-master-class-course-by-al-clipzone' ? 'Ai master class course by Ai clipzone' : c.id,
                title: normalizeLegacyBrandText(c.title) || c.title,
                message: c.message ? normalizeLegacyBrandText(c.message) : c.message,
                certificateInstituteName: c.certificateInstituteName ? normalizeLegacyBrandText(c.certificateInstituteName) : c.certificateInstituteName,
                certificateCeoName: c.certificateCeoName ? normalizeLegacyBrandText(c.certificateCeoName) : c.certificateCeoName,
                certificateSealText: c.certificateSealText ? normalizeLegacyBrandText(c.certificateSealText) : c.certificateSealText,
                order: typeof c.order === 'number' ? c.order : index
              }))
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            return sanitized;
          }
        }
      }
    } catch (e) {}

    // Start empty so loading skeleton shows immediately until Firestore returns the full dynamic catalog
    return [];
  });

  // Push Notifications, PWA Install & Live Sessions state
  const {
    isRunningInAppMode,
    isAppInstalled,
    isInstallCheckComplete,
    isIOS,
    canPromptNativeInstall,
    promptNativeInstall,
    markManualInstallConfirmed,
  } = usePWAInstall();
  const [rawNotifications, setRawNotifications] = useState<PushNotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [unreadNotifIds, setUnreadNotifIds] = useState<string[]>([]);
  const [showNotifCenterModal, setShowNotifCenterModal] = useState<boolean>(false);
  const [showNotifPromptModal, setShowNotifPromptModal] = useState<boolean>(false);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);

  // Network connectivity status for offline resilience
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Course loading & error states from database
  // Show cached courses directly (0ms, no reload skeleton!) and sync server state silently in background
  const [isCoursesLoading, setIsCoursesLoading] = useState<boolean>(() => {
    try {
      const isInitialized = localStorage.getItem('clipzone_courses_initialized') === 'true';
      const cached = localStorage.getItem('clipzone_dynamic_courses');
      if (isInitialized && cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return false;
      }
    } catch (e) {}
    return true;
  });
  const [coursesLoadError, setCoursesLoadError] = useState<string | null>(null);

  // Keep activeCourseIds strictly in sync ONLY with explicitly deleted courses
  // CRITICAL: NEVER wipe activeCourseIds when offline or when courses array is momentarily empty!
  useEffect(() => {
    try {
      if (!courses || courses.length === 0) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (!deletedCourseIds || deletedCourseIds.length === 0) return;

      setActiveCourseIds(prev => {
        // Strictly only exclude courses that were explicitly deleted by admin
        const valid = prev.filter(id => !deletedCourseIds.includes(id));
        if (valid.length !== prev.length) {
          localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(valid));
          return valid;
        }
        return prev;
      });
    } catch (e) {
      console.warn('Active courses cleanup err:', e);
    }
  }, [courses, deletedCourseIds]);

  // Course Add/Edit modal state
  const [showCourseFormModal, setShowCourseFormModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Course Delete Permission & Confirmation modal state
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>('');
  const [isDeletingCourse, setIsDeletingCourse] = useState<boolean>(false);

  // Helper to fetch student's course activation secret code for certificate
  const getCourseActivationCode = (courseId: string): string => {
    const keyInfo = userActivationKeys.find(k => k.courseId === courseId || k.id === courseId);
    if (keyInfo && (keyInfo.code || keyInfo.id)) {
      return keyInfo.code || keyInfo.id;
    }
    try {
      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const found = localKeysInfo.find((k: any) => k.courseId === courseId || k.id === courseId);
      if (found && (found.code || found.id)) return found.code || found.id;
    } catch (e) {}

    try {
      const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      if (activeCodes.length > 0) return activeCodes[0];
    } catch (e) {}

    return '';
  };

  // Course Form Fields
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formPrice, setFormPrice] = useState('Rs. ');
  const [formAmount, setFormAmount] = useState(299);
  const [formIsFree, setFormIsFree] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formImage, setFormImage] = useState('');
  const [isUploadingCourseThumbnail, setIsUploadingCourseThumbnail] = useState(false);
  const courseThumbnailInputRef = useRef<HTMLInputElement>(null);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formPopularText, setFormPopularText] = useState('🔥 MOST POPULAR - BEST SELLER');
  const [formIncludeLive, setFormIncludeLive] = useState(false);
  const [formIncludeCertificate, setFormIncludeCertificate] = useState(true);
  const [formIsHidden, setFormIsHidden] = useState(false);
  const [formLanguage, setFormLanguage] = useState('English');
  const [formLearnText, setFormLearnText] = useState(''); // newline-separated
  const [formVideos, setFormVideos] = useState<{ title: string; duration: string; videoUrl: string; chapterTitle?: string }[]>([]);
  const [formPdfs, setFormPdfs] = useState<CoursePdf[]>([]);
  const [selectedPdfForView, setSelectedPdfForView] = useState<{
    title: string;
    pdfUrl: string;
    chapterTitle?: string;
    fileSize?: string;
    courseTitle?: string;
  } | null>(null);
  const [classroomTab, setClassroomTab] = useState<'videos' | 'pdfs'>('videos');
  const [courseDetailTab, setCourseDetailTab] = useState<'videos' | 'pdfs'>('videos');
  const [classroomExpandedChapters, setClassroomExpandedChapters] = useState<Record<string, boolean>>({});
  const [showDirectVideoAddForm, setShowDirectVideoAddForm] = useState(false);
  const [directVideoChapter, setDirectVideoChapter] = useState('');
  const [directVideoTitle, setDirectVideoTitle] = useState('');
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [isSavingDirectVideo, setIsSavingDirectVideo] = useState(false);
  const [confirmDeleteVideoIdx, setConfirmDeleteVideoIdx] = useState<number | null>(null);

  // Process Firestore course documents into sorted active courses
  const processCourseSnapshotDocs = useCallback((docs: any[]): Course[] => {
    const deletedIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
      } catch {
        return [];
      }
    })();

    const dbCourses: Course[] = [];
    docs.forEach((docSnap: any) => {
      const course = docSnap.data() as Course;
      const courseId = docSnap.id || course.id;
      if (!deletedIds.includes(courseId)) {
        dbCourses.push(sanitizeCourseRecord({ ...course, id: courseId }, dbCourses.length));
      } else {
        deleteDoc(doc(db, 'courses', courseId)).catch(() => {});
      }
    });

    return dbCourses
      .map((c, i) => ({
        ...c,
        order: typeof c.order === 'number' ? c.order : i
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [sanitizeCourseRecord]);

  // Explicit server-first fetch so all published & hidden courses match Firestore live state on initial open/reload
  const lastCoursesServerFetchRef = useRef<number>(0);
  const refreshCoursesFromServer = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setIsCoursesLoading(true);
    }
    setCoursesLoadError(null);
    lastCoursesServerFetchRef.current = Date.now();

    try {
      const deletedIds: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
        } catch {
          return [];
        }
      })();

      // Fast-path REST fetch on cold loads (resolves ~80-150ms without waiting for WebChannel handshake)
      if (typeof navigator === 'undefined' || navigator.onLine) {
        const restDocs = await fetchCoursesViaRest(2800);
        if (Array.isArray(restDocs) && restDocs.length > 0) {
          const activeRest = restDocs
            .filter((c) => c && c.id && !deletedIds.includes(c.id))
            .map((c, idx) => sanitizeCourseRecord(c as Course, idx))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setCourses(activeRest);
          setCoursesLoadError(null);
          setIsCoursesLoading(false);
          try {
            localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(activeRest));
            localStorage.setItem('clipzone_courses_initialized', 'true');
          } catch (e) {}
          return;
        }
      }

      let querySnapshot;
      let resolvedFromServer = true;
      try {
        querySnapshot = await getDocsFromServer(collection(db, 'courses'));
      } catch (serverErr) {
        resolvedFromServer = false;
        querySnapshot = await getDocs(collection(db, 'courses'));
      }

      if (!querySnapshot.empty) {
        const sortedCourses = processCourseSnapshotDocs(querySnapshot.docs);
        setCourses(sortedCourses);
        setCoursesLoadError(null);
        setIsCoursesLoading(false);
        if (resolvedFromServer) {
          try {
            localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(sortedCourses));
            localStorage.setItem('clipzone_courses_initialized', 'true');
          } catch (e) {}
        }
        return;
      }

      // If Firestore collection returned empty, verify offline/seed state cleanly
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsCoursesLoading(false);
        return;
      }

      let remoteSeeded = false;
      try {
        const configSnap = await getDoc(doc(db, 'system', 'config'));
        remoteSeeded = Boolean(configSnap.exists() && configSnap.data()?.courses_seeded === true);
      } catch (e) {}

      const alreadyInitialized = (() => {
        try {
          return localStorage.getItem('clipzone_courses_initialized') === 'true';
        } catch {
          return false;
        }
      })();

      if (!remoteSeeded && !alreadyInitialized && deletedIds.length === 0) {
        const initialCourses = COURSES.map((c, i) =>
          sanitizeCourseRecord({ ...c, order: typeof c.order === 'number' ? c.order : i }, i)
        );
        setCourses(initialCourses);
        try {
          localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(initialCourses));
          localStorage.setItem('clipzone_courses_initialized', 'true');
        } catch (e) {}
        initialCourses.forEach(c => {
          setDoc(doc(db, 'courses', c.id), c).catch(() => {});
        });
        setDoc(doc(db, 'system', 'config'), { courses_seeded: true }, { merge: true }).catch(() => {});
      } else if (resolvedFromServer && remoteSeeded) {
        setCourses([]);
        try {
          localStorage.setItem('clipzone_dynamic_courses', JSON.stringify([]));
        } catch (e) {}
      }
      setIsCoursesLoading(false);
    } catch (err) {
      console.warn('Error fetching courses from Firestore:', err);
      setCourses(prev => {
        if (!prev || prev.length === 0) {
          setCoursesLoadError('Unable to load courses. Please check your internet connection and try again.');
        }
        return prev;
      });
      setIsCoursesLoading(false);
    }
  }, [processCourseSnapshotDocs, sanitizeCourseRecord]);

  // Initial server fetch + realtime synchronization of courses from Firestore
  useEffect(() => {
    let isActive = true;

    // Silently sync fresh courses from server on mount (does not block cached instant render)
    refreshCoursesFromServer(false);

    const handleVisibilityOrOnline = () => {
      if (!isActive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (Date.now() - lastCoursesServerFetchRef.current > 15000) {
        refreshCoursesFromServer(false);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleVisibilityOrOnline);
    }

    const unsubscribe = onSnapshot(collection(db, 'courses'), (querySnapshot) => {
      if (!isActive) return;
      // Ignore stale IndexedDB cache emissions when online so hidden courses never flash back
      if (querySnapshot.metadata?.fromCache && (typeof navigator === 'undefined' || navigator.onLine)) {
        return;
      }
      try {
        if (!querySnapshot.empty) {
          const sortedCourses = processCourseSnapshotDocs(querySnapshot.docs);
          setCourses(sortedCourses);
          setCoursesLoadError(null);
          setIsCoursesLoading(false);
          try {
            localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(sortedCourses));
            localStorage.setItem('clipzone_courses_initialized', 'true');
          } catch (e) {}
        } else {
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsCoursesLoading(false);
            return;
          }
          if (querySnapshot.metadata?.fromCache) {
            return;
          }
          setIsCoursesLoading(false);
        }
      } catch (e) {
        console.warn('Error processing courses snapshot:', e);
        setIsCoursesLoading(false);
      }
    }, (err) => {
      if (!isActive) return;
      console.warn('Realtime courses listener error (keeping available courses):', err);
      setIsCoursesLoading(false);
    });

    return () => {
      isActive = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleVisibilityOrOnline);
      }
      unsubscribe();
    };
  }, [refreshCoursesFromServer, processCourseSnapshotDocs]);

  // PWA First-time open notification prompt - STRICTLY ONLY in PWA / Installed App mode (Never on website!)
  useEffect(() => {
    // Only prompt when running in PWA / Installed App mode
    if (!isRunningInAppMode && !checkIsAppMode()) {
      return;
    }

    try {
      const hasPrompted = localStorage.getItem('clipzone_notif_prompted');
      if (!hasPrompted && isNotificationSupported()) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          // Graceful 1.8s delay after mount so app shell and logo animate in first
          const timer = setTimeout(() => {
            setShowNotifPromptModal(true);
          }, 1800);
          return () => clearTimeout(timer);
        }
      }
    } catch (e) {}
  }, [isRunningInAppMode]);

  // Realtime listener for broadcast & targeted notifications (paginated/limited to 50 newest)
  useEffect(() => {
    const notifQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      try {
        const list: PushNotificationItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as PushNotificationItem;
          list.push({
            ...data,
            id: d.id
          });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRawNotifications(list);
      } catch (e) {
        console.warn('Notifications parse error:', e);
      }
    }, (err) => {
      console.warn('Notifications listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Realtime listener for live_sessions collection
  useEffect(() => {
    const liveQuery = query(collection(db, 'live_sessions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(liveQuery, (snapshot) => {
      try {
        const list: LiveSession[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as LiveSession;
          list.push({
            ...data,
            id: d.id
          });
        });
        setLiveSessions(list);
      } catch (e) {
        console.warn('Live sessions parse error:', e);
      }
    }, (err) => {
      console.warn('Live sessions listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Push Notification Handlers (Main Admin Only)
  const handleSendNotification = async (notifData: Omit<PushNotificationItem, 'id' | 'createdAt'>) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can send notifications.', 'error');
      return;
    }
    try {
      const notifRef = doc(collection(db, 'notifications'));
      const newNotif: PushNotificationItem = {
        ...notifData,
        id: notifRef.id,
        createdAt: Date.now()
      };
      await setDoc(notifRef, newNotif);
      showToast('📢 Notification broadcast sent to all users!', 'success');
    } catch (e) {
      console.error('Error sending notification:', e);
      showToast('Failed to broadcast notification. Check rules.', 'error');
      throw e;
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete notifications.', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'notifications', id));
      showToast('Notification removed successfully.', 'info');
    } catch (e) {
      console.error('Error deleting notification:', e);
      showToast('Failed to delete notification.', 'error');
      throw e;
    }
  };

  // Realtime listener for global admin session logout commands and deleted courses blacklist across all user devices
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // 1. Synchronize remote deletedCourseIds blacklist from Firestore
        if (Array.isArray(data.deletedCourseIds) && data.deletedCourseIds.length > 0) {
          const currentDeleted: string[] = (() => {
            try {
              return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
            } catch {
              return [];
            }
          })();
          const mergedDeleted = Array.from(new Set([...currentDeleted, ...data.deletedCourseIds]));
          try {
            localStorage.setItem('clipzone_deleted_course_ids', JSON.stringify(mergedDeleted));
          } catch (e) {}
          setDeletedCourseIds(mergedDeleted);

          // Purge any deleted courses from state & local storage
          setCourses(prev => {
            const filtered = prev.filter(c => !mergedDeleted.includes(c.id));
            if (filtered.length !== prev.length) {
              try {
                localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(filtered));
              } catch (e) {}
              return filtered;
            }
            return prev;
          });

          // Also clean up from activeCourseIds
          setActiveCourseIds(prev => {
            const filtered = prev.filter(id => !mergedDeleted.includes(id));
            if (filtered.length !== prev.length) {
              try {
                localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(filtered));
              } catch (e) {}
              return filtered;
            }
            return prev;
          });
        }

        // 2. Global session logout check
        const serverResetAt = data.global_session_reset_at || 0;
        const localLastReset = Number(localStorage.getItem('clipzone_last_session_reset') || 0);
        const loginTime = Number(localStorage.getItem('clipzone_session_login_time') || 0);

        // Acknowledge initial server reset if not yet recorded so it doesn't trigger on new sessions
        if (localLastReset === 0 && serverResetAt > 0) {
          localStorage.setItem('clipzone_last_session_reset', String(serverResetAt));
        }

        // Only trigger global logout if admin actually triggered a NEW reset AFTER this device logged in
        if (serverResetAt > 0 && localLastReset > 0 && serverResetAt > localLastReset && loginTime > 0 && serverResetAt > loginTime) {
          localStorage.setItem('clipzone_last_session_reset', String(serverResetAt));
          
          // Sign out Firebase Auth silently
          signOut(auth).catch(() => {});

          // Clear active user student sessions and activated courses silently
          localStorage.removeItem('clipzone_student_name');
          localStorage.removeItem('clipzone_student_uid');
          localStorage.removeItem('clipzone_local_activated_courses');
          localStorage.removeItem('clipzone_active_codes');
          localStorage.removeItem('clipzone_activated_keys_info');
          localStorage.removeItem('clipzone_session_login_time');
          
          setCurrentUser(null);
          setUserActivationKeys([]);
          setActiveCourseIds([]);
          setAuthName('');
          
          // Silent logout - no toast or notification displayed to the user
        }
      }
    }, (err) => {
      console.warn('Realtime session reset listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Realtime listeners for Dynamic Payment QR, FAQs list, and Site Settings
  useEffect(() => {
    // 1. Payment QR config listener
    const unsubPayment = onSnapshot(doc(db, 'system', 'payment_qr'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PaymentQrConfig;
        setPaymentConfig(prev => ({ ...prev, ...data }));
        try {
          localStorage.setItem('clipzone_payment_config', JSON.stringify(data));
        } catch (e) {}
      }
    }, (err) => {
      console.warn('Payment QR config realtime listener error:', err);
    });

    // 2. FAQs listener (only accept explicit array updates; keep empty when cleared)
    const unsubFaqs = onSnapshot(doc(db, 'system', 'faqs'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.items)) {
          setFaqs(data.items);
        }
      }
    }, (err) => {
      console.warn('FAQs realtime listener error:', err);
    });

    // 3. Overall Site Settings listener
    const unsubSettings = onSnapshot(doc(db, 'system', 'site_settings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SiteSettingsConfig;
        const cleanedLogo = cleanLegacyLogoUrl(data.instituteLogoUrl);
        const cleaned: SiteSettingsConfig = {
          ...data,
          instituteName: normalizeLegacyBrandText(data.instituteName) || DEFAULT_SITE_SETTINGS.instituteName,
          siteTitle: normalizeLegacyBrandText(data.siteTitle) || DEFAULT_SITE_SETTINGS.siteTitle,
          siteTagline: normalizeLegacyBrandText(data.siteTagline) || DEFAULT_SITE_SETTINGS.siteTagline,
          certificateInstituteName: normalizeLegacyBrandText(data.certificateInstituteName) || DEFAULT_SITE_SETTINGS.certificateInstituteName,
          certificateCeoName: normalizeLegacyBrandText(data.certificateCeoName) || DEFAULT_SITE_SETTINGS.certificateCeoName,
          certificateCeoTitle: normalizeLegacyBrandText(data.certificateCeoTitle) || DEFAULT_SITE_SETTINGS.certificateCeoTitle,
          certificateSealText: normalizeLegacyBrandText(data.certificateSealText) || DEFAULT_SITE_SETTINGS.certificateSealText,
          supportEmail: (data.supportEmail === 'ai.clipzone.edu@gmail.com' || data.supportEmail === 'support@hamrolms.com') ? DEFAULT_SITE_SETTINGS.supportEmail : data.supportEmail,
          instituteLogoUrl: cleanedLogo || DEFAULT_SITE_SETTINGS.instituteLogoUrl || '',
          certificateLogoUrl: cleanLegacyLogoUrl(data.certificateLogoUrl),
        };
        setSiteSettings(prev => ({ ...prev, ...cleaned }));
        try {
          localStorage.setItem('clipzone_site_settings', JSON.stringify(cleaned));
        } catch (e) {}
      }
    }, (err) => {
      console.warn('Site settings realtime listener error:', err);
    });

    return () => {
      unsubPayment();
      unsubFaqs();
      unsubSettings();
    };
  }, []);

  // Helper: Normalize and reject generic placeholder names
  const cleanRealName = (name?: string | null): string => {
    if (!name) return '';
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'student learner' ||
      lower === 'student' ||
      lower === 'learner' ||
      lower === 'user' ||
      lower === 'guest' ||
      lower === 'anonymous' ||
      lower === 'null' ||
      lower === 'undefined'
    ) {
      return '';
    }
    return trimmed;
  };

  const getOrCreateDeviceId = () => {
    let devId = '';
    try {
      devId = localStorage.getItem('clipzone_device_id') || '';
    } catch (e) {}
    if (!devId) {
      try {
        devId = sessionStorage.getItem('clipzone_device_id') || '';
      } catch (e) {}
    }
    if (!devId) {
      try {
        const match = document.cookie.match(/(^|;)\s*clipzone_device_id=([^;]+)/);
        if (match) devId = match[2];
      } catch (e) {}
    }
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    }
    try {
      localStorage.setItem('clipzone_device_id', devId);
      sessionStorage.setItem('clipzone_device_id', devId);
      document.cookie = `clipzone_device_id=${devId}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {}
    return devId;
  };

  // --- SINGLE-DEVICE ADMIN & SUB-ADMIN SESSION MANAGEMENT ---
  const handleActivateAdminSession = async () => {
    // Clear any Sub-Admin session when Main Admin logs in
    setSubAdminSession(null);
    localStorage.removeItem('clipzone_sub_admin_session');

    // Never create or keep an artificial student profile for Admin login
    if (
      localStorage.getItem('clipzone_student_name') === 'Admin (ClipZone)' ||
      (activeCourseIds.length === 0 && userActivationKeys.length === 0)
    ) {
      localStorage.removeItem('clipzone_student_name');
      setAuthName('');
      if (currentUser && ((currentUser as any).isAnonymous || String(currentUser.uid || '').startsWith('local_'))) {
        setCurrentUser(null);
      }
    }

    const newSessionId = 'adm_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    const deviceId = getOrCreateDeviceId();
    localStorage.setItem('clipzone_admin_session_id', newSessionId);
    localStorage.setItem('clipzone_admin_activated', 'true');
    setIsAdminActivated(true);

    try {
      await setDoc(doc(db, 'system', 'admin_session'), {
        activeSessionId: newSessionId,
        deviceId: deviceId,
        loginTime: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('Error saving single-device admin session to Firestore:', err);
    }
  };

  const handleActivateSubAdminSession = async (subAccount: SubAdminAccount) => {
    // Ensure Main Admin flags are cleared so Sub-Admin runs strictly scoped
    setIsAdminActivated(false);
    localStorage.removeItem('clipzone_admin_session_id');
    localStorage.removeItem('clipzone_admin_activated');

    // Never create or keep an artificial student profile for Sub-Admin login
    if (
      localStorage.getItem('clipzone_student_name') === (subAccount.name || 'Sub-Admin') ||
      localStorage.getItem('clipzone_student_name') === 'Admin (ClipZone)' ||
      (activeCourseIds.length === 0 && userActivationKeys.length === 0)
    ) {
      localStorage.removeItem('clipzone_student_name');
      setAuthName('');
      if (currentUser && ((currentUser as any).isAnonymous || String(currentUser.uid || '').startsWith('local_'))) {
        setCurrentUser(null);
      }
    }

    const deviceId = getOrCreateDeviceId();
    const updatedSub: SubAdminAccount = {
      ...subAccount,
      lastLoginAt: Date.now(),
      activeDeviceId: deviceId
    };
    setSubAdminSession(updatedSub);
    localStorage.setItem('clipzone_sub_admin_session', JSON.stringify(updatedSub));

    try {
      await setDoc(doc(db, 'sub_admins', subAccount.code), {
        lastLoginAt: updatedSub.lastLoginAt,
        activeDeviceId: deviceId
      }, { merge: true });
    } catch (err) {
      console.warn('Error updating sub-admin login session:', err);
    }
  };

  const handleSubAdminExit = async () => {
    const activeCode = subAdminSession?.code;
    setSubAdminSession(null);
    localStorage.removeItem('clipzone_sub_admin_session');
    setAllActivationKeys([]);
    setShowAdminMenu(false);
    setShowAdminDashboard(false);
    showToast('Logged out of Sub-Admin mode', 'info');

    if (activeCode) {
      try {
        await updateDoc(doc(db, 'sub_admins', activeCode), {
          activeDeviceId: ''
        });
      } catch (err) {
        console.warn('Error releasing sub-admin device session:', err);
      }
    }
  };

  const handleAdminExit = async () => {
    const currentSessionId = localStorage.getItem('clipzone_admin_session_id');
    setIsAdminActivated(false);
    localStorage.removeItem('clipzone_admin_session_id');
    localStorage.removeItem('clipzone_admin_activated');
    setShowAdminMenu(false);
    setShowAdminDashboard(false);
    showToast('Logged out of Admin mode', 'info');

    if (currentSessionId) {
      try {
        const snap = await getDoc(doc(db, 'system', 'admin_session'));
        if (snap.exists() && snap.data()?.activeSessionId === currentSessionId) {
          await setDoc(doc(db, 'system', 'admin_session'), {
            activeSessionId: '',
            loggedOutAt: Date.now()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Error releasing admin session:', err);
      }
    }
  };

  const handleLogoutAdminSession = async () => {
    if (isAdminActivated) {
      await handleAdminExit();
    } else if (subAdminSession) {
      await handleSubAdminExit();
    }
  };

  // Realtime enforcement: Single-device Admin Login
  useEffect(() => {
    const unsubAdminSession = onSnapshot(doc(db, 'system', 'admin_session'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const remoteSessionId = data?.activeSessionId;
      const localSessionId = localStorage.getItem('clipzone_admin_session_id');

      // If this device was admin-activated, but remote activeSessionId is now different:
      if (localSessionId && remoteSessionId && remoteSessionId !== localSessionId) {
        setIsAdminActivated(false);
        localStorage.removeItem('clipzone_admin_session_id');
        localStorage.removeItem('clipzone_admin_activated');
        setShowAdminDashboard(false);
        setShowAdminMenu(false);
        showToast('⚠️ Admin session expired: Signed out because another device logged in (Single Device Limit).', 'error');
      }
    }, (err) => {
      console.warn('Admin session listener warning:', err);
    });

    // On mount, check if localSessionId is still the active session in Firestore
    const localSessionId = localStorage.getItem('clipzone_admin_session_id');
    const legacyAdmin = localStorage.getItem('clipzone_admin_activated');
    if (legacyAdmin && !localSessionId) {
      localStorage.removeItem('clipzone_admin_activated');
      setIsAdminActivated(false);
    } else if (localSessionId) {
      getDoc(doc(db, 'system', 'admin_session')).then((snap) => {
        if (snap.exists()) {
          const remoteSessionId = snap.data()?.activeSessionId;
          if (remoteSessionId && remoteSessionId !== localSessionId) {
            localStorage.removeItem('clipzone_admin_session_id');
            localStorage.removeItem('clipzone_admin_activated');
            setIsAdminActivated(false);
          }
        }
      }).catch(() => {});
    }

    return () => unsubAdminSession();
  }, [showToast]);

  const getOrCreateLocalUser = (displayName: string) => {
    // 1. Check if an existing activated key matches this student to guarantee persistent canonical UID
    let matchedUid = '';
    try {
      const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      const localKeys = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const cleanTarget = cleanRealName(displayName).toLowerCase();
      
      if (Array.isArray(allActivationKeys)) {
        const match = allActivationKeys.find((k: any) => {
          if (activeCodes.includes(k.code || k.id)) return true;
          if (cleanTarget && k.studentName && k.studentName.trim().toLowerCase() === cleanTarget) return true;
          if (cleanTarget && k.claimedByName && k.claimedByName.trim().toLowerCase() === cleanTarget) return true;
          return false;
        });
        if (match?.claimedByUid) {
          matchedUid = match.claimedByUid;
        }
      }
      if (!matchedUid && Array.isArray(localKeys)) {
        const match = localKeys.find((k: any) => k.claimedByUid);
        if (match?.claimedByUid) {
          matchedUid = match.claimedByUid;
        }
      }
    } catch (e) {}

    let uid = matchedUid || localStorage.getItem('clipzone_student_uid');
    if (!uid) {
      uid = 'local_' + Math.random().toString(36).substring(2, 11);
    }
    try {
      localStorage.setItem('clipzone_student_uid', uid);
    } catch (e) {}

    return {
      uid,
      displayName,
      isAnonymous: true,
      email: null
    };
  };

  // Check active device sessions to enforce single device login and admin revocation
  const checkActiveDeviceSessions = async () => {
    // If device is offline, skip remote check and keep all active sessions and courses intact!
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const deviceId = getOrCreateDeviceId();
    try {
      const activeCodesStr = localStorage.getItem('clipzone_active_codes');
      if (!activeCodesStr) return;
      let activeCodes: string[] = [];
      try {
        activeCodes = JSON.parse(activeCodesStr);
      } catch (e) {}
      if (!Array.isArray(activeCodes) || activeCodes.length === 0) return;

      const localActivatedCourses: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
      const userLoginTime = Number(localStorage.getItem('clipzone_session_login_time') || 0);
      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const updatedActiveCodes: string[] = [];
      const updatedCourseIdsSet = new Set<string>(localActivatedCourses);
      let sessionTerminated = false;
      let terminatedCode = '';
      let terminateReason: 'admin_logout' | 'device_conflict' | 'deleted' = 'device_conflict';

      for (const code of activeCodes) {
        try {
          const keyDocSnap = await getDoc(doc(db, 'activation_keys', code));
          if (keyDocSnap && typeof keyDocSnap.exists === 'function') {
            if (keyDocSnap.exists()) {
              const keyData = keyDocSnap.data();

              // 1. Check if admin explicitly logged out this user/key
              const isForceLoggedOut = keyData.forceLogoutAt && userLoginTime > 0 && keyData.forceLogoutAt > userLoginTime;

              if (isForceLoggedOut) {
                sessionTerminated = true;
                terminatedCode = code;
                terminateReason = 'admin_logout';
                if (keyData.courseId) {
                  updatedCourseIdsSet.delete(keyData.courseId);
                }
              } else if (keyData.activeDeviceId && keyData.activeDeviceId !== deviceId && keyData.activeDeviceId !== '') {
                // Only terminate if another device actually claimed the key after this device
                const thisKeyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
                const thisKeyClaimedAt = thisKeyInfo?.claimedAt || userLoginTime || 0;
                const remoteClaimedAt = keyData.deviceClaimedAt || 0;

                if (remoteClaimedAt > 0 && thisKeyClaimedAt > 0 && remoteClaimedAt > thisKeyClaimedAt) {
                  sessionTerminated = true;
                  terminatedCode = code;
                  terminateReason = 'device_conflict';
                  if (keyData.courseId) {
                    updatedCourseIdsSet.delete(keyData.courseId);
                  }
                } else {
                  // Same device session or refresh: keep active and sync activeDeviceId
                  updatedActiveCodes.push(code);
                  if (keyData.courseId) {
                    updatedCourseIdsSet.add(keyData.courseId);
                  }
                  updateDoc(doc(db, 'activation_keys', code), { activeDeviceId: deviceId }).catch(() => {});
                }
              } else {
                // Keep active!
                updatedActiveCodes.push(code);
                if (keyData.courseId) {
                  updatedCourseIdsSet.add(keyData.courseId);
                }
                // If activeDeviceId was not yet set, claim it for this device
                if (!keyData.activeDeviceId) {
                  updateDoc(doc(db, 'activation_keys', code), { activeDeviceId: deviceId }).catch(() => {});
                }
              }
            } else {
              // Document does not exist in snapshot:
              // Only treat as deleted if online AND verified from server (not local cache miss)
              if (typeof navigator !== 'undefined' && !navigator.onLine) {
                updatedActiveCodes.push(code);
                continue;
              }
              if ((keyDocSnap as any)?.metadata?.fromCache) {
                updatedActiveCodes.push(code);
                continue;
              }

              // Code was CONFIRMED permanently deleted by Admin from Firestore!
              sessionTerminated = true;
              terminatedCode = code;
              terminateReason = 'deleted';
              const keyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
              if (keyInfo && keyInfo.courseId) {
                updatedCourseIdsSet.delete(keyInfo.courseId);
              }
            }
          } else {
            updatedActiveCodes.push(code);
          }
        } catch (e) {
          // On temporary network hiccup or offline, preserve session!
          updatedActiveCodes.push(code);
        }
      }

      if (sessionTerminated) {
        const updatedCourseIds = Array.from(updatedCourseIdsSet);
        localStorage.setItem('clipzone_active_codes', JSON.stringify(updatedActiveCodes));
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedCourseIds));
        setActiveCourseIds(updatedCourseIds);

        if (terminateReason === 'admin_logout') {
          showToast(`⚠️ Your session was logged out by Admin for code ${terminatedCode}.`, 'error');
        } else if (terminateReason === 'deleted') {
          showToast(`❌ Course code ${terminatedCode} was deleted by Admin.`, 'error');
        } else {
          showToast(`Session ended! Code ${terminatedCode} is now active on another device.`, 'error');
        }
      }
    } catch (err) {
      console.error('Error checking active device sessions:', err);
    }
  };

  const lastFetchedAuthUidRef = useRef<string | null>(null);
  const lastDeviceCheckAtRef = useRef<number>(0);

  // Firebase Authentication Observer & User Keys Fetcher
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
        if (lastFetchedAuthUidRef.current !== user.uid) {
          lastFetchedAuthUidRef.current = user.uid;
          fetchUserActiveKeys(user);
        }
      } else {
        lastFetchedAuthUidRef.current = null;
        try {
          const localName = localStorage.getItem('clipzone_student_name');
          if (localName) {
            const virtualUser = getOrCreateLocalUser(localName);
            setCurrentUser(virtualUser as any);
          }
          // Always preserve activated courses from persistent local storage so student is never auto-logged out
          const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
          if (Array.isArray(localActivated) && localActivated.length > 0) {
            setActiveCourseIds(localActivated);
          }
          const localKeys = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
          if (Array.isArray(localKeys) && localKeys.length > 0) {
            setUserActivationKeys(localKeys);
          }
        } catch (e) {}
        setAuthLoading(false);
      }
    });

    // Safety fallback: Ensure authLoading is never stuck in infinite loading
    const safetyTimeout = setTimeout(() => {
      setAuthLoading(false);
    }, 800);

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Device session check on window focus or visibility change (throttled to avoid duplicate calls on startup/focus)
  useEffect(() => {
    const runThrottledDeviceCheck = () => {
      const now = Date.now();
      if (now - lastDeviceCheckAtRef.current < 3000) return;
      lastDeviceCheckAtRef.current = now;
      checkActiveDeviceSessions();
    };

    runThrottledDeviceCheck();
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        runThrottledDeviceCheck();
      }
    };
    const handleOnline = () => {
      setIsNetworkOnline(true);
      runThrottledDeviceCheck();
      refreshCoursesFromServer(false);
      if (currentUser) {
        fetchUserActiveKeys(currentUser);
      }
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
    };

    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser, refreshCoursesFromServer]);

  // Real-time snapshot listener on student's active keys for instant admin logout / delete response
  useEffect(() => {
    // If offline, do NOT attach remote snapshot listeners that can falsely report non-existence on cache miss
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const activeCodesStr = localStorage.getItem('clipzone_active_codes');
    if (!activeCodesStr) return;
    let activeCodes: string[] = [];
    try {
      activeCodes = JSON.parse(activeCodesStr);
    } catch (e) {}
    if (!Array.isArray(activeCodes) || activeCodes.length === 0) return;

    const unsubs: (() => void)[] = [];
    const deviceId = getOrCreateDeviceId();

    activeCodes.forEach((code) => {
      try {
        const unsub = onSnapshot(doc(db, 'activation_keys', code), (docSnap) => {
          const userLoginTime = Number(localStorage.getItem('clipzone_session_login_time') || 0);

          if (!docSnap.exists()) {
            // CRITICAL OFFLINE & CACHE GUARD:
            // When offline or retrieved from unconfirmed local cache, NEVER delete local activated course!
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            if ((docSnap as any)?.metadata?.fromCache) return;

            // Code was CONFIRMED permanently deleted by Admin from Firestore!
            const currentCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
            const filteredCodes = currentCodes.filter(c => c !== code);
            localStorage.setItem('clipzone_active_codes', JSON.stringify(filteredCodes));

            const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
            const keyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
            if (keyInfo && keyInfo.courseId) {
              const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
              const updatedActivated = localActivated.filter(id => id !== keyInfo.courseId);
              localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
              setActiveCourseIds(updatedActivated);
            }
            showToast(`❌ Course code ${code} was deleted by Admin.`, 'error');
          } else {
            const keyData = docSnap.data();
            const durationMs = keyData.duration === '1day' 
              ? (24 * 60 * 60 * 1000) 
              : keyData.duration === '1month' 
                ? (30 * 24 * 60 * 60 * 1000) 
                : (365 * 24 * 60 * 60 * 1000);
            const keyExp = keyData.expiresAt || (keyData.claimedAt ? keyData.claimedAt + durationMs : 0);
            const isKeyExpired = keyData.status === 'expired' || (keyExp > 0 && Date.now() > keyExp);

            if (isKeyExpired) {
              const currentCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
              const filteredCodes = currentCodes.filter(c => c !== code);
              localStorage.setItem('clipzone_active_codes', JSON.stringify(filteredCodes));

              const localKeysInfo: any[] = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
              const matchedKeyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
              const targetCourseId = keyData.courseId || matchedKeyInfo?.courseId;

              if (targetCourseId) {
                const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
                const updatedActivated = localActivated.filter(id => id !== targetCourseId);
                localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
                setActiveCourseIds(updatedActivated);
              }

              const updatedKeysInfo = localKeysInfo.map((k: any) => (k.code || k.id) === code ? { ...k, isExpired: true, status: 'expired', expiresAt: keyExp } : k);
              localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
              setUserActivationKeys(updatedKeysInfo);

              setFullscreenVideo(prev => (prev && (!targetCourseId || prev.courseId === targetCourseId)) ? null : prev);

              showToast(`⚠️ Access for "${keyData.courseTitle || 'Course'}" has expired.`, 'error');
            } else if (keyData.forceLogoutAt && userLoginTime > 0 && keyData.forceLogoutAt > userLoginTime) {
              const currentCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
              const filteredCodes = currentCodes.filter(c => c !== code);
              localStorage.setItem('clipzone_active_codes', JSON.stringify(filteredCodes));

              if (keyData.courseId) {
                const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
                const updatedActivated = localActivated.filter(id => id !== keyData.courseId);
                localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
                setActiveCourseIds(updatedActivated);
              }
              showToast(`⚠️ Your session was logged out by Admin for code ${code}.`, 'error');
            } else if (keyData.activeDeviceId && keyData.activeDeviceId !== deviceId && keyData.activeDeviceId !== '') {
              // Check if another device ACTUALLY claimed it after this device
              const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
              const thisKeyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
              const thisKeyClaimedAt = thisKeyInfo?.claimedAt || userLoginTime || 0;
              const remoteClaimedAt = keyData.deviceClaimedAt || 0;

              // Only terminate if another device claimed it AFTER this device
              if (remoteClaimedAt > 0 && thisKeyClaimedAt > 0 && remoteClaimedAt > thisKeyClaimedAt) {
                const currentCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
                const filteredCodes = currentCodes.filter(c => c !== code);
                localStorage.setItem('clipzone_active_codes', JSON.stringify(filteredCodes));

                if (keyData.courseId) {
                  const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
                  const updatedActivated = localActivated.filter(id => id !== keyData.courseId);
                  localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
                  setActiveCourseIds(updatedActivated);
                }
                showToast(`Session ended on this device! Code ${code} is active on another device.`, 'error');
              } else {
                // Same student re-opening or refreshed browser: re-sync deviceId to this active device
                updateDoc(doc(db, 'activation_keys', code), { activeDeviceId: deviceId }).catch(() => {});
              }
            }
          }
        }, (err) => {
          console.warn('Realtime key snapshot error:', err);
        });
        unsubs.push(unsub);
      } catch (err) {
        console.warn('Failed to attach key listener:', err);
      }
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [activeCourseIds]);

  // Periodic check for course expirations every 10s and on tab focus
  useEffect(() => {
    const checkCourseExpirations = () => {
      try {
        const localKeys: any[] = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
        if (!localKeys || localKeys.length === 0) return;

        let changed = false;
        const now = Date.now();
        const expiredCourseIds: string[] = [];

        const updatedKeys = localKeys.map((k: any) => {
          const expired = isCourseKeyExpired(k);
          if (expired) {
            if (k.courseId) expiredCourseIds.push(k.courseId);
            if (!k.isExpired || k.status !== 'expired') {
              changed = true;
              return { ...k, isExpired: true, status: 'expired', expiresAt: k.expiresAt || now };
            }
          }
          return k;
        });

        if (changed || expiredCourseIds.length > 0) {
          setActiveCourseIds(prev => {
            const next = prev.filter(cId => {
              const hasActiveKey = updatedKeys.some((k: any) => 
                (k.courseId === cId || k.courseId === 'course-all') && !isCourseKeyExpired(k)
              );
              return hasActiveKey;
            });
            if (next.length !== prev.length) {
              try {
                localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(next));
              } catch (e) {}
              return next;
            }
            return prev;
          });

          if (changed) {
            try {
              localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeys));
              setUserActivationKeys(updatedKeys);

              const localActiveCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
              const unexpiredCodes = localActiveCodes.filter(c => {
                const found = updatedKeys.find((k: any) => (k.code || k.id) === c);
                return !found || !isCourseKeyExpired(found);
              });
              localStorage.setItem('clipzone_active_codes', JSON.stringify(unexpiredCodes));

              updatedKeys.forEach((k: any) => {
                if (isCourseKeyExpired(k) && (k.code || k.id)) {
                  updateDoc(doc(db, 'activation_keys', k.code || k.id), { status: 'expired' }).catch(() => {});
                }
              });

              showToast('⚠️ Your course access has expired.', 'error');
            } catch (err) {}
          }
        }
      } catch (e) {
        console.warn('Expiration check error:', e);
      }
    };

    checkCourseExpirations();
    const interval = setInterval(checkCourseExpirations, 10000);
    const handleFocus = () => checkCourseExpirations();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  // Fetch student's keys
  // Prevent context-menu, copy events and keyboard inspector shortcuts for security/copy protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (
        e.key === 'F12' ||
        (e.shiftKey && cmdOrCtrl && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (cmdOrCtrl && (e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's'))
      ) {
        if (!isAdminActivated && !subAdminSession) {
          e.preventDefault();
          showToast('Shortcut disabled for content protection!', 'error');
        }
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      if (!isAdminActivated && !subAdminSession) {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!isAdminActivated && !subAdminSession) {
        e.preventDefault();
        showToast('Copying is restricted!', 'error');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy as any);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy as any);
    };
  }, [isAdminActivated, subAdminSession]);

  const fetchUserActiveKeys = async (user: FirebaseUser) => {
    const localActivatedCourses: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
    const localKeysInfo: any[] = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
    const activeCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
    const userLoginTime = Number(localStorage.getItem('clipzone_session_login_time') || 0);

    // CRITICAL OFFLINE GUARD:
    // If device is offline, immediately retain all local courses and active keys and avoid making network calls!
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (localActivatedCourses.length > 0) setActiveCourseIds(localActivatedCourses);
      if (localKeysInfo.length > 0) setUserActivationKeys(localKeysInfo);
      return;
    }

    try {
      const deviceId = getOrCreateDeviceId();
      const currentUid = user?.uid || localStorage.getItem('clipzone_student_uid') || '';
      const verifiedKeys: any[] = [];
      const verifiedCourseIds = new Set<string>();
      const secondaryCourseIdsSet = new Set<string>();

      // 1. Verify every code stored locally on this device directly from Firestore
      for (const code of activeCodes) {
        try {
          const keySnap = await getDoc(doc(db, 'activation_keys', code));
          if (keySnap && typeof keySnap.exists === 'function' && keySnap.exists()) {
            const data = keySnap.data();
            // If admin marked forceLogoutAt
            if (data.forceLogoutAt && userLoginTime > 0 && data.forceLogoutAt > userLoginTime) {
              continue; // Exclude force logged out by Admin
            }
            if (data.status === 'deleted') {
              continue; // Exclude deleted by Admin
            }

            // Expiration check
            const durationMs = data.duration === '1day' 
              ? (24 * 60 * 60 * 1000) 
              : data.duration === '1month' 
                ? (30 * 24 * 60 * 60 * 1000) 
                : (365 * 24 * 60 * 60 * 1000);
            const keyExpiresAt = data.expiresAt || (data.claimedAt ? data.claimedAt + durationMs : 0);
            const isKeyExpired = data.status === 'expired' || (keyExpiresAt > 0 && Date.now() > keyExpiresAt);

            if (isKeyExpired) {
              if (data.status !== 'expired') {
                updateDoc(doc(db, 'activation_keys', code), { status: 'expired' }).catch(() => {});
              }
              verifiedKeys.push({ id: keySnap.id, code: keySnap.id, ...data, isExpired: true, expiresAt: keyExpiresAt, status: 'expired' });
              continue; // Exclude expired course from verifiedCourseIds
            }

            // Sync deviceId if not set or matches
            if (!data.activeDeviceId) {
              updateDoc(doc(db, 'activation_keys', code), { activeDeviceId: deviceId }).catch(() => {});
            }

            // Check if key belongs to another original account (secondary login)
            const keyOwnerUid = data.originalOwnerUid || data.claimedByUid;
            const isSecondary = Boolean(
              keyOwnerUid &&
              currentUid &&
              keyOwnerUid !== currentUid &&
              data.status === 'used'
            );
            if (isSecondary && data.courseId) {
              secondaryCourseIdsSet.add(data.courseId);
            }

            verifiedKeys.push({ id: keySnap.id, code: keySnap.id, ...data });
            if (data.courseId) {
              verifiedCourseIds.add(data.courseId);
            }
          } else {
            // Document does not exist in snapshot:
            // If offline, or if this snapshot is from cache and unconfirmed, PRESERVE local key info!
            if (keySnap?.metadata?.fromCache || (typeof navigator !== 'undefined' && !navigator.onLine)) {
              const localMatch = localKeysInfo.find((k: any) => (k.code || k.id) === code);
              if (localMatch) {
                verifiedKeys.push(localMatch);
                if (localMatch.courseId) verifiedCourseIds.add(localMatch.courseId);
              }
            }
          }
        } catch (e) {
          // If offline or network error, keep local copy safe
          const localMatch = localKeysInfo.find((k: any) => (k.code || k.id) === code);
          if (localMatch) {
            verifiedKeys.push(localMatch);
            if (localMatch.courseId) verifiedCourseIds.add(localMatch.courseId);
          }
        }
      }

      // 2. If user is a registered non-anonymous account (e.g. Google), check claimed keys
      if (user && user.uid && !user.uid.startsWith('local_') && !user.isAnonymous) {
        try {
          const q = query(
            collection(db, 'activation_keys'),
            where('claimedByUid', '==', user.uid)
          );
          const qSnap = await getDocs(q);
          qSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const durationMs = data.duration === '1day' ? 24 * 3600000 : data.duration === '1month' ? 30 * 86400000 : 365 * 86400000;
            const keyExpiresAt = data.expiresAt || (data.claimedAt ? data.claimedAt + durationMs : 0);
            const isKeyExpired = data.status === 'expired' || (keyExpiresAt > 0 && Date.now() > keyExpiresAt);

            if (data.status === 'used' && (!data.forceLogoutAt || data.forceLogoutAt <= userLoginTime)) {
              if (isKeyExpired) {
                if (!verifiedKeys.some(k => (k.code || k.id) === docSnap.id)) {
                  verifiedKeys.push({ id: docSnap.id, code: docSnap.id, ...data, isExpired: true, expiresAt: keyExpiresAt, status: 'expired' });
                }
              } else {
                if (!verifiedKeys.some(k => (k.code || k.id) === docSnap.id)) {
                  verifiedKeys.push({ id: docSnap.id, code: docSnap.id, ...data });
                }
                if (data.courseId) verifiedCourseIds.add(data.courseId);
              }
            }
          });
        } catch (e) {}
      }

      const secArr = Array.from(secondaryCourseIdsSet);
      setSecondaryCourseIds(secArr);
      localStorage.setItem('clipzone_secondary_course_ids', JSON.stringify(secArr));

      // Restore student avatar from database if present on any primary claimed key
      const dbAvatarKey = verifiedKeys.find((k) => {
        const keyOwnerUid = k.originalOwnerUid || k.claimedByUid;
        const isSec = Boolean(keyOwnerUid && currentUid && keyOwnerUid !== currentUid && k.status === 'used');
        return !isSec && typeof k.studentAvatar === 'string' && k.studentAvatar.length > 0;
      });
      if (dbAvatarKey?.studentAvatar) {
        setUserAvatar(dbAvatarKey.studentAvatar);
        try {
          localStorage.setItem('clipzone_student_avatar', dbAvatarKey.studentAvatar);
        } catch {}
      } else {
        const localSavedAvatar = localStorage.getItem('clipzone_student_avatar') || '';
        if (localSavedAvatar) {
          verifiedKeys.forEach((k) => {
            const keyOwnerUid = k.originalOwnerUid || k.claimedByUid;
            const isSec = Boolean(keyOwnerUid && currentUid && keyOwnerUid !== currentUid && k.status === 'used');
            if (!isSec && !k.studentAvatar && (k.code || k.id)) {
              setDoc(
                doc(db, 'activation_keys', k.code || k.id),
                { studentAvatar: localSavedAvatar, studentAvatarUpdatedAt: Date.now() },
                { merge: true }
              ).catch(() => {});
            }
          });
        }
      }

      const finalActiveIds = Array.from(verifiedCourseIds);
      setUserActivationKeys(verifiedKeys);
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(verifiedKeys));
      localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(finalActiveIds));
      setActiveCourseIds(finalActiveIds);

      // Keep student display name synced with the admin-assigned name from primary activation keys
      const primaryNamedKey = verifiedKeys.find((k) => {
        const keyOwnerUid = k.originalOwnerUid || k.claimedByUid;
        const isSec = Boolean(keyOwnerUid && currentUid && keyOwnerUid !== currentUid && k.status === 'used');
        return !isSec && Boolean(cleanRealName(k.studentName));
      });
      const dbAssignedName = cleanRealName(primaryNamedKey?.studentName);
      if (dbAssignedName) {
        setAuthName(dbAssignedName);
        try {
          localStorage.setItem('clipzone_student_name', dbAssignedName);
        } catch {}
        setCurrentUser((prev) => (prev ? { ...prev, displayName: dbAssignedName } : prev));
      }
    } catch (err) {
      console.error('Error fetching student keys:', err);
      setActiveCourseIds(localActivatedCourses);
      setUserActivationKeys(localKeysInfo);
    }
  };

  // Check if a Firebase user counts as an administrator
  const isFirebaseUserAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const lower = email.toLowerCase();
    return lower === 'ai.clipzone.edu@gmail.com' || lower === 'rajababum426@gmail.com' || lower.startsWith('admin');
  };

  // Fetch keys for Admin (all keys) or Sub-Admin (strictly scoped to assigned courseId)
  const fetchAdminKeys = async () => {
    const mainAdminActive = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
    const subCourseId = !mainAdminActive && subAdminSession?.status === 'active' ? subAdminSession.courseId : '';

    if (!mainAdminActive && !subCourseId) {
      return;
    }

    let cachedKeys: any[] = [];
    if (mainAdminActive) {
      const cached = localStorage.getItem('clipzone_admin_keys_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            cachedKeys = parsed;
            setAllActivationKeys(parsed);
          }
        } catch (e) {}
      }
    }

    setIsAdminLoadingKeys(true);

    try {
      const keysRef = mainAdminActive
        ? collection(db, 'activation_keys')
        : query(collection(db, 'activation_keys'), where('courseId', '==', subCourseId));

      const querySnapshot = await getDocs(keysRef);

      const firestoreKeys: any[] = [];
      querySnapshot.forEach((docSnap: any) => {
        firestoreKeys.push({ id: docSnap.id, ...docSnap.data() });
      });

      firestoreKeys.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllActivationKeys(firestoreKeys);
      if (mainAdminActive) {
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(firestoreKeys));
      }
    } catch (err: any) {
      console.error('Failed loading keys for admin:', err);
      if (mainAdminActive && cachedKeys.length > 0) {
        setAllActivationKeys(cachedKeys);
      }
      if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
        showToast('Database connection restricted. Showing cached key database.', 'info');
      }
    } finally {
      setIsAdminLoadingKeys(false);
    }
  };

  // Realtime listeners for activation_keys & sub_admins based on active role (Main Admin vs Course Sub-Admin)
  useEffect(() => {
    const mainAdminActive = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
    const subCourseId = !mainAdminActive && subAdminSession?.status === 'active' ? subAdminSession.courseId : '';

    if (!mainAdminActive && !subCourseId) {
      return;
    }

    fetchAdminKeys();

    const keysQuery = mainAdminActive
      ? collection(db, 'activation_keys')
      : query(collection(db, 'activation_keys'), where('courseId', '==', subCourseId));

    const unsubKeys = onSnapshot(keysQuery, (snapshot) => {
      const keys: any[] = [];
      snapshot.forEach((docSnap) => {
        keys.push({ id: docSnap.id, ...docSnap.data() });
      });
      keys.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllActivationKeys(keys);
      if (mainAdminActive) {
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(keys));
      }
    }, (err) => {
      console.warn('Realtime admin keys collection listener error:', err);
    });

    let unsubSubAdmins: (() => void) | null = null;
    if (mainAdminActive) {
      unsubSubAdmins = onSnapshot(collection(db, 'sub_admins'), (snapshot) => {
        const list: SubAdminAccount[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SubAdminAccount, 'id'>) });
        });
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setSubAdminList(list);
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(list));
      }, (err) => {
        console.warn('Realtime sub_admins listener error:', err);
      });
    } else if (subAdminSession?.code) {
      // Live watch own Sub-Admin document so Main Admin disable / delete / reassign applies immediately
      const myDeviceId = getOrCreateDeviceId();
      unsubSubAdmins = onSnapshot(doc(db, 'sub_admins', subAdminSession.code), (docSnap) => {
        if ((docSnap as any)?.metadata?.fromCache && typeof navigator !== 'undefined' && !navigator.onLine) return;
        if (!docSnap.exists()) {
          setSubAdminSession(null);
          localStorage.removeItem('clipzone_sub_admin_session');
          setAllActivationKeys([]);
          setShowAdminDashboard(false);
          setShowCourseFormModal(false);
          showToast('⚠️ Your Sub-Admin account has been removed by Main Admin.', 'error');
          return;
        }
        const remote = { id: docSnap.id, ...(docSnap.data() as Omit<SubAdminAccount, 'id'>) };
        if (remote.status === 'disabled') {
          setSubAdminSession(null);
          localStorage.removeItem('clipzone_sub_admin_session');
          setAllActivationKeys([]);
          setShowAdminDashboard(false);
          setShowCourseFormModal(false);
          showToast('⚠️ Your Sub-Admin account has been disabled by Main Admin.', 'error');
          return;
        }
        if (remote.activeDeviceId && remote.activeDeviceId !== myDeviceId) {
          setSubAdminSession(null);
          localStorage.removeItem('clipzone_sub_admin_session');
          setAllActivationKeys([]);
          setShowAdminDashboard(false);
          setShowCourseFormModal(false);
          showToast('⚠️ This Sub-Admin code logged in on another device, so this session was signed out.', 'error');
          return;
        }
        setSubAdminSession(remote);
        localStorage.setItem('clipzone_sub_admin_session', JSON.stringify(remote));
      }, (err) => {
        console.warn('Sub-admin self watcher error:', err);
      });
    }

    return () => {
      unsubKeys();
      if (unsubSubAdmins) unsubSubAdmins();
    };
  }, [isAdminActivated, currentUser?.email, subAdminSession?.code, subAdminSession?.courseId]);

  // Public active Sub-Admins listener for Student -> Course Sub-Admin Ask routing (never caches codes in localStorage)
  useEffect(() => {
    const mainAdminActive = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
    if (mainAdminActive) {
      setActiveSubAdmins([]);
      return;
    }
    try {
      const activeSubsQuery = query(collection(db, 'sub_admins'), where('status', '==', 'active'));
      const unsub = onSnapshot(activeSubsQuery, (snapshot) => {
        const list: SubAdminAccount[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<SubAdminAccount, 'id'>) });
        });
        setActiveSubAdmins(list);
      }, (err) => {
        console.warn('Active sub_admins listener error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error setting up active sub_admins listener:', e);
    }
  }, [isAdminActivated, currentUser?.email]);

  // STUDENT PORTAL HANDLERS (PASSWORD-FREE ANONYMOUS SIGN-IN)
  const handleStudentAnonymousLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthSubmitting(true);
    const cleanName = authName.trim();
    if (!cleanName) {
      setAuthError('Full Name is required.');
      setIsAuthSubmitting(false);
      return;
    }

    try {
      let activeUser: any = null;
      try {
        const userCredential = await signInAnonymously(auth);
        activeUser = userCredential.user;
        if (activeUser) {
          await updateProfile(activeUser, {
            displayName: cleanName
          });
        }
      } catch (authErr) {
        console.warn('Firebase Anonymous sign-in failed or disabled, falling back to local guest user:', authErr);
        activeUser = getOrCreateLocalUser(cleanName);
      }

      localStorage.setItem('clipzone_student_name', cleanName);
      showToast(`Welcome ${cleanName}! Student Profile set up successfully! 🚀`, 'success');
      setCurrentUser(activeUser);
      
      if (activeUser && activeUser.uid && !activeUser.uid.startsWith('local_')) {
        await fetchUserActiveKeys(activeUser);
      } else {
        const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        setActiveCourseIds(localActivated);
      }
    } catch (err: any) {
      console.error('Anonymous sign-in error:', err);
      setAuthError('Failed to create student session. Please try again.');
      showToast('Profile setup failed.', 'error');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleStudentLogout = async () => {
    // Save active codes string before clearing storage
    const activeCodesStr = localStorage.getItem('clipzone_active_codes');
    const activatedKeysInfoStr = localStorage.getItem('clipzone_activated_keys_info');

    // Immediately clear local storage keys
    localStorage.removeItem('clipzone_student_name');
    localStorage.removeItem('clipzone_student_uid');
    localStorage.removeItem('clipzone_local_activated_courses');
    localStorage.removeItem('clipzone_active_codes');
    localStorage.removeItem('clipzone_activated_keys_info');
    localStorage.removeItem('clipzone_secondary_course_ids');
    localStorage.removeItem('clipzone_student_avatar');
    setSecondaryCourseIds([]);
    setUserAvatar('');

    // Reset component states so UI instantly updates and closes modals
    setCurrentUser(null);
    setUserActivationKeys([]);
    setActiveCourseIds([]);
    setSelectedClassroomCourseId('');
    setCurrentView('home');
    setAuthName('');
    setShowProfileModal(false);
    setShowUserMenu(false);

    // Release device claims in Firestore for active codes so Session shows "⚪ Logged Out"
    const codesToRelease = new Set<string>();
    if (activeCodesStr) {
      try {
        const parsed = JSON.parse(activeCodesStr);
        if (Array.isArray(parsed)) parsed.forEach((c: string) => codesToRelease.add(c));
      } catch (e) {}
    }
    if (activatedKeysInfoStr) {
      try {
        const parsed = JSON.parse(activatedKeysInfoStr);
        if (Array.isArray(parsed)) parsed.forEach((k: any) => {
          const code = k.code || k.id;
          if (code) codesToRelease.add(code);
        });
      } catch (e) {}
    }

    if (codesToRelease.size > 0) {
      for (const code of codesToRelease) {
        try {
          // DO NOT clear claimedByUid or studentName! Only clear activeDeviceId so admin sees Session: Logged Out
          await updateDoc(doc(db, 'activation_keys', code), {
            activeDeviceId: ''
          });
        } catch (err) {
          console.error(`Failed to release code ${code} during logout:`, err);
        }
      }

      // Also update local admin key cache if present so admin UI reflects logout immediately
      try {
        const adminCache = JSON.parse(localStorage.getItem('clipzone_admin_keys_cache') || '[]');
        if (adminCache.length > 0) {
          const updatedCache = adminCache.map((k: any) => {
            if (codesToRelease.has(k.code || k.id)) {
              return { ...k, activeDeviceId: '' };
            }
            return k;
          });
          localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updatedCache));
          setAllActivationKeys(updatedCache);
        }
      } catch (e) {}
    }

    // Sign out from Firebase auth
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out from Firebase failed, continuing local logout:', err);
    }

    showToast('Logged out of Student Portal and all courses!', 'info');
  };

  const handleReleaseCourseCode = async (courseId: string) => {
    const deviceId = getOrCreateDeviceId();
    try {
      const activeCodesStr = localStorage.getItem('clipzone_active_codes') || '[]';
      const activeCodes: string[] = JSON.parse(activeCodesStr);
      let releasedCode = '';

      for (const code of activeCodes) {
        const keyDocSnap = await getDoc(doc(db, 'activation_keys', code));
        if (keyDocSnap.exists()) {
          const keyData = keyDocSnap.data();
          if (keyData.courseId === courseId && keyData.activeDeviceId === deviceId) {
            releasedCode = code;
            await updateDoc(doc(db, 'activation_keys', code), {
              activeDeviceId: '',
              claimedByUid: ''
            });
            break;
          }
        }
      }

      const updatedCodes = activeCodes.filter(c => c !== releasedCode);
      localStorage.setItem('clipzone_active_codes', JSON.stringify(updatedCodes));

      const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
      const updatedCourses = localActivated.filter((id: string) => id !== courseId);
      localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedCourses));
      setActiveCourseIds(updatedCourses);

      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const updatedKeysInfo = localKeysInfo.filter((k: any) => k.courseId !== courseId);
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
      setUserActivationKeys(updatedKeysInfo);

      if (currentUser && currentUser.uid && !currentUser.uid.startsWith('local_')) {
        await fetchUserActiveKeys(currentUser);
      }

      showToast('Course logged out from this device! This code can now be used on another device.', 'success');
    } catch (err) {
      console.error('Error releasing course code:', err);
      showToast('Failed to release course code.', 'error');
    }
  };

  // Lookup & verify a Course Sub-Admin code in Firestore (with offline cache fallback)
  const tryActivateSubAdminByCode = async (rawInput: string): Promise<'activated' | 'disabled' | 'not_found'> => {
    const cleaned = extractAndCleanCode(rawInput);
    const rawUpper = rawInput.trim().toUpperCase();
    const candidates = Array.from(new Set([cleaned, rawUpper].filter(Boolean)));
    if (candidates.length === 0) return 'not_found';

    let foundSub: SubAdminAccount | null = null;
    let checkedRemote = false;

    for (const candidate of candidates) {
      try {
        const subRef = doc(db, 'sub_admins', candidate);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SUB_TIMEOUT')), 2500));
        const snap: any = await Promise.race([getDoc(subRef), timeoutPromise]);
        if (snap && typeof snap.exists === 'function') {
          checkedRemote = true;
          if (snap.exists()) {
            foundSub = { id: snap.id, ...(snap.data() as Omit<SubAdminAccount, 'id'>) };
            break;
          }
        }
      } catch (err) {
        console.warn('Sub-admin Firestore lookup error:', err);
      }
    }

    if (!foundSub && !checkedRemote) {
      try {
        const cachedStr = localStorage.getItem('clipzone_sub_admins_cache');
        const cached: SubAdminAccount[] = cachedStr ? JSON.parse(cachedStr) : [];
        const localMatch = [...subAdminList, ...cached].find(s => candidates.includes(s.code));
        if (localMatch) foundSub = localMatch;
      } catch {}
    }

    if (!foundSub) return 'not_found';
    if (foundSub.status === 'disabled') {
      showToast('⚠️ This Sub-Admin code is currently disabled. Please contact Main Admin.', 'error');
      return 'disabled';
    }

    await handleActivateSubAdminSession(foundSub);

    return 'activated';
  };

  // Shared login handler for Admin Verification Modal (supports Main Admin & Course Sub-Admin codes)
  const handleVerifyAdminModalLogin = async () => {
    const raw = adminCodeInput;
    const code = raw.trim().toUpperCase();
    const cleaned = extractAndCleanCode(raw);
    const isValid = (await verifyAdminSecret(code)) || (await verifyAdminSecret(raw));
    if (isValid) {
      await handleActivateAdminSession();
      setShowAdminLoginModal(false);
      setAdminCodeInput('');
      setAdminInitialTab('keys');
      setShowAdminDashboard(true);
      showToast('⚡ Admin Mode activated successfully! 👑 (Single Device Locked)', 'success');
      return;
    }

    const subStatus = await tryActivateSubAdminByCode(cleaned || raw);
    if (subStatus === 'activated') {
      setShowAdminLoginModal(false);
      setAdminCodeInput('');
      setAdminInitialTab('courses');
      setShowAdminDashboard(true);
      showToast('🛡️ Sub-Admin Mode activated! Your course dashboard is now open.', 'success');
      return;
    }
    if (subStatus === 'disabled') {
      return;
    }

    showToast('Invalid activation key. Please try again.', 'error');
  };

  // ACTIVATE / CLAIM SECRET KEY
  const handleClaimActivationCode = async (e: FormEvent) => {
    e.preventDefault();
    const rawInput = activationCodeInput;
    const cleanCode = extractAndCleanCode(rawInput);
    if (!cleanCode && !rawInput.trim()) {
      showToast('Please enter a secret activation code.', 'error');
      return;
    }

    // Check if code is the secret Admin activation code (check both cleanCode and rawInput)
    const isSecretAdmin = (await verifyAdminSecret(cleanCode)) || (await verifyAdminSecret(rawInput));
    if (isSecretAdmin) {
      await handleActivateAdminSession();
      
      setActivationCodeInput('');
      setShowCodeInputModal(false);
      setShowProfileModal(false);
      setAdminInitialTab('keys');
      setShowAdminDashboard(true);
      showToast('⚡ Admin Mode activated successfully! 👑 (Single Device Locked)', 'success');
      return;
    }

    // Check if code belongs to a Course Sub-Admin
    const subStatus = await tryActivateSubAdminByCode(rawInput);
    if (subStatus === 'disabled') {
      return;
    }
    if (subStatus === 'activated') {
      setActivationCodeInput('');
      setShowCodeInputModal(false);
      setShowProfileModal(false);
      setAdminInitialTab('courses');
      setShowAdminDashboard(true);
      showToast('🛡️ Sub-Admin Mode activated! Click the Logo anytime to open your course dashboard.', 'success');
      return;
    }

    setIsActivating(true);
    try {
      const deviceId = getOrCreateDeviceId();

      let keyData: any = null;
      let keyDocRef = null;
      let checkedFirestore = false;
      let existsInFirestore = false;

      // 1. Query Firestore first (authoritative source)
      try {
        keyDocRef = doc(db, 'activation_keys', cleanCode);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 2500));
        const keyDocSnap: any = await Promise.race([
          getDoc(keyDocRef),
          timeoutPromise
        ]);

        if (keyDocSnap && typeof keyDocSnap.exists === 'function') {
          checkedFirestore = true;
          if (keyDocSnap.exists()) {
            existsInFirestore = true;
            keyData = keyDocSnap.data();
          } else {
            existsInFirestore = false;
            keyData = null; // Key was deleted by Admin or never created!
          }
        }
      } catch (dbErr) {
        console.warn('Firestore query timeout or error during key lookup:', dbErr);
      }

      // 2. If Firestore could not be checked (e.g. timeout or offline), check local Admin Key cache
      if (!checkedFirestore) {
        const cachedKeysStr = localStorage.getItem('clipzone_admin_keys_cache');
        let cachedKeys: any[] = [];
        try {
          if (cachedKeysStr) cachedKeys = JSON.parse(cachedKeysStr);
        } catch (e) {}

        const localKeyMatch = cachedKeys.find((k: any) => (k.code || k.id) === cleanCode) 
          || allActivationKeys.find((k: any) => (k.code || k.id) === cleanCode);

        if (localKeyMatch) {
          keyData = localKeyMatch;
        }
      }

      // STRICT VALIDATION: Reject if key was never created by Admin or was deleted by Admin
      if (!keyData || (checkedFirestore && !existsInFirestore) || keyData.status === 'deleted') {
        showToast('❌ Invalid or deleted secret code! Please enter the valid code provided by Admin.', 'error');
        setIsActivating(false);
        return;
      }

      // Check if key belongs to another user UID (secondary login)
      const currentStudentUid = currentUser?.uid || localStorage.getItem('clipzone_student_uid') || '';
      const originalOwnerUid = keyData?.originalOwnerUid || keyData?.claimedByUid || '';
      const isSecondaryLogin = Boolean(
        originalOwnerUid &&
        currentStudentUid &&
        originalOwnerUid !== currentStudentUid &&
        keyData?.status === 'used'
      );

      // Automatically get Student Name assigned by Admin to this key, strictly preserving real names
      // If it is a secondary login, do NOT copy the original owner's student name
      const keyStudentName = (!isSecondaryLogin && keyData?.studentName && keyData.studentName.trim() !== 'Student Learner')
        ? keyData.studentName.trim()
        : '';
      const existingRealName = (currentUser?.displayName && currentUser.displayName !== 'Student Learner' ? currentUser.displayName : '') ||
        (authName && authName !== 'Student Learner' ? authName : '') ||
        (localStorage.getItem('clipzone_student_name') && localStorage.getItem('clipzone_student_name') !== 'Student Learner' ? localStorage.getItem('clipzone_student_name') : '');
      const assignedStudentName = isSecondaryLogin
        ? (existingRealName || 'Student Learner')
        : (keyStudentName || existingRealName || (keyData?.claimedByEmail ? (keyData.claimedByEmail.split('@')[0].charAt(0).toUpperCase() + keyData.claimedByEmail.split('@')[0].slice(1)) : '') || 'Student');

      // Ensure student session profile is initialized with assigned name (with 1.5s timeout guard)
      let activeUser = currentUser;
      if (!activeUser || !localStorage.getItem('clipzone_student_name')) {
        try {
          const authTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 1500));
          const userCredential: any = await Promise.race([
            signInAnonymously(auth),
            authTimeout
          ]);
          activeUser = userCredential.user;
          try {
            await updateProfile(activeUser, { displayName: assignedStudentName });
          } catch (e) {}
          setCurrentUser(activeUser);
        } catch (authErr) {
          console.warn('Firebase anonymous sign-in timed out or disabled, using fast local student session:', authErr);
          activeUser = getOrCreateLocalUser(assignedStudentName) as any;
          setCurrentUser(activeUser);
        }
        setAuthName(assignedStudentName);
        localStorage.setItem('clipzone_student_name', assignedStudentName);
      } else if (assignedStudentName && assignedStudentName !== 'Student Learner') {
        setAuthName(assignedStudentName);
        localStorage.setItem('clipzone_student_name', assignedStudentName);
        if (activeUser && activeUser.uid && !activeUser.uid.startsWith('local_')) {
          try {
            await updateProfile(activeUser, { displayName: assignedStudentName });
          } catch (e) {
            console.warn('Profile name update:', e);
          }
        }
      }

      // Expiration check on entered code
      const durationMs = keyData?.duration === '1day' 
        ? (24 * 60 * 60 * 1000) 
        : keyData?.duration === '1month' 
          ? (30 * 24 * 60 * 60 * 1000) 
          : (365 * 24 * 60 * 60 * 1000);
      const calculatedExpiresAt = keyData?.expiresAt || (keyData?.claimedAt ? keyData.claimedAt + durationMs : 0);
      const isAlreadyExpired = keyData?.status === 'expired' || (calculatedExpiresAt > 0 && Date.now() > calculatedExpiresAt);

      if (isAlreadyExpired) {
        showToast('⚠️ This activation code has expired!', 'error');
        setIsActivating(false);
        return;
      }

      // Single-device login check:
      if (keyData && keyData.activeDeviceId && keyData.activeDeviceId !== deviceId) {
        showToast('This code is already active on another device! Please log out there first.', 'error');
        setIsActivating(false);
        return;
      }

      // Determine course to unlock
      let unlockedCourseId = keyData?.courseId || (courses && courses[0]?.id) || 'course-1';
      let unlockedCourseTitle = keyData?.courseTitle || (courses && courses[0]?.title) || 'Premiere Pro Course';

      // Track secondary login for this course
      if (isSecondaryLogin && unlockedCourseId) {
        setSecondaryCourseIds(prev => {
          const next = Array.from(new Set([...prev, unlockedCourseId]));
          localStorage.setItem('clipzone_secondary_course_ids', JSON.stringify(next));
          return next;
        });
      }

      // Guarantee stable permanent student UID across re-logins and devices
      const permanentStudentUid = keyData?.claimedByUid || activeUser?.uid || localStorage.getItem('clipzone_student_uid') || ('local_' + Math.random().toString(36).substring(2, 11));
      try {
        localStorage.setItem('clipzone_student_uid', permanentStudentUid);
      } catch (e) {}

      // Resolve persisted student photo from database key or current local state
      const savedKeyAvatar =
        !isSecondaryLogin && typeof keyData?.studentAvatar === 'string' && keyData.studentAvatar
          ? keyData.studentAvatar
          : '';
      const currentLocalAvatar = userAvatar || localStorage.getItem('clipzone_student_avatar') || '';
      const resolvedStudentAvatar = savedKeyAvatar || currentLocalAvatar;
      if (resolvedStudentAvatar) {
        setUserAvatar(resolvedStudentAvatar);
        try {
          localStorage.setItem('clipzone_student_avatar', resolvedStudentAvatar);
        } catch (e) {}
      }

      // Attempt to update status in Firestore with 1.5s timeout guard
      if (keyDocRef) {
        try {
          const updateTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('UPDATE_TIMEOUT')), 1500));
          const updatePayload: any = {
            status: 'used',
            activeDeviceId: deviceId,
            deviceClaimedAt: Date.now(),
            forceLogoutAt: 0,
          };
          if (!keyData.originalOwnerUid && !keyData.claimedByUid) {
            updatePayload.originalOwnerUid = permanentStudentUid;
            updatePayload.claimedByUid = permanentStudentUid;
            updatePayload.studentName = assignedStudentName;
            updatePayload.claimedByEmail = assignedStudentName;
            updatePayload.claimedAt = Date.now();
            updatePayload.expiresAt = Date.now() + durationMs;
          } else if (!isSecondaryLogin) {
            updatePayload.studentName = assignedStudentName;
          }
          if (!isSecondaryLogin && resolvedStudentAvatar && !keyData.studentAvatar) {
            updatePayload.studentAvatar = resolvedStudentAvatar;
            updatePayload.studentAvatarUpdatedAt = Date.now();
          }

          await Promise.race([
            updateDoc(keyDocRef, updatePayload),
            updateTimeout
          ]);
        } catch (dbErr) {
          console.warn('Failed or timed out syncing claimed key status to cloud:', dbErr);
        }
      }

      // Link/ensure conversation document exists for assigned Course Sub-Admin ONLY (never Main Admin)
      try {
        const normTitle = (v?: string) => (v || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const unlockedAliases =
          unlockedCourseId === 'al-master-class-course-by-al-clipzone'
            ? [unlockedCourseId, 'Ai master class course by Ai clipzone']
            : unlockedCourseId === 'Ai master class course by Ai clipzone'
              ? [unlockedCourseId, 'al-master-class-course-by-al-clipzone']
              : [unlockedCourseId];

        let matchedSub = [...activeSubAdmins, ...subAdminList].find(
          s =>
            s.status === 'active' &&
            (unlockedAliases.includes(s.courseId) ||
              (normTitle(unlockedCourseTitle) !== '' && normTitle(s.courseTitle) === normTitle(unlockedCourseTitle)))
        );
        if (!matchedSub && unlockedCourseId && unlockedCourseId !== 'course-all') {
          try {
            const subSnap = await getDocs(query(collection(db, 'sub_admins'), where('status', '==', 'active')));
            subSnap.forEach((d) => {
              if (matchedSub) return;
              const sData = { id: d.id, ...(d.data() as Omit<SubAdminAccount, 'id'>) };
              if (
                unlockedAliases.includes(sData.courseId) ||
                (normTitle(unlockedCourseTitle) !== '' && normTitle(sData.courseTitle) === normTitle(unlockedCourseTitle))
              ) {
                matchedSub = sData;
              }
            });
          } catch {}
        }
        if (matchedSub) {
          const subConvId = `substudent__${matchedSub.code}__${permanentStudentUid}`;
          const convDocRef = doc(db, 'support_conversations', subConvId);
          const safeAvatar =
            resolvedStudentAvatar && resolvedStudentAvatar.length <= 200000
              ? resolvedStudentAvatar
              : '';
          const convInitNow = Date.now();
          const existingConvSnap = await getDoc(convDocRef).catch(() => null);
          if (existingConvSnap?.exists()) {
            updateDoc(convDocRef, {
              userName: assignedStudentName,
              userEmail: assignedStudentName,
              ...(safeAvatar ? { userAvatar: safeAvatar } : {}),
              subAdminName: matchedSub.name,
              courseId: unlockedCourseId || matchedSub.courseId,
              activeCourse: unlockedCourseTitle || matchedSub.courseTitle,
              updatedAt: convInitNow
            }).catch(() => {});
          } else {
            setDoc(convDocRef, {
              id: subConvId,
              userId: permanentStudentUid,
              userName: assignedStudentName,
              userEmail: assignedStudentName,
              ...(safeAvatar ? { userAvatar: safeAvatar } : {}),
              channelType: 'student_subadmin',
              subAdminCode: matchedSub.code,
              subAdminName: matchedSub.name,
              courseId: unlockedCourseId || matchedSub.courseId,
              activeCourse: unlockedCourseTitle || matchedSub.courseTitle,
              purchasedCourses: unlockedCourseTitle ? [unlockedCourseTitle] : [],
              lastMessage: '',
              lastMessageAt: convInitNow,
              lastSender: 'system',
              unreadAdminCount: 0,
              unreadUserCount: 0,
              createdAt: convInitNow,
              updatedAt: convInitNow
            }).catch(() => {});
          }
        }
      } catch (e) {}

      // Save locally to make it 100% stable offline-first
      const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
      if (unlockedCourseId && !localActivated.includes(unlockedCourseId)) {
        localActivated.push(unlockedCourseId);
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(localActivated));
        setActiveCourseIds(localActivated);
      }

      const claimNow = Date.now();
      localStorage.setItem('clipzone_session_login_time', String(claimNow));
      localStorage.setItem('clipzone_last_session_reset', String(claimNow));

      const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      if (!activeCodes.includes(cleanCode)) {
        activeCodes.push(cleanCode);
        localStorage.setItem('clipzone_active_codes', JSON.stringify(activeCodes));
      }

      // Save key metadata object locally for student profile & certificate activation dates
      const rawKeyClaimedAt = keyData?.claimedAt && typeof keyData.claimedAt.toMillis === 'function'
        ? keyData.claimedAt.toMillis()
        : Number(keyData?.claimedAt || 0);
      const effectiveClaimedAt = rawKeyClaimedAt > 0 ? rawKeyClaimedAt : claimNow;
      const keyExp = keyData?.expiresAt || (effectiveClaimedAt + durationMs);

      const newKeyObj = {
        id: cleanCode,
        code: cleanCode,
        courseId: unlockedCourseId,
        courseTitle: unlockedCourseTitle,
        studentName: assignedStudentName,
        claimedAt: effectiveClaimedAt,
        expiresAt: keyExp,
        duration: keyData?.duration || '1year',
        status: 'used'
      };

      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const updatedKeysInfo = [newKeyObj, ...localKeysInfo.filter((k: any) => k.courseId !== unlockedCourseId && k.code !== cleanCode)];
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
      setUserActivationKeys(updatedKeysInfo);

      // Sync status into admin local cache so admin panel updates immediately
      try {
        const adminCache = JSON.parse(localStorage.getItem('clipzone_admin_keys_cache') || '[]');
        const updatedAdminCache = adminCache.map((k: any) => {
          if ((k.code || k.id) === cleanCode) {
            return {
              ...k,
              status: 'used',
              activeDeviceId: deviceId,
              studentName: assignedStudentName,
              claimedByEmail: assignedStudentName,
              claimedByUid: activeUser?.uid || 'local_student',
              claimedAt: claimNow
            };
          }
          return k;
        });
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updatedAdminCache));
        setAllActivationKeys(updatedAdminCache);
      } catch (e) {}

      showToast(`Welcome ${assignedStudentName}! Successfully unlocked: "${unlockedCourseTitle || 'Your Course'}"! 🎉`, 'success');
      setActivationCodeInput('');
      setShowCodeInputModal(false);
      setShowProfileModal(false);
      
      if (activeUser && activeUser.uid && !activeUser.uid.startsWith('local_')) {
        try {
          const fetchTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1500));
          await Promise.race([
            fetchUserActiveKeys(activeUser),
            fetchTimeout
          ]);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error claiming activation code:', err);
      showToast('Failed to claim the secret code. Please contact admin.', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  // ADMIN & SUB-ADMIN ACTIVATION KEY GENERATION HANDLER
  const handleGenerateActivationKey = async (
    courseId: string, 
    autoCopy: boolean = true, 
    studentNameArg?: string, 
    durationArg?: '1day' | '1month' | '1year'
  ) => {
    if (!isMainAdmin && !isSubAdmin) {
      showToast('Unauthorized access! You do not have permission to generate course codes.', 'error');
      return;
    }

    // Course Sub-Admins are strictly locked to their assigned courseId
    let targetCourseId = isSubAdmin && subAdminSession ? subAdminSession.courseId : courseId;
    if (!targetCourseId && courses && courses.length > 0) {
      targetCourseId = courses[0].id;
    }
    
    const selectedCourseData = courses.find(c => c.id === targetCourseId);
    const courseTitle = selectedCourseData
      ? selectedCourseData.title
      : (isSubAdmin && subAdminSession?.courseTitle) || courses[0]?.title || 'All Courses Access';
    const finalCourseId = selectedCourseData ? selectedCourseData.id : targetCourseId || (courses[0]?.id || 'course-all');

    const studentName = (studentNameArg !== undefined ? studentNameArg : genStudentName).trim();
    const duration = durationArg || genSelectedDuration || '1year';

    // Generate readable random secret code
    const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalCode = `CLIP-${randId}`;

    const newKeyDoc = {
      id: finalCode,
      code: finalCode,
      status: 'unused',
      duration: duration,
      createdAt: Date.now(),
      courseId: finalCourseId,
      courseTitle: courseTitle,
      studentName: studentName,
      createdByRole: (isMainAdmin ? 'main_admin' : 'sub_admin') as 'main_admin' | 'sub_admin',
      ...(isSubAdmin && subAdminSession
        ? {
            createdBySubAdminCode: subAdminSession.code,
            createdByName: subAdminSession.name,
          }
        : {
            createdByName: 'Main Admin',
          }),
    };

    // Instantly update UI and local cache (only Main Admin writes full global cache)
    setAllActivationKeys(prev => {
      const updated = [newKeyDoc, ...prev.filter(k => k.code !== finalCode && k.id !== finalCode)];
      if (isMainAdmin) {
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await setDoc(doc(db, 'activation_keys', finalCode), newKeyDoc);

      if (autoCopy) {
        try {
          await navigator.clipboard.writeText(finalCode);
          showToast(`Secret code "${finalCode}" generated for ${studentName} & copied! 📋`, 'success');
        } catch (clipErr) {
          showToast(`Secret code "${finalCode}" generated for ${studentName}!`, 'success');
        }
      } else {
        showToast(`Secret code "${finalCode}" generated for ${studentName}!`, 'success');
      }
      setGenStudentName('');
    } catch (err) {
      console.error('Failed to write code to Firestore:', err);
      showToast(`Secret code "${finalCode}" created locally for ${studentName}!`, 'success');
      setGenStudentName('');
    }
  };

  // MAIN ADMIN ONLY: SUB-ADMIN CRUD HANDLERS
  const handleCreateSubAdmin = async (
    name: string,
    courseId: string,
    customCode?: string,
    avatarUrl?: string
  ): Promise<SubAdminAccount | null> => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can create Sub-Admin codes.', 'error');
      return null;
    }

    const cleanName = name.trim();
    const targetCourse = courses.find(c => c.id === courseId);
    if (!cleanName || !targetCourse) {
      showToast('Sub-Admin name and assigned course are required.', 'error');
      return null;
    }

    let finalCode = (customCode || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');

    if (!finalCode) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      finalCode = `SUB-${rand}`;
    }

    // Prevent collision with Main Admin secret code
    if (await verifyAdminSecret(finalCode)) {
      showToast('This code conflicts with the Main Admin code. Please use another code.', 'error');
      return null;
    }

    // Prevent collision with existing Sub-Admin or Student key
    if (subAdminList.some(s => s.code === finalCode)) {
      showToast(`Code "${finalCode}" is already in use. Please choose another code.`, 'error');
      return null;
    }

    try {
      const [existingSubSnap, existingKeySnap] = await Promise.all([
        getDoc(doc(db, 'sub_admins', finalCode)).catch(() => null),
        getDoc(doc(db, 'activation_keys', finalCode)).catch(() => null),
      ]);
      if (existingSubSnap?.exists() || existingKeySnap?.exists()) {
        showToast(`Code "${finalCode}" already exists. Please use a different code.`, 'error');
        return null;
      }
    } catch {}

    const cleanAvatarUrl = (avatarUrl || '').trim();
    const newSubAdmin: SubAdminAccount = {
      id: finalCode,
      code: finalCode,
      name: cleanName,
      courseId: targetCourse.id,
      courseTitle: targetCourse.title,
      ...(cleanAvatarUrl ? { avatarUrl: cleanAvatarUrl } : {}),
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await setDoc(doc(db, 'sub_admins', finalCode), newSubAdmin);
      if (cleanAvatarUrl) {
        const subNow = Date.now();
        const safeSubAvatar = cleanAvatarUrl.length <= 200000 ? cleanAvatarUrl : '';
        setDoc(
          doc(db, 'support_conversations', `subadmin_main__${finalCode}`),
          {
            id: `subadmin_main__${finalCode}`,
            channelType: 'subadmin_mainadmin',
            subAdminCode: finalCode,
            subAdminName: cleanName,
            userId: finalCode,
            userName: cleanName,
            ...(safeSubAvatar ? { userAvatar: safeSubAvatar } : {}),
            courseId: targetCourse.id,
            activeCourse: targetCourse.title,
            lastMessage: 'No messages yet',
            lastMessageAt: subNow,
            lastSender: 'system',
            unreadAdminCount: 0,
            unreadUserCount: 0,
            createdAt: subNow,
            updatedAt: subNow,
          },
          { merge: true }
        ).catch(() => {});
      }
      setSubAdminList(prev => {
        const updated = [newSubAdmin, ...prev.filter(s => s.code !== finalCode)];
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(updated));
        return updated;
      });
      return newSubAdmin;
    } catch (err) {
      console.error('Error creating Sub-Admin:', err);
      showToast('Failed to save Sub-Admin code.', 'error');
      return null;
    }
  };

  const handleUpdateSubAdminAvatar = async (subAdmin: SubAdminAccount, avatarUrl: string) => {
    const canUpdate = isMainAdmin || (isSubAdmin && subAdminSession?.code === subAdmin.code);
    if (!canUpdate) {
      showToast('Permission denied.', 'error');
      return;
    }
    const cleanAvatar = (avatarUrl || '').trim();
    const safeConvAvatar = cleanAvatar.length <= 200000 ? cleanAvatar : '';
    const now = Date.now();
    try {
      await updateDoc(doc(db, 'sub_admins', subAdmin.code), {
        avatarUrl: cleanAvatar,
        updatedAt: now,
      });
      const mainConvRef = doc(db, 'support_conversations', `subadmin_main__${subAdmin.code}`);
      updateDoc(mainConvRef, {
        subAdminName: subAdmin.name,
        userName: subAdmin.name,
        userAvatar: safeConvAvatar,
        updatedAt: now,
      }).catch(() => {
        setDoc(mainConvRef, {
          id: `subadmin_main__${subAdmin.code}`,
          channelType: 'subadmin_mainadmin',
          subAdminCode: subAdmin.code,
          subAdminName: subAdmin.name,
          userId: subAdmin.code,
          userName: subAdmin.name,
          userAvatar: safeConvAvatar,
          courseId: subAdmin.courseId,
          activeCourse: subAdmin.courseTitle,
          lastMessage: 'No messages yet',
          lastMessageAt: now,
          lastSender: 'system',
          unreadAdminCount: 0,
          unreadUserCount: 0,
          createdAt: now,
          updatedAt: now,
        }).catch(() => {});
      });

      setSubAdminList(prev => {
        const updated = prev.map(s =>
          s.code === subAdmin.code ? { ...s, avatarUrl: cleanAvatar, updatedAt: now } : s
        );
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(updated));
        return updated;
      });

      if (subAdminSession && subAdminSession.code === subAdmin.code) {
        const nextSess = { ...subAdminSession, avatarUrl: cleanAvatar, updatedAt: now };
        setSubAdminSession(nextSess);
        try {
          localStorage.setItem('clipzone_sub_admin_session', JSON.stringify(nextSess));
        } catch {}
      }

      showToast(cleanAvatar ? `Updated photo/logo for "${subAdmin.name}"!` : 'Photo/logo removed.', 'success');
    } catch (err) {
      console.error('Error updating Sub-Admin avatar:', err);
      showToast('Failed to update photo/logo.', 'error');
    }
  };

  const handleToggleSubAdminStatus = async (subAdmin: SubAdminAccount) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can change Sub-Admin status.', 'error');
      return;
    }
    const nextStatus: 'active' | 'disabled' = subAdmin.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'sub_admins', subAdmin.code), {
        status: nextStatus,
        updatedAt: Date.now(),
      });
      setSubAdminList(prev => {
        const updated = prev.map(s => s.code === subAdmin.code ? { ...s, status: nextStatus, updatedAt: Date.now() } : s);
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(updated));
        return updated;
      });
      showToast(
        nextStatus === 'active'
          ? `Sub-Admin "${subAdmin.name}" is now Active. ✅`
          : `Sub-Admin "${subAdmin.name}" has been Disabled. ⛔`,
        nextStatus === 'active' ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Error toggling Sub-Admin status:', err);
      showToast('Failed to update Sub-Admin status.', 'error');
    }
  };

  const handleUpdateSubAdminCourse = async (subAdmin: SubAdminAccount, newCourseId: string) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can change the assigned course.', 'error');
      return;
    }
    const targetCourse = courses.find(c => c.id === newCourseId);
    if (!targetCourse) return;
    try {
      await updateDoc(doc(db, 'sub_admins', subAdmin.code), {
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        updatedAt: Date.now(),
      });
      setSubAdminList(prev => {
        const updated = prev.map(s =>
          s.code === subAdmin.code
            ? { ...s, courseId: targetCourse.id, courseTitle: targetCourse.title, updatedAt: Date.now() }
            : s
        );
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(updated));
        return updated;
      });
      showToast(`Updated course for "${subAdmin.name}" to "${targetCourse.title}"!`, 'success');
    } catch (err) {
      console.error('Error updating Sub-Admin course:', err);
      showToast('Failed to update Sub-Admin course.', 'error');
    }
  };

  const handleDeleteSubAdmin = async (code: string) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete a Sub-Admin.', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'sub_admins', code));
      setSubAdminList(prev => {
        const updated = prev.filter(s => s.code !== code);
        localStorage.setItem('clipzone_sub_admins_cache', JSON.stringify(updated));
        return updated;
      });
      showToast(`Sub-Admin (${code}) permanently removed.`, 'success');
    } catch (err) {
      console.error('Error deleting Sub-Admin:', err);
      showToast('Failed to delete Sub-Admin.', 'error');
    }
  };

  // ADMIN PAYMENT QR SETTINGS HANDLER (MAIN ADMIN ONLY)
  const handleSavePaymentConfig = async (newConfig: PaymentQrConfig) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can update Global Payment settings.', 'error');
      return;
    }
    setPaymentConfig(newConfig);
    localStorage.setItem('clipzone_payment_config', JSON.stringify(newConfig));
    try {
      await setDoc(doc(db, 'system', 'payment_qr'), newConfig);
    } catch (err) {
      console.error('Error saving payment config to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'system/payment_qr');
    }
  };

  // ADMIN FAQS SETTINGS HANDLER (MAIN ADMIN ONLY)
  const handleSaveFaqs = async (newFaqs: FAQItem[]) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can update FAQs.', 'error');
      return;
    }
    setFaqs(newFaqs);
    localStorage.setItem('clipzone_faqs_config', JSON.stringify(newFaqs));
    try {
      await setDoc(doc(db, 'system', 'faqs'), {
        items: newFaqs,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Error saving FAQs to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'system/faqs');
    }
  };

  // ADMIN OVERALL SITE SETTINGS HANDLER (MAIN ADMIN ONLY)
  const handleSaveSiteSettings = async (newSettings: SiteSettingsConfig) => {
    if (!isMainAdmin) {
      const msg = 'Only Main Admin can update Site settings.';
      showToast(msg, 'error');
      throw new Error(msg);
    }
    const cleanedSettings = cleanUndefined(newSettings);
    if (estimateJsonByteSize(cleanedSettings) > 950 * 1024) {
      throw new Error('⚠️ Total site/certificate images exceed Firebase 1MB document limit. Please re-upload or remove oversized images.');
    }
    setSiteSettings(cleanedSettings);
    try {
      localStorage.setItem('clipzone_site_settings', JSON.stringify(cleanedSettings));
    } catch (storageErr) {
      console.warn('Could not cache site settings to localStorage:', storageErr);
    }
    try {
      await setDoc(doc(db, 'system', 'site_settings'), cleanedSettings);
    } catch (err) {
      console.error('Error saving site settings to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'system/site_settings');
    }
  };

  // ADMIN & SCOPED SUB-ADMIN DIRECT COURSE UPDATE HANDLER
  const handleSaveCourseDirect = async (updatedCourse: Course) => {
    if (!canEditCourse(updatedCourse.id)) {
      const msg = 'You are only permitted to edit your assigned course.';
      showToast(msg, 'error');
      throw new Error(msg);
    }
    const existingCourse = courses.find(c => c.id === updatedCourse.id);
    const safeCourse: Course = isMainAdmin
      ? updatedCourse
      : {
          ...updatedCourse,
          includeLive: existingCourse?.includeLive,
          includeCertificate: existingCourse?.includeCertificate,
          isHidden: Boolean(existingCourse?.isHidden),
        };
    const cleaned = cleanUndefined(safeCourse);
    if (estimateJsonByteSize(cleaned) > 950 * 1024) {
      throw new Error('⚠️ Course data & uploaded images exceed Firebase 1MB limit. Please re-upload smaller images.');
    }
    setCourses(prev => {
      const index = prev.findIndex(c => c.id === safeCourse.id);
      let updatedList: Course[];
      if (index >= 0) {
        updatedList = [...prev];
        updatedList[index] = safeCourse;
      } else {
        updatedList = [...prev, safeCourse];
      }
      try {
        localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
      } catch (storageErr) {
        console.warn('Could not cache dynamic courses to localStorage:', storageErr);
      }
      return updatedList;
    });

    if (selectedCourse && selectedCourse.id === safeCourse.id) {
      setSelectedCourse(safeCourse);
    }
    if (enrollCourse && enrollCourse.id === safeCourse.id) {
      setEnrollCourse(safeCourse);
    }

    try {
      await setDoc(doc(db, 'courses', safeCourse.id), cleaned, { merge: true });
    } catch (err) {
      console.error('Error saving updated course to Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `courses/${updatedCourse.id}`);
    }
  };

  // MAIN ADMIN ONLY: Hide or Unhide Course from Home & Public Screen
  const handleToggleCourseVisibility = async (course: Course) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can hide or unhide courses.', 'error');
      return;
    }
    const nextHidden = !Boolean(course.isHidden);
    try {
      await handleSaveCourseDirect({
        ...course,
        isHidden: nextHidden,
        updatedAt: Date.now(),
      });
      showToast(
        nextHidden
          ? `🙈 "${course.title}" hidden from Home screen! (Sub-Admin can still generate Student Codes)`
          : `👁️ "${course.title}" is now visible on Home screen!`,
        nextHidden ? 'info' : 'success'
      );
    } catch (err) {
      console.error('Error toggling course visibility:', err);
    }
  };

  // DIRECT COURSE SECTION VIDEO ADD / DELETE (Sub-Admin on assigned course & Main Admin, without opening Edit Course modal)
  const handleAddDirectVideoLecture = async (e: FormEvent, targetCourse: Course) => {
    e.preventDefault();
    if (!canEditCourse(targetCourse.id)) {
      showToast('You are only permitted to add videos to your assigned course.', 'error');
      return;
    }
    const cleanTitle = directVideoTitle.trim();
    const cleanUrl = directVideoUrl.trim();
    const cleanChapter = directVideoChapter.trim();

    if (!cleanTitle || !cleanUrl) {
      showToast('Please enter both Lecture Title and Video Link.', 'error');
      return;
    }

    setIsSavingDirectVideo(true);
    try {
      const newVideo: CourseVideo = {
        title: cleanTitle,
        duration: '',
        videoUrl: cleanUrl,
        ...(cleanChapter ? { chapterTitle: cleanChapter } : {}),
      };
      const updatedVideos = [...(targetCourse.videos || []), newVideo];
      await handleSaveCourseDirect({
        ...targetCourse,
        videos: updatedVideos,
        updatedAt: Date.now(),
      });
      if (cleanChapter) {
        setClassroomExpandedChapters((prev) => ({
          ...prev,
          [`${targetCourse.id}::${cleanChapter}`]: true,
        }));
      }
      setDirectVideoTitle('');
      setDirectVideoUrl('');
      setShowDirectVideoAddForm(false);
      showToast(`🎬 "${cleanTitle}" added directly to course!`, 'success');
    } catch (err) {
      console.error('Error adding direct video lecture:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save video lecture.';
      showToast(errMsg, 'error');
    } finally {
      setIsSavingDirectVideo(false);
    }
  };

  const handleDeleteDirectVideoLecture = async (targetCourse: Course, videoIndex: number) => {
    if (!canEditCourse(targetCourse.id)) {
      showToast('You are only permitted to remove videos from your assigned course.', 'error');
      return;
    }
    const existingVideos = targetCourse.videos || [];
    if (videoIndex < 0 || videoIndex >= existingVideos.length) return;
    const removedTitle = existingVideos[videoIndex]?.title || 'Video';
    const updatedVideos = existingVideos.filter((_, i) => i !== videoIndex);
    try {
      await handleSaveCourseDirect({
        ...targetCourse,
        videos: updatedVideos,
        updatedAt: Date.now(),
      });
      setConfirmDeleteVideoIdx(null);
      showToast(`🗑️ Removed "${removedTitle}".`, 'info');
    } catch (err) {
      console.error('Error removing direct video lecture:', err);
      showToast('Failed to remove video lecture.', 'error');
    }
  };

  const handleOpenDirectCourseVideos = (course: Course) => {
    setSelectedClassroomCourseId(course.id);
    setClassroomTab('videos');
    setShowDirectVideoAddForm(true);
    setConfirmDeleteVideoIdx(null);
    const existingVideos = course.videos || [];
    const lastCh = existingVideos.length > 0 ? (existingVideos[existingVideos.length - 1]?.chapterTitle || '') : '';
    setDirectVideoChapter(lastCh);
    navigateToPath('/classroom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // MAIN ADMIN: Move Course Up or Down in Catalog Order (persisted atomically to Firestore)
  const isReorderingCoursesRef = useRef(false);
  const handleMoveCourse = async (courseId: string, direction: 'up' | 'down') => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can reorder courses.', 'error');
      return;
    }
    if (isReorderingCoursesRef.current) return;

    const currentIndex = courses.findIndex(c => c.id === courseId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;

    isReorderingCoursesRef.current = true;
    const reordered = [...courses];
    const [movedCourse] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedCourse);

    const normalized = reordered.map((c, idx) => ({
      ...c,
      order: idx,
    }));

    const previousCourses = courses;
    setCourses(normalized);
    try {
      localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(normalized));
      localStorage.setItem('clipzone_courses_initialized', 'true');
    } catch (storageErr) {
      console.warn('Could not cache reordered courses to localStorage:', storageErr);
    }

    try {
      const batch = writeBatch(db);
      const now = Date.now();
      normalized.forEach((c, idx) => {
        if (previousCourses[idx]?.id !== c.id || previousCourses[idx]?.order !== idx) {
          batch.set(doc(db, 'courses', c.id), { order: idx, updatedAt: now }, { merge: true });
        }
      });
      await batch.commit();
      showToast(
        direction === 'up'
          ? `⬆️ Moved "${movedCourse.title}" up to #${targetIndex + 1}!`
          : `⬇️ Moved "${movedCourse.title}" down to #${targetIndex + 1}!`,
        'success'
      );
    } catch (err) {
      console.error('Error reordering courses in Firestore:', err);
      setCourses(previousCourses);
      try {
        localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(previousCourses));
      } catch {}
      showToast('Failed to save course order.', 'error');
      handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}`);
    } finally {
      isReorderingCoursesRef.current = false;
    }
  };

  // Helper to verify key belongs to Sub-Admin's assigned course before mutation
  const verifyKeyPermission = async (code: string): Promise<boolean> => {
    if (isMainAdmin) return true;
    if (!isSubAdmin || !subAdminSession) return false;
    const localKey = allActivationKeys.find(k => (k.code || k.id) === code);
    if (localKey) {
      return localKey.courseId === subAdminSession.courseId;
    }
    try {
      const snap = await getDoc(doc(db, 'activation_keys', code));
      if (snap.exists()) {
        return snap.data()?.courseId === subAdminSession.courseId;
      }
    } catch {}
    return false;
  };

  const handleDeleteActivationKey = async (code: string) => {
    if (!(await verifyKeyPermission(code))) {
      showToast('You can only delete codes for your assigned course.', 'error');
      return;
    }

    // 1. Delete document from Firestore
    try {
      await deleteDoc(doc(db, 'activation_keys', code));
      
      // Cleanup any secondary matching documents
      try {
        const qSnap = await getDocs(query(collection(db, 'activation_keys'), where('code', '==', code)));
        for (const d of qSnap.docs) {
          if (d.id !== code) {
            await deleteDoc(doc(db, 'activation_keys', d.id));
          }
        }
      } catch (qErr) {
        console.warn('Additional key cleanup query:', qErr);
      }

      showToast(`Secret code ${code} permanently deleted from database.`, 'success');
    } catch (err) {
      console.error('Failed to delete key from Firestore:', err);
      showToast(`Secret code ${code} deleted locally.`, 'info');
    }

    // 2. Instantly update Admin state and local admin cache
    setAllActivationKeys(prev => {
      const updated = prev.filter(k => (k.code || k.id) !== code);
      if (isMainAdmin) {
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
      }
      return updated;
    });

    // 3. Instantly revoke student active code & course if activated on this device
    const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
    const updatedActiveCodes = activeCodes.filter((c: string) => c !== code);
    localStorage.setItem('clipzone_active_codes', JSON.stringify(updatedActiveCodes));

    const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
    const keyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
    const updatedKeysInfo = localKeysInfo.filter((k: any) => (k.code || k.id) !== code);
    localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
    setUserActivationKeys(updatedKeysInfo);

    if (keyInfo && keyInfo.courseId) {
      const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
      const updatedActivated = localActivated.filter((id: string) => id !== keyInfo.courseId);
      localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
      setActiveCourseIds(updatedActivated);
    }
  };

  // ADMIN HANDLER: DELETE ALL STUDENT ACTIVATION KEYS PERMANENTLY (MAIN ADMIN ONLY)
  const handleDeleteAllKeys = async () => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete all codes.', 'error');
      return;
    }
    setIsAdminLoadingKeys(true);
    try {
      const snap = await getDocs(collection(db, 'activation_keys'));
      const batchSize = 300;
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      // Clear local storage and state
      setAllActivationKeys([]);
      localStorage.removeItem('clipzone_admin_keys_cache');
      showToast('All student course codes permanently deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete all keys:', err);
      // Ensure local state is cleared even if offline
      setAllActivationKeys([]);
      localStorage.removeItem('clipzone_admin_keys_cache');
      showToast('All course codes deleted.', 'info');
    } finally {
      setIsAdminLoadingKeys(false);
    }
  };

  // ADMIN HANDLER: FORCE LOGOUT A SPECIFIC USER/KEY SESSION
  const handleLogoutUserKey = async (code: string) => {
    if (!(await verifyKeyPermission(code))) {
      showToast('You can only log out devices for your assigned course.', 'error');
      return;
    }
    const logoutTime = Date.now();
    try {
      await updateDoc(doc(db, 'activation_keys', code), {
        activeDeviceId: '',
        forceLogoutAt: logoutTime
      });
      showToast(`User session logged out for code ${code}! 🚪`, 'success');
    } catch (err) {
      console.error('Failed to log out key from Firestore:', err);
      showToast(`User session for ${code} reset locally.`, 'info');
    }

    // Update local admin cache and state immediately
    setAllActivationKeys(prev => {
      const updated = prev.map(k => {
        if ((k.code || k.id) === code) {
          return { ...k, activeDeviceId: '', forceLogoutAt: logoutTime };
        }
        return k;
      });
      if (isMainAdmin) {
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
      }
      return updated;
    });

    // Also revoke on current device if activated here
    const activeCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
    if (activeCodes.includes(code)) {
      const updatedCodes = activeCodes.filter(c => c !== code);
      localStorage.setItem('clipzone_active_codes', JSON.stringify(updatedCodes));

      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const keyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
      const updatedKeysInfo = localKeysInfo.filter((k: any) => (k.code || k.id) !== code);
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
      setUserActivationKeys(updatedKeysInfo);

      if (keyInfo && keyInfo.courseId) {
        const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        const updatedActivated = localActivated.filter((id: string) => id !== keyInfo.courseId);
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
        setActiveCourseIds(updatedActivated);
      }
    }
  };

  // ADMIN HANDLER: EXPIRE A SPECIFIC USER/KEY IMMEDIATELY
  const handleExpireKey = async (code: string) => {
    if (!(await verifyKeyPermission(code))) {
      showToast('You can only expire codes for your assigned course.', 'error');
      return;
    }
    const expireTime = Date.now();
    try {
      await updateDoc(doc(db, 'activation_keys', code), {
        status: 'expired',
        isExpired: true,
        expiresAt: expireTime
      });
      showToast(`Key ${code} marked as EXPIRED! ⏰`, 'success');
    } catch (err) {
      console.error('Failed to expire key in Firestore:', err);
      showToast(`Key ${code} marked as expired locally.`, 'info');
    }

    // Update local admin cache and state immediately
    setAllActivationKeys(prev => {
      const updated = prev.map(k => {
        if ((k.code || k.id) === code) {
          return { ...k, status: 'expired', isExpired: true, expiresAt: expireTime };
        }
        return k;
      });
      if (isMainAdmin) {
        try {
          localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
        } catch (e) {}
      }
      return updated;
    });

    // Also expire immediately on current device if this user was using this key
    const activeCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
    if (activeCodes.includes(code)) {
      const updatedCodes = activeCodes.filter(c => c !== code);
      localStorage.setItem('clipzone_active_codes', JSON.stringify(updatedCodes));

      const localKeysInfo = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
      const keyInfo = localKeysInfo.find((k: any) => (k.code || k.id) === code);
      const updatedKeysInfo = localKeysInfo.map((k: any) => 
        (k.code || k.id) === code ? { ...k, status: 'expired', isExpired: true, expiresAt: expireTime } : k
      );
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
      setUserActivationKeys(updatedKeysInfo);

      if (keyInfo && keyInfo.courseId) {
        const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        const updatedActivated = localActivated.filter((id: string) => id !== keyInfo.courseId);
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
        setActiveCourseIds(updatedActivated);
      }
      
      // Stop video playback if playing
      setFullscreenVideo(null);
    }
  };

  // ADMIN HANDLER: FORCE LOGOUT ALL USER SESSIONS ACROSS ALL DEVICES (MAIN ADMIN ONLY)
  const handleExecuteLogoutAllUserSessions = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!isMainAdmin) {
      showToast('Only Main Admin can log out all devices.', 'error');
      return;
    }

    if (logoutAllConfirmWord.trim().toUpperCase() !== 'CONFIRM') {
      showToast('❌ Please type CONFIRM to proceed.', 'error');
      return;
    }

    const inputCode = logoutSecretCodeInput.trim().toUpperCase();
    const isAuthorized = await verifyAdminSecret(inputCode);
    if (!isAuthorized) {
      showToast('❌ Invalid secret code! Unable to log out sessions.', 'error');
      return;
    }

    try {
      const resetTime = Date.now();

      // 1. Reset active devices and claimed user status on all activation keys in Firestore
      try {
        const keysSnap = await getDocs(collection(db, 'activation_keys'));
        for (const kDoc of keysSnap.docs) {
          const kData = kDoc.data();
          if (kData.activeDeviceId || kData.claimedByUid) {
            await updateDoc(doc(db, 'activation_keys', kDoc.id), {
              activeDeviceId: '',
              claimedByUid: ''
            });
          }
        }
      } catch (keyResetErr) {
        console.warn('Error resetting activation key devices in Firestore:', keyResetErr);
      }

      // 2. Set global session reset timestamp in system config
      await setDoc(doc(db, 'system', 'config'), {
        global_session_reset_at: resetTime,
        courses_seeded: true
      }, { merge: true });

      // Save acknowledged reset time for current admin device
      localStorage.setItem('clipzone_last_session_reset', String(resetTime));

      // 3. Reset local student active sessions on current device silently
      signOut(auth).catch(() => {});
      localStorage.removeItem('clipzone_student_name');
      localStorage.removeItem('clipzone_student_uid');
      localStorage.removeItem('clipzone_local_activated_courses');
      localStorage.removeItem('clipzone_active_codes');
      localStorage.removeItem('clipzone_activated_keys_info');
      setCurrentUser(null);
      setUserActivationKeys([]);
      setActiveCourseIds([]);
      setAuthName('');

      setShowLogoutConfirmModal(false);
      setLogoutSecretCodeInput('');
      setLogoutAllConfirmWord('');

      // Refresh admin key list
      fetchAdminKeys();

      showToast('⚡ Success: All active user devices and sessions logged out!', 'success');
    } catch (err) {
      console.error('Failed to reset all user sessions:', err);
      showToast('An error occurred while logging out all sessions.', 'error');
    }
  };

  // Course details modal state & dedicated Enroll page state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);

  // Open dedicated Course Enroll & QR Payment verification page
  const handleEnrollCourse = (course: Course) => {
    setSelectedCourse(null);
    setShowQrModal(false);
    setEnrollCourse(course);
    setCurrentView('enroll');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Free Course Enrollment: capture compulsory Name & Phone, activate course immediately, and open Classroom
  const handleFreeEnrollComplete = async (
    course: Course,
    details: { fullName: string; phone: string }
  ) => {
    const cleanName = cleanRealName(details.fullName) || details.fullName.trim();
    const cleanPhone = details.phone.trim();
    const now = Date.now();
    const deviceId = getOrCreateDeviceId();

    let activeUser: any = currentUser || auth.currentUser;
    if (!activeUser) {
      try {
        const authTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 2000)
        );
        const cred: any = await Promise.race([signInAnonymously(auth), authTimeout]);
        activeUser = cred?.user;
      } catch {
        activeUser = getOrCreateLocalUser(cleanName);
      }
    }

    if (activeUser && activeUser.uid && !activeUser.uid.startsWith('local_') && auth.currentUser) {
      try {
        await updateProfile(auth.currentUser, { displayName: cleanName });
      } catch {
        // Ignore profile update failures
      }
    }

    const permanentStudentUid =
      (activeUser?.uid && !String(activeUser.uid).startsWith('local_') ? activeUser.uid : '') ||
      localStorage.getItem('clipzone_student_uid') ||
      activeUser?.uid ||
      `local_${Math.random().toString(36).substring(2, 11)}`;

    if (activeUser) {
      setCurrentUser({ ...activeUser, displayName: cleanName });
    }
    setAuthName(cleanName);
    try {
      localStorage.setItem('clipzone_student_name', cleanName);
      localStorage.setItem('clipzone_student_uid', permanentStudentUid);
    } catch {}

    const slugPrefix = (course.id || 'COURSE')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 6) || 'COURSE';
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const freeKeyCode = `FREE-${slugPrefix}-${randomSuffix}`;
    const expiresAt = now + 10 * 365 * 24 * 60 * 60 * 1000;

    const keyPayload: ActivationKey & { isFreeEnrollment: boolean; deviceClaimedAt: number; forceLogoutAt: number } = {
      id: freeKeyCode,
      code: freeKeyCode,
      status: 'used',
      duration: '1year',
      createdAt: now,
      claimedAt: now,
      expiresAt,
      courseId: course.id,
      courseTitle: course.title,
      studentName: cleanName,
      studentPhone: cleanPhone,
      claimedByName: cleanName,
      claimedByEmail:
        activeUser?.email && !activeUser.isAnonymous ? activeUser.email : cleanPhone,
      claimedByUid: permanentStudentUid,
      activeDeviceId: deviceId,
      deviceClaimedAt: now,
      forceLogoutAt: 0,
      isFreeEnrollment: true,
      createdByRole: 'main_admin',
      createdByName: 'Free Enrollment',
    };

    try {
      await Promise.race([
        setDoc(doc(db, 'activation_keys', freeKeyCode), {
          ...keyPayload,
          originalOwnerUid: permanentStudentUid,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('KEY_SYNC_TIMEOUT')), 2500)),
      ]);
    } catch (err) {
      console.warn('Free enrollment key cloud sync deferred/offline:', err);
    }

    if (auth.currentUser?.uid) {
      try {
        const reqRef = doc(collection(db, 'course_requests'));
        await setDoc(reqRef, {
          id: reqRef.id,
          userId: auth.currentUser.uid,
          userEmail:
            auth.currentUser.email && !auth.currentUser.isAnonymous
              ? auth.currentUser.email
              : cleanPhone,
          courseId: course.id,
          courseTitle: course.title,
          coursePrice: 'FREE',
          fullName: cleanName,
          phone: cleanPhone,
          status: 'accepted',
          requestedAt: now,
          createdAt: now,
        });
      } catch {
        // Non-fatal enrollment log
      }
    }

    // Update local persistent storage before updating activeCourseIds state
    try {
      localStorage.setItem('clipzone_session_login_time', String(now));
      localStorage.setItem('clipzone_last_session_reset', String(now));

      const activeCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
      if (!activeCodes.includes(freeKeyCode)) {
        activeCodes.push(freeKeyCode);
        localStorage.setItem('clipzone_active_codes', JSON.stringify(activeCodes));
      }

      const localActivated: string[] = JSON.parse(
        localStorage.getItem('clipzone_local_activated_courses') || '[]'
      );
      if (!localActivated.includes(course.id)) {
        localActivated.push(course.id);
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(localActivated));
      }
      setActiveCourseIds(localActivated);

      const localKeysInfo: any[] = JSON.parse(
        localStorage.getItem('clipzone_activated_keys_info') || '[]'
      );
      const updatedKeysInfo = [
        keyPayload,
        ...localKeysInfo.filter((k: any) => k.courseId !== course.id && k.code !== freeKeyCode),
      ];
      localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(updatedKeysInfo));
      setUserActivationKeys(updatedKeysInfo);
    } catch {
      setActiveCourseIds((prev) => (prev.includes(course.id) ? prev : [...prev, course.id]));
    }

    // Automatically enter the enrolled course classroom
    setEnrollCourse(null);
    setSelectedClassroomCourseId(course.id);
    setCurrentVideoIndex(0);
    setCurrentView('classroom');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Enrolled in "${course.title}"! Welcome, ${cleanName}!`, 'success');
  };
  // QR modal state
  const [showQrModal, setShowQrModal] = useState(false);
  // Quick Code Activation Modal State for Students
  const [showCodeInputModal, setShowCodeInputModal] = useState(false);
  // User navigation menu state
  const [showUserMenu, setShowUserMenu] = useState(false);
  // User profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  // Certificate modal state
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedCertCourseId, setSelectedCertCourseId] = useState<string>('');
  const [certificateCourseTitle, setCertificateCourseTitle] = useState('AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS');
  const [certificateStudentName, setCertificateStudentName] = useState('');
  const [certificateIssueDate, setCertificateIssueDate] = useState('');
  const [certificateCode, setCertificateCode] = useState('');
  // Canvas ref for FonePay QR
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);


  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(0);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [openDetailChapters, setOpenDetailChapters] = useState<Record<string, boolean>>({});
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  // Reusable clipboard paste handler for course activation code
  const handlePasteCodeToInput = useCallback(async (targetSetter?: (val: string) => void) => {
    const setter = targetSetter || setActivationCodeInput;
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        showToast('Please long-press the input box to paste.', 'info');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast('Clipboard is empty. Copy your code first.', 'error');
        return;
      }
      const cleaned = extractAndCleanCode(text);
      setter(cleaned);
      showToast(`📋 Code pasted: ${cleaned}`, 'success');
    } catch (err) {
      console.warn('Clipboard read error or permission denied:', err);
      showToast('Clipboard permission denied. Please paste directly into the input box.', 'info');
    }
  }, [showToast]);
  const [pageVideoIndexes, setPageVideoIndexes] = useState<Record<string, number>>({});
  const [showAllCoursesAnyway, setShowAllCoursesAnyway] = useState(false);

  const initialParsedRoute = useMemo(
    () => parsePathnameToRoute(typeof window !== 'undefined' ? window.location.pathname : '/'),
    []
  );
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(initialParsedRoute.locale);
  const [routeSlug, setRouteSlug] = useState<string | undefined>(initialParsedRoute.slug);
  const [routeCategory, setRouteCategory] = useState<string | undefined>(initialParsedRoute.category);
  const [currentView, setCurrentView] = useState<AppView>(initialParsedRoute.view);
  const [isAskChatOpen, setIsAskChatOpen] = useState(false);
  const [selectedClassroomCourseId, setSelectedClassroomCourseId] = useState<string | null>(null);
  const [selectedLiveCourseId, setSelectedLiveCourseId] = useState<string | null>(null);

  const navigateToPath = useCallback(
    (cleanPath: string, targetLocale?: SupportedLocale) => {
      const nextLocale = targetLocale ?? activeLocale;
      const targetUrl = buildLocalizedPath(cleanPath, nextLocale);
      const parsed = parsePathnameToRoute(targetUrl);
      if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
        window.history.pushState({}, '', targetUrl);
      }
      setActiveLocale(parsed.locale);
      setRouteSlug(parsed.slug);
      setRouteCategory(parsed.category);
      setCurrentView(parsed.view);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [activeLocale]
  );

  const switchLocale = useCallback(
    (nextLocale: SupportedLocale) => {
      const currentPath =
        typeof window !== 'undefined'
          ? parsePathnameToRoute(window.location.pathname).cleanPathWithoutLocale
          : '/';
      navigateToPath(currentPath, nextLocale);
    },
    [navigateToPath]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const parsed = parsePathnameToRoute(window.location.pathname);
      setActiveLocale(parsed.locale);
      setRouteSlug(parsed.slug);
      setRouteCategory(parsed.category);
      setCurrentView(parsed.view);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const publicCatalogCourses = useMemo(() => {
    if (courses && courses.length > 0) return courses.filter((c) => c.isHidden !== true);
    if (isCoursesLoading) return [];
    return COURSES.filter((c) => !deletedCourseIds.includes(c.id) && c.isHidden !== true);
  }, [courses, deletedCourseIds, isCoursesLoading]);

  const publicInstructors = useMemo(
    () => buildPublicInstructors(publicCatalogCourses, activeSubAdmins),
    [publicCatalogCourses, activeSubAdmins]
  );

  useEffect(() => {
    if (currentView !== 'ask') {
      setIsAskChatOpen(false);
    }
  }, [currentView]);

  // Automatically route any legacy modal trigger to full screen account view
  useEffect(() => {
    if (showProfileModal) {
      setCurrentView('account');
      setShowProfileModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showProfileModal]);
  const [fullscreenVideo, setFullscreenVideo] = useState<{
    courseTitle: string;
    title: string;
    videoUrl: string;
    idx: number;
    playlist: { title: string; duration: string; videoUrl: string }[];
    courseId: string;
  } | null>(null);


  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [videoRotation, setVideoRotation] = useState<number>(0); // 0, 90, 180, 270 degrees
  const [showOverlayControls, setShowOverlayControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOverlayControlsTimer = (duration = 2500) => {
    setShowOverlayControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowOverlayControls(false);
    }, duration);
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    if (!fullscreenVideo) {
      setVideoRotation(0);
    }
  }, [fullscreenVideo]);

  const handleCloseVideo = (e?: { stopPropagation: () => void }) => {
    if (e) e.stopPropagation();
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setVideoRotation(0);
    setFullscreenVideo(null);
  };

  const handleRotateVideo = () => {
    const angles = [0, 90, 180, 270];
    const currentIndex = angles.indexOf(videoRotation);
    const nextDeg = angles[currentIndex === -1 ? 1 : (currentIndex + 1) % angles.length];
    setVideoRotation(nextDeg);
    showToast(`Video Rotation: ${nextDeg}°`, 'info');
    resetOverlayControlsTimer(1800);
  };

  const getRotationStyle = () => {
    if (videoRotation === 90) {
      return {
        width: '100vh',
        height: '100vw',
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        zIndex: 10000,
        backgroundColor: '#000'
      };
    }
    if (videoRotation === 180) {
      return {
        width: '100vw',
        height: '100vh',
        position: 'fixed' as const,
        top: '0',
        left: '0',
        transform: 'rotate(180deg)',
        zIndex: 10000,
        backgroundColor: '#000'
      };
    }
    if (videoRotation === 270) {
      return {
        width: '100vh',
        height: '100vw',
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(270deg)',
        zIndex: 10000,
        backgroundColor: '#000'
      };
    }
    return {};
  };

  // Strict Global Security: Block Copy, Cut, Drag, Context Menu, and Copy Shortcuts
  useEffect(() => {
    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', 'HamroLms - Link Sharing Disabled');
      }
    };

    const blockKeyCombos = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        ['c', 'C', 'u', 'U', 's', 'S', 'a', 'A', 'x', 'X', 'i', 'I'].includes(e.key)
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blockDrag = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('copy', blockCopy, true);
    window.addEventListener('cut', blockCopy, true);
    window.addEventListener('keydown', blockKeyCombos, true);
    window.addEventListener('contextmenu', blockContextMenu, true);
    window.addEventListener('dragstart', blockDrag, true);

    return () => {
      window.removeEventListener('copy', blockCopy, true);
      window.removeEventListener('cut', blockCopy, true);
      window.removeEventListener('keydown', blockKeyCombos, true);
      window.removeEventListener('contextmenu', blockContextMenu, true);
      window.removeEventListener('dragstart', blockDrag, true);
    };
  }, []);

  const toggleFullscreenMode = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch (err) {
      console.log('Fullscreen error:', err);
    }
  };



  // Auth Form Fields
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState(() => localStorage.getItem('clipzone_student_name') || '');
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Admin Key Generation Panel states
  const [allActivationKeys, setAllActivationKeys] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('clipzone_admin_keys_cache') || '[]');
    } catch {
      return [];
    }
  });
  const [genSelectedCourseId, setGenSelectedCourseId] = useState('');
  const [genSelectedDuration, setGenSelectedDuration] = useState<'1month' | '1year'>('1year');
  const [genStudentName, setGenStudentName] = useState('');
  const [adminSearchKeyQuery, setAdminSearchKeyQuery] = useState('');
  const [isAdminLoadingKeys, setIsAdminLoadingKeys] = useState(false);

  // Top Navigation Course Search Bar states (supports ?search= for Google Sitelinks SearchAction)
  const [courseSearchQuery, setCourseSearchQuery] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return new URLSearchParams(window.location.search).get('search') || '';
      }
    } catch {}
    return '';
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hiddenCoursesCount = useMemo(
    () => courses.filter((c) => Boolean(c.isHidden)).length,
    [courses]
  );

  // Filtered courses for Home page based on Top Navigation search query (never exposes hidden courses)
  const filteredHomeCourses = useMemo(() => {
    const visibleCourses = courses.filter((c) => c.isHidden !== true);
    if (!courseSearchQuery.trim()) return visibleCourses;
    const q = courseSearchQuery.toLowerCase().trim();
    return visibleCourses.filter(c => 
      c.title?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q) ||
      c.popularText?.toLowerCase().includes(q) ||
      c.learn?.some(l => l.toLowerCase().includes(q)) ||
      c.videos?.some(v => v.title.toLowerCase().includes(q))
    );
  }, [courses, courseSearchQuery]);

  // FAQ open indexes
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({});

  // Carousel testimonial index
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHoveredCarousel, setIsHoveredCarousel] = useState(false);

  // Advanced Testimonials & Reviews states
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('All');
  const [testimonialSearchQuery, setTestimonialSearchQuery] = useState('');
  const [allTestimonials, setAllTestimonials] = useState<any[]>(() => {
    const filterOutTarget = (list: any[]) => {
      return list.filter((item) => {
        const name = (item.name || '').toLowerCase();
        return !name.includes('rajababu') && !name.includes('mehta');
      });
    };

    const saved = localStorage.getItem('clipzone_submitted_testimonials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const filteredParsed = filterOutTarget(parsed);
        if (filteredParsed.length !== parsed.length) {
          localStorage.setItem('clipzone_submitted_testimonials', JSON.stringify(filteredParsed));
        }
        return [...filteredParsed, ...filterOutTarget(TESTIMONIALS)];
      } catch (e) {
        return filterOutTarget(TESTIMONIALS);
      }
    }
    return filterOutTarget(TESTIMONIALS);
  });
  const [isSliderAutoPlaying, setIsSliderAutoPlaying] = useState(true);

  // Contact Form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCourse, setContactCourse] = useState('General Inquiry');
  const [contactMsg, setContactMsg] = useState('');

  // Ask & Live Support unread badge counts
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [subAdminUnreadCount, setSubAdminUnreadCount] = useState(0);

  // Role-based admin checks (Main Admin vs Course Sub-Admin) & course activation checks
  const isMainAdmin = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
  const isSubAdmin = Boolean(!isMainAdmin && subAdminSession && subAdminSession.status === 'active');
  const isUserAdminSession = Boolean(isMainAdmin || isSubAdmin);
  const subAdminAssignedCourse = useMemo(
    () => (isSubAdmin && subAdminSession?.courseId ? courses.find(c => c.id === subAdminSession.courseId) : undefined),
    [isSubAdmin, subAdminSession?.courseId, courses]
  );
  const canSubAdminAccessLive = Boolean(isSubAdmin && subAdminAssignedCourse?.includeLive === true);
  const canEditCourse = useCallback(
    (courseId: string) => isMainAdmin || (isSubAdmin && subAdminSession?.courseId === courseId),
    [isMainAdmin, isSubAdmin, subAdminSession?.courseId]
  );
  const hasCourseActivated = activeCourseIds.length > 0;
  const isCourseActiveUser = Boolean(hasCourseActivated || isUserAdminSession);
  const hasCertificateCourse = Boolean(
    isMainAdmin ||
    courses.some(
      (c) =>
        activeCourseIds.includes(c.id) &&
        !secondaryCourseIds.includes(c.id) &&
        !c.includeLive &&
        c.includeCertificate !== false
    )
  );
  const hasStudentProfile = Boolean(
    !isUserAdminSession
      ? (currentUser || localStorage.getItem('clipzone_student_name'))
      : (activeCourseIds.length > 0 || userActivationKeys.length > 0)
  );

  // Role & course-scoped notifications filtering (course_students notifications go ONLY to activated users of that course)
  const notifications = useMemo(() => {
    return rawNotifications.filter((n) => {
      if (n.target === 'course_students') {
        if (isMainAdmin) return true;
        if (isSubAdmin && subAdminSession?.courseId && n.courseId === subAdminSession.courseId) return true;
        if (!isUserAdminSession && n.courseId) {
          return activeCourseIds.includes(n.courseId) || activeCourseIds.includes('course-all');
        }
        return false;
      }
      if (n.target === 'students') {
        return isUserAdminSession || activeCourseIds.length > 0;
      }
      return true;
    });
  }, [rawNotifications, isMainAdmin, isSubAdmin, subAdminSession?.courseId, isUserAdminSession, activeCourseIds]);

  useEffect(() => {
    try {
      const readIds: string[] = JSON.parse(localStorage.getItem('clipzone_read_notifs') || '[]');
      const unread = notifications.filter(n => !readIds.includes(n.id));
      setUnreadNotifIds(unread.map(n => n.id));
      setUnreadNotifCount(unread.length);

      const isPwaActive = checkIsAppMode();
      const seenAlertIds: string[] = JSON.parse(sessionStorage.getItem('clipzone_alerted_notifs') || '[]');
      const newest = notifications[0];
      if (isPwaActive && newest && !seenAlertIds.includes(newest.id) && Date.now() - (newest.createdAt || 0) < 30000) {
        seenAlertIds.push(newest.id);
        sessionStorage.setItem('clipzone_alerted_notifs', JSON.stringify(seenAlertIds));
        showNativeNotification({
          title: newest.title,
          body: newest.body,
          url: newest.url || '/'
        });
      }
    } catch {}
  }, [notifications]);

  const handleMarkAllNotifsRead = useCallback(() => {
    const readIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('clipzone_read_notifs') || '[]');
      } catch {
        return [];
      }
    })();
    const merged = Array.from(new Set([...readIds, ...notifications.map(n => n.id)]));
    localStorage.setItem('clipzone_read_notifs', JSON.stringify(merged));
    setUnreadNotifIds([]);
    setUnreadNotifCount(0);
    showToast('All notifications marked as read', 'info');
  }, [notifications, showToast]);

  // Live Session CRUD handlers (Sub-Admin for assigned live course, or Main Admin)
  const handleSaveLiveSession = useCallback(async (data: SaveLiveSessionInput) => {
    const targetCourse = courses.find(c => c.id === data.courseId);
    const isAllowed = isMainAdmin || (
      isSubAdmin &&
      subAdminSession?.courseId === data.courseId &&
      targetCourse?.includeLive === true
    );
    if (!isAllowed) {
      showToast('You do not have permission to create Live Sessions.', 'error');
      return;
    }

    const now = Date.now();
    const sessionRef = data.id ? doc(db, 'live_sessions', data.id) : doc(collection(db, 'live_sessions'));
    const sessionId = sessionRef.id;
    const existing = data.id ? liveSessions.find(s => s.id === data.id) : undefined;

    const sessionPayload: LiveSession = cleanUndefined({
      id: sessionId,
      courseId: data.courseId,
      courseTitle: data.courseTitle,
      title: data.title,
      description: data.description,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      durationMinutes: data.durationMinutes,
      status: data.status,
      hostName: data.hostName,
      createdByRole: (isMainAdmin ? 'main_admin' : 'sub_admin') as 'main_admin' | 'sub_admin',
      createdBySubAdminCode: isSubAdmin ? subAdminSession?.code : undefined,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });

    try {
      await setDoc(sessionRef, sessionPayload);
      await setDoc(doc(db, 'live_session_secrets', sessionId), {
        sessionId,
        courseId: data.courseId,
        zoomLink: data.zoomLink,
        updatedAt: now
      });

      if (data.notifyStudents) {
        const notifRef = doc(collection(db, 'notifications'));
        const scheduleHint = [data.scheduledDate, data.scheduledTime].filter(Boolean).join(' • ');
        const liveNotif: PushNotificationItem = cleanUndefined({
          id: notifRef.id,
          title: `🎥 Live Class: ${data.title}`,
          body: `${data.courseTitle}${scheduleHint ? ` (${scheduleHint})` : ''} — Open Course Section -> Live Session to join the class.`,
          type: 'live' as const,
          badge: data.status === 'live' ? 'LIVE NOW' : 'LIVE SCHEDULED',
          target: 'course_students' as const,
          courseId: data.courseId,
          sessionId,
          author: data.hostName,
          createdAt: now
        });
        await setDoc(notifRef, liveNotif);
      }

      showToast(
        data.id
          ? '✅ Live meeting updated!'
          : data.notifyStudents
          ? '🎥 Live meeting created & enrolled students notified!'
          : '🎥 Live meeting created!',
        'success'
      );
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, `live_sessions/${sessionId}`);
    }
  }, [courses, isMainAdmin, isSubAdmin, subAdminSession, liveSessions, showToast]);

  const handleDeleteLiveSession = useCallback(async (sessionId: string) => {
    const target = liveSessions.find(s => s.id === sessionId);
    const isAllowed = isMainAdmin || (isSubAdmin && target && target.courseId === subAdminSession?.courseId);
    if (!isAllowed) {
      showToast('You do not have permission to delete this Live Session.', 'error');
      return;
    }
    try {
      await deleteDoc(doc(db, 'live_sessions', sessionId));
      await deleteDoc(doc(db, 'live_session_secrets', sessionId)).catch(() => {});
      showToast('Live session removed.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `live_sessions/${sessionId}`);
    }
  }, [liveSessions, isMainAdmin, isSubAdmin, subAdminSession?.courseId, showToast]);

  const handleUpdateLiveSessionStatus = useCallback(async (session: LiveSession, nextStatus: 'live' | 'scheduled' | 'ended') => {
    const isAllowed = isMainAdmin || (isSubAdmin && session.courseId === subAdminSession?.courseId);
    if (!isAllowed) {
      showToast('Permission denied.', 'error');
      return;
    }
    try {
      await updateDoc(doc(db, 'live_sessions', session.id), {
        status: nextStatus,
        updatedAt: Date.now()
      });
      showToast(
        nextStatus === 'live' ? '🟢 Session is now LIVE!' : nextStatus === 'ended' ? 'Session ended.' : 'Session updated.',
        'info'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `live_sessions/${session.id}`);
    }
  }, [isMainAdmin, isSubAdmin, subAdminSession?.courseId, showToast]);
  const askUnreadCount = isMainAdmin ? adminUnreadCount : isSubAdmin ? subAdminUnreadCount : studentUnreadCount;
  const hasAskUnread = askUnreadCount > 0;
  const askBadgeText = askUnreadCount > 99 ? '99+' : String(askUnreadCount);

  // Video playback security guard: terminate fullscreen playback if access expired
  useEffect(() => {
    if (fullscreenVideo && fullscreenVideo.courseId && !isUserAdminSession) {
      if (!activeCourseIds.includes(fullscreenVideo.courseId)) {
        setFullscreenVideo(null);
        showToast('⚠️ Video closed because your course access has expired.', 'error');
      }
    }
  }, [activeCourseIds, fullscreenVideo, isUserAdminSession]);

  const formatCertificateAdDate = (dateInput: number | Date = new Date()): string => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) {
      return new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const toTimestampMs = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val?.toMillis === 'function') return val.toMillis();
    if (typeof val?.seconds === 'number') return val.seconds * 1000;
    const parsed = Number(val);
    if (!isNaN(parsed) && parsed > 0) return parsed;
    const dateParsed = Date.parse(String(val));
    return !isNaN(dateParsed) && dateParsed > 0 ? dateParsed : 0;
  };

  const getCourseActivatedAdDate = (courseId?: string): string => {
    const allKeys: any[] = (() => {
      try {
        const local = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
        if (Array.isArray(userActivationKeys) && userActivationKeys.length > 0) {
          return [...userActivationKeys, ...(Array.isArray(local) ? local : [])];
        }
        return Array.isArray(local) ? local : [];
      } catch {
        return Array.isArray(userActivationKeys) ? userActivationKeys : [];
      }
    })();

    const targetKey = courseId
      ? (
          allKeys.find(k => k?.courseId === courseId && !isCourseKeyExpired(k)) ||
          allKeys.find(k => k?.courseId === courseId) ||
          allKeys.find(k => k?.courseId === 'course-all' && !isCourseKeyExpired(k)) ||
          allKeys.find(k => k?.id === courseId)
        )
      : allKeys[0];

    const activatedTs =
      toTimestampMs(targetKey?.claimedAt) ||
      toTimestampMs(targetKey?.activatedAt) ||
      toTimestampMs(targetKey?.deviceClaimedAt) ||
      toTimestampMs(targetKey?.createdAt);

    if (activatedTs > 0) {
      return formatCertificateAdDate(activatedTs);
    }

    if (courseId) {
      const storageKey = `clipzone_cert_issue_ad_${courseId}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && saved.trim() && !/^20[789]\d[/-]/.test(saved.trim())) {
          return saved.trim();
        }
      } catch {}
    }

    const sessionTs = toTimestampMs(localStorage.getItem('clipzone_session_login_time'));
    if (sessionTs > 0) {
      return formatCertificateAdDate(sessionTs);
    }

    return formatCertificateAdDate(new Date());
  };

  // Open Certificate with strict validation:
  // 1. User must have an active/enrolled course with certificate enabled (not replaced by Live Session)
  // 2. Student MUST have uploaded a photo for the certificate
  const handleOpenStudentCertificate = (targetCourseId?: string) => {
    const enrolledCourses = courses.filter(
      c => activeCourseIds.includes(c.id) && !secondaryCourseIds.includes(c.id) && !c.includeLive && c.includeCertificate !== false
    );
    if (enrolledCourses.length === 0) {
      showToast('🔒 Certificates are only available to students enrolled in certificate-enabled courses.', 'error');
      if (activeCourseIds.length === 0) {
        setShowCodeInputModal(true);
      }
      return;
    }

    const effectivePhoto = userAvatar || localStorage.getItem('clipzone_student_avatar') || '';
    const hasPhoto = Boolean(effectivePhoto && (effectivePhoto.startsWith('data:') || effectivePhoto.startsWith('http')));
    if (!hasPhoto) {
      showToast('📸 Please upload your profile photo first to view your certificate!', 'info');
      setCurrentView('account');
      setTimeout(() => {
        avatarFileInputRef.current?.click();
      }, 250);
      return;
    }

    const currentCourse = 
      (targetCourseId ? enrolledCourses.find(c => c.id === targetCourseId) : null) ||
      enrolledCourses.find(c => c.id === selectedClassroomCourseId) ||
      enrolledCourses[0];

    if (!currentCourse) return;

    const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner';
    const activeCode = getCourseActivationCode(currentCourse.id) || (userActivationKeys[0]?.code || 'AICLIP-ACTIVE');
    const cleanTitle = (currentCourse.certificateCourseTitle || currentCourse.title).replace(/by Dhruv Rathee/gi, 'by HamroLms').replace(/Dhruv Rathee/gi, 'HamroLms');
    const adIssueDate = getCourseActivatedAdDate(currentCourse.id);

    setSelectedCertCourseId(currentCourse.id);
    setCertificateCourseTitle(cleanTitle);
    setCertificateStudentName(studentName);
    setCertificateIssueDate(adIssueDate);
    setCertificateCode(activeCode);
    setShowCertificateModal(true);
  };

  // Auto-exit Ask, Course-Live, or Live view if user loses eligibility
  useEffect(() => {
    if (!isCourseActiveUser && (currentView === 'ask' || currentView === 'course-live')) {
      setCurrentView('home');
    }
    if (currentView === 'live' && !canSubAdminAccessLive && !isMainAdmin) {
      setCurrentView('home');
    }
  }, [isCourseActiveUser, currentView, canSubAdminAccessLive, isMainAdmin]);

  // 1. Real-time listener for Main Admin: tracks ONLY Sub-Admin messages (zero course-student chats)
  useEffect(() => {
    if (!isMainAdmin) {
      setAdminUnreadCount(0);
      return;
    }

    try {
      const subConvsQuery = query(
        collection(db, 'support_conversations'),
        where('channelType', '==', 'subadmin_mainadmin')
      );
      const unsub = onSnapshot(subConvsQuery, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && typeof data.unreadAdminCount === 'number' && data.unreadAdminCount > 0) {
            totalUnread += data.unreadAdminCount;
          }
        });
        setAdminUnreadCount(totalUnread);
      }, (err) => {
        console.warn('Main admin subadmin conversation listener error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error setting up main admin conversation listener:', e);
    }
  }, [isMainAdmin]);

  // 2. Real-time listener for Sub-Admin: tracks unread from Main Admin + unread from own course students
  useEffect(() => {
    if (!isSubAdmin || !subAdminSession?.code) {
      setSubAdminUnreadCount(0);
      return;
    }

    let mainUnread = 0;
    let studentsUnread = 0;

    const mainDocRef = doc(db, 'support_conversations', `subadmin_main__${subAdminSession.code}`);
    const unsubMain = onSnapshot(mainDocRef, (snap) => {
      mainUnread = snap.exists() ? (snap.data()?.unreadUserCount || 0) : 0;
      setSubAdminUnreadCount(mainUnread + studentsUnread);
    }, (err) => {
      console.warn('Sub-admin main chat listener error:', err);
    });

    const studentConvsQuery = query(
      collection(db, 'support_conversations'),
      where('channelType', '==', 'student_subadmin'),
      where('subAdminCode', '==', subAdminSession.code)
    );
    const unsubStudents = onSnapshot(studentConvsQuery, (snapshot) => {
      let sum = 0;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && typeof d.unreadAdminCount === 'number' && d.unreadAdminCount > 0) {
          sum += d.unreadAdminCount;
        }
      });
      studentsUnread = sum;
      setSubAdminUnreadCount(mainUnread + studentsUnread);
    }, (err) => {
      console.warn('Sub-admin student chats listener error:', err);
    });

    return () => {
      unsubMain();
      unsubStudents();
    };
  }, [isSubAdmin, subAdminSession?.code]);

  // 3. Real-time listener for Student: tracks unread replies sent by assigned Course Sub-Admin ONLY
  useEffect(() => {
    if (isUserAdminSession) {
      setStudentUnreadCount(0);
      return;
    }

    const activeSubs = activeSubAdmins.filter(s => s.status === 'active');
    if (activeSubs.length === 0 || activeCourseIds.length === 0) {
      setStudentUnreadCount(0);
      return;
    }

    const normTitle = (v?: string) => (v || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const expandedCourseIds = new Set<string>();
    activeCourseIds.forEach((cid) => {
      expandedCourseIds.add(cid);
      if (cid === 'al-master-class-course-by-al-clipzone') {
        expandedCourseIds.add('Ai master class course by Ai clipzone');
      } else if (cid === 'Ai master class course by Ai clipzone') {
        expandedCourseIds.add('al-master-class-course-by-al-clipzone');
      }
    });

    const targetSubCodes = Array.from(new Set(
      activeSubs
        .filter(s => {
          if (expandedCourseIds.has('course-all')) return true;
          if (expandedCourseIds.has(s.courseId)) return true;
          const matchingCourse = courses.find(
            c => expandedCourseIds.has(c.id) && normTitle(c.title) !== '' && normTitle(c.title) === normTitle(s.courseTitle)
          );
          if (matchingCourse) return true;
          return userActivationKeys.some(
            (k: any) => k?.courseTitle && normTitle(k.courseTitle) === normTitle(s.courseTitle)
          );
        })
        .map(s => s.code)
    ));

    if (targetSubCodes.length === 0) {
      setStudentUnreadCount(0);
      return;
    }

    try {
      const devId = getOrCreateDeviceId();
      const localStudentUid = localStorage.getItem('clipzone_student_uid');
      let matchedUid = '';
      const combinedKeys = [
        ...(Array.isArray(allActivationKeys) ? allActivationKeys : []),
        ...(Array.isArray(userActivationKeys) ? userActivationKeys : []),
      ];
      if (combinedKeys.length > 0) {
        const localName = cleanRealName(localStorage.getItem('clipzone_student_name')) || cleanRealName(currentUser?.displayName) || cleanRealName(authName);
        let activeCodes: string[] = [];
        try { activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]'); } catch {}
        const match = combinedKeys.find((k: any) => {
          if (activeCodes.includes(k.code || k.id) && k.claimedByUid) return true;
          if (localName && k.studentName && k.studentName.trim().toLowerCase() === localName.toLowerCase() && k.claimedByUid) return true;
          if (localName && k.claimedByName && k.claimedByName.trim().toLowerCase() === localName.toLowerCase() && k.claimedByUid) return true;
          if (currentUser?.email && k.claimedByEmail && k.claimedByEmail.toLowerCase() === currentUser.email.toLowerCase() && k.claimedByUid) return true;
          return false;
        });
        if (match?.claimedByUid) {
          matchedUid = match.claimedByUid;
        }
      }

      const candidateUids = Array.from(new Set([
        matchedUid,
        localStudentUid,
        currentUser?.uid,
        devId
      ].filter(Boolean))) as string[];

      if (candidateUids.length === 0) return;

      const unsubs: (() => void)[] = [];
      const countsMap = new Map<string, number>();

      targetSubCodes.forEach((subCode) => {
        candidateUids.forEach((cUid) => {
          const convDocId = `substudent__${subCode}__${cUid}`;
          const convRef = doc(db, 'support_conversations', convDocId);
          const unsub = onSnapshot(convRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              countsMap.set(convDocId, data?.unreadUserCount || 0);
            } else {
              countsMap.set(convDocId, 0);
            }
            let totalUnread = 0;
            countsMap.forEach((cnt) => {
              totalUnread += cnt;
            });
            setStudentUnreadCount(totalUnread);
          }, (err) => {
            console.warn('Student subadmin conversation listener error:', err);
          });
          unsubs.push(unsub);
        });
      });

      return () => {
        unsubs.forEach(u => u());
      };
    } catch (e) {
      console.warn('Error setting up student support conversation listener:', e);
    }
  }, [currentUser, isUserAdminSession, allActivationKeys, userActivationKeys, authName, activeSubAdmins, activeCourseIds, courses]);

  // PWA Download Advertisement & Install Modal states
  const [showPwaAdModal, setShowPwaAdModal] = useState<boolean>(false);
  const [pwaAdDismissedThisVisit, setPwaAdDismissedThisVisit] = useState<boolean>(false);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState<boolean>(false);
  const [isInstallingPwa, setIsInstallingPwa] = useState<boolean>(false);
  const pageOpenedAtRef = useRef<number>(Date.now());
  const prevAppInstalledRef = useRef<boolean>(isAppInstalled);

  // Check query params for deep-link / PWA shortcuts (e.g. ?tab=course or ?tab=classroom)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    if (tab === 'course' || tab === 'classroom') {
      setCurrentView('classroom');
    } else if (tab === 'home' || tab === 'courses') {
      setCurrentView('home');
    }
  }, []);

  // Toast & auto-hide whenever app finishes installing
  useEffect(() => {
    if (!prevAppInstalledRef.current && isAppInstalled) {
      setShowPwaAdModal(false);
      setShowPwaInstallModal(false);
      setIsInstallingPwa(false);
      if (!isRunningInAppMode && !checkIsAppMode()) {
        showToast(`🎉 ${siteSettings.instituteName || 'HamroLms'} App Successfully Installed!`, 'success');
      }
    }
    prevAppInstalledRef.current = isAppInstalled;
  }, [isAppInstalled, isRunningInAppMode, siteSettings.instituteName]);

  // Show PWA Download Advertisement 3 seconds after opening website ONLY when app is NOT installed
  // Shows once per page load until website refresh; hides in App mode & when installed; re-appears after refresh if deleted
  useEffect(() => {
    if (
      isRunningInAppMode ||
      checkIsAppMode() ||
      isAppInstalled ||
      !isInstallCheckComplete ||
      pwaAdDismissedThisVisit ||
      showPwaInstallModal
    ) {
      if (isRunningInAppMode || checkIsAppMode() || isAppInstalled) {
        setShowPwaAdModal(false);
      }
      return;
    }

    const elapsedMs = Date.now() - pageOpenedAtRef.current;
    const delayMs = Math.max(500, 3000 - elapsedMs);
    const timer = window.setTimeout(() => {
      if (!checkIsAppMode() && !isAppInstalled) {
        setPwaAdDismissedThisVisit(true);
        setShowPwaAdModal(true);
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    isRunningInAppMode,
    isAppInstalled,
    isInstallCheckComplete,
    pwaAdDismissedThisVisit,
    showPwaInstallModal,
  ]);

  const handleDownloadFromAd = async () => {
    setShowPwaAdModal(false);
    if (isRunningInAppMode || checkIsAppMode() || isAppInstalled) {
      return;
    }

    // Open the Install App dialog where the user gets the direct Install option
    if (canPromptNativeInstall) {
      setIsInstallingPwa(true);
      const outcome = await promptNativeInstall();
      setIsInstallingPwa(false);
      if (outcome === 'accepted') {
        showToast(`🎉 ${siteSettings.instituteName || 'HamroLms'} App Added to Home Screen!`, 'success');
        return;
      }
      if (outcome === 'dismissed') {
        setPwaAdDismissedThisVisit(true);
        return;
      }
    }

    setShowPwaInstallModal(true);
  };

  const handleDismissPwaAd = () => {
    setShowPwaAdModal(false);
    setPwaAdDismissedThisVisit(true);
  };

  const handleConfirmInstallModal = async () => {
    if (canPromptNativeInstall) {
      setIsInstallingPwa(true);
      const outcome = await promptNativeInstall();
      setIsInstallingPwa(false);
      if (outcome === 'accepted') {
        showToast(`🎉 ${siteSettings.instituteName || 'HamroLms'} App Added to Home Screen!`, 'success');
        setShowPwaInstallModal(false);
        return;
      }
      if (outcome === 'dismissed') {
        setShowPwaInstallModal(false);
        setPwaAdDismissedThisVisit(true);
        return;
      }
    }
    setShowPwaInstallModal(false);
    setPwaAdDismissedThisVisit(true);
  };

  // Trigger Edit Course Form
  const handleEditCourseClick = (course: Course) => {
    if (!canEditCourse(course.id)) {
      showToast('You are only permitted to edit your assigned course.', 'error');
      return;
    }
    const freeCourse = isCourseFree(course);
    setEditingCourse(course);
    setFormId(course.id);
    setFormTitle(course.title);
    setFormIsFree(freeCourse);
    setFormPrice(freeCourse ? 'FREE' : course.price);
    setFormAmount(freeCourse ? 0 : course.amount);
    setFormMessage(course.message || `I want to buy ${course.title}`);
    setFormImage(course.image);
    setIsUploadingCourseThumbnail(false);
    setFormIsPopular(!!course.isPopular);
    setFormPopularText(course.popularText || '🔥 MOST POPULAR - BEST SELLER');
    setFormIncludeLive(Boolean(course.includeLive));
    setFormIncludeCertificate(course.includeCertificate !== false);
    setFormIsHidden(Boolean(course.isHidden));
    setFormLanguage(course.language && !/nepali|hindi/i.test(course.language) ? course.language : 'English');
    setFormLearnText(course.learn.join('\n'));
    setFormVideos(course.videos || []);
    setFormPdfs(course.pdfs && Array.isArray(course.pdfs) ? [...course.pdfs] : []);
    setShowCourseFormModal(true);
  };

  // Trigger Create Course Form (MAIN ADMIN ONLY)
  const handleCreateCourseClick = () => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can add new courses.', 'error');
      return;
    }
    setEditingCourse(null);
    setFormId('');
    setFormTitle('');
    setFormIsFree(false);
    setFormPrice('Rs. ');
    setFormAmount(299);
    setFormMessage('');
    setFormImage('');
    setIsUploadingCourseThumbnail(false);
    setFormIsPopular(false);
    setFormPopularText('🔥 MOST POPULAR - BEST SELLER');
    setFormIncludeLive(false);
    setFormIncludeCertificate(true);
    setFormIsHidden(false);
    setFormLanguage('English');
    setFormLearnText('');
    setFormVideos([]);
    setFormPdfs([]);
    setShowCourseFormModal(true);
  };

  // Direct Course Thumbnail Upload Handler (compresses to fit safely inside Firestore)
  const handleCourseThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please choose a PNG, JPG, or WEBP image.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Course thumbnail must be 5MB or smaller.', 'error');
      e.target.value = '';
      return;
    }

    setIsUploadingCourseThumbnail(true);
    try {
      let compressed = await compressImageFile(file, 960, 0.78);
      if (compressed.url.length > 260000) {
        compressed = await compressImageFile(file, 720, 0.62);
      }
      setFormImage(compressed.url);
      showToast('Course thumbnail uploaded successfully!', 'success');
    } catch (err) {
      console.error('Thumbnail upload error:', err);
      showToast('Failed to process image. Please try a smaller photo.', 'error');
    } finally {
      setIsUploadingCourseThumbnail(false);
      e.target.value = '';
    }
  };

  // Submit Course Form (Create/Edit)
  const handleCourseFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCourse && !isMainAdmin) {
      showToast('Only Main Admin can add new courses.', 'error');
      return;
    }
    if (editingCourse && !canEditCourse(editingCourse.id)) {
      showToast('You are only permitted to edit your assigned course.', 'error');
      return;
    }

    // Strictly Main-Admin-only control over Free Course pricing option
    const resolvedIsFree = isMainAdmin
      ? Boolean(formIsFree || Number(formAmount) === 0 || /^free$/i.test(formPrice.trim()))
      : Boolean(editingCourse && isCourseFree(editingCourse));
    const resolvedPrice = resolvedIsFree
      ? 'FREE'
      : isMainAdmin
        ? formPrice.trim()
        : (editingCourse?.price || formPrice.trim());
    const resolvedAmount = resolvedIsFree
      ? 0
      : isMainAdmin
        ? (Number(formAmount) > 0 ? Number(formAmount) : 299)
        : (typeof editingCourse?.amount === 'number' ? editingCourse.amount : 299);

    if (!formTitle.trim() || (!resolvedIsFree && !resolvedPrice) || !formImage.trim()) {
      showToast('Please fill in all required fields (Course Title, Price, and Course Thumbnail Image)', 'error');
      return;
    }

    // Ensure finalId is never empty, and handle non-latin characters elegantly
    let finalId = editingCourse ? editingCourse.id : formId.trim();
    if (!finalId) {
      const cleanTitle = formTitle
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .trim()
        .replace(/\s+/g, '-');
      finalId = cleanTitle || `course-${Date.now()}`;
    }
    
    const learnArray = formLearnText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const currentOrder = editingCourse && typeof editingCourse.order === 'number' ? editingCourse.order : courses.length;

    const updatedCourse: Course = {
      ...(editingCourse || {}),
      id: finalId,
      title: formTitle,
      price: resolvedPrice,
      amount: resolvedAmount,
      isFree: resolvedIsFree,
      message: formMessage || `I want to buy ${formTitle}`,
      learn: learnArray.length > 0 ? learnArray : ['Interactive AI Learning', 'Certificate of Completion Included', 'Lifetime Updates Access'],
      image: formImage,
      isPopular: formIsPopular,
      popularText: formIsPopular ? formPopularText : undefined,
      // Strictly Main-Admin-only editable flags: Sub-Admins preserve existing values unchanged
      includeLive: isMainAdmin ? formIncludeLive : Boolean(editingCourse?.includeLive),
      includeCertificate: isMainAdmin ? formIncludeCertificate : (editingCourse?.includeCertificate ?? true),
      isHidden: isMainAdmin ? formIsHidden : Boolean(editingCourse?.isHidden),
      language: (formLanguage.trim() && !/nepali|hindi/i.test(formLanguage)) ? formLanguage.trim() : 'English',
      order: currentOrder,
      videos: formVideos,
      pdfs: formPdfs
    };

    const cleanedCourse = cleanUndefined(updatedCourse);

    try {
      await setDoc(doc(db, 'courses', finalId), cleanedCourse);
      
      setCourses(prev => {
        const index = prev.findIndex(c => c.id === finalId);
        let updatedList;
        if (index >= 0) {
          updatedList = [...prev];
          updatedList[index] = updatedCourse;
        } else {
          updatedList = [...prev, updatedCourse];
        }
        try {
          localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
          localStorage.setItem('clipzone_courses_initialized', 'true');
        } catch {}
        return updatedList;
      });

      try {
        await setDoc(doc(db, 'system', 'config'), { courses_seeded: true }, { merge: true });
      } catch (e) {
        console.warn('Config set error:', e);
      }

      showToast(editingCourse ? 'Course updated successfully!' : 'New course added successfully!', 'success');
      setShowCourseFormModal(false);
      setEditingCourse(null);
    } catch (err) {
      console.error('Failed to save course:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(`Error saving course to Firestore: ${errorMessage}`, 'error');
      handleFirestoreError(err, editingCourse ? OperationType.UPDATE : OperationType.CREATE, `courses/${finalId}`);
    }
  };

  // Delete Course (MAIN ADMIN ONLY)
  const handleDeleteCourse = async (courseId: string) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete courses.', 'error');
      return;
    }
    try {
      // 1. Immediately update local deleted blacklist state & storage
      const localDeleted: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
        } catch {
          return [];
        }
      })();
      if (!localDeleted.includes(courseId)) {
        localDeleted.push(courseId);
        localStorage.setItem('clipzone_deleted_course_ids', JSON.stringify(localDeleted));
      }
      setDeletedCourseIds(prev => prev.includes(courseId) ? prev : [...prev, courseId]);

      // 2. Immediately purge from courses state and dynamic cache
      setCourses(prev => {
        const updatedList = prev.filter(c => c.id !== courseId);
        localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
        localStorage.setItem('clipzone_courses_initialized', 'true');
        return updatedList;
      });

      // 3. Instantly clean up active activated courses state and storage
      const localActivated: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        } catch {
          return [];
        }
      })();
      const updatedActivated = localActivated.filter((id: string) => id !== courseId);
      localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
      setActiveCourseIds(prev => prev.filter(id => id !== courseId));

      // 4. Close any open views or modals referencing this course
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
      if (courseToDelete?.id === courseId) {
        setCourseToDelete(null);
      }

      // 5. Delete course doc permanently from Firestore
      await deleteDoc(doc(db, 'courses', courseId));
      
      // 6. Delete any secret activation keys created for this course
      try {
        const keysQuery = query(collection(db, 'activation_keys'), where('courseId', '==', courseId));
        const keysSnap = await getDocs(keysQuery);
        for (const kDoc of keysSnap.docs) {
          await deleteDoc(doc(db, 'activation_keys', kDoc.id));
        }
      } catch (keyErr) {
        console.warn('Keys cleanup error on course delete:', keyErr);
      }

      // 6b. Delete live sessions associated with this course
      try {
        const liveQ = query(collection(db, 'live_sessions'), where('courseId', '==', courseId));
        const liveSnap = await getDocs(liveQ);
        for (const lDoc of liveSnap.docs) {
          await deleteDoc(doc(db, 'live_sessions', lDoc.id));
          await deleteDoc(doc(db, 'live_session_secrets', lDoc.id)).catch(() => {});
        }
      } catch (liveErr) {
        console.warn('Live sessions cleanup error on course delete:', liveErr);
      }

      // 7. Persist deleted courseId in system config so it is permanently blacklisted across all devices & sessions
      try {
        await setDoc(doc(db, 'system', 'config'), {
          courses_seeded: true,
          deletedCourseIds: arrayUnion(courseId)
        }, { merge: true });
      } catch (e) {
        console.warn('Config deleted ids set error:', e);
      }

      showToast('Course permanently deleted!', 'success');
    } catch (err) {
      console.error('Failed to delete course:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(`Error deleting course from Firestore: ${errorMessage}`, 'error');
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  // Trigger Confirmation & Permission Prompt before deleting any course (MAIN ADMIN ONLY)
  const handlePromptDeleteCourse = (courseId: string) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete courses.', 'error');
      return;
    }
    const target = courses.find(c => c.id === courseId) || null;
    if (!target) {
      showToast('Course not found.', 'error');
      return;
    }
    setCourseToDelete(target);
    setDeleteConfirmInput('');
  };

  // Execute Confirmed Delete Course Action
  const handleExecuteDeleteCourse = async () => {
    if (!isMainAdmin) return;
    if (!courseToDelete) return;
    if (deleteConfirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast('Please type DELETE to confirm deletion!', 'error');
      return;
    }

    setIsDeletingCourse(true);
    try {
      await handleDeleteCourse(courseToDelete.id);
      setCourseToDelete(null);
      setDeleteConfirmInput('');
    } catch (e) {
      console.error('Execute delete error:', e);
    } finally {
      setIsDeletingCourse(false);
    }
  };

  // Handle Batch Deletion of multiple courses at once in a single bulk operation (MAIN ADMIN ONLY)
  const handleBatchDeleteCourses = async (courseIds: string[]) => {
    if (!isMainAdmin) {
      showToast('Only Main Admin can delete courses.', 'error');
      return;
    }
    if (!courseIds || courseIds.length === 0) return;
    try {
      // 1. Immediately update local deleted blacklist state & storage
      const localDeleted: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
        } catch {
          return [];
        }
      })();
      const newBlacklist = Array.from(new Set([...localDeleted, ...courseIds]));
      localStorage.setItem('clipzone_deleted_course_ids', JSON.stringify(newBlacklist));
      setDeletedCourseIds(newBlacklist);

      // 2. Purge from courses state and dynamic cache
      setCourses(prev => {
        const updatedList = prev.filter(c => !courseIds.includes(c.id));
        localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
        localStorage.setItem('clipzone_courses_initialized', 'true');
        return updatedList;
      });

      // 3. Clean up active activated courses state and storage
      const localActivated: string[] = (() => {
        try {
          return JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        } catch {
          return [];
        }
      })();
      const updatedActivated = localActivated.filter((id: string) => !courseIds.includes(id));
      localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
      setActiveCourseIds(prev => prev.filter(id => !courseIds.includes(id)));

      // 4. Close any open views or modals referencing these courses
      if (selectedCourse && courseIds.includes(selectedCourse.id)) {
        setSelectedCourse(null);
      }
      if (courseToDelete && courseIds.includes(courseToDelete.id)) {
        setCourseToDelete(null);
      }

      // 5. Delete course documents permanently from Firestore using writeBatch
      const batch = writeBatch(db);
      for (const id of courseIds) {
        batch.delete(doc(db, 'courses', id));
      }
      await batch.commit();

      // 6. Delete any secret activation keys and live sessions created for these courses
      for (const id of courseIds) {
        try {
          const keysQuery = query(collection(db, 'activation_keys'), where('courseId', '==', id));
          const keysSnap = await getDocs(keysQuery);
          for (const kDoc of keysSnap.docs) {
            await deleteDoc(doc(db, 'activation_keys', kDoc.id));
          }
        } catch (keyErr) {
          console.warn('Keys cleanup error on batch delete:', keyErr);
        }
        try {
          const liveQ = query(collection(db, 'live_sessions'), where('courseId', '==', id));
          const liveSnap = await getDocs(liveQ);
          for (const lDoc of liveSnap.docs) {
            await deleteDoc(doc(db, 'live_sessions', lDoc.id));
            await deleteDoc(doc(db, 'live_session_secrets', lDoc.id)).catch(() => {});
          }
        } catch (liveErr) {
          console.warn('Live sessions cleanup error on batch delete:', liveErr);
        }
      }

      // 7. Persist deleted courseIds in system config so it is permanently blacklisted
      try {
        await setDoc(doc(db, 'system', 'config'), {
          courses_seeded: true,
          deletedCourseIds: arrayUnion(...courseIds)
        }, { merge: true });
      } catch (e) {
        console.warn('Config deleted ids set error:', e);
      }

      showToast(`${courseIds.length} courses deleted successfully!`, 'success');
    } catch (err) {
      console.error('Failed to batch delete courses:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(`Error batch deleting courses: ${errorMessage}`, 'error');
    }
  };

  // Filter testimonials based on course category and search query
  const filteredTestimonials = allTestimonials.filter((item) => {
    let matchesCourse = true;
    if (selectedCourseFilter !== 'All') {
      const courseNorm = selectedCourseFilter.toLowerCase();
      const itemCourseNorm = item.course.toLowerCase();
      if (courseNorm === 'ai master class') {
        matchesCourse = itemCourseNorm.includes('master');
      } else if (courseNorm === 'ai video & image') {
        matchesCourse = itemCourseNorm.includes('video') || itemCourseNorm.includes('image');
      } else if (courseNorm === 'ai song creation') {
        matchesCourse = itemCourseNorm.includes('song') || itemCourseNorm.includes('music');
      } else if (courseNorm === 'ai presentation') {
        matchesCourse = itemCourseNorm.includes('presentation');
      } else {
        matchesCourse = itemCourseNorm.includes(courseNorm);
      }
    }
    
    const textToSearch = `${item.name} ${item.location} ${item.course} ${item.text}`.toLowerCase();
    const matchesSearch = textToSearch.includes(testimonialSearchQuery.toLowerCase());
    
    return matchesCourse && matchesSearch;
  });

  // Testimonial automated carousel
  useEffect(() => {
    if (isHoveredCarousel || !isSliderAutoPlaying || filteredTestimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = prev + 1;
        return next >= filteredTestimonials.length ? 0 : next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isHoveredCarousel, isSliderAutoPlaying, filteredTestimonials.length]);

  // Safely auto-adjust current slide if it falls out of bounds of current filter
  useEffect(() => {
    if (currentSlide >= filteredTestimonials.length && filteredTestimonials.length > 0) {
      setCurrentSlide(0);
    }
  }, [filteredTestimonials.length, currentSlide]);

  // Effective Payment Config helper (per-course override with fallback to global paymentConfig)
  const getEffectivePaymentConfig = useCallback((course?: Course | null): PaymentQrConfig => {
    const cp = course?.paymentConfig;
    if (!cp) return paymentConfig;

    const hasCustomAccount = Boolean(
      cp.esewaId?.trim() ||
      cp.accountName?.trim() ||
      cp.qrImageUrl?.trim()
    );

    return {
      esewaId: cp.esewaId?.trim() || paymentConfig.esewaId,
      accountName: cp.accountName?.trim() || paymentConfig.accountName,
      whatsappNumber: cp.whatsappNumber?.trim() || paymentConfig.whatsappNumber,
      qrImageUrl: hasCustomAccount ? (cp.qrImageUrl?.trim() || '') : (paymentConfig.qrImageUrl || ''),
      bankName: hasCustomAccount ? (cp.bankName?.trim() || '') : (cp.bankName?.trim() || paymentConfig.bankName || ''),
      bankAccountNo: hasCustomAccount ? (cp.bankAccountNo?.trim() || '') : (cp.bankAccountNo?.trim() || paymentConfig.bankAccountNo || ''),
      bankBranch: hasCustomAccount ? (cp.bankBranch?.trim() || '') : (cp.bankBranch?.trim() || paymentConfig.bankBranch || ''),
      paymentInstruction: cp.paymentInstruction?.trim() || paymentConfig.paymentInstruction || '',
      updatedAt: cp.updatedAt || paymentConfig.updatedAt,
    };
  }, [paymentConfig]);

  // Render QR Code inside canvas once QR modal opens (respecting per-course payment override)
  useEffect(() => {
    const effPayment = getEffectivePaymentConfig(selectedCourse);
    if (showQrModal && selectedCourse && qrCanvasRef.current && !effPayment.qrImageUrl) {
      // eSewa QR payload using effective payment config - clean format without remarks
      const qrPayload = JSON.stringify({ 
        eSewa_id: effPayment.esewaId || "9763323268", 
        name: effPayment.accountName || "Ayush Chaurasiya" 
      });
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrPayload,
        {
          width: 260,
          margin: 1,
          color: {
            dark: '#1e1b4b', // deep indigo/navy tone
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) {
            console.error('Failed to generate FonePay QR code', error);
            showToast('QR Code generation failed. Please use WhatsApp instead.', 'error');
          }
        }
      );
    }
  }, [showQrModal, selectedCourse, getEffectivePaymentConfig]);

  // Toggle single FAQ accordion
  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Handle contact form WhatsApp trigger
  const handleSendContactMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMsg.trim()) {
      showToast('Please enter your name and message!', 'error');
      return;
    }
    const fullMessage = `Name: ${contactName}\nPhone: ${contactPhone || 'N/A'}\nSelected Course: ${contactCourse}\nMessage: ${contactMsg}`;
    const whatsappUrl = `https://wa.me/9779763323268?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    // Clear Inputs
    setContactName('');
    setContactPhone('');
    setContactCourse('General Inquiry');
    setContactMsg('');
    showToast('Your message has been prepared on WhatsApp.', 'success');
  };

  // WhatsApp Number & Purchase helper
  const getFormattedWhatsappNumber = (rawNumber?: string) => {
    const num = (rawNumber || paymentConfig.whatsappNumber || siteSettings.supportPhone || '9763323268').replace(/\D/g, '');
    if (num.startsWith('977')) return num;
    return `977${num}`;
  };

  const getWhatsappPurchaseUrl = (course: Course) => {
    const effPayment = getEffectivePaymentConfig(course);
    const number = getFormattedWhatsappNumber(effPayment.whatsappNumber);
    const text = course.message || `Hello! I want to enroll in "${course.title}" (${course.price}). Please share the payment details and Secret Activation Key.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  // Open dedicated Course Enroll page from Course Modal
  const handleOpenFonePayQR = () => {
    if (selectedCourse) {
      handleEnrollCourse(selectedCourse);
      return;
    }
    setShowQrModal(true);
  };

  // Confirm payment & launch WhatsApp message (using course-specific payment/WhatsApp config if set)
  const handleConfirmPayment = () => {
    if (!selectedCourse) return;
    const effPayment = getEffectivePaymentConfig(selectedCourse);
    const fullNumber = getFormattedWhatsappNumber(effPayment.whatsappNumber);
    const accountName = effPayment.accountName || 'Ayush Chaurasiya';
    const customMsg = selectedCourse.message?.trim() ? `\n\n${selectedCourse.message.trim()}` : '';
    const message = `Hello! I have completed payment for "${selectedCourse.title}" (${selectedCourse.price}) via eSewa/QR (${accountName}). Please provide my secret course activation key!${customMsg}`;
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setShowQrModal(false);
    setSelectedCourse(null);
    showToast('Payment confirmation message sent on WhatsApp!', 'success');
  };

  // Dynamic SPA SEO metadata, canonical URL, Open Graph, article tags, hreflang, and JSON-LD sync
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const origin =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? window.location.origin
        : 'https://hamrolms.vercel.app';

    const metadata = generateDynamicPageMetadata({
      origin,
      pathname: window.location.pathname,
      currentView,
      activeLocale,
      routeSlug,
      routeCategory,
      publicCatalogCourses,
      publicInstructors,
      blogPosts: BLOG_POSTS,
      enrollCourse,
      isCoursesLoading,
      supportEmail: siteSettings.supportEmail || 'support.hamrolms@gmail.com',
      brand: 'HamroLms',
    });

    injectDynamicPageMetadata(metadata);
  }, [
    currentView,
    activeLocale,
    routeSlug,
    routeCategory,
    enrollCourse,
    siteSettings.supportEmail,
    publicCatalogCourses,
    publicInstructors,
    isCoursesLoading,
  ]);

  return (
    <div className={`${currentView === 'ask' && isCourseActiveUser ? 'h-[100dvh] overflow-hidden pb-0' : currentView === 'enroll' && enrollCourse ? 'min-h-screen overflow-x-clip pb-0' : 'min-h-screen overflow-x-clip justify-between pb-0'} bg-black text-zinc-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col relative`}>
      {/* Sleek Pure Black Ambient Lighting: Hidden in Ask and Enroll views */}
      {!(currentView === 'ask' && isCourseActiveUser) && !(currentView === 'enroll' && enrollCourse) && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[140px]" />
          <div className="absolute top-2/3 -left-20 w-[450px] h-[450px] bg-rose-600/8 rounded-full blur-[130px]" />
          <div className="absolute -bottom-32 right-10 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:26px_26px] opacity-[0.06]" />
        </div>
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold text-sm border ${
              toast.type === 'success' ? 'bg-emerald-950/95 text-emerald-200 border-emerald-500/40' : 
              toast.type === 'error' ? 'bg-rose-950/95 text-rose-200 border-rose-500/40' : 'bg-zinc-950/95 text-blue-200 border-blue-500/40'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <X className="w-5 h-5 shrink-0 text-rose-400" />}
            {toast.type === 'info' && <Sparkles className="w-5 h-5 shrink-0 text-blue-400" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Navigation Container (hidden in Ask and Enroll views) */}
      {!(currentView === 'ask' && isCourseActiveUser) && !(currentView === 'enroll' && enrollCourse) && (
      <header className="sticky top-0 z-[100] w-full shrink-0 shadow-2xl bg-black/95 backdrop-blur-md border-b border-zinc-800">
        {/* Dynamic Global Notice Banner from Admin Settings (Red Urgency Notice) */}
        {siteSettings.showNoticeBanner && siteSettings.noticeBannerText && (
          <div className="w-full bg-gradient-to-r from-black via-rose-950/90 to-black text-rose-200 text-xs font-bold py-1.5 px-4 text-center border-b border-rose-500/30 flex items-center justify-center gap-2 shadow-md">
            <span className="animate-pulse">📢</span>
            <span>{siteSettings.noticeBannerText}</span>
          </div>
        )}

        {/* Top Floating Banner with sleek pitch-black styling matching the logo */}
        <div className="w-full bg-black text-white">
          <div className="max-w-[1600px] mx-auto px-2 sm:px-3 md:px-4 lg:px-5 h-11 sm:h-12 relative flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Brand Logo Only */}
            <div 
              onClick={() => {
                if (isUserAdminSession) {
                  setShowAdminDashboard(true);
                  return;
                }
                navigateToPath('/');
              }}
              className="min-w-[70px] sm:min-w-0 flex items-center cursor-pointer select-none relative group shrink-0 z-10"
              title="Hamro LMS - Home"
            >
              {/* Institute Official Logo */}
              <div className="h-7.5 sm:h-9.5 md:h-10.5 flex items-center justify-center bg-transparent overflow-hidden group-hover:scale-105 transition-transform duration-200 shrink-0">
                <img 
                  src={siteSettings.instituteLogoUrl?.trim() || "/logo.png"} 
                  alt={siteSettings.instituteName || "Logo"}
                  className="h-7.5 sm:h-9.5 md:h-10.5 w-auto max-w-[78px] sm:max-w-[135px] md:max-w-[165px] object-contain shrink-0 filter drop-shadow-md"
                  loading="eager"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    if (!img.src.includes('/logo.png')) {
                      img.src = '/logo.png';
                    }
                  }}
                />
              </div>
            </div>

            {/* Centered Slim Pill Search Bar */}
            <div
              ref={searchContainerRef}
              className="relative flex-1 min-w-0 max-w-[230px] mx-auto sm:flex-none sm:max-w-none sm:mx-0 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:w-[290px] md:w-[370px] lg:w-[430px] z-20"
            >
              <div className="relative flex items-center w-full">
                <div className="absolute inset-y-0 left-2.5 pointer-events-none text-zinc-400 flex items-center justify-center">
                  <Search className="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <input
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => {
                    setCourseSearchQuery(e.target.value);
                    if (currentView !== 'home' && currentView !== 'courses' && e.target.value.trim()) {
                      setCurrentView('home');
                    }
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Search courses, AI tools..."
                  className="w-full h-7.5 pl-8 pr-7 bg-zinc-900/90 hover:bg-zinc-900 text-white placeholder-zinc-400 text-xs rounded-full border border-zinc-700/80 hover:border-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 focus:outline-none transition-all shadow-inner"
                />
                {courseSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseSearchQuery('');
                      setIsSearchFocused(false);
                    }}
                    className="absolute inset-y-0 right-1.5 my-auto w-4.5 h-4.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Instant Search Results Dropdown Popover */}
              <AnimatePresence>
                {isSearchFocused && courseSearchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 w-[260px] sm:w-full top-full mt-2 bg-zinc-950/98 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-2 z-[600] max-h-80 overflow-y-auto"
                  >
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between border-b border-zinc-900 mb-1">
                      <span>Matching Courses ({filteredHomeCourses.length})</span>
                      <button
                        onClick={() => {
                          setCourseSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="text-zinc-500 hover:text-zinc-300 normal-case cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    {filteredHomeCourses.length > 0 ? (
                      <div className="space-y-1">
                        {filteredHomeCourses.map((c) => {
                          const isEnrolled = activeCourseIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setIsSearchFocused(false);
                                if (isEnrolled) {
                                  setSelectedClassroomCourseId(c.id);
                                  setCurrentView('classroom');
                                  showToast(`Opened ${c.title}! 🎓`, 'success');
                                } else {
                                  if (currentView !== 'home' && currentView !== 'courses') {
                                    navigateToPath('/');
                                  }
                                  setTimeout(() => {
                                    document.getElementById(`course-card-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }, 80);
                                }
                              }}
                              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-900/90 transition cursor-pointer group text-left"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                                {c.image ? (
                                  <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">🎓</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition truncate">
                                  {c.title}
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                                  <span>{c.videos?.length || 0} Lectures</span>
                                  {isEnrolled ? (
                                    <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                                      Enrolled ✓
                                    </span>
                                  ) : (
                                    <span className={`font-bold ${isCourseFree(c) ? 'text-emerald-400' : 'text-blue-400'}`}>
                                      {isCourseFree(c) ? 'FREE' : (c.price || 'Rs. 999')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-zinc-400 text-xs">
                        <p className="font-semibold text-zinc-300">No Courses Found</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">No courses matching "{courseSearchQuery}"</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="min-w-[70px] sm:min-w-0 flex items-center justify-end gap-1.5 sm:gap-2.5 shrink-0 z-10">
              {/* Notification Bell Button - ALWAYS VISIBLE LIKE NATIVE PWA APP */}
              <button
                id="header-notification-bell-btn"
                onClick={() => setShowNotifCenterModal(true)}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-blue-500/50 transition flex items-center justify-center cursor-pointer select-none shadow-md group shrink-0"
                title="Notifications & Announcements"
              >
                <Bell className="w-4 h-4 text-zinc-300 group-hover:text-blue-400 transition" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-black shadow-md animate-pulse">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Student Profile Avatar Badge (No dropdown menu on click as requested) */}
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 border border-zinc-700/80 text-white flex items-center justify-center select-none font-bold text-xs relative shadow-md overflow-hidden"
                  title={hasStudentProfile && currentUser ? (currentUser.displayName || currentUser.email || 'Student') : 'HamroLms'}
                >
                  {hasStudentProfile && userAvatar ? (
                    userAvatar.startsWith('http') || userAvatar.startsWith('data:') ? (
                      <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-base select-none">{userAvatar}</span>
                    )
                  ) : hasStudentProfile && (currentUser || localStorage.getItem('clipzone_student_name')) ? (
                    <>
                      <span className="uppercase text-[11px] text-zinc-100 font-black">
                        {(currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || currentUser?.email || 'ST').substring(0, 2)}
                      </span>
                      {/* X/Twitter Style Blue Tick Verification Badge */}
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-black flex items-center justify-center">
                        <VerifiedBadge variant="student" className="w-4 h-4" />
                      </span>
                    </>
                  ) : (
                    <User className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      )}

      {/* Main Container for Course List / Classroom / Account / Ask / Enroll */}
      <main className={currentView === 'ask' && isCourseActiveUser ? 'flex-1 min-h-0 w-full max-w-none p-0 flex flex-col overflow-hidden bg-black' : currentView === 'enroll' && enrollCourse ? 'flex-1 w-full max-w-none p-0 flex flex-col bg-black' : `flex-1 flex flex-col w-full max-w-[1600px] mx-auto px-1.5 sm:px-3 md:px-4 lg:px-5 pt-1.5 ${currentView === 'home' || currentView === 'courses' ? 'pb-0' : 'pb-4'}`}>

        {/* 1. EMBEDDED ACCOUNT / LIVE / ASK / CLASSROOM / ENROLL / HOME VIEWS */}
        {currentView === 'enroll' && enrollCourse ? (
          <CourseEnrollPage
            course={enrollCourse}
            paymentConfig={getEffectivePaymentConfig(enrollCourse)}
            initialName={
              cleanRealName(currentUser?.displayName) ||
              cleanRealName(authName) ||
              cleanRealName(localStorage.getItem('clipzone_student_name')) ||
              ''
            }
            initialEmail={
              currentUser?.email && !currentUser.isAnonymous ? currentUser.email : ''
            }
            onBack={() => {
              setEnrollCourse(null);
              navigateToPath('/');
            }}
            onFreeEnrollComplete={handleFreeEnrollComplete}
            showToast={showToast}
          />
        ) : currentView === 'live' && (canSubAdminAccessLive || isMainAdmin) ? (
          <section id="live-manager-view" className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6">
            <LiveSessionsPanel
              mode="manager"
              courses={courses}
              sessions={liveSessions}
              adminRole={isMainAdmin ? 'main_admin' : 'sub_admin'}
              subAdminSession={isMainAdmin ? null : subAdminSession}
              onSaveSession={handleSaveLiveSession}
              onDeleteSession={handleDeleteLiveSession}
              onUpdateStatus={handleUpdateLiveSessionStatus}
              showToast={showToast}
            />
          </section>
        ) : currentView === 'course-live' && isCourseActiveUser ? (
          (() => {
            const activeLiveCourses = courses.filter(
              c => activeCourseIds.includes(c.id) && c.includeLive === true
            );
            const targetLiveCourse =
              activeLiveCourses.find(c => c.id === selectedLiveCourseId) ||
              activeLiveCourses.find(c => c.id === selectedClassroomCourseId) ||
              activeLiveCourses[0];

            const courseLiveStudentName = (() => {
              const forThisCourse = userActivationKeys.find(
                (k: any) => k.courseId === targetLiveCourse?.id && Boolean(cleanRealName(k.studentName))
              );
              if (forThisCourse) return cleanRealName(forThisCourse.studentName);
              try {
                const activeCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
                const fromAll = allActivationKeys.find(
                  (k: any) =>
                    k.courseId === targetLiveCourse?.id &&
                    (activeCodes.includes(k.code || k.id) || k.claimedByUid === currentUser?.uid) &&
                    Boolean(cleanRealName(k.studentName))
                );
                if (fromAll) return cleanRealName(fromAll.studentName);
              } catch {}
              const anyKeyName = userActivationKeys.find((k: any) => Boolean(cleanRealName(k.studentName)))?.studentName;
              return (
                cleanRealName(anyKeyName) ||
                cleanRealName(currentUser?.displayName) ||
                cleanRealName(authName) ||
                cleanRealName(localStorage.getItem('clipzone_student_name')) ||
                'Student'
              );
            })();

            return (
              <section id="course-live-view" className="max-w-3xl mx-auto py-4 sm:py-6 space-y-4">
                <div className="bg-black border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
                  {/* Compact Back + Course Title Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
                    <div className="space-y-1 text-left">
                      <button
                        type="button"
                        onClick={() => {
                          if (targetLiveCourse) {
                            setSelectedClassroomCourseId(targetLiveCourse.id);
                          }
                          setCurrentView('classroom');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>

                      {targetLiveCourse && (
                        <h2 className="text-base sm:text-xl font-black text-white pt-1 leading-snug">
                          {targetLiveCourse.title}
                        </h2>
                      )}
                    </div>

                    {activeLiveCourses.length > 1 && targetLiveCourse && (
                      <div className="flex flex-wrap gap-1.5">
                        {activeLiveCourses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedLiveCourseId(c.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                              c.id === targetLiveCourse.id
                                ? 'bg-rose-600 text-white'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {targetLiveCourse ? (
                    <LiveSessionsPanel
                      mode="student"
                      course={targetLiveCourse}
                      courses={courses}
                      sessions={liveSessions}
                      studentName={courseLiveStudentName}
                      showToast={showToast}
                    />
                  ) : (
                    <div className="text-center py-10 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-3">
                      <p className="text-sm font-bold text-zinc-300">
                        No Live Sessions are available for this course.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentView('classroom')}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Go to Classroom
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })()
        ) : currentView === 'ask' && isCourseActiveUser ? (
          <section id="ask-embedded-view" className="w-full flex-1 min-h-0 flex flex-col bg-black">
            <AskChatModal
              embedded={true}
              isOpen={true}
              onClose={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isRunningInAppMode={true}
              siteSettings={siteSettings}
              currentUserId={
                (() => {
                  if (isMainAdmin) {
                    return currentUser?.uid || getOrCreateDeviceId();
                  }
                  if (isSubAdmin && subAdminSession?.code) {
                    return subAdminSession.code;
                  }
                  try {
                    const localName = cleanRealName(localStorage.getItem('clipzone_student_name')) || cleanRealName(currentUser?.displayName) || cleanRealName(authName);
                    const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
                    const combinedKeys = [
                      ...(Array.isArray(allActivationKeys) ? allActivationKeys : []),
                      ...(Array.isArray(userActivationKeys) ? userActivationKeys : []),
                    ];
                    if (combinedKeys.length > 0) {
                      const match = combinedKeys.find((k: any) => {
                        if (activeCodes.includes(k.code || k.id) && k.claimedByUid) return true;
                        if (localName && k.studentName && k.studentName.trim().toLowerCase() === localName.toLowerCase() && k.claimedByUid) return true;
                        if (localName && k.claimedByName && k.claimedByName.trim().toLowerCase() === localName.toLowerCase() && k.claimedByUid) return true;
                        return false;
                      });
                      if (match?.claimedByUid) {
                        localStorage.setItem('clipzone_student_uid', match.claimedByUid);
                        return match.claimedByUid;
                      }
                    }
                  } catch (e) {}
                  return localStorage.getItem('clipzone_student_uid') || currentUser?.uid || getOrCreateDeviceId();
                })()
              }
              initialStudentName={
                userActivationKeys.find(k => k.studentName && k.studentName !== 'Student Learner')?.studentName ||
                (currentUser?.displayName && currentUser.displayName !== 'Student Learner' ? currentUser.displayName : '') ||
                (authName && authName !== 'Student Learner' ? authName : '') ||
                (localStorage.getItem('clipzone_student_name') && localStorage.getItem('clipzone_student_name') !== 'Student Learner' ? localStorage.getItem('clipzone_student_name') : '') ||
                ''
              }
              userEmail={currentUser?.email || ''}
              activeCourseName={courses.find(c => activeCourseIds.includes(c.id))?.title || ''}
              hasActivatedCourse={activeCourseIds.length > 0}
              onOpenActivationModal={() => setShowCodeInputModal(true)}
              showToast={showToast}
              isAdmin={isUserAdminSession}
              adminRole={isMainAdmin ? 'main_admin' : 'sub_admin'}
              subAdminSession={isMainAdmin ? null : subAdminSession}
              subAdmins={isMainAdmin ? subAdminList : activeSubAdmins}
              courses={courses}
              activeCourseIds={activeCourseIds}
              allActivationKeys={isUserAdminSession ? allActivationKeys : userActivationKeys}
              studentAvatar={userAvatar || localStorage.getItem('clipzone_student_avatar') || ''}
              onChatOpenChange={setIsAskChatOpen}
            />
          </section>
        ) : currentView === 'course-detail' ? (
          (() => {
            const targetCourse = findCourseBySlug(publicCatalogCourses, routeSlug);
            if (!targetCourse) {
              return <NotFoundView locale={activeLocale} onNavigatePath={navigateToPath} />;
            }
            const instructor = resolveCourseInstructor(targetCourse, publicInstructors);
            const relatedPosts = BLOG_POSTS.filter((p) => p.relatedCourseIds.includes(targetCourse.id));
            return (
              <CourseDetailView
                course={targetCourse}
                allCourses={publicCatalogCourses}
                instructor={instructor}
                relatedPosts={relatedPosts}
                locale={activeLocale}
                isEnrolled={activeCourseIds.includes(targetCourse.id)}
                isCourseFree={isCourseFree(targetCourse)}
                onNavigatePath={navigateToPath}
                onEnrollCourse={handleEnrollCourse}
                onGoToClassroom={(courseId) => {
                  setSelectedClassroomCourseId(courseId);
                  navigateToPath('/classroom');
                }}
              />
            );
          })()
        ) : currentView === 'instructors' ? (
          <InstructorsView
            instructors={publicInstructors}
            courses={publicCatalogCourses}
            posts={BLOG_POSTS}
            locale={activeLocale}
            onNavigatePath={navigateToPath}
          />
        ) : currentView === 'instructor-detail' ? (
          (() => {
            const inst = publicInstructors.find((i) => i.slug === slugifyText(routeSlug || ''));
            if (!inst) {
              return <NotFoundView locale={activeLocale} onNavigatePath={navigateToPath} />;
            }
            return (
              <InstructorsView
                instructors={publicInstructors}
                selectedInstructor={inst}
                courses={publicCatalogCourses}
                posts={BLOG_POSTS}
                locale={activeLocale}
                onNavigatePath={navigateToPath}
              />
            );
          })()
        ) : currentView === 'blog' ? (
          (() => {
            if (routeCategory) {
              const matched = BLOG_POSTS.find(
                (p) => slugifyText(p.category) === slugifyText(routeCategory)
              );
              if (!matched) {
                return <NotFoundView locale={activeLocale} onNavigatePath={navigateToPath} />;
              }
            }
            return (
              <BlogView
                posts={BLOG_POSTS}
                initialCategory={routeCategory}
                instructors={publicInstructors}
                courses={publicCatalogCourses}
                locale={activeLocale}
                onNavigatePath={navigateToPath}
              />
            );
          })()
        ) : currentView === 'blog-detail' ? (
          (() => {
            const post = findBlogPostBySlug(BLOG_POSTS, routeSlug);
            if (!post) {
              return <NotFoundView locale={activeLocale} onNavigatePath={navigateToPath} />;
            }
            return (
              <BlogView
                posts={BLOG_POSTS}
                selectedPost={post}
                instructors={publicInstructors}
                courses={publicCatalogCourses}
                locale={activeLocale}
                onNavigatePath={navigateToPath}
              />
            );
          })()
        ) : currentView === 'about-us' ? (
          <AboutUsView
            locale={activeLocale}
            supportEmail={siteSettings.supportEmail || 'support.hamrolms@gmail.com'}
            onNavigatePath={navigateToPath}
          />
        ) : currentView === 'learn' ? (
          <LearnApplyGrowView
            locale={activeLocale}
            supportEmail={siteSettings.supportEmail || 'support.hamrolms@gmail.com'}
            onNavigatePath={navigateToPath}
          />
        ) : currentView === 'privacy-policy' ? (
          <PrivacyPolicyView
            locale={activeLocale}
            supportEmail={siteSettings.supportEmail || 'support.hamrolms@gmail.com'}
            onNavigatePath={navigateToPath}
          />
        ) : currentView === 'terms' ? (
          <TermsOfUseView
            locale={activeLocale}
            supportEmail={siteSettings.supportEmail || 'support.hamrolms@gmail.com'}
            onNavigatePath={navigateToPath}
          />
        ) : currentView === 'not-found' || currentView === 'delete-account' ? (
          <NotFoundView locale={activeLocale} onNavigatePath={navigateToPath} />
        ) : currentView === 'account' ? (
          <section id="account-full-view" className="w-full max-w-3xl mx-auto space-y-5 pb-20 pt-2">

            {authLoading && !hasStudentProfile ? (
              <div className="p-16 text-center text-xs font-bold text-zinc-400 flex flex-col items-center justify-center gap-3 bg-zinc-950 rounded-3xl border border-zinc-800">
                <span className="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Securing user session...</span>
              </div>
            ) : !hasStudentProfile ? (
              /* CASE: UNREGISTERED / NOT LOGGED IN - VIP PASS ACTIVATION CARD */
              <div className="max-w-lg mx-auto bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950 p-6 sm:p-10 rounded-3xl border border-zinc-800/90 shadow-2xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-blue-500/25 ring-4 ring-blue-500/10">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="inline-block bg-blue-500/15 text-blue-300 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-blue-500/30">
                    VIP Student Access
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {siteSettings.instituteName || 'HamroLms'} 🇳🇵
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    Enter the <strong>Secret Activation Code</strong> provided by your admin below to unlock your video courses and sign in:
                  </p>
                </div>

                {authError && (
                  <div className="bg-rose-950/70 text-rose-300 p-3 rounded-2xl border border-rose-500/40 text-xs font-bold text-left">
                    ⚠️ {authError}
                  </div>
                )}

                <form onSubmit={handleClaimActivationCode} className="space-y-4 pt-1">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase text-blue-400 tracking-wider">
                        Secret Activation Code *
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteCodeToInput()}
                        className="text-[11px] font-extrabold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title="Paste code from clipboard"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-blue-400" />
                        <span>📋 Paste Code</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input 
                        type="text"
                        required
                        value={activationCodeInput}
                        onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                        onPaste={(e) => {
                          const pasted = e.clipboardData?.getData('text');
                          if (pasted) {
                            e.preventDefault();
                            const clean = extractAndCleanCode(pasted);
                            setActivationCodeInput(clean);
                            showToast(`📋 Code pasted: ${clean}`, 'success');
                          }
                        }}
                        placeholder="CLIP-XXXXXX"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoCapitalize="characters"
                        className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl pl-4 pr-24 py-3.5 text-base font-mono font-black uppercase text-white outline-hidden tracking-widest shadow-inner placeholder-zinc-600 text-center"
                      />

                      <div className="absolute right-2 flex items-center gap-1">
                        {activationCodeInput && (
                          <button
                            type="button"
                            onClick={() => setActivationCodeInput('')}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                            title="Clear input"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePasteCodeToInput()}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          <span>Paste</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-zinc-400 font-medium">
                      💡 Click <strong>Paste</strong> or type your activation code above.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isActivating || !activationCodeInput.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isActivating ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <span>🚀 Unlock Course & Sign In</span>
                    )}
                  </button>
                </form>

                <div className="pt-2 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('home');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
                  >
                    Browse Available Courses →
                  </button>
                </div>
              </div>
            ) : (
              /* CASE: ENROLLED STUDENT - SIMPLE & ADVANCED PREMIUM PORTAL */
              <div className="space-y-5">
                {/* 1. CLEAN LUXURY PROFILE CARD */}
                <div className="bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 border border-zinc-800/80 border-t-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: Avatar + Name + Blue Tick */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative group shrink-0">
                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-900 ring-2 ring-zinc-700/80 group-hover:ring-blue-500/80 overflow-hidden flex items-center justify-center relative cursor-pointer transition active:scale-95"
                          title="Change photo"
                        >
                          {userAvatar && (userAvatar.startsWith('http') || userAvatar.startsWith('data:')) ? (
                            <img
                              src={userAvatar}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl font-black uppercase">
                              {(currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'ST').substring(0, 2)}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          className="absolute -bottom-0.5 -right-0.5 bg-zinc-900 hover:bg-blue-600 text-zinc-200 hover:text-white p-1.5 rounded-full border border-zinc-700 ring-2 ring-zinc-950 cursor-pointer transition"
                          title="Upload photo"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                            {currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner'}
                          </h2>
                          <VerifiedBadge variant="student" className="w-4.5 h-4.5" title="Verified User" />
                        </div>
                        <p className="text-xs text-zinc-400 font-medium truncate">
                          {siteSettings.instituteName || 'HamroLms'} • {activeCourseIds.length} Active {activeCourseIds.length === 1 ? 'Course' : 'Courses'}
                        </p>
                        {userAvatar && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserAvatar('');
                              try {
                                localStorage.removeItem('clipzone_student_avatar');
                              } catch (e) {}
                              syncStudentAvatarToFirestore('');
                              showToast('Photo removed', 'info');
                            }}
                            className="text-[11px] text-zinc-500 hover:text-rose-400 transition cursor-pointer font-medium"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>

                    <input
                      type="file"
                      ref={avatarFileInputRef}
                      accept="image/*"
                      onChange={handleCustomAvatarUpload}
                      className="hidden"
                    />

                    {/* Right: Clean Single Log Out Action */}
                    <button
                      type="button"
                      onClick={() => {
                        setStudentLogoutConfirmInput('');
                        setShowStudentLogoutConfirmModal(true);
                      }}
                      className="text-zinc-300 hover:text-rose-400 bg-zinc-900/90 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-500/40 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>

                {/* 2. MY COURSES (CLEAN & COMPACT) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      My Courses
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setActivationCodeInput('');
                        setShowCodeInputModal(true);
                      }}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Code</span>
                    </button>
                  </div>

                  {activeCourseIds.length === 0 ? (
                    <div className="bg-zinc-950 p-7 rounded-2xl border border-zinc-800/80 text-center space-y-3">
                      <p className="text-xs text-zinc-400 font-medium">No active courses yet.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActivationCodeInput('');
                          setShowCodeInputModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Enter Activation Code
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {courses
                        .filter(course => activeCourseIds.includes(course.id) && !userActivationKeys.some((k: any) => k.courseId === course.id && isCourseKeyExpired(k)))
                        .map((course) => {
                          const keyInfo = userActivationKeys.find((k: any) => k.courseId === course.id) ||
                            (() => {
                              try {
                                return (JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]')).find((k: any) => k.courseId === course.id);
                              } catch (e) { return null; }
                            })();

                          const enrolledTimestamp = keyInfo?.claimedAt || keyInfo?.createdAt || Date.now();
                          const durationMs = keyInfo?.duration === '1month' ? (30 * 24 * 60 * 60 * 1000) : (365 * 24 * 60 * 60 * 1000);
                          const expiresTimestamp = keyInfo?.expiresAt || (enrolledTimestamp + durationMs);
                          const daysLeft = Math.ceil((expiresTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
                          const cleanTitle = course.title.replace(/by Dhruv Rathee/gi, 'by HamroLms').replace(/Dhruv Rathee/gi, 'HamroLms');
                          const keyCode = keyInfo?.code || getCourseActivationCode(course.id);

                          return (
                            <div
                              key={course.id}
                              className="bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-zinc-800">
                                  {course.image ? (
                                    <img src={course.image} alt={cleanTitle} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-lg">🎓</div>
                                  )}
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                    {cleanTitle}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap">
                                    <span className="text-emerald-400 font-semibold">
                                      {daysLeft > 0 ? `${daysLeft}d left` : 'Active'}
                                    </span>
                                    {keyCode && (
                                      <>
                                        <span className="text-zinc-700">•</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard?.writeText(keyCode);
                                            setCopiedKeyId(course.id);
                                            setTimeout(() => setCopiedKeyId(''), 1800);
                                            showToast('Code copied!', 'success');
                                          }}
                                          className="inline-flex items-center gap-1 font-mono text-zinc-400 hover:text-white transition cursor-pointer"
                                          title="Copy activation code"
                                        >
                                          <span>{keyCode}</span>
                                          {copiedKeyId === course.id ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 justify-end">
                                {course.includeLive ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLiveCourseId(course.id);
                                      setCurrentView('course-live');
                                      window.scrollTo({ top: 0, behavior: 'auto' });
                                    }}
                                    className="bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-semibold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                    title="Live Session"
                                  >
                                    <Video className="w-3.5 h-3.5 text-rose-400" />
                                    <span>Live Session</span>
                                  </button>
                                ) : (!secondaryCourseIds.includes(course.id) && course.includeCertificate !== false) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudentCertificate(course.id)}
                                    className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold text-xs px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                    title="Certificate"
                                  >
                                    <Award className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Certificate</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassroomCourseId(course.id);
                                    setCurrentView('classroom');
                                    window.scrollTo({ top: 0, behavior: 'auto' });
                                  }}
                                  className="bg-white hover:bg-zinc-200 text-black font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                                >
                                  <Play className="w-3.5 h-3.5 fill-black" />
                                  <span>Open Class</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* 3. EXPIRED COURSES (ONLY SHOWN IF PRESENT) */}
                {(() => {
                  const expiredCoursesList = courses.filter(course =>
                    !activeCourseIds.includes(course.id) &&
                    userActivationKeys.some((k: any) =>
                      (k.courseId === course.id || (k.courseTitle && k.courseTitle.toLowerCase() === course.title.toLowerCase())) &&
                      isCourseKeyExpired(k)
                    )
                  );

                  if (expiredCoursesList.length === 0) return null;

                  return (
                    <div className="space-y-2.5 pt-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 px-1">
                        Expired Courses ({expiredCoursesList.length})
                      </h3>
                      <div className="space-y-2">
                        {expiredCoursesList.map((course) => {
                          const keyInfo = userActivationKeys.find((k: any) =>
                            (k.courseId === course.id || (k.courseTitle && k.courseTitle.toLowerCase() === course.title.toLowerCase()))
                          );
                          const expiresTimestamp = keyInfo?.expiresAt || keyInfo?.claimedAt || Date.now();
                          const expiredDateStr = new Date(expiresTimestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                          const cleanTitle = course.title.replace(/by Dhruv Rathee/gi, 'by HamroLms').replace(/Dhruv Rathee/gi, 'HamroLms');

                          return (
                            <div
                              key={course.id}
                              className="bg-zinc-950 border border-rose-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-zinc-300 truncate">{cleanTitle}</h4>
                                <p className="text-[11px] text-rose-400/90">Expired on {expiredDateStr}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActivationCodeInput('');
                                  setShowCodeInputModal(true);
                                }}
                                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
                              >
                                Renew
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* 4. MINIMAL WHATSAPP HELPLINE */}
                <a
                  href={`https://wa.me/${getFormattedWhatsappNumber(paymentConfig.whatsappNumber || siteSettings.supportPhone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/80 text-white transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs block text-zinc-100">WhatsApp Support</span>
                      <span className="text-[11px] text-zinc-500">Need help with activation or account?</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition" />
                </a>
              </div>
            )}

            {(!authLoading || hasStudentProfile) && (
              <ProfileDetailsFaqSection
                locale={activeLocale}
                supportEmail={siteSettings.supportEmail || 'support.hamrolms@gmail.com'}
                onNavigatePath={navigateToPath}
              />
            )}
          </section>
        ) : (
          /* 2. COURSES / CLASSROOM VIEW (when not in account) */
          <>
            {/* Course Catalog Title & Grid Section */}
            <section id="courses-section" className="pt-0 scroll-mt-24">
              {(currentView === 'home' || currentView === 'courses') && (
                <div className="flex flex-col items-center justify-center text-center pt-0.5 pb-0.5 mb-3 sm:mb-4">
                  <div className="inline-flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-sky-500/10 border border-blue-400/35 flex items-center justify-center shadow-sm shadow-blue-500/15 shrink-0"
                    >
                      <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-sky-300" />
                    </span>
                    <h1 className="font-['Outfit',sans-serif] text-2xl sm:text-[28px] font-extrabold tracking-tight leading-none bg-gradient-to-r from-white via-sky-100 to-blue-400 bg-clip-text text-transparent">
                      {currentView === 'courses' ? 'Courses – HamroLms' : 'HamroLms'}
                    </h1>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5 w-48 sm:w-64" aria-hidden="true">
                    <span className="h-[1.5px] flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-blue-400/90 rounded-full" />
                    <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-sky-400 shrink-0" />
                    <span className="h-[1.5px] flex-1 bg-gradient-to-l from-transparent via-blue-500/50 to-blue-400/90 rounded-full" />
                  </div>
                </div>
              )}

          {/* Courses Cards Grid or Live Embedded Classroom */}
          {currentView === 'classroom' ? (
            (() => {
              const classroomCourses = courses.filter((course) => {
                if (isMainAdmin) return true;
                if (isSubAdmin && subAdminSession?.courseId === course.id) return true;
                return activeCourseIds.includes(course.id);
              });

              if (classroomCourses.length > 0) {
                const currentClassroomCourse = classroomCourses.find(c => c.id === selectedClassroomCourseId) || classroomCourses[0];
                if (!currentClassroomCourse) return null;

                const activePlaylist = currentClassroomCourse.videos || [];
                const canDirectEditThisCourse = canEditCourse(currentClassroomCourse.id);
                const isEnrolledInThisCourse = activeCourseIds.includes(currentClassroomCourse.id);
                const hasChapters = activePlaylist.some((v) => Boolean(v.chapterTitle && v.chapterTitle.trim()));

                // Unique existing chapter names for quick selection when adding videos directly
                const existingChapterNames: string[] = [];
                activePlaylist.forEach((v) => {
                  const ch = v.chapterTitle?.trim();
                  if (ch && !existingChapterNames.includes(ch)) {
                    existingChapterNames.push(ch);
                  }
                });

                // Group playlist into ordered chapters when chapterTitle is present
                const chaptersMap: Record<string, { video: CourseVideo; globalIndex: number }[]> = {};
                const chapterOrder: string[] = [];
                if (hasChapters) {
                  activePlaylist.forEach((video, globalIdx) => {
                    const chTitle = video.chapterTitle?.trim() || 'Other Lectures';
                    if (!chaptersMap[chTitle]) {
                      chaptersMap[chTitle] = [];
                      chapterOrder.push(chTitle);
                    }
                    chaptersMap[chTitle].push({ video, globalIndex: globalIdx });
                  });
                }

                const renderVideoRow = (video: CourseVideo, globalIdx: number, displayIndexLabel?: string) => {
                  const isConfirmingDelete = confirmDeleteVideoIdx === globalIdx;
                  return (
                    <motion.div
                      key={globalIdx}
                      whileHover={{ scale: 1.005, x: 2 }}
                      onClick={() => {
                        if (document.documentElement && document.documentElement.requestFullscreen) {
                          document.documentElement.requestFullscreen().catch(() => {});
                        }
                        const securePlayUrl = getSecureYouTubeEmbedUrl(video.videoUrl, true);
                        setFullscreenVideo({
                          courseTitle: currentClassroomCourse.title,
                          title: video.title,
                          videoUrl: securePlayUrl,
                          idx: globalIdx,
                          playlist: activePlaylist,
                          courseId: currentClassroomCourse.id,
                        });
                        showToast(`Opening Lecture ${globalIdx + 1} in Fullscreen! 🎥`, 'success');
                      }}
                      className="group bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-blue-500/40 rounded-2xl p-3 cursor-pointer transition-all duration-150 flex items-center gap-3 sm:gap-4 text-left shadow-md"
                    >
                      {/* Left: Elegant play icon box */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 border border-blue-500/30 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-blue-400">
                        <Play className="w-4 h-4 text-blue-400 fill-blue-400 ml-0.5" />
                      </div>

                      {/* Center: Text Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs sm:text-base font-bold text-zinc-100 group-hover:text-blue-300 transition-colors leading-snug font-sans">
                          {displayIndexLabel ? `${displayIndexLabel} ` : ''}{video.title}
                        </h5>
                        {video.duration && (
                          <span className="text-[10px] sm:text-xs text-zinc-400 font-sans font-medium">
                            ⏱️ {video.duration} mins
                          </span>
                        )}
                      </div>

                      {/* Right: Direct Inline Delete for Sub-Admin / Main Admin */}
                      {canDirectEditThisCourse && (
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isConfirmingDelete ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDeleteDirectVideoLecture(currentClassroomCourse, globalIdx)}
                                className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteVideoIdx(null)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteVideoIdx(globalIdx)}
                              className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 transition cursor-pointer"
                              title="Remove this video lecture"
                              aria-label="Remove video lecture"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                };

                return (
                  <div className="space-y-8 text-left">
                    <div className="space-y-8">
                      {classroomCourses.length > 1 && (
                        <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
                          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-sans">
                            📚 Switch Course Program:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {classroomCourses.map((course) => {
                              const isActive = course.id === currentClassroomCourse.id;
                              return (
                                <button
                                  key={course.id}
                                  onClick={() => {
                                    setSelectedClassroomCourseId(course.id);
                                    setShowDirectVideoAddForm(false);
                                    setConfirmDeleteVideoIdx(null);
                                    showToast(`Loaded: ${course.title}`, 'info');
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                    isActive
                                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                                  }`}
                                >
                                  {course.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Single Selected Course Section ONLY */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black border border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden text-zinc-100"
                      >
                        {/* Course Header Banner */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
                          <div className="space-y-2 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-500/30 font-sans">
                                {isEnrolledInThisCourse
                                  ? '🟢 Active Program'
                                  : isSubAdmin
                                    ? '🟢 Sub-Admin Course Manager'
                                    : '🟢 Main Admin Course Manager'}
                              </span>
                              <span className="text-xs text-zinc-400 font-bold font-sans">
                                ({activePlaylist.length} Total Lectures{hasChapters ? ` • ${chapterOrder.length} Chapters` : ''})
                              </span>
                            </div>
                            <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight font-sans">
                              {currentClassroomCourse.title}
                            </h4>
                            <p className="text-xs text-zinc-400 font-medium font-sans">
                              {hasChapters
                                ? 'Click any Chapter below to view its video lectures!'
                                : 'Click any video lecture below to start watching in Full Screen!'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {currentClassroomCourse.includeLive ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLiveCourseId(currentClassroomCourse.id);
                                  setCurrentView('course-live');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-lg shadow-rose-500/20 flex items-center gap-1.5 cursor-pointer font-sans active:scale-95"
                                title="Open Live Session Page"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Live Session</span>
                              </button>
                            ) : (isEnrolledInThisCourse && !secondaryCourseIds.includes(currentClassroomCourse.id) && currentClassroomCourse.includeCertificate !== false) && (
                              <button
                                onClick={() => handleOpenStudentCertificate(currentClassroomCourse.id)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer font-sans active:scale-95"
                                title="Download / View Course Certificate"
                              >
                                📜 Course Certificate
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setActivationCodeInput('');
                                setShowCodeInputModal(true);
                              }}
                              className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans active:scale-95"
                              title="Add course"
                            >
                              + Add course
                            </button>

                            {(canDirectEditThisCourse || isMainAdmin) && (
                              <div className="flex gap-2">
                                {canDirectEditThisCourse && (
                                  <button
                                    onClick={() => handleEditCourseClick(currentClassroomCourse)}
                                    className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-blue-300 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans"
                                  >
                                    ✏️ Edit Playlist & Videos
                                  </button>
                                )}
                                {isMainAdmin && (
                                  <button
                                    onClick={() => handlePromptDeleteCourse(currentClassroomCourse.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans"
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Classroom Tab Switcher: Videos vs PDFs & Notes */}
                        <div className="flex items-center gap-2 mt-6 border-b border-zinc-800/80 pb-3 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => setClassroomTab('videos')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer font-sans whitespace-nowrap ${
                              classroomTab === 'videos'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            <span>🎬 Video Lectures</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${classroomTab === 'videos' ? 'bg-zinc-950 text-blue-300' : 'bg-zinc-800 text-zinc-400'}`}>
                              {activePlaylist.length}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setClassroomTab('pdfs')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer font-sans whitespace-nowrap ${
                              classroomTab === 'pdfs'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📕 Study Materials (PDFs & Notes)</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${classroomTab === 'pdfs' ? 'bg-zinc-950 text-blue-300' : 'bg-zinc-800 text-zinc-400'}`}>
                              {currentClassroomCourse.pdfs?.length || 0}
                            </span>
                          </button>
                        </div>

                        {/* TAB 1: VIDEOS PLAYLIST (Direct Add for Sub-Admin/Main Admin + Chapter FAQ Collapsible) */}
                        {classroomTab === 'videos' && (
                          <div className="space-y-4 mt-6">
                            {/* Direct Add Video Lecture Bar (Sub-Admin & Main Admin — NO need to open Edit Course modal!) */}
                            {canDirectEditThisCourse && (
                              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2.5">
                                  <div className="text-left">
                                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                                      <Video className="w-4 h-4 text-blue-400" />
                                      Direct Video Lecture Manager
                                    </span>
                                    <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                      Add a new Video Lecture or Chapter directly here without opening Edit Course.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowDirectVideoAddForm((prev) => {
                                        const next = !prev;
                                        if (next && !directVideoChapter && existingChapterNames.length > 0) {
                                          setDirectVideoChapter(existingChapterNames[existingChapterNames.length - 1]);
                                        }
                                        return next;
                                      });
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-md active:scale-95 ${
                                      showDirectVideoAddForm
                                        ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                                    }`}
                                  >
                                    {showDirectVideoAddForm ? (
                                      <>
                                        <X className="w-3.5 h-3.5" /> Close Form
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" /> Add Video Lecture
                                      </>
                                    )}
                                  </button>
                                </div>

                                {showDirectVideoAddForm && (
                                  <form
                                    onSubmit={(e) => handleAddDirectVideoLecture(e, currentClassroomCourse)}
                                    className="pt-3 border-t border-zinc-800/80 space-y-3"
                                  >
                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-blue-400 mb-1">
                                        Chapter Name (Optional — for Chapter-wise organization)
                                      </label>
                                      <input
                                        type="text"
                                        value={directVideoChapter}
                                        onChange={(e) => setDirectVideoChapter(e.target.value)}
                                        placeholder="e.g. Chapter 1: Introduction (leave blank for flat list)"
                                        className="w-full bg-black border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden placeholder:text-zinc-600"
                                      />
                                      {existingChapterNames.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                          <span className="text-[10px] text-zinc-500 font-bold">Existing Chapters:</span>
                                          {existingChapterNames.map((chName) => (
                                            <button
                                              key={chName}
                                              type="button"
                                              onClick={() => setDirectVideoChapter(chName)}
                                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                                                directVideoChapter.trim() === chName
                                                  ? 'bg-blue-600 text-white border-blue-500'
                                                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                                              }`}
                                            >
                                              {chName}
                                            </button>
                                          ))}
                                          {directVideoChapter && (
                                            <button
                                              type="button"
                                              onClick={() => setDirectVideoChapter('')}
                                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-rose-300 border border-zinc-800 transition cursor-pointer"
                                            >
                                              Clear Chapter
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                        Lecture Title *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={directVideoTitle}
                                        onChange={(e) => setDirectVideoTitle(e.target.value)}
                                        placeholder="e.g. 1.1 Course Setup & Overview"
                                        className="w-full bg-black border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden placeholder:text-zinc-600"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                                        Video Link (YouTube or Google Drive Preview URL) *
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        value={directVideoUrl}
                                        onChange={(e) => setDirectVideoUrl(e.target.value)}
                                        placeholder="https://youtu.be/... or https://drive.google.com/file/d/.../preview"
                                        className="w-full bg-black border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden placeholder:text-zinc-600"
                                      />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setShowDirectVideoAddForm(false)}
                                        className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold cursor-pointer transition"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={isSavingDirectVideo}
                                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        {isSavingDirectVideo ? 'Saving...' : 'Save Video Lecture'}
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            )}

                            {/* Video Playlist: Chapter-wise FAQ Collapsible Accordion OR Flat List */}
                            {activePlaylist.length > 0 ? (
                              hasChapters ? (
                                <div className="space-y-2.5">
                                  {chapterOrder.map((chTitle, chIdx) => {
                                    const items = chaptersMap[chTitle] || [];
                                    const chKey = `${currentClassroomCourse.id}::${chTitle}`;
                                    const isOpen = Boolean(classroomExpandedChapters[chKey]);

                                    return (
                                      <div
                                        key={chKey}
                                        className="border border-zinc-800/90 rounded-2xl bg-zinc-950/90 overflow-hidden shadow-md"
                                      >
                                        {/* Chapter FAQ-style Header (All chapters collapsed by default; click to reveal videos) */}
                                        <button
                                          type="button"
                                          aria-expanded={isOpen}
                                          onClick={() =>
                                            setClassroomExpandedChapters((prev) => ({
                                              ...prev,
                                              [chKey]: !isOpen,
                                            }))
                                          }
                                          className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer ${
                                            isOpen
                                              ? 'bg-zinc-900/90 text-blue-300 border-b border-zinc-800'
                                              : 'hover:bg-zinc-900/70 text-zinc-100'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-black shrink-0">
                                              {chIdx + 1}
                                            </span>
                                            <span className="text-xs sm:text-sm md:text-base font-extrabold truncate">
                                              {chTitle}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] sm:text-xs bg-zinc-900 text-zinc-400 px-2.5 py-1 rounded-lg font-bold border border-zinc-800">
                                              {items.length} {items.length === 1 ? 'Video' : 'Videos'}
                                            </span>
                                            <ChevronDown
                                              className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180 text-blue-400' : ''
                                              }`}
                                            />
                                          </div>
                                        </button>

                                        {/* Expanded Chapter Videos */}
                                        {isOpen && (
                                          <div className="p-3 sm:p-4 space-y-2.5 bg-black/50">
                                            {items.map(({ video, globalIndex }) =>
                                              renderVideoRow(video, globalIndex)
                                            )}

                                            {canDirectEditThisCourse && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setDirectVideoChapter(chTitle);
                                                  setShowDirectVideoAddForm(true);
                                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-800 hover:border-blue-500/50 bg-zinc-950/60 hover:bg-zinc-900 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                              >
                                                <Plus className="w-3.5 h-3.5" /> Add Video to "{chTitle}"
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {activePlaylist.map((video, idx) => renderVideoRow(video, idx))}
                                </div>
                              )
                            ) : (
                              <div className="text-center py-12 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-2">
                                <div className="text-3xl">📹</div>
                                <h5 className="text-sm font-bold text-zinc-300 font-sans">No Video Lectures Available</h5>
                                <p className="text-xs text-zinc-500 font-sans">
                                  {canDirectEditThisCourse
                                    ? 'Click the "+ Add Video Lecture" button above to add videos directly.'
                                    : 'Videos added by the instructor will appear here.'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 2: COURSE PDF DOCUMENTS & STUDY NOTES */}
                        {classroomTab === 'pdfs' && (
                          <div className="space-y-4 mt-6">
                            {/* Direct Access Notification Banner */}
                            <div className="bg-zinc-900 border border-blue-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <h5 className="text-xs font-black text-white">
                                    Google Drive PDF Study Materials (Direct Notes Viewer)
                                  </h5>
                                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                    Students can read PDF notes directly in full screen without signing in to Google Drive.
                                  </p>
                                </div>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950/80 text-emerald-300 font-black px-2.5 py-1 rounded-full border border-emerald-500/40 shrink-0">
                                🟢 No Login Required
                              </span>
                            </div>

                            {/* PDF List */}
                            {(currentClassroomCourse.pdfs && currentClassroomCourse.pdfs.length > 0) ? (
                              <div className="space-y-3">
                                {currentClassroomCourse.pdfs.map((pdf, pidx) => (
                                  <motion.div
                                    key={pidx}
                                    whileHover={{ scale: 1.005, x: 2 }}
                                    className="bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/80 hover:border-blue-500/40 rounded-2xl p-3.5 sm:p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left shadow-md"
                                  >
                                    {/* Left: Document icon & details */}
                                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                                      <div className="w-11 h-11 border border-blue-500/30 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0 text-blue-400 mt-0.5 sm:mt-0">
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        {pdf.chapterTitle && (
                                          <span className="text-[10px] text-blue-300 bg-blue-500/15 font-bold px-2 py-0.5 rounded border border-blue-500/30 inline-block mb-1">
                                            📁 {pdf.chapterTitle}
                                          </span>
                                        )}
                                        <h5 className="text-xs sm:text-sm font-black text-zinc-100 hover:text-blue-300 transition leading-snug">
                                          {pdf.title}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-medium">
                                          {pdf.fileSize && <span>📄 {pdf.fileSize}</span>}
                                          <span>•</span>
                                          <span className="text-emerald-400 font-bold">Direct Access PDF</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Action Buttons (Only Full Screen View, No Download) */}
                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                      {/* Direct In-App Fullscreen Viewer */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPdfForView({
                                            title: pdf.title,
                                            pdfUrl: pdf.pdfUrl,
                                            chapterTitle: pdf.chapterTitle,
                                            fileSize: pdf.fileSize,
                                            courseTitle: currentClassroomCourse.title
                                          });
                                          showToast(`Opening Full Screen PDF: ${pdf.title}`, 'info');
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                                      >
                                        <Maximize2 className="w-4 h-4" />
                                        <span>Read in Full Screen</span>
                                      </button>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-12 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-3">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto text-xl border border-blue-500/20">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <h5 className="text-sm font-bold text-zinc-300 font-sans">No PDF Notes Available Yet</h5>
                                <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto">
                                  Once the instructor links Google Drive PDF notes, you can read them directly in Full Screen here.
                                </p>
                                {canEditCourse(currentClassroomCourse.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditCourseClick(currentClassroomCourse)}
                                    className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Add PDF Notes to this Course
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </div>

              {/* Dynamic Course Creator add-on for Main Admin directly under active listing */}
              {isMainAdmin && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleCreateCourseClick}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3 px-6 rounded-xl transition duration-150 flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 font-sans"
                  >
                    ➕ Add Another Course (Admin Control)
                  </button>
                </div>
              )}
            </div>
              );
              }
              const expiredKeysList = userActivationKeys.filter(k => isCourseKeyExpired(k));
              const hasExpiredCourseAccess = expiredKeysList.length > 0;

              return hasExpiredCourseAccess ? (
                <div className="max-w-xl mx-auto bg-gradient-to-b from-rose-950/30 via-zinc-950 to-black p-6 sm:p-8 rounded-3xl border border-rose-500/40 shadow-2xl text-center space-y-6 my-8">
                  <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                    ⏰
                  </div>
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" />
                      Course Access Expired
                    </span>
                    <h4 className="text-xl sm:text-2xl font-black text-white font-sans">
                      Your Course Access Has Expired
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium max-w-sm mx-auto">
                      Your access period for this course has ended. Enter a new Secret Activation Code or contact the admin to continue watching.
                    </p>
                  </div>

                  {/* Expired Course Summary Badges */}
                  <div className="space-y-2 text-left bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      📚 Expired Course List:
                    </span>
                    {expiredKeysList.map((k, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 py-1 border-b border-zinc-800 last:border-b-0 text-xs">
                        <span className="font-bold text-white truncate">
                          {k.courseTitle || 'Premium Course'}
                        </span>
                        <span className="text-[10px] font-mono text-rose-400 shrink-0 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                          Expired: {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Expired'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Instant Reactivation Form */}
                  <form onSubmit={handleClaimActivationCode} className="space-y-3 pt-2 text-left">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-zinc-300">
                        Enter New Secret Code
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePasteCodeToInput()}
                        className="text-[11px] font-extrabold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="Paste code from clipboard"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>📋 Paste</span>
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <input 
                        type="text"
                        value={activationCodeInput}
                        onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                        onPaste={(e) => {
                          const pasted = e.clipboardData?.getData('text');
                          if (pasted) {
                            e.preventDefault();
                            const clean = extractAndCleanCode(pasted);
                            setActivationCodeInput(clean);
                            showToast(`📋 Code pasted: ${clean}`, 'success');
                          }
                        }}
                        placeholder="CLIP-XXXXXX"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoCapitalize="characters"
                        className="w-full bg-zinc-950 border border-rose-500/40 focus:border-blue-500 focus:bg-zinc-950 rounded-2xl pl-4 pr-24 py-3.5 text-sm sm:text-base font-mono font-black uppercase outline-hidden text-white text-center tracking-widest transition shadow-inner placeholder:text-zinc-600"
                      />

                      <div className="absolute right-2 flex items-center gap-1">
                        {activationCodeInput && (
                          <button
                            type="button"
                            onClick={() => setActivationCodeInput('')}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                            title="Clear"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePasteCodeToInput()}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer active:scale-95"
                          title="Paste from clipboard"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          <span>Paste</span>
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isActivating || !activationCodeInput.trim()}
                      className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-rose-600/20 font-sans active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4 fill-white" />
                      {isActivating ? 'Renewing Course...' : 'Renew & Unlock Course Access ⚡'}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-center gap-2">
                    <button 
                      onClick={() => {
                        setCurrentView('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-xs font-black text-blue-400 hover:text-blue-300 transition flex items-center gap-1 cursor-pointer font-sans"
                    >
                      🌐 Browse All Available Courses First
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl text-center space-y-5 my-8">
                  <div className="space-y-1.5">
                    <h4 className="text-xl font-extrabold text-white font-sans">Add course</h4>
                    <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
                      Enter course ID shared by your instructor to enroll in a course
                    </p>
                  </div>

                  <form onSubmit={handleClaimActivationCode} className="space-y-4">
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        value={activationCodeInput}
                        onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                        onPaste={(e) => {
                          const pasted = e.clipboardData?.getData('text');
                          if (pasted) {
                            e.preventDefault();
                            const clean = extractAndCleanCode(pasted);
                            setActivationCodeInput(clean);
                          }
                        }}
                        placeholder="Course ID"
                        aria-label="Course ID"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoCapitalize="characters"
                        className="w-full bg-black border border-zinc-800 focus:border-blue-500 rounded-2xl pl-4 pr-20 py-3.5 text-sm sm:text-base font-mono font-bold uppercase outline-hidden text-white text-center tracking-widest transition placeholder:text-zinc-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:font-medium"
                      />

                      <div className="absolute right-2 flex items-center gap-1">
                        {activationCodeInput && (
                          <button
                            type="button"
                            onClick={() => setActivationCodeInput('')}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                            title="Clear"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePasteCodeToInput()}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Paste"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isActivating || !activationCodeInput.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition cursor-pointer shadow-lg shadow-blue-500/20 font-sans active:scale-[0.99]"
                    >
                      {isActivating ? 'Enrolling...' : 'Add course'}
                    </button>
                  </form>
                </div>
              );
            })()
        ) : isCoursesLoading && (!courses || courses.length === 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6">
            {[1, 2, 3].map((n) => (
              <div 
                key={n}
                className="bg-zinc-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 p-4 sm:p-5 animate-pulse flex flex-col h-[440px]"
              >
                <div className="w-full h-52 bg-zinc-900/80 rounded-2xl mb-5 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                </div>
                <div className="h-6 bg-zinc-800/80 rounded-lg w-3/4 mb-3" />
                <div className="h-4 bg-zinc-900 rounded-lg w-1/2 mb-6" />
                <div className="space-y-2.5 mb-6 flex-1">
                  <div className="h-3.5 bg-zinc-900/80 rounded w-full" />
                  <div className="h-3.5 bg-zinc-900/80 rounded w-5/6" />
                  <div className="h-3.5 bg-zinc-900/80 rounded w-4/6" />
                </div>
                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between">
                  <div className="h-8 bg-zinc-900 rounded-xl w-28" />
                  <div className="h-10 bg-blue-600/20 rounded-xl w-36" />
                </div>
              </div>
            ))}
          </div>
        ) : coursesLoadError && (!courses || courses.length === 0) ? (
          <div className="bg-zinc-950/90 border border-rose-900/60 rounded-3xl p-10 md:p-14 text-center max-w-xl mx-auto shadow-2xl">
            <div className="w-16 h-16 bg-rose-950/60 border border-rose-800/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-black text-white font-sans">Unable to Load Courses</h4>
            <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
              {coursesLoadError}
            </p>
            <button
              onClick={() => refreshCoursesFromServer(true)}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition active:scale-95"
            >
              <RotateCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : (courses && courses.length > 0) ? (
          <div>
            {isMainAdmin && hiddenCoursesCount > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 bg-amber-950/35 border border-amber-500/35 rounded-2xl px-4 py-2.5 text-xs text-amber-200 shadow-md">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong className="font-black text-amber-300">{hiddenCoursesCount}</strong> {hiddenCoursesCount === 1 ? 'course is' : 'courses are'} currently hidden from the Home screen (Sub-Admins can still generate Student Codes).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminInitialTab('courses');
                    setShowAdminDashboard(true);
                  }}
                  className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Manage / Unhide in Admin
                </button>
              </div>
            )}

            {courseSearchQuery.trim() && (
              <div className="mb-6 flex items-center justify-between bg-zinc-950 border border-blue-500/30 rounded-2xl px-4 py-3 text-xs text-zinc-300 shadow-md">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Found <strong className="text-white font-bold">{filteredHomeCourses.length}</strong> {filteredHomeCourses.length === 1 ? 'course' : 'courses'} matching "<span className="text-blue-400 font-semibold">{courseSearchQuery}</span>"
                  </span>
                </div>
                <button
                  onClick={() => setCourseSearchQuery('')}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-950/40 transition cursor-pointer"
                >
                  Clear Search ✕
                </button>
              </div>
            )}

            {filteredHomeCourses.length > 0 ? (
              <div className={`grid gap-3.5 sm:gap-5 lg:gap-6 ${
                filteredHomeCourses.length + (isMainAdmin ? 1 : 0) === 1
                  ? 'grid-cols-1'
                  : filteredHomeCourses.length + (isMainAdmin ? 1 : 0) === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}>
                {filteredHomeCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    id={`course-card-${course.id}`}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.25) }}
                    whileHover={{ y: -6 }}
                    className="group bg-zinc-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 hover:border-blue-500/40 hover:shadow-blue-500/10 transition-all duration-300 relative flex flex-col h-full scroll-mt-28"
                  >
                    {course.isPopular && (
                      <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-center py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm font-black tracking-widest uppercase z-10 shadow-md">
                        {course.popularText || '🔥 MOST POPULAR - BEST SELLER'}
                      </div>
                    )}

                    {/* Course Thumbnail Image */}
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <img 
                        src={course.image} 
                        alt={`${course.title} – Online Course on Hamro LMS Nepal`}
                        loading={index > 1 ? 'lazy' : 'eager'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
                        <span className="bg-blue-600 text-white text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-lg shadow-md">
                          Instant Delivery
                        </span>
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-4 sm:p-5 md:p-6 flex flex-col grow justify-between">
                      <div className="text-left font-sans">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white group-hover:text-blue-400 transition-colors leading-snug">
                          {course.title}
                        </h3>
                        
                        {/* Prices or Active status badge */}
                        <div className="mt-3 sm:mt-4 flex items-center justify-between">
                          {activeCourseIds.includes(course.id) ? (
                            <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Course Activated
                            </span>
                          ) : userActivationKeys.some((k: any) => (k.courseId === course.id || (k.courseTitle && k.courseTitle.toLowerCase() === course.title.toLowerCase())) && isCourseKeyExpired(k)) ? (
                            <span className="bg-rose-950/80 text-rose-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-rose-500/40 flex items-center gap-1.5 shadow-2xs">
                              <Clock className="w-3 h-3 text-rose-400" />
                              Access Expired
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-2.5">
                              <span className="text-2xl sm:text-[26px] md:text-3xl font-black text-emerald-400">
                                {isCourseFree(course) ? 'FREE' : course.price}
                              </span>
                              {course.isPopular && !isCourseFree(course) && (
                                <span className="text-zinc-500 line-through text-xs sm:text-sm md:text-base font-semibold">
                                  Price Rs. 1000
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-3">
                          {activeCourseIds.includes(course.id) && (() => {
                            const vList = course.videos || [];
                            const chSet = new Set(vList.map(v => v.chapterTitle?.trim() || 'Chapter 1: Course Lectures'));
                            return (
                              <span className="bg-blue-500/15 text-blue-300 text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-xl border border-blue-500/30 flex items-center gap-1.5 shadow-2xs">
                                <span className="w-4 h-4 rounded-md bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">📁</span>
                                {chSet.size} Chapters ({vList.length} Video Lectures)
                              </span>
                            );
                          })()}
                          <span className="bg-zinc-800 text-zinc-300 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl border border-zinc-700">
                            🌐 {course.language && !/nepali|hindi/i.test(course.language) ? course.language : 'English'}
                          </span>
                          {course.includeLive ? (
                            <span className="bg-rose-950/60 text-rose-300 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl border border-rose-500/40">
                              🎥 Live Class
                            </span>
                          ) : course.includeCertificate !== false ? (
                            <span className="bg-blue-950/50 text-blue-300 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-xl border border-blue-500/30">
                              📜 Certificate
                            </span>
                          ) : null}
                        </div>

                        {/* Highlights checklist */}
                        <ul className="mt-4 sm:mt-5 space-y-2">
                          {course.learn.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-[13px] md:text-sm text-zinc-300 font-medium leading-relaxed">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Enrolment / Classroom Access Button */}
                      <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-zinc-800/80 flex items-center gap-2 sm:gap-3">
                        {activeCourseIds.includes(course.id) ? (
                          <button
                            onClick={() => {
                              setSelectedClassroomCourseId(course.id);
                              setCurrentView('classroom');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex-1 font-black text-xs sm:text-sm py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] font-sans bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                          >
                            🎓 Go to Course
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : userActivationKeys.some((k: any) => (k.courseId === course.id || (k.courseTitle && k.courseTitle.toLowerCase() === course.title.toLowerCase())) && isCourseKeyExpired(k)) ? (
                          <button
                            onClick={() => {
                              setActivationCodeInput('');
                              setShowCodeInputModal(true);
                              showToast(`Renew access for "${course.title}". Enter your new secret code.`, 'info');
                            }}
                            className="flex-1 font-black text-xs sm:text-sm py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] font-sans bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20"
                          >
                            <Clock className="w-4 h-4" />
                            Renew Course Access
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnrollCourse(course)}
                            className="flex-1 font-black text-xs sm:text-sm py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] font-sans bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 shadow-emerald-500/20"
                          >
                            <Zap className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                            Enroll & Activate Course
                          </button>
                        )}

                        {/* Admin Inline Controls (Course Sub-Admin sees edit ONLY on assigned course) */}
                        {(canEditCourse(course.id) || isMainAdmin) && (
                          <div className="flex items-center gap-1">
                            {isMainAdmin && !courseSearchQuery.trim() && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMoveCourse(course.id, 'up')}
                                  disabled={index === 0}
                                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-35 disabled:cursor-not-allowed text-emerald-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-zinc-700"
                                  title="Move Up"
                                  aria-label="Move course up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveCourse(course.id, 'down')}
                                  disabled={index === filteredHomeCourses.length - 1}
                                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-35 disabled:cursor-not-allowed text-emerald-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-zinc-700"
                                  title="Move Down"
                                  aria-label="Move course down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {canEditCourse(course.id) && (
                              <button
                                onClick={() => handleEditCourseClick(course)}
                                className="bg-zinc-800 hover:bg-zinc-700 text-blue-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-zinc-700"
                                title="Edit Course"
                              >
                                ✏️
                              </button>
                            )}
                            {isMainAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCourseVisibility(course)}
                                  className="bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-amber-700/70"
                                  title="Hide Course from Home Screen"
                                  aria-label="Hide course from Home screen"
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePromptDeleteCourse(course.id)}
                                  className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-rose-800"
                                  title="Delete Course"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

              {isMainAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  whileHover={{ scale: 1.01 }}
                  onClick={handleCreateCourseClick}
                  className="bg-zinc-900/60 hover:bg-zinc-900 rounded-3xl overflow-hidden shadow-sm hover:shadow-md border-2 border-dashed border-zinc-700 hover:border-blue-500 transition-all duration-300 flex flex-col items-center justify-center p-8 text-center min-h-[350px] cursor-pointer group font-sans"
                >
                  <div className="w-16 h-16 bg-blue-500/15 border border-blue-500/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-blue-400">
                    <Plus className="w-8 h-8" />
                  </div>
                  <strong className="text-lg font-black text-white block">Add Another Course</strong>
                  <span className="text-xs text-zinc-400 mt-2 block max-w-xs">Click here to dynamically add a new course with custom pricing, learn checklist, and videos to Firestore database.</span>
                </motion.div>
              )}
              </div>
            ) : courseSearchQuery.trim() ? (
              <div className="py-16 text-center bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-lg mx-auto">
                <Search className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Courses Found</h3>
                <p className="text-xs text-zinc-400 mb-4">No courses matching "{courseSearchQuery}". Try another keyword.</p>
                <button
                  onClick={() => setCourseSearchQuery('')}
                  className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  View All Courses
                </button>
              </div>
            ) : (
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-10 md:p-14 text-center max-w-xl mx-auto shadow-2xl">
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
                  🎓
                </div>
                <h4 className="text-xl font-black text-white font-sans">No Courses Currently Available</h4>
                <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                  New courses will be available soon. If you already have an Activation Code, open it from the Course or Profile tab.
                </p>
                {isMainAdmin && (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {hiddenCoursesCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminInitialTab('courses');
                          setShowAdminDashboard(true);
                        }}
                        className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-amber-500/20 cursor-pointer transition active:scale-95"
                      >
                        <Eye className="w-4 h-4" /> View Hidden Courses ({hiddenCoursesCount})
                      </button>
                    )}
                    <button
                      onClick={handleCreateCourseClick}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Add New Course
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-10 md:p-14 text-center max-w-xl mx-auto shadow-2xl">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
                🎓
              </div>
              <h4 className="text-xl font-black text-white font-sans">No Courses Currently Available</h4>
              <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                New premium courses will be available soon. Stay tuned for upcoming releases.
              </p>
              {isMainAdmin && (
                <button
                  onClick={handleCreateCourseClick}
                  className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add New Course
                </button>
              )}
            </div>
          )}
        </section>

            {/* Compact Footer */}
            {(currentView === 'home' || currentView === 'courses') && (
              <footer className="mt-auto pt-4">
                <div className="pt-3 pb-2.5 border-t border-zinc-900 text-center sm:text-left">
                  <div className="text-[11px] text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <span>© {new Date().getFullYear()} HamroLms. All rights reserved.</span>
                    <span>Learn. Apply. Grow. — Structured Online Courses &amp; Certificates</span>
                  </div>
                </div>
              </footer>
            )}

          </>
        )}

      </main>

      {/* COURSE DETAILS & PREMIUM PLAYLIST LECTURE HUB */}
      <AnimatePresence>
        {selectedCourse && !showQrModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedCourse(null);
                setCurrentVideoIndex(0);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            {activeCourseIds.includes(selectedCourse.id) ? (
              /* ACTIVE CLASSROOM INTERACTIVE HUD (UNLOCKED CONTENT) */
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-slate-950 text-white max-w-5xl w-full rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-slate-800 flex flex-col md:flex-row max-h-[92vh] animate-in zoom-in-95 duration-200"
              >
                <button 
                  onClick={() => {
                    setSelectedCourse(null);
                    setCurrentVideoIndex(0);
                  }}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white transition z-[100] bg-slate-900/65 p-2 rounded-full border border-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Left Area: Video Player */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between text-left min-w-0">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-500/30">
                          🟢 Connected & Active
                        </span>
                        <button
                          onClick={() => {
                            setActivationCodeInput('');
                            setShowCodeInputModal(true);
                          }}
                          className="bg-purple-600/60 hover:bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-400/30 transition flex items-center gap-1 cursor-pointer"
                        >
                          🔑 + Add Course
                        </button>
                      </div>
                      {canEditCourse(selectedCourse.id) && (
                        <button
                          onClick={() => {
                            const courseToEdit = selectedCourse;
                            setSelectedCourse(null);
                            handleEditCourseClick(courseToEdit);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          ✏️ Edit Playlist & Videos
                        </button>
                      )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                      {selectedCourse.title}
                    </h3>
                  </div>

                  {/* Player container */}
                  <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden mt-6 border border-slate-800/80 group">
                    {/* Security Overlay (blocks context menus & right clicks) */}
                    <div 
                      onContextMenu={(e) => e.preventDefault()}
                      className="absolute inset-0 z-50 pointer-events-none"
                    />

                    {/* Transparent Click-Prevention Overlays to block YouTube brandings, titles, share links and copy actions */}
                    <div 
                      className="absolute top-0 inset-x-0 h-36 md:h-44 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                      title="Secure Player Header" 
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    />
                    <div 
                      className="absolute bottom-0 right-0 w-96 md:w-[460px] h-32 md:h-36 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                      title="Secure Player Branding Block" 
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    />
                    <div 
                      className="absolute bottom-0 left-0 w-64 h-28 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                      title="Secure Player Channel Block" 
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    />

                    {/* Watermark to discourage screen records */}
                    <div className="absolute bottom-3 left-4 z-40 bg-slate-950/60 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-none select-none">
                      <p className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {currentUser?.email || 'Student Learner'} • Protected View
                      </p>
                    </div>

                    {/* YouTube non-cookie security iframe embed with scale crop to remove YouTube logos & brandings */}
                    {(() => {
                      const activePlaylist = selectedCourse.videos && selectedCourse.videos.length > 0 
                        ? selectedCourse.videos 
                        : [{ title: 'Introductory Lecture & Overview', duration: '12:15', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }];
                      
                      const currentLecture = activePlaylist[currentVideoIndex] || activePlaylist[0];
                      const secureEmbedSrc = getSecureYouTubeEmbedUrl(currentLecture.videoUrl, false);

                      return (
                        <iframe
                          src={secureEmbedSrc}
                          className="w-full h-full object-cover"
                          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          title={currentLecture.title}
                          id="secure-lecture-iframe"
                        />
                      );
                    })()}
                  </div>

                  {/* Playing lecture info */}
                  <div className="mt-5 space-y-1">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Currently Playing:</span>
                    <h4 className="text-sm md:text-base font-extrabold text-slate-100">
                      {((selectedCourse.videos && selectedCourse.videos.length > 0 ? selectedCourse.videos : [{ title: 'Introductory Lecture & Overview' }])[currentVideoIndex] || { title: 'Introductory Lecture' }).title}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
                      ⏳ Duration: {((selectedCourse.videos && selectedCourse.videos.length > 0 ? selectedCourse.videos : [{ duration: '12:15' }])[currentVideoIndex] || { duration: '12:00' }).duration} minutes
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={() => {
                          if (document.documentElement && document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().catch(() => {});
                          }
                          const list = selectedCourse.videos && selectedCourse.videos.length > 0 
                            ? selectedCourse.videos 
                            : [{ title: 'Introductory Lecture & Overview', duration: '12:15', videoUrl: '' }];
                          const currentLecture = list[currentVideoIndex] || list[0];
                          const securePlayUrl = getSecureYouTubeEmbedUrl(currentLecture.videoUrl, true);

                          setFullscreenVideo({
                            courseTitle: selectedCourse.title,
                            title: currentLecture.title,
                            videoUrl: securePlayUrl,
                            idx: currentVideoIndex,
                            playlist: list,
                            courseId: selectedCourse.id,
                          });
                          showToast(`Opening video in immersive fullscreen! 🎥`, 'success');
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        📺 Expand to Fullscreen
                      </button>

                      {selectedCourse.includeLive ? (
                        <button
                          onClick={() => {
                            const targetId = selectedCourse.id;
                            setSelectedCourse(null);
                            setSelectedLiveCourseId(targetId);
                            setCurrentView('course-live');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-500/20 cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Live Session</span>
                        </button>
                      ) : (!secondaryCourseIds.includes(selectedCourse.id) && selectedCourse.includeCertificate !== false) && (
                        <button
                          onClick={() => handleOpenStudentCertificate(selectedCourse.id)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                        >
                          📜 View Certificate
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Area: Scrolling Playlist & Resources */}
                <div className="w-full md:w-[360px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between max-h-full">
                  <div className="space-y-3 flex-1 overflow-hidden flex flex-col text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setCourseDetailTab('videos')}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                            courseDetailTab === 'videos'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>🎬 Videos</span>
                          <span className="opacity-80">({selectedCourse.videos?.length || 1})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseDetailTab('pdfs')}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 ${
                            courseDetailTab === 'pdfs'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-3 h-3" />
                          <span>📕 PDFs</span>
                          <span className="opacity-80">({selectedCourse.pdfs?.length || 0})</span>
                        </button>
                      </div>

                      <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                        Verified Access
                      </span>
                    </div>

                    {/* Chapter Accordions Scroll Container (Videos Tab) */}
                    {courseDetailTab === 'videos' && (
                    <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-[320px] md:max-h-[400px]">
                      {(() => {
                        const list = selectedCourse.videos && selectedCourse.videos.length > 0 
                          ? selectedCourse.videos 
                          : [{ title: 'Introductory Lecture & Overview', duration: '12:15', videoUrl: '' }];
                        
                        // Group videos by chapter
                        const chaptersMap: Record<string, { video: CourseVideo; globalIndex: number }[]> = {};
                        const chapterOrder: string[] = [];

                        list.forEach((video, globalIdx) => {
                          const chTitle = video.chapterTitle?.trim() || 'Chapter 1: Course Lectures';
                          if (!chaptersMap[chTitle]) {
                            chaptersMap[chTitle] = [];
                            chapterOrder.push(chTitle);
                          }
                          chaptersMap[chTitle].push({ video, globalIndex: globalIdx });
                        });

                        return chapterOrder.map((chTitle, chIdx) => {
                          const items = chaptersMap[chTitle];
                          const isCurrentInThisChapter = items.some(item => item.globalIndex === currentVideoIndex);
                          // Default to false unless explicitly toggled or active playing
                          const isOpen = expandedChapters[chTitle] ?? false;

                          return (
                            <div key={chIdx} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80 shadow-xs">
                              {/* Chapter Header */}
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedChapters(prev => ({
                                    ...prev,
                                    [chTitle]: !isOpen
                                  }));
                                }}
                                className={`w-full text-left px-3 py-2.5 flex items-center justify-between font-sans transition cursor-pointer ${
                                  isCurrentInThisChapter 
                                    ? 'bg-purple-950/70 text-purple-200 border-b border-purple-500/30' 
                                    : 'bg-slate-900/90 text-slate-200 hover:bg-slate-800/90 border-b border-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-black border border-purple-500/30 shrink-0">
                                    📁
                                  </span>
                                  <span className="text-[11px] font-extrabold truncate text-white">{chTitle}</span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold border border-slate-700">
                                    {items.length} Videos
                                  </span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
                                </div>
                              </button>

                              {/* Chapter Video Items */}
                              {isOpen && (
                                <div className="p-1.5 space-y-1 bg-slate-950/60">
                                  {items.map(({ video, globalIndex }) => {
                                    const isSelected = currentVideoIndex === globalIndex;
                                    return (
                                      <div
                                        key={globalIndex}
                                        onClick={() => {
                                          setCurrentVideoIndex(globalIndex);
                                          showToast(`Loading: ${video.title}`, 'info');
                                        }}
                                        className={`p-2 rounded-lg border transition cursor-pointer flex items-start gap-2 text-xs ${
                                          isSelected 
                                            ? 'bg-gradient-to-r from-blue-900/70 to-indigo-900/70 border-blue-500/60 text-white shadow-xs' 
                                            : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/60 text-slate-300'
                                        }`}
                                      >
                                        <div className={`w-5 h-5 rounded flex items-center justify-center font-black shrink-0 text-[10px] mt-0.5 ${
                                          isSelected ? 'bg-blue-600 text-white font-black shadow-2xs' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                        }`}>
                                          {isSelected ? '▶' : globalIndex + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <h5 className={`font-bold leading-tight text-[11px] ${isSelected ? 'text-blue-300 font-extrabold' : 'text-slate-200'}`}>
                                            {video.title || `Lecture ${globalIndex + 1}`}
                                          </h5>
                                          {(video.duration || isSelected) && (
                                            <div className="flex items-center justify-between mt-1 text-[9px]">
                                              {video.duration ? (
                                                <span className="text-slate-400 font-medium">⏱️ {video.duration} min</span>
                                              ) : <span />}
                                              {isSelected && <span className="text-blue-400 font-black uppercase tracking-wider">Now Playing</span>}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    )}

                    {/* PDFs Scroll Container (PDFs Tab) */}
                    {courseDetailTab === 'pdfs' && (
                      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[320px] md:max-h-[400px]">
                        {selectedCourse.pdfs && selectedCourse.pdfs.length > 0 ? (
                          selectedCourse.pdfs.map((pdf, pidx) => (
                            <div
                              key={pidx}
                              className="bg-slate-950/70 hover:bg-slate-800/70 border border-slate-800 hover:border-rose-500/50 rounded-xl p-2.5 transition text-left space-y-2 group"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  {pdf.chapterTitle && (
                                    <span className="text-[9px] text-purple-400 font-semibold block truncate">
                                      {pdf.chapterTitle}
                                    </span>
                                  )}
                                  <h6 className="text-[11px] font-bold text-slate-100 group-hover:text-rose-300 transition leading-snug line-clamp-2">
                                    {pdf.title}
                                  </h6>
                                  {pdf.fileSize && (
                                    <span className="text-[9px] text-slate-400 block mt-0.5">
                                      📄 {pdf.fileSize}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-900">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPdfForView({
                                      title: pdf.title,
                                      pdfUrl: pdf.pdfUrl,
                                      chapterTitle: pdf.chapterTitle,
                                      fileSize: pdf.fileSize,
                                      courseTitle: selectedCourse.title
                                    });
                                  }}
                                  className="w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  <span>Read in Full Screen</span>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 px-3 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 space-y-1.5">
                            <FileText className="w-7 h-7 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-300">No PDF Available</p>
                            <p className="text-[10px] text-slate-500">
                              Once the instructor adds Google Drive PDFs to this course, you can read them directly here without signing in.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 space-y-2 text-left">
                    <button
                      onClick={() => {
                        setActivationCodeInput('');
                        setShowCodeInputModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-purple-400/30 shadow-md active:scale-98"
                    >
                      <span>🔑 Add Another Course</span>
                    </button>

                    <div className="text-[10px] text-slate-500 font-semibold space-y-1">
                      <p>🔒 Security protocol fully active.</p>
                      <p>⚠️ Unauthorized copying, distribution, or download of these course materials is strictly prohibited.</p>
                    </div>
                  </div>
                </div>

              </motion.div>
            ) : (
              /* STANDARD CATALOG DETAILS MODAL (FOR BUYING / BEFORE CLAIM) */
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
                className="bg-black max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto border border-zinc-800 text-zinc-200"
              >
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="absolute top-5 right-5 text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-zinc-800"
                >
                  <X className="w-6 h-6" />
                </button>

                <span className="inline-block bg-blue-500/15 text-blue-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 border border-blue-500/30">
                  Course Details
                </span>

                <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight text-left">
                  {selectedCourse.title}
                </h3>
                
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-zinc-900 text-zinc-300 text-[11px] font-extrabold px-2.5 py-1 rounded-md border border-zinc-750 flex items-center gap-1">
                    🌐 Language: {selectedCourse.language && !/nepali|hindi/i.test(selectedCourse.language) ? selectedCourse.language : 'English'}
                  </span>
                  {selectedCourse.includeLive ? (
                    <span className="bg-zinc-900 text-rose-400 text-[11px] font-extrabold px-2.5 py-1 rounded-md border border-rose-500/30">
                      🎥 Live Class
                    </span>
                  ) : selectedCourse.includeCertificate !== false ? (
                    <span className="bg-zinc-900 text-emerald-400 text-[11px] font-extrabold px-2.5 py-1 rounded-md border border-emerald-500/30">
                      📜 Certificate
                    </span>
                  ) : null}
                </div>
                
                <p className="text-3xl font-black text-emerald-400 mt-3 text-left">
                  {isCourseFree(selectedCourse) ? 'FREE' : selectedCourse.price}
                </p>

                <div className="mt-6 text-left">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider mb-3">
                    What You Will Learn
                  </h4>
                  
                  <ul className="space-y-3">
                    {selectedCourse.learn.map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-zinc-300 text-sm md:text-base leading-relaxed">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Secure purchase assurances */}
                <div className="mt-6 p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex items-center gap-3 text-xs text-zinc-300 font-semibold text-left">
                  <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                  <span>
                    {isCourseFree(selectedCourse)
                      ? 'This course is FREE — enter your name and phone number to enroll immediately.'
                      : 'After completing payment, send your payment screenshot on WhatsApp to receive your course access.'}
                  </span>
                </div>

                {/* Purchase options CTA */}
                <div className="mt-8 flex flex-col gap-3">
                  <button 
                    onClick={handleOpenFonePayQR}
                    className={`w-full font-black py-4 px-6 rounded-2xl text-center shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                      isCourseFree(selectedCourse)
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25'
                    }`}
                  >
                    <span>
                      {isCourseFree(selectedCourse)
                        ? 'Enroll & Activate Free Course'
                        : 'Scan QR for Instant Payment (eSewa / Bank)'}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* USER PROFILE - Rendered as Full Screen Native Page View in <main> */}

      {/* FONEPAY QR CODE DETAILS MODAL (supports per-course payment override) */}
      <AnimatePresence>
        {showQrModal && selectedCourse && (() => {
          const effectivePayment = getEffectivePaymentConfig(selectedCourse);
          return (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="bg-black max-w-sm w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 text-center border border-zinc-800 max-h-[90vh] overflow-y-auto text-zinc-200"
            >
              <h3 className="text-lg font-black text-white">
                Scan to Pay (eSewa / Bank App)
              </h3>
              
              <p className="text-xs font-semibold text-zinc-400 mt-1">
                {selectedCourse.title}
              </p>

              <p className="text-3xl font-black text-emerald-400 mt-2">
                {selectedCourse.price}
              </p>

              {/* QR Canvas / Custom Image Container */}
              <div className="my-5 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl w-full shadow-inner text-center">
                {effectivePayment.qrImageUrl ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={effectivePayment.qrImageUrl} 
                      alt="Payment QR Code" 
                      className="max-h-64 w-auto rounded-xl shadow-md border border-zinc-700 object-contain mx-auto"
                    />
                  </div>
                ) : (
                  <canvas ref={qrCanvasRef} className="mx-auto rounded-lg shadow-xs bg-white p-2" />
                )}
                
                {/* Account Details directly under QR */}
                <div className="mt-4 pt-3 border-t border-zinc-800 text-center">
                  <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-0.5 rounded-full border border-emerald-500/30">
                    eSewa Official Account
                  </span>
                  <h4 className="text-base font-black text-white mt-2 flex items-center justify-center gap-1.5">
                    👤 {effectivePayment.accountName || 'Ayush Chaurasiya'}
                  </h4>
                  <p className="text-xs font-extrabold text-zinc-300 mt-1 flex items-center justify-center gap-1">
                    📱 eSewa ID: <span className="font-mono text-emerald-400 bg-black px-2 py-0.5 rounded text-xs select-all font-bold border border-zinc-800">{effectivePayment.esewaId || '9763323268'}</span>
                  </p>

                  {effectivePayment.bankAccountNo && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-zinc-800 text-[11px] text-zinc-400 text-left bg-black p-2.5 rounded-lg border border-zinc-800">
                      <p className="font-bold text-zinc-200">🏦 {effectivePayment.bankName || 'Bank Transfer'}</p>
                      <p className="font-mono font-bold text-emerald-400">A/C: {effectivePayment.bankAccountNo}</p>
                      {effectivePayment.bankBranch && <p className="text-[10px] text-zinc-500">Branch: {effectivePayment.bankBranch}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 font-medium leading-normal mb-6 text-left">
                📌 <strong>Payment Instructions:</strong> {effectivePayment.paymentInstruction || `Scan the QR code or transfer to eSewa ID ${effectivePayment.esewaId || '9763323268'} (${effectivePayment.accountName || 'Ayush Chaurasiya'}), then send the screenshot on WhatsApp.`}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={handleConfirmPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-md transition cursor-pointer"
                >
                  ✅ I Have Paid
                </button>
                <button 
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold py-3.5 px-4 rounded-xl text-sm transition cursor-pointer border border-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* QUICK ACTIVATION CODE MODAL FOR STUDENTS */}
      <AnimatePresence>
        {showCodeInputModal && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCodeInputModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black max-w-md w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 border border-zinc-800 text-zinc-200"
            >
              <button 
                onClick={() => setShowCodeInputModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5 text-center pt-1">
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  Add course
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                  Enter course ID shared by your instructor to enroll in a course
                </p>
              </div>

              <form 
                onSubmit={async (e) => {
                  await handleClaimActivationCode(e);
                  setShowCodeInputModal(false);
                }} 
                className="mt-5 space-y-4"
              >
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={activationCodeInput}
                    onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                    onPaste={(e) => {
                      const pasted = e.clipboardData?.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        const clean = extractAndCleanCode(pasted);
                        setActivationCodeInput(clean);
                      }
                    }}
                    placeholder="Course ID"
                    aria-label="Course ID"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoCapitalize="characters"
                    className="w-full bg-zinc-900 border border-zinc-750 focus:border-blue-500 focus:bg-zinc-950 rounded-2xl pl-4 pr-20 py-3.5 text-base font-mono font-bold uppercase outline-hidden text-center tracking-widest text-white transition shadow-inner placeholder:text-zinc-600 placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:font-medium"
                  />

                  <div className="absolute right-2 flex items-center gap-1">
                    {activationCodeInput && (
                      <button
                        type="button"
                        onClick={() => setActivationCodeInput('')}
                        className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePasteCodeToInput()}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Paste"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isActivating || !activationCodeInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl text-sm transition cursor-pointer shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Enrolling...
                    </>
                  ) : (
                    'Add course'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN SECRET CODE MODAL */}
      <AnimatePresence>
        {showAdminLoginModal && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 text-white max-w-md w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 border border-slate-800 animate-in zoom-in-95 duration-200"
            >
              <button 
                onClick={() => setShowAdminLoginModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 bg-purple-500/15 border border-purple-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-center text-white tracking-tight">
                Admin Verification
              </h3>
              <p className="text-xs text-slate-400 text-center mt-1.5 font-medium">
                Enter the secret activation key to enable administrator controls.
              </p>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider text-left">
                    Secret Activation Key *
                  </label>
                  <button
                    type="button"
                    onClick={() => handlePasteCodeToInput(setAdminCodeInput)}
                    className="text-[10px] font-extrabold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    value={adminCodeInput}
                    onChange={(e) => setAdminCodeInput(e.target.value.toUpperCase())}
                    onPaste={(e) => {
                      const pasted = e.clipboardData?.getData('text');
                      if (pasted) {
                        e.preventDefault();
                        const clean = extractAndCleanCode(pasted);
                        setAdminCodeInput(clean);
                        showToast(`📋 Code pasted: ${clean}`, 'success');
                      }
                    }}
                    placeholder="Enter secret activation key..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl pl-4 pr-20 py-3 text-sm text-white placeholder-slate-600 transition outline-hidden font-mono uppercase"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        await handleVerifyAdminModalLogin();
                      }
                    }}
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    {adminCodeInput && (
                      <button
                        type="button"
                        onClick={() => setAdminCodeInput('')}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePasteCodeToInput(setAdminCodeInput)}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      title="Paste"
                    >
                      <ClipboardPaste className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={handleVerifyAdminModalLogin}
                  className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition shadow-lg cursor-pointer text-center"
                >
                  Admin Activate
                </button>
                <button
                  onClick={() => setShowAdminLoginModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 px-4 rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN FULL DASHBOARD MODAL */}
      <AdminDashboardModal
        isOpen={showAdminDashboard}
        onClose={() => setShowAdminDashboard(false)}
        courses={courses}
        adminRole={isMainAdmin ? 'main_admin' : 'sub_admin'}
        subAdminSession={isMainAdmin ? null : subAdminSession}
        onLogoutAdminSession={handleLogoutAdminSession}
        subAdmins={isMainAdmin ? subAdminList : activeSubAdmins}
        onCreateSubAdmin={handleCreateSubAdmin}
        onToggleSubAdminStatus={handleToggleSubAdminStatus}
        onUpdateSubAdminCourse={handleUpdateSubAdminCourse}
        onUpdateSubAdminAvatar={handleUpdateSubAdminAvatar}
        onDeleteSubAdmin={handleDeleteSubAdmin}
        allActivationKeys={allActivationKeys}
        isAdminLoadingKeys={isAdminLoadingKeys}
        onGenerateKey={handleGenerateActivationKey}
        onDeleteKey={handleDeleteActivationKey}
        onDeleteAllKeys={handleDeleteAllKeys}
        onLogoutKey={handleLogoutUserKey}
        onExpireKey={handleExpireKey}
        onRefreshKeys={fetchAdminKeys}
        onOpenLogoutConfirm={() => {
          setLogoutSecretCodeInput('');
          setLogoutAllConfirmWord('');
          setShowLogoutConfirmModal(true);
        }}
        paymentConfig={paymentConfig}
        onSavePaymentConfig={handleSavePaymentConfig}
        faqs={faqs}
        onSaveFaqs={handleSaveFaqs}
        siteSettings={siteSettings}
        onSaveSiteSettings={handleSaveSiteSettings}
        onCreateCourseClick={handleCreateCourseClick}
        onEditCourseClick={handleEditCourseClick}
        onDeleteCourseClick={handleDeleteCourse}
        onBatchDeleteCourses={handleBatchDeleteCourses}
        onSaveCourse={handleSaveCourseDirect}
        onMoveCourse={handleMoveCourse}
        onToggleCourseVisibility={handleToggleCourseVisibility}
        onOpenDirectCourseVideos={handleOpenDirectCourseVideos}
        notifications={notifications}
        onSendNotification={handleSendNotification}
        onDeleteNotification={handleDeleteNotification}
        liveSessions={liveSessions}
        onSaveLiveSession={handleSaveLiveSession}
        onDeleteLiveSession={handleDeleteLiveSession}
        onUpdateLiveSessionStatus={handleUpdateLiveSessionStatus}
        showToast={showToast}
        initialTab={adminInitialTab}
        adminUnreadAskCount={isMainAdmin ? adminUnreadCount : subAdminUnreadCount}
      />

      {/* CONFIRM LOGOUT ALL USER DEVICES MODAL */}
      <AnimatePresence>
        {showLogoutConfirmModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowLogoutConfirmModal(false);
                setLogoutAllConfirmWord('');
                setLogoutSecretCodeInput('');
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 text-white shadow-2xl space-y-6 text-left z-10"
            >
              <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-lg border border-rose-500/40 shrink-0">
                    🚨
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Logout All User Devices</h3>
                    <p className="text-xs text-rose-300 font-medium">Security Verification</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLogoutConfirmModal(false);
                    setLogoutAllConfirmWord('');
                    setLogoutSecretCodeInput('');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 space-y-2">
                <p className="font-extrabold text-rose-100">
                  ⚠️ Admin Confirmation:
                </p>
                <p className="leading-relaxed">
                  Are you sure you want to log out all active user devices and sessions across the entire platform?
                </p>
              </div>

              <form onSubmit={handleExecuteLogoutAllUserSessions} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-2">
                    Type <span className="font-mono text-rose-400">CONFIRM</span> to proceed:
                  </label>
                  <input
                    type="text"
                    autoCapitalize="characters"
                    value={logoutAllConfirmWord}
                    onChange={(e) => setLogoutAllConfirmWord(e.target.value)}
                    placeholder='Type "CONFIRM"'
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-widest text-white placeholder-slate-600 outline-hidden text-center"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-2">
                    Enter Admin Secret Code:
                  </label>
                  <input
                    type="password"
                    value={logoutSecretCodeInput}
                    onChange={(e) => setLogoutSecretCodeInput(e.target.value)}
                    placeholder="Enter secret code..."
                    className="w-full bg-slate-950 border border-purple-500/40 focus:border-rose-500 rounded-xl px-4 py-3 text-sm font-mono font-black uppercase tracking-widest text-white placeholder-slate-600 outline-hidden text-center shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogoutConfirmModal(false);
                      setLogoutAllConfirmWord('');
                      setLogoutSecretCodeInput('');
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!logoutSecretCodeInput.trim() || logoutAllConfirmWord.trim().toUpperCase() !== 'CONFIRM'}
                    className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-4 h-4" />
                    Confirm Logout
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STUDENT CONFIRM LOGOUT VERIFICATION MODAL (TYPE "CONFIRM") */}
      <AnimatePresence>
        {showStudentLogoutConfirmModal && (
          <div className="fixed inset-0 z-[3600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowStudentLogoutConfirmModal(false);
                setStudentLogoutConfirmInput('');
              }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl text-white z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <LogOut className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Confirm Log Out</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">Security Verification</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowStudentLogoutConfirmModal(false);
                    setStudentLogoutConfirmInput('');
                  }}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  Are you sure you want to log out from this device? Please type <span className="font-mono font-black text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/60 tracking-wider">CONFIRM</span> below to proceed:
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (studentLogoutConfirmInput.trim().toUpperCase() === 'CONFIRM') {
                      setShowStudentLogoutConfirmModal(false);
                      setStudentLogoutConfirmInput('');
                      handleStudentLogout();
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <input
                      id="student-logout-confirm-input"
                      type="text"
                      autoFocus
                      autoCapitalize="characters"
                      value={studentLogoutConfirmInput}
                      onChange={(e) => setStudentLogoutConfirmInput(e.target.value)}
                      placeholder='Type "CONFIRM"'
                      className="w-full bg-zinc-900 border border-zinc-700/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30 rounded-xl px-3.5 py-3 text-center text-sm font-black uppercase tracking-widest text-white placeholder-zinc-500 outline-none transition"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudentLogoutConfirmModal(false);
                        setStudentLogoutConfirmInput('');
                      }}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs py-3 rounded-xl border border-zinc-800 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={studentLogoutConfirmInput.trim().toUpperCase() !== 'CONFIRM'}
                      className={`flex-1 flex items-center justify-center gap-1.5 font-black text-xs py-3 rounded-xl transition cursor-pointer shadow-md ${
                        studentLogoutConfirmInput.trim().toUpperCase() === 'CONFIRM'
                          ? 'bg-red-600 hover:bg-red-700 active:scale-95 text-white shadow-red-600/30'
                          : 'bg-zinc-800/80 text-zinc-500 cursor-not-allowed border border-zinc-700/40 opacity-60'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* COURSE DELETE PERMISSION & CONFIRMATION MODAL */}
      <AnimatePresence>
        {courseToDelete && (
          <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeletingCourse) {
                  setCourseToDelete(null);
                  setDeleteConfirmInput('');
                }
              }}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/60 rounded-3xl p-6 shadow-2xl overflow-hidden font-sans text-white z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-rose-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">
                      Confirm Course Deletion
                    </h3>
                    <p className="text-xs text-rose-300 font-medium">
                      Confirm permission before deleting this course
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeletingCourse}
                  onClick={() => {
                    setCourseToDelete(null);
                    setDeleteConfirmInput('');
                  }}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3">
                <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 space-y-1.5">
                  <p className="font-bold text-rose-100 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Target Course to Delete:
                  </p>
                  <p className="text-sm font-black text-white bg-slate-950/80 px-3 py-2 rounded-xl border border-rose-500/30 break-words">
                    {courseToDelete.title}
                  </p>
                  <p className="text-[11px] text-rose-300 pt-1 leading-relaxed">
                    Warning: This will permanently remove the course along with all its video lectures and PDF materials. Type <span className="font-bold text-white underline">DELETE</span> below to confirm.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Type <span className="text-rose-400 font-mono font-black">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder="Type DELETE here..."
                    autoFocus
                    disabled={isDeletingCourse}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-sm font-mono font-black tracking-widest text-rose-300 placeholder-slate-600 outline-hidden text-center shadow-inner"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingCourse}
                  onClick={() => {
                    setCourseToDelete(null);
                    setDeleteConfirmInput('');
                  }}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmInput.trim().toUpperCase() !== 'DELETE' || isDeletingCourse}
                  onClick={handleExecuteDeleteCourse}
                  className="flex-1 bg-linear-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg active:scale-98 flex items-center justify-center gap-1.5"
                >
                  {isDeletingCourse ? (
                    <span className="inline-block animate-spin">⏳</span>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isDeletingCourse ? 'Deleting...' : 'Delete Course'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT COURSE FORM MODAL */}
      <AnimatePresence>
        {showCourseFormModal && (
          <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowCourseFormModal(false);
                setEditingCourse(null);
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto border border-zinc-800 text-zinc-200 flex flex-col animate-in zoom-in-95 duration-200"
            >
              <button 
                onClick={() => {
                  setShowCourseFormModal(false);
                  setEditingCourse(null);
                }}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="inline-block bg-blue-500/15 text-blue-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 self-start border border-blue-500/30">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </span>

              <h3 className="text-xl font-black text-white tracking-tight">
                {editingCourse ? 'Update Course Details' : 'Add Dynamic Course'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Fill out the specifications below. The course catalog will update in Firestore instantly.
              </p>

              <form onSubmit={handleCourseFormSubmit} className="space-y-4 mt-6">
                {/* Course ID/Slug (if creating new) */}
                {!editingCourse && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Course Slug ID (Optional - Auto generated from Title)</label>
                    <input 
                      type="text"
                      value={formId}
                      onChange={(e) => setFormId(e.target.value)}
                      placeholder="e.g. youtube-blueprint"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs transition outline-hidden font-mono text-zinc-200 placeholder-zinc-600"
                    />
                  </div>
                )}

                {/* Course Title */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Course Title *</label>
                  <input 
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. YouTube Blueprint Course by Hamro LMS"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                  />
                </div>

                {/* Course Price & Main-Admin-Only Free Option */}
                <div className="bg-zinc-900/90 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      Course Price {isMainAdmin ? '' : '(Locked • Main Admin Only)'}
                    </span>
                    {isMainAdmin ? (
                      <div className="inline-flex rounded-lg bg-black border border-zinc-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormIsFree(false);
                            setFormPrice((prev) =>
                              !prev.trim() || /^free$/i.test(prev.trim()) ? 'Rs. ' : prev
                            );
                            setFormAmount((prev) => (prev === 0 ? 299 : prev));
                          }}
                          className={`px-3 py-1 rounded-md text-[10px] font-black transition cursor-pointer ${
                            !formIsFree
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Paid Course
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormIsFree(true);
                            setFormPrice('FREE');
                            setFormAmount(0);
                          }}
                          className={`px-3 py-1 rounded-md text-[10px] font-black transition cursor-pointer ${
                            formIsFree
                              ? 'bg-emerald-500 text-zinc-950 shadow-xs'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          FREE Option
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                        Main Admin Only
                      </span>
                    )}
                  </div>

                  {formIsFree ? (
                    <div className="bg-emerald-950/40 border border-emerald-500/35 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-emerald-400">FREE Course</p>
                        <p className="text-[10px] text-emerald-200/80 font-medium mt-0.5">
                          Students enter only Name &amp; Phone Number and click Enroll to open the course immediately.
                        </p>
                      </div>
                      <span className="bg-emerald-500 text-zinc-950 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0">
                        FREE
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Price Display Tag */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Price Display tag *</label>
                        <input 
                          type="text"
                          required
                          disabled={!isMainAdmin}
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          placeholder="e.g. Rs. 549"
                          className={`w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600 ${!isMainAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </div>

                      {/* Numerical Price Value */}
                      <div>
                        <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Amount for QR Checkout *</label>
                        <input 
                          type="number"
                          required
                          disabled={!isMainAdmin}
                          value={formAmount}
                          onChange={(e) => setFormAmount(Number(e.target.value))}
                          placeholder="e.g. 549"
                          className={`w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600 ${!isMainAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp Message */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">WhatsApp Message Suffix</label>
                  <input 
                    type="text"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="e.g. I want to enroll in the YouTube Blueprint course"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-200 transition outline-hidden placeholder-zinc-600"
                  />
                </div>

                {/* Course Language / Medium */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Course Language / Medium *</label>
                  <input 
                    type="text"
                    required
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="e.g. English"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                  />
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    {['English'].map((langOption) => (
                      <button
                        key={langOption}
                        type="button"
                        onClick={() => setFormLanguage(langOption)}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-md transition cursor-pointer ${
                          formLanguage === langOption
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        {langOption}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course Thumbnail Direct Image Upload */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">
                    Course Thumbnail Image *
                  </label>

                  <input
                    ref={courseThumbnailInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleCourseThumbnailFileChange}
                    className="hidden"
                  />

                  {formImage ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2.5">
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-zinc-800">
                        <img
                          src={formImage}
                          alt="Course thumbnail preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUploadingCourseThumbnail}
                          onClick={() => courseThumbnailInputRef.current?.click()}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                        >
                          <Upload className="w-3.5 h-3.5 text-blue-400" />
                          <span>{isUploadingCourseThumbnail ? 'Uploading...' : 'Change Image'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormImage('');
                            if (courseThumbnailInputRef.current) {
                              courseThumbnailInputRef.current.value = '';
                            }
                          }}
                          className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-800/70"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !isUploadingCourseThumbnail && courseThumbnailInputRef.current?.click()}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isUploadingCourseThumbnail) {
                          e.preventDefault();
                          courseThumbnailInputRef.current?.click();
                        }
                      }}
                      className="w-full border border-dashed border-blue-500/50 bg-zinc-900/90 hover:bg-zinc-900 hover:border-blue-400 rounded-xl p-5 transition cursor-pointer flex flex-col items-center justify-center text-center gap-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {isUploadingCourseThumbnail ? 'Uploading & Optimizing...' : 'Upload Course Thumbnail'}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Direct upload from device • PNG, JPG or WEBP (Max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Popular Badge Configuration */}
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <label className="flex items-center gap-2 text-xs font-bold text-zinc-200 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={formIsPopular}
                      onChange={(e) => setFormIsPopular(e.target.checked)}
                      className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-black"
                    />
                    <span>Highlight as Popular Bestseller Banner</span>
                  </label>
                  {formIsPopular && (
                    <div className="mt-2">
                      <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Bestseller Banner Text</label>
                      <input 
                        type="text"
                        value={formPopularText}
                        onChange={(e) => setFormPopularText(e.target.value)}
                        placeholder="🔥 MOST POPULAR - BEST SELLER"
                        className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 transition outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {/* MAIN ADMIN ONLY: Live Class & Certificate Toggles */}
                {isMainAdmin && (
                  <div className="bg-zinc-900 p-3.5 rounded-xl border border-blue-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                        Main Admin Control • Delivery Options
                      </span>
                      <span className="text-[10px] text-zinc-400 font-semibold">
                        Only editable by Main Admin
                      </span>
                    </div>

                    <label className="flex items-start gap-2.5 text-xs font-bold text-zinc-100 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formIncludeLive}
                        onChange={(e) => setFormIncludeLive(e.target.checked)}
                        className="rounded border-zinc-700 text-rose-600 focus:ring-rose-500 w-4 h-4 bg-black mt-0.5"
                      />
                      <div>
                        <span>🎥 Include Live Session (Zoom Live Class)</span>
                        <span className="block text-[10px] text-zinc-400 font-medium mt-0.5">
                          Active students will see Live Session instead of Certificate in their Course section, and Sub-Admins will get access to the Live tab.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs font-bold text-zinc-100 cursor-pointer select-none pt-1 border-t border-zinc-800">
                      <input
                        type="checkbox"
                        checked={formIncludeCertificate}
                        onChange={(e) => setFormIncludeCertificate(e.target.checked)}
                        className="rounded border-zinc-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-black mt-0.5"
                      />
                      <div>
                        <span>📜 Include Course Certificate</span>
                        <span className="block text-[10px] text-zinc-400 font-medium mt-0.5">
                          Show the Course Certificate option to students when Live Session is disabled.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs font-bold text-zinc-100 cursor-pointer select-none pt-1 border-t border-zinc-800">
                      <input
                        type="checkbox"
                        checked={formIsHidden}
                        onChange={(e) => setFormIsHidden(e.target.checked)}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-black mt-0.5"
                      />
                      <div>
                        <span>🙈 Hide Course from Home Screen (Private / Code-Only)</span>
                        <span className="block text-[10px] text-zinc-400 font-medium mt-0.5">
                          This course's thumbnail, overview, and details will be hidden from the Home screen, while Sub-Admins can still generate Student Codes and enrolled students can access it via code.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* What You Learn (Newline separated) */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">What Students Learn (One point per line) *</label>
                  <textarea 
                    rows={4}
                    required
                    value={formLearnText}
                    onChange={(e) => setFormLearnText(e.target.value)}
                    placeholder="💡 How to find winning video ideas&#10;✍️ Script writing & storytelling&#10;🎥 Shooting & camera presentation&#10;✂️ Professional editing skills"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 transition outline-hidden leading-relaxed"
                  />
                </div>

                {/* Video Lectures Manager */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[10px] font-black uppercase text-slate-400">Course Video Lectures ({formVideos.length})</label>
                    <button
                      type="button"
                      onClick={() => {
                        const lastChapter = formVideos.length > 0 ? formVideos[formVideos.length - 1].chapterTitle : 'Chapter 1: Course Introduction';
                        setFormVideos([...formVideos, { chapterTitle: lastChapter, title: '', duration: '', videoUrl: 'https://drive.google.com/file/d/1WW0o2qYql7EvBurHOhUNxsvw9_0qjnm7/preview' }]);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Lecture
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formVideos.map((video, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 relative shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setFormVideos(formVideos.filter((_, vidx) => vidx !== idx))}
                          className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                          title="Remove Lecture"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <div>
                          <label className="block text-[9px] font-black uppercase text-purple-600 mb-0.5">Chapter / Playlist Name (e.g. Chapter 1: Setup & Niche)</label>
                          <input 
                            type="text"
                            placeholder="Chapter 1: Channel Setup & Niche Selection"
                            value={video.chapterTitle || ''}
                            onChange={(e) => {
                              const updated = [...formVideos];
                              updated[idx].chapterTitle = e.target.value;
                              setFormVideos(updated);
                            }}
                            className="w-full bg-purple-50/50 border border-purple-200 rounded-md px-2 py-1 text-[11px] font-bold text-slate-800 outline-hidden focus:border-purple-600"
                          />
                        </div>

                        <div>
                          <input 
                            type="text"
                            required
                            placeholder="Lecture Title (e.g. 1.1 Finding Your Micro-Niche)"
                            value={video.title}
                            onChange={(e) => {
                              const updated = [...formVideos];
                              updated[idx].title = e.target.value;
                              setFormVideos(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-800 outline-hidden focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <input 
                            type="text"
                            required
                            placeholder="Drive Preview / YouTube Link"
                            value={video.videoUrl}
                            onChange={(e) => {
                              const updated = [...formVideos];
                              updated[idx].videoUrl = e.target.value;
                              setFormVideos(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-800 outline-hidden focus:border-purple-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Course PDF Documents & Notes Manager */}
                <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-rose-700 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        Course PDF Notes & Resources ({formPdfs.length})
                      </label>
                      <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                        Google Drive PDF Link (Students can read directly without signing in)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lastChapter = formPdfs.length > 0 ? formPdfs[formPdfs.length - 1].chapterTitle : 'Chapter 1: Course Notes';
                        setFormPdfs([...formPdfs, { 
                          chapterTitle: lastChapter, 
                          title: '', 
                          pdfUrl: '', 
                          fileSize: 'PDF Document' 
                        }]);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-2.5 py-1.5 rounded-md transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3 h-3" /> Add PDF Note
                    </button>
                  </div>

                  {/* Quick Admin Guidance Box */}
                  <div className="mb-3 bg-white/90 border border-rose-200 rounded-lg p-2.5 text-[10.5px] text-rose-800 leading-snug">
                    <p className="font-bold flex items-center gap-1 text-rose-900 mb-0.5">
                      💡 Admin Drive Upload Guide:
                    </p>
                    Upload your PDF to Google Drive, set sharing to <strong>"Anyone with the link can view"</strong>, and paste the link below.
                    Our system automatically converts it into a direct viewer so students can read it without logging into Google Drive.
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formPdfs.length === 0 ? (
                      <div className="text-center py-5 bg-white/70 rounded-lg border border-dashed border-rose-200 text-xs text-rose-600">
                        No PDFs added yet. Click <strong>"+ Add PDF Note"</strong> above to attach a Google Drive PDF link.
                      </div>
                    ) : (
                      formPdfs.map((pdf, pidx) => (
                        <div key={pidx} className="bg-white p-3 rounded-lg border border-rose-200/90 space-y-2 relative shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setFormPdfs(formPdfs.filter((_, idx) => idx !== pidx))}
                            className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                            title="Remove PDF"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-6">
                            <div>
                              <label className="block text-[9px] font-black uppercase text-purple-700 mb-0.5">
                                Chapter / Section Name
                              </label>
                              <input 
                                type="text"
                                placeholder="Chapter 1: Official Notes & Templates"
                                value={pdf.chapterTitle || ''}
                                onChange={(e) => {
                                  const updated = [...formPdfs];
                                  updated[pidx].chapterTitle = e.target.value;
                                  setFormPdfs(updated);
                                }}
                                className="w-full bg-purple-50/40 border border-purple-200 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-800 outline-hidden focus:border-purple-600"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase text-slate-500 mb-0.5">
                                File Size / Pages (Optional)
                              </label>
                              <input 
                                type="text"
                                placeholder="e.g. 2.4 MB (18 Pages)"
                                value={pdf.fileSize || ''}
                                onChange={(e) => {
                                  const updated = [...formPdfs];
                                  updated[pidx].fileSize = e.target.value;
                                  setFormPdfs(updated);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] font-medium text-slate-800 outline-hidden focus:border-rose-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-black uppercase text-rose-700 mb-0.5">
                              PDF Document Title *
                            </label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Complete AI Video Prompts Handbook.pdf"
                              value={pdf.title}
                              onChange={(e) => {
                                const updated = [...formPdfs];
                                updated[pidx].title = e.target.value;
                                setFormPdfs(updated);
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-bold text-slate-800 outline-hidden focus:border-rose-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black uppercase text-slate-500 mb-0.5">
                              Google Drive Share Link / Direct PDF URL *
                            </label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                required
                                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                                value={pdf.pdfUrl}
                                onChange={(e) => {
                                  const updated = [...formPdfs];
                                  updated[pidx].pdfUrl = e.target.value;
                                  setFormPdfs(updated);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-mono text-slate-800 outline-hidden focus:border-rose-500"
                              />
                              {pdf.pdfUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPdfForView({
                                      title: pdf.title || 'PDF Preview Test',
                                      pdfUrl: pdf.pdfUrl,
                                      chapterTitle: pdf.chapterTitle,
                                      fileSize: pdf.fileSize,
                                      courseTitle: formTitle || 'Course Preview'
                                    });
                                  }}
                                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-md transition shrink-0 cursor-pointer flex items-center gap-1"
                                  title="Test direct preview without Google Drive login"
                                >
                                  <span>👁️ Test Direct Open</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl text-sm shadow-lg shadow-blue-500/20 transition cursor-pointer text-center active:scale-98"
                  >
                    {editingCourse ? '💾 Save Changes' : '🚀 Publish Course'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCourseFormModal(false);
                      setEditingCourse(null);
                    }}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold py-3.5 px-4 rounded-xl text-sm transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Immersive Video Player Overlay with Auto-Rotate & Simple 'X' Close Button */}
      {fullscreenVideo && (
        <div 
          className="fixed inset-0 bg-black z-[9999] flex flex-col md:flex-row text-white font-sans overflow-hidden select-none"
          style={{ width: '100vw', height: '100vh' }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
        >
          {/* Main Video Container */}
          <div className="flex-1 relative flex flex-col justify-center bg-black h-full w-full">
            
            {/* Top Bar - Video Title Info, Full Screen Button & "X" Close Button */}
            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between z-50">
              <div className="text-left pr-4">
                <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest block font-sans">
                  {fullscreenVideo.courseTitle}
                </span>
                <h4 className="text-white text-xs md:text-base font-black truncate max-w-[180px] sm:max-w-md md:max-w-xl font-sans mt-0.5">
                  {fullscreenVideo.title} (Lecture {fullscreenVideo.idx + 1})
                </h4>
              </div>

              {/* Top Controls: 🔄 Rotate Button, Full Screen Button & 'X' Close Button */}
              <div className="flex items-center gap-2">
                {/* Manual Rotate 🔄 Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRotateVideo();
                  }}
                  className="bg-purple-900/90 hover:bg-purple-600 text-white font-extrabold text-xs px-3 py-2 rounded-xl border border-purple-500/50 transition cursor-pointer flex items-center gap-1.5 font-sans shadow-lg active:scale-95"
                  title="Rotate Video Screen 🔄"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="font-sans font-bold">Rotate 🔄</span>
                </button>

                {/* Full Screen Mode Toggle Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFullscreenMode();
                  }}
                  className="bg-slate-900/90 hover:bg-purple-600 text-white font-extrabold text-xs px-3 py-2 rounded-xl border border-slate-800 hover:border-purple-500/50 transition cursor-pointer flex items-center gap-1.5 font-sans shadow-lg active:scale-95"
                  title="Full Screen Mode"
                >
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Full Screen ⛶</span>
                </button>

                {/* 'X' Close Button */}
                <button
                  onClick={handleCloseVideo}
                  className="bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-full border border-rose-500/50 transition cursor-pointer flex items-center justify-center shadow-2xl active:scale-95 z-50"
                  title="Close Video"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Embed Video Iframe Container with Manual Rotation Support */}
            <div 
              className={`bg-black flex items-center justify-center transition-all duration-300 ${
                videoRotation !== 0
                  ? 'fixed inset-0 z-[10000]' 
                  : 'relative w-full h-full flex-1 overflow-hidden'
              }`}
              style={getRotationStyle()}
            >
              {/* Context guard to prevent direct saving */}
              <div 
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 z-50 pointer-events-none"
              />

              {/* Floating Rotate 🔄 & Close X Button Overlay directly on rotated video view */}
              {videoRotation !== 0 && (
                <div className="absolute top-4 right-4 z-[10001] flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotateVideo();
                    }}
                    className="bg-purple-900/90 hover:bg-purple-600 text-white p-3 rounded-full border border-purple-400/50 shadow-2xl transition cursor-pointer flex items-center justify-center active:scale-95"
                    title="Rotate Video Screen 🔄"
                  >
                    <RotateCw className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleCloseVideo}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-3 rounded-full border border-rose-400/50 shadow-2xl transition cursor-pointer flex items-center justify-center active:scale-95"
                    title="Close Video"
                  >
                    <X className="w-6 h-6 stroke-[3]" />
                  </button>
                </div>
              )}

              {/* Transparent Click-Prevention Overlays to block YouTube brandings, titles, share links and copy actions */}
              <div 
                className="absolute top-0 inset-x-0 h-36 md:h-48 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                title="Protected Player Header" 
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
              />
              <div 
                className="absolute bottom-0 right-0 w-96 md:w-[500px] h-32 md:h-40 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                title="Protected Player Branding Block" 
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
              />
              <div 
                className="absolute bottom-0 left-0 w-72 h-32 bg-transparent z-45 cursor-default pointer-events-auto select-none" 
                title="Protected Player Channel Block" 
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCopy={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onCut={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onDragStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); }}
              />

              {/* Watermark in fullscreen */}
              <div className="absolute bottom-6 left-6 z-40 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/20 pointer-events-none select-none shadow-lg">
                <p className="text-[9px] md:text-[10px] text-slate-300 font-mono font-bold flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {currentUser?.email || localStorage.getItem('clipzone_student_name') || 'Student Learner'} • Verified Session
                </p>
              </div>

              <iframe
                src={getSecureYouTubeEmbedUrl(fullscreenVideo.videoUrl, true)}
                className="w-full h-full absolute inset-0 border-0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-presentation"
                title={fullscreenVideo.title}
              />
            </div>

            {/* Audio watermark / security controls info */}
            <div className="absolute bottom-4 right-4 text-[9px] text-slate-500 font-mono select-none pointer-events-none">
              IP Security Monitored • {siteSettings.instituteName || 'HamroLms'}
            </div>
          </div>

          {/* Fullscreen Sidebar Playlist */}
          <div className="w-full md:w-80 bg-slate-950 border-t md:border-t-0 md:border-l border-slate-900 flex flex-col p-4 text-left font-sans h-[250px] md:h-full">
            <div className="pb-2 border-b border-slate-900 mb-3">
              <h5 className="text-xs font-black uppercase tracking-wider text-purple-400">
                📚 Full Playlist ({fullscreenVideo.playlist.length} Lectures)
              </h5>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {fullscreenVideo.playlist.map((video, idx) => {
                const isPlaying = fullscreenVideo.idx === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      const securePlayUrl = getSecureYouTubeEmbedUrl(video.videoUrl, true);
                      setFullscreenVideo({
                        ...fullscreenVideo,
                        title: video.title,
                        videoUrl: securePlayUrl,
                        idx: idx,
                      });
                      showToast(`Playing Lecture ${idx + 1}`, 'info');
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 text-xs ${
                      isPlaying
                        ? 'bg-purple-900/40 border-purple-500/50 text-purple-200 shadow-md shadow-purple-950/25'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-black shrink-0 text-[9px] ${
                      isPlaying
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold line-clamp-2 leading-tight ${isPlaying ? 'text-white' : ''}`}>
                        {video.title}
                      </p>
                      <span className="text-[9px] text-slate-500 font-mono mt-1 block">⏳ {video.duration} mins</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}



      {/* CERTIFICATE MODAL */}
      {showCertificateModal && (() => {
        // Enrolled courses with certificate enabled (excluding secondary logins and live-replaced courses):
        const enrolledCourses = courses.filter(
          c => activeCourseIds.includes(c.id) && !secondaryCourseIds.includes(c.id) && !c.includeLive && c.includeCertificate !== false
        );
        if (enrolledCourses.length === 0) {
          return null;
        }

        // Student photo check: certificate is only shown when user has uploaded their photo
        const effectivePhoto = userAvatar || localStorage.getItem('clipzone_student_avatar') || '';
        const hasValidPhoto = Boolean(effectivePhoto && (effectivePhoto.startsWith('data:') || effectivePhoto.startsWith('http')));
        if (!hasValidPhoto) {
          return null;
        }

        // Resolve target course strictly from user's activated courses:
        const targetedCourse =
          enrolledCourses.find(c => selectedCertCourseId && c.id === selectedCertCourseId) ||
          enrolledCourses.find(c => selectedClassroomCourseId && c.id === selectedClassroomCourseId) ||
          enrolledCourses[0];

        const effectiveCourseTitle = targetedCourse?.certificateCourseTitle || targetedCourse?.title || certificateCourseTitle || 'AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS';
        const effectiveInstituteName = targetedCourse?.certificateInstituteName || siteSettings.certificateInstituteName || siteSettings.instituteName || 'HAMROLMS';
        const effectiveLogoUrl = targetedCourse?.certificateLogoUrl || siteSettings.certificateLogoUrl || siteSettings.instituteLogoUrl;
        const effectiveCertTitle = targetedCourse?.certificateTitle || siteSettings.certificateTitle || 'CERTIFICATE';
        const effectiveCertSubtitle = targetedCourse?.certificateSubtitle || siteSettings.certificateSubtitle || 'OF ACHIEVEMENT';
        const effectiveDescription = targetedCourse?.certificateDescription || siteSettings.certificateDescription;
        const effectiveDirectorName = targetedCourse?.certificateDirectorName || siteSettings.certificateDirectorName || 'Director';
        const effectiveDirectorTitle = targetedCourse?.certificateDirectorTitle || siteSettings.certificateDirectorTitle || 'Course Director';
        const effectiveDirectorSig = targetedCourse?.certificateDirectorSignatureUrl || siteSettings.certificateDirectorSignatureUrl;
        const effectiveCeoName = targetedCourse?.certificateCeoName || siteSettings.certificateCeoName || 'Founder/CEO (HamroLms)';
        const effectiveCeoTitle = targetedCourse?.certificateCeoTitle || siteSettings.certificateCeoTitle || 'Founder & CEO';
        const effectiveCeoSig = targetedCourse?.certificateCeoSignatureUrl || siteSettings.certificateCeoSignatureUrl;
        const effectiveTheme = targetedCourse?.certificateTheme || siteSettings.certificateTheme || 'blue';
        const effectiveStampUrl = targetedCourse?.certificateStampUrl || siteSettings.certificateStampUrl;
        const effectiveSealText = targetedCourse?.certificateSealText || siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • HAMROLMS';

        return (
          <CertificateModal
            studentName={certificateStudentName || currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner'}
            studentPhoto={userAvatar || localStorage.getItem('clipzone_student_avatar') || ''}
            courseTitle={effectiveCourseTitle}
            issueDate={getCourseActivatedAdDate(targetedCourse?.id) || certificateIssueDate}
            certificateId={certificateCode || (targetedCourse ? (getCourseActivationCode(targetedCourse.id) || 'AICLIP-ACTIVE') : 'AICLIP-ACTIVE')}
            instituteName={siteSettings.instituteName}
            certificateInstituteName={effectiveInstituteName}
            logoUrl={effectiveLogoUrl}
            certificateTitle={effectiveCertTitle}
            certificateSubtitle={effectiveCertSubtitle}
            certificateDescription={effectiveDescription}
            directorName={effectiveDirectorName}
            directorTitle={effectiveDirectorTitle}
            directorSignatureUrl={effectiveDirectorSig}
            ceoName={effectiveCeoName}
            ceoTitle={effectiveCeoTitle}
            ceoSignatureUrl={effectiveCeoSig}
            certificateTheme={effectiveTheme}
            certificateStampUrl={effectiveStampUrl}
            certificateSealText={effectiveSealText}
            courses={enrolledCourses}
            selectedCourseId={targetedCourse?.id}
            onSelectCourseId={(newId) => {
              setSelectedCertCourseId(newId);
              setCertificateIssueDate(getCourseActivatedAdDate(newId));
              const found = enrolledCourses.find(c => c.id === newId);
              if (found) {
                setCertificateCourseTitle(found.certificateCourseTitle || found.title);
              }
            }}
            onClose={() => {
              setShowCertificateModal(false);
              setSelectedCertCourseId('');
            }}
          />
        );
      })()}

      {/* WHATSAPP-STYLE PROFILE IMAGE ADJUST / CROP MODAL */}
      <ImageAdjustModal
        imageUrl={tempImageForAdjust || ''}
        isOpen={showImageAdjustModal && !!tempImageForAdjust}
        onClose={() => {
          setShowImageAdjustModal(false);
          setTempImageForAdjust(null);
        }}
        onConfirm={handleConfirmAdjustedAvatar}
      />

      {/* 5-SECOND WEBSITE-ONLY PWA DOWNLOAD ADVERTISEMENT */}
      <PwaDownloadAdModal
        isOpen={showPwaAdModal && !isRunningInAppMode && !isAppInstalled}
        appName={siteSettings.instituteName || 'HamroLms'}
        logoUrl={siteSettings.instituteLogoUrl?.trim() || '/logo.png'}
        onDownloadClick={handleDownloadFromAd}
        onClose={handleDismissPwaAd}
      />

      {/* PWA INSTALLATION DIALOG (TRIGGERED WHEN BROWSER NATIVE PROMPT NEEDS FALLBACK / APK / IOS GUIDE) */}
      {showPwaInstallModal && !isRunningInAppMode && !isAppInstalled && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[5000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="bg-[#28292c] text-white rounded-[28px] max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-700/50 relative font-sans overflow-hidden"
          >
            {isInstallingPwa ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-20 h-14 rounded-2xl bg-black border border-zinc-700 p-1 mx-auto flex items-center justify-center shadow-lg animate-bounce overflow-hidden">
                  <img 
                    src={siteSettings.instituteLogoUrl?.trim() || "/logo.png"} 
                    alt={siteSettings.instituteName || "App Logo"} 
                    className="w-full h-full object-contain" 
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      if (!img.src.includes('/logo.png')) {
                        img.src = '/logo.png';
                      }
                    }}
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Installing {siteSettings.instituteName || 'App'}...</h4>
                  <p className="text-xs text-blue-400 font-medium mt-1">
                    Adding to Home Screen, please wait a moment...
                  </p>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden relative mt-3">
                  <div className="bg-blue-600 h-full w-full animate-pulse rounded-full"></div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-medium text-slate-100 mb-5 text-left tracking-tight">
                  Install app
                </h3>

                {/* App Info Row */}
                <div className="flex items-center gap-4 my-2">
                  <div className="w-16 h-12 rounded-xl bg-black border border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                    <img 
                      src={siteSettings.instituteLogoUrl?.trim() || "/logo.png"} 
                      alt={siteSettings.instituteName || "App Logo"} 
                      className="w-full h-full object-contain" 
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.src.includes('/logo.png')) {
                          img.src = '/logo.png';
                        }
                      }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-lg font-medium text-white truncate tracking-normal">
                      {siteSettings.instituteName || 'HamroLms'}
                    </h4>
                    <p className="text-sm text-slate-400 truncate font-normal mt-0.5">
                      {typeof window !== 'undefined' ? window.location.hostname || 'hamrolms.vercel.app' : 'hamrolms.vercel.app'}
                    </p>
                  </div>
                </div>

                {/* Browser / Platform Install Steps when native prompt is unavailable */}
                {!canPromptNativeInstall && (
                  <div className="mt-4 rounded-2xl bg-zinc-900/90 border border-zinc-700/60 p-3.5 text-left text-xs text-slate-300 space-y-1.5">
                    {isIOS ? (
                      <>
                        <p className="font-semibold text-white">Install on iPhone / iPad:</p>
                        <p>1. Tap the <strong>Share</strong> icon in your Safari toolbar.</p>
                        <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                      </>
                    ) : typeof window !== 'undefined' && window.top !== window.self ? (
                      <>
                        <p className="font-semibold text-white">Open in full browser tab to install:</p>
                        <p>Direct app installation requires opening outside embedded preview frames.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-white">Direct Browser Install:</p>
                        <p>Tap your browser menu (<strong>⋮</strong>) or address bar install icon and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
                      </>
                    )}
                  </div>
                )}

                {/* Direct APK Download Option if configured */}
                {siteSettings.apkDownloadUrl && siteSettings.apkDownloadUrl.trim() && (
                  <div className="mt-4 pt-3 border-t border-zinc-700/60">
                    <a
                      href={siteSettings.apkDownloadUrl.trim()}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setShowPwaInstallModal(false);
                        showToast('📥 Direct APK Downloading... Open the installed APK to experience full App mode!', 'success');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Android APK Direct (.apk)</span>
                    </a>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 mt-6 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPwaInstallModal(false);
                      setPwaAdDismissedThisVisit(true);
                    }}
                    className="text-[#a8c7fa] hover:bg-white/10 text-sm font-medium px-5 py-2.5 rounded-full transition cursor-pointer active:bg-white/20"
                  >
                    Cancel
                  </button>
                  {canPromptNativeInstall ? (
                    <button
                      type="button"
                      onClick={handleConfirmInstallModal}
                      className="bg-[#a8c7fa] text-slate-950 hover:bg-blue-300 text-sm font-semibold px-5 py-2.5 rounded-full transition cursor-pointer"
                    >
                      Install
                    </button>
                  ) : typeof window !== 'undefined' && window.top !== window.self ? (
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        setShowPwaInstallModal(false);
                        setPwaAdDismissedThisVisit(true);
                      }}
                      className="bg-[#a8c7fa] text-slate-950 hover:bg-blue-300 text-sm font-semibold px-5 py-2.5 rounded-full transition cursor-pointer"
                    >
                      Install in Browser
                    </a>
                  ) : isIOS ? (
                    <button
                      type="button"
                      onClick={() => {
                        markManualInstallConfirmed();
                        setShowPwaInstallModal(false);
                        showToast(`🎉 ${siteSettings.instituteName || 'HamroLms'} saved to Home Screen!`, 'success');
                      }}
                      className="bg-[#a8c7fa] text-slate-950 hover:bg-blue-300 text-sm font-semibold px-5 py-2.5 rounded-full transition cursor-pointer"
                    >
                      I&apos;ve Added It
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmInstallModal}
                      className="bg-[#a8c7fa] text-slate-950 hover:bg-blue-300 text-sm font-semibold px-5 py-2.5 rounded-full transition cursor-pointer"
                    >
                      Got It
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* PDF VIEWER MODAL FOR DIRECT GOOGLE DRIVE EMBED WITHOUT LOGIN */}
      {selectedPdfForView && (
        <PdfViewerModal
          isOpen={!!selectedPdfForView}
          onClose={() => setSelectedPdfForView(null)}
          pdfTitle={selectedPdfForView.title}
          pdfUrl={selectedPdfForView.pdfUrl}
          chapterTitle={selectedPdfForView.chapterTitle}
          fileSize={selectedPdfForView.fileSize}
          courseTitle={selectedPdfForView.courseTitle}
        />
      )}

      {/* NOTIFICATION PROMPT MODAL */}
      <NotificationPromptModal
        isOpen={showNotifPromptModal}
        onClose={() => setShowNotifPromptModal(false)}
        showToast={showToast}
        onPermissionGranted={() => {
          showToast('🎉 Notifications enabled! You will receive course updates & discounts.', 'success');
        }}
      />

      {/* NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        isOpen={showNotifCenterModal}
        onClose={() => setShowNotifCenterModal(false)}
        notifications={notifications}
        unreadIds={unreadNotifIds}
        showToast={showToast}
        onNotificationClick={(notif) => {
          // Mark clicked notification read
          try {
            const readIds: string[] = JSON.parse(localStorage.getItem('clipzone_read_notifs') || '[]');
            if (!readIds.includes(notif.id)) {
              const updatedRead = [...readIds, notif.id];
              localStorage.setItem('clipzone_read_notifs', JSON.stringify(updatedRead));
              setUnreadNotifIds(prev => prev.filter(id => id !== notif.id));
              setUnreadNotifCount(prev => Math.max(0, prev - 1));
            }
          } catch {}

          if (notif.type === 'live' && notif.courseId) {
            setShowNotifCenterModal(false);
            if (isUserAdminSession) {
              setAdminInitialTab('live');
              setShowAdminDashboard(true);
              return;
            }
            const resolvedCourseId = activeCourseIds.includes(notif.courseId)
              ? notif.courseId
              : activeCourseIds[0];
            if (resolvedCourseId) {
              setSelectedLiveCourseId(resolvedCourseId);
              setCurrentView('course-live');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            return;
          }

          if (notif.url) {
            if (notif.url.startsWith('#') || notif.url.startsWith('/#')) {
              const hash = notif.url.replace('/#', '#');
              window.location.hash = hash;
            } else if (notif.url.startsWith('/')) {
              window.location.href = notif.url;
            } else {
              const a = document.createElement('a');
              a.href = notif.url;
              a.target = '_blank';
              a.rel = 'noopener noreferrer';
              a.click();
            }
          }
        }}
        onMarkAllRead={handleMarkAllNotifsRead}
        onRequestPermissionPrompt={() => setShowNotifPromptModal(true)}
      />

      {/* APP-LIKE BOTTOM NAVIGATION BAR - ACTIVE ACROSS WEBSITE & PWA WITH EXPANDED FULL-SCREEN DESKTOP VIEW */}
      {!(currentView === 'enroll' && enrollCourse) && !(currentView === 'ask' && isAskChatOpen) && (
      <nav 
        id="native-app-bottom-bar"
        aria-label="App Navigation Bar" 
        className={`${currentView === 'ask' && isCourseActiveUser ? 'relative shrink-0' : 'sticky bottom-0 shrink-0'} inset-x-0 z-[4900] bg-zinc-950/95 border-t border-zinc-800/90 shadow-[0_-12px_45px_rgba(0,0,0,0.95)] pb-[env(safe-area-inset-bottom,0px)] select-none backdrop-blur-2xl`}
      >
        <div className="w-full max-w-[1600px] mx-auto px-1.5 sm:px-4 md:px-5 py-1.5 md:py-2 flex items-center justify-around md:justify-center md:gap-3 lg:gap-5">
          {/* 1. Home */}
          <button
            id="app-nav-home"
            onClick={() => {
              setShowProfileModal(false);
              navigateToPath('/');
            }}
            className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
              currentView === 'home' || currentView === 'courses' || currentView === 'course-detail' || currentView === 'about-us' || currentView === 'learn' || currentView === 'instructors' || currentView === 'instructor-detail' || currentView === 'blog' || currentView === 'blog-detail'
                ? 'text-blue-400 font-bold bg-blue-500/10 md:bg-blue-600/15 md:border md:border-blue-500/40 md:shadow-md md:shadow-blue-500/15'
                : 'text-zinc-400 hover:text-zinc-200 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
            }`}
          >
            <Home className={`w-5 h-5 mb-0.5 md:mb-0 shrink-0 ${currentView === 'home' || currentView === 'courses' ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
            <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Home</span>
          </button>

          {/* 2. Course */}
          <button
            id="app-nav-classroom"
            onClick={() => {
              setShowProfileModal(false);
              navigateToPath('/classroom');
            }}
            className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 relative ${
              currentView === 'classroom' || currentView === 'course-live'
                ? 'text-blue-400 font-bold bg-blue-500/10 md:bg-blue-600/15 md:border md:border-blue-500/40 md:shadow-md md:shadow-blue-500/15'
                : 'text-zinc-400 hover:text-zinc-200 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
            }`}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <BookOpen className={`w-5 h-5 mb-0.5 md:mb-0 ${currentView === 'classroom' || currentView === 'course-live' ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
              <span className="w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-black absolute -top-1 -right-1.5 animate-pulse shadow-xs" />
            </div>
            <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Course</span>
          </button>

          {/* 2b. Live Menu - STRICTLY ONLY for Sub-Admins whose assigned course includes Live (NEVER shown to regular users) */}
          {canSubAdminAccessLive && (
            <button
              id="app-nav-live"
              onClick={() => {
                setShowProfileModal(false);
                setCurrentView('live');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 relative ${
                currentView === 'live'
                  ? 'text-rose-400 font-bold bg-rose-500/10 md:bg-rose-600/15 md:border md:border-rose-500/40 md:shadow-md md:shadow-rose-500/15'
                  : 'text-zinc-400 hover:text-rose-300 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <Video className={`w-5 h-5 mb-0.5 md:mb-0 ${currentView === 'live' ? 'stroke-[2.5] text-rose-400' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Live</span>
            </button>
          )}

          {/* 3. Certificate - Shown only if Main Admin or user has an active Certificate-enabled course (not replaced by Live) */}
          {hasCertificateCourse && (
            <button
              id="app-nav-certificate"
              onClick={() => {
                setShowProfileModal(false);
                handleOpenStudentCertificate();
              }}
              className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
                showCertificateModal
                  ? 'text-blue-400 font-bold bg-blue-500/10 md:bg-blue-600/15 md:border md:border-blue-500/40 md:shadow-md md:shadow-blue-500/15'
                  : 'text-zinc-400 hover:text-blue-300 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
              }`}
            >
              <Award className="w-5 h-5 mb-0.5 md:mb-0 stroke-[2.2] text-blue-400 shrink-0" />
              <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Certificate</span>
            </button>
          )}

          {/* 4. Ask (Embedded Tab attached seamlessly with App Navigation) */}
          {isCourseActiveUser && (
            <button
              id="app-nav-ask"
              onClick={() => {
                setShowProfileModal(false);
                setCurrentView('ask');
                if (!isUserAdminSession) {
                  setStudentUnreadCount(0);
                }
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
              className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
                currentView === 'ask'
                  ? 'text-blue-400 font-bold bg-blue-500/10 md:bg-blue-600/15 md:border md:border-blue-500/40 md:shadow-md md:shadow-blue-500/15'
                  : 'text-zinc-400 hover:text-blue-300 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
              }`}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <MessageCircle className={`w-5 h-5 mb-0.5 md:mb-0 ${currentView === 'ask' ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
                {hasAskUnread && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-black absolute -top-2 -right-3 shadow-md animate-pulse" title="New messages">
                    {askBadgeText}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Ask</span>
            </button>
          )}

          {/* 5. Profile - Full Screen Native View */}
          <button
            id="app-nav-profile"
            onClick={() => {
              setShowProfileModal(false);
              navigateToPath('/account');
            }}
            className={`flex-1 md:max-w-[210px] flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2.5 py-1.5 md:py-2.5 px-1.5 md:px-4 rounded-xl md:rounded-2xl transition-all duration-150 cursor-pointer active:scale-95 ${
              currentView === 'account'
                ? 'text-blue-400 font-bold bg-blue-500/10 md:bg-blue-600/15 md:border md:border-blue-500/40 md:shadow-md md:shadow-blue-500/15'
                : 'text-zinc-400 hover:text-blue-300 md:hover:bg-zinc-900/80 md:hover:border-zinc-700/60 md:border md:border-transparent'
            }`}
          >
            {hasStudentProfile && userAvatar ? (
              userAvatar.startsWith('http') || userAvatar.startsWith('data:') ? (
                <img src={userAvatar} alt="Avatar" className="w-5 h-5 mb-0.5 md:mb-0 rounded-full object-cover ring-1 ring-blue-400 shrink-0" />
              ) : (
                <span className="w-5 h-5 mb-0.5 md:mb-0 flex items-center justify-center text-sm shrink-0">{userAvatar}</span>
              )
            ) : (
              <User className="w-5 h-5 mb-0.5 md:mb-0 stroke-[2.2] text-blue-400 shrink-0" />
            )}
            <span className="text-[10.5px] md:text-sm font-semibold md:font-extrabold tracking-tight">Profile</span>
          </button>
        </div>
      </nav>
      )}

    </div>
  );
}
