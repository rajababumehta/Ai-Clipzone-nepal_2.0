import type { Express, Request, Response } from 'express';
import { getAdminDb } from './firebaseAdmin.ts';
import { createRestFirestore } from './firestoreRest.ts';
import { COURSES, normalizeLegacyBrandText } from '../src/data.ts';
import { BLOG_POSTS, findBlogPostBySlug } from '../src/data/blogArticles.ts';
import { buildPublicInstructors, CORE_INSTRUCTORS } from '../src/data/instructors.ts';
import { getLocaleDict } from '../src/utils/i18n.ts';
import {
  buildLocalizedPath,
  findCourseBySlug,
  getCourseSlug,
  parsePathnameToRoute,
  slugifyText,
} from '../src/utils/seoRouting.ts';
import type { Course, SubAdminAccount, SupportedLocale } from '../src/types.ts';

const DEFAULT_PUBLIC_ORIGIN = 'https://hamrolms.vercel.app';
const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'ne', 'hi'];

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function resolvePublicOrigin(req?: Request): string {
  if (!req) return DEFAULT_PUBLIC_ORIGIN;
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  if (!host || host.includes('localhost') || host.includes('127.0.0.1') || host.includes('0.0.0.0')) {
    return DEFAULT_PUBLIC_ORIGIN;
  }
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  if (host.includes('aiclipzone.vercel.app')) {
    return DEFAULT_PUBLIC_ORIGIN;
  }
  return `${proto}://${host}`;
}

async function fetchPublicCatalogSnapshot(): Promise<{
  courses: Course[];
  instructors: ReturnType<typeof buildPublicInstructors>;
}> {
  let deletedIds: string[] = [];
  let courses: Course[] = [...COURSES];
  let sanitizedSubAdmins: SubAdminAccount[] = [];

  try {
    const db = getAdminDb() || createRestFirestore();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SEO_CATALOG_TIMEOUT')), 2500)
    );

    const [configSnap, coursesSnap, subAdminsSnap] = await Promise.race([
      Promise.all([
        db.collection('system').doc('config').get().catch(() => null),
        db.collection('courses').get().catch(() => null),
        db.collection('sub_admins').where('status', '==', 'active').get().catch(() => null),
      ]),
      timeoutPromise,
    ]);

    if (configSnap && configSnap.exists) {
      const cfg = configSnap.data() || {};
      if (Array.isArray(cfg.deletedCourseIds)) {
        deletedIds = cfg.deletedCourseIds.map(String);
      }
    }

    if (coursesSnap && !coursesSnap.empty) {
      const liveCourses: Course[] = [];
      coursesSnap.forEach((docSnap: any) => {
        const d = docSnap.data() || {};
        const cid = String(docSnap.id || d.id || '');
        if (!cid || deletedIds.includes(cid)) return;
        // Strip private videoUrl / pdfUrl fields in memory for public catalog processing
        const normalizedTitle = normalizeLegacyBrandText(String(d.title || 'Course')).replace(/\s+/g, ' ').trim();
        liveCourses.push({
          ...d,
          id: cid,
          title: normalizedTitle || 'Course',
          price: String(d.price || 'FREE'),
          learn: Array.isArray(d.learn) ? d.learn : [],
          image: String(d.image || '/institute-logo.png'),
          videos: Array.isArray(d.videos)
            ? d.videos.map((v: any) => ({
                title: String(v?.title || ''),
                duration: String(v?.duration || ''),
                chapterTitle: v?.chapterTitle ? String(v.chapterTitle) : undefined,
                videoUrl: '',
              }))
            : [],
          pdfs: [],
        });
      });
      if (liveCourses.length > 0) {
        courses = liveCourses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
    } else if (deletedIds.length > 0) {
      courses = courses.filter((c) => !deletedIds.includes(c.id));
    }

    if (subAdminsSnap && !subAdminsSnap.empty) {
      subAdminsSnap.forEach((docSnap: any) => {
        const d = docSnap.data() || {};
        if (d.status !== 'active' || !d.name) return;
        // Strictly omit private `code` and `activeDeviceId`
        sanitizedSubAdmins.push({
          id: String(docSnap.id || ''),
          code: '',
          name: String(d.name),
          courseId: String(d.courseId || ''),
          courseTitle: String(d.courseTitle || ''),
          avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
          status: 'active',
          createdAt: Number(d.createdAt || 0),
        });
      });
    }
  } catch {
    // Fallback gracefully to static seed catalog when offline or unconfigured
  }

  const instructors = buildPublicInstructors(courses, sanitizedSubAdmins);
  return { courses, instructors };
}

