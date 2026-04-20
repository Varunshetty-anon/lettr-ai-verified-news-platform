"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, ExternalLink, Shield, CheckCircle, Image as ImageIcon } from 'lucide-react';
import HoverVideoPlayer from '@/app/components/ui/HoverVideoPlayer';

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

import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function Skeleton() {
  return (
    <div className="flex flex-col gap-3 px-5 py-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-surface-container-low border border-outline-variant/20 p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-3 bg-surface-container-high rounded w-20" />
            <div className="h-3 bg-surface-container-high rounded w-14" />
          </div>
          <div className="h-5 bg-surface-container-high rounded w-4/5 mb-2" />
          <div className="h-3.5 bg-surface-container-high rounded w-full mb-1.5" />
          <div className="h-3.5 bg-surface-container-high rounded w-3/5" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Redirect new users to onboarding
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      fetch(`/api/user/preferences?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.preferences || data.preferences.length === 0) {
            router.push('/onboarding/preferences');
          }
        })
        .catch(() => {});
    }
  }, [session, status, router]);

  const email = session?.user?.email || '';
  const apiUrl = `/api/posts${email ? `?email=${encodeURIComponent(email)}` : ''}`;
  
  const { data, error, isLoading } = useSWR(apiUrl, fetcher, { 
    refreshInterval: 10000, // Background poll every 10s
    revalidateOnFocus: true, // Instant update on tab switch
  });

  // Explicit simple polling requested by user
  useEffect(() => {
    if (!apiUrl) return;
    const interval = setInterval(() => {
      mutate(apiUrl); // fetchLatestPosts equivalent
    }, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const posts: PostData[] = data?.posts || [];
  const loading = isLoading || status === 'loading';

  // Sync initial liked state
  useEffect(() => {
    if (data?.posts) {
      setLikedIds(prev => {
        const next = new Set(prev);
        data.posts.forEach((p: PostData) => { if (p.isLiked) next.add(p._id); });
        return next;
      });
    }
  }, [data]);

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isLiked = likedIds.has(postId);
    const next = new Set(likedIds);
    if (isLiked) next.delete(postId); else next.add(postId);
    setLikedIds(next);

    // Optimistic SWR update
    if (apiUrl) {
      mutate(apiUrl, {
        posts: posts.map(p => p._id === postId ? { ...p, engagement: p.engagement + (isLiked ? -1 : 1) } : p)
      }, false);
    }

    await fetch(`/api/user/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, postId, action: isLiked ? 'unlike' : 'like' })
    }).catch(() => {});
  };

  const firstName = session?.user?.name?.split(' ')[0] || '';

  if (status === 'loading') return <Skeleton />;

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 border-b border-outline-variant">
        <div className="flex items-baseline justify-between">
          <div>
            {firstName && (
              <h1 className="font-display text-xl font-bold text-on-surface mb-0.5">
                Hello, {firstName}
              </h1>
            )}
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/50">
              AI-verified · Personalized Feed
            </p>
          </div>
          {!loading && <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-wider">{posts.length} articles</span>}
        </div>
      </div>

      {loading && <Skeleton />}

      {!loading && posts.length === 0 && (
        <div className="px-5 py-20 text-center">
          <h2 className="font-display text-lg text-on-surface mb-2">No articles yet</h2>
          <p className="font-body text-sm text-on-surface-variant/50 max-w-xs mx-auto">
            The bot network is seeding content automatically. Articles will appear shortly.
          </p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="flex flex-col gap-2.5 p-4">
          {posts.map((post) => (
            <Link
              key={post._id}
              href={`/post/${post._id}`}
              className="group block bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all duration-200 animate-fade-in"
            >
              {/* Media thumbnail */}
              {post.imageUrl && (
                <div className="w-full overflow-hidden border-b border-outline-variant/30">
                  <img src={post.imageUrl} alt="" loading="lazy" className="rounded-t-lg w-full object-cover group-hover:scale-[1.02] transition-transform duration-300" style={{ maxHeight: '300px' }} />
                </div>
              )}
              {post.videoUrl && (
                <HoverVideoPlayer src={post.videoUrl} />
              )}

              <div className="p-5">
                {/* Top row: author + score badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.author && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-label text-xs font-medium text-on-surface">{post.author.name}</span>
                        {post.author.role === 'AUTHOR' && (
                          <span className="font-label text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-sm">Bot</span>
                        )}
                        {post.author.isVerifiedAuthor && (
                          <CheckCircle size={12} className="text-accent" />
                        )}
                      </div>
                    )}
                    <span className="text-outline-variant">·</span>
                    <span className="font-label text-[10px] text-on-surface-variant/50">{timeAgo(post.createdAt)}</span>
                    {post.category && (
                      <>
                        <span className="text-outline-variant">·</span>
                        <span className="font-label text-[10px] text-primary/60 uppercase tracking-wider">{post.category}</span>
                      </>
                    )}
                  </div>

                  {/* Small fact score badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 border text-xs font-bold font-display ${
                    post.factScore >= 80 
                      ? 'border-emerald-300/30 text-emerald-600 dark:text-emerald-400 dark:border-emerald-700/30' 
                      : post.factScore >= 60 
                        ? 'border-amber-300/30 text-amber-600 dark:text-amber-400 dark:border-amber-700/30' 
                        : 'border-red-300/30 text-red-600 dark:text-red-400 dark:border-red-700/30'
                  }`}>
                    <Shield size={10} />
                    {post.factScore}
                  </div>
                </div>

                {/* Headline */}
                <h3 className="font-display text-lg font-bold text-on-surface leading-snug mb-2 group-hover:text-primary transition-colors">
                  {post.headline}
                </h3>

                {/* Description — show more lines */}
                <p className="font-body text-sm text-on-surface-variant leading-relaxed line-clamp-3 mb-3">
                  {post.description}
                </p>

                {/* Bottom row: actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {post.reasoning && (
                      <span className="font-body text-[10px] text-on-surface-variant/40 italic truncate max-w-[220px]">
                        AI: {post.reasoning}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {post.sourceLink && (
                      <span className="font-label text-[10px] text-primary/50 flex items-center gap-1">
                        <ExternalLink size={10} /> Source
                      </span>
                    )}
                    <button
                      onClick={(e) => toggleLike(post._id, e)}
                      className="flex items-center gap-1 text-on-surface-variant/40 hover:text-red-500 transition-colors"
                    >
                      <Heart size={14} fill={likedIds.has(post._id) ? 'currentColor' : 'none'} className={likedIds.has(post._id) ? 'text-red-500' : ''} />
                      <span className="font-label text-[10px]">{post.engagement}</span>
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
