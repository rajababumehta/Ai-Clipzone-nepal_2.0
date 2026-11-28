import { BlogPost, Course, PublicInstructorProfile, SupportedLocale } from '../types';
import { getCourseSlug, buildLocalizedPath } from './seoRouting';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildOrganizationSchema(origin: string, brand: string, supportEmail: string) {
  return {
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': `${origin}/#organization`,
    name: brand,
    alternateName: ['Hamro LMS', 'HamroLms Nepal'],
    url: `${origin}/`,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/institute-logo.png`,
      width: 1600,
      height: 1600,
    },
    image: `${origin}/institute-logo.png`,
    description: `Learn AI tools, video editing, graphic design, and web development from verified instructors on ${brand} with structured lessons and certificates.`,
    email: supportEmail,
    areaServed: {
      '@type': 'Country',
      name: 'Nepal',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: supportEmail,
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
  };
}

export function buildWebApplicationSchema(origin: string, brand: string) {
  return {
    '@type': 'WebApplication',
    '@id': `${origin}/#webapp`,
    name: brand,
    url: `${origin}/`,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    description: `Learn AI tools, video editing, graphic design, and web development from verified instructors on ${brand} with structured lessons and certificates.`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'NPR',
    },
  };
}

export function buildPlatformFaqSchema(origin: string, brand: string, courses: Course[]) {
  const courseSample = courses
    .slice(0, 5)
    .map((c) => c.title)
    .join(', ');
  return {
    '@type': 'FAQPage',
    '@id': `${origin}/#platform-faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is ${brand}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${brand} is an online learning platform and learning management system in Nepal offering practical digital skill courses in AI tools, prompt engineering, video editing, graphic design, and web development taught in English by verified instructors.`,
        },
      },
      {
        '@type': 'Question',
        name: `What courses are available on ${brand}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${brand} offers structured courses${courseSample ? ` including ${courseSample}` : ''} with step-by-step video chapters and downloadable study notes.`,
        },
      },
      {
        '@type': 'Question',
        name: `Do ${brand} courses include certificates?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes. Eligible self-paced courses on ${brand} provide a verifiable digital Certificate of Completion in the student dashboard.`,
        },
      },
      {
        '@type': 'Question',
        name: `How do students enroll and access lessons on ${brand}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Students select a course from the ${brand} catalog, complete enrollment, and enter their activation code inside the student profile to unlock all HD video lectures and PDF study guides.`,
        },
      },
    ],
  };
}

