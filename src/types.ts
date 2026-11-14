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
  hasLiveSessions?: boolean;
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
  // Per-course Payment & WhatsApp override (editable by Main Admin or Course Sub-Admin)
  paymentConfig?: CoursePaymentConfig;
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
  createdByRole?: 'main_admin' | 'sub_admin';
  createdBySubAdminCode?: string;
  createdByName?: string;
}

export interface SubAdminAccount {
  id: string; // same as code e.g. "SUB-XXXXXX"
  code: string;
  name: string;
  courseId: string;
  courseTitle: string;
  avatarUrl?: string;
  status: 'active' | 'disabled';
  createdAt: number;
  updatedAt?: number;
  lastLoginAt?: number;
  activeDeviceId?: string;
}

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'discount' | 'welcome' | 'announcement' | 'course' | 'general' | 'live_class' | 'live_reminder';
  badge?: string;
  url?: string;
  createdAt: number;
  author?: string;
  target?: 'all' | 'students' | 'course_enrolled';
  icon?: string;
  courseId?: string;
  courseTitle?: string;
  liveClassId?: string;
  deliveryKey?: string;
  reminderType?: 'published' | '30m' | '5m' | 'manual';
}

export type LiveClassStatus = 'draft' | 'published' | 'live' | 'completed' | 'cancelled';

export interface LiveClassItem {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  instructorName: string;
  scheduledStartAt: number; // Epoch ms
  durationMinutes: number; // Default 40
  scheduledEndAt: number; // Epoch ms
  maxCapacity: number; // Default 80
  registeredCount: number;
  status: LiveClassStatus;
  joinWindowMinutesBefore: number; // Default 15
  zoomCreated: boolean;
  zoomMeetingStatus: 'created' | 'failed' | 'pending';
  zoomMeetingIdMasked?: string;
  zoomError?: string;
  idempotencyKey?: string;
  sendReminder30m?: boolean;
  sendReminder5m?: boolean;
  reminder30mSent?: boolean;
  reminder5mSent?: boolean;
  publishedAt?: number;
  createdBy?: string;
  createdByRole?: 'main_admin' | 'sub_admin';
  createdAt: number;
  updatedAt: number;
  // Admin-only hydrated secrets (never populated for students in list endpoints)
  zoomMeetingId?: string;
  zoomPasscode?: string;
  zoomStartUrl?: string;
  zoomJoinUrl?: string;
  // Client-hydrated registration flag
  isRegistered?: boolean;
}

export interface LiveClassRegistration {
  id: string;
  liveClassId: string;
  userId: string;
  studentName: string;
  studentEmail?: string;
  activationCode?: string;
  courseId: string;
  status: 'registered' | 'joined';
  registeredAt: number;
  joinedAt?: number;
}

export interface LiveClassJoinResponse {
  success: boolean;
  liveClassId: string;
  title: string;
  courseTitle: string;
  joinUrl: string;
  startUrl?: string;
  meetingId: string;
  passcode: string;
  scheduledStartAt: number;
  durationMinutes: number;
  registeredCount: number;
  maxCapacity: number;
}

export interface LiveClassHealthStatus {
  zoomConfigured: boolean;
  firebaseAdminConfigured: boolean;
  restFallbackActive?: boolean;
  fcmConfigured: boolean;
  cronConfigured: boolean;
  databaseId: string;
  initError?: string | null;
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
  subAdminCode?: string;
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

