import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  X, 
  Send, 
  Check, 
  CheckCheck, 
  Lock, 
  MessageCircle, 
  Search,
  ShieldCheck,
  RefreshCw,
  Phone,
  Smile,
  Paperclip,
  CheckCircle2,
  MoreVertical,
  Trash2,
  RotateCcw,
  Info,
  Maximize2,
  Minimize2,
  Copy,
  Download,
  Image as ImageIcon,
  FileText,
  Eye,
  FileUp
} from 'lucide-react';
import { 
  ChatAttachment, 
  formatFileSize, 
  compressImageFile, 
  readDocumentFile, 
  downloadFileAttachment 
} from '../utils/chatMedia';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { cleanLegacyLogoUrl } from '../data';
import { Course, SubAdminAccount, SupportMessage, SupportConversation, SiteSettingsConfig } from '../types';

interface AskChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRunningInAppMode: boolean;
  siteSettings: SiteSettingsConfig;
  currentUserId: string;
  initialStudentName: string;
  userEmail?: string;
  activeCourseName?: string;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  isAdmin?: boolean;
  adminRole?: 'main_admin' | 'sub_admin';
  subAdminSession?: SubAdminAccount | null;
  subAdmins?: SubAdminAccount[];
  courses?: Course[];
  activeCourseIds?: string[];
  allActivationKeys?: any[];
  hasActivatedCourse?: boolean;
  onOpenActivationModal?: () => void;
  studentAvatar?: string;
  embedded?: boolean;
}

const QUICK_QUESTION_CHIPS = [
  'नमस्ते, मलाई कोर्ष बारे जानकारी चाहियो।',
  'पेमेन्ट गरिसकेपछि Activation Key कसरी पाउने?',
  'प्रमाणपत्र (Certificate) कसरी डाउनलोड गर्ने?',
  'भिडियो लोड हुन समय लागिरहेको छ, के गर्ने?'
];

const ADMIN_QUICK_PRESETS = [
  'नमस्ते! तपाईंलाई के सहयोग चाहिन्छ?',
  'तपाईंको भुक्तानी भेरिफाई भयो, धन्यवाद!',
  'तपाईंको Activation Key तयार छ।',
  'कृपया आफ्नो पेमेन्ट स्क्रिनसट वा ट्रान्ज्याक्सन आईडी पठाउनुहोस्।',
  'समस्या समाधान भएको छ, कृपया पुनः भिडियो खोलेर हेर्नुहोस्।'
];

const SUB_ADMIN_TO_MAIN_PRESETS = [
  'नमस्ते Main Admin ज्यू! मलाई कोर्ष सम्बन्धी सहयोग चाहिन्छ।',
  'कोर्ष अपडेट / सेटिङ बारे जानकारी दिनुहोस्।',
  'धन्यवाद सर!'
];

const WHATSAPP_QUICK_EMOJIS = ['😊', '👍', '🙏', '🚀', '💡', '❤️', '❓', '🔥', '🎓', '👏', '💯', '✅'];

