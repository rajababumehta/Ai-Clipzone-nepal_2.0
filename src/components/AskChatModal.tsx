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
  HelpCircle, 
  Edit2, 
  Clock, 
  AlertCircle,
  MessageCircle,
  Phone,
  Mail,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  increment 
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
}

const QUICK_QUESTION_CHIPS = [
  'नमस्ते, मलाई कोर्ष बारे जानकारी चाहियो।',
  'पेमेन्ट गरिसकेपछि Activation Key कसरी पाउने?',
  'प्रमाणपत्र (Certificate) कसरी डाउनलोड गर्ने?',
  'भिडियो लोड हुन समय लागिरहेको छ, के गर्ने?'
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
  showToast
}) => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('clipzone_student_name') || initialStudentName || 'Student Learner';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync student name if prop changes and local isn't set
  useEffect(() => {
    if (initialStudentName && !localStorage.getItem('clipzone_student_name')) {
      setStudentName(initialStudentName);
      setTempName(initialStudentName);
    }
  }, [initialStudentName]);

  // Real-time listener for messages in this user's conversation thread
  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    // Listen to messages subcollection
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
            timestamp: data.timestamp || Date.now()
          });
        });
        setMessages(loadedMsgs);

        // When student opens the chat, mark unread messages for user as 0
        try {
          const convRef = doc(db, 'support_conversations', currentUserId);
          updateDoc(convRef, {
            unreadUserCount: 0
          }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not sync support messages live:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, currentUserId]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveStudentName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) return;
    const clean = tempName.trim();
    setStudentName(clean);
    localStorage.setItem('clipzone_student_name', clean);
    setIsEditingName(false);
    showToast?.('तपाईंको नाम सुरक्षित गरियो! (Name updated)', 'success');

    // Update name on conversation doc if it exists
    try {
      const convRef = doc(db, 'support_conversations', currentUserId);
      updateDoc(convRef, {
        userName: clean,
        updatedAt: Date.now()
      }).catch(() => {});
    } catch (e) {}
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isSending || !currentUserId) return;

    setIsSending(true);
    setInputText('');

    const now = Date.now();
    const finalStudentName = studentName.trim() || 'Student Learner';

    try {
      // 1. Add message document to messages subcollection
      const messagesRef = collection(db, 'support_conversations', currentUserId, 'messages');
      await addDoc(messagesRef, {
        conversationId: currentUserId,
        sender: 'user',
        senderName: finalStudentName,
        text,
        timestamp: now
      });

      // 2. Set or update the parent conversation doc
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

      // Play soft click feedback or toast
      showToast?.('म्यासेज पठाइयो! एडमिनलाई प्राप्त भयो। (Sent to Admin)', 'success');
    } catch (error) {
      console.error('Failed to send message:', error);
      showToast?.('म्यासेज पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setInputText(text); // restore input
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
            : "fixed inset-0 z-[4900] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md select-none text-zinc-100"
        }
      >
        <div
          className={
            isRunningInAppMode
              ? "flex flex-col h-full w-full bg-zinc-950"
              : "flex flex-col h-[90vh] max-h-[720px] w-full max-w-xl bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden relative"
          }
        >
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
            {/* Welcome & Info Card */}
            <div className="bg-gradient-to-br from-blue-950/30 via-zinc-900/60 to-purple-950/30 border border-blue-500/20 rounded-2xl p-3.5 text-xs text-zinc-300 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-blue-300 text-sm">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>AI CLIPZONE अफिसियल सपोर्ट (Ask Admin)</span>
              </div>
              <p className="leading-relaxed text-zinc-300">
                नमस्ते <strong>{studentName}</strong>! तपाईंको कोर्ष सम्बन्धी कुनै पनि जिज्ञासा, समस्या वा पेमेन्ट भेरिफिकेसनको लागि यहाँ म्यासेज गर्नुहोस्। एडमिनले तुरुन्त हेरेर जवाफ पठाउनुहुनेछ।
              </p>
            </div>

            {/* Rendered Messages */}
            {messages.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-blue-400">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-300 font-semibold text-sm">कुनै म्यासेज छैन (No messages yet)</p>
                  <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                    तलको बक्समा आफ्नो प्रश्न लेखेर पठाउनुहोस् वा तलका द्रुत प्रश्नहरू छान्नुहोस्।
                  </p>
                </div>

                {/* Quick question starter buttons */}
                <div className="pt-2 flex flex-col gap-1.5 max-w-sm mx-auto text-left">
                  <span className="text-[10.5px] font-bold text-zinc-400 px-1">द्रुत प्रश्नहरू (Quick Ask):</span>
                  {QUICK_QUESTION_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      className="text-left text-xs bg-zinc-900 hover:bg-zinc-850 hover:border-blue-500/40 active:scale-[0.98] transition border border-zinc-800 text-zinc-300 px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{chip}</span>
                      <Send className="w-3 h-3 text-blue-400 opacity-60 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender === 'user';
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
                        <div
                          className={`text-[9.5px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-blue-200' : 'text-zinc-400'
                          }`}
                        >
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions strip if user has messages */}
          {messages.length > 0 && (
            <div className="px-3 py-1.5 bg-zinc-950/90 border-t border-zinc-850 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] text-zinc-500 uppercase font-bold shrink-0">सुझाव:</span>
              {['धन्यवाद!', 'हजुर, बुझेँ।', 'पेमेन्ट स्क्रिनसट पठाएँ', 'प्रमाणपत्र कहाँ हेर्ने?'].map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
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
              handleSendMessage();
            }}
            className="p-3 bg-black border-t border-zinc-800 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="तपाईंको म्यासेज लेख्नुहोस् (Type message)..."
              disabled={isSending}
              className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none transition disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-md shadow-blue-500/20 active:scale-95"
              title="म्यासेज पठाउनुहोस् (Send)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
