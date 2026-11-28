import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Video,
  Plus,
  ExternalLink,
  Calendar,
  Clock,
  Users,
  Trash2,
  Edit3,
  Radio,
  CheckCircle2,
  Bell,
  Lock,
  Play,
  RefreshCw,
  X
} from 'lucide-react';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { auth, db, reportFirestoreNonFatal, OperationType } from '../firebase';
import { Course, LiveSession, SubAdminAccount } from '../types';

function toBase64Utf8(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin);
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function buildClientZoomUrls(rawUrl: string, studentName: string): { webUrl: string; embedUrl: string } | null {
  try {
    const trimmed = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) return null;
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;

    const cleanName = String(studentName || 'Student').trim().slice(0, 60) || 'Student';
    const base64Name = toBase64Utf8(cleanName);
    const idMatch =
      parsed.pathname.match(/\/(?:j|wc\/join|s)\/(\d{9,12})/i) ||
      parsed.pathname.match(/\/wc\/(\d{9,12})\/join/i);
    const meetingId = idMatch?.[1] || '';
    const pwd = parsed.searchParams.get('pwd') || '';
    const tk = parsed.searchParams.get('tk') || '';

    if (parsed.hostname.toLowerCase().includes('zoom.')) {
      parsed.searchParams.set('uname', cleanName);
    }

    const webUrl = parsed.toString();
    let embedUrl = webUrl;
    if (meetingId) {
      const wc = new URL(`https://app.zoom.us/wc/${meetingId}/join`);
      wc.searchParams.set('prefer', '1');
      wc.searchParams.set('un', base64Name);
      wc.searchParams.set('uname', cleanName);
      if (pwd) wc.searchParams.set('pwd', pwd);
      if (tk) wc.searchParams.set('tk', tk);
      embedUrl = wc.toString();
    }

    return { webUrl, embedUrl };
  } catch {
    return null;
  }
}

export interface SaveLiveSessionInput {
  id?: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: string;
  status: 'live' | 'scheduled' | 'ended';
  hostName: string;
  zoomLink: string;
  notifyStudents: boolean;
}