export const AskChatModal: React.FC<AskChatModalProps> = ({
  isOpen,
  onClose,
  isRunningInAppMode,
  siteSettings,
  currentUserId,
  initialStudentName,
  userEmail = '',
  activeCourseName = '',
  showToast,
  isAdmin = false,
  adminRole = 'main_admin',
  subAdminSession = null,
  subAdmins = [],
  courses = [],
  activeCourseIds = [],
  allActivationKeys = [],
  hasActivatedCourse = false,
  onOpenActivationModal,
  studentAvatar = '',
  embedded = false
}) => {
  const isMainAdminMode = Boolean(isAdmin && adminRole === 'main_admin');
  const isSubAdminMode = Boolean(isAdmin && adminRole === 'sub_admin' && subAdminSession?.code);
  const brandName =
    (siteSettings.instituteName && !/official|admin/i.test(siteSettings.instituteName)
      ? siteSettings.instituteName
      : 'AI Clipzone'
    ).trim() || 'AI Clipzone';
  const officialLogoUrl = cleanLegacyLogoUrl(siteSettings.instituteLogoUrl);
  const isRenderableAvatar = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('/')
    );
  };
  // Helper to ensure name is a real student name - strictly never "Student Learner" or generic placeholder
  const cleanRealName = (name: string | undefined | null): string => {
    if (!name) return '';
    const trimmed = name.trim();
    const lower = trimmed.toLowerCase();
    if (
      lower === 'student learner' ||
      lower === 'student' ||
      lower === 'learner' ||
      lower === 'clipzone student'
    ) {
      return '';
    }
    return trimmed;
  };

  // --------------------------------------------------------------------------
  // STUDENT VIEW STATES
  // --------------------------------------------------------------------------
  const [studentMessages, setStudentMessages] = useState<SupportMessage[]>([]);
  const [studentInputText, setStudentInputText] = useState('');
  const [isStudentSending, setIsStudentSending] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [studentName, setStudentName] = useState(() => {
    const fromProp = cleanRealName(initialStudentName);
    if (fromProp) return fromProp;
    const fromStorage = cleanRealName(localStorage.getItem('clipzone_student_name'));
    if (fromStorage) return fromStorage;
    if (userEmail) {
      const p = userEmail.split('@')[0];
      return p.charAt(0).toUpperCase() + p.slice(1);
    }
    return 'Student';
  });
  const studentEndRef = useRef<HTMLDivElement>(null);
  const studentInputRef = useRef<HTMLInputElement>(null);
  const studentImageInputRef = useRef<HTMLInputElement>(null);
  const studentDocInputRef = useRef<HTMLInputElement>(null);
  const [studentPendingAttachment, setStudentPendingAttachment] = useState<ChatAttachment | null>(null);
  const [showStudentAttachMenu, setShowStudentAttachMenu] = useState(false);
  const [isStudentAttaching, setIsStudentAttaching] = useState(false);

  // --------------------------------------------------------------------------
  // ADMIN VIEW STATES (When user is Admin and opens Ask)
  // --------------------------------------------------------------------------
  const [adminConversations, setAdminConversations] = useState<SupportConversation[]>([]);
  const [selectedAdminConvId, setSelectedAdminConvId] = useState<string | null>(null);
  const [adminMessages, setAdminMessages] = useState<SupportMessage[]>([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [isAdminSending, setIsAdminSending] = useState(false);
  const [isLoadingAdminConvs, setIsLoadingAdminConvs] = useState(true);
  const adminEndRef = useRef<HTMLDivElement>(null);
  const adminReplyInputRef = useRef<HTMLInputElement>(null);
  const adminImageInputRef = useRef<HTMLInputElement>(null);
  const adminDocInputRef = useRef<HTMLInputElement>(null);
  const [adminPendingAttachment, setAdminPendingAttachment] = useState<ChatAttachment | null>(null);
  const [showAdminAttachMenu, setShowAdminAttachMenu] = useState(false);
  const [isAdminAttaching, setIsAdminAttaching] = useState(false);

  // Shared Copy & Lightbox States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Full-screen mode state - defaults to true so Ask opens in full screen
  const [isFullScreen, setIsFullScreen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('clipzone_ask_fullscreen');
      return stored !== null ? stored === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const toggleFullScreen = () => {
    setIsFullScreen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('clipzone_ask_fullscreen', String(next));
      } catch (e) {}
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // CANONICAL STUDENT USER ID: strictly ensure student messages use the same permanent conversation doc
  // --------------------------------------------------------------------------
  const effectiveUserId = useMemo(() => {
    if (isAdmin) return currentUserId;
    const cleanName = cleanRealName(studentName) || cleanRealName(initialStudentName);
    if (Array.isArray(allActivationKeys)) {
      const match = allActivationKeys.find((k: any) => {
        if (k.claimedByUid && k.claimedByUid === currentUserId) return true;
        if (cleanName && k.studentName && k.studentName.trim().toLowerCase() === cleanName.toLowerCase()) return true;
        if (cleanName && k.claimedByName && k.claimedByName.trim().toLowerCase() === cleanName.toLowerCase()) return true;
        if (userEmail && k.claimedByEmail && k.claimedByEmail.toLowerCase() === userEmail.toLowerCase()) return true;
        return false;
      });
      if (match?.claimedByUid) {
        try {
          localStorage.setItem('clipzone_student_uid', match.claimedByUid);
        } catch (e) {}
        return match.claimedByUid;
      }
    }
    return currentUserId;
  }, [isAdmin, currentUserId, studentName, initialStudentName, userEmail, allActivationKeys]);

  // --------------------------------------------------------------------------
  // STUDENT ROUTING TO ASSIGNED COURSE SUB-ADMIN (NEVER TO MAIN ADMIN)
  // --------------------------------------------------------------------------
  const studentSubAdminTargets = useMemo(() => {
    if (isAdmin) return [];
    const activeSubs = (subAdmins || []).filter(s => s.status === 'active');
    if (activeSubs.length === 0) return [];

    const targets: { courseId: string; courseTitle: string; courseWhatsapp?: string; subAdmin: SubAdminAccount }[] = [];
    const seenSubCodes = new Set<string>();

    const checkCourseList = activeCourseIds.includes('course-all')
      ? courses
      : courses.filter(c => activeCourseIds.includes(c.id));

    checkCourseList.forEach((crs) => {
      const matchedSub = activeSubs.find(
        s => s.courseId === crs.id || s.courseTitle.trim().toLowerCase() === crs.title.trim().toLowerCase()
      );
      if (matchedSub && !seenSubCodes.has(matchedSub.code)) {
        seenSubCodes.add(matchedSub.code);
        targets.push({
          courseId: crs.id,
          courseTitle: crs.title,
          courseWhatsapp: crs.paymentConfig?.whatsappNumber,
          subAdmin: matchedSub
        });
      }
    });

    // Fallback check against activeCourseIds directly if course object wasn't in prop
    activeCourseIds.forEach((cid) => {
      if (cid === 'course-all') return;
      const matchedSub = activeSubs.find(s => s.courseId === cid);
      if (matchedSub && !seenSubCodes.has(matchedSub.code)) {
        seenSubCodes.add(matchedSub.code);
        targets.push({
          courseId: cid,
          courseTitle: matchedSub.courseTitle,
          subAdmin: matchedSub
        });
      }
    });

    return targets;
  }, [isAdmin, subAdmins, activeCourseIds, courses]);

  const [selectedStudentSubCode, setSelectedStudentSubCode] = useState<string>('');

  useEffect(() => {
    if (!isAdmin && studentSubAdminTargets.length > 0) {
      const stillValid = studentSubAdminTargets.some(t => t.subAdmin.code === selectedStudentSubCode);
      if (!stillValid) {
        setSelectedStudentSubCode(studentSubAdminTargets[0].subAdmin.code);
      }
    } else {
      setSelectedStudentSubCode('');
    }
  }, [isAdmin, studentSubAdminTargets, selectedStudentSubCode]);

  const activeStudentTarget = useMemo(() => {
    if (studentSubAdminTargets.length === 0) return null;
    return studentSubAdminTargets.find(t => t.subAdmin.code === selectedStudentSubCode) || studentSubAdminTargets[0];
  }, [studentSubAdminTargets, selectedStudentSubCode]);

  const studentConvId = useMemo(() => {
    const uid = effectiveUserId || currentUserId;
    if (!uid || !activeStudentTarget) return '';
    return `substudent__${activeStudentTarget.subAdmin.code}__${uid}`;
  }, [effectiveUserId, currentUserId, activeStudentTarget]);

  // --------------------------------------------------------------------------
  // WHATSAPP "CLEAR CHAT FROM OWN ONLY" STATES
  // --------------------------------------------------------------------------
  const [studentClearedAt, setStudentClearedAt] = useState<number>(() => {
    if (typeof window === 'undefined' || !studentConvId) return 0;
    return Number(localStorage.getItem(`clipzone_chat_cleared_user_${studentConvId}`) || 0);
  });
  const [studentMenuOpen, setStudentMenuOpen] = useState(false);
  const [showStudentClearConfirm, setShowStudentClearConfirm] = useState(false);

  const [adminClearedAt, setAdminClearedAt] = useState<number>(0);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [showAdminClearConfirm, setShowAdminClearConfirm] = useState(false);

  // Sync student name prop when it changes and contains a real name
  useEffect(() => {
    const cleanProp = cleanRealName(initialStudentName);
    if (cleanProp && cleanProp !== studentName) {
      setStudentName(cleanProp);
      localStorage.setItem('clipzone_student_name', cleanProp);
    }
  }, [initialStudentName]);

  // Sync student clearedAt timestamp whenever studentConvId changes
  useEffect(() => {
    if (studentConvId) {
      const local = Number(localStorage.getItem(`clipzone_chat_cleared_user_${studentConvId}`) || 0);
      setStudentClearedAt(local);
    } else {
      setStudentClearedAt(0);
    }
  }, [studentConvId]);

  // Sync student avatar to Sub-Admin conversation in Firestore
  useEffect(() => {
    const effectivePhoto = studentAvatar || localStorage.getItem('clipzone_student_avatar') || '';
    if (!isAdmin && studentConvId && effectivePhoto) {
      try {
        setDoc(doc(db, 'support_conversations', studentConvId), {
          userAvatar: effectivePhoto,
          updatedAt: Date.now()
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  }, [isOpen, isAdmin, studentConvId, studentAvatar]);

  // Listen to student conversation doc for remote cleared timestamp
  useEffect(() => {
    if (!isOpen || isAdmin || !studentConvId) return;
    const convRef = doc(db, 'support_conversations', studentConvId);
    const unsub = onSnapshot(convRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.clearedByUserAt !== undefined) {
          setStudentClearedAt((prev) => Math.max(prev, d.clearedByUserAt || 0));
        }
      }
    });
    return () => unsub();
  }, [isOpen, isAdmin, studentConvId]);

  // Sync admin clearedAt timestamp whenever selected conversation changes
  useEffect(() => {
    if (selectedAdminConvId) {
      const local = Number(localStorage.getItem(`clipzone_chat_cleared_admin_${selectedAdminConvId}`) || 0);
      const conv = adminConversations.find(c => c.id === selectedAdminConvId);
      const remote = conv?.clearedByAdminAt || 0;
      setAdminClearedAt(Math.max(local, remote));
      setAdminMenuOpen(false);
    } else {
      setAdminClearedAt(0);
      setAdminMenuOpen(false);
    }
  }, [selectedAdminConvId, adminConversations]);

  // ==========================================================================
  // 1. STUDENT MODE: Listener strictly for student's assigned Sub-Admin thread
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || isAdmin || !studentConvId) {
      if (!isAdmin) setStudentMessages([]);
      return;
    }

    const messagesRef = collection(db, 'support_conversations', studentConvId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMsgs: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            conversationId: studentConvId,
            sender: data.sender || 'user',
            senderName: data.senderName || 'Student',
            text: data.text || '',
            timestamp: data.timestamp || Date.now(),
            isSeen: data.isSeen ?? false,
            status: data.status ?? (data.isSeen ? 'seen' : 'sent'),
            seenAt: data.seenAt,
            attachmentType: data.attachmentType,
            attachmentUrl: data.attachmentUrl,
            attachmentName: data.attachmentName,
            attachmentSize: data.attachmentSize
          });

          if (data.sender === 'admin' && !data.isSeen) {
            try {
              updateDoc(docSnap.ref, {
                isSeen: true,
                status: 'seen',
                seenAt: Date.now()
              }).catch(() => {});
            } catch (e) {}
          }
        });

        setStudentMessages(loadedMsgs);

        try {
          const convRef = doc(db, 'support_conversations', studentConvId);
          updateDoc(convRef, {
            unreadUserCount: 0
          }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not sync student support messages live:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin, studentConvId]);

  // Filter messages based on WhatsApp-style local cleared timestamp
  const displayedStudentMessages = studentMessages.filter(
    (msg) => !studentClearedAt || msg.timestamp > studentClearedAt
  );

  // Scroll to bottom when student messages update
  useEffect(() => {
    if (isOpen && !isAdmin) {
      studentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedStudentMessages, isOpen, isAdmin]);

  // ==========================================================================
  // 2. ADMIN / SUB-ADMIN MODE: Role-isolated Messenger Listener
  //    - Main Admin: All Sub-Admins ONLY (never student chats)
  //    - Sub-Admin: Official Main Admin (pinned top) + ONLY course students
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    setIsLoadingAdminConvs(true);
    const convsRef = collection(db, 'support_conversations');
    const q = query(convsRef, orderBy('lastMessageAt', 'desc'), limit(300));
    const normTitle = (t?: string) => (t || '').trim().toLowerCase();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isMainAdminMode) {
          const subDocMap = new Map<string, any>();
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.channelType === 'subadmin_mainadmin' || docSnap.id.startsWith('subadmin_main__')) {
              const code = d.subAdminCode || docSnap.id.replace('subadmin_main__', '');
              subDocMap.set(code, { id: docSnap.id, ...d });
            }
          });

          const list: SupportConversation[] = [];
          const seen = new Set<string>();
          (subAdmins || []).forEach((sub) => {
            if (!sub.code) return;
            seen.add(sub.code);
            const remote = subDocMap.get(sub.code);
            const courseObj = courses.find((c) => c.id === sub.courseId);
            const courseName = courseObj?.title || sub.courseTitle || '';
            const avatar = sub.avatarUrl || remote?.userAvatar || '';
            list.push({
              id: `subadmin_main__${sub.code}`,
              userId: sub.code,
              userName: sub.name || 'Sub-Admin',
              userEmail: '',
              userAvatar: avatar,
              channelType: 'subadmin_mainadmin',
              subAdminCode: sub.code,
              subAdminName: sub.name,
              courseId: sub.courseId,
              activeCourse: courseName,
              purchasedCourses: courseName ? [courseName] : [],
              lastMessage: remote?.lastMessage || 'कुनै म्यासेज छैन',
              lastMessageAt: remote?.lastMessageAt || sub.lastLoginAt || sub.createdAt || Date.now(),
              lastSender: remote?.lastSender || 'system',
              unreadAdminCount: remote?.unreadAdminCount || 0,
              unreadUserCount: remote?.unreadUserCount || 0,
              createdAt: remote?.createdAt || sub.createdAt || Date.now(),
              updatedAt: remote?.updatedAt || Date.now(),
              clearedByUserAt: remote?.clearedByUserAt || 0,
              clearedByAdminAt: remote?.clearedByAdminAt || 0
            });
          });

          subDocMap.forEach((remote, code) => {
            if (seen.has(code)) return;
            list.push({
              id: remote.id || `subadmin_main__${code}`,
              userId: code,
              userName: remote.subAdminName || remote.userName || 'Sub-Admin',
              userEmail: '',
              userAvatar: remote.userAvatar || '',
              channelType: 'subadmin_mainadmin',
              subAdminCode: code,
              subAdminName: remote.subAdminName || remote.userName,
              courseId: remote.courseId || '',
              activeCourse: remote.activeCourse || '',
              purchasedCourses: remote.activeCourse ? [remote.activeCourse] : [],
              lastMessage: remote.lastMessage || 'कुनै म्यासेज छैन',
              lastMessageAt: remote.lastMessageAt || remote.updatedAt || Date.now(),
              lastSender: remote.lastSender || 'user',
              unreadAdminCount: remote.unreadAdminCount || 0,
              unreadUserCount: remote.unreadUserCount || 0,
              createdAt: remote.createdAt || Date.now(),
              updatedAt: remote.updatedAt || Date.now(),
              clearedByUserAt: remote.clearedByUserAt || 0,
              clearedByAdminAt: remote.clearedByAdminAt || 0
            });
          });

          list.sort((a, b) => {
            const uDiff = (b.unreadAdminCount > 0 ? 1 : 0) - (a.unreadAdminCount > 0 ? 1 : 0);
            if (uDiff !== 0) return uDiff;
            return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
          });

          setAdminConversations(list);
          setIsLoadingAdminConvs(false);
          if (!selectedAdminConvId && list.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
            setSelectedAdminConvId(list[0].id);
          }
          return;
        }

        if (isSubAdminMode && subAdminSession) {
          const officialThreadId = `subadmin_main__${subAdminSession.code}`;
          let officialRemote: any = null;
          const studentContactMap = new Map<string, SupportConversation>();

          const assignedCourseObj = courses.find(c => c.id === subAdminSession.courseId);
          const assignedTitleNorm = normTitle(subAdminSession.courseTitle || assignedCourseObj?.title);

          const isKeyForThisSubCourse = (k: any) => {
            if (!k) return false;
            if (k.courseId && k.courseId === subAdminSession.courseId) return true;
            if (assignedTitleNorm && normTitle(k.courseTitle) === assignedTitleNorm) return true;
            return false;
          };

          const getStudentKey = (name: string, email: string, uid: string, code?: string) => {
            const cName = cleanRealName(name).toLowerCase();
            if (cName) return `name_${cName}`;
            if (email && email.includes('@')) return `email_${email.toLowerCase()}`;
            if (code) return `code_${code.toLowerCase()}`;
            return `uid_${uid}`;
          };

          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (docSnap.id === officialThreadId || (d.channelType === 'subadmin_mainadmin' && d.subAdminCode === subAdminSession.code)) {
              officialRemote = { id: docSnap.id, ...d };
              return;
            }

            const belongsToSub =
              (d.channelType === 'student_subadmin' &&
                (d.subAdminCode === subAdminSession.code ||
                  d.courseId === subAdminSession.courseId ||
                  (assignedTitleNorm && normTitle(d.activeCourse) === assignedTitleNorm))) ||
              docSnap.id.startsWith(`substudent__${subAdminSession.code}__`);

            if (!belongsToSub) return;

            const rawStudentId = d.userId || docSnap.id.replace(`substudent__${subAdminSession.code}__`, '');
            const convRealName = cleanRealName(d.userName);

            const matchedKey = Array.isArray(allActivationKeys)
              ? allActivationKeys.find((k: any) => {
                  if (!isKeyForThisSubCourse(k)) return false;
                  if (k.claimedByUid && k.claimedByUid === rawStudentId) return true;
                  if (k.claimedByEmail && d.userEmail && k.claimedByEmail.toLowerCase() === d.userEmail.toLowerCase()) return true;
                  const kName = cleanRealName(k.studentName) || cleanRealName(k.claimedByName);
                  if (kName && convRealName && kName.toLowerCase() === convRealName.toLowerCase()) return true;
                  return false;
                })
              : undefined;

            let resolvedName = convRealName;
            if (!resolvedName && matchedKey) {
              resolvedName = cleanRealName(matchedKey.claimedByName) || cleanRealName(matchedKey.studentName);
            }
            if (!resolvedName && d.userEmail) {
              const ep = d.userEmail.split('@')[0];
              resolvedName = ep.charAt(0).toUpperCase() + ep.slice(1);
            }
            if (!resolvedName) resolvedName = 'Student';

            const courseTitle = subAdminSession.courseTitle || d.activeCourse || matchedKey?.courseTitle || 'Course';

            // Resolve newest saved student avatar between Firestore conversation doc and activation key
            const keyAvatar = matchedKey?.studentAvatar || '';
            const convAvatar = d.userAvatar || '';
            const resolvedAvatar =
              (matchedKey?.studentAvatarUpdatedAt || 0) >= (d.updatedAt || 0)
                ? keyAvatar || convAvatar
                : convAvatar || keyAvatar;

            const convObj: SupportConversation = {
              id: docSnap.id,
              userId: rawStudentId,
              userName: resolvedName,
              userEmail: d.userEmail || matchedKey?.claimedByEmail || '',
              userPhone: d.userPhone || '',
              userAvatar: resolvedAvatar,
              channelType: 'student_subadmin',
              subAdminCode: subAdminSession.code,
              subAdminName: subAdminSession.name,
              courseId: subAdminSession.courseId,
              activeCourse: courseTitle,
              purchasedCourses: [courseTitle],
              lastMessage: d.lastMessage || '',
              lastMessageAt: d.lastMessageAt || Date.now(),
              lastSender: d.lastSender || 'user',
              unreadAdminCount: d.unreadAdminCount || 0,
              unreadUserCount: d.unreadUserCount || 0,
              createdAt: d.createdAt || Date.now(),
              updatedAt: d.updatedAt || Date.now(),
              clearedByUserAt: d.clearedByUserAt || 0,
              clearedByAdminAt: d.clearedByAdminAt || 0
            };

            const dedupKey = getStudentKey(resolvedName, convObj.userEmail || '', rawStudentId, matchedKey?.code);
            const existing = studentContactMap.get(dedupKey);
            if (!existing) {
              studentContactMap.set(dedupKey, convObj);
            } else {
              const newerIsCurrent = (convObj.lastMessageAt || 0) >= (existing.lastMessageAt || 0);
              const bestAvatar = newerIsCurrent
                ? convObj.userAvatar || existing.userAvatar || ''
                : existing.userAvatar || convObj.userAvatar || '';
              studentContactMap.set(
                dedupKey,
                newerIsCurrent
                  ? { ...existing, ...convObj, userAvatar: bestAvatar }
                  : { ...convObj, ...existing, userAvatar: bestAvatar }
              );
            }
          });

          if (Array.isArray(allActivationKeys)) {
            allActivationKeys.forEach((key: any) => {
              const isUsed = key.status === 'used' || Boolean(key.claimedAt) || Boolean(key.activeDeviceId);
              if (!isUsed || !isKeyForThisSubCourse(key)) return;
              const buyerId = key.claimedByUid || (key.claimedByEmail ? `email_${key.claimedByEmail}` : null);
              if (!buyerId) return;

              const keyRealName = cleanRealName(key.claimedByName) || cleanRealName(key.studentName) || 'Student';
              const dedupKey = getStudentKey(keyRealName, key.claimedByEmail || '', buyerId, key.code || key.id);
              const courseTitle = subAdminSession.courseTitle || key.courseTitle || 'Course';
              const canonicalConvId = `substudent__${subAdminSession.code}__${buyerId}`;

              const existing = studentContactMap.get(dedupKey);
              if (!existing) {
                studentContactMap.set(dedupKey, {
                  id: canonicalConvId,
                  userId: buyerId,
                  userName: keyRealName,
                  userEmail: key.claimedByEmail || '',
                  userPhone: '',
                  userAvatar: key.studentAvatar || '',
                  channelType: 'student_subadmin',
                  subAdminCode: subAdminSession.code,
                  subAdminName: subAdminSession.name,
                  courseId: subAdminSession.courseId,
                  activeCourse: courseTitle,
                  purchasedCourses: [courseTitle],
                  lastMessage: `Activated: ${key.code || key.id}`,
                  lastMessageAt: key.claimedAt || key.createdAt || Date.now(),
                  lastSender: 'system',
                  unreadAdminCount: 0,
                  unreadUserCount: 0,
                  createdAt: key.createdAt || Date.now(),
                  updatedAt: key.claimedAt || Date.now(),
                  clearedByUserAt: 0,
                  clearedByAdminAt: 0
                });
              } else {
                if (!cleanRealName(existing.userName) || existing.userName === 'Student') {
                  existing.userName = keyRealName;
                }
                if (key.studentAvatar && (!existing.userAvatar || (key.studentAvatarUpdatedAt || 0) >= (existing.updatedAt || 0))) {
                  existing.userAvatar = key.studentAvatar;
                }
              }
            });
          }

          const officialConv: SupportConversation = {
            id: officialThreadId,
            userId: 'MAIN_OFFICIAL_ADMIN',
            userName: brandName,
            userEmail: '',
            userAvatar: officialLogoUrl,
            channelType: 'subadmin_mainadmin',
            subAdminCode: subAdminSession.code,
            subAdminName: subAdminSession.name,
            courseId: subAdminSession.courseId,
            activeCourse: '',
            purchasedCourses: [],
            lastMessage: officialRemote?.lastMessage || `${brandName} सँग कुराकानी गर्नुहोस्`,
            lastMessageAt: officialRemote?.lastMessageAt || Date.now(),
            lastSender: officialRemote?.lastSender || 'system',
            unreadAdminCount: officialRemote?.unreadAdminCount || 0,
            unreadUserCount: officialRemote?.unreadUserCount || 0,
            createdAt: officialRemote?.createdAt || Date.now(),
            updatedAt: officialRemote?.updatedAt || Date.now(),
            clearedByUserAt: officialRemote?.clearedByUserAt || 0,
            clearedByAdminAt: officialRemote?.clearedByAdminAt || 0
          };

          const studentsList = Array.from(studentContactMap.values());
          studentsList.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

          const combined = [officialConv, ...studentsList];
          setAdminConversations(combined);
          setIsLoadingAdminConvs(false);
          if (!selectedAdminConvId && combined.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
            setSelectedAdminConvId(combined[0].id);
          }
          return;
        }

        setAdminConversations([]);
        setIsLoadingAdminConvs(false);
      },
      (err) => {
        console.warn('Could not load admin support conversations:', err);
        setIsLoadingAdminConvs(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin, isMainAdminMode, isSubAdminMode, subAdminSession?.code, subAdminSession?.courseId, subAdminSession?.courseTitle, subAdmins, courses, allActivationKeys, selectedAdminConvId, brandName, officialLogoUrl]);

  // ==========================================================================
  // 3. ADMIN / SUB-ADMIN MODE: Listener for messages in selected conversation
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || !isAdmin || !selectedAdminConvId) {
      setAdminMessages([]);
      return;
    }

    const isSubViewingMainAdmin = isSubAdminMode && selectedAdminConvId.startsWith('subadmin_main__');
    const messagesRef = collection(db, 'support_conversations', selectedAdminConvId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMsgs: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            conversationId: selectedAdminConvId,
            sender: d.sender || 'user',
            senderName: d.senderName || 'User',
            senderAvatar: d.senderAvatar || d.userAvatar || '',
            text: d.text || '',
            timestamp: d.timestamp || Date.now(),
            isSeen: d.isSeen ?? false,
            status: d.status ?? (d.isSeen ? 'seen' : 'sent'),
            seenAt: d.seenAt,
            attachmentType: d.attachmentType,
            attachmentUrl: d.attachmentUrl,
            attachmentName: d.attachmentName,
            attachmentSize: d.attachmentSize
          });

          const shouldMarkSeen = isSubViewingMainAdmin
            ? (d.sender === 'admin' && !d.isSeen)
            : (d.sender === 'user' && !d.isSeen);

          if (shouldMarkSeen) {
            try {
              updateDoc(docSnap.ref, {
                isSeen: true,
                status: 'seen',
                seenAt: Date.now()
              }).catch(() => {});
            } catch (e) {}
          }
        });

        setAdminMessages(loadedMsgs);

        try {
          const convRef = doc(db, 'support_conversations', selectedAdminConvId);
          updateDoc(convRef, isSubViewingMainAdmin ? { unreadUserCount: 0 } : { unreadAdminCount: 0 }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not load messages for selected admin conversation:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin, isSubAdminMode, selectedAdminConvId]);

  // Filter admin messages based on WhatsApp-style local cleared timestamp
  const displayedAdminMessages = adminMessages.filter(
    (msg) => !adminClearedAt || msg.timestamp > adminClearedAt
  );

  // Scroll to bottom when admin messages update
  useEffect(() => {
    if (isOpen && isAdmin) {
      adminEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedAdminMessages, isOpen, isAdmin]);

  // --------------------------------------------------------------------------
  // WHATSAPP "CLEAR CHAT FROM OWN ONLY" HANDLERS
  // --------------------------------------------------------------------------
  const handleStudentClearChat = async () => {
    const now = Date.now();
    setStudentClearedAt(now);
    if (studentConvId) {
      localStorage.setItem(`clipzone_chat_cleared_user_${studentConvId}`, String(now));
      try {
        const convRef = doc(db, 'support_conversations', studentConvId);
        await updateDoc(convRef, {
          clearedByUserAt: now
        });
      } catch (e) {}
    }
    showToast?.('तपाईंको डिभाइसबाट च्याट खाली भयो (Chat cleared on your device)', 'info');
    setShowStudentClearConfirm(false);
    setStudentMenuOpen(false);
  };

  const handleStudentRestoreChat = async () => {
    setStudentClearedAt(0);
    if (studentConvId) {
      localStorage.removeItem(`clipzone_chat_cleared_user_${studentConvId}`);
      try {
        const convRef = doc(db, 'support_conversations', studentConvId);
        await updateDoc(convRef, {
          clearedByUserAt: 0
        });
      } catch (e) {}
    }
    showToast?.('सम्पूर्ण च्याट इतिहास पुनः देखाइयो (All messages restored)', 'success');
    setStudentMenuOpen(false);
  };

  const handleAdminClearChat = async () => {
    if (!selectedAdminConvId) return;
    const now = Date.now();
    setAdminClearedAt(now);
    localStorage.setItem(`clipzone_chat_cleared_admin_${selectedAdminConvId}`, String(now));
    try {
      const convRef = doc(db, 'support_conversations', selectedAdminConvId);
      await updateDoc(convRef, {
        clearedByAdminAt: now
      });
    } catch (e) {}
    showToast?.('एडमिन भ्यूबाट च्याट खाली भयो (Chat cleared for admin only)', 'info');
    setShowAdminClearConfirm(false);
    setAdminMenuOpen(false);
  };

  const handleAdminRestoreChat = async () => {
    if (!selectedAdminConvId) return;
    setAdminClearedAt(0);
    localStorage.removeItem(`clipzone_chat_cleared_admin_${selectedAdminConvId}`);
    try {
      const convRef = doc(db, 'support_conversations', selectedAdminConvId);
      await updateDoc(convRef, {
        clearedByAdminAt: 0
      });
    } catch (e) {}
    showToast?.('एडमिनका लागि सम्पूर्ण च्याट इतिहास पुनः देखाइयो (All history restored)', 'success');
    setAdminMenuOpen(false);
  };

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // HANDLERS: COPY & ATTACHMENTS
  // --------------------------------------------------------------------------
  const handleCopyMessage = async (msg: SupportMessage) => {
    let textToCopy = msg.text || '';
    if (!textToCopy && msg.attachmentName) {
      textToCopy = `${msg.attachmentType === 'image' ? '📷 Photo' : '📄 Document'}: ${msg.attachmentName}`;
    }
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      showToast?.('म्यासेज कपी भयो (Copied to clipboard)', 'success');
    } catch (e) {
      console.warn('Copy failed:', e);
      showToast?.('कपी गर्न सकिएन', 'error');
    }
  };

  const handleStudentImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsStudentAttaching(true);
      const attachment = await compressImageFile(file);
      setStudentPendingAttachment(attachment);
      setShowStudentAttachMenu(false);
      studentInputRef.current?.focus();
    } catch (err: any) {
      showToast?.(err.message || 'फोटो प्रोसेस गर्न सकिएन', 'error');
    } finally {
      setIsStudentAttaching(false);
      e.target.value = '';
    }
  };

  const handleStudentDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsStudentAttaching(true);
      const attachment = await readDocumentFile(file);
      setStudentPendingAttachment(attachment);
      setShowStudentAttachMenu(false);
      studentInputRef.current?.focus();
    } catch (err: any) {
      showToast?.(err.message || 'कागजात लोड गर्न सकिएन', 'error');
    } finally {
      setIsStudentAttaching(false);
      e.target.value = '';
    }
  };

  const handleAdminImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAdminAttaching(true);
      const attachment = await compressImageFile(file);
      setAdminPendingAttachment(attachment);
      setShowAdminAttachMenu(false);
      adminReplyInputRef.current?.focus();
    } catch (err: any) {
      showToast?.(err.message || 'फोटो प्रोसेस गर्न सकिएन', 'error');
    } finally {
      setIsAdminAttaching(false);
      e.target.value = '';
    }
  };

  const handleAdminDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAdminAttaching(true);
      const attachment = await readDocumentFile(file);
      setAdminPendingAttachment(attachment);
      setShowAdminAttachMenu(false);
      adminReplyInputRef.current?.focus();
    } catch (err: any) {
      showToast?.(err.message || 'कागजात लोड गर्न सकिएन', 'error');
    } finally {
      setIsAdminAttaching(false);
      e.target.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: STUDENT (Strictly messages assigned Course Sub-Admin ONLY)
  // --------------------------------------------------------------------------
  const handleStudentSendMessage = async (textToSend?: string) => {
    if (!isAdmin && !hasActivatedCourse) {
      showToast?.('🔒 केवल कोर्ष एक्टिभेट गरेका विद्यार्थीहरूले मात्र म्यासेज पठाउन सक्नुहुन्छ।', 'error');
      if (onOpenActivationModal) {
        onClose();
        onOpenActivationModal();
      }
      return;
    }

    if (!activeStudentTarget || !studentConvId) {
      showToast?.('हाल म्यासेज पठाउन सपोर्ट उपलब्ध छैन।', 'error');
      return;
    }

    const targetUid = effectiveUserId || currentUserId;
    const text = (textToSend !== undefined ? textToSend : studentInputText).trim();
    if ((!text && !studentPendingAttachment) || isStudentSending || !targetUid) return;

    setIsStudentSending(true);
    const attachmentToSend = studentPendingAttachment;
    setStudentInputText('');
    setStudentPendingAttachment(null);
    setShowEmojiBar(false);
    setShowStudentAttachMenu(false);

    const now = Date.now();
    let finalStudentName = cleanRealName(studentName) || cleanRealName(initialStudentName);
    if (!finalStudentName) {
      finalStudentName = userEmail ? (userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1)) : 'Student';
    }

    try {
      const effectiveAvatar = studentAvatar || localStorage.getItem('clipzone_student_avatar') || '';
      const messagesRef = collection(db, 'support_conversations', studentConvId, 'messages');
      await addDoc(messagesRef, {
        conversationId: studentConvId,
        sender: 'user',
        senderName: finalStudentName,
        senderAvatar: effectiveAvatar || undefined,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent',
        attachmentType: attachmentToSend?.type || undefined,
        attachmentUrl: attachmentToSend?.url || undefined,
        attachmentName: attachmentToSend?.name || undefined,
        attachmentSize: attachmentToSend?.size || undefined
      });

      const summaryText = text || (attachmentToSend?.type === 'image' ? '📷 Photo' : `📄 ${attachmentToSend?.name || 'Document'}`);

      const convRef = doc(db, 'support_conversations', studentConvId);
      await setDoc(
        convRef,
        {
          id: studentConvId,
          userId: targetUid,
          userName: finalStudentName,
          userEmail: userEmail || '',
          userAvatar: effectiveAvatar || undefined,
          channelType: 'student_subadmin',
          subAdminCode: activeStudentTarget.subAdmin.code,
          subAdminName: activeStudentTarget.subAdmin.name,
          courseId: activeStudentTarget.courseId,
          activeCourse: activeStudentTarget.courseTitle || activeCourseName || '',
          lastMessage: summaryText,
          lastMessageAt: now,
          lastSender: 'user',
          unreadAdminCount: increment(1),
          unreadUserCount: 0,
          updatedAt: now
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to send student message:', error);
      showToast?.('म्यासेज पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setStudentInputText(text);
      setStudentPendingAttachment(attachmentToSend);
    } finally {
      setIsStudentSending(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: ADMIN / SUB-ADMIN
  // --------------------------------------------------------------------------
  const handleAdminSendReply = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : adminReplyText).trim();
    if ((!text && !adminPendingAttachment) || isAdminSending || !selectedAdminConvId) return;

    setIsAdminSending(true);
    const attachmentToSend = adminPendingAttachment;
    setAdminReplyText('');
    setAdminPendingAttachment(null);
    setShowAdminAttachMenu(false);

    const now = Date.now();
    const targetConv = adminConversations.find(c => c.id === selectedAdminConvId);
    const isSubViewingMainAdmin = isSubAdminMode && selectedAdminConvId.startsWith('subadmin_main__');
    const isMainViewingSubAdmin = isMainAdminMode && (targetConv?.channelType === 'subadmin_mainadmin' || selectedAdminConvId.startsWith('subadmin_main__'));

    const msgSender: 'admin' | 'user' = isSubViewingMainAdmin ? 'user' : 'admin';
    const senderLabel = isSubAdminMode && subAdminSession ? subAdminSession.name : brandName;
    const senderPhoto = isSubAdminMode && subAdminSession ? subAdminSession.avatarUrl || '' : officialLogoUrl;

    try {
      const messagesRef = collection(db, 'support_conversations', selectedAdminConvId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedAdminConvId,
        sender: msgSender,
        senderName: senderLabel,
        senderAvatar: senderPhoto || undefined,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent',
        attachmentType: attachmentToSend?.type || undefined,
        attachmentUrl: attachmentToSend?.url || undefined,
        attachmentName: attachmentToSend?.name || undefined,
        attachmentSize: attachmentToSend?.size || undefined
      });

      const summaryText = text || (attachmentToSend?.type === 'image' ? 'Photo' : attachmentToSend?.name || 'Document');

      let realUserName = cleanRealName(targetConv?.userName);
      if (!realUserName && targetConv?.userEmail) {
        const ep = targetConv.userEmail.split('@')[0];
        realUserName = ep.charAt(0).toUpperCase() + ep.slice(1);
      }
      if (!realUserName) realUserName = 'Student';

      const convRef = doc(db, 'support_conversations', selectedAdminConvId);
      const convPayload: Record<string, any> = {
        id: selectedAdminConvId,
        lastMessage: summaryText,
        lastMessageAt: now,
        lastSender: msgSender,
        updatedAt: now
      };

      if (isSubViewingMainAdmin && subAdminSession) {
        convPayload.channelType = 'subadmin_mainadmin';
        convPayload.subAdminCode = subAdminSession.code;
        convPayload.subAdminName = subAdminSession.name;
        convPayload.courseId = subAdminSession.courseId;
        convPayload.activeCourse = subAdminSession.courseTitle;
        convPayload.userId = subAdminSession.code;
        convPayload.userName = subAdminSession.name;
        if (subAdminSession.avatarUrl) {
          convPayload.userAvatar = subAdminSession.avatarUrl;
        }
        convPayload.unreadAdminCount = increment(1);
        convPayload.unreadUserCount = 0;
      } else if (isMainViewingSubAdmin) {
        const code = targetConv?.subAdminCode || selectedAdminConvId.replace('subadmin_main__', '');
        convPayload.channelType = 'subadmin_mainadmin';
        convPayload.subAdminCode = code;
        convPayload.subAdminName = targetConv?.subAdminName || targetConv?.userName || code;
        convPayload.courseId = targetConv?.courseId || '';
        convPayload.activeCourse = targetConv?.activeCourse || '';
        convPayload.userId = code;
        convPayload.userName = targetConv?.userName || targetConv?.subAdminName || code;
        convPayload.unreadAdminCount = 0;
        convPayload.unreadUserCount = increment(1);
      } else if (isSubAdminMode && subAdminSession) {
        convPayload.channelType = 'student_subadmin';
        convPayload.subAdminCode = subAdminSession.code;
        convPayload.subAdminName = subAdminSession.name;
        convPayload.courseId = subAdminSession.courseId;
        convPayload.activeCourse = subAdminSession.courseTitle;
        convPayload.userId = targetConv?.userId || selectedAdminConvId.replace(`substudent__${subAdminSession.code}__`, '');
        convPayload.userName = realUserName;
        convPayload.userEmail = targetConv?.userEmail || '';
        if (targetConv?.userAvatar) {
          convPayload.userAvatar = targetConv.userAvatar;
        }
        convPayload.purchasedCourses = targetConv?.purchasedCourses || [subAdminSession.courseTitle];
        convPayload.unreadAdminCount = 0;
        convPayload.unreadUserCount = increment(1);
      }

      await setDoc(convRef, convPayload, { merge: true });
    } catch (error) {
      console.error('Failed to send reply:', error);
      showToast?.('जवाफ पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setAdminReplyText(text);
      setAdminPendingAttachment(attachmentToSend);
    } finally {
      setIsAdminSending(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d`;
  };

  // Filter admin conversations by search query
  const filteredAdminConversations = adminConversations.filter((c) => {
    if (!adminSearchQuery.trim()) return true;
    const q = adminSearchQuery.toLowerCase();
    const coursesStr = (c.purchasedCourses || []).join(' ').toLowerCase();
    return (
      c.userName.toLowerCase().includes(q) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
      (c.activeCourse && c.activeCourse.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
      coursesStr.includes(q)
    );
  });

  const selectedAdminConv = adminConversations.find(c => c.id === selectedAdminConvId);
  const isSelectedMainAdminChat = Boolean(isSubAdminMode && selectedAdminConv?.channelType === 'subadmin_mainadmin');

  const renderAdminContactAvatar = (conv: SupportConversation, sizeClass: string = 'w-11 h-11', clickable: boolean = false) => {
    const isSubMainRow = Boolean(isSubAdminMode && conv.channelType === 'subadmin_mainadmin');
    const src = isSubMainRow ? officialLogoUrl : conv.userAvatar;
    const initial = (conv.userName || 'A').charAt(0).toUpperCase();

    if (isSubMainRow || isRenderableAvatar(src)) {
      return (
        <img
          src={src || officialLogoUrl}
          alt={isSubMainRow ? brandName : conv.userName}
          onClick={
            clickable && (src || isSubMainRow)
              ? () => setLightboxImage({ url: src || officialLogoUrl, name: isSubMainRow ? brandName : conv.userName })
              : undefined
          }
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (isSubMainRow && !img.src.includes('/logo.png')) {
              img.src = '/logo.png';
            } else {
              img.style.display = 'none';
            }
          }}
          className={`${sizeClass} rounded-full object-cover bg-zinc-900 border border-white/15 shadow-sm shrink-0 ${
            clickable ? 'cursor-pointer hover:ring-2 hover:ring-[#00a884]/60 transition' : ''
          }`}
        />
      );
    }

    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-slate-700 to-zinc-800 border border-zinc-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm`}
      >
        {initial}
      </div>
    );
  };

  // WhatsApp Dark Wallpaper pattern inline style
  const whatsappWallpaperStyle: React.CSSProperties = {
    backgroundColor: '#0b141a',
    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
    backgroundSize: '24px 24px'
  };

  // ==========================================================================
  // RENDER COMPONENT
  // ==========================================================================
  const outerWrapperClass = embedded
    ? 'w-full select-none text-[#e9edef]'
    : `fixed inset-0 z-[5500] flex ${isFullScreen ? 'p-0' : 'sm:items-center sm:justify-center sm:p-4'} bg-[#0b141a] sm:bg-black/85 sm:backdrop-blur-md select-none text-[#e9edef] overflow-hidden`;

  const innerFrameClass = embedded
    ? 'flex flex-col w-full h-[calc(100dvh-152px)] md:h-[calc(100dvh-176px)] min-h-[460px] max-h-[820px] bg-[#111b21] rounded-2xl border border-[#222d34] shadow-2xl overflow-hidden relative pb-0'
    : isFullScreen
      ? 'flex flex-col h-full w-full bg-[#111b21] sm:rounded-none sm:border-none shadow-none overflow-hidden relative pb-0'
      : isAdmin
        ? 'flex flex-col h-full w-full sm:h-[92vh] sm:max-h-[860px] sm:max-w-5xl bg-[#111b21] sm:rounded-2xl sm:border sm:border-[#222d34] shadow-2xl overflow-hidden relative pb-0'
        : 'flex flex-col h-full w-full sm:h-[92vh] sm:max-h-[860px] sm:max-w-3xl bg-[#111b21] sm:rounded-2xl sm:border sm:border-[#222d34] shadow-2xl overflow-hidden relative pb-0';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: embedded ? 1 : 0.98, y: embedded ? 6 : isRunningInAppMode ? 15 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: embedded ? 1 : 0.98, y: embedded ? 6 : isRunningInAppMode ? 15 : 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={outerWrapperClass}
      >
        <div className={innerFrameClass}>

          {/* ================================================================= */}
          {/* CASE A: ADMIN VIEW (WhatsApp Web style for Admin)                  */}
          {/* ================================================================= */}
          {isAdmin ? (
            <div className="flex flex-col h-full w-full overflow-hidden bg-[#111b21]">
              {/* Master-Detail Split Layout (WhatsApp Web Style) */}
              <div className="grow flex overflow-hidden">
                {/* 1. CONTACTS SIDEBAR */}
                <div
                  className={`flex-col bg-[#111b21] border-r border-[#222d34] shrink-0 w-full md:w-80 lg:w-96 overflow-hidden ${
                    selectedAdminConvId ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Search Bar Row */}
                  <div className="p-3 border-b border-[#222d34] bg-[#111b21] flex items-center gap-2">
                    {!embedded && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="md:hidden p-1.5 -ml-1 text-[#aebac1] hover:text-white hover:bg-[#202c33] rounded-full transition cursor-pointer shrink-0"
                        title="Close"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div className="relative grow">
                      <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        placeholder={isMainAdminMode ? "Search Sub-Admin..." : "Search student or Main Admin..."}
                        className="w-full bg-[#202c33] border border-transparent focus:border-[#00a884]/50 rounded-lg pl-9 pr-8 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition"
                      />
                      {adminSearchQuery && (
                        <button
                          onClick={() => setAdminSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contacts List Scrollable */}
                  <div className="grow overflow-y-auto divide-y divide-[#222d34]/60 scrollbar-none">
                    {isLoadingAdminConvs ? (
                      <div className="py-12 text-center text-[#8696a0] text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#00a884]" />
                        Loading conversations...
                      </div>
                    ) : filteredAdminConversations.length === 0 ? (
                      <div className="py-16 text-center text-[#8696a0] text-xs px-4 space-y-2">
                        <MessageCircle className="w-8 h-8 mx-auto opacity-30 text-[#8696a0]" />
                        <p className="font-semibold text-[#e9edef]">
                          {isMainAdminMode ? 'कुनै Sub-Admin भेटिएन' : 'कुनै च्याट भेटिएन'}
                        </p>
                        <p className="text-[11px] text-[#8696a0]">
                          {isMainAdminMode
                            ? 'Sub-Admin बनाउँदा वा Sub-Admin ले म्यासेज पठाउँदा यहाँ देखिनेछ।'
                            : 'तपाईंको कोर्षका विद्यार्थीहरूले म्यासेज पठाउँदा वा कोर्ष एक्टिभेट गर्दा यहाँ देखिनेछ।'}
                        </p>
                      </div>
                    ) : (
                      filteredAdminConversations.map((conv) => {
                        const isSelected = conv.id === selectedAdminConvId;
                        const isSubMainThread = Boolean(isSubAdminMode && conv.channelType === 'subadmin_mainadmin');
                        const isMainViewingSub = Boolean(isMainAdminMode && conv.channelType === 'subadmin_mainadmin');
                        const unreadCount = isSubMainThread ? (conv.unreadUserCount || 0) : (conv.unreadAdminCount || 0);
                        const hasUnread = unreadCount > 0;
                        const primaryCourse = conv.activeCourse || conv.purchasedCourses?.[0];
                        const isLastFromMe = isSubMainThread ? conv.lastSender === 'user' : conv.lastSender === 'admin';
                        const isOtherReadLast = isSubMainThread ? conv.unreadAdminCount === 0 : conv.unreadUserCount === 0;

                        return (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedAdminConvId(conv.id)}
                            className={`w-full text-left px-3.5 py-3 transition flex items-center gap-3 cursor-pointer relative group ${
                              isSelected
                                ? 'bg-[#2a3942]'
                                : 'hover:bg-[#202c33]'
                            }`}
                          >
                            <div className="relative shrink-0">
                              {renderAdminContactAvatar(conv, 'w-11 h-11')}
                              {hasUnread && (
                                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-[#00a884] text-[11px] font-black text-[#111b21] flex items-center justify-center px-1 shadow-md ring-2 ring-[#111b21]">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                            </div>

                            <div className="grow min-w-0">
                              {isSubMainThread ? (
                                <>
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h5 className="font-bold text-sm text-[#e9edef] truncate">
                                      {brandName}
                                    </h5>
                                    <span className={`text-[11px] shrink-0 font-medium ${hasUnread ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                                      {formatRelativeTime(conv.lastMessageAt)}
                                    </span>
                                  </div>
                                  <p className={`text-xs truncate flex items-center gap-1 ${hasUnread ? 'text-[#e9edef] font-semibold' : 'text-[#8696a0]'}`}>
                                    {isLastFromMe && (
                                      <span className="shrink-0 inline-flex items-center">
                                        {isOtherReadLast ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.5]" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] stroke-[2]" />
                                        )}
                                      </span>
                                    )}
                                    <span className="truncate">{conv.lastMessage || 'कुनै म्यासेज छैन'}</span>
                                  </p>
                                </>
                              ) : isMainViewingSub ? (
                                <>
                                  {primaryCourse && (
                                    <p className="text-[10.5px] font-semibold text-[#00a884] truncate leading-tight mb-0.5">
                                      {primaryCourse}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h5 className="font-bold text-sm text-[#e9edef] truncate">
                                      {conv.userName}
                                    </h5>
                                    <span className={`text-[11px] shrink-0 font-medium ${hasUnread ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                                      {formatRelativeTime(conv.lastMessageAt)}
                                    </span>
                                  </div>
                                  <p className={`text-xs truncate flex items-center gap-1 ${hasUnread ? 'text-[#e9edef] font-semibold' : 'text-[#8696a0]'}`}>
                                    {isLastFromMe && (
                                      <span className="shrink-0 inline-flex items-center">
                                        {isOtherReadLast ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.5]" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] stroke-[2]" />
                                        )}
                                      </span>
                                    )}
                                    <span className="truncate">{conv.lastMessage || 'कुनै म्यासेज छैन'}</span>
                                  </p>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <h5 className="font-bold text-sm text-[#e9edef] truncate">
                                      {conv.userName}
                                    </h5>
                                    <span className={`text-[11px] shrink-0 font-medium ${hasUnread ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                                      {formatRelativeTime(conv.lastMessageAt)}
                                    </span>
                                  </div>
                                  {primaryCourse && (
                                    <p className="text-[10.5px] font-medium text-[#00a884]/90 truncate mb-0.5">
                                      {primaryCourse}
                                    </p>
                                  )}
                                  <p className={`text-xs truncate flex items-center gap-1 ${hasUnread ? 'text-[#e9edef] font-semibold' : 'text-[#8696a0]'}`}>
                                    {isLastFromMe && (
                                      <span className="shrink-0 inline-flex items-center">
                                        {isOtherReadLast ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.5]" />
                                        ) : (
                                          <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] stroke-[2]" />
                                        )}
                                      </span>
                                    )}
                                    <span className="truncate">{conv.lastMessage || 'कुनै म्यासेज छैन'}</span>
                                  </p>
                                </>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. CHAT PANE */}
                <div
                  className={`grow flex-col overflow-hidden ${
                    selectedAdminConvId ? 'flex' : 'hidden md:flex'
                  }`}
                  style={whatsappWallpaperStyle}
                >
                  {selectedAdminConv ? (
                    <>
                      {/* Active Chat Header */}
                      <div className="bg-[#202c33] border-b border-[#222d34] px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => setSelectedAdminConvId(null)}
                            className="md:hidden p-1.5 -ml-1 text-[#aebac1] hover:text-white rounded-full hover:bg-[#111b21] cursor-pointer shrink-0"
                            title="Back to Contact List"
                          >
                            <ArrowLeft className="w-5 h-5" />
                          </button>
                          {renderAdminContactAvatar(selectedAdminConv, 'w-10 h-10', true)}
                          <div className="min-w-0">
                            {isSelectedMainAdminChat ? (
                              <h4 className="font-bold text-sm text-[#e9edef] truncate">
                                {brandName}
                              </h4>
                            ) : isMainAdminMode ? (
                              <>
                                {selectedAdminConv.activeCourse && (
                                  <p className="text-[10.5px] font-semibold text-[#00a884] truncate leading-tight">
                                    {selectedAdminConv.activeCourse}
                                  </p>
                                )}
                                <h4 className="font-bold text-sm text-[#e9edef] truncate leading-tight">
                                  {selectedAdminConv.userName}
                                </h4>
                              </>
                            ) : (
                              <>
                                <h4 className="font-bold text-sm text-[#e9edef] truncate leading-tight">
                                  {selectedAdminConv.userName}
                                </h4>
                                <p className="text-[11px] text-[#00a884] font-medium truncate leading-tight">
                                  {selectedAdminConv.activeCourse || 'Verified Student'}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* WhatsApp 3-dots Menu for Admin */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                              className="p-1.5 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {adminMenuOpen && (
                              <>
                                <div 
                                  className="fixed inset-0 z-30" 
                                  onClick={() => setAdminMenuOpen(false)} 
                                />
                                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#202c33] border border-[#222d34] rounded-xl shadow-2xl py-1.5 z-40 text-xs text-[#e9edef] animate-in fade-in zoom-in-95">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminMenuOpen(false);
                                      setShowAdminClearConfirm(true);
                                    }}
                                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#111b21] flex items-center gap-2.5 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span>Clear chat for admin (मेरो भ्यूबाट खाली)</span>
                                  </button>
                                  {adminClearedAt > 0 && adminMessages.length > displayedAdminMessages.length && (
                                    <button
                                      type="button"
                                      onClick={handleAdminRestoreChat}
                                      className="w-full px-3.5 py-2.5 text-left hover:bg-[#111b21] flex items-center gap-2.5 text-[#00a884] transition cursor-pointer border-t border-[#222d34]"
                                    >
                                      <RotateCcw className="w-4 h-4 text-[#00a884] shrink-0" />
                                      <span>Show all history (सबै इतिहास देखाउने)</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {!embedded && (
                            <>
                              <button
                                type="button"
                                onClick={toggleFullScreen}
                                className="p-1.5 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                                title={isFullScreen ? "Exit Fullscreen (सामान्य स्क्रिन)" : "Full Screen (फुलस्क्रिन)"}
                              >
                                {isFullScreen ? <Minimize2 className="w-4 h-4 text-[#00a884]" /> : <Maximize2 className="w-4 h-4" />}
                              </button>

                              <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                                title="Close"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Messages Scroll Area */}
                      <div className="grow overflow-y-auto p-4 space-y-2.5 text-sm">
                        {/* WhatsApp Floating Date Pill */}
                        <div className="flex justify-center my-2">
                          <span className="bg-[#182229] text-[#8696a0] text-[10.5px] font-medium px-3 py-1 rounded-lg uppercase tracking-wider border border-[#222d34]/60 shadow-xs">
                            TODAY
                          </span>
                        </div>

                        {/* Banner if admin cleared their view */}
                        {adminClearedAt > 0 && adminMessages.length > displayedAdminMessages.length && (
                          <div className="flex justify-center my-1.5">
                            <div className="bg-[#182229] border border-[#222d34] rounded-lg px-3 py-1.5 text-[11px] text-[#8696a0] flex items-center gap-2 shadow-xs">
                              <span>🗑️ Messages cleared from admin view (Student still has them).</span>
                              <button
                                type="button"
                                onClick={handleAdminRestoreChat}
                                className="text-[#00a884] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {displayedAdminMessages.length === 0 ? (
                          <div className="py-12 text-center text-[#8696a0] text-xs space-y-2">
                            <MessageCircle className="w-8 h-8 mx-auto opacity-30 text-[#8696a0]" />
                            <p className="font-semibold text-[#e9edef]">
                              {isSelectedMainAdminChat ? brandName : selectedAdminConv.userName} सँग कुराकानी सुरु गर्नुहोस्
                            </p>
                            <p className="text-[11px] text-[#8696a0]">
                              {isSelectedMainAdminChat
                                ? `तलको बक्सबाट ${brandName} लाई सिधै म्यासेज वा फोटो/कागजात पठाउनुहोस्।`
                                : isMainAdminMode
                                  ? 'तलको बक्सबाट Sub-Admin लाई सिधै जवाफ वा फोटो/कागजात पठाउनुहोस्।'
                                  : 'तलको बक्सबाट सिधै विद्यार्थीलाई जवाफ पठाउनुहोस् वा फोटो/कागजात पठाउनुहोस्।'}
                            </p>
                          </div>
                        ) : (
                          displayedAdminMessages.map((msg) => {
                            const isMyMsg = isSelectedMainAdminChat ? msg.sender === 'user' : msg.sender === 'admin';
                            const isSeen = msg.isSeen || msg.status === 'seen';
                            const isCopied = copiedMessageId === msg.id;
                            const incomingAvatar = isSelectedMainAdminChat
                              ? officialLogoUrl
                              : selectedAdminConv.userAvatar || msg.senderAvatar || '';
                            const incomingSenderName = isSelectedMainAdminChat
                              ? brandName
                              : selectedAdminConv.userName || msg.senderName;

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col group/bubble ${isMyMsg ? 'items-end' : 'items-start'}`}
                              >
                                <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                                  {!isMyMsg && (
                                    isSelectedMainAdminChat || isRenderableAvatar(incomingAvatar) ? (
                                      <img
                                        src={incomingAvatar || officialLogoUrl}
                                        alt={incomingSenderName}
                                        onError={(e) => {
                                          const img = e.currentTarget as HTMLImageElement;
                                          if (isSelectedMainAdminChat && !img.src.includes('/logo.png')) {
                                            img.src = '/logo.png';
                                          } else {
                                            img.style.display = 'none';
                                          }
                                        }}
                                        className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/15 bg-[#111b21]"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-[#2a3942] text-[#e9edef] flex items-center justify-center text-[11px] font-bold shrink-0 mb-1 border border-white/10">
                                        {(incomingSenderName || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )
                                  )}

                                  <div
                                    className={`rounded-xl px-3.5 pt-2 pb-1.5 shadow-sm break-words relative ${
                                      isMyMsg
                                        ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                                        : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                                    }`}
                                  >
                                    {!isMyMsg && (
                                      <div className="text-[11px] font-bold text-[#53bdeb] mb-1 flex items-center justify-between gap-2">
                                        <span>{incomingSenderName}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyMessage(msg)}
                                          className="opacity-70 hover:opacity-100 p-0.5 hover:bg-black/20 rounded transition text-[#aebac1] hover:text-white"
                                          title="Copy message (कपी गर्नुहोस्)"
                                        >
                                          {isCopied ? (
                                            <Check className="w-3 h-3 text-[#00a884]" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                      </div>
                                    )}

                                  {/* IMAGE ATTACHMENT */}
                                  {msg.attachmentType === 'image' && msg.attachmentUrl && (
                                    <div className="mb-2 overflow-hidden rounded-lg bg-black/30 border border-white/10 relative group/img cursor-pointer">
                                      <img
                                        src={msg.attachmentUrl}
                                        alt={msg.attachmentName || 'Photo'}
                                        onClick={() => setLightboxImage({ url: msg.attachmentUrl!, name: msg.attachmentName || 'Photo' })}
                                        className="w-full max-h-[260px] object-cover rounded-lg group-hover/img:scale-[1.02] transition"
                                      />
                                      <div 
                                        onClick={() => setLightboxImage({ url: msg.attachmentUrl!, name: msg.attachmentName || 'Photo' })}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2"
                                      >
                                        <span className="p-1.5 bg-black/60 rounded-full text-white text-xs flex items-center gap-1 font-semibold">
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>View</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            downloadFileAttachment(msg.attachmentUrl!, msg.attachmentName || 'photo.jpg');
                                          }}
                                          className="p-1.5 bg-[#00a884] text-black rounded-full hover:bg-[#02906f] transition"
                                          title="Download photo"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* DOCUMENT ATTACHMENT */}
                                  {msg.attachmentType === 'document' && msg.attachmentUrl && (
                                    <div className="mb-2 p-2.5 bg-black/30 border border-white/10 rounded-lg flex items-center gap-2.5 min-w-[200px]">
                                      <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 grow">
                                        <p className="text-xs font-semibold text-[#e9edef] truncate" title={msg.attachmentName}>
                                          {msg.attachmentName || 'Document'}
                                        </p>
                                        <p className="text-[10px] text-[#8696a0]">
                                          {formatFileSize(msg.attachmentSize) || 'Document'}
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => downloadFileAttachment(msg.attachmentUrl!, msg.attachmentName || 'document.pdf')}
                                        className="p-1.5 bg-[#2a3942] hover:bg-[#00a884] hover:text-black rounded-lg text-[#aebac1] transition shrink-0 cursor-pointer"
                                        title="Download document"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}

                                  {/* MESSAGE TEXT */}
                                  {msg.text && (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                                  )}

                                  {/* Timestamp, Copy Button & WhatsApp Double Ticks */}
                                  <div className="text-[10px] text-[#8696a0] mt-1 flex items-center justify-end gap-1.5 select-none">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMessage(msg)}
                                      className="text-[#8696a0] hover:text-white p-0.5 rounded transition cursor-pointer"
                                      title="Copy message (कपी गर्नुहोस्)"
                                    >
                                      {isCopied ? (
                                        <span className="text-[#00a884] flex items-center gap-0.5 font-bold">
                                          <Check className="w-3 h-3" />
                                          <span>कपी भयो</span>
                                        </span>
                                      ) : (
                                        <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                                      )}
                                    </button>

                                    <span>{formatMessageTime(msg.timestamp)}</span>

                                    {isMyMsg && (
                                      isSeen ? (
                                        <span title="हेरिसकियो (Seen)" className="inline-flex items-center text-[#53bdeb]">
                                          <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </span>
                                      ) : (
                                        <span title="डेलिभर भयो (Delivered)" className="inline-flex items-center text-[#8696a0]">
                                          <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                                        </span>
                                      )
                                    )}
                                  </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={adminEndRef} />
                      </div>

                      {/* Admin / Sub-Admin Quick Replies */}
                      <div className="px-3 py-2 bg-[#202c33] border-t border-[#222d34] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                        <span className="text-[10px] text-[#8696a0] uppercase font-bold shrink-0">द्रुत जवाफ:</span>
                        {(isSelectedMainAdminChat ? SUB_ADMIN_TO_MAIN_PRESETS : ADMIN_QUICK_PRESETS).map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAdminSendReply(preset)}
                            className="bg-[#111b21] hover:bg-[#2a3942] border border-[#222d34] text-[#e9edef] text-xs px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Admin Pending Attachment Preview Bar */}
                      {adminPendingAttachment && (
                        <div className="px-3 py-2 bg-[#111b21] border-t border-[#222d34] flex items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {adminPendingAttachment.type === 'image' ? (
                              <img
                                src={adminPendingAttachment.url}
                                alt={adminPendingAttachment.name}
                                className="w-10 h-10 rounded-lg object-cover border border-[#00a884]/40 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#e9edef] truncate">
                                {adminPendingAttachment.name}
                              </p>
                              <p className="text-[10px] text-[#00a884]">
                                {adminPendingAttachment.type === 'image' ? '📷 Photo' : '📄 Document'} • {formatFileSize(adminPendingAttachment.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdminPendingAttachment(null)}
                            className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-[#202c33] rounded-full transition cursor-pointer"
                            title="Remove attachment"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Admin Reply Input Bar */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAdminSendReply();
                        }}
                        className="p-3 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 shrink-0 relative"
                      >
                        {/* Hidden file inputs */}
                        <input
                          type="file"
                          ref={adminImageInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleAdminImageSelect}
                        />
                        <input
                          type="file"
                          ref={adminDocInputRef}
                          accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,application/pdf,text/plain"
                          className="hidden"
                          onChange={handleAdminDocSelect}
                        />

                        {/* WhatsApp Attachment Button & Dropup Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowAdminAttachMenu(!showAdminAttachMenu)}
                            disabled={isAdminAttaching}
                            className={`p-2 text-[#8696a0] hover:text-[#00a884] hover:bg-[#111b21] rounded-full transition cursor-pointer ${
                              showAdminAttachMenu ? 'text-[#00a884] bg-[#111b21]' : ''
                            }`}
                            title="Attach Photo or Document"
                          >
                            <Paperclip className="w-5 h-5" />
                          </button>

                          {showAdminAttachMenu && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={() => setShowAdminAttachMenu(false)}
                              />
                              <div className="absolute left-0 bottom-full mb-2 w-52 bg-[#202c33] border border-[#222d34] rounded-2xl shadow-2xl p-1.5 z-40 text-xs text-[#e9edef] animate-in fade-in zoom-in-95">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAdminAttachMenu(false);
                                    adminImageInputRef.current?.click();
                                  }}
                                  className="w-full px-3 py-2.5 text-left hover:bg-[#111b21] rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">Photos & Images</p>
                                    <p className="text-[10px] text-[#8696a0]">फोटो / स्क्रिनसट</p>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAdminAttachMenu(false);
                                    adminDocInputRef.current?.click();
                                  }}
                                  className="w-full px-3 py-2.5 text-left hover:bg-[#111b21] rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                                >
                                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white">Document / PDF</p>
                                    <p className="text-[10px] text-[#8696a0]">कागजात / फाइल (&lt;700KB)</p>
                                  </div>
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="grow bg-[#2a3942] rounded-full px-4 py-2 flex items-center">
                          <input
                            ref={adminReplyInputRef}
                            type="text"
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder={
                              adminPendingAttachment
                                ? `Add a caption for ${adminPendingAttachment.name}...`
                                : `Type message to ${isSelectedMainAdminChat ? brandName : selectedAdminConv.userName}...`
                            }
                            disabled={isAdminSending || isAdminAttaching}
                            className="grow bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition disabled:opacity-50"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={(!adminReplyText.trim() && !adminPendingAttachment) || isAdminSending || isAdminAttaching}
                          className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md active:scale-95"
                          title="Send"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="grow flex flex-col relative p-6 text-center text-[#8696a0]">
                      {!embedded && (
                        <div className="absolute top-3 right-3 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={toggleFullScreen}
                            className="p-2 text-[#aebac1] hover:text-white hover:bg-[#202c33] rounded-full transition cursor-pointer"
                            title={isFullScreen ? "Exit Fullscreen (सामान्य स्क्रिन)" : "Full Screen (फुलस्क्रिन)"}
                          >
                            {isFullScreen ? <Minimize2 className="w-4 h-4 text-[#00a884]" /> : <Maximize2 className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-[#aebac1] hover:text-white hover:bg-[#202c33] rounded-full transition cursor-pointer"
                            title="Close"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="my-auto flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#202c33] border border-[#222d34] flex items-center justify-center mb-3 text-[#00a884]">
                          <MessageCircle className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-sm text-[#e9edef] mb-1">
                          {isMainAdminMode ? 'Sub-Admin छनोट गर्नुहोस्' : 'सम्पर्क छनोट गर्नुहोस्'}
                        </h4>
                        <p className="text-xs text-[#8696a0] max-w-xs">
                          {isMainAdminMode
                            ? 'च्याट गर्न बायाँपट्टिको सूचीबाट Sub-Admin छान्नुहोस्।'
                            : `कुराकानी गर्न बायाँपट्टिको सूचीबाट विद्यार्थी वा ${brandName} छान्नुहोस्।`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* CASE B: STUDENT VIEW (Authentic WhatsApp Chat Experience)       */
            /* =============================================================== */
            <div className="flex flex-col h-full w-full overflow-hidden bg-[#0b141a]">
              {/* Clean Executive Chat Header Bar */}
              <div className="bg-[#1a242b] border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0 shadow-md z-10">
                <div className="flex items-center gap-3 min-w-0">
                  {!embedded && (
                    <button
                      onClick={onClose}
                      className="p-1.5 -ml-1 text-[#aebac1] hover:text-white rounded-full active:bg-[#111b21] transition cursor-pointer flex items-center justify-center shrink-0"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-[#128C7E]/25 flex items-center justify-center overflow-hidden ring-2 ring-[#00a884]/35 shadow-sm">
                      <img
                        src={activeStudentTarget?.subAdmin.avatarUrl || officialLogoUrl}
                        alt={activeStudentTarget?.subAdmin.name || brandName}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() =>
                          setLightboxImage({
                            url: activeStudentTarget?.subAdmin.avatarUrl || officialLogoUrl,
                            name: activeStudentTarget?.subAdmin.name || brandName
                          })
                        }
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          if (!img.src.includes('/logo.png')) {
                            img.src = '/logo.png';
                          }
                        }}
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#1a242b]"></span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-[15px] text-white flex items-center gap-1.5 leading-tight truncate">
                      <span className="truncate">
                        {activeStudentTarget ? activeStudentTarget.subAdmin.name : brandName}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-[#00a884] fill-[#00a884]/20 shrink-0" />
                    </h4>
                    <p className="text-[11px] text-[#00a884] font-medium leading-tight mt-0.5">
                      Online
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {activeStudentTarget?.courseWhatsapp && (
                    <a
                      href={`tel:${activeStudentTarget.courseWhatsapp}`}
                      className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition"
                      title={`Call ${activeStudentTarget.courseWhatsapp}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

                  {/* Full Screen Toggle button */}
                  {!embedded && (
                    <button
                      type="button"
                      onClick={toggleFullScreen}
                      className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                      title={isFullScreen ? "Exit Fullscreen (सामान्य स्क्रिन)" : "Full Screen (फुलस्क्रिन)"}
                    >
                      {isFullScreen ? <Minimize2 className="w-5 h-5 text-[#00a884]" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                  )}

                  {/* WhatsApp 3-dots Menu for Student */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setStudentMenuOpen(!studentMenuOpen)}
                      className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {studentMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setStudentMenuOpen(false)} 
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-[#202c33] border border-[#222d34] rounded-xl shadow-2xl py-1.5 z-40 text-xs text-[#e9edef] animate-in fade-in zoom-in-95">
                          {!embedded && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentMenuOpen(false);
                                toggleFullScreen();
                              }}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-[#111b21] flex items-center gap-2.5 text-[#e9edef] hover:text-white transition cursor-pointer border-b border-[#222d34]"
                            >
                              {isFullScreen ? <Minimize2 className="w-4 h-4 text-[#00a884] shrink-0" /> : <Maximize2 className="w-4 h-4 text-[#00a884] shrink-0" />}
                              <span>{isFullScreen ? 'Exit Fullscreen (सामान्य)' : 'Full Screen (फुलस्क्रिन)'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setStudentMenuOpen(false);
                              setShowStudentClearConfirm(true);
                            }}
                            className="w-full px-3.5 py-2.5 text-left hover:bg-[#111b21] flex items-center gap-2.5 text-red-400 hover:text-red-300 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                            <span>Clear chat (आफ्नो च्याट खाली गर्ने)</span>
                          </button>
                          {studentClearedAt > 0 && studentMessages.length > displayedStudentMessages.length && (
                            <button
                              type="button"
                              onClick={handleStudentRestoreChat}
                              className="w-full px-3.5 py-2.5 text-left hover:bg-[#111b21] flex items-center gap-2.5 text-[#00a884] transition cursor-pointer border-t border-[#222d34]"
                            >
                              <RotateCcw className="w-4 h-4 text-[#00a884] shrink-0" />
                              <span>Restore messages (पुरानो इतिहास देखाउने)</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {!embedded && (
                    <button
                      onClick={onClose}
                      className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Contact Switcher (shown only if student chats with multiple assigned contacts, showing ONLY names) */}
              {hasActivatedCourse && studentSubAdminTargets.length > 1 && (
                <div className="bg-[#141d23] border-b border-white/5 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
                  {studentSubAdminTargets.map((target) => {
                    const isActiveTarget = target.subAdmin.code === activeStudentTarget?.subAdmin.code;
                    return (
                      <button
                        key={target.subAdmin.code}
                        type="button"
                        onClick={() => setSelectedStudentSubCode(target.subAdmin.code)}
                        className={`pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition inline-flex items-center gap-2 border ${
                          isActiveTarget
                            ? 'bg-[#00a884] text-[#0b141a] border-[#00a884] shadow-sm'
                            : 'bg-[#1f2c34] text-[#e9edef] border-white/10 hover:bg-[#2a3942]'
                        }`}
                      >
                        <img
                          src={target.subAdmin.avatarUrl || officialLogoUrl}
                          alt={target.subAdmin.name}
                          className="w-5 h-5 rounded-full object-cover shrink-0 bg-zinc-900"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (!img.src.includes('/logo.png')) img.src = '/logo.png';
                          }}
                        />
                        <span>{target.subAdmin.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Messages Scroll Area */}
              <div
                className="grow overflow-y-auto px-4 py-5 space-y-3 text-sm scrollbar-thin scrollbar-thumb-[#222d34]"
                style={whatsappWallpaperStyle}
              >
                {!hasActivatedCourse && !isAdmin ? (
                  /* LOCKED FOR UNACTIVATED USERS */
                  <div className="bg-[#151f26]/95 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4 shadow-xl my-4 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                      <Lock className="w-7 h-7 text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-base text-[#e9edef]">एक्टिभेसन आवश्यक छ</h4>
                      <p className="text-xs text-[#aebac1] leading-relaxed max-w-sm mx-auto">
                        एक्टिभेट गरेका प्रयोगकर्ताहरूले मात्र सिधै म्यासेज पठाउन सक्नुहुन्छ।
                      </p>
                    </div>
                    {onOpenActivationModal && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenActivationModal();
                        }}
                        className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg cursor-pointer transition active:scale-95"
                      >
                        <span>Enter Activation Code</span>
                      </button>
                    )}
                  </div>
                ) : !activeStudentTarget ? (
                  <div className="bg-[#151f26]/95 border border-white/10 rounded-2xl p-6 text-center space-y-3 shadow-xl my-6 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-full bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center mx-auto text-[#00a884]">
                      <MessageCircle className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-base text-[#e9edef]">च्याट हाल उपलब्ध छैन</h4>
                      <p className="text-xs text-[#aebac1] leading-relaxed max-w-sm mx-auto">
                        सपोर्ट प्रतिनिधि उपलब्ध भएपछि यहाँबाट सिधै म्यासेज पठाउन मिल्नेछ।
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Clean Privacy Pill */}
                    <div className="flex justify-center my-1">
                      <div className="bg-[#182229]/90 text-[#8696a0] text-[11px] px-3.5 py-1 rounded-full border border-white/5 flex items-center gap-1.5 shadow-xs">
                        <Lock className="w-3 h-3 text-[#00a884] shrink-0" />
                        <span>Direct chat with {activeStudentTarget.subAdmin.name}</span>
                      </div>
                    </div>

                    {/* Banner if student cleared older messages on this device */}
                    {studentClearedAt > 0 && studentMessages.length > displayedStudentMessages.length && (
                      <div className="flex justify-center my-1.5">
                        <div className="bg-[#182229] border border-[#222d34] rounded-lg px-3 py-1.5 text-[11px] text-[#8696a0] flex items-center gap-2 shadow-xs">
                          <span>Messages cleared on this device.</span>
                          <button
                            type="button"
                            onClick={handleStudentRestoreChat}
                            className="text-[#00a884] hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Messages Render */}
                    {displayedStudentMessages.length === 0 ? (
                      <div className="py-8 text-center space-y-4 max-w-md mx-auto">
                        <div className="w-16 h-16 rounded-full bg-[#1a242b] ring-2 ring-[#00a884]/30 overflow-hidden mx-auto shadow-lg">
                          <img
                            src={activeStudentTarget.subAdmin.avatarUrl || officialLogoUrl}
                            alt={activeStudentTarget.subAdmin.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              if (!img.src.includes('/logo.png')) img.src = '/logo.png';
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[#e9edef] font-bold text-base">{activeStudentTarget.subAdmin.name}</h4>
                          <p className="text-[#8696a0] text-xs max-w-xs mx-auto leading-relaxed">
                            आफ्नो प्रश्न लेखेर {activeStudentTarget.subAdmin.name} लाई सिधै पठाउनुहोस्।
                          </p>
                        </div>

                        {/* Quick Question Chips */}
                        <div className="pt-2 flex flex-col gap-2 max-w-sm mx-auto text-left">
                          {QUICK_QUESTION_CHIPS.map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleStudentSendMessage(chip)}
                              className="text-left text-xs bg-[#1a242b]/90 hover:bg-[#23313a] border border-white/10 text-[#e9edef] px-4 py-2.5 rounded-2xl cursor-pointer flex items-center justify-between group transition active:scale-[0.99] shadow-xs"
                            >
                              <span className="truncate pr-2">{chip}</span>
                              <Send className="w-3.5 h-3.5 text-[#00a884] opacity-70 group-hover:opacity-100 shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      displayedStudentMessages.map((msg) => {
                        const isMe = msg.sender === 'user';
                        const isSeen = msg.isSeen || msg.status === 'seen';
                        const isCopied = copiedMessageId === msg.id;
                        const targetAvatar = activeStudentTarget?.subAdmin.avatarUrl || officialLogoUrl;
                        const targetName = activeStudentTarget?.subAdmin.name || msg.senderName || brandName;

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col group/bubble ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[70%]">
                              {!isMe && (
                                <img
                                  src={targetAvatar}
                                  alt={targetName}
                                  onError={(e) => {
                                    const img = e.currentTarget as HTMLImageElement;
                                    if (!img.src.includes('/logo.png')) img.src = '/logo.png';
                                  }}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 mb-1 border border-white/15 bg-[#111b21] shadow-xs"
                                />
                              )}

                              <div
                                className={`rounded-2xl px-3.5 pt-2 pb-1.5 text-sm shadow-sm break-words relative ${
                                  isMe
                                    ? 'bg-gradient-to-br from-[#005c4b] to-[#004d40] text-[#e9edef] rounded-tr-xs'
                                    : 'bg-[#1f2c34] border border-white/5 text-[#e9edef] rounded-tl-xs'
                                }`}
                              >
                                {!isMe && (
                                  <div className="text-[11px] font-bold text-[#00a884] mb-1 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                      <span>{targetName}</span>
                                      <CheckCircle2 className="w-3 h-3 text-[#00a884]" />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyMessage(msg)}
                                      className="opacity-70 hover:opacity-100 p-0.5 hover:bg-black/20 rounded transition text-[#aebac1] hover:text-white"
                                      title="Copy message (कपी गर्नुहोस्)"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3 h-3 text-[#00a884]" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}

                              {/* IMAGE ATTACHMENT */}
                              {msg.attachmentType === 'image' && msg.attachmentUrl && (
                                <div className="mb-2 overflow-hidden rounded-lg bg-black/30 border border-white/10 relative group/img cursor-pointer">
                                  <img
                                    src={msg.attachmentUrl}
                                    alt={msg.attachmentName || 'Photo'}
                                    onClick={() => setLightboxImage({ url: msg.attachmentUrl!, name: msg.attachmentName || 'Photo' })}
                                    className="w-full max-h-[260px] object-cover rounded-lg group-hover/img:scale-[1.02] transition"
                                  />
                                  <div 
                                    onClick={() => setLightboxImage({ url: msg.attachmentUrl!, name: msg.attachmentName || 'Photo' })}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center gap-2"
                                  >
                                    <span className="p-1.5 bg-black/60 rounded-full text-white text-xs flex items-center gap-1 font-semibold">
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>View</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadFileAttachment(msg.attachmentUrl!, msg.attachmentName || 'photo.jpg');
                                      }}
                                      className="p-1.5 bg-[#00a884] text-black rounded-full hover:bg-[#02906f] transition"
                                      title="Download photo"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* DOCUMENT ATTACHMENT */}
                              {msg.attachmentType === 'document' && msg.attachmentUrl && (
                                <div className="mb-2 p-2.5 bg-black/30 border border-white/10 rounded-lg flex items-center gap-2.5 min-w-[200px]">
                                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 grow">
                                    <p className="text-xs font-semibold text-[#e9edef] truncate" title={msg.attachmentName}>
                                      {msg.attachmentName || 'Document'}
                                    </p>
                                    <p className="text-[10px] text-[#8696a0]">
                                      {formatFileSize(msg.attachmentSize) || 'Document'}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => downloadFileAttachment(msg.attachmentUrl!, msg.attachmentName || 'document.pdf')}
                                    className="p-1.5 bg-[#2a3942] hover:bg-[#00a884] hover:text-black rounded-lg text-[#aebac1] transition shrink-0 cursor-pointer"
                                    title="Download document"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}

                              {/* MESSAGE TEXT */}
                              {msg.text && (
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                              )}

                              {/* Timestamp, Copy Button & WhatsApp Double Ticks */}
                              <div className="text-[10px] text-[#8696a0] mt-1 flex items-center justify-end gap-1.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(msg)}
                                  className="text-[#8696a0] hover:text-white p-0.5 rounded transition cursor-pointer"
                                  title="Copy message (कपी गर्नुहोस्)"
                                >
                                  {isCopied ? (
                                    <span className="text-[#00a884] flex items-center gap-0.5 font-bold">
                                      <Check className="w-3 h-3" />
                                      <span>कपी भयो</span>
                                    </span>
                                  ) : (
                                    <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                                  )}
                                </button>

                                <span>{formatMessageTime(msg.timestamp)}</span>

                                {/* WhatsApp Double Tick:
                                    - If seen by admin: Double Sky Blue Ticks (#53bdeb)
                                    - If delivered: Double Grey Ticks (#8696a0)
                                */}
                                {isMe && (
                                  isSeen ? (
                                    <span title="एडमिनले हेरिसक्यो (Seen by Admin)" className="inline-flex items-center text-[#53bdeb]">
                                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                    </span>
                                  ) : (
                                    <span title="डेलिभर भयो (Delivered)" className="inline-flex items-center text-[#8696a0]">
                                      <CheckCheck className="w-3.5 h-3.5 stroke-[2]" />
                                    </span>
                                  )
                                )}
                              </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}

                <div ref={studentEndRef} />
              </div>

              {/* Quick Suggestion Strip (WhatsApp Style) */}
              {(isAdmin || (hasActivatedCourse && Boolean(activeStudentTarget))) && studentMessages.length > 0 && (
                <div className="px-3 py-1.5 bg-[#202c33] border-t border-[#222d34] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] text-[#8696a0] uppercase font-bold shrink-0">सुझाव:</span>
                  {['धन्यवाद!', 'हजुर, बुझेँ।', 'पेमेन्ट स्क्रिनसट पठाएँ', 'प्रमाणपत्र कहाँ हेर्ने?'].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleStudentSendMessage(sug)}
                      className="bg-[#111b21] hover:bg-[#2a3942] border border-[#222d34] text-[#e9edef] text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Emoji quick row toggle */}
              {showEmojiBar && (
                <div className="px-3 py-2 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 overflow-x-auto shrink-0">
                  {WHATSAPP_QUICK_EMOJIS.map((emoji, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setStudentInputText(prev => prev + emoji)}
                      className="text-lg p-1.5 hover:bg-[#2a3942] rounded-lg transition active:scale-110 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Student Pending Attachment Preview Tray */}
              {studentPendingAttachment && (
                <div className="px-3.5 py-2 bg-[#111b21] border-t border-[#222d34] flex items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {studentPendingAttachment.type === 'image' ? (
                      <img
                        src={studentPendingAttachment.url}
                        alt={studentPendingAttachment.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#00a884]/40 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#e9edef] truncate">
                        {studentPendingAttachment.name}
                      </p>
                      <p className="text-[10px] text-[#00a884]">
                        {studentPendingAttachment.type === 'image' ? '📷 Photo' : '📄 Document'} • {formatFileSize(studentPendingAttachment.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStudentPendingAttachment(null)}
                    className="p-1.5 text-[#8696a0] hover:text-red-400 hover:bg-[#202c33] rounded-full transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* WhatsApp Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStudentSendMessage();
                }}
                className="p-2.5 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 shrink-0 relative"
              >
                {/* Hidden file inputs for student */}
                <input
                  type="file"
                  ref={studentImageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleStudentImageSelect}
                />
                <input
                  type="file"
                  ref={studentDocInputRef}
                  accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,application/pdf,text/plain"
                  className="hidden"
                  onChange={handleStudentDocSelect}
                />

                {!hasActivatedCourse && !isAdmin ? (
                  <div className="grow flex items-center justify-between bg-[#111b21] border border-amber-500/30 rounded-full px-4 py-2.5 text-xs text-amber-300">
                    <span className="flex items-center gap-2 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>कोर्ष एक्टिभेट गरेपछि मात्र म्यासेज पठाउन मिल्छ</span>
                    </span>
                    {onOpenActivationModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenActivationModal();
                        }}
                        className="bg-[#00a884] hover:bg-[#02906f] text-[#111b21] font-bold text-[11px] px-3 py-1 rounded-full cursor-pointer transition shrink-0 ml-2"
                      >
                        कोड हाल्नुहोस्
                      </button>
                    )}
                  </div>
                ) : !activeStudentTarget && !isAdmin ? (
                  <div className="grow flex items-center justify-center bg-[#111b21] border border-white/10 rounded-full px-4 py-2.5 text-xs text-[#aebac1]">
                    <span className="flex items-center gap-2 font-semibold">
                      <Lock className="w-3.5 h-3.5 text-[#00a884] shrink-0" />
                      <span>सपोर्ट उपलब्ध भएपछि मात्र म्यासेज पठाउन मिल्छ</span>
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grow bg-[#2a3942] rounded-full px-3 py-1.5 flex items-center gap-1.5 relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiBar(!showEmojiBar)}
                        className={`text-[#8696a0] hover:text-[#00a884] transition p-1 cursor-pointer ${showEmojiBar ? 'text-[#00a884]' : ''}`}
                        title="Emojis"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {/* Attachment Button & Popup Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowStudentAttachMenu(!showStudentAttachMenu)}
                          disabled={isStudentAttaching}
                          className={`text-[#8696a0] hover:text-[#00a884] transition p-1 cursor-pointer ${
                            showStudentAttachMenu ? 'text-[#00a884]' : ''
                          }`}
                          title="Attach Photo or Document"
                        >
                          <Paperclip className="w-5 h-5" />
                        </button>

                        {showStudentAttachMenu && (
                          <>
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setShowStudentAttachMenu(false)}
                            />
                            <div className="absolute left-0 bottom-full mb-3 w-52 bg-[#202c33] border border-[#222d34] rounded-2xl shadow-2xl p-1.5 z-40 text-xs text-[#e9edef] animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowStudentAttachMenu(false);
                                  studentImageInputRef.current?.click();
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-[#111b21] rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white">Photos & Images</p>
                                  <p className="text-[10px] text-[#8696a0]">फोटो / स्क्रिनसट</p>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowStudentAttachMenu(false);
                                  studentDocInputRef.current?.click();
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-[#111b21] rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white">Document / PDF</p>
                                  <p className="text-[10px] text-[#8696a0]">कागजात / फाइल (&lt;700KB)</p>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <input
                        ref={studentInputRef}
                        type="text"
                        value={studentInputText}
                        onChange={(e) => setStudentInputText(e.target.value)}
                        placeholder={
                          studentPendingAttachment
                            ? `Add a caption for ${studentPendingAttachment.name}...`
                            : `Message ${activeStudentTarget?.subAdmin.name || brandName}...`
                        }
                        disabled={isStudentSending || isStudentAttaching}
                        className="grow bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition disabled:opacity-50 px-1"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={(!studentInputText.trim() && !studentPendingAttachment) || isStudentSending || isStudentAttaching}
                      className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md active:scale-95"
                      title="Send message"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </>
                )}
              </form>
            </div>
          )}

        </div>

        {/* ==================================================================== */}
        {/* WHATSAPP CLEAR CHAT CONFIRMATION MODAL - STUDENT                     */}
        {/* ==================================================================== */}
        {showStudentClearConfirm && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="bg-[#202c33] border border-[#222d34] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-[#e9edef] space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#e9edef]">Clear this chat?</h4>
                  <p className="text-[11px] text-[#8696a0]">यो च्याट आफ्नो डिभाइसबाट खाली गर्ने?</p>
                </div>
              </div>

              <div className="bg-[#111b21] border border-[#222d34] rounded-xl p-3 text-xs text-[#aebac1] space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-[#00a884] font-bold">✓</span>
                  <span>
                    <strong>Only on this device:</strong> Messages will be cleared from your screen only. (तपाईंको स्क्रिनबाट मात्र च्याट हट्नेछ।)
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-[#00a884] font-bold">✓</span>
                  <span>
                    <strong>Safe Record:</strong> Conversation history stays safely stored with {brandName} support.
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowStudentClearConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStudentClearChat}
                  className="px-4 py-2 text-xs font-bold bg-[#00a884] hover:bg-[#02906f] text-[#111b21] rounded-lg shadow-md transition cursor-pointer active:scale-95"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* WHATSAPP CLEAR CHAT CONFIRMATION MODAL - ADMIN                       */}
        {/* ==================================================================== */}
        {showAdminClearConfirm && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <div className="bg-[#202c33] border border-[#222d34] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-[#e9edef] space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#e9edef]">Clear chat for Admin?</h4>
                  <p className="text-[11px] text-[#8696a0]">एडमिन भ्यूबाट मात्र च्याट खाली गर्ने?</p>
                </div>
              </div>

              <div className="bg-[#111b21] border border-[#222d34] rounded-xl p-3 text-xs text-[#aebac1] space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-[#00a884] font-bold">✓</span>
                  <span>
                    <strong>Admin View Only:</strong> Messages will only be hidden on your admin screen. (एडमिनको स्क्रिनबाट मात्र हट्नेछ।)
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-[#00a884] font-bold">✓</span>
                  <span>
                    <strong>Student Preserved:</strong> The student will NOT lose any messages and can still view their entire chat history. (विद्यार्थीको च्याट सुरक्षित रहन्छ।)
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdminClearConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21] rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdminClearChat}
                  className="px-4 py-2 text-xs font-bold bg-[#00a884] hover:bg-[#02906f] text-[#111b21] rounded-lg shadow-md transition cursor-pointer active:scale-95"
                >
                  Clear for Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* FULLSCREEN IMAGE LIGHTBOX MODAL                                      */}
        {/* ==================================================================== */}
        {lightboxImage && (
          <div 
            className="fixed inset-0 z-[6500] bg-black/92 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
            onClick={() => setLightboxImage(null)}
          >
            <div 
              className="p-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between z-10 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 truncate text-white text-xs sm:text-sm font-semibold max-w-[65%]">
                <ImageIcon className="w-4 h-4 text-[#00a884] shrink-0" />
                <span className="truncate">{lightboxImage.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFileAttachment(lightboxImage.url, lightboxImage.name)}
                  className="px-3 py-1.5 bg-[#00a884] hover:bg-[#02906f] text-black font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  title="Download photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>डाउनलोड (Download)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grow flex items-center justify-center p-4 overflow-hidden">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.name} 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
