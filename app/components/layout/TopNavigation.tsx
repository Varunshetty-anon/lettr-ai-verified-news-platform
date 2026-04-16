import React from 'react';
import Link from 'next/link';
import { Button } from '../ui/Button';

export function TopNavigation() {
  return (
    <header className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display font-black text-2xl tracking-tighter text-on-surface">
            LETTR.
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="font-label text-sm uppercase tracking-widest text-on-surface hover:text-on-surface-variant transition-colors">
              Feed
            </Link>
            <Link href="/explore" className="font-label text-sm uppercase tracking-widest text-on-surface hover:text-on-surface-variant transition-colors">
              Explore
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/verify">
            <Button variant="tertiary" className="hidden sm:block">Submit Fact</Button>
          </Link>
          <Link href="/account">
            <Button variant="primary">My Archive</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
