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
  Info
} from 'lucide-react';
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
import { SupportMessage, SupportConversation, SiteSettingsConfig } from '../types';

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
  allActivationKeys?: any[];
  hasActivatedCourse?: boolean;
  onOpenActivationModal?: () => void;
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
  allActivationKeys = [],
  hasActivatedCourse = false,
  onOpenActivationModal
}) => {
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
  // WHATSAPP "CLEAR CHAT FROM OWN ONLY" STATES
  // WhatsApp Rule: Conversation records are NEVER permanently deleted from database.
  // Each user (student or admin) can clear chat from their OWN view only.
  // --------------------------------------------------------------------------
  const [studentClearedAt, setStudentClearedAt] = useState<number>(() => {
    const targetUid = effectiveUserId || currentUserId;
    if (typeof window === 'undefined' || !targetUid) return 0;
    return Number(localStorage.getItem(`clipzone_chat_cleared_user_${targetUid}`) || 0);
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

  // Sync student clearedAt timestamp whenever effectiveUserId changes
  useEffect(() => {
    const targetUid = effectiveUserId || currentUserId;
    if (targetUid) {
      const local = Number(localStorage.getItem(`clipzone_chat_cleared_user_${targetUid}`) || 0);
      setStudentClearedAt(local);
    }
  }, [effectiveUserId, currentUserId]);

  // Listen to student conversation doc for remote cleared timestamp
  useEffect(() => {
    const targetUid = effectiveUserId || currentUserId;
    if (!isOpen || isAdmin || !targetUid) return;
    const convRef = doc(db, 'support_conversations', targetUid);
    const unsub = onSnapshot(convRef, (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        if (d.clearedByUserAt !== undefined) {
          setStudentClearedAt((prev) => Math.max(prev, d.clearedByUserAt || 0));
        }
      }
    });
    return () => unsub();
  }, [isOpen, isAdmin, effectiveUserId, currentUserId]);

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
  // 1. STUDENT MODE: Listener for student's direct messages with AI CLIPZONE
  // ==========================================================================
  useEffect(() => {
    const targetUid = effectiveUserId || currentUserId;
    if (!isOpen || isAdmin || !targetUid) return;

    const messagesRef = collection(db, 'support_conversations', targetUid, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMsgs: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            conversationId: targetUid,
            sender: data.sender || 'user',
            senderName: data.senderName || 'Student',
            text: data.text || '',
            timestamp: data.timestamp || Date.now(),
            isSeen: data.isSeen ?? false,
            status: data.status ?? (data.isSeen ? 'seen' : 'sent'),
            seenAt: data.seenAt
          });

          // WHATSAPP DOUBLE TICK LOGIC: When student opens the chat, mark all admin messages as SEEN!
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

        // Reset student's unread counter on the conversation document
        try {
          const convRef = doc(db, 'support_conversations', targetUid);
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
  }, [isOpen, isAdmin, effectiveUserId, currentUserId]);

  // Filter messages based on WhatsApp-style local cleared timestamp (never deleted from DB)
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
  // 2. ADMIN MODE: Listener for all student conversations & course buyers
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    setIsLoadingAdminConvs(true);
    const convsRef = collection(db, 'support_conversations');
    const q = query(convsRef, orderBy('lastMessageAt', 'desc'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Map to ensure strictly ONE conversation per student - never duplicate contacts
        const studentContactMap = new Map<string, SupportConversation>();

        const getStudentKey = (name: string, email: string, uid: string, code?: string) => {
          const cName = cleanRealName(name).toLowerCase();
          if (cName) return `name_${cName}`;
          if (email && email.includes('@')) return `email_${email.toLowerCase()}`;
          if (code) return `code_${code.toLowerCase()}`;
          return `uid_${uid}`;
        };

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          // Smart real name resolver: prioritize clean real name, then activation key match, then email
          let resolvedName = cleanRealName(d.userName);
          let matchedKey: any = null;
          if (Array.isArray(allActivationKeys)) {
            matchedKey = allActivationKeys.find((k: any) =>
              (k.claimedByUid && (k.claimedByUid === docSnap.id || k.claimedByUid === d.userId)) ||
              (k.claimedByEmail && d.userEmail && k.claimedByEmail.toLowerCase() === d.userEmail.toLowerCase()) ||
              (k.claimedByEmail && docSnap.id.includes(k.claimedByEmail))
            );
            if (!resolvedName && matchedKey) {
              resolvedName = cleanRealName(matchedKey.claimedByName) || cleanRealName(matchedKey.studentName);
            }
          }
          if (!resolvedName && d.userEmail) {
            const ep = d.userEmail.split('@')[0];
            resolvedName = ep.charAt(0).toUpperCase() + ep.slice(1);
          }
          if (!resolvedName) {
            resolvedName = 'Student';
          }

          const convObj: SupportConversation = {
            id: docSnap.id,
            userId: d.userId || docSnap.id,
            userName: resolvedName,
            userEmail: d.userEmail || (matchedKey?.claimedByEmail || ''),
            userPhone: d.userPhone || '',
            purchasedCourses: d.purchasedCourses || (d.activeCourse ? [d.activeCourse] : []),
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

          const dedupKey = getStudentKey(resolvedName, convObj.userEmail || '', docSnap.id, matchedKey?.code);
          const existing = studentContactMap.get(dedupKey);

          if (!existing) {
            studentContactMap.set(dedupKey, convObj);
          } else {
            // Merge duplicate into the single contact thread, keeping the one with newest message
            if ((convObj.lastMessageAt || 0) > (existing.lastMessageAt || 0)) {
              studentContactMap.set(dedupKey, {
                ...existing,
                ...convObj,
                purchasedCourses: Array.from(new Set([...(existing.purchasedCourses || []), ...(convObj.purchasedCourses || [])]))
              });
            }
          }
        });

        // Merge users from activation keys who bought courses so admin sees all buyers like WhatsApp contacts
        if (Array.isArray(allActivationKeys)) {
          allActivationKeys.forEach((key: any) => {
            const isUsed = key.status === 'used' || Boolean(key.claimedAt) || Boolean(key.activeDeviceId);
            if (!isUsed) return;
            const buyerId = key.claimedByUid || (key.claimedByEmail ? `email_${key.claimedByEmail}` : null);
            if (!buyerId) return;

            const keyRealName = cleanRealName(key.claimedByName) || cleanRealName(key.studentName) || (key.claimedByEmail ? (key.claimedByEmail.split('@')[0].charAt(0).toUpperCase() + key.claimedByEmail.split('@')[0].slice(1)) : 'Student');
            const dedupKey = getStudentKey(keyRealName, key.claimedByEmail || '', buyerId, key.code || key.id);
            const courseTitle = key.courseTitle || 'Ai master class course by ai clipzone';

            const existing = studentContactMap.get(dedupKey);

            if (!existing) {
              studentContactMap.set(dedupKey, {
                id: buyerId,
                userId: buyerId,
                userName: keyRealName,
                userEmail: key.claimedByEmail || '',
                userPhone: '',
                purchasedCourses: [courseTitle],
                lastMessage: `🔑 Activated Code: ${key.code || key.id}`,
                lastMessageAt: key.claimedAt || key.createdAt || Date.now(),
                lastSender: 'user',
                unreadAdminCount: 0,
                unreadUserCount: 0,
                createdAt: key.createdAt || Date.now(),
                updatedAt: key.claimedAt || Date.now(),
                clearedByUserAt: 0,
                clearedByAdminAt: 0
              } as any);
            } else {
              // Existing contact found - update metadata, NEVER duplicate
              if (!cleanRealName(existing.userName) || existing.userName === 'Student') {
                existing.userName = keyRealName;
              }
              if (courseTitle && !existing.purchasedCourses?.includes(courseTitle)) {
                existing.purchasedCourses = [...(existing.purchasedCourses || []), courseTitle];
              }
            }
          });
        }

        const loaded = Array.from(studentContactMap.values());
        loaded.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

        setAdminConversations(loaded);
        setIsLoadingAdminConvs(false);

        // Auto select first conversation on desktop if none selected
        if (!selectedAdminConvId && loaded.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
          setSelectedAdminConvId(loaded[0].id);
        }
      },
      (err) => {
        console.warn('Could not load admin support conversations:', err);
        setIsLoadingAdminConvs(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin, allActivationKeys, selectedAdminConvId]);

  // ==========================================================================
  // 3. ADMIN MODE: Listener for messages in the selected student conversation
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || !isAdmin || !selectedAdminConvId) {
      setAdminMessages([]);
      return;
    }

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
            senderName: d.senderName || 'Student',
            text: d.text || '',
            timestamp: d.timestamp || Date.now(),
            isSeen: d.isSeen ?? false,
            status: d.status ?? (d.isSeen ? 'seen' : 'sent'),
            seenAt: d.seenAt
          });

          // WHATSAPP DOUBLE TICK LOGIC: When admin opens student conversation, mark user messages as SEEN!
          if (d.sender === 'user' && !d.isSeen) {
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

        // Reset admin unread count on conversation
        try {
          const convRef = doc(db, 'support_conversations', selectedAdminConvId);
          updateDoc(convRef, {
            unreadAdminCount: 0
          }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not load messages for selected admin conversation:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, isAdmin, selectedAdminConvId]);

  // Filter admin messages based on WhatsApp-style local cleared timestamp (never deleted from DB)
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
    const targetUid = effectiveUserId || currentUserId;
    const now = Date.now();
    setStudentClearedAt(now);
    if (targetUid) {
      localStorage.setItem(`clipzone_chat_cleared_user_${targetUid}`, String(now));
      try {
        const convRef = doc(db, 'support_conversations', targetUid);
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
    const targetUid = effectiveUserId || currentUserId;
    setStudentClearedAt(0);
    if (targetUid) {
      localStorage.removeItem(`clipzone_chat_cleared_user_${targetUid}`);
      try {
        const convRef = doc(db, 'support_conversations', targetUid);
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
  // HANDLERS: STUDENT
  // --------------------------------------------------------------------------
  const handleStudentSendMessage = async (textToSend?: string) => {
    // Strict requirement: Only course activated user (or admin) can send messages to admin
    if (!isAdmin && !hasActivatedCourse) {
      showToast?.('🔒 केवल कोर्ष एक्टिभेट गरेका विद्यार्थीहरूले मात्र एडमिनलाई म्यासेज पठाउन सक्नुहुन्छ।', 'error');
      if (onOpenActivationModal) {
        onClose();
        onOpenActivationModal();
      }
      return;
    }

    const targetUid = effectiveUserId || currentUserId;
    const text = (textToSend !== undefined ? textToSend : studentInputText).trim();
    if (!text || isStudentSending || !targetUid) return;

    setIsStudentSending(true);
    setStudentInputText('');
    setShowEmojiBar(false);

    const now = Date.now();
    let finalStudentName = cleanRealName(studentName) || cleanRealName(initialStudentName);
    if (!finalStudentName) {
      finalStudentName = userEmail ? (userEmail.split('@')[0].charAt(0).toUpperCase() + userEmail.split('@')[0].slice(1)) : 'Student';
    }

    try {
      // 1. Add message with status 'sent' and isSeen: false (single/double grey tick initially)
      const messagesRef = collection(db, 'support_conversations', targetUid, 'messages');
      await addDoc(messagesRef, {
        conversationId: targetUid,
        sender: 'user',
        senderName: finalStudentName,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent'
      });

      // 2. Set/update conversation doc with strictly the same single conversation ID
      const convRef = doc(db, 'support_conversations', targetUid);
      await setDoc(
        convRef,
        {
          id: targetUid,
          userId: targetUid,
          userName: finalStudentName,
          userEmail: userEmail || '',
          activeCourse: activeCourseName || '',
          lastMessage: text,
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
    } finally {
      setIsStudentSending(false);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: ADMIN
  // --------------------------------------------------------------------------
  const handleAdminSendReply = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : adminReplyText).trim();
    if (!text || isAdminSending || !selectedAdminConvId) return;

    setIsAdminSending(true);
    setAdminReplyText('');

    const now = Date.now();
    try {
      // 1. Add admin message with status 'sent' and isSeen: false
      const messagesRef = collection(db, 'support_conversations', selectedAdminConvId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedAdminConvId,
        sender: 'admin',
        senderName: `${siteSettings.instituteName || 'AI CLIPZONE'} Support`,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent'
      });

      // 2. Update conversation doc - strictly preserve real student name so it never resets to Student Learner
      const targetConv = adminConversations.find(c => c.id === selectedAdminConvId);
      let realUserName = cleanRealName(targetConv?.userName);
      if (!realUserName && Array.isArray(allActivationKeys)) {
        const keyMatch = allActivationKeys.find((k: any) => 
          (k.claimedByUid && (k.claimedByUid === selectedAdminConvId || k.claimedByUid === targetConv?.userId)) ||
          (k.claimedByEmail && targetConv?.userEmail && k.claimedByEmail.toLowerCase() === targetConv.userEmail.toLowerCase())
        );
        if (keyMatch) {
          realUserName = cleanRealName(keyMatch.claimedByName) || cleanRealName(keyMatch.studentName);
        }
      }
      if (!realUserName && targetConv?.userEmail) {
        const ep = targetConv.userEmail.split('@')[0];
        realUserName = ep.charAt(0).toUpperCase() + ep.slice(1);
      }
      if (!realUserName) realUserName = 'Student';

      const convRef = doc(db, 'support_conversations', selectedAdminConvId);
      await setDoc(
        convRef,
        {
          id: selectedAdminConvId,
          userId: targetConv?.userId || selectedAdminConvId,
          userName: realUserName,
          userEmail: targetConv?.userEmail || '',
          userPhone: targetConv?.userPhone || '',
          purchasedCourses: targetConv?.purchasedCourses || [],
          lastMessage: text,
          lastMessageAt: now,
          lastSender: 'admin',
          unreadAdminCount: 0,
          unreadUserCount: increment(1),
          updatedAt: now
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      showToast?.('जवाफ पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setAdminReplyText(text);
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
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
      coursesStr.includes(q)
    );
  });

  const selectedAdminConv = adminConversations.find(c => c.id === selectedAdminConvId);

  // WhatsApp Dark Wallpaper pattern inline style
  const whatsappWallpaperStyle: React.CSSProperties = {
    backgroundColor: '#0b141a',
    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
    backgroundSize: '24px 24px'
  };

  // ==========================================================================
  // RENDER COMPONENT
  // ==========================================================================
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: isRunningInAppMode ? 15 : 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: isRunningInAppMode ? 15 : 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed inset-0 z-[4900] flex sm:items-center sm:justify-center bg-[#0b141a] sm:bg-black/80 sm:backdrop-blur-sm select-none text-[#e9edef] overflow-hidden"
      >
        <div
          className={
            isAdmin
              ? "flex flex-col h-full w-full sm:h-[92vh] sm:max-h-[780px] sm:max-w-4xl bg-[#111b21] sm:rounded-2xl sm:border sm:border-[#222d34] shadow-2xl overflow-hidden relative pb-[64px] sm:pb-0"
              : "flex flex-col h-full w-full sm:h-[90vh] sm:max-h-[720px] sm:max-w-[480px] bg-[#111b21] sm:rounded-2xl sm:border sm:border-[#222d34] shadow-2xl overflow-hidden relative pb-[64px] sm:pb-0"
          }
        >

          {/* ================================================================= */}
          {/* CASE A: ADMIN VIEW (WhatsApp Web style for Admin)                  */}
          {/* ================================================================= */}
          {isAdmin ? (
            <div className="flex flex-col h-full w-full overflow-hidden bg-[#111b21]">
              {/* WhatsApp Web Admin Top Bar */}
              <div className="bg-[#202c33] border-b border-[#222d34] px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                  {selectedAdminConvId && (
                    <button
                      onClick={() => setSelectedAdminConvId(null)}
                      className="md:hidden p-1.5 -ml-1 text-[#aebac1] hover:text-white rounded-full hover:bg-[#111b21] cursor-pointer"
                      title="Back to Contact List"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-black shrink-0 shadow-sm">
                    <MessageCircle className="w-5 h-5 text-[#111b21]" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[#e9edef] flex items-center gap-1.5">
                        {selectedAdminConv ? selectedAdminConv.userName : 'Student Contacts & Messenger'}
                      </h4>
                      <span className="bg-[#00a884]/20 text-[#00a884] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#00a884]/30">
                        Admin Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8696a0]">
                      {selectedAdminConv ? (
                        <span className="text-[#00a884] font-medium">
                          {selectedAdminConv.purchasedCourses?.length ? `🎓 ${selectedAdminConv.purchasedCourses.join(', ')}` : 'Active conversation'}
                        </span>
                      ) : (
                        <span>कोर्ष खरिद गरेका विद्यार्थीहरू र प्रत्यक्ष म्यासेजहरू</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={onClose}
                    className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Master-Detail Split Layout (WhatsApp Web Style) */}
              <div className="grow flex overflow-hidden">
                {/* 1. CONTACTS SIDEBAR */}
                <div
                  className={`flex-col bg-[#111b21] border-r border-[#222d34] shrink-0 w-full md:w-80 lg:w-96 overflow-hidden ${
                    selectedAdminConvId ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* WhatsApp Search Input */}
                  <div className="p-3 border-b border-[#222d34] bg-[#111b21]">
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        placeholder="Search or start new chat..."
                        className="w-full bg-[#202c33] border border-transparent focus:border-[#00a884]/50 rounded-lg pl-9 pr-3 py-2 text-xs text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition"
                      />
                      {adminSearchQuery && (
                        <button
                          onClick={() => setAdminSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] text-xs"
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
                        <p className="font-semibold text-[#e9edef]">कुनै च्याट भेटिएन</p>
                        <p className="text-[11px] text-[#8696a0]">
                          विद्यार्थीहरूले म्यासेज पठाउँदा वा कोर्ष एक्टिभेट गर्दा यहाँ देखिनेछ।
                        </p>
                      </div>
                    ) : (
                      filteredAdminConversations.map((conv) => {
                        const isSelected = conv.id === selectedAdminConvId;
                        const hasUnread = conv.unreadAdminCount > 0;
                        const initialLetter = (conv.userName || 'S').charAt(0).toUpperCase();
                        const primaryCourse = conv.purchasedCourses?.[0];

                        return (
                          <button
                            key={conv.id}
                            onClick={() => setSelectedAdminConvId(conv.id)}
                            className={`w-full text-left p-3 transition flex items-start gap-3 cursor-pointer relative group ${
                              isSelected
                                ? 'bg-[#2a3942]'
                                : 'hover:bg-[#202c33]'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full bg-[#6a7b83] text-[#111b21] font-bold text-base flex items-center justify-center shadow-xs">
                                {initialLetter}
                              </div>
                              {hasUnread && (
                                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full bg-red-600 text-[11px] font-black text-white flex items-center justify-center px-1 shadow-md ring-2 ring-[#111b21] animate-pulse">
                                  {conv.unreadAdminCount > 99 ? '99+' : conv.unreadAdminCount}
                                </span>
                              )}
                            </div>

                            <div className="grow min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <h5 className="font-semibold text-sm text-[#e9edef] truncate">
                                  {conv.userName}
                                </h5>
                                <span className={`text-[11px] shrink-0 font-medium ${hasUnread ? 'text-[#00a884] font-bold' : 'text-[#8696a0]'}`}>
                                  {formatRelativeTime(conv.lastMessageAt)}
                                </span>
                              </div>

                              {primaryCourse && (
                                <div className="mb-1">
                                  <span className="text-[10px] font-medium bg-[#202c33] text-[#00a884] border border-[#00a884]/30 px-1.5 py-0.5 rounded truncate inline-block max-w-[190px]">
                                    🎓 {primaryCourse}
                                  </span>
                                </div>
                              )}

                              {/* WhatsApp style snippet with tick */}
                              <p className={`text-xs truncate flex items-center gap-1 ${hasUnread ? 'text-[#e9edef] font-semibold' : 'text-[#8696a0]'}`}>
                                {conv.lastSender === 'admin' && (
                                  <span className="shrink-0 inline-flex items-center">
                                    {conv.unreadUserCount === 0 ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] stroke-[2.5]" />
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5 text-[#8696a0] stroke-[2]" />
                                    )}
                                  </span>
                                )}
                                <span className="truncate">{conv.lastMessage || 'कुनै म्यासेज छैन'}</span>
                              </p>
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
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#6a7b83] text-[#111b21] font-bold text-sm flex items-center justify-center">
                            {(selectedAdminConv.userName || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-[#e9edef]">
                              {selectedAdminConv.userName}
                            </h4>
                            <p className="text-[11px] text-[#00a884]">
                              {selectedAdminConv.purchasedCourses?.[0] || 'Verified Student'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedAdminConv.userEmail && (
                            <span className="text-[11px] text-[#8696a0] bg-[#111b21] px-2.5 py-1 rounded-full border border-[#222d34] hidden sm:inline-block">
                              {selectedAdminConv.userEmail}
                            </span>
                          )}

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
                            <p className="font-semibold text-[#e9edef]">{selectedAdminConv.userName} सँग कुराकानी सुरु गर्नुहोस्</p>
                            <p className="text-[11px] text-[#8696a0]">
                              तलको बक्सबाट सिधै विद्यार्थीलाई जवाफ पठाउनुहोस्।
                            </p>
                          </div>
                        ) : (
                          displayedAdminMessages.map((msg) => {
                            const isAdminMsg = msg.sender === 'admin';
                            const isSeen = msg.isSeen || msg.status === 'seen';

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                              >
                                <div
                                  className={`rounded-xl px-3.5 pt-2 pb-1.5 shadow-sm break-words max-w-[85%] sm:max-w-[70%] ${
                                    isAdminMsg
                                      ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                                      : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                                  }`}
                                >
                                  {!isAdminMsg && (
                                    <div className="text-[11px] font-bold text-[#53bdeb] mb-0.5">
                                      {msg.senderName}
                                    </div>
                                  )}

                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                                  {/* Timestamp & WhatsApp Double Ticks */}
                                  <div className="text-[10px] text-[#8696a0] mt-0.5 flex items-center justify-end gap-1 select-none">
                                    <span>{formatMessageTime(msg.timestamp)}</span>

                                    {isAdminMsg && (
                                      isSeen ? (
                                        <span title="विद्यार्थीले हेरिसक्यो (Seen)" className="inline-flex items-center text-[#53bdeb]">
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
                            );
                          })
                        )}
                        <div ref={adminEndRef} />
                      </div>

                      {/* Admin Quick Replies */}
                      <div className="px-3 py-2 bg-[#202c33] border-t border-[#222d34] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                        <span className="text-[10px] text-[#8696a0] uppercase font-bold shrink-0">द्रुत जवाफ:</span>
                        {ADMIN_QUICK_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAdminSendReply(preset)}
                            className="bg-[#111b21] hover:bg-[#2a3942] border border-[#222d34] text-[#e9edef] text-xs px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Admin Reply Input Bar */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAdminSendReply();
                        }}
                        className="p-3 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 shrink-0"
                      >
                        <div className="grow bg-[#2a3942] rounded-full px-4 py-2 flex items-center">
                          <input
                            ref={adminReplyInputRef}
                            type="text"
                            value={adminReplyText}
                            onChange={(e) => setAdminReplyText(e.target.value)}
                            placeholder={`Type message to ${selectedAdminConv.userName}...`}
                            disabled={isAdminSending}
                            className="grow bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition disabled:opacity-50"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={!adminReplyText.trim() || isAdminSending}
                          className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md active:scale-95"
                          title="Send"
                        >
                          <Send className="w-4 h-4 ml-0.5" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="grow flex flex-col items-center justify-center p-6 text-center text-[#8696a0]">
                      <div className="w-16 h-16 rounded-full bg-[#202c33] border border-[#222d34] flex items-center justify-center mb-3 text-[#00a884]">
                        <MessageCircle className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-sm text-[#e9edef] mb-1">विद्यार्थी छनोट गर्नुहोस्</h4>
                      <p className="text-xs text-[#8696a0] max-w-xs">
                        च्याट गर्न र जवाफ पठाउन बाँयापट्टिको सम्पर्क सूचीबाट विद्यार्थी छान्नुहोस्।
                      </p>
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
              {/* WhatsApp Header Bar */}
              <div className="bg-[#202c33] border-b border-[#222d34] px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-md z-10">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={onClose}
                    className="p-1.5 -ml-1 text-[#aebac1] hover:text-white rounded-full active:bg-[#111b21] transition cursor-pointer flex items-center justify-center"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#128C7E] flex items-center justify-center overflow-hidden border border-white/10 shrink-0 shadow-xs">
                      {siteSettings.instituteLogoUrl ? (
                        <img
                          src={siteSettings.instituteLogoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : (
                        <MessageCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full ring-2 ring-[#202c33]"></span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#e9edef] flex items-center gap-1.5 leading-tight">
                      <span>{siteSettings.instituteName || 'AI CLIPZONE'} Support</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00a884] fill-[#00a884]/20" />
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#00a884] font-medium leading-tight">
                      <span>online • official admin</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {(siteSettings.supportPhone || siteSettings.contactPhone) && (
                    <a
                      href={`tel:${siteSettings.supportPhone || siteSettings.contactPhone}`}
                      className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition"
                      title={`Call ${siteSettings.supportPhone || siteSettings.contactPhone}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
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

                  <button
                    onClick={onClose}
                    className="p-2 text-[#aebac1] hover:text-white hover:bg-[#111b21] rounded-full transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Student Verified Identity Bar (Locked, No Name Change) */}
              <div className="bg-[#111b21] border-b border-[#222d34] px-4 py-2 flex items-center justify-between text-xs text-[#aebac1] shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${hasActivatedCourse ? 'bg-[#00a884]' : 'bg-amber-400'}`}></span>
                  <span className="text-[#8696a0]">Student:</span>
                  <strong className="text-[#e9edef] font-semibold truncate">{studentName}</strong>
                  {hasActivatedCourse && (
                    <span className="bg-[#00a884]/15 text-[#00a884] text-[10px] px-2 py-0.5 rounded-full font-bold border border-[#00a884]/25 inline-flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-[#00a884]" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                {activeCourseName ? (
                  <span className="text-[10px] font-medium bg-[#202c33] text-[#00a884] border border-[#00a884]/30 px-2 py-0.5 rounded-full truncate max-w-[160px] shrink-0">
                    🎓 {activeCourseName}
                  </span>
                ) : hasActivatedCourse ? (
                  <span className="text-[10px] font-medium bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded-full shrink-0">
                    ✓ Enrolled
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0">
                    🔒 Not Activated
                  </span>
                )}
              </div>

              {/* Messages Scroll Area with WhatsApp Wallpaper */}
              <div
                className="grow overflow-y-auto p-4 space-y-2.5 text-sm scrollbar-thin scrollbar-thumb-[#222d34]"
                style={whatsappWallpaperStyle}
              >
                {!hasActivatedCourse && !isAdmin ? (
                  /* LOCKED FOR UNACTIVATED USERS */
                  <div className="bg-[#111b21]/95 border border-amber-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl my-4">
                    <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 text-2xl">
                      <Lock className="w-7 h-7 text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-base text-[#e9edef]">कोर्ष एक्टिभेसन आवश्यक छ (Activation Required)</h4>
                      <p className="text-xs text-[#aebac1] leading-relaxed max-w-sm mx-auto">
                        केवल कोर्ष एक्टिभेट गरेका विद्यार्थीहरूले मात्र आफ्नो वास्तविक नामसहित एडमिनलाई सिधै म्यासेज पठाउन सक्नुहुन्छ।
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
                        <span>🗝️</span>
                        <span>Enter Activation Code (कोड हाल्नुहोस्)</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* WhatsApp Floating Date Pill */}
                    <div className="flex justify-center my-2">
                      <span className="bg-[#182229] text-[#8696a0] text-[10.5px] font-medium px-3 py-1 rounded-lg uppercase tracking-wider border border-[#222d34]/60 shadow-xs">
                        TODAY
                      </span>
                    </div>

                    {/* Security notice like WhatsApp end-to-end encryption pill */}
                    <div className="flex justify-center my-2">
                      <div className="bg-[#182229]/80 text-[#ffd279] text-[11px] px-3.5 py-1.5 rounded-lg max-w-xs text-center border border-[#ffd279]/20 flex items-center gap-1.5 leading-snug">
                        <Lock className="w-3 h-3 text-[#ffd279] shrink-0" />
                        <span>Messages are sent directly to AI CLIPZONE Official Support.</span>
                      </div>
                    </div>

                    {/* Banner if student cleared older messages on this device */}
                    {studentClearedAt > 0 && studentMessages.length > displayedStudentMessages.length && (
                      <div className="flex justify-center my-1.5">
                        <div className="bg-[#182229] border border-[#222d34] rounded-lg px-3 py-1.5 text-[11px] text-[#8696a0] flex items-center gap-2 shadow-xs">
                          <span>🗑️ Messages cleared on this device. (Admin records remain safe)</span>
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
                      <div className="py-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#202c33] border border-[#222d34] flex items-center justify-center mx-auto text-[#00a884]">
                          <MessageCircle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[#e9edef] font-semibold text-sm">कुनै म्यासेज छैन (No messages yet)</p>
                          <p className="text-[#8696a0] text-xs max-w-xs mx-auto">
                            तलको बक्समा आफ्नो प्रश्न लेखेर पठाउनुहोस्। एडमिनले हेरेपछि डबल नीलो टिक देखिनेछ।
                          </p>
                        </div>

                        {/* Quick Question Chips */}
                        <div className="pt-2 flex flex-col gap-1.5 max-w-sm mx-auto text-left">
                          <span className="text-[10.5px] font-bold text-[#8696a0] px-1">द्रुत प्रश्नहरू (Quick Ask):</span>
                          {QUICK_QUESTION_CHIPS.map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleStudentSendMessage(chip)}
                              className="text-left text-xs bg-[#202c33] hover:bg-[#2a3942] border border-[#222d34] text-[#e9edef] px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center justify-between group transition active:scale-[0.99]"
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

                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`rounded-xl px-3.5 pt-2 pb-1.5 text-sm shadow-sm break-words max-w-[85%] sm:max-w-[70%] ${
                                isMe
                                  ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                                  : 'bg-[#202c33] text-[#e9edef] rounded-tl-xs'
                              }`}
                            >
                              {!isMe && (
                                <div className="text-[11px] font-bold text-[#00a884] mb-0.5 flex items-center gap-1">
                                  <span>{siteSettings.instituteName || 'AI CLIPZONE'} Support</span>
                                  <CheckCircle2 className="w-3 h-3 text-[#00a884]" />
                                </div>
                              )}

                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                              {/* Timestamp & WhatsApp Double Ticks */}
                              <div className="text-[10px] text-[#8696a0] mt-0.5 flex items-center justify-end gap-1 select-none">
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
                        );
                      })
                    )}
                  </>
                )}

                <div ref={studentEndRef} />
              </div>

              {/* Quick Suggestion Strip (WhatsApp Style) */}
              {(hasActivatedCourse || isAdmin) && studentMessages.length > 0 && (
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

              {/* WhatsApp Chat Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStudentSendMessage();
                }}
                className="p-2.5 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 shrink-0"
              >
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
                ) : (
                  <>
                    <div className="grow bg-[#2a3942] rounded-full px-3.5 py-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEmojiBar(!showEmojiBar)}
                        className={`text-[#8696a0] hover:text-[#00a884] transition p-0.5 cursor-pointer ${showEmojiBar ? 'text-[#00a884]' : ''}`}
                        title="Emojis"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      <input
                        ref={studentInputRef}
                        type="text"
                        value={studentInputText}
                        onChange={(e) => setStudentInputText(e.target.value)}
                        placeholder="Type a message..."
                        disabled={isStudentSending}
                        className="grow bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none transition disabled:opacity-50"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!studentInputText.trim() || isStudentSending}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
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
                    <strong>Safe with Admin:</strong> Conversation records remain intact with official AI CLIPZONE support. (एडमिनसँग सुरक्षित रहनेछ।)
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
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
      </motion.div>
    </AnimatePresence>
  );
};
