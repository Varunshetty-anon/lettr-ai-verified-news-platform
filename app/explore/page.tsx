"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';
import { CategoryChip } from '@/app/components/ui/CategoryChip';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';

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

interface AuthorData {
  _id: string;
  name: string;
  image?: string;
  followersCount: number;
  isVerifiedAuthor: boolean;
  role: string;
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

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'recent' | 'score'>('recent');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [trending, setTrending] = useState<PostData[]>([]);
  const [topAuthors, setTopAuthors] = useState<AuthorData[]>([]);
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

    fetch('/api/authors/top')
      .then(res => res.json())
      .then(data => setTopAuthors(data.authors || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    setTimeout(() => setLoading(true), 0);
    fetch(`/api/posts?category=${encodeURIComponent(activeCategory)}&sort=${activeSort}`)
      .then(res => res.json())
      .then(data => { setPosts(data.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeCategory, activeSort]);

  return (
    <div className="w-full min-h-screen animate-fade-in pb-20">
      {/* ── Masthead ── */}
      <div className="px-6 pt-10 pb-6 border-b-2 border-on-surface">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-on-surface tracking-tight">
          Explore<span className="text-primary">.</span>
        </h1>
        <p className="font-body text-sm text-on-surface-variant/50 mt-1">
          Discover verified authors and trending topics
        </p>
      </div>

      {/* ── Category Chips ── */}
      <div className="px-6 py-4 border-b border-outline-variant overflow-x-auto no-scrollbar">
        <div className="flex gap-2">
          {categories.map(cat => (
            <CategoryChip
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setPosts([]); }}
            />
          ))}
        </div>
      </div>

      {/* ── Default View: Trending + Top Authors ── */}
      {!activeCategory && (
        <div className="px-6 py-10 space-y-12">
          {/* Trending Reports */}
          {trending.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-on-surface">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-on-surface font-black">
                  Trending Reports
                </h3>
              </div>
              <div className="space-y-0">
                {trending.map((post, i) => (
                  <Link
                    key={post._id}
                    href={`/post/${post._id}`}
                    className="group flex items-center gap-6 py-5 border-b border-outline-variant/30 transition-colors"
                  >
                    <span className="font-display text-4xl font-bold text-on-surface-variant/15 min-w-[40px] text-right tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-base font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-1">
                        {post.headline}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] text-on-surface-variant/50 font-bold">{post.author?.name}</span>
                        {post.author?.isVerifiedAuthor && <VerifiedBadge size={12} />}
                        <FactScoreBadge score={post.factScore} size="sm" />
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-on-surface-variant/20 group-hover:text-primary transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Verified Experts */}
          {topAuthors.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-on-surface">
                <Users size={16} className="text-primary" />
                <h3 className="font-display text-[11px] uppercase tracking-[0.2em] text-on-surface font-black">
                  Verified Experts to Follow
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {topAuthors.map((auth, i) => (
                  <Link
                    key={auth._id}
                    href={`/author/${auth._id}`}
                    className={`group flex items-center gap-4 py-5 transition-colors ${
                      i < topAuthors.length - 1 ? 'border-b border-outline-variant/30' : ''
                    }`}
                  >
                    <AuthorAvatar name={auth.name} image={auth.image} size="lg" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-body text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                          {auth.name}
                        </p>
                        {auth.isVerifiedAuthor && <VerifiedBadge size={14} />}
                      </div>
                      <p className="type-label-caps text-[10px] text-on-surface-variant/40 mt-0.5">
                        {auth.followersCount || 0} Followers
                      </p>
                    </div>
                    <button className="bg-on-surface text-surface font-bold text-[12px] px-4 py-1.5 hover:bg-primary transition-colors shrink-0">
                      Follow
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Filtered Category View ── */}
      {activeCategory && (
        <div className="px-6 pt-8">
          {/* Sort Tabs */}
          <div className="flex gap-6 mb-8 pb-2 border-b border-outline-variant">
            {(['recent', 'score'] as const).map(s => (
              <button
                key={s}
                onClick={() => setActiveSort(s)}
                className={`type-label-caps text-[10px] pb-3 border-b-2 transition-all ${
                  activeSort === s
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant/40 hover:text-on-surface'
                }`}
              >
                {s === 'recent' ? 'Latest Reporting' : 'Highest Fidelity'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-0">
              {[1, 2, 3].map(i => <PostSkeleton key={i} variant="card" />)}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="py-20 text-center border border-dashed border-outline-variant/40">
              <h3 className="font-display text-base text-on-surface mb-2 font-bold uppercase tracking-widest">
                No reports in {activeCategory}
              </h3>
              <p className="font-body text-sm text-on-surface-variant/40">
                Our verification bots are currently analyzing new sources.
              </p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="space-y-0">
              {posts.map(post => (
                <Link
                  key={post._id}
                  href={`/post/${post._id}`}
                  className="group block py-6 border-b border-outline-variant/30 animate-fade-in"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <AuthorAvatar name={post.author?.name || '?'} size="sm" />
                      <span className="text-[11px] text-on-surface-variant/60 font-bold uppercase tracking-wider">
                        {post.author?.name}
                      </span>
                      {post.author?.isVerifiedAuthor && <VerifiedBadge size={12} />}
                    </div>
                    <span className="text-[11px] text-on-surface-variant/30">{timeAgo(post.createdAt)}</span>
                    <div className="ml-auto">
                      <FactScoreBadge score={post.factScore} size="sm" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors mb-2">
                    {post.headline}
                  </h3>
                  <p className="font-body text-sm text-on-surface-variant/70 line-clamp-2 leading-relaxed mb-3">
                    {post.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 type-label-caps text-[9px] text-primary font-bold">
                    Read Full Report <ArrowUpRight size={10} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
