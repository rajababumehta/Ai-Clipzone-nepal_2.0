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
  Check,
  Copy,
  Download,
  Image as ImageIcon,
  FileText,
  Eye,
  Paperclip,
  X
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
  deleteDoc,
  query, 
  orderBy,
  increment,
  getDocs,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase';
import { Course, SubAdminAccount, SupportConversation, SupportMessage } from '../types';

interface AdminAskTabProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  instituteName?: string;
  instituteLogoUrl?: string;
  allActivationKeys?: any[];
  adminRole?: 'main_admin' | 'sub_admin';
  subAdminSession?: SubAdminAccount | null;
  subAdmins?: SubAdminAccount[];
  courses?: Course[];
}

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

// Normalize string for course title comparison
const normTitle = (t?: string) => (t || '').trim().toLowerCase();

export const AdminAskTab: React.FC<AdminAskTabProps> = ({
  showToast,
  instituteName = 'AI CLIPZONE',
  instituteLogoUrl = '',
  allActivationKeys = [],
  adminRole = 'main_admin',
  subAdminSession = null,
  subAdmins = [],
  courses = []
}) => {
  const isMainAdmin = adminRole === 'main_admin';
  const isSubAdmin = adminRole === 'sub_admin' && Boolean(subAdminSession?.code);

  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [convToDelete, setConvToDelete] = useState<SupportConversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [adminPendingAttachment, setAdminPendingAttachment] = useState<ChatAttachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // 1. Real-time role-isolated listener:
  // - Main Admin sees ONLY All Sub-Admins (1-on-1 channels), NEVER course-activated students.
  // - Sub-Admin sees Official Main Admin (pinned top) + strictly their assigned course's activated students.
  useEffect(() => {
    setIsLoadingConvs(true);
    const convsRef = collection(db, 'support_conversations');
    const q = query(convsRef, orderBy('lastMessageAt', 'desc'), limit(300));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isMainAdmin) {
          // =================================================================
          // MAIN ADMIN: Show ALL Sub-Admins (zero course-activated students)
          // =================================================================
          const subAdminDocMap = new Map<string, any>();
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.channelType === 'subadmin_mainadmin' || docSnap.id.startsWith('subadmin_main__')) {
              const code = d.subAdminCode || docSnap.id.replace('subadmin_main__', '');
              subAdminDocMap.set(code, { id: docSnap.id, ...d });
            }
          });

          const mainContacts: SupportConversation[] = [];
          const seenCodes = new Set<string>();

          // 1. Add every registered Sub-Admin from subAdmins list
          (subAdmins || []).forEach((sub) => {
            if (!sub.code) return;
            seenCodes.add(sub.code);
            const convId = `subadmin_main__${sub.code}`;
            const remote = subAdminDocMap.get(sub.code);
            mainContacts.push({
              id: convId,
              userId: sub.code,
              userName: sub.name || `Sub-Admin (${sub.code})`,
              userEmail: `Course: ${sub.courseTitle || sub.courseId}`,
              userAvatar: '',
              channelType: 'subadmin_mainadmin',
              subAdminCode: sub.code,
              subAdminName: sub.name,
              courseId: sub.courseId,
              activeCourse: sub.courseTitle,
              purchasedCourses: sub.courseTitle ? [sub.courseTitle] : [],
              lastMessage: remote?.lastMessage || `🛡️ Sub-Admin Chat (${sub.status === 'active' ? 'Active' : 'Disabled'})`,
              lastMessageAt: remote?.lastMessageAt || sub.lastLoginAt || sub.createdAt || Date.now(),
              lastSender: remote?.lastSender || 'system',
              unreadAdminCount: remote?.unreadAdminCount || 0,
              unreadUserCount: remote?.unreadUserCount || 0,
              createdAt: remote?.createdAt || sub.createdAt || Date.now(),
              updatedAt: remote?.updatedAt || Date.now(),
              subAdminStatus: sub.status
            } as any);
          });

          // 2. Also include any orphaned subadmin_main__ threads present in Firestore
          subAdminDocMap.forEach((remote, code) => {
            if (seenCodes.has(code)) return;
            mainContacts.push({
              id: remote.id || `subadmin_main__${code}`,
              userId: code,
              userName: remote.subAdminName || remote.userName || `Sub-Admin (${code})`,
              userEmail: remote.activeCourse ? `Course: ${remote.activeCourse}` : '',
              channelType: 'subadmin_mainadmin',
              subAdminCode: code,
              subAdminName: remote.subAdminName || remote.userName,
              courseId: remote.courseId || '',
              activeCourse: remote.activeCourse || '',
              purchasedCourses: remote.activeCourse ? [remote.activeCourse] : [],
              lastMessage: remote.lastMessage || '🛡️ Sub-Admin Conversation',
              lastMessageAt: remote.lastMessageAt || remote.updatedAt || Date.now(),
              lastSender: remote.lastSender || 'user',
              unreadAdminCount: remote.unreadAdminCount || 0,
              unreadUserCount: remote.unreadUserCount || 0,
              createdAt: remote.createdAt || Date.now(),
              updatedAt: remote.updatedAt || Date.now()
            } as any);
          });

          // Sort with unread first, then most recent activity
          mainContacts.sort((a, b) => {
            const uDiff = (b.unreadAdminCount > 0 ? 1 : 0) - (a.unreadAdminCount > 0 ? 1 : 0);
            if (uDiff !== 0) return uDiff;
            return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
          });

          setConversations(mainContacts);
          setIsLoadingConvs(false);
          if (!selectedConvId && mainContacts.length > 0) {
            setSelectedConvId(mainContacts[0].id);
          }
          return;
        }

        if (isSubAdmin && subAdminSession) {
          // =================================================================
          // SUB-ADMIN: Pinned Main Official Admin + ONLY Assigned Course Students
          // =================================================================
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

            // Strictly match ONLY students belonging to this Sub-Admin's course
            const belongsToSub =
              (d.channelType === 'student_subadmin' &&
                (d.subAdminCode === subAdminSession.code ||
                  d.courseId === subAdminSession.courseId ||
                  (assignedTitleNorm && normTitle(d.activeCourse) === assignedTitleNorm))) ||
              (docSnap.id.startsWith(`substudent__${subAdminSession.code}__`));

            if (!belongsToSub) return;

            const rawStudentId = d.userId || docSnap.id.replace(`substudent__${subAdminSession.code}__`, '');
            const keyMatch = Array.isArray(allActivationKeys)
              ? allActivationKeys.find((k: any) =>
                  isKeyForThisSubCourse(k) &&
                  ((k.claimedByUid && k.claimedByUid === rawStudentId) ||
                    (k.claimedByEmail && d.userEmail && k.claimedByEmail.toLowerCase() === d.userEmail.toLowerCase()))
                )
              : undefined;

            let resolvedName = cleanRealName(d.userName);
            if (!resolvedName && keyMatch) {
              resolvedName = cleanRealName(keyMatch.studentName) || cleanRealName(keyMatch.claimedByName);
            }
            if (!resolvedName && d.userEmail) {
              const ep = d.userEmail.split('@')[0];
              resolvedName = ep.charAt(0).toUpperCase() + ep.slice(1);
            }
            if (!resolvedName) resolvedName = 'Student';

            const courseTitle = subAdminSession.courseTitle || d.activeCourse || keyMatch?.courseTitle || 'Course';
            const convObj: SupportConversation = {
              id: docSnap.id,
              userId: rawStudentId,
              userName: resolvedName,
              userEmail: d.userEmail || keyMatch?.claimedByEmail || '',
              userPhone: d.userPhone || '',
              userAvatar: d.userAvatar || keyMatch?.studentAvatar || '',
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
              activationCode: keyMatch?.code || ''
            } as any;

            const dedupKey = getStudentKey(resolvedName, convObj.userEmail || '', rawStudentId, keyMatch?.code);
            const existing = studentContactMap.get(dedupKey);
            if (!existing || (convObj.lastMessageAt || 0) > (existing.lastMessageAt || 0)) {
              studentContactMap.set(dedupKey, existing ? { ...existing, ...convObj } : convObj);
            }
          });

          // Merge used activation keys strictly for this Sub-Admin's course
          if (Array.isArray(allActivationKeys)) {
            allActivationKeys.forEach((key: any) => {
              const isUsed = key.status === 'used' || Boolean(key.claimedAt) || Boolean(key.activeDeviceId);
              if (!isUsed || !isKeyForThisSubCourse(key)) return;
              const buyerId = key.claimedByUid || (key.claimedByEmail ? `email_${key.claimedByEmail}` : null);
              if (!buyerId) return;

              const realName = cleanRealName(key.studentName) || cleanRealName(key.claimedByName) || 'Student';
              const dedupKey = getStudentKey(realName, key.claimedByEmail || '', buyerId, key.code || key.id);
              const courseTitle = subAdminSession.courseTitle || key.courseTitle || 'Course';
              const canonicalConvId = `substudent__${subAdminSession.code}__${buyerId}`;

              const existing = studentContactMap.get(dedupKey);
              if (!existing) {
                studentContactMap.set(dedupKey, {
                  id: canonicalConvId,
                  userId: buyerId,
                  userName: realName,
                  userEmail: key.claimedByEmail || '',
                  userPhone: '',
                  userAvatar: key.studentAvatar || '',
                  channelType: 'student_subadmin',
                  subAdminCode: subAdminSession.code,
                  subAdminName: subAdminSession.name,
                  courseId: subAdminSession.courseId,
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
              } else {
                if (key.code && !(existing as any).activationCode) {
                  (existing as any).activationCode = key.code;
                }
                if (!cleanRealName(existing.userName) || existing.userName === 'Student') {
                  existing.userName = realName;
                }
              }
            });
          }

          const officialConv: SupportConversation = {
            id: officialThreadId,
            userId: 'MAIN_OFFICIAL_ADMIN',
            userName: `${instituteName} Official Admin`,
            userEmail: 'Official Main Admin Support',
            userAvatar: instituteLogoUrl || '',
            channelType: 'subadmin_mainadmin',
            subAdminCode: subAdminSession.code,
            subAdminName: subAdminSession.name,
            courseId: subAdminSession.courseId,
            activeCourse: 'Official Main Admin (AI Clipzone)',
            purchasedCourses: ['Official Admin'],
            lastMessage: officialRemote?.lastMessage || '👑 Main Official Admin सँग सिधा कुराकानी गर्नुहोस्',
            lastMessageAt: officialRemote?.lastMessageAt || Date.now(),
            lastSender: officialRemote?.lastSender || 'system',
            unreadAdminCount: officialRemote?.unreadAdminCount || 0,
            unreadUserCount: officialRemote?.unreadUserCount || 0,
            createdAt: officialRemote?.createdAt || Date.now(),
            updatedAt: officialRemote?.updatedAt || Date.now()
          };

          const studentsList = Array.from(studentContactMap.values());
          studentsList.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

          const combined = [officialConv, ...studentsList];
          setConversations(combined);
          setIsLoadingConvs(false);

          if (!selectedConvId) {
            setSelectedConvId(officialConv.id);
          }
          return;
        }

        setConversations([]);
        setIsLoadingConvs(false);
      },
      (err) => {
        console.warn('Could not load support conversations:', err);
        setIsLoadingConvs(false);
      }
    );

    return () => unsubscribe();
  }, [isMainAdmin, isSubAdmin, subAdminSession?.code, subAdminSession?.courseId, subAdminSession?.courseTitle, subAdmins, allActivationKeys, courses, instituteName, instituteLogoUrl]);

  // 2. Real-time listener for messages in the selected conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    const isSubViewingMainAdmin = isSubAdmin && selectedConvId.startsWith('subadmin_main__');

    setIsLoadingMsgs(true);
    const messagesRef = collection(db, 'support_conversations', selectedConvId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100));

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

          // Seen logic:
          // - In Sub-Admin <-> Official Main Admin thread, Sub-Admin marks 'admin' msgs as seen & Main Admin marks 'user' msgs as seen
          // - In Student <-> Sub-Admin thread, Sub-Admin marks 'user' msgs as seen
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
        setMessages(loadedMsgs);
        setIsLoadingMsgs(false);

        // Reset appropriate unread counter
        try {
          const convRef = doc(db, 'support_conversations', selectedConvId);
          updateDoc(convRef, isSubViewingMainAdmin ? { unreadUserCount: 0 } : { unreadAdminCount: 0 }).catch(() => {});
        } catch (e) {}
      },
      (err) => {
        console.warn('Could not load conversation messages:', err);
        setIsLoadingMsgs(false);
      }
    );

    return () => unsubscribe();
  }, [selectedConvId, isSubAdmin]);

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

  // Copy message helper
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
      showToast('म्यासेज कपी भयो (Copied to clipboard)', 'success');
    } catch (e) {
      console.warn('Copy failed:', e);
      showToast('कपी गर्न सकिएन', 'error');
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAttaching(true);
      const attachment = await compressImageFile(file);
      setAdminPendingAttachment(attachment);
      setShowAttachMenu(false);
      replyInputRef.current?.focus();
    } catch (err: any) {
      showToast(err.message || 'फोटो प्रोसेस गर्न सकिएन', 'error');
    } finally {
      setIsAttaching(false);
      e.target.value = '';
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsAttaching(true);
      const attachment = await readDocumentFile(file);
      setAdminPendingAttachment(attachment);
      setShowAttachMenu(false);
      replyInputRef.current?.focus();
    } catch (err: any) {
      showToast(err.message || 'कागजात लोड गर्न सकिएन', 'error');
    } finally {
      setIsAttaching(false);
      e.target.value = '';
    }
  };

  // Handle Admin / Sub-Admin Send Reply
  const handleSendReply = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : replyText).trim();
    if ((!text && !adminPendingAttachment) || isSending || !selectedConvId) return;

    setIsSending(true);
    const attachmentToSend = adminPendingAttachment;
    setReplyText('');
    setAdminPendingAttachment(null);
    setShowAttachMenu(false);

    const now = Date.now();
    const targetConv = conversations.find(c => c.id === selectedConvId);
    const isSubViewingMainAdmin = isSubAdmin && selectedConvId.startsWith('subadmin_main__');
    const isMainViewingSubAdmin = isMainAdmin && (targetConv?.channelType === 'subadmin_mainadmin' || selectedConvId.startsWith('subadmin_main__'));

    // Sender semantics:
    // - Main Admin replying to Sub-Admin: sender='admin', increments unreadUserCount (Sub-Admin reads)
    // - Sub-Admin messaging Main Official Admin: sender='user', increments unreadAdminCount (Main Admin reads)
    // - Sub-Admin replying to Student: sender='admin', increments unreadUserCount (Student reads)
    const msgSender: 'admin' | 'user' = isSubViewingMainAdmin ? 'user' : 'admin';
    const senderLabel = isSubAdmin && subAdminSession
      ? `${subAdminSession.name} (${subAdminSession.courseTitle})`
      : `${instituteName} Official Admin`;

    try {
      // 1. Add to messages subcollection
      const messagesRef = collection(db, 'support_conversations', selectedConvId, 'messages');
      await addDoc(messagesRef, {
        conversationId: selectedConvId,
        sender: msgSender,
        senderName: senderLabel,
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

      // 2. Update conversation doc with strict channel isolation metadata
      const convRef = doc(db, 'support_conversations', selectedConvId);
      const convPayload: Record<string, any> = {
        id: selectedConvId,
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
        convPayload.unreadAdminCount = increment(1);
        convPayload.unreadUserCount = 0;
      } else if (isMainViewingSubAdmin) {
        const code = targetConv?.subAdminCode || selectedConvId.replace('subadmin_main__', '');
        convPayload.channelType = 'subadmin_mainadmin';
        convPayload.subAdminCode = code;
        convPayload.subAdminName = targetConv?.subAdminName || targetConv?.userName || code;
        convPayload.courseId = targetConv?.courseId || '';
        convPayload.activeCourse = targetConv?.activeCourse || '';
        convPayload.userId = code;
        convPayload.userName = targetConv?.userName || targetConv?.subAdminName || code;
        convPayload.unreadAdminCount = 0;
        convPayload.unreadUserCount = increment(1);
      } else if (isSubAdmin && subAdminSession) {
        convPayload.channelType = 'student_subadmin';
        convPayload.subAdminCode = subAdminSession.code;
        convPayload.subAdminName = subAdminSession.name;
        convPayload.courseId = subAdminSession.courseId;
        convPayload.activeCourse = subAdminSession.courseTitle;
        convPayload.userId = targetConv?.userId || selectedConvId.replace(`substudent__${subAdminSession.code}__`, '');
        convPayload.userName = targetConv?.userName && targetConv.userName !== 'Student Learner' ? targetConv.userName : (targetConv?.userEmail ? targetConv.userEmail.split('@')[0] : 'Student');
        convPayload.userEmail = targetConv?.userEmail || '';
        convPayload.unreadAdminCount = 0;
        convPayload.unreadUserCount = increment(1);
      }

      await setDoc(convRef, convPayload, { merge: true });
      showToast(isSubViewingMainAdmin ? 'Main Admin लाई म्यासेज पठाइयो!' : 'जवाफ पठाइयो!', 'success');
    } catch (err) {
      console.error('Failed to send reply:', err);
      showToast('म्यासेज पठाउन सकिएन, कृपया पुन: प्रयास गर्नुहोस्।', 'error');
      setReplyText(text);
      setAdminPendingAttachment(attachmentToSend);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Delete Conversation
  const handleDeleteConversation = async () => {
    if (!convToDelete) return;
    try {
      const msgsRef = collection(db, 'support_conversations', convToDelete.id, 'messages');
      const snap = await getDocs(msgsRef);
      const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

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
      (c.activeCourse && c.activeCourse.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q)) ||
      c.userId.toLowerCase().includes(q)
    );
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);
  const isSelectedMainAdminChat = Boolean(isSubAdmin && selectedConv?.channelType === 'subadmin_mainadmin');

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
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-black text-white tracking-tight">
                {isMainAdmin ? 'Sub-Admins Direct Support Messenger' : `Course Ask & Official Support (${subAdminSession?.courseTitle || 'Course'})`}
              </h4>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {isMainAdmin
                ? 'सबै Sub-Admin हरूसँग प्रत्यक्ष १-अन-१ च्याट (विद्यार्थी च्याटहरू सम्बन्धित Sub-Admin मा मात्र सीमित छन्)।'
                : 'AI CLIPZONE Official Admin तथा तपाईंको कोर्ष सक्रिय गरेका विद्यार्थीहरूसँग प्रत्यक्ष कुराकानी गर्नुहोस्।'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl font-bold text-zinc-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            {isMainAdmin ? `Sub-Admins: ${conversations.length}` : `जम्मा च्याट: ${conversations.length}`}
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
                placeholder={isMainAdmin ? 'Sub-Admin वा कोर्ष खोज्नुहोस्...' : 'Admin, विद्यार्थी वा म्यासेज खोज्नुहोस्...'}
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
                  {isMainAdmin
                    ? 'Sub-Admins ट्याबबाट Sub-Admin बनाएपछि यहाँ च्याट देखिनेछ।'
                    : 'कोर्ष सक्रिय गरेका विद्यार्थीले म्यासेज पठाउँदा यहाँ देखिनेछ।'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isSubMainThread = isSubAdmin && conv.channelType === 'subadmin_mainadmin';
                const unreadNum = isSubMainThread ? (conv.unreadUserCount || 0) : (conv.unreadAdminCount || 0);
                const hasUnread = unreadNum > 0;
                const firstLetter = (conv.userName || 'S').charAt(0).toUpperCase();
                const isMeLast = isSubMainThread ? conv.lastSender === 'user' : conv.lastSender === 'admin';

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full text-left p-3 transition flex items-start gap-3 cursor-pointer relative group ${
                      isSelected
                        ? isSubMainThread
                          ? 'bg-amber-600/15 border-l-4 border-amber-400'
                          : 'bg-blue-600/15 border-l-4 border-blue-500'
                        : isSubMainThread
                          ? 'bg-amber-950/20 hover:bg-amber-950/35'
                          : 'hover:bg-zinc-900/70'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {conv.userAvatar && (conv.userAvatar.startsWith('http') || conv.userAvatar.startsWith('data:') || conv.userAvatar.startsWith('/')) ? (
                        <img
                          src={conv.userAvatar}
                          alt={conv.userName}
                          className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-zinc-700/80"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-2xl text-white font-black text-sm flex items-center justify-center shadow-sm ${
                          conv.channelType === 'subadmin_mainadmin'
                            ? isSubAdmin
                              ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                              : 'bg-gradient-to-tr from-purple-700 to-indigo-600'
                            : 'bg-gradient-to-tr from-blue-700 to-indigo-600'
                        }`}>
                          {conv.channelType === 'subadmin_mainadmin' ? (isSubAdmin ? '👑' : '🛡️') : firstLetter}
                        </div>
                      )}
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-[10px] font-black text-white flex items-center justify-center shadow-xs ring-1 ring-black animate-pulse">
                          {unreadNum > 99 ? '99+' : unreadNum}
                        </span>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="grow min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h5 className="font-bold text-xs text-white truncate group-hover:text-blue-300 transition flex items-center gap-1">
                          <span className="truncate">{conv.userName}</span>
                          {isSubMainThread && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.2 rounded shrink-0">
                              Official
                            </span>
                          )}
                        </h5>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-medium">
                          {formatRelativeTime(conv.lastMessageAt)}
                        </span>
                      </div>

                      {conv.activeCourse && (
                        <p className={`text-[10px] truncate mb-0.5 font-semibold ${
                          isSubMainThread ? 'text-amber-300/90' : conv.channelType === 'subadmin_mainadmin' ? 'text-purple-300' : 'text-emerald-400/90'
                        }`}>
                          {conv.channelType === 'subadmin_mainadmin'
                            ? isSubAdmin ? '👑 Main Admin Support' : `🛡️ ${conv.activeCourse}`
                            : `🎓 ${conv.activeCourse}`}
                        </p>
                      )}

                      <p
                        className={`text-xs truncate ${
                          hasUnread
                            ? 'text-white font-semibold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {isMeLast ? (
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
                  {selectedConv.userAvatar && (selectedConv.userAvatar.startsWith('http') || selectedConv.userAvatar.startsWith('data:') || selectedConv.userAvatar.startsWith('/')) ? (
                    <img
                      src={selectedConv.userAvatar}
                      alt={selectedConv.userName}
                      className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-blue-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                      {selectedConv.channelType === 'subadmin_mainadmin' ? (isSubAdmin ? '👑' : '🛡️') : (selectedConv.userName || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white tracking-tight truncate">
                        {selectedConv.userName}
                      </h4>
                      {selectedConv.channelType === 'subadmin_mainadmin' ? (
                        isSubAdmin ? (
                          <span className="text-[9.5px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            👑 Official Main Admin
                          </span>
                        ) : (
                          <span className="text-[9.5px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold">
                            🛡️ Course Sub-Admin
                          </span>
                        )
                      ) : (
                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                          विद्यार्थी (Activated Student)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 truncate">
                      {selectedConv.activeCourse && <span>🎓 {selectedConv.activeCourse}</span>}
                      {selectedConv.subAdminCode && isMainAdmin && (
                        <span className="text-purple-300 font-mono">Code: {selectedConv.subAdminCode}</span>
                      )}
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
                    यो च्याटमा हालसम्म कुनै म्यासेज छैन। तलबाट सिधै सन्देश पठाउनुहोस्।
                  </div>
                ) : (
                  messages.map((msg) => {
                    // For Sub-Admin talking to Official Main Admin: msg.sender === 'user' is Sub-Admin ("Me", right side)
                    const isMyMsg = isSelectedMainAdminChat ? msg.sender === 'user' : msg.sender === 'admin';
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const isCopied = copiedMessageId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group/bubble ${
                          isMyMsg ? 'items-end' : 'items-start'
                        }`}
                      >
                        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                          {!isMyMsg && (
                            (msg.senderAvatar || selectedConv.userAvatar) ? (
                              <img
                                src={msg.senderAvatar || selectedConv.userAvatar}
                                alt={msg.senderName}
                                className="w-7 h-7 rounded-xl object-cover shrink-0 mb-1 border border-zinc-700 shadow-xs"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold shrink-0 mb-1 border border-zinc-700">
                                {isSelectedMainAdminChat ? '👑' : (selectedConv.userName || 'S').charAt(0).toUpperCase()}
                              </div>
                            )
                          )}

                          <div
                            className={`rounded-2xl px-3.5 py-2.5 shadow-sm break-words relative ${
                              isMyMsg
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 mb-1">
                              <span
                                className={`text-[10px] font-black ${
                                  isMyMsg ? 'text-blue-200' : isSelectedMainAdminChat ? 'text-amber-300' : 'text-blue-400'
                                }`}
                              >
                                {isMyMsg
                                  ? (isSubAdmin ? `🛡️ ${subAdminSession?.name || 'Sub-Admin'}` : `👑 ${instituteName} Official Admin`)
                                  : msg.senderName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg)}
                                className="opacity-70 hover:opacity-100 p-0.5 rounded transition text-zinc-300 hover:text-white hover:bg-black/20"
                                title="Copy message (कपी गर्नुहोस्)"
                              >
                                {isCopied ? (
                                  <Check className="w-3 h-3 text-emerald-300" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {/* IMAGE ATTACHMENT */}
                            {msg.attachmentType === 'image' && msg.attachmentUrl && (
                              <div className="mb-2 overflow-hidden rounded-xl bg-black/40 border border-white/10 relative group/img cursor-pointer">
                                <img
                                  src={msg.attachmentUrl}
                                  alt={msg.attachmentName || 'Photo'}
                                  onClick={() => setLightboxImage({ url: msg.attachmentUrl!, name: msg.attachmentName || 'Photo' })}
                                  className="w-full max-h-[260px] object-cover rounded-xl group-hover/img:scale-[1.02] transition"
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
                                    className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-400 transition"
                                    title="Download photo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* DOCUMENT ATTACHMENT */}
                            {msg.attachmentType === 'document' && msg.attachmentUrl && (
                              <div className="mb-2 p-2.5 bg-black/30 border border-white/10 rounded-xl flex items-center gap-2.5 min-w-[200px]">
                                <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 grow">
                                  <p className="text-xs font-semibold text-white truncate" title={msg.attachmentName}>
                                    {msg.attachmentName || 'Document'}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    {formatFileSize(msg.attachmentSize) || 'Document'}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => downloadFileAttachment(msg.attachmentUrl!, msg.attachmentName || 'document.pdf')}
                                  className="p-1.5 bg-zinc-800 hover:bg-blue-600 rounded-lg text-zinc-300 hover:text-white transition shrink-0 cursor-pointer"
                                  title="Download document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* MESSAGE TEXT */}
                            {msg.text && (
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {msg.text}
                              </p>
                            )}

                            <div
                              className={`text-[9.5px] mt-1.5 flex items-center justify-end gap-1.5 ${
                                isMyMsg ? 'text-blue-200' : 'text-zinc-500'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg)}
                                className="text-zinc-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                                title="Copy message (कपी गर्नुहोस्)"
                              >
                                {isCopied ? (
                                  <span className="text-emerald-300 flex items-center gap-0.5 font-bold">
                                    <Check className="w-3 h-3" />
                                    <span>कपी भयो</span>
                                  </span>
                                ) : (
                                  <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />
                                )}
                              </button>

                              <span>{timeStr}</span>
                              {isMyMsg && (
                                (msg.isSeen || msg.status === 'seen') ? (
                                  <span title="हेरिसक्यो (Seen)" className="inline-flex items-center ml-0.5 text-sky-300">
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
                {(isSelectedMainAdminChat ? SUB_ADMIN_TO_MAIN_PRESETS : ADMIN_QUICK_PRESETS).map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendReply(preset)}
                    className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/30 text-zinc-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer transition active:scale-95"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Admin Pending Attachment Preview Bar */}
              {adminPendingAttachment && (
                <div className="px-3.5 py-2 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {adminPendingAttachment.type === 'image' ? (
                      <img
                        src={adminPendingAttachment.url}
                        alt={adminPendingAttachment.name}
                        className="w-10 h-10 rounded-lg object-cover border border-blue-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {adminPendingAttachment.name}
                      </p>
                      <p className="text-[10px] text-blue-400">
                        {adminPendingAttachment.type === 'image' ? '📷 Photo' : '📄 Document'} • {formatFileSize(adminPendingAttachment.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminPendingAttachment(null)}
                    className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-full transition cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Chat Reply Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendReply();
                }}
                className="p-3 bg-black/80 border-t border-zinc-800 flex items-center gap-2 shrink-0 relative"
              >
                {/* Hidden file inputs */}
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <input
                  type="file"
                  ref={docInputRef}
                  accept=".pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,application/pdf,text/plain"
                  className="hidden"
                  onChange={handleDocSelect}
                />

                {/* Attachment Menu Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={isAttaching}
                    className={`p-2.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-900 rounded-2xl transition cursor-pointer ${
                      showAttachMenu ? 'text-blue-400 bg-zinc-900' : ''
                    }`}
                    title="Attach Photo or Document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {showAttachMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowAttachMenu(false)}
                      />
                      <div className="absolute left-0 bottom-full mb-2 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-1.5 z-40 text-xs text-zinc-200 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-zinc-800 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">Photos & Images</p>
                            <p className="text-[10px] text-zinc-400">फोटो / स्क्रिनसट</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachMenu(false);
                            docInputRef.current?.click();
                          }}
                          className="w-full px-3 py-2.5 text-left hover:bg-zinc-800 rounded-xl flex items-center gap-2.5 transition cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">Document / PDF</p>
                            <p className="text-[10px] text-zinc-400">कागजात / फाइल (&lt;700KB)</p>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <input
                  ref={replyInputRef}
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    adminPendingAttachment
                      ? `Add caption for ${adminPendingAttachment.name}...`
                      : `Reply to ${selectedConv.userName}...`
                  }
                  disabled={isSending || isAttaching}
                  className="grow bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={(!replyText.trim() && !adminPendingAttachment) || isSending || isAttaching}
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

      {/* ==================================================================== */}
      {/* FULLSCREEN IMAGE LIGHTBOX MODAL                                      */}
      {/* ==================================================================== */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[3000] bg-black/92 backdrop-blur-md flex flex-col animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div 
            className="p-3.5 bg-black/60 border-b border-white/10 flex items-center justify-between z-10 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 truncate text-white text-xs sm:text-sm font-semibold max-w-[65%]">
              <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">{lightboxImage.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadFileAttachment(lightboxImage.url, lightboxImage.name)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-md"
                title="Download photo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>डाउनलोड (Download)</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
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
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
