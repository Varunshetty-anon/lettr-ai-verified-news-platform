"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, ExternalLink, Shield, CheckCircle, Image as ImageIcon } from 'lucide-react';
import HoverVideoPlayer from '@/app/components/ui/HoverVideoPlayer';
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
    refreshInterval: 0, // Disabled auto background refresh to prevent jumpy UX
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

    // Optimistic SWR update
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

      {hasNewPosts && (
        <div className="sticky top-[104px] z-30 flex justify-center mt-4 -mb-2">
          <button 
            onClick={loadNewPosts}
            className="px-4 py-2 bg-primary text-on-primary font-label text-[10px] uppercase tracking-widest font-bold shadow-lg shadow-primary/20 rounded-full hover:scale-105 transition-transform"
          >
            New Posts Available ↑
          </button>
        </div>
      )}

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
        <div className="columns-1 sm:columns-2 gap-4 space-y-4 pb-4">
          {posts.map((post) => (
            <ImpressTracker key={post._id} postId={post._id}>
              <Link
                href={`/post/${post._id}`}
                prefetch={true}
                className="group block bg-surface border border-outline-variant hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in p-5 rounded-sm break-inside-avoid"
              >
              <div className="flex gap-3">
                {/* Left side: Avatar */}
                <div className="w-8 h-8 shrink-0 rounded-sm bg-surface-variant overflow-hidden flex items-center justify-center border border-outline-variant/50">
                  {post.author ? (
                     <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">{post.author.name?.charAt(0)}</div>
                  ) : (
                     <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">?</div>
                  )}
                </div>

                {/* Right side: Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row: Name, Handle, Time, Badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-3 border-b border-outline-variant/30 pb-2">
                    {post.author && (
                      <a href={`/author/${post.author._id}`} onClick={(e) => e.stopPropagation()} className="font-bold text-[15px] text-on-surface hover:underline">{post.author.name}</a>
                    )}
                    {post.author?.isVerifiedAuthor && (
                        <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[16px] h-[16px] fill-primary shrink-0"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
                    )}
                    {post.author && (
                      <span className="text-[15px] text-on-surface-variant truncate max-w-[100px] sm:max-w-[200px]">
                        @{post.author.name?.toLowerCase().replace(/\s+/g, '')}
                      </span>
                    )}
                    <span className="text-[15px] text-on-surface-variant">·</span>
                    <span className="text-[15px] text-on-surface-variant hover:underline">{timeAgo(post.createdAt)}</span>

                    {post.author?.email?.includes('@lettr.ai') && (
                        <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant font-bold rounded">BOT</span>
                    )}
                  </div>

                  {/* Content: Headline and Body */}
                  <h3 className="font-display text-2xl font-black text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors">
                    {post.headline}
                  </h3>
                  <p className="font-body text-base text-on-surface-variant/90 leading-relaxed mb-4 whitespace-pre-wrap">
                    {post.description}
                  </p>

                  {/* Media */}
                  {(post.imageUrl || post.videoUrl) && (
                    <div className="mt-4 mb-4 overflow-hidden border border-outline-variant/50 relative bg-surface-container-low max-h-[400px]">
                      {post.imageUrl && !post.videoUrl && (
                        <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      )}
                      {post.videoUrl && (
                        <div className="w-full relative h-full">
                           <HoverVideoPlayer src={post.videoUrl} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Community Note Integration */}
                  <div className="mt-4 mb-4 bg-surface-container-low p-4 border-l-4 border-l-primary/40 relative">
                     <div className="flex items-start gap-2">
                        <Shield size={16} className={post.factScore >= 80 ? 'text-emerald-500 mt-0.5' : post.factScore >= 60 ? 'text-amber-500 mt-0.5' : 'text-red-500 mt-0.5'} />
                        <div className="flex-1">
                           <p className="text-[13px] font-bold text-on-surface mb-0.5">
                             Readers added context they thought people might want to know
                           </p>
                           {post.reasoning && (
                             <p className="text-[13px] text-on-surface-variant leading-relaxed">
                               {post.reasoning}
                             </p>
                           )}
                           <div className="mt-2 flex items-center justify-between">
                              <span className="text-[12px] text-on-surface-variant/70 font-medium border border-outline-variant/50 rounded-full px-2 py-0.5">
                                AI Fact Score: {post.factScore}/100
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between text-on-surface-variant max-w-md mt-1">
                    <button className="flex items-center gap-2 group/btn transition-colors">
                      <div className="p-2 rounded-full group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g></svg>
                      </div>
                      <span className="text-[13px] group-hover/btn:text-primary">12</span>
                    </button>

                    <button className="flex items-center gap-2 group/btn transition-colors">
                      <div className="p-2 rounded-full group-hover/btn:bg-emerald-500/10 group-hover/btn:text-emerald-500 transition-colors">
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g></svg>
                      </div>
                      <span className="text-[13px] group-hover/btn:text-emerald-500">4</span>
                    </button>

                    <button
                      onClick={(e) => toggleLike(post._id, e)}
                      className={`flex items-center gap-2 group/btn transition-colors ${likedIds.has(post._id) ? 'text-rose-500' : ''}`}
                    >
                      <div className="p-2 rounded-full group-hover/btn:bg-rose-500/10 group-hover/btn:text-rose-500 transition-colors">
                        {likedIds.has(post._id) ? (
                           <Heart size={20} fill="currentColor" className="text-rose-500" />
                        ) : (
                           <Heart size={20} />
                        )}
                      </div>
                      <span className={`text-[13px] ${likedIds.has(post._id) ? '' : 'group-hover/btn:text-rose-500'}`}>{post.engagement}</span>
                    </button>

                    <button className="flex items-center gap-2 group/btn transition-colors">
                      <div className="p-2 rounded-full group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
                        <ExternalLink size={20} />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </Link>
            </ImpressTracker>
          ))}
        </div>
      )}
    </div>
  );
}