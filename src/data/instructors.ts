import type { Course, PublicInstructorProfile, SubAdminAccount } from '../types.ts';
import { slugifyText } from '../utils/seoRouting.ts';

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

/**
 * Builds sanitized public instructor profiles from core educators and active Firestore sub-admins.
 * SECURITY: Secret login codes (`code`), device IDs (`activeDeviceId`), and private metadata are NEVER included.
 */
export function buildPublicInstructors(
  courses: Course[],
  activeSubAdmins: SubAdminAccount[] = []
): PublicInstructorProfile[] {
  const bySlug = new Map<string, PublicInstructorProfile>();

  CORE_INSTRUCTORS.forEach((inst) => {
    const matchedCourseIds = courses
      .filter((c) => c.instructorSlug === inst.slug || inst.courseIds.includes(c.id))
      .map((c) => c.id);
    bySlug.set(inst.slug, {
      ...inst,
      courseIds: Array.from(new Set([...inst.courseIds, ...matchedCourseIds])),
    });
  });

  activeSubAdmins.forEach((sub) => {
    if (!sub || sub.status !== 'active' || !sub.name?.trim()) return;
    const cleanName = sub.name.trim();
    const rawSlug = slugifyText(cleanName);
    if (!rawSlug || rawSlug === 'item') return;
    const slug = BRAND_ALIAS_INSTRUCTOR_SLUGS.has(rawSlug) ? 'rajababu-mehta' : rawSlug;

    const existing = bySlug.get(slug);
    if (existing) {
      if (sub.courseId && !existing.courseIds.includes(sub.courseId)) {
        existing.courseIds.push(sub.courseId);
      }
      return;
    }

    const assignedCourse = courses.find((c) => c.id === sub.courseId);
    bySlug.set(slug, {
      slug,
      name: cleanName,
      role: 'Course Instructor & Mentor',
      headline: assignedCourse
        ? `Instructor for ${assignedCourse.title}`
        : `Verified Mentor on Hamro LMS Nepal`,
      bio: `${cleanName} teaches and mentors learners on Hamro LMS Nepal, supporting students with practical feedback, project reviews, and course guidance.`,
      expertise: assignedCourse?.learn?.slice(0, 4) || ['Digital Skills', 'Mentorship'],
      avatarUrl: sub.avatarUrl || '/institute-logo.png',
      languages: assignedCourse?.language ? [assignedCourse.language] : ['English'],
      courseIds: sub.courseId ? [sub.courseId] : [],
      isFounder: false,
    });
  });

  // Ensure any course declaring an explicit instructorSlug/instructorName appears cleanly
  courses.forEach((c) => {
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

export function resolveCourseInstructor(
  course: Course,
  instructors: PublicInstructorProfile[]
): PublicInstructorProfile {
  const byExplicitSlug = course.instructorSlug
    ? instructors.find((i) => i.slug === slugifyText(course.instructorSlug!))
    : undefined;
  if (byExplicitSlug) return byExplicitSlug;

  const byCourseId = instructors.find((i) => i.courseIds.includes(course.id));
  if (byCourseId) return byCourseId;

  return instructors[0] || CORE_INSTRUCTORS[0];
}
