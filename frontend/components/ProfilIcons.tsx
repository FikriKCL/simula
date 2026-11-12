const ink = "#2b2b3a";

export function StarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.500l2.900 6 6.600.800-4.900 4.500 1.300 6.500L12 17l-5.900 3.300 1.300-6.500L2.500 9.300l6.600-.8z"
        fill="#ffb300"
        stroke="#e09a00"
        strokeWidth="1.500"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BookCrossIcon({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 8c-3-2.500-7-3-11-2.500v17c4-.500 8 0 11 2.500 3-2.500 7-3 11-2.500v-17C23 5 19 5.500 16 8z"
        fill="#fff"
        stroke={ink}
        strokeWidth="2.200"
        strokeLinejoin="round"
      />
      <path d="M16 8v17" stroke={ink} strokeWidth="2.200" />
      <rect x="20.500" y="11" width="2.500" height="7" rx="1" fill="#e53935" />
      <rect x="18.300" y="13.200" width="6.900" height="2.500" rx="1" fill="#e53935" />
    </svg>
  );
}

export type BadgeKind =
  | "plester"
  | "termometer"
  | "hati"
  | "salib"
  | "perban"
  | "kotak"
  | "tangan"
  | "apel";

export function BadgeIcon({ kind, size = 34 }: { kind: BadgeKind; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", "aria-hidden": true } as const;

  switch (kind) {
    case "plester":
      return (
        <svg {...common}>
          <g transform="rotate(-40 16 16)">
            <rect x="2" y="10" width="28" height="12" rx="6" fill="#f6c9a0" stroke={ink} strokeWidth="2" />
            <rect x="11" y="10" width="10" height="12" fill="#fbe3cc" stroke={ink} strokeWidth="2" />
          </g>
        </svg>
      );
    case "termometer":
      return (
        <svg {...common}>
          <g transform="rotate(40 16 16)">
            <rect x="12.500" y="3" width="7" height="19" rx="3.500" fill="#fff" stroke={ink} strokeWidth="2" />
            <circle cx="16" cy="25" r="4.500" fill="#e53935" stroke={ink} strokeWidth="2" />
            <rect x="15" y="12" width="2" height="12" fill="#e53935" />
          </g>
        </svg>
      );
    case "hati":
      return (
        <svg {...common}>
          <path
            d="M16 28S4 20.500 4 12.500C4 8.500 7 6 10.200 6c2.300 0 4.200 1.300 5.800 3.700C17.600 7.300 19.500 6 21.800 6 25 6 28 8.500 28 12.500 28 20.500 16 28 16 28z"
            fill="#ffd9de"
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "salib":
      return (
        <svg {...common}>
          <circle cx="16" cy="16" r="13" fill="#e53935" stroke={ink} strokeWidth="2" />
          <rect x="13.500" y="8" width="5" height="16" rx="2" fill="#fff" />
          <rect x="8" y="13.500" width="16" height="5" rx="2" fill="#fff" />
        </svg>
      );
    case "perban":
      return (
        <svg {...common}>
          <ellipse cx="16" cy="19" rx="12" ry="6.500" fill="#f3d4c0" stroke={ink} strokeWidth="2" />
          <ellipse cx="16" cy="15" rx="12" ry="6.500" fill="#fff" stroke={ink} strokeWidth="2" />
          <ellipse cx="16" cy="15" rx="6" ry="3" fill="#f4b3b8" stroke={ink} strokeWidth="2" />
        </svg>
      );
    case "kotak":
      return (
        <svg {...common}>
          <path d="M12 9V7.500A2.500 2.500 0 0 1 14.500 5h3A2.500 2.500 0 0 1 20 7.500V9" fill="none" stroke={ink} strokeWidth="2" />
          <rect x="3.500" y="9" width="25" height="18" rx="4.500" fill="#fff" stroke={ink} strokeWidth="2" />
          <rect x="14.500" y="13" width="3" height="10" rx="1.200" fill="#e53935" />
          <rect x="11" y="16.500" width="10" height="3" rx="1.200" fill="#e53935" />
        </svg>
      );
    case "tangan":
      return (
        <svg {...common}>
          <path
            d="M16 28c-5 0-8-3-8-7.500 0-4 5-9 8-14 3 5 8 10 8 14 0 4.500-3 7.500-8 7.500z"
            fill="#cfe8fb"
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M12 21c0 2 1.500 3.500 3.500 3.500" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
    case "apel":
      return (
        <svg {...common}>
          <path
            d="M16 9c-3-2-10-1-10 7 0 6 4 11 7 11 1.500 0 2-.700 3-.700s1.500.700 3 .700c3 0 7-5 7-11 0-8-7-9-10-7z"
            fill="#f2594f"
            stroke={ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M16 9c0-3 1-5 3-6" stroke={ink} strokeWidth="2" strokeLinecap="round" fill="none" />
        </svg>
      );
  }
}