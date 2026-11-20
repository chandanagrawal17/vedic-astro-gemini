import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Personal Blueprint — Know Your Patterns. Own Your Life.",
  description:
    "Ancient pattern intelligence meets modern self-reflection. Pinpoint your hard reset window, blind spots, and career & relationship alignment in 45 seconds.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0D0907",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jakarta.variable} dark`}
    >
      <body className="min-h-screen bg-[#0D0907] text-[#FDF6EE] antialiased selection:bg-[#FF6B2B]/30 selection:text-[#FDF6EE]">
        {children}
      </body>
    </html>
  );
}
