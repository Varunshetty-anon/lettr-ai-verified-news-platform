"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowUpRight, Search } from 'lucide-react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';
import useSWR from 'swr';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  category?: string;
  createdAt: string;
  engagement: number;
  imageUrl?: string;
  videoUrl?: string;
  author: { name: string; trustScore: number; role: string; isVerifiedAuthor: boolean } | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const getCategoryColorClass = (cat?: string) => {
  const normalized = cat?.toLowerCase() || '';
  if (normalized.includes('tech')) return 'bg-primary text-on-primary';
  if (normalized.includes('culture')) return 'bg-tertiary-fixed text-on-surface';
  return 'bg-secondary text-on-primary';
};

export default function Explore() {
  const { data: postsData, isLoading: loadingPosts } = useSWR(`/api/posts?sort=recent`, fetcher);
  const { data: trendingData } = useSWR(`/api/posts?sort=score`, fetcher);

  const posts: PostData[] = postsData?.posts || [];
  const trending: PostData[] = (trendingData?.posts || []).slice(0, 6);

  // Derive top categories dynamically
  const categoriesMap = new Map<string, number>();
  posts.forEach(p => {
    if (p.category) categoriesMap.set(p.category, (categoriesMap.get(p.category) || 0) + 1);
  });
  const trendingTopics = Array.from(categoriesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(entry => ({ name: entry[0], count: entry[1] }));

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      
      {/* ── Heading ── */}
      <h1 className="type-display-xl text-center text-on-surface mb-[48px]">
        EXPLORE
      </h1>

      {/* ── Search Input ── */}
      <div className="max-w-[720px] mx-auto mb-[64px] relative">
        <input 
          type="text" 
          placeholder="SEARCH TOPICS, AUTHORS, OR KEYWORDS" 
          className="w-full bg-transparent border-b-2 border-on-surface py-4 pl-12 text-on-surface type-headline-sm placeholder:type-headline-sm placeholder:uppercase placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
        />
        <Search size={24} className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface" />
      </div>

      {/* ── TRENDING TOPICS ── */}
      {trendingTopics.length > 0 && (
        <div className="mb-[64px]">
          <h2 className="type-label-md border-b-2 border-on-surface pb-[12px] mb-[24px]">TRENDING TOPICS</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[24px]">
            {trendingTopics.map(topic => (
              <div key={topic.name} className="group border-2 border-on-surface p-[24px] hover:bg-primary hover:border-primary transition-colors cursor-pointer flex flex-col justify-between aspect-[3/2]">
                <TrendingUp size={24} className="text-on-surface group-hover:text-on-primary" />
                <div>
                  <h3 className="type-headline-sm text-on-surface group-hover:text-on-primary line-clamp-1">#{topic.name.toUpperCase()}</h3>
                  <p className="type-label-md text-on-surface-variant group-hover:text-on-primary/80 mt-2">{topic.count} STORIES</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT (8-col feed + 4-col sidebar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] lg:gap-[64px]">
        
        {/* 8-col Feed */}
        <div className="lg:col-span-8 flex flex-col gap-[48px]">
          {loadingPosts && (
            <>
              <PostSkeleton variant="card" />
              <PostSkeleton variant="card" />
            </>
          )}

          {!loadingPosts && posts.map(post => (
             <Link
               key={post._id}
               href={`/post/${post._id}`}
               className="group block border-b border-outline-variant pb-[48px] last:border-0 last:pb-0"
             >
               {/* Display Image if available */}
               {post.imageUrl && (
                 <div className="aspect-video bg-surface-container-highest mb-[24px]">
                   <img src={post.imageUrl} alt={post.headline} className="w-full h-full object-cover" />
                 </div>
               )}

               <div className="flex items-center gap-4 mb-4">
                 {post.category && (
                   <span className={`type-label-md px-2 py-1 ${getCategoryColorClass(post.category)}`}>
                     {post.category}
                   </span>
                 )}
               </div>
               
               <h3 className="type-headline-md text-on-surface leading-tight group-hover:text-primary transition-colors mb-4">
                 {post.headline}
               </h3>
               
               <p className="type-body-lg text-on-surface-variant line-clamp-2 leading-relaxed mb-6">
                 {post.description}
               </p>

               <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                 <div className="flex items-center gap-3">
                   <div className="w-[32px] h-[32px] bg-surface-container-highest grayscale">
                     {post.author?.name ? <span className="flex items-center justify-center w-full h-full type-label-md">{post.author.name.charAt(0)}</span> : null}
                   </div>
                   <div className="flex items-center gap-1">
                     <span className="type-label-md text-on-surface">{post.author?.name}</span>
                     {post.author?.isVerifiedAuthor && <VerifiedBadge size={14} />}
                   </div>
                   <span className="type-caption text-on-surface-variant">· 4 MIN READ</span>
                 </div>
                 <FactScoreBadge score={post.factScore} size="sm" />
               </div>
             </Link>
          ))}
        </div>

        {/* 4-col Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-[104px] flex flex-col gap-[48px]">
            
            {/* Featured Collection Box */}
            <div className="bg-surface-container-low border-2 border-on-surface p-[24px]">
              <h3 className="type-headline-sm mb-4">FEATURED COLLECTION</h3>
              <p className="type-body-md text-on-surface-variant mb-6">Deep dives into the intersection of technology and human behavior.</p>
              <button className="w-full border border-on-surface py-3 type-label-md hover:bg-on-surface hover:text-surface transition-colors">
                VIEW COLLECTION
              </button>
            </div>

            {/* Popular Searches */}
            <div>
              <h3 className="type-label-md border-b-2 border-on-surface pb-[12px] mb-[24px]">POPULAR SEARCHES</h3>
              <div className="flex flex-col">
                {['Artificial Intelligence', 'Global Markets', 'Design Systems', 'Silicon Valley'].map(search => (
                  <Link href={`/explore?q=${search}`} key={search} className="group flex items-center justify-between border-b border-outline-variant py-4 last:border-0 hover:bg-surface-container-low px-2 -mx-2 transition-colors">
                    <span className="type-body-md text-on-surface">{search}</span>
                    <ArrowUpRight size={16} className="text-on-surface-variant group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
