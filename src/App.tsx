import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
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
  Bot, 
  User, 
  Check,
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
  Zap,
  RotateCcw,
  Wand2,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  ExternalLink,
  Bell,
  MessageCircle
} from 'lucide-react';

import { COURSES, TESTIMONIALS, FAQS, DEFAULT_PAYMENT_CONFIG, DEFAULT_SITE_SETTINGS } from './data';
import { Course, ChatMessage, CourseVideo, CoursePdf, PaymentQrConfig, SiteSettingsConfig, FAQItem, PushNotificationItem } from './types';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where, getDoc, onSnapshot, arrayUnion, writeBatch, limit, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { db, auth } from './firebase';
import { CertificateModal } from './components/CertificateModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AskChatModal } from './components/AskChatModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { showNativeNotification, isNotificationSupported } from './utils/notifications';
import { getDirectPdfViewerUrl, getDirectPdfDownloadUrl } from './pdfUtils';
import { LOGO_DATA_URL, REMOTE_LOGO_URL } from './logo';

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
    return localStorage.getItem('clipzone_admin_activated') === 'true';
  });
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'keys' | 'qr' | 'faqs' | 'overall' | 'certificate' | 'courses' | 'notifications' | 'ask'>('keys');
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [logoutSecretCodeInput, setLogoutSecretCodeInput] = useState('');

  // Dynamic Payment & QR Code configuration
  const [paymentConfig, setPaymentConfig] = useState<PaymentQrConfig>(() => {
    try {
      const saved = localStorage.getItem('clipzone_payment_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PAYMENT_CONFIG;
  });

  // Dynamic FAQs list state
  const [faqs, setFaqs] = useState<FAQItem[]>(() => {
    try {
      const saved = localStorage.getItem('clipzone_faqs_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return FAQS;
  });

  // Dynamic Global Site & Branding settings
  const [siteSettings, setSiteSettings] = useState<SiteSettingsConfig>(() => {
    try {
      const saved = localStorage.getItem('clipzone_site_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SITE_SETTINGS;
  });

  // Student Authentication & Course Activation states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(() => {
    const localName = localStorage.getItem('clipzone_student_name');
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
    return !localStorage.getItem('clipzone_student_name');
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
      return JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
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

  // Dynamic Courses state - 100% resilient offline first
  const [courses, setCourses] = useState<Course[]>(() => {
    const deletedIds: string[] = (() => {
      try {
        return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
      } catch {
        return [];
      }
    })();

    const cached = localStorage.getItem('clipzone_dynamic_courses');
    if (cached) {
      try {
        const parsed: Course[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Strictly exclude deleted courses and do NOT re-add them from defaults
          const activeList = parsed.filter(c => !deletedIds.includes(c.id));
          if (activeList.length > 0) {
            return activeList.map((c, i) => ({
              ...c,
              order: typeof c.order === 'number' ? c.order : i
            })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          }
        }
      } catch (e) {}
    }
    // Reliable fallback: return default courses excluding any explicitly deleted ones
    return COURSES.filter(c => !deletedIds.includes(c.id)).map((c, i) => ({
      ...c,
      order: typeof c.order === 'number' ? c.order : i
    })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  });

  // Push Notifications state
  const [isRunningInAppMode, setIsRunningInAppMode] = useState<boolean>(() => checkIsAppMode());
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [unreadNotifIds, setUnreadNotifIds] = useState<string[]>([]);
  const [showNotifCenterModal, setShowNotifCenterModal] = useState<boolean>(false);
  const [showNotifPromptModal, setShowNotifPromptModal] = useState<boolean>(false);

  // Network connectivity status for offline resilience
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Course loading state from database
  const [isCoursesLoading, setIsCoursesLoading] = useState<boolean>(() => {
    const cached = localStorage.getItem('clipzone_dynamic_courses');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      } catch (e) {}
    }
    return COURSES.length === 0;
  });

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
  const [formMessage, setFormMessage] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formPopularText, setFormPopularText] = useState('🔥 MOST POPULAR - BEST SELLER');
  const [formLanguage, setFormLanguage] = useState('Hindi & Nepali');
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

  // Realtime synchronization of courses from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'courses'), (querySnapshot) => {
      try {
        const deletedIds: string[] = (() => {
          try {
            return JSON.parse(localStorage.getItem('clipzone_deleted_course_ids') || '[]');
          } catch {
            return [];
          }
        })();

        if (!querySnapshot.empty) {
          const dbCourses: Course[] = [];
          querySnapshot.forEach((docSnap) => {
            const course = docSnap.data() as Course;
            const courseId = docSnap.id || course.id;
            // Strictly exclude any course marked as deleted
            if (!deletedIds.includes(courseId)) {
              dbCourses.push({
                ...course,
                id: courseId
              });
            } else {
              // Permanently purge from Firestore if still lingering
              deleteDoc(doc(db, 'courses', courseId)).catch(() => {});
            }
          });

          // Sort by order
          const sortedCourses = dbCourses.map((c, i) => ({
            ...c,
            order: typeof c.order === 'number' ? c.order : i
          })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

          setCourses(sortedCourses);
          localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(sortedCourses));
          setIsCoursesLoading(false);
          localStorage.setItem('clipzone_courses_initialized', 'true');
        } else {
          // If offline or snapshot is from local cache without server sync, PRESERVE local courses!
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsCoursesLoading(false);
            return;
          }
          if (querySnapshot.metadata?.fromCache) {
            setIsCoursesLoading(false);
            return;
          }

          // Check if local cache already has courses - never wipe them accidentally
          const cached = localStorage.getItem('clipzone_dynamic_courses');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setIsCoursesLoading(false);
                return;
              }
            } catch (e) {}
          }

          // If Firestore is completely empty on fresh app setup, seed default courses ONLY once if never initialized
          const alreadyInitialized = localStorage.getItem('clipzone_courses_initialized') === 'true';
          if (!alreadyInitialized && deletedIds.length === 0) {
            const initialCourses = COURSES.map((c, i) => ({
              ...c,
              order: typeof c.order === 'number' ? c.order : i
            }));
            setCourses(initialCourses);
            localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(initialCourses));
            localStorage.setItem('clipzone_courses_initialized', 'true');
            // Seed to Firestore once
            initialCourses.forEach(c => {
              setDoc(doc(db, 'courses', c.id), c).catch(() => {});
            });
            setDoc(doc(db, 'system', 'config'), { courses_seeded: true }, { merge: true }).catch(() => {});
          }
          setIsCoursesLoading(false);
        }
      } catch (e) {
        console.warn('Error processing courses snapshot:', e);
        setIsCoursesLoading(false);
      }
    }, (err) => {
      console.warn('Realtime courses listener error (keeping offline cache):', err);
      setIsCoursesLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Realtime listener for broadcast push notifications (paginated/limited to 50 newest for high scale)
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
        // Sort newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setNotifications(list);

        // Calculate unread count and IDs
        try {
          const readIds: string[] = JSON.parse(localStorage.getItem('clipzone_read_notifs') || '[]');
          const unread = list.filter(n => !readIds.includes(n.id));
          setUnreadNotifIds(unread.map(n => n.id));
          setUnreadNotifCount(unread.length);

          // If a fresh broadcast was just sent by admin in last 30 seconds, trigger system notification ONLY in PWA mode
          const isPwaActive = checkIsAppMode();
          const seenAlertIds: string[] = JSON.parse(sessionStorage.getItem('clipzone_alerted_notifs') || '[]');
          const newest = list[0];
          if (isPwaActive && newest && !seenAlertIds.includes(newest.id) && Date.now() - (newest.createdAt || 0) < 30000) {
            seenAlertIds.push(newest.id);
            sessionStorage.setItem('clipzone_alerted_notifs', JSON.stringify(seenAlertIds));
            showNativeNotification({
              title: newest.title,
              body: newest.body,
              url: newest.url || '/'
            });
          }
        } catch (e) {}
      } catch (e) {
        console.warn('Notifications parse error:', e);
      }
    }, (err) => {
      console.warn('Notifications listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Push Notification Handlers
  const handleSendNotification = async (notifData: Omit<PushNotificationItem, 'id' | 'createdAt'>) => {
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
    try {
      await deleteDoc(doc(db, 'notifications', id));
      showToast('Notification removed successfully.', 'info');
    } catch (e) {
      console.error('Error deleting notification:', e);
      showToast('Failed to delete notification.', 'error');
      throw e;
    }
  };

  const handleMarkAllNotifsRead = () => {
    const allIds = notifications.map(n => n.id);
    localStorage.setItem('clipzone_read_notifs', JSON.stringify(allIds));
    setUnreadNotifIds([]);
    setUnreadNotifCount(0);
    showToast('All notifications marked as read', 'info');
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
          localStorage.setItem('clipzone_deleted_course_ids', JSON.stringify(mergedDeleted));
          setDeletedCourseIds(mergedDeleted);

          // Purge any deleted courses from state & local storage
          setCourses(prev => {
            const filtered = prev.filter(c => !mergedDeleted.includes(c.id));
            if (filtered.length !== prev.length) {
              localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(filtered));
              return filtered;
            }
            return prev;
          });

          // Also clean up from activeCourseIds
          setActiveCourseIds(prev => {
            const filtered = prev.filter(id => !mergedDeleted.includes(id));
            if (filtered.length !== prev.length) {
              localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(filtered));
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
        localStorage.setItem('clipzone_payment_config', JSON.stringify(data));
      }
    }, (err) => {
      console.warn('Payment QR config realtime listener error:', err);
    });

    // 2. FAQs listener
    const unsubFaqs = onSnapshot(doc(db, 'system', 'faqs'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.items) && data.items.length > 0) {
          setFaqs(data.items);
          localStorage.setItem('clipzone_faqs_config', JSON.stringify(data.items));
        }
      }
    }, (err) => {
      console.warn('FAQs realtime listener error:', err);
    });

    // 3. Overall Site Settings listener
    const unsubSettings = onSnapshot(doc(db, 'system', 'site_settings'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SiteSettingsConfig;
        setSiteSettings(prev => ({ ...prev, ...data }));
        localStorage.setItem('clipzone_site_settings', JSON.stringify(data));
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
          showToast(`⚠️ तपाईंको सेसन एड्मिनद्वारा लगआउट गरिएको छ (Session logged out by Admin for code ${terminatedCode})`, 'error');
        } else if (terminateReason === 'deleted') {
          showToast(`❌ यो कोर्स कोड एड्मिनद्वारा मेटाइएको छ (Course code ${terminatedCode} was deleted from database)`, 'error');
        } else {
          showToast(`यो डिभाइसको सेसन समाप्त भयो! कोड ${terminatedCode} अर्को डिभाइसमा एक्टिभ गरिएको छ। (Session ended! Code ${terminatedCode} active on another device.)`, 'error');
        }
      }
    } catch (err) {
      console.error('Error checking active device sessions:', err);
    }
  };

  // Firebase Authentication Observer & User Keys Fetcher
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
        fetchUserActiveKeys(user);
      } else {
        const localName = localStorage.getItem('clipzone_student_name');
        if (localName) {
          const virtualUser = getOrCreateLocalUser(localName);
          setCurrentUser(virtualUser as any);
        }
        // Always preserve activated courses from persistent local storage so student is never auto-logged out
        const localActivated = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
        if (localActivated.length > 0) {
          setActiveCourseIds(localActivated);
        }
        const localKeys = JSON.parse(localStorage.getItem('clipzone_activated_keys_info') || '[]');
        if (localKeys.length > 0) {
          setUserActivationKeys(localKeys);
        }
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

  // Device session check on window focus or visibility change (avoids aggressive 12s interval killing sessions on mobile)
  useEffect(() => {
    checkActiveDeviceSessions();
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        checkActiveDeviceSessions();
      }
    };
    const handleOnline = () => {
      setIsNetworkOnline(true);
      checkActiveDeviceSessions();
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
  }, [currentUser]);

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
            showToast(`❌ यो कोर्स कोड एड्मिनद्वारा हटाइएको छ (Course code ${code} deleted from database)`, 'error');
          } else {
            const keyData = docSnap.data();
            // Check if admin triggered explicit logout for this specific key
            if (keyData.forceLogoutAt && userLoginTime > 0 && keyData.forceLogoutAt > userLoginTime) {
              const currentCodes: string[] = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
              const filteredCodes = currentCodes.filter(c => c !== code);
              localStorage.setItem('clipzone_active_codes', JSON.stringify(filteredCodes));

              if (keyData.courseId) {
                const localActivated: string[] = JSON.parse(localStorage.getItem('clipzone_local_activated_courses') || '[]');
                const updatedActivated = localActivated.filter(id => id !== keyData.courseId);
                localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(updatedActivated));
                setActiveCourseIds(updatedActivated);
              }
              showToast(`⚠️ तपाईंको सेसन एड्मिनद्वारा लगआउट गरिएको छ (Session logged out by Admin for code ${code})`, 'error');
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
                showToast(`यो डिभाइसको सेसन समाप्त भयो! कोड ${code} अर्को डिभाइसमा एक्टिभ गरिएको छ।`, 'error');
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
        if (!isAdminActivated) {
          e.preventDefault();
          showToast('सुरक्षाको कारणले यो सर्टकट असक्षम गरिएको छ! (Shortcut disabled for protection!)', 'error');
        }
      }
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      if (!isAdminActivated) {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (!isAdminActivated) {
        e.preventDefault();
        showToast('कपी गर्न निषेध गरिएको छ! (Copying is restricted!)', 'error');
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
  }, [isAdminActivated]);

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
      const verifiedKeys: any[] = [];
      const verifiedCourseIds = new Set<string>();

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

            // Sync deviceId if not set or matches
            if (!data.activeDeviceId) {
              updateDoc(doc(db, 'activation_keys', code), { activeDeviceId: deviceId }).catch(() => {});
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
            if (data.status === 'used' && (!data.forceLogoutAt || data.forceLogoutAt <= userLoginTime)) {
              if (!verifiedKeys.some(k => (k.code || k.id) === docSnap.id)) {
                verifiedKeys.push({ id: docSnap.id, code: docSnap.id, ...data });
              }
              if (data.courseId) verifiedCourseIds.add(data.courseId);
            }
          });
        } catch (e) {}
      }

      // If we verified keys, update state and local storage
      if (verifiedCourseIds.size > 0) {
        const finalActiveIds = Array.from(verifiedCourseIds);
        setUserActivationKeys(verifiedKeys);
        localStorage.setItem('clipzone_activated_keys_info', JSON.stringify(verifiedKeys));
        localStorage.setItem('clipzone_local_activated_courses', JSON.stringify(finalActiveIds));
        setActiveCourseIds(finalActiveIds);
      } else if (localActivatedCourses.length > 0) {
        // Network query yielded 0 confirmed keys (offline, network latency, or cache miss)
        // STRICTLY PRESERVE existing active courses!
        setActiveCourseIds(localActivatedCourses);
        setUserActivationKeys(localKeysInfo);
      } else if (activeCodes.length === 0) {
        setActiveCourseIds([]);
        setUserActivationKeys([]);
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

  // Fetch all keys for Admin panel
  const fetchAdminKeys = async () => {
    let cachedKeys: any[] = [];
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

    setIsAdminLoadingKeys(true);

    try {
      const querySnapshot = await getDocs(collection(db, 'activation_keys'));

      const firestoreKeys: any[] = [];
      querySnapshot.forEach((doc: any) => {
        firestoreKeys.push({ id: doc.id, ...doc.data() });
      });

      firestoreKeys.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAllActivationKeys(firestoreKeys);
      localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(firestoreKeys));
    } catch (err: any) {
      console.error('Failed loading keys for admin:', err);
      if (cachedKeys.length > 0) {
        setAllActivationKeys(cachedKeys);
      }
      if (err?.message?.includes('permission') || err?.code === 'permission-denied') {
        showToast('Database connection restricted. Showing cached key database.', 'info');
      }
    } finally {
      setIsAdminLoadingKeys(false);
    }
  };

  // Fetch admin keys when admin is activated, and subscribe to realtime updates
  useEffect(() => {
    if (isAdminActivated) {
      fetchAdminKeys();

      // Realtime listener for admin keys collection
      const unsub = onSnapshot(collection(db, 'activation_keys'), (snapshot) => {
        const keys: any[] = [];
        snapshot.forEach((docSnap) => {
          keys.push({ id: docSnap.id, ...docSnap.data() });
        });
        keys.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAllActivationKeys(keys);
        localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(keys));
      }, (err) => {
        console.warn('Realtime admin keys collection listener error:', err);
      });

      return () => unsub();
    }
  }, [isAdminActivated]);

  // STUDENT PORTAL HANDLERS (PASSWORD-FREE ANONYMOUS SIGN-IN)
  const handleStudentAnonymousLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthSubmitting(true);
    const cleanName = authName.trim();
    if (!cleanName) {
      setAuthError('कृपया आफ्नो पुरा नाम राख्नुहोस् (Full Name is required).');
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

    showToast('Student Portal र सबै कोर्स लगआउट गरियो! (Logged out of all courses successfully!)', 'info');
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

      showToast('कोर्स डिभाइस लगआउट गरियो! अब यो कोड अरु डिभाइसमा प्रयोग गर्न सकिन्छ। (Course logged out from device successfully! This code is now free.)', 'success');
    } catch (err) {
      console.error('Error releasing course code:', err);
      showToast('Failed to release course code.', 'error');
    }
  };

  // ACTIVATE / CLAIM SECRET KEY
  const handleClaimActivationCode = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = activationCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter a secret activation code.', 'error');
      return;
    }

    // Check if code is the secret Admin activation code "AI12XCLIP"
    if (cleanCode === 'AI12XCLIP') {
      setIsAdminActivated(true);
      localStorage.setItem('clipzone_admin_activated', 'true');
      
      // Ensure student session profile is also set up for Admin
      if (!localStorage.getItem('clipzone_student_name')) {
        const adminName = 'Admin (ClipZone)';
        setAuthName(adminName);
        localStorage.setItem('clipzone_student_name', adminName);
      }
      
      setActivationCodeInput('');
      setShowCodeInputModal(false);
      setShowProfileModal(false);
      showToast('⚡ Welcome Admin! Admin Mode activated successfully! 🔑', 'success');
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
        showToast('❌ अमान्य वा मेटाइएको सेक्रेट कोड! कृपया Admin ले दिएको सही कोड राख्नुहोस्। (Invalid or deleted code)', 'error');
        setIsActivating(false);
        return;
      }

      // Automatically get Student Name assigned by Admin to this key, strictly preserving real names
      const keyStudentName = keyData?.studentName && keyData.studentName.trim() !== 'Student Learner' ? keyData.studentName.trim() : '';
      const existingRealName = (currentUser?.displayName && currentUser.displayName !== 'Student Learner' ? currentUser.displayName : '') ||
        (authName && authName !== 'Student Learner' ? authName : '') ||
        (localStorage.getItem('clipzone_student_name') && localStorage.getItem('clipzone_student_name') !== 'Student Learner' ? localStorage.getItem('clipzone_student_name') : '');
      const assignedStudentName = keyStudentName || existingRealName || (keyData?.claimedByEmail ? (keyData.claimedByEmail.split('@')[0].charAt(0).toUpperCase() + keyData.claimedByEmail.split('@')[0].slice(1)) : '') || 'Student';

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

      // Single-device login check:
      if (keyData && keyData.activeDeviceId && keyData.activeDeviceId !== deviceId) {
        showToast('यो कोड पहिले नै अर्को डिभाइसमा एक्टिभ छ! कृपया पहिले त्यहाँबाट लगआउट गर्नुहोस्। (This code is already active on another device!)', 'error');
        setIsActivating(false);
        return;
      }

      // Determine course to unlock
      let unlockedCourseId = keyData?.courseId || (courses && courses[0]?.id) || 'course-1';
      let unlockedCourseTitle = keyData?.courseTitle || (courses && courses[0]?.title) || 'Premiere Pro Course';

      // Guarantee stable permanent student UID across re-logins and devices
      const permanentStudentUid = keyData?.claimedByUid || activeUser?.uid || localStorage.getItem('clipzone_student_uid') || ('local_' + Math.random().toString(36).substring(2, 11));
      try {
        localStorage.setItem('clipzone_student_uid', permanentStudentUid);
      } catch (e) {}

      // Attempt to update status in Firestore with 1.5s timeout guard
      if (keyDocRef) {
        try {
          const updateTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('UPDATE_TIMEOUT')), 1500));
          await Promise.race([
            updateDoc(keyDocRef, {
              status: 'used',
              activeDeviceId: deviceId,
              deviceClaimedAt: Date.now(),
              claimedByEmail: assignedStudentName,
              studentName: assignedStudentName,
              claimedByUid: permanentStudentUid,
              claimedAt: Date.now(),
              forceLogoutAt: 0,
              expiresAt: Date.now() + (keyData.duration === '1month' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)
            }),
            updateTimeout
          ]);
        } catch (dbErr) {
          console.warn('Failed or timed out syncing claimed key status to cloud:', dbErr);
        }
      }

      // Link/ensure canonical single conversation document exists for this student
      try {
        const convDocRef = doc(db, 'support_conversations', permanentStudentUid);
        setDoc(convDocRef, {
          id: permanentStudentUid,
          userId: permanentStudentUid,
          userName: assignedStudentName,
          userEmail: assignedStudentName,
          activeCourse: unlockedCourseTitle,
          purchasedCourses: [unlockedCourseTitle],
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
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

      // Save key metadata object locally for student profile dates
      const durationMs = keyData?.duration === '1month' ? (30 * 24 * 60 * 60 * 1000) : (365 * 24 * 60 * 60 * 1000);
      const keyExp = keyData?.expiresAt || (claimNow + durationMs);

      const newKeyObj = {
        id: cleanCode,
        code: cleanCode,
        courseId: unlockedCourseId,
        courseTitle: unlockedCourseTitle,
        studentName: assignedStudentName,
        claimedAt: claimNow,
        expiresAt: keyExp,
        duration: keyData?.duration || '1year'
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

      showToast(`नमस्ते ${assignedStudentName}! सफलतापूर्वक अनलक भयो: "${unlockedCourseTitle || 'Your Course'}"! 🎉`, 'success');
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

  // ADMIN ACTIVATION KEY GENERATION HANDLERS
  const handleGenerateActivationKey = async (
    courseId: string, 
    autoCopy: boolean = true, 
    studentNameArg?: string, 
    durationArg?: '1month' | '1year'
  ) => {
    let targetCourseId = courseId;
    if (!targetCourseId && courses && courses.length > 0) {
      targetCourseId = courses[0].id;
    }
    
    const selectedCourseData = courses.find(c => c.id === targetCourseId);
    const courseTitle = selectedCourseData ? selectedCourseData.title : (courses[0]?.title || 'All Courses Access');
    const finalCourseId = selectedCourseData ? selectedCourseData.id : (courses[0]?.id || 'course-all');

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
      studentName: studentName
    };

    // Instantly update UI and local cache
    setAllActivationKeys(prev => {
      const updated = [newKeyDoc, ...prev.filter(k => k.code !== finalCode && k.id !== finalCode)];
      localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
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

  // ADMIN PAYMENT QR SETTINGS HANDLER
  const handleSavePaymentConfig = async (newConfig: PaymentQrConfig) => {
    setPaymentConfig(newConfig);
    localStorage.setItem('clipzone_payment_config', JSON.stringify(newConfig));
    try {
      await setDoc(doc(db, 'system', 'payment_qr'), newConfig);
    } catch (err) {
      console.error('Error saving payment config to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'system/payment_qr');
    }
  };

  // ADMIN FAQS SETTINGS HANDLER
  const handleSaveFaqs = async (newFaqs: FAQItem[]) => {
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

  // ADMIN OVERALL SITE SETTINGS HANDLER
  const handleSaveSiteSettings = async (newSettings: SiteSettingsConfig) => {
    setSiteSettings(newSettings);
    localStorage.setItem('clipzone_site_settings', JSON.stringify(newSettings));
    try {
      await setDoc(doc(db, 'system', 'site_settings'), newSettings);
    } catch (err) {
      console.error('Error saving site settings to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, 'system/site_settings');
    }
  };

  // ADMIN DIRECT COURSE UPDATE HANDLER (for per-course certificate config or instant edits)
  const handleSaveCourseDirect = async (updatedCourse: Course) => {
    const cleaned = cleanUndefined(updatedCourse);
    setCourses(prev => {
      const index = prev.findIndex(c => c.id === updatedCourse.id);
      let updatedList: Course[];
      if (index >= 0) {
        updatedList = [...prev];
        updatedList[index] = updatedCourse;
      } else {
        updatedList = [...prev, updatedCourse];
      }
      localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
      return updatedList;
    });

    if (selectedCourse && selectedCourse.id === updatedCourse.id) {
      setSelectedCourse(updatedCourse);
    }

    try {
      await setDoc(doc(db, 'courses', updatedCourse.id), cleaned, { merge: true });
    } catch (err) {
      console.error('Error saving updated course to Firestore:', err);
      handleFirestoreError(err, OperationType.UPDATE, `courses/${updatedCourse.id}`);
    }
  };

  const handleDeleteActivationKey = async (code: string) => {
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
      localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
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

  // ADMIN HANDLER: DELETE ALL STUDENT ACTIVATION KEYS PERMANENTLY
  const handleDeleteAllKeys = async () => {
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
      showToast('सबै विद्यार्थी कोर्ष कोडहरू स्थायी रूपमा मेटाइएका छन् (All student course codes permanently deleted)', 'success');
    } catch (err) {
      console.error('Failed to delete all keys:', err);
      // Ensure local state is cleared even if offline
      setAllActivationKeys([]);
      localStorage.removeItem('clipzone_admin_keys_cache');
      showToast('सबै कोर्ष कोडहरू मेटाइएका छन्।', 'info');
    } finally {
      setIsAdminLoadingKeys(false);
    }
  };

  // ADMIN HANDLER: FORCE LOGOUT A SPECIFIC USER/KEY SESSION
  const handleLogoutUserKey = async (code: string) => {
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
      localStorage.setItem('clipzone_admin_keys_cache', JSON.stringify(updated));
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

  // ADMIN HANDLER: FORCE LOGOUT ALL USER SESSIONS ACROSS ALL DEVICES
  const handleExecuteLogoutAllUserSessions = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    const inputCode = logoutSecretCodeInput.trim().toUpperCase();
    if (inputCode !== 'AI12XCLIP') {
      showToast('❌ अमान्य सेक्रेट कोड! सेसन लगआउट गर्न सकिएन। (Invalid secret code)', 'error');
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

      // Refresh admin key list
      fetchAdminKeys();

      showToast('⚡ सफलता: प्लेटफर्मका सबै युजर डिभाइस र सेसनहरु लगआउट गराइयो! (All active user devices & sessions logged out!)', 'success');
    } catch (err) {
      console.error('Failed to reset all user sessions:', err);
      showToast('सबै सेसन लगआउट गर्दा त्रुटि भयो।', 'error');
    }
  };

  // Move Course Up / Down
  const handleMoveCourse = async (currentIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;

    const updatedCourses = [...courses];
    
    // Swap the courses in array
    const temp = updatedCourses[currentIndex];
    updatedCourses[currentIndex] = updatedCourses[targetIndex];
    updatedCourses[targetIndex] = temp;

    // Update their order values based on new indices
    const finalizedCourses = updatedCourses.map((course, idx) => ({
      ...course,
      order: idx
    }));

    setCourses(finalizedCourses);
    localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(finalizedCourses));

    // Save changes to Firestore
    try {
      await setDoc(doc(db, 'courses', finalizedCourses[currentIndex].id), finalizedCourses[currentIndex]);
      await setDoc(doc(db, 'courses', finalizedCourses[targetIndex].id), finalizedCourses[targetIndex]);
      showToast('Course sequence moved successfully!', 'success');
    } catch (err) {
      console.error('Failed to update course order in Firestore:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(`Sequence updated locally but failed to sync online: ${errorMessage}`, 'error');
      handleFirestoreError(err, OperationType.UPDATE, 'courses');
    }
  };

  // Course details modal state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Smoothly scroll to the specific course card/section and open the details modal
  const handleEnrollCourse = (course: Course) => {
    if (currentView !== 'home') {
      setCurrentView('home');
    }
    setSelectedCourse(course);
    setTimeout(() => {
      const cardEl = document.getElementById(`course-card-${course.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const coursesSec = document.getElementById('courses-section');
        if (coursesSec) {
          coursesSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 80);
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
  const [pageVideoIndexes, setPageVideoIndexes] = useState<Record<string, number>>({});
  const [showAllCoursesAnyway, setShowAllCoursesAnyway] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'classroom'>('home');
  const [selectedClassroomCourseId, setSelectedClassroomCourseId] = useState<string | null>(null);
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
    showToast(`भिडियो Rotation: ${nextDeg}°`, 'info');
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
        e.clipboardData.setData('text/plain', 'ClipZone Nepal - Link Sharing Disabled');
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
  const [contactCourse, setContactCourse] = useState('General Inquiry / सामान्य सोधपुछ');
  const [contactMsg, setContactMsg] = useState('');

  // AI Chat Assistant state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  // Helper boolean: is the current active session an admin
  const isUserAdminSession = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
  const hasAskUnread = isUserAdminSession ? adminUnreadCount > 0 : studentUnreadCount > 0;

  // 1. Real-time listener for Admin: tracks unread messages sent by users/students
  useEffect(() => {
    const isUserAdmin = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
    if (!isUserAdmin) {
      setAdminUnreadCount(0);
      return;
    }

    try {
      const convsRef = collection(db, 'support_conversations');
      const unsub = onSnapshot(convsRef, (snapshot) => {
        let totalUnread = 0;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && typeof data.unreadAdminCount === 'number' && data.unreadAdminCount > 0) {
            totalUnread += data.unreadAdminCount;
          }
        });
        setAdminUnreadCount(totalUnread);
      }, (err) => {
        console.warn('Admin support conversation listener error:', err);
      });
      return () => unsub();
    } catch (e) {
      console.warn('Error setting up admin support conversation listener:', e);
    }
  }, [isAdminActivated, currentUser]);

  // 2. Real-time listener for Student: tracks unread replies sent by Admin
  useEffect(() => {
    const isUserAdmin = Boolean(isAdminActivated || isFirebaseUserAdmin(currentUser?.email));
    if (isUserAdmin) {
      setStudentUnreadCount(0);
      return;
    }

    try {
      const devId = getOrCreateDeviceId();
      const localStudentUid = localStorage.getItem('clipzone_student_uid');
      let matchedUid = '';
      if (Array.isArray(allActivationKeys) && allActivationKeys.length > 0) {
        const localName = cleanRealName(localStorage.getItem('clipzone_student_name')) || cleanRealName(currentUser?.displayName) || cleanRealName(authName);
        let activeCodes: string[] = [];
        try { activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]'); } catch {}
        const match = allActivationKeys.find((k: any) => {
          if (activeCodes.includes(k.code || k.id)) return true;
          if (localName && k.studentName && k.studentName.trim().toLowerCase() === localName.toLowerCase()) return true;
          if (localName && k.claimedByName && k.claimedByName.trim().toLowerCase() === localName.toLowerCase()) return true;
          if (currentUser?.email && k.claimedByEmail && k.claimedByEmail.toLowerCase() === currentUser.email.toLowerCase()) return true;
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

      candidateUids.forEach((cUid) => {
        const convRef = doc(db, 'support_conversations', cUid);
        const unsub = onSnapshot(convRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            countsMap.set(cUid, data?.unreadUserCount || 0);
          } else {
            countsMap.set(cUid, 0);
          }
          let maxUnread = 0;
          countsMap.forEach((cnt) => {
            if (cnt > maxUnread) maxUnread = cnt;
          });
          setStudentUnreadCount(maxUnread);
        }, (err) => {
          console.warn('Student support conversation listener error:', err);
        });
        unsubs.push(unsub);
      });

      return () => {
        unsubs.forEach(u => u());
      };
    } catch (e) {
      console.warn('Error setting up student support conversation listener:', e);
    }
  }, [currentUser, isAdminActivated, allActivationKeys, authName]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'नमस्ते! 👋\nम AI Clipzone Nepal को Advanced AI Assistant हुँ।\nहाम्रा कोर्सहरू, Activation Key, Certificate, eSewa Payment वा AI Tools (Midjourney, Suno, CapCut) सम्बन्धी केही पनि सोध्नुहोस्!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [activeChatCategory, setActiveChatCategory] = useState<'all' | 'activation' | 'prompts' | 'payment' | 'video'>('all');
  const [showPromptBuilder, setShowPromptBuilder] = useState(false);
  const [promptTopic, setPromptTopic] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // PWA Installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState<boolean>(false);
  const [isInstallingPwa, setIsInstallingPwa] = useState<boolean>(false);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(true);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const iosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(iosDevice);

      const inApp = checkIsAppMode();
      setIsRunningInAppMode(inApp);
      if (inApp) {
        setIsAppInstalled(true);
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      showToast(`🎉 ${siteSettings.instituteName || 'AI Clipzone Nepal'} App Successfully Installed!`, 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (isAppInstalled) {
      showToast(`✅ ${siteSettings.instituteName || 'AI Clipzone'} App is already installed on your device!`, 'success');
      return;
    }
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          showToast(`🎉 ${siteSettings.instituteName || 'AI Clipzone'} App Added to Home Screen!`, 'success');
          setIsAppInstalled(true);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    setShowPwaInstallModal(true);
  };

  const handleConfirmInstallModal = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          showToast(`🎉 ${siteSettings.instituteName || 'AI Clipzone'} App Added to Home Screen!`, 'success');
          setIsAppInstalled(true);
          setShowPwaInstallModal(false);
          setDeferredPrompt(null);
          return;
        }
        setDeferredPrompt(null);
      } catch (e) {
        console.warn('Install prompt error:', e);
      }
    }

    const isInIframe = typeof window !== 'undefined' && window.top !== window.self;
    if (isInIframe) {
      window.open(window.location.href, '_blank');
      showToast('📲 Full Tab मा खुल्यो! Chrome Menu (⋮) -> "Add to Home Screen" थिच्नुहोस्!', 'info');
      setShowPwaInstallModal(false);
      return;
    }

    setIsInstallingPwa(true);
    setTimeout(() => {
      setIsInstallingPwa(false);
      setShowPwaInstallModal(false);
      setIsAppInstalled(true);
      showToast(`🎉 ${siteSettings.instituteName || 'AI Clipzone'} App Added to Home Screen!`, 'success');
    }, 1000);
  };

  // Trigger Edit Course Form
  const handleEditCourseClick = (course: Course) => {
    setEditingCourse(course);
    setFormId(course.id);
    setFormTitle(course.title);
    setFormPrice(course.price);
    setFormAmount(course.amount);
    setFormMessage(course.message || `I want to buy ${course.title}`);
    setFormImage(course.image);
    setFormIsPopular(!!course.isPopular);
    setFormPopularText(course.popularText || '🔥 MOST POPULAR - BEST SELLER');
    setFormLanguage(course.language || (course.id.includes('rathee') || course.id.includes('presentation') ? 'Hindi & Nepali' : 'Nepali'));
    setFormLearnText(course.learn.join('\n'));
    setFormVideos(course.videos || []);
    setFormPdfs(course.pdfs && Array.isArray(course.pdfs) ? [...course.pdfs] : []);
    setShowCourseFormModal(true);
  };

  // Trigger Create Course Form
  const handleCreateCourseClick = () => {
    setEditingCourse(null);
    setFormId('');
    setFormTitle('');
    setFormPrice('Rs. ');
    setFormAmount(299);
    setFormMessage('');
    setFormImage('');
    setFormIsPopular(false);
    setFormPopularText('🔥 MOST POPULAR - BEST SELLER');
    setFormLanguage('Hindi & Nepali');
    setFormLearnText('');
    setFormVideos([]);
    setFormPdfs([]);
    setShowCourseFormModal(true);
  };

  // Submit Course Form (Create/Edit)
  const handleCourseFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrice.trim() || !formImage.trim()) {
      showToast('Please fill in all required fields (Title, Price, Image URL)', 'error');
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
      price: formPrice,
      amount: Number(formAmount) || 299,
      message: formMessage || `I want to buy ${formTitle}`,
      learn: learnArray.length > 0 ? learnArray : ['Interactive AI Learning', 'Certificate of Completion Included', 'Lifetime Updates Access'],
      image: formImage,
      isPopular: formIsPopular,
      popularText: formIsPopular ? formPopularText : undefined,
      language: formLanguage.trim() || 'Hindi & Nepali',
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
        localStorage.setItem('clipzone_dynamic_courses', JSON.stringify(updatedList));
        localStorage.setItem('clipzone_courses_initialized', 'true');
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

  // Delete Course
  const handleDeleteCourse = async (courseId: string) => {
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

      // 7. Persist deleted courseId in system config so it is permanently blacklisted across all devices & sessions
      try {
        await setDoc(doc(db, 'system', 'config'), {
          courses_seeded: true,
          deletedCourseIds: arrayUnion(courseId)
        }, { merge: true });
      } catch (e) {
        console.warn('Config deleted ids set error:', e);
      }

      showToast('कोर्ष स्थायी रूपमा हटाइयो! (Course permanently deleted!)', 'success');
    } catch (err) {
      console.error('Failed to delete course:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(`Error deleting course from Firestore: ${errorMessage}`, 'error');
      handleFirestoreError(err, OperationType.DELETE, `courses/${courseId}`);
    }
  };

  // Trigger Confirmation & Permission Prompt before deleting any course
  const handlePromptDeleteCourse = (courseId: string) => {
    const target = courses.find(c => c.id === courseId) || null;
    if (!target) {
      showToast('कोर्ष फेला परेन (Course not found)', 'error');
      return;
    }
    setCourseToDelete(target);
    setDeleteConfirmInput('');
  };

  // Execute Confirmed Delete Course Action
  const handleExecuteDeleteCourse = async () => {
    if (!courseToDelete) return;
    if (deleteConfirmInput.trim().toUpperCase() !== 'DELETE') {
      showToast('कृपया मेटाउन पुष्टि गर्न DELETE टाइप गर्नुहोस्! (Type DELETE to confirm)', 'error');
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

  // Handle Batch Deletion of multiple courses at once in a single bulk operation
  const handleBatchDeleteCourses = async (courseIds: string[]) => {
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

      // 6. Delete any secret activation keys created for these courses
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

      showToast(`${courseIds.length} वटा कोर्षहरू सफलतापूर्वक हटाइयो! (${courseIds.length} courses deleted!)`, 'success');
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

  // Render QR Code inside canvas once QR modal opens
  useEffect(() => {
    if (showQrModal && selectedCourse && qrCanvasRef.current && !paymentConfig.qrImageUrl) {
      // eSewa QR payload using dynamic paymentConfig - clean format without remarks
      const qrPayload = JSON.stringify({ 
        eSewa_id: paymentConfig.esewaId || "9763323268", 
        name: paymentConfig.accountName || "Ayush Chaurasiya" 
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
  }, [showQrModal, selectedCourse, paymentConfig]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

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
      showToast('कृपया तपाईंको नाम र सन्देश लेख्नुहोस्!', 'error');
      return;
    }
    const fullMessage = `Name: ${contactName}\nPhone: ${contactPhone || 'N/A'}\nSelected Course: ${contactCourse}\nMessage: ${contactMsg}`;
    const whatsappUrl = `https://wa.me/9779763323268?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    // Clear Inputs
    setContactName('');
    setContactPhone('');
    setContactCourse('General Inquiry / सामान्य सोधपुछ');
    setContactMsg('');
    showToast('तपाईंको सन्देश WhatsApp मा पठाइयो।', 'success');
  };

  const speakBotResponse = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (isSpeechActive) {
        setIsSpeechActive(false);
        return;
      }
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const neOrHiVoice = voices.find(v => v.lang.includes('ne') || v.lang.includes('hi') || v.lang.includes('en'));
      if (neOrHiVoice) utterance.voice = neOrHiVoice;
      utterance.onend = () => setIsSpeechActive(false);
      utterance.onerror = () => setIsSpeechActive(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeechActive(true);
      showToast('भ्वाइस रिडिङ सुरु भयो 🔊 (Reading response aloud)', 'info');
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleCopyChatMessage = (text: string) => {
    const clean = text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    navigator.clipboard.writeText(clean);
    showToast('जवाफ कपी गरियो! (Copied to clipboard)', 'info');
  };

  const handleClearChatHistory = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeechActive(false);
    setChatMessages([
      {
        sender: 'bot',
        text: `नमस्ते! 👋\nम ${siteSettings.instituteName || 'AI Clipzone Nepal'} को Advanced AI Assistant हुँ।\nहाम्रा कोर्सहरू, Activation Key, Certificate, eSewa Payment वा AI Tools सम्बन्धी केही पनि सोध्नुहोस्!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    showToast('च्याट रिसेट गरियो 🔄', 'info');
  };

  const handleGeneratePromptTool = (topic: string) => {
    if (!topic.trim()) return;
    const promptText = `✨ <strong>AI Master Prompt Results for "${topic}":</strong><br/><br/>
    🎨 <strong>1. Midjourney v6 / DALL-E Photo Prompt:</strong><br/>
    <span class="text-blue-400 font-mono text-xs block bg-zinc-900 p-2 rounded border border-blue-500/30 mt-1 select-all">/imagine prompt: Ultra-realistic 8k cinematic studio portrait of ${topic}, hyper-detailed lighting, 85mm lens f/1.4, Octane Render, 32k resolution --ar 16:9 --style raw --v 6.0</span><br/>
    
    📝 <strong>2. ChatGPT Script & Hook Prompt:</strong><br/>
    <span class="text-indigo-400 font-mono text-xs block bg-zinc-900 p-2 rounded border border-indigo-500/30 mt-1 select-all">Act as a viral content creator. Write a high-retention 60-second video script about "${topic}". Include a 3-second hook, visual B-roll cues, and strong Call To Action.</span><br/>
    
    🎵 <strong>3. Suno AI Music Prompt:</strong><br/>
    <span class="text-emerald-400 font-mono text-xs block bg-zinc-900 p-2 rounded border border-emerald-500/30 mt-1 select-all">[Genre: Modern Nepali Electro Folk, Mood: Energetic, Tempo: 120 BPM, Lead: Clear Vocal] "${topic}"</span>`;

    setChatMessages(prev => [
      ...prev,
      { sender: 'user', text: `Generate AI Prompts for: ${topic}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { sender: 'bot', text: promptText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setShowPromptBuilder(false);
    setPromptTopic('');
  };

  // WhatsApp Number & Purchase helper
  const getFormattedWhatsappNumber = (rawNumber?: string) => {
    const num = (rawNumber || paymentConfig.whatsappNumber || siteSettings.supportPhone || '9763323268').replace(/\D/g, '');
    if (num.startsWith('977')) return num;
    return `977${num}`;
  };

  const getWhatsappPurchaseUrl = (course: Course) => {
    const number = getFormattedWhatsappNumber(paymentConfig.whatsappNumber);
    const text = course.message || `नमस्ते! म "${course.title}" (${course.price}) खरिद गर्न चाहन्छु। कृपया मलाई भुक्तानी विवरण र Secret Activation Key पठाइदिनुहोस्।`;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  };

  const getLocalAIResponse = (query: string): string => {
    const q = query.toLowerCase().trim();
    const currentWaNumber = paymentConfig.whatsappNumber || siteSettings.supportPhone || '976-3323268';
    const waLink = `https://wa.me/${getFormattedWhatsappNumber(currentWaNumber)}`;
    
    // Greeting
    if (q === 'hi' || q === 'hello' || q === 'namaste' || q.includes('नमस्ते') || q === 'hey') {
      return `नमस्ते! 🙏 ${siteSettings.instituteName || 'AI Clipzone Nepal'} को आधिकारिक AI Assistant मा यहाँलाई स्वागत छ। म यहाँलाई हाम्रा प्रिमियम AI कोर्षहरू, Activation Code, Certificate, eSewa Payment र AI Tools (Midjourney, ChatGPT, Suno AI, CapCut) सम्बन्धी जुनसुकै सहयोग गर्न तयार छु! 😊`;
    }

    // Code / Activation Key / Invalid Key
    if (q.includes('code') || q.includes('activation') || q.includes('की') || q.includes('कोड') || q.includes('invalid') || q.includes('अमान्य') || q.includes('key')) {
      return `🔑 <strong>Course Activation Code सम्बन्धी जानकारी:</strong><br/><br/>
      • <strong>कोड कसरी पाइन्छ?</strong> भुक्तानी (eSewa ID: ${paymentConfig.esewaId || '9763323268'}) गरिसकेपछि स्क्रीनसट WhatsApp (<a href="${waLink}" target="_blank" class="text-purple-600 font-extrabold underline">${currentWaNumber}</a>) मा पठाउनासाथ तपाईंलाई गोप्य Activation Code उपलब्ध गराइन्छ।<br/>
      • <strong>कोड कसरी प्रयोग गर्ने?</strong> माथिल्लो मेनुमा रहेको <strong>"🔑 Activate Code"</strong> बटन थिचेर आफ्नो कोड हाल्नुहोस्।<br/>
      • <strong>Invalid / Error देखाए के गर्ने?</strong><br/>
      1. कोडका अंग्रेजी अक्षरहरू Capital Letter (ठूलो अक्षर) मा छन् कि छैनन् चेक गर्नुहोस्।<br/>
      2. कोडको अगाडि वा पछाडि अनावश्यक Space परेको छ भने हटाउनुहोस्।<br/>
      3. सुरक्षा नीति अनुसार एउटा कोड <strong>एक पटकमा १ वटा मोवाइल/डिभाइसमा मात्र</strong> चल्दछ। यदि नयाँ डिभाइसमा खोल्नुभएको छ भने पुरानो डिभाइस लगआउट हुनुपर्छ।<br/>
      4. थप समस्या भए सिधै हाम्रो <strong>WhatsApp (<a href="${waLink}" target="_blank" class="text-purple-600 font-extrabold underline">${currentWaNumber}</a>)</strong> मा म्यासेज गर्नुहोस्!`;
    }

    // Certificate Download & Fixes
    if (q.includes('certificate') || q.includes('प्रमाणपत्र') || q.includes('सर्टिफिकेट') || q.includes('download') || q.includes('verify')) {
      return `📜 <strong>Course Certificate कसरी Download गर्ने?</strong><br/><br/>
      १. आफ्नो <strong>Course Classroom</strong> खोल्नुहोस्।<br/>
      २. कोर्षको कार्डमा रहेको <strong>"📜 Course Certificate"</strong> बटनमा क्लिक गर्नुहोस्।<br/>
      ३. आफ्नो नाम टाइप गर्नुहोस् र <strong>"Generate & Print Certificate"</strong> मा थिचेर PDF/Image डाउनलोड गर्नुहोस्।<br/>
      • <i>नोट:</i> प्रमाण पत्रमा तपाईंको कोर्षको आधिकारीक Unique Code र <strong>"by ${siteSettings.instituteName || 'AI Clipzone Nepal'}"</strong> छाप समावेस हुनेछ!`;
    }

    // AI Prompt Generator / Prompts
    if (q.includes('prompt') || q.includes('प्रम्प्ट') || q.includes('midjourney') || q.includes('chatgpt') || q.includes('ai tool')) {
      return `🤖 <strong>AI Master Prompt बनाउने तरिका:</strong><br/><br/>
      तपाईंले हाम्रो च्याटको माथिल्लो toolbar मा रहेको <strong>"✨ Prompt Tool (Wand Icon)"</strong> थिचेर वा कुनै पनि विषय टाइप गरेर मिनेटमै Midjourney, ChatGPT र Suno AI को लागि उत्कृष्ट Prompts प्राप्त गर्न सक्नुहुन्छ!<br/><br/>
      <strong>Midjourney Prompt Formula:</strong><br/>
      <code>[Subject] + [Environment/Background] + [Lighting & Style] + [Camera Lens & Aspect Ratio]</code><br/>
      उदाहरण: <i>/imagine prompt: Futuristic AI robot in Kathmandu street, 8k cinematic lighting, 85mm lens --ar 16:9</i>`;
    }

    // Pricing
    if (q.includes('price') || q.includes('कति') || q.includes('मूल्य') || q.includes('paisa') || q.includes('cost') || q.includes('rs') || q.includes('rupees') || q.includes('rate')) {
      return `हाम्रा प्रिमियम कोर्षहरू र तिनको विशेष अफर मूल्यहरू यस प्रकार छन्:<br/><br/>
      1. <strong>AI Master Class by ${siteSettings.instituteName || 'AI Clipzone'}:</strong> मात्र Rs. 449 (Hindi, 30+ AI Tools)<br/>
      2. <strong>YouTube Blueprint Course:</strong> मात्र Rs. 549 (Hindi & Nepali, YouTube Growth)<br/>
      3. <strong>AI Video, Image & Song Creation:</strong> मात्र Rs. 350 (Nepali)<br/>
      4. <strong>AI Song Creation Course:</strong> मात्र Rs. 299 (Nepali/Hindi)<br/>
      5. <strong>AI Presentation Making Course:</strong> मात्र Rs. 199 (Nepali/Hindi, Slides Creator)<br/><br/>
      <i>सबै कोर्षहरूमा लाइफटाइम एक्सेस र सर्टिफिकेट उपलब्ध छ। खरिद गर्न "WhatsApp बाट किन्नुहोस्" वा "QR Pay" बटनमा क्लिक गर्नुहोस्!</i>`;
    }

    // Payment / How to buy / eSewa
    if (q.includes('payment') || q.includes('तिर्ने') || q.includes('किन्ने') || q.includes('buy') || q.includes('esewa') || q.includes('khalti') || q.includes('qr') || q.includes('pay') || q.includes('purchase')) {
      return `भुक्तानी गर्न अत्यन्तै सजिलो छ! तपाईंले <strong>eSewa (ID: ${paymentConfig.esewaId || '9763323268'} - ${paymentConfig.accountName || 'Ayush Chaurasiya'}) वा Bank Transfer</strong> मार्फत QR स्क्यान गरेर तिर्न सक्नुहुन्छ। <br/><br/>
      <strong>प्रक्रिया:</strong><br/>
      १. कोर्ष सेक्सनमा गएर <strong>"WhatsApp बाट किन्नुहोस्"</strong> वा <strong>"QR Pay"</strong> बटन थिच्नुहोस्।<br/>
      २. त्यहाँ देखाइएको QR स्क्यान गरी eSewa वा Mobile Banking बाट तोकिएको शुल्क भुक्तानी गर्नुहोस्।<br/>
      ३. भुक्तानी गरिसकेपछि स्क्रीनसट हाम्रो आधिकारिक <strong>WhatsApp (<a href="${waLink}" target="_blank" class="text-purple-600 font-extrabold underline">${currentWaNumber}</a>)</strong> मा पठाउनुहोस् र कोर्षको तत्काल पहुँच पाउनुहोस्।`;
    }

    // Contact / Support / WhatsApp / Phone
    if (q.includes('contact') || q.includes('whatsapp') || q.includes('फोन') || q.includes('नम्बर') || q.includes('phone') || q.includes('number') || q.includes('support') || q.includes('help')) {
      return `हाम्रो आधिकारिक सम्पर्क विवरणहरू यस प्रकार छन्:<br/>
      • <strong>WhatsApp:</strong> <a href="${waLink}" target="_blank" class="text-purple-600 font-extrabold underline">${currentWaNumber}</a><br/>
      • <strong>सपोर्ट समय:</strong> २४/७ (तपाईं जुनसुकै बेला पनि म्यासेज पठाउन सक्नुहुन्छ)<br/><br/>
      तपाईंले भुक्तानी गरेपछि स्क्रीनसट यही WhatsApp नम्बरमा पठाउनुपर्नेछ।`;
    }

    // Recorded or Live
    if (q.includes('recorded') || q.includes('live') || q.includes('भिडियो') || q.includes('class') || q.includes('क्लास')) {
      return `हाम्रा सबै कोर्षहरू पूर्ण रूपमा <strong>Recorded HD Lectures</strong> हुन्। यसमा कुनै पनि Live Class को झन्झट छैन। तपाईंले आफ्नो फुर्सदको समयमा (बिहान, दिउँसो, वा राती) जुनसुकै बेला पनि सजिलै भिडियोहरू हेरेर सिक्न सक्नुहुन्छ र दोहोर्याएर हेर्न पनि पाउनुहुन्छ।`;
    }

    // Access or Lifetime
    if (q.includes('lifetime') || q.includes('एक्सेस') || q.includes('access') || q.includes('कति दिन') || q.includes('समय')) {
      return `हो! कोर्ष खरिद गरेपछि तपाईंले <strong>Lifetime Access (आजीवन पहुँच)</strong> पाउनुहुन्छ। भविष्यमा थपिने सबै नयाँ भिडियोहरू र अपडेटहरू पनि तपाईंले बिल्कुलै नि:शुल्क पाउनुहुनेछ।`;
    }

    // Specific Course: Dhruv Rathee style
    if (q.includes('dhruv') || q.includes('rathee') || q.includes('master') || q.includes('30+')) {
      return `<strong>AI Master Class (Hindi & Nepali) - मात्र Rs. 449:</strong><br/>
      यो कोर्षमा ChatGPT, Midjourney, Runway, ElevenLabs, Leonardo AI जस्ता ३० भन्दा बढी प्रिमियम AI tools को पूर्ण प्रयोगात्मक जानकारी समावेस छ।`;
    }

    // Specific Course: Song / Music / Suno
    if (q.includes('song') || q.includes('music') || q.includes('गीत') || q.includes('संगीत') || q.includes('suno')) {
      return `<strong>AI Song Creation Course - मात्र Rs. 299 (Nepali/Hindi):</strong><br/>
      यसमा Suno v3/v4 को प्रयोग गरी आफ्नै लिरिक्स बनाउने, संगीत कम्पोज गर्ने, धून तयार गर्ने, भ्वाइस क्लोनिङ गर्ने र व्यावसायिक गीतहरू उत्पादन गर्ने तरिका सिकाइन्छ।`;
    }

    // Specific Course: Video / CapCut / Avatar
    if (q.includes('video') || q.includes('भिडियो सम्पादन') || q.includes('avatar') || q.includes('एनिमेसन') || q.includes('capcut')) {
      return `<strong>AI Video, Image & Song Creation - मात्र Rs. 350 (Nepali):</strong><br/>
      यो नेपाली भाषाको पूर्ण कोर्ष हो जसमा Talking Avatar भिडियोहरू बनाउने, Text-to-Video, CapCut Transitions, र प्रोफेसनल एनिमेटेड भिडियो सम्पादन गर्न सिकाइन्छ।`;
    }

    // Specific Course: Presentation / Slides / PPT
    if (q.includes('presentation') || q.includes('slides') || q.includes('ppt') || q.includes('पावरपोइन्ट')) {
      return `<strong>AI Presentation Making Course - मात्र Rs. 199 (Nepali/Hindi):</strong><br/>
      यसमा Gamma App, Tome, PowerPoint AI को प्रयोग गरी उत्कृष्ट एनिमेटेड स्लाइड र व्यावसायिक कलेज/अफिस प्रस्तुतीकरणहरू मिनेटमै बनाउन सिकाइन्छ।`;
    }

    return `धन्यवाद! कोर्ष तुरुन्त खरिद गर्न, Activation Code re-issue गर्न वा थप जानकारीका लागि कृपया हाम्रो आधिकारिक <strong>WhatsApp नम्बर <a href="${waLink}" target="_blank" class="text-purple-600 font-extrabold underline">${currentWaNumber}</a></strong> मा सिधै सम्पर्क गर्नुहोस्। हामी तपाईंलाई तत्काल सहयोग गर्नेछौं!`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || isTyping) return;

    // Add user message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text, timestamp };
    
    setChatMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: chatMessages.map(msg => ({ sender: msg.sender, text: msg.text }))
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned non-ok status');
      }

      const data = await response.json();
      const botReply = data.reply || getLocalAIResponse(text);
      
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (error) {
      console.warn('Chat API Error, falling back to local KB:', error);
      
      // Fallback seamlessly to the highly accurate local responder instead of breaking!
      const botReply = getLocalAIResponse(text);
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Open QR modal from Course Modal
  const handleOpenFonePayQR = () => {
    setShowQrModal(true);
  };

  // Confirm payment & launch WhatsApp message
  const handleConfirmPayment = () => {
    if (!selectedCourse) return;
    const fullNumber = getFormattedWhatsappNumber(paymentConfig.whatsappNumber);
    const accountName = paymentConfig.accountName || 'Ayush Chaurasiya';
    const message = `Hello! I have completed payment for "${selectedCourse.title}" (${selectedCourse.price}) via eSewa/QR (${accountName}). Please provide my secret course activation key!`;
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`, '_blank');
    setShowQrModal(false);
    setSelectedCourse(null);
    showToast('Payment confirmation message sent on WhatsApp!', 'success');
  };

  return (
    <div className={`min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden flex flex-col justify-between relative ${isRunningInAppMode ? 'pb-20' : ''}`}>
      {/* Sleek Pure Black Ambient Lighting: Situational Blue, Green, Red Accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[140px]" />
        <div className="absolute top-2/3 -left-20 w-[450px] h-[450px] bg-rose-600/8 rounded-full blur-[130px]" />
        <div className="absolute -bottom-32 right-10 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:26px_26px] opacity-[0.06]" />
      </div>

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

      {/* Top Header & Navigation Container */}
      <div className="sticky top-0 z-[100] w-full shadow-2xl bg-black/95 backdrop-blur-md border-b border-zinc-800">
        {/* Offline Status Banner */}
        {!isNetworkOnline && (
          <div className="w-full bg-gradient-to-r from-amber-950/90 via-zinc-900 to-amber-950/90 text-amber-300 text-xs font-bold py-1.5 px-4 text-center border-b border-amber-500/30 flex items-center justify-center gap-2 shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>📶 अफलाइन मोड (Offline Mode) • तपाईंका एक्टिभ कोर्षहरू पूर्ण सुरक्षित छन्।</span>
          </div>
        )}

        {/* Dynamic Global Notice Banner from Admin Settings (Red Urgency Notice) */}
        {siteSettings.showNoticeBanner && siteSettings.noticeBannerText && (
          <div className="w-full bg-gradient-to-r from-black via-rose-950/90 to-black text-rose-200 text-xs font-bold py-1.5 px-4 text-center border-b border-rose-500/30 flex items-center justify-center gap-2 shadow-md">
            <span className="animate-pulse">📢</span>
            <span>{siteSettings.noticeBannerText}</span>
          </div>
        )}

        {/* Top Floating Banner with sleek pitch-black styling matching the logo */}
        <div className="w-full bg-black text-white">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between">
            <div 
              onClick={() => {
                if (isAdminActivated) {
                  setShowAdminMenu(!showAdminMenu);
                } else {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none relative group"
              title={isAdminActivated ? "Admin controls" : "AI Clipzone Nepal - Home"}
            >
              {/* 3D Silver Logo prominently embedded on black header */}
              <div className="h-10 sm:h-12 md:h-14 flex items-center justify-center bg-black overflow-hidden group-hover:scale-105 transition-transform duration-200 shrink-0">
                <img 
                  src={siteSettings.instituteLogoUrl && siteSettings.instituteLogoUrl.trim() ? siteSettings.instituteLogoUrl.trim() : LOGO_DATA_URL} 
                  alt={siteSettings.instituteName || "AI CLIPZONE"}
                  className="h-10 sm:h-12 md:h-14 w-auto max-w-[140px] sm:max-w-[180px] md:max-w-[220px] object-contain shrink-0 filter drop-shadow-md"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== LOGO_DATA_URL) {
                      target.src = LOGO_DATA_URL;
                    }
                  }}
                />
              </div>

              {/* Directly after logo: Prominent bold white text with Nepal flag spanning across the header */}
              <div className="flex flex-col text-left justify-center">
                <h1 className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-black tracking-wide sm:tracking-wider text-white font-sans flex items-center gap-1.5 leading-none uppercase drop-shadow-sm whitespace-nowrap">
                  {siteSettings.siteTitle || (siteSettings.instituteName ? `${siteSettings.instituteName.toUpperCase()} 🇳🇵` : 'TOP AI COURSE NEPAL 🇳🇵')}
                </h1>
                <span className="hidden sm:block text-[9px] sm:text-[10px] md:text-xs text-zinc-400 font-semibold tracking-widest uppercase mt-1">
                  {siteSettings.siteTagline || "Nepal's #1 AI Video Editing & Learning Platform"}
                </span>
              </div>

              {isAdminActivated && showAdminMenu && (
                <div className="absolute top-14 left-0 z-[1000] w-52 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 font-bold text-xs text-zinc-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdminMenu(false);
                      handleCreateCourseClick();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    ➕ Add New Course
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdminMenu(false);
                      setAdminInitialTab('keys');
                      setShowAdminDashboard(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    🗝️ Code Generator
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdminMenu(false);
                      setAdminInitialTab('ask');
                      setShowAdminDashboard(true);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      💬 Ask Messages
                    </span>
                    {adminUnreadCount > 0 && (
                      <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-zinc-950 animate-pulse shadow-xs" title="New user messages" />
                    )}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdminActivated(false);
                      localStorage.removeItem('clipzone_admin_activated');
                      setShowAdminMenu(false);
                      showToast('Logged out of Admin mode', 'info');
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors flex items-center gap-2 cursor-pointer border-t border-zinc-800/80 mt-1"
                  >
                    🚪 Exit Admin Mode
                  </button>
                </div>
              )}
            </div>

            {/* Desktop Navigation Tabs */}
            <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950 p-1 rounded-full border border-zinc-800 shadow-inner">
              <button
                onClick={() => {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  showToast('Welcome Home! 🏠', 'info');
                }}
                className={`px-4 py-1.5 rounded-full font-black text-xs transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                  currentView === 'home' && !isAskOpen
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                🏠 Home Page
              </button>
              <button
                onClick={() => {
                  setCurrentView('classroom');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  showToast('Welcome to Your Classroom! 🎓', 'info');
                }}
                className={`px-4 py-1.5 rounded-full font-black text-xs transition-all duration-150 cursor-pointer flex items-center gap-1.5 relative ${
                  currentView === 'classroom' && !isAskOpen
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                🎓 Course Page
                {activeCourseIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping border border-black" />
                )}
              </button>
              <button
                id="desktop-nav-ask"
                onClick={() => {
                  setIsChatOpen(false);
                  setIsAskOpen(prev => !prev);
                  if (!isAskOpen && !isUserAdminSession) {
                    setStudentUnreadCount(0);
                  }
                }}
                className={`px-4 py-1.5 rounded-full font-black text-xs transition-all duration-150 cursor-pointer flex items-center gap-1.5 relative ${
                  isAskOpen
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Ask</span>
                {hasAskUnread && (
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black absolute -top-0.5 -right-0.5 animate-pulse shadow-xs" title="New message - Click to view" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Notification Bell Button - ONLY VISIBLE IN INSTALLED PWA APP MODE */}
              {isRunningInAppMode && (
                <button
                  id="header-notification-bell-btn"
                  onClick={() => setShowNotifCenterModal(true)}
                  className="relative w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:bg-zinc-800 hover:border-purple-500/50 transition flex items-center justify-center cursor-pointer select-none shadow-md group"
                  title="Notifications & Announcements"
                >
                  <Bell className="w-4.5 h-4.5 text-zinc-300 group-hover:text-purple-400 transition" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ring-2 ring-black shadow-md animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>
              )}

              {/* Dropdown Menu Button */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700/80 text-white hover:bg-zinc-800 hover:border-zinc-500 transition flex items-center justify-center cursor-pointer select-none font-bold text-xs relative shadow-md"
                  title="Account Menu"
                >
                  {currentUser ? (
                    <>
                      <span className="uppercase text-[11px] text-zinc-100 font-black">
                        {(currentUser.displayName || currentUser.email || 'ST').substring(0, 2)}
                      </span>
                      {/* Facebook Style Blue Tick Verification Badge */}
                      <span className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-black shadow-sm" title="Verified Active Student">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </>
                  ) : (
                    <Menu className="w-5 h-5 text-zinc-200" />
                  )}
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute right-0 mt-2 w-52 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-[500] font-extrabold text-xs text-zinc-100 flex flex-col gap-1"
                    >
                      {/* Notifications item - ONLY in PWA App Mode */}
                      {isRunningInAppMode && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            setShowNotifCenterModal(true);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-purple-400 transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="flex items-center gap-2.5">
                            <Bell className="w-4 h-4 text-purple-400" />
                            <span>📢 Notifications</span>
                          </span>
                          {unreadNotifCount > 0 && (
                            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                              {unreadNotifCount} new
                            </span>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setCurrentView('home');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          showToast('Welcome Home! 🏠', 'info');
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        🏠 Home Page
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setCurrentView('classroom');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          showToast('Your Course Classroom! 🎓', 'info');
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        🎓 Course Page
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setIsChatOpen(false);
                          setIsAskOpen(true);
                          if (!isUserAdminSession) {
                            setStudentUnreadCount(0);
                          }
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 hover:text-blue-400 transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <MessageCircle className="w-4 h-4 text-blue-400" />
                          <span>💬 Ask & Support</span>
                        </span>
                        {hasAskUnread && (
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-zinc-950 animate-pulse shadow-xs" title="New message" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition flex items-center justify-between cursor-pointer font-bold text-blue-400 group"
                      >
                        <span className="flex items-center gap-2">👤 Profile Page</span>
                        <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center p-0.5 shadow-xs" title="Verified Account">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleInstallPwa();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-blue-950/40 text-blue-300 transition flex items-center gap-2.5 cursor-pointer font-extrabold border-t border-zinc-800/80 mt-0.5"
                      >
                        📲 Install App Mode
                      </button>

                      {currentUser && (
                        <button
                          onClick={handleStudentLogout}
                          className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition flex items-center gap-2.5 cursor-pointer font-bold border-t border-zinc-800/80 mt-1"
                        >
                          🚪 Log Out
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tab Switcher on Header - shown on website browser mobile mode, hidden in App mode where bottom bar is used */}
        {!isRunningInAppMode && (
          <div className="sm:hidden w-full bg-black border-t border-zinc-800/80 py-2 px-4 flex gap-2">
            <button
              onClick={() => {
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                showToast('Home Page! 🏠', 'info');
              }}
              className={`flex-1 py-2 rounded-xl text-center font-black text-xs transition flex items-center justify-center gap-1.5 ${
                currentView === 'home'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-zinc-400 bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              🏠 Home
            </button>
            <button
              onClick={() => {
                setCurrentView('classroom');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                showToast('My Classroom! 🎓', 'info');
              }}
              className={`flex-1 py-2 rounded-xl text-center font-black text-xs transition flex items-center justify-center gap-1.5 relative ${
                currentView === 'classroom' && !isAskOpen
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-zinc-400 bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              🎓 Classroom
              {activeCourseIds.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              )}
            </button>
            <button
              id="mobile-header-nav-ask"
              onClick={() => {
                setIsChatOpen(false);
                setIsAskOpen(prev => !prev);
                if (!isAskOpen && !isUserAdminSession) {
                  setStudentUnreadCount(0);
                }
              }}
              className={`flex-1 py-2 rounded-xl text-center font-black text-xs transition flex items-center justify-center gap-1.5 relative ${
                isAskOpen
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-zinc-400 bg-zinc-900/90 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Ask</span>
              {hasAskUnread && (
                <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black animate-pulse shadow-xs" title="New message" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Container for Course List */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-3 pb-12">

        {/* Course Catalog Title & Grid Section */}
        <section id="courses-section" className="pt-2 scroll-mt-24">
          {currentView === 'home' && (
            <div className="text-center mb-10">
              <h3 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                <BookOpen className="w-7 h-7 text-blue-400" />
                Our Premium AI Courses
              </h3>
              <div className="w-24 h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 mx-auto rounded-full mt-3 shadow-sm shadow-blue-500/50"></div>
              <p className="text-zinc-400 mt-3 text-sm md:text-base max-w-xl mx-auto font-medium">
                तपाईंको आवश्यकता अनुसार उत्कृष्ट कोर्ष छनोट गर्नुहोस् र आजैबाट सिक्न सुरु गर्नुहोस्!
              </p>
            </div>
          )}

          {/* Courses Cards Grid or Live Embedded Classroom */}
          {currentView === 'classroom' ? (
            activeCourseIds.length > 0 ? (
              <div className="space-y-8 text-left">
                {/* Active Courses Tab bar/Switcher - rendered only if user has multiple active courses */}
                {(() => {
                  const activeCourses = courses.filter(course => activeCourseIds.includes(course.id));
                  const currentClassroomCourse = activeCourses.find(c => c.id === selectedClassroomCourseId) || activeCourses[0];
                  
                  if (!currentClassroomCourse) return null;

                  const activePlaylist = currentClassroomCourse.videos || [];

                  return (
                    <div className="space-y-8">
                      {activeCourses.length > 1 && (
                        <div className="bg-zinc-950/90 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
                          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider font-sans">
                            📚 Switch Course Program:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {activeCourses.map((course) => {
                              const isActive = course.id === currentClassroomCourse.id;
                              return (
                                <button
                                  key={course.id}
                                  onClick={() => {
                                    setSelectedClassroomCourseId(course.id);
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
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-500/30 font-sans">
                                🟢 Active Program
                              </span>
                              <span className="text-xs text-zinc-400 font-bold font-sans">({activePlaylist.length} Total Lectures)</span>
                            </div>
                            <h4 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight font-sans">
                              {currentClassroomCourse.title}
                            </h4>
                            <p className="text-xs text-zinc-400 font-medium font-sans">
                              कुनै पनि भिडियोमा क्लिक गरी सिधै Full Screen मा हेरेर सिक्न सुरु गर्नुहोस्!
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner';
                                const activeCode = getCourseActivationCode(currentClassroomCourse.id);
                                const cleanTitle = currentClassroomCourse.title.replace(/by Dhruv Rathee/gi, 'by AI Clipzone').replace(/Dhruv Rathee/gi, 'AI Clipzone');
                                setCertificateCourseTitle(cleanTitle);
                                setCertificateStudentName(studentName);
                                setCertificateIssueDate('2083/01/14');
                                setCertificateCode(activeCode);
                                setShowCertificateModal(true);
                              }}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer font-sans active:scale-95"
                              title="Download / View Course Certificate"
                            >
                              📜 Course Certificate
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActivationCodeInput('');
                                setShowCodeInputModal(true);
                              }}
                              className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans active:scale-95"
                              title="Unlock another course code"
                            >
                              🔑 Add Course Code
                            </button>

                            {isAdminActivated && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditCourseClick(currentClassroomCourse)}
                                  className="bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-blue-300 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans"
                                >
                                  ✏️ Edit Playlist & Videos
                                </button>
                                <button
                                  onClick={() => handlePromptDeleteCourse(currentClassroomCourse.id)}
                                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer font-sans"
                                >
                                  🗑️ Delete
                                </button>
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
                            <span>🎬 भिडियो कक्षाहरू (Videos)</span>
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
                            <span>📕 अध्ययन सामग्री र PDF नोटहरू (PDFs & Notes)</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${classroomTab === 'pdfs' ? 'bg-zinc-950 text-blue-300' : 'bg-zinc-800 text-zinc-400'}`}>
                              {currentClassroomCourse.pdfs?.length || 0}
                            </span>
                          </button>
                        </div>

                        {/* TAB 1: VIDEOS PLAYLIST */}
                        {classroomTab === 'videos' && (
                          <div className="space-y-3 mt-6">
                            {activePlaylist.length > 0 ? (
                              activePlaylist.map((video, idx) => {
                                return (
                                  <motion.div
                                    key={idx}
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
                                        idx: idx,
                                        playlist: activePlaylist,
                                        courseId: currentClassroomCourse.id,
                                      });
                                      showToast(`Opening Lecture ${idx + 1} in Fullscreen! 🎥`, 'success');
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
                                        {video.title}
                                      </h5>
                                      {video.duration && (
                                        <span className="text-[10px] sm:text-xs text-zinc-400 font-sans font-medium">
                                          ⏱️ {video.duration} mins
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })
                            ) : (
                              <div className="text-center py-12 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-2">
                                <div className="text-3xl">📹</div>
                                <h5 className="text-sm font-bold text-zinc-300 font-sans">कुनै भिडियो लेक्चरहरू उपलब्ध छैनन्</h5>
                                <p className="text-xs text-zinc-500 font-sans">
                                  एडमिनले प्लेलिस्टमा भिडियो थपेपछि यहाँ देखिनेछ। (Videos added by admin will appear here.)
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
                                    Google Drive PDF अध्ययन सामग्री (Direct Notes Viewer)
                                  </h5>
                                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                    विद्यार्थीहरूले Google Drive लगइन नगरिकनै सिधै पढ्न वा सुरक्षित डाउनलोड गर्न सक्छन्।
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
                                        <span>Full Screen मा पढ्नुहोस्</span>
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
                                <h5 className="text-sm font-bold text-zinc-300 font-sans">यस कोर्षमा अहिले कुनै PDF नोट उपलब्ध छैन</h5>
                                <p className="text-xs text-zinc-500 font-sans max-w-sm mx-auto">
                                  एडमिनले Google Drive बाट PDF नोटहरू लिङ्क गरेपछि यहाँ सिधै Full Screen मा पढ्न सकिनेछ।
                                </p>
                                {isAdminActivated && (
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
                  );
                })()}

              {/* Dynamic Course Creator add-on for Admin directly under active listing */}
              {isAdminActivated && (
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
          ) : (
            /* ==================== CLASSROOM EMPTY STATE ==================== */
            <div className="max-w-xl mx-auto bg-black p-8 rounded-3xl border border-zinc-800 shadow-2xl text-center space-y-6 my-8">
              <div className="w-16 h-16 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
                🗝️
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-white font-sans">Activate Your Premium Course Access</h4>
                <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto leading-relaxed font-semibold">
                  तपाईंसँग भएको Secret Activation Code यहाँ राखी आफ्नो कोर्ष अनलक गर्नुहोस्।
                </p>
              </div>

              <form onSubmit={handleClaimActivationCode} className="space-y-3">
                <input 
                  type="text"
                  value={activationCodeInput}
                  onChange={(e) => setActivationCodeInput(e.target.value)}
                  placeholder="CLIP-XXXXXX"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-2xl px-4 py-3.5 text-sm font-mono font-black uppercase outline-hidden text-white text-center tracking-widest transition shadow-inner placeholder:text-zinc-600"
                />
                <button
                  type="submit"
                  disabled={isActivating || !activationCodeInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3.5 rounded-2xl text-xs transition cursor-pointer shadow-lg shadow-blue-500/20 font-sans active:scale-[0.99]"
                >
                  {isActivating ? 'Activating Course...' : 'Unlock Instant Access ⚡'}
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
          )
        ) : isCoursesLoading && (!courses || courses.length === 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {[1, 2].map((n) => (
              <div 
                key={n}
                className="bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800/80 p-6 animate-pulse flex flex-col h-[480px]"
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
        ) : (courses && courses.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              {courses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    id={`course-card-${course.id}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -6 }}
                    className="group bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800 hover:border-blue-500/40 hover:shadow-blue-500/10 transition-all duration-300 relative flex flex-col h-full scroll-mt-28"
                  >
                    {course.isPopular && (
                      <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-center py-2 text-xs md:text-sm font-black tracking-widest uppercase z-10 shadow-md">
                        {course.popularText || '🔥 MOST POPULAR - BEST SELLER'}
                      </div>
                    )}

                    {/* Course Thumbnail Image */}
                    <div className="relative aspect-video overflow-hidden bg-black">
                      <img 
                        src={course.image} 
                        alt={course.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <span className="bg-zinc-950/85 backdrop-blur-md text-zinc-300 text-xs font-semibold px-3 py-1 rounded-lg border border-zinc-750">
                          Lifetime Access
                        </span>
                        <span className="bg-blue-600 text-white text-xs font-extrabold px-3 py-1 rounded-lg shadow-md">
                          Instant Delivery
                        </span>
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="p-6 md:p-8 flex flex-col grow justify-between">
                      <div className="text-left font-sans">
                        <h4 className="text-xl md:text-2xl font-extrabold text-white group-hover:text-blue-400 transition-colors">
                          {course.title}
                        </h4>
                        
                        {/* Prices or Active status badge */}
                        <div className="mt-4 flex items-center justify-between">
                          {activeCourseIds.includes(course.id) ? (
                            <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Course Activated
                            </span>
                          ) : (
                            <div className="flex items-baseline gap-2.5">
                              <span className="text-2xl md:text-3xl font-black text-emerald-400">
                                {course.price}
                              </span>
                              {course.isPopular && (
                                <span className="text-zinc-500 line-through text-sm md:text-base font-semibold">
                                  Price Rs. 1000
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {activeCourseIds.includes(course.id) && (() => {
                            const vList = course.videos || [];
                            const chSet = new Set(vList.map(v => v.chapterTitle?.trim() || 'Chapter 1: Course Lectures'));
                            return (
                              <span className="bg-blue-500/15 text-blue-300 text-xs font-extrabold px-3 py-1 rounded-xl border border-blue-500/30 flex items-center gap-1.5 shadow-2xs">
                                <span className="w-4 h-4 rounded-md bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">📁</span>
                                {chSet.size} Chapters ({vList.length} Video Lectures)
                              </span>
                            );
                          })()}
                          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-zinc-700">
                            🌐 {course.language || (course.id.includes('rathee') || course.id.includes('presentation') ? 'Hindi & Nepali' : 'Nepali')}
                          </span>
                          <span className="bg-blue-950/50 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-xl border border-blue-500/30">
                            📜 Certificate
                          </span>
                        </div>

                        {/* Highlights checklist */}
                        <ul className="mt-6 space-y-2.5">
                          {course.learn.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-zinc-300 font-medium">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Enrolment / Classroom Access Button */}
                      <div className="mt-8 pt-6 border-t border-zinc-800/80 flex items-center gap-3">
                        <button
                          onClick={() => handleEnrollCourse(course)}
                          className={`flex-1 font-black text-xs md:text-sm py-3.5 px-4 rounded-2xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] font-sans ${
                            activeCourseIds.includes(course.id)
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 shadow-emerald-500/20'
                          }`}
                        >
                          {activeCourseIds.includes(course.id) ? (
                            <>
                              🎓 Go to Classroom
                              <ArrowRight className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                              Enroll & Activate Course
                            </>
                          )}
                        </button>

                        {/* Admin Inline Controls */}
                        {isAdminActivated && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditCourseClick(course)}
                              className="bg-zinc-800 hover:bg-zinc-700 text-blue-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-zinc-700"
                              title="Edit Course"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handlePromptDeleteCourse(course.id)}
                              className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 p-3 rounded-2xl transition cursor-pointer font-sans border border-rose-800"
                              title="Delete Course"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

              {isAdminActivated && (
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
          ) : (
            <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-3xl p-10 md:p-14 text-center max-w-xl mx-auto shadow-2xl">
              <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-inner">
                🎓
              </div>
              <h4 className="text-xl font-black text-white font-sans">हाल कुनै पनि कोर्ष उपलब्ध छैन</h4>
              <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
                नयाँ प्रिमियम कोर्षहरू चाँडै उपलब्ध हुनेछन्। थप जानकारीका लागि सम्पर्कमा रहनुहोला।
              </p>
              {isAdminActivated && (
                <button
                  onClick={handleCreateCourseClick}
                  className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-blue-500/20 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4" /> नयाँ कोर्ष थप्नुहोस् (Add New Course)
                </button>
              )}
            </div>
          )}
        </section>

        {/* Testimonials, FAQs, and contact form sequential flows */}
        {currentView === 'home' && (
          <div className="space-y-20 animate-in fade-in duration-300">

        {/* Testimonial slider / carousel - ADVANCED BENTO FEEDBOARD */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <span className="bg-blue-500/20 text-blue-300 font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full border border-blue-500/30 shadow-2xs">
              ❤️ Student Feedback
            </span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-white mt-3 tracking-tight">
              What Our Students Say ❤️
            </h3>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full mt-3 shadow-xs shadow-blue-500/50"></div>
            <p className="text-zinc-400 mt-3 text-sm md:text-base max-w-xl mx-auto">
              हाम्रा विद्यार्थीहरूले कोर्ष लिएर आफ्नो करियर र कामलाई धेरै सजिलो बनाएका छन्।
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
            
            {/* Bento Part 1: Overall Rating Score Card */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-zinc-900/90 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-xl">
              <div>
                <strong className="text-xs text-blue-400 font-extrabold uppercase tracking-widest block mb-1">Overall Satisfaction</strong>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-white tracking-tight">4.92</span>
                  <span className="text-lg text-zinc-500 font-extrabold">/5.0</span>
                </div>
                
                <div className="flex gap-1 text-emerald-400 mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                  ))}
                </div>
                <p className="text-zinc-400 text-xs mt-3 font-semibold">Based on 1000+ verified Nepal & India student feedback.</p>

                {/* Rating bars */}
                <div className="mt-8 space-y-4">
                  {/* 5 Stars */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                      <span>5 Stars (उत्कृष्ट)</span>
                      <span>92%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>

                  {/* 4 Stars */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 font-bold mb-1">
                      <span>4 Stars (राम्रो)</span>
                      <span>8%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500/70 rounded-full" style={{ width: '8%' }}></div>
                    </div>
                  </div>

                  {/* 3 Stars */}
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 font-bold mb-1">
                      <span>3 Stars (साधारण)</span>
                      <span>0%</span>
                    </div>
                    <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-zinc-700 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Part 2: Interactive Testimonials Slider & Filters */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Filter Chips & Search Bar */}
              <div className="bg-zinc-900/90 p-4 rounded-3xl border border-zinc-800/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Dynamic Chips Container */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
                  {['All', 'AI Master Class', 'AI Video & Image', 'AI Song Creation', 'AI Presentation', 'YouTube Blueprint'].map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setSelectedCourseFilter(category);
                        setCurrentSlide(0);
                      }}
                      className={`whitespace-nowrap text-xs font-extrabold py-2 px-3.5 rounded-full transition cursor-pointer border ${
                        selectedCourseFilter === category
                          ? 'bg-blue-600 text-white font-black border-blue-500 shadow-xs'
                          : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-white border-zinc-800'
                      }`}
                    >
                      {category === 'All' ? 'सबै (All)' : category}
                    </button>
                  ))}
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full md:w-64 shrink-0">
                  <input
                    type="text"
                    value={testimonialSearchQuery}
                    onChange={(e) => {
                      setTestimonialSearchQuery(e.target.value);
                      setCurrentSlide(0);
                    }}
                    placeholder="समीक्षा खोज्नुहोस्..."
                    className="w-full bg-zinc-950 text-zinc-100 placeholder-zinc-500 font-medium text-xs rounded-full pl-9 pr-4 py-2.5 border border-zinc-800 focus:outline-hidden focus:border-blue-500 transition"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Testimonials Slides Container */}
              <div 
                className="bg-zinc-900/90 p-6 md:p-8 rounded-3xl border border-zinc-800 shadow-xl min-h-[310px] md:min-h-[250px] flex flex-col justify-between relative overflow-hidden"
                onMouseEnter={() => setIsHoveredCarousel(true)}
                onMouseLeave={() => setIsHoveredCarousel(false)}
              >
                {filteredTestimonials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-10 grow">
                    <div className="w-12 h-12 bg-zinc-950 text-zinc-500 rounded-full flex items-center justify-center mb-3 border border-zinc-800">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <strong className="text-sm text-zinc-300 block font-bold">कुनै समीक्षा भेटिएन (No reviews found)</strong>
                    <span className="text-xs text-zinc-500 mt-1 block">यो फिल्टर अनुसारको प्रतिक्रिया छैन। समीक्षा लेख्ने पहिलो विद्यार्थी बन्नुहोस्!</span>
                  </div>
                ) : (
                  <>
                    {/* Active Testimonial Item */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${selectedCourseFilter}-${testimonialSearchQuery}-${currentSlide}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col grow justify-between"
                      >
                        <div>
                          {/* User Header */}
                          <div className="flex items-center gap-4">
                            <div className="text-3xl w-12 h-12 bg-blue-500/15 border border-blue-500/30 rounded-full flex items-center justify-center shrink-0">
                              {filteredTestimonials[currentSlide].avatar || '🧔'}
                            </div>
                            <div>
                              <strong className="text-base text-white block font-black leading-tight">
                                {filteredTestimonials[currentSlide].name}
                              </strong>
                              <span className="text-xs text-blue-400 font-extrabold block mt-0.5">
                                {filteredTestimonials[currentSlide].location} • {filteredTestimonials[currentSlide].course}
                              </span>
                            </div>
                          </div>

                          {/* Interactive stars */}
                          <div className="flex gap-1 text-emerald-400 mt-3.5">
                            {[...Array(filteredTestimonials[currentSlide].rating || 5)].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                            ))}
                          </div>

                          {/* Review Text */}
                          <p className="text-zinc-300 text-xs md:text-sm italic leading-relaxed mt-4 font-medium">
                            "{filteredTestimonials[currentSlide].text}"
                          </p>
                        </div>

                        {/* Card bottom metrics */}
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/80 mt-6">
                          <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider border border-emerald-500/40">
                            <Check className="w-3 h-3" />
                            {filteredTestimonials[currentSlide].isUserAdded ? 'Newly Added Community Review' : 'Verified Student'}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-bold">
                            Review {currentSlide + 1} of {filteredTestimonials.length}
                          </span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Controls Row */}
                    <div className="absolute right-6 top-6 flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 p-1 rounded-full shadow-2xs">
                      {/* Left button */}
                      <button
                        onClick={() => {
                          setCurrentSlide((prev) => (prev - 1 + filteredTestimonials.length) % filteredTestimonials.length);
                        }}
                        className="w-7 h-7 hover:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-blue-400 transition cursor-pointer"
                        aria-label="Previous Review"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {/* Autoplay Pause/Play button */}
                      <button
                        onClick={() => setIsSliderAutoPlaying(!isSliderAutoPlaying)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                          isSliderAutoPlaying 
                            ? 'hover:bg-zinc-800 text-zinc-400 hover:text-blue-400' 
                            : 'bg-blue-600 text-white shadow-xs'
                        }`}
                        title={isSliderAutoPlaying ? "Pause Autoplay" : "Resume Autoplay"}
                      >
                        {isSliderAutoPlaying ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 fill-white text-white" />
                        )}
                      </button>

                      {/* Right button */}
                      <button
                        onClick={() => {
                          setCurrentSlide((prev) => (prev + 1) % filteredTestimonials.length);
                        }}
                        className="w-7 h-7 hover:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-blue-400 transition cursor-pointer"
                        aria-label="Next Review"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              
            </div>

          </div>
        </section>

        {/* What You Learn Section */}
        <section className="mt-24 relative">
          <div className="text-center mb-16 relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full border border-blue-500/30 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Full-Stack Skills
            </span>
            <h3 className="text-3xl md:text-4xl font-black mt-4 text-white tracking-tight leading-tight">
              तपाईंले के सिक्नुहुन्छ ? <span className="text-blue-400">What You Will Learn</span>
            </h3>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full mt-4 shadow-xs shadow-blue-500/50"></div>
            <p className="text-zinc-400 mt-4 text-sm md:text-base max-w-xl mx-auto font-medium">
              हाम्रो व्यावहारिक कोर्षहरूमा समावेस गरिएका मुख्य विधा र सीपहरू
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* Learn Card 1 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  30+ Premium AI Tools
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  ChatGPT, Midjourney, Runway, ElevenLabs, Leonardo आदि विश्वस्तरीय AI tools को पूर्ण प्रयोगात्मक प्रशिक्षण।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Complete Tools Master</span> • <span className="text-zinc-500">Practical</span>
              </div>
            </motion.div>

            {/* Learn Card 2 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <Video className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  AI Video Creation
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  Talking Avatar भिडियो, Text to Video, Script-writing, र प्रोफेसनल एनिमेटेड भिडियो सम्पादन।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Video Editing & Avatar</span> • <span className="text-zinc-500">Viral Style</span>
              </div>
            </motion.div>

            {/* Learn Card 3 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  AI Image Generation
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  Stunning यथार्थपरक फोटोहरू, एनिमेसन, व्यावसायिक डिजिटल कला र थम्बनेलहरू सजिलै बनाउने।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Art & Graphic Prompting</span> • <span className="text-zinc-500">Pro Quality</span>
              </div>
            </motion.div>

            {/* Learn Card 4 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <Music className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  AI Song & Music Creation
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  आफ्नै गीत, धून, संगीत कम्पोजिसन, भ्वाइस क्लोनिङ र ट्रेन्डिङ सामाजिक सञ्जाल संगीतको उत्पादन।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Audio & Voice Cloning</span> • <span className="text-zinc-500">Vocal Hits</span>
              </div>
            </motion.div>

            {/* Learn Card 5 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <Presentation className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  AI Presentation Making
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  Dhruv Rathee शैलीमा उत्कृष्ट एनिमेटेड पावरपोइन्ट स्लाईड र व्यावसायिक कलेज/अफिस प्रस्तुतीकरण।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Professional Slides</span> • <span className="text-zinc-500">Dhruv Rathee Style</span>
              </div>
            </motion.div>

            {/* Learn Card 6 */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="bg-zinc-900/90 p-8 rounded-3xl border border-zinc-800 hover:border-blue-500/50 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-sm">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-black text-white mb-3 tracking-tight">
                  Practical Projects & Access
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed font-medium">
                  वास्तविक प्रयोगात्मक प्रोजेक्टहरू, कोर्स पूरा गरेपछि सर्टिफिकेट, र सधैंको लागि आजीवन पहुँच।
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2 text-xs font-black text-blue-400 uppercase tracking-wider">
                <span>Verified Certificate</span> • <span className="text-zinc-500">Lifetime Access</span>
              </div>
            </motion.div>

          </div>
        </section>

        {/* FAQs Accordion */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <span className="bg-blue-500/20 text-blue-300 font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full border border-blue-500/30">
              Common Questions
            </span>
            <h3 className="text-2xl md:text-4xl font-extrabold text-white mt-3 tracking-tight">
              Frequently Asked Questions
            </h3>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full mt-3 shadow-xs shadow-blue-500/50"></div>
            <p className="text-zinc-400 mt-3 text-sm md:text-base">
              कोर्ष र भुक्तानी सम्बन्धी आम जिज्ञासाहरूको समाधान यहाँ पाउन सक्नुहुन्छ।
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {(faqs && faqs.length > 0 ? faqs : FAQS).map((faq, index) => {
              const isOpen = !!openFaqs[index];
              return (
                <div 
                  key={index}
                  className="bg-zinc-900/90 rounded-2xl border border-zinc-800/80 shadow-md overflow-hidden transition-all duration-200 hover:border-blue-500/40 hover:shadow-lg"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-5 md:p-6 font-bold text-white hover:text-blue-300 transition-colors flex items-center justify-between gap-4 text-base md:text-lg focus:outline-hidden cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown 
                      className={`w-5 h-5 text-blue-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-blue-300' : ''
                      }`}
                    />
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 md:p-6 pt-0 text-zinc-300 border-t border-zinc-800/80 text-sm md:text-base leading-relaxed bg-zinc-950/60">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact Us Section */}
        <section className="mt-20">
          <div className="bg-zinc-900/90 rounded-3xl p-6 md:p-12 shadow-2xl border border-zinc-800">
            <div className="text-center mb-10">
              <span className="bg-blue-500/20 text-blue-300 font-extrabold text-xs tracking-wider uppercase px-4 py-1.5 rounded-full border border-blue-500/30">
                Help & Support
              </span>
              <h3 className="text-2xl md:text-4xl font-extrabold text-white mt-3 tracking-tight">
                Contact Us
              </h3>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full mt-3 shadow-xs shadow-blue-500/50"></div>
              <p className="text-zinc-400 mt-3 text-sm md:text-base">
                कुनै पनि प्रश्न वा तत्काल भर्नाको लागि हामीलाई सिधै सम्पर्क गर्नुहोस्
              </p>
            </div>

            {/* Support channels grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              
              {/* WhatsApp Call Card */}
              <a 
                href={`https://wa.me/${getFormattedWhatsappNumber(paymentConfig.whatsappNumber || siteSettings.supportPhone)}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-6 rounded-2xl border-2 border-emerald-500/20 hover:border-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 transition duration-300 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-white font-extrabold text-lg group-hover:text-emerald-300 transition-colors">
                    WhatsApp / Call
                  </strong>
                  <span className="text-zinc-300 block text-sm font-semibold mt-1">{paymentConfig.whatsappNumber || siteSettings.supportPhone || '976-3323268'}</span>
                  <span className="text-xs text-emerald-400 font-extrabold mt-1 inline-block">
                    ◆ Active support (Replies in 5 mins)
                  </span>
                </div>
              </a>

              {/* Facebook Card */}
              <a 
                href="https://www.facebook.com/profile.php?id=61583901232576&mibextid=ZbWKwL" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group p-6 rounded-2xl border-2 border-blue-500/20 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-950/40 transition duration-300 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-white font-extrabold text-lg group-hover:text-blue-300 transition-colors">
                    Facebook Page
                  </strong>
                  <span className="text-zinc-400 block text-xs mt-1">{siteSettings.instituteName || "AI Clipzone Nepal"}</span>
                  <span className="text-xs text-blue-400 font-extrabold mt-1 inline-block">
                    Follow us for news & coupon codes
                  </span>
                </div>
              </a>

              {/* Email Card */}
              <a 
                href={`mailto:${siteSettings.supportEmail || 'ai.clipzone.edu@gmail.com'}`} 
                className="group p-6 rounded-2xl border-2 border-blue-500/20 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-950/40 transition duration-300 flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <strong className="text-white font-extrabold text-lg group-hover:text-blue-300 transition-colors">
                    Email Support
                  </strong>
                  <span className="text-zinc-400 block text-xs mt-1">{siteSettings.supportEmail || "ai.clipzone.edu@gmail.com"}</span>
                  <span className="text-xs text-blue-400 font-extrabold mt-1 inline-block">
                    Official queries & feedback
                  </span>
                </div>
              </a>

            </div>

            {/* Quick Contact Message Form */}
            <div className="bg-zinc-950/80 p-6 md:p-10 rounded-2xl border border-zinc-800/80">
              <h4 className="text-xl font-bold text-center text-white mb-6 flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                Send Quick Message on WhatsApp
              </h4>

              <form onSubmit={handleSendContactMessage} className="space-y-4 max-w-xl mx-auto">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">तपाईंको नाम (Full Name) *</label>
                  <input 
                    type="text" 
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="तपाईंको नाम लेख्नुहोस्..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm transition outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">फोन नम्बर (WhatsApp Number) - Optional</label>
                  <input 
                    type="tel" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="सम्पर्क फोन नम्बर लेख्नुहोस्..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm transition outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">कोर्ष छान्नुहोस् (Select Course) *</label>
                  <select 
                    value={contactCourse}
                    onChange={(e) => setContactCourse(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm transition outline-hidden font-semibold"
                  >
                    <option value="General Inquiry / सामान्य सोधपुछ">General Inquiry / सामान्य सोधपुछ</option>
                    {courses.map((course) => (
                      <option key={course.id} value={`${course.title} (${course.price})`}>
                        {course.title} — {course.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">तपाईंको सन्देश (Your Message) *</label>
                  <textarea 
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    rows={4}
                    placeholder="कोर्ष सम्बन्धी केही सोध्न मन छ भने यहाँ लेख्नुहोस्..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-3 text-sm transition outline-hidden"
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <Send className="w-4 h-4" /> 📤 Send Message
                  </button>
                </div>
              </form>
            </div>

            {/* Business Hours Information */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-center max-w-xl mx-auto">
              <div className="sm:border-r sm:border-zinc-800 pb-4 sm:pb-0">
                <h5 className="font-extrabold text-white flex items-center justify-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-blue-400" /> Business Hours
                </h5>
                <p className="text-zinc-400 text-xs mt-2 font-medium">Sunday - Friday: 8:00 AM - 8:00 PM</p>
                <p className="text-zinc-400 text-xs mt-1 font-medium">Saturday: 10:00 AM - 6:00 PM</p>
              </div>
              <div className="flex flex-col justify-center items-center">
                <span className="text-emerald-400 font-extrabold text-sm flex items-center gap-1">
                  ⚡ Instant WhatsApp Support
                </span>
                <p className="text-zinc-400 text-xs mt-2">
                  हामी प्राय: ५ मिनेट भित्रै जवाफ पठाउनेछौं!
                </p>
              </div>
            </div>

            {/* Trust and safety badges */}
            <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-zinc-400 opacity-90 border-t border-zinc-800/80 pt-8">
              <div className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Secure eSewa / QR Checkout
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                <GraduationCap className="w-4 h-4 text-blue-400" /> Standard Certificate Issued
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-zinc-400">
                <Headphones className="w-4 h-4 text-emerald-400" /> Lifelong Learning Access
              </div>
            </div>

          </div>
        </section>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-black text-zinc-400 text-xs md:text-sm py-12 border-t border-zinc-800/80 w-full mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h5 className="text-white font-extrabold text-base tracking-tight mb-2 flex items-center gap-2 justify-center md:justify-start">
              {siteSettings.instituteLogoUrl && (
                <img 
                  src={siteSettings.instituteLogoUrl} 
                  alt={siteSettings.instituteName || "Logo"} 
                  className="h-6 w-auto object-contain rounded"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <span>{siteSettings.instituteName || 'AI Clipzone Nepal'} 🇳🇵</span>
            </h5>
            <p className="text-zinc-500 text-xs">
              © {new Date().getFullYear()} {siteSettings.instituteName || 'AI Clipzone'}. All rights reserved. Nepal's Premium AI Learning platform.
            </p>
          </div>
          <div className="flex gap-4">
            <a href={`https://wa.me/${getFormattedWhatsappNumber(paymentConfig.whatsappNumber || siteSettings.supportPhone)}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">WhatsApp</a>
            <span>•</span>
            <a href="https://www.facebook.com/profile.php?id=61583901232576&mibextid=ZbWKwL" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Facebook</a>
            <span>•</span>
            <a href={`mailto:${siteSettings.supportEmail || 'ai.clipzone.edu@gmail.com'}`} className="hover:text-blue-400 transition-colors">Email</a>
          </div>
        </div>
      </footer>

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
                          🔑 + Add Course (कोड हाल्नुहोस्)
                        </button>
                      </div>
                      {isAdminActivated && (
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
                          showToast(`भिडियोलाई इमर्सिभ फुलस्क्रिनमा खोलिँदैछ! 🎥`, 'success');
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        📺 Expand to Fullscreen
                      </button>

                      <button
                        onClick={() => {
                          const isLoggedIn = !!currentUser || !!localStorage.getItem('clipzone_student_name') || activeCourseIds.includes(selectedCourse.id);
                          if (!isLoggedIn) {
                            showToast('🔒 प्रमाणपत्र हेर्न कृपया पहिले यो कोर्ष Unlock / Login गर्नुहोस्!', 'info');
                            setShowCodeInputModal(true);
                            return;
                          }
                          const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student';
                          setSelectedCertCourseId(selectedCourse.id);
                          setCertificateCourseTitle(selectedCourse.certificateCourseTitle || selectedCourse.title);
                          setCertificateStudentName(studentName);
                          setCertificateIssueDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
                          setShowCertificateModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
                      >
                        📜 View Certificate (प्रमाणपत्र)
                      </button>
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
                                          <div className="flex items-center justify-between mt-1 text-[9px]">
                                            <span className="text-slate-400 font-medium">⏱️ {video.duration || '10:00'} min</span>
                                            {isSelected && <span className="text-blue-400 font-black uppercase tracking-wider">Now Playing</span>}
                                          </div>
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
                                  <span>Full Screen मा पढ्नुहोस्</span>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 px-3 bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 space-y-1.5">
                            <FileText className="w-7 h-7 text-slate-600 mx-auto" />
                            <p className="text-xs font-bold text-slate-300">कुनै PDF उपलब्ध छैन</p>
                            <p className="text-[10px] text-slate-500">
                              एडमिनले यस कोर्षमा Google Drive बाट PDF थपेपछि यहाँ बिना लगइन हेर्न सकिनेछ।
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
                      <span>🔑 Add Another Course (नयाँ कोर्ष जोड्नुहोस्)</span>
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
                    🌐 Language: {selectedCourse.language || (selectedCourse.id.includes('rathee') || selectedCourse.id.includes('presentation') ? 'Hindi & Nepali' : 'Nepali')}
                  </span>
                  <span className="bg-zinc-900 text-emerald-400 text-[11px] font-extrabold px-2.5 py-1 rounded-md border border-emerald-500/30">
                    📜 Certificate
                  </span>
                </div>
                
                <p className="text-3xl font-black text-emerald-400 mt-3 text-left">
                  {selectedCourse.price}
                </p>

                <div className="mt-6 text-left">
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider mb-3">
                    यो Course बाट के सिक्नुहुन्छ ?
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
                  <span>१००% सुरक्षित भुक्तानी। भुक्तानी गरेपछि तत्कालै ड्राइभ लिङ्क र भिडियो कोर्ष प्राप्त गर्नुहुनेछ।</span>
                </div>

                {/* Purchase options CTA */}
                <div className="mt-8 flex flex-col gap-3">
                  <a 
                    href={getWhatsappPurchaseUrl(selectedCourse)}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 px-6 rounded-2xl text-center shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> WhatsApp बाट किन्नुहोस्
                  </a>
                  
                  <button 
                    onClick={handleOpenFonePayQR}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-6 rounded-2xl text-center shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>QR स्क्यान गरी तत्काल भुक्तानी (eSewa / Bank)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* USER PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black max-w-xl w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 border border-zinc-800 text-zinc-200 max-h-[90vh] overflow-y-auto font-sans"
            >
              <button 
                onClick={() => setShowProfileModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white transition cursor-pointer p-1 rounded-full hover:bg-zinc-800"
              >
                <X className="w-6 h-6" />
              </button>

              <span className="inline-block bg-blue-500/15 text-blue-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-3 border border-blue-500/30">
                👤 Profile Page
              </span>

              {authLoading && !currentUser && !localStorage.getItem('clipzone_student_name') ? (
                <div className="py-12 text-center text-xs font-bold text-zinc-400 flex flex-col items-center justify-center gap-3">
                  <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                  Securing user session...
                </div>
              ) : !currentUser && !localStorage.getItem('clipzone_student_name') ? (
                /* CASE: UNREGISTERED / NOT LOGGED IN STUDENT - DIRECT CODE LOGIN */
                <div className="text-left mt-2">
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Welcome to {siteSettings.instituteName || 'AI Clipzone Nepal'} 🇳🇵
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1.5 font-medium leading-relaxed">
                    भिडियो कोर्सहरू अनलक गर्न र अध्ययन सुरु गर्न एडमिनबाट प्राप्त Secret Activation Code (कोर्स कोड) यहाँ राख्नुहोस्:
                  </p>

                  {authError && (
                    <div className="bg-rose-950/60 text-rose-300 p-3 rounded-xl border border-rose-500/40 text-[11px] font-bold mb-4 mt-4">
                      ⚠️ {authError}
                    </div>
                  )}

                  <form onSubmit={handleClaimActivationCode} className="space-y-4 mt-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5 tracking-wider">
                        Secret Activation Code (कोर्स सेक्रेट कोड) *
                      </label>
                      <input 
                        type="text"
                        required
                        value={activationCodeInput}
                        onChange={(e) => setActivationCodeInput(e.target.value)}
                        placeholder="उदाहरण: CLIP-XXXXXX"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-3.5 text-sm font-mono font-black uppercase text-white outline-hidden tracking-widest shadow-inner placeholder-zinc-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isActivating || !activationCodeInput.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isActivating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Verifying Code...
                        </>
                      ) : (
                        '🚀 Unlock Course & Sign In'
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* CASE: REGISTERED STUDENT */
                <div className="text-left mt-2 space-y-5">
                  {/* Student profile summary */}
                  <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 relative overflow-hidden shadow-xs">
                    <div className="relative shrink-0">
                      <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-md uppercase ring-2 ring-blue-400/40">
                        {(currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'ST').substring(0, 2)}
                      </div>
                      {/* Verification Badge on Avatar Corner */}
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-zinc-950 w-5 h-5 rounded-full flex items-center justify-center shadow-md ring-2 ring-zinc-900" title="Verified Active Student">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-black text-white tracking-tight truncate">
                          {currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner'}
                        </h3>
                        {/* Verified Student Badge */}
                        <span 
                          className="inline-flex items-center justify-center bg-blue-600 text-white rounded-full w-4 h-4 p-0.5 shadow-xs shrink-0" 
                          title="Verified Student Account (Active Course Owner)"
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-extrabold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md flex items-center gap-1 border border-blue-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                          Official Verified Student 🇳🇵
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Banner */}
                  <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-black text-white truncate">Course Certificate 📜</h5>
                        <p className="text-[10px] text-zinc-400 font-medium truncate">आफ्नो नाम र भर्ना मिति सहितको प्रमाणपत्र</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const isLoggedIn = !!currentUser || !!localStorage.getItem('clipzone_student_name') || activeCourseIds.length > 0;
                        if (!isLoggedIn) {
                          showToast('🔒 प्रमाणपत्र हेर्न कृपया आफ्नो Activation Code मार्फत पहिले लगइन गर्नुहोस्!', 'info');
                          setShowCodeInputModal(true);
                          return;
                        }
                        const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student';
                        const activeCourse = courses.find(c => activeCourseIds.includes(c.id)) || courses[0];
                        if (activeCourse) {
                          setSelectedCertCourseId(activeCourse.id);
                          setCertificateCourseTitle(activeCourse.certificateCourseTitle || activeCourse.title);
                        } else {
                          setCertificateCourseTitle('AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS');
                        }
                        setCertificateStudentName(studentName);
                        setCertificateIssueDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
                        setShowProfileModal(false);
                        setShowCertificateModal(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl transition cursor-pointer shadow-md shadow-blue-500/20 shrink-0 flex items-center gap-1"
                    >
                      View Certificate 📜
                    </button>
                  </div>

                  {/* Unlocked / Enrolled Courses catalog list with Enrolled & Expiry Dates */}
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-wider mb-2.5 flex items-center justify-between">
                      <span>📚 My Activated Courses ({activeCourseIds.length})</span>
                      <span className="text-emerald-400 font-extrabold text-[9px] lowercase">active access</span>
                    </h4>

                    {activeCourseIds.length === 0 ? (
                      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center text-[11px] text-slate-400 font-semibold leading-relaxed">
                        🚫 No activated courses found on this device.<br />
                        Please log out and sign in using your Secret Activation Code.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                        {courses
                          .filter(course => activeCourseIds.includes(course.id))
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

                            const enrolledDateStr = new Date(enrolledTimestamp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });
                            
                            const expiredDateStr = new Date(expiresTimestamp).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });

                            const now = Date.now();
                            const diffMs = expiresTimestamp - now;
                            const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                            return (
                              <div 
                                key={course.id}
                                className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-2.5 transition"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                      📖
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-black text-white truncate">{course.title}</h5>
                                      {keyInfo?.code && (
                                        <span className="text-[9px] font-mono font-bold text-blue-300/80 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-850">
                                          Code: {keyInfo.code}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => {
                                        const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner';
                                        const activeCode = keyInfo?.code || getCourseActivationCode(course.id);
                                        const cleanTitle = course.title.replace(/by Dhruv Rathee/gi, 'by AI Clipzone').replace(/Dhruv Rathee/gi, 'AI Clipzone');
                                        setSelectedCertCourseId(course.id);
                                        setCertificateCourseTitle(course.certificateCourseTitle || cleanTitle);
                                        setCertificateStudentName(studentName);
                                        setCertificateIssueDate(enrolledDateStr);
                                        setCertificateCode(activeCode);
                                        setShowProfileModal(false);
                                        setShowCertificateModal(true);
                                      }}
                                      className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-black text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1"
                                      title="View Course Certificate"
                                    >
                                      📜 Certificate
                                    </button>

                                    <button
                                      onClick={() => {
                                        setSelectedCourse(course);
                                        setShowProfileModal(false);
                                        showToast(`Let's study "${course.title}"! 📖`, 'info');
                                      }}
                                      className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
                                    >
                                      Watch →
                                    </button>
                                  </div>
                                </div>

                                {/* Enrolled & Expired Dates */}
                                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                                  <div>
                                    <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">Enrolled Date</span>
                                    <span className="font-extrabold text-zinc-200">📅 {enrolledDateStr}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">Expired Date</span>
                                    <span className="font-extrabold text-zinc-200">🗓️ {expiredDateStr}</span>
                                  </div>
                                </div>

                                {/* Days Remaining Banner */}
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  {daysLeft > 0 ? (
                                    <div className="w-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-between">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                        ⏳ बाँकी अवधि:
                                      </span>
                                      <span className="text-emerald-200 font-black bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-700/50">
                                        {daysLeft} दिन बाँकी ({daysLeft} Days Left)
                                      </span>
                                    </div>
                                  ) : daysLeft === 0 ? (
                                    <div className="w-full bg-rose-950/40 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-between">
                                      <span>⚠️ Today is the last day!</span>
                                      <span className="font-black bg-rose-900/60 px-2 py-0.5 rounded-lg">आज अन्तिम दिन</span>
                                    </div>
                                  ) : (
                                    <div className="w-full bg-rose-950/40 border border-rose-500/30 text-rose-300 px-3 py-1.5 rounded-xl text-[10px] font-extrabold flex items-center justify-between">
                                      <span>❌ Access Expired</span>
                                      <span className="font-black bg-rose-900/60 px-2 py-0.5 rounded-lg">म्याद सकियो</span>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => {
                                      handleReleaseCourseCode(course.id);
                                    }}
                                    className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-700/50 px-2 py-1 rounded-lg transition cursor-pointer shrink-0"
                                    title="Release key to use on another device"
                                  >
                                    Release 🔓
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* PWA Notifications shortcut */}
                  {isRunningInAppMode && (
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        setShowNotifCenterModal(true);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 hover:bg-purple-900/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-xs">PWA Notifications & Alerts</span>
                      </div>
                      {unreadNotifCount > 0 ? (
                        <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                          {unreadNotifCount} new
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-[10px]">View all</span>
                      )}
                    </button>
                  )}

                  {/* Logout and metadata section */}
                  <div className="flex items-center justify-between border-t border-slate-800 pt-4 text-[11px]">
                    <div className="text-slate-400 font-bold">
                      Country: <span className="text-white font-black">Nepal 🇳🇵</span>
                    </div>
                    <button
                      onClick={handleStudentLogout}
                      className="text-rose-400 hover:text-rose-300 font-black uppercase tracking-wider cursor-pointer"
                    >
                      🚪 Log Out
                    </button>
                  </div>
                </div>
              )}

              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm transition mt-6 cursor-pointer border border-slate-800"
              >
                Close Profile
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FONEPAY QR CODE DETAILS MODAL */}
      <AnimatePresence>
        {showQrModal && selectedCourse && (
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
                {paymentConfig.qrImageUrl ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={paymentConfig.qrImageUrl} 
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
                    👤 {paymentConfig.accountName || 'Ayush Chaurasiya'}
                  </h4>
                  <p className="text-xs font-extrabold text-zinc-300 mt-1 flex items-center justify-center gap-1">
                    📱 eSewa ID: <span className="font-mono text-emerald-400 bg-black px-2 py-0.5 rounded text-xs select-all font-bold border border-zinc-800">{paymentConfig.esewaId || '9763323268'}</span>
                  </p>

                  {paymentConfig.bankAccountNo && (
                    <div className="mt-2.5 pt-2 border-t border-dashed border-zinc-800 text-[11px] text-zinc-400 text-left bg-black p-2.5 rounded-lg border border-zinc-800">
                      <p className="font-bold text-zinc-200">🏦 {paymentConfig.bankName || 'Bank Transfer'}</p>
                      <p className="font-mono font-bold text-emerald-400">A/C: {paymentConfig.bankAccountNo}</p>
                      {paymentConfig.bankBranch && <p className="text-[10px] text-zinc-500">Branch: {paymentConfig.bankBranch}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 font-medium leading-normal mb-6 text-left">
                📌 <strong>भुक्तानी निर्देशन:</strong> {paymentConfig.paymentInstruction || `QR स्क्यान गरी वा eSewa ID ${paymentConfig.esewaId || '9763323268'} (${paymentConfig.accountName || 'Ayush Chaurasiya'}) मा रकम पठाएर स्क्रीनसट WhatsApp मा पठाउनुहोस्।`}
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
        )}
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

              <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner border border-blue-500/30">
                🔑
              </div>

              <h3 className="text-xl font-extrabold text-white leading-tight text-center">
                Add New Course to Student ID
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 text-center font-medium">
                तपाईंसँग भएको सेक्रेट कोड (CLIP-XXXXXX) यहाँ राखी आफ्नो यही एकाउन्टमा नयाँ कोर्स जोड्नुहोस्।
              </p>

              <form 
                onSubmit={async (e) => {
                  await handleClaimActivationCode(e);
                  setShowCodeInputModal(false);
                }} 
                className="mt-6 space-y-4 text-left"
              >
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-blue-400 mb-2">
                    Secret Activation Code (सेक्रेट कोड) *
                  </label>
                  <input 
                    type="text"
                    required
                    autoFocus
                    value={activationCodeInput}
                    onChange={(e) => setActivationCodeInput(e.target.value)}
                    placeholder="CLIP-XXXXXX"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 rounded-2xl px-4 py-3.5 text-base font-mono font-black uppercase outline-hidden text-center tracking-widest text-white transition shadow-inner placeholder-zinc-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isActivating || !activationCodeInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  {isActivating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Linking Course to Student ID...
                    </>
                  ) : (
                    '➕ Unlock & Add Course to My Account 🚀'
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-zinc-800 text-left">
                <p className="text-[11px] text-zinc-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Linked to Student Profile: <span className="text-blue-400 font-extrabold">{currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Account'}</span>
                </p>
              </div>
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
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 text-left">
                  Secret Activation Key *
                </label>
                <input 
                  type="password"
                  value={adminCodeInput}
                  onChange={(e) => setAdminCodeInput(e.target.value)}
                  placeholder="Enter secret activation key..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 transition outline-hidden font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const code = adminCodeInput.trim().toUpperCase();
                      if (code === 'AI12XCLIP') {
                        setIsAdminActivated(true);
                        localStorage.setItem('clipzone_admin_activated', 'true');
                        setShowAdminLoginModal(false);
                        setAdminCodeInput('');
                        showToast('Admin Mode activated successfully!', 'success');
                      } else {
                        showToast('Invalid activation key. Please try again.', 'error');
                      }
                    }
                  }}
                />
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <button
                  onClick={() => {
                    const code = adminCodeInput.trim().toUpperCase();
                    if (code === 'AI12XCLIP') {
                      setIsAdminActivated(true);
                      localStorage.setItem('clipzone_admin_activated', 'true');
                      setShowAdminLoginModal(false);
                      setAdminCodeInput('');
                      showToast('Admin Mode activated successfully!', 'success');
                    } else {
                      showToast('Invalid activation key. Please try again.', 'error');
                    }
                  }}
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
        allActivationKeys={allActivationKeys}
        isAdminLoadingKeys={isAdminLoadingKeys}
        onGenerateKey={handleGenerateActivationKey}
        onDeleteKey={handleDeleteActivationKey}
        onDeleteAllKeys={handleDeleteAllKeys}
        onLogoutKey={handleLogoutUserKey}
        onRefreshKeys={fetchAdminKeys}
        onOpenLogoutConfirm={() => {
          setLogoutSecretCodeInput('');
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
        notifications={notifications}
        onSendNotification={handleSendNotification}
        onDeleteNotification={handleDeleteNotification}
        showToast={showToast}
        initialTab={adminInitialTab}
        adminUnreadAskCount={adminUnreadCount}
      />

      {/* CONFIRM LOGOUT ALL USER DEVICES MODAL */}
      <AnimatePresence>
        {showLogoutConfirmModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirmModal(false)}
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
                    <p className="text-xs text-rose-300 font-medium">सुरक्षा पुष्टि (Security Verification)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogoutConfirmModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-xs text-rose-200 space-y-2">
                <p className="font-extrabold text-rose-100">
                  ⚠️ एडमिन चेतावनी (Admin Confirmation):
                </p>
                <p className="leading-relaxed">
                  के तपाईं साच्चैं प्लेटफर्मका सम्पूर्ण विद्यार्थी तथा युजरहरुका Active Devices र Sessions लगआउट गराउन चाहनुहुन्छ?
                </p>
              </div>

              <form onSubmit={handleExecuteLogoutAllUserSessions} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-300 mb-2">
                    Enter Admin Secret Code:
                  </label>
                  <input
                    type="password"
                    value={logoutSecretCodeInput}
                    onChange={(e) => setLogoutSecretCodeInput(e.target.value)}
                    placeholder="Enter secret code..."
                    autoFocus
                    className="w-full bg-slate-950 border border-purple-500/40 focus:border-rose-500 rounded-xl px-4 py-3 text-sm font-mono font-black uppercase tracking-widest text-white placeholder-slate-600 outline-hidden text-center shadow-inner"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirmModal(false)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!logoutSecretCodeInput.trim()}
                    className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer shadow-lg active:scale-98 flex items-center justify-center gap-1.5"
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
                      कोर्ष मेटाउनु अघि अनुमति पुष्टि गर्नुहोस्
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
                    चेतावनी: यो कोर्ष र यस अन्तर्गतका सम्पूर्ण भिडियो तथा पिडिएफ सामग्रीहरू हट्नेछन्। दुर्घटनावश मेटाउनबाट बच्न तल <span className="font-bold text-white underline">DELETE</span> टाइप गर्नुहोस्।
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
                  Cancel (रद्द गर्नुहोस्)
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
                    placeholder="e.g. Dhruv Rathee YouTube Blueprint Course"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price Display Tag */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Price Display tag *</label>
                    <input 
                      type="text"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="e.g. Rs. 549"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                    />
                  </div>

                  {/* Numerical Price Value */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Amount for QR Checkout *</label>
                    <input 
                      type="number"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(Number(e.target.value))}
                      placeholder="e.g. 549"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                    />
                  </div>
                </div>

                {/* WhatsApp Message */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">WhatsApp Message Suffix</label>
                  <input 
                    type="text"
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    placeholder="e.g. I want to buy Dhruv Rathee YouTube Blueprint course"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-200 transition outline-hidden placeholder-zinc-600"
                  />
                </div>

                {/* Course Language / Medium */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Course Language / Medium (कोर्षको भाषा) *</label>
                  <input 
                    type="text"
                    required
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    placeholder="e.g. Nepali, Hindi & Nepali, English"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white transition outline-hidden placeholder-zinc-600"
                  />
                  <div className="mt-1.5 flex gap-1.5 flex-wrap">
                    {['Nepali', 'Hindi & Nepali', 'Nepali & English', 'Hindi', 'English'].map((langOption) => (
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

                {/* Course Thumbnail Image URL */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">Thumbnail Image URL *</label>
                  <input 
                    type="text"
                    required
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="e.g. https://blogger.googleusercontent.com/..."
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition outline-hidden placeholder-zinc-600"
                  />
                  <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      type="button"
                      onClick={() => setFormImage('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgXZL_14KcAVWtUkV6YOCtIePNyDndSmM7r8dFVVyp1QXLTKJzStC3O1pSK3-pwsFKhOE0RLyPfXYUo_S6ARYjLWBuRH0Ao5hipjntJKBptoXhsNU584o_EKJb-JfmGyzn57edya_hzH9RqwBvtQjwGaMIasclVW5BGKE0Uef6nDSgBiqr7diao-4seXWlX/s1600/12843.jpg')}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[9px] font-bold px-2 py-1 rounded-md shrink-0 transition cursor-pointer"
                    >
                      Dhruv Rathee BG
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormImage('https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhVG6Fh_bUev_FEchbwGJsmVz3s92FK-6lTlHj-sbYBguGhsYp8O3_J7c_SOfvnXCSWWHjLjqoeorMTcWQeac1CbhIaYtgfmHrYz44urYRSjlmrrNPoe9bMVCvcoTllNI4JaajsRwwMmuyvpUpaFs3r3UJs-4d6UuW0AmES38d4115LxC4Vsx76Wf6KW4v8/s1600/12844.png')}
                      className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[9px] font-bold px-2 py-1 rounded-md shrink-0 transition cursor-pointer"
                    >
                      Logo Asset
                    </button>
                  </div>
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

                {/* What You Learn (Newline separated) */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">What Students Learn (One point per line) *</label>
                  <textarea 
                    rows={4}
                    required
                    value={formLearnText}
                    onChange={(e) => setFormLearnText(e.target.value)}
                    placeholder="💡 Video idea खोज्ने तरिका&#10;✍️ Script writing र storytelling&#10;🎥 Shooting र presentation&#10;✂️ Editing skills"
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
                        setFormVideos([...formVideos, { chapterTitle: lastChapter, title: '', duration: '10:00', videoUrl: 'https://drive.google.com/file/d/1WW0o2qYql7EvBurHOhUNxsvw9_0qjnm7/preview' }]);
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
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            type="text"
                            required
                            placeholder="Duration (e.g. 12:15)"
                            value={video.duration}
                            onChange={(e) => {
                              const updated = [...formVideos];
                              updated[idx].duration = e.target.value;
                              setFormVideos(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-800 outline-hidden focus:border-purple-500"
                          />
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
                        Google Drive PDF लिङ्क (विद्यार्थीले बिना लगइन सिधै पढ्न सक्नेछन्)
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
                    Google Drive मा PDF upload गरेर <strong>"Anyone with the link can view"</strong> बनाउनुहोस् र लिङ्क यहाँ paste गर्नुहोस्। 
                    हाम्रो प्रणालीले स्वतः Direct Viewer मा रूपान्तरण गर्दछ जसले गर्दा विद्यार्थीले Drive login नगरिकनै सिधै हेर्न र download गर्न सक्छन्।
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {formPdfs.length === 0 ? (
                      <div className="text-center py-5 bg-white/70 rounded-lg border border-dashed border-rose-200 text-xs text-rose-600">
                        अहिले कुनै PDF थपिएको छैन। माथिको <strong>"+ Add PDF Note"</strong> बटन थिचेर Drive को PDF लिङ्क थप्नुहोस्।
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

      {/* FLOATING AI CHAT ASSISTANT BUTTON - website browser mode only */}
      {!isRunningInAppMode && (
        <div className="fixed bottom-6 left-6 z-[990]">
          <button 
            id="floating-ai-agent-fab"
            onClick={() => {
              setIsAskOpen(false);
              setIsChatOpen(prev => !prev);
            }}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 ring-2 ring-blue-400/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer relative"
            aria-label="AI Chat Assistant"
            title="AI Chat Assistant"
          >
            {isChatOpen ? (
              <X className="w-7 h-7" />
            ) : (
              <>
                <Bot className="w-8 h-8 animate-bounce mt-0.5" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 text-[9px] font-black text-white items-center justify-center">1</span>
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* CHATBOT ASSISTANT - Full Screen Native App View in App Mode & Floating Card in Web Mode */}
      <AnimatePresence>
        {isChatOpen && (
          isRunningInAppMode ? (
            /* FULL SCREEN NATIVE MOBILE APP VIEW FOR APP MODE */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="fixed inset-0 z-[4800] bg-black flex flex-col pb-[64px] pt-[env(safe-area-inset-top,0px)] select-none text-zinc-100 overflow-hidden"
            >
              {/* Native App Top Header Bar */}
              <div className="bg-black border-b border-zinc-800 px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="p-2 -ml-1.5 text-zinc-300 hover:text-white rounded-full active:bg-white/10 transition cursor-pointer flex items-center justify-center"
                    aria-label="Back to App"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-9 h-9 bg-zinc-900 border border-blue-500/30 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-xs">
                    {siteSettings.instituteLogoUrl ? (
                      <img 
                        src={siteSettings.instituteLogoUrl} 
                        alt="Bot" 
                        className="w-7 h-7 object-contain rounded"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <Bot className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-black animate-pulse"></span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                      {siteSettings.instituteName || 'AI Clipzone'} Assistant
                      <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.2 rounded-full font-black border border-blue-500/30">PRO AI 2.5</span>
                    </h4>
                    <span className="text-[10.5px] text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      अनलाइन • 24/7 Smart Study Help
                    </span>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1 text-zinc-300">
                  <button
                    onClick={() => speakBotResponse(chatMessages[chatMessages.length - 1]?.text || '')}
                    title={isSpeechActive ? "Stop Voice" : "Voice Reader"}
                    className={`p-2 rounded-xl transition cursor-pointer ${isSpeechActive ? 'bg-blue-500 text-white animate-pulse' : 'hover:bg-white/10 hover:text-white'}`}
                  >
                    {isSpeechActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                    title="AI Prompt Builder Tool"
                    className={`p-2 rounded-xl transition cursor-pointer ${showPromptBuilder ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/10 hover:text-white'}`}
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleClearChatHistory}
                    title="Reset Chat"
                    className="p-2 hover:bg-white/10 hover:text-white rounded-xl transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Advanced Prompt Builder Mini Panel */}
              {showPromptBuilder && (
                <div className="bg-zinc-950 p-3 text-white border-b border-blue-500/20 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Master Prompt Generator
                    </span>
                    <button onClick={() => setShowPromptBuilder(false)} className="text-zinc-400 hover:text-white text-xs cursor-pointer">बन्द गर्नुहोस्</button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promptTopic}
                      onChange={(e) => setPromptTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGeneratePromptTool(promptTopic);
                      }}
                      placeholder="विषय लेख्नुहोस् (उदा: Midjourney Avatar, Suno Nepali Song, YouTube Script)..."
                      className="grow bg-[#121316] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-purple-500"
                    />
                    <button
                      onClick={() => handleGeneratePromptTool(promptTopic)}
                      className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 shadow-md"
                    >
                      Generate ✨
                    </button>
                  </div>
                </div>
              )}

              {/* Native Category Filter Chips */}
              <div className="bg-[#121316] p-2.5 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto text-xs font-bold text-zinc-400 shrink-0 scrollbar-none">
                <button
                  onClick={() => setActiveChatCategory('all')}
                  className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap active:scale-95 ${activeChatCategory === 'all' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  🔥 FAQs & Help
                </button>
                <button
                  onClick={() => setActiveChatCategory('activation')}
                  className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap active:scale-95 ${activeChatCategory === 'activation' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  🔑 Activation Code
                </button>
                <button
                  onClick={() => setActiveChatCategory('prompts')}
                  className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap active:scale-95 ${activeChatCategory === 'prompts' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  🤖 AI Prompts
                </button>
                <button
                  onClick={() => setActiveChatCategory('payment')}
                  className={`px-3 py-1.5 rounded-full transition cursor-pointer whitespace-nowrap active:scale-95 ${activeChatCategory === 'payment' ? 'bg-purple-600 text-white shadow-xs' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'}`}
                >
                  💳 eSewa Payment
                </button>
              </div>

              {/* Native Chat Messages Body */}
              <div className="grow overflow-y-auto p-4 space-y-4 bg-[#0d0e12]">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 text-xs mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className="max-w-[85%] flex flex-col group">
                      <div 
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                          msg.sender === 'user' 
                            ? 'bg-purple-600 text-white rounded-tr-none shadow-md' 
                            : 'bg-[#181920] text-zinc-100 border border-zinc-800 rounded-tl-none shadow-xs'
                        }`}
                        dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
                      />
                      
                      {/* Action buttons under message */}
                      <div className={`flex items-center gap-2 mt-1.5 text-[10.5px] text-zinc-500 font-medium ${msg.sender === 'user' ? 'justify-end' : 'justify-between'}`}>
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'bot' && (
                          <div className="flex items-center gap-2 text-zinc-400">
                            <button
                              onClick={() => handleCopyChatMessage(msg.text)}
                              className="hover:text-purple-400 flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded bg-zinc-800/50"
                              title="Copy text"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                            <button
                              onClick={() => speakBotResponse(msg.text)}
                              className="hover:text-purple-400 flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded bg-zinc-800/50"
                              title="Listen"
                            >
                              <Volume2 className="w-3 h-3" /> Listen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-xs">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 text-xs">
                      <Bot className="w-4 h-4 text-purple-400 animate-pulse" />
                    </div>
                    <div className="max-w-[80%] flex flex-col">
                      <div className="bg-[#181920] text-zinc-200 border border-zinc-800 p-3.5 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Native Bottom Input Bar */}
              <div className="p-3 bg-[#16171d] border-t border-zinc-800/90 shrink-0">
                {/* Suggestions chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-20 overflow-y-auto scrollbar-none">
                  {(activeChatCategory === 'all' || activeChatCategory === 'payment') && (
                    <button 
                      onClick={() => handleSendMessage('Price कति हो?')}
                      className="bg-zinc-800/90 hover:bg-purple-900/60 active:scale-95 text-zinc-300 text-xs font-semibold py-1.5 px-3 rounded-full border border-zinc-700 transition cursor-pointer"
                    >
                      Price कति हो? 🏷️
                    </button>
                  )}
                  {(activeChatCategory === 'all' || activeChatCategory === 'activation') && (
                    <button 
                      onClick={() => handleSendMessage('Activation Code कहाँ पाइन्छ?')}
                      className="bg-zinc-800/90 hover:bg-purple-900/60 active:scale-95 text-zinc-300 text-xs font-semibold py-1.5 px-3 rounded-full border border-zinc-700 transition cursor-pointer"
                    >
                      Activation Code? 🔑
                    </button>
                  )}
                  {(activeChatCategory === 'all' || activeChatCategory === 'prompts') && (
                    <button 
                      onClick={() => handleSendMessage('Midjourney AI Prompt कसरी बनाउने?')}
                      className="bg-zinc-800/90 hover:bg-purple-900/60 active:scale-95 text-zinc-300 text-xs font-semibold py-1.5 px-3 rounded-full border border-zinc-700 transition cursor-pointer"
                    >
                      Midjourney Prompts 🎨
                    </button>
                  )}
                  {(activeChatCategory === 'all' || activeChatCategory === 'payment') && (
                    <button 
                      onClick={() => handleSendMessage('Payment कसरी गर्ने?')}
                      className="bg-zinc-800/90 hover:bg-purple-900/60 active:scale-95 text-zinc-300 text-xs font-semibold py-1.5 px-3 rounded-full border border-zinc-700 transition cursor-pointer"
                    >
                      eSewa QR Payment 💳
                    </button>
                  )}
                  <button 
                    onClick={() => handleSendMessage('Certificate कसरी Download गर्ने?')}
                    className="bg-zinc-800/90 hover:bg-purple-900/60 active:scale-95 text-zinc-300 text-xs font-semibold py-1.5 px-3 rounded-full border border-zinc-700 transition cursor-pointer"
                  >
                    Certificate Download 📜
                  </button>
                </div>

                {/* Input Text Form */}
                <div className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="AI सँग केही सोध्नुहोस्..."
                    className="grow bg-[#0d0e12] border border-zinc-700 focus:border-purple-500 rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition outline-hidden font-medium"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    className="w-10 h-10 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white rounded-full flex items-center justify-center shrink-0 shadow-md transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* FLOATING DESKTOP POPUP CARD FOR WEB BROWSER MODE */
            <div 
              className="fixed inset-0 z-[5500] flex flex-col justify-end sm:justify-end sm:items-start p-0 sm:p-6 bg-black/60 backdrop-blur-xs sm:bg-transparent pointer-events-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsChatOpen(false);
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 260 }}
                className="w-full sm:w-[410px] h-[85vh] sm:h-[580px] max-h-[92vh] bg-black rounded-t-3xl sm:rounded-3xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col pointer-events-auto"
              >
                {/* Top Header Bar */}
                <div className="bg-zinc-950 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-zinc-800 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/30 relative overflow-hidden shrink-0">
                      {siteSettings.instituteLogoUrl ? (
                        <img 
                          src={siteSettings.instituteLogoUrl} 
                          alt="Bot" 
                          className="w-7 h-7 object-contain rounded"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <Bot className="w-5 h-5 text-blue-400" />
                      )}
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-zinc-950 animate-pulse"></span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs md:text-sm tracking-tight text-white flex items-center gap-1.5">
                        {siteSettings.instituteName || 'AI Clipzone'} Assistant
                        <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-full font-black border border-blue-500/40">PRO AI</span>
                      </h4>
                      <span className="text-[10px] text-zinc-400 block font-medium">
                        नेपालको १ नम्बर AI लर्निङ असिस्टेन्ट
                      </span>
                    </div>
                  </div>

                  {/* Header Action Tools */}
                  <div className="flex items-center gap-1 text-zinc-300">
                    <button
                      onClick={() => speakBotResponse(chatMessages[chatMessages.length - 1]?.text || '')}
                      title={isSpeechActive ? "Stop Voice" : "Voice Reader"}
                      className={`p-1.5 rounded-lg transition cursor-pointer ${isSpeechActive ? 'bg-blue-600 text-white animate-pulse' : 'hover:bg-white/10 hover:text-white'}`}
                    >
                      {isSpeechActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setShowPromptBuilder(!showPromptBuilder)}
                      title="AI Prompt Builder Tool"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${showPromptBuilder ? 'bg-blue-600 text-white font-bold' : 'hover:bg-white/10 hover:text-white'}`}
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleClearChatHistory}
                      title="Reset Chat"
                      className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => setIsChatOpen(false)}
                      className="p-1.5 hover:bg-white/10 hover:text-white rounded-lg transition cursor-pointer ml-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Advanced Prompt Builder Mini Modal View */}
                {showPromptBuilder && (
                  <div className="bg-zinc-950 p-3 text-white border-b border-zinc-800 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> AI Master Prompt Builder
                      </span>
                      <button onClick={() => setShowPromptBuilder(false)} className="text-zinc-400 hover:text-white text-xs cursor-pointer">Close</button>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={promptTopic}
                        onChange={(e) => setPromptTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGeneratePromptTool(promptTopic);
                        }}
                        placeholder="विषय लेख्नुहोस् (उदा: Shorts Video, Avatar, Suno Song)..."
                        className="grow bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-hidden"
                      />
                      <button
                        onClick={() => handleGeneratePromptTool(promptTopic)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer shrink-0 shadow-sm"
                      >
                        Generate ✨
                      </button>
                    </div>
                  </div>
                )}

                {/* Category Filter Chips */}
                <div className="bg-zinc-950 p-2 border-b border-zinc-805 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-zinc-300 shrink-0 scrollbar-none">
                  <button
                    onClick={() => setActiveChatCategory('all')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${activeChatCategory === 'all' ? 'bg-blue-600 text-white font-black shadow-xs' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'}`}
                  >
                    🔥 FAQs
                  </button>
                  <button
                    onClick={() => setActiveChatCategory('activation')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${activeChatCategory === 'activation' ? 'bg-blue-600 text-white font-black shadow-xs' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'}`}
                  >
                    🔑 Code & Key
                  </button>
                  <button
                    onClick={() => setActiveChatCategory('prompts')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${activeChatCategory === 'prompts' ? 'bg-blue-600 text-white font-black shadow-xs' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'}`}
                  >
                    🤖 AI Prompts
                  </button>
                  <button
                    onClick={() => setActiveChatCategory('payment')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${activeChatCategory === 'payment' ? 'bg-blue-600 text-white font-black shadow-xs' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'}`}
                  >
                    💳 eSewa Payment
                  </button>
                </div>

                {/* Chat messages body */}
                <div className="grow overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-black">
                  {chatMessages.map((msg, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.sender === 'bot' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 text-xs mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      
                      <div className="max-w-[85%] flex flex-col group">
                        <div 
                          className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed ${
                            msg.sender === 'user' 
                              ? 'bg-blue-600 text-white font-semibold rounded-tr-none shadow-md' 
                              : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none shadow-xs'
                          }`}
                          dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
                        />
                        
                        {/* Action buttons under message */}
                        <div className={`flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-medium ${msg.sender === 'user' ? 'justify-end' : 'justify-between'}`}>
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'bot' && (
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => handleCopyChatMessage(msg.text)}
                                className="hover:text-blue-400 text-zinc-400 flex items-center gap-0.5 cursor-pointer"
                                title="Copy text"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                              <button
                                onClick={() => speakBotResponse(msg.text)}
                                className="hover:text-blue-400 text-zinc-400 flex items-center gap-0.5 cursor-pointer"
                                title="Listen"
                              >
                                <Volume2 className="w-3 h-3" /> Listen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 text-xs">
                        <Bot className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="max-w-[80%] flex flex-col">
                        <div className="bg-zinc-900 text-zinc-200 border border-zinc-800 p-3 rounded-2xl rounded-tl-none shadow-xs flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Bottom Quick reply chips & Input bar */}
                <div className="p-3 bg-zinc-950 border-t border-zinc-800 shrink-0">
                  {/* Suggestions chips filtered by active category */}
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto">
                    {(activeChatCategory === 'all' || activeChatCategory === 'payment') && (
                      <button 
                        onClick={() => handleSendMessage('Price कति हो?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        Price कति हो? 🏷️
                      </button>
                    )}
                    {(activeChatCategory === 'all' || activeChatCategory === 'activation') && (
                      <button 
                        onClick={() => handleSendMessage('Activation Code कहाँ पाइन्छ?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        Activation Code? 🔑
                      </button>
                    )}
                    {(activeChatCategory === 'all' || activeChatCategory === 'activation') && (
                      <button 
                        onClick={() => handleSendMessage('Invalid key देखाए के गर्ने?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        Invalid Code Fix? 🚨
                      </button>
                    )}
                    {(activeChatCategory === 'all' || activeChatCategory === 'prompts') && (
                      <button 
                        onClick={() => handleSendMessage('Midjourney AI Prompt कसरी बनाउने?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        Midjourney Prompts 🎨
                      </button>
                    )}
                    {(activeChatCategory === 'all' || activeChatCategory === 'payment') && (
                      <button 
                        onClick={() => handleSendMessage('Payment कसरी गर्ने?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        eSewa QR Payment 💳
                      </button>
                    )}
                    {(activeChatCategory === 'all' || activeChatCategory === 'prompts') && (
                      <button 
                        onClick={() => handleSendMessage('Suno AI ले गीत कसरी बनाउने?')}
                        className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                      >
                        Suno Music Creation 🎵
                      </button>
                    )}
                    <button 
                      onClick={() => handleSendMessage('Certificate कसरी Download गर्ने?')}
                      className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 text-[11px] font-bold py-1 px-2.5 rounded-full border border-blue-500/25 transition cursor-pointer"
                    >
                      Certificate Download 📜
                    </button>
                  </div>

                  {/* Input Text Form */}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendMessage();
                      }}
                      placeholder="तपाईंको प्रश्न वा विषय यहाँ लेख्नुहोस्..."
                      className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 focus:bg-zinc-950 text-white placeholder-zinc-500 rounded-full px-4 py-2 text-xs md:text-sm transition outline-hidden font-medium"
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      className="w-9 h-9 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md transition cursor-pointer font-bold"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* AI Clipzone Nepal Branding Badge anchored at the bottom of the widget */}
                  <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-bold bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-zinc-300">{siteSettings.instituteName || 'AI Clipzone'} Assistant</span>
                    </div>
                    <span className="text-blue-400 text-[9px] uppercase tracking-wider font-black">{siteSettings.instituteName || 'AI Clipzone Nepal'} 🇳🇵</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )
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
                  title="Rotate Video Screen 🔄 (भिडियो घुमाउनुहोस्)"
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
                  title="Close Video (भिडियो बन्द गर्नुहोस्)"
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
                    title="Close Video (भिडियो बन्द गर्नुहोस्)"
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
              IP Security Monitored • {siteSettings.instituteName || 'AI Clipzone Nepal'}
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
        // Resolve target course: by selectedCertCourseId, or matching title/courseTitleOverride, or selectedCourse, or first active/available course
        const targetedCourse =
          courses.find(c => selectedCertCourseId && c.id === selectedCertCourseId) ||
          courses.find(c => c.title === certificateCourseTitle || (c.certificateCourseTitle && c.certificateCourseTitle === certificateCourseTitle)) ||
          (selectedCourse ? courses.find(c => c.id === selectedCourse.id) : null) ||
          (selectedClassroomCourseId ? courses.find(c => c.id === selectedClassroomCourseId) : null) ||
          courses[0];

        const effectiveCourseTitle = targetedCourse?.certificateCourseTitle || targetedCourse?.title || certificateCourseTitle || 'AI CONTENT CREATION & DIGITAL DESIGN MASTERCLASS';
        const effectiveInstituteName = targetedCourse?.certificateInstituteName || siteSettings.certificateInstituteName || siteSettings.instituteName || 'AI CLIPZONE NEPAL';
        const effectiveLogoUrl = targetedCourse?.certificateLogoUrl || siteSettings.certificateLogoUrl || siteSettings.instituteLogoUrl;
        const effectiveCertTitle = targetedCourse?.certificateTitle || siteSettings.certificateTitle || 'CERTIFICATE';
        const effectiveCertSubtitle = targetedCourse?.certificateSubtitle || siteSettings.certificateSubtitle || 'OF ACHIEVEMENT';
        const effectiveDescription = targetedCourse?.certificateDescription || siteSettings.certificateDescription;
        const effectiveDirectorName = targetedCourse?.certificateDirectorName || siteSettings.certificateDirectorName || 'Director';
        const effectiveDirectorTitle = targetedCourse?.certificateDirectorTitle || siteSettings.certificateDirectorTitle || 'Course Director';
        const effectiveDirectorSig = targetedCourse?.certificateDirectorSignatureUrl || siteSettings.certificateDirectorSignatureUrl;
        const effectiveCeoName = targetedCourse?.certificateCeoName || siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)';
        const effectiveCeoTitle = targetedCourse?.certificateCeoTitle || siteSettings.certificateCeoTitle || 'Founder & CEO';
        const effectiveCeoSig = targetedCourse?.certificateCeoSignatureUrl || siteSettings.certificateCeoSignatureUrl;
        const effectiveTheme = targetedCourse?.certificateTheme || siteSettings.certificateTheme || 'blue';
        const effectiveStampUrl = targetedCourse?.certificateStampUrl || siteSettings.certificateStampUrl;
        const effectiveSealText = targetedCourse?.certificateSealText || siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL';

        return (
          <CertificateModal
            studentName={certificateStudentName || currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner'}
            courseTitle={effectiveCourseTitle}
            issueDate={certificateIssueDate || '2083/01/14'}
            certificateId={certificateCode}
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
            courses={courses}
            selectedCourseId={targetedCourse?.id}
            onSelectCourseId={(newId) => {
              setSelectedCertCourseId(newId);
              const found = courses.find(c => c.id === newId);
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

      {/* PWA INSTALLATION NATIVE DIALOG MATCHING USER SCREENSHOT */}
      {showPwaInstallModal && (
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
                    src={siteSettings.instituteLogoUrl && siteSettings.instituteLogoUrl.trim() ? siteSettings.instituteLogoUrl.trim() : LOGO_DATA_URL} 
                    alt={siteSettings.instituteName || "App Logo"} 
                    className="w-full h-full object-contain" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => { e.currentTarget.src = LOGO_DATA_URL; }}
                  />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">Installing {siteSettings.instituteName || 'App'}...</h4>
                  <p className="text-xs text-blue-400 font-medium mt-1">
                    होम स्क्रिनमा थपिँदैछ, कृपया १ सेकेन्ड पर्खनुहोस्...
                  </p>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden relative mt-3">
                  <div className="bg-blue-600 h-full w-full animate-pulse rounded-full"></div>
                </div>
              </div>
            ) : (
              <>
                {/* Title */}
                <h3 className="text-xl font-medium text-slate-100 mb-6 text-left tracking-tight">
                  Install app
                </h3>

                {/* App Info Row */}
                <div className="flex items-center gap-4 my-2">
                  <div className="w-16 h-12 rounded-xl bg-black border border-zinc-700 p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                    <img 
                      src={siteSettings.instituteLogoUrl && siteSettings.instituteLogoUrl.trim() ? siteSettings.instituteLogoUrl.trim() : LOGO_DATA_URL} 
                      alt={siteSettings.instituteName || "App Logo"} 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => { e.currentTarget.src = LOGO_DATA_URL; }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-lg font-medium text-white truncate tracking-normal">
                      {siteSettings.instituteName || 'AI Clipzone'}
                    </h4>
                    <p className="text-sm text-slate-400 truncate font-normal mt-0.5">
                      {typeof window !== 'undefined' ? window.location.hostname || 'aiclipzone.netlify.app' : 'aiclipzone.netlify.app'}
                    </p>
                  </div>
                </div>

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
                    onClick={() => setShowPwaInstallModal(false)}
                    className="text-[#a8c7fa] hover:bg-white/10 text-sm font-medium px-5 py-2.5 rounded-full transition cursor-pointer active:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmInstallModal}
                    className="text-[#a8c7fa] hover:bg-white/10 text-sm font-semibold px-5 py-2.5 rounded-full transition cursor-pointer active:bg-white/20"
                  >
                    Install
                  </button>
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

      {/* PWA FIRST VISIT NOTIFICATION PROMPT MODAL - STRICTLY ONLY IN INSTALLED PWA APP */}
      {isRunningInAppMode && (
        <NotificationPromptModal
          isOpen={showNotifPromptModal}
          onClose={() => setShowNotifPromptModal(false)}
          showToast={showToast}
          onPermissionGranted={() => {
            showToast('🎉 Notifications enabled! You will receive course updates & discounts.', 'success');
          }}
        />
      )}

      {/* NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        isOpen={showNotifCenterModal}
        onClose={() => setShowNotifCenterModal(false)}
        notifications={notifications}
        unreadIds={unreadNotifIds}
        showToast={showToast}
        onNotificationClick={(notif) => {
          if (notif.url) {
            if (notif.url.startsWith('#') || notif.url.startsWith('/#')) {
              const hash = notif.url.replace('/#', '#');
              window.location.hash = hash;
            } else if (notif.url.startsWith('/')) {
              window.location.href = notif.url;
            } else {
              window.open(notif.url, '_blank');
            }
          }
        }}
        onMarkAllRead={handleMarkAllNotifsRead}
        onRequestPermissionPrompt={() => setShowNotifPromptModal(true)}
      />

      {/* ASK & LIVE SUPPORT CHAT MODAL ("Message to AI CLIPZONE") */}
      <AskChatModal
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        isRunningInAppMode={isRunningInAppMode}
        siteSettings={siteSettings}
        currentUserId={
          (() => {
            if (isAdminActivated || isFirebaseUserAdmin(currentUser?.email)) {
              return currentUser?.uid || getOrCreateDeviceId();
            }
            try {
              const localName = cleanRealName(localStorage.getItem('clipzone_student_name')) || cleanRealName(currentUser?.displayName) || cleanRealName(authName);
              const activeCodes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
              if (Array.isArray(allActivationKeys)) {
                const match = allActivationKeys.find((k: any) => {
                  if (activeCodes.includes(k.code || k.id)) return true;
                  if (localName && k.studentName && k.studentName.trim().toLowerCase() === localName.toLowerCase()) return true;
                  if (localName && k.claimedByName && k.claimedByName.trim().toLowerCase() === localName.toLowerCase()) return true;
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
        isAdmin={isAdminActivated || isFirebaseUserAdmin(currentUser?.email)}
        allActivationKeys={allActivationKeys}
      />

      {/* NATIVE APP BOTTOM NAVIGATION BAR - ONLY VISIBLE IN INSTALLED APK / PWA APP MODE (NEVER ON REGULAR BROWSER LINK) */}
      {isRunningInAppMode && (
        <nav 
          id="native-app-bottom-bar"
          aria-label="App Navigation Bar" 
          className="fixed bottom-0 inset-x-0 z-[4900] bg-black border-t border-zinc-800 shadow-[0_-10px_35px_rgba(0,0,0,0.9)] pb-[env(safe-area-inset-bottom,0px)] select-none backdrop-blur-md"
        >
          <div className="max-w-md mx-auto px-1 py-1.5 flex items-center justify-around">
            {/* 1. Home */}
            <button
              id="app-nav-home"
              onClick={() => {
                setIsChatOpen(false);
                setIsAskOpen(false);
                setShowProfileModal(false);
                setCurrentView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                currentView === 'home' && !isChatOpen && !isAskOpen && !showProfileModal
                  ? 'text-blue-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Home className={`w-5 h-5 mb-0.5 ${currentView === 'home' && !isChatOpen && !isAskOpen && !showProfileModal ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
              <span className="text-[10.5px] font-semibold tracking-tight">Home</span>
            </button>

            {/* 2. Classroom */}
            <button
              id="app-nav-classroom"
              onClick={() => {
                setIsChatOpen(false);
                setIsAskOpen(false);
                setShowProfileModal(false);
                setCurrentView('classroom');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 relative ${
                currentView === 'classroom' && !isChatOpen && !isAskOpen && !showProfileModal
                  ? 'text-blue-400 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <BookOpen className={`w-5 h-5 mb-0.5 ${currentView === 'classroom' && !isChatOpen && !isAskOpen && !showProfileModal ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
                {/* Green Notification Dot from Screenshot */}
                <span className="w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-black absolute -top-1 -right-1.5 animate-pulse shadow-xs" />
              </div>
              <span className="text-[10.5px] font-semibold tracking-tight">Classroom</span>
            </button>

            {/* 3. Certificate */}
            <button
              id="app-nav-certificate"
              onClick={() => {
                setIsChatOpen(false);
                setIsAskOpen(false);
                setShowProfileModal(false);
                const isLoggedIn = !!currentUser || !!localStorage.getItem('clipzone_student_name') || activeCourseIds.length > 0;
                if (!isLoggedIn) {
                  showToast('🔒 प्रमाणपत्र हेर्न कृपया आफ्नो Activation Code मार्फत पहिले लगइन गर्नुहोस्! (Please sign in to view certificate)', 'info');
                  setShowCodeInputModal(true);
                  return;
                }
                const activeCourses = courses.filter(c => activeCourseIds.includes(c.id));
                const currentCourse = activeCourses.find(c => c.id === selectedClassroomCourseId) || activeCourses[0] || courses[0];
                const studentName = currentUser?.displayName || authName || localStorage.getItem('clipzone_student_name') || 'Student Learner';
                const activeCode = currentCourse ? getCourseActivationCode(currentCourse.id) : (userActivationKeys[0]?.code || 'AICLIP-CERT-2026');
                const cleanTitle = (currentCourse?.title || 'AI Master Course').replace(/by Dhruv Rathee/gi, 'by AI Clipzone').replace(/Dhruv Rathee/gi, 'AI Clipzone');
                setCertificateCourseTitle(cleanTitle);
                setCertificateStudentName(studentName);
                setCertificateIssueDate('2083/01/14');
                setCertificateCode(activeCode);
                setShowCertificateModal(true);
              }}
              className="flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 text-zinc-400 hover:text-blue-300"
            >
              <Award className="w-5 h-5 mb-0.5 stroke-[2.2] text-blue-400" />
              <span className="text-[10.5px] font-semibold text-zinc-400 tracking-tight">Certificate</span>
            </button>

            {/* 4. Ask (Message to AI CLIPZONE) */}
            <button
              id="app-nav-ask"
              onClick={() => {
                setShowProfileModal(false);
                setIsChatOpen(false);
                setIsAskOpen(prev => !prev);
                if (!isAskOpen && !isUserAdminSession) {
                  setStudentUnreadCount(0);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                isAskOpen ? 'text-blue-400 font-bold' : 'text-zinc-400 hover:text-blue-300'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <MessageCircle className={`w-5 h-5 mb-0.5 ${isAskOpen ? 'stroke-[2.5] text-blue-400' : 'stroke-[1.8]'}`} />
                {hasAskUnread && (
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-black absolute -top-1 -right-1.5 animate-pulse shadow-xs" title="New message" />
                )}
              </div>
              <span className="text-[10.5px] font-semibold tracking-tight">Ask</span>
            </button>

            {/* 5. Account */}
            <button
              id="app-nav-account"
              onClick={() => {
                setIsChatOpen(false);
                setIsAskOpen(false);
                setShowProfileModal(true);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                showProfileModal && !isAskOpen ? 'text-sky-400 font-bold' : 'text-zinc-400 hover:text-sky-300'
              }`}
            >
              <User className="w-5 h-5 mb-0.5 stroke-[2.2] text-sky-400" />
              <span className="text-[10.5px] font-semibold tracking-tight">Account</span>
            </button>
          </div>
        </nav>
      )}

    </div>
  );
}
