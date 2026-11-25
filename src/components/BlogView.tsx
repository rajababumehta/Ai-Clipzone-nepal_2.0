import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Calendar, Clock, FileText, Tag, User } from 'lucide-react';
import { BlogPost, Course, PublicInstructorProfile, SupportedLocale } from '../types';
import { getLocaleDict } from '../utils/i18n';
import { buildLocalizedPath, getCourseSlug, slugifyText } from '../utils/seoRouting';

interface BlogViewProps {
  posts: BlogPost[];
  selectedPost?: BlogPost;
  initialCategory?: string;
  instructors: PublicInstructorProfile[];
  courses: Course[];
  locale: SupportedLocale;
  onNavigatePath: (cleanPath: string) => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  posts,
  selectedPost,
  initialCategory,
  instructors,
  courses,
  locale,
  onNavigatePath,
}) => {
  const t = getLocaleDict(locale);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [selectedTag, setSelectedTag] = useState<string>('');

  useEffect(() => {
    setSelectedCategory(initialCategory || 'All');
    setSelectedTag('');
  }, [initialCategory]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts]
  );

  const allTags = useMemo(
    () => Array.from(new Set(posts.flatMap((p) => p.tags))),
    [posts]
  );

  const resolveAuthor = (authorSlug: string): PublicInstructorProfile =>
    instructors.find((i) => i.slug === authorSlug) || instructors[0];

  if (selectedPost) {
    const author = resolveAuthor(selectedPost.authorSlug);
    const relatedPosts = posts
      .filter(
        (p) =>
          p.slug !== selectedPost.slug &&
          (p.category === selectedPost.category || p.tags.some((tag) => selectedPost.tags.includes(tag)))
      )
      .slice(0, 3);
    const relatedCourses = courses.filter((c) => selectedPost.relatedCourseIds.includes(c.id));

    return (
      <article className="max-w-4xl mx-auto py-4 sm:py-6 space-y-8 text-left">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
          <a
            href={buildLocalizedPath('/', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/');
            }}
            className="hover:text-white cursor-pointer"
          >
            Home
          </a>
          <span aria-hidden="true">/</span>
          <a
            href={buildLocalizedPath('/blog', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/blog');
            }}
            className="hover:text-white cursor-pointer"
          >
            {t.blogNav}
          </a>
          <span aria-hidden="true">/</span>
          <span className="text-zinc-200 font-semibold truncate max-w-[260px] sm:max-w-md" aria-current="page">
            {selectedPost.title}
          </span>
        </nav>

        {/* Article Header */}
        <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <a
              href={buildLocalizedPath(`/blog/category/${slugifyText(selectedPost.category)}`, locale)}
              onClick={(e) => {
                e.preventDefault();
                setSelectedCategory(selectedPost.category);
                onNavigatePath(`/blog/category/${slugifyText(selectedPost.category)}`);
              }}
              className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold"
            >
              {selectedPost.category}
            </a>
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {selectedPost.readTimeMinutes} min read
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-snug">
            {selectedPost.title}
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">{selectedPost.excerpt}</p>

          <div className="pt-4 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
            <a
              href={buildLocalizedPath(`/instructors/${author.slug}`, locale)}
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath(`/instructors/${author.slug}`);
              }}
              className="flex items-center gap-2.5 text-zinc-200 hover:text-blue-400 transition font-bold"
            >
              <img
                src={author.avatarUrl || '/institute-logo.png'}
                alt={author.name}
                loading="eager"
                decoding="async"
                className="w-8 h-8 rounded-full object-cover border border-zinc-700"
              />
              <span>By {author.name}</span>
            </a>

            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Published: <time dateTime={selectedPost.publishedAt}>{selectedPost.publishedAt}</time>
              </span>
              <span className="flex items-center gap-1">
                Updated: <time dateTime={selectedPost.updatedAt}>{selectedPost.updatedAt}</time>
              </span>
            </div>
          </div>
        </header>

        {/* Article Sections */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-7">
          {selectedPost.sections.map((section, idx) => (
            <section key={idx} className="space-y-3">
              <h2 className="text-xl font-black text-white tracking-tight">{section.heading}</h2>
              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="space-y-2 pl-4 border-l-2 border-blue-500/40">
                  {section.bullets.map((b, bIdx) => (
                    <li key={bIdx} className="text-sm text-zinc-300 leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* Tags */}
          <div className="pt-5 border-t border-zinc-900 flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-zinc-500" />
            {selectedPost.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related Courses CTA */}
        {relatedCourses.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <span>Recommended Courses</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedCourses.map((course) => {
                const slug = getCourseSlug(course);
                return (
                  <a
                    key={course.id}
                    href={buildLocalizedPath(`/courses/${slug}`, locale)}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigatePath(`/courses/${slug}`);
                    }}
                    className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-blue-400 truncate">
                        {course.title}
                      </h3>
                      <span className="text-xs text-emerald-400 font-bold">
                        {course.isFree || course.amount === 0 ? 'FREE' : course.price}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 shrink-0" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">{t.relatedArticlesTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <a
                  key={rp.slug}
                  href={buildLocalizedPath(`/blog/${rp.slug}`, locale)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePath(`/blog/${rp.slug}`);
                  }}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 transition group space-y-2"
                >
                  <span className="text-[11px] font-bold text-blue-400">{rp.category}</span>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-blue-400 leading-snug">
                    {rp.title}
                  </h3>
                  <span className="text-[11px] text-zinc-500 block">{rp.readTimeMinutes} min read</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div>
          <button
            type="button"
            onClick={() => onNavigatePath('/blog')}
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Articles</span>
          </button>
        </div>
      </article>
    );
  }

  const filteredPosts = posts.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase() ||
      slugifyText(p.category) === slugifyText(selectedCategory);
    const matchesTag = !selectedTag || p.tags.includes(selectedTag);
    return matchesCategory && matchesTag;
  });

  return (
    <section className="max-w-5xl mx-auto py-4 sm:py-6 space-y-8 text-left">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <a
          href={buildLocalizedPath('/', locale)}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-white cursor-pointer"
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 font-semibold" aria-current="page">
          {t.blogNav}
        </span>
      </nav>

      <header className="text-center space-y-2 max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <FileText className="w-7 h-7 text-blue-400 shrink-0" />
          <span>{t.blogHeading}</span>
        </h1>
        <p className="text-sm text-zinc-400">{t.blogSubheading}</p>
      </header>

      {/* Categories & Tags Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => {
            const catPath = cat === 'All' ? '/blog' : `/blog/category/${slugifyText(cat)}`;
            const isSelected = selectedCategory === cat || slugifyText(selectedCategory) === slugifyText(cat);
            return (
              <a
                key={cat}
                href={buildLocalizedPath(catPath, locale)}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedCategory(cat);
                  onNavigatePath(catPath);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {cat}
              </a>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag((prev) => (prev === tag ? '' : tag))}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                selectedTag === tag
                  ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-900'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.map((post) => {
          const author = resolveAuthor(post.authorSlug);
          return (
            <a
              key={post.slug}
              href={buildLocalizedPath(`/blog/${post.slug}`, locale)}
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath(`/blog/${post.slug}`);
              }}
              className="bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 rounded-3xl p-6 transition group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                    {post.category}
                  </span>
                  <span className="text-zinc-500">{post.readTimeMinutes} min read</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white group-hover:text-blue-400 transition leading-snug">
                  {post.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  {author.name} • {post.updatedAt}
                </span>
                <span className="text-blue-400 font-bold inline-flex items-center gap-1">
                  {t.readArticleBtn} <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
};
