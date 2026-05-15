import type { Metadata } from "next";
import { Playfair_Display, Lora, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      className={`${playfair.variable} ${lora.variable} ${inter.variable} h-full antialiased`}
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
