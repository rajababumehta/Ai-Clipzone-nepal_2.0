import { injectRouteSeoMeta, resolvePublicOrigin } from '../server/seoCatalog.js';
import { INDEX_HTML } from './_htmlTemplate.js';

function extractRequestedPathname(req) {
  const rawUrl = String(req?.url || '/');
  try {
    const parsed = new URL(rawUrl, 'https://hamrolms.vercel.app');
    const routeParam = parsed.searchParams.get('__route');
    if (routeParam && routeParam.trim()) {
      return routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
    }
    if (parsed.pathname && !parsed.pathname.startsWith('/api/page')) {
      return parsed.pathname;
    }
  } catch {
    // fallback below
  }
  return '/';
}

export default async function handler(req, res) {
  const origin = resolvePublicOrigin(req);
  const pathname = extractRequestedPathname(req);

  try {
    const { html, statusCode } = await injectRouteSeoMeta(INDEX_HTML, pathname, origin);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.end(html);
  } catch {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(INDEX_HTML);
  }
}
