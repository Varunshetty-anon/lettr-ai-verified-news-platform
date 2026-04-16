import React from 'react';
import Link from 'next/link';
import { Compass, Home, PenTool, User as UserIcon, Shield, Settings } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function LeftSidebar() {
  const navItems = [
    { href: '/', label: 'Feed', icon: Home, section: 'Platform' },
    { href: '/explore', label: 'Explore', icon: Compass, section: 'Platform' },
    { href: '/publish', label: 'Publish', icon: PenTool, section: 'Author' },
    { href: '/verify', label: 'Verification', icon: Shield, section: 'Author' },
    { href: '/account', label: 'Account', icon: UserIcon, section: 'Personal' },
    { href: '/preferences', label: 'Preferences', icon: Settings, section: 'Personal' },
  ];

  const sections = [...new Set(navItems.map(i => i.section))];

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
            {navItems.filter(i => i.section === section).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-2.5 py-2 font-body text-[13px] text-on-surface/70 hover:text-primary hover:bg-primary/[0.04] transition-all duration-150 group"
              >
                <item.icon size={15} strokeWidth={1.5} className="text-on-surface-variant/40 group-hover:text-primary transition-colors" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-outline-variant pt-3 mt-auto flex items-center justify-between">
        <p className="font-label text-[8px] text-on-surface-variant/30 uppercase tracking-wider">© 2026</p>
        <ThemeToggle />
      </div>
    </aside>
  );
}
