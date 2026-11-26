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

export function SimulaLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center select-none ${
        compact ? "gap-1.5" : "gap-2.5"
      } ${className}`}
    >
      <Cross size={30}/>

      {/* Teks simula */}
      <span
        className={`font-black tracking-tight text-red-strong leading-none ${
          compact ? "text-[24px]" : "text-[27px]"
        }`}
      >
        simula
      </span>
    </div>
  );
}

export function IndonesiaFlagIcon() {
  return (
    <div
      className="w-[24px] h-[16px] rounded-[4px] overflow-hidden border border-edge-2 shrink-0 flex flex-col"
      title="Bahasa Indonesia"
    >
      <div className="h-1/2 w-full bg-red-strong" />
      <div className="h-1/2 w-full bg-white" />
    </div>
  );
}

export function SunIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2V4M12 20V22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M2 12H4M20 12H22M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MoonIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export function DashboardNavIcon({ active }: { active?: boolean }) {
  return (
    <svg aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Kaki & Penyangga Monitor */}
      <path
        d="M13.5 23.5H18.5L19.5 27.5H12.5L13.5 23.5Z"
        fill="#A199AA"
        stroke="#1E293B"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect
        x="10.5"
        y="27"
        width="11"
        height="1.8"
        rx="0.9"
        fill="#8E8598"
        stroke="#1E293B"
        strokeWidth="1.2"
      />

      {/* Bezel Luar Monitor */}
      <rect
        x="3.5"
        y="5"
        width="25"
        height="18.5"
        rx="2.2"
        fill="#B8B0C0"
        stroke="#1E293B"
        strokeWidth="1.5"
      />
      {/* Layar Dalam */}
      <rect
        x="5"
        y="6.5"
        width="22"
        height="14.5"
        rx="1"
        fill={active ? "#FFFFFF" : "#F8FAFC"}
        stroke="#1E293B"
        strokeWidth="1"
      />

      {/* Pie Chart Kiri Atas */}
      <circle
        cx="10.2"
        cy="11.2"
        r="3.2"
        fill="#38A3F5"
        stroke="#1E293B"
        strokeWidth="1"
      />
      <path
        d="M10.2 11.2V8A3.2 3.2 0 0 1 13.4 11.2H10.2Z"
        fill="#EF4444"
        stroke="#1E293B"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Garis Data Kiri Bawah */}
      <line
        x1="7"
        y1="16.5"
        x2="13.5"
        y2="16.5"
        stroke="#475569"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="18.6"
        x2="12"
        y2="18.6"
        stroke="#475569"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Panah Tren Naik */}
      <path
        d="M16.5 12.2L22.5 8.5M22.5 8.5H20M22.5 8.5V10.8"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4 Batang Grafik Warna (Merah, Kuning, Hijau, Biru) */}
      <rect
        x="16.2"
        y="15.5"
        width="2"
        height="4"
        fill="#EF4444"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
      <rect
        x="18.6"
        y="14.2"
        width="2"
        height="5.3"
        fill="#FACC15"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
      <rect
        x="21"
        y="12.8"
        width="2"
        height="6.7"
        fill="#22C55E"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
      <rect
        x="23.4"
        y="11.2"
        width="2"
        height="8.3"
        fill="#3B82F6"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
    </svg>
  );
}

export function PendaftaranNavIcon({ active }: { active?: boolean }) {
  return (
    <svg aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Lembar Belakang (Miring ke kiri) */}
      <g transform="rotate(-13 13 16)">
        <rect
          x="5.5"
          y="5.5"
          width="16"
          height="21"
          rx="1.8"
          fill="#F1F5F9"
          stroke="#1E293B"
          strokeWidth="1.4"
        />
      </g>

      {/* Lembar Utama Depan */}
      <rect
        x="8.5"
        y="4.5"
        width="16.5"
        height="21.5"
        rx="1.8"
        fill={active ? "#FFFFFF" : "#FFFFFF"}
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* Lingkaran Avatar Profil */}
      <circle
        cx="13.5"
        cy="9.8"
        r="2.8"
        fill="#F8FAFC"
        stroke="#1E293B"
        strokeWidth="1.3"
      />
      <circle cx="13.5" cy="9" r="1" fill="#1E293B" />
      <path
        d="M11.7 11.7C12.1 10.9 14.9 10.9 15.3 11.7"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinecap="round"
      />

      {/* Garis Teks Kanan Atas */}
      <line
        x1="18"
        y1="8.3"
        x2="22.5"
        y2="8.3"
        stroke="#1E293B"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="10.8"
        x2="22.5"
        y2="10.8"
        stroke="#1E293B"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Kotak Centang 1 */}
      <rect
        x="11"
        y="15"
        width="3.2"
        height="3.2"
        rx="0.6"
        stroke="#1E293B"
        strokeWidth="1.3"
      />
      <path
        d="M11.7 16.6L12.4 17.3L13.7 15.8"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="16.6"
        x2="20"
        y2="16.6"
        stroke="#1E293B"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Kotak Centang 2 */}
      <rect
        x="11"
        y="20"
        width="3.2"
        height="3.2"
        rx="0.6"
        stroke="#1E293B"
        strokeWidth="1.3"
      />
      <path
        d="M11.7 21.6L12.4 22.3L13.7 20.8"
        stroke="#1E293B"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="21.6"
        x2="18.8"
        y2="21.6"
        stroke="#1E293B"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      {/* Pensil Miring di Sudut Kanan Bawah */}
      <g transform="rotate(32 24.5 17)">
        <rect
          x="23"
          y="9.5"
          width="3.2"
          height="13.5"
          rx="0.8"
          fill="#FFFFFF"
          stroke="#1E293B"
          strokeWidth="1.4"
        />
        <line
          x1="23"
          y1="12"
          x2="26.2"
          y2="12"
          stroke="#1E293B"
          strokeWidth="1.2"
        />
        <path
          d="M23 23L24.6 25.8L26.2 23H23Z"
          fill="#1E293B"
          stroke="#1E293B"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function MateriNavIcon({ active }: { active?: boolean }) {
  return (
    <svg aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Buku Paling Bawah */}
      <path
        d="M6.5 21.5L17.5 25L26.5 21"
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 18.5C5.2 18.5 5.2 21.5 6.5 21.5"
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Buku Tengah */}
      <path
        d="M6.5 18.2L17.5 21.7L26.5 17.7"
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 15.2C5.2 15.2 5.2 18.2 6.5 18.2"
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      {/* Buku Paling Atas */}
      <path
        d="M16.5 7.5L6.5 11.8L17.5 15.2L26.5 11.2L16.5 7.5Z"
        fill={active ? "#FFFFFF" : "#F8FAFC"}
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 11.8C5.2 11.8 5.2 14.8 6.5 14.8L17.5 18.2L26.5 14.2"
        stroke="#1E293B"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Garis Judul di Sampul Atas */}
      <line
        x1="15.2"
        y1="10.6"
        x2="19.5"
        y2="12"
        stroke="#1E293B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Pita Pembatas Buku Hitam pada Buku Tengah */}
      <path
        d="M9.2 15.8V20.5L10.4 19.6L11.6 20.5V16.5"
        fill="#1E293B"
        stroke="#1E293B"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SoalNavIcon({ active }: { active?: boolean }) {
  return (
    <svg aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Papan Clipboard */}
      <rect
        x="7"
        y="6.5"
        width="18"
        height="21"
        rx="2.5"
        fill={active ? "#FFFFFF" : "#F8FAFC"}
        stroke="#27364F"
        strokeWidth="1.7"
      />

      {/* Penjepit Atas Clipboard */}
      <path
        d="M12.5 6.5V5.5C12.5 4.4 13.4 3.5 14.5 3.5H17.5C18.6 3.5 19.5 4.4 19.5 5.5V6.5H12.5Z"
        fill="#27364F"
        stroke="#27364F"
        strokeWidth="1.4"
      />
      <rect x="11" y="5.5" width="10" height="2.4" rx="1.2" fill="#27364F" />
      <circle cx="16" cy="4.8" r="0.8" fill="#FFFFFF" />

      {/* Baris 1: Centang + Garis */}
      <path
        d="M10.2 12.2L11.3 13.3L13.3 11.1"
        stroke="#27364F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="15.2"
        y1="12.3"
        x2="21.8"
        y2="12.3"
        stroke="#27364F"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Baris 2: Centang + Garis */}
      <path
        d="M10.2 16.2L11.3 17.3L13.3 15.1"
        stroke="#27364F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="15.2"
        y1="16.3"
        x2="21.8"
        y2="16.3"
        stroke="#27364F"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Baris 3: Silang (X) + Garis */}
      <path
        d="M10.5 19.6L12.7 21.8M12.7 19.6L10.5 21.8"
        stroke="#27364F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15.2"
        y1="20.7"
        x2="21.8"
        y2="20.7"
        stroke="#27364F"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Baris 4: Silang (X) + Garis */}
      <path
        d="M10.5 23.4L12.7 25.6M12.7 23.4L10.5 25.6"
        stroke="#27364F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="15.2"
        y1="24.5"
        x2="21.8"
        y2="24.5"
        stroke="#27364F"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({
  className = "w-4 h-4 text-slate-400",
}: {
  className?: string;
}) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20L16.5 16.5" />
    </svg>
  );
}

export function ChevronDownIcon({
  className = "w-4 h-4 text-slate-600",
}: {
  className?: string;
}) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 9L12 15L18 9" />
    </svg>
  );
}

export function PencilIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function MaterialTypeBadgeIcon({
  type,
}: {
  type: "ARTICLE" | "PDF" | "VIDEO" | "KOMIK";
}) {
  if (type === "PDF" || type === "ARTICLE") {
    return (
      <div className="w-10 h-10 rounded-[12px] bg-sky-tint-2 flex items-center justify-center shrink-0 text-navy">
        <svg aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="3" width="12" height="18" rx="3.5" />
          <line x1="9.5" y1="10" x2="14.5" y2="10" />
          <line x1="9.5" y1="14" x2="14.5" y2="14" />
        </svg>
      </div>
    );
  }
  if (type === "VIDEO") {
    return (
      <div className="w-10 h-10 rounded-[12px] bg-red-tint flex items-center justify-center shrink-0 text-navy">
        <svg aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="4" />
          <polygon points="10.5 9.5 15 12 10.5 14.5 10.5 9.5" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-[12px] bg-warn-tint flex items-center justify-center shrink-0 text-navy">
      <svg aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 6.5C5 5.11929 6.11929 4 7.5 4H16.5C17.8807 4 19 5.11929 19 6.5V14.5C19 15.8807 17.8807 17 16.5 17H9.5L5.5 20V17C5.22386 17 5 16.7761 5 16.5V6.5Z" />
        <line x1="8.5" y1="9" x2="15.5" y2="9" />
        <line x1="8.5" y1="12.5" x2="12.5" y2="12.5" />
      </svg>
    </div>
  );
}

/** Segitiga peringatan (pengganti emoji ⚠). */
export function AlertIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3 2 20h20L12 3Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 10v4.5M12 17.2v.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
