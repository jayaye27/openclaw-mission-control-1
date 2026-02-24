import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { SWRProvider } from "@/lib/swr-config";

// Force dynamic rendering to avoid useSearchParams issues during static generation
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: '%s | Alfo Claw Command Center',
    default: 'Alfo Claw Command Center',
  },
  description: 'Secure command center for managing OpenClaw agents',
  manifest: "/manifest.json",
  applicationName: "Alfo Claw Command Center",
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "Alfo Claw Command Center",
    title: "Alfo Claw Command Center",
    description: "Secure command center for managing OpenClaw agents",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alfo Claw Command Center",
    description: "Secure command center for managing OpenClaw agents",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alfo Claw",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#661a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        <ThemeProvider>
          <SWRProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
