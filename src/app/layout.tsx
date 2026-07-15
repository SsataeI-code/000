import type { Metadata, Viewport } from "next";
import { Archivo, Oswald, Spline_Sans } from "next/font/google";
import "./globals.css";
import { defaultCopy } from "@/lib/content/copy";

// House-style type system (CLAUDE.md §4). Loaded via next/font — self-hosted,
// no layout shift, no external request at runtime.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["800", "900"],
  variable: "--font-archivo",
  display: "swap",
});
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});
const splineSans = Spline_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-spline",
  display: "swap",
});

export const metadata: Metadata = {
  title: defaultCopy["brand.name"],
  description: defaultCopy["brand.tagline"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: defaultCopy["brand.name"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${oswald.variable} ${splineSans.variable}`}>
      <body className="min-h-dvh bg-surface-muted font-body text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
