import {
  buildSitemapXmlFromCatalog,
  CORE_INSTRUCTORS,
  generateSitemapXml,
  resolvePublicOrigin,
  SEED_COURSES,
} from '../server/seoCatalog.js';

export default async function handler(req, res) {
  const origin = resolvePublicOrigin(req);
  try {
    const xml = await generateSitemapXml(origin);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.end(xml);
  } catch {
    const fallbackXml = buildSitemapXmlFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(fallbackXml);
  }
}
