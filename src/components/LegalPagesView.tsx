import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Trash2,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Smartphone,
} from 'lucide-react';
import { SiteSettingsConfig } from '../types';

export type LegalPageType = 'privacy-policy' | 'terms' | 'delete-account';

interface LegalPagesViewProps {
  page: LegalPageType;
  siteSettings: SiteSettingsConfig;
  userEmail?: string | null;
  userName?: string | null;
  onBack: () => void;
  onSwitchPage: (next: LegalPageType) => void;
  onClearLocalData: () => void;
}

export const LegalPagesView: React.FC<LegalPagesViewProps> = ({
  page,
  siteSettings,
  userEmail,
  userName,
  onBack,
  onSwitchPage,
  onClearLocalData,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const instituteName = siteSettings.instituteName || 'AI Clipzone';
  const supportEmail = siteSettings.supportEmail || 'ai.clipzone.edu@gmail.com';
  const supportPhone = siteSettings.supportPhone || '9763323268';
  const whatsappClean = supportPhone.replace(/[^0-9]/g, '').startsWith('977')
    ? supportPhone.replace(/[^0-9]/g, '')
    : `977${supportPhone.replace(/[^0-9]/g, '')}`;

  const deletionMailto = `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(
    `${instituteName} - Account & Data Deletion Request`
  )}&body=${encodeURIComponent(
    `Hello ${instituteName} Team,\n\nPlease delete my student account and associated records.\nName: ${
      userName || 'N/A'
    }\nEmail: ${userEmail || 'N/A'}\nPhone: \n\nThank you.`
  )}`;

  const handleConfirmClearLocal = () => {
    onClearLocalData();
    setConfirmClear(false);
    setClearedSuccess(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-1 sm:px-2 text-left space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Sub-page Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 border border-zinc-800/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => onSwitchPage('privacy-policy')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              page === 'privacy-policy'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Privacy Policy
          </button>
          <button
            type="button"
            onClick={() => onSwitchPage('terms')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              page === 'terms'
                ? 'bg-blue-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Terms of Use
          </button>
          <button
            type="button"
            onClick={() => onSwitchPage('delete-account')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
              page === 'delete-account'
                ? 'bg-rose-600 text-white shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Data Deletion
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {page === 'privacy-policy' && (
          <>
            <div className="flex items-start gap-3 border-b border-zinc-800 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Privacy Policy — {instituteName}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Effective Date: 2026 • Applies to Web &amp; Google Play Store App
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm text-zinc-300 leading-relaxed">
              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">1. Information We Collect</h2>
                <p>
                  When you enroll in courses, activate a course key, or contact course mentors on{' '}
                  <strong>{instituteName}</strong>, we collect only the information required to
                  deliver your classes and certificates:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>Full Name, Phone Number, and Email Address provided during enrollment or login.</li>
                  <li>Course enrollment status, activation keys, video progress, and certificate metadata.</li>
                  <li>Optional payment confirmation screenshots and support chat attachments you choose to send.</li>
                  <li>A randomized anonymous device identifier stored locally to prevent unauthorized multi-device key sharing.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">2. How We Use Your Data</h2>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>To unlock purchased or free courses, live classes, PDF notes, and digital certificates.</li>
                  <li>To connect enrolled students with their assigned course instructors in the Ask section.</li>
                  <li>To send important live-class announcements or course update notifications when you grant permission.</li>
                  <li>We never sell or rent student personal data to third-party advertisers.</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">3. Data Security &amp; Retention</h2>
                <p>
                  Account and course records are transmitted over HTTPS and stored using Google Firebase
                  services. Live class meeting links are protected via encrypted server-issued tokens. You
                  may request deletion of your data at any time from the{' '}
                  <button
                    type="button"
                    onClick={() => onSwitchPage('delete-account')}
                    className="text-blue-400 underline font-bold cursor-pointer"
                  >
                    Data Deletion page
                  </button>
                  .
                </p>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">4. Contact Us</h2>
                <p className="text-zinc-300">
                  For privacy questions or records requests, contact {instituteName} at{' '}
                  <a href={`mailto:${supportEmail}`} className="text-blue-400 underline font-semibold">
                    {supportEmail}
                  </a>{' '}
                  or call/WhatsApp{' '}
                  <span className="font-mono font-bold text-white">{supportPhone}</span>.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'terms' && (
          <>
            <div className="flex items-start gap-3 border-b border-zinc-800 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Terms &amp; Conditions — {instituteName}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Updated 2026 • Learning License &amp; Platform Guidelines
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm text-zinc-300 leading-relaxed">
              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">1. Course Access &amp; Single-Device License</h2>
                <p>
                  Each paid or free course activation key grants an individual, non-transferable learning
                  license for personal educational use inside {instituteName}. Sharing activation keys or
                  redistributing recorded lectures/PDFs is strictly prohibited and may result in key
                  deactivation.
                </p>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">2. Payments &amp; Refund Policy</h2>
                <p>
                  Paid course enrollments verified via eSewa, Bank QR, or authorized Sub-Admins receive
                  activation access upon payment verification. Consistent with our published FAQ policy,
                  eligible refund applications submitted within 48 hours of purchase qualify for 50% cash
                  return processed after 30 days of verification. Free courses require no payment.
                </p>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">3. Certificates &amp; Live Classes</h2>
                <p>
                  Verified digital certificates are issued upon completing eligible courses where
                  certificate generation is enabled by the administrator. Live sessions are subject to
                  scheduled class timings published inside the course classroom.
                </p>
              </section>

              <section className="space-y-1.5">
                <h2 className="text-base font-extrabold text-white">4. Support &amp; Dispute Resolution</h2>
                <p>
                  Please reach out via the Ask mentor chat inside the app or write to{' '}
                  <a href={`mailto:${supportEmail}`} className="text-blue-400 underline font-semibold">
                    {supportEmail}
                  </a>{' '}
                  for billing or technical support.
                </p>
              </section>
            </div>
          </>
        )}

        {page === 'delete-account' && (
          <>
            <div className="flex items-start gap-3 border-b border-zinc-800 pb-5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Account &amp; Data Deletion — {instituteName}
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Google Play Store Data Safety &amp; Student Privacy Control
                </p>
              </div>
            </div>

            <div className="space-y-5 text-sm text-zinc-300 leading-relaxed">
              <p>
                You can remove your cached profile, activation sessions, and downloaded browser/app storage
                immediately on this device, and you can submit an official request to permanently erase
                your server-side profile, support messages, and enrollment records.
              </p>

              {/* Step 1: Clear Local App Data */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Option A: Clear App &amp; Browser Data on This Device</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Signs you out on this device and removes locally saved name, profile avatar, active keys,
                  and cached course state.
                </p>

                {clearedSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Local device data cleared and signed out successfully.</span>
                  </div>
                ) : confirmClear ? (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Are you sure? You will need your activation key or login to re-enter paid courses.</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmClearLocal}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold cursor-pointer transition"
                      >
                        Confirm Clear Local Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClear(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-rose-600/20 border border-zinc-700 hover:border-rose-500/50 text-zinc-100 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Clear My Device Session &amp; Cached Data</span>
                  </button>
                )}
              </div>

              {/* Step 2: Request Full Server Account Deletion */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span>Option B: Request Full Server Account &amp; Record Deletion</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Our team deletes verified account deletion requests (profile, chat threads, enrollment
                  metadata) within 7 business days.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href={deletionMailto}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email Deletion Request ({supportEmail})</span>
                  </a>
                  <a
                    href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                      `Hello ${instituteName}, I would like to request permanent deletion of my student account and personal data.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
                  >
                    <Phone className="w-4 h-4" />
                    <span>WhatsApp Support ({supportPhone})</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
