"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { MobileNav } from './MobileNav';
import { TopNavigation } from './TopNavigation';

const NO_SHELL_ROUTES = ['/auth', '/onboarding'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isNoShellRoute = NO_SHELL_ROUTES.some(route => pathname.startsWith(route));

  if (isNoShellRoute || status === 'loading') {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TopNavigation />
      <MobileNav />
      {/* 
        Mobile requires padding for fixed header and bottom tab bar.
        Desktop relies on static TopNavigation.
      */}
      <main className="flex-1 w-full pt-[80px] pb-[80px] md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
