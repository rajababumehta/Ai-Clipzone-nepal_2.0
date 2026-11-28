import {
  buildLlmsTxtFromCatalog,
  CORE_INSTRUCTORS,
  generateLlmsDocument,
  resolvePublicOrigin,
  SEED_COURSES,
} from '../server/seoCatalog.js';

export default async function handler(req, res) {
  const origin = resolvePublicOrigin(req);
  const rawUrl = String(req?.url || '');
  const isFull =
    rawUrl.includes('llms-full.txt') ||
    rawUrl.includes('full=1') ||
    rawUrl.includes('full=true');

  try {
    const content = await generateLlmsDocument(origin, isFull);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.end(content);
  } catch {
    const fallback = buildLlmsTxtFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS, isFull);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(fallback);
  }
}
