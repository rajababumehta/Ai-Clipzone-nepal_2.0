export interface GoogleMeetSpaceResult {
  spaceName: string;
  meetingUri: string;
  meetingCode: string;
}

export class GoogleMeetApiError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 502, code = 'GOOGLE_MEET_ERROR') {
    super(message);
    this.name = 'GoogleMeetApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export async function createGoogleMeetSpace(
  accessToken: string,
  fetchFn: typeof fetch = fetch
): Promise<GoogleMeetSpaceResult> {
  const token = String(accessToken || '').trim();
  if (!token) {
    throw new GoogleMeetApiError(
      'Google Meet जडान गर्न पहिले "Sign in with Google" थिचेर अनुमति दिनुहोस्।',
      401,
      'GOOGLE_MEET_REAUTH'
    );
  }

  const res = await fetchFn('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data?.meetingUri) {
    const rawMsg =
      data?.error?.message ||
      data?.message ||
      `Google Meet Space creation failed (${res.status})`;
    if (res.status === 401) {
      throw new GoogleMeetApiError(
        'Google Meet सेसनको समय सकिएको छ। कृपया पुनः "Sign in with Google" थिच्नुहोस्।',
        401,
        'GOOGLE_MEET_REAUTH'
      );
    }
    throw new GoogleMeetApiError(
      rawMsg,
      res.status >= 400 && res.status < 500 ? res.status : 502,
      'GOOGLE_MEET_CREATE_FAILED'
    );
  }

  const meetingUri = String(data.meetingUri);
  const meetingCode =
    String(data.meetingCode || '').trim() ||
    meetingUri.replace(/^https?:\/\/meet\.google\.com\//i, '').split('?')[0];

  return {
    spaceName: String(data.name || ''),
    meetingUri,
    meetingCode,
  };
}
