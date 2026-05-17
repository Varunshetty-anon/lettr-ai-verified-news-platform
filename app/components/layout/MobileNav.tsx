"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Home, PenTool, User as UserIcon, Menu, Search } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/publish', label: 'Publish', icon: PenTool },
    { href: '/account', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 z-50 w-full bg-surface border-b-2 border-on-surface flex items-center justify-between px-[16px] h-[80px]">
        <div className="w-16 flex items-center justify-start">
          <button aria-label="Open menu" className="text-on-surface"><Menu size={24} strokeWidth={2} /></button>
        </div>
        <Link href="/" className="flex items-center justify-center flex-1">
          <span className="font-display text-[32px] font-bold tracking-[-0.01em] text-on-surface">
            LETTR.
          </span>
        </Link>
        <div className="w-16 flex items-center justify-end gap-3">
          <button aria-label="Search" className="text-on-surface"><Search size={24} strokeWidth={2} /></button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface border-t-2 border-on-surface z-50 flex items-center justify-around h-[64px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="type-caption mt-1 font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
