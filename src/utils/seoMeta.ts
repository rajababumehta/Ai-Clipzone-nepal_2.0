import type { BlogPost, Course, PublicInstructorProfile, SupportedLocale } from '../types.ts';
import { getLocaleDict } from './i18n.ts';
import {
  type AppView,
  buildLocalizedPath,
  findCourseBySlug,
  getCourseSlug,
  parsePathnameToRoute,
  slugifyText,
} from './seoRouting.ts';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildCourseItemListSchema,
  buildCourseSchema,
  buildOrganizationSchema,
  buildPersonSchema,
  buildPlatformFaqSchema,
  buildSiteNavigationSchema,
  buildWebApplicationSchema,
  buildWebsiteSchema,
} from './seoSchema.ts';
import { resolveCourseInstructor } from '../data/instructors.ts';

export interface ArticleOpenGraphMeta {
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  author?: string;
  tags: string[];
}

export interface HreflangAlternateLink {
  hreflang: string;
  href: string;
}

export interface GeneratedPageSeoMetadata {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
  htmlLang: string;
  ogLocale: string;
  ogType: 'website' | 'article';
  ogImage: string;
  ogImageAlt: string;
  ogSiteName: string;
  twitterCard: 'summary_large_image';
  articleMeta?: ArticleOpenGraphMeta;
  hreflangLinks: HreflangAlternateLink[];
  jsonLdGraph: Record<string, any>;
  isRoute404: boolean;
}

export interface DynamicPageSeoInput {
  origin: string;
  pathname: string;
  currentView: AppView;
  activeLocale: SupportedLocale;
  routeSlug?: string;
  routeCategory?: string;
  publicCatalogCourses: Course[];
  publicInstructors: PublicInstructorProfile[];
  blogPosts: BlogPost[];
  enrollCourse?: Course | null;
  isCoursesLoading?: boolean;
  supportEmail?: string;
  brand?: string;
}

const DEFAULT_BRAND = 'HamroLms';

