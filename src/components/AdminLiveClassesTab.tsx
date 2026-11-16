import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Bell,
  Send,
  RefreshCw,
  Edit3,
  Trash2,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
  Lock,
  Radio,
  Link2,
} from 'lucide-react';
import {
  Course,
  LiveClassHealthStatus,
  LiveClassItem,
  LiveClassJoinResponse,
  LiveClassProvider,
  LiveClassRegistration,
} from '../types';
import {
  cancelLiveClass,
  createLiveClass,
  deleteLiveClass,
  fetchLiveClassHealth,
  fetchLiveClassParticipants,
  fetchLiveClasses,
  joinLiveClass,
  notifyLiveClass,
  publishLiveClass,
  retryZoomMeeting,
  triggerRemindersCron,
  updateLiveClass,
} from '../utils/liveClassApi';
import {
  getMeetAccessToken,
  initGoogleMeetAuth,
  signInWithGoogleForMeet,
} from '../utils/googleMeetOAuth';
import { LiveClassroomModal } from './LiveClassroomModal';

const GoogleSignInButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
}> = ({ onClick, disabled, label = 'Sign in with Google', compact = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-zinc-100 active:bg-zinc-200 text-zinc-900 font-bold border border-zinc-300 shadow-sm transition cursor-pointer disabled:opacity-60 ${
      compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2.5 text-xs'
    }`}
  >
    <svg className={compact ? 'w-3.5 h-3.5 shrink-0' : 'w-4 h-4 shrink-0'} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
    <span>{label}</span>
  </button>
);

interface AdminLiveClassesTabProps {
  courses: Course[];
  allActivationKeys: any[];
  isMainAdmin: boolean;
  assignedCourseId?: string;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

function toDatetimeLocalValue(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeDisplay(epochMs: number): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(epochMs));
  } catch {
    return new Date(epochMs).toLocaleString();
  }
}

export const AdminLiveClassesTab: React.FC<AdminLiveClassesTabProps> = ({
  courses,
  allActivationKeys,
  isMainAdmin,
  assignedCourseId,
  showToast,
}) => {
  const availableCourses = useMemo(
    () => (isMainAdmin ? courses : courses.filter((c) => c.id === assignedCourseId)),
    [courses, isMainAdmin, assignedCourseId]
  );

  const [health, setHealth] = useState<LiveClassHealthStatus | null>(null);
  const [classes, setClasses] = useState<LiveClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'published' | 'draft' | 'completed' | 'cancelled'>('all');

  // Create / Edit drawer state
  const [showForm, setShowForm] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClassItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formCourseId, setFormCourseId] = useState(assignedCourseId || availableCourses[0]?.id || '');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formInstructor, setFormInstructor] = useState('AI Clipzone Mentor');
  const [formDateTime, setFormDateTime] = useState(() => toDatetimeLocalValue(Date.now() + 2 * 60 * 60 * 1000));
  const [formDuration, setFormDuration] = useState(40);
  const [formCapacity, setFormCapacity] = useState(80);
  const [formJoinWindow, setFormJoinWindow] = useState(15);
  const [formReminder30m, setFormReminder30m] = useState(true);
  const [formReminder5m, setFormReminder5m] = useState(true);
  const [formPublishImmediately, setFormPublishImmediately] = useState(true);
  const [formIdempotencyKey, setFormIdempotencyKey] = useState('');
  const [formProvider, setFormProvider] = useState<LiveClassProvider>('builtin');
  const [formManualUrl, setFormManualUrl] = useState('');
  const [formManualMeetingId, setFormManualMeetingId] = useState('');
  const [formManualPasscode, setFormManualPasscode] = useState('');

  // Active Zero-Login In-App Classroom Modal
  const [activeLiveRoom, setActiveLiveRoom] = useState<LiveClassJoinResponse | null>(null);

  // Google Meet OAuth session state (optional provider only)
  const [meetConnected, setMeetConnected] = useState(() => Boolean(getMeetAccessToken()));
  const [meetUserEmail, setMeetUserEmail] = useState<string>('');
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [meetReauthRequired, setMeetReauthRequired] = useState(false);

  // Row action loading states
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [syncErrorBanner, setSyncErrorBanner] = useState<{ code?: string; message: string } | null>(null);

  // Participants modal
  const [participantsModalClass, setParticipantsModalClass] = useState<LiveClassItem | null>(null);
  const [participants, setParticipants] = useState<LiveClassRegistration[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

  // Typed CONFIRM modal for Cancel / Delete
  const [confirmModal, setConfirmModal] = useState<{
    action: 'cancel' | 'delete';
    cls: LiveClassItem;
  } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, classesRes] = await Promise.all([
        fetchLiveClassHealth().catch(() => null),
        fetchLiveClasses(),
      ]);
      if (healthRes) setHealth(healthRes);
      setClasses(classesRes.classes || []);
    } catch (err: any) {
      showToast(err?.message || 'Could not load live classes', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = initGoogleMeetAuth(
      (user) => {
        setMeetConnected(true);
        setMeetUserEmail(user.email || user.displayName || 'Google Account');
        setMeetReauthRequired(false);
      },
      () => {
        setMeetConnected(false);
        setMeetUserEmail('');
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!formCourseId && availableCourses.length > 0) {
      const firstLiveCourse = availableCourses.find((c) => Boolean(c.hasLiveSessions));
      setFormCourseId(assignedCourseId || firstLiveCourse?.id || availableCourses[0].id);
    }
  }, [availableCourses, assignedCourseId, formCourseId]);

  const handleConnectGoogleMeet = async (): Promise<boolean> => {
    setIsConnectingGoogle(true);
    try {
      const { user } = await signInWithGoogleForMeet();
      setMeetConnected(true);
      setMeetUserEmail(user.email || user.displayName || 'Google Account');
      setMeetReauthRequired(false);
      showToast('Google Meet connected! You can now auto-create live Meet links.', 'success');
      return true;
    } catch (err: any) {
      const msg = err?.message || 'Google Meet sign-in was cancelled or failed.';
      showToast(msg, 'error');
      return false;
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const openCreateForm = () => {
    const firstLiveCourse = availableCourses.find((c) => Boolean(c.hasLiveSessions));
    setEditingClass(null);
    setFormCourseId(assignedCourseId || firstLiveCourse?.id || availableCourses[0]?.id || '');
    setFormTitle('');
    setFormDescription('');
    setFormInstructor('AI Clipzone Mentor');
    setFormDateTime(toDatetimeLocalValue(Date.now() + 2 * 60 * 60 * 1000));
    setFormDuration(40);
    setFormCapacity(80);
    setFormJoinWindow(15);
    setFormReminder30m(true);
    setFormReminder5m(true);
    setFormPublishImmediately(true);
    setFormProvider('builtin');
    setFormManualUrl('');
    setFormManualMeetingId('');
    setFormManualPasscode('');
    setFormIdempotencyKey(`lc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setSyncErrorBanner(null);
    setShowForm(true);
  };

  const openEditForm = (cls: LiveClassItem) => {
    setEditingClass(cls);
    setFormCourseId(cls.courseId);
    setFormTitle(cls.title);
    setFormDescription(cls.description || '');
    setFormInstructor(cls.instructorName || 'AI Clipzone Mentor');
    setFormDateTime(toDatetimeLocalValue(cls.scheduledStartAt));
    setFormDuration(cls.durationMinutes || 40);
    setFormCapacity(cls.maxCapacity || 80);
    setFormJoinWindow(cls.joinWindowMinutesBefore ?? 15);
    setFormReminder30m(cls.sendReminder30m !== false);
    setFormReminder5m(cls.sendReminder5m !== false);
    setFormProvider(cls.provider === 'manual' ? 'manual' : cls.provider === 'google_meet' ? 'google_meet' : 'builtin');
    setShowForm(true);
  };

  const submitClassForm = async (overridePublishImmediately?: boolean) => {
    const selectedCourse = availableCourses.find((c) => c.id === formCourseId);
    if (!selectedCourse) {
      showToast('Please select an existing course.', 'error');
      return;
    }
    if (!formTitle.trim()) {
      showToast('Please enter a live class title.', 'error');
      return;
    }

    const scheduledMs = new Date(formDateTime).getTime();
    if (!Number.isFinite(scheduledMs)) {
      showToast('Please pick a valid date and time.', 'error');
      return;
    }

    if (!editingClass && formProvider === 'manual' && !/^https?:\/\/\S+/i.test(formManualUrl.trim())) {
      showToast('Please enter a valid meeting link starting with https:// or http://.', 'error');
      return;
    }

    const publishNow =
      typeof overridePublishImmediately === 'boolean' ? overridePublishImmediately : formPublishImmediately;

    // Ensure Google Meet OAuth token exists before calling backend when Google Meet is selected
    if (!editingClass && formProvider === 'google_meet' && !getMeetAccessToken()) {
      const ok = await handleConnectGoogleMeet();
      if (!ok) {
        setMeetReauthRequired(true);
        return;
      }
    }

    setIsSubmitting(true);
    setSyncErrorBanner(null);
    try {
      if (editingClass) {
        await updateLiveClass(editingClass.id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          instructorName: formInstructor.trim() || 'AI Clipzone Mentor',
          scheduledStartAt: scheduledMs,
          durationMinutes: Number(formDuration) || 40,
          maxCapacity: Number(formCapacity) || 80,
          joinWindowMinutesBefore: Number(formJoinWindow) || 15,
          sendReminder30m: formReminder30m,
          sendReminder5m: formReminder5m,
        });
        showToast('Live class updated successfully.', 'success');
      } else {
        const res = await createLiveClass({
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          title: formTitle.trim(),
          description: formDescription.trim(),
          instructorName: formInstructor.trim() || 'AI Clipzone Mentor',
          provider: formProvider,
          manualMeetingUrl: formProvider === 'manual' ? formManualUrl.trim() : undefined,
          manualMeetingId: formProvider === 'manual' ? formManualMeetingId.trim() : undefined,
          manualPasscode: formProvider === 'manual' ? formManualPasscode.trim() : undefined,
          scheduledStartAt: scheduledMs,
          durationMinutes: Number(formDuration) || 40,
          maxCapacity: Number(formCapacity) || 80,
          joinWindowMinutesBefore: Number(formJoinWindow) || 15,
          sendReminder30m: formReminder30m,
          sendReminder5m: formReminder5m,
          publishImmediately: publishNow,
          idempotencyKey: formIdempotencyKey,
        });

        const syncIssue = res.zoomWarning || res.zoomError;
        if (syncIssue) {
          setSyncErrorBanner({ message: syncIssue });
          showToast(`Class saved as Draft, sync pending: ${syncIssue}`, 'info');
        } else {
          const providerLabel =
            formProvider === 'builtin'
              ? 'Zero-Login Live Room'
              : formProvider === 'google_meet'
              ? 'Google Meet'
              : 'Live Link';
          showToast(
            publishNow
              ? `Live class (${providerLabel}) created & published to enrolled students!`
              : `Draft live class (${providerLabel}) created.`,
            'success'
          );
        }
      }
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Failed to save live class';
      const code = err?.code;
      if (code === 'GOOGLE_MEET_REAUTH') {
        setMeetConnected(false);
        setMeetReauthRequired(true);
      } else {
        setSyncErrorBanner({ code, message: msg });
      }
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitClassForm();
  };

  const handleStartBuiltinRoom = async (cls: LiveClassItem) => {
    setBusyId(cls.id);
    try {
      const res = await joinLiveClass(cls.id, formInstructor.trim() || cls.instructorName);
      setActiveLiveRoom(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to launch live classroom', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRetryZoom = async (cls: LiveClassItem, overrideProvider?: LiveClassProvider) => {
    const targetProvider: LiveClassProvider =
      overrideProvider || (cls.provider === 'manual' ? 'manual' : cls.provider === 'google_meet' ? 'google_meet' : 'builtin');
    if (targetProvider === 'google_meet' && !getMeetAccessToken()) {
      const ok = await handleConnectGoogleMeet();
      if (!ok) return;
    }

    setBusyId(cls.id);
    try {
      const res = await retryZoomMeeting(cls.id, { provider: targetProvider });
      if (res.zoomError) {
        setSyncErrorBanner({ message: res.zoomError });
        showToast(`Sync error: ${res.zoomError}`, 'error');
      } else {
        setSyncErrorBanner(null);
        showToast(
          targetProvider === 'builtin'
            ? 'Zero-Login Live Room enabled! No Google sign-in required.'
            : targetProvider === 'google_meet'
            ? 'Google Meet link generated and synced!'
            : 'Meeting synced successfully!',
          'success'
        );
      }
      await loadData();
    } catch (err: any) {
      const msg = err?.message || 'Meeting sync failed';
      if (err?.code === 'GOOGLE_MEET_REAUTH') {
        setMeetConnected(false);
        setMeetReauthRequired(true);
      } else {
        setSyncErrorBanner({ code: err?.code, message: msg });
      }
      showToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handlePublish = async (cls: LiveClassItem) => {
    setBusyId(cls.id);
    try {
      const res = await publishLiveClass(cls.id);
      const delivered = res.notificationResult?.deliveredCount || 0;
      showToast(
        `Class published! Enrolled students notified (${delivered} push delivered).`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish live class', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleNotify = async (cls: LiveClassItem, reminderType: 'manual' | '30m' | '5m') => {
    setBusyId(cls.id);
    try {
      const res = await notifyLiveClass(cls.id, { reminderType });
      if (res.notificationResult?.skippedDuplicate) {
        showToast(`${reminderType} reminder was already delivered earlier (duplicate prevented).`, 'info');
      } else {
        showToast(
          `Notification dispatched to ${cls.courseTitle} enrolled students!`,
          'success'
        );
      }
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send notification', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRunReminders = async () => {
    setBusyId('cron-check');
    try {
      const res = await triggerRemindersCron();
      showToast(`Checked ${res.checkedCount} scheduled classes for 30m/5m reminders.`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to run reminder check', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenParticipants = async (cls: LiveClassItem) => {
    setParticipantsModalClass(cls);
    setParticipants([]);
    setIsLoadingParticipants(true);
    try {
      const res = await fetchLiveClassParticipants(cls.id);
      setParticipants(res.participants || []);
    } catch (err: any) {
      showToast(err?.message || 'Could not load participants', 'error');
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleExecuteConfirmAction = async () => {
    if (!confirmModal || confirmInput.trim().toUpperCase() !== 'CONFIRM') return;
    setBusyId(confirmModal.cls.id);
    try {
      if (confirmModal.action === 'cancel') {
        await cancelLiveClass(confirmModal.cls.id, cancelReason.trim() || undefined);
        showToast('Live class cancelled & students notified.', 'success');
      } else {
        await deleteLiveClass(confirmModal.cls.id);
        showToast('Live class and meeting permanently deleted.', 'success');
      }
      setConfirmModal(null);
      setConfirmInput('');
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Action failed', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 1800);
    });
  };

  const filteredClasses = useMemo(() => {
    if (statusFilter === 'all') return classes;
    return classes.filter((c) => c.status === statusFilter);
  }, [classes, statusFilter]);

  const enrolledCountForCourse = (courseId: string) => {
    return allActivationKeys.filter(
      (k) =>
        k.status === 'used' &&
        (k.courseId === courseId || k.courseId === 'all' || k.courseId === 'course-all')
    ).length;
  };

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Header + Backend Health Readiness */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-blue-400" />
              Live Class Management (Zero-Login Live Room)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Built-in In-App Live Classroom for Mentor & Enrolled Students — zero Google sign-up or external app login needed • 80-seat capacity & automated reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunReminders}
              disabled={busyId === 'cron-check'}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Clock className={`w-3.5 h-3.5 text-purple-400 ${busyId === 'cron-check' ? 'animate-spin' : ''}`} />
              <span>Run Reminders</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Live Class</span>
            </button>
          </div>
        </div>

        {/* Readiness Pills */}
        {health && (
          <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="px-2.5 py-1 rounded-lg border bg-emerald-950/50 border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                Live Room: Zero-Login In-App Classroom Ready (No Google Sign-In Required)
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  health.firebaseAdminConfigured
                    ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Firebase Admin: {health.firebaseAdminConfigured ? 'Connected' : 'REST Mode (Check Service Account)'}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                  health.fcmConfigured
                    ? 'bg-purple-950/50 border-purple-500/30 text-purple-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                FCM Server Push: {health.fcmConfigured ? 'Ready' : 'Pending Admin SDK'}
              </span>
            </div>
            {!health.firebaseAdminConfigured && health.initError && (
              <div className="bg-amber-950/35 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-[11px] text-amber-200 flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Backend Notice:</span> {health.initError} Update{' '}
                  <code className="px-1 py-0.5 rounded bg-black/40 text-amber-300">FIREBASE_SERVICE_ACCOUNT_JSON</code>{' '}
                  in Secrets for full Student Seat Registration, Secret-Code Admin writes, and FCM Push delivery.
                </div>
              </div>
            )}
            {syncErrorBanner && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl px-3.5 py-3 text-[11px] text-rose-200 flex items-start justify-between gap-3 leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="font-bold text-rose-100">{syncErrorBanner.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSyncErrorBanner(null)}
                  className="text-rose-300 hover:text-white p-1 rounded cursor-pointer shrink-0"
                  aria-label="Dismiss notice"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Live Class Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleFormSubmit}
            className="bg-zinc-950 border border-blue-500/30 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                {editingClass ? `Edit Live Class: ${editingClass.title}` : 'Create New Live Class'}
              </h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingClass && (
              <div className="space-y-3 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Live Classroom Mode
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">
                    Recommended: In-App Room requires zero Google sign-in
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'builtin',
                        title: 'AI Clipzone Live Room',
                        sub: 'Zero Google login for Mentor & Students',
                      },
                      {
                        id: 'manual',
                        title: 'Manual Link',
                        sub: 'Paste any Meet / Zoom / Live URL',
                      },
                      {
                        id: 'google_meet',
                        title: 'Google Meet (Optional)',
                        sub: 'Requires Mentor Google Sign-In',
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setFormProvider(opt.id);
                        setSyncErrorBanner(null);
                      }}
                      className={`text-left px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                        formProvider === opt.id
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm'
                          : 'bg-zinc-950/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-black">{opt.title}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">{opt.sub}</div>
                    </button>
                  ))}
                </div>

                {formProvider === 'google_meet' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-800/80">
                    {meetConnected && !meetReauthRequired ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Connected as {meetUserEmail || 'Google Account'} — ready to create Meet link automatically.</span>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-200">
                        {meetReauthRequired
                          ? 'Your Google Meet permission expired. Please sign in again to continue.'
                          : 'Sign in once with your Google account to auto-generate Google Meet links.'}
                      </div>
                    )}
                    <GoogleSignInButton
                      compact
                      onClick={handleConnectGoogleMeet}
                      disabled={isConnectingGoogle}
                      label={
                        isConnectingGoogle
                          ? 'Connecting...'
                          : meetConnected && !meetReauthRequired
                          ? 'Switch Google Account'
                          : 'Sign in with Google'
                      }
                    />
                  </div>
                )}

                {formProvider === 'manual' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Live Meeting URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={formManualUrl}
                        onChange={(e) => setFormManualUrl(e.target.value)}
                        placeholder="https://meet.google.com/abc-defg-hij or https://zoom.us/j/..."
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Meeting ID / Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={formManualMeetingId}
                        onChange={(e) => setFormManualMeetingId(e.target.value)}
                        placeholder="abc-defg-hij"
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Passcode (Optional)
                      </label>
                      <input
                        type="text"
                        value={formManualPasscode}
                        onChange={(e) => setFormManualPasscode(e.target.value)}
                        placeholder="Leave blank if none"
                        className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Select Course *
                </label>
                <select
                  value={formCourseId}
                  disabled={Boolean(editingClass) || !isMainAdmin}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none disabled:opacity-60"
                >
                  {availableCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} {c.hasLiveSessions ? '🔴 (Live Included)' : '(Live Not Enabled)'}
                    </option>
                  ))}
                </select>
                {(() => {
                  const chosen = availableCourses.find((c) => c.id === formCourseId);
                  if (chosen && !chosen.hasLiveSessions) {
                    return (
                      <p className="mt-1.5 text-[11px] text-amber-400 font-semibold">
                        Note: &ldquo;Live Session Included&rdquo; is OFF for this course. Enable it in Edit Course so activated students can see the Live button.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Instructor / Host Name
                </label>
                <input
                  type="text"
                  value={formInstructor}
                  onChange={(e) => setFormInstructor(e.target.value)}
                  placeholder="AI Clipzone Mentor"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Class Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Live AI Video Prompting & Workflow Q&A"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Class Description & Agenda
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What enrolled students will learn in this live workshop..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Date & Start Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formDateTime}
                  onChange={(e) => setFormDateTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Duration (m)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Max Seats
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Join Early (m)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={formJoinWindow}
                    onChange={(e) => setFormJoinWindow(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-zinc-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formReminder30m}
                  onChange={(e) => setFormReminder30m(e.target.checked)}
                  className="rounded accent-blue-600 w-4 h-4"
                />
                <span>30-min push reminder</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formReminder5m}
                  onChange={(e) => setFormReminder5m(e.target.checked)}
                  className="rounded accent-blue-600 w-4 h-4"
                />
                <span>5-min push reminder</span>
              </label>
              {!editingClass && (
                <label className="flex items-center gap-2 cursor-pointer text-emerald-300">
                  <input
                    type="checkbox"
                    checked={formPublishImmediately}
                    onChange={(e) => setFormPublishImmediately(e.target.checked)}
                    className="rounded accent-emerald-600 w-4 h-4"
                  />
                  <span>Publish immediately & notify enrolled students</span>
                </label>
              )}
            </div>

            {syncErrorBanner && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-200 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{syncErrorBanner.message}</p>
                </div>
                {!editingClass && formPublishImmediately && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-rose-500/20">
                    <span className="text-[11px] text-rose-300">
                      Want to keep your class schedule as a draft and add the meeting link later?
                    </span>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => submitClassForm(false)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      Save as Draft (Add Link Later)
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                  disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                <span>
                  {editingClass
                    ? 'Save Changes'
                    : formProvider === 'builtin'
                    ? 'Create Live Class (No Login Room)'
                    : formProvider === 'google_meet'
                    ? 'Create Live Class + Google Meet'
                    : 'Save Live Class + Link'}
                </span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(['all', 'live', 'published', 'draft', 'completed', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize whitespace-nowrap cursor-pointer transition ${
              statusFilter === tab
                ? 'bg-blue-600 text-white shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            {tab === 'published' ? 'Upcoming' : tab} (
            {tab === 'all' ? classes.length : classes.filter((c) => c.status === tab).length})
          </button>
        ))}
      </div>

      {/* Live Classes List */}
      {isLoading ? (
        <div className="py-14 text-center text-zinc-400 text-sm flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span>Loading Live Classes...</span>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <Video className="w-10 h-10 text-zinc-600 mx-auto" />
          <p className="text-sm font-bold text-zinc-300">No live classes found in this view.</p>
          <p className="text-xs text-zinc-500">
            Click &ldquo;Create Live Class&rdquo; to launch a Zero-Login In-App Live Room or paste any custom link.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClasses.map((cls) => {
            const seatsUsed = cls.registeredCount || 0;
            const maxSeats = cls.maxCapacity || 80;
            const seatPct = Math.min(100, Math.round((seatsUsed / maxSeats) * 100));
            const enrolledTotal = enrolledCountForCourse(cls.courseId);
            const isBusy = busyId === cls.id;
            const clsProvider: LiveClassProvider = cls.provider || 'zoom';

            return (
              <div
                key={cls.id}
                className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 space-y-4 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          cls.status === 'live'
                            ? 'bg-rose-600 text-white animate-pulse'
                            : cls.status === 'published'
                            ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                            : cls.status === 'draft'
                            ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            : cls.status === 'cancelled'
                            ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {cls.status === 'live' && <Radio className="w-3 h-3" />}
                        {cls.status === 'published' ? 'UPCOMING' : cls.status}
                      </span>

                      <span className="text-[11px] font-bold text-purple-300 bg-purple-950/40 border border-purple-500/25 px-2.5 py-0.5 rounded-lg">
                        {cls.courseTitle}
                      </span>

                      {cls.zoomCreated ? (
                        <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/25 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {clsProvider === 'builtin'
                            ? 'Zero-Login Live Room Ready'
                            : clsProvider === 'google_meet'
                            ? 'Google Meet Ready'
                            : clsProvider === 'manual'
                            ? 'Manual Link Ready'
                            : 'Zoom Synced'}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Meeting Sync Pending
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-white">{cls.title}</h4>
                    {cls.description && (
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">{cls.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {formatDateTimeDisplay(cls.scheduledStartAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        {cls.durationMinutes} min
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        Seats: {seatsUsed} / {maxSeats} ({seatPct}%) • Course Enrolled: {enrolledTotal}
                      </span>
                    </div>
                  </div>

                  {/* Admin Meeting Credentials Box */}
                  {cls.zoomCreated && (
                    <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 text-xs space-y-2 shrink-0 min-w-[260px]">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        <span className="flex items-center gap-1">
                          {clsProvider === 'builtin' ? (
                            <Radio className="w-3 h-3 text-emerald-400" />
                          ) : clsProvider === 'manual' ? (
                            <Link2 className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-blue-400" />
                          )}
                          {clsProvider === 'builtin'
                            ? 'In-App Classroom'
                            : clsProvider === 'google_meet'
                            ? 'Google Meet Details'
                            : clsProvider === 'manual'
                            ? 'Live Link Details'
                            : 'Admin Zoom Credentials'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-zinc-400">
                          {clsProvider === 'builtin'
                            ? 'Room Code:'
                            : clsProvider === 'google_meet'
                            ? 'Meet Code:'
                            : 'Meeting ID:'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`id-${cls.id}`, cls.zoomMeetingId || '')}
                          className="font-mono font-bold text-zinc-100 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                        >
                          {cls.zoomMeetingId || cls.zoomMeetingIdMasked}
                          {copiedText === `id-${cls.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {clsProvider === 'builtin' && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-400">Student Link:</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `link-${cls.id}`,
                                `${window.location.origin}/?tab=live&classId=${cls.id}`
                              )
                            }
                            className="font-bold text-blue-300 hover:text-blue-200 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedText === `link-${cls.id}` ? 'Copied!' : 'Copy Direct Link'}
                            {copiedText === `link-${cls.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                      {cls.zoomPasscode && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-zinc-400">Passcode:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`pw-${cls.id}`, cls.zoomPasscode || '')}
                            className="font-mono font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                          >
                            {cls.zoomPasscode}
                            {copiedText === `pw-${cls.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                      {clsProvider === 'builtin' ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleStartBuiltinRoom(cls)}
                          className="mt-1 w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-black text-[11px] flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-60"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>{isBusy ? 'Opening Room...' : 'Start / Join Live Room'}</span>
                        </button>
                      ) : cls.zoomStartUrl ? (
                        <a
                          href={cls.zoomStartUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 w-full py-1.5 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {clsProvider === 'google_meet'
                            ? 'Open Google Meet'
                            : clsProvider === 'manual'
                            ? 'Open Meeting Link'
                            : 'Start Meeting as Host'}
                        </a>
                      ) : null}
                    </div>
                  )}
                </div>

                {!cls.zoomCreated && cls.zoomError && (
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span>Sync Issue: {cls.zoomError}</span>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRetryZoom(cls, 'builtin')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Radio className="w-3 h-3" />
                        Switch to Zero-Login Room
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRetryZoom(cls, 'google_meet')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        <Video className="w-3 h-3" />
                        Generate Google Meet
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800/80">
                  {cls.status === 'draft' && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handlePublish(cls)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      Publish & Notify Students
                    </button>
                  )}

                  {cls.status !== 'cancelled' && cls.status !== 'draft' && (
                    <>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleNotify(cls, 'manual')}
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Notify Enrolled
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleNotify(cls, '30m')}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] font-bold cursor-pointer"
                        title="Send 30-minute reminder (deduplicated)"
                      >
                        {cls.reminder30mSent ? '✓ 30m Sent' : '30m Reminder'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleNotify(cls, '5m')}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] font-bold cursor-pointer"
                        title="Send 5-minute reminder (deduplicated)"
                      >
                        {cls.reminder5mSent ? '✓ 5m Sent' : '5m Reminder'}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenParticipants(cls)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Participants ({seatsUsed})
                  </button>

                  {cls.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => openEditForm(cls)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-300" />
                      Edit
                    </button>
                  )}

                  {cls.status !== 'cancelled' && cls.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmInput('');
                        setCancelReason('');
                        setConfirmModal({ action: 'cancel', cls });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Class
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setConfirmInput('');
                      setCancelReason('');
                      setConfirmModal({ action: 'delete', cls });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registered Participants Modal */}
      <AnimatePresence>
        {participantsModalClass && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    Registered Participants ({participantsModalClass.registeredCount} / {participantsModalClass.maxCapacity})
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{participantsModalClass.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setParticipantsModalClass(null)}
                  className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {isLoadingParticipants ? (
                  <div className="py-10 text-center text-xs text-zinc-400">Loading verified participants...</div>
                ) : participants.length === 0 ? (
                  <div className="py-10 text-center text-xs text-zinc-500">
                    No students have reserved seats yet.
                  </div>
                ) : (
                  participants.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between gap-3 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{p.studentName || 'AI Clipzone Student'}</div>
                        <div className="text-[11px] text-zinc-400">
                          {p.studentEmail || p.userId} {p.activationCode ? `• Key: ${p.activationCode}` : ''}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          p.status === 'joined'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                            : 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Typed CONFIRM Dialog for Cancel / Delete Live Class */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-2.5 text-rose-400 font-black text-base">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  {confirmModal.action === 'cancel' ? 'Confirm Cancel Live Class' : 'Confirm Delete Live Class'}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {confirmModal.action === 'cancel'
                  ? `Cancelling "${confirmModal.cls.title}" will disable student join access and notify enrolled students.`
                  : `Deleting "${confirmModal.cls.title}" will permanently remove the scheduled meeting, link, and all seat reservations.`}
              </p>

              {confirmModal.action === 'cancel' && (
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Optional cancellation note for students..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-amber-500"
                />
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1.5">
                  Type <span className="text-rose-400 font-black">CONFIRM</span> to proceed:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="CONFIRM"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={confirmInput.trim().toUpperCase() !== 'CONFIRM' || busyId === confirmModal.cls.id}
                  onClick={handleExecuteConfirmAction}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-black cursor-pointer"
                >
                  {busyId === confirmModal.cls.id ? 'Processing...' : 'Confirm Action'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeLiveRoom && (
        <LiveClassroomModal
          session={activeLiveRoom}
          onClose={() => {
            setActiveLiveRoom(null);
            void loadData();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
