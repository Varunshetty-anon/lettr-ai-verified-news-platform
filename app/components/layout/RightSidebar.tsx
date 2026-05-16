"use client";

import React, { useEffect, useState } from 'react';
import { Compass, Search } from 'lucide-react';
import Link from 'next/link';

export function RightSidebar() {
  const [trending, setTrending] = useState<string[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);

  useEffect(() => {
    // Fetch top categories
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            const categories = data.map((p: any) => p.category).filter(Boolean);
            const counts = categories.reduce((acc: any, curr: string) => {
              acc[curr] = (acc[curr] || 0) + 1;
              return acc;
            }, {});
            const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 5);
            setTrending(sorted.length ? sorted : ['AI Verification', 'Global Markets', 'Technology', 'US Elections']);
        }
      }).catch(console.error);

    // Fetch top authors
    fetch('/api/authors/top')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setAuthors(data.slice(0, 3));
        }
      }).catch(console.error);
  }, []);

  return (
    <aside className="hidden lg:block w-[350px] py-[64px] sticky top-0 h-screen overflow-y-auto">
      {/* Search / Top Space */}
      <div className="mb-[32px] sticky top-0 bg-surface z-10 pt-2 pb-2">
        <div className="bg-surface-variant flex items-center px-4 py-3 border-b-[2px] border-outline-variant focus-within:border-primary focus-within:bg-surface transition-colors">
          <Search size={20} className="text-on-surface-variant" />
          <input
            type="text"
            placeholder="SEARCH LETTR"
            className="bg-transparent border-none focus:outline-none ml-3 w-full text-on-surface placeholder:text-on-surface-variant font-label text-[12px] uppercase tracking-[0.1em]"
          />
        </div>
      </div>

      {/* Trending Box */}
      <div className="bg-surface border border-outline-variant mb-[32px] rounded-none">
        <h2 className="font-display font-bold text-[24px] leading-[1.3] px-6 py-4 text-on-surface border-b border-outline-variant/30">WHAT&apos;S HAPPENING</h2>

        {trending.length > 0 ? trending.map((topic, i) => (
          <div key={i} className="px-6 py-4 hover:bg-surface-dim cursor-pointer transition-colors border-b border-outline-variant/30 last:border-b-0">
            <p className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">TRENDING IN NEWS</p>
            <p className="font-display font-bold text-[16px] text-on-surface mt-1">{topic}</p>
            <p className="font-body text-[12px] text-on-surface-variant mt-1">{34}K REPORTS</p>
          </div>
        )) : (
          <div className="px-6 py-4 font-body text-on-surface-variant text-[14px]">Loading trends...</div>
        )}

        <Link href="/explore" className="block px-6 py-4 hover:bg-surface-dim cursor-pointer transition-colors text-primary font-label text-[12px] uppercase tracking-[0.1em] border-t border-outline-variant/30">
          SHOW MORE
        </Link>
      </div>

      {/* Who to Follow Box */}
      <div className="bg-surface border border-outline-variant rounded-none">
        <h2 className="font-display font-bold text-[24px] leading-[1.3] px-6 py-4 text-on-surface border-b border-outline-variant/30">WHO TO FOLLOW</h2>

        {authors.length > 0 ? authors.map((author, i) => (
          <Link href={`/author/${author._id}`} key={i} className="px-6 py-4 hover:bg-surface-dim cursor-pointer transition-colors flex items-center justify-between block border-b border-outline-variant/30 last:border-b-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-surface-variant overflow-hidden shrink-0 border border-outline-variant rounded-none">
                {author.image ? (
                  <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display font-bold text-on-surface">{author.name?.charAt(0)}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-label text-[12px] font-bold text-on-surface truncate flex items-center gap-1 uppercase tracking-[0.1em]">
                   {author.name}
                   {author.isVerifiedAuthor && (
                       <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[14px] h-[14px] fill-tertiary shrink-0"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
                   )}
                </p>
                <p className="font-body text-[12px] text-on-surface-variant truncate">@{author.name?.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
            </div>
            <button className="bg-on-surface text-surface font-label font-bold text-[10px] uppercase tracking-[0.1em] px-4 py-2 hover:bg-on-surface-variant shrink-0 ml-2 rounded-none transition-colors">
              FOLLOW
            </button>
          </Link>
        )) : (
          <div className="px-6 py-4 font-body text-on-surface-variant text-[14px]">Loading authors...</div>
        )}

        <Link href="/explore" className="block px-6 py-4 hover:bg-surface-dim cursor-pointer transition-colors text-primary font-label text-[12px] uppercase tracking-[0.1em] border-t border-outline-variant/30">
          SHOW MORE
        </Link>
      </div>
    </aside>
  );
}
