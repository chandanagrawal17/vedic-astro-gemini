import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteTitle = "Personal Blueprint — Know Your Patterns. Own Your Life.";
const siteDescription =
  "Ancient pattern intelligence meets modern self-reflection. Pinpoint your hard reset window, 3 life eras, blind spots, and career & relationship alignment in 45 seconds.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  title: siteTitle,
  description: siteDescription,
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Blueprint",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: "Personal Blueprint",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: siteTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0D0907] text-[#FDF6EE] antialiased selection:bg-[#FF6B2B]/30 selection:text-[#FDF6EE]">
        {children}
      </body>
    </html>
  );
}
