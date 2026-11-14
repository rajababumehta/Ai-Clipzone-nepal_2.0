import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Radio,
  Calendar,
  Clock,
  Users,
  Bell,
  BellRing,
  CheckCircle2,
  Lock,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  X,
  ShieldCheck,
  AlertCircle,
  Ticket,
} from 'lucide-react';
import {
  Course,
  LiveClassItem,
  LiveClassJoinResponse,
  PushNotificationItem,
} from '../types';
import {
  fetchLiveClasses,
  joinLiveClass,
  registerForLiveClass,
} from '../utils/liveClassApi';
import { getNotificationPermission, isNotificationSupported } from '../utils/notifications';

interface StudentLiveClassesViewProps {
  courses: Course[];
  activeCourseIds: string[];
  isAdminSession?: boolean;
  notifications: PushNotificationItem[];
  focusedClassId?: string | null;
  onClearFocusedClass?: () => void;
  onRequestUnlockCourse: (course?: Course) => void;
  onRequestEnablePush: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function formatCountdown(targetMs: number, nowMs: number): string {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m`;
  return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
}

function formatClassDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

export const StudentLiveClassesView: React.FC<StudentLiveClassesViewProps> = ({
  courses,
  activeCourseIds,
  isAdminSession = false,
  notifications,
  focusedClassId,
  onClearFocusedClass,
  onRequestUnlockCourse,
  onRequestEnablePush,
  showToast,
}) => {
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [sectionTab, setSectionTab] = useState<'upcoming' | 'past' | 'history'>('upcoming');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [joinSessionModal, setJoinSessionModal] = useState<LiveClassJoinResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const notifPermission = isNotificationSupported() ? getNotificationPermission() : 'denied';

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchLiveClasses();
      setClasses(res.classes || []);
    } catch (err: any) {
      showToast(err?.message || 'Unable to load live classes right now', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses, activeCourseIds.join(',')]);

  // Real-time 1s ticker for live countdown timers and automatic join window updates
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to focused class if opened from a push notification
  useEffect(() => {
    if (!focusedClassId || isLoading) return;
    const el = document.getElementById(`live-class-card-${focusedClassId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [focusedClassId, isLoading, classes.length]);

  const isEnrolledInCourse = useCallback(
    (courseId: string) => {
      if (isAdminSession) return true;
      return (
        activeCourseIds.includes('all') ||
        activeCourseIds.includes('course-all') ||
        activeCourseIds.includes(courseId)
      );
    },
    [activeCourseIds, isAdminSession]
  );

  const eligibleLiveCourses = useMemo(() => {
    if (isAdminSession) return courses;
    return courses.filter((c) => isEnrolledInCourse(c.id) && Boolean(c.hasLiveSessions));
  }, [courses, isAdminSession, isEnrolledInCourse]);

  const visibleClasses = useMemo(() => {
    const filtered = classes.filter((c) => {
      if (c.status === 'draft') return false;
      if (isAdminSession) return true;
      const courseObj = courses.find((course) => course.id === c.courseId);
      const courseHasLive = courseObj ? Boolean(courseObj.hasLiveSessions) : false;
      return isEnrolledInCourse(c.courseId) && courseHasLive;
    });
    if (courseFilter === 'all') return filtered;
    return filtered.filter((c) => c.courseId === courseFilter);
  }, [classes, courseFilter, courses, isAdminSession, isEnrolledInCourse]);

  const liveNowClasses = useMemo(() => {
    return visibleClasses.filter((cls) => {
      if (cls.status === 'cancelled') return false;
      const joinBeforeMs = (cls.joinWindowMinutesBefore ?? 15) * 60_000;
      const endMs = cls.scheduledEndAt || cls.scheduledStartAt + (cls.durationMinutes || 40) * 60_000;
      return nowMs >= cls.scheduledStartAt - joinBeforeMs && nowMs <= endMs + 10 * 60_000;
    });
  }, [visibleClasses, nowMs]);

  const upcomingClasses = useMemo(() => {
    return visibleClasses
      .filter((cls) => {
        if (cls.status === 'cancelled') return false;
        const joinBeforeMs = (cls.joinWindowMinutesBefore ?? 15) * 60_000;
        return nowMs < cls.scheduledStartAt - joinBeforeMs;
      })
      .sort((a, b) => a.scheduledStartAt - b.scheduledStartAt);
  }, [visibleClasses, nowMs]);

  const pastClasses = useMemo(() => {
    return visibleClasses
      .filter((cls) => {
        if (cls.status === 'cancelled' || cls.status === 'completed') return true;
        const endMs = cls.scheduledEndAt || cls.scheduledStartAt + (cls.durationMinutes || 40) * 60_000;
        return nowMs > endMs + 10 * 60_000;
      })
      .sort((a, b) => b.scheduledStartAt - a.scheduledStartAt);
  }, [visibleClasses, nowMs]);

  const liveNotifications = useMemo(() => {
    return notifications.filter(
      (n) =>
        (n.type === 'live_class' || n.type === 'live_reminder') &&
        (isAdminSession || !n.courseId || isEnrolledInCourse(n.courseId))
    );
  }, [notifications, isAdminSession, isEnrolledInCourse]);

  const handleReserveSeat = async (cls: LiveClassItem) => {
    if (!isEnrolledInCourse(cls.courseId)) {
      const targetCourse = courses.find((c) => c.id === cls.courseId);
      onRequestUnlockCourse(targetCourse);
      return;
    }
    setBusyId(cls.id);
    try {
      const res = await registerForLiveClass(cls.id);
      showToast(
        res.alreadyRegistered
          ? 'Your seat is already reserved for this live session!'
          : `Seat reserved! (${res.registeredCount}/${res.maxCapacity} seats filled)`,
        'success'
      );
      await loadClasses();
    } catch (err: any) {
      showToast(err?.message || 'Unable to reserve seat', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleJoinClass = async (cls: LiveClassItem) => {
    if (!isEnrolledInCourse(cls.courseId)) {
      const targetCourse = courses.find((c) => c.id === cls.courseId);
      onRequestUnlockCourse(targetCourse);
      return;
    }
    setBusyId(cls.id);
    try {
      const res = await joinLiveClass(cls.id);
      setJoinSessionModal(res);
      await loadClasses();
    } catch (err: any) {
      showToast(err?.message || 'Cannot join Zoom meeting right now', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = (field: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    });
  };

  const renderClassCard = (cls: LiveClassItem, isLiveCard = false) => {
    const enrolled = isEnrolledInCourse(cls.courseId);
    const maxCap = cls.maxCapacity || 80;
    const regCount = cls.registeredCount || 0;
    const seatsLeft = Math.max(0, maxCap - regCount);
    const seatPercent = Math.min(100, Math.round((regCount / maxCap) * 100));
    const isFull = seatsLeft <= 0 && !cls.isRegistered;
    const isFocused = focusedClassId === cls.id;
    const joinOpensAt = cls.scheduledStartAt - (cls.joinWindowMinutesBefore ?? 15) * 60_000;
    const endMs = cls.scheduledEndAt || cls.scheduledStartAt + (cls.durationMinutes || 40) * 60_000;
    const inJoinWindow = nowMs >= joinOpensAt && nowMs <= endMs + 10 * 60_000 && cls.status !== 'cancelled';

    return (
      <motion.div
        id={`live-class-card-${cls.id}`}
        key={cls.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-all ${
          isFocused
            ? 'bg-zinc-900/95 border-blue-500 ring-2 ring-blue-500/40 shadow-2xl shadow-blue-900/30'
            : isLiveCard
            ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-blue-950/30 border-blue-500/40 shadow-xl shadow-blue-950/20'
            : 'bg-zinc-950/90 border-zinc-800/90 hover:border-zinc-700'
        }`}
      >
        {isFocused && onClearFocusedClass && (
          <button
            type="button"
            onClick={onClearFocusedClass}
            className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-blue-600/20 text-blue-300 text-[10px] font-bold cursor-pointer"
          >
            Opened from Alert ✕
          </button>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2.5 flex-1">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {isLiveCard ? (
                <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse shadow-sm shadow-rose-600/40">
                  <Radio className="w-3 h-3" />
                  Live Now • Join Open
                </span>
              ) : cls.status === 'cancelled' ? (
                <span className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase">
                  Cancelled
                </span>
              ) : nowMs > endMs + 10 * 60_000 ? (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase">
                  Completed
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase">
                  Upcoming Live
                </span>
              )}

              <span className="px-2.5 py-1 rounded-lg bg-purple-600/15 border border-purple-500/25 text-purple-300 text-[11px] font-bold">
                {cls.courseTitle}
              </span>

              {enrolled ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Enrolled Access Verified
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Course Purchase Required
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-black text-white leading-snug">{cls.title}</h3>
            {cls.description && (
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-2xl">{cls.description}</p>
            )}

            {/* Schedule & Capacity metadata */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-zinc-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                {formatClassDate(cls.scheduledStartAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                {cls.durationMinutes || 40} min • Mentor: {cls.instructorName || 'AI Clipzone'}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                {seatsLeft > 0 ? `${seatsLeft} / ${maxCap} seats available` : `Full (${regCount}/${maxCap})`}
              </span>
            </div>

            {/* Seat Capacity Progress Bar */}
            {cls.status !== 'cancelled' && (
              <div className="max-w-md pt-1 space-y-1">
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      seatPercent >= 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}
                    style={{ width: `${seatPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Countdown & Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end justify-between gap-3 shrink-0 md:min-w-[215px]">
            {cls.status !== 'cancelled' && nowMs < cls.scheduledStartAt && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl px-4 py-2.5 text-center md:text-right w-full sm:w-auto">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Starts In</div>
                <div className="text-base font-black font-mono text-blue-400 tabular-nums">
                  {formatCountdown(cls.scheduledStartAt, nowMs)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap sm:flex-nowrap md:flex-col gap-2 w-full">
              {!enrolled ? (
                <button
                  type="button"
                  onClick={() => onRequestUnlockCourse(courses.find((c) => c.id === cls.courseId))}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Unlock Course to Join
                </button>
              ) : cls.status === 'cancelled' || nowMs > endMs + 10 * 60_000 ? null : inJoinWindow ? (
                <button
                  type="button"
                  disabled={busyId === cls.id || (isFull && !cls.isRegistered)}
                  onClick={() => handleJoinClass(cls)}
                  className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition cursor-pointer"
                >
                  {busyId === cls.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                  <span>{isFull && !cls.isRegistered ? 'Class Full (80/80)' : 'Join Zoom Now'}</span>
                </button>
              ) : cls.isRegistered ? (
                <div className="w-full px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Seat Reserved (Join opens {cls.joinWindowMinutesBefore ?? 15}m early)
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busyId === cls.id || isFull}
                  onClick={() => handleReserveSeat(cls)}
                  className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  {busyId === cls.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Ticket className="w-4 h-4" />
                  )}
                  <span>{isFull ? 'Seats Full (80/80)' : 'Reserve Seat'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <section id="student-live-classes-view" className="space-y-6 pb-20 pt-2">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-zinc-900 via-[#0A0A0A] to-blue-950/30 border border-zinc-800 rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span>AI Clipzone Interactive Workshops</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Video className="w-7 h-7 text-blue-400 shrink-0" />
              <span>Zoom Live Classes</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
              Exclusive live Zoom sessions for enrolled AI Clipzone students. Reserve your seat early (max 80 learners per session) and join straight from your PWA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRequestEnablePush}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition cursor-pointer ${
                notifPermission === 'granted'
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                  : 'bg-purple-600 hover:bg-purple-500 border-purple-400/30 text-white shadow-lg shadow-purple-900/30'
              }`}
            >
              {notifPermission === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              <span>{notifPermission === 'granted' ? 'Live Alerts On' : 'Enable Push Alerts'}</span>
            </button>

            <button
              type="button"
              onClick={loadClasses}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Navigation Sub-tabs + Course Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSectionTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                sectionTab === 'upcoming'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Live & Upcoming ({liveNowClasses.length + upcomingClasses.length})
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('past')}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                sectionTab === 'past'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              Completed & Cancelled ({pastClasses.length})
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                sectionTab === 'history'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Alerts ({liveNotifications.length})
            </button>
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 outline-none focus:border-blue-500"
          >
            <option value="all">{isAdminSession ? 'All Courses' : 'My Live Courses'}</option>
            {eligibleLiveCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Body */}
      {isLoading ? (
        <div className="py-16 text-center text-zinc-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
          <span>Syncing Live Class Schedule...</span>
        </div>
      ) : sectionTab === 'upcoming' ? (
        <div className="space-y-6">
          {/* LIVE NOW SECTION */}
          {liveNowClasses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2 px-1">
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Happening Live Right Now ({liveNowClasses.length})</span>
              </h2>
              <div className="space-y-4">
                {liveNowClasses.map((cls) => renderClassCard(cls, true))}
              </div>
            </div>
          )}

          {/* UPCOMING CLASSES */}
          <div className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-blue-400 flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4" />
              <span>Upcoming Scheduled Classes ({upcomingClasses.length})</span>
            </h2>
            {upcomingClasses.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 text-center space-y-2">
                <Video className="w-10 h-10 text-zinc-700 mx-auto" />
                <p className="text-sm font-bold text-zinc-300">No upcoming live sessions scheduled right now.</p>
                <p className="text-xs text-zinc-500">
                  Enable push alerts above to get notified immediately when your course mentor schedules a live Zoom class.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingClasses.map((cls) => renderClassCard(cls, false))}
              </div>
            )}
          </div>
        </div>
      ) : sectionTab === 'past' ? (
        <div className="space-y-4">
          {pastClasses.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 text-center text-xs text-zinc-500">
              No completed or cancelled live classes yet.
            </div>
          ) : (
            pastClasses.map((cls) => renderClassCard(cls, false))
          )}
        </div>
      ) : (
        /* NOTIFICATION HISTORY FOR ENROLLED COURSES */
        <div className="space-y-3">
          {liveNotifications.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 text-center space-y-2">
              <Bell className="w-9 h-9 text-zinc-700 mx-auto" />
              <p className="text-sm font-bold text-zinc-300">No live class notifications yet.</p>
              <p className="text-xs text-zinc-500">
                Alerts for live classes in your enrolled courses will appear here cleanly without duplicates.
              </p>
            </div>
          ) : (
            liveNotifications.map((n) => (
              <div
                key={n.id}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase">
                      {n.badge || 'LIVE CLASS'}
                    </span>
                    {n.courseTitle && (
                      <span className="text-[11px] font-bold text-zinc-400">{n.courseTitle}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-black text-white">{n.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{n.body}</p>
                  <div className="text-[10px] text-zinc-500">{formatClassDate(n.createdAt)}</div>
                </div>
                {n.liveClassId && (
                  <button
                    type="button"
                    onClick={() => setSectionTab('upcoming')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    View Class
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SECURE ZOOM JOIN MODAL (NO window.open OR LEAKED SECRETS) */}
      <AnimatePresence>
        {joinSessionModal && (
          <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              className="bg-zinc-950 border border-blue-500/40 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enrollment Verified • Ready to Join
                  </span>
                  <h3 className="text-lg font-black text-white pt-1">{joinSessionModal.title}</h3>
                  <p className="text-xs text-zinc-400">{joinSessionModal.courseTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinSessionModal(null)}
                  className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold">Zoom Meeting ID</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('mid', joinSessionModal.meetingId)}
                    className="font-mono font-black text-white hover:text-blue-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    {joinSessionModal.meetingId}
                    {copiedField === 'mid' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-semibold">Passcode</span>
                  <button
                    type="button"
                    onClick={() => handleCopy('pw', joinSessionModal.passcode)}
                    className="font-mono font-black text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {joinSessionModal.passcode}
                    {copiedField === 'pw' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800">
                  <span>Seated Learners</span>
                  <span className="font-bold text-zinc-200">
                    {joinSessionModal.registeredCount} / {joinSessionModal.maxCapacity}
                  </span>
                </div>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Waiting Room is enabled for security. Use your registered student name when entering Zoom.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <a
                  href={joinSessionModal.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-900/30 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Zoom Meeting</span>
                </a>
                <button
                  type="button"
                  onClick={() => setJoinSessionModal(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
