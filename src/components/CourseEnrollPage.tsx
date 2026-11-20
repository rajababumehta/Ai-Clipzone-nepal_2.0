import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Mail,
  Phone,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '../firebase';
import { Course, PaymentQrConfig } from '../types';
import { compressImageFile, formatFileSize } from '../utils/chatMedia';

interface CourseEnrollPageProps {
  course: Course;
  paymentConfig: PaymentQrConfig;
  initialName?: string;
  initialEmail?: string;
  onBack: () => void;
  onFreeEnrollComplete?: (
    course: Course,
    details: { fullName: string; phone: string }
  ) => Promise<void> | void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

export const CourseEnrollPage: React.FC<CourseEnrollPageProps> = ({
  course,
  paymentConfig,
  initialName = '',
  initialEmail = '',
  onBack,
  onFreeEnrollComplete,
  showToast,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFreeCourse = Boolean(
    course.isFree ||
      course.amount === 0 ||
      /^free$/i.test((course.price || '').trim())
  );

  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    phone?: string;
    screenshot?: string;
  }>({});

  const cleanPhoneNumber = (raw?: string) => {
    const digits = (raw || '9763323268').replace(/\D/g, '');
    if (!digits) return '9779763323268';
    return digits.startsWith('977') ? digits : `977${digits}`;
  };

  const whatsappNumber = cleanPhoneNumber(paymentConfig.whatsappNumber);

  useEffect(() => {
    if (!isFreeCourse && !paymentConfig.qrImageUrl && qrCanvasRef.current) {
      const qrPayload = JSON.stringify({
        eSewa_id: paymentConfig.esewaId || '9763323268',
        name: paymentConfig.accountName || 'Ayush Chaurasiya',
      });
      QRCode.toCanvas(
        qrCanvasRef.current,
        qrPayload,
        {
          width: 240,
          margin: 1,
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) {
            console.error('Failed to generate payment QR code:', error);
          }
        }
      );
    }
  }, [isFreeCourse, paymentConfig]);

  const buildWhatsappMessage = () => {
    const lines = [
      `Course Enrollment & Payment Confirmation`,
      `Course: ${course.title}`,
      `Price: ${course.price}`,
      `Full Name: ${fullName.trim() || 'Not provided'}`,
      ...(email.trim() ? [`Email: ${email.trim()}`] : []),
      `Phone: ${phone.trim() || 'Not provided'}`,
      ...(transactionId.trim() ? [`QR Transaction ID: ${transactionId.trim()}`] : []),
      ...(screenshotFile
        ? [`Payment Screenshot: Selected (${screenshotFile.name}) — sending screenshot in this chat.`]
        : []),
    ];
    if (course.message?.trim()) {
      lines.push('', course.message.trim());
    }
    return lines.join('\n');
  };

