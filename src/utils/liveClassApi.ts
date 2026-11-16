import { auth } from '../firebase';
import {
  LiveClassHealthStatus,
  LiveClassItem,
  LiveClassJoinResponse,
  LiveClassProvider,
  LiveClassRegistration,
} from '../types';
import { clearMeetAccessToken, getMeetAccessToken } from './googleMeetOAuth';

export interface CreateLiveClassPayload {
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  instructorName?: string;
  provider?: LiveClassProvider;
  manualMeetingUrl?: string;
  manualMeetingId?: string;
  manualPasscode?: string;
  scheduledStartAt: number;
  durationMinutes?: number;
  maxCapacity?: number;
  joinWindowMinutesBefore?: number;
  sendReminder30m?: boolean;
  sendReminder5m?: boolean;
  publishImmediately?: boolean;
  idempotencyKey?: string;
}

export interface UpdateLiveClassPayload {
  title?: string;
  description?: string;
  instructorName?: string;
  scheduledStartAt?: number;
  durationMinutes?: number;
  maxCapacity?: number;
  joinWindowMinutesBefore?: number;
  sendReminder30m?: boolean;
  sendReminder5m?: boolean;
}

async function buildRequestHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Ignore anonymous/offline token failures; fallback headers handle code-based sessions
  }

  const meetToken = getMeetAccessToken();
  if (meetToken) {
    headers['x-google-meet-token'] = `Bearer ${meetToken}`;
  }

  try {
    const adminSessionId = localStorage.getItem('clipzone_admin_session_id');
    if (adminSessionId) {
      headers['x-admin-session-id'] = adminSessionId;
    }

    let subAdminCode = localStorage.getItem('clipzone_subadmin_code') || '';
    if (!subAdminCode) {
      const subSessRaw = localStorage.getItem('clipzone_sub_admin_session');
      if (subSessRaw) {
        const subSess = JSON.parse(subSessRaw);
        if (subSess?.code) subAdminCode = String(subSess.code);
      }
    }
    if (subAdminCode) {
      headers['x-subadmin-code'] = subAdminCode;
    }

    const deviceId = localStorage.getItem('clipzone_device_id');
    if (deviceId) {
      headers['x-device-id'] = deviceId;
    }

    const studentUid = localStorage.getItem('clipzone_student_uid');
    if (studentUid) {
      headers['x-student-uid'] = studentUid;
    }

    const savedCodesRaw = localStorage.getItem('clipzone_active_codes');
    if (savedCodesRaw) {
      const parsed = JSON.parse(savedCodesRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleanCodes = parsed
          .map((c: unknown) => String(c || '').trim().toUpperCase())
          .filter(Boolean);
        if (cleanCodes.length > 0) {
          headers['x-activation-codes'] = cleanCodes.join(',');
        }
      }
    }
  } catch {
    // Ignore localStorage parse failures
  }

  return headers;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await buildRequestHeaders();
  const res = await fetch(`/api/live-classes${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `Request failed (${res.status})` };
  }

  if (!res.ok) {
    if (data.code === 'GOOGLE_MEET_REAUTH') {
      clearMeetAccessToken();
    }
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      code?: string;
      details?: string;
    };
    err.status = res.status;
    err.code = data.code;
    err.details = data.details;
    throw err;
  }

  return data as T;
}

export async function fetchLiveClassHealth(): Promise<LiveClassHealthStatus> {
  return apiRequest<LiveClassHealthStatus>('/health', { method: 'GET' });
}

export async function verifyZoomOAuth(): Promise<{ ok: boolean; message?: string; error?: string; code?: string }> {
  return apiRequest<{ ok: boolean; message?: string; error?: string; code?: string }>('/verify-zoom', {
    method: 'POST',
  });
}

export async function fetchLiveClasses(): Promise<{ classes: LiveClassItem[]; role: string }> {
  return apiRequest<{ classes: LiveClassItem[]; role: string }>('/', { method: 'GET' });
}

export async function createLiveClass(
  payload: CreateLiveClassPayload
): Promise<{ success: boolean; deduplicated?: boolean; liveClass: LiveClassItem; zoomError?: string | null; zoomWarning?: string }> {
  return apiRequest('/', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      publishNow: Boolean(payload.publishImmediately),
    }),
  });
}

export async function retryZoomMeeting(
  classId: string,
  options?: {
    provider?: LiveClassProvider;
    manualMeetingUrl?: string;
    manualMeetingId?: string;
    manualPasscode?: string;
  }
): Promise<{
  success: boolean;
  provider?: LiveClassProvider;
  liveClass?: LiveClassItem;
  zoomError?: string | null;
}> {
  return apiRequest(`/${encodeURIComponent(classId)}/retry-zoom`, {
    method: 'POST',
    body: JSON.stringify(options || {}),
  });
}

export async function updateLiveClass(
  classId: string,
  payload: UpdateLiveClassPayload
): Promise<{ success: boolean; liveClass: LiveClassItem }> {
  return apiRequest(`/${encodeURIComponent(classId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function publishLiveClass(
  classId: string
): Promise<{ success: boolean; liveClass: LiveClassItem; notificationResult?: any }> {
  return apiRequest(`/${encodeURIComponent(classId)}/publish`, {
    method: 'POST',
  });
}

export async function notifyLiveClass(
  classId: string,
  payload?: { reminderType?: 'published' | '30m' | '5m' | 'manual'; customTitle?: string; customBody?: string }
): Promise<{ success: boolean; notificationResult?: any }> {
  return apiRequest(`/${encodeURIComponent(classId)}/notify`, {
    method: 'POST',
    body: JSON.stringify(payload || { reminderType: 'manual' }),
  });
}

export async function cancelLiveClass(
  classId: string,
  reason?: string
): Promise<{ success: boolean; liveClass: LiveClassItem }> {
  return apiRequest(`/${encodeURIComponent(classId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function deleteLiveClass(classId: string): Promise<{ success: boolean; id: string }> {
  return apiRequest(`/${encodeURIComponent(classId)}`, {
    method: 'DELETE',
  });
}

export async function fetchLiveClassParticipants(classId: string): Promise<{
  liveClassId: string;
  registeredCount: number;
  maxCapacity: number;
  participants: LiveClassRegistration[];
}> {
  return apiRequest(`/${encodeURIComponent(classId)}/participants`, { method: 'GET' });
}

export async function registerForLiveClass(classId: string): Promise<{
  success: boolean;
  alreadyRegistered?: boolean;
  registeredCount: number;
  maxCapacity: number;
  registration: LiveClassRegistration;
}> {
  return apiRequest(`/${encodeURIComponent(classId)}/register`, {
    method: 'POST',
  });
}

export async function joinLiveClass(classId: string): Promise<LiveClassJoinResponse> {
  return apiRequest(`/${encodeURIComponent(classId)}/join`, {
    method: 'POST',
  });
}

export async function registerFcmTokenBackend(payload: {
  token: string;
  deviceId: string;
  platform?: string;
}): Promise<{ success: boolean; enrolledCourseIds: string[] }> {
  return apiRequest('/fcm-token', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function triggerRemindersCron(): Promise<{
  success: boolean;
  checkedCount: number;
  results: any[];
}> {
  return apiRequest('/cron/reminders', {
    method: 'POST',
  });
}
