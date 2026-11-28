import type { Course, CoursePdf, Testimonial, FAQItem, PaymentQrConfig, SiteSettingsConfig } from './types.ts';

export const DEFAULT_PAYMENT_CONFIG: PaymentQrConfig = {
  esewaId: "9763323268",
  accountName: "Ayush Chaurasiya",
  bankName: "Global IME / Nabil Bank",
  bankAccountNo: "",
  bankBranch: "",
  whatsappNumber: "9763323268",
  qrImageUrl: "",
  paymentInstruction: "📌 Payment Instruction: Scan the QR code or send the amount to our eSewa ID, then send the payment screenshot on WhatsApp.",
};

export const cleanLegacyLogoUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '/logo.png';
  const trimmed = url.trim();
  if (
    !trimmed ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed.includes('blogger.googleusercontent.com') ||
    trimmed.includes('IMG_20260817') ||
    trimmed.includes('AVvXsE') ||
    trimmed.includes('12844.png') ||
    trimmed.includes('30142.png')
  ) {
    return '/logo.png';
  }
  return trimmed;
};

export const normalizeLegacyBrandText = (val?: string): string => {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/AI\s*CLIPZONE\s*NEPAL/g, 'HAMROLMS')
    .replace(/AI\s*CLIPZONE/g, 'HAMROLMS')
    .replace(/a[il]\s*clipzone\s*nepal/gi, 'HamroLms')
    .replace(/a[il]\s*clipzone/gi, 'HamroLms')
    .replace(/clipzone\s*nepal/gi, 'HamroLms')
    .replace(/clipzone/gi, 'HamroLms');
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsConfig = {
  siteTitle: "Hamro LMS – Online Courses & Learning Platform in Nepal",
  siteTagline: "Nepal's Online Learning Platform & Multi-Instructor LMS",
  instituteName: "Hamro LMS",
  instituteLogoUrl: "/logo.png",
  noticeBannerText: "🎉 New AI Tools & YouTube Blueprint Masterclasses Live! 50% Early Bird Discount.",
  showNoticeBanner: false,
  supportEmail: "support.hamrolms@gmail.com",
  supportPhone: "9763323268",
  certificateTitle: "CERTIFICATE",
  certificateSubtitle: "OF ACHIEVEMENT",
  certificateInstituteName: "HAMROLMS",
  certificateLogoUrl: "",
  certificateDescription: "an advanced training in 30+ AI Tools covering AI Video Creation, AI Image Generation, AI Music & Song Creation, Graphic Design, Website Development, Professional Presentations, and other AI-powered digital skills.",
  certificateDirectorName: "Director",
  certificateDirectorTitle: "Program Director",
  certificateDirectorSignatureUrl: "",
  certificateCeoName: "Founder & CEO (HamroLms)",
  certificateCeoTitle: "Founder & CEO, HamroLms",
  certificateCeoSignatureUrl: "",
  certificateTheme: "blue",
  certificateStampUrl: "",
  certificateSealText: "OFFICIAL VERIFIED CERTIFICATE • HAMROLMS",
  apkDownloadUrl: "",
};

