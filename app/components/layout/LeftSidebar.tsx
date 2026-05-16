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
    <header className="hidden sm:flex flex-col w-[88px] xl:w-[275px] h-screen sticky top-0 px-2 xl:px-4 py-4 border-r border-outline-variant/30">
      {/* Logo */}
      <div className="flex items-center justify-center xl:justify-start xl:px-4 mb-6">
        <Link href="/" className="flex items-center justify-center xl:justify-start hover:opacity-80 transition-opacity">
           <span className="font-display font-black text-2xl xl:text-3xl tracking-[-0.04em] text-on-surface">
             <span className="xl:hidden">L</span>
             <span className="hidden xl:inline">LETTR<span className="text-primary">.</span></span>
           </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center xl:justify-start justify-center gap-5 p-3 xl:px-4 xl:py-3 transition-all w-fit ${
                isActive
                  ? 'text-on-surface font-bold'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={`hidden xl:block text-lg ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {/* Active indicator bar */}
              {isActive && (
                <span className="hidden xl:block ml-auto w-1 h-5 bg-primary" />
              )}
            </Link>
          );
        })}

        {/* Logout */}
        <div className="pt-2">
            <button
              onClick={() => signOut()}
              className="group flex items-center xl:justify-start justify-center gap-5 p-3 xl:px-4 xl:py-3 transition-all w-fit text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface"
            >
              <LogOut size={24} strokeWidth={1.5} />
              <span className="hidden xl:block text-lg">Logout</span>
            </button>
        </div>

        {/* Theme Toggle */}
        <div className="pt-4 flex justify-center xl:justify-start xl:px-4">
          <ThemeToggle />
        </div>
      </nav>

      {/* User Menu */}
      <div className="mt-auto pt-4 flex justify-center xl:justify-start w-full border-t border-outline-variant/30">
        <Link href="/account" className="flex items-center gap-3 p-3 xl:px-4 xl:py-3 hover:bg-surface-variant/50 transition-colors cursor-pointer w-fit xl:w-full">
          <div className="w-10 h-10 bg-surface-variant overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant/50">
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-on-surface">{userInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 hidden xl:block">
            <p className="text-[14px] font-bold text-on-surface truncate">{userName}</p>
            <p className="text-[13px] text-on-surface-variant truncate">{userHandle}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
