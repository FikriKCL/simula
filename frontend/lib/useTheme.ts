import { useTheme as useSharedTheme } from "./theme";

export type Theme = "light" | "dark";

/**
 * Tema terang/gelap untuk komponen yang memakai bentuk [theme, setTheme].
 * Memakai store tema bersama (lib/theme.ts), jadi semua halaman dan admin selalu sama,
 * dan tema sudah dipasang sebelum halaman tampil (lihat app/layout.tsx).
 */
export function useTheme() {
  const { resolved, setTheme } = useSharedTheme();
  return [resolved as Theme, (value: Theme) => setTheme(value)] as const;
}
