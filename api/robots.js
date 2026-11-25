import { generateRobotsTxt, resolvePublicOrigin } from '../server/seoCatalog.js';

export default function handler(req, res) {
  const origin = resolvePublicOrigin(req);
  const txt = generateRobotsTxt(origin);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.end(txt);
}
