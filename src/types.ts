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
  isFree?: boolean;
  message: string;
  learn: string[];
  image: string;
  isPopular?: boolean;
  popularText?: string;
  order?: number;
  language?: string;
  videos: CourseVideo[];
  pdfs?: CoursePdf[];
  // Main-Admin-only delivery & certificate toggles
  includeLive?: boolean;
  includeCertificate?: boolean;
  hasLiveSessions?: boolean;
  isHidden?: boolean;
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
  // Per-course Payment & WhatsApp override (editable by Main Admin or Course Sub-Admin)
  paymentConfig?: CoursePaymentConfig;
  lastEditedBySubAdminCode?: string;
  // Optional Public SEO Metadata (public-safe only; never contains private lesson URLs)
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  overview?: string;
  prerequisites?: string[];
  instructorSlug?: string;
  instructorName?: string;
  category?: string;
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  updatedAt?: number;
}

export type SupportedLocale = 'en' | 'ne' | 'hi';

export interface PublicInstructorProfile {
  slug: string;
  name: string;
  role: string;
  headline: string;
  bio: string;
  expertise: string[];
  avatarUrl?: string;
  location?: string;
  languages: string[];
  courseIds: string[];
  isFounder?: boolean;
  socialLinks?: {
    website?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface BlogArticleSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  excerpt: string;
  category: string;
  tags: string[];
  authorSlug: string;
  publishedAt: string; // ISO 8601 e.g. "2026-09-15"
  updatedAt: string; // ISO 8601 e.g. "2026-11-20"
  readTimeMinutes: number;
  coverImage: string;
  coverAlt: string;
  relatedCourseIds: string[];
  sections: BlogArticleSection[];
}

export interface LiveSession {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  durationMinutes?: string;
  status: 'live' | 'scheduled' | 'ended';
  hostName: string;
  createdByRole: 'main_admin' | 'sub_admin';
  createdBySubAdminCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CoursePaymentConfig {
  esewaId?: string;
  accountName?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankBranch?: string;
  whatsappNumber?: string;
  qrImageUrl?: string;
  paymentInstruction?: string;
  updatedAt?: number;
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
  contactPhone?: string;
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
  androidPackageName?: string;
  androidSha256Fingerprints?: string;
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
  status: 'unused' | 'used' | 'expired';
  duration: '1day' | '1month' | '1year';
  createdAt: number;
  studentName?: string;
  studentPhone?: string;
  claimedByName?: string;
  claimedByEmail?: string;
  claimedByUid?: string;
  claimedAt?: number;
  expiresAt?: number;
  courseId?: string; // "all" or specific courseId e.g. "ai-masterclass"
  courseTitle?: string; // "All Courses" or specific course name
  activeDeviceId?: string;
  studentAvatar?: string;
  studentAvatarUpdatedAt?: number;
  isFreeEnrollment?: boolean;
  createdByRole?: 'main_admin' | 'sub_admin';
  createdBySubAdminCode?: string;
  createdByName?: string;
}

export interface SubAdminAccount {
  id: string; // same as code e.g. "SUB-XXXXXX"
  code: string;
  name: string;
  courseId: string; // Primary/first assigned courseId (legacy compat)
  courseTitle: string; // Primary/first assigned courseTitle (legacy compat)
  courseIds?: string[]; // All assigned course IDs for multi-course Sub-Admins
  courseTitles?: string[]; // All assigned course titles
  avatarUrl?: string;
  status: 'active' | 'disabled';
  publicProfileId?: string;
  activeUid?: string;
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;
  activeDeviceId?: string;
}

export interface SubAdminPublicProfile {
  id: string; // opaque non-secret profile ID (never contains login code)
  courseId: string;
  courseTitle: string;
  courseIds?: string[];
  courseTitles?: string[];
  name: string;
  avatarUrl?: string;
  status: 'active' | 'disabled';
  activeUid?: string;
  updatedAt?: number;
}

export interface CourseProgressRecord {
  completedVideoIndices: number[];
  completedPdfIndices: number[];
  lastVideoIndex?: number;
  updatedAt: number;
}

export interface UserProgressDoc {
  userId: string;
  courses: Record<string, CourseProgressRecord>;
  updatedAt: number;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'discount' | 'welcome' | 'announcement' | 'course' | 'live' | 'live_class' | 'live_reminder' | 'general';
  badge?: string;
  url?: string;
  createdAt: number;
  author?: string;
  createdBySubAdminCode?: string;
  target?: 'all' | 'students' | 'course_students';
  courseId?: string;
  courseTitle?: string;
  sessionId?: string;
  liveClassId?: string;
  icon?: string;
}

export type LiveClassProvider = 'builtin' | 'google_meet' | 'manual' | 'zoom';

export interface LiveClassItem {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  instructorName?: string;
  provider?: LiveClassProvider;
  scheduledStartAt: number;
  scheduledEndAt?: number;
  durationMinutes?: number;
  maxCapacity?: number;
  registeredCount?: number;
  joinWindowMinutesBefore?: number;
  status: 'draft' | 'published' | 'live' | 'completed' | 'cancelled' | string;
  joinUrl?: string;
  meetingId?: string;
  passcode?: string;
  isRegistered?: boolean;
  canJoinNow?: boolean;
  [key: string]: any;
}

export interface LiveClassRegistration {
  id: string;
  liveClassId: string;
  userId?: string;
  studentName?: string;
  studentEmail?: string;
  registeredAt?: number;
  [key: string]: any;
}

export interface LiveClassJoinResponse {
  liveClassId: string;
  roomToken?: string;
  participantRole?: 'mentor' | 'student';
  participantName?: string;
  joinUrl?: string;
  provider?: LiveClassProvider;
  [key: string]: any;
}

export interface LiveClassHealthStatus {
  ok?: boolean;
  firebaseAdminConfigured?: boolean;
  zoomConfigured?: boolean;
  [key: string]: any;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'admin';
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: number;
  isSeen?: boolean;
  seenAt?: number;
  status?: 'sent' | 'seen';
  attachmentType?: 'image' | 'document';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
}

export interface SupportConversation {
  id: string; // userId, substudent__<code>__<uid>, or subadmin_main__<code>
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userAvatar?: string;
  purchasedCourses?: string[];
  channelType?: 'student_mainadmin' | 'student_subadmin' | 'subadmin_mainadmin';
  ownerUid?: string;
  subAdminCode?: string;
  subAdminProfileId?: string;
  subAdminUid?: string;
  subAdminName?: string;
  courseId?: string;
  activeCourse?: string;
  lastMessage: string;
  lastMessageAt: number;
  lastSender: 'user' | 'admin' | 'system';
  unreadAdminCount: number;
  unreadUserCount: number;
  createdAt: number;
  updatedAt: number;
  clearedByUserAt?: number;
  clearedByAdminAt?: number;
}

