import type { Express, Request, Response } from 'express';
import {
  generateLlmsDocument as sharedGenerateLlmsDocument,
  generateRobotsTxt as sharedGenerateRobotsTxt,
  generateSitemapXml as sharedGenerateSitemapXml,
  injectRouteSeoMeta as sharedInjectRouteSeoMeta,
  resolvePublicOrigin as sharedResolvePublicOrigin,
} from './seoCatalog.js';

export function resolvePublicOrigin(req?: Request): string {
  return sharedResolvePublicOrigin(req as any);
}

export async function generateSitemapXml(origin: string): Promise<string> {
  return sharedGenerateSitemapXml(origin);
}

export function generateRobotsTxt(origin: string): string {
  return sharedGenerateRobotsTxt(origin);
}

export async function injectRouteSeoMeta(
  html: string,
  pathname: string,
  origin: string
): Promise<{ html: string; statusCode: number }> {
  return sharedInjectRouteSeoMeta(html, pathname, origin);
}

export function mountSeoRoutes(app: Express): void {
  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      const origin = resolvePublicOrigin(req);
      const xml = await generateSitemapXml(origin);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
      res.status(200).send(xml);
    } catch {
      const fallbackOrigin = resolvePublicOrigin(req);
      const xml = await generateSitemapXml(fallbackOrigin);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.status(200).send(xml);
    }
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = resolvePublicOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(generateRobotsTxt(origin));
  });

  app.get(['/llms.txt', '/llms-full.txt'], async (req: Request, res: Response) => {
    const origin = resolvePublicOrigin(req);
    const isFull = req.path.includes('llms-full.txt');
    const txt = await sharedGenerateLlmsDocument(origin, isFull);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(txt);
  });
}
