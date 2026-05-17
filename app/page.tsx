"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';
import ImpressTracker from '@/app/components/ui/ImpressTracker';

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
  author: { _id: string; name: string; trustScore: number; role: string; isVerifiedAuthor: boolean } | null;
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

// Category Color Helper for badges
const getCategoryColorClass = (cat?: string) => {
  const normalized = cat?.toLowerCase() || '';
  if (normalized.includes('tech')) return 'bg-primary text-on-primary';
  if (normalized.includes('culture')) return 'bg-tertiary-fixed text-on-surface';
  return 'bg-secondary text-on-primary';
};

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

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

  const { data, isLoading, mutate } = useSWR(`/api/posts`, fetcher, {
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
        <ImpressTracker postId={heroPost._id}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] mb-[48px] md:mb-[64px] border-b border-outline-variant pb-[48px]">
            
            {/* Desktop col-span-8: Image with badge overlay */}
            <div className="lg:col-span-8 order-2 lg:order-1 relative  overflow-hidden">
              {heroPost.imageUrl ? (
                <img src={heroPost.imageUrl} alt={heroPost.headline} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                  <span className="type-caption text-on-surface-variant">Image Unavailable</span>
                </div>
              )}
              {heroPost.category && (
                <div className="absolute top-0 left-0 bg-surface border-b border-r border-on-surface px-3 py-1.5">
                  <span className="type-label-md">{heroPost.category}</span>
                </div>
              )}
            </div>

            {/* Desktop col-span-4: Text content */}
            <div className="lg:col-span-4 order-1 lg:order-2 flex flex-col justify-center">
              {/* Mobile Only: Category Tag (since image overlay is tricky on mobile stacking) */}
              <div className="lg:hidden mb-4">
                 {heroPost.category && (
                   <span className={`type-label-md px-2 py-1 ${getCategoryColorClass(heroPost.category)}`}>
                     {heroPost.category}
                   </span>
                 )}
              </div>

              <Link href={`/post/${heroPost._id}`} className="group block mb-6">
                <h2 className="type-display-xl-mobile lg:text-[72px] lg:leading-[1.1] text-on-surface group-hover:text-primary transition-colors uppercase mb-6">
                  {heroPost.headline}
                </h2>
                <p className="type-body-md text-on-surface-variant line-clamp-3 mb-6">
                  {heroPost.description}
                </p>
                <div className="flex items-center gap-2 type-label-md text-primary">
                  <span>READ STORY</span>
                  <span className="text-on-surface-variant lowercase">· 5 min read</span>
                </div>
              </Link>

              {/* Author / Meta Row */}
              <div className="flex items-center justify-between pt-6 border-t border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="w-[32px] h-[32px] bg-surface-container-highest grayscale">
                    {heroPost.author?.name ? <span className="flex items-center justify-center w-full h-full type-label-md">{heroPost.author.name.charAt(0)}</span> : null}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="type-label-md">{heroPost.author?.name}</span>
                      {heroPost.author?.isVerifiedAuthor && <VerifiedBadge size={14} />}
                    </div>
                    <span className="type-caption text-on-surface-variant">{timeAgo(heroPost.createdAt)}</span>
                  </div>
                </div>
                <FactScoreBadge score={heroPost.factScore} size="sm" />
              </div>
            </div>

          </div>
        </ImpressTracker>
      )}

      {/* ══════════ SECONDARY GRID (12-COL) ══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] lg:gap-[64px]">
        
        {/* col-span-7: Stacked Articles */}
        <div className="lg:col-span-7 flex flex-col gap-[48px]">
          {/* First Stacked Article (2-col sub-grid) */}
          {stackedPost1 && (
            <ImpressTracker postId={stackedPost1._id}>
              <Link href={`/post/${stackedPost1._id}`} className="group grid grid-cols-1 md:grid-cols-2 gap-[24px] border-b border-outline-variant pb-[48px]">
                <div className="flex flex-col order-2 md:order-1">
                  {stackedPost1.category && (
                    <span className={`type-label-md self-start px-2 py-1 mb-4 ${getCategoryColorClass(stackedPost1.category)}`}>
                      {stackedPost1.category}
                    </span>
                  )}
                  <h3 className="type-headline-md text-on-surface group-hover:text-primary transition-colors mb-3">
                    {stackedPost1.headline}
                  </h3>
                  <p className="type-body-md text-on-surface-variant line-clamp-3 mb-6">
                    {stackedPost1.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant">
                    <div className="flex items-center gap-2">
                       <span className="type-label-md">{stackedPost1.author?.name}</span>
                    </div>
                    <span className="type-caption text-on-surface-variant">{timeAgo(stackedPost1.createdAt)}</span>
                  </div>
                </div>
                <div className=" overflow-hidden order-1 md:order-2">
                  {stackedPost1.imageUrl && <img src={stackedPost1.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
              </Link>
            </ImpressTracker>
          )}

          {/* Second Stacked Article (Full width) */}
          {stackedPost2 && (
            <ImpressTracker postId={stackedPost2._id}>
              <Link href={`/post/${stackedPost2._id}`} className="group block border-b border-outline-variant pb-[48px] lg:border-none lg:pb-0">
                {stackedPost2.category && (
                  <span className={`type-label-md inline-block px-2 py-1 mb-4 ${getCategoryColorClass(stackedPost2.category)}`}>
                    {stackedPost2.category}
                  </span>
                )}
                <h3 className="type-headline-lg-mobile md:type-headline-lg text-on-surface group-hover:text-primary transition-colors mb-4">
                  {stackedPost2.headline}
                </h3>
                <div className=" overflow-hidden mb-6">
                  {stackedPost2.imageUrl && <img src={stackedPost2.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="type-label-md">{stackedPost2.author?.name}</span>
                    <FactScoreBadge score={stackedPost2.factScore} size="sm" />
                  </div>
                  <span className="type-caption text-on-surface-variant">{timeAgo(stackedPost2.createdAt)}</span>
                </div>
              </Link>
            </ImpressTracker>
          )}
        </div>

        {/* col-span-5: THE BRIEF & Lifestyle */}
        <div className="lg:col-span-5 flex flex-col gap-[48px]">
          
          {/* THE BRIEF Panel */}
          {briefPosts.length > 0 && (
            <div className="bg-surface-container p-[24px]">
              <div className="border-b-2 border-on-surface pb-[12px] mb-[24px]">
                <h4 className="type-label-md text-on-surface">THE BRIEF</h4>
              </div>
              
              <div className="flex flex-col gap-[24px]">
                {briefPosts.map((post, idx) => (
                  <ImpressTracker key={post._id} postId={post._id}>
                    <Link href={`/post/${post._id}`} className="group block border-b border-outline-variant pb-[24px] last:border-0 last:pb-0">
                      <div className="flex gap-4">
                        <span className="type-label-md text-on-surface-variant">0{idx + 1}</span>
                        <div className="flex-1">
                          <h5 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors mb-2">
                            {post.headline}
                          </h5>
                          <p className="type-body-md text-on-surface-variant line-clamp-2">
                            {post.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </ImpressTracker>
                ))}
              </div>

              <Link href="/explore" className="block w-full text-center mt-[32px] border border-on-surface py-3 type-label-md hover:bg-on-surface hover:text-surface transition-colors">
                VIEW ALL RECENT
              </Link>
            </div>
          )}

          {/* Lifestyle Article Below Brief */}
          {lifestylePost && (
            <ImpressTracker postId={lifestylePost._id}>
              <Link href={`/post/${lifestylePost._id}`} className="group block">
                <div className=" overflow-hidden mb-4">
                  {lifestylePost.imageUrl && <img src={lifestylePost.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                {lifestylePost.category && (
                  <span className={`type-label-md inline-block px-2 py-1 mb-3 ${getCategoryColorClass(lifestylePost.category)}`}>
                    {lifestylePost.category}
                  </span>
                )}
                <h3 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors mb-2">
                  {lifestylePost.headline}
                </h3>
                <p className="type-body-md text-on-surface-variant line-clamp-2 mb-4">
                  {lifestylePost.description}
                </p>
                <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                  <span className="type-label-md">{lifestylePost.author?.name}</span>
                  <span className="type-caption text-on-surface-variant">{timeAgo(lifestylePost.createdAt)}</span>
                </div>
              </Link>
            </ImpressTracker>
          )}

        </div>
      </div>

    </div>
  );
}
