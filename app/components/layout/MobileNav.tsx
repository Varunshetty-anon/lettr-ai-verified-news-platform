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
