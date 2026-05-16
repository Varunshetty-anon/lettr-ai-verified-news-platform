"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Compass, Home, PenTool, User as UserIcon, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function LeftSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/publish', label: 'Publish', icon: PenTool },
    { href: '/account', label: 'Profile', icon: UserIcon },
  ];

  const userName = session?.user?.name || 'User';
  const userImage = session?.user?.image;
  const userHandle = `@${userName.toLowerCase().replace(/\s+/g, '')}`;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="hidden sm:flex flex-col w-[88px] xl:w-[275px] h-screen sticky top-0 py-[64px]">
      <div className="flex items-center justify-center xl:justify-start mb-[64px]">
        <Link href="/" className="flex items-center justify-center xl:justify-start hover:text-primary transition-colors">
           <span className="text-4xl font-display font-bold xl:hidden text-on-surface hover:text-primary">L</span>
           <span className="font-display font-bold text-[32px] tracking-[-0.04em] text-on-surface hidden xl:block hover:text-primary">LETTR.</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-[8px]">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center xl:justify-start justify-center gap-4 py-3 transition-all w-fit ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface hover:text-primary'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="hidden xl:block font-label text-[14px] uppercase tracking-[0.1em]">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-8 mt-8 border-t border-outline-variant/30">
            <button
              onClick={() => signOut()}
              className="group flex items-center xl:justify-start justify-center gap-4 py-3 transition-all w-fit text-on-surface hover:text-primary"
            >
              <LogOut size={24} strokeWidth={2} />
              <span className="hidden xl:block font-label text-[14px] uppercase tracking-[0.1em]">Logout</span>
            </button>
        </div>
      </nav>

      {/* User Menu */}
      <div className="mt-auto pt-4 flex justify-center xl:justify-start w-full border-t border-outline-variant/30">
        <div className="flex items-center gap-4 py-4 hover:text-primary transition-colors cursor-pointer w-fit xl:w-full">
          <div className="w-10 h-10 bg-surface-variant overflow-hidden flex items-center justify-center shrink-0 rounded-none border border-outline-variant">
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-on-surface">{userInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 hidden xl:block">
            <p className="font-label text-[12px] font-bold text-on-surface truncate uppercase tracking-[0.1em]">{userName}</p>
            <p className="font-body text-[12px] text-on-surface-variant truncate">{userHandle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
