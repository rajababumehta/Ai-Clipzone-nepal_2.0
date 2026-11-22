import React from 'react';
import { ArrowLeft, BookOpen, Compass, FileText, GraduationCap } from 'lucide-react';
import { SupportedLocale } from '../types';
import { getLocaleDict } from '../utils/i18n';

interface NotFoundViewProps {
  locale: SupportedLocale;
  onNavigatePath: (cleanPath: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ locale, onNavigatePath }) => {
  const t = getLocaleDict(locale);

  return (
    <section className="max-w-2xl mx-auto py-14 sm:py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-blue-400">
        <Compass className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black tracking-wider uppercase">
          404 Error
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {t.notFoundTitle}
        </h1>
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
          {t.notFoundDescription}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => onNavigatePath('/')}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backHomeBtn}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigatePath('/')}
          className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span>{t.coursesNav}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigatePath('/instructors')}
          className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
        >
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>{t.instructorsNav}</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigatePath('/blog')}
          className="px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
        >
          <FileText className="w-4 h-4 text-amber-400" />
          <span>{t.blogNav}</span>
        </button>
      </div>
    </section>
  );
};
