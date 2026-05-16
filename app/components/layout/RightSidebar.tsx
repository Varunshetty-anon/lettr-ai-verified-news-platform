"use client";

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { VerifiedBadge } from '../ui/VerifiedBadge';


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
    <aside className="hidden lg:block w-[350px] pl-8 py-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
      {/* Search (Stitch: underline-style input) */}
      <div className="mb-6 sticky top-0 bg-surface z-10 pt-2 pb-2">
        <div className="flex items-center border-b-2 border-outline-variant focus-within:border-primary transition-colors px-0 py-3">
          <Search size={18} className="text-on-surface-variant/40" />
          <input
            type="text"
            placeholder="Search Lettr"
            className="bg-transparent border-none focus:outline-none ml-3 w-full text-on-surface font-body text-sm placeholder:text-on-surface-variant/30"
          />
        </div>
      </div>

      {/* Trending Box (Stitch: no shadow, 1px border) */}
      <div className="border border-outline-variant mb-6">
        <h2 className="font-display text-[11px] uppercase tracking-[0.2em] font-black px-5 py-4 text-on-surface border-b border-outline-variant">
          What&apos;s Happening
        </h2>

        {trending.length > 0 ? trending.map((topic, i) => (
          <div key={i} className="px-5 py-3.5 hover:bg-surface-container-low cursor-pointer transition-colors border-b border-outline-variant/20 last:border-b-0">
            <p className="type-label-caps text-[9px] text-on-surface-variant/40">Trending in News</p>
            <p className="font-display text-[14px] font-semibold text-on-surface mt-0.5">{topic}</p>
            <p className="text-[12px] text-on-surface-variant/40 mt-0.5">{34}K Reports</p>
          </div>
        )) : (
          <div className="px-5 py-4 text-on-surface-variant text-sm animate-pulse">Loading trends...</div>
        )}

        <Link href="/explore" className="block px-5 py-4 hover:bg-surface-container-low transition-colors text-primary text-[13px] font-bold border-t border-outline-variant/20">
          Show more
        </Link>
      </div>

      {/* Who to Follow (Stitch: no shadow, 1px border, sharp edges) */}
      <div className="border border-outline-variant">
        <h2 className="font-display text-[11px] uppercase tracking-[0.2em] font-black px-5 py-4 text-on-surface border-b border-outline-variant">
          Who to Follow
        </h2>

        {authors.length > 0 ? authors.map((author, i) => (
          <Link href={`/author/${author._id}`} key={i} className="px-5 py-3.5 hover:bg-surface-container-low cursor-pointer transition-colors flex items-center justify-between border-b border-outline-variant/20 last:border-b-0 block">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-variant overflow-hidden shrink-0 border border-outline-variant/50 flex items-center justify-center">
                {author.image ? (
                  <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display font-bold text-on-surface">{author.name?.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[14px] text-on-surface truncate flex items-center gap-1.5">
                   {author.name}
                   {author.isVerifiedAuthor && <VerifiedBadge size={16} />}
                </p>
                <p className="text-[13px] text-on-surface-variant truncate">@{author.name?.toLowerCase().replace(/\s+/g, '')}</p>
              </div>
            </div>
            <button className="bg-on-surface text-surface font-bold text-[12px] px-4 py-1.5 hover:bg-primary shrink-0 ml-3 transition-colors">
              Follow
            </button>
          </Link>
        )) : (
          <div className="px-5 py-4 text-on-surface-variant text-sm animate-pulse">Loading authors...</div>
        )}

        <Link href="/explore" className="block px-5 py-4 hover:bg-surface-container-low transition-colors text-primary text-[13px] font-bold border-t border-outline-variant/20">
          Show more
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-6 px-1">
        <p className="text-[10px] text-on-surface-variant/30 leading-relaxed">
          © {new Date().getFullYear()} LETTR · AI-Verified News · <Link href="#" className="hover:underline">Privacy</Link> · <Link href="#" className="hover:underline">Terms</Link>
        </p>
      </div>
    </aside>
  );
}
