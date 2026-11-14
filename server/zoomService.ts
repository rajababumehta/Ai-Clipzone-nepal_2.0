import crypto from 'crypto';

export interface ZoomCreateMeetingInput {
  topic: string;
  agenda?: string;
  startTimeMs: number;
  durationMinutes?: number;
  timezone?: string;
  password?: string;
}

export interface ZoomMeetingResult {
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password: string;
  hostEmail?: string;
  startTimeIso: string;
  durationMinutes: number;
}

export class ZoomApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 502, code?: string) {
    super(message);
    this.name = 'ZoomApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedZoomToken: CachedToken | null = null;

export function isZoomConfigured(): boolean {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID?.trim() &&
    process.env.ZOOM_CLIENT_ID?.trim() &&
    process.env.ZOOM_CLIENT_SECRET?.trim()
  );
}

export function generateZoomPasscode(): string {
  // 8-char clean alphanumeric passcode compatible with Zoom meeting password rules
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

async function getZoomAccessToken(fetchFn: typeof fetch = fetch): Promise<string> {
  if (!isZoomConfigured()) {
    throw new ZoomApiError(
      'Zoom Server-to-Server OAuth credentials are not configured on the backend (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET).',
      503,
      'ZOOM_NOT_CONFIGURED'
    );
  }

  const now = Date.now();
  if (cachedZoomToken && cachedZoomToken.expiresAt - 60_000 > now) {
    return cachedZoomToken.accessToken;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID!.trim();
  const clientId = process.env.ZOOM_CLIENT_ID!.trim();
  const clientSecret = process.env.ZOOM_CLIENT_SECRET!.trim();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`;

  const res = await fetchFn(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) {
    const errMsg = data?.reason || data?.error_description || data?.message || `Zoom OAuth failed (${res.status})`;
    throw new ZoomApiError(errMsg, res.status >= 400 && res.status < 500 ? 401 : 502, 'ZOOM_OAUTH_ERROR');
  }

  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  cachedZoomToken = {
    accessToken: data.access_token,
    expiresAt: now + expiresInSec * 1000,
  };

  return cachedZoomToken.accessToken;
}

export async function createZoomMeeting(
  input: ZoomCreateMeetingInput,
  fetchFn: typeof fetch = fetch
): Promise<ZoomMeetingResult> {
  const token = await getZoomAccessToken(fetchFn);
  const hostUserId = process.env.ZOOM_HOST_USER_ID?.trim() || 'me';
  const durationMinutes = Math.min(Math.max(Math.round(input.durationMinutes || 40), 10), 300);
  const startTimeIso = new Date(input.startTimeMs).toISOString();
  const password = (input.password || generateZoomPasscode()).slice(0, 10);

  const payload = {
    topic: input.topic.slice(0, 200),
    type: 2, // Scheduled meeting
    start_time: startTimeIso,
    duration: durationMinutes,
    timezone: input.timezone || 'Asia/Kathmandu',
    password,
    agenda: (input.agenda || '').slice(0, 2000),
    settings: {
      host_video: true,
      participant_video: false,
      cn_meeting: false,
      in_meeting: false,
      join_before_host: false,
      mute_upon_entry: true,
      watermark: false,
      use_pmi: false,
      approval_type: 0, // Automatically approve
      audio: 'both',
      auto_recording: 'none',
      waiting_room: true,
      meeting_authentication: false,
      enforce_login: false,
      registrants_email_notification: false,
    },
  };

  const res = await fetchFn(
    `https://api.zoom.us/v2/users/${encodeURIComponent(hostUserId)}/meetings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id || !data?.join_url) {
    const msg =
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.map((e: any) => e.message).join(', ') : '') ||
      `Zoom Create Meeting failed (${res.status})`;
    throw new ZoomApiError(msg, res.status === 429 ? 429 : 502, 'ZOOM_CREATE_FAILED');
  }

  return {
    meetingId: String(data.id),
    joinUrl: String(data.join_url),
    startUrl: String(data.start_url || data.join_url),
    password: String(data.password || password),
    hostEmail: data.host_email ? String(data.host_email) : undefined,
    startTimeIso: String(data.start_time || startTimeIso),
    durationMinutes: Number(data.duration || durationMinutes),
  };
}

export async function updateZoomMeeting(
  meetingId: string,
  input: Partial<ZoomCreateMeetingInput>,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  if (!meetingId || !isZoomConfigured()) return;
  const token = await getZoomAccessToken(fetchFn);

  const body: Record<string, any> = {};
  if (input.topic) body.topic = input.topic.slice(0, 200);
  if (input.agenda !== undefined) body.agenda = input.agenda.slice(0, 2000);
  if (input.startTimeMs) {
    body.start_time = new Date(input.startTimeMs).toISOString();
    body.timezone = input.timezone || 'Asia/Kathmandu';
  }
  if (input.durationMinutes) {
    body.duration = Math.min(Math.max(Math.round(input.durationMinutes), 10), 300);
  }

  const res = await fetchFn(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok && res.status !== 404) {
    const data: any = await res.json().catch(() => ({}));
    throw new ZoomApiError(data?.message || `Zoom update failed (${res.status})`, 502, 'ZOOM_UPDATE_FAILED');
  }
}

export async function deleteZoomMeeting(
  meetingId: string,
  fetchFn: typeof fetch = fetch
): Promise<void> {
  if (!meetingId || !isZoomConfigured()) return;
  const token = await getZoomAccessToken(fetchFn);

  const res = await fetchFn(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // 204 = deleted, 404 = already missing on Zoom side
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const data: any = await res.json().catch(() => ({}));
    throw new ZoomApiError(data?.message || `Zoom delete failed (${res.status})`, 502, 'ZOOM_DELETE_FAILED');
  }
}

export function resetZoomTokenCacheForTests(): void {
  cachedZoomToken = null;
}
