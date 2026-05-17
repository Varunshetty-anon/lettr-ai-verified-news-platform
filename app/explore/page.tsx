"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const CATEGORIES = [
  'ALL',
  'AI & TECH',
  'WORLD',
  'FINANCE',
  'SPACE',
  'HEALTH',
  'CULTURE'
];

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('ALL');

  // URL to fetch from based on category
  const apiUrl = activeCategory === 'ALL'
    ? '/api/posts?sort=recent'
    : `/api/posts?sort=recent&category=${encodeURIComponent(activeCategory)}`;

  const { data, isLoading } = useSWR(apiUrl, fetcher);
  const posts = data?.posts || [];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      
      {/* ── Search Input (Full Width) ── */}
      <div className="w-full mb-[48px] md:mb-[64px] relative border-b-2 border-on-surface">
        <input 
          type="text" 
          placeholder="SEARCH TOPICS, AUTHORS, OR KEYWORDS" 
          className="w-full bg-transparent py-4 pl-12 text-on-surface type-headline-sm md:type-headline-md placeholder:type-headline-sm md:placeholder:type-headline-md placeholder:uppercase placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
        />
        <Search size={32} className="absolute left-0 top-1/2 -translate-y-1/2 text-on-surface" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[32px] lg:gap-[64px]">

        {/* ── Left Column: Categories Filter ── */}
        <div className="lg:col-span-3">
          <div className="sticky top-[104px] flex flex-col gap-4">
            <h3 className="type-label-md text-on-surface mb-2 border-b-2 border-on-surface pb-2">CATEGORIES</h3>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-left type-headline-sm transition-colors ${
                  activeCategory === cat
                    ? 'text-primary'
                    : 'text-on-surface hover:text-primary/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Column: Grid of Cards ── */}
        <div className="lg:col-span-9">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[32px]">
               <PostSkeleton variant="feed" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[32px] lg:gap-[48px]">
              {posts.map((post: any) => (
                <Link
                  key={post._id}
                  href={`/post/${post._id}`}
                  className="group flex flex-col h-full border-b border-outline-variant pb-[32px] lg:border-none lg:pb-0"
                >
                  <div className="aspect-[4/3] w-full bg-surface-container-highest mb-4 overflow-hidden relative">
                    {post.imageUrl ? (
                      <img src={post.imageUrl} alt={post.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <span className="type-display text-primary/40">{post.category?.charAt(0) || 'N'}</span>
                      </div>
                    )}
                    {post.category && (
                      <div className="absolute top-0 left-0 bg-surface px-3 py-1.5 border-b border-r border-on-surface">
                        <span className="type-label-md">{post.category}</span>
                      </div>
                    )}
                  </div>

                  <h3 className="type-headline-sm text-on-surface leading-tight group-hover:text-primary transition-colors mb-3">
                    {post.headline}
                  </h3>

                  <p className="type-body-md text-on-surface-variant line-clamp-3 mb-4 flex-grow">
                    {post.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant">
                    <div className="flex items-center gap-2">
                       <span className="type-label-md text-on-surface">{post.author?.name || 'Editorial'}</span>
                       {post.author?.isVerifiedAuthor && <VerifiedBadge size={14} />}
                    </div>
                    <FactScoreBadge score={post.factScore} size="sm" />
                  </div>
                </Link>
              ))}

              {posts.length === 0 && !isLoading && (
                 <div className="col-span-full py-[64px] text-center">
                    <p className="type-body-lg text-on-surface-variant">No stories found in this category.</p>
                 </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
