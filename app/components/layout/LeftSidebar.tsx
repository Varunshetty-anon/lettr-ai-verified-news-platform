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
    <header className="hidden sm:flex flex-col w-[88px] xl:w-[275px] h-screen sticky top-0 px-2 xl:px-4 py-4">
      <div className="flex items-center justify-center xl:justify-start xl:px-4 mb-4">
        <Link href="/" className="w-12 h-12 flex items-center justify-center xl:justify-start rounded-full hover:bg-surface-variant transition-colors">
           <span className="text-3xl font-bold xl:hidden text-on-surface">L</span>
           <span className="font-display font-black text-3xl tracking-[-0.04em] text-on-surface hidden xl:block">LETTR</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center xl:justify-start justify-center gap-5 p-3 xl:px-4 xl:py-3 rounded-full transition-all w-fit ${
                isActive
                  ? 'text-on-surface font-bold'
                  : 'text-on-surface hover:bg-surface-variant/50'
              }`}
            >
              <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
              <span className="hidden xl:block font-body text-xl">{item.label}</span>
            </Link>
          );
        })}
        <div className="pt-2">
            <button
              onClick={() => signOut()}
              className="group flex items-center xl:justify-start justify-center gap-5 p-3 xl:px-4 xl:py-3 rounded-full transition-all w-fit text-on-surface hover:bg-surface-variant/50"
            >
              <LogOut size={26} strokeWidth={2} />
              <span className="hidden xl:block font-body text-xl">Logout</span>
            </button>
        </div>
      </nav>

      {/* User Menu */}
      <div className="mt-auto pt-4 flex justify-center xl:justify-start w-full">
        <div className="flex items-center gap-3 p-3 xl:px-4 xl:py-3 rounded-full hover:bg-surface-variant transition-colors cursor-pointer w-fit xl:w-full">
          <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center shrink-0">
            {userImage ? (
              <img src={userImage} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-bold text-on-surface">{userInitial}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 hidden xl:block">
            <p className="text-[15px] font-bold text-on-surface truncate">{userName}</p>
            <p className="text-[15px] text-on-surface-variant truncate">{userHandle}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
