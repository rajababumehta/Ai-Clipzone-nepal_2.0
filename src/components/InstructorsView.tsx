import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Globe, GraduationCap, Sparkles } from 'lucide-react';
import { BlogPost, Course, PublicInstructorProfile, SupportedLocale } from '../types';
import { getLocaleDict } from '../utils/i18n';
import { buildLocalizedPath, getCourseSlug } from '../utils/seoRouting';

interface InstructorsViewProps {
  instructors: PublicInstructorProfile[];
  selectedInstructor?: PublicInstructorProfile;
  courses: Course[];
  posts: BlogPost[];
  locale: SupportedLocale;
  onNavigatePath: (cleanPath: string) => void;
}

export const InstructorsView: React.FC<InstructorsViewProps> = ({
  instructors,
  selectedInstructor,
  courses,
  posts,
  locale,
  onNavigatePath,
}) => {
  const t = getLocaleDict(locale);

  if (selectedInstructor) {
    const taughtCourses = courses.filter((c) => selectedInstructor.courseIds.includes(c.id));
    const authoredPosts = posts.filter((p) => p.authorSlug === selectedInstructor.slug);
    const socialEntries = Object.entries(selectedInstructor.socialLinks || {}).filter(
      ([, url]) => typeof url === 'string' && url.trim().length > 0
    );

    return (
      <article className="max-w-4xl mx-auto py-4 sm:py-6 space-y-8 text-left">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <button type="button" onClick={() => onNavigatePath('/')} className="hover:text-white cursor-pointer">
            Home
          </button>
          <span aria-hidden="true">/</span>
          <button type="button" onClick={() => onNavigatePath('/instructors')} className="hover:text-white cursor-pointer">
            {t.instructorsNav}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-200 font-semibold" aria-current="page">
            {selectedInstructor.name}
          </span>
        </nav>

        {/* Instructor Profile Header */}
        <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <img
              src={selectedInstructor.avatarUrl || '/institute-logo.png'}
              alt={`${selectedInstructor.name} – ${selectedInstructor.role}`}
              loading="eager"
              decoding="async"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border border-zinc-800 bg-black shrink-0"
            />
            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                {selectedInstructor.role}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {selectedInstructor.name}
              </h1>
              <p className="text-sm text-zinc-300 font-medium">{selectedInstructor.headline}</p>
            </div>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">{selectedInstructor.bio}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Areas of Expertise
              </h2>
              <div className="flex flex-wrap gap-2">
                {selectedInstructor.expertise.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Teaching Languages &amp; Links
              </h2>
              <p className="text-xs text-zinc-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedInstructor.languages.join(', ')}</span>
              </p>
              {socialEntries.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {socialEntries.map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-blue-400 font-bold capitalize transition"
                    >
                      <span>{platform}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Courses by This Instructor */}
        <section className="space-y-4">
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Courses Taught by {selectedInstructor.name}</span>
          </h2>
          {taughtCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {taughtCourses.map((course) => {
                const slug = getCourseSlug(course);
                return (
                  <a
                    key={course.id}
                    href={buildLocalizedPath(`/courses/${slug}`, locale)}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigatePath(`/courses/${slug}`);
                    }}
                    className="bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 rounded-3xl overflow-hidden transition group flex flex-col"
                  >
                    <div className="aspect-video bg-black overflow-hidden">
                      <img
                        src={course.image || '/institute-logo.png'}
                        alt={`${course.title} taught by ${selectedInstructor.name}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <h3 className="text-base font-extrabold text-white group-hover:text-blue-400 transition">
                        {course.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-emerald-400">
                          {course.isFree || course.amount === 0 ? 'FREE' : course.price}
                        </span>
                        <span className="text-blue-400 font-bold inline-flex items-center gap-1">
                          {t.viewCourseBtn} <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No public courses listed yet.</p>
          )}
        </section>

        {/* Authored Blog Articles */}
        {authoredPosts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span>Articles by {selectedInstructor.name}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {authoredPosts.map((post) => (
                <a
                  key={post.slug}
                  href={buildLocalizedPath(`/blog/${post.slug}`, locale)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePath(`/blog/${post.slug}`);
                  }}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition group space-y-1.5"
                >
                  <span className="text-[11px] text-blue-400 font-bold">{post.category}</span>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-blue-400 transition">
                    {post.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2">{post.excerpt}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        <div>
          <button
            type="button"
            onClick={() => onNavigatePath('/instructors')}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Instructors</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8 text-left">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <button type="button" onClick={() => onNavigatePath('/')} className="hover:text-white cursor-pointer">
          Home
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 font-semibold" aria-current="page">
          {t.instructorsNav}
        </span>
      </nav>

      <header className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <GraduationCap className="w-7 h-7 text-blue-400 shrink-0" />
          <span>{t.instructorsHeading}</span>
        </h1>
        <p className="text-sm text-zinc-400">{t.instructorsSubheading}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instructors.map((inst) => (
          <a
            key={inst.slug}
            href={buildLocalizedPath(`/instructors/${inst.slug}`, locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath(`/instructors/${inst.slug}`);
            }}
            className="bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 rounded-3xl p-6 transition group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={inst.avatarUrl || '/institute-logo.png'}
                  alt={`${inst.name} – Instructor on HamroLms`}
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 rounded-2xl object-cover border border-zinc-800 bg-black shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[11px] text-blue-400 font-bold block">{inst.role}</span>
                  <h2 className="text-lg font-extrabold text-white group-hover:text-blue-400 transition truncate">
                    {inst.name}
                  </h2>
                  <p className="text-xs text-zinc-400 truncate">{inst.headline}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed">{inst.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {inst.expertise.slice(0, 4).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs">
              <span className="text-zinc-400">
                {inst.courseIds.length} Public {inst.courseIds.length === 1 ? 'Course' : 'Courses'}
              </span>
              <span className="text-blue-400 font-bold inline-flex items-center gap-1">
                View Profile <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
