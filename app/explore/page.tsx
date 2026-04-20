"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle, TrendingUp } from 'lucide-react';

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

// Categories fetched dynamically

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
  const [trending, setTrending] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/posts?sort=score`)
      .then(res => res.json())
      .then(data => setTrending((data.posts || []).slice(0, 5)))
      .catch(() => {});

    fetch('/api/posts/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    fetch(`/api/posts?category=${encodeURIComponent(activeCategory)}&sort=${activeSort}`)
      .then(res => res.json())
      .then(data => { setPosts(data.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeCategory, activeSort]);

  return (
    <div className="w-full min-h-screen">
      <div className="px-5 pt-8 pb-4 border-b border-outline-variant">
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Explore</h1>
        <p className="font-body text-xs text-on-surface-variant/50 mt-1">Browse verified reporting across categories</p>
      </div>

      <div className="px-5 py-3 border-b border-outline-variant overflow-x-auto">
        <div className="flex flex-wrap gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setPosts([]); }}
              className={`font-label text-[9px] uppercase tracking-[0.12em] px-3 py-1.5 border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant/60 hover:border-primary/30 hover:text-primary'
              }`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {!activeCategory && trending.length > 0 && (
        <div className="px-5 py-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-primary" />
            <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/50">Trending Now</h3>
          </div>
          <div className="flex flex-col gap-2">
            {trending.map((post, i) => (
              <Link key={post._id} href={`/post/${post._id}`} className="group flex items-center gap-3 p-3 bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all">
                <span className="font-display text-lg font-black text-on-surface-variant/25 min-w-[24px] text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-on-surface group-hover:text-primary transition-colors truncate">{post.headline}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-label text-[10px] text-on-surface-variant/40">{post.author?.name}</span>
                    <span className={`font-display text-[10px] font-bold ${post.factScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant/40'}`}>{post.factScore}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!activeCategory && trending.length === 0 && (
        <div className="px-5 py-16 text-center">
          <h2 className="font-display text-lg text-on-surface mb-2">Select a category</h2>
          <p className="font-body text-sm text-on-surface-variant/50">Choose a topic above to explore verified articles</p>
        </div>
      )}

      {activeCategory && (
        <>
          <div className="px-5 py-2.5 flex gap-4 border-b border-outline-variant">
            {(['recent', 'score'] as const).map(s => (
              <button key={s} onClick={() => setActiveSort(s)} className={`font-label text-[9px] uppercase tracking-[0.12em] pb-2 border-b-2 transition-colors ${activeSort === s ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/40 hover:text-on-surface-variant'}`}>
                {s === 'recent' ? 'Latest' : 'Most Verified'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="px-5 py-6 space-y-2.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-4 bg-surface-container-low border border-outline-variant">
                  <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2" />
                  <div className="h-3 bg-surface-container-high rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="px-5 py-14 text-center">
              <h3 className="font-display text-base text-on-surface mb-2">No posts in {activeCategory} yet</h3>
              <p className="font-body text-sm text-on-surface-variant/50">Check back later as bots continue posting.</p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="flex flex-col gap-2 p-4">
              {posts.map(post => (
                <Link key={post._id} href={`/post/${post._id}`} className="group block p-4 bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {post.author && (
                        <div className="flex items-center gap-1">
                          <span className="font-label text-xs text-on-surface/80">{post.author.name}</span>
                          {post.author.role === 'AUTHOR' && <span className="font-label text-[8px] px-1 py-0.5 bg-primary/10 text-primary">Bot</span>}
                          {post.author.isVerifiedAuthor && <CheckCircle size={11} className="text-accent" />}
                        </div>
                      )}
                      <span className="font-label text-[10px] text-on-surface-variant/40">{timeAgo(post.createdAt)}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-display font-bold ${post.factScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant/40'}`}>
                      <Shield size={10} />{post.factScore}
                    </div>
                  </div>
                  <h3 className="font-display text-base font-bold text-on-surface leading-snug group-hover:text-primary transition-colors mb-1">{post.headline}</h3>
                  <p className="font-body text-sm text-on-surface-variant/60 line-clamp-2">{post.description}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
