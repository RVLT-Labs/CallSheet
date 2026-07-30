import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Callsheet",
  description: "Scheduling for student and indie film crews.",
};

// viewportFit: "cover" lets the app draw under the iOS Safari toolbar area so
// safe-area-inset-bottom resolves to a real value instead of 0 — otherwise
// the bottom tab bar (nav.tsx BottomTabBar) sits behind the toolbar on iPhone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col bg-cream text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
