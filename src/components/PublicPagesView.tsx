import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  FileText,
  GraduationCap,
  HelpCircle,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Course, FAQItem, PublicInstructorProfile, SupportedLocale } from '../types';
import { buildLocalizedPath, getCourseSlug } from '../utils/seoRouting';
import { getLocaleDict } from '../utils/i18n';

interface HomeOverviewProps {
  courses: Course[];
  instructors: PublicInstructorProfile[];
  faqs: FAQItem[];
  locale: SupportedLocale;
  supportEmail: string;
  onNavigatePath: (cleanPath: string) => void;
}

export const HomePlatformOverviewSection: React.FC<HomeOverviewProps> = ({
  courses,
  instructors,
  faqs,
  locale,
  supportEmail,
  onNavigatePath,
}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="mt-14 space-y-12 text-left">
      {/* Semantic Platform Overview for Visitors & Search Crawlers */}
      <section
        aria-labelledby="about-hamro-lms-heading"
        className="bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl space-y-8"
      >
        <div className="space-y-3 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/25 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> Online Learning Platform Nepal
          </span>
          <h2 id="about-hamro-lms-heading" className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            About Hamro LMS – Learning Management System in Nepal
          </h2>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            <strong>Hamro LMS</strong> is an accessible online learning platform and Learning Management System in Nepal built for students, creators, and professionals who want practical digital skills. Whether you are starting an AI training course in Nepal, learning video production, or building creator channels, Hamro LMS brings structured lessons, study notes, and mentor guidance into one fast e-learning portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-black/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Multiple Teachers &amp; Trainers</h3>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Learn directly from experienced educators, developers, and course mentors across Nepal. Each instructor manages structured modules and supports students inside dedicated channels.
            </p>
            <a
              href={buildLocalizedPath('/instructors', locale)}
              onClick={(e) => {
                e.preventDefault();
                onNavigatePath('/instructors');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 pt-1"
            >
              <span>Meet Our {instructors.length > 1 ? `${instructors.length} ` : ''}Instructors</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="bg-black/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">Benefits for Students in Nepal</h3>
            <ul className="space-y-1.5 text-xs sm:text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Learn in Nepali, Hindi, and English at your own pace from mobile or laptop.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Downloadable PDF handbooks and project-based AI &amp; creator workflows.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Digital certificate generation for eligible completed programs.</span>
              </li>
            </ul>
          </div>

          <div className="bg-black/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2.5 md:col-span-2 lg:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-white">How Students Can Enroll</h3>
            <ol className="space-y-1.5 text-xs sm:text-sm text-zinc-400 list-decimal list-inside">
              <li>Browse available online courses above or open a course detail page.</li>
              <li>Click <strong>Enroll &amp; Activate Course</strong> and complete enrollment via QR/eSewa or free signup.</li>
              <li>Activate your course key in your student profile to unlock video lessons and notes.</li>
            </ol>
          </div>
        </div>

        {/* Public Internal Links Directory for Courses & Learning Guides */}
        <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400 font-bold">Explore Courses:</span>
            {courses.slice(0, 6).map((c) => {
              const slug = getCourseSlug(c);
              return (
                <a
                  key={c.id}
                  href={buildLocalizedPath(`/courses/${slug}`, locale)}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigatePath(`/courses/${slug}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-blue-400 font-semibold transition"
                >
                  {c.title}
                </a>
              );
            })}
          </div>
          <a
            href={buildLocalizedPath('/blog', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/blog');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span>Read Online Learning Guides</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Frequently Asked Questions Section (Real Dynamic FAQs) */}
      {faqs && faqs.length > 0 && (
        <section
          id="faq-section"
          aria-labelledby="faq-heading"
          className="bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 id="faq-heading" className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Frequently Asked Questions</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Common questions about enrolling, course access, certificates, and support on Hamro LMS Nepal.
              </p>
            </div>
            <span className="text-xs text-zinc-500">Support: {supportEmail}</span>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={faq.id || idx}
                  className="border border-zinc-800/80 rounded-2xl bg-black/50 overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left text-sm font-bold text-zinc-100 hover:text-blue-400 transition cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-zinc-900 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

interface StaticPageProps {
  locale: SupportedLocale;
  supportEmail: string;
  onNavigatePath: (cleanPath: string) => void;
}

export const PrivacyPolicyView: React.FC<StaticPageProps> = ({
  locale,
  supportEmail,
  onNavigatePath,
}) => {
  const t = getLocaleDict(locale);
  return (
    <article className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6 text-left">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <a
          href={buildLocalizedPath('/', locale)}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-white"
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 font-semibold" aria-current="page">
          Privacy Policy
        </span>
      </nav>

      <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" /> Learner Privacy &amp; Data Protection
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Privacy Policy – Hamro LMS</h1>
        <p className="text-xs text-zinc-400">Effective Date: January 1, 2026 • Platform: Hamro LMS (Nepal)</p>
      </header>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">1. Information We Collect</h2>
          <p>
            When you register, enroll in an online course, or activate a course code on Hamro LMS, we collect only the information needed to provide course access and student support, such as your name, email address, course enrollment records, and optional profile photo for completion certificates.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">2. How We Use Information</h2>
          <p>
            Your information is used strictly to verify course activation keys, save your video and study note progress, deliver live class updates or announcements you opt into, and issue completion certificates. We never sell student personal information to third parties.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">3. Security &amp; Access Controls</h2>
          <p>
            Hamro LMS uses Firebase Authentication and Firestore access controls so student progress, private support messages, and course credentials remain restricted to authorized users and course instructors.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">4. Account &amp; Data Requests</h2>
          <p>
            For privacy questions, corrections, or account deletion assistance, contact our official support team at{' '}
            <a href={`mailto:${supportEmail}`} className="text-blue-400 hover:underline font-semibold">
              {supportEmail}
            </a>
            .
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={() => onNavigatePath('/')}
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </button>
    </article>
  );
};

export const TermsOfUseView: React.FC<StaticPageProps> = ({
  locale,
  supportEmail,
  onNavigatePath,
}) => {
  const t = getLocaleDict(locale);
  return (
    <article className="max-w-4xl mx-auto py-4 sm:py-6 space-y-6 text-left">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <a
          href={buildLocalizedPath('/', locale)}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePath('/');
          }}
          className="hover:text-white"
        >
          Home
        </a>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 font-semibold" aria-current="page">
          Terms of Use
        </span>
      </nav>

      <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
          <Lock className="w-4 h-4" /> Platform Terms &amp; Guidelines
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Terms of Use – Hamro LMS</h1>
        <p className="text-xs text-zinc-400">Effective Date: January 1, 2026 • Platform: Hamro LMS (Nepal)</p>
      </header>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">1. Course Access &amp; Licensing</h2>
          <p>
            Enrollment and activation codes on Hamro LMS grant an individual learner non-transferable access to the selected course videos, downloadable study PDFs, and eligible live workshops. Sharing activation credentials or redistributing private course materials is prohibited.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">2. Intellectual Property</h2>
          <p>
            All course lessons, templates, PDF handbooks, and educational resources published on Hamro LMS remain the intellectual property of Hamro LMS and its respective instructors.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">3. Refunds &amp; Enrollment Support</h2>
          <p>
            Refund eligibility follows the platform&apos;s published 48-hour request policy and verified payment terms. For enrollment or technical assistance, reach us at{' '}
            <a href={`mailto:${supportEmail}`} className="text-blue-400 hover:underline font-semibold">
              {supportEmail}
            </a>
            .
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={() => onNavigatePath('/')}
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.backHomeBtn}</span>
      </button>
    </article>
  );
};

export const NotFoundView: React.FC<{ locale: SupportedLocale; onNavigatePath: (cleanPath: string) => void }> = ({
  locale,
  onNavigatePath,
}) => {
  const t = getLocaleDict(locale);
  return (
    <section className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-4">
        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black">
          404 • Not Found
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">{t.notFoundTitle}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">{t.notFoundDescription}</p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={buildLocalizedPath('/', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/');
            }}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.backHomeBtn}</span>
          </a>
          <a
            href={buildLocalizedPath('/instructors', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/instructors');
            }}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            {t.instructorsNav}
          </a>
          <a
            href={buildLocalizedPath('/blog', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/blog');
            }}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            {t.blogNav}
          </a>
        </div>
      </div>
    </section>
  );
};
