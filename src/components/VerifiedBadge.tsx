import React, { useId } from 'react';

export type VerificationBadgeVariant = 'student' | 'sub_admin' | 'main_admin';

interface VerifiedBadgeProps {
  variant: VerificationBadgeVariant;
  className?: string;
  title?: string;
}

// Official Twitter/X 8-scallop verified seal geometry (22x22 viewBox) - flat & crisp with zero shadows
const TWITTER_SEAL_PATH =
  'M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z';

// Exact Twitter/X centered checkmark path (22x22 viewBox)
const TWITTER_CHECK_PATH =
  'M9.64 14.95l-3.28-3.28 1.24-1.24 2.04 2.04 5.26-5.26 1.24 1.24-6.5 6.5z';

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  variant,
  className = 'w-4 h-4',
  title
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `xb-grad-${variant}-${uid}`;

  const defaultTitle =
    variant === 'main_admin'
      ? 'HamroLms Official Verified Admin'
      : variant === 'sub_admin'
      ? 'Verified Sub-Admin'
      : 'Verified User';

  // 1. Main Admin (HamroLms): Elon Musk / Twitter-X Official Gold Verified Badge (flat, no shadow)
  if (variant === 'main_admin') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
        title={title || defaultTitle}
        aria-label={title || defaultTitle}
      >
        <svg viewBox="0 0 22 22" className="w-full h-full" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="2" y1="2" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F8E388" />
              <stop offset="48%" stopColor="#E5A910" />
              <stop offset="100%" stopColor="#B87D00" />
            </linearGradient>
          </defs>
          <path d={TWITTER_SEAL_PATH} fill={`url(#${gradId})`} />
          <path d={TWITTER_CHECK_PATH} fill="#0F1419" />
        </svg>
      </span>
    );
  }

  // 2. Sub-Admin: Clean Flat Solid Red Verified Tick (no stroke, no shadow)
  if (variant === 'sub_admin') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
        title={title || defaultTitle}
        aria-label={title || defaultTitle}
      >
        <svg viewBox="0 0 22 22" className="w-full h-full" fill="none" aria-hidden="true">
          <path d={TWITTER_SEAL_PATH} fill="#EF4444" />
          <path d={TWITTER_CHECK_PATH} fill="#FFFFFF" />
        </svg>
      </span>
    );
  }

  // 3. Normal User / Student: Official Twitter/X Blue Tick (flat, no shadow)
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      title={title || defaultTitle}
      aria-label={title || defaultTitle}
    >
      <svg viewBox="0 0 22 22" className="w-full h-full" fill="none" aria-hidden="true">
        <path d={TWITTER_SEAL_PATH} fill="#1D9BF0" />
        <path d={TWITTER_CHECK_PATH} fill="#FFFFFF" />
      </svg>
    </span>
  );
};
