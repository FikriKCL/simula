const ink = "#2b2b3a";

/* ---------- Ikon UI ---------- */
export function SearchIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.6" />
      <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function GridIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="9" height="9" rx="3" fill="#e53935" />
      <rect x="13" y="2" width="9" height="9" rx="3" fill="#ffb300" />
      <rect x="2" y="13" width="9" height="9" rx="3" fill="#42a5f5" />
      <rect x="13" y="13" width="9" height="9" rx="3" fill="#1e88e5" />
    </svg>
  );
}

export function PdfIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 2.500h8l5 5V20a1.500 1.500 0 0 1-1.500 1.500h-11A1.500 1.500 0 0 1 5 20V4A1.500 1.500 0 0 1 6 2.500z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 2.500V8h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="8.500" y="13" width="7" height="5" rx="1.500" fill="#e53935" />
    </svg>
  );
}

export function VideoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.500" y="4.500" width="19" height="15" rx="4" stroke="currentColor" strokeWidth="2.200" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

export function ComicIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4.500h16a1.500 1.500 0 0 1 1.500 1.500v9a1.500 1.500 0 0 1-1.500 1.500h-9L6.500 21v-4.500H4A1.500 1.500 0 0 1 2.500 15V6A1.500 1.500 0 0 1 4 4.500z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="10.500" r="1.200" fill="currentColor" />
      <circle cx="12" cy="10.500" r="1.200" fill="currentColor" />
      <circle cx="16" cy="10.500" r="1.200" fill="currentColor" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v15M6 13l6 6 6-6"
        stroke="currentColor"
        strokeWidth="3.200"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4.500v15l12-7.500z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Ilustrasi thumbnail ---------- */
export function PlasterArt() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
      <g transform="rotate(-35 32 32)">
        <rect x="5" y="21" width="54" height="22" rx="11" fill="#f6c9a0" stroke={ink} strokeWidth="3" />
        <rect x="22" y="21" width="20" height="22" fill="#fbe3cc" stroke={ink} strokeWidth="3" />
        <circle cx="13" cy="32" r="1.500" fill={ink} />
        <circle cx="51" cy="32" r="1.500" fill={ink} />
        <circle cx="32" cy="27" r="1.200" fill="#e9b88f" />
        <circle cx="32" cy="37" r="1.200" fill="#e9b88f" />
      </g>
    </svg>
  );
}

export function HeartArt() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 54S8 40 8 24c0-8 6-13 12-13 5 0 9 3 12 8 3-5 7-8 12-8 6 0 12 5 12 13 0 16-24 30-24 30z"
        fill="#ffd9de"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M16 22c1-4 4-6 7-6" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function KitArt() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M23 18v-4a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v4" fill="none" stroke={ink} strokeWidth="3" />
      <rect x="6" y="18" width="52" height="38" rx="9" fill="#fff" stroke={ink} strokeWidth="3" />
      <rect x="28" y="26" width="8" height="22" rx="3" fill="#e53935" />
      <rect x="21" y="33" width="22" height="8" rx="3" fill="#e53935" />
      <path d="M6 30h6M52 30h6" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function RollArt() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="32" cy="38" rx="24" ry="12" fill="#f3d4c0" stroke={ink} strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="24" ry="12" fill="#fff" stroke={ink} strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="14" ry="6.500" fill="#f4b3b8" stroke={ink} strokeWidth="3" />
      <ellipse cx="32" cy="32" rx="6" ry="2.500" fill="#fff" stroke={ink} strokeWidth="2.500" />
    </svg>
  );
}

export function HandArt() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M20 56V38c0-3 2-4 4-4h6l2-11c.5-3 5-3 5 1v9h11c4 0 5 4 4 7l-4 14c-1 3-3 4-6 4H20z"
        fill="#cfe8fb"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="22" r="5" fill="#fff" stroke={ink} strokeWidth="2.500" />
      <circle cx="28" cy="12" r="4" fill="#fff" stroke={ink} strokeWidth="2.500" />
      <circle cx="10" cy="34" r="3" fill="#fff" stroke={ink} strokeWidth="2.500" />
    </svg>
  );
}