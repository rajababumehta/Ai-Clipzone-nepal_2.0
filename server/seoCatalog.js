// Pure-ESM, zero-external-dependency SEO catalog, sitemap XML, robots.txt, and HTML meta injector.
// Designed to execute safely in Vercel Node serverless functions AND Express without firebase-admin/gRPC/express overhead.

export const DEFAULT_PUBLIC_ORIGIN = 'https://hamrolms.vercel.app';
export const SUPPORTED_LOCALES = ['en'];
const KNOWN_LOCALE_PREFIXES = ['ne', 'hi'];

const FIREBASE_PROJECT_ID =
  (typeof process !== 'undefined' && process.env?.FIREBASE_PROJECT_ID?.trim()) ||
  'gen-lang-client-0360487518';

const RAW_DB_ID =
  typeof process !== 'undefined' ? process.env?.FIREBASE_DATABASE_ID?.trim() : '';
const FIREBASE_DATABASE_ID =
  RAW_DB_ID && !/^https?:\/\//i.test(RAW_DB_ID) && !RAW_DB_ID.includes('/')
    ? RAW_DB_ID
    : 'ai-studio-aiclipzonenepal-13e41d9c-1db8-4842-a387-8c950c1f5b2a';

export const SEED_COURSES = [
  {
    id: 'Ai master class course by Ai clipzone',
    slug: 'ai-master-class-course-by-hamrolms',
    title: 'AI Master Class Course by Hamro LMS',
    seoTitle: 'AI Master Class Course in Nepal – AI Training | Hamro LMS',
    seoDescription:
      'Join the AI Master Class Course on Hamro LMS Nepal. Learn 30+ AI tools for video creation, image generation, AI music, presentations, and web design.',
    overview:
      'A practical AI training course in Nepal covering 30+ generative AI tools for AI video creation, image generation, AI song production, presentation design, and website building.',
    category: 'AI Training Nepal',
    level: 'All Levels',
    price: 'Rs. 449',
    amount: 449,
    isFree: false,
    order: 0,
    language: 'English',
    instructorSlug: 'rajababu-mehta',
    instructorName: 'Rajababu Mehta',
    includeCertificate: true,
    includeLive: false,
    learn: [
      '30+ AI Tools Mastery',
      'AI Video & Image Generation',
      'AI Songs Creation',
      'Presentation & Website Design',
    ],
    image:
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMBjnyDK0lXwuSXOriM05OQPKeCOWsX3jnnrZUrQMK-RlYRTM91s3c-tpEwRCOzGlyUUS3c3fpqMmQRtMiVweJRI2x1W7IW_7rwTv5D5cDK4h_jHUKOG2chJQEMkJA2rEoH60zX9vsZZqJlB53bn7n9DYa2_cdL67FbtC3qjzbH1EQEbjJdaigkzFgL2Zn/s1685/37585.png',
    updatedAt: '2026-11-20',
  },
  {
    id: 'youtube-blueprint-course-by-al-clipzone',
    slug: 'youtube-blueprint-course-by-hamrolms',
    title: 'YouTube Blueprint Course by Hamro LMS',
    seoTitle: 'YouTube Blueprint Course in Nepal – Creator Training | Hamro LMS',
    seoDescription:
      'Learn YouTube channel setup, storytelling scripts, video editing, thumbnail design, and AI content workflows on Hamro LMS online learning platform in Nepal.',
    overview:
      'Step-by-step creator training covering YouTube niche selection, script storytelling, high-retention editing, thumbnail strategy, growth systems, and AI-assisted content workflows.',
    category: 'Creator Growth',
    level: 'All Levels',
    price: 'Rs. 849',
    amount: 849,
    isFree: false,
    order: 1,
    language: 'English',
    instructorSlug: 'rajababu-mehta',
    instructorName: 'Rajababu Mehta',
    includeCertificate: true,
    includeLive: false,
    learn: [
      'Channel setup & niche selection',
      'Finding winning video ideas',
      'Script writing & storytelling',
      'Shooting & presentation',
      'Editing skills',
      'Thumbnail & title strategy',
      'YouTube growth strategy',
      'Monetization & earning methods',
      'Creating content with AI tools',
    ],
    image:
      'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0HHAMfJvAn3a08BTUd1ayj-Jo1A0C8abgyeft2SGJw_Q-AeiLwxD0DY6Ho8IcmU62EXVnzDtHJ4bZErIVuFi8vGipXH9AxO6vRwesLUcHIVLLbozUyVwq4mZFEixr2vEduC-RxIQ5q13R-tngJPDFgCA0oJr9EbVuivCA6VCTz1BLb3Y9DcZJQtcroANa/s1672/37587.png',
    updatedAt: '2026-11-20',
  },
];

export const CORE_INSTRUCTORS = [
  {
    slug: 'rajababu-mehta',
    name: 'Rajababu Mehta',
    role: 'Founder & Lead AI Instructor',
    headline: 'AI Website Developer, AI Educator & Digital Skills Trainer in Nepal',
    bio: 'Rajababu Mehta is the Founder of Hamro LMS and an AI Website Developer from Nepal specializing in practical generative AI workflows, educational explainer production, web development, and creator growth strategies.',
    expertise: [
      'Generative AI Tools',
      'Prompt Engineering',
      'AI Website Development',
      'Visual Storytelling & Explainers',
      'Digital Product Architecture',
    ],
    avatarUrl: '/institute-logo.png',
    location: 'Birgunj, Nepal',
    languages: ['English'],
    courseIds: [
      'Ai master class course by Ai clipzone',
      'youtube-blueprint-course-by-al-clipzone',
    ],
    isFounder: true,
    socialLinks: {
      website: 'https://rajababumehta.com.np',
      facebook: 'https://www.facebook.com/profile.php?id=61583901232576',
    },
  },
];

export const SEED_BLOG_POSTS = [
  {
    slug: 'mastering-prompt-engineering-for-practical-ai-workflows',
    title: 'Mastering Prompt Engineering for Practical AI Workflows',
    seoTitle: 'Prompt Engineering Guide for Practical AI Workflows | Hamro LMS',
    seoDescription:
      'Learn structured prompt engineering frameworks for writing, visual generation, coding, and productivity using modern AI tools on Hamro LMS Nepal.',
    excerpt:
      'Move beyond basic one-line prompts with a repeatable framework covering role framing, context blocks, constraints, and iterative refinement.',
    category: 'AI & Automation',
    tags: ['Prompt Engineering', 'AI Tools', 'Productivity', 'ChatGPT'],
    authorSlug: 'rajababu-mehta',
    authorName: 'Rajababu Mehta',
    coverImage: '/institute-logo.png',
    coverAlt: 'Hamro LMS guide on structured prompt engineering workflows',
    publishedAt: '2026-09-18',
    updatedAt: '2026-11-15',
  },
  {
    slug: 'high-retention-video-editing-workflow-for-creators',
    title: 'High-Retention Video Editing Workflow for Digital Creators',
    seoTitle: 'High-Retention Video Editing Workflow Guide | Hamro LMS',
    seoDescription:
      'Step-by-step guide to pacing, hooks, sound design, and visual storytelling that keep viewers watching educational and creator videos.',
    excerpt:
      'Discover how structured hooks, clean audio layering, and intentional visual pacing turn raw footage into engaging educational stories.',
    category: 'Video Editing',
    tags: ['Video Editing', 'Storytelling', 'CapCut', 'YouTube'],
    authorSlug: 'rajababu-mehta',
    authorName: 'Rajababu Mehta',
    coverImage: '/institute-logo.png',
    coverAlt: 'High-retention video editing and visual storytelling workflow',
    publishedAt: '2026-10-04',
    updatedAt: '2026-11-18',
  },
  {
    slug: 'building-a-sustainable-youtube-education-channel',
    title: 'Building a Sustainable YouTube Education Channel from Scratch',
    seoTitle: 'How to Build a YouTube Education Channel | Hamro LMS',
    seoDescription:
      'Learn practical niche positioning, topic research, packaging, and ethical monetization workflows for educational YouTube creators.',
    excerpt:
      'A realistic blueprint for selecting an educational niche, planning searchable topics, designing clear thumbnails, and building long-term audience trust.',
    category: 'Creator Growth',
    tags: ['YouTube Growth', 'Thumbnails', 'Content Strategy', 'Creator Economy'],
    authorSlug: 'rajababu-mehta',
    authorName: 'Rajababu Mehta',
    coverImage: '/institute-logo.png',
    coverAlt: 'YouTube educational channel strategy and packaging workflow',
    publishedAt: '2026-10-22',
    updatedAt: '2026-11-19',
  },
  {
    slug: 'ai-assisted-web-development-best-practices-for-beginners',
    title: 'AI-Assisted Web Development Best Practices for Beginners',
    seoTitle: 'AI-Assisted Web Development Best Practices | Hamro LMS',
    seoDescription:
      'Understand how to combine HTML, CSS, React, and AI coding assistants responsibly to build fast, accessible, production-ready web apps.',
    excerpt:
      'Learn how modern developers pair foundational web architecture with AI-assisted coding without sacrificing security, performance, or accessibility.',
    category: 'Career & Skills',
    tags: ['Web Development', 'React', 'Frontend', 'AI Coding'],
    authorSlug: 'rajababu-mehta',
    authorName: 'Rajababu Mehta',
    coverImage: '/institute-logo.png',
    coverAlt: 'Modern web development architecture and best practices guide',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-20',
  },
];

