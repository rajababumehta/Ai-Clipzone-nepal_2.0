export interface CourseVideo {
  title: string;
  duration: string;
  videoUrl: string; // YouTube embed URL or mock URL
  chapterTitle?: string; // Optional chapter/playlist section name e.g. "Chapter 1: Channel Setup & Niche Selection"
}

export interface CoursePdf {
  title: string;
  pdfUrl: string; // Direct PDF URL, Google Drive PDF preview/download link
  chapterTitle?: string; // Optional chapter/section name e.g. "Chapter 1: AI Prompting Blueprint"
  fileSize?: string; // Optional e.g. "2.4 MB" or "15 Pages"
}

export interface Course {
  id: string; // e.g. "ai-masterclass"
  title: string;
  price: string;
  amount: number;
  message: string;
  learn: string[];
  image: string;
  isPopular?: boolean;
  popularText?: string;
  order?: number;
  language?: string;
  videos: CourseVideo[];
  pdfs?: CoursePdf[];
  // Per-course Certificate Customization
  certificateTitle?: string;
  certificateSubtitle?: string;
  certificateInstituteName?: string;
  certificateCourseTitle?: string;
  certificateDescription?: string;
  certificateTheme?: string; // 'blue' | 'cyber-purple' | 'emerald' | 'crimson' | 'gold'
  certificateLogoUrl?: string;
  certificateDirectorName?: string;
  certificateDirectorTitle?: string;
  certificateDirectorSignatureUrl?: string;
  certificateCeoName?: string;
  certificateCeoTitle?: string;
  certificateCeoSignatureUrl?: string;
  certificateStampUrl?: string;
  certificateSealText?: string;
}

export interface CourseRequest {
  id: string;
  userId?: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: number;
  expiresAt?: number;
  duration?: '1month' | '1year';
}

export interface Testimonial {
  name: string;
  location: string;
  course: string;
  text: string;
  avatar: string;
  rating: number;
}

export interface FAQItem {
  id?: string;
  question: string;
  answer: string;
}

export interface PaymentQrConfig {
  esewaId: string;
  accountName: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  whatsappNumber: string;
  qrImageUrl?: string;
  paymentInstruction?: string;
  updatedAt?: number;
}

export interface SiteSettingsConfig {
  siteTitle?: string;
  siteTagline?: string;
  instituteName?: string;
  instituteLogoUrl?: string;
  noticeBannerText?: string;
  showNoticeBanner?: boolean;
  supportEmail?: string;
  supportPhone?: string;
  certificateTitle?: string;
  certificateSubtitle?: string;
  certificateInstituteName?: string;
  certificateLogoUrl?: string;
  certificateDescription?: string;
  certificateDirectorName?: string;
  certificateDirectorTitle?: string;
  certificateDirectorSignatureUrl?: string;
  certificateCeoName?: string;
  certificateCeoTitle?: string;
  certificateCeoSignatureUrl?: string;
  certificateTheme?: string;
  certificateStampUrl?: string;
  certificateSealText?: string;
  apkDownloadUrl?: string;
  updatedAt?: number;
}

export interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export interface ActivationKey {
  id: string; // the unique code e.g. "AI45NP"
  code: string;
  status: 'unused' | 'used';
  duration: '1month' | '1year';
  createdAt: number;
  claimedByEmail?: string;
  claimedByUid?: string;
  claimedAt?: number;
  expiresAt?: number;
  courseId?: string; // "all" or specific courseId e.g. "ai-masterclass"
  courseTitle?: string; // "All Courses" or specific course name
  activeDeviceId?: string;
}

