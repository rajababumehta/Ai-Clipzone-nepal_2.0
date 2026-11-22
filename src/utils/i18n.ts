import { SupportedLocale } from '../types';

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
    homeHeading: 'Online Learning & Practical Digital Skills',
    homeSubheading: 'Multi-Instructor Learning Platform for AI Tools, Video Editing, Design & Web Development',
    homeCtaSubtitle: 'Explore structured video masterclasses, downloadable resources, and verifiable certificates.',
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
    instructorsHeading: 'Meet Our Instructors',
    instructorsSubheading: 'Experienced creators, developers, and educators teaching practical digital skills on HamroLms.',
    blogHeading: 'HamroLms Learning Journal & Guides',
    blogSubheading: 'Practical tutorials on generative AI workflows, video editing, graphic design, and creator careers.',
    readArticleBtn: 'Read Article',
    relatedArticlesTitle: 'Related Articles',
    notFoundTitle: 'Page Not Found (404)',
    notFoundDescription: 'The page you are looking for may have moved or does not exist. Explore our courses, instructors, or articles below.',
    backHomeBtn: 'Back to Home',
    seoHomeTitle: 'HamroLms – Online Learning & Digital Skill Courses',
    seoHomeDescription: 'Learn AI tools, video editing, graphic design, and web development from verified instructors on HamroLms with structured lessons and certificates.',
    seoInstructorsTitle: 'Instructors & Mentors Directory | HamroLms',
    seoInstructorsDescription: 'Meet the instructors and industry mentors teaching AI tools, video editing, graphic design, and digital skills on HamroLms.',
    seoBlogTitle: 'Learning Blog, AI & Creator Guides | HamroLms',
    seoBlogDescription: 'Read practical tutorials and guides on AI tools, video production, prompt engineering, and digital freelancing on the HamroLms Blog.',
  },
  ne: {
    code: 'ne',
    label: 'नेपाली',
    nativeName: 'नेपाली',
    htmlLang: 'ne',
    ogLocale: 'ne_NP',
    homeHeading: 'अनलाइन सिकाइ र व्यावहारिक डिजिटल सीप',
    homeSubheading: 'AI उपकरण, भिडियो सम्पादन, ग्राफिक डिजाइन र वेब विकास सिक्ने बहु-प्रशिक्षक प्लेटफर्म',
    homeCtaSubtitle: 'तपाईंको आवश्यकता अनुसार उत्कृष्ट कोर्ष छनोट गर्नुहोस् र आजैबाट सिक्न सुरु गर्नुहोस्!',
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
    instructorsHeading: 'हाम्रा प्रशिक्षकहरू',
    instructorsSubheading: 'HamroLms मा व्यावहारिक डिजिटल सीप सिकाउने अनुभवी प्रशिक्षक र विशेषज्ञहरू।',
    blogHeading: 'HamroLms सिकाइ ब्लग र गाइडहरू',
    blogSubheading: 'AI उपकरण, भिडियो सम्पादन, डिजाइन र डिजिटल करियर सम्बन्धी उपयोगी लेखहरू।',
    readArticleBtn: 'लेख पढ्नुहोस्',
    relatedArticlesTitle: 'सम्बन्धित लेखहरू',
    notFoundTitle: 'पृष्ठ भेटिएन (404)',
    notFoundDescription: 'तपाईंले खोज्नुभएको पृष्ठ उपलब्ध छैन। कृपया मुख्य पृष्ठ, कोर्ष वा ब्लगमा जानुहोस्।',
    backHomeBtn: 'गृहपृष्ठमा फर्कनुहोस्',
    seoHomeTitle: 'HamroLms – अनलाइन सिकाइ र डिजिटल सीप कोर्षहरू',
    seoHomeDescription: 'HamroLms मा अनुभवी प्रशिक्षकहरूबाट AI उपकरण, भिडियो सम्पादन, ग्राफिक डिजाइन र वेब विकास कोर्षहरू प्रमाणपत्र सहित सिक्नुहोस्।',
    seoInstructorsTitle: 'प्रशिक्षक र मेन्टरहरू | HamroLms',
    seoInstructorsDescription: 'HamroLms मा AI, भिडियो सम्पादन र डिजिटल सीप सिकाउने प्रमाणित प्रशिक्षकहरूको प्रोफाइल हेर्नुहोस्।',
    seoBlogTitle: 'डिजिटल सीप र AI सिकाइ ब्लग | HamroLms',
    seoBlogDescription: 'AI उपकरण, भिडियो निर्माण, प्रम्प्ट इन्जिनियरिङ र अनलाइन करियर बारे उपयोगी लेखहरू HamroLms ब्लगमा पढ्नुहोस्।',
  },
  hi: {
    code: 'hi',
    label: 'हिन्दी',
    nativeName: 'हिन्दी',
    htmlLang: 'hi',
    ogLocale: 'hi_IN',
    homeHeading: 'ऑनलाइन लर्निंग और व्यावहारिक डिजिटल कौशल',
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
    instructorsSubheading: 'HamroLms पर व्यावहारिक डिजिटल कौशल सिखाने वाले अनुभवी प्रशिक्षक और मेंटर्स।',
    blogHeading: 'HamroLms लर्निंग ब्लॉग और गाइड्स',
    blogSubheading: 'AI वर्कफ़्लो, वीडियो एडिटिंग, डिज़ाइन और क्रिएटर ग्रोथ पर उपयोगी ट्यूटोरियल।',
    readArticleBtn: 'लेख पढ़ें',
    relatedArticlesTitle: 'संबंधित लेख',
    notFoundTitle: 'पेज नहीं मिला (404)',
    notFoundDescription: 'आप जिस पेज को खोज रहे हैं वह उपलब्ध नहीं है। नीचे दिए गए कोर्स, प्रशिक्षक या ब्लॉग देखें।',
    backHomeBtn: 'होम पर वापस जाएं',
    seoHomeTitle: 'HamroLms – ऑनलाइन लर्निंग और डिजिटल स्किल कोर्स',
    seoHomeDescription: 'HamroLms पर अनुभवी प्रशिक्षकों से AI टूल्स, वीडियो एडिटिंग, ग्राफिक डिज़ाइन और वेब डेवलपमेंट सीखें और सर्टिफिकेट प्राप्त करें।',
    seoInstructorsTitle: 'प्रशिक्षक और मेंटर्स डायरेक्टरी | HamroLms',
    seoInstructorsDescription: 'HamroLms पर AI, वीडियो एडिटिंग और डिजिटल स्किल्स सिखाने वाले प्रशिक्षकों की प्रोफाइल और कोर्स देखें।',
    seoBlogTitle: 'लर्निंग ब्लॉग और AI गाइड्स | HamroLms',
    seoBlogDescription: 'AI टूल्स, वीडियो प्रोडक्शन, प्रॉम्प्ट इंजीनियरिंग और डिजिटल स्किल्स से जुड़े गाइड्स HamroLms ब्लॉग पर पढ़ें।',
  },
};

export function getLocaleDict(locale: SupportedLocale = 'en'): LocaleDictionary {
  return LOCALE_DICTIONARIES[locale] || LOCALE_DICTIONARIES.en;
}
