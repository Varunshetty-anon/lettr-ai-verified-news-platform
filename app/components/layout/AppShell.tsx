"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MobileNav } from './MobileNav';

const NO_SHELL_ROUTES = ['/auth', '/onboarding'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show sidebars on auth and onboarding pages
  const isNoShellRoute = NO_SHELL_ROUTES.some(route => pathname.startsWith(route));

  if (isNoShellRoute || status === 'loading') {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row justify-center max-w-[1440px] mx-auto min-h-screen bg-surface px-0 sm:px-[64px] gap-[32px]">
      <LeftSidebar />
      <MobileNav />
      {/* 
        Add pt-[53px] (top bar height) and pb-[56px] (bottom nav height) for mobile 
        to ensure content is not hidden behind fixed headers/footers
      */}
      <main className="flex-1 w-full max-w-[800px] min-h-screen pt-[53px] pb-[70px] sm:pt-0 sm:pb-0 px-[20px] sm:px-0">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