function clampText(text: string, maxLen: number): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > Math.floor(maxLen * 0.6) ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function resolveAbsoluteImageUrl(imagePath: string | undefined, origin: string): string {
  const cleanOrigin = String(origin || 'https://hamrolms.vercel.app').replace(/\/+$/, '');
  const raw = String(imagePath || '').trim();
  if (!raw) return `${cleanOrigin}/institute-logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${cleanOrigin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function normalizeBrandSuffix(val: string, brand: string): string {
  return val.replace(/\bHamro\s*LMS\b/gi, brand).trim();
}

export function buildCourseSeoMetadata(
  course: Course,
  instructor: PublicInstructorProfile | undefined,
  origin: string,
  brand: string,
  locale: SupportedLocale
): {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  ogImageAlt: string;
} {
  const cSlug = getCourseSlug(course);
  const canonicalUrl = `${origin}${buildLocalizedPath(`/courses/${cSlug}`, locale)}`;

  const explicitTitle = course.seoTitle?.trim()
    ? normalizeBrandSuffix(course.seoTitle.trim(), brand)
    : '';
  const generatedTitle = clampText(
    `${course.title}${course.category ? ` – ${course.category}` : ''} | ${brand}`,
    64
  );
  const title = explicitTitle || generatedTitle;

  const explicitDesc = course.seoDescription?.trim()
    ? normalizeBrandSuffix(course.seoDescription.trim(), brand)
    : '';
  const topics = Array.isArray(course.learn) ? course.learn.slice(0, 3).join(', ') : '';
  const lectureSummary =
    Array.isArray(course.videos) && course.videos.length > 0
      ? `${course.videos.length} structured video lessons`
      : 'practical video modules';
  const normalizedLang = course.language && !/nepali|hindi/i.test(course.language) ? course.language : 'English';
  const langLabel = normalizedLang ? ` in ${normalizedLang}` : '';
  const instructorLabel = instructor?.name ? ` taught by ${instructor.name}` : '';
  const synthesizedDesc = course.overview?.trim()
    ? `${course.overview.trim()} Includes ${lectureSummary}${langLabel}${instructorLabel}.`
    : `Enroll in ${course.title} on ${brand} Nepal${instructorLabel}. Covers ${topics || 'practical digital skills'} with ${lectureSummary}${langLabel}.`;
  const description = clampText(explicitDesc || synthesizedDesc, 160);

  const keywordParts = [
    course.title,
    course.category || 'Online Course Nepal',
    brand,
    `${brand} Nepal`,
    ...(Array.isArray(course.learn) ? course.learn.slice(0, 4) : []),
    instructor?.name || '',
  ].filter(Boolean);
  const keywords = Array.from(new Set(keywordParts)).join(', ');

  const ogImage = resolveAbsoluteImageUrl(course.image, origin);
  const ogImageAlt = `${course.title} – ${course.category || 'Online Course'} on ${brand} Nepal`;

  return { title, description, keywords, canonicalUrl, ogImage, ogImageAlt };
}

export function buildBlogPostSeoMetadata(
  post: BlogPost,
  author: PublicInstructorProfile | undefined,
  origin: string,
  brand: string,
  locale: SupportedLocale
): {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImage: string;
  ogImageAlt: string;
  articleMeta: ArticleOpenGraphMeta;
} {
  const canonicalUrl = `${origin}${buildLocalizedPath(`/blog/${post.slug}`, locale)}`;
  const explicitTitle = post.seoTitle?.trim()
    ? normalizeBrandSuffix(post.seoTitle.trim(), brand)
    : '';
  const title = explicitTitle || clampText(`${post.title} | ${brand}`, 64);

  const firstParagraph = post.sections?.[0]?.paragraphs?.[0] || '';
  const rawDescription =
    post.seoDescription?.trim() ||
    post.excerpt?.trim() ||
    firstParagraph ||
    `${post.title} — practical ${post.category} guide on ${brand} Nepal.`;
  const description = clampText(normalizeBrandSuffix(rawDescription, brand), 160);

  const keywordParts = [
    post.category,
    ...(Array.isArray(post.tags) ? post.tags : []),
    brand,
    `${brand} Blog`,
  ].filter(Boolean);
  const keywords = Array.from(new Set(keywordParts)).join(', ');

  const ogImage = resolveAbsoluteImageUrl(post.coverImage, origin);
  const ogImageAlt = normalizeBrandSuffix(
    post.coverAlt?.trim() || `${post.title} – ${post.category} Guide on ${brand}`,
    brand
  );

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    ogImage,
    ogImageAlt,
    articleMeta: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      section: post.category,
      author: author?.name || 'Rajababu Mehta',
      tags: Array.isArray(post.tags) ? post.tags : [],
    },
  };
}

/**
 * Generates dynamic, content-specific SEO metadata, canonical URL, Open Graph, Twitter Card,
 * hreflang links, and Schema.org JSON-LD graph for the active route/course/blog post.
 */
export function generateDynamicPageMetadata(
  input: DynamicPageSeoInput
): GeneratedPageSeoMetadata {
  const brand = input.brand || DEFAULT_BRAND;
  const origin = String(input.origin || 'https://hamrolms.vercel.app').replace(/\/+$/, '');
  const supportEmail = input.supportEmail || 'support.hamrolms@gmail.com';
  const rawPathname = input.pathname === '/index.html' ? '/' : input.pathname || '/';
  const parsedRoute = parsePathnameToRoute(rawPathname);
  const dict = getLocaleDict(input.activeLocale);

  let pageTitle = dict.seoHomeTitle;
  let pageDescription = dict.seoHomeDescription;
  let keywords = `${brand}, Hamro LMS, Learn AI in Nepal, Best Coding Bootcamp Kathmandu, Online Skill Training, HamroLms Nepal, Online Learning, Digital Skill Courses, AI Course, Video Editing, Web Development`;
  let robotsDirective = parsedRoute.isPublicIndexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, nofollow';
  let isRoute404 = parsedRoute.view === 'not-found';
  let ogImage = `${origin}/institute-logo.png`;
  let ogImageAlt = `${brand} – Online Learning & Digital Skill Courses`;
  let ogType: 'website' | 'article' = 'website';
  let articleMeta: ArticleOpenGraphMeta | undefined;

  const breadcrumbItems: Array<{ name: string; url: string }> = [
    { name: 'Home', url: `${origin}${buildLocalizedPath('/', input.activeLocale)}` },
  ];
  const extraSchemas: Record<string, any>[] = [];

  if (input.currentView === 'course-detail') {
    const targetCourse = findCourseBySlug(input.publicCatalogCourses, input.routeSlug);
    if (!targetCourse) {
      if (!input.isCoursesLoading) {
        isRoute404 = true;
        pageTitle = `${dict.notFoundTitle} | ${brand}`;
        pageDescription = dict.notFoundDescription;
        robotsDirective = 'noindex, nofollow';
      }
    } else {
      const instructor = resolveCourseInstructor(targetCourse, input.publicInstructors);
      const courseMeta = buildCourseSeoMetadata(
        targetCourse,
        instructor,
        origin,
        brand,
        input.activeLocale
      );
      pageTitle = courseMeta.title;
      pageDescription = courseMeta.description;
      keywords = courseMeta.keywords;
      ogImage = courseMeta.ogImage;
      ogImageAlt = courseMeta.ogImageAlt;
      breadcrumbItems.push({ name: targetCourse.title, url: courseMeta.canonicalUrl });
      extraSchemas.push(
        buildCourseSchema(origin, brand, targetCourse, instructor, input.activeLocale)
      );
    }
  } else if (input.currentView === 'blog-detail') {
    const targetSlug = (input.routeSlug || '').trim().toLowerCase();
    const post = input.blogPosts.find((p) => p.slug.toLowerCase() === targetSlug);
    if (!post) {
      isRoute404 = true;
      pageTitle = `${dict.notFoundTitle} | ${brand}`;
      pageDescription = dict.notFoundDescription;
      robotsDirective = 'noindex, nofollow';
    } else {
      const author =
        input.publicInstructors.find((i) => i.slug === post.authorSlug) ||
        input.publicInstructors[0];
      const blogMeta = buildBlogPostSeoMetadata(post, author, origin, brand, input.activeLocale);
      pageTitle = blogMeta.title;
      pageDescription = blogMeta.description;
      keywords = blogMeta.keywords;
      ogType = 'article';
      ogImage = blogMeta.ogImage;
      ogImageAlt = blogMeta.ogImageAlt;
      articleMeta = blogMeta.articleMeta;
      breadcrumbItems.push(
        { name: dict.blogNav, url: `${origin}${buildLocalizedPath('/blog', input.activeLocale)}` },
        { name: post.title, url: blogMeta.canonicalUrl }
      );
      if (author) {
        extraSchemas.push(buildArticleSchema(origin, brand, post, author, input.activeLocale));
      }
    }
  } else if (input.currentView === 'blog') {
    const blogBaseUrl = `${origin}${buildLocalizedPath('/blog', input.activeLocale)}`;
    breadcrumbItems.push({ name: dict.blogNav, url: blogBaseUrl });
    if (input.routeCategory) {
      const categoryPosts = input.blogPosts.filter(
        (p) => slugifyText(p.category) === slugifyText(input.routeCategory || '')
      );
      if (categoryPosts.length === 0) {
        isRoute404 = true;
        pageTitle = `${dict.notFoundTitle} | ${brand}`;
        pageDescription = dict.notFoundDescription;
        robotsDirective = 'noindex, nofollow';
      } else {
        const categoryName = categoryPosts[0].category;
        const sampleTopics = categoryPosts
          .slice(0, 2)
          .map((p) => p.title)
          .join(' and ');
        pageTitle = `${categoryName} Guides & Tutorials | ${brand}`;
        pageDescription = clampText(
          `Explore ${categoryPosts.length} ${categoryName} guides on ${brand} Nepal, including ${sampleTopics}.`,
          160
        );
        keywords = `${categoryName}, ${brand} Blog, Online Courses Nepal, Digital Skills`;
        ogImageAlt = `${categoryName} Learning Guides on ${brand}`;
        breadcrumbItems.push({
          name: categoryName,
          url: `${origin}${buildLocalizedPath(`/blog/category/${slugifyText(categoryName)}`, input.activeLocale)}`,
        });
      }
    } else {
      pageTitle = dict.seoBlogTitle;
      pageDescription = dict.seoBlogDescription;
      ogImageAlt = `${brand} Learning Blog & Practical AI Guides`;
    }
  } else if (input.currentView === 'instructors') {
    pageTitle = dict.seoInstructorsTitle;
    pageDescription = dict.seoInstructorsDescription;
    ogImageAlt = `Teachers and Instructors on ${brand} Nepal`;
    breadcrumbItems.push({
      name: dict.instructorsNav,
      url: `${origin}${buildLocalizedPath('/instructors', input.activeLocale)}`,
    });
  } else if (input.currentView === 'instructor-detail') {
    const instSlug = slugifyText(input.routeSlug || '');
    const inst = input.publicInstructors.find((i) => i.slug === instSlug);
    if (!inst) {
      isRoute404 = true;
      pageTitle = `${dict.notFoundTitle} | ${brand}`;
      pageDescription = dict.notFoundDescription;
      robotsDirective = 'noindex, nofollow';
    } else {
      const instUrl = `${origin}${buildLocalizedPath(`/instructors/${inst.slug}`, input.activeLocale)}`;
      pageTitle = clampText(`${inst.name} – ${inst.role} | ${brand}`, 64);
      pageDescription = clampText(inst.bio, 160);
      keywords = `${inst.name}, ${inst.role}, ${inst.expertise.slice(0, 3).join(', ')}, ${brand}`;
      ogImage = resolveAbsoluteImageUrl(inst.avatarUrl, origin);
      ogImageAlt = `${inst.name} – ${inst.role} at ${brand}`;
      breadcrumbItems.push(
        {
          name: dict.instructorsNav,
          url: `${origin}${buildLocalizedPath('/instructors', input.activeLocale)}`,
        },
        { name: inst.name, url: instUrl }
      );
      extraSchemas.push(buildPersonSchema(origin, inst, input.activeLocale));
    }
  } else if (input.currentView === 'courses') {
    pageTitle = dict.seoCoursesTitle;
    pageDescription = dict.seoCoursesDescription;
    ogImageAlt = `Course Catalog – ${brand}`;
    breadcrumbItems.push({
      name: 'Course',
      url: `${origin}${buildLocalizedPath('/courses', input.activeLocale)}`,
    });
    extraSchemas.push(
      buildCourseItemListSchema(
        origin,
        brand,
        input.publicCatalogCourses,
        input.publicInstructors,
        input.activeLocale
      )
    );
  } else if (input.currentView === 'about-us') {
    pageTitle = dict.seoAboutTitle;
    pageDescription = dict.seoAboutDescription;
    ogImageAlt = `About Us – ${brand}`;
    breadcrumbItems.push({
      name: 'About Us',
      url: `${origin}${buildLocalizedPath('/about-us', input.activeLocale)}`,
    });
  } else if (input.currentView === 'learn') {
    pageTitle = dict.seoLearnTitle;
    pageDescription = dict.seoLearnDescription;
    ogImageAlt = `Learn. Apply. Grow. – ${brand}`;
    breadcrumbItems.push({
      name: 'Learn. Apply. Grow.',
      url: `${origin}${buildLocalizedPath('/learn', input.activeLocale)}`,
    });
  } else if (input.currentView === 'privacy-policy') {
    pageTitle = `Privacy Policy | ${brand}`;
    pageDescription = `Read how ${brand} protects learner privacy, course credentials, and account security across our online learning platform.`;
    breadcrumbItems.push({
      name: 'Privacy Policy',
      url: `${origin}${buildLocalizedPath('/privacy-policy', input.activeLocale)}`,
    });
  } else if (input.currentView === 'terms') {
    pageTitle = `Terms of Use | ${brand}`;
    pageDescription = `Review ${brand} online learning platform terms of use, course licensing, and enrollment guidelines.`;
    breadcrumbItems.push({
      name: 'Terms of Use',
      url: `${origin}${buildLocalizedPath('/terms', input.activeLocale)}`,
    });
  } else if (input.currentView === 'enroll' && input.enrollCourse) {
    const isFree =
      input.enrollCourse.isFree ||
      input.enrollCourse.amount === 0 ||
      String(input.enrollCourse.price || '').toLowerCase() === 'free';
    const priceLabel = isFree ? 'Free' : input.enrollCourse.price || 'Affordable';
    pageTitle = clampText(`Enroll: ${input.enrollCourse.title} | ${brand}`, 60);
    pageDescription = clampText(
      `Enroll in ${input.enrollCourse.title} (${priceLabel}) on ${brand} for structured video lessons and notes.`,
      160
    );
    ogImage = resolveAbsoluteImageUrl(input.enrollCourse.image, origin);
    ogImageAlt = `${input.enrollCourse.title} Enrollment – ${brand}`;
    robotsDirective = 'noindex, nofollow';
  } else if (input.currentView === 'classroom') {
    pageTitle = `Student Classroom & Video Lectures | ${brand}`;
    pageDescription = `Watch your unlocked HD video lectures, download PDF study notes, and earn certificates inside the ${brand} online classroom.`;
    robotsDirective = 'noindex, nofollow';
  } else if (input.currentView === 'account') {
    pageTitle = `Student Profile & Course Activation | ${brand}`;
    pageDescription = `Activate your course secret key, manage your student profile, and access your certificates on ${brand}.`;
    robotsDirective = 'noindex, nofollow';
  } else if (input.currentView === 'ask') {
    pageTitle = `Mentor Support & Course Chat | ${brand}`;
    pageDescription = `Connect directly with your ${brand} course mentors and instructors for help and learning guidance.`;
    robotsDirective = 'noindex, nofollow';
  } else if (input.currentView === 'live' || input.currentView === 'course-live') {
    pageTitle = `Live Interactive Sessions | ${brand}`;
    pageDescription = `Join scheduled live mentoring sessions and interactive Q&A workshops for your enrolled courses on ${brand}.`;
    robotsDirective = 'noindex, nofollow';
  } else if (input.currentView === 'not-found' || input.currentView === 'delete-account') {
    pageTitle =
      input.currentView === 'delete-account'
        ? `Account Help | ${brand}`
        : `${dict.notFoundTitle} | ${brand}`;
    pageDescription = dict.notFoundDescription;
    robotsDirective = 'noindex, nofollow';
  } else {
    extraSchemas.push(
      buildCourseItemListSchema(
        origin,
        brand,
        input.publicCatalogCourses,
        input.publicInstructors,
        input.activeLocale
      )
    );
  }

  const canonicalPath = isRoute404
    ? rawPathname
    : buildLocalizedPath(parsedRoute.cleanPathWithoutLocale, 'en');
  const canonicalUrl = `${origin}${canonicalPath}`;

  const hreflangLinks: HreflangAlternateLink[] = [];
  if (!isRoute404 && parsedRoute.isPublicIndexable) {
    const enHref = `${origin}${buildLocalizedPath(parsedRoute.cleanPathWithoutLocale, 'en')}`;
    hreflangLinks.push(
      { hreflang: 'en', href: enHref },
      { hreflang: 'x-default', href: enHref }
    );
  }

  const jsonLdGraph = {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationSchema(origin, brand, supportEmail),
      ...(input.currentView === 'home'
        ? [
            buildWebApplicationSchema(origin, brand),
            buildWebsiteSchema(origin, brand, input.activeLocale),
            buildSiteNavigationSchema(origin, input.activeLocale),
            buildPlatformFaqSchema(origin, brand, input.publicCatalogCourses),
          ]
        : []),
      buildBreadcrumbSchema(breadcrumbItems),
      ...extraSchemas,
    ],
  };

  return {
    title: pageTitle,
    description: pageDescription,
    keywords,
    canonicalUrl,
    robots: robotsDirective,
    htmlLang: dict.htmlLang,
    ogLocale: dict.ogLocale,
    ogType,
    ogImage,
    ogImageAlt,
    ogSiteName: brand,
    twitterCard: 'summary_large_image',
    articleMeta,
    hreflangLinks,
    jsonLdGraph,
    isRoute404,
  };
}

/**
 * Injects generated meta tags, canonical link, Open Graph, article tags, Twitter tags,
 * hreflang links, and Schema.org JSON-LD into the live document <head>.
 */
export function injectDynamicPageMetadata(meta: GeneratedPageSeoMetadata): void {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = meta.htmlLang;
  document.title = meta.title;

  const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaTag('name', 'title', meta.title);
  setMetaTag('name', 'description', meta.description);
  setMetaTag('name', 'keywords', meta.keywords);
  setMetaTag('name', 'robots', meta.robots);
  setMetaTag('name', 'googlebot', meta.robots);
  setMetaTag('name', 'bingbot', meta.robots);

  setMetaTag('property', 'og:type', meta.ogType);
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', meta.canonicalUrl);
  setMetaTag('property', 'og:image', meta.ogImage);
  setMetaTag('property', 'og:image:alt', meta.ogImageAlt);
  setMetaTag('property', 'og:site_name', meta.ogSiteName);
  setMetaTag('property', 'og:locale', meta.ogLocale);

  // Clear stale article:* tags before setting article-specific Open Graph properties
  document.querySelectorAll('meta[property^="article:"]').forEach((node) => node.remove());
  if (meta.ogType === 'article' && meta.articleMeta) {
    if (meta.articleMeta.publishedTime) {
      setMetaTag('property', 'article:published_time', meta.articleMeta.publishedTime);
    }
    if (meta.articleMeta.modifiedTime) {
      setMetaTag('property', 'article:modified_time', meta.articleMeta.modifiedTime);
    }
    if (meta.articleMeta.section) {
      setMetaTag('property', 'article:section', meta.articleMeta.section);
    }
    if (meta.articleMeta.author) {
      setMetaTag('property', 'article:author', meta.articleMeta.author);
    }
    meta.articleMeta.tags.forEach((tag) => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'article:tag');
      el.setAttribute('content', tag);
      document.head.appendChild(el);
    });
  }

  setMetaTag('name', 'twitter:card', meta.twitterCard);
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:url', meta.canonicalUrl);
  setMetaTag('name', 'twitter:image', meta.ogImage);
  setMetaTag('name', 'twitter:image:alt', meta.ogImageAlt);

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', meta.canonicalUrl);

  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((node) => node.remove());
  meta.hreflangLinks.forEach((item) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = item.hreflang;
    link.href = item.href;
    document.head.appendChild(link);
  });

  const originForLinks = typeof window !== 'undefined' ? window.location.origin : 'https://hamrolms.vercel.app';
  let sitemapLink = document.querySelector('link[rel="sitemap"]') as HTMLLinkElement | null;
  if (!sitemapLink) {
    sitemapLink = document.createElement('link');
    sitemapLink.rel = 'sitemap';
    sitemapLink.type = 'application/xml';
    sitemapLink.title = 'Sitemap';
    document.head.appendChild(sitemapLink);
  }
  sitemapLink.href = `${originForLinks}/sitemap.xml`;

  let llmsLink = document.querySelector('link[rel="alternate"][type="text/plain"]') as HTMLLinkElement | null;
  if (!llmsLink) {
    llmsLink = document.createElement('link');
    llmsLink.rel = 'alternate';
    llmsLink.type = 'text/plain';
    llmsLink.title = 'LLMs Context';
    document.head.appendChild(llmsLink);
  }
  llmsLink.href = `${originForLinks}/llms.txt`;

  let ldScript = document.getElementById('dynamic-hamrolms-jsonld') as HTMLScriptElement | null;
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.id = 'dynamic-hamrolms-jsonld';
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(meta.jsonLdGraph);
}
