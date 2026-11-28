import type { SupportedLocale } from '../types.ts';

export interface LocaleDictionary {
  code: SupportedLocale;
  label: string;
  nativeName: string;
  htmlLang: string;
  ogLocale: string;
  homeHeading: string;
  homeSubheading: string;
  homeCtaSubtitle: string;
  coursesBadge: string;
  instructorsNav: string;
  blogNav: string;
  coursesNav: string;
  viewCourseBtn: string;
  enrollBtn: string;
  goToCourseBtn: string;
  overviewTitle: string;
  learnObjectivesTitle: string;
  curriculumTitle: string;
  prerequisitesTitle: string;
  instructorTitle: string;
  relatedCoursesTitle: string;
  instructorsHeading: string;
  instructorsSubheading: string;
  blogHeading: string;
  blogSubheading: string;
  readArticleBtn: string;
  relatedArticlesTitle: string;
  notFoundTitle: string;
  notFoundDescription: string;
  backHomeBtn: string;
  seoHomeTitle: string;
  seoHomeDescription: string;
  seoCoursesTitle: string;
  seoCoursesDescription: string;
  seoAboutTitle: string;
  seoAboutDescription: string;
  seoLearnTitle: string;
  seoLearnDescription: string;
  seoInstructorsTitle: string;
  seoInstructorsDescription: string;
  seoBlogTitle: string;
  seoBlogDescription: string;
}

