import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Trash2, 
  RefreshCw, 
  User, 
  CheckCheck, 
  Clock, 
  Phone, 
  Mail, 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle,
  Check
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  increment,
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { SupportConversation, SupportMessage } from '../types';

interface AdminAskTabProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  instituteName?: string;
  instituteLogoUrl?: string;
  allActivationKeys?: any[];
}

const ADMIN_QUICK_PRESETS = [
  'नमस्ते! तपाईंलाई के सहयोग चाहिन्छ?',
  'तपाईंको भुक्तानी भेरिफाई भयो, धन्यवाद!',
  'तपाईंको Activation Key तयार छ।',
  'कृपया आफ्नो पेमेन्ट स्क्रिनसट वा ट्रान्ज्याक्सन आईडी पठाउनुहोस्।',
  'समस्या समाधान भएको छ, कृपया पुनः भिडियो खोलेर हेर्नुहोस्।'
];

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

// Helper: Verify if user has an activated course
const verifyCourseActivated = (
  userId: string,
  userEmail?: string,
  convData?: { activeCourse?: string; purchasedCourses?: string[]; isCourseActivated?: boolean },
  keysList?: any[]
): { isActivated: boolean; keyMatch?: any; courseTitle?: string } => {
  // 1. Check used/claimed activation keys in database
  if (Array.isArray(keysList)) {
    const keyMatch = keysList.find((k: any) => {
      const isClaimed = k.status === 'used' || Boolean(k.claimedAt) || Boolean(k.activeDeviceId);
      if (!isClaimed) return false;
      if (k.claimedByUid && (k.claimedByUid === userId)) return true;
      if (k.claimedByEmail && userEmail && k.claimedByEmail.toLowerCase() === userEmail.toLowerCase()) return true;
      if (userEmail && k.claimedByEmail && (userEmail.includes(k.claimedByEmail) || k.claimedByEmail.includes(userEmail))) return true;
      return false;
    });
    if (keyMatch) {
      return {
        isActivated: true,
        keyMatch,
        courseTitle: keyMatch.courseTitle || 'Ai master class course by ai clipzone'
      };
    }
  }

  // 2. Check conversation's own course activation flags
  if (convData) {
    if (convData.activeCourse && convData.activeCourse.trim() !== '') {
      return { isActivated: true, courseTitle: convData.activeCourse };
    }
    if (Array.isArray(convData.purchasedCourses) && convData.purchasedCourses.length > 0) {
      return { isActivated: true, courseTitle: convData.purchasedCourses[0] };
    }
    if (convData.isCourseActivated) {
      return { isActivated: true, courseTitle: 'Premium Course' };
    }
  }

  return { isActivated: false };
};