interface SitemapEntrySpec {
  cleanPath: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

export async function generateSitemapXml(origin: string): Promise<string> {
  const { courses, instructors } = await fetchPublicCatalogSnapshot();
  const today = new Date().toISOString().slice(0, 10);

  const specs: SitemapEntrySpec[] = [
    { cleanPath: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
    { cleanPath: '/instructors', lastmod: today, changefreq: 'weekly', priority: '0.85' },
    { cleanPath: '/blog', lastmod: today, changefreq: 'weekly', priority: '0.85' },
  ];

  const seenCourseSlugs = new Set<string>();
  for (const course of courses) {
    const slug = getCourseSlug(course);
    if (!slug || seenCourseSlugs.has(slug)) continue;
    seenCourseSlugs.add(slug);
    specs.push({
      cleanPath: `/courses/${slug}`,
      lastmod: course.updatedAt ? String(course.updatedAt).slice(0, 10) : today,
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

  const seenInstructorSlugs = new Set<string>();
  for (const inst of instructors) {
    if (!inst.slug || seenInstructorSlugs.has(inst.slug)) continue;
    seenInstructorSlugs.add(inst.slug);
    specs.push({
      cleanPath: `/instructors/${inst.slug}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.75',
    });
  }

  for (const post of BLOG_POSTS) {
    specs.push({
      cleanPath: `/blog/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt || today,
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  specs.push(
    { cleanPath: '/privacy-policy', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.4' },
    { cleanPath: '/terms', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.4' }
  );

  const urlNodes: string[] = [];
  for (const spec of specs) {
    const alternatesXml = [
      ...SUPPORTED_LOCALES.map((loc) => {
        const href = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
        return `    <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(href)}" />`;
      }),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(
        `${origin}${buildLocalizedPath(spec.cleanPath, 'en')}`
      )}" />`,
    ].join('\n');

    for (const loc of SUPPORTED_LOCALES) {
      const fullLoc = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
      urlNodes.push(
        `  <url>\n` +
          `    <loc>${escapeXml(fullLoc)}</loc>\n` +
          (spec.lastmod ? `    <lastmod>${escapeXml(spec.lastmod)}</lastmod>\n` : '') +
          `    <changefreq>${spec.changefreq}</changefreq>\n` +
          `    <priority>${loc === 'en' ? spec.priority : (Number(spec.priority) * 0.9).toFixed(2)}</priority>\n` +
          `${alternatesXml}\n` +
          `  </url>`
      );
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urlNodes.join('\n')}\n` +
    `</urlset>\n`
  );
}

export function generateRobotsTxt(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /classroom',
    'Disallow: /account',
    'Disallow: /enroll',
    'Disallow: /live',
    'Disallow: /ask',
    'Disallow: /delete-account',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export async function injectRouteSeoMeta(
  html: string,
  pathname: string,
  origin: string
): Promise<{ html: string; statusCode: number }> {
  const parsed = parsePathnameToRoute(pathname);
  const t = getLocaleDict(parsed.locale);
  const { courses, instructors } = await fetchPublicCatalogSnapshot();

  let statusCode = 200;
  let title = t.seoHomeTitle;
  let description = t.seoHomeDescription;
  let robots = parsed.isPublicIndexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, nofollow';

  if (parsed.view === 'course-detail') {
    const course = findCourseBySlug(courses, parsed.slug);
    if (!course) {
      statusCode = 404;
      title = `${t.notFoundTitle} | HamroLms`;
      description = t.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      title = course.seoTitle?.trim() || `${course.title} | HamroLms`;
      description =
        course.seoDescription?.trim() ||
        course.overview?.trim() ||
        `Enroll in ${course.title} on HamroLms. ${course.learn.slice(0, 3).join(', ')}.`;
    }
  } else if (parsed.view === 'instructors') {
    title = t.seoInstructorsTitle;
    description = t.seoInstructorsDescription;
  } else if (parsed.view === 'instructor-detail') {
    const targetSlug = slugifyText(parsed.slug || '');
    const inst =
      instructors.find((i) => i.slug === targetSlug) ||
      CORE_INSTRUCTORS.find((i) => i.slug === targetSlug);
    if (!inst) {
      statusCode = 404;
      title = `${t.notFoundTitle} | HamroLms`;
      description = t.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      title = `${inst.name} – ${inst.role} | HamroLms`;
      description = inst.bio;
    }
  } else if (parsed.view === 'blog') {
    title = parsed.category ? `${parsed.category} Articles | ${t.seoBlogTitle}` : t.seoBlogTitle;
    description = t.seoBlogDescription;
  } else if (parsed.view === 'blog-detail') {
    const post = findBlogPostBySlug(BLOG_POSTS, parsed.slug);
    if (!post) {
      statusCode = 404;
      title = `${t.notFoundTitle} | HamroLms`;
      description = t.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      title = post.seoTitle || `${post.title} | HamroLms`;
      description = post.seoDescription || post.excerpt;
    }
  } else if (parsed.view === 'privacy-policy') {
    title = 'Privacy Policy | HamroLms';
    description = 'Read how HamroLms protects learner privacy, course credentials, and account security.';
  } else if (parsed.view === 'terms') {
    title = 'Terms of Use | HamroLms';
    description = 'Review HamroLms learning platform terms of use, licensing, and enrollment guidelines.';
  } else if (parsed.view === 'not-found') {
    statusCode = 404;
    title = `${t.notFoundTitle} | HamroLms`;
    description = t.notFoundDescription;
    robots = 'noindex, nofollow';
  }

  const canonicalPath =
    statusCode === 404
      ? pathname
      : buildLocalizedPath(parsed.cleanPathWithoutLocale, parsed.locale);
  const canonicalUrl = `${origin}${canonicalPath}`;

  const hreflangTags =
    statusCode === 404 || !parsed.isPublicIndexable
      ? ''
      : [
          ...SUPPORTED_LOCALES.map(
            (loc) =>
              `<link rel="alternate" hreflang="${loc}" href="${escapeHtmlAttr(
                `${origin}${buildLocalizedPath(parsed.cleanPathWithoutLocale, loc)}`
              )}" />`
          ),
          `<link rel="alternate" hreflang="x-default" href="${escapeHtmlAttr(
            `${origin}${buildLocalizedPath(parsed.cleanPathWithoutLocale, 'en')}`
          )}" />`,
        ].join('\n    ');

  let updated = html;
  updated = updated.replace(/<html lang="[^"]*"/i, `<html lang="${escapeHtmlAttr(t.htmlLang)}"`);
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
  updated = updated.replace(
    /<meta name="title" content="[^"]*"\s*\/?>/i,
    `<meta name="title" content="${escapeHtmlAttr(title)}" />`
  );
  updated = updated.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`
  );
  updated = updated.replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${escapeHtmlAttr(robots)}" />`
  );
  updated = updated.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  updated = updated.replace(
    /<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>\s*/gi,
    ''
  );
  if (hreflangTags) {
    updated = updated.replace('</head>', `    ${hreflangTags}\n  </head>`);
  }
  updated = updated.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  updated = updated.replace(
    /<meta property="og:title" content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
  );
  updated = updated.replace(
    /<meta property="og:description" content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
  );
  updated = updated.replace(
    /<meta name="twitter:url" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:url" content="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  updated = updated.replace(
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`
  );
  updated = updated.replace(
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`
  );

  return { html: updated, statusCode };
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
      res.status(500).type('text/plain').send('Failed to generate sitemap');
    }
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = resolvePublicOrigin(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(generateRobotsTxt(origin));
  });
}
