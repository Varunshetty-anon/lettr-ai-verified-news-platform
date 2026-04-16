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

import { LeftSidebar } from "./components/layout/LeftSidebar";
import { RightSidebar } from "./components/layout/RightSidebar";
import { ThemeProvider } from "./components/ThemeProvider";

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
        <ThemeProvider>
          <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen">
            <LeftSidebar />
            <main className="flex-1 max-w-3xl mx-auto w-full border-r border-outline-variant/8">
              {children}
            </main>
            <RightSidebar />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
