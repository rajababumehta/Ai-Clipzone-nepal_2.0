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
  locale: SupportedLocale;
  onNavigatePath: (cleanPath: string) => void;
}

export const HomePlatformOverviewSection: React.FC<HomeOverviewProps> = ({
  courses,
  instructors,
  locale,
  onNavigatePath,
}) => {
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
                <span>Learn in English at your own pace from mobile or laptop.</span>
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
    </div>
  );
};

interface StaticPageProps {
  locale: SupportedLocale;
  supportEmail: string;
  onNavigatePath: (cleanPath: string) => void;
}

export const AboutUsView: React.FC<StaticPageProps> = ({
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
          About Us
        </span>
      </nav>

      <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
          <Sparkles className="w-4 h-4" /> Learn. Apply. Grow.
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">About Us – HamroLms</h1>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
          HamroLms is an online learning and digital skill platform built to help students, creators, and professionals learn AI tools, video editing, graphic design, and web development from verified instructors with structured lessons and certificates.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <h2 className="text-base font-extrabold text-white">Learn Practically</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Every course is organized into step-by-step video chapters and downloadable PDF handbooks so learners can follow clearly at their own pace.
          </p>
        </section>
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <h2 className="text-base font-extrabold text-white">Verified Instructors</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Our courses are taught by verified creators, developers, and educators who actively answer questions and host live interactive workshops.
          </p>
        </section>
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <h2 className="text-base font-extrabold text-white">Structured Certificates</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Eligible programs award digital completion certificates that showcase your real-world AI, video, design, and coding capabilities.
          </p>
        </section>
      </div>

      <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-lg font-extrabold text-white">Our Mission &amp; Support</h2>
        <p>
          Whether you are starting from zero or upgrading your career skills, HamroLms focuses on clarity, speed, and direct mentor access on mobile and desktop devices. Need assistance? Contact{' '}
          <a href={`mailto:${supportEmail}`} className="text-blue-400 hover:underline font-semibold">
            {supportEmail}
          </a>
          .
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <a
            href={buildLocalizedPath('/courses', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/courses');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
          >
            <span>Explore Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <a
            href={buildLocalizedPath('/learn', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/learn');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            <span>Learn. Apply. Grow.</span>
          </a>
          <a
            href={buildLocalizedPath('/privacy-policy', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/privacy-policy');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            <span>Privacy Policy</span>
          </a>
        </div>
      </section>

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

export const LearnApplyGrowView: React.FC<StaticPageProps> = ({
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
          Learn. Apply. Grow.
        </span>
      </nav>

      <header className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <GraduationCap className="w-4 h-4" /> Skill Pathway
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Learn. Apply. Grow. – HamroLms</h1>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
          Follow our practical three-stage digital skill framework to master AI tools, video editing, graphic design, and web development with verified instructors and certificates.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">01 • Learn</span>
          <h2 className="text-lg font-extrabold text-white">Structured Video Chapters</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Watch focused lessons organized by chapters alongside downloadable study guides in English.
          </p>
        </section>
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-400">02 • Apply</span>
          <h2 className="text-lg font-extrabold text-white">Real Creative Workflows</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Practice prompt engineering, video storytelling, visual design, and web builds with direct mentor Q&amp;A support.
          </p>
        </section>
        <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-purple-400">03 • Grow</span>
          <h2 className="text-lg font-extrabold text-white">Certificates &amp; Career Ready</h2>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Earn verifiable digital certificates and apply your skills across freelancing, YouTube, and modern digital careers.
          </p>
        </section>
      </div>

      <section className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-extrabold text-white">Ready to start learning on HamroLms?</h2>
          <p className="text-xs text-zinc-400">Support: {supportEmail}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={buildLocalizedPath('/courses', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/courses');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
          >
            <span>Browse Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
          <a
            href={buildLocalizedPath('/about-us', locale)}
            onClick={(e) => {
              e.preventDefault();
              onNavigatePath('/about-us');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition"
          >
            <span>About Us</span>
          </a>
        </div>
      </section>

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
        <h1 className="text-2xl sm:text-3xl font-black text-white">Privacy Policy – HamroLms</h1>
        <p className="text-xs text-zinc-400">Effective Date: January 1, 2026 • Platform: HamroLms</p>
      </header>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">1. Information We Collect</h2>
          <p>
            When you register, enroll in an online course, or activate a course code on HamroLms, we collect only the information needed to provide course access and student support, such as your name, email address, course enrollment records, and optional profile photo for completion certificates.
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
            HamroLms uses Firebase Authentication and Firestore access controls so student progress, private support messages, and course credentials remain restricted to authorized users and course instructors.
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
        <h1 className="text-2xl sm:text-3xl font-black text-white">Terms of Use – HamroLms</h1>
        <p className="text-xs text-zinc-400">Effective Date: January 1, 2026 • Platform: HamroLms</p>
      </header>

      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">1. Course Access &amp; Licensing</h2>
          <p>
            Enrollment and activation codes on HamroLms grant an individual learner non-transferable access to the selected course videos, downloadable study PDFs, and eligible live workshops. Sharing activation credentials or redistributing private course materials is prohibited.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-extrabold text-white">2. Intellectual Property</h2>
          <p>
            All course lessons, templates, PDF handbooks, and educational resources published on HamroLms remain the intellectual property of HamroLms and its respective instructors.
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

interface ProfileDetailsFaqProps {
  locale: SupportedLocale;
  supportEmail: string;
  onNavigatePath: (cleanPath: string) => void;
}

export const ProfileDetailsFaqSection: React.FC<ProfileDetailsFaqProps> = ({
  locale,
  supportEmail,
  onNavigatePath,
}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const platformDetails = [
    {
      key: 'about-us',
      title: 'About Us – HamroLms',
      body: `HamroLms is an online learning and digital skill platform built to help learners master AI tools, video editing, graphic design, and web development from verified instructors with structured chapters, downloadable notes, and digital certificates.`,
      linkLabel: 'Open About Us Page',
      linkPath: '/about-us',
    },
    {
      key: 'learn-apply-grow',
      title: 'Learn. Apply. Grow.',
      body: '01 • Learn structured video chapters in English. 02 • Apply skills through real creative workflows and mentor Q&A. 03 • Grow your career with verifiable completion certificates.',
      linkLabel: 'Explore Learning Pathway',
      linkPath: '/learn',
    },
    {
      key: 'courses-guide',
      title: 'Courses & Activation Guide',
      body: 'Browse all public courses on Home or the Course Catalog, enroll via QR/eSewa or free signup, and enter your Secret Activation Code in Profile to unlock video lectures and PDF study handbooks.',
      linkLabel: 'Browse All Courses',
      linkPath: '/courses',
    },
    {
      key: 'privacy-policy',
      title: 'Privacy Policy',
      body: `We collect only the details needed for course access, progress saving, and certificates (name, email, enrollment keys, and optional profile photo). Data is protected via Firebase Authentication and Firestore security controls and is never sold. Support: ${supportEmail}.`,
      linkLabel: 'Read Full Privacy Policy',
      linkPath: '/privacy-policy',
    },
    {
      key: 'terms-of-use',
      title: 'Terms of Use',
      body: 'Course activation codes grant individual non-transferable access to videos, study PDFs, and live workshops. Sharing credentials or redistributing private course materials is prohibited. Refund requests follow our published 48-hour policy.',
      linkLabel: 'Read Terms of Use',
      linkPath: '/terms',
    },
    {
      key: 'instructors-blog',
      title: 'Instructors & Learning Blog',
      body: 'Meet our verified instructors, trainers, and mentors or read practical step-by-step guides on AI workflows, video editing, and creator growth.',
      linkLabel: 'Meet Instructors',
      linkPath: '/instructors',
      secondaryLinkLabel: 'Read Blog',
      secondaryLinkPath: '/blog',
    },
  ];

  const toggleItem = (key: string) => {
    setOpenKey((prev) => (prev === key ? null : key));
  };

  return (
    <section
      aria-labelledby="profile-faq-details-heading"
      className="bg-zinc-950/90 border border-zinc-800/80 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3 text-left"
    >
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 id="profile-faq-details-heading" className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Platform Info &amp; Policies
          </h3>
        </div>
        <span className="text-[10px] font-semibold text-zinc-500">Tap to expand</span>
      </div>

      <div className="space-y-2">
        {platformDetails.map((item) => {
          const isOpen = openKey === item.key;
          return (
            <div
              key={item.key}
              className="border border-zinc-800/80 rounded-2xl bg-black/50 overflow-hidden transition-colors"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleItem(item.key)}
                className="w-full px-3.5 py-3 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-zinc-100 hover:text-blue-400 transition cursor-pointer"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-blue-400' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-2.5 border-t border-zinc-900 space-y-2.5 text-xs text-zinc-300 leading-relaxed">
                  <p>{item.body}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <a
                      href={buildLocalizedPath(item.linkPath, locale)}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigatePath(item.linkPath);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>{item.linkLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                    {item.secondaryLinkPath && item.secondaryLinkLabel && (
                      <a
                        href={buildLocalizedPath(item.secondaryLinkPath, locale)}
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigatePath(item.secondaryLinkPath!);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg transition"
                      >
                        <span>{item.secondaryLinkLabel}</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

