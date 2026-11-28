import type { Course, PublicInstructorProfile, SubAdminAccount } from '../types.ts';
import { slugifyText } from '../utils/seoRouting.ts';
import { getSubAdminCourseIds } from '../utils/subAdminCourses.ts';

export const CORE_INSTRUCTORS: PublicInstructorProfile[] = [
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

const BRAND_ALIAS_INSTRUCTOR_SLUGS = new Set([
  'ai-clipzone',
  'ai-clipzone-nepal',
  'al-clipzone',
  'hamro-lms',
  'hamrolms',
  'hamro-lms-nepal',
]);

const expandCourseIdAliases = (cid: string): string[] => {
  if (cid === 'al-master-class-course-by-al-clipzone') {
    return [cid, 'Ai master class course by Ai clipzone'];
  }
  if (cid === 'Ai master class course by Ai clipzone') {
    return [cid, 'al-master-class-course-by-al-clipzone'];
  }
  return [cid];
};

const normTitle = (val?: string) => (val || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Builds sanitized public instructor profiles from core educators and active Firestore sub-admins.
 * SECURITY: Secret login codes (`code`), device IDs (`activeDeviceId`), and private metadata are NEVER included.
 */
export function buildPublicInstructors(
  courses: Course[],
  activeSubAdmins: SubAdminAccount[] = []
): PublicInstructorProfile[] {
  const bySlug = new Map<string, PublicInstructorProfile>();
  const subAdminOwnedCourseIds = new Set<string>();

  const resolvedSubEntries: Array<{
    sub: SubAdminAccount;
    slug: string;
    cleanName: string;
    isBrandAlias: boolean;
    assignedCourses: Course[];
    courseIds: string[];
  }> = [];

  activeSubAdmins.forEach((sub) => {
    if (!sub || sub.status !== 'active' || !sub.name?.trim()) return;
    const cleanName = sub.name.trim();
    const rawSlug = slugifyText(cleanName);
    if (!rawSlug || rawSlug === 'item') return;

    const isBrandAlias =
      BRAND_ALIAS_INSTRUCTOR_SLUGS.has(rawSlug) || rawSlug === 'rajababu-mehta';
    const slug = isBrandAlias ? 'rajababu-mehta' : rawSlug;

    const rawIds = getSubAdminCourseIds(sub);
    const expandedIds = new Set(rawIds.flatMap(expandCourseIdAliases));
    const rawTitles = new Set(
      [
        ...(Array.isArray(sub.courseTitles) ? sub.courseTitles : []),
        ...(sub.courseTitle ? [sub.courseTitle] : []),
      ]
        .map(normTitle)
        .filter(Boolean)
    );

    const assignedCourses = courses.filter(
      (c) =>
        expandedIds.has(c.id) ||
        (rawTitles.size > 0 && rawTitles.has(normTitle(c.title)))
    );
    const resolvedIds = Array.from(
      new Set(
        courses.length > 0 ? assignedCourses.map((c) => c.id) : rawIds
      )
    );

    if (!isBrandAlias) {
      resolvedIds.forEach((cid) => {
        expandCourseIdAliases(cid).forEach((aliasId) => subAdminOwnedCourseIds.add(aliasId));
      });
    }

    resolvedSubEntries.push({
      sub,
      slug,
      cleanName,
      isBrandAlias,
      assignedCourses,
      courseIds: resolvedIds,
    });
  });

  CORE_INSTRUCTORS.forEach((inst) => {
    const matchedCourseIds =
      courses.length > 0
        ? courses
            .filter(
              (c) =>
                !subAdminOwnedCourseIds.has(c.id) &&
                (c.instructorSlug === inst.slug ||
                  inst.courseIds.some((id) => expandCourseIdAliases(id).includes(c.id)))
            )
            .map((c) => c.id)
        : inst.courseIds.filter((id) => !subAdminOwnedCourseIds.has(id));

    bySlug.set(inst.slug, {
      ...inst,
      courseIds: Array.from(new Set(matchedCourseIds)),
    });
  });

  resolvedSubEntries.forEach(({ sub, slug, cleanName, assignedCourses, courseIds }) => {
    const existing = bySlug.get(slug);
    if (existing) {
      courseIds.forEach((cid) => {
        if (!existing.courseIds.includes(cid)) {
          existing.courseIds.push(cid);
        }
      });
      return;
    }

    const primaryCourse = assignedCourses[0];
    const combinedLearn = Array.from(
      new Set(
        assignedCourses
          .flatMap((c) => (Array.isArray(c.learn) ? c.learn : []))
          .map((item) => item.trim())
          .filter(Boolean)
      )
    ).slice(0, 6);
    const combinedLanguages = Array.from(
      new Set(
        assignedCourses
          .map((c) => c.language)
          .filter((lang): lang is string => Boolean(lang && lang.trim()))
      )
    );

    bySlug.set(slug, {
      slug,
      name: cleanName,
      role: 'Course Instructor & Mentor',
      headline:
        assignedCourses.length > 1
          ? `Course Instructor for ${assignedCourses.length} Courses on Hamro LMS Nepal`
          : primaryCourse
          ? `Course Instructor for ${primaryCourse.title}`
          : `Verified Course Instructor on Hamro LMS Nepal`,
      bio:
        assignedCourses.length > 1
          ? `${cleanName} is the Course Instructor for ${assignedCourses.length} courses on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`
          : primaryCourse
          ? `${cleanName} is the Course Instructor for ${primaryCourse.title} on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`
          : `${cleanName} teaches and mentors learners on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`,
      expertise: combinedLearn.length > 0 ? combinedLearn : ['Digital Skills', 'Mentorship'],
      avatarUrl: sub.avatarUrl || '/institute-logo.png',
      languages: combinedLanguages.length > 0 ? combinedLanguages : ['English'],
      courseIds,
      isFounder: false,
    });
  });

  // Ensure any course declaring an explicit instructorSlug/instructorName appears cleanly when no Sub-Admin owns it
  courses.forEach((c) => {
    if (subAdminOwnedCourseIds.has(c.id)) return;
    if (c.instructorName && c.instructorSlug) {
      const slug = slugifyText(c.instructorSlug);
      const existing = bySlug.get(slug);
      if (existing) {
        if (!existing.courseIds.includes(c.id)) existing.courseIds.push(c.id);
      } else {
        bySlug.set(slug, {
          slug,
          name: c.instructorName.trim(),
          role: 'Course Instructor',
          headline: `Instructor for ${c.title}`,
          bio: `${c.instructorName.trim()} leads ${c.title} on Hamro LMS Nepal with structured lessons and practical assignments.`,
          expertise: c.learn?.slice(0, 4) || ['Online Education'],
          languages: c.language ? [c.language] : ['English'],
          courseIds: [c.id],
          isFounder: false,
        });
      }
    }
  });

  return Array.from(bySlug.values());
}

export function findCourseInstructor(
  course: Course,
  instructors: PublicInstructorProfile[]
): PublicInstructorProfile | null {
  const courseAliases = expandCourseIdAliases(course.id);
  const hasCourse = (inst: PublicInstructorProfile) =>
    courseAliases.some((id) => inst.courseIds.includes(id));

  // 1. Always prioritize an assigned Sub-Admin (non-founder instructor) for this course
  const byAssignedSubAdmin = instructors.find((i) => !i.isFounder && hasCourse(i));
  if (byAssignedSubAdmin) return byAssignedSubAdmin;

  // 2. Otherwise check explicit instructorSlug declared on the course
  const byExplicitSlug = course.instructorSlug
    ? instructors.find((i) => i.slug === slugifyText(course.instructorSlug!))
    : undefined;
  if (byExplicitSlug) return byExplicitSlug;

  // 3. Otherwise match any instructor (including founders) owning this course
  const byCourseId = instructors.find(hasCourse);
  if (byCourseId) return byCourseId;

  return null;
}

export function resolveCourseInstructor(
  course: Course,
  instructors: PublicInstructorProfile[]
): PublicInstructorProfile {
  return findCourseInstructor(course, instructors) || instructors[0] || CORE_INSTRUCTORS[0];
}
