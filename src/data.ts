import { Course, CoursePdf, Testimonial, FAQItem, PaymentQrConfig, SiteSettingsConfig } from './types';

export const DEFAULT_PAYMENT_CONFIG: PaymentQrConfig = {
  esewaId: "9763323268",
  accountName: "Ayush Chaurasiya",
  bankName: "Global IME / Nabil Bank",
  bankAccountNo: "",
  bankBranch: "",
  whatsappNumber: "9763323268",
  qrImageUrl: "",
  paymentInstruction: "📌 भुक्तानी निर्देशन: QR स्क्यान गरी वा eSewa ID मा रकम पठाएर स्क्रीनसट WhatsApp मा पठाउनुहोस्।",
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsConfig = {
  siteTitle: "TOP AI COURSE NEPAL 🇳🇵",
  siteTagline: "Nepal's #1 AI Video Editing & Learning Platform",
  instituteName: "AI Clipzone",
  instituteLogoUrl: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh7aJwyICAKblH7QvXyJ2rlMp69h1WQKLqUZscgVpXPB5rtceSU6qTJ3toQOJO4ZLJbpJd0OSSAGDCz0ehv0E3lZIXFvGOwq2OE4hQ0lxkEYw5awj68gqPYi4KX5_OkIB0zKWRwKlp7RKX8WBO1Elw5iJ21XCWjp65lemWCZPCCiyYI8vnoLpZ0m-zLPBwl/s1074/IMG_20260817_134049_273.png",
  noticeBannerText: "🎉 New AI Tools & YouTube Blueprint Masterclasses Live! 50% Early Bird Discount.",
  showNoticeBanner: true,
  supportEmail: "ai.clipzone.edu@gmail.com",
  supportPhone: "9763323268",
  certificateTitle: "CERTIFICATE",
  certificateSubtitle: "OF ACHIEVEMENT",
  certificateInstituteName: "AI CLIPZONE NEPAL",
  certificateLogoUrl: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh7aJwyICAKblH7QvXyJ2rlMp69h1WQKLqUZscgVpXPB5rtceSU6qTJ3toQOJO4ZLJbpJd0OSSAGDCz0ehv0E3lZIXFvGOwq2OE4hQ0lxkEYw5awj68gqPYi4KX5_OkIB0zKWRwKlp7RKX8WBO1Elw5iJ21XCWjp65lemWCZPCCiyYI8vnoLpZ0m-zLPBwl/s1074/IMG_20260817_134049_273.png",
  certificateDescription: "an advanced training in 30+ AI Tools covering AI Video Creation, AI Image Generation, AI Music & Song Creation, Graphic Design, Website Development, Professional Presentations, and other AI-powered digital skills.",
  certificateDirectorName: "Director",
  certificateDirectorTitle: "Course Director",
  certificateDirectorSignatureUrl: "",
  certificateCeoName: "Founder/CEO (AI Clipzone)",
  certificateCeoTitle: "Founder & CEO",
  certificateCeoSignatureUrl: "",
  certificateTheme: "blue",
  certificateStampUrl: "",
  certificateSealText: "AI CLIPZONE • OFFICIALLY VERIFIED •",
  apkDownloadUrl: "",
};

export const COURSES: Course[] = [
  {
    id: "al-master-class-course-by-al-clipzone",
    title: "Al Master Class Course by Al Clipzone",
    order: 0,
    price: "Rs. 449",
    amount: 449,
    message: "I want to buy Ai master class by dhruv rather ",
    learn: [
      "30+ Al Tools Mastery",
      "Al Video & Image Generation",
      "Al Songs Creation",
      "Presentation & Website Design"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiI6q11UwbnIp-U7yN_NZi3p9W2QuqU4gNTcwUrQHpQ9BjvwRdFd0wRnZke-p9TJfULwJmqx07Qq4tEHuehoBh6ea_Yhfbx9sl4XGKqke1HA43rkqRVYR37fsI5DXmCff4LZZYXUVawHNugWiFNXXyG8J0Wv5uUM5xxcsSv-pOnYX9v37fjy_qEv5p5Zq8l/s1386/2236.png",
    isPopular: true,
    popularText: "🔥 MOST POPULAR - BEST SELLER",
    language: "Hindi",
    videos: [],
    pdfs: []
  },
  {
    id: "youtube-blueprint-course-by-al-clipzone",
    title: "YouTube Blueprint Course by Al Clipzone",
    order: 1,
    price: "Rs. 849",
    amount: 849,
    message: "I want to buy YouTube blue print course",
    learn: [
      "Channel setup र niche छनोट",
      "Video idea खोज्ने तरिका",
      "Script writing storytelling",
      "Shooting presentation",
      "Editing skills",
      "Thumbnail title 13",
      "YouTube growth strategy",
      "Monetizationearning methods",
      "Al tools प्रयोग गरेर content बनाउन े तरिका"
    ],
    image: "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgXZL_14KcAVWtUkV6YOCtIePNyDndSmM7r8dFVVyp1QXLTKJzStC3O1pSK3-pwsFKhOE0RLyPfXYUo_S6ARYjLWBuRH0Ao5hipjntJKBptoXhsNU584o_EKJb-JfmGyzn57edya_hzH9RqwBvtQjwGaMIasclVW5BGKE0Uef6nDSgBiqr7diao-4seXWlX/s1600/12843.jpg",
    isPopular: false,
    language: "Hindi",
    videos: [],
    pdfs: []
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Anamol Sharma",
    location: "Kathmandu",
    course: "AI Master Class",
    text: "30+ AI tools एकै कोर्समा सिक्न पाउँदा धेरै फाइदा भयो। Dhruv Rathee style presentation ले मेरो काम अझ professional बनायो।",
    avatar: "🧔",
    rating: 5
  },
  {
    name: "Harsh Sapkota",
    location: "Pokhara",
    course: "AI Video + Image",
    text: "यो price मा यति राम्रो content पाउँदा अचम्म लाग्यो। मेरो YouTube channel को growth 3 महिनामा दोब्बर भयो।",
    avatar: "👨‍💼",
    rating: 5
  },
  {
    name: "Saroj Maharjan",
    location: "Lalitpur",
    course: "AI Song Creation",
    text: "Voice cloning र AI song बनाउने तरिका सिकेर म आहाई song release गर्दैछु। Lifetime access को सबैभन्दा राम्रो फाइदा।",
    avatar: "🎤",
    rating: 5
  },
  {
    name: "Priya Shrestha",
    location: "Biratnagar",
    course: "AI Presentation",
    text: "Office presentation हरू अब 10 मिनेटमै तयार हुन्छन्। Boss ले पनि praise गर्नुभयो। धन्यवाद Clipzone!",
    avatar: "👩‍💼",
    rating: 5
  },
  {
    name: "Aashish Khadka",
    location: "Pokhara",
    course: "AI Master Class",
    text: "Midjourney, Runway, Leonardo जस्ता tools को राम्रो training पाएँ। Beginner बाट अब confident AI user बनेको छु।",
    avatar: "📸",
    rating: 5
  },
  {
    name: "Roshan Thapa",
    location: "Chitwan",
    course: "AI Video Creation",
    text: "Talking avatar video बनाउन सिकेपछि मेरो business को promo video हरू धेरै राम्रो बन्छ। Highly recommended!",
    avatar: "🎥",
    rating: 5
  },
  {
    name: "Srijana Karki",
    location: "Kathmandu",
    course: "AI Image + Song",
    text: "महिलाको लागि पनि सजिलै बुझिने भाषामा course बनाइएको छ। AI ले मेरो creativity लाई नयाँ उडान दियो।",
    avatar: "🌸",
    rating: 5
  },
  {
    name: "Bikash Gurung",
    location: "Dharan",
    course: "AI Master Class",
    text: "Certificate सहित lifetime access पाएँ। अहिले आफैंले सिकाएर अरूलाई course बेच्दैछु। Best investment!",
    avatar: "💰",
    rating: 5
  },
  {
    name: "Nisha Adhikari",
    location: "Bhaktapur",
    course: "AI Presentation",
    text: "College project हरूमा AI presentation प्रयोग गरेर Topper बनेकी छु। Teachers ले पनि सोध्न थाल्नुभयो कसरी बनाएको भनेर।",
    avatar: "🎓",
    rating: 5
  },
  {
    name: "Suman Rai",
    location: "Pokhara",
    course: "AI Video + Song",
    text: "Payment गरेको २ मिनेटमै access पाएँ। Support team पनि अति responsive। Nepal मा यस्तो quality course पाउन गाह्रो छ।",
    avatar: "🚀",
    rating: 5
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "यो course recorded हो कि live class मा?",
    answer: "यो course मा कुनै पनि Live Class छैन। सबै Recorded Videos बनाइएको छ। तपाईं आफ्नो सुविधा अनुसार जुनसुकै समयमा पनि हेर्न सक्नुहुन्छ (Offline / Online)."
  },
  {
    question: "यो course मा lifetime access हुन्छ?",
    answer: "हो, एक पटक किन्नुभयो भने Lifetime Access + सबै Future Updates नि:शुल्क पाउनुहुन्छ।"
  },
  {
    question: "Payment कसरी गर्ने?",
    answer: "WhatsApp वा QR स्क्यान गरी eSewa (ID: 9763323268 - Ayush Chaurasiya) वा Bank Transfer मार्फत सजिलै भुक्तानी गर्न सक्नुहुन्छ।"
  },
  {
    question: "Refund & Return Policy (रिफन्ड तथा फिर्ता नीति) के छ?",
    answer: "कोर्स खरिद गरेको २ दिन (४८ घण्टा) भित्र रिफन्डको लागि आवेदन दिन सकिन्छ। सम्झौता अनुसार ५०% क्यास (50% Cash Return) उपलब्ध गराइनेछ र उक्त रकम आवेदन दर्ता भएको ३0 दिन पछि फिर्ता (Return) हुनेछ।"
  },
  {
    question: "Course भाषा के हो?",
    answer: "सबै courses नेपाली र हिन्दी भाषामा छन् जसले गर्दा सजिलै बुझ्न सकिन्छ।"
  },
  {
    question: "Certificate पाइन्छ कि पाइँदैन?",
    answer: "हो, Course पूरा गरेपछि Professional Completion Certificate उपलब्ध गराइन्छ।"
  }
];
