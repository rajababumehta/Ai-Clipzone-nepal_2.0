import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  X, 
  Key, 
  QrCode as QrIcon, 
  HelpCircle, 
  Settings, 
  BookOpen, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Check, 
  Copy, 
  RefreshCw, 
  LogOut, 
  Upload, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  GraduationCap,
  FileText,
  Bell
} from 'lucide-react';

import { Course, FAQItem, PaymentQrConfig, SiteSettingsConfig, PushNotificationItem } from '../types';
import { DEFAULT_PAYMENT_CONFIG, DEFAULT_SITE_SETTINGS, FAQS as INITIAL_DEFAULT_FAQS } from '../data';
import { AdminNotificationsTab } from './AdminNotificationsTab';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  // Keys management
  allActivationKeys: any[];
  onGenerateKey: (courseId: string, autoCopy: boolean, studentName: string, duration: '1month' | '1year') => Promise<void>;
  onDeleteKey: (code: string) => Promise<void>;
  onDeleteAllKeys?: () => Promise<void>;
  onLogoutKey?: (code: string) => Promise<void>;
  onRefreshKeys: () => Promise<void>;
  isAdminLoadingKeys: boolean;
  onOpenLogoutConfirm: () => void;
  // Payment & QR config
  paymentConfig: PaymentQrConfig;
  onSavePaymentConfig: (newConfig: PaymentQrConfig) => Promise<void>;
  // FAQs config
  faqs: FAQItem[];
  onSaveFaqs: (newFaqs: FAQItem[]) => Promise<void>;
  // Site Settings config
  siteSettings: SiteSettingsConfig;
  onSaveSiteSettings: (newSettings: SiteSettingsConfig) => Promise<void>;
  // Course management actions
  onCreateCourseClick: () => void;
  onEditCourseClick: (course: Course) => void;
  onDeleteCourseClick: (courseId: string) => Promise<void>;
  onSaveCourse?: (course: Course) => Promise<void>;
  // Push Notifications
  notifications?: PushNotificationItem[];
  onSendNotification?: (notif: Omit<PushNotificationItem, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNotification?: (id: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'keys' | 'qr' | 'faqs' | 'overall' | 'certificate' | 'courses' | 'notifications';
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  courses,
  allActivationKeys,
  onGenerateKey,
  onDeleteKey,
  onDeleteAllKeys,
  onLogoutKey,
  onRefreshKeys,
  isAdminLoadingKeys,
  onOpenLogoutConfirm,
  paymentConfig,
  onSavePaymentConfig,
  faqs,
  onSaveFaqs,
  siteSettings,
  onSaveSiteSettings,
  onCreateCourseClick,
  onEditCourseClick,
  onDeleteCourseClick,
  onSaveCourse,
  notifications,
  onSendNotification,
  onDeleteNotification,
  showToast,
  initialTab = 'keys'
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'qr' | 'faqs' | 'overall' | 'certificate' | 'courses' | 'notifications'>(initialTab);

  // Key Deletion Confirmation state
  const [keyToDelete, setKeyToDelete] = useState<any | null>(null);
  const [isDeletingKey, setIsDeletingKey] = useState(false);

  // Bulk Delete All Keys Confirmation state
  const [showDeleteAllKeysModal, setShowDeleteAllKeysModal] = useState(false);
  const [deleteAllKeysConfirmInput, setDeleteAllKeysConfirmInput] = useState('');
  const [isDeletingAllKeys, setIsDeletingAllKeys] = useState(false);

  // Course Deletion Confirmation state inside Admin Dashboard
  const [courseToDeleteAdmin, setCourseToDeleteAdmin] = useState<Course | null>(null);
  const [adminDeleteConfirmText, setAdminDeleteConfirmText] = useState('');
  const [isAdminDeletingCourse, setIsAdminDeletingCourse] = useState(false);

  // When initialTab changes, update activeTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Keys Tab states
  const [genSelectedCourseId, setGenSelectedCourseId] = useState('');
  const [genSelectedDuration, setGenSelectedDuration] = useState<'1month' | '1year'>('1year');
  const [genStudentName, setGenStudentName] = useState('');
  const [adminSearchKeyQuery, setAdminSearchKeyQuery] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // QR & Payment Tab states
  const [qrEsewaId, setQrEsewaId] = useState(paymentConfig.esewaId || '9763323268');
  const [qrAccountName, setQrAccountName] = useState(paymentConfig.accountName || 'Ayush Chaurasiya');
  const [qrWhatsappNumber, setQrWhatsappNumber] = useState(paymentConfig.whatsappNumber || '9763323268');
  const [qrBankName, setQrBankName] = useState(paymentConfig.bankName || 'Global IME / Nabil Bank');
  const [qrBankAccountNo, setQrBankAccountNo] = useState(paymentConfig.bankAccountNo || '');
  const [qrBankBranch, setQrBankBranch] = useState(paymentConfig.bankBranch || '');
  const [qrImageUrl, setQrImageUrl] = useState(paymentConfig.qrImageUrl || '');
  const [qrPaymentInstruction, setQrPaymentInstruction] = useState(
    paymentConfig.paymentInstruction || '📌 भुक्तानी निर्देशन: QR स्क्यान गरी वा eSewa ID मा रकम पठाएर स्क्रीनसट WhatsApp मा पठाउनुहोस्।'
  );
  const [isSavingQr, setIsSavingQr] = useState(false);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // FAQs Tab states
  const [localFaqs, setLocalFaqs] = useState<FAQItem[]>(faqs);
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isSavingFaqs, setIsSavingFaqs] = useState(false);

  // Overall Settings & Institute Branding states
  const [siteTitle, setSiteTitle] = useState(siteSettings.siteTitle || 'TOP AI COURSE NEPAL 🇳🇵');
  const [siteTagline, setSiteTagline] = useState(siteSettings.siteTagline || "Nepal's #1 AI Video Editing & Learning Platform");
  const [instituteName, setInstituteName] = useState(siteSettings.instituteName || 'AI CLIPZONE NEPAL');
  const [instituteLogoUrl, setInstituteLogoUrl] = useState(siteSettings.instituteLogoUrl || '');
  const [noticeBannerText, setNoticeBannerText] = useState(
    siteSettings.noticeBannerText || '🎉 New AI Tools & YouTube Blueprint Masterclasses Live! 50% Early Bird Discount.'
  );
  const [showNoticeBanner, setShowNoticeBanner] = useState(siteSettings.showNoticeBanner !== false);
  const [supportPhone, setSupportPhone] = useState(siteSettings.supportPhone || '9763323268');
  const [supportEmail, setSupportEmail] = useState(siteSettings.supportEmail || 'ai.clipzone.edu@gmail.com');
  const [apkDownloadUrl, setApkDownloadUrl] = useState(siteSettings.apkDownloadUrl || '');

  // Certificate Designer states (supports 'global' or courseId)
  const [selectedCertScope, setSelectedCertScope] = useState<string>('global');
  const [certCourseTitleOverride, setCertCourseTitleOverride] = useState('');
  const [certificateTitle, setCertificateTitle] = useState(siteSettings.certificateTitle || 'CERTIFICATE');
  const [certificateSubtitle, setCertificateSubtitle] = useState(siteSettings.certificateSubtitle || 'OF ACHIEVEMENT');
  const [certificateInstituteName, setCertificateInstituteName] = useState(siteSettings.certificateInstituteName || 'AI CLIPZONE NEPAL');
  const [certificateLogoUrl, setCertificateLogoUrl] = useState(siteSettings.certificateLogoUrl || '');
  const [certificateDescription, setCertificateDescription] = useState(siteSettings.certificateDescription || '');
  const [certificateDirectorName, setCertificateDirectorName] = useState(siteSettings.certificateDirectorName || 'Director');
  const [certificateDirectorTitle, setCertificateDirectorTitle] = useState(siteSettings.certificateDirectorTitle || 'Program Director');
  const [certificateDirectorSignatureUrl, setCertificateDirectorSignatureUrl] = useState(siteSettings.certificateDirectorSignatureUrl || '');
  const [certificateCeoName, setCertificateCeoName] = useState(siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)');
  const [certificateCeoTitle, setCertificateCeoTitle] = useState(siteSettings.certificateCeoTitle || 'Founder & CEO');
  const [certificateCeoSignatureUrl, setCertificateCeoSignatureUrl] = useState(siteSettings.certificateCeoSignatureUrl || '');
  const [certificateTheme, setCertificateTheme] = useState<'blue' | 'cyber-purple' | 'emerald' | 'crimson' | 'gold'>(siteSettings.certificateTheme || 'blue');
  const [certificateStampUrl, setCertificateStampUrl] = useState(siteSettings.certificateStampUrl || '');
  const [certificateSealText, setCertificateSealText] = useState(siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');

  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setQrEsewaId(paymentConfig.esewaId || '9763323268');
    setQrAccountName(paymentConfig.accountName || 'Ayush Chaurasiya');
    setQrWhatsappNumber(paymentConfig.whatsappNumber || '9763323268');
    setQrBankName(paymentConfig.bankName || 'Global IME / Nabil Bank');
    setQrBankAccountNo(paymentConfig.bankAccountNo || '');
    setQrBankBranch(paymentConfig.bankBranch || '');
    setQrImageUrl(paymentConfig.qrImageUrl || '');
    setQrPaymentInstruction(
      paymentConfig.paymentInstruction || '📌 भुक्तानी निर्देशन: QR स्क्यान गरी वा eSewa ID मा रकम पठाएर स्क्रीनसट WhatsApp मा पठाउनुहोस्।'
    );
  }, [paymentConfig]);

  useEffect(() => {
    setLocalFaqs(faqs);
  }, [faqs]);

  useEffect(() => {
    setSiteTitle(siteSettings.siteTitle || 'TOP AI COURSE NEPAL 🇳🇵');
    setSiteTagline(siteSettings.siteTagline || "Nepal's #1 AI Video Editing & Learning Platform");
    setInstituteName(siteSettings.instituteName || 'AI CLIPZONE NEPAL');
    setInstituteLogoUrl(siteSettings.instituteLogoUrl || '');
    setNoticeBannerText(
      siteSettings.noticeBannerText || '🎉 New AI Tools & YouTube Blueprint Masterclasses Live! 50% Early Bird Discount.'
    );
    setShowNoticeBanner(siteSettings.showNoticeBanner !== false);
    setSupportPhone(siteSettings.supportPhone || '9763323268');
    setSupportEmail(siteSettings.supportEmail || 'ai.clipzone.edu@gmail.com');
    setCertificateTitle(siteSettings.certificateTitle || 'CERTIFICATE');
    setCertificateSubtitle(siteSettings.certificateSubtitle || 'OF ACHIEVEMENT');
    setCertificateInstituteName(siteSettings.certificateInstituteName || 'AI CLIPZONE NEPAL');
    setCertificateLogoUrl(siteSettings.certificateLogoUrl || '');
    setCertificateDescription(siteSettings.certificateDescription || '');
    setCertificateDirectorName(siteSettings.certificateDirectorName || 'Director');
    setCertificateDirectorTitle(siteSettings.certificateDirectorTitle || 'Program Director');
    setCertificateDirectorSignatureUrl(siteSettings.certificateDirectorSignatureUrl || '');
    setCertificateCeoName(siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)');
    setCertificateCeoTitle(siteSettings.certificateCeoTitle || 'Founder & CEO');
    setCertificateCeoSignatureUrl(siteSettings.certificateCeoSignatureUrl || '');
    setCertificateTheme(siteSettings.certificateTheme || 'blue');
    setCertificateStampUrl(siteSettings.certificateStampUrl || '');
    setCertificateSealText(siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');
    setApkDownloadUrl(siteSettings.apkDownloadUrl || '');
  }, [siteSettings]);

  // Render QR Canvas Preview dynamically in the QR Settings Tab
  useEffect(() => {
    if (activeTab === 'qr' && previewCanvasRef.current && !qrImageUrl) {
      const qrPayload = JSON.stringify({
        eSewa_id: qrEsewaId.trim() || '9763323268',
        name: qrAccountName.trim() || 'Ayush Chaurasiya'
      });
      QRCode.toCanvas(
        previewCanvasRef.current,
        qrPayload,
        {
          width: 170,
          margin: 1.5,
          color: {
            dark: '#1e1b4b',
            light: '#ffffff'
          }
        },
        (error) => {
          if (error) console.error('QR preview canvas error:', error);
        }
      );
    }
  }, [activeTab, qrEsewaId, qrAccountName, qrImageUrl]);

  if (!isOpen) return null;

  // Handle Save Payment QR Config
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrEsewaId.trim() || !qrAccountName.trim()) {
      showToast('eSewa ID and Account Name are required!', 'error');
      return;
    }
    setIsSavingQr(true);
    try {
      const updatedConfig: PaymentQrConfig = {
        esewaId: qrEsewaId.trim(),
        accountName: qrAccountName.trim(),
        whatsappNumber: qrWhatsappNumber.trim(),
        bankName: qrBankName.trim(),
        bankAccountNo: qrBankAccountNo.trim(),
        bankBranch: qrBankBranch.trim(),
        qrImageUrl: qrImageUrl.trim(),
        paymentInstruction: qrPaymentInstruction.trim(),
        updatedAt: Date.now()
      };
      await onSavePaymentConfig(updatedConfig);
      showToast('QR & Payment details saved successfully! 💳', 'success');
    } catch (err) {
      console.error('Error saving payment config:', err);
      showToast('Failed to save payment settings.', 'error');
    } finally {
      setIsSavingQr(false);
    }
  };

  // Handle Save FAQs
  const handleSaveFaqsToCloud = async () => {
    setIsSavingFaqs(true);
    try {
      await onSaveFaqs(localFaqs);
      showToast('FAQs saved and published live! ❓', 'success');
    } catch (err) {
      console.error('Error saving FAQs:', err);
      showToast('Failed to save FAQs to cloud.', 'error');
    } finally {
      setIsSavingFaqs(false);
    }
  };

  const handleAddNewFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      showToast('Please enter both question and answer for FAQ!', 'error');
      return;
    }
    const updated = [
      ...localFaqs,
      {
        question: newQuestion.trim(),
        answer: newAnswer.trim()
      }
    ];
    setLocalFaqs(updated);
    setNewQuestion('');
    setNewAnswer('');
    showToast('New FAQ added to list. Click "Save FAQs to Cloud" to publish!', 'info');
  };

  const handleUpdateFaq = (index: number) => {
    if (!editQuestion.trim() || !editAnswer.trim()) {
      showToast('Question and answer cannot be empty!', 'error');
      return;
    }
    const updated = [...localFaqs];
    updated[index] = {
      question: editQuestion.trim(),
      answer: editAnswer.trim()
    };
    setLocalFaqs(updated);
    setEditingFaqIndex(null);
    showToast('FAQ updated! Click "Save FAQs to Cloud" to publish.', 'info');
  };

  const handleDeleteFaq = (index: number) => {
    const updated = localFaqs.filter((_, idx) => idx !== index);
    setLocalFaqs(updated);
    if (editingFaqIndex === index) {
      setEditingFaqIndex(null);
    }
    showToast('FAQ deleted. Click "Save FAQs to Cloud" to publish changes.', 'info');
  };

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === localFaqs.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...localFaqs];
    const item = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = item;
    setLocalFaqs(updated);
  };

  const handleResetFaqsToDefault = () => {
    setLocalFaqs(INITIAL_DEFAULT_FAQS);
    showToast('Reset FAQs to default. Click Save to publish.', 'info');
  };

  // Certificate Designer Scope Switching
  const handleSwitchCertScope = (scopeId: string) => {
    setSelectedCertScope(scopeId);
    if (scopeId === 'global') {
      setCertificateTitle(siteSettings.certificateTitle || 'CERTIFICATE');
      setCertificateSubtitle(siteSettings.certificateSubtitle || 'OF ACHIEVEMENT');
      setCertificateInstituteName(siteSettings.certificateInstituteName || 'AI CLIPZONE NEPAL');
      setCertCourseTitleOverride('');
      setCertificateLogoUrl(siteSettings.certificateLogoUrl || '');
      setCertificateDescription(siteSettings.certificateDescription || '');
      setCertificateDirectorName(siteSettings.certificateDirectorName || 'Director');
      setCertificateDirectorTitle(siteSettings.certificateDirectorTitle || 'Program Director');
      setCertificateDirectorSignatureUrl(siteSettings.certificateDirectorSignatureUrl || '');
      setCertificateCeoName(siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)');
      setCertificateCeoTitle(siteSettings.certificateCeoTitle || 'Founder & CEO');
      setCertificateCeoSignatureUrl(siteSettings.certificateCeoSignatureUrl || '');
      setCertificateTheme((siteSettings.certificateTheme as any) || 'blue');
      setCertificateStampUrl(siteSettings.certificateStampUrl || '');
      setCertificateSealText(siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');
    } else {
      const crs = courses.find((c) => c.id === scopeId);
      if (crs) {
        setCertificateTitle(crs.certificateTitle || siteSettings.certificateTitle || 'CERTIFICATE');
        setCertificateSubtitle(crs.certificateSubtitle || siteSettings.certificateSubtitle || 'OF ACHIEVEMENT');
        setCertificateInstituteName(crs.certificateInstituteName || siteSettings.certificateInstituteName || 'AI CLIPZONE NEPAL');
        setCertCourseTitleOverride(crs.certificateCourseTitle || crs.title || '');
        setCertificateLogoUrl(crs.certificateLogoUrl || siteSettings.certificateLogoUrl || '');
        setCertificateDescription(crs.certificateDescription || siteSettings.certificateDescription || '');
        setCertificateDirectorName(crs.certificateDirectorName || siteSettings.certificateDirectorName || 'Director');
        setCertificateDirectorTitle(crs.certificateDirectorTitle || siteSettings.certificateDirectorTitle || 'Program Director');
        setCertificateDirectorSignatureUrl(crs.certificateDirectorSignatureUrl || siteSettings.certificateDirectorSignatureUrl || '');
        setCertificateCeoName(crs.certificateCeoName || siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)');
        setCertificateCeoTitle(crs.certificateCeoTitle || siteSettings.certificateCeoTitle || 'Founder & CEO');
        setCertificateCeoSignatureUrl(crs.certificateCeoSignatureUrl || siteSettings.certificateCeoSignatureUrl || '');
        setCertificateTheme((crs.certificateTheme as any) || (siteSettings.certificateTheme as any) || 'blue');
        setCertificateStampUrl(crs.certificateStampUrl || siteSettings.certificateStampUrl || '');
        setCertificateSealText(crs.certificateSealText || siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');
      }
    }
  };

  // Handle Save Certificate (Global or Per-Course)
  const handleSaveCertificateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSiteSettings(true);
    try {
      if (selectedCertScope === 'global') {
        const updatedSettings: SiteSettingsConfig = {
          ...siteSettings,
          certificateTitle: certificateTitle.trim() || 'CERTIFICATE',
          certificateSubtitle: certificateSubtitle.trim() || 'OF ACHIEVEMENT',
          certificateInstituteName: certificateInstituteName.trim() || 'AI CLIPZONE NEPAL',
          certificateLogoUrl: certificateLogoUrl.trim(),
          certificateDescription: certificateDescription.trim(),
          certificateDirectorName: certificateDirectorName.trim() || 'Director',
          certificateDirectorTitle: certificateDirectorTitle.trim() || 'Program Director',
          certificateDirectorSignatureUrl: certificateDirectorSignatureUrl.trim(),
          certificateCeoName: certificateCeoName.trim() || 'Founder/CEO (AI Clipzone)',
          certificateCeoTitle: certificateCeoTitle.trim() || 'Founder & CEO',
          certificateCeoSignatureUrl: certificateCeoSignatureUrl.trim(),
          certificateTheme,
          certificateStampUrl: certificateStampUrl.trim(),
          certificateSealText: certificateSealText.trim() || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL',
          updatedAt: Date.now()
        };
        await onSaveSiteSettings(updatedSettings);
        showToast('Global Certificate Template saved successfully! 📜🎉', 'success');
      } else {
        const targetCourse = courses.find((c) => c.id === selectedCertScope);
        if (targetCourse && onSaveCourse) {
          const updatedCourse: Course = {
            ...targetCourse,
            certificateTitle: certificateTitle.trim() || undefined,
            certificateSubtitle: certificateSubtitle.trim() || undefined,
            certificateCourseTitle: certCourseTitleOverride.trim() || undefined,
            certificateInstituteName: certificateInstituteName.trim() || undefined,
            certificateLogoUrl: certificateLogoUrl.trim() || undefined,
            certificateDescription: certificateDescription.trim() || undefined,
            certificateDirectorName: certificateDirectorName.trim() || undefined,
            certificateDirectorTitle: certificateDirectorTitle.trim() || undefined,
            certificateDirectorSignatureUrl: certificateDirectorSignatureUrl.trim() || undefined,
            certificateCeoName: certificateCeoName.trim() || undefined,
            certificateCeoTitle: certificateCeoTitle.trim() || undefined,
            certificateCeoSignatureUrl: certificateCeoSignatureUrl.trim() || undefined,
            certificateTheme: certificateTheme || undefined,
            certificateStampUrl: certificateStampUrl.trim() || undefined,
            certificateSealText: certificateSealText.trim() || undefined
          };
          await onSaveCourse(updatedCourse);
          showToast(`Certificate settings saved for "${targetCourse.title}"! 📜🎉`, 'success');
        }
      }
    } catch (err) {
      console.error('Error saving certificate settings:', err);
      showToast('Failed to save certificate settings.', 'error');
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  // Handle Reset Course-Level Certificate to Global Defaults
  const handleResetCourseCertificateToGlobal = async () => {
    if (selectedCertScope === 'global') return;
    const targetCourse = courses.find((c) => c.id === selectedCertScope);
    if (!targetCourse || !onSaveCourse) return;

    try {
      setIsSavingSiteSettings(true);
      const resetCourse: Course = {
        ...targetCourse,
        certificateTitle: undefined,
        certificateSubtitle: undefined,
        certificateCourseTitle: undefined,
        certificateInstituteName: undefined,
        certificateLogoUrl: undefined,
        certificateDescription: undefined,
        certificateDirectorName: undefined,
        certificateDirectorTitle: undefined,
        certificateDirectorSignatureUrl: undefined,
        certificateCeoName: undefined,
        certificateCeoTitle: undefined,
        certificateCeoSignatureUrl: undefined,
        certificateTheme: undefined,
        certificateStampUrl: undefined,
        certificateSealText: undefined
      };
      await onSaveCourse(resetCourse);

      // Reload global defaults into form
      setCertificateTitle(siteSettings.certificateTitle || 'CERTIFICATE');
      setCertificateSubtitle(siteSettings.certificateSubtitle || 'OF ACHIEVEMENT');
      setCertificateInstituteName(siteSettings.certificateInstituteName || 'AI CLIPZONE NEPAL');
      setCertCourseTitleOverride(targetCourse.title);
      setCertificateLogoUrl(siteSettings.certificateLogoUrl || '');
      setCertificateDescription(siteSettings.certificateDescription || '');
      setCertificateDirectorName(siteSettings.certificateDirectorName || 'Director');
      setCertificateDirectorTitle(siteSettings.certificateDirectorTitle || 'Program Director');
      setCertificateDirectorSignatureUrl(siteSettings.certificateDirectorSignatureUrl || '');
      setCertificateCeoName(siteSettings.certificateCeoName || 'Founder/CEO (AI Clipzone)');
      setCertificateCeoTitle(siteSettings.certificateCeoTitle || 'Founder & CEO');
      setCertificateCeoSignatureUrl(siteSettings.certificateCeoSignatureUrl || '');
      setCertificateTheme((siteSettings.certificateTheme as any) || 'blue');
      setCertificateStampUrl(siteSettings.certificateStampUrl || '');
      setCertificateSealText(siteSettings.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');
      showToast(`"${targetCourse.title}" is now inheriting Global Certificate defaults!`, 'info');
    } catch (e) {
      showToast('Failed to reset course certificate.', 'error');
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  // Handle Save Overall Site Settings & Branding
  const handleSaveOverallSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSiteSettings(true);
    try {
      const updatedSettings: SiteSettingsConfig = {
        siteTitle: siteTitle.trim(),
        siteTagline: siteTagline.trim(),
        instituteName: instituteName.trim(),
        instituteLogoUrl: instituteLogoUrl.trim(),
        noticeBannerText: noticeBannerText.trim(),
        showNoticeBanner,
        supportPhone: supportPhone.trim(),
        supportEmail: supportEmail.trim(),
        certificateTitle: certificateTitle.trim(),
        certificateSubtitle: certificateSubtitle.trim(),
        certificateInstituteName: certificateInstituteName.trim(),
        certificateLogoUrl: certificateLogoUrl.trim(),
        certificateDescription: certificateDescription.trim(),
        certificateDirectorName: certificateDirectorName.trim(),
        certificateDirectorTitle: certificateDirectorTitle.trim(),
        certificateDirectorSignatureUrl: certificateDirectorSignatureUrl.trim(),
        certificateCeoName: certificateCeoName.trim(),
        certificateCeoTitle: certificateCeoTitle.trim(),
        certificateCeoSignatureUrl: certificateCeoSignatureUrl.trim(),
        certificateTheme,
        certificateStampUrl: certificateStampUrl.trim(),
        certificateSealText: certificateSealText.trim(),
        apkDownloadUrl: apkDownloadUrl.trim(),
        updatedAt: Date.now()
      };
      await onSaveSiteSettings(updatedSettings);
      showToast('Branding, Certificate Design & Site settings updated live! ⚙️', 'success');
    } catch (err) {
      console.error('Error saving overall site settings:', err);
      showToast('Failed to save site settings.', 'error');
    } finally {
      setIsSavingSiteSettings(false);
    }
  };

  // Generic Image File Uploader to Data URL
  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void,
    label: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image size exceeds 2MB limit. Please choose a smaller file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setter(reader.result);
        showToast(`${label} loaded! Click Save to apply changes.`, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Local Image Upload for QR Code
  const handleQrImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFileUpload(e, setQrImageUrl, 'Payment QR image');
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm"
      />

      {/* Main Admin Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-black max-w-5xl w-full rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl relative z-10 max-h-[92vh] flex flex-col border border-zinc-800 overflow-hidden text-zinc-200"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Admin Master Control
                </h3>
                <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Live Cloud Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Manage secret keys, dynamic eSewa QR payment details, FAQs section, and overall website settings.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 flex items-center justify-center transition cursor-pointer shrink-0"
            title="Close Admin Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-1.5 pt-3 pb-2 overflow-x-auto border-b border-zinc-800 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'keys'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Activation Keys ({allActivationKeys?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('qr')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <QrIcon className="w-3.5 h-3.5" />
            💳 QR & Payment Details
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'faqs'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            ❓ FAQs Section ({localFaqs.length})
          </button>

          <button
            onClick={() => setActiveTab('overall')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'overall'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            🏛️ Institute Branding & Site
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'certificate'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            📜 Certificate Designer & Signatures
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            📚 Course Catalog ({courses?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-purple-400" />
            📢 Push Notifications ({notifications?.length || 0})
          </button>
        </div>

        {/* Tab Body Scrollable Container */}
        <div className="grow overflow-y-auto py-4 space-y-6 text-left pr-1">

          {/* ========================================================================= */}
          {/* TAB 1: ACTIVATION KEYS & DEVICE SESSIONS */}
          {/* ========================================================================= */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800 font-semibold leading-relaxed flex items-start gap-3">
                <span className="text-base select-none">✅</span>
                <div>
                  <strong className="font-black text-emerald-900">Admin Mode Activated (offline-first & auto-synced)</strong>
                  <p className="mt-0.5">
                    Generate unreleased secret activation codes to unlock dynamic courses. Share generated keys with students to enable high-speed learning.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Generator tool */}
                <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 self-start space-y-4">
                  <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                    ✨ Generate New Secret Key
                  </h4>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Student Name (विद्यार्थीको पुरा नाम) *
                    </label>
                    <input 
                      type="text"
                      value={genStudentName}
                      onChange={(e) => setGenStudentName(e.target.value)}
                      placeholder="उदाहरण: Ramesh Sharma"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Select Course Catalog *
                    </label>
                    <select 
                      value={genSelectedCourseId}
                      onChange={(e) => setGenSelectedCourseId(e.target.value)}
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-700"
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Key Subscription Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGenSelectedDuration('1month')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          genSelectedDuration === '1month' 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        1 Month Access
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenSelectedDuration('1year')}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          genSelectedDuration === '1year' 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        1 Year Access
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <button
                      disabled={isGeneratingKey}
                      onClick={async () => {
                        setIsGeneratingKey(true);
                        await onGenerateKey(genSelectedCourseId, true, genStudentName, genSelectedDuration);
                        setGenStudentName('');
                        setIsGeneratingKey(false);
                      }}
                      className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md transition tracking-wider uppercase cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      ⚡ Auto-Generate & Copy To Clipboard
                    </button>

                    <button
                      disabled={isGeneratingKey}
                      onClick={async () => {
                        setIsGeneratingKey(true);
                        await onGenerateKey(genSelectedCourseId, false, genStudentName, genSelectedDuration);
                        setGenStudentName('');
                        setIsGeneratingKey(false);
                      }}
                      className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-extrabold py-2.5 rounded-xl text-xs transition tracking-wider uppercase cursor-pointer text-center disabled:opacity-50"
                    >
                      Generate Code Only
                    </button>
                  </div>
                </div>

                {/* Registry table */}
                <div className="lg:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      📋 Active Licenses & Status ({allActivationKeys?.length || 0})
                    </h4>
                    <div className="flex items-center gap-2">
                      {(allActivationKeys?.length || 0) > 0 && onDeleteAllKeys && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteAllKeysConfirmInput('');
                            setShowDeleteAllKeysModal(true);
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs"
                          title="Delete all old student course codes permanently"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete All ({allActivationKeys?.length || 0})</span>
                        </button>
                      )}
                      <button
                        onClick={onRefreshKeys}
                        className="text-purple-600 hover:text-purple-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isAdminLoadingKeys ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <input 
                      type="text"
                      placeholder="Search by code, course title, or student name..."
                      value={adminSearchKeyQuery}
                      onChange={(e) => setAdminSearchKeyQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-medium text-slate-700"
                    />
                  </div>

                  <div className="overflow-y-auto max-h-[380px] space-y-2.5 pr-1">
                    {allActivationKeys
                      .filter(k => {
                        if (!adminSearchKeyQuery) return true;
                        const q = adminSearchKeyQuery.toLowerCase();
                        return (
                          (k.code || k.id || '').toLowerCase().includes(q) ||
                          (k.courseTitle || '').toLowerCase().includes(q) ||
                          (k.studentName || '').toLowerCase().includes(q) ||
                          (k.claimedByEmail || '').toLowerCase().includes(q)
                        );
                      })
                      .map((key) => (
                        <div 
                          key={key.code || key.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs flex items-start justify-between gap-3 hover:border-purple-300 transition"
                        >
                          <div className="space-y-1.5 grow overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                {key.code || key.id}
                              </span>
                              <button
                                onClick={async () => {
                                  await navigator.clipboard.writeText(key.code || key.id);
                                  showToast(`Copied ${key.code || key.id}! 📋`, 'info');
                                }}
                                className="text-purple-600 hover:text-purple-800 transition text-[10px] font-bold cursor-pointer"
                              >
                                📋 Copy
                              </button>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                key.status === 'unused' 
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {key.status}
                              </span>
                              <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                                {key.duration === '1month' ? '30 Days' : '1 Year'}
                              </span>
                            </div>

                            <p className="text-[11px] font-black text-slate-800 truncate">
                              📚 {key.courseTitle || 'All Courses'}
                            </p>

                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 space-y-1 text-[10px] font-bold text-slate-600">
                              <p className="flex items-center gap-1.5 text-purple-900 font-extrabold">
                                👤 Student Name: <span className="text-slate-900">{key.studentName || key.claimedByEmail || 'Not Assigned'}</span>
                              </p>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100/80 flex-wrap gap-2">
                                <span>Created: {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : 'N/A'}</span>
                                <span>Claimed: {key.status === 'used' && key.claimedAt ? new Date(key.claimedAt).toLocaleDateString() : 'Unclaimed'}</span>
                                <span>
                                  Session: {key.activeDeviceId ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-black text-[8px] uppercase">🟢 Active</span>
                                  ) : (
                                    <span className="text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded font-black text-[8px] uppercase">⚪ Idle</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0 items-end">
                            {/* Logout User Session Button */}
                            <button
                              type="button"
                              onClick={async () => {
                                const code = key.code || key.id;
                                if (onLogoutKey) {
                                  await onLogoutKey(code);
                                }
                              }}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition shrink-0 cursor-pointer flex items-center gap-1 border ${
                                key.activeDeviceId 
                                  ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-2xs' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                              title={key.activeDeviceId ? "Logout this student's active device session" : "Revoke session for this code"}
                            >
                              <LogOut className="w-3 h-3 text-amber-600" />
                              <span>{key.activeDeviceId ? 'Logout User' : 'Reset Session'}</span>
                            </button>

                            {/* Delete Permanently Button */}
                            <button
                              type="button"
                              onClick={() => setKeyToDelete(key)}
                              className="text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 transition shrink-0 cursor-pointer flex items-center gap-1 border border-slate-200 hover:border-rose-200"
                              title="Permanently remove / delete user course code from database"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span className="text-[10px] font-black uppercase text-rose-600">Delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Emergency Session Reset */}
              <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-red-950 rounded-2xl p-5 border border-rose-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs border border-rose-500/40 shrink-0">
                      🚨
                    </span>
                    <h4 className="text-sm font-black text-white">
                      Logout All User Devices (सबै डिभाइस सेसन लगआउट)
                    </h4>
                  </div>
                  <p className="text-xs text-rose-200/80 font-medium">
                    वेबसाइटमा समस्या आउँदा वा नयाँ अपडेट पछि सबै युजर/विद्यार्थीहरुका Active Devices र Sessions एकैपटक स्वतः लगआउट गराउनुहोस्।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenLogoutConfirm}
                  className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black px-5 py-3 rounded-xl text-xs uppercase tracking-wider transition shadow-lg cursor-pointer shrink-0 active:scale-95 border border-rose-400/30 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout All User Devices 🚀
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: QR & PAYMENT DETAILS CONFIGURATION */}
          {/* ========================================================================= */}
          {activeTab === 'qr' && (
            <form onSubmit={handleSavePayment} className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900 font-semibold leading-relaxed flex items-start gap-3">
                <span className="text-base select-none">💳</span>
                <div>
                  <strong className="font-black text-indigo-950">Dynamic Payment & eSewa QR Configuration</strong>
                  <p className="mt-0.5 text-indigo-800">
                    यहाँबाट eSewa ID, खातावालाको नाम, WhatsApp नम्बर वा आफ्नै QR Code तस्विर सिधै फेर्न सक्नुहुन्छ। यो सम्पूर्ण वेबसाइटको Checkout Modal र Chatbot मा तुरुन्तै अपडेट हुन्छ।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Fields Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        eSewa ID / Mobile Number *
                      </label>
                      <input 
                        type="text"
                        required
                        value={qrEsewaId}
                        onChange={(e) => setQrEsewaId(e.target.value)}
                        placeholder="उदा: 9763323268"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        Account Holder Name *
                      </label>
                      <input 
                        type="text"
                        required
                        value={qrAccountName}
                        onChange={(e) => setQrAccountName(e.target.value)}
                        placeholder="उदा: Ayush Chaurasiya"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 flex items-center justify-between">
                        <span>WhatsApp Number (WhatsApp बाट किन्नुहोस् / Support) *</span>
                      </label>
                      <input 
                        type="text"
                        required
                        value={qrWhatsappNumber}
                        onChange={(e) => setQrWhatsappNumber(e.target.value)}
                        placeholder="उदा: 9763323268 वा 9779763323268"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                      <span className="text-[9.5px] text-slate-400 mt-1 block font-medium">
                        यो नम्बर "WhatsApp बाट किन्नुहोस्" बटन, Checkout र Chatbot मा प्रयोग हुन्छ।
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        Bank Name (वैकल्पिक बैंक ट्रान्सफर)
                      </label>
                      <input 
                        type="text"
                        value={qrBankName}
                        onChange={(e) => setQrBankName(e.target.value)}
                        placeholder="उदा: Global IME Bank / Nabil Bank"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        Bank Account Number (वैकल्पिक)
                      </label>
                      <input 
                        type="text"
                        value={qrBankAccountNo}
                        onChange={(e) => setQrBankAccountNo(e.target.value)}
                        placeholder="उदा: 01234567890123"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                        Bank Branch (वैकल्पिक)
                      </label>
                      <input 
                        type="text"
                        value={qrBankBranch}
                        onChange={(e) => setQrBankBranch(e.target.value)}
                        placeholder="उदा: Kathmandu Branch"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Custom QR Code Image URL (वा तल फाइल अपलोड गर्नुहोस्)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={qrImageUrl}
                        onChange={(e) => setQrImageUrl(e.target.value)}
                        placeholder="खाली छाडेमा स्वतः eSewa QR कोड जेनेरेट हुनेछ"
                        className="grow bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs transition outline-hidden font-medium text-slate-800"
                      />
                      <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shrink-0 border border-slate-200">
                        <Upload className="w-3.5 h-3.5" /> Upload QR
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleQrImageFileUpload}
                          className="hidden" 
                        />
                      </label>
                      {qrImageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setQrImageUrl('');
                            showToast('Custom QR removed. Using dynamic eSewa QR.', 'info');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2.5 py-2 rounded-xl text-xs transition cursor-pointer border border-rose-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Payment Instruction Note (भुक्तानी निर्देशन सन्देश)
                    </label>
                    <textarea 
                      rows={2}
                      value={qrPaymentInstruction}
                      onChange={(e) => setQrPaymentInstruction(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs transition outline-hidden font-medium text-slate-800"
                    />
                  </div>
                </div>

                {/* Live Preview Box Column */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-purple-50/40 p-5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center self-start">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-3 py-0.5 rounded-full border border-purple-200 mb-3">
                    🔍 Live Checkout Preview
                  </span>

                  <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200/80 w-full max-w-[240px]">
                    {qrImageUrl ? (
                      <img 
                        src={qrImageUrl} 
                        alt="Custom QR Preview" 
                        className="w-full h-44 object-contain rounded-xl shadow-xs mx-auto"
                      />
                    ) : (
                      <canvas ref={previewCanvasRef} className="mx-auto rounded-lg shadow-xs" />
                    )}

                    <div className="mt-3 pt-2.5 border-t border-slate-100 text-center">
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        eSewa Official
                      </span>
                      <h4 className="text-xs font-black text-slate-900 mt-1 truncate">
                        👤 {qrAccountName || 'Ayush Chaurasiya'}
                      </h4>
                      <p className="text-[11px] font-black text-slate-700 mt-0.5">
                        📱 eSewa ID: <span className="font-mono text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded text-[10px]">{qrEsewaId || '9763323268'}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 font-medium px-2">
                    विद्यार्थीहरूले "QR स्क्यान गरी तत्काल भुक्तानी" थिच्दा ठ्याक्कै यस्तो QR कोड र खाता देख्नेछन्।
                  </p>
                </div>
              </div>

              {/* Save Buttons */}
              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingQr}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 px-6 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingQr ? 'Saving to Firebase...' : '💾 Save QR & Payment Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrEsewaId(DEFAULT_PAYMENT_CONFIG.esewaId);
                    setQrAccountName(DEFAULT_PAYMENT_CONFIG.accountName);
                    setQrWhatsappNumber(DEFAULT_PAYMENT_CONFIG.whatsappNumber);
                    setQrBankName(DEFAULT_PAYMENT_CONFIG.bankName || '');
                    setQrBankAccountNo('');
                    setQrBankBranch('');
                    setQrImageUrl('');
                    setQrPaymentInstruction(DEFAULT_PAYMENT_CONFIG.paymentInstruction || '');
                    showToast('Reset form to initial defaults. Click Save to apply.', 'info');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FAQ SECTION MANAGER */}
          {/* ========================================================================= */}
          {activeTab === 'faqs' && (
            <div className="space-y-6">
              <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-4 text-xs text-zinc-300 font-semibold leading-relaxed flex items-start gap-3">
                <span className="text-base select-none">❓</span>
                <div>
                  <strong className="font-black text-white">Dynamic FAQ Management System</strong>
                  <p className="mt-0.5 text-zinc-400">
                    यहाँबाट FAQ (बारम्बार सोधिने प्रश्नहरू) थप्न, सम्पादन गर्न, क्रम मिलाउन वा हटाउन सक्नुहुन्छ। परिमार्जन गरिसकेपछि तल रहेको <strong>"Save FAQs to Cloud"</strong> बटन थिच्नुहोस्।
                  </p>
                </div>
              </div>

              {/* Add New FAQ Form */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                  ➕ Add New FAQ Question & Answer
                </h4>
                <div>
                  <input 
                    type="text"
                    placeholder="प्रश्न लेख्नुहोस् (उदा: Course सुरु गरेपछि कति समयमा सर्टिफिकेट पाइन्छ?)..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>
                <div>
                  <textarea 
                    rows={2}
                    placeholder="विस्तृत उत्तर यहाँ लेख्नुहोस्..."
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2 text-xs transition outline-hidden font-medium text-slate-800"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddNewFaq}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <Plus className="w-4 h-4" /> Add FAQ To List
                </button>
              </div>

              {/* Current FAQs List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    📋 Current FAQs on Website ({localFaqs.length})
                  </h4>
                  <button
                    type="button"
                    onClick={handleResetFaqsToDefault}
                    className="text-slate-500 hover:text-purple-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {localFaqs.map((faq, idx) => (
                    <div 
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-purple-300 transition space-y-2"
                    >
                      {editingFaqIndex === idx ? (
                        /* Editing Form */
                        <div className="space-y-3 bg-purple-50/50 p-3 rounded-xl border border-purple-200">
                          <div>
                            <label className="block text-[9px] font-black uppercase text-purple-800 mb-1">Edit Question:</label>
                            <input 
                              type="text"
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase text-purple-800 mb-1">Edit Answer:</label>
                            <textarea 
                              rows={3}
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              className="w-full bg-white border border-purple-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-hidden"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateFaq(idx)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            >
                              Save FAQ
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFaqIndex(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display View */
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 grow">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <h5 className="text-xs sm:text-sm font-black text-slate-900">
                                {faq.question}
                              </h5>
                            </div>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-7">
                              {faq.answer}
                            </p>
                          </div>

                          {/* Action tools */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveFaq(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-30 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveFaq(idx, 'down')}
                              disabled={idx === localFaqs.length - 1}
                              className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-30 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFaqIndex(idx);
                                setEditQuestion(faq.question);
                                setEditAnswer(faq.answer);
                              }}
                              className="p-1 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                              title="Edit Question"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save All FAQs to Firebase Button */}
              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  disabled={isSavingFaqs}
                  onClick={handleSaveFaqsToCloud}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 px-6 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingFaqs ? 'Publishing to Cloud...' : '💾 Save FAQs to Cloud'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: INSTITUTE BRANDING & OVERALL SITE SETTINGS */}
          {/* ========================================================================= */}
          {activeTab === 'overall' && (
            <form onSubmit={handleSaveOverallSettings} className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-950 font-semibold leading-relaxed flex items-start gap-3">
                <span className="text-base select-none">🏛️</span>
                <div>
                  <strong className="font-black text-purple-900">Institute Branding & Global Website Settings</strong>
                  <p className="mt-0.5 text-purple-800">
                    यहाँबाट सम्पूर्ण वेबसाइट र प्लेटफर्मभरिको Institute को नाम (AI Clipzone Institute Name), Institute Logo URL, ब्यानर शीर्षक (Headline), सबटाइटल, Notice Announcement Banner, र सपोर्ट सम्पर्क विवरणहरू प्रत्यक्ष रूपमा फेर्न सक्नुहुन्छ।
                  </p>
                </div>
              </div>

              {/* Institute Core Identity Card */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Institute Identity & Official Logo
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Institute / Platform Name *
                    </label>
                    <input 
                      type="text"
                      required
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      placeholder="उदा: AI CLIPZONE NEPAL"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      यो नाम सम्पूर्ण साइट हेडर, फुटर, लगइन, र सर्टिफिकेटहरूमा देखा पर्नेछ।
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Institute Official Logo (Direct Image URL or Upload)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={instituteLogoUrl}
                        onChange={(e) => setInstituteLogoUrl(e.target.value)}
                        placeholder="https://example.com/institute-logo.png"
                        className="grow bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-mono text-slate-800"
                      />
                      <label className="shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageFileUpload(e, setInstituteLogoUrl, 'Institute Logo')}
                        />
                      </label>
                    </div>

                    {/* Logo Preview */}
                    {instituteLogoUrl && (
                      <div className="mt-2.5 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                        <img 
                          src={instituteLogoUrl} 
                          alt="Institute Logo Preview" 
                          className="w-10 h-10 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="text-[11px] overflow-hidden">
                          <span className="font-bold text-slate-700 block truncate">Logo Preview Loaded</span>
                          <button 
                            type="button" 
                            onClick={() => setInstituteLogoUrl('')}
                            className="text-[10px] text-red-500 hover:underline font-bold"
                          >
                            Remove Logo
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Website Text & Banners */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Website Top Headline (मुख्य ब्यानर शीर्षक) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="उदा: TOP AI COURSE NEPAL 🇳🇵"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Website Tagline / Subtitle (उप-शीर्षक) *
                  </label>
                  <input 
                    type="text"
                    required
                    value={siteTagline}
                    onChange={(e) => setSiteTagline(e.target.value)}
                    placeholder="उदा: Nepal's #1 AI Video Editing & Learning Platform"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-500">
                      Top Announcement Notice Banner Text
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                      <input 
                        type="checkbox"
                        checked={showNoticeBanner}
                        onChange={(e) => setShowNoticeBanner(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Show Notice Banner on Website</span>
                    </label>
                  </div>
                  <input 
                    type="text"
                    value={noticeBannerText}
                    onChange={(e) => setNoticeBannerText(e.target.value)}
                    placeholder="उदा: 🎉 New AI Tools & YouTube Blueprint Masterclasses Live! 50% Early Bird Discount."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Support Email Address *
                  </label>
                  <input 
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="उदा: ai.clipzone.edu@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Support Phone Number *
                  </label>
                  <input 
                    type="text"
                    required
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="उदा: 9763323268"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Android APK File Download Direct Link (वैकल्पिक सिधै APK URL)
                  </label>
                  <input 
                    type="text"
                    value={apkDownloadUrl}
                    onChange={(e) => setApkDownloadUrl(e.target.value)}
                    placeholder="उदा: https://your-server.com/aiclipzone.apk (खाली भएमा PWA Instant Installer स्वतः प्रयोग हुन्छ)"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    यदि तपाईंसँग सिधै `.apk` फाइलको Direct Download Link छ भने यहाँ राख्न सक्नुहुन्छ।
                  </p>
                </div>
              </div>

              {/* Live Header & Branding Preview Box */}
              <div className="bg-zinc-950 text-white p-4 sm:p-5 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Live Website Header & Brand Preview
                  </span>
                  <span className="text-[9px] bg-blue-950 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-800">
                    Real-time
                  </span>
                </div>

                <div className="bg-black p-3 sm:p-4 rounded-xl border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left w-full sm:w-auto">
                    {instituteLogoUrl ? (
                      <img 
                        src={instituteLogoUrl} 
                        alt="Logo Preview" 
                        className="w-12 h-12 object-contain rounded-xl bg-black border border-blue-500/40 p-1 shrink-0 shadow-md"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-blue-500/40 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-6 h-6 text-blue-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                        <span>{instituteName || 'AI CLIPZONE NEPAL'}</span>
                        <span className="text-blue-400 text-xs">🇳🇵</span>
                      </div>
                      <p className="text-[10px] text-zinc-300 font-medium truncate max-w-xs">
                        {siteTagline || "Nepal's #1 AI Video Editing & Learning Platform"}
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto text-right">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block font-mono">
                      {siteTitle || 'TOP AI COURSE NEPAL'}
                    </span>
                    <span className="text-[9px] text-zinc-400">
                      {supportEmail} • {supportPhone}
                    </span>
                  </div>
                </div>

                {showNoticeBanner && noticeBannerText && (
                  <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold text-center tracking-tight truncate">
                    {noticeBannerText}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingSiteSettings}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 px-6 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingSiteSettings ? 'Saving to Firebase...' : '💾 Save Institute & Site Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInstituteName(DEFAULT_SITE_SETTINGS.instituteName || 'AI CLIPZONE NEPAL');
                    setInstituteLogoUrl(DEFAULT_SITE_SETTINGS.instituteLogoUrl || '');
                    setSiteTitle(DEFAULT_SITE_SETTINGS.siteTitle || 'TOP AI COURSE NEPAL 🇳🇵');
                    setSiteTagline(DEFAULT_SITE_SETTINGS.siteTagline || "Nepal's #1 AI Video Editing & Learning Platform");
                    setNoticeBannerText(DEFAULT_SITE_SETTINGS.noticeBannerText || '');
                    setShowNoticeBanner(true);
                    setSupportPhone(DEFAULT_SITE_SETTINGS.supportPhone || '9763323268');
                    setSupportEmail(DEFAULT_SITE_SETTINGS.supportEmail || 'ai.clipzone.edu@gmail.com');
                    showToast('Reset site settings form to default values. Click Save to apply.', 'info');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: CERTIFICATE DESIGNER & SIGNATURES */}
          {/* ========================================================================= */}
          {activeTab === 'certificate' && (
            <form onSubmit={handleSaveCertificateSettings} className="space-y-6">
              <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-4 text-xs text-zinc-200 font-semibold leading-relaxed flex items-start gap-3">
                <span className="text-base select-none">📜</span>
                <div className="grow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <strong className="font-black text-white text-sm">
                      Certificate Designer & Authority Signatures
                    </strong>
                    {selectedCertScope === 'global' ? (
                      <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-blue-500/30 self-start sm:self-auto">
                        🌐 Editing Global Default Template
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full text-[10px] font-black border border-purple-500/30 self-start sm:self-auto">
                        🎓 Editing Course: {courses.find(c => c.id === selectedCertScope)?.title.slice(0, 30)}...
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-zinc-400 text-xs">
                    यहाँबाट सम्पूर्ण कोर्सको साझा <b>Global Template</b> अथवा <b>प्रत्येक कोर्षको आफ्नै व्यक्तिगत Certificate</b> (Title, Institute Logo, Theme Color, Signatures, Course Name, Stamp) पूर्ण रूपमा परिमार्जन गर्न सकिन्छ।
                  </p>
                </div>
              </div>

              {/* Scope Selector: Global Template vs Specific Course */}
              <div className="bg-zinc-950 text-white p-4 rounded-2xl border border-zinc-800 space-y-2.5 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[11px] font-black uppercase text-blue-400 tracking-wider">
                    🎯 Select Certificate Target (कुन कोर्षको सर्टिफिकेट मिलाउने?):
                  </label>
                  {selectedCertScope !== 'global' && (
                    <button
                      type="button"
                      onClick={handleResetCourseCertificateToGlobal}
                      className="text-[11px] bg-rose-950 hover:bg-rose-900 text-rose-300 hover:text-rose-100 font-bold px-3 py-1 rounded-lg border border-rose-800 transition cursor-pointer self-start sm:self-auto"
                    >
                      ⚡ Reset this Course to Global Template
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => handleSwitchCertScope('global')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                      selectedCertScope === 'global'
                        ? 'bg-blue-600 text-white shadow-md font-bold'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                    }`}
                  >
                    🌐 Global Default Template
                  </button>

                  {courses.map((c) => {
                    const hasCustom = !!c.certificateTitle || !!c.certificateCourseTitle || !!c.certificateTheme || !!c.certificateDirectorName || !!c.certificateCeoName || !!c.certificateLogoUrl;
                    const isSelected = selectedCertScope === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSwitchCertScope(c.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-md font-black ring-2 ring-purple-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                        }`}
                      >
                        <span>🎓 {c.title.replace(/by Dhruv Rathee/gi, 'by AI Clipzone').slice(0, 26)}...</span>
                        {hasCustom && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded border border-emerald-400/40">
                            Customized
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Realtime Certificate Mockup Preview */}
              <div className="bg-zinc-950 text-white p-4 sm:p-5 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Interactive Live Certificate Preview
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedCertScope !== 'global' && (
                      <span className="text-[9px] bg-blue-950 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-800">
                        Course Override Active
                      </span>
                    )}
                    <span className="text-[9px] bg-blue-950 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-800">
                      Theme: {certificateTheme.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Scaled-down realistic certificate render */}
                <div className={`p-5 rounded-xl border-4 transition-all text-center relative overflow-hidden ${
                  certificateTheme === 'blue' || certificateTheme === 'gold'
                    ? 'bg-blue-50/95 text-slate-900 border-blue-600 shadow-blue-900/40' 
                    : certificateTheme === 'cyber-purple'
                    ? 'bg-purple-50/95 text-slate-900 border-purple-600 shadow-purple-900/40'
                    : certificateTheme === 'emerald'
                    ? 'bg-emerald-50/95 text-slate-900 border-emerald-600 shadow-emerald-900/40'
                    : 'bg-rose-50/95 text-slate-900 border-rose-600 shadow-rose-900/40'
                }`}>
                  {/* Watermark Logo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <GraduationCap className="w-64 h-64 text-slate-900" />
                  </div>

                  <div className="flex justify-between items-center px-4 mb-2">
                    {certificateLogoUrl || instituteLogoUrl ? (
                      <img 
                        src={certificateLogoUrl || instituteLogoUrl} 
                        alt="Logo" 
                        className="h-9 object-contain rounded"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="font-black text-xs uppercase tracking-widest text-slate-800">
                        {certificateInstituteName || 'AI CLIPZONE'}
                      </div>
                    )}
                    <span className="text-[9px] font-mono font-black text-slate-500 tracking-wider">
                      CERT-PREVIEW-2026
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-serif font-black tracking-widest uppercase text-slate-900 mt-1">
                    {certificateTitle || 'CERTIFICATE'}
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    {certificateSubtitle || 'OF ACHIEVEMENT'}
                  </p>

                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold">
                    This is proudly presented to
                  </p>
                  <h4 className="text-lg sm:text-xl font-serif font-black text-purple-900 italic my-1">
                    Student Full Name
                  </h4>
                  <p className="text-[11px] text-slate-700 font-semibold mb-0.5">
                    For successfully mastering & completing the verified curriculum of:
                  </p>
                  <h5 className="text-xs sm:text-sm font-black text-purple-900 uppercase tracking-wide max-w-lg mx-auto">
                    {certCourseTitleOverride || (selectedCertScope !== 'global' ? courses.find(c => c.id === selectedCertScope)?.title.replace(/by Dhruv Rathee/gi, 'by AI Clipzone') : 'Master Course Curriculum')}
                  </h5>
                  <p className="text-[10px] text-slate-600 max-w-md mx-auto font-medium leading-relaxed mt-1">
                    {certificateDescription || 'has successfully completed all modules and practical requirements of the course with outstanding performance.'}
                  </p>

                  {/* Signatories & Seal in Certificate Preview */}
                  <div className="mt-4 pt-3 border-t border-slate-300/80 flex items-center justify-between px-2 sm:px-6">
                    {/* Left Authority */}
                    <div className="text-center w-28 sm:w-36">
                      <div className="h-8 flex items-center justify-center">
                        {certificateDirectorSignatureUrl ? (
                          <img 
                            src={certificateDirectorSignatureUrl} 
                            alt="Director Signature" 
                            className="h-7 object-contain mx-auto"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="font-serif italic text-sm text-slate-700 font-bold">
                            {certificateDirectorName}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-400 mt-1 pt-0.5">
                        <strong className="text-[10px] font-black text-slate-800 block leading-tight">
                          {certificateDirectorName}
                        </strong>
                        <span className="text-[8px] text-slate-500 block leading-tight font-medium">
                          {certificateDirectorTitle}
                        </span>
                      </div>
                    </div>

                    {/* Seal */}
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-blue-600 flex flex-col items-center justify-center p-1 bg-blue-100/50 shadow-inner">
                      <ShieldCheck className="w-4 h-4 text-blue-700" />
                      <span className="text-[6px] font-black text-blue-900 uppercase">SEAL</span>
                    </div>

                    {/* Right Authority */}
                    <div className="text-center w-28 sm:w-36">
                      <div className="h-8 flex items-center justify-center">
                        {certificateCeoSignatureUrl ? (
                          <img 
                            src={certificateCeoSignatureUrl} 
                            alt="CEO Signature" 
                            className="h-7 object-contain mx-auto"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <span className="font-serif italic text-sm text-slate-700 font-bold">
                            {certificateCeoName}
                          </span>
                        )}
                      </div>
                      <div className="border-t border-slate-400 mt-1 pt-0.5">
                        <strong className="text-[10px] font-black text-slate-800 block leading-tight">
                          {certificateCeoName}
                        </strong>
                        <span className="text-[8px] text-slate-500 block leading-tight font-medium">
                          {certificateCeoTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Theme Selection */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-600">
                  🎨 Certificate Visual Theme ({selectedCertScope === 'global' ? 'Global Default' : 'Course Override'})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'blue', name: 'Sapphire Blue', border: 'border-blue-500', bg: 'bg-blue-50', badge: 'bg-blue-600' },
                    { id: 'cyber-purple', name: 'Cyber Purple', border: 'border-purple-400', bg: 'bg-purple-50', badge: 'bg-purple-600' },
                    { id: 'emerald', name: 'Emerald Green', border: 'border-emerald-400', bg: 'bg-emerald-50', badge: 'bg-emerald-600' },
                    { id: 'crimson', name: 'Crimson Red', border: 'border-rose-400', bg: 'bg-rose-50', badge: 'bg-rose-600' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setCertificateTheme(theme.id as any)}
                      className={`p-3 rounded-xl border-2 text-left transition flex flex-col gap-1.5 cursor-pointer ${
                        certificateTheme === theme.id
                          ? `${theme.border} ${theme.bg} shadow-sm ring-2 ring-purple-400`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-3.5 h-3.5 rounded-full ${theme.badge}`} />
                        {certificateTheme === theme.id && (
                          <span className="text-[10px] font-black text-purple-700">ACTIVE</span>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Certificate Text & Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Certificate Main Heading *
                  </label>
                  <input 
                    type="text"
                    required
                    value={certificateTitle}
                    onChange={(e) => setCertificateTitle(e.target.value)}
                    placeholder="CERTIFICATE"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800 tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Certificate Sub-Heading *
                  </label>
                  <input 
                    type="text"
                    required
                    value={certificateSubtitle}
                    onChange={(e) => setCertificateSubtitle(e.target.value)}
                    placeholder="OF ACHIEVEMENT"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800 tracking-wider"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Institute Name on Certificate *
                  </label>
                  <input 
                    type="text"
                    required
                    value={certificateInstituteName}
                    onChange={(e) => setCertificateInstituteName(e.target.value)}
                    placeholder="AI CLIPZONE NEPAL"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Course Title Printed on Certificate {selectedCertScope !== 'global' ? '(Override for this course)' : '(Default)'}
                  </label>
                  <input 
                    type="text"
                    value={certCourseTitleOverride}
                    onChange={(e) => setCertCourseTitleOverride(e.target.value)}
                    placeholder="e.g. YouTube Blueprint & AI Video Editing Masterclass"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    {selectedCertScope === 'global'
                      ? '* Global template मा यो खाली छोडेमा प्रत्येक विद्यार्थीको सम्बन्धित कोर्षको नाम स्वतः प्रयोग हुनेछ।'
                      : `* यस कोर्षको सर्टिफिकेटमा देखिने नाम यहाँबाट परिवर्तन गर्न सक्नुहुन्छ।`}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-black uppercase text-slate-500">
                      Certificate Logo URL
                    </label>
                    {instituteLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setCertificateLogoUrl(instituteLogoUrl)}
                        className="text-[10px] text-purple-700 hover:underline font-bold"
                      >
                        ⚡ Use Institute Logo
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      value={certificateLogoUrl}
                      onChange={(e) => setCertificateLogoUrl(e.target.value)}
                      placeholder="https://example.com/certificate-logo.png"
                      className="grow bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-mono text-slate-800"
                    />
                    <label className="shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Upload</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageFileUpload(e, setCertificateLogoUrl, 'Certificate Logo')}
                      />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                    Custom Certificate Body Text (Leave empty to use automatic course description)
                  </label>
                  <textarea 
                    rows={2}
                    value={certificateDescription}
                    onChange={(e) => setCertificateDescription(e.target.value)}
                    placeholder="has successfully completed all modules, practical assignments, and verified requirements of the course..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Signatures Authority Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                {/* Director Authority */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      ✍️ Left Signatory (Director)
                    </h5>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Authority Name *
                    </label>
                    <input 
                      type="text"
                      value={certificateDirectorName}
                      onChange={(e) => setCertificateDirectorName(e.target.value)}
                      placeholder="उदा: Director"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Authority Title / Designation
                    </label>
                    <input 
                      type="text"
                      value={certificateDirectorTitle}
                      onChange={(e) => setCertificateDirectorTitle(e.target.value)}
                      placeholder="Program Director / Academic Head"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Director Digital Signature (URL or Upload Image)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={certificateDirectorSignatureUrl}
                        onChange={(e) => setCertificateDirectorSignatureUrl(e.target.value)}
                        placeholder="https://example.com/director-signature.png"
                        className="grow bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-mono text-slate-800"
                      />
                      <label className="shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageFileUpload(e, setCertificateDirectorSignatureUrl, 'Director Signature')}
                        />
                      </label>
                    </div>

                    {/* Signature Preview */}
                    {certificateDirectorSignatureUrl ? (
                      <div className="mt-2 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                        <img 
                          src={certificateDirectorSignatureUrl} 
                          alt="Director Signature" 
                          className="h-9 object-contain max-w-[120px]"
                        />
                        <button 
                          type="button" 
                          onClick={() => setCertificateDirectorSignatureUrl('')}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        * यदि signature image खाली राखियो भने सुरुवाती stylised digital script प्रयोग हुनेछ।
                      </p>
                    )}
                  </div>
                </div>

                {/* Founder/CEO Authority */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1.5">
                      ✍️ Right Signatory (Founder & CEO)
                    </h5>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Authority Name *
                    </label>
                    <input 
                      type="text"
                      value={certificateCeoName}
                      onChange={(e) => setCertificateCeoName(e.target.value)}
                      placeholder="उदा: Founder/CEO (AI Clipzone)"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      Authority Title / Designation
                    </label>
                    <input 
                      type="text"
                      value={certificateCeoTitle}
                      onChange={(e) => setCertificateCeoTitle(e.target.value)}
                      placeholder="Founder & CEO (AI Clipzone)"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                      CEO Digital Signature (URL or Upload Image)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={certificateCeoSignatureUrl}
                        onChange={(e) => setCertificateCeoSignatureUrl(e.target.value)}
                        placeholder="https://example.com/ceo-signature.png"
                        className="grow bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-mono text-slate-800"
                      />
                      <label className="shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageFileUpload(e, setCertificateCeoSignatureUrl, 'CEO Signature')}
                        />
                      </label>
                    </div>

                    {/* Signature Preview */}
                    {certificateCeoSignatureUrl ? (
                      <div className="mt-2 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                        <img 
                          src={certificateCeoSignatureUrl} 
                          alt="CEO Signature" 
                          className="h-9 object-contain max-w-[120px]"
                        />
                        <button 
                          type="button" 
                          onClick={() => setCertificateCeoSignatureUrl('')}
                          className="text-[10px] text-red-500 hover:underline font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        * यदि signature image खाली राखियो भने सुरुवाती stylised digital script प्रयोग हुनेछ।
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Official Seal / Stamp Details */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-black uppercase text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Official Stamp & Security Seal Text
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Certificate Stamp Image URL (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        value={certificateStampUrl}
                        onChange={(e) => setCertificateStampUrl(e.target.value)}
                        placeholder="https://example.com/official-stamp.png"
                        className="grow bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-mono text-slate-800"
                      />
                      <label className="shrink-0 bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Upload</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => handleImageFileUpload(e, setCertificateStampUrl, 'Official Stamp')}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Seal Perimeter Verification Text
                    </label>
                    <input 
                      type="text"
                      value={certificateSealText}
                      onChange={(e) => setCertificateSealText(e.target.value)}
                      placeholder="OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL"
                      className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Save Certificate Design Button */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSavingSiteSettings}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3.5 px-6 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingSiteSettings 
                    ? 'Saving Certificate Settings...' 
                    : selectedCertScope === 'global'
                    ? '💾 Save Global Certificate Template'
                    : `💾 Save Certificate for "${courses.find(c => c.id === selectedCertScope)?.title.slice(0, 20)}..."`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCertificateTitle(DEFAULT_SITE_SETTINGS.certificateTitle || 'CERTIFICATE');
                    setCertificateSubtitle(DEFAULT_SITE_SETTINGS.certificateSubtitle || 'OF ACHIEVEMENT');
                    setCertificateInstituteName(DEFAULT_SITE_SETTINGS.certificateInstituteName || 'AI CLIPZONE NEPAL');
                    setCertificateLogoUrl(DEFAULT_SITE_SETTINGS.certificateLogoUrl || '');
                    setCertificateDescription(DEFAULT_SITE_SETTINGS.certificateDescription || '');
                    setCertificateDirectorName(DEFAULT_SITE_SETTINGS.certificateDirectorName || 'Director');
                    setCertificateDirectorTitle(DEFAULT_SITE_SETTINGS.certificateDirectorTitle || 'Program Director');
                    setCertificateDirectorSignatureUrl(DEFAULT_SITE_SETTINGS.certificateDirectorSignatureUrl || '');
                    setCertificateCeoName(DEFAULT_SITE_SETTINGS.certificateCeoName || 'Founder/CEO (AI Clipzone)');
                    setCertificateCeoTitle(DEFAULT_SITE_SETTINGS.certificateCeoTitle || 'Founder & CEO');
                    setCertificateCeoSignatureUrl(DEFAULT_SITE_SETTINGS.certificateCeoSignatureUrl || '');
                    setCertificateTheme(DEFAULT_SITE_SETTINGS.certificateTheme || 'blue');
                    setCertificateStampUrl(DEFAULT_SITE_SETTINGS.certificateStampUrl || '');
                    setCertificateSealText(DEFAULT_SITE_SETTINGS.certificateSealText || 'OFFICIAL VERIFIED CERTIFICATE • AI CLIPZONE NEPAL');
                    showToast('Reset certificate design parameters to defaults. Click Save to apply.', 'info');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Reset Form to Defaults
                </button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: COURSE CATALOG MANAGER */}
          {/* ========================================================================= */}
          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    📚 Dynamic Course Catalog ({courses?.length || 0} courses)
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Add new courses with custom chapters, Drive/YouTube videos, price tags, and thumbnail graphics.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateCourseClick();
                  }}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add New Course
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course) => (
                  <div 
                    key={course.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-start gap-3 hover:border-purple-300 transition"
                  >
                    <img 
                      src={course.image} 
                      alt={course.title} 
                      className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0 bg-slate-100"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                      }}
                    />
                    <div className="grow space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-700 bg-purple-50 text-[10px] font-black px-2 py-0.5 rounded border border-purple-200">
                          {course.price}
                        </span>
                        <span className="text-slate-500 text-[10px] font-bold">
                          🎬 {course.videos?.length || 0} Videos
                        </span>
                        <span className="text-rose-600 bg-rose-50 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200">
                          📕 {course.pdfs?.length || 0} PDFs
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 truncate">
                        {course.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-medium line-clamp-1">
                        ID: {course.id}
                      </p>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditCourseClick(course);
                          }}
                          className="bg-slate-100 hover:bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCourseToDeleteAdmin(course);
                            setAdminDeleteConfirmText('');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2.5 py-1 rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 7: PUSH NOTIFICATIONS & BROADCASTS */}
          {/* ========================================================================= */}
          {activeTab === 'notifications' && (
            <AdminNotificationsTab
              notifications={notifications || []}
              onSendNotification={onSendNotification || (async () => {})}
              onDeleteNotification={onDeleteNotification || (async () => {})}
              showToast={showToast}
              instituteName={siteSettings.instituteName || 'AI Clipzone Nepal'}
              instituteLogoUrl={siteSettings.instituteLogoUrl || '/pwa-192x192.png'}
            />
          )}

        </div>

        {/* Bottom Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            AI Clipzone Admin Console
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Key / User Course Code Permanent Delete Confirmation Dialog */}
        <AnimatePresence>
          {keyToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-100 text-left space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Permanently Remove User Course Code?
                    </h3>
                    <p className="text-xs text-rose-600 font-bold">
                      यो कोड र विद्यार्थीको पहुँच स्थायी रूपमा हटाइनेछ (Cannot be undone)
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Secret Code:</span>
                    <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {keyToDelete.code || keyToDelete.id}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Student Name:</span>
                    <span className="font-extrabold text-slate-900">
                      {keyToDelete.studentName || keyToDelete.claimedByEmail || 'Not Assigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Course:</span>
                    <span className="font-bold text-slate-800 text-right truncate max-w-[200px]">
                      {keyToDelete.courseTitle || 'All Courses'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Status:</span>
                    <span className="font-extrabold uppercase text-[10px] text-slate-700">
                      {keyToDelete.status || 'Active'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingKey}
                    onClick={() => setKeyToDelete(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel (रद्द गर्नुहोस्)
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingKey}
                    onClick={async () => {
                      try {
                        setIsDeletingKey(true);
                        await onDeleteKey(keyToDelete.code || keyToDelete.id);
                        setKeyToDelete(null);
                      } catch (e) {
                        console.error('Delete error:', e);
                      } finally {
                        setIsDeletingKey(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isDeletingKey ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Confirm Permanent Delete (स्थायी हटाउनुहोस्)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {/* Course Permanent Delete Confirmation Dialog in Admin Dashboard */}
        <AnimatePresence>
          {courseToDeleteAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-rose-200 text-left space-y-4 font-sans"
              >
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                    <Trash2 className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Confirm Course Deletion
                    </h3>
                    <p className="text-xs text-rose-600 font-bold">
                      कोर्ष मेटाउनु अघि कृपया पुष्टि गर्नुहोस्
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-1.5 text-xs text-rose-900">
                  <p className="font-extrabold text-slate-900">
                    मेटाउन लागेको कोर्ष (Target Course):
                  </p>
                  <p className="font-black text-sm text-rose-700 bg-white px-3 py-2 rounded-xl border border-rose-200">
                    {courseToDeleteAdmin.title}
                  </p>
                  <p className="text-[11px] text-rose-700 pt-1 leading-relaxed font-medium">
                    यो कोर्ष र यससँग सम्बन्धित सबै भिडियो तथा पिडिएफ सामग्रीहरू हटाइनेछ। दुर्घटनावश मेटाउनबाट बच्न तल <span className="font-black text-rose-900 underline">DELETE</span> टाइप गर्नुहोस्।
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Type <span className="text-rose-600 font-mono font-black">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={adminDeleteConfirmText}
                    onChange={(e) => setAdminDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here..."
                    autoFocus
                    disabled={isAdminDeletingCourse}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-rose-500 rounded-xl px-4 py-2.5 text-sm font-mono font-black tracking-widest text-rose-600 placeholder-slate-400 outline-hidden text-center"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isAdminDeletingCourse}
                    onClick={() => {
                      setCourseToDeleteAdmin(null);
                      setAdminDeleteConfirmText('');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel (रद्द गर्नुहोस्)
                  </button>
                  <button
                    type="button"
                    disabled={adminDeleteConfirmText.trim().toUpperCase() !== 'DELETE' || isAdminDeletingCourse}
                    onClick={async () => {
                      if (!courseToDeleteAdmin) return;
                      try {
                        setIsAdminDeletingCourse(true);
                        await onDeleteCourseClick(courseToDeleteAdmin.id);
                        setCourseToDeleteAdmin(null);
                        setAdminDeleteConfirmText('');
                      } catch (e) {
                        console.error('Delete course error:', e);
                      } finally {
                        setIsAdminDeletingCourse(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isAdminDeletingCourse ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {isAdminDeletingCourse ? 'Deleting...' : 'Confirm Delete (मेटाउनुहोस्)'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {/* CONFIRM DELETE ALL KEYS BULK MODAL */}
          {showDeleteAllKeysModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 text-rose-500">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Delete All Student Course Codes?</h3>
                    <p className="text-xs text-rose-400 font-bold uppercase tracking-wider">स्थायी रूपमा सबै कोड मेटाउने</p>
                  </div>
                </div>

                <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-200/90 space-y-2">
                  <p className="font-medium leading-relaxed">
                    यो कार्य स्थायी छ। डाटाबेसमा रहेका सबै पुराना <strong className="text-white font-black">विद्यार्थी कोर्ष कोडहरू ({allActivationKeys?.length || 0})</strong> पूर्ण रूपमा मेटिनेछन्।
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    पुष्टि गर्न तल <strong className="text-rose-400 font-black">DELETE</strong> टाइप गर्नुहोस्:
                  </p>
                  <input
                    type="text"
                    value={deleteAllKeysConfirmInput}
                    onChange={(e) => setDeleteAllKeysConfirmInput(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full bg-black/60 border border-rose-500/40 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-rose-400 outline-hidden tracking-widest text-center"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingAllKeys}
                    onClick={() => {
                      setShowDeleteAllKeysModal(false);
                      setDeleteAllKeysConfirmInput('');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    रद्द गर्नुहोस् (Cancel)
                  </button>
                  <button
                    type="button"
                    disabled={deleteAllKeysConfirmInput.trim().toUpperCase() !== 'DELETE' || isDeletingAllKeys}
                    onClick={async () => {
                      if (!onDeleteAllKeys) return;
                      try {
                        setIsDeletingAllKeys(true);
                        await onDeleteAllKeys();
                        setShowDeleteAllKeysModal(false);
                        setDeleteAllKeysConfirmInput('');
                      } catch (e) {
                        console.error('Delete all keys error:', e);
                      } finally {
                        setIsDeletingAllKeys(false);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeletingAllKeys ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    {isDeletingAllKeys ? 'Deleting All...' : 'सबै मेटाउनुहोस् (Delete All)'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