  const buildWhatsappUrl = () =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsappMessage())}`;

  const launchWhatsappUrl = (url: string) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a PNG, JPG, or JPEG image.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot must be 5MB or smaller.', 'error');
      e.target.value = '';
      return;
    }

    setScreenshotFile(file);
    setFieldErrors((prev) => ({ ...prev, screenshot: undefined }));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshotPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearScreenshot = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshotFile(null);
    setScreenshotPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateRequiredFields = () => {
    const nextErrors: {
      fullName?: string;
      phone?: string;
      screenshot?: string;
    } = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full Name is required.';
    }

    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      nextErrors.phone = 'Phone Number is required.';
    } else if (phoneDigits.length < 7) {
      nextErrors.phone = 'Please enter a valid Phone Number.';
    }

    if (!isFreeCourse && !screenshotFile) {
      nextErrors.screenshot = 'QR Payment Screenshot is required.';
    }

    setFieldErrors(nextErrors);

    const missingLabels: string[] = [];
    if (nextErrors.fullName) missingLabels.push('Full Name');
    if (nextErrors.phone) missingLabels.push('Phone Number');
    if (!isFreeCourse && nextErrors.screenshot) missingLabels.push('QR Payment Screenshot');

    if (missingLabels.length > 0) {
      showToast(
        `Please provide: ${missingLabels.join(', ')} before continuing.`,
        'error'
      );
      return false;
    }

    return true;
  };

  const saveEnrollmentRequestInBackground = async (capturedScreenshotFile: File | null) => {
    try {
      let uid = auth.currentUser?.uid;
      if (!uid) {
        const cred = await signInAnonymously(auth).catch(() => null);
        uid = cred?.user?.uid;
      }
      if (!uid) return;

      let compressedUrl = '';
      if (capturedScreenshotFile) {
        try {
          const compressed = await compressImageFile(capturedScreenshotFile, 900, 0.65);
          if (compressed.url.length <= 280000) {
            compressedUrl = compressed.url;
          }
        } catch {
          // Non-fatal if image compression fails
        }
      }

      const reqRef = doc(collection(db, 'course_requests'));
      await setDoc(reqRef, {
        id: reqRef.id,
        userId: uid,
        courseId: course.id,
        courseTitle: course.title,
        coursePrice: course.price,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        transactionId: transactionId.trim(),
        ...(compressedUrl ? { screenshotUrl: compressedUrl } : {}),
        status: 'pending',
        createdAt: Date.now(),
      });
    } catch {
      // Non-fatal background log
    }
  };

  const handleWhatsappClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!validateRequiredFields()) {
      e.preventDefault();
      return;
    }

    showToast(
      'Opening WhatsApp — please attach your payment screenshot in chat to complete verification.',
      'success'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequiredFields()) {
      return;
    }

    if (isFreeCourse) {
      if (!onFreeEnrollComplete) {
        showToast('Free enrollment handler is unavailable. Please try again.', 'error');
        return;
      }
      setIsSubmitting(true);
      try {
        await onFreeEnrollComplete(course, {
          fullName: fullName.trim(),
          phone: phone.trim(),
        });
      } catch (err) {
        console.error('Free enrollment error:', err);
        showToast('Could not complete enrollment. Please try again.', 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    const url = buildWhatsappUrl();
    launchWhatsappUrl(url);

    void saveEnrollmentRequestInBackground(screenshotFile).finally(() => {
      setIsSubmitting(false);
    });

    showToast(
      'Opening WhatsApp — please attach your payment screenshot in chat to complete verification.',
      'success'
    );
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col relative overflow-x-hidden">
      {/* Subtle warm ambient glow matching the design */}
      <div
        className="pointer-events-none fixed inset-x-0 top-12 h-96 mx-auto max-w-lg rounded-full blur-[120px] opacity-25"
        style={{ background: isFreeCourse ? 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(0,0,0,0) 70%)' : 'radial-gradient(circle, rgba(220,38,38,0.65) 0%, rgba(0,0,0,0) 70%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl mx-auto px-4 pt-4 pb-10 flex flex-col gap-6">
        {/* Top Bar: Back Button + Course Strip */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to courses"
            className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 min-h-[44px] rounded-xl bg-zinc-950/80 border border-zinc-800/70 px-4 py-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-zinc-100 truncate">
              {course.title}
            </span>
            <span className="text-sm font-bold text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
              {isFreeCourse ? 'FREE' : course.price}
            </span>
          </div>
        </div>

        {/* Centered QR Payment Card (Paid courses only) */}
        {!isFreeCourse && (
          <div className="flex flex-col items-center pt-1">
            <div className="w-56 h-56 sm:w-64 sm:h-64 bg-white rounded-2xl p-3.5 sm:p-4 flex items-center justify-center shadow-[0_0_85px_-14px_rgba(220,38,38,0.45)]">
              {paymentConfig.qrImageUrl ? (
                <img
                  src={paymentConfig.qrImageUrl}
                  alt="Payment QR Code"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <canvas ref={qrCanvasRef} className="w-full h-full object-contain" />
              )}
            </div>
          </div>
        )}

        {/* Enrollment & Payment Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {/* Full Name */}
          <div>
            <label
              className={`flex items-center gap-3.5 bg-zinc-950/90 border rounded-xl px-4 py-3 transition ${
                fieldErrors.fullName
                  ? 'border-rose-500/80 focus-within:border-rose-400'
                  : 'border-zinc-800/90 focus-within:border-zinc-600'
              }`}
            >
              <User className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-zinc-300 leading-tight mb-0.5">
                  Full Name <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName && e.target.value.trim()) {
                      setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                    }
                  }}
                  placeholder="Enter your full name"
                  className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                  required
                />
              </div>
            </label>
            {fieldErrors.fullName && (
              <p className="mt-1 px-1 text-[11px] text-rose-400 font-medium">
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          {/* Email Address (Paid courses only) */}
          {!isFreeCourse && (
            <label className="flex items-center gap-3.5 bg-zinc-950/90 border border-zinc-800/90 focus-within:border-zinc-600 rounded-xl px-4 py-3 transition">
              <Mail className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-zinc-300 leading-tight mb-0.5">
                  Email Address
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                />
              </div>
            </label>
          )}

          {/* Phone Number */}
          <div>
            <label
              className={`flex items-center gap-3.5 bg-zinc-950/90 border rounded-xl px-4 py-3 transition ${
                fieldErrors.phone
                  ? 'border-rose-500/80 focus-within:border-rose-400'
                  : 'border-zinc-800/90 focus-within:border-zinc-600'
              }`}
            >
              <Phone className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-zinc-300 leading-tight mb-0.5">
                  Phone Number <span className="text-rose-500">*</span>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (fieldErrors.phone && e.target.value.replace(/\D/g, '').length >= 7) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder="98XXXXXXXX"
                  className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none tabular-nums"
                  required
                />
              </div>
            </label>
            {fieldErrors.phone && (
              <p className="mt-1 px-1 text-[11px] text-rose-400 font-medium">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          {/* QR Transaction ID & Screenshot (Paid courses only) */}
          {!isFreeCourse && (
            <>
              {/* QR Transaction ID (Optional) */}
              <label className="flex items-center gap-3.5 bg-zinc-950/90 border border-zinc-800/90 focus-within:border-zinc-600 rounded-xl px-4 py-3 transition">
                <CreditCard className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold text-zinc-300 leading-tight mb-0.5">
                    QR Transaction ID (Optional)
                  </span>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID if available"
                    className="w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
                  />
                </div>
              </label>

              {/* QR Payment Screenshot */}
              <div className="pt-2 space-y-2">
                <p className="text-xs font-semibold text-zinc-200">
                  QR Payment Screenshot <span className="text-rose-500">*</span>
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`w-full border border-dashed rounded-xl p-4 sm:p-5 transition cursor-pointer flex items-center justify-center gap-3.5 text-left min-h-[72px] ${
                    fieldErrors.screenshot
                      ? 'border-rose-500 bg-rose-950/25 hover:bg-rose-950/35'
                      : 'border-rose-500/45 bg-rose-950/10 hover:bg-rose-950/20'
                  }`}
                >
                  {screenshotPreview && screenshotFile ? (
                    <div className="w-full flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={screenshotPreview}
                          alt="Payment screenshot preview"
                          className="w-12 h-12 rounded-lg object-cover border border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">
                            {screenshotFile.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 tabular-nums">
                            {formatFileSize(screenshotFile.size)} · Ready
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearScreenshot}
                        className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-rose-400 flex items-center justify-center gap-1 text-xs font-medium shrink-0 cursor-pointer"
                        title="Remove screenshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3.5">
                      <div className="w-9 h-9 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-zinc-100">
                          Upload Payment Screenshot
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          PNG, JPG or JPEG (Max 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {fieldErrors.screenshot && (
                  <p className="px-1 text-[11px] text-rose-400 font-medium">
                    {fieldErrors.screenshot}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Bottom CTA Row */}
          {isFreeCourse ? (
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-zinc-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 whitespace-nowrap active:scale-[0.98]"
              >
                <span>{isSubmitting ? 'Enrolling...' : 'Enroll'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-4">
              <a
                href={buildWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsappClick}
                className="min-h-[48px] rounded-xl border border-emerald-500/60 bg-emerald-950/15 hover:bg-emerald-950/35 text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 transition whitespace-nowrap active:scale-[0.98]"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </a>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[48px] rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-red-600/20 whitespace-nowrap active:scale-[0.98]"
              >
                <span>{isSubmitting ? 'Sending...' : 'Submit'}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
