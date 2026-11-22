/** Maskot Dokter Piko (ilustrasi SVG orisinal). */
export function PikoMascot({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 200" aria-label="Dokter Piko">
      <ellipse cx="80" cy="192" rx="46" ry="5" fill="rgba(0,0,0,0.12)" />
      {/* kaki */}
      <rect x="60" y="164" width="16" height="22" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <rect x="84" y="164" width="16" height="22" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <rect x="58" y="180" width="20" height="9" rx="4" fill="#2b2b3a" />
      <rect x="82" y="180" width="20" height="9" rx="4" fill="#2b2b3a" />
      {/* rok */}
      <path d="M46 150h68l10 18H36z" fill="#e53935" stroke="#2b2b3a" strokeWidth="4" strokeLinejoin="round" />
      {/* badan */}
      <rect x="46" y="104" width="68" height="52" rx="14" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <path d="M62 104l18 22 18-22z" fill="#42a5f5" stroke="#2b2b3a" strokeWidth="3.500" strokeLinejoin="round" />
      <g transform="translate(80 140)">
        <rect x="-4.500" y="-11" width="9" height="22" rx="4" fill="#e53935" />
        <rect x="-11" y="-4.500" width="22" height="9" rx="4" fill="#e53935" />
      </g>
      {/* lengan */}
      <rect x="28" y="108" width="20" height="36" rx="10" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <rect x="112" y="108" width="20" height="36" rx="10" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <circle cx="38" cy="148" r="8" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="3.500" />
      <circle cx="122" cy="148" r="8" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="3.500" />
      {/* tas P3K */}
      <rect x="116" y="146" width="30" height="24" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="3.500" />
      <rect x="127" y="152" width="8" height="12" rx="2" fill="#e53935" />
      <rect x="123" y="156" width="16" height="4" rx="2" fill="#e53935" />
      {/* rambut belakang */}
      <ellipse cx="80" cy="64" rx="52" ry="50" fill="#3a2a26" stroke="#2b2b3a" strokeWidth="4" />
      {/* wajah */}
      <ellipse cx="80" cy="72" rx="42" ry="38" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="4" />
      {/* poni */}
      <path d="M40 62c10-14 26-20 40-20s30 6 40 20c-12-4-26-8-40-8S52 58 40 62z" fill="#3a2a26" />
      {/* topi */}
      <path d="M44 40c0-18 16-28 36-28s36 10 36 28z" fill="#fff" stroke="#2b2b3a" strokeWidth="4" strokeLinejoin="round" />
      <rect x="40" y="36" width="80" height="10" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
      <g transform="translate(80 24)">
        <rect x="-3.500" y="-9" width="7" height="18" rx="3" fill="#e53935" />
        <rect x="-9" y="-3.500" width="18" height="7" rx="3" fill="#e53935" />
      </g>
      {/* mata */}
      <ellipse cx="64" cy="76" rx="8" ry="9" fill="#2b2b3a" />
      <ellipse cx="96" cy="76" rx="8" ry="9" fill="#2b2b3a" />
      <circle cx="66.500" cy="72.500" r="3" fill="#fff" />
      <circle cx="98.500" cy="72.500" r="3" fill="#fff" />
      {/* pipi */}
      <ellipse cx="53" cy="88" rx="7" ry="5" fill="#ffb3b8" />
      <ellipse cx="107" cy="88" rx="7" ry="5" fill="#ffb3b8" />
      {/* senyum */}
      <path d="M72 91q8 8 16 0" fill="none" stroke="#2b2b3a" strokeWidth="3.500" strokeLinecap="round" />
    </svg>
  );
}
