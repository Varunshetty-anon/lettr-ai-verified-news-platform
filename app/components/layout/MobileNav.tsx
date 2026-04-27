"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, PenTool, User as UserIcon } from 'lucide-react';

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
      <header className="md:hidden sticky top-0 z-50 w-full bg-surface-container-low/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-center h-14">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-display font-black text-lg tracking-[-0.04em] text-primary">LETTR</span>
          <span className="font-display text-lg text-primary/30">.</span>
        </Link>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-low/90 backdrop-blur-md border-t border-outline-variant z-50 flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full py-3 gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant/50 hover:text-on-surface'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="font-label text-[9px] uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