const SEO_EN_TEXT = {
  htmlLang: 'en',
  homeTitle: 'HamroLms – Online Learning & Digital Skill Courses',
  homeDescription:
    'Learn AI tools, video editing, graphic design, and web development from verified instructors on HamroLms with structured lessons and certificates.',
  coursesTitle: 'Course Catalog – Online Digital Skill Courses | HamroLms',
  coursesDescription:
    'Explore all structured online courses on HamroLms including AI tools, video editing, graphic design, and web development with certificates.',
  aboutTitle: 'About Us – HamroLms Online Learning Platform',
  aboutDescription:
    'Learn about HamroLms, our verified instructors, structured video modules, study notes, and digital skill certificates for learners in Nepal and beyond.',
  learnTitle: 'Learn. Apply. Grow. – Skill Learning Pathway | HamroLms',
  learnDescription:
    'Learn practical digital skills, apply them on real creative projects, and grow your career with verified certificates on HamroLms.',
  instructorsTitle: 'Instructors & Teachers Directory | HamroLms',
  instructorsDescription:
    'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on HamroLms.',
  blogTitle: 'Online Learning Blog, AI Course & Skill Guides | HamroLms',
  blogDescription:
    'Read practical guides on AI training, video production, prompt engineering, and digital skills on the HamroLms Learning Blog.',
  notFoundTitle: 'Page Not Found (404) | HamroLms',
  notFoundDescription:
    'The requested page could not be found. Browse online courses, instructors, and AI training guides on HamroLms.',
};

const SEO_LOCALE_TEXT = {
  en: SEO_EN_TEXT,
  ne: SEO_EN_TEXT,
  hi: SEO_EN_TEXT,
};

export function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function escapeHtmlAttr(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function slugifyText(input) {
  const raw = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return raw || 'item';
}

export function normalizeLegacyBrandText(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/AI\s*CLIPZONE\s*NEPAL/g, 'Hamro LMS')
    .replace(/AI\s*CLIPZONE/g, 'Hamro LMS')
    .replace(/a[il]\s*clipzone\s*nepal/gi, 'Hamro LMS')
    .replace(/a[il]\s*clipzone/gi, 'Hamro LMS')
    .replace(/clipzone\s*nepal/gi, 'Hamro LMS')
    .replace(/clipzone/gi, 'Hamro LMS')
    .replace(/\bHamroLms\b/g, 'Hamro LMS');
}

export function getCourseSlug(course) {
  if (course?.slug && String(course.slug).trim()) {
    return slugifyText(course.slug);
  }
  const normalizedTitle = normalizeLegacyBrandText(course?.title || course?.id || 'course');
  return slugifyText(normalizedTitle || 'course');
}

export function findCourseBySlug(courses, slug) {
  if (!slug || !Array.isArray(courses) || courses.length === 0) return undefined;
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  const target = slugifyText(decoded);
  return courses.find(
    (c) =>
      getCourseSlug(c) === target ||
      slugifyText(c.title || '') === target ||
      slugifyText(c.id || '') === target ||
      String(c.id || '').toLowerCase() === String(slug).toLowerCase()
  );
}

export function buildLocalizedPath(cleanPath, locale = 'en') {
  const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const trimmed = normalized === '/' ? '/' : normalized.replace(/\/+$/, '');
  if (locale === 'en') {
    return trimmed;
  }
  return trimmed === '/' ? `/${locale}` : `/${locale}${trimmed}`;
}

