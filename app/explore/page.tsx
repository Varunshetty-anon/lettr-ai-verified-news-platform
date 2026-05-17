"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Search, UserPlus } from 'lucide-react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Unable to load explore data');
  }
  return res.json();
};

const CATEGORIES = [
  'All',
  'AI & Tech',
  'Indian Politics',
  'Indian Economy',
  'Startups India',
  'Geopolitics',
  'Finance',
  'Space',
  'Health',
  'Entertainment',
  'Sports',
];

const cleanSummary = (text: string) => text
  ?.replace(/https?:\/\/\S+/g, '')
  ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  ?.replace(/Link posted:.*$/gm, '')
  ?.replace(/Source:.*$/gm, '')
  ?.replace(/[\*\_#`~>+\-\=]/g, '')
  ?.replace(/\s+/g, ' ')
  ?.trim()
  ?.slice(0, 160) || '';

function EditorialImage({ src, alt = '', className = '', aspect = 'aspect-video' }: { src?: string; alt?: string; className?: string; aspect?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`w-full h-full ${aspect} bg-surface-container flex items-center justify-center border border-outline-variant/30`}>
        <span className="type-label-md text-on-surface-variant/40">NO MEDIA AVAILABLE</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${aspect} overflow-hidden bg-surface-container`}>
      {!loaded && (
        <div className="absolute inset-0 shimmer-bg" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${className} ${loaded ? 'opacity-100 blur-none scale-100' : 'opacity-0 blur-md scale-105'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  
  // URL to fetch from based on category
  const apiUrl = activeCategory === 'All'
    ? '/api/posts?sort=recent'
    : `/api/posts?sort=recent&category=${encodeURIComponent(activeCategory)}`;

  const { data, isLoading } = useSWR(apiUrl, fetcher);
  const { data: authorsData } = useSWR('/api/authors/top', fetcher);
  const posts = data?.posts || [];
  const topAuthors = authorsData?.authors || [];
  const visiblePosts = query.trim()
    ? posts.filter((post: any) => {
        const text = `${post.headline || ''} ${post.description || ''} ${post.category || ''} ${post.author?.name || ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
    : posts;
  const trendingCategories = Array.from(
    new Set<string>(posts.map((post: any) => post.category).filter(Boolean))
  ).slice(0, 8);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      
      {/* ── Search Input (Full Width) ── */}
      <div className="w-full mb-[48px] md:mb-[64px] relative border-b-2 border-on-surface">
        <input 
          type="text" 
          value={query}
          onChange={(event) => setQuery(event.target.value)}
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
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right Column: Grid of Cards ── */}
        <div className="lg:col-span-9">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-[40px]">
            {trendingCategories.length > 0 && (
              <div className="border-2 border-on-surface p-5">
                <h2 className="type-label-md text-on-surface border-b border-outline-variant pb-3 mb-4">TRENDING CATEGORIES</h2>
                <div className="flex flex-wrap gap-2">
                  {trendingCategories.map((category: string) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className="type-label-md border border-outline-variant px-3 py-2 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {topAuthors.length > 0 && (
              <div className="border-2 border-on-surface p-5">
                <h2 className="type-label-md text-on-surface border-b border-outline-variant pb-3 mb-4">NEW AUTHORS TO FOLLOW</h2>
                <div className="space-y-3">
                  {topAuthors.slice(0, 3).map((author: any) => (
                    <Link key={author._id} href={`/author/${author._id}`} className="flex items-center justify-between gap-4 border-b border-outline-variant pb-3 last:border-0 last:pb-0 group">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="type-label-md text-on-surface truncate">{author.name}</span>
                          {author.isVerifiedAuthor && <VerifiedBadge size={14} />}
                        </div>
                        <span className="type-caption text-on-surface-variant">{author.followersCount || 0} followers</span>
                      </div>
                      <UserPlus size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[32px]">
               <PostSkeleton variant="feed" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[32px] lg:gap-[48px]">
              {visiblePosts.map((post: any) => (
                <Link
                  key={post._id}
                  href={`/post/${post._id}`}
                  className="group flex flex-col h-full border-b border-outline-variant pb-[32px] lg:border-none lg:pb-0"
                >
                  <div className="aspect-[4/3] w-full mb-4 overflow-hidden relative">
                    <EditorialImage src={post.imageUrl} alt={post.headline} aspect="w-full h-full" className="group-hover:scale-105 transition-transform duration-500" />
                    {post.category && (
                      <div className="absolute top-0 left-0 bg-surface px-3 py-1.5 border-b border-r border-on-surface">
                        <span className="type-label-md">{post.category}</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="type-headline-sm text-on-surface leading-tight group-hover:text-primary transition-colors mb-3 headline-clamp">
                    {post.headline}
                  </h3>
                  
                  <p className="type-body-md text-on-surface-variant line-clamp-3 mb-4 flex-grow">
                    {cleanSummary(post.description)}
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
              
              {visiblePosts.length === 0 && !isLoading && (
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
