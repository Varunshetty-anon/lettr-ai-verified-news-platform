import type { Metadata } from "next";
import { Newsreader, Work_Sans, Public_Sans } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

import { ThemeProvider } from "./components/ThemeProvider";
import { SessionProvider } from "./components/SessionProvider";
import { AppShell } from "./components/layout/AppShell";

export const metadata: Metadata = {
  title: "LETTR - AI Verified News",
  description: "A Serious News Platform built for trust, not entertainment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${newsreader.variable} ${workSans.variable} ${publicSans.variable} h-full antialiased`}
    >
      <body className="min-h-full font-body bg-surface text-on-surface">
        <SessionProvider>
          <ThemeProvider>
            <AppShell>
              {children}
            </AppShell>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