export const AdminAskTab: React.FC<AdminAskTabProps> = ({
  showToast,
  instituteName = 'AI CLIPZONE',
  instituteLogoUrl = '',
  allActivationKeys = []
}) => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [convToDelete, setConvToDelete] = useState<SupportConversation | null>(null);
  const [isPurgingNonActive, setIsPurgingNonActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  // 1. Real-time listener: strictly load ONLY course activated student conversations
  useEffect(() => {
    setIsLoadingConvs(true);
    const convsRef = collection(db, 'support_conversations');
    const q = query(convsRef, orderBy('lastMessageAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SupportConversation[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const check = verifyCourseActivated(docSnap.id, d.userEmail, d, allActivationKeys);

          // STRICT FILTER: Keep ONLY course activated users, remove/exclude all others!
          if (!check.isActivated) {
            return;
          }

          // Smart real name resolver: prioritize clean real name, then key match, then email
          let resolvedName = cleanRealName(d.userName);
          if (!resolvedName && check.keyMatch) {
            resolvedName = cleanRealName(check.keyMatch.studentName) || cleanRealName(check.keyMatch.claimedByName);
          }
          if (!resolvedName && d.userEmail) {
            const ep = d.userEmail.split('@')[0];
            resolvedName = ep.charAt(0).toUpperCase() + ep.slice(1);
          }
          if (!resolvedName) {
            resolvedName = 'Student';
          }

          const activeCourseTitle = check.courseTitle || d.activeCourse || (d.purchasedCourses?.[0]) || 'Ai master class course by ai clipzone';

          loaded.push({
            id: docSnap.id,
            userId: d.userId || docSnap.id,
            userName: resolvedName,
            userEmail: d.userEmail || (check.keyMatch?.claimedByEmail || ''),
            userPhone: d.userPhone || '',
            activeCourse: activeCourseTitle,
            purchasedCourses: [activeCourseTitle],
            lastMessage: d.lastMessage || '',
            lastMessageAt: d.lastMessageAt || Date.now(),
            lastSender: d.lastSender || 'user',
            unreadAdminCount: d.unreadAdminCount || 0,
            unreadUserCount: d.unreadUserCount || 0,
            createdAt: d.createdAt || Date.now(),
            updatedAt: d.updatedAt || Date.now(),
            activationCode: check.keyMatch?.code || ''
          } as any);
        });

        // Merge users from activation keys who bought courses so admin sees all buyers like WhatsApp contacts
        const existingIds = new Set(loaded.map((c) => c.id));
        if (Array.isArray(allActivationKeys)) {
          allActivationKeys.forEach((key: any) => {
            const isUsed = key.status === 'used' || Boolean(key.claimedAt) || Boolean(key.activeDeviceId);
            if (!isUsed) return;
            const buyerId = key.claimedByUid || (key.claimedByEmail ? `email_${key.claimedByEmail}` : null);
            if (buyerId && !existingIds.has(buyerId)) {
              existingIds.add(buyerId);
              const realName = cleanRealName(key.studentName) || cleanRealName(key.claimedByName) || (key.claimedByEmail ? (key.claimedByEmail.split('@')[0].charAt(0).toUpperCase() + key.claimedByEmail.split('@')[0].slice(1)) : 'Student');
              const courseTitle = key.courseTitle || 'Ai master class course by ai clipzone';
              loaded.push({
                id: buyerId,
                userId: buyerId,
                userName: realName,
                userEmail: key.claimedByEmail || '',
                userPhone: '',
                activeCourse: courseTitle,
                purchasedCourses: [courseTitle],
                lastMessage: `🔑 Activated Code: ${key.code || key.id}`,
                lastMessageAt: key.claimedAt || key.createdAt || Date.now(),
                lastSender: 'system',
                unreadAdminCount: 0,
                unreadUserCount: 0,
                createdAt: key.createdAt || Date.now(),
                updatedAt: key.claimedAt || Date.now(),
                activationCode: key.code || key.id
              } as any);
            }
          });
        }

        // Sort by lastMessageAt descending
        loaded.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

        setConversations(loaded);
        setIsLoadingConvs(false);

        // Auto-select first conversation on initial load if none selected
        if (!selectedConvId && loaded.length > 0) {
          setSelectedConvId(loaded[0].id);
        }
      },
      (err) => {
        console.warn('Could not load support conversations:', err);
        setIsLoadingConvs(false);
      }
    );

    return () => unsubscribe();
  }, [allActivationKeys]);

  // 2. Real-time listener for messages in the selected conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    setIsLoadingMsgs(true);
    const messagesRef = collection(db, 'support_conversations', selectedConvId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMsgs: SupportMessage[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          loadedMsgs.push({
            id: docSnap.id,
            conversationId: selectedConvId,
            sender: d.sender || 'user',
            senderName: d.senderName || 'Student',
            text: d.text || '',
            timestamp: d.timestamp || Date.now(),
            isSeen: d.isSeen ?? false,
            status: d.status ?? (d.isSeen ? 'seen' : 'sent'),
            seenAt: d.seenAt
          });

          // WhatsApp Seen logic: mark user's message as seen when admin opens conversation
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
        setMessages(loadedMsgs);
        setIsLoadingMsgs(false);

        // Mark unread for admin as 0
        try {
          const convRef = doc(db, 'support_conversations', selectedConvId);
          updateDoc(convRef, {
            unreadAdminCount: 0
          }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not load conversation messages:', err);
        setIsLoadingMsgs(false);
      }
    );

    return () => unsubscribe();
  }, [selectedConvId]);

  // Scroll down on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when conversation switches
  useEffect(() => {
    if (selectedConvId) {
      replyInputRef.current?.focus();
    }
  }, [selectedConvId]);

  // Handle Admin Send Reply
  const handleSendReply = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : replyText).trim();
    if (!text || isSending || !selectedConvId) return;

    setIsSending(true);
    setReplyText('');

    const now = Date.now();
    try {
      // 1. Add to messages subcollection
      const messagesRef = collection(db, 'support_conversations', selectedConvId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedConvId,
        sender: 'admin',
        senderName: `${instituteName} Support`,
        text,
        timestamp: now,
        isSeen: false,
        status: 'sent'
      });

      // 2. Update conversation doc - preserve student real name
      const targetConv = conversations.find(c => c.id === selectedConvId);
      const convRef = doc(db, 'support_conversations', selectedConvId);
      await setDoc(
        convRef,
        {
          id: selectedConvId,
          userId: targetConv?.userId || selectedConvId,
          userName: targetConv?.userName && targetConv.userName !== 'Student Learner' ? targetConv.userName : (targetConv?.userEmail ? targetConv.userEmail.split('@')[0] : 'Student'),
          userEmail: targetConv?.userEmail || '',
          lastMessage: text,
          lastMessageAt: now,
          lastSender: 'admin',
          unreadAdminCount: 0,
          unreadUserCount: increment(1),
          updatedAt: now
        },
        { merge: true }
      );

      showToast('जवाफ पठाइयो! (Reply delivered to student)', 'success');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      showToast('जवाफ पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setReplyText(text);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async () => {
    if (!convToDelete) return;
    try {
      // Delete all subcollection messages
      const msgsRef = collection(db, 'support_conversations', convToDelete.id, 'messages');
      const snap = await getDocs(msgsRef);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Delete parent conversation doc
      await deleteDoc(doc(db, 'support_conversations', convToDelete.id));

      if (selectedConvId === convToDelete.id) {
        setSelectedConvId(null);
      }
      setConvToDelete(null);
      showToast('च्याट वार्तालाप सफलतापूर्वक हटाइयो। (Conversation deleted)', 'info');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      showToast('च्याट हटाउन सकिएन।', 'error');
    }
  };

  // Filter conversations by search query
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.userName.toLowerCase().includes(q) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
      c.userId.toLowerCase().includes(q)
    );
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return '';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'भर्खरै (Just now)';
    if (mins < 60) return `${mins} मिनेट अगाडि`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} घण्टा अगाडि`;
    const days = Math.floor(hours / 24);
    return `${days} दिन अगाडि`;
  };

  return (
    <div className="space-y-4 text-zinc-200">
      {/* Top Banner Overview */}
      <div className="bg-gradient-to-r from-blue-950/70 via-zinc-900 to-purple-950/70 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm shadow-blue-500/20">
            💬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-black text-white tracking-tight">
                Ask & Live Support Messenger
              </h4>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              विद्यार्थीहरूले &quot;Ask&quot; बटनबाट पठाएका सबै प्रश्नहरूको प्रत्यक्ष च्याट र तत्काल जवाफ पठाउने ठाउँ।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl font-bold text-zinc-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            जम्मा च्याट: {conversations.length}
          </span>
        </div>
      </div>

      {/* Main Split Messenger Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[620px] max-h-[75vh]">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: CONVERSATIONS LIST */}
        {/* ========================================================================= */}
        <div className="md:col-span-5 lg:col-span-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-zinc-850 bg-black/50 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="विद्यार्थी वा म्यासेज खोज्नुहोस्..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="grow overflow-y-auto divide-y divide-zinc-900 scrollbar-none">
            {isLoadingConvs ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                वार्तालापहरू लोड हुँदैछ...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs px-4">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                <p className="font-semibold text-zinc-400">कुनै च्याट भेटिएन</p>
                <p className="mt-1 text-[11px] text-zinc-600">
                  विद्यार्थीले &quot;Ask&quot; सेक्सनबाट म्यासेज पठाउनासाथ यहाँ देखिनेछ।
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const hasUnread = conv.unreadAdminCount > 0;
                const firstLetter = (conv.userName || 'S').charAt(0).toUpperCase();

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3 transition flex items-start gap-3 cursor-pointer relative group ${
                      isSelected
                        ? 'bg-blue-600/15 border-l-4 border-blue-500'
                        : 'hover:bg-zinc-900/70'
                    }`}
                  >
                    {/* Student Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {firstLetter}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center shadow-xs animate-pulse">
                          {conv.unreadAdminCount}
                        </span>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="grow min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5 className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition">
                          {conv.userName}
                        </h5>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      {conv.userEmail && (
                        <p className="text-[10.5px] text-zinc-500 truncate mb-1">
                          {conv.userEmail}
                        </p>
                      )}

                      <p
                        className={`text-xs truncate ${
                          hasUnread
                            ? 'text-white font-semibold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {conv.lastSender === 'admin' ? (
                          <span className="text-blue-400 font-bold mr-1">You:</span>
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

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: ACTIVE MESSENGER CHAT */}
        {/* ========================================================================= */}
        <div className="md:col-span-7 lg:col-span-8 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {selectedConv ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 border-b border-zinc-850 bg-black/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                    {(selectedConv.userName || 'S').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white tracking-tight truncate">
                        {selectedConv.userName}
                      </h4>
                      <span className="text-[9.5px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        विद्यार्थी (Student)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 truncate">
                      {selectedConv.userEmail && <span>📧 {selectedConv.userEmail}</span>}
                      <span className="text-zinc-500">ID: {selectedConv.userId.substring(0, 10)}...</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setConvToDelete(selectedConv)}
                    className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                    title="यो वार्तालाप हटाउनुहोस् (Delete Conversation)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages History Thread */}
              <div className="grow overflow-y-auto p-4 space-y-3.5 bg-zinc-950/60 scrollbar-none text-sm">
                {isLoadingMsgs ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    म्यासेजहरू लोड हुँदैछ...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    यो च्याटमा हालसम्म कुनै म्यासेज छैन।
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdminMsg = msg.sender === 'admin';
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isAdminMsg ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                          {!isAdminMsg && (
                            <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold shrink-0 mb-1 border border-zinc-700">
                              {(selectedConv.userName || 'S').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 shadow-sm break-words ${
                              isAdminMsg
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-0.5">
                              <span
                                className={`text-[10px] font-black ${
                                  isAdminMsg ? 'text-blue-200' : 'text-blue-400'
                                }`}
                              >
                                {isAdminMsg ? `👑 ${instituteName} Admin` : msg.senderName}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {msg.text}
                            </p>

                            <div
                              className={`text-[9.5px] mt-1 flex items-center justify-end gap-1 ${
                                isAdminMsg ? 'text-blue-200' : 'text-zinc-500'
                              }`}
                            >
                              <span>{timeStr}</span>
                              {isAdminMsg && (
                                (msg.isSeen || msg.status === 'seen') ? (
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
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Presets Chips */}
              <div className="px-3 py-1.5 bg-black/40 border-t border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                <span className="text-[10px] text-zinc-500 uppercase font-bold shrink-0">
                  Quick:
                </span>
                {ADMIN_QUICK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendReply(preset)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/30 text-zinc-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Reply Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="p-3 bg-black/80 border-t border-zinc-800 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${selectedConv.userName}...`}
                  disabled={isSending}
                  className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
                  title="Send Reply to Student"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="grow flex flex-col items-center justify-center p-8 text-center text-zinc-500">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-blue-400/50">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-zinc-300 mb-1">
                कुनै पनि विद्यार्थीको च्याट छान्नुहोस्
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm">
                बायाँतर्फको सूचीबाट विद्यार्थी छानेर उनीहरूको प्रश्न हेर्नुहोस् र तुरुन्त जवाफ पठाउनुहोस्।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Conversation Confirmation Dialog */}
      {convToDelete && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">च्याट हटाउन निश्चित हुनुहुन्छ?</h4>
                <p className="text-[11px] text-zinc-400">{convToDelete.userName}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              यो च्याट वार्तालाप र यसका सम्पूर्ण म्यासेजहरू क्लाउडबाट स्थायी रूपमा हटाइनेछ।
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConvToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button
                onClick={handleDeleteConversation}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                च्याट हटाउनुहोस् (Delete)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