export function parsePathnameToRoute(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0] || '/';
  const normalized = raw === '/index.html' ? '/' : raw.replace(/\/+$/, '') || '/';
  const segments = normalized.split('/').filter(Boolean);

  let locale = 'en';
  if (segments.length > 0 && KNOWN_LOCALE_PREFIXES.includes(segments[0])) {
    locale = segments.shift();
  }

  const cleanPathWithoutLocale = segments.length === 0 ? '/' : `/${segments.join('/')}`;
  if (segments.length === 0) {
    return { locale, view: 'home', isPublicIndexable: true, cleanPathWithoutLocale: '/' };
  }

  const [first, second, third] = segments;
  const safeDecode = (val) => {
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  };

  if (first === 'courses') {
    if (!second) {
      return { locale, view: 'courses', isPublicIndexable: true, cleanPathWithoutLocale: '/courses' };
    }
    if (!third) {
      return {
        locale,
        view: 'course-detail',
        slug: safeDecode(second),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
  }

  if ((first === 'about-us' || first === 'about') && !second) {
    return { locale, view: 'about-us', isPublicIndexable: true, cleanPathWithoutLocale: '/about-us' };
  }
  if ((first === 'learn' || first === 'learn-apply-grow') && !second) {
    return { locale, view: 'learn', isPublicIndexable: true, cleanPathWithoutLocale: '/learn' };
  }

  if (first === 'instructors') {
    if (!second) {
      return { locale, view: 'instructors', isPublicIndexable: true, cleanPathWithoutLocale: '/instructors' };
    }
    if (!third) {
      return {
        locale,
        view: 'instructor-detail',
        slug: safeDecode(second),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
  }

  if (first === 'blog') {
    if (!second) {
      return { locale, view: 'blog', isPublicIndexable: true, cleanPathWithoutLocale: '/blog' };
    }
    if (second === 'category' && third) {
      return {
        locale,
        view: 'blog',
        category: safeDecode(third),
        isPublicIndexable: true,
        cleanPathWithoutLocale,
      };
    }
    if (!third) {
      return {
        locale,
        view: 'blog-detail',
        slug: safeDecode(second),
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

export function resolvePublicOrigin(req) {
  if (!req || !req.headers) return DEFAULT_PUBLIC_ORIGIN;
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || '';
  const host = String(Array.isArray(rawHost) ? rawHost[0] : rawHost).split(',')[0].trim();
  if (
    !host ||
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.includes('0.0.0.0') ||
    host.includes('aiclipzone.vercel.app')
  ) {
    return DEFAULT_PUBLIC_ORIGIN;
  }
  const rawProto = req.headers['x-forwarded-proto'] || 'https';
  const proto = String(Array.isArray(rawProto) ? rawProto[0] : rawProto).split(',')[0].trim() || 'https';
  return `${proto === 'http' ? 'https' : proto}://${host}`;
}

export function toIsoDateStr(val, fallback) {
  const safeFallback = /^\d{4}-\d{2}-\d{2}$/.test(String(fallback || ''))
    ? String(fallback)
    : new Date().toISOString().slice(0, 10);
  if (val === undefined || val === null || val === '') return safeFallback;
  if (typeof val === 'number' && Number.isFinite(val)) {
    const ms = val < 1e12 ? val * 1000 : val;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const parsed = Date.parse(str);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return safeFallback;
}

function fromFirestoreValue(v) {
  if (!v || typeof v !== 'object') return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return String(v.stringValue);
  if ('timestampValue' in v) return String(v.timestampValue);
  if ('arrayValue' in v) {
    const vals = Array.isArray(v.arrayValue?.values) ? v.arrayValue.values : [];
    return vals.map(fromFirestoreValue);
  }
  if ('mapValue' in v) {
    const out = {};
    const fields = v.mapValue?.fields || {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(fv);
    }
    return out;
  }
  return null;
}

function fromFirestoreDoc(docJson) {
  const out = {};
  const fields = docJson?.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function expandServerCourseIdAliases(cid) {
  if (cid === 'al-master-class-course-by-al-clipzone') {
    return [cid, 'Ai master class course by Ai clipzone'];
  }
  if (cid === 'Ai master class course by Ai clipzone') {
    return [cid, 'al-master-class-course-by-al-clipzone'];
  }
  return [cid];
}

function normServerTitle(val) {
  return String(val || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveServerCourseInstructor(course, instructors) {
  const safeList = Array.isArray(instructors) && instructors.length > 0 ? instructors : CORE_INSTRUCTORS;
  const aliases = expandServerCourseIdAliases(course.id);
  const hasCourse = (inst) =>
    Array.isArray(inst?.courseIds) && aliases.some((id) => inst.courseIds.includes(id));

  const byAssignedSubAdmin = safeList.find((i) => !i.isFounder && hasCourse(i));
  if (byAssignedSubAdmin) return byAssignedSubAdmin;

  const byExplicitSlug = course.instructorSlug
    ? safeList.find((i) => i.slug === slugifyText(course.instructorSlug))
    : undefined;
  if (byExplicitSlug) return byExplicitSlug;

  const byCourseId = safeList.find(hasCourse);
  if (byCourseId) return byCourseId;

  return safeList[0] || CORE_INSTRUCTORS[0];
}

function mergePublicInstructors(courses, subAdmins) {
  const bySlug = new Map();
  const BRAND_ALIAS_SLUGS = new Set([
    'ai-clipzone',
    'ai-clipzone-nepal',
    'al-clipzone',
    'hamro-lms',
    'hamrolms',
    'hamro-lms-nepal',
  ]);
  const subAdminOwnedCourseIds = new Set();
  const resolvedSubEntries = [];

  for (const sub of subAdmins) {
    if (!sub || sub.status !== 'active' || !sub.name) continue;
    const cleanName = String(sub.name).trim();
    const rawSlug = slugifyText(cleanName);
    if (!rawSlug || rawSlug === 'item') continue;

    const isBrandAlias = BRAND_ALIAS_SLUGS.has(rawSlug) || rawSlug === 'rajababu-mehta';
    const slug = isBrandAlias ? 'rajababu-mehta' : rawSlug;

    const rawIds = Array.from(
      new Set([
        ...(Array.isArray(sub.courseIds) ? sub.courseIds.map(String).filter(Boolean) : []),
        ...(sub.courseId ? [String(sub.courseId)] : []),
      ])
    );
    const expandedIds = new Set(rawIds.flatMap(expandServerCourseIdAliases));
    const rawTitles = new Set(
      [
        ...(Array.isArray(sub.courseTitles) ? sub.courseTitles : []),
        ...(sub.courseTitle ? [sub.courseTitle] : []),
      ]
        .map(normServerTitle)
        .filter(Boolean)
    );
    const assignedCourses = courses.filter(
      (c) => expandedIds.has(c.id) || (rawTitles.size > 0 && rawTitles.has(normServerTitle(c.title)))
    );
    const resolvedIds = Array.from(
      new Set(courses.length > 0 ? assignedCourses.map((c) => c.id) : rawIds)
    );

    if (!isBrandAlias) {
      for (const cid of resolvedIds) {
        for (const aliasId of expandServerCourseIdAliases(cid)) {
          subAdminOwnedCourseIds.add(aliasId);
        }
      }
    }

    resolvedSubEntries.push({
      sub,
      slug,
      cleanName,
      assignedCourses,
      courseIds: resolvedIds,
    });
  }

  for (const inst of CORE_INSTRUCTORS) {
    const matchedIds =
      courses.length > 0
        ? courses
            .filter(
              (c) =>
                !subAdminOwnedCourseIds.has(c.id) &&
                (c.instructorSlug === inst.slug ||
                  inst.courseIds.some((id) => expandServerCourseIdAliases(id).includes(c.id)))
            )
            .map((c) => c.id)
        : inst.courseIds.filter((id) => !subAdminOwnedCourseIds.has(id));
    bySlug.set(inst.slug, {
      ...inst,
      courseIds: Array.from(new Set(matchedIds)),
    });
  }

  for (const { sub, slug, cleanName, assignedCourses, courseIds } of resolvedSubEntries) {
    const existing = bySlug.get(slug);
    if (existing) {
      for (const cid of courseIds) {
        if (!existing.courseIds.includes(cid)) {
          existing.courseIds.push(cid);
        }
      }
      continue;
    }
    const primaryCourse = assignedCourses[0];
    const combinedLearn = Array.from(
      new Set(
        assignedCourses
          .flatMap((c) => (Array.isArray(c.learn) ? c.learn : []))
          .map((item) => String(item).trim())
          .filter(Boolean)
      )
    ).slice(0, 6);

    bySlug.set(slug, {
      slug,
      name: cleanName,
      role: 'Course Instructor & Mentor',
      headline:
        assignedCourses.length > 1
          ? `Course Instructor for ${assignedCourses.length} Courses on Hamro LMS Nepal`
          : primaryCourse
          ? `Course Instructor for ${primaryCourse.title}`
          : sub.courseTitle
          ? `Course Instructor for ${sub.courseTitle}`
          : 'Verified Course Instructor on Hamro LMS Nepal',
      bio:
        assignedCourses.length > 1
          ? `${cleanName} is the Course Instructor for ${assignedCourses.length} courses on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`
          : primaryCourse
          ? `${cleanName} is the Course Instructor for ${primaryCourse.title} on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`
          : `${cleanName} teaches practical lessons and mentors students on Hamro LMS Nepal.`,
      avatarUrl: sub.avatarUrl || '/institute-logo.png',
      languages: ['English'],
      courseIds,
      expertise: combinedLearn.length > 0 ? combinedLearn : ['Online Education', 'Digital Skills'],
      isFounder: false,
    });
  }

  for (const c of courses) {
    if (subAdminOwnedCourseIds.has(c.id)) continue;
    if (c.instructorName && c.instructorSlug) {
      const slug = slugifyText(c.instructorSlug);
      const existing = bySlug.get(slug);
      if (existing) {
        if (!existing.courseIds.includes(c.id)) existing.courseIds.push(c.id);
      } else {
        bySlug.set(slug, {
          slug,
          name: String(c.instructorName).trim(),
          role: 'Course Instructor',
          headline: `Instructor for ${c.title}`,
          bio: `${String(c.instructorName).trim()} teaches ${c.title} on Hamro LMS.`,
          avatarUrl: '/institute-logo.png',
          languages:
            c.language && !/nepali|hindi/i.test(c.language) ? [c.language] : ['English'],
          courseIds: [c.id],
          expertise: Array.isArray(c.learn) ? c.learn.slice(0, 4) : ['Online Education'],
          isFounder: false,
        });
      }
    }
  }
  return Array.from(bySlug.values());
}

async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 1800) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicCatalogSnapshot() {
  let deletedIds = [];
  let courses = [...SEED_COURSES];
  const subAdmins = [];
  let coursesSeeded = false;
  let siteSettings = null;
  let paymentQr = null;
  let liveFetched = false;

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents`;
    const [configJson, coursesJson, subAdminsJson, siteSettingsJson, paymentQrJson] = await Promise.all([
      fetchJsonWithTimeout(`${baseUrl}/system/config`),
      fetchJsonWithTimeout(`${baseUrl}/courses?pageSize=100`),
      fetchJsonWithTimeout(`${baseUrl}:runQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'sub_admins' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'status' },
                op: 'EQUAL',
                value: { stringValue: 'active' },
              },
            },
          },
        }),
      }),
      fetchJsonWithTimeout(`${baseUrl}/system/site_settings`),
      fetchJsonWithTimeout(`${baseUrl}/system/payment_qr`),
    ]);

    if (configJson?.fields) {
      liveFetched = true;
      const cfg = fromFirestoreDoc(configJson);
      coursesSeeded = Boolean(cfg.courses_seeded === true);
      if (Array.isArray(cfg.deletedCourseIds)) {
        deletedIds = cfg.deletedCourseIds.map(String);
      }
    }

    if (siteSettingsJson?.fields) {
      siteSettings = fromFirestoreDoc(siteSettingsJson);
    }

    if (paymentQrJson?.fields) {
      paymentQr = fromFirestoreDoc(paymentQrJson);
    }

    if (coursesJson && typeof coursesJson === 'object') {
      liveFetched = true;
      const docList = Array.isArray(coursesJson.documents) ? coursesJson.documents : [];
      if (docList.length > 0) {
        const liveCourses = [];
        for (const docItem of docList) {
          const d = fromFirestoreDoc(docItem);
          const docId = String(docItem?.name?.split('/').pop() || d.id || '');
          if (!docId || deletedIds.includes(docId) || d.isHidden === true) continue;
          const normalizedTitle = normalizeLegacyBrandText(String(d.title || 'Course'))
            .replace(/\s+/g, ' ')
            .trim();
          liveCourses.push({
            id: docId,
            slug: d.slug ? slugifyText(d.slug) : undefined,
            title: normalizedTitle || 'Course',
            seoTitle: d.seoTitle ? String(d.seoTitle) : undefined,
            seoDescription: d.seoDescription ? String(d.seoDescription) : undefined,
            overview: d.overview ? String(d.overview) : undefined,
            message: d.message ? normalizeLegacyBrandText(String(d.message)) : undefined,
            category: d.category ? String(d.category) : 'Online Course',
            level: d.level ? String(d.level) : 'All Levels',
            price: String(d.price || 'FREE'),
            amount: typeof d.amount === 'number' ? d.amount : 0,
            isFree: Boolean(d.isFree),
            isPopular: Boolean(d.isPopular),
            popularText: d.popularText ? String(d.popularText) : undefined,
            order: typeof d.order === 'number' ? d.order : 0,
            language:
              d.language && !/nepali|hindi/i.test(String(d.language))
                ? String(d.language)
                : 'English',
            instructorSlug: d.instructorSlug ? String(d.instructorSlug) : undefined,
            instructorName: d.instructorName ? String(d.instructorName) : undefined,
            includeCertificate: d.includeCertificate !== false,
            includeLive: Boolean(d.includeLive),
            learn: Array.isArray(d.learn) ? d.learn.map(String) : [],
            image: d.image ? String(d.image) : '/institute-logo.png',
            updatedAt: d.updatedAt || docItem.updateTime || undefined,
          });
        }
        courses = liveCourses.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      } else if (coursesSeeded) {
        courses = [];
      } else if (deletedIds.length > 0) {
        courses = courses.filter((c) => !deletedIds.includes(c.id));
      }
    } else if (deletedIds.length > 0) {
      courses = courses.filter((c) => !deletedIds.includes(c.id));
    }

    if (Array.isArray(subAdminsJson)) {
      for (const row of subAdminsJson) {
        if (!row?.document?.fields) continue;
        const d = fromFirestoreDoc(row.document);
        if (d.status !== 'active' || !d.name) continue;
        // Public-only fields; NEVER expose login `code` or `activeDeviceId`
        subAdmins.push({
          id: String(row.document.name?.split('/').pop() || ''),
          name: String(d.name),
          courseId: String(d.courseId || ''),
          courseTitle: String(d.courseTitle || ''),
          courseIds: Array.isArray(d.courseIds) ? d.courseIds.map(String).filter(Boolean) : [],
          courseTitles: Array.isArray(d.courseTitles) ? d.courseTitles.map(String).filter(Boolean) : [],
          avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
          status: 'active',
        });
      }
    }
  } catch {
    // Silent fallback to SEED_COURSES + CORE_INSTRUCTORS
  }

  const instructors = mergePublicInstructors(courses, subAdmins);
  return {
    courses,
    instructors,
    subAdmins,
    deletedCourseIds: deletedIds,
    coursesSeeded,
    siteSettings,
    paymentQr,
    liveFetched,
  };
}

