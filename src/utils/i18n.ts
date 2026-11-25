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
    seoHomeTitle: 'Hamro LMS – Online Courses & Learning Platform in Nepal',
    seoHomeDescription: 'Learn AI tools, video editing, graphic design, and digital skills on Hamro LMS, an online learning platform in Nepal with expert teachers and certificates.',
    seoInstructorsTitle: 'Instructors & Teachers Directory Nepal | Hamro LMS',
    seoInstructorsDescription: 'Meet the teachers, trainers, and mentors teaching online courses in AI tools, video editing, graphic design, and web development on Hamro LMS Nepal.',
    seoBlogTitle: 'Online Learning Blog, AI Course & Skill Guides | Hamro LMS',
    seoBlogDescription: 'Read practical guides on AI training in Nepal, video production, prompt engineering, and digital skills on the Hamro LMS Learning Blog.',
  },
  ne: {
    code: 'ne',
    label: 'नेपाली',
    nativeName: 'नेपाली',
    htmlLang: 'ne',
    ogLocale: 'ne_NP',
    homeHeading: 'नेपालको अनलाइन सिकाइ र डिजिटल सीप प्लेटफर्म',
    homeSubheading: 'AI तालिम, भिडियो सम्पादन, ग्राफिक डिजाइन र वेब विकास सिक्ने बहु-प्रशिक्षक LMS प्लेटफर्म',
    homeCtaSubtitle: 'तपाईंको आवश्यकता अनुसार उत्कृष्ट अनलाइन कोर्ष छनोट गर्नुहोस् र अनुभवी प्रशिक्षकहरूसँग आजैबाट सिक्न सुरु गर्नुहोस्!',
    coursesBadge: 'कोर्ष सूची',
    instructorsNav: 'प्रशिक्षकहरू',
    blogNav: 'ब्लग',
    coursesNav: 'कोर्षहरू',
    viewCourseBtn: 'कोर्ष विवरण',
    enrollBtn: 'कोर्षमा भर्ना हुनुहोस्',
    goToCourseBtn: 'कोर्षमा जानुहोस्',
    overviewTitle: 'कोर्ष परिचय',
    learnObjectivesTitle: 'तपाईंले के सिक्नुहुनेछ',
    curriculumTitle: 'कोर्ष पाठ्यक्रम (Curriculum)',
    prerequisitesTitle: 'आवश्यक पूर्व-तयारी',
    instructorTitle: 'कोर्ष प्रशिक्षक',
    relatedCoursesTitle: 'सम्बन्धित कोर्षहरू',
    instructorsHeading: 'हाम्रा प्रशिक्षक र शिक्षकहरू',
    instructorsSubheading: 'Hamro LMS Nepal मा व्यावहारिक डिजिटल सीप सिकाउने अनुभवी प्रशिक्षक र विशेषज्ञहरू।',
    blogHeading: 'Hamro LMS सिकाइ ब्लग र गाइडहरू',
    blogSubheading: 'AI उपकरण, भिडियो सम्पादन, डिजाइन र डिजिटल करियर सम्बन्धी उपयोगी लेखहरू।',
    readArticleBtn: 'लेख पढ्नुहोस्',
    relatedArticlesTitle: 'सम्बन्धित लेखहरू',
    notFoundTitle: 'पृष्ठ भेटिएन (404)',
    notFoundDescription: 'तपाईंले खोज्नुभएको पृष्ठ उपलब्ध छैन। कृपया मुख्य पृष्ठ, कोर्ष वा ब्लगमा जानुहोस्।',
    backHomeBtn: 'गृहपृष्ठमा फर्कनुहोस्',
    seoHomeTitle: 'Hamro LMS – नेपालको अनलाइन कोर्ष र सिकाइ प्लेटफर्म',
    seoHomeDescription: 'Hamro LMS नेपालको अनलाइन सिकाइ प्लेटफर्ममा अनुभवी प्रशिक्षकहरूबाट AI तालिम, भिडियो सम्पादन, ग्राफिक डिजाइन र डिजिटल सीप कोर्षहरू सिक्नुहोस्।',
    seoInstructorsTitle: 'प्रशिक्षक र मेन्टरहरू | Hamro LMS Nepal',
    seoInstructorsDescription: 'Hamro LMS मा AI, भिडियो सम्पादन र डिजिटल सीप सिकाउने प्रमाणित प्रशिक्षकहरूको प्रोफाइल हेर्नुहोस्।',
    seoBlogTitle: 'डिजिटल सीप र AI सिकाइ ब्लग | Hamro LMS Nepal',
    seoBlogDescription: 'AI उपकरण, भिडियो निर्माण, प्रम्प्ट इन्जिनियरिङ र अनलाइन करियर बारे उपयोगी लेखहरू Hamro LMS ब्लगमा पढ्नुहोस्।',
  },
  hi: {
    code: 'hi',
    label: 'हिन्दी',
    nativeName: 'हिन्दी',
    htmlLang: 'hi',
    ogLocale: 'hi_IN',
    homeHeading: 'ऑनलाइन लर्निंग और डिजिटल कौशल प्लेटफॉर्म',
    homeSubheading: 'AI टूल्स, वीडियो एडिटिंग, ग्राफिक डिज़ाइन और वेब डेवलपमेंट के लिए मल्टी-इंस्ट्रक्टर प्लेटफॉर्म',
    homeCtaSubtitle: 'संरचित वीडियो कोर्स, अध्ययन सामग्री और सत्यापित प्रमाणपत्र के साथ आज ही सीखना शुरू करें।',
    coursesBadge: 'कोर्स कैटलॉग',
    instructorsNav: 'प्रशिक्षक',
    blogNav: 'ब्लॉग',
    coursesNav: 'कोर्स',
    viewCourseBtn: 'कोर्स विवरण',
    enrollBtn: 'कोर्स में नामांकन करें',
    goToCourseBtn: 'कोर्स पर जाएं',
    overviewTitle: 'कोर्स का परिचय',
    learnObjectivesTitle: 'आप क्या सीखेंगे',
    curriculumTitle: 'कोर्स पाठ्यक्रम',
    prerequisitesTitle: 'आवश्यक योग्यता',
    instructorTitle: 'कोर्स प्रशिक्षक',
    relatedCoursesTitle: 'संबंधित कोर्स',
    instructorsHeading: 'हमारे प्रशिक्षक',
    instructorsSubheading: 'Hamro LMS पर व्यावहारिक डिजिटल कौशल सिखाने वाले अनुभवी प्रशिक्षक और मेंटर्स।',
    blogHeading: 'Hamro LMS लर्निंग ब्लॉग और गाइड्स',
    blogSubheading: 'AI वर्कफ़्लो, वीडियो एडिटिंग, डिज़ाइन और क्रिएटर ग्रोथ पर उपयोगी ट्यूटोरियल।',
    readArticleBtn: 'लेख पढ़ें',
    relatedArticlesTitle: 'संबंधित लेख',
    notFoundTitle: 'पेज नहीं मिला (404)',
    notFoundDescription: 'आप जिस पेज को खोज रहे हैं वह उपलब्ध नहीं है। नीचे दिए गए कोर्स, प्रशिक्षक या ब्लॉग देखें।',
    backHomeBtn: 'होम पर वापस जाएं',
    seoHomeTitle: 'Hamro LMS – ऑनलाइन कोर्स और लर्निंग प्लेटफॉर्म नेपाल',
    seoHomeDescription: 'Hamro LMS ऑनलाइन लर्निंग प्लेटफॉर्म पर अनुभवी शिक्षकों से AI टूल्स, वीडियो एडिटिंग, ग्राफिक डिज़ाइन और डिजिटल कौशल सीखें।',
    seoInstructorsTitle: 'प्रशिक्षक और मेंटर्स डायरेक्टरी | Hamro LMS',
    seoInstructorsDescription: 'Hamro LMS पर AI, वीडियो एडिटिंग और डिजिटल स्किल्स सिखाने वाले प्रशिक्षकों की प्रोफाइल और कोर्स देखें।',
    seoBlogTitle: 'लर्निंग ब्लॉग और AI गाइड्स | Hamro LMS',
    seoBlogDescription: 'AI टूल्स, वीडियो प्रोडक्शन, प्रॉम्प्ट इंजीनियरिंग और डिजिटल स्किल्स से जुड़े गाइड्स Hamro LMS ब्लॉग पर पढ़ें।',
  },
};

export function getLocaleDict(locale: SupportedLocale = 'en'): LocaleDictionary {
  return LOCALE_DICTIONARIES[locale] || LOCALE_DICTIONARIES.en;
}
