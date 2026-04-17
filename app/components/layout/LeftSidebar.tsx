"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Compass, Home, PenTool, User as UserIcon, Shield, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function LeftSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    { href: '/', label: 'Feed', icon: Home, section: 'Platform' },
    { href: '/explore', label: 'Explore', icon: Compass, section: 'Platform' },
    { href: '/publish', label: 'Publish', icon: PenTool, section: 'Author' },
    { href: '/verify', label: 'Verification', icon: Shield, section: 'Author' },
    { href: '/account', label: 'Account', icon: UserIcon, section: 'Personal' },
    { href: '/onboarding/preferences', label: 'Preferences', icon: Settings, section: 'Personal' },
  ];

  const sections = [...new Set(navItems.map(i => i.section))];

  const userName = session?.user?.name || 'User';
  const userImage = session?.user?.image;
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <aside className="w-[220px] h-screen sticky top-0 hidden md:flex flex-col border-r border-outline-variant bg-surface px-4 py-7">
      <div className="mb-8">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-display font-black text-xl tracking-[-0.04em] text-primary">LETTR</span>
          <span className="font-display text-xl text-primary/30">.</span>
        </Link>
        <p className="font-label text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/40 mt-1">Verified News</p>
      </div>

      <nav className="flex-1 flex flex-col gap-5">
        {sections.map(section => (
          <div key={section} className="flex flex-col gap-0.5">
            <span className="font-label text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/30 mb-1.5 px-2.5">{section}</span>
            {navItems.filter(i => i.section === section).map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-2 font-body text-[13px] hover:text-primary hover:bg-primary/[0.04] transition-all duration-150 group ${
                    isActive
                      ? 'text-primary bg-primary/[0.06] font-medium'
                      : 'text-on-surface/70'
                  }`}
                >
                  <item.icon size={15} strokeWidth={1.5} className={`transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant/40 group-hover:text-primary'}`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      {session?.user && (
        <div className="border-t border-outline-variant pt-3 mt-auto">
          <div className="flex items-center gap-2.5 px-2 mb-2.5">
            <div className="w-7 h-7 bg-primary/10 text-primary flex items-center justify-center font-display text-xs font-bold overflow-hidden rounded-full flex-shrink-0">
              {userImage ? (
                <img src={userImage} alt="" className="w-full h-full object-cover" />
              ) : (
                userInitial
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-body text-[11px] font-medium text-on-surface truncate">{userName}</p>
              <p className="font-label text-[8px] text-on-surface-variant/40 truncate">{session.user.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <button
              onClick={() => signOut({ callbackUrl: '/auth' })}
              className="flex items-center gap-1.5 font-label text-[9px] uppercase tracking-wider text-on-surface-variant/40 hover:text-red-500 transition-colors"
            >
              <LogOut size={12} />
              Sign Out
            </button>
            <ThemeToggle />
          </div>
        </div>
      )}
    </aside>
  );
}
