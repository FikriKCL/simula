import React from "react";

export function SimulaLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Ikon Palang Merah dengan ujung membulat */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <rect x="11.5" y="3" width="9" height="26" rx="4.5" fill="#E1252B" />
        <rect x="3" y="11.5" width="26" height="9" rx="4.5" fill="#E1252B" />
      </svg>
      <span className="text-[24px] font-black tracking-tight text-[#E1252B] leading-none">
        simula
      </span>
    </div>
  );
}

export function IndonesiaFlagIcon() {
  return (
    <div
      className="w-6 h-4 rounded-[3px] overflow-hidden border border-slate-200 shadow-2xs shrink-0 flex flex-col"
      title="Bahasa Indonesia"
    >
      <div className="h-1/2 w-full bg-[#E1252B]" />
      <div className="h-1/2 w-full bg-white" />
    </div>
  );
}

export function SunIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
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
    <svg
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
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
        fill={active ? "#FEE2E2" : "#F1F5F9"}
        stroke="#1E293B"
        strokeWidth="1.6"
      />
      <path
        d="M8 20H16M12 17V20"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <rect x="6.5" y="10" width="2.2" height="4" rx="0.5" fill="#38A3F5" />
      <rect x="10.2" y="8" width="2.2" height="6" rx="0.5" fill="#22C55E" />
      <rect x="13.9" y="9" width="2.2" height="5" rx="0.5" fill="#F59E0B" />
    </svg>
  );
}

export function PendaftaranNavIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="3"
        width="14"
        height="18"
        rx="2"
        fill={active ? "#FEE2E2" : "#F8FAFC"}
        stroke="#1E293B"
        strokeWidth="1.6"
      />
      <circle cx="9" cy="8" r="1.8" fill="#F59E0B" />
      <path
        d="M7 13H15M7 16H12"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M15.5 14.5L19.5 10.5L21.5 12.5L17.5 16.5L14.5 17.5L15.5 14.5Z"
        fill="#38A3F5"
        stroke="#1E293B"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MateriNavIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 16.5L12 20L20 16.5"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 12.5L12 16L20 12.5"
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4L4 7.5L12 11L20 7.5L12 4Z"
        fill={active ? "#FCA5A5" : "#E2E8F0"}
        stroke="#1E293B"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SoalNavIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="17"
        rx="2"
        fill={active ? "#FEE2E2" : "#F8FAFC"}
        stroke="#1E293B"
        strokeWidth="1.6"
      />
      <path
        d="M9 4V3C9 2.44772 9.44772 2 10 2H14C14.5523 2 15 2.44772 15 3V4"
        stroke="#1E293B"
        strokeWidth="1.6"
      />
      <path
        d="M8.5 9.5L9.8 10.8L12 8.5M8.5 14L9.8 15.3L12 13"
        stroke="#38A3F5"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 9.5H16M13.5 14H16"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchIcon({ className = "w-4 h-4 text-slate-400" }: { className?: string }) {
  return (
    <svg
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

export function ChevronDownIcon({ className = "w-4 h-4 text-slate-600" }: { className?: string }) {
  return (
    <svg
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
    <svg
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
    <svg
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
    <svg
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

export function CheckIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function MaterialTypeBadgeIcon({ type }: { type: "PDF" | "VIDEO" | "KOMIK" }) {
  if (type === "PDF") {
    return (
      <div className="w-10 h-10 rounded-[12px] bg-[#EBF5FF] flex items-center justify-center shrink-0 text-[#1E293B]">
        <svg
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
      <div className="w-10 h-10 rounded-[12px] bg-[#FEECEB] flex items-center justify-center shrink-0 text-[#1E293B]">
        <svg
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
    <div className="w-10 h-10 rounded-[12px] bg-[#FEF9C3] flex items-center justify-center shrink-0 text-[#1E293B]">
      <svg
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