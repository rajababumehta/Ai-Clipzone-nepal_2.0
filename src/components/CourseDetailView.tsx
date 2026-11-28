import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  Lock,
  Sparkles,
  UserCheck,
  Video,
  Zap,
} from 'lucide-react';
import { BlogPost, Course, PublicInstructorProfile, SupportedLocale } from '../types';
import { getLocaleDict } from '../utils/i18n';
import { buildLocalizedPath, getCourseSlug } from '../utils/seoRouting';

interface CourseDetailViewProps {
  course: Course;
  allCourses: Course[];
  instructor: PublicInstructorProfile | null;
  relatedPosts: BlogPost[];
  locale: SupportedLocale;
  isEnrolled: boolean;
  isCourseFree: boolean;
  onNavigatePath: (cleanPath: string) => void;
  onEnrollCourse: (course: Course) => void;
  onGoToClassroom: (courseId: string) => void;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  allCourses,
  instructor,
  relatedPosts,
  locale,
  isEnrolled,
  isCourseFree,
  onNavigatePath,
  onEnrollCourse,
  onGoToClassroom,
}) => {
  const t = getLocaleDict(locale);
  const videos = Array.isArray(course.videos) ? course.videos : [];
  const pdfs = Array.isArray(course.pdfs) ? course.pdfs : [];
  const [openChapters, setOpenChapters] = React.useState<Record<number, boolean>>({});
  const hasChapters = videos.some((v) => Boolean(v.chapterTitle && v.chapterTitle.trim()));

  // Group public syllabus chapters WITHOUT exposing private videoUrl or pdfUrl
  const groupedChapters = React.useMemo(() => {
    const map = new Map<string, Array<{ title: string; duration?: string }>>();
    videos.forEach((v) => {
      const ch = v.chapterTitle?.trim() || 'Course Modules & Lessons';
      const list = map.get(ch) || [];
      list.push({ title: v.title, duration: v.duration });
      map.set(ch, list);
    });
    return Array.from(map.entries());
  }, [videos]);

  const relatedCourses = React.useMemo(
    () => allCourses.filter((c) => c.id !== course.id).slice(0, 2),
    [allCourses, course.id]
  );

  const overviewText =
    course.overview?.trim() ||
    `${course.title} provides structured, hands-on training designed to help learners build real digital skills step by step. Explore practical modules, study notes, and project workflows accessible from desktop or mobile.`;

  const prerequisites =
    course.prerequisites && course.prerequisites.length > 0
      ? course.prerequisites
      : [
          'Basic familiarity with using a smartphone or computer',
          'Reliable internet connection for streaming lessons and downloading notes',
          'Willingness to practice exercises after each module',
        ];

  return (
    <article className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8 text-left">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <a
          href={buildLocalizedPath('/', locale)}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-white transition cursor-pointer"
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <a
          href={buildLocalizedPath('/', locale)}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-white transition cursor-pointer"
        >
          {t.coursesNav}
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 font-semibold truncate max-w-[260px] sm:max-w-md" aria-current="page">
          {course.title}
        </span>
      </nav>

      {/* Hero Course Overview Card */}
      <header className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 relative aspect-video lg:aspect-auto bg-black border-b lg:border-b-0 lg:border-r border-zinc-800">
          <img
            src={course.image || '/institute-logo.png'}
            alt={`${course.title} – Online course cover on Hamro LMS Nepal`}
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {course.isPopular && (
            <span className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
              {course.popularText || 'Featured Course'}
            </span>
          )}
        </div>

        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                {course.category || 'Digital Skills'}
              </span>
              {course.level && (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 font-semibold">
                  {course.level}
                </span>
              )}
              {course.includeCertificate !== false && !course.includeLive && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Verified Certificate
                </span>
              )}
              {course.includeLive && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" /> Live Sessions Included
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {course.title}
            </h1>

            <p className="text-sm text-zinc-300 leading-relaxed">{overviewText}</p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-zinc-400">
              {instructor && (
                <>
                  <span>
                    Instructor:{' '}
                    <a
                      href={buildLocalizedPath(`/instructors/${instructor.slug}`, locale)}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigatePath(`/instructors/${instructor.slug}`);
                      }}
                      className="text-blue-400 hover:underline font-bold"
                    >
                      {instructor.name}
                    </a>
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{videos.length} Video Lessons</span>
              {pdfs.length > 0 && (
                <>
                  <span>•</span>
                  <span>{pdfs.length} Study Resources</span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-400 font-semibold">Available Online</span>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 block font-bold">
                Course Fee
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {isCourseFree ? 'FREE' : course.price}
              </span>
            </div>

            {isEnrolled ? (
              <button
                type="button"
                onClick={() => onGoToClassroom(course.id)}
                className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center gap-2 transition cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <span>{t.goToCourseBtn}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEnrollCourse(course)}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-black text-sm flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4 fill-zinc-950" />
                <span>{t.enrollBtn}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Grid: Learning Objectives, Curriculum, Prerequisites, Instructor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {/* Learning Objectives */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span>{t.learnObjectivesTitle}</span>
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(course.learn || []).map((objective, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Public Curriculum Outline (strictly titles & durations; never exposes private lesson URLs) */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>{t.curriculumTitle}</span>
              </h2>
              <span className="text-xs text-zinc-400 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-zinc-500" />
                Lesson videos &amp; PDFs unlock after enrollment
              </span>
            </div>

            {groupedChapters.length > 0 && hasChapters ? (
              <div className="space-y-2.5">
                {groupedChapters.map(([chapterTitle, lessons], chIdx) => {
                  const isOpen = Boolean(openChapters[chIdx]);
                  return (
                    <div key={chIdx} className="border border-zinc-800/90 rounded-2xl overflow-hidden bg-black/50">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenChapters((prev) => ({
                            ...prev,
                            [chIdx]: !isOpen,
                          }))
                        }
                        className="w-full px-4 py-3.5 bg-zinc-900/70 hover:bg-zinc-900 flex items-center justify-between gap-3 text-left transition cursor-pointer"
                      >
                        <h3 className="text-sm font-extrabold text-zinc-100 truncate">{chapterTitle}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-zinc-400 font-semibold">
                            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                              isOpen ? 'rotate-180 text-blue-400' : ''
                            }`}
                          />
                        </div>
                      </button>
                      {isOpen && (
                        <ul className="divide-y divide-zinc-900 border-t border-zinc-800">
                          {lessons.map((lesson, lIdx) => (
                            <li key={lIdx} className="px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-zinc-300">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <BookOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                                <span className="truncate">{lesson.title}</span>
                              </div>
                              {lesson.duration && (
                                <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3" />
                                  {lesson.duration}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : videos.length > 0 ? (
              <div className="border border-zinc-800/90 rounded-2xl overflow-hidden bg-black/50">
                <ul className="divide-y divide-zinc-900">
                  {videos.map((lesson, lIdx) => (
                    <li key={lIdx} className="px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm text-zinc-300">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <BookOpen className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{lesson.title}</span>
                      </div>
                      {lesson.duration && (
                        <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {lesson.duration}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 leading-relaxed">
                Structured video modules and step-by-step project lessons are included inside the student classroom upon enrollment.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar: Prerequisites & Instructor Bio */}
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-3">
            <h2 className="text-base font-black text-white">{t.prerequisitesTitle}</h2>
            <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
              {prerequisites.map((req, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </section>

          {instructor && (
            <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-400" />
                <span>{t.instructorTitle}</span>
              </h2>
              <div className="flex items-center gap-3">
                <img
                  src={instructor.avatarUrl || '/institute-logo.png'}
                  alt={`${instructor.name} – ${instructor.role}`}
                  loading="lazy"
                  decoding="async"
                  className="w-12 h-12 rounded-2xl object-cover border border-zinc-800 bg-black shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-white truncate">{instructor.name}</h3>
                  <p className="text-xs text-blue-400 font-semibold truncate">{instructor.role}</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{instructor.bio}</p>
              <a
                href={buildLocalizedPath(`/instructors/${instructor.slug}`, locale)}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigatePath(`/instructors/${instructor.slug}`);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
              >
                <span>View Full Instructor Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </section>
          )}
        </aside>
      </div>

      {/* Internal Links: Related Courses & Blog Articles */}
      {(relatedCourses.length > 0 || relatedPosts.length > 0) && (
        <section className="pt-4 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-2 gap-6">
          {relatedCourses.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-black text-white">{t.relatedCoursesTitle}</h2>
              <div className="space-y-2.5">
                {relatedCourses.map((rc) => {
                  const rcSlug = getCourseSlug(rc);
                  const rcHref = buildLocalizedPath(`/courses/${rcSlug}`, locale);
                  return (
                    <a
                      key={rc.id}
                      href={rcHref}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigatePath(`/courses/${rcSlug}`);
                      }}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition group"
                    >
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 truncate">
                          {rc.title}
                        </h3>
                        <span className="text-xs text-emerald-400 font-semibold">
                          {rc.isFree || rc.amount === 0 ? 'FREE' : rc.price}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {relatedPosts.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-black text-white">{t.relatedArticlesTitle}</h2>
              <div className="space-y-2.5">
                {relatedPosts.map((post) => {
                  const postHref = buildLocalizedPath(`/blog/${post.slug}`, locale);
                  return (
                    <a
                      key={post.slug}
                      href={postHref}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigatePath(`/blog/${post.slug}`);
                      }}
                      className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition group"
                    >
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-400 truncate">
                          {post.title}
                        </h3>
                        <span className="text-xs text-zinc-400">
                          {post.category} • {post.readTimeMinutes} min read
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={() => onNavigatePath('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backHomeBtn}</span>
        </button>
      </div>
    </article>
  );
};
