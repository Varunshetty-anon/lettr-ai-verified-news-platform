"use client";

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function TopNavigation() {
  return (
    <header className="hidden md:flex sticky top-0 z-50 w-full bg-surface border-b-2 border-on-surface h-[80px] items-center justify-between px-[64px]">
      {/* Left: LETTR wordmark */}
      <div className="w-[200px]">
        <Link href="/" className="font-display text-[32px] font-bold tracking-[-0.01em] text-on-surface">
          LETTR.
        </Link>
      </div>

      {/* Center: Nav links */}
      <nav className="flex items-center gap-8 flex-1 justify-center">
        <Link href="/explore?cat=the-future" className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
          THE FUTURE
        </Link>
        <Link href="/explore?cat=technology" className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
          TECHNOLOGY
        </Link>
        <Link href="/explore?cat=culture" className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
          CULTURE
        </Link>
        <Link href="/account" className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
          ARCHIVE
        </Link>
      </nav>

      {/* Right: Search + Subscribe */}
      <div className="flex items-center gap-6 w-[200px] justify-end relative">
        <button aria-label="Search" className="text-on-surface hover:text-primary transition-colors">
          <Search size={24} strokeWidth={2} />
        </button>
        <button className="bg-on-surface text-surface type-label-md px-6 py-3 hover:opacity-90 transition-opacity whitespace-nowrap">
          SUBSCRIBE
        </button>
      </div>
    </header>
  );
}
