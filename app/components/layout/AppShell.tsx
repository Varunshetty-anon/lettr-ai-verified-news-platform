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
    <div className="flex flex-col md:flex-row max-w-[1600px] mx-auto min-h-screen">
      <LeftSidebar />
      <MobileNav />
      <main className="flex-1 max-w-3xl mx-auto w-full border-x border-outline-variant/8 pb-20 md:pb-0">
        {children}
      </main>
      <RightSidebar />
    </div>
  );
}
