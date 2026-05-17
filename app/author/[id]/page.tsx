"use client";

import React, { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { LoadingQuotes } from '@/app/components/ui/LoadingQuotes';
import { FactScoreRing } from '@/app/components/ui/FactScoreRing';

type Author = {
  _id: string;
  name: string;
  image?: string;
  email?: string;
  trustScore?: number;
  followersCount?: number;
  isVerifiedAuthor?: boolean;
  role?: string;
  createdAt?: string;
  avgScore?: number;
  categories?: string[];
  totalPosts?: number;
};

type Post = {
  _id: string;
  headline: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video' | 'text';
  factScore?: number;
  createdAt?: string;
};

function formatDate(date?: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!date) return 'Recently';
  return new Date(date).toLocaleDateString('en-US', options);
}

function formatCount(value?: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function authorHandle(name?: string) {
  return `@${(name || 'author').toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
}

function ImageFallback({ label }: { label?: string }) {
  return (
    <div className="w-full h-full bg-surface-container flex items-center justify-center">
      <span className="font-display text-6xl md:text-7xl text-primary/35">{label?.charAt(0) || 'L'}</span>
    </div>
  );
}

function mediaPriority(post: Post) {
  if (post.videoUrl || post.mediaType === 'video') return 3;
  if (post.imageUrl || post.mediaType === 'image') return 2;
  return 1;
}

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

function AuthorPostCard({ post }: { post: Post }) {
  const hasVideo = Boolean(post.videoUrl || post.mediaType === 'video');
  const hasImage = Boolean(post.imageUrl);

  return (
    <Link href={`/post/${post._id}`} className="group relative block aspect-[4/5] overflow-hidden bg-on-surface text-surface">
      {hasVideo && post.videoUrl ? (
        <video
          src={post.videoUrl}
          poster={post.imageUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : hasImage ? (
        <div className="absolute inset-0 w-full h-full">
          <EditorialImage src={post.imageUrl} alt="" aspect="w-full h-full" className="opacity-85 group-hover:scale-105 transition-transform duration-500" />
        </div>
      ) : (
        <ImageFallback label={post.category || post.headline} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <span className="type-label-md bg-surface text-on-surface px-2 py-1">{post.category || 'News'}</span>
        {typeof post.factScore === 'number' && <FactScoreBadge score={post.factScore} size="sm" />}
      </div>

      {hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 border-2 border-white/80 bg-black/35 flex items-center justify-center text-white">
            <PlayCircle size={28} />
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        <span className="type-caption text-white/70 uppercase">{formatDate(post.createdAt)}</span>
        <h3 className="type-headline-sm text-white group-hover:text-primary transition-colors mt-2 line-clamp-3">
          {post.headline}
        </h3>
      </div>
    </Link>
  );
}

export default function AuthorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const authorId = unwrappedParams.id;
  
  const { data: session } = useSession();
  const router = useRouter();
  const [author, setAuthor] = useState<Author | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/authors/${authorId}`);
        if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
          return;
        }
        const data = await res.json();
        setAuthor(data.author);
        setPosts(data.posts);

        if (session?.user?.email) {
          const userRes = await fetch(`/api/user/me`);
          if (userRes.ok && userRes.headers.get('content-type')?.includes('application/json')) {
            const userData = await userRes.json();
            if (userData.user && userData.user.following) {
              setIsFollowing(userData.user.following.includes(authorId));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [authorId, session]);

  const handleFollow = async () => {
    if (!session) { router.push('/auth'); return; }
    setFollowLoading(true);
    try {
       const res = await fetch(`/api/user/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId })
       });
       if (res.ok) {
          setIsFollowing(!isFollowing);
          setAuthor((prev) => prev ? ({
             ...prev,
             followersCount: Math.max(0, (prev.followersCount || 0) + (isFollowing ? -1 : 1))
          }) : prev);
       }
    } catch (e) {
       console.error(e);
    } finally {
       setFollowLoading(false);
    }
  };

  if (loading) {
    return <LoadingQuotes />;
  }

  if (!author) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <h2 className="type-headline-md text-on-surface mb-3">Account Not Found</h2>
        <button
          type="button"
          onClick={() => router.back()}
          className="type-label-md border-2 border-on-surface px-5 py-3 text-on-surface hover:bg-on-surface hover:text-surface transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isBot = author.email?.includes('@lettr.ai');
  const authorLabel = isBot ? 'BOT' : author.isVerifiedAuthor || author.role === 'AUTHOR' ? 'AUTHOR' : 'READER';
  const sortedPosts = [...posts].sort((a, b) => {
    const priorityDiff = mediaPriority(b) - mediaPriority(a);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
  const averageScore = author.avgScore || author.trustScore || 0;
  const categories = author.categories?.length ? author.categories : ['Editorial'];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-10 xl:px-16 py-6 md:py-14">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-2 type-label-md text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowLeft size={18} />
        Back
      </button>

      <section className="grid grid-cols-1 lg:grid-cols-12 border-y-2 border-on-surface mb-12 md:mb-16">
        <div className="lg:col-span-4 lg:border-r-2 lg:border-on-surface p-0 lg:pr-8 py-8">
          <div className="aspect-[4/5] bg-surface-container overflow-hidden group">
            {author.image ? (
              <EditorialImage src={author.image} alt={author.name} aspect="w-full h-full" className="grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" />
            ) : (
              <ImageFallback label={author.name} />
            )}
          </div>
        </div>

        <div className="lg:col-span-8 py-8 lg:pl-10 flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className="type-label-md text-primary">{authorHandle(author.name)}</span>
              <span className="inline-flex items-center gap-2 type-label-md border border-outline-variant px-2 py-1 text-on-surface">
                {isBot ? <Bot size={14} /> : <ShieldCheck size={14} />}
                {authorLabel}
              </span>
              {author.isVerifiedAuthor && (
                <span className="inline-flex items-center gap-2 type-label-md text-on-surface">
                  <VerifiedBadge size={18} />
                  Verified
                </span>
              )}
            </div>

            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-8 border-b-2 border-on-surface pb-8">
              <h1 className="font-display text-5xl md:text-7xl xl:text-8xl font-bold leading-none text-on-surface uppercase max-w-[920px] break-words">
                {author.name}
              </h1>
              <button
                type="button"
                onClick={handleFollow}
                disabled={followLoading}
                className={`shrink-0 inline-flex items-center justify-center gap-2 type-label-md px-6 py-4 border-2 transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? 'border-outline-variant text-on-surface-variant hover:border-error hover:text-error'
                    : 'bg-primary border-primary text-white hover:bg-transparent hover:text-primary'
                }`}
              >
                <Users size={18} />
                {followLoading ? 'Saving' : isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            <p className="type-body-lg text-on-surface leading-relaxed max-w-[760px] mt-8">
              {isBot
                ? 'Automated intelligence gathering focused on real-time data analysis, source checks, and concise reporting.'
                : 'Independent journalist and researcher publishing verified reporting for Lettr readers.'}
            </p>

            <div className="flex flex-wrap gap-2 mt-6">
              {categories.map((category) => (
                <span key={category} className="type-label-md border border-outline-variant px-3 py-2 text-on-surface-variant">
                  {category}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-outline-variant mt-10">
            <div className="py-5 pr-4 border-r border-outline-variant">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <Users size={18} />
                <span className="type-label-md">Followers</span>
              </div>
              <span className="type-headline-sm text-on-surface">{formatCount(author.followersCount)}</span>
            </div>
            <div className="py-5 px-4 md:border-r border-outline-variant">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <FileText size={18} />
                <span className="type-label-md">Articles</span>
              </div>
              <span className="type-headline-sm text-on-surface">{formatCount(author.totalPosts || posts.length)}</span>
            </div>
            <div className="py-5 pr-4 md:px-4 border-t md:border-t-0 border-r border-outline-variant">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <ShieldCheck size={18} />
                <span className="type-label-md">Avg score</span>
              </div>
              <div className="mt-1">
                <FactScoreRing score={averageScore} size={64} strokeWidth={6} />
              </div>
            </div>
            <div className="py-5 pl-4 border-t md:border-t-0 border-outline-variant">
              <div className="flex items-center gap-2 text-on-surface-variant mb-3">
                <CalendarDays size={18} />
                <span className="type-label-md">Joined</span>
              </div>
              <span className="type-headline-sm text-on-surface">{formatDate(author.createdAt, { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button type="button" title="Message" className="w-12 h-12 border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
              <MessageCircle size={20} />
            </button>
            <a href={author.email ? `mailto:${author.email}` : undefined} title="Email" className="w-12 h-12 border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
              <Mail size={20} />
            </a>
            <button type="button" title="Website" className="w-12 h-12 border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
              <Globe size={20} />
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b-2 border-on-surface pb-4 mb-10">
        <div>
          <span className="type-label-md text-primary">Latest first</span>
          <h2 className="type-headline-sm text-on-surface mt-1">Selected Works</h2>
        </div>
        <span className="type-label-md text-on-surface-variant">{posts.length} published</span>
      </div>

      {sortedPosts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {sortedPosts.map(post => (
            <AuthorPostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-outline-variant text-on-surface-variant">
          <p className="type-body-lg">No articles published yet.</p>
        </div>
      )}

    </div>
  );
}
