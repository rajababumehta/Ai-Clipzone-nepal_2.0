import React, { useId } from 'react';

export type VerificationBadgeVariant = 'student' | 'sub_admin' | 'main_admin';

interface VerifiedBadgeProps {
  variant: VerificationBadgeVariant;
  className?: string;
  title?: string;
}

// Authentic 12-scallop Facebook-style verified seal SVG path (centered in 24x24 viewBox)
const FACEBOOK_SEAL_PATH =
  'M21.40 12.00 ' +
  'Q23.01 14.95 20.14 16.70 ' +
  'Q20.06 20.06 16.70 20.14 ' +
  'Q14.95 23.01 12.00 21.40 ' +
  'Q9.05 23.01 7.30 20.14 ' +
  'Q3.94 20.06 3.86 16.70 ' +
  'Q0.99 14.95 2.60 12.00 ' +
  'Q0.99 9.05 3.86 7.30 ' +
  'Q3.94 3.94 7.30 3.86 ' +
  'Q9.05 0.99 12.00 2.60 ' +
  'Q14.95 0.99 16.70 3.86 ' +
  'Q20.06 3.94 20.14 7.30 ' +
  'Q23.01 9.05 21.40 12.00 Z';

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  variant,
  className = 'w-4 h-4',
  title
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `vb-grad-${variant}-${uid}`;
  const checkShadowId = `vb-chk-${variant}-${uid}`;

  const defaultTitle =
    variant === 'main_admin'
      ? 'AI Clipzone Official Verified Admin'
      : variant === 'sub_admin'
      ? 'Verified Course Sub-Admin'
      : 'Verified Student';

  if (variant === 'sub_admin') {
    return (
      <span
        className={`relative inline-flex items-center justify-center shrink-0 align-middle ${className}`}
        title={title || defaultTitle}
        aria-label={title || defaultTitle}
      >
        {/* Soft radiant gold light behind the red verification badge */}
        <span className="absolute -inset-0.5 rounded-full bg-amber-400/45 blur-[3.5px] pointer-events-none" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-full h-full drop-shadow-[0_0_5px_rgba(250,204,21,0.92)]"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="55%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
          </defs>
          <path
            d={FACEBOOK_SEAL_PATH}
            fill={`url(#${gradId})`}
            stroke="#FDE047"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M8.3 12.35L10.85 14.9L15.95 9.35"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (variant === 'main_admin') {
    return (
      <span
        className={`relative inline-flex items-center justify-center shrink-0 align-middle ${className}`}
        title={title || defaultTitle}
        aria-label={title || defaultTitle}
      >
        <span className="absolute -inset-0.5 rounded-full bg-amber-300/35 blur-[3px] pointer-events-none" />
        <svg
          viewBox="0 0 24 24"
          className="relative w-full h-full drop-shadow-[0_0_5px_rgba(250,204,21,0.75)]"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <filter id={checkShadowId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0.6" stdDeviation="0.5" floodColor="#78350F" floodOpacity="0.65" />
            </filter>
          </defs>
          <path
            d={FACEBOOK_SEAL_PATH}
            fill={`url(#${gradId})`}
            stroke="#FEF08A"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path
            d="M8.3 12.35L10.85 14.9L15.95 9.35"
            stroke="#FFFFFF"
            strokeWidth="2.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${checkShadowId})`}
          />
        </svg>
      </span>
    );
  }

  // Default: 'student' — Authentic Facebook Blue Tick Verification Badge
  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      title={title || defaultTitle}
      aria-label={title || defaultTitle}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full drop-shadow-[0_1px_2px_rgba(8,102,255,0.45)]"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1D9BF0" />
            <stop offset="50%" stopColor="#0866FF" />
            <stop offset="100%" stopColor="#0052CC" />
          </linearGradient>
        </defs>
        <path d={FACEBOOK_SEAL_PATH} fill={`url(#${gradId})`} />
        <path
          d="M8.3 12.35L10.85 14.9L15.95 9.35"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};