export const LOCALE_DICTIONARIES: Record<SupportedLocale, LocaleDictionary> = {
  en: {
    code: 'en',
    label: 'EN',
    nativeName: 'English',
    htmlLang: 'en',
    ogLocale: 'en_US',
    homeHeading: 'Online Courses & Learning Platform in Nepal',
    homeSubheading: 'Multi-Instructor Learning Management System for AI Training, Video Editing, Design & Digital Skills',
    homeCtaSubtitle: 'Learn practical digital skills from multiple teachers and trainers in Nepal with structured lessons, study notes, and verified certificates.',
    coursesBadge: 'Course Catalog',
    instructorsNav: 'Instructors',
    blogNav: 'Blog',
    coursesNav: 'Courses',
    viewCourseBtn: 'Course Details',
    enrollBtn: 'Enroll & Activate Course',
    goToCourseBtn: 'Go to Course',
    overviewTitle: 'Course Overview',
    learnObjectivesTitle: 'What You Will Learn',
    curriculumTitle: 'Public Course Curriculum',
    prerequisitesTitle: 'Prerequisites',
    instructorTitle: 'Course Instructor',
    relatedCoursesTitle: 'Related Courses',
    instructorsHeading: 'Meet Our Instructors & Trainers',
    instructorsSubheading: 'Experienced teachers, developers, and creators teaching practical online courses on Hamro LMS Nepal.',
    blogHeading: 'Hamro LMS Learning Blog & Guides',
    blogSubheading: 'Practical tutorials on AI training in Nepal, video editing workflows, and digital skill development.',
    readArticleBtn: 'Read Article',
    relatedArticlesTitle: 'Related Articles',
    notFoundTitle: 'Page Not Found (404)',
    notFoundDescription: 'The page you are looking for may have moved or does not exist. Explore our online courses, instructors, or articles below.',
    backHomeBtn: 'Back to Home',
    seoHomeTitle: 'HamroLms – Online Learning & Digital Skill Courses',
    seoHomeDescription: 'Learn AI tools, video editing, graphic design, and web development from verified instructors on HamroLms with structured lessons and certificates.',
    seoCoursesTitle: 'Course Catalog – Online Digital Skill Courses | HamroLms',
    seoCoursesDescription: 'Explore all structured online courses on HamroLms including AI tools, video editing, graphic design, and web development with certificates.',
    seoAboutTitle: 'About Us – HamroLms Online Learning Platform',
    seoAboutDescription: 'Learn about HamroLms, our verified instructors, structured video modules, study notes, and digital skill certificates for learners in Nepal and beyond.',
    seoLearnTitle: 'Learn. Apply. Grow. – Skill Learning Pathway | HamroLms',
    seoLearnDescription: 'Learn practical digital skills, apply them on real creative projects, and grow your career with verified certificates on HamroLms.',
    seoInstructorsTitle: 'Instructors & Teachers Directory | HamroLms',
    seoInstructorsDescription: 'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on HamroLms.',
    seoBlogTitle: 'Online Learning Blog, AI Course & Skill Guides | HamroLms',
    seoBlogDescription: 'Read practical guides on AI training, video production, prompt engineering, and digital skills on the HamroLms Learning Blog.',
  },
  ne: {
    code: 'en',
    label: 'EN',
    nativeName: 'English',
    htmlLang: 'en',
    ogLocale: 'en_US',
    homeHeading: 'Online Courses & Learning Platform in Nepal',
    homeSubheading: 'Multi-Instructor Learning Management System for AI Training, Video Editing, Design & Digital Skills',
    homeCtaSubtitle: 'Learn practical digital skills from multiple teachers and trainers in Nepal with structured lessons, study notes, and verified certificates.',
    coursesBadge: 'Course Catalog',
    instructorsNav: 'Instructors',
    blogNav: 'Blog',
    coursesNav: 'Courses',
    viewCourseBtn: 'Course Details',
    enrollBtn: 'Enroll & Activate Course',
    goToCourseBtn: 'Go to Course',
    overviewTitle: 'Course Overview',
    learnObjectivesTitle: 'What You Will Learn',
    curriculumTitle: 'Public Course Curriculum',
    prerequisitesTitle: 'Prerequisites',
    instructorTitle: 'Course Instructor',
    relatedCoursesTitle: 'Related Courses',
    instructorsHeading: 'Meet Our Instructors & Trainers',
    instructorsSubheading: 'Experienced teachers, developers, and creators teaching practical online courses on Hamro LMS Nepal.',
    blogHeading: 'Hamro LMS Learning Blog & Guides',
    blogSubheading: 'Practical tutorials on AI training in Nepal, video editing workflows, and digital skill development.',
    readArticleBtn: 'Read Article',
    relatedArticlesTitle: 'Related Articles',
    notFoundTitle: 'Page Not Found (404)',
    notFoundDescription: 'The page you are looking for may have moved or does not exist. Explore our online courses, instructors, or articles below.',
    backHomeBtn: 'Back to Home',
    seoHomeTitle: 'HamroLms – Online Learning & Digital Skill Courses',
    seoHomeDescription: 'Learn AI tools, video editing, graphic design, and web development from verified instructors on HamroLms with structured lessons and certificates.',
    seoCoursesTitle: 'Course Catalog – Online Digital Skill Courses | HamroLms',
    seoCoursesDescription: 'Explore all structured online courses on HamroLms including AI tools, video editing, graphic design, and web development with certificates.',
    seoAboutTitle: 'About Us – HamroLms Online Learning Platform',
    seoAboutDescription: 'Learn about HamroLms, our verified instructors, structured video modules, study notes, and digital skill certificates for learners in Nepal and beyond.',
    seoLearnTitle: 'Learn. Apply. Grow. – Skill Learning Pathway | HamroLms',
    seoLearnDescription: 'Learn practical digital skills, apply them on real creative projects, and grow your career with verified certificates on HamroLms.',
    seoInstructorsTitle: 'Instructors & Teachers Directory | HamroLms',
    seoInstructorsDescription: 'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on HamroLms.',
    seoBlogTitle: 'Online Learning Blog, AI Course & Skill Guides | HamroLms',
    seoBlogDescription: 'Read practical guides on AI training, video production, prompt engineering, and digital skills on the HamroLms Learning Blog.',
  },
  hi: {
    code: 'en',
    label: 'EN',
    nativeName: 'English',
    htmlLang: 'en',
    ogLocale: 'en_US',
    homeHeading: 'Online Courses & Learning Platform in Nepal',
    homeSubheading: 'Multi-Instructor Learning Management System for AI Training, Video Editing, Design & Digital Skills',
    homeCtaSubtitle: 'Learn practical digital skills from multiple teachers and trainers in Nepal with structured lessons, study notes, and verified certificates.',
    coursesBadge: 'Course Catalog',
    instructorsNav: 'Instructors',
    blogNav: 'Blog',
    coursesNav: 'Courses',
    viewCourseBtn: 'Course Details',
    enrollBtn: 'Enroll & Activate Course',
    goToCourseBtn: 'Go to Course',
    overviewTitle: 'Course Overview',
    learnObjectivesTitle: 'What You Will Learn',
    curriculumTitle: 'Public Course Curriculum',
    prerequisitesTitle: 'Prerequisites',
    instructorTitle: 'Course Instructor',
    relatedCoursesTitle: 'Related Courses',
    instructorsHeading: 'Meet Our Instructors & Trainers',
    instructorsSubheading: 'Experienced teachers, developers, and creators teaching practical online courses on Hamro LMS Nepal.',
    blogHeading: 'Hamro LMS Learning Blog & Guides',
    blogSubheading: 'Practical tutorials on AI training in Nepal, video editing workflows, and digital skill development.',
    readArticleBtn: 'Read Article',
    relatedArticlesTitle: 'Related Articles',
    notFoundTitle: 'Page Not Found (404)',
    notFoundDescription: 'The page you are looking for may have moved or does not exist. Explore our online courses, instructors, or articles below.',
    backHomeBtn: 'Back to Home',
    seoHomeTitle: 'HamroLms – Online Learning & Digital Skill Courses',
    seoHomeDescription: 'Learn AI tools, video editing, graphic design, and web development from verified instructors on HamroLms with structured lessons and certificates.',
    seoCoursesTitle: 'Course Catalog – Online Digital Skill Courses | HamroLms',
    seoCoursesDescription: 'Explore all structured online courses on HamroLms including AI tools, video editing, graphic design, and web development with certificates.',
    seoAboutTitle: 'About Us – HamroLms Online Learning Platform',
    seoAboutDescription: 'Learn about HamroLms, our verified instructors, structured video modules, study notes, and digital skill certificates for learners in Nepal and beyond.',
    seoLearnTitle: 'Learn. Apply. Grow. – Skill Learning Pathway | HamroLms',
    seoLearnDescription: 'Learn practical digital skills, apply them on real creative projects, and grow your career with verified certificates on HamroLms.',
    seoInstructorsTitle: 'Instructors & Teachers Directory | HamroLms',
    seoInstructorsDescription: 'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on HamroLms.',
    seoBlogTitle: 'Online Learning Blog, AI Course & Skill Guides | HamroLms',
    seoBlogDescription: 'Read practical guides on AI training, video production, prompt engineering, and digital skills on the HamroLms Learning Blog.',
  },
};

export function getLocaleDict(_locale: SupportedLocale = 'en'): LocaleDictionary {
  return LOCALE_DICTIONARIES.en;
}
