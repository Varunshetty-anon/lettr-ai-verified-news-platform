import React from 'react';
import Link from 'next/link';
import { Compass, Home, PenTool, User as UserIcon, Shield } from 'lucide-react';

export function LeftSidebar() {
  const navItems = [
    { href: '/', label: 'Feed', icon: Home, section: 'Platform' },
    { href: '/explore', label: 'Explore', icon: Compass, section: 'Platform' },
    { href: '/publish', label: 'Publish', icon: PenTool, section: 'Author' },
    { href: '/verify', label: 'Verification', icon: Shield, section: 'Author' },
    { href: '/account', label: 'Account', icon: UserIcon, section: 'Personal' },
  ];

  const sections = [...new Set(navItems.map(i => i.section))];

  return (
    <aside className="w-[240px] h-screen sticky top-0 hidden md:flex flex-col border-r border-outline-variant/12 bg-surface px-5 py-8">
      {/* Logo */}
      <div className="mb-10">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="font-display font-black text-2xl tracking-[-0.04em] text-primary">LETTR</span>
          <span className="font-display text-2xl text-primary/40">.</span>
        </Link>
        <p className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/50 mt-1">Verified News Network</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-6">
        {sections.map(section => (
          <div key={section} className="flex flex-col gap-0.5">
            <span className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-2 px-3">{section}</span>
            {navItems.filter(i => i.section === section).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 font-body text-sm text-on-surface/80 hover:text-primary hover:bg-primary/[0.03] transition-all duration-150 group"
              >
                <item.icon size={16} strokeWidth={1.5} className="text-on-surface-variant/50 group-hover:text-primary transition-colors" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-outline-variant/12 pt-4 mt-auto">
        <p className="font-label text-[9px] text-on-surface-variant/40 uppercase tracking-wider">
          Lettr © 2026
        </p>
      </div>
    </aside>
  );
}
