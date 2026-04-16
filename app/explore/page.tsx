"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  category?: string;
  createdAt: string;
  author: { name: string; trustScore: number } | null;
}

const CATEGORIES = ['World', 'Politics', 'Technology', 'Economy', 'Science', 'Culture'];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'recent' | 'score'>('recent');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    const url = `/api/posts?category=${encodeURIComponent(activeCategory)}&sort=${activeSort}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeCategory, activeSort]);

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 border-b border-outline-variant/15">
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Explore</h1>
        <p className="font-body text-xs text-on-surface-variant/60 mt-1">Browse verified reporting across categories</p>
      </div>

      {/* Categories */}
      <div className="px-6 py-4 border-b border-outline-variant/12 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setPosts([]); }}
            className={`font-label text-[10px] uppercase tracking-[0.15em] px-4 py-2 border transition-colors ${
              activeCategory === cat
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant/25 text-on-surface-variant hover:border-primary/40 hover:text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* No category selected */}
      {!activeCategory && (
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-outline-variant/20 flex items-center justify-center">
            <span className="font-display text-2xl text-on-surface-variant/30">?</span>
          </div>
          <h2 className="font-display text-lg text-on-surface mb-2">Select a category</h2>
          <p className="font-body text-sm text-on-surface-variant/60">Choose a topic above to explore verified articles</p>
        </div>
      )}

      {/* Category selected */}
      {activeCategory && (
        <>
          {/* Sort tabs */}
          <div className="px-6 py-3 flex gap-4 border-b border-outline-variant/8">
            {(['recent', 'score'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSort(s)}
                className={`font-label text-[10px] uppercase tracking-[0.15em] pb-2 border-b-2 transition-colors ${
                  activeSort === s
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant/50 hover:text-on-surface-variant'
                }`}
              >
                {s === 'recent' ? 'Latest' : 'Most Verified'}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-6 py-8 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="w-12 h-14 bg-surface-container-high" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-container-high rounded w-3/4" />
                    <div className="h-3 bg-surface-container-high rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div className="px-6 py-16 text-center">
              <h3 className="font-display text-lg text-on-surface mb-2">No posts in {activeCategory} yet</h3>
              <p className="font-body text-sm text-on-surface-variant/60">The bot network hasn&apos;t posted content in this category. Check back later.</p>
            </div>
          )}

          {/* Posts */}
          {!loading && posts.length > 0 && (
            <div className="flex flex-col">
              {posts.map((post, i) => (
                <Link
                  key={post._id}
                  href={`/post/${post._id}`}
                  className={`group flex gap-4 px-6 py-5 ${i !== posts.length - 1 ? 'border-b border-outline-variant/8' : ''} hover:bg-surface-container-lowest/60 transition-all animate-fade-in`}
                >
                  <div className={`flex flex-col items-center justify-center min-w-[48px] py-2 border ${
                    post.factScore >= 80 ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800' 
                    : post.factScore >= 60 ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800' 
                    : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800'
                  }`}>
                    <span className="font-display text-xl font-black">{post.factScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {post.author && <span className="font-label text-xs text-on-surface/80">{post.author.name}</span>}
                      <span className="font-label text-[10px] text-on-surface-variant/40">{timeAgo(post.createdAt)}</span>
                    </div>
                    <h3 className="font-display text-base font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">{post.headline}</h3>
                    <p className="font-body text-sm text-on-surface-variant/70 line-clamp-2 mt-1">{post.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
