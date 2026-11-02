import type { Metadata, Viewport } from "next";
import InlineScript from "@/components/InlineScript";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const body = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-body",
  display: "swap",
});

const display = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simula - Pembelajaran",
  description: "Belajar pertolongan pertama dengan cara yang menyenangkan",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Shrink the layout (not overlay it) when the mobile keyboard opens, so the input stays visible
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020618" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      data-theme="light"
      className={`${body.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}