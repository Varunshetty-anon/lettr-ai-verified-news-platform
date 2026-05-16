"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, ExternalLink, ArrowUpRight } from 'lucide-react';
import useSWR from 'swr';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';
import { CategoryChip } from '@/app/components/ui/CategoryChip';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';
import ImpressTracker from '@/app/components/ui/ImpressTracker';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  reasoning?: string;
  originSource?: string;
  category?: string;
  sourceLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  engagement: number;
  createdAt: string;
  isLiked?: boolean;
  author: { _id: string; name: string; email?: string; trustScore: number; role: string; isVerifiedAuthor: boolean } | null;
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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Redirect new users to onboarding
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetch(`/api/user/preferences`)
        .then(r => r.json())
        .then(data => {
          if (!data.preferences || data.preferences.length === 0) {
            router.push('/onboarding/preferences');
          }
        })
        .catch(() => {});
    }
  }, [session, status, router]);

  const apiUrl = `/api/posts`;
  
  const { data, error, isLoading, mutate } = useSWR(apiUrl, fetcher, { 
    refreshInterval: 0,
    revalidateOnFocus: true, 
    keepPreviousData: true, 
  });

  const [displayPosts, setDisplayPosts] = useState<PostData[]>([]);
  const [hasNewPosts, setHasNewPosts] = useState(false);

  useEffect(() => {
    if (data?.posts) {
      if (displayPosts.length === 0) {
        setTimeout(() => setDisplayPosts(data.posts), 0);
      } else {
        const currentTopId = displayPosts[0]?._id;
        const newTopId = data.posts[0]?._id;
        if (currentTopId && newTopId && currentTopId !== newTopId) {
          setTimeout(() => setHasNewPosts(true), 0);
        }
      }
      setTimeout(() => setLikedIds(prev => {
        const next = new Set(prev);
        data.posts.forEach((p: PostData) => { if (p.isLiked) next.add(p._id); });
        return next;
      }), 0);
    }
  }, [data]);

  const loadNewPosts = () => {
    if (data?.posts) {
      setTimeout(() => setDisplayPosts(data.posts), 0);
      setHasNewPosts(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const posts = displayPosts;
  const loading = isLoading && displayPosts.length === 0;

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isLiked = likedIds.has(postId);
    const next = new Set(likedIds);
    if (isLiked) next.delete(postId); else next.add(postId);
    setLikedIds(next);

    setDisplayPosts(posts.map(p => p._id === postId ? { ...p, engagement: p.engagement + (isLiked ? -1 : 1) } : p));
    
    if (apiUrl) {
      mutate({
        ...data,
        posts: posts.map(p => p._id === postId ? { ...p, engagement: p.engagement + (isLiked ? -1 : 1) } : p)
      }, { revalidate: false });
    }

    await fetch(`/api/user/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, action: isLiked ? 'unlike' : 'like' })
    }).catch(() => {});
  };

  const firstName = session?.user?.name?.split(' ')[0] || '';

  // Split posts into editorial sections
  const heroPost = posts[0];
  const subFeatures = posts.slice(1, 3);
  const briefPosts = posts.slice(3);

  if (status === 'loading') {
    return (
      <div className="w-full min-h-screen">
        <PostSkeleton variant="hero" />
        <div className="grid grid-cols-1 md:grid-cols-2">
          <PostSkeleton variant="card" />
          <PostSkeleton variant="card" />
        </div>
        {[1, 2, 3].map(i => <PostSkeleton key={i} variant="brief" />)}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* ── Editorial Masthead ── */}
      <div className="px-6 pt-8 pb-6 border-b-2 border-on-surface">
        <div className="flex items-end justify-between">
          <div>
            {firstName && (
              <p className="type-label-caps text-on-surface-variant/50 mb-1">
                Welcome back, {firstName}
              </p>
            )}
            <h1 className="font-display text-5xl md:text-7xl font-bold text-on-surface tracking-[-0.04em] leading-none">
              LETTR<span className="text-primary">.</span>
            </h1>
          </div>
          {!loading && (
            <span className="type-label-caps text-on-surface-variant/40 mb-1">
              {posts.length} articles
            </span>
          )}
        </div>
      </div>

      {/* ── New Posts Banner ── */}
      {hasNewPosts && (
        <div className="sticky top-[53px] sm:top-0 z-30 flex justify-center py-3 bg-primary">
          <button 
            onClick={loadNewPosts}
            className="px-4 py-1.5 text-on-primary font-label text-[10px] uppercase tracking-widest font-bold hover:opacity-90 transition-opacity"
          >
            New Posts Available ↑
          </button>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div>
          <PostSkeleton variant="hero" />
          <div className="grid grid-cols-1 md:grid-cols-2">
            <PostSkeleton variant="card" />
            <PostSkeleton variant="card" />
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && posts.length === 0 && (
        <div className="px-6 py-20 text-center border-b border-outline-variant">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">No articles yet</h2>
          <p className="font-body text-sm text-on-surface-variant/50 max-w-xs mx-auto">
            The bot network is seeding content automatically. Articles will appear shortly.
          </p>
        </div>
      )}

      {/* ══════════ HERO FEATURE ARTICLE ══════════ */}
      {heroPost && (
        <ImpressTracker postId={heroPost._id}>
          <Link
            href={`/post/${heroPost._id}`}
            prefetch={true}
            className="group block px-6 pt-10 pb-10 border-b border-outline-variant animate-fade-in"
          >
            {/* Category + Timestamp */}
            <div className="flex items-center gap-3 mb-5">
              {heroPost.category && (
                <span className="font-label text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 bg-tertiary-fixed text-on-surface font-bold">
                  {heroPost.category}
                </span>
              )}
              <span className="type-label-caps text-on-surface-variant/40 text-[10px]">
                {timeAgo(heroPost.createdAt)}
              </span>
            </div>

            {/* Hero Headline */}
            <h2 className="type-display-xl text-on-surface mb-5 group-hover:text-primary transition-colors">
              {heroPost.headline}<span className="text-primary">.</span>
            </h2>

            {/* Description */}
            <p className="type-body-lg text-on-surface-variant/80 max-w-2xl mb-6 leading-relaxed">
              {heroPost.description}
            </p>

            {/* Author Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AuthorAvatar
                  name={heroPost.author?.name || '?'}
                  size="sm"
                />
                <div className="flex items-center gap-2">
                  {heroPost.author && (
                    <span className="font-bold text-[15px] text-on-surface">
                      {heroPost.author.name}
                    </span>
                  )}
                  {heroPost.author?.isVerifiedAuthor && <VerifiedBadge size={16} />}
                  <span className="text-on-surface-variant text-[14px]">·</span>
                  <FactScoreBadge score={heroPost.factScore} size="sm" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => toggleLike(heroPost._id, e)}
                  className={`flex items-center gap-1.5 transition-colors ${likedIds.has(heroPost._id) ? 'text-rose-500' : 'text-on-surface-variant hover:text-rose-500'}`}
                >
                  <Heart size={16} fill={likedIds.has(heroPost._id) ? 'currentColor' : 'none'} />
                  <span className="text-[13px]">{heroPost.engagement}</span>
                </button>
                {heroPost.sourceLink && (
                  <span className="text-on-surface-variant/40 hover:text-primary transition-colors">
                    <ExternalLink size={14} />
                  </span>
                )}
              </div>
            </div>
          </Link>
        </ImpressTracker>
      )}

      {/* ══════════ SUB-FEATURE GRID ══════════ */}
      {subFeatures.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-outline-variant">
          {subFeatures.map((post, i) => (
            <ImpressTracker key={post._id} postId={post._id}>
              <Link
                href={`/post/${post._id}`}
                prefetch={true}
                className={`group block px-6 py-8 animate-fade-in ${
                  i === 0 ? 'md:border-r border-b md:border-b-0 border-outline-variant' : ''
                }`}
              >
                {/* Category */}
                <div className="flex items-center gap-3 mb-4">
                  {post.category && (
                    <span className="font-label text-[10px] uppercase tracking-[0.1em] text-tertiary font-bold">
                      {post.category}
                    </span>
                  )}
                  <span className="text-[12px] text-on-surface-variant/40">{timeAgo(post.createdAt)}</span>
                </div>

                {/* Headline */}
                <h3 className="font-display text-xl md:text-2xl font-semibold text-on-surface leading-tight mb-3 group-hover:text-primary transition-colors">
                  {post.headline}<span className="text-primary/40">.</span>
                </h3>

                {/* Description */}
                <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed line-clamp-2 mb-4">
                  {post.description}
                </p>

                {/* Author + Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AuthorAvatar name={post.author?.name || '?'} size="sm" />
                    <span className="font-bold text-[13px] text-on-surface">{post.author?.name}</span>
                    {post.author?.isVerifiedAuthor && <VerifiedBadge size={14} />}
                  </div>
                  <div className="flex items-center gap-3">
                    <FactScoreBadge score={post.factScore} size="sm" />
                    <button
                      onClick={(e) => toggleLike(post._id, e)}
                      className={`flex items-center gap-1 transition-colors ${likedIds.has(post._id) ? 'text-rose-500' : 'text-on-surface-variant/40 hover:text-rose-500'}`}
                    >
                      <Heart size={14} fill={likedIds.has(post._id) ? 'currentColor' : 'none'} />
                      <span className="text-[11px]">{post.engagement}</span>
                    </button>
                  </div>
                </div>
              </Link>
            </ImpressTracker>
          ))}
        </div>
      )}

      {/* ══════════ THE BRIEF ══════════ */}
      {briefPosts.length > 0 && (
        <div className="px-6 pt-8 pb-4">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-on-surface">
            <h4 className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-on-surface">
              THE BRIEF
            </h4>
            <span className="text-tertiary-fixed text-lg">⚡</span>
          </div>

          {briefPosts.map((post) => (
            <ImpressTracker key={post._id} postId={post._id}>
              <Link
                href={`/post/${post._id}`}
                prefetch={true}
                className="group block py-5 border-b border-outline-variant/30 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Headline */}
                    <h5 className="font-display text-lg font-semibold text-on-surface group-hover:text-primary transition-colors mb-1 leading-snug">
                      {post.headline}<span className="text-primary/30">.</span>
                    </h5>
                    {/* Description */}
                    <p className="font-body text-sm text-on-surface-variant/60 line-clamp-1 mb-2">
                      {post.description}
                    </p>
                    {/* Meta row */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-on-surface-variant/50 font-bold">{post.author?.name}</span>
                        {post.author?.isVerifiedAuthor && <VerifiedBadge size={12} />}
                      </div>
                      <span className="text-[11px] text-on-surface-variant/30">{timeAgo(post.createdAt)}</span>
                      <FactScoreBadge score={post.factScore} size="sm" />
                      <button
                        onClick={(e) => toggleLike(post._id, e)}
                        className={`flex items-center gap-1 transition-colors ${likedIds.has(post._id) ? 'text-rose-500' : 'text-on-surface-variant/30 hover:text-rose-500'}`}
                      >
                        <Heart size={12} fill={likedIds.has(post._id) ? 'currentColor' : 'none'} />
                        <span className="text-[11px]">{post.engagement}</span>
                      </button>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-on-surface-variant/20 group-hover:text-primary transition-colors mt-1 shrink-0" />
                </div>
              </Link>
            </ImpressTracker>
          ))}
        </div>
      )}

      {/* ══════════ NEWSLETTER CTA ══════════ */}
      {!loading && posts.length > 0 && (
        <div className="px-6 py-16 bg-surface-container-low border-t-2 border-on-surface">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-on-surface mb-3 tracking-tight">
              Stay ahead of the curve<span className="text-primary">.</span>
            </h2>
            <p className="font-body text-sm text-on-surface-variant/60 mb-8 leading-relaxed">
              Join 50,000+ thinkers who receive our weekly deep dive into the intersections of technology and culture.
            </p>
            <div className="flex gap-0 max-w-sm mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent border-2 border-on-surface px-4 py-3 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
              />
              <button className="bg-on-surface text-surface px-6 py-3 font-label text-[10px] uppercase tracking-widest font-bold hover:bg-primary transition-colors whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ FOOTER ══════════ */}
      <div className="px-6 py-8 border-t border-outline-variant/30">
        <div className="flex items-center justify-between">
          <span className="font-display font-black text-sm text-on-surface tracking-tight">LETTR</span>
          <span className="type-label-caps text-on-surface-variant/30 text-[9px]">
            © {new Date().getFullYear()} LETTR DIGITAL CULTURE. ALL RIGHTS RESERVED.
          </span>
        </div>
      </div>
    </div>
  );
}