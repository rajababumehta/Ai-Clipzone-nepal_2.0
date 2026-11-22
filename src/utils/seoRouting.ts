import { Course, SupportedLocale } from '../types';

export type AppView =
  | 'home'
  | 'course-detail'
  | 'instructors'
  | 'instructor-detail'
  | 'blog'
  | 'blog-detail'
  | 'privacy-policy'
  | 'terms'
  | 'delete-account'
  | 'classroom'
  | 'course-live'
  | 'live'
  | 'ask'
  | 'account'
  | 'enroll'
  | 'not-found';

export interface ParsedRoute {
  locale: SupportedLocale;
  view: AppView;
  slug?: string;
  category?: string;
  isPublicIndexable: boolean;
  cleanPathWithoutLocale: string;
}

const KNOWN_LOCALE_PREFIXES: SupportedLocale[] = ['ne', 'hi'];

/**
 * Generates an SEO-safe, lowercase URL slug from any course/instructor/article title or ID.
 */
export function slugifyText(input: string): string {
  const raw = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || 'item';
}

export function getCourseSlug(course: Partial<Course>): string {
  if (course.slug && course.slug.trim()) {
    return slugifyText(course.slug);
  }
  const baseTitle = course.title || course.id || 'course';
  const cleaned = slugifyText(baseTitle);
  return cleaned;
}

export function findCourseBySlug(courses: Course[], slug?: string): Course | undefined {
  if (!slug || !courses?.length) return undefined;
  const target = slugifyText(decodeURIComponent(slug));
  return courses.find(
    (c) =>
      getCourseSlug(c) === target ||
      slugifyText(c.id) === target ||
      c.id.toLowerCase() === slug.toLowerCase()
  );
}

/**
 * Strips locale prefix (/ne or /hi) and builds localized path cleanly.
 * English ('en') stays at clean root paths (/) to prevent duplicate root URLs.
 */
export function buildLocalizedPath(cleanPath: string, locale: SupportedLocale = 'en'): string {
  const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const trimmed = normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
  if (locale === 'en') {
    return trimmed;
  }
  return trimmed === '/' ? `/${locale}` : `/${locale}${trimmed}`;
}

export function parsePathnameToRoute(pathname: string): ParsedRoute {
  const raw = pathname || '/';
  const normalized = raw === '/index.html' ? '/' : raw.replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);

  let locale: SupportedLocale = 'en';
  if (segments.length > 0 && KNOWN_LOCALE_PREFIXES.includes(segments[0] as SupportedLocale)) {
    locale = segments[0] as SupportedLocale;
    segments.shift();
  }

  const cleanPathWithoutLocale = segments.length === 0 ? '/' : `/${segments.join('/')}`;

  if (segments.length === 0) {
    return {
      locale,
      view: 'home',
      isPublicIndexable: true,
      cleanPathWithoutLocale: '/',
    };
  }

  const [first, second, third] = segments;

  if (first === 'courses') {
    if (!second) {
      return { locale, view: 'home', isPublicIndexable: true, cleanPathWithoutLocale: '/' };
    }
    if (!third) {
      return {
        locale,
        view: 'course-detail',
        slug: decodeURIComponent(second),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
  }

  if (first === 'instructors') {
    if (!second) {
      return {
        locale,
        view: 'instructors',
        isPublicIndexable: true,
        cleanPathWithoutLocale: '/instructors',
      };
    }
    if (!third) {
      return {
        locale,
        view: 'instructor-detail',
        slug: decodeURIComponent(second),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
  }

  if (first === 'blog') {
    if (!second) {
      return {
        locale,
        view: 'blog',
        isPublicIndexable: true,
        cleanPathWithoutLocale: '/blog',
      };
    }
    if (second === 'category' && third) {
      return {
        locale,
        view: 'blog',
        category: decodeURIComponent(third),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
    if (!third) {
      return {
        locale,
        view: 'blog-detail',
        slug: decodeURIComponent(second),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
  }

  if (first === 'privacy-policy' && !second) {
    return { locale, view: 'privacy-policy', isPublicIndexable: true, cleanPathWithoutLocale: '/privacy-policy' };
  }
  if ((first === 'terms' || first === 'terms-of-use') && !second) {
    return { locale, view: 'terms', isPublicIndexable: true, cleanPathWithoutLocale: '/terms' };
  }
  if (first === 'delete-account' && !second) {
    return { locale, view: 'delete-account', isPublicIndexable: false, cleanPathWithoutLocale: '/delete-account' };
  }

  // Protected / private interactive routes (marked noindex)
  if (first === 'classroom' && !second) {
    return { locale, view: 'classroom', isPublicIndexable: false, cleanPathWithoutLocale: '/classroom' };
  }
  if (first === 'account' && !second) {
    return { locale, view: 'account', isPublicIndexable: false, cleanPathWithoutLocale: '/account' };
  }
  if (first === 'ask' && !second) {
    return { locale, view: 'ask', isPublicIndexable: false, cleanPathWithoutLocale: '/ask' };
  }
  if (first === 'live' && !second) {
    return { locale, view: 'live', isPublicIndexable: false, cleanPathWithoutLocale: '/live' };
  }
  if (first === 'admin') {
    return { locale, view: 'account', isPublicIndexable: false, cleanPathWithoutLocale: '/account' };
  }

  return {
    locale,
    view: 'not-found',
    isPublicIndexable: false,
    cleanPathWithoutLocale,
  };
}