interface LiveSessionsPanelProps {
  mode: 'manager' | 'student';
  courses: Course[];
  sessions: LiveSession[];
  // Student props
  course?: Course;
  studentName?: string;
  // Manager props
  adminRole?: 'main_admin' | 'sub_admin';
  subAdminSession?: SubAdminAccount | null;
  onSaveSession?: (data: SaveLiveSessionInput) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
  onUpdateStatus?: (session: LiveSession, nextStatus: 'live' | 'scheduled' | 'ended') => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LiveSessionsPanel: React.FC<LiveSessionsPanelProps> = ({
  mode,
  courses,
  sessions,
  course,
  studentName = 'Student',
  adminRole = 'main_admin',
  subAdminSession = null,
  onSaveSession,
  onDeleteSession,
  onUpdateStatus,
  showToast
}) => {
  const notify = useCallback(
    (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (typeof showToast === 'function') {
        showToast(msg, type);
      }
    },
    [showToast]
  );

  // =========================
  // STUDENT MODE STATE & TOKEN RESOLUTION (ZERO ZOOM LINK EXPOSURE)
  // =========================
  const [launchUrls, setLaunchUrls] = useState<Record<string, string>>({});
  const [resolvingIds, setResolvingIds] = useState<Record<string, boolean>>({});
  const [activeClassroom, setActiveClassroom] = useState<{
    session: LiveSession;
    embedSrc: string;
    nonce: number;
  } | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const inFlightRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeClassroom) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [activeClassroom]);

  const studentCourseSessions = useMemo(() => {
    if (mode !== 'student' || !course) return [];
    const statusRank: Record<string, number> = { live: 0, scheduled: 1, ended: 2 };
    return sessions
      .filter((s) => s.courseId === course.id)
      .slice()
      .sort((a, b) => {
        const rankDiff = (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
        if (rankDiff !== 0) return rankDiff;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [mode, course, sessions]);

  const resolveOpaqueJoinUrl = useCallback(
    async (session: LiveSession): Promise<string | null> => {
      if (inFlightRef.current[session.id]) return null;
      inFlightRef.current[session.id] = true;
      try {
        setResolvingIds((prev) => ({ ...prev, [session.id]: true }));
        const secretRef = doc(db, 'live_session_secrets', session.id);
        let secretSnap = await getDoc(secretRef).catch(() => null);
        const secretData = secretSnap?.exists() ? secretSnap.data() : null;
        if (!secretSnap || !secretSnap.exists() || (!secretData?.encryptedZoomLink && !secretData?.zoomLink)) {
          secretSnap = await getDocFromServer(secretRef).catch(() => null);
        }
        if (!secretSnap || !secretSnap.exists()) {
          return null;
        }
        const data = secretSnap.data() || {};
        const encryptedZoomLink = typeof data.encryptedZoomLink === 'string' ? data.encryptedZoomLink.trim() : '';
        const rawZoom = String(data.zoomLink || '').trim();
        const urlMatch = rawZoom.match(/https?:\/\/\S+/i);
        const zoomLink = urlMatch ? urlMatch[0] : rawZoom;
        if (!encryptedZoomLink && !zoomLink) return null;

        const cleanStudentName = (studentName || 'Student').trim() || 'Student';
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
        let activeCodesHeader = '';
        let deviceIdHeader = '';
        let studentUidHeader = '';
        try {
          const codes = JSON.parse(localStorage.getItem('clipzone_active_codes') || '[]');
          if (Array.isArray(codes)) activeCodesHeader = codes.join(',');
          deviceIdHeader = localStorage.getItem('clipzone_device_id') || '';
          studentUidHeader = localStorage.getItem('clipzone_student_uid') || '';
        } catch {}

        // Primary: server-side AES-256-GCM decryption & short-lived opaque embed token
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
          if (activeCodesHeader) headers['x-activation-codes'] = activeCodesHeader;
          if (deviceIdHeader) headers['x-device-id'] = deviceIdHeader;
          if (studentUidHeader) headers['x-student-uid'] = studentUidHeader;

          const resp = await fetch('/api/live-join-token', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              sessionId: session.id,
              courseId: session.courseId,
              ...(encryptedZoomLink ? { encryptedZoomLink } : { zoomLink }),
              studentName: cleanStudentName,
              sessionTitle: session.title,
              courseTitle: session.courseTitle
            })
          });

          if (resp.ok) {
            const respData = await resp.json().catch(() => null);
            const resolved = respData?.embedUrl || respData?.launchUrl;
            if (resolved) {
              setLaunchUrls((prev) => ({ ...prev, [session.id]: resolved }));
              return resolved;
            }
          }
        } catch {
          // Fall through only for legacy unencrypted fallback when offline/serverless unreachable
        }

        if (zoomLink) {
          const clientUrls = buildClientZoomUrls(zoomLink, cleanStudentName);
          if (clientUrls?.embedUrl) {
            setLaunchUrls((prev) => ({ ...prev, [session.id]: clientUrls.embedUrl }));
            return clientUrls.embedUrl;
          }
        }

        return null;
      } catch (err) {
        reportFirestoreNonFatal(err, OperationType.GET, `live_session_secrets/${session.id}`);
        return null;
      } finally {
        delete inFlightRef.current[session.id];
        setResolvingIds((prev) => ({ ...prev, [session.id]: false }));
      }
    },
    [studentName]
  );

  useEffect(() => {
    if (mode !== 'student') return;
    const activeOnes = studentCourseSessions.filter((s) => s.status !== 'ended');
    if (activeOnes.length === 0) return;

    activeOnes.forEach((s) => {
      if (!launchUrls[s.id] && !inFlightRef.current[s.id]) {
        void resolveOpaqueJoinUrl(s);
      }
    });
  }, [mode, studentCourseSessions, resolveOpaqueJoinUrl, launchUrls]);

  // Refresh opaque tokens every 10 minutes while student stays on Live page
  useEffect(() => {
    if (mode !== 'student') return;
    const interval = setInterval(() => {
      setLaunchUrls({});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleJoinInsideWebsite = async (session: LiveSession) => {
    let embedSrc: string | undefined = launchUrls[session.id];
    if (!embedSrc) {
      const resolved = await resolveOpaqueJoinUrl(session);
      embedSrc = resolved || undefined;
    }
    if (embedSrc) {
      setIframeLoading(true);
      setActiveClassroom({ session, embedSrc, nonce: Date.now() });
    } else {
      notify('Live session link is not ready yet. Please contact your instructor.', 'error');
    }
  };

  // =========================
  // MANAGER MODE STATE (SUB-ADMIN / MAIN ADMIN)
  // =========================
  const isMainAdmin = adminRole === 'main_admin';
  const liveEnabledCourses = useMemo(() => {
    if (isMainAdmin) {
      return courses.filter((c) => c.includeLive === true);
    }
    if (subAdminSession?.courseId) {
      return courses.filter((c) => c.id === subAdminSession.courseId && c.includeLive === true);
    }
    return [];
  }, [courses, isMainAdmin, subAdminSession?.courseId]);

  const managerSessions = useMemo(() => {
    if (mode !== 'manager') return [];
    const scoped = isMainAdmin
      ? sessions
      : sessions.filter((s) => s.courseId === subAdminSession?.courseId);
    const statusRank: Record<string, number> = { live: 0, scheduled: 1, ended: 2 };
    return scoped.slice().sort((a, b) => {
      const rankDiff = (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
      if (rankDiff !== 0) return rankDiff;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [mode, sessions, isMainAdmin, subAdminSession?.courseId]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [formCourseId, setFormCourseId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formZoomLink, setFormZoomLink] = useState('');
  const [formStatus, setFormStatus] = useState<'live' | 'scheduled' | 'ended'>('live');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formScheduledTime, setFormScheduledTime] = useState('');
  const [formDuration, setFormDuration] = useState('60 mins');
  const [formDescription, setFormDescription] = useState('');
  const [formNotifyStudents, setFormNotifyStudents] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'manager' && !formCourseId && liveEnabledCourses.length > 0) {
      setFormCourseId(liveEnabledCourses[0].id);
    }
  }, [mode, formCourseId, liveEnabledCourses]);

  const resetForm = useCallback(() => {
    setEditingSession(null);
    setShowOptionalFields(false);
    setFormCourseId(liveEnabledCourses[0]?.id || subAdminSession?.courseId || '');
    setFormTitle('');
    setFormZoomLink('');
    setFormStatus('live');
    setFormScheduledDate('');
    setFormScheduledTime('');
    setFormDuration('60 mins');
    setFormDescription('');
    setFormNotifyStudents(true);
  }, [liveEnabledCourses, subAdminSession?.courseId]);

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const handleOpenEdit = async (session: LiveSession) => {
    setEditingSession(session);
    setFormCourseId(session.courseId);
    setFormTitle(session.title);
    setFormStatus(session.status);
    setFormScheduledDate(session.scheduledDate || '');
    setFormScheduledTime(session.scheduledTime || '');
    setFormDuration(session.durationMinutes || '60 mins');
    setFormDescription(session.description || '');
    setShowOptionalFields(
      Boolean(session.scheduledDate || session.scheduledTime || session.description || session.status === 'scheduled')
    );
    setFormNotifyStudents(false);
    setFormZoomLink('');
    setShowCreateForm(true);

    try {
      const secretSnap = await getDoc(doc(db, 'live_session_secrets', session.id));
      if (secretSnap.exists()) {
        const sData = secretSnap.data() || {};
        if (sData.encryptedZoomLink) {
          const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
          try {
            const adminSessId = localStorage.getItem('clipzone_admin_session_id') || '';
            const devId = localStorage.getItem('clipzone_device_id') || '';
            if (adminSessId) headers['x-admin-session-id'] = adminSessId;
            if (subAdminSession?.code) headers['x-subadmin-code'] = subAdminSession.code;
            if (devId) headers['x-device-id'] = devId;
          } catch {}
          const decResp = await fetch('/api/live-decrypt-admin', {
            method: 'POST',
            headers,
            body: JSON.stringify({ encryptedZoomLink: sData.encryptedZoomLink }),
          }).catch(() => null);
          if (decResp && decResp.ok) {
            const decJson = await decResp.json().catch(() => null);
            if (decJson?.zoomLink) {
              setFormZoomLink(String(decJson.zoomLink));
              return;
            }
          }
        }
        if (sData.zoomLink) {
          setFormZoomLink(String(sData.zoomLink));
        }
      }
    } catch {}
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveSession) return;

    const targetCourse = courses.find((c) => c.id === formCourseId) || liveEnabledCourses[0];
    if (!targetCourse) {
      notify('Live-enabled course not found.', 'error');
      return;
    }

    const cleanTitle = formTitle.trim();
    const rawLinkInput = formZoomLink.trim();
    const matchedUrl = rawLinkInput.match(/https?:\/\/\S+/i);
    const cleanLink = matchedUrl ? matchedUrl[0] : rawLinkInput;
    if (!cleanTitle) {
      notify('Please enter a Live Session title.', 'error');
      return;
    }
    if (!/^https?:\/\/.+/i.test(cleanLink)) {
      notify('Please enter a valid Zoom Meeting Link (https://...).', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await onSaveSession({
        id: editingSession?.id,
        courseId: targetCourse.id,
        courseTitle: targetCourse.title,
        title: cleanTitle,
        description: formDescription.trim() || undefined,
        scheduledDate: formScheduledDate.trim() || undefined,
        scheduledTime: formScheduledTime.trim() || undefined,
        durationMinutes: formDuration.trim() || undefined,
        status: formStatus,
        hostName: isMainAdmin
          ? 'Main Instructor'
          : subAdminSession?.name || 'Course Instructor',
        zoomLink: cleanLink,
        notifyStudents: formNotifyStudents
      });
      setShowCreateForm(false);
      resetForm();
    } catch (err: any) {
      notify(err?.message || 'Failed to save live meeting.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================
  // RENDER: STUDENT MODE (SIMPLE & DIRECT)
  // =========================
  if (mode === 'student') {
    const lockedStudentName = (studentName || 'Student').trim() || 'Student';

    return (
      <div className="space-y-4 text-left">
        {/* Sessions List */}
        {studentCourseSessions.length > 0 ? (
          <div className="space-y-3">
            {studentCourseSessions.map((session) => {
              const isLive = session.status === 'live';
              const isScheduled = session.status === 'scheduled';
              const isEnded = session.status === 'ended';
              const isResolving = Boolean(resolvingIds[session.id]);

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl p-4 sm:p-5 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isLive
                      ? 'bg-zinc-950 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                      : isScheduled
                      ? 'bg-zinc-950/90 border-zinc-800 hover:border-blue-500/40'
                      : 'bg-zinc-950/50 border-zinc-900 opacity-75'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLive && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Radio className="w-3 h-3 animate-pulse" />
                          Live Now
                        </span>
                      )}
                      {isScheduled && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <Calendar className="w-3 h-3" />
                          Scheduled
                        </span>
                      )}
                      {isEnded && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Ended
                        </span>
                      )}
                      {(session.scheduledDate || session.scheduledTime) && (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          {[session.scheduledDate, session.scheduledTime].filter(Boolean).join(' • ')}
                        </span>
                      )}
                    </div>

                    <h6 className="text-sm sm:text-base font-black text-white leading-snug">
                      {session.title}
                    </h6>

                    {session.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pt-0.5">
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Name:</span>
                      <span className="font-bold text-zinc-200 truncate">{lockedStudentName}</span>
                    </div>
                  </div>

                  {/* Single Simple Join Action (Embedded in website, locked name) */}
                  <div className="shrink-0 flex items-center justify-end">
                    {isEnded ? (
                      <span className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold">
                        Ended
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={() => handleJoinInsideWebsite(session)}
                        title="Join Live Session"
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer select-none active:scale-95 disabled:opacity-60 ${
                          isLive
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                        }`}
                      >
                        {isResolving ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                        <span>{isResolving ? 'Joining...' : 'Join Class'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-2">
            <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-blue-400 flex items-center justify-center mx-auto">
              <Video className="w-5 h-5" />
            </div>
            <h5 className="text-sm font-bold text-zinc-200">
              No Live Class right now
            </h5>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              When your instructor starts a Live Class, the Join Class button will appear here.
            </p>
          </div>
        )}

        {/* IN-WEBSITE EMBEDDED ZOOM CLASSROOM MODAL */}
        {activeClassroom && (
          <div
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Slim Classroom Top Bar */}
            <div className="h-12 px-3 sm:px-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
                <p className="text-xs sm:text-sm font-black text-white truncate">
                  {activeClassroom.session.title}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg max-w-[180px] truncate">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">{lockedStudentName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIframeLoading(true);
                    setActiveClassroom((prev) =>
                      prev ? { ...prev, nonce: Date.now() } : null
                    );
                  }}
                  title="Reload Live Classroom"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveClassroom(null)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-md shadow-rose-600/25 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>
              </div>
            </div>

            {/* Embedded Live Meeting Frame */}
            <div className="flex-1 relative w-full h-full bg-black overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 z-10 bg-zinc-950 flex flex-col items-center justify-center gap-2.5 p-6 text-center pointer-events-none">
                  <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
                  <p className="text-sm font-black text-white">
                    Opening Live Class...
                  </p>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Name: <strong className="text-white">{lockedStudentName}</strong>
                  </p>
                </div>
              )}

              <iframe
                key={`${activeClassroom.session.id}-${activeClassroom.nonce}`}
                src={activeClassroom.embedSrc}
                title={activeClassroom.session.title}
                onLoad={() => setIframeLoading(false)}
                allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *"
                allowFullScreen
                referrerPolicy="no-referrer"
                className="w-full h-full border-0 bg-black"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================
  // RENDER: MANAGER MODE (SUB-ADMIN / MAIN ADMIN)
  // =========================
  return (
    <div className="space-y-6 text-left">
      {/* Top Action Header */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <Video className="w-3 h-3" />
              Zoom Live Classroom
            </span>
            {!isMainAdmin && subAdminSession && (
              <span className="text-[11px] font-bold text-zinc-400">
                Course: <strong className="text-white">{subAdminSession.courseTitle}</strong>
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-black text-white">
            Live Sessions Management ({managerSessions.length})
          </h4>
          <p className="text-xs text-zinc-400">
            Create a Zoom meeting, paste the link here, and click Create Meeting — students will automatically be notified and can join directly from Join Class.
          </p>
        </div>

        {liveEnabledCourses.length > 0 && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Session</span>
          </button>
        )}
      </div>

      {/* Empty live-enabled course warning for Main Admin */}
      {liveEnabledCourses.length === 0 && (
        <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-6 text-center space-y-2">
          <Video className="w-8 h-8 text-amber-400 mx-auto" />
          <h5 className="text-sm font-black text-white">
            Live Class is not enabled on any course
          </h5>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            First turn on &quot;Include Live Session (Zoom)&quot; when creating or editing a course from Main Admin.
          </p>
        </div>
      )}

      {/* Simplified Create / Edit Meeting Form */}
      {showCreateForm && liveEnabledCourses.length > 0 && (
        <div className="bg-zinc-950 border border-blue-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h5 className="text-sm sm:text-base font-black text-white">
              {editingSession ? 'Update Live Meeting' : 'Create Live Session'}
            </h5>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                resetForm();
              }}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step 1: Compact Zoom Link Quick Actions */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-zinc-300 font-semibold">
                1. Start a Zoom meeting and copy the link:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="https://zoom.us/start/videomeeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                >
                  <Radio className="w-3 h-3" />
                  <span>Start Zoom</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://zoom.us/meeting/schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Schedule</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://zoom.us/profile/setting?tab=meeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition inline-flex items-center gap-1"
                  title="Turn off Waiting Room once in Zoom Settings so students enter directly without Admit"
                >
                  <span>Zoom Settings</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-snug">
              For Direct Join (without waiting for host approval), keep <strong>Waiting Room OFF</strong> in Zoom (inside the meeting: uncheck <em>Security → Enable Waiting Room</em>).
            </p>
          </div>

          {/* Step 2: Essential Fields Only */}
          <form onSubmit={handleSubmitForm} className="space-y-3.5">
            {/* Session Title */}
            <div>
              <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                Session Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Live Class 1: AI Workflow Q&A"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-hidden placeholder-zinc-500"
              />
            </div>

            {/* Zoom Link (Protected) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-black uppercase text-blue-400">
                  2. Paste Zoom Link *
                </label>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Hidden from students
                </span>
              </div>
              <input
                type="url"
                required
                value={formZoomLink}
                onChange={(e) => setFormZoomLink(e.target.value)}
                placeholder="https://us02web.zoom.us/j/1234567890?pwd=..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-hidden placeholder-zinc-500"
              />
            </div>

            <div className={`grid grid-cols-1 ${isMainAdmin ? 'sm:grid-cols-2' : ''} gap-3`}>
              {isMainAdmin && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                    Course *
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-hidden"
                  >
                    {liveEnabledCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-blue-400 mb-1">
                  Status *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => {
                    const val = e.target.value as 'live' | 'scheduled' | 'ended';
                    setFormStatus(val);
                    if (val === 'scheduled') setShowOptionalFields(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-hidden"
                >
                  <option value="live">Live Now</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
            </div>

            {/* Collapsible Optional Schedule & Notes */}
            <div>
              <button
                type="button"
                onClick={() => setShowOptionalFields((v) => !v)}
                className="text-[11px] font-bold text-zinc-400 hover:text-blue-400 transition cursor-pointer"
              >
                {showOptionalFields ? '− Hide Date / Time / Notes' : '+ Add Date, Time or Notes (Optional)'}
              </button>

              {showOptionalFields && (
                <div className="mt-2.5 space-y-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={formScheduledDate}
                        onChange={(e) => setFormScheduledDate(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={formScheduledTime}
                        onChange={(e) => setFormScheduledTime(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={formDuration}
                        onChange={(e) => setFormDuration(e.target.value)}
                        placeholder="60 mins"
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Topics covered in this live class..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-hidden placeholder-zinc-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notify Course Students Checkbox */}
            <label className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formNotifyStudents}
                onChange={(e) => setFormNotifyStudents(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-black"
              />
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                Send notification to course students
              </span>
            </label>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingSession ? 'Update Meeting' : 'Create Meeting'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sessions List for Manager */}
      {managerSessions.length > 0 ? (
        <div className="space-y-3">
          {managerSessions.map((session) => {
            const isLive = session.status === 'live';
            const isScheduled = session.status === 'scheduled';
            const isEnded = session.status === 'ended';

            return (
              <div
                key={session.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <Radio className="w-3 h-3 animate-pulse" />
                          Live Now
                        </span>
                      )}
                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <Calendar className="w-3 h-3" />
                          Scheduled
                        </span>
                      )}
                      {isEnded && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Ended
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-zinc-400 truncate">
                        {session.courseTitle}
                      </span>
                    </div>
                    <h5 className="text-sm sm:text-base font-black text-white truncate">
                      {session.title}
                    </h5>
                    {(session.scheduledDate || session.scheduledTime || session.durationMinutes) && (
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                        {session.scheduledDate && <span>📅 {session.scheduledDate}</span>}
                        {session.scheduledTime && <span>⏰ {session.scheduledTime}</span>}
                        {session.durationMinutes && <span>⏱️ {session.durationMinutes}</span>}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {onUpdateStatus && (
                      <>
                        {!isLive && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(session, 'live')}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            Set Live
                          </button>
                        )}
                        {!isEnded && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(session, 'ended')}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                          >
                            End
                          </button>
                        )}
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(session)}
                      className="bg-zinc-900 hover:bg-zinc-800 text-blue-300 border border-zinc-700 text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {onDeleteSession && (
                      confirmDeleteId === session.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === session.id}
                            onClick={async () => {
                              try {
                                setDeletingId(session.id);
                                await onDeleteSession(session.id);
                                setConfirmDeleteId(null);
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black px-2.5 py-1.5 rounded-xl cursor-pointer"
                          >
                            {deletingId === session.id ? '...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-zinc-800 text-zinc-300 text-[11px] font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(session.id)}
                          className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        liveEnabledCourses.length > 0 && !showCreateForm && (
          <div className="bg-zinc-950 border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
            <Users className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-bold text-zinc-300">
              No Live Sessions created yet
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              Click the &quot;Create Session&quot; button above, start a Zoom meeting, and save it here.
            </p>
          </div>
        )
      )}
    </div>
  );
};