export function buildSitemapXmlFromCatalog(origin, courses, instructors) {
  const today = new Date().toISOString().slice(0, 10);
  const specs = [
    { cleanPath: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
    { cleanPath: '/courses', lastmod: today, changefreq: 'daily', priority: '0.95' },
    { cleanPath: '/about-us', lastmod: today, changefreq: 'monthly', priority: '0.85' },
    { cleanPath: '/learn', lastmod: today, changefreq: 'monthly', priority: '0.85' },
    { cleanPath: '/instructors', lastmod: today, changefreq: 'weekly', priority: '0.85' },
    { cleanPath: '/blog', lastmod: today, changefreq: 'weekly', priority: '0.85' },
  ];

  // Dynamic public courses
  const seenCourseSlugs = new Set();
  for (const course of courses || []) {
    const slug = getCourseSlug(course);
    if (!slug || seenCourseSlugs.has(slug)) continue;
    seenCourseSlugs.add(slug);
    specs.push({
      cleanPath: `/courses/${slug}`,
      lastmod: toIsoDateStr(course.updatedAt, today),
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

  // Public instructor profiles
  const seenInstructorSlugs = new Set();
  for (const inst of instructors || []) {
    if (!inst?.slug || seenInstructorSlugs.has(inst.slug)) continue;
    seenInstructorSlugs.add(inst.slug);
    specs.push({
      cleanPath: `/instructors/${inst.slug}`,
      lastmod: today,
      changefreq: 'monthly',
      priority: '0.75',
    });
  }

  // Public blog category archive pages
  const seenCategorySlugs = new Set();
  for (const post of SEED_BLOG_POSTS) {
    const catSlug = slugifyText(post.category);
    if (!catSlug || seenCategorySlugs.has(catSlug)) continue;
    seenCategorySlugs.add(catSlug);
    specs.push({
      cleanPath: `/blog/category/${catSlug}`,
      lastmod: toIsoDateStr(post.updatedAt || post.publishedAt, today),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  // Public blog articles
  for (const post of SEED_BLOG_POSTS) {
    specs.push({
      cleanPath: `/blog/${post.slug}`,
      lastmod: toIsoDateStr(post.updatedAt || post.publishedAt, today),
      changefreq: 'monthly',
      priority: '0.8',
    });
  }

  // Legal / trust pages
  specs.push(
    { cleanPath: '/privacy-policy', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.7' },
    { cleanPath: '/terms', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.5' }
  );

  const urlNodes = [];
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

    const matchedCourse =
      spec.cleanPath.startsWith('/courses/')
        ? (courses || []).find((c) => `/courses/${getCourseSlug(c)}` === spec.cleanPath)
        : null;
    const imageXml =
      matchedCourse?.image
        ? `\n    <image:image>\n      <image:loc>${escapeXml(resolveAbsImg(matchedCourse.image, origin))}</image:loc>\n      <image:title>${escapeXml(matchedCourse.title)}</image:title>\n    </image:image>`
        : spec.cleanPath === '/'
        ? `\n    <image:image>\n      <image:loc>${escapeXml(`${origin}/institute-logo.png`)}</image:loc>\n      <image:title>HamroLms – Online Learning &amp; Digital Skill Courses</image:title>\n    </image:image>`
        : '';

    for (const loc of SUPPORTED_LOCALES) {
      const fullLoc = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
      urlNodes.push(
        `  <url>\n` +
          `    <loc>${escapeXml(fullLoc)}</loc>\n` +
          `    <lastmod>${escapeXml(spec.lastmod)}</lastmod>\n` +
          `    <changefreq>${spec.changefreq}</changefreq>\n` +
          `    <priority>${loc === 'en' ? spec.priority : (Number(spec.priority) * 0.9).toFixed(2)}</priority>\n` +
          `${alternatesXml}${imageXml}\n` +
          `  </url>`
      );
    }
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n` +
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n` +
    `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    `${urlNodes.join('\n')}\n` +
    `</urlset>\n`
  );
}

export async function generateSitemapXml(origin = DEFAULT_PUBLIC_ORIGIN) {
  try {
    const { courses, instructors } = await fetchPublicCatalogSnapshot();
    return buildSitemapXmlFromCatalog(origin, courses, instructors);
  } catch {
    return buildSitemapXmlFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS);
  }
}

export function generateRobotsTxt(origin = DEFAULT_PUBLIC_ORIGIN) {
  const safeOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const privateDisallows = [
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /classroom',
    'Disallow: /account',
    'Disallow: /enroll',
    'Disallow: /live',
    'Disallow: /ask',
    'Disallow: /delete-account',
  ];

  const aiCrawlers = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'ClaudeBot',
    'anthropic-ai',
    'Google-Extended',
    'Applebot-Extended',
  ];

  return [
    'User-agent: *',
    'Allow: /',
    ...privateDisallows,
    '',
    ...aiCrawlers.flatMap((bot) => [
      `User-agent: ${bot}`,
      'Allow: /',
      'Allow: /llms.txt',
      'Allow: /llms-full.txt',
      ...privateDisallows,
      '',
    ]),
    `Sitemap: ${safeOrigin}/sitemap.xml`,
    `# LLMs Context: ${safeOrigin}/llms.txt`,
    `# Full LLMs Context: ${safeOrigin}/llms-full.txt`,
    '',
  ].join('\n');
}

export function buildLlmsTxtFromCatalog(origin, courses, instructors, isFull = false) {
  const safeOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const safeCourses = Array.isArray(courses) && courses.length > 0 ? courses : SEED_COURSES;
  const safeInstructors =
    Array.isArray(instructors) && instructors.length > 0 ? instructors : CORE_INSTRUCTORS;

  const lines = [
    '# HamroLms',
    '',
    '> HamroLms (also known as Hamro LMS) is an online learning management system in Nepal offering practical digital skill courses in AI tools, prompt engineering, video editing, graphic design, YouTube growth, and web development, taught in English by verified instructors with structured video modules, downloadable PDF notes, and certificates.',
    '',
    '## Platform Facts',
    `- Official Website: ${safeOrigin}/`,
    `- Course Catalog: ${safeOrigin}/courses`,
    `- Instructors Directory: ${safeOrigin}/instructors`,
    `- Learning Blog & Tutorials: ${safeOrigin}/blog`,
    `- About Us: ${safeOrigin}/about-us`,
    `- Learning Pathway: ${safeOrigin}/learn`,
    `- Privacy Policy: ${safeOrigin}/privacy-policy`,
    `- Terms of Use: ${safeOrigin}/terms`,
    '- Primary Language: English',
    '- Support Email: support.hamrolms@gmail.com',
    '- Region Served: Nepal and global online learners',
    '- Format: Self-paced HD video chapters, downloadable PDF notes, live workshops (course-dependent), and digital certificates of completion',
    '',
    '## Online Courses',
  ];

  for (const c of safeCourses) {
    const cUrl = `${safeOrigin}/courses/${getCourseSlug(c)}`;
    const priceLabel = c.isFree || c.amount === 0 ? 'Free' : c.price || 'Paid';
    const resolvedInst = resolveServerCourseInstructor(c, safeInstructors);
    const instName = resolvedInst?.name || c.instructorName;
    const instLabel = instName ? ` | Instructor: ${instName}` : '';
    const desc = c.overview || c.seoDescription || `Structured online course covering ${c.category || 'digital skills'}.`;
    lines.push(`- [${c.title}](${cUrl}) (${priceLabel}${instLabel}): ${desc}`);
    if (isFull && Array.isArray(c.learn) && c.learn.length > 0) {
      lines.push(`  - Key Skills Covered: ${c.learn.join('; ')}`);
    }
  }

  lines.push('', '## Verified Instructors');
  for (const inst of safeInstructors) {
    const instUrl = `${safeOrigin}/instructors/${inst.slug}`;
    lines.push(`- [${inst.name}](${instUrl}) – ${inst.role}: ${inst.bio}`);
    if (isFull && Array.isArray(inst.expertise) && inst.expertise.length > 0) {
      lines.push(`  - Expertise: ${inst.expertise.join(', ')}`);
    }
  }

  lines.push('', '## Learning Guides & Blog Articles');
  for (const post of SEED_BLOG_POSTS) {
    const postUrl = `${safeOrigin}/blog/${post.slug}`;
    lines.push(`- [${post.title}](${postUrl}) (${post.category}): ${post.excerpt}`);
    if (isFull && post.seoDescription) {
      lines.push(`  - Summary: ${post.seoDescription}`);
    }
  }

  if (isFull) {
    lines.push(
      '',
      '## Frequently Asked Questions',
      '- What is HamroLms? HamroLms is an online learning platform in Nepal designed for students, creators, and professionals seeking practical digital skills in AI tools, video production, and web development.',
      '- How do students enroll in HamroLms courses? Students choose a course from the catalog, complete enrollment (free or via QR/eSewa payment), and activate their access key in the student portal to unlock HD video lessons and study notes.',
      '- Do HamroLms courses include certificates? Eligible self-paced courses include a verifiable Certificate of Completion once enrolled.'
    );
  }

  lines.push('', `Sitemap: ${safeOrigin}/sitemap.xml`, '');
  return lines.join('\n');
}

export async function generateLlmsDocument(origin = DEFAULT_PUBLIC_ORIGIN, isFull = false) {
  try {
    const { courses, instructors } = await fetchPublicCatalogSnapshot();
    return buildLlmsTxtFromCatalog(origin, courses, instructors, isFull);
  } catch {
    return buildLlmsTxtFromCatalog(origin, SEED_COURSES, CORE_INSTRUCTORS, isFull);
  }
}

function clampSeoText(text, maxLen) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const sliced = clean.slice(0, maxLen - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > Math.floor(maxLen * 0.6) ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

function resolveAbsImg(img, origin) {
  const cleanOrigin = String(origin || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, '');
  const raw = String(img || '').trim();
  if (!raw) return `${cleanOrigin}/institute-logo.png`;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${cleanOrigin}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

export async function injectRouteSeoMeta(html, pathname, origin = DEFAULT_PUBLIC_ORIGIN) {
  const parsed = parsePathnameToRoute(pathname);
  const dict = SEO_LOCALE_TEXT[parsed.locale] || SEO_LOCALE_TEXT.en;
  const {
    courses,
    instructors,
    subAdmins,
    deletedCourseIds,
    coursesSeeded,
    siteSettings,
    paymentQr,
    liveFetched,
  } = await fetchPublicCatalogSnapshot();

  let statusCode = 200;
  let title = dict.homeTitle;
  let description = dict.homeDescription;
  let keywords = 'HamroLms, Hamro LMS, Learn AI in Nepal, Best Coding Bootcamp Kathmandu, Online Skill Training, HamroLms Nepal, Online Learning, Digital Skill Courses, AI Course, Video Editing, Web Development';
  let ogType = 'website';
  let ogImage = `${origin}/institute-logo.png`;
  let ogImageAlt = 'HamroLms – Online Learning & Digital Skill Courses';
  let articleMeta = null;
  let robots = parsed.isPublicIndexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    : 'noindex, nofollow';

  const breadcrumbItems = [
    { name: 'Home', url: `${origin}${buildLocalizedPath('/', parsed.locale)}` },
  ];
  const extraSchemas = [];

  if (parsed.view === 'course-detail') {
    const course = findCourseBySlug(courses, parsed.slug);
    if (!course) {
      statusCode = 404;
      title = dict.notFoundTitle;
      description = dict.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      const cSlug = getCourseSlug(course);
      const courseUrl = `${origin}${buildLocalizedPath(`/courses/${cSlug}`, parsed.locale)}`;
      const inst = resolveServerCourseInstructor(course, instructors);
      title =
        (course.seoTitle && course.seoTitle.trim()) ||
        clampSeoText(`${course.title}${course.category ? ` – ${course.category}` : ''} | Hamro LMS`, 64);
      const topics = Array.isArray(course.learn) ? course.learn.slice(0, 3).join(', ') : '';
      const langNote = course.language ? ` in ${course.language}` : '';
      const instNote = inst?.name ? ` taught by ${inst.name}` : '';
      const fallbackDesc = course.overview?.trim()
        ? `${course.overview.trim()}${langNote}${instNote}.`
        : `Enroll in ${course.title} on Hamro LMS Nepal${instNote}. Covers ${topics || 'practical digital skills'}${langNote}.`;
      description = clampSeoText((course.seoDescription && course.seoDescription.trim()) || fallbackDesc, 160);
      keywords = Array.from(
        new Set([
          course.title,
          course.category || 'Online Course Nepal',
          'Hamro LMS',
          'Hamro LMS Nepal',
          ...(Array.isArray(course.learn) ? course.learn.slice(0, 4) : []),
          inst?.name || '',
        ].filter(Boolean))
      ).join(', ');
      ogImage = resolveAbsImg(course.image, origin);
      ogImageAlt = `${course.title} – ${course.category || 'Online Course'} on Hamro LMS Nepal`;
      breadcrumbItems.push({ name: course.title, url: courseUrl });
      extraSchemas.push({
        '@type': 'Course',
        '@id': `${courseUrl}#course`,
        url: courseUrl,
        name: course.title,
        description,
        image: ogImage,
        inLanguage:
          course.language && !/nepali|hindi/i.test(course.language) ? course.language : 'en',
        courseCode: course.id,
        educationalLevel: course.level || 'All Levels',
        provider: {
          '@type': 'EducationalOrganization',
          '@id': `${origin}/#organization`,
          name: 'Hamro LMS',
          url: origin,
        },
        ...(inst
          ? {
              instructor: {
                '@type': 'Person',
                name: inst.name,
                url: `${origin}${buildLocalizedPath(`/instructors/${inst.slug}`, parsed.locale)}`,
              },
            }
          : {}),
      });
    }
  } else if (parsed.view === 'instructors') {
    title = dict.instructorsTitle;
    description = dict.instructorsDescription;
    ogImageAlt = 'Teachers and Instructors on Hamro LMS Nepal';
    breadcrumbItems.push({
      name: 'Instructors',
      url: `${origin}${buildLocalizedPath('/instructors', parsed.locale)}`,
    });
  } else if (parsed.view === 'instructor-detail') {
    const targetSlug = slugifyText(parsed.slug || '');
    const inst =
      instructors.find((i) => i.slug === targetSlug) ||
      CORE_INSTRUCTORS.find((i) => i.slug === targetSlug);
    if (!inst) {
      statusCode = 404;
      title = dict.notFoundTitle;
      description = dict.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      const instUrl = `${origin}${buildLocalizedPath(`/instructors/${inst.slug}`, parsed.locale)}`;
      title = clampSeoText(`${inst.name} – ${inst.role} | Hamro LMS`, 64);
      description = clampSeoText(inst.bio, 160);
      keywords = `${inst.name}, ${inst.role}, ${(inst.expertise || []).slice(0, 3).join(', ')}, Hamro LMS`;
      ogImage = resolveAbsImg(inst.avatarUrl, origin);
      ogImageAlt = `${inst.name} – ${inst.role} at Hamro LMS`;
      breadcrumbItems.push(
        { name: 'Instructors', url: `${origin}${buildLocalizedPath('/instructors', parsed.locale)}` },
        { name: inst.name, url: instUrl }
      );
      extraSchemas.push({
        '@type': 'Person',
        '@id': `${instUrl}#person`,
        name: inst.name,
        jobTitle: inst.role,
        description: inst.bio,
        url: instUrl,
        image: ogImage,
        worksFor: { '@id': `${origin}/#organization` },
      });
    }
  } else if (parsed.view === 'blog') {
    breadcrumbItems.push({
      name: 'Blog',
      url: `${origin}${buildLocalizedPath('/blog', parsed.locale)}`,
    });
    if (parsed.category) {
      const matchedPosts = SEED_BLOG_POSTS.filter(
        (p) => slugifyText(p.category) === slugifyText(parsed.category)
      );
      if (matchedPosts.length === 0) {
        statusCode = 404;
        title = dict.notFoundTitle;
        description = dict.notFoundDescription;
        robots = 'noindex, nofollow';
      } else {
        const categoryName = matchedPosts[0].category;
        title = `${categoryName} Guides & Tutorials | Hamro LMS`;
        description = clampSeoText(
          `Explore ${matchedPosts.length} ${categoryName} guides on Hamro LMS Nepal, including ${matchedPosts.slice(0, 2).map((p) => p.title).join(' and ')}.`,
          160
        );
        keywords = `${categoryName}, Hamro LMS Blog, Online Courses Nepal, Digital Skills`;
        ogImageAlt = `${categoryName} Learning Guides on Hamro LMS`;
        breadcrumbItems.push({
          name: categoryName,
          url: `${origin}${buildLocalizedPath(`/blog/category/${slugifyText(categoryName)}`, parsed.locale)}`,
        });
      }
    } else {
      title = dict.blogTitle;
      description = dict.blogDescription;
      ogImageAlt = 'Hamro LMS Learning Blog & Practical AI Guides';
    }
  } else if (parsed.view === 'blog-detail') {
    const post = SEED_BLOG_POSTS.find((p) => p.slug === String(parsed.slug || '').toLowerCase());
    if (!post) {
      statusCode = 404;
      title = dict.notFoundTitle;
      description = dict.notFoundDescription;
      robots = 'noindex, nofollow';
    } else {
      const postUrl = `${origin}${buildLocalizedPath(`/blog/${post.slug}`, parsed.locale)}`;
      title = post.seoTitle || clampSeoText(`${post.title} | Hamro LMS`, 64);
      description = clampSeoText(post.seoDescription || post.excerpt || `${post.title} on Hamro LMS Nepal.`, 160);
      keywords = Array.from(new Set([post.category, ...(post.tags || []), 'Hamro LMS', 'Hamro LMS Blog'])).join(', ');
      ogType = 'article';
      ogImage = resolveAbsImg(post.coverImage, origin);
      ogImageAlt = post.coverAlt || `${post.title} – ${post.category} Guide on Hamro LMS`;
      articleMeta = {
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt || post.publishedAt,
        section: post.category,
        author: post.authorName || 'Rajababu Mehta',
        tags: Array.isArray(post.tags) ? post.tags : [],
      };
      breadcrumbItems.push(
        { name: 'Blog', url: `${origin}${buildLocalizedPath('/blog', parsed.locale)}` },
        { name: post.title, url: postUrl }
      );
      extraSchemas.push({
        '@type': 'Article',
        '@id': `${postUrl}#article`,
        headline: post.title,
        description,
        image: ogImage,
        datePublished: post.publishedAt,
        dateModified: post.updatedAt || post.publishedAt,
        articleSection: post.category,
        author: {
          '@type': 'Person',
          name: post.authorName || 'Rajababu Mehta',
          url: `${origin}${buildLocalizedPath(`/instructors/${post.authorSlug || 'rajababu-mehta'}`, parsed.locale)}`,
        },
        publisher: { '@id': `${origin}/#organization` },
        mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
      });
    }
  } else if (parsed.view === 'courses') {
    title = dict.coursesTitle;
    description = dict.coursesDescription;
    ogImageAlt = 'Course Catalog – HamroLms';
    breadcrumbItems.push({
      name: 'Course',
      url: `${origin}${buildLocalizedPath('/courses', parsed.locale)}`,
    });
    const buildRichCourseItem = (c) => {
      const cUrl = `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale)}`;
      const isFree = c.isFree === true || c.amount === 0 || /^free$/i.test(String(c.price || '').trim());
      const priceVal = isFree ? 0 : Number(c.amount ?? String(c.price || '').replace(/[^\d.]/g, '')) || 0;
      return {
        '@type': 'Course',
        '@id': `${cUrl}#course`,
        name: c.title,
        description: c.seoDescription || c.overview || `${c.title} online course on HamroLms.`,
        url: cUrl,
        image: resolveAbsImg(c.image, origin),
        inLanguage: 'en',
        educationalLevel: c.level || 'All Levels',
        teaches: Array.isArray(c.learn) ? c.learn.slice(0, 6) : [],
        provider: { '@id': `${origin}/#organization` },
        offers: {
          '@type': 'Offer',
          category: isFree ? 'Free' : 'Paid',
          priceCurrency: 'NPR',
          price: priceVal,
          availability: 'https://schema.org/InStock',
          url: cUrl,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: c.includeLive ? 'Blended' : 'Online',
        },
      };
    };

    extraSchemas.push({
      '@type': 'ItemList',
      '@id': `${origin}/courses#course-catalog`,
      name: 'Online Courses on HamroLms',
      numberOfItems: courses.length,
      itemListElement: courses.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale)}`,
        item: buildRichCourseItem(c),
      })),
    });
  } else if (parsed.view === 'about-us') {
    title = dict.aboutTitle;
    description = dict.aboutDescription;
    ogImageAlt = 'About Us – HamroLms';
    breadcrumbItems.push({
      name: 'About Us',
      url: `${origin}${buildLocalizedPath('/about-us', parsed.locale)}`,
    });
  } else if (parsed.view === 'learn') {
    title = dict.learnTitle;
    description = dict.learnDescription;
    ogImageAlt = 'Learn. Apply. Grow. – HamroLms';
    breadcrumbItems.push({
      name: 'Learn. Apply. Grow.',
      url: `${origin}${buildLocalizedPath('/learn', parsed.locale)}`,
    });
  } else if (parsed.view === 'privacy-policy') {
    title = 'Privacy Policy | HamroLms';
    description =
      'Read how HamroLms protects student privacy, enrollment records, course credentials, and account security across our online learning platform.';
    breadcrumbItems.push({
      name: 'Privacy Policy',
      url: `${origin}${buildLocalizedPath('/privacy-policy', parsed.locale)}`,
    });
  } else if (parsed.view === 'terms') {
    title = 'Terms of Use | HamroLms';
    description =
      'Review HamroLms online learning platform terms of use, course enrollment policy, intellectual property rules, and learner guidelines.';
    breadcrumbItems.push({
      name: 'Terms of Use',
      url: `${origin}${buildLocalizedPath('/terms', parsed.locale)}`,
    });
  } else if (parsed.view === 'not-found') {
    statusCode = 404;
    title = dict.notFoundTitle;
    description = dict.notFoundDescription;
    robots = 'noindex, nofollow';
  } else if (!parsed.isPublicIndexable) {
    robots = 'noindex, nofollow';
  } else {
    const buildRichCourseItem = (c) => {
      const cUrl = `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale)}`;
      const isFree = c.isFree === true || c.amount === 0 || /^free$/i.test(String(c.price || '').trim());
      const priceVal = isFree ? 0 : Number(c.amount ?? String(c.price || '').replace(/[^\d.]/g, '')) || 0;
      return {
        '@type': 'Course',
        '@id': `${cUrl}#course`,
        name: c.title,
        description: c.seoDescription || c.overview || `${c.title} online course on HamroLms.`,
        url: cUrl,
        image: resolveAbsImg(c.image, origin),
        inLanguage: 'en',
        educationalLevel: c.level || 'All Levels',
        teaches: Array.isArray(c.learn) ? c.learn.slice(0, 6) : [],
        provider: { '@id': `${origin}/#organization` },
        offers: {
          '@type': 'Offer',
          category: isFree ? 'Free' : 'Paid',
          priceCurrency: 'NPR',
          price: priceVal,
          availability: 'https://schema.org/InStock',
          url: cUrl,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: c.includeLive ? 'Blended' : 'Online',
        },
      };
    };

    extraSchemas.push({
      '@type': 'ItemList',
      '@id': `${origin}/#course-catalog`,
      name: 'Online Courses on HamroLms',
      numberOfItems: courses.length,
      itemListElement: courses.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale)}`,
        item: buildRichCourseItem(c),
      })),
    });
  }

  const canonicalPath =
    statusCode === 404
      ? String(pathname || '/').split('?')[0]
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

  const articleTags =
    ogType === 'article' && articleMeta
      ? [
          articleMeta.publishedTime
            ? `<meta property="article:published_time" content="${escapeHtmlAttr(articleMeta.publishedTime)}" />`
            : '',
          articleMeta.modifiedTime
            ? `<meta property="article:modified_time" content="${escapeHtmlAttr(articleMeta.modifiedTime)}" />`
            : '',
          articleMeta.section
            ? `<meta property="article:section" content="${escapeHtmlAttr(articleMeta.section)}" />`
            : '',
          articleMeta.author
            ? `<meta property="article:author" content="${escapeHtmlAttr(articleMeta.author)}" />`
            : '',
          ...articleMeta.tags.map(
            (t) => `<meta property="article:tag" content="${escapeHtmlAttr(t)}" />`
          ),
        ]
          .filter(Boolean)
          .join('\n    ')
      : '';

  const siteNavItems = [
    { name: 'Home', url: `${origin}${buildLocalizedPath('/', parsed.locale)}` },
    { name: 'Course', url: `${origin}${buildLocalizedPath('/courses', parsed.locale)}` },
    { name: 'Privacy Policy', url: `${origin}${buildLocalizedPath('/privacy-policy', parsed.locale)}` },
    { name: 'About Us', url: `${origin}${buildLocalizedPath('/about-us', parsed.locale)}` },
    { name: 'Learn. Apply. Grow.', url: `${origin}${buildLocalizedPath('/learn', parsed.locale)}` },
  ];

  const isHomeRoute = parsed.view === 'home';

  const dynamicGraphScript = `<script id="dynamic-hamrolms-jsonld" type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'EducationalOrganization'],
        '@id': `${origin}/#organization`,
        name: 'HamroLms',
        alternateName: ['Hamro LMS', 'HamroLms Nepal'],
        url: `${origin}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${origin}/institute-logo.png`,
          width: 1600,
          height: 1600,
        },
        image: `${origin}/institute-logo.png`,
        description:
          'HamroLms is an online learning platform in Nepal offering practical courses in AI tools, prompt engineering, video editing, graphic design, YouTube growth, and web development taught by verified instructors.',
        email: 'support.hamrolms@gmail.com',
        areaServed: {
          '@type': 'Country',
          name: 'Nepal',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            email: 'support.hamrolms@gmail.com',
            contactType: 'customer support',
            availableLanguage: ['English'],
          },
        ],
        founder: {
          '@type': 'Person',
          '@id': `${origin}/instructors/rajababu-mehta#person`,
          name: 'Rajababu Mehta',
          jobTitle: 'Founder & Lead AI Instructor',
          url: `${origin}/instructors/rajababu-mehta`,
        },
        knowsAbout: [
          'Artificial Intelligence Tools',
          'Prompt Engineering',
          'Video Editing',
          'Graphic Design',
          'YouTube Content Creation',
          'Web Development',
        ],
        sameAs: [
          `${origin}/`,
          'https://rajababumehta.com.np',
          'https://www.facebook.com/profile.php?id=61583901232576',
        ],
      },
      ...(isHomeRoute
        ? [
            {
              '@type': 'WebApplication',
              '@id': `${origin}/#webapp`,
              name: 'HamroLms',
              url: `${origin}/`,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'All',
              browserRequirements: 'Requires JavaScript. Requires HTML5.',
              description: dict.homeDescription,
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'NPR',
              },
            },
            {
              '@type': 'WebSite',
              '@id': `${origin}/#website`,
              url: `${origin}${buildLocalizedPath('/', parsed.locale)}`,
              name: 'HamroLms',
              alternateName: ['Hamro LMS', 'HamroLms Nepal'],
              inLanguage: 'en',
              description: dict.homeDescription,
              publisher: { '@id': `${origin}/#organization` },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${origin}/?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'ItemList',
              '@id': `${origin}/#site-navigation`,
              name: 'HamroLms Site Navigation',
              itemListElement: siteNavItems.map((item, idx) => ({
                '@type': 'SiteNavigationElement',
                position: idx + 1,
                name: item.name,
                url: item.url,
              })),
            },
            {
              '@type': 'FAQPage',
              '@id': `${origin}/#platform-faq`,
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is HamroLms?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'HamroLms is an online learning platform and learning management system in Nepal offering practical digital skill courses in AI tools, prompt engineering, video editing, graphic design, and web development taught in English by verified instructors.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'What courses are available on HamroLms?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: `HamroLms offers structured courses including ${courses
                      .slice(0, 5)
                      .map((c) => c.title)
                      .join(', ')} with step-by-step video chapters and downloadable study notes.`,
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Do HamroLms courses include certificates?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Yes. Eligible self-paced courses on HamroLms provide a verifiable digital Certificate of Completion in the student dashboard.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How do students enroll and access lessons on HamroLms?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Students select a course from the HamroLms catalog, complete enrollment (free or paid), and enter their activation code inside the student profile to unlock all HD video lectures and PDF study guides.',
                  },
                },
              ],
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.url,
        })),
      },
      ...extraSchemas,
    ],
  }).replace(/<\/script/gi, '<\\/script')}</script>`;

  // Rich, semantic, citation-ready SSR shell inside #root for search crawlers & GEO AI engines
  // (Cleanly replaced by React createRoot on client mount)
  const ssrNavHtml = [
    ...siteNavItems,
    { name: 'Instructors', url: `${origin}${buildLocalizedPath('/instructors', parsed.locale)}` },
    { name: 'Blog', url: `${origin}${buildLocalizedPath('/blog', parsed.locale)}` },
    { name: 'Terms of Use', url: `${origin}${buildLocalizedPath('/terms', parsed.locale)}` },
  ]
    .map(
      (item) =>
        `<a href="${escapeHtmlAttr(item.url.replace(origin, '') || '/')}" style="color:#60a5fa;margin-right:16px;text-decoration:none;font-weight:600;">${escapeHtmlAttr(item.name)}</a>`
    )
    .join('');

  const ssrCourseCardsHtml = courses
    .slice(0, 12)
    .map((c) => {
      const cHref = buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale);
      const priceText = c.isFree || c.amount === 0 ? 'Free' : c.price || 'Enroll Now';
      const cImg = resolveAbsImg(c.image, origin);
      const cOverview = c.overview || c.seoDescription || `Structured online training in ${c.category || 'digital skills'} on HamroLms.`;
      const learnList = Array.isArray(c.learn) && c.learn.length > 0
        ? `<ul>${c.learn.slice(0, 6).map((item) => `<li>${escapeHtmlAttr(item)}</li>`).join('')}</ul>`
        : '';
      const resolvedCourseInst = resolveServerCourseInstructor(c, instructors);
      const displayInstructorName = resolvedCourseInst?.name || c.instructorName;
      return `<article style="margin-bottom:24px;padding:16px;border:1px solid #27272a;border-radius:12px;"><img src="${escapeHtmlAttr(cImg)}" alt="${escapeHtmlAttr(c.title)} – Online Course on HamroLms" width="640" height="360" style="max-width:100%;height:auto;border-radius:8px;" /><h3><a href="${escapeHtmlAttr(cHref)}" style="color:#93c5fd;">${escapeHtmlAttr(c.title)}</a></h3><p><strong>Category:</strong> ${escapeHtmlAttr(c.category || 'Digital Skills')} | <strong>Level:</strong> ${escapeHtmlAttr(c.level || 'All Levels')} | <strong>Price:</strong> ${escapeHtmlAttr(priceText)}${displayInstructorName ? ` | <strong>Instructor:</strong> ${escapeHtmlAttr(displayInstructorName)}` : ''}</p><p>${escapeHtmlAttr(cOverview)}</p>${learnList}</article>`;
    })
    .join('');

  const ssrInstructorsHtml = instructors
    .slice(0, 8)
    .map(
      (inst) =>
        `<article style="margin-bottom:16px;"><h3><a href="${escapeHtmlAttr(buildLocalizedPath(`/instructors/${inst.slug}`, parsed.locale))}" style="color:#93c5fd;">${escapeHtmlAttr(inst.name)}</a></h3><p><strong>Role:</strong> ${escapeHtmlAttr(inst.role)}</p><p>${escapeHtmlAttr(inst.bio)}</p></article>`
    )
    .join('');

  const ssrBlogHtml = SEED_BLOG_POSTS.map(
    (post) =>
      `<article style="margin-bottom:14px;"><h3><a href="${escapeHtmlAttr(buildLocalizedPath(`/blog/${post.slug}`, parsed.locale))}" style="color:#93c5fd;">${escapeHtmlAttr(post.title)}</a></h3><p>${escapeHtmlAttr(post.excerpt)}</p></article>`
  ).join('');

  let ssrBodyHtml = `<section style="margin-top:20px;"><h1>${escapeHtmlAttr(title)}</h1><p style="color:#d4d4d8;">${escapeHtmlAttr(description)}</p></section>`;

  if (parsed.view === 'home' || parsed.view === 'courses') {
    ssrBodyHtml = `
      <section style="margin-top:20px;">
        <h1>${escapeHtmlAttr(parsed.view === 'courses' ? 'Course Catalog – HamroLms Online Courses' : 'HamroLms – Online Learning & Digital Skill Courses')}</h1>
        <p style="color:#d4d4d8;">${escapeHtmlAttr(description)}</p>
        <p style="color:#a1a1aa;">HamroLms (Hamro LMS) is a practical online learning platform in Nepal built for students, creators, and professionals who want hands-on training in generative AI tools, prompt engineering, video editing, graphic design, YouTube growth, and modern web development.</p>
      </section>
      <section style="margin-top:24px;">
        <h2>Featured Online Courses</h2>
        ${ssrCourseCardsHtml}
      </section>
      <section style="margin-top:24px;">
        <h2>Key Facts About HamroLms</h2>
        <dl>
          <dt><strong>Platform Type</strong></dt><dd>Multi-instructor Online Learning Management System (LMS) in Nepal</dd>
          <dt><strong>Course Language</strong></dt><dd>English</dd>
          <dt><strong>Learning Materials</strong></dt><dd>Chapter-wise HD video lectures, downloadable PDF notes, and live mentor sessions</dd>
          <dt><strong>Certification</strong></dt><dd>Verifiable digital Certificate of Completion on eligible courses</dd>
          <dt><strong>Support Contact</strong></dt><dd>support.hamrolms@gmail.com</dd>
        </dl>
      </section>
      <section style="margin-top:24px;">
        <h2>Verified Instructors &amp; Mentors</h2>
        ${ssrInstructorsHtml}
      </section>
      <section style="margin-top:24px;">
        <h2>Practical Learning Guides</h2>
        ${ssrBlogHtml}
      </section>`;
  } else if (parsed.view === 'course-detail') {
    const targetCourse = findCourseBySlug(courses, parsed.slug);
    if (targetCourse) {
      const priceText = targetCourse.isFree || targetCourse.amount === 0 ? 'Free' : targetCourse.price || 'Available';
      const learnItems = Array.isArray(targetCourse.learn)
        ? `<ul>${targetCourse.learn.map((item) => `<li>${escapeHtmlAttr(item)}</li>`).join('')}</ul>`
        : '';
      const resolvedTargetInst = resolveServerCourseInstructor(targetCourse, instructors);
      const displayTargetInstName = resolvedTargetInst?.name || targetCourse.instructorName;
      ssrBodyHtml = `
        <article style="margin-top:20px;">
          <img src="${escapeHtmlAttr(resolveAbsImg(targetCourse.image, origin))}" alt="${escapeHtmlAttr(targetCourse.title)}" width="640" height="360" style="max-width:100%;height:auto;border-radius:12px;" />
          <h1>${escapeHtmlAttr(targetCourse.title)}</h1>
          <p>${escapeHtmlAttr(targetCourse.overview || description)}</p>
          <h2>Course Details</h2>
          <p><strong>Category:</strong> ${escapeHtmlAttr(targetCourse.category || 'Digital Skills')} | <strong>Level:</strong> ${escapeHtmlAttr(targetCourse.level || 'All Levels')} | <strong>Price:</strong> ${escapeHtmlAttr(priceText)}${displayTargetInstName ? ` | <strong>Instructor:</strong> ${escapeHtmlAttr(displayTargetInstName)}` : ''}</p>
          <h2>What You Will Learn</h2>
          ${learnItems}
        </article>`;
    }
  } else if (parsed.view === 'instructors') {
    ssrBodyHtml = `<section style="margin-top:20px;"><h1>Instructors &amp; Teachers Directory | HamroLms</h1><p>${escapeHtmlAttr(description)}</p><h2>Meet Our Educators</h2>${ssrInstructorsHtml}</section>`;
  } else if (parsed.view === 'blog') {
    ssrBodyHtml = `<section style="margin-top:20px;"><h1>HamroLms Learning Blog &amp; Guides</h1><p>${escapeHtmlAttr(description)}</p><h2>Latest Tutorials</h2>${ssrBlogHtml}</section>`;
  } else if (parsed.view === 'about-us') {
    ssrBodyHtml = `<section style="margin-top:20px;"><h1>About Us – HamroLms Online Learning Platform</h1><p>${escapeHtmlAttr(description)}</p><h2>Learn Practically</h2><p>Every HamroLms program focuses on step-by-step workflows in AI tools, video production, graphic design, and web development.</p><h2>Verified Instructors &amp; Certificates</h2><p>Courses are taught by experienced educators and include downloadable study handbooks and digital certificates.</p></section>`;
  } else if (parsed.view === 'learn') {
    ssrBodyHtml = `<section style="margin-top:20px;"><h1>Learn. Apply. Grow. – HamroLms</h1><p>${escapeHtmlAttr(description)}</p><h2>Structured Learning Pathway</h2><p>Master practical AI workflows, build creative media projects, and earn verified digital skill credentials.</p></section>`;
  }

  const ssrFooterHtml = `<footer style="margin-top:32px;padding-top:16px;border-top:1px solid #27272a;color:#a1a1aa;font-size:13px;"><p>&copy; ${new Date().getFullYear()} HamroLms. Support: <a href="mailto:support.hamrolms@gmail.com" style="color:#60a5fa;">support.hamrolms@gmail.com</a></p><nav aria-label="Footer Navigation">${ssrNavHtml} <a href="/sitemap.xml" style="color:#60a5fa;margin-right:16px;">Sitemap</a> <a href="/llms.txt" style="color:#60a5fa;">LLMs.txt</a></nav></footer>`;

  const ssrShellHtml = parsed.isPublicIndexable
    ? `<div id="root"><main style="max-width:960px;margin:32px auto;padding:20px;font-family:Inter,system-ui,sans-serif;color:#f4f4f5;background:#000;"><header><nav aria-label="Primary Site Navigation">${ssrNavHtml}</nav></header>${ssrBodyHtml}${ssrFooterHtml}</main></div>`
    : '<div id="root"></div>';

  let updated = html;
  updated = updated.replace(/<html lang="[^"]*"/i, `<html lang="${escapeHtmlAttr(dict.htmlLang)}"`);
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
  updated = updated.replace(
    /<meta name="title" content="[^"]*"\s*\/?>/i,
    `<meta name="title" content="${escapeHtmlAttr(title)}" />`
  );
  updated = updated.replace(
    /<meta name="description" content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(description)}" />`
  );
  updated = updated.replace(/<meta name="keywords" content="[^"]*"\s*\/?>\s*/gi, '');
  updated = updated.replace(
    /<meta name="robots" content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${escapeHtmlAttr(robots)}" />`
  );
  updated = updated.replace(
    /<meta name="googlebot" content="[^"]*"\s*\/?>/i,
    `<meta name="googlebot" content="${escapeHtmlAttr(robots)}" />`
  );
  updated = updated.replace(
    /<meta name="bingbot" content="[^"]*"\s*\/?>/i,
    `<meta name="bingbot" content="${escapeHtmlAttr(robots)}" />`
  );
  updated = updated.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`
  );
  updated = updated.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*"\s*\/?>\s*/gi, '');
  updated = updated.replace(/<meta property="article:[^"]*" content="[^"]*"\s*\/?>\s*/gi, '');
  updated = updated.replace(/<script id="dynamic-hamrolms-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '');
  updated = updated.replace(
    /<meta property="og:site_name" content="[^"]*"\s*\/?>/i,
    `<meta property="og:site_name" content="HamroLms" />`
  );
  updated = updated.replace(
    /<meta property="og:type" content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${escapeHtmlAttr(ogType)}" />`
  );
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
    /<meta property="og:image" content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${escapeHtmlAttr(ogImage)}" />`
  );
  updated = updated.replace(
    /<meta property="og:image:alt" content="[^"]*"\s*\/?>/i,
    `<meta property="og:image:alt" content="${escapeHtmlAttr(ogImageAlt)}" />`
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
  updated = updated.replace(
    /<meta name="twitter:image" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${escapeHtmlAttr(ogImage)}" />`
  );
  updated = updated.replace(
    /<meta name="twitter:image:alt" content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image:alt" content="${escapeHtmlAttr(ogImageAlt)}" />`
  );
  updated = updated.replace(/<div id="root"><\/div>/i, ssrShellHtml);

  const bootstrapScript = liveFetched
    ? `<script id="hamrolms-bootstrap">window.__HAMROLMS_BOOTSTRAP__=${JSON.stringify({
        courses,
        subAdmins,
        deletedCourseIds,
        coursesSeeded,
        siteSettings,
        paymentQr,
      })
        .replace(/</g, '\\u003c')
        .replace(/<\/script/gi, '<\\/script')};</script>`
    : '';

  const extraHeadParts = [
    `<meta name="keywords" content="${escapeHtmlAttr(keywords)}" />`,
    `<meta name="publisher" content="HamroLms" />`,
    `<link rel="sitemap" type="application/xml" title="Sitemap" href="${escapeHtmlAttr(`${origin}/sitemap.xml`)}" />`,
    `<link rel="alternate" type="text/plain" title="LLMs Context" href="${escapeHtmlAttr(`${origin}/llms.txt`)}" />`,
    hreflangTags,
    articleTags,
    dynamicGraphScript,
    bootstrapScript,
  ]
    .filter(Boolean)
    .join('\n    ');
  updated = updated.replace('</head>', `    ${extraHeadParts}\n  </head>`);

  return { html: updated, statusCode };
}

