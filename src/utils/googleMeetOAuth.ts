import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

export const GOOGLE_MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
] as const;

const meetProvider = new GoogleAuthProvider();
GOOGLE_MEET_SCOPES.forEach((scope) => {
  meetProvider.addScope(scope);
});
meetProvider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory cache ONLY (never persisted to localStorage or sessionStorage)
let cachedMeetAccessToken: string | null = null;
let isSigningInForMeet = false;

export const initGoogleMeetAuth = (
  onConnected?: (user: User, token: string) => void,
  onDisconnected?: () => void
) => {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedMeetAccessToken) {
      onConnected?.(user, cachedMeetAccessToken);
    } else if (!isSigningInForMeet) {
      if (!user) {
        cachedMeetAccessToken = null;
      }
      if (!cachedMeetAccessToken) {
        onDisconnected?.();
      }
    }
  });
};

export async function signInWithGoogleForMeet(): Promise<{
  user: User;
  accessToken: string;
}> {
  try {
    isSigningInForMeet = true;
    const result = await signInWithPopup(auth, meetProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Could not obtain Google Meet permission token. Please sign in with Google again.'
      );
    }
    cachedMeetAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedMeetAccessToken,
    };
  } finally {
    isSigningInForMeet = false;
  }
}

export function getMeetAccessToken(): string | null {
  return cachedMeetAccessToken;
}

export function clearMeetAccessToken(): void {
  cachedMeetAccessToken = null;
}