export const COURSES: Course[] = [
  {
    id: "Ai master class course by Ai clipzone",
    slug: "ai-master-class-course-by-hamrolms",
    title: "AI Master Class Course by Hamro LMS",
    seoTitle: "AI Master Class Course in Nepal – AI Training | Hamro LMS",
    seoDescription: "Join the AI Master Class Course on Hamro LMS Nepal. Learn 30+ AI tools for video creation, image generation, AI music, presentations, and web design.",
    overview: "A practical AI training course in Nepal covering 30+ generative AI tools for AI video creation, image generation, AI song production, presentation design, and website building.",
    category: "AI Training Nepal",
    level: "All Levels",
    instructorSlug: "rajababu-mehta",
    instructorName: "Rajababu Mehta",
    order: 0,
    price: "Rs. 449",
    amount: 449,
    message: "I want to buy AI Master Class Course by Hamro LMS",
    learn: [
      "30+ AI Tools Mastery",
      "AI Video & Image Generation",
      "AI Songs Creation",
      "Presentation & Website Design"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiMBjnyDK0lXwuSXOriM05OQPKeCOWsX3jnnrZUrQMK-RlYRTM91s3c-tpEwRCOzGlyUUS3c3fpqMmQRtMiVweJRI2x1W7IW_7rwTv5D5cDK4h_jHUKOG2chJQEMkJA2rEoH60zX9vsZZqJlB53bn7n9DYa2_cdL67FbtC3qjzbH1EQEbjJdaigkzFgL2Zn/s1685/37585.png",
    isPopular: true,
    popularText: "🔥 MOST POPULAR - BEST SELLER",
    language: "English",
    videos: [
      {
        videoUrl: "https://youtu.be/QivoSbWmD9o?si=34&t=34",
        chapterTitle: "Chapter 1: Course Introduction",
        title: "AI Master Class Full Course by Hamro LMS (2026 September 6)",
        duration: "3:07:37"
      },
      {
        title: "AI Master Class Full Course by Hamro LMS (2026 January)",
        videoUrl: "https://youtu.be/EqbNaDUVdqA?si=A-5giAweE0pRsPPm",
        duration: "3:11:13",
        chapterTitle: "Chapter 1: Course Introduction"
      }
    ],
    pdfs: [
      {
        title: "Ai tools & promt technique pdf",
        chapterTitle: "Chapter 1: Course Notes",
        pdfUrl: "https://drive.google.com/file/d/1jET6Ddfkgqn26QSisuLhaE3G6AMJw5u2/view?usp=drivesdk",
        fileSize: "PDF Document"
      },
      {
        fileSize: "PDF Document",
        pdfUrl: "https://drive.google.com/file/d/1TDQtnir-6HonKOagoi1Vw5mQ9ez1Xu0b/view?usp=drivesdk",
        chapterTitle: "Chapter 1: Course Notes",
        title: "Course about pdf ai tools "
      }
    ]
  },
  {
    id: "youtube-blueprint-course-by-al-clipzone",
    slug: "youtube-blueprint-course-by-hamrolms",
    title: "YouTube Blueprint Course by Hamro LMS",
    seoTitle: "YouTube Blueprint Course in Nepal – Creator Training | Hamro LMS",
    seoDescription: "Learn YouTube channel setup, storytelling scripts, video editing, thumbnail design, and AI content workflows on Hamro LMS online learning platform in Nepal.",
    overview: "Step-by-step creator training covering YouTube niche selection, script storytelling, high-retention editing, thumbnail strategy, growth systems, and AI-assisted content workflows.",
    category: "Creator Growth",
    level: "All Levels",
    instructorSlug: "rajababu-mehta",
    instructorName: "Rajababu Mehta",
    order: 1,
    price: "Rs. 849",
    amount: 849,
    message: "I want to buy YouTube Blueprint Course by Hamro LMS",
    learn: [
      "Channel setup & niche selection",
      "Finding winning video ideas",
      "Script writing & storytelling",
      "Shooting & presentation",
      "Editing skills",
      "Thumbnail & title strategy",
      "YouTube growth strategy",
      "Monetization & earning methods",
      "Creating content with AI tools"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh0HHAMfJvAn3a08BTUd1ayj-Jo1A0C8abgyeft2SGJw_Q-AeiLwxD0DY6Ho8IcmU62EXVnzDtHJ4bZErIVuFi8vGipXH9AxO6vRwesLUcHIVLLbozUyVwq4mZFEixr2vEduC-RxIQ5q13R-tngJPDFgCA0oJr9EbVuivCA6VCTz1BLb3Y9DcZJQtcroANa/s1672/37587.png",
    isPopular: false,
    language: "English",
    videos: [],
    pdfs: []
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Anamol Sharma",
    location: "Kathmandu",
    course: "AI Master Class",
    text: "Learning 30+ AI tools in a single course was super valuable. The studio-style lessons and practical workflows made my work much more professional.",
    avatar: "🧔",
    rating: 5
  },
  {
    name: "Harsh Sapkota",
    location: "Pokhara",
    course: "AI Video + Image",
    text: "I was amazed to get such high-quality training at this price. My YouTube channel doubled in growth within just 3 months.",
    avatar: "👨‍💼",
    rating: 5
  },
  {
    name: "Saroj Maharjan",
    location: "Lalitpur",
    course: "AI Song Creation",
    text: "After learning voice cloning and AI song production, I am already releasing my own tracks. Lifetime access is the best part.",
    avatar: "🎤",
    rating: 5
  },
  {
    name: "Priya Shrestha",
    location: "Biratnagar",
    course: "AI Presentation",
    text: "My office presentations are now ready in 10 minutes, and my manager praised the design quality. Thank you HamroLms!",
    avatar: "👩‍💼",
    rating: 5
  },
  {
    name: "Aashish Khadka",
    location: "Pokhara",
    course: "AI Master Class",
    text: "Got hands-on training for tools like Midjourney, Runway, and Leonardo. I went from a complete beginner to a confident AI creator.",
    avatar: "📸",
    rating: 5
  },
  {
    name: "Roshan Thapa",
    location: "Chitwan",
    course: "AI Video Creation",
    text: "After learning how to create talking avatar videos, my business promo videos look far more engaging. Highly recommended!",
    avatar: "🎥",
    rating: 5
  },
  {
    name: "Srijana Karki",
    location: "Kathmandu",
    course: "AI Image + Song",
    text: "The lessons are explained in a clear, beginner-friendly way. AI has given my creative projects a whole new direction.",
    avatar: "🌸",
    rating: 5
  },
  {
    name: "Bikash Gurung",
    location: "Dharan",
    course: "AI Master Class",
    text: "Got lifetime access along with a verified certificate. Now I even teach these digital workflows to others. Best investment!",
    avatar: "💰",
    rating: 5
  },
  {
    name: "Nisha Adhikari",
    location: "Bhaktapur",
    course: "AI Presentation",
    text: "Used AI presentations for my college projects and topped the class. Even my teachers asked how I designed the slides so cleanly.",
    avatar: "🎓",
    rating: 5
  },
  {
    name: "Suman Rai",
    location: "Pokhara",
    course: "AI Video + Song",
    text: "Received course access within 2 minutes of payment, and the support team is super responsive. Easily one of the best online courses available.",
    avatar: "🚀",
    rating: 5
  }
];

export const FAQS: FAQItem[] = [];

