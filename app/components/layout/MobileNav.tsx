"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, PenTool, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Feed', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/publish', label: 'Publish', icon: PenTool },
    { href: '/account', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="sm:hidden sticky top-0 z-50 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-4 h-[53px]">
        <div className="w-8">
            <Link href="/account">
               <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center">
                 <UserIcon size={16} className="text-on-surface-variant" />
               </div>
            </Link>
        </div>
        <Link href="/" className="flex items-center justify-center">
          <span className="text-xl font-bold text-on-surface">L</span>
        </Link>
        <div className="w-8 flex justify-end"><ThemeToggle /></div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-md border-t border-outline-variant z-50 flex items-center justify-around h-[53px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />

            </Link>
          );
        })}
      </nav>
    </>
  );
}
