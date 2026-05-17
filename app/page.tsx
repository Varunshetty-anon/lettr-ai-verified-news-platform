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
  likes?: string[];
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

const cleanSummary = (text: string) => text
  ?.replace(/https?:\/\/\S+/g, '')
  ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  ?.replace(/Link posted:.*$/gm, '')
  ?.replace(/Source:.*$/gm, '')
  ?.replace(/[\*\_#`~>+\-\=]/g, '')
  ?.replace(/\s+/g, ' ')
  ?.trim()
  ?.slice(0, 160) || '';

const isBot = (author: any) => {
  if (!author) return false;
  return author.role?.toLowerCase() === 'bot' || author.email?.includes('@lettr.ai') || author.name?.toLowerCase().includes('bot');
};

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

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [displayCount, setDisplayCount] = useState(20);
  const [localPosts, setLocalPosts] = useState<PostData[]>([]);
  const [newStoriesCount, setNewStoriesCount] = useState(0);
  const [pendingNewPosts, setPendingNewPosts] = useState<PostData[]>([]);

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

  const { data, isLoading } = useSWR(`/api/posts?limit=${displayCount}&sort=ranked`, fetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true,
  });

  const rawPosts: PostData[] = data?.posts || [];

  useEffect(() => {
    if (rawPosts.length > 0) {
      setLocalPosts(rawPosts);
    }
  }, [rawPosts]);

  const loading = isLoading && localPosts.length === 0;
  const latestPostId = localPosts[0]?._id;
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    if (!latestPostId) return;

    const checkForNewPosts = async () => {
      try {
        const res = await fetch('/api/posts?sort=recent', { cache: 'no-store' });
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return;
        const nextData = await res.json();
        const nextPosts = nextData?.posts || [];
        const newPostsList = nextPosts.filter((np: any) => !localPosts.some(p => p._id === np._id));
        if (newPostsList.length > 0) {
          setNewStoriesCount(newPostsList.length);
          setPendingNewPosts(newPostsList);
        }
      } catch {}
    };

    const interval = window.setInterval(checkForNewPosts, 60000);
    return () => window.clearInterval(interval);
  }, [latestPostId, localPosts]);

  if (loading || status === 'loading') {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] mt-8">
        <PostSkeleton variant="hero" />
      </div>
    );
  }

  const readyPosts = localPosts.filter(post => {
    if (!post.headline || !post.description) return false;
    if (typeof post.factScore !== 'number') return false;
    if (!post.imageUrl) return false; // Ensure feed posts are fully loaded with media
    return true;
  });

  const heroPost = readyPosts[0];
  const stackedPost1 = readyPosts[1];
  const stackedPost2 = readyPosts[2];
  const briefPosts = readyPosts.slice(3, 6);
  const lifestylePost = readyPosts[6];
  const remainingPosts = readyPosts.slice(7);

  const renderCard = (post: PostData, isHero = false, isStacked = false) => {
    const headlineClass = isHero 
      ? "text-[clamp(28px,4vw,56px)] font-headline font-bold tracking-tight leading-[1.1] text-on-surface group-hover:text-primary transition-colors mb-6"
      : "text-[clamp(18px,2vw,32px)] font-headline font-semibold leading-[1.2] tracking-tight text-on-surface group-hover:text-primary transition-colors mb-3";

    return (
      <ImpressTracker postId={post._id} key={post._id}>
        <Link href={`/post/${post._id}`} className={`group block ${isStacked ? 'border-b border-outline-variant pb-[48px] lg:border-none lg:pb-0' : 'h-full flex flex-col'}`}>
          {!isHero && !isStacked && post.imageUrl && (
            <div className="aspect-video w-full mb-4 overflow-hidden">
              <EditorialImage src={post.imageUrl} alt={post.headline} className="group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          {post.category && (
            <span className={`type-label-md inline-block px-2 py-1 mb-4 ${getCategoryColorClass(post.category)}`}>
              {post.category}
            </span>
          )}
          <h3 className={`${headlineClass} headline-clamp`}>
            {post.headline}
          </h3>
          <p className="type-body-md text-on-surface-variant line-clamp-2 mb-6 flex-grow">
            {cleanSummary(post.description)}
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
                <span className="type-caption">{post.likes?.length || post.engagement || 0}</span>
              </div>
            </div>
          </div>
        </Link>
      </ImpressTracker>
    );
  };

  const handleMergeNewPosts = () => {
    setLocalPosts(prev => {
      const uniquePending = pendingNewPosts.filter(np => !prev.some(p => p._id === np._id));
      return [...uniquePending, ...prev];
    });
    setNewStoriesCount(0);
    setPendingNewPosts([]);
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-[32px] border-b-2 border-on-surface pb-[16px]">
        <div>
          <span className="type-label-md text-primary">Personalized feed</span>
          <h1 className="type-headline-sm text-on-surface mt-1">Hello, {firstName}</h1>
        </div>
        {newStoriesCount > 0 && (
          <button
            type="button"
            onClick={handleMergeNewPosts}
            className="type-label-md bg-primary text-white px-5 py-3 hover:bg-on-surface transition-colors animate-pulse"
          >
            {newStoriesCount} new stories
          </button>
        )}
      </div>
      
      {/* ══════════ HERO SECTION ══════════ */}
      {heroPost && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-b border-outline-variant mb-8">
          {/* Left: Image */}
          <div className="relative overflow-hidden" style={{height: '500px'}}>
            <EditorialImage src={heroPost.imageUrl} alt={heroPost.headline} aspect="h-full w-full" />
          </div>
          {/* Right: Content */}
          <Link href={`/post/${heroPost._id}`} className="p-8 flex flex-col justify-center bg-surface group">
            <span className="type-label-md text-primary mb-4 uppercase">{heroPost.category}</span>
            <h1 className="type-headline-lg mb-6 normal-case group-hover:text-primary transition-colors headline-clamp-3">{heroPost.headline}</h1>
            <p className="type-body-md text-on-surface-variant mb-6 line-clamp-4">{cleanSummary(heroPost.description)}</p>
            <div className="flex items-center gap-4">
              <span className="type-label-md text-on-surface-variant">{heroPost.author?.name}</span>
              <FactScoreBadge score={heroPost.factScore} size="sm" />
            </div>
          </Link>
        </div>
      )}

      {/* ══════════ SECONDARY POSTS (LIST) ══════════ */}
      <div className="flex flex-col gap-6 mb-12">
        {[stackedPost1, stackedPost2].filter(Boolean).map(post => (
          <article key={post._id} className="flex gap-4 border-b border-outline-variant py-6 cursor-pointer hover:bg-surface-container transition-colors px-4 -mx-4"
            onClick={() => router.push(`/post/${post._id}`)}>
            {post.imageUrl && (
              <div className="w-32 h-24 flex-shrink-0 overflow-hidden">
                <EditorialImage src={post.imageUrl} alt={post.headline} aspect="w-full h-full" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="type-label-md text-primary mb-1 block uppercase">{post.category}</span>
              <h3 className="type-headline-sm normal-case mb-2 headline-clamp">{post.headline}</h3>
              <p className="type-caption text-on-surface-variant line-clamp-2 mb-2">{cleanSummary(post.description)}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="type-caption text-on-surface-variant">{post.author?.name}</span>
                <FactScoreBadge score={post.factScore} size="sm" />
                <span className="type-caption text-on-surface-variant ml-auto">{timeAgo(post.createdAt)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>

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
                     <EditorialImage src={lifestylePost.imageUrl} alt="" aspect="w-full h-full" />
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
