import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import InlineScript from "@/components/InlineScript";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SIMULA - Asisten Edukasi PMR & PMI",
  description: "Platform Asisten Belajar RAG Kepalangmerahan Palang Merah Remaja (PMR Mula) & PMI",
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
      // The theme script below sets the `dark` class before hydration
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="h-full w-full bg-white font-sans text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