export function buildWebsiteSchema(origin: string, brand: string, _locale: SupportedLocale) {
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: `${origin}${buildLocalizedPath('/', 'en')}`,
    name: brand,
    alternateName: ['Hamro LMS', 'HamroLms Nepal'],
    inLanguage: 'en',
    publisher: { '@id': `${origin}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildSiteNavigationSchema(origin: string, locale: SupportedLocale) {
  const navItems = [
    { name: 'Home', cleanPath: '/' },
    { name: 'Course', cleanPath: '/courses' },
    { name: 'Privacy Policy', cleanPath: '/privacy-policy' },
    { name: 'About Us', cleanPath: '/about-us' },
    { name: 'Learn. Apply. Grow.', cleanPath: '/learn' },
  ];
  return {
    '@type': 'ItemList',
    '@id': `${origin}/#site-navigation`,
    name: 'HamroLms Site Navigation',
    itemListElement: navItems.map((item, idx) => ({
      '@type': 'SiteNavigationElement',
      position: idx + 1,
      name: item.name,
      url: `${origin}${buildLocalizedPath(item.cleanPath, locale)}`,
    })),
  };
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function parseCoursePriceNumber(course: Partial<Course>): { isFree: boolean; priceNumber: number } {
  const isFree =
    course.isFree === true ||
    (typeof course.amount === 'number' && course.amount === 0) ||
    (typeof course.price === 'string' && /^free$/i.test(course.price.trim()));
  if (isFree) return { isFree: true, priceNumber: 0 };
  const parsed = Number(course.amount ?? String(course.price || '').replace(/[^\d.]/g, ''));
  return { isFree: false, priceNumber: Number.isFinite(parsed) ? parsed : 0 };
}

export function buildCourseSchema(
  origin: string,
  brand: string,
  course: Course,
  instructor: PublicInstructorProfile,
  locale: SupportedLocale
) {
  const slug = getCourseSlug(course);
  const courseUrl = `${origin}${buildLocalizedPath(`/courses/${slug}`, locale)}`;
  const instructorUrl = `${origin}${buildLocalizedPath(`/instructors/${instructor.slug}`, locale)}`;
  const { isFree, priceNumber } = parseCoursePriceNumber(course);

  const description =
    course.seoDescription?.trim() ||
    course.overview?.trim() ||
    (course.learn?.length
      ? `${course.title}: ${course.learn.slice(0, 4).join(', ')}.`
      : `Structured online course on ${brand}.`);

  return {
    '@type': 'Course',
    '@id': `${courseUrl}#course`,
    name: course.title,
    description,
    url: courseUrl,
    image: course.image || `${origin}/institute-logo.png`,
    provider: { '@id': `${origin}/#organization` },
    instructor: {
      '@type': 'Person',
      name: instructor.name,
      url: instructorUrl,
    },
    teaches: course.learn?.slice(0, 8) || [],
    coursePrerequisites:
      course.prerequisites?.join('; ') ||
      'No prior experience required; smartphone or computer with internet access.',
    educationalLevel: course.level || 'All Levels',
    inLanguage:
      course.language && !/nepali|hindi/i.test(course.language) ? [course.language] : ['en'],
    educationalCredentialAwarded:
      course.includeCertificate !== false && !course.includeLive ? 'Certificate of Completion' : undefined,
    offers: {
      '@type': 'Offer',
      category: isFree ? 'Free' : 'Paid',
      priceCurrency: 'NPR',
      price: priceNumber,
      availability: 'https://schema.org/InStock',
      url: courseUrl,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: course.includeLive ? 'Blended' : 'Online',
      instructor: {
        '@type': 'Person',
        name: instructor.name,
        url: instructorUrl,
      },
    },
  };
}

export function buildCourseItemListSchema(
  origin: string,
  brand: string,
  courses: Course[],
  instructors: PublicInstructorProfile[],
  locale: SupportedLocale
) {
  const listItems = (courses || []).slice(0, 20).map((course, idx) => {
    const inst =
      instructors.find((i) => i.slug === course.instructorSlug || i.courseIds.includes(course.id)) ||
      instructors[0];
    const courseObj = inst
      ? buildCourseSchema(origin, brand, course, inst, locale)
      : {
          '@type': 'Course',
          name: course.title,
          url: `${origin}${buildLocalizedPath(`/courses/${getCourseSlug(course)}`, locale)}`,
          provider: { '@id': `${origin}/#organization` },
        };

    return {
      '@type': 'ListItem',
      position: idx + 1,
      url: courseObj.url,
      item: courseObj,
    };
  });

  return {
    '@type': 'ItemList',
    name: `${brand} Online Courses in Nepal`,
    numberOfItems: listItems.length,
    itemListElement: listItems,
  };
}

export function buildPersonSchema(
  origin: string,
  instructor: PublicInstructorProfile,
  locale: SupportedLocale
) {
  const url = `${origin}${buildLocalizedPath(`/instructors/${instructor.slug}`, locale)}`;
  const socialArray = Object.values(instructor.socialLinks || {}).filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );

  return {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: instructor.name,
    jobTitle: instructor.role,
    description: instructor.bio,
    url,
    image: instructor.avatarUrl
      ? instructor.avatarUrl.startsWith('http')
        ? instructor.avatarUrl
        : `${origin}${instructor.avatarUrl}`
      : `${origin}/institute-logo.png`,
    knowsAbout: instructor.expertise,
    knowsLanguage: instructor.languages,
    worksFor: { '@id': `${origin}/#organization` },
    ...(socialArray.length > 0 ? { sameAs: socialArray } : {}),
  };
}

export function buildArticleSchema(
  origin: string,
  brand: string,
  post: BlogPost,
  author: PublicInstructorProfile,
  locale: SupportedLocale
) {
  const articleUrl = `${origin}${buildLocalizedPath(`/blog/${post.slug}`, locale)}`;
  const authorUrl = `${origin}${buildLocalizedPath(`/instructors/${author.slug}`, locale)}`;
  const imageUrl = post.coverImage.startsWith('http') ? post.coverImage : `${origin}${post.coverImage}`;

  return {
    '@type': 'Article',
    '@id': `${articleUrl}#article`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl,
    },
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: [imageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    articleSection: post.category,
    keywords: post.tags.join(', '),
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      name: author.name,
      url: authorUrl,
    },
    publisher: {
      '@id': `${origin}/#organization`,
      '@type': 'EducationalOrganization',
      name: brand,
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/institute-logo.png`,
      },
    },
  };
}
