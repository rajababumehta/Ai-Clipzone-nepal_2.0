// Pure-ESM, zero-external-dependency SEO catalog, sitemap XML, robots.txt, and HTML meta injector.
// Designed to execute safely in Vercel Node serverless functions AND Express without firebase-admin/gRPC/express overhead.

export const DEFAULT_PUBLIC_ORIGIN = 'https://hamrolms.vercel.app';
export const SUPPORTED_LOCALES = ['en', 'ne', 'hi'];
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
    language: 'Hindi & Nepali',
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
    language: 'Hindi & Nepali',
    instructorSlug: 'rajababu-mehta',
    instructorName: 'Rajababu Mehta',
    includeCertificate: true,
    includeLive: false,
    learn: [
      'Channel setup र niche छनोट',
      'Video idea खोज्ने तरिका',
      'Script writing storytelling',
      'Shooting presentation',
      'Editing skills',
      'Thumbnail title',
      'YouTube growth strategy',
      'Monetization earning methods',
      'AI tools प्रयोग गरेर content बनाउने तरिका',
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
    languages: ['English', 'Nepali', 'Hindi'],
    courseIds: [
      'Ai master class course by Ai clipzone',
      'youtube-blueprint-course-by-al-clipzone',
    ],
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

const SEO_LOCALE_TEXT = {
  en: {
    htmlLang: 'en',
    homeTitle: 'Hamro LMS – Online Courses & Learning Platform in Nepal',
    homeDescription:
      'Learn AI tools, video editing, graphic design, and digital skills on Hamro LMS, an online learning platform in Nepal with expert teachers and certificates.',
    instructorsTitle: 'Instructors & Teachers Directory Nepal | Hamro LMS',
    instructorsDescription:
      'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on Hamro LMS Nepal.',
    blogTitle: 'Online Learning Blog, AI Course & Skill Guides | Hamro LMS',
    blogDescription:
      'Read practical guides on AI training in Nepal, video production, prompt engineering, and digital skills on the Hamro LMS Learning Blog.',
    notFoundTitle: 'Page Not Found (404) | Hamro LMS',
    notFoundDescription:
      'The requested page could not be found. Browse online courses, instructors, and AI training guides on Hamro LMS Nepal.',
  },
  ne: {
    htmlLang: 'ne',
    homeTitle: 'Hamro LMS – नेपालको अनलाइन कोर्ष र सिकाइ प्लेटफर्म',
    homeDescription:
      'Hamro LMS नेपालको अनलाइन सिकाइ प्लेटफर्ममा अनुभवी प्रशिक्षकहरूबाट AI तालिम, भिडियो सम्पादन, ग्राफिक डिजाइन र डिजिटल सीप कोर्षहरू सिक्नुहोस्।',
    instructorsTitle: 'प्रशिक्षक र शिक्षकहरू | Hamro LMS Nepal',
    instructorsDescription:
      'Hamro LMS मा AI, भिडियो सम्पादन र डिजिटल सीप सिकाउने अनुभवी प्रशिक्षक र मेन्टरहरूको प्रोफाइल हेर्नुहोस्।',
    blogTitle: 'डिजिटल सीप र AI सिकाइ ब्लग | Hamro LMS Nepal',
    blogDescription:
      'AI उपकरण, भिडियो निर्माण, प्रम्प्ट इन्जिनियरिङ र अनलाइन शिक्षा सम्बन्धी उपयोगी लेखहरू Hamro LMS ब्लगमा पढ्नुहोस्।',
    notFoundTitle: 'पृष्ठ भेटिएन (404) | Hamro LMS',
    notFoundDescription: 'तपाईंले खोज्नुभएको पृष्ठ उपलब्ध छैन। कृपया मुख्य पृष्ठ, कोर्ष वा ब्लगमा जानुहोस्।',
  },
  hi: {
    htmlLang: 'hi',
    homeTitle: 'Hamro LMS – ऑनलाइन कोर्स और लर्निंग प्लेटफॉर्म नेपाल',
    homeDescription:
      'Hamro LMS ऑनलाइन लर्निंग प्लेटफॉर्म पर अनुभवी शिक्षकों से AI टूल्स, वीडियो एडिटिंग, ग्राफिक डिज़ाइन और डिजिटल कौशल सीखें।',
    instructorsTitle: 'प्रशिक्षक और मेंटर्स डायरेक्टरी | Hamro LMS',
    instructorsDescription:
      'Hamro LMS पर AI, वीडियो एडिटिंग और डिजिटल स्किल्स सिखाने वाले प्रशिक्षकों की प्रोफाइल और कोर्स देखें।',
    blogTitle: 'लर्निंग ब्लॉग और AI गाइड्स | Hamro LMS',
    blogDescription:
      'AI टूल्स, वीडियो प्रोडक्शन, प्रॉम्प्ट इंजीनियरिंग और ऑनलाइन शिक्षा से जुड़े गाइड्स Hamro LMS ब्लॉग पर पढ़ें।',
    notFoundTitle: 'पेज नहीं मिला (404) | Hamro LMS',
    notFoundDescription: 'आप जिस पेज को खोज रहे हैं वह उपलब्ध नहीं है। होम पेज, कोर्स या ब्लॉग देखें।',
  },
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
      return { locale, view: 'home', isPublicIndexable: true, cleanPathWithoutLocale: '/' };
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

function mergePublicInstructors(courses, subAdmins) {
  const bySlug = new Map();
  for (const inst of CORE_INSTRUCTORS) {
    const matchedIds = courses
      .filter((c) => c.instructorSlug === inst.slug || inst.courseIds.includes(c.id))
      .map((c) => c.id);
    bySlug.set(inst.slug, {
      ...inst,
      courseIds: Array.from(new Set([...inst.courseIds, ...matchedIds])),
    });
  }
  const BRAND_ALIAS_SLUGS = new Set(['ai-clipzone', 'ai-clipzone-nepal', 'al-clipzone', 'hamro-lms', 'hamrolms', 'hamro-lms-nepal']);
  for (const sub of subAdmins) {
    if (!sub || sub.status !== 'active' || !sub.name) continue;
    const rawSlug = slugifyText(sub.name);
    if (!rawSlug || rawSlug === 'item') continue;
    const slug = BRAND_ALIAS_SLUGS.has(rawSlug) ? 'rajababu-mehta' : rawSlug;
    const existing = bySlug.get(slug);
    if (existing) {
      if (sub.courseId && !existing.courseIds.includes(sub.courseId)) {
        existing.courseIds.push(sub.courseId);
      }
      continue;
    }
    bySlug.set(slug, {
      slug,
      name: String(sub.name).trim(),
      role: 'Course Instructor & Mentor',
      headline: sub.courseTitle ? `Instructor for ${sub.courseTitle}` : 'Instructor on Hamro LMS Nepal',
      bio: `${String(sub.name).trim()} teaches practical lessons and mentors students on Hamro LMS Nepal.`,
      avatarUrl: sub.avatarUrl || '/institute-logo.png',
      languages: ['English', 'Nepali'],
      courseIds: sub.courseId ? [sub.courseId] : [],
      expertise: ['Online Education', 'Digital Skills'],
    });
  }
  for (const c of courses) {
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
          languages: c.language ? [c.language] : ['English', 'Nepali'],
          courseIds: [c.id],
          expertise: Array.isArray(c.learn) ? c.learn.slice(0, 4) : ['Online Education'],
        });
      }
    }
  }
  return Array.from(bySlug.values());
}

