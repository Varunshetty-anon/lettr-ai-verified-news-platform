import React from 'react';
import Link from 'next/link';
import { Compass, FileText, Home, LogOut, User as UserIcon, PenTool } from 'lucide-react';

export function LeftSidebar() {
  return (
    <aside className="w-[280px] h-screen sticky top-0 hidden md:flex flex-col border-r border-outline-variant/20 bg-surface px-6 py-10">
      <div className="mb-12">
        <Link href="/" className="font-display font-black text-3xl tracking-tighter text-primary">
          LETTR.
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Platform</span>
          <Link href="/" className="flex items-center gap-3 font-body text-on-surface hover:text-primary transition-colors py-2">
            <Home size={20} strokeWidth={1.5} />
            <span className="font-medium text-lg">Home Feed</span>
          </Link>
          <Link href="/explore" className="flex items-center gap-3 font-body text-on-surface hover:text-primary transition-colors py-2">
            <Compass size={20} strokeWidth={1.5} />
            <span className="font-medium text-lg">Explore</span>
          </Link>
          <Link href="/verified" className="flex items-center gap-3 font-body text-on-surface hover:text-primary transition-colors py-2">
            <FileText size={20} strokeWidth={1.5} />
            <span className="font-medium text-lg">Verified News</span>
          </Link>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Authored</span>
          <Link href="/publish" className="flex items-center gap-3 font-body text-on-surface hover:text-primary transition-colors py-2">
            <PenTool size={20} strokeWidth={1.5} />
            <span className="font-medium text-lg">Publish Article</span>
          </Link>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Personal</span>
          <Link href="/account" className="flex items-center gap-3 font-body text-on-surface hover:text-primary transition-colors py-2">
            <UserIcon size={20} strokeWidth={1.5} />
            <span className="font-medium text-lg">Profile & Saves</span>
          </Link>
        </div>
      </nav>

      {/* Account Info Stub bottom */}
      <div className="mt-auto border-t border-outline-variant/20 pt-6">
         <button className="flex items-center gap-3 font-body text-on-surface-variant hover:text-on-surface transition-colors w-full text-left">
            <LogOut size={20} strokeWidth={1.5} />
            <span>Sign Out</span>
         </button>
      </div>
    </aside>
  );
}
