export type PikoMood = "idle" | "thinking" | "happy";

/**
 * Maskot Dokter Piko (ilustrasi SVG orisinal).
 * `animated` menyalakan gerak dasar (melayang, berkedip); `mood` menambah reaksi:
 * "thinking" = titik berpikir, "happy" = melambai. Gerak dimatikan bila pengguna memilih
 * "kurangi gerak" (lihat .piko-* di globals.css).
 */
export function PikoMascot({
  className = "",
  animated = false,
  mood = "idle",
}: {
  className?: string;
  animated?: boolean;
  mood?: PikoMood;
}) {
  const motion = animated ? `piko-animated piko-${mood}` : "";
  return (
    <svg className={`${className} ${motion}`} viewBox="0 0 160 200" aria-label="Dokter Piko">
      <ellipse className="piko-shadow" cx="80" cy="192" rx="46" ry="5" fill="rgba(0,0,0,0.12)" />
      <g className="piko-figure">
        {/* kaki */}
        <rect x="62.5" y="164" width="14.5" height="22" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
        <rect x="83" y="164" width="14.5" height="22" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
        <rect x="60.5" y="180" width="18.5" height="9" rx="4" fill="#2b2b3a" />
        <rect x="81" y="180" width="18.5" height="9" rx="4" fill="#2b2b3a" />

        {/* rok (bagian bawah melengkung & atasnya ditimpa baju yang dikeluarkan) */}
        <path
          d="M 53 148 Q 80 151.5 107 148 L 115 163.5 C 116 167, 113.5 170, 109.5 171 Q 80 175.5 50.5 171 C 46.5 170, 44 167, 45 163.5 Z"
          fill="#e53935"
          stroke="#2b2b3a"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* badan / baju (dikeluarkan: bagian bawah memanjang & melengkung lembut di atas rok) */}
        <path
          d="M 55 115 C 60 109.5, 69 108.5, 80 108.5 C 91 108.5, 100 109.5, 105 115 C 112.5 123.5, 113 141, 111.5 154 C 111 156.5, 108.5 157.5, 105 157 Q 80 160.5 55 157 C 51.5 157.5, 49 156.5, 48.5 154 C 47 141, 47.5 123.5, 55 115 Z"
          fill="#fff"
          stroke="#2b2b3a"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M68 109.5l12 16.5 12-16.5z" fill="#42a5f5" stroke="#2b2b3a" strokeWidth="3.5" strokeLinejoin="round" />
        <g transform="translate(80 140)">
          <rect x="-4.2" y="-10" width="8.4" height="20" rx="3.5" fill="#e53935" />
          <rect x="-10" y="-4.2" width="20" height="8.4" rx="3.5" fill="#e53935" />
        </g>

        {/* lengan kiri (keluar sedikit dari sisi badan, bahu tetap turun & sejajar kepala) */}
        <g className="piko-arm-left">
          <rect x="40.5" y="120" width="17.5" height="31" rx="8.75" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />
          <circle cx="49.25" cy="154" r="7.5" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="3.5" />
        </g>

        {/* lengan kanan (keluar sedikit dari sisi badan, bahu tetap turun & sejajar kepala) */}
        <rect x="102" y="120" width="17.5" height="31" rx="8.75" fill="#fff" stroke="#2b2b3a" strokeWidth="4" />

        {/* tas P3K (gagang pas digenggam tangan kanan) */}
        <g transform="translate(107 154)">
          {/* gagang kotak P3K tepat di bawah telapak tangan */}
          <path d="M 0 0 C 0 -5, 10 -5, 10 0" fill="none" stroke="#2b2b3a" strokeWidth="3.5" strokeLinecap="round" />
          {/* badan kotak P3K */}
          <rect x="-7" y="0" width="27" height="22" rx="5" fill="#fff" stroke="#2b2b3a" strokeWidth="3.5" />
          {/* palang merah proporsional */}
          <rect x="4" y="5.5" width="5" height="11" rx="1.5" fill="#e53935" />
          <rect x="1" y="8.5" width="11" height="5" rx="1.5" fill="#e53935" />
        </g>

        {/* telapak tangan kanan di atas gagang kotak P3K */}
        <circle cx="110.75" cy="154" r="7.5" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="3.5" />

        {/* rambut belakang (model bob sebahu melengkung ke dalam) */}
        <path
          d="M 41.5 44 L 35.5 96 C 34.5 109, 43.5 113, 56.5 112 L 103.5 112 C 116.5 113, 125.5 109, 124.5 96 L 118.5 44 Z"
          fill="#432f23"
          stroke="#2b2b3a"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* telinga kiri & kanan */}
        <circle cx="39" cy="76" r="7" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="4" />
        <circle cx="121" cy="76" r="7" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="4" />

        {/* wajah (lonjong tipis) */}
        <ellipse cx="80" cy="74.5" rx="38.5" ry="39.5" fill="#ffe0c7" stroke="#2b2b3a" strokeWidth="4" />

        {/* rambut samping (sideburns) & poni gelombang */}
        <path
          d="M 41.5 44 L 118.5 44 L 121.5 82 L 111.5 91 L 111.5 58 Q 103.5 63 96.5 57 Q 88 64 80 57 Q 72 64 63.5 57 Q 56.5 63 48.5 58 L 48.5 91 L 38.5 82 Z"
          fill="#432f23"
          stroke="#2b2b3a"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* topi */}
        <path d="M44 40c0-18 16-28 36-28s36 10 36 28z" fill="#fff" stroke="#2b2b3a" strokeWidth="4" strokeLinejoin="round" />
        {/* strip topi merah muda lembut */}
        <rect x="40" y="36" width="80" height="9" rx="4.5" fill="#fce4ec" stroke="#2b2b3a" strokeWidth="4" />
        <g className="piko-cross">
          <g transform="translate(80 24)">
            <rect x="-3.5" y="-9" width="7" height="18" rx="3" fill="#e53935" />
            <rect x="-9" y="-3.5" width="18" height="7" rx="3" fill="#e53935" />
          </g>
        </g>

        {/* alis */}
        <path d="M57 64q7-2.5 13.5 0" fill="none" stroke="#432f23" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M89.5 64q7-2.5 13.5 0" fill="none" stroke="#432f23" strokeWidth="3.2" strokeLinecap="round" />

        {/* mata (berkedip, lebih kecil & kelonjongan diperhalus) */}
        <g className="piko-eyes">
          <ellipse cx="64" cy="75" rx="5.5" ry="6.8" fill="#2b2b3a" />
          <ellipse cx="96" cy="75" rx="5.5" ry="6.8" fill="#2b2b3a" />
          <circle cx="65.8" cy="72.5" r="2.1" fill="#fff" />
          <circle cx="97.8" cy="72.5" r="2.1" fill="#fff" />
        </g>

        {/* hidung mungil */}
        <path d="M78 82q2 2.5 4 0" fill="none" stroke="#2b2b3a" strokeWidth="2.8" strokeLinecap="round" />

        {/* pipi */}
        <ellipse cx="52.5" cy="87.5" rx="6.8" ry="5.5" fill="#ffb3b8" />
        <ellipse cx="107.5" cy="87.5" rx="6.8" ry="5.5" fill="#ffb3b8" />

        {/* senyum */}
        <path d="M71 91q9 8.2 18 0" fill="none" stroke="#2b2b3a" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      {/* titik berpikir (hanya tampil saat mood "thinking") */}
      {animated && (
        <g className="piko-think-dots" fill="#42a5f5">
          <circle cx="132" cy="30" r="4" />
          <circle cx="142" cy="20" r="5" />
          <circle cx="153" cy="8" r="6" />
        </g>
      )}
    </svg>
  );
}