async function fetchJsonWithTimeout(url, init = {}, timeoutMs = 2200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
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

  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DATABASE_ID}/documents`;
    const [configJson, coursesJson, subAdminsJson] = await Promise.all([
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
    ]);

    if (configJson?.fields) {
      const cfg = fromFirestoreDoc(configJson);
      if (Array.isArray(cfg.deletedCourseIds)) {
        deletedIds = cfg.deletedCourseIds.map(String);
      }
    }

    const docList = Array.isArray(coursesJson?.documents) ? coursesJson.documents : [];
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
          category: d.category ? String(d.category) : 'Online Course',
          level: d.level ? String(d.level) : 'All Levels',
          price: String(d.price || 'FREE'),
          amount: typeof d.amount === 'number' ? d.amount : 0,
          isFree: Boolean(d.isFree),
          order: typeof d.order === 'number' ? d.order : 0,
          language: d.language ? String(d.language) : 'Nepali & Hindi',
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
          avatarUrl: d.avatarUrl ? String(d.avatarUrl) : undefined,
          status: 'active',
        });
      }
    }
  } catch {
    // Silent fallback to SEED_COURSES + CORE_INSTRUCTORS
  }

  const instructors = mergePublicInstructors(courses, subAdmins);
  return { courses, instructors };
}

export function buildSitemapXmlFromCatalog(origin, courses, instructors) {
  const today = new Date().toISOString().slice(0, 10);
  const specs = [
    { cleanPath: '/', lastmod: today, changefreq: 'daily', priority: '1.0' },
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
    { cleanPath: '/privacy-policy', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.4' },
    { cleanPath: '/terms', lastmod: '2026-01-01', changefreq: 'yearly', priority: '0.4' }
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

    for (const loc of SUPPORTED_LOCALES) {
      const fullLoc = `${origin}${buildLocalizedPath(spec.cleanPath, loc)}`;
      urlNodes.push(
        `  <url>\n` +
          `    <loc>${escapeXml(fullLoc)}</loc>\n` +
          `    <lastmod>${escapeXml(spec.lastmod)}</lastmod>\n` +
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
    `Sitemap: ${safeOrigin}/sitemap.xml`,
    '',
  ].join('\n');
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
  const { courses, instructors } = await fetchPublicCatalogSnapshot();

  let statusCode = 200;
  let title = dict.homeTitle;
  let description = dict.homeDescription;
  let keywords = 'Hamro LMS, Hamro LMS Nepal, Online Learning Platform Nepal, Online Courses Nepal, AI Course Nepal, AI Training Nepal';
  let ogType = 'website';
  let ogImage = `${origin}/institute-logo.png`;
  let ogImageAlt = 'Hamro LMS – Online Courses & Learning Platform in Nepal';
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
      const inst =
        instructors.find(
          (i) =>
            (course.instructorSlug && i.slug === slugifyText(course.instructorSlug)) ||
            i.courseIds.includes(course.id)
        ) || instructors[0];
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
        inLanguage: course.language || parsed.locale,
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
  } else if (parsed.view === 'privacy-policy') {
    title = 'Privacy Policy | Hamro LMS';
    description =
      'Read how Hamro LMS protects student privacy, enrollment records, course credentials, and account security across our online learning platform in Nepal.';
  } else if (parsed.view === 'terms') {
    title = 'Terms of Use | Hamro LMS';
    description =
      'Review Hamro LMS online learning platform terms of use, course enrollment policy, intellectual property rules, and learner guidelines.';
  } else if (parsed.view === 'not-found') {
    statusCode = 404;
    title = dict.notFoundTitle;
    description = dict.notFoundDescription;
    robots = 'noindex, nofollow';
  } else if (!parsed.isPublicIndexable) {
    robots = 'noindex, nofollow';
  } else {
    extraSchemas.push({
      '@type': 'ItemList',
      '@id': `${origin}/#course-catalog`,
      name: 'Online Courses on Hamro LMS Nepal',
      numberOfItems: courses.length,
      itemListElement: courses.map((c, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(c)}`, parsed.locale)}`,
        name: c.title,
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

  const dynamicGraphScript = `<script id="dynamic-hamrolms-jsonld" type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'EducationalOrganization'],
        '@id': `${origin}/#organization`,
        name: 'Hamro LMS',
        url: `${origin}/`,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: 'Hamro LMS',
      },
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

  const extraHeadParts = [
    `<meta name="keywords" content="${escapeHtmlAttr(keywords)}" />`,
    hreflangTags,
    articleTags,
    dynamicGraphScript,
  ]
    .filter(Boolean)
    .join('\n    ');
  updated = updated.replace('</head>', `    ${extraHeadParts}\n  </head>`);

  return { html: updated, statusCode };
}

