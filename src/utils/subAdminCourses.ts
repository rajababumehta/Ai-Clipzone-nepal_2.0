import type { Course, SubAdminAccount } from '../types';

type SubAdminLike = Pick<SubAdminAccount, 'courseId' | 'courseTitle' | 'courseIds' | 'courseTitles'>;

export function getSubAdminCourseIds(sub?: SubAdminLike | null): string[] {
  if (!sub) return [];
  const ids: string[] = [];
  if (Array.isArray(sub.courseIds)) {
    sub.courseIds.forEach((id) => {
      const clean = String(id || '').trim();
      if (clean && !ids.includes(clean)) ids.push(clean);
    });
  }
  if (sub.courseId) {
    const clean = String(sub.courseId).trim();
    if (clean && !ids.includes(clean)) ids.push(clean);
  }
  return ids;
}

export function getSubAdminCourseTitles(sub?: SubAdminLike | null, courses?: Course[]): string[] {
  if (!sub) return [];
  const ids = getSubAdminCourseIds(sub);
  if (courses && courses.length > 0 && ids.length > 0) {
    const resolved = ids
      .map((id) => courses.find((c) => c.id === id)?.title)
      .filter((t): t is string => Boolean(t && t.trim()));
    if (resolved.length > 0) return resolved;
  }

  const titles: string[] = [];
  if (Array.isArray(sub.courseTitles)) {
    sub.courseTitles.forEach((t) => {
      const clean = String(t || '').trim();
      if (clean && !titles.includes(clean)) titles.push(clean);
    });
  }
  if (sub.courseTitle) {
    const clean = String(sub.courseTitle).trim();
    if (clean && !titles.includes(clean)) titles.push(clean);
  }
  return titles;
}

export function subAdminHasCourse(
  sub: SubAdminLike | null | undefined,
  courseId?: string,
  courseTitle?: string,
  courses?: Course[]
): boolean {
  if (!sub) return false;
  const ids = getSubAdminCourseIds(sub);
  if (courseId && ids.includes(courseId)) return true;

  if (courseTitle) {
    const norm = (val: string) => val.replace(/\s+/g, ' ').trim().toLowerCase();
    const targetNorm = norm(courseTitle);
    if (targetNorm) {
      const titles = getSubAdminCourseTitles(sub, courses);
      if (titles.some((t) => norm(t) === targetNorm)) return true;
    }
  }
  return false;
}
