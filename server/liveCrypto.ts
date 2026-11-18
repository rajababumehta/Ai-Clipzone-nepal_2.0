import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const LIVE_TOKEN_KEY = crypto
  .createHash('sha256')
  .update(
    process.env.LIVE_TOKEN_SECRET ||
      process.env.GEMINI_API_KEY ||
      'aiclipzone-nepal-live-zoom-key-2026'
  )
  .digest();

const ENC_PREFIX = 'enc_v1:';

export function encryptLivePayload(payload: object): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', LIVE_TOKEN_KEY, iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptLivePayload(token: string): any | null {
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', LIVE_TOKEN_KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

export function isEncryptedZoomUrl(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

export function sanitizeHttpUrl(rawUrl: string): string | null {
  try {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed || trimmed.length > 2048) return null;
    const match = trimmed.match(/https?:\/\/\S+/i);
    const candidate = match ? match[0] : trimmed;
    if (!/^https?:\/\//i.test(candidate)) return null;
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    // Block SSRF / internal network hostnames
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function encryptZoomUrl(rawUrl: string): string | null {
  const cleanUrl = sanitizeHttpUrl(rawUrl);
  if (!cleanUrl) return null;
  return ENC_PREFIX + encryptLivePayload({ u: cleanUrl, v: 1 });
}

export function decryptZoomUrl(storedOrPlainUrl: string): string | null {
  const val = String(storedOrPlainUrl || '').trim();
  if (!val) return null;
  if (val.startsWith(ENC_PREFIX)) {
    const payload = decryptLivePayload(val.slice(ENC_PREFIX.length));
    if (payload && typeof payload.u === 'string') {
      return sanitizeHttpUrl(payload.u);
    }
    return null;
  }
  return sanitizeHttpUrl(val);
}

export function buildZoomUrls(rawUrl: string, studentName: string): { webUrl: string; embedUrl: string } | null {
  try {
    const cleanUrl = sanitizeHttpUrl(rawUrl);
    if (!cleanUrl) return null;
    const parsed = new URL(cleanUrl);

    const cleanName = String(studentName || 'Student').trim().slice(0, 60) || 'Student';
    const base64Name = Buffer.from(cleanName, 'utf8').toString('base64');
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

export function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self)');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  next();
}
