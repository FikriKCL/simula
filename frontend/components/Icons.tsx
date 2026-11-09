type CrossProps = {
  size?: number;
  color?: string;
  dot?: string;
};

/** Salib medis berujung membulat dengan titik di tengah. */
export function Cross({ size = 48, color = "#e53935", dot = "#fff" }: CrossProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="17" y="3" width="14" height="42" rx="7" fill={color} />
      <rect x="3" y="17" width="42" height="14" rx="7" fill={color} />
      <circle cx="24" cy="24" r="4.5" fill={dot} />
    </svg>
  );
}

export function LockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" />
      <path
        d="M8 10V7.5a4 4 0 0 1 8 0V10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.7 4.5c2 0 3.7 1.1 5.3 3 1.6-1.9 3.3-3 5.3-3 3.7 0 5.9 3.7 4.3 7.3C19.500 16.400 12 21 12 21z"
        fill="#e53935"
      />
    </svg>
  );
}

export function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 3L3 10.5l6.5 2.5L12 20z" fill="currentColor" />
      <path d="M21 3L9.500 13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BooksIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="30" width="34" height="8" rx="2" stroke="currentColor" strokeWidth="2.6" />
      <rect x="9" y="21" width="30" height="8" rx="2" stroke="currentColor" strokeWidth="2.6" />
      <path d="M12 13l26 4-1 3H12z" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M13 34h18M16 25h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ProfileIcon({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="19" r="7" fill="currentColor" />
      <path d="M9 38c3-7 9-9 15-9s12 2 15 9c-4 4-9 6-15 6S13 42 9 38z" fill="currentColor" />
    </svg>
  );
}

export function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="#ffb300" />
      <g stroke="#ffb300" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100" />
      </g>
    </svg>
  );
}

export function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500z" fill="currentColor" />
    </svg>
  );
}
