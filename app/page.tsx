"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';
import ImpressTracker from '@/app/components/ui/ImpressTracker';
import { Heart, Bot } from 'lucide-react';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  category?: string;
  imageUrl?: string;
  engagement: number;
  createdAt: string;
  isLiked?: boolean;
  author: { _id: string; name: string; trustScore: number; role: string; email?: string; isVerifiedAuthor: boolean } | null;
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

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Unable to load feed');
  }
  return res.json();
};

const getCategoryColorClass = (cat?: string) => {
  const normalized = cat?.toLowerCase() || '';
  if (normalized.includes('tech')) return 'bg-primary text-on-primary';
  if (normalized.includes('culture')) return 'bg-tertiary-fixed text-on-surface';
  return 'bg-secondary text-on-primary';
};

const isBot = (author: any) => {
  if (!author) return false;
  return author.role?.toLowerCase() === 'bot' || author.email?.includes('@lettr.ai') || author.name?.toLowerCase().includes('bot');
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(20);

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

  const { data, isLoading, mutate } = useSWR(`/api/posts?limit=${displayCount}&sort=ranked`, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const posts: PostData[] = data?.posts || [];
  const loading = isLoading && posts.length === 0;
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const latestPostId = posts[0]?._id;
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    if (!latestPostId) return;

    const checkForNewPosts = async () => {
      try {
        const res = await fetch('/api/posts?sort=recent', { cache: 'no-store' });
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
        const nextData = await res.json();
        const newestId = nextData?.posts?.[0]?._id;
        if (newestId && newestId !== latestPostId) {
          setHasNewPosts(true);
        }
      } catch {}
    };

    const interval = window.setInterval(checkForNewPosts, 60000);
    return () => window.clearInterval(interval);
  }, [latestPostId]);

  if (loading || status === 'loading') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] mt-8">
        <PostSkeleton variant="hero" />
      </div>
    );
  }

  const heroPost = posts[0];
  const stackedPost1 = posts[1];
  const stackedPost2 = posts[2];
  const briefPosts = posts.slice(3, 6);
  const lifestylePost = posts[6];
  const remainingPosts = posts.slice(7);

  const renderCard = (post: PostData, isHero = false, isStacked = false) => {
    const headlineClass = isHero 
      ? "text-[clamp(28px,4vw,56px)] font-headline font-bold tracking-tight leading-[1.1] text-on-surface group-hover:text-primary transition-colors mb-6"
      : "text-[clamp(18px,2vw,32px)] font-headline font-semibold leading-[1.2] tracking-tight text-on-surface group-hover:text-primary transition-colors mb-3";

    return (
      <ImpressTracker postId={post._id} key={post._id}>
        <Link href={`/post/${post._id}`} className={`group block ${isStacked ? 'border-b border-outline-variant pb-[48px] lg:border-none lg:pb-0' : 'h-full flex flex-col'}`}>
          {!isHero && !isStacked && post.imageUrl && (
            <div className="aspect-video w-full mb-4 overflow-hidden bg-surface-container-highest">
              <img src={post.imageUrl} alt={post.headline} onError={(e) => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          {!isHero && !isStacked && !post.imageUrl && (
            <div className={`aspect-video w-full mb-4 flex items-center justify-center ${getCategoryColorClass(post.category)} opacity-20`}></div>
          )}

          {post.category && (
            <span className={`type-label-md inline-block px-2 py-1 mb-4 ${getCategoryColorClass(post.category)}`}>
              {post.category}
            </span>
          )}
          <h3 className={headlineClass}>
            {post.headline}
          </h3>
          <p className="type-body-md text-on-surface-variant line-clamp-2 mb-6 flex-grow">
            {post.description}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant mt-auto">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="type-label-md">{post.author?.name || 'Editorial'}</span>
                {post.author?.isVerifiedAuthor && <VerifiedBadge size={14} />}
                {isBot(post.author) && <Bot size={14} className="text-on-surface-variant" />}
              </div>
              <FactScoreBadge score={post.factScore} size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <span className="type-caption text-on-surface-variant">{timeAgo(post.createdAt)}</span>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <Heart size={14} />
                <span className="type-caption">{post.engagement || 0}</span>
              </div>
            </div>
          </div>
        </Link>
      </ImpressTracker>
    );
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-[32px] border-b-2 border-on-surface pb-[16px]">
        <div>
          <span className="type-label-md text-primary">Personalized feed</span>
          <h1 className="type-headline-sm text-on-surface mt-1">Hello, {firstName}</h1>
        </div>
        {hasNewPosts && (
          <button
            type="button"
            onClick={() => {
              setHasNewPosts(false);
              mutate();
            }}
            className="type-label-md bg-primary text-white px-5 py-3 hover:bg-on-surface transition-colors"
          >
            New Posts Available
          </button>
        )}
      </div>
      
      {/* ══════════ HERO SECTION (12-COL GRID) ══════════ */}
      {heroPost && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-[48px] mb-[64px]">
          <div className="lg:col-span-8 flex flex-col relative">
            <ImpressTracker postId={heroPost._id}>
              <Link href={`/post/${heroPost._id}`} className="group block">
                {heroPost.imageUrl ? (
                  <div className="aspect-[16/9] w-full mb-6 overflow-hidden bg-surface-container-highest">
                    <img src={heroPost.imageUrl} alt={heroPost.headline} onError={(e) => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className={`aspect-[16/9] w-full mb-6 ${getCategoryColorClass(heroPost.category)} opacity-20`} />
                )}
                {heroPost.category && (
                  <span className={`type-label-md inline-block px-2 py-1 mb-4 ${getCategoryColorClass(heroPost.category)}`}>
                    {heroPost.category}
                  </span>
                )}
                <h2 className="text-[clamp(28px,4vw,56px)] font-headline font-bold leading-[1.05] tracking-tight text-on-surface mb-4 group-hover:text-primary transition-colors normal-case">
                  {heroPost.headline}
                </h2>
                <p className="type-body-lg text-on-surface-variant line-clamp-3 mb-6 max-w-[800px]">
                  {heroPost.description}
                </p>
                <div className="flex items-center gap-4 pt-6 border-t-2 border-on-surface mt-auto">
                  <div className="flex items-center gap-2">
                    <span className="type-label-md">{heroPost.author?.name || 'Editorial'}</span>
                    {heroPost.author?.isVerifiedAuthor && <VerifiedBadge size={16} />}
                    {isBot(heroPost.author) && <Bot size={16} className="text-on-surface-variant" />}
                  </div>
                  <FactScoreBadge score={heroPost.factScore} size="md" />
                  <span className="type-caption text-on-surface-variant hidden sm:inline ml-auto">{timeAgo(heroPost.createdAt)}</span>
                </div>
              </Link>
            </ImpressTracker>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-[48px] lg:border-l-2 lg:border-on-surface lg:pl-[48px]">
            {stackedPost1 && renderCard(stackedPost1, false, true)}
            {stackedPost2 && renderCard(stackedPost2, false, true)}
          </div>
        </div>
      )}

      {/* ══════════ THE BRIEF (3-COL GRID) ══════════ */}
      {briefPosts.length > 0 && (
        <div className="mb-[64px] border-t-2 border-on-surface pt-[24px]">
          <h3 className="type-label-md text-on-surface mb-[32px] uppercase">The Brief</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[32px] md:gap-[48px]">
            {briefPosts.map(post => renderCard(post))}
          </div>
        </div>
      )}

      {/* ══════════ LIFESTYLE / FEATURE (FULL WIDTH) ══════════ */}
      {lifestylePost && (
        <div className="mb-[64px] border-y-2 border-on-surface py-[48px] bg-surface-container-low px-[24px] lg:px-[64px] -mx-[16px] md:-mx-[64px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[48px] max-w-[1440px] mx-auto items-center">
             <div className="lg:col-span-6 order-2 lg:order-1">
                {renderCard(lifestylePost, true)}
             </div>
             <div className="lg:col-span-6 order-1 lg:order-2">
                {lifestylePost.imageUrl && (
                   <div className="aspect-[4/3] w-full overflow-hidden border-2 border-on-surface">
                     <img src={lifestylePost.imageUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} className="w-full h-full object-cover" />
                   </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* ══════════ LATEST STORIES (GRID + LOAD MORE) ══════════ */}
      {remainingPosts.length > 0 && (
        <div>
          <h3 className="type-label-md text-on-surface border-b-2 border-on-surface pb-[12px] mb-[32px] uppercase">More Stories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[24px] md:gap-[32px] lg:gap-[48px]">
            {remainingPosts.map(post => renderCard(post))}
          </div>
          
          <div className="mt-[64px] text-center border-t border-outline-variant pt-[48px]">
            <button 
              onClick={() => setDisplayCount(prev => prev + 20)}
              className="type-label-md border-2 border-on-surface text-on-surface px-[32px] py-[16px] hover:bg-on-surface hover:text-surface transition-colors"
            >
              LOAD MORE
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
