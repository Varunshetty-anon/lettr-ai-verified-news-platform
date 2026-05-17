"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export function TopNavigation() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="hidden md:flex sticky top-0 z-50 w-full bg-surface border-b-2 border-on-surface h-[80px] items-center justify-between px-[64px]">
      <div className="w-[200px]">
        <Link href="/" className="font-display text-[32px] font-bold tracking-[-0.01em] text-on-surface">
          LETTR.
        </Link>
      </div>

      <nav className="flex items-center gap-8 flex-1 justify-center">
        {['AI & TECH', 'WORLD', 'FINANCE', 'SPACE', 'HEALTH', 'CULTURE'].map((cat) => (
          <Link key={cat} href={`/explore?cat=${encodeURIComponent(cat)}`} className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
            {cat}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-6 w-[200px] justify-end relative">
        <button className="text-on-surface hover:text-primary transition-colors">
          <Search size={24} strokeWidth={2} />
        </button>
        
        {session ? (
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-[40px] h-[40px] rounded-full border-2 border-on-surface overflow-hidden bg-surface-container-highest flex items-center justify-center font-bold text-on-surface"
            >
              {session.user?.image ? (
                <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                (session.user?.name || 'U').charAt(0).toUpperCase()
              )}
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-4 w-[200px] bg-surface border-2 border-on-surface flex flex-col z-50">
                <Link onClick={() => setDropdownOpen(false)} href={`/account`} className="px-4 py-3 type-label-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant">
                  DASHBOARD
                </Link>
                <button onClick={() => { 
                  document.documentElement.classList.toggle('dark'); 
                  const isDark = document.documentElement.classList.contains('dark');
                  localStorage.setItem('theme', isDark ? 'dark' : 'light');
                  setDropdownOpen(false);
                }} className="px-4 py-3 type-label-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant text-left">
                  DARK MODE
                </button>
                <button onClick={() => signOut({ callbackUrl: '/' })} className="px-4 py-3 type-label-md text-error hover:bg-red-500/10 text-left">
                  SIGN OUT
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" className="bg-on-surface text-surface type-label-md px-[24px] py-[12px] hover:opacity-90 transition-opacity whitespace-nowrap">
            LOG IN
          </Link>
        )}
      </div>
    </header>
  );
}
