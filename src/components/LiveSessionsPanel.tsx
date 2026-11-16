import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Course, LiveSession, SubAdminAccount } from '../types';

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
      try {
        setResolvingIds((prev) => ({ ...prev, [session.id]: true }));
        const secretSnap = await getDoc(doc(db, 'live_session_secrets', session.id));
        if (!secretSnap.exists()) {
          return null;
        }
        const zoomLink = String(secretSnap.data()?.zoomLink || '').trim();
        if (!zoomLink) return null;

        const resp = await fetch('/api/live-join-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zoomLink,
            studentName: (studentName || 'Student').trim() || 'Student',
            sessionTitle: session.title,
            courseTitle: session.courseTitle
          })
        });

        if (!resp.ok) return null;
        const data = await resp.json();
        if (data?.launchUrl) {
          setLaunchUrls((prev) => ({ ...prev, [session.id]: data.launchUrl }));
          return data.launchUrl;
        }
        return null;
      } catch {
        return null;
      } finally {
        setResolvingIds((prev) => ({ ...prev, [session.id]: false }));
      }
    },
    [studentName]
  );

  useEffect(() => {
    if (mode !== 'student') return;
    const activeOnes = studentCourseSessions.filter((s) => s.status !== 'ended');
    if (activeOnes.length === 0) return;

    let cancelled = false;
    activeOnes.forEach((s) => {
      if (!launchUrls[s.id]) {
        resolveOpaqueJoinUrl(s).then((url) => {
          if (!cancelled && url) {
            setLaunchUrls((prev) => ({ ...prev, [s.id]: url }));
          }
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, studentCourseSessions, resolveOpaqueJoinUrl, launchUrls]);

  // Refresh opaque tokens every 10 minutes while student stays on Live tab
  useEffect(() => {
    if (mode !== 'student') return;
    const interval = setInterval(() => {
      setLaunchUrls({});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleFallbackStudentJoin = async (session: LiveSession) => {
    const existing = launchUrls[session.id];
    if (existing) {
      window.location.assign(existing);
      return;
    }
    const url = await resolveOpaqueJoinUrl(session);
    if (url) {
      window.location.assign(url);
    } else {
      notify('Live session is being prepared by your instructor. Please try again in a moment.', 'error');
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
    setFormNotifyStudents(false);
    setFormZoomLink('');
    setShowCreateForm(true);

    try {
      const secretSnap = await getDoc(doc(db, 'live_session_secrets', session.id));
      if (secretSnap.exists()) {
        setFormZoomLink(String(secretSnap.data()?.zoomLink || ''));
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
    const cleanLink = formZoomLink.trim();
    if (!cleanTitle) {
      notify('कृपया Live Session को शीर्षक (Title) लेख्नुहोस्।', 'error');
      return;
    }
    if (!/^https?:\/\/.+/i.test(cleanLink)) {
      notify('कृपया मान्य Zoom Meeting Link (https://...) राख्नुहोस्।', 'error');
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
  // RENDER: STUDENT MODE
  // =========================
  if (mode === 'student') {
    const liveCount = studentCourseSessions.filter((s) => s.status === 'live').length;
    const upcomingCount = studentCourseSessions.filter((s) => s.status === 'scheduled').length;

    return (
      <div className="space-y-5 mt-6 text-left">
        {/* Info Header */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-white flex items-center gap-2">
                <span>Live Zoom Sessions</span>
                {liveCount > 0 && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {liveCount} Live Now
                  </span>
                )}
              </h5>
              <p className="text-xs text-zinc-400 mt-0.5">
                {upcomingCount > 0 || liveCount > 0
                  ? 'Click Join below to enter your live Zoom class directly.'
                  : 'Instructor ले Live Session सुरु गरेपछि यहाँ Join बटन देखिनेछ।'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 shrink-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Direct Secure Entry</span>
          </div>
        </div>

        {/* Sessions List */}
        {studentCourseSessions.length > 0 ? (
          <div className="space-y-3">
            {studentCourseSessions.map((session) => {
              const isLive = session.status === 'live';
              const isScheduled = session.status === 'scheduled';
              const isEnded = session.status === 'ended';
              const opaqueUrl = launchUrls[session.id];
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
                      <span className="text-[11px] text-zinc-400 font-semibold">
                        Host: {session.hostName || 'Instructor'}
                      </span>
                    </div>

                    <h6 className="text-sm sm:text-base font-black text-white leading-snug">
                      {session.title}
                    </h6>

                    {session.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {session.description}
                      </p>
                    )}

                    {(session.scheduledDate || session.scheduledTime || session.durationMinutes) && (
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-medium pt-0.5 flex-wrap">
                        {session.scheduledDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            {session.scheduledDate}
                          </span>
                        )}
                        {session.scheduledTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            {session.scheduledTime}
                          </span>
                        )}
                        {session.durationMinutes && (
                          <span>⏱️ {session.durationMinutes}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Join Action (NEVER exposes Zoom URL) */}
                  <div className="shrink-0 flex items-center justify-end">
                    {isEnded ? (
                      <span className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold">
                        Session Ended
                      </span>
                    ) : opaqueUrl ? (
                      <a
                        href={opaqueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onContextMenu={(e) => e.preventDefault()}
                        title="Join Live Session"
                        className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg cursor-pointer select-none active:scale-95 ${
                          isLive
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                        }`}
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Join</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={() => handleFallbackStudentJoin(session)}
                        className={`px-6 py-3 rounded-xl font-black text-xs sm:text-sm transition flex items-center gap-2 shadow-lg cursor-pointer select-none active:scale-95 disabled:opacity-60 ${
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
                        <span>{isResolving ? 'Preparing...' : 'Join'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-950/80 rounded-2xl border border-zinc-800 p-6 space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-blue-400 flex items-center justify-center mx-auto">
              <Video className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-zinc-200">
              कुनै Live Session तालिका बनाइएको छैन
            </h5>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              तपाईंको कोर्ष शिक्षकले Zoom मार्फत Live Class Create Meeting गर्नुभएपछि तपाईंलाई तुरुन्तै Notification आउनेछ र यहाँ Join बटन देखा पर्नेछ।
            </p>
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
            Zoom बाट Meeting बनाउनुहोस्, लिङ्क यहाँ पेस्ट गरी Create Meeting थिच्नुहोस् — विद्यार्थीलाई स्वतः Notification जानेछ र Join बाट सिधै Zoom मा जोडिनेछन्।
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
            कुनै पनि कोर्षमा Live Class सक्रिय गरिएको छैन
          </h5>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            पहिले Main Admin बाट कोर्ष Create/Edit गर्दा &quot;Include Live Session (Zoom)&quot; अन गर्नुहोस्।
          </p>
        </div>
      )}

      {/* Create / Edit Meeting Form */}
      {showCreateForm && liveEnabledCourses.length > 0 && (
        <div className="bg-zinc-950 border border-blue-500/40 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h5 className="text-base font-black text-white">
                {editingSession ? 'Update Live Meeting' : 'Create Live Session (Zoom)'}
              </h5>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Step 1: Zoom मा Meeting बनाउनुहोस् → Step 2: Link यहाँ राखेर Create Meeting गर्नुहोस्
              </p>
            </div>
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

          {/* Step 1: Launch Zoom */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                  Step 1 • Zoom Meeting Setup
                </span>
                <p className="text-xs text-zinc-300 font-medium mt-0.5">
                  Zoom खोलेर Meeting Create गर्नुहोस् र Invite Link कपी गर्नुहोस्:
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="https://zoom.us/meeting/schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Open Zoom Schedule</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://zoom.us/start/videomeeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-3.5 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Start Instant Zoom</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Step 2: Form */}
          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Course Selection (locked for Sub-Admin) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">
                  Target Course *
                </label>
                {isMainAdmin ? (
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
                ) : (
                  <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-emerald-300 truncate">
                    {liveEnabledCourses[0]?.title || subAdminSession?.courseTitle}
                  </div>
                )}
              </div>

              {/* Session Status */}
              <div>
                <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">
                  Session Status *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'live' | 'scheduled' | 'ended')}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-hidden"
                >
                  <option value="live">Live Now (अहिले सुरु)</option>
                  <option value="scheduled">Scheduled (तालिका अनुसार)</option>
                  <option value="ended">Ended (समाप्त)</option>
                </select>
              </div>
            </div>

            {/* Session Title */}
            <div>
              <label className="block text-[10px] font-black uppercase text-blue-400 mb-1.5">
                Session Title *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Live Class 1: AI Workflow Q&A Workshop"
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-semibold text-white outline-hidden placeholder-zinc-500"
              />
            </div>

            {/* Zoom Link (Protected) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-black uppercase text-blue-400">
                  Zoom Meeting Link *
                </label>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Hidden from students (Join button only)
                </span>
              </div>
              <input
                type="url"
                required
                value={formZoomLink}
                onChange={(e) => setFormZoomLink(e.target.value)}
                placeholder="https://us02web.zoom.us/j/1234567890?pwd=..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-hidden placeholder-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Date (Optional)
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
                  Time (Optional)
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
                Session Notes / Topic (Optional)
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Topics covered in this live class..."
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white outline-hidden placeholder-zinc-500"
              />
            </div>

            {/* Notify Course Students Checkbox */}
            <label className="flex items-center gap-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formNotifyStudents}
                onChange={(e) => setFormNotifyStudents(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-blue-600 focus:ring-blue-500 bg-black"
              />
              <div className="text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-400" />
                  Send notification to users who activated this course
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">
                  यो कोर्ष Activate गरेका विद्यार्थीहरूलाई मात्र Live Class सूचना पठाइनेछ (Zoom Link लुकाइनेछ)।
                </span>
              </div>
            </label>

            <div className="flex items-center gap-3 pt-2">
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
                className="px-5 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-xs transition cursor-pointer"
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
              अहिलेसम्म कुनै Live Session Create गरिएको छैन
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              माथिको &quot;Create Session&quot; बटनमा क्लिक गरी Zoom Meeting बनाएर यहाँ Create Meeting गर्नुहोस्।
            </p>
          </div>
        )
      )}
    </div>
  );
};
