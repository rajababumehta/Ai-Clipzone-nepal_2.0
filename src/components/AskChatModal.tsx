import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  X, 
  Send, 
  Bot, 
  User, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Edit2, 
  Clock, 
  MessageCircle, 
  Search,
  GraduationCap,
  ShieldCheck,
  RefreshCw,
  Trash2
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
  getDocs,
  deleteDoc
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
  allActivationKeys = []
}) => {
  // --------------------------------------------------------------------------
  // STUDENT VIEW STATES
  // --------------------------------------------------------------------------
  const [studentMessages, setStudentMessages] = useState<SupportMessage[]>([]);
  const [studentInputText, setStudentInputText] = useState('');
  const [isStudentSending, setIsStudentSending] = useState(false);
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('clipzone_student_name') || initialStudentName || 'Student Learner';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);
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

  // Sync student name prop
  useEffect(() => {
    if (initialStudentName && !localStorage.getItem('clipzone_student_name')) {
      setStudentName(initialStudentName);
      setTempName(initialStudentName);
    }
  }, [initialStudentName]);

  // ==========================================================================
  // 1. STUDENT MODE: Listener for student's direct messages with AI CLIPZONE
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || isAdmin || !currentUserId) return;

    const messagesRef = collection(db, 'support_conversations', currentUserId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMsgs: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            conversationId: currentUserId,
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
          const convRef = doc(db, 'support_conversations', currentUserId);
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
  }, [isOpen, isAdmin, currentUserId]);

  // Scroll to bottom when student messages update
  useEffect(() => {
    if (isOpen && !isAdmin) {
      studentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [studentMessages, isOpen, isAdmin]);

  // Focus student input on open
  useEffect(() => {
    if (isOpen && !isAdmin) {
      setTimeout(() => {
        studentInputRef.current?.focus();
      }, 300);
    }
  }, [isOpen, isAdmin]);

  // ==========================================================================
  // 2. ADMIN MODE: Listener for all student conversations & course buyers
  // ==========================================================================
  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    setIsLoadingAdminConvs(true);
    const convsRef = collection(db, 'support_conversations');
    const q = query(convsRef, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SupportConversation[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: d.userId || docSnap.id,
            userName: d.userName || 'Student Learner',
            userEmail: d.userEmail || '',
            userPhone: d.userPhone || '',
            purchasedCourses: d.purchasedCourses || (d.activeCourse ? [d.activeCourse] : []),
            lastMessage: d.lastMessage || '',
            lastMessageAt: d.lastMessageAt || Date.now(),
            lastSender: d.lastSender || 'user',
            unreadAdminCount: d.unreadAdminCount || 0,
            unreadUserCount: d.unreadUserCount || 0,
            createdAt: d.createdAt || Date.now(),
            updatedAt: d.updatedAt || Date.now()
          });
        });

        // Merge users from activation keys who bought courses so admin sees all buyers like WhatsApp contacts
        const existingUserIds = new Set(loaded.map(c => c.id));
        if (Array.isArray(allActivationKeys)) {
          allActivationKeys.forEach((key: any) => {
            const buyerId = key.claimedByUid || (key.claimedByEmail ? `email_${key.claimedByEmail}` : null);
            if (buyerId && !existingUserIds.has(buyerId)) {
              existingUserIds.add(buyerId);
              loaded.push({
                id: buyerId,
                userId: buyerId,
                userName: key.claimedByName || key.claimedByEmail?.split('@')[0] || 'Course Buyer',
                userEmail: key.claimedByEmail || '',
                purchasedCourses: [key.courseTitle || 'Premium Course'],
                lastMessage: `Activated Code: ${key.code || key.id}`,
                lastMessageAt: key.claimedAt || key.createdAt || Date.now(),
                lastSender: 'user',
                unreadAdminCount: 0,
                unreadUserCount: 0,
                createdAt: key.createdAt || Date.now(),
                updatedAt: key.claimedAt || Date.now()
              });
            } else if (buyerId && existingUserIds.has(buyerId)) {
              // Add purchased course badge to existing conversation
              const found = loaded.find(c => c.id === buyerId);
              if (found && key.courseTitle && !found.purchasedCourses?.includes(key.courseTitle)) {
                found.purchasedCourses = [...(found.purchasedCourses || []), key.courseTitle];
              }
            }
          });
        }

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
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

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

  // Scroll to bottom when admin messages update
  useEffect(() => {
    if (isOpen && isAdmin) {
      adminEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [adminMessages, isOpen, isAdmin]);

  // Focus admin input when conversation selected
  useEffect(() => {
    if (selectedAdminConvId) {
      adminReplyInputRef.current?.focus();
    }
  }, [selectedAdminConvId]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // HANDLERS: STUDENT
  // --------------------------------------------------------------------------
  const handleSaveStudentName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const clean = tempName.trim();
    setStudentName(clean);
    localStorage.setItem('clipzone_student_name', clean);
    setIsEditingName(false);
    showToast?.('तपाईंको नाम सुरक्षित गरियो! (Name updated)', 'success');

    try {
      const convRef = doc(db, 'support_conversations', currentUserId);
      updateDoc(convRef, {
        userName: clean,
        updatedAt: Date.now()
      }).catch(() => {});
    } catch (e) {}
  };

  const handleStudentSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : studentInputText).trim();
    if (!text || isStudentSending || !currentUserId) return;

    setIsStudentSending(true);
    setStudentInputText('');

    const now = Date.now();
    const finalStudentName = studentName.trim() || 'Student Learner';

    try {
      // 1. Add message with status 'sent' and isSeen: false (single tick initially)
      const messagesRef = collection(db, 'support_conversations', currentUserId, 'messages');
      await addDoc(messagesRef, {
        conversationId: currentUserId,
        sender: 'user',
        senderName: finalStudentName,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent'
      });

      // 2. Set/update conversation doc
      const convRef = doc(db, 'support_conversations', currentUserId);
      await setDoc(
        convRef,
        {
          id: currentUserId,
          userId: currentUserId,
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

      showToast?.('म्यासेज पठाइयो! एडमिनलाई प्राप्त भयो। (Sent)', 'success');
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

      // 2. Update conversation doc
      const convRef = doc(db, 'support_conversations', selectedAdminConvId);
      await setDoc(
        convRef,
        {
          lastMessage: text,
          lastMessageAt: now,
          lastSender: 'admin',
          unreadAdminCount: 0,
          unreadUserCount: increment(1),
          updatedAt: now
        },
        { merge: true }
      );

      showToast?.('जवाफ पठाइयो! (Reply delivered to student)', 'success');
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
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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

  // ==========================================================================
  // RENDER COMPONENT
  // ==========================================================================
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: isRunningInAppMode ? 30 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: isRunningInAppMode ? 30 : 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className={
          isRunningInAppMode
            ? "fixed inset-0 z-[4900] bg-black flex flex-col pb-[64px] pt-[env(safe-area-inset-top,0px)] select-none text-zinc-100 overflow-hidden"
            : "fixed inset-0 z-[4900] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none text-zinc-100"
        }
      >
        <div
          className={
            isRunningInAppMode
              ? "flex flex-col h-full w-full bg-zinc-950"
              : isAdmin
                ? "flex flex-col h-[92vh] max-h-[760px] w-full max-w-4xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative"
                : "flex flex-col h-[90vh] max-h-[720px] w-full max-w-xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative"
          }
        >

          {/* ================================================================= */}
          {/* CASE A: ADMIN VIEW (When user is Admin and clicks "Ask")           */}
          {/* ================================================================= */}
          {isAdmin ? (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Top Admin Header Bar */}
              <div className="bg-black border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  {/* On mobile, if a student chat is open, allow going back to contacts */}
                  {selectedAdminConvId && (
                    <button
                      onClick={() => setSelectedAdminConvId(null)}
                      className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 cursor-pointer"
                      title="Back to Contact List"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div className="w-10 h-10 bg-blue-950/70 border border-blue-500/40 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-sm text-blue-300">
                    💬
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                        {selectedAdminConv ? selectedAdminConv.userName : 'Student Contacts & Ask Messenger'}
                      </h4>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[9.5px] px-2 py-0.5 rounded-full font-black border border-emerald-500/30">
                        👑 ADMIN
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {selectedAdminConv ? (
                        <span className="text-emerald-400 font-medium">
                          {selectedAdminConv.purchasedCourses?.length ? `🎓 ${selectedAdminConv.purchasedCourses.join(', ')}` : 'Active Conversation'}
                        </span>
                      ) : (
                        <span>कोर्ष खरिद गरेका विद्यार्थीहरू र आएका म्यासेजहरू</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Body: Master-Detail Split Layout */}
              <div className="grow flex overflow-hidden">
                {/* 1. CONTACT LIST (Visible on desktop always; on mobile only when NO conversation selected) */}
                <div
                  className={`flex-col bg-zinc-950 border-r border-zinc-850 shrink-0 w-full md:w-80 lg:w-96 overflow-hidden ${
                    selectedAdminConvId ? 'hidden md:flex' : 'flex'
                  }`}
                >
                  {/* Contact Search Input */}
                  <div className="p-3 border-b border-zinc-850 bg-black/40">
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        placeholder="विद्यार्थी वा कोर्ष खोज्नुहोस्..."
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                      />
                      {adminSearchQuery && (
                        <button
                          onClick={() => setAdminSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contacts List Scrollable */}
                  <div className="grow overflow-y-auto divide-y divide-zinc-900 scrollbar-none">
                    {isLoadingAdminConvs ? (
                      <div className="py-12 text-center text-zinc-500 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                        सम्पर्क सूची लोड हुँदैछ...
                      </div>
                    ) : filteredAdminConversations.length === 0 ? (
                      <div className="py-16 text-center text-zinc-500 text-xs px-4 space-y-2">
                        <MessageCircle className="w-8 h-8 mx-auto opacity-30 text-zinc-400" />
                        <p className="font-semibold text-zinc-400">कुनै च्याट वा विद्यार्थी भेटिएन</p>
                        <p className="text-[11px] text-zinc-600">
                          विद्यार्थीहरूले कोर्ष एक्टिभेट गर्दा वा Ask सेक्सनबाट म्यासेज पठाउनासाथ यहाँ देखिनेछ।
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
                                ? 'bg-blue-600/15 border-l-4 border-blue-500'
                                : 'hover:bg-zinc-900/60'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                                {initialLetter}
                              </div>
                              {hasUnread && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-xs animate-pulse">
                                  {conv.unreadAdminCount}
                                </span>
                              )}
                            </div>

                            <div className="grow min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <h5 className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition">
                                  {conv.userName}
                                </h5>
                                <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                                  {formatRelativeTime(conv.lastMessageAt)}
                                </span>
                              </div>

                              {/* Course Enrolled Badge */}
                              {primaryCourse && (
                                <div className="mb-1">
                                  <span className="text-[9.5px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 px-1.5 py-0.5 rounded truncate inline-block max-w-[180px]">
                                    🎓 {primaryCourse}
                                  </span>
                                </div>
                              )}

                              {/* Last Message Snippet with WhatsApp tick if sent by admin */}
                              <p className={`text-xs truncate ${hasUnread ? 'text-white font-semibold' : 'text-zinc-400'}`}>
                                {conv.lastSender === 'admin' ? (
                                  <span className="text-blue-400 font-bold mr-1 inline-flex items-center gap-0.5">
                                    You:
                                    {conv.unreadUserCount === 0 ? (
                                      <CheckCheck className="w-3 h-3 text-sky-400 inline stroke-[2.5]" />
                                    ) : (
                                      <Check className="w-3 h-3 text-zinc-400 inline stroke-[2]" />
                                    )}
                                  </span>
                                ) : null}
                                {conv.lastMessage || 'कुनै म्यासेज छैन'}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. CHAT PANE (Visible on desktop always; on mobile only when conversation IS selected) */}
                <div
                  className={`grow flex-col bg-zinc-950 overflow-hidden ${
                    selectedAdminConvId ? 'flex' : 'hidden md:flex'
                  }`}
                >
                  {selectedAdminConv ? (
                    <>
                      {/* Active Chat Messages Scroll Area */}
                      <div className="grow overflow-y-auto p-4 space-y-3 text-sm">
                        {adminMessages.length === 0 ? (
                          <div className="py-12 text-center text-zinc-500 text-xs space-y-2">
                            <MessageCircle className="w-8 h-8 mx-auto opacity-30 text-zinc-400" />
                            <p className="font-semibold text-zinc-300">{selectedAdminConv.userName} सँगको कुराकानी</p>
                            <p className="text-[11px] text-zinc-500">
                              तलको बक्सबाट सिधै विद्यार्थीलाई म्यासेज पठाउनुहोस्।
                            </p>
                          </div>
                        ) : (
                          adminMessages.map((msg) => {
                            const isAdminMsg = msg.sender === 'admin';
                            const isSeen = msg.isSeen || msg.status === 'seen';

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}
                              >
                                <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                                  {!isAdminMsg && (
                                    <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold shrink-0 mb-1 border border-zinc-700">
                                      {(selectedAdminConv.userName || 'S').charAt(0).toUpperCase()}
                                    </div>
                                  )}

                                  <div
                                    className={`rounded-2xl px-3.5 py-2.5 shadow-sm break-words ${
                                      isAdminMsg
                                        ? 'bg-blue-600 text-white rounded-br-xs'
                                        : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs'
                                    }`}
                                  >
                                    {!isAdminMsg && (
                                      <div className="text-[10px] font-black text-blue-400 mb-0.5">
                                        {msg.senderName}
                                      </div>
                                    )}

                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                                    {/* Timestamp & WHATSAPP TICK MARKS */}
                                    <div
                                      className={`text-[9.5px] mt-1 flex items-center justify-end gap-1 ${
                                        isAdminMsg ? 'text-blue-200' : 'text-zinc-500'
                                      }`}
                                    >
                                      <span>{formatMessageTime(msg.timestamp)}</span>

                                      {/* WhatsApp Style Double Tick: Single grey if unseen, double sky-blue if seen! */}
                                      {isAdminMsg && (
                                        isSeen ? (
                                          <span title="विद्यार्थीले हेरिसक्यो (Seen by student)" className="inline-flex items-center ml-0.5 text-sky-300">
                                            <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                          </span>
                                        ) : (
                                          <span title="डेलिभर भयो (Sent)" className="inline-flex items-center ml-0.5 text-blue-200/70">
                                            <Check className="w-3.5 h-3.5 stroke-[2]" />
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

                      {/* Admin Quick Replies Bar */}
                      <div className="px-3 py-1.5 bg-black/40 border-t border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold shrink-0">द्रुत जवाफ:</span>
                        {ADMIN_QUICK_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAdminSendReply(preset)}
                            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/30 text-zinc-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {/* Admin Reply Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAdminSendReply();
                        }}
                        className="p-3 bg-black border-t border-zinc-850 flex items-center gap-2 shrink-0"
                      >
                        <input
                          ref={adminReplyInputRef}
                          type="text"
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          placeholder={`${selectedAdminConv.userName} लाई जवाफ लेख्नुहोस्...`}
                          disabled={isAdminSending}
                          className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition disabled:opacity-50"
                        />
                        <button
                          type="submit"
                          disabled={!adminReplyText.trim() || isAdminSending}
                          className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
                          title="जवाफ पठाउनुहोस् (Send Reply)"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="grow flex flex-col items-center justify-center p-6 text-center text-zinc-500">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-blue-400">
                        <MessageCircle className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-sm text-zinc-300 mb-1">विद्यार्थी छनोट गर्नुहोस्</h4>
                      <p className="text-xs text-zinc-500 max-w-xs">
                        च्याट गर्न र जवाफ पठाउन बाँयापट्टिको सम्पर्क सूचीबाट विद्यार्थी छान्नुहोस्।
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* CASE B: STUDENT VIEW ("Message to AI CLIPZONE" direct chat)     */
            /* =============================================================== */
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Header Bar */}
              <div className="bg-black/90 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full active:bg-white/10 transition cursor-pointer flex items-center justify-center"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 bg-zinc-900 border border-blue-500/30 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm">
                    {siteSettings.instituteLogoUrl ? (
                      <img
                        src={siteSettings.instituteLogoUrl}
                        alt="Logo"
                        className="w-7 h-7 object-contain rounded"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <MessageCircle className="w-5 h-5 text-blue-400" />
                    )}
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-black animate-pulse"></span>
                  </div>

                  <div>
                    <h4 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                      Message to {siteSettings.instituteName || 'AI CLIPZONE'}
                      <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.2 rounded-full font-black border border-blue-500/30">
                        LIVE SUPPORT
                      </span>
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        अनलाइन • सिधै एडमिनसँग च्याट
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Identity Strip */}
              <div className="bg-zinc-900/90 border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between text-xs text-zinc-300 shrink-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"></span>
                  <span className="text-zinc-400">विद्यार्थी:</span>
                  {isEditingName ? (
                    <form onSubmit={handleSaveStudentName} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-black border border-blue-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none w-32"
                        placeholder="तपाईंको नाम"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(false)}
                        className="text-zinc-400 hover:text-white text-[10px] px-1"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-1.5 truncate">
                      <strong className="text-white font-semibold truncate">{studentName}</strong>
                      <button
                        onClick={() => {
                          setTempName(studentName);
                          setIsEditingName(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 p-0.5 rounded hover:bg-blue-500/10 cursor-pointer"
                        title="नाम परिवर्तन गर्नुहोस् (Change Name)"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {activeCourseName && (
                  <span className="text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                    🎓 {activeCourseName}
                  </span>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div className="grow overflow-y-auto p-4 space-y-3.5 text-sm">
                {/* Info Card */}
                <div className="bg-gradient-to-br from-blue-950/30 via-zinc-900/60 to-purple-950/30 border border-blue-500/20 rounded-2xl p-3.5 text-xs text-zinc-300 space-y-1.5 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>AI CLIPZONE अफिसियल सपोर्ट (Ask Admin)</span>
                  </div>
                  <p className="leading-relaxed text-zinc-300">
                    नमस्ते <strong>{studentName}</strong>! तपाईंको कोर्ष सम्बन्धी कुनै पनि जिज्ञासा वा समस्याको लागि यहाँ म्यासेज गर्नुहोस्। एडमिनले हेरेपछि डबल नीलो टिक (Double Blue Tick) देखिनेछ।
                  </p>
                </div>

                {/* Rendered Messages */}
                {studentMessages.length === 0 ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-blue-400">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-zinc-300 font-semibold text-sm">कुनै म्यासेज छैन (No messages yet)</p>
                      <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                        तलको बक्समा आफ्नो प्रश्न लेखेर पठाउनुहोस् वा द्रुत प्रश्न छान्नुहोस्।
                      </p>
                    </div>

                    {/* Quick question starter chips */}
                    <div className="pt-2 flex flex-col gap-1.5 max-w-sm mx-auto text-left">
                      <span className="text-[10.5px] font-bold text-zinc-400 px-1">द्रुत प्रश्नहरू (Quick Ask):</span>
                      {QUICK_QUESTION_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleStudentSendMessage(chip)}
                          className="text-left text-xs bg-zinc-900 hover:bg-zinc-850 hover:border-blue-500/40 active:scale-[0.98] transition border border-zinc-800 text-zinc-300 px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate pr-2">{chip}</span>
                          <Send className="w-3 h-3 text-blue-400 opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  studentMessages.map((msg) => {
                    const isMe = msg.sender === 'user';
                    const isSeen = msg.isSeen || msg.status === 'seen';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                          {!isMe && (
                            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 mb-1 shadow-sm">
                              👑
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-md break-words ${
                              isMe
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-zinc-850 border border-zinc-700/70 text-zinc-100 rounded-bl-xs'
                            }`}
                          >
                            {!isMe && (
                              <div className="text-[10px] font-black text-blue-400 mb-0.5 flex items-center gap-1">
                                <span>{siteSettings.instituteName || 'AI CLIPZONE'} Support</span>
                                <ShieldCheck className="w-3 h-3 text-blue-400" />
                              </div>
                            )}

                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                            {/* Timestamp & WHATSAPP DOUBLE TICKS */}
                            <div
                              className={`text-[9.5px] mt-1 flex items-center justify-end gap-1 ${
                                isMe ? 'text-blue-200' : 'text-zinc-400'
                              }`}
                            >
                              <span>{formatMessageTime(msg.timestamp)}</span>

                              {/* WhatsApp style Double Tick for User's message */}
                              {isMe && (
                                isSeen ? (
                                  <span title="एडमिनले हेरिसक्यो (Seen by Admin)" className="inline-flex items-center ml-0.5 text-sky-300">
                                    <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span title="पठाइयो (Sent)" className="inline-flex items-center ml-0.5 text-blue-200/70">
                                    <Check className="w-3.5 h-3.5 stroke-[2]" />
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

                <div ref={studentEndRef} />
              </div>

              {/* Quick suggestions strip */}
              {studentMessages.length > 0 && (
                <div className="px-3 py-1.5 bg-zinc-950/90 border-t border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold shrink-0">सुझाव:</span>
                  {['धन्यवाद!', 'हजुर, बुझेँ।', 'पेमेन्ट स्क्रिनसट पठाएँ', 'प्रमाणपत्र कहाँ हेर्ने?'].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => handleStudentSendMessage(sug)}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-blue-500/30 text-zinc-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Chat Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStudentSendMessage();
                }}
                className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={studentInputRef}
                  type="text"
                  value={studentInputText}
                  onChange={(e) => setStudentInputText(e.target.value)}
                  placeholder="तपाईंको म्यासेज लेख्नुहोस् (Type message)..."
                  disabled={isStudentSending}
                  className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!studentInputText.trim() || isStudentSending}
                  className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
                  title="म्यासेज पठाउनुहोस् (Send)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
