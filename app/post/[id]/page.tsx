"use client";

import React, { use, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { PostSkeleton } from '@/app/components/ui/PostSkeleton';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';
import { Bot, Check, ExternalLink, Heart, Share2, UserPlus } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Unable to load data');
  }
  return res.json();
};

function getSourceLinks(value?: string) {
  if (!value) return [];
  return value
    .split(/[\s,\n]+/)
    .map((link) => link.trim())
    .filter((link) => /^https?:\/\//i.test(link));
}

function sourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
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

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const { data: session } = useSession();

  const { data, error, isLoading } = useSWR(`/api/posts/${postId}`, fetcher);
  const post = data?.post;
  const { data: moreLikeThisData } = useSWR(`/api/posts?sort=recent`, fetcher);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (post) {
      setLikeCount(post.likes?.length || post.engagement || 0);
      setIsLiked(post.likes?.includes((session?.user as any)?.id) || false);
    }
  }, [post, session]);

  useEffect(() => {
    if (postId && session?.user?.email) {
      fetch(`/api/user/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: postId, action: 'view' })
      }).catch(() => {});
    }
  }, [postId, session]);

  useEffect(() => {
    if (post?.author?._id && session?.user?.email) {
      fetch('/api/user/me')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.user?.following) {
            setIsFollowing(data.user.following.includes(post.author._id));
          }
        })
        .catch(() => {});
    }
  }, [post?.author?._id, session?.user?.email]);

  if (isLoading) {
    return <PostSkeleton variant="detail" />;
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant type-body-md">Post not found.</p>
      </div>
    );
  }

  const morePosts = (moreLikeThisData?.posts || []).filter((p: any) => p._id !== post._id).slice(0, 3);

  const handleLike = async () => {
    if (!session) return router.push('/auth');
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    try {
      await fetch(`/api/posts/${post._id}/like`, { method: 'POST' });
    } catch {
      setIsLiked(!newLiked);
      setLikeCount(prev => !newLiked ? prev + 1 : prev - 1);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFollow = async () => {
    if (!session) return router.push('/auth');
    if (!post?.author?._id || followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetch('/api/user/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: post.author._id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  // Content formatting
  const cleanBody = (text: string) => {
    return text
      ?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      ?.replace(/https?:\/\/\S+/g, '')
      ?.replace(/www\.\S+/g, '')
      ?.replace(/Link posted:.*$/gm, '')
      ?.replace(/Source:.*$/gm, '')
      ?.replace(/^\s*N\s*$/gm, '')
      ?.replace(/\n{3,}/g, '\n\n')
      ?.trim() || '';
  };
  
  const bodyText = cleanBody(
    post.body && post.body.length > 200 && post.body !== post.headline
      ? post.body
      : post.description && post.description.length > 200
      ? post.description
      : post.headline
  );
  
  const bodyIsJustHeadline = bodyText.trim() === post.headline?.trim();
  const paragraphs = bodyText.split('\n\n').filter((p: string) => p.trim() !== '');
  const sourceLinks = getSourceLinks(post.sourceLink);
  const isBotAuthor = post.author?.email?.includes('@lettr.ai') || post.author?.role?.toLowerCase() === 'bot' || post.author?.name?.toLowerCase().includes('bot');
  const authorLabel = isBotAuthor ? 'BOT' : post.author?.isVerifiedAuthor ? 'AUTHOR' : 'READER';

  const renderContent = () => {
    if (bodyIsJustHeadline) {
      return (
        <p className="type-body-md text-on-surface-variant italic">
          Full article content is being processed. View the original source below.
        </p>
      );
    }

    return paragraphs.map((p: string, idx: number) => {
      const isBlockquote = p.startsWith('"') || p.startsWith('>');
      const cleanText = p.replace(/^> /, '').trim();
      
      const isSubheading = !isBlockquote && cleanText.length > 5 && cleanText.length < 60 && !/[.!?]$/.test(cleanText);

      if (isBlockquote) {
        return (
          <blockquote key={idx} className="border-y-2 border-on-surface py-[24px] my-[48px] italic text-center type-headline-sm text-on-surface">
            {cleanText}
          </blockquote>
        );
      }

      if (isSubheading) {
        return (
          <h3 key={idx} className="type-headline-sm border-l-4 border-primary pl-4 uppercase text-on-surface mt-[48px] mb-[24px]">
            {cleanText}
          </h3>
        );
      }

      const isFirstParagraph = idx === 0;
      
      return (
        <p key={idx} className={`type-body-md text-on-surface-variant leading-relaxed mb-6 ${
          isFirstParagraph ? "first-letter:text-[72px] first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:text-primary first-letter:font-bold first-letter:leading-[0.8]" : ""
        }`}>
          {cleanText}
        </p>
      );
    });
  };

  return (
    <div className="w-full min-h-screen bg-surface pb-[80px] md:pb-0 relative">
      {/* Hero Image - full width, natural ratio */}
      {post.videoUrl ? (
        <div className="w-full mb-8 overflow-hidden bg-surface-container">
          <video
            src={post.videoUrl}
            controls
            playsInline
            className="w-full h-auto"
            style={{ maxHeight: '480px', objectFit: 'contain', objectPosition: 'center' }}
            onError={(e) => {
              e.currentTarget.parentElement!.innerHTML = 
                '<div class="w-full h-full flex items-center justify-center text-on-surface-variant" style="min-height:200px">VIDEO UNAVAILABLE</div>';
            }}
          />
        </div>
      ) : post.imageUrl ? (
        <div className="w-full mb-8 overflow-hidden bg-surface-container max-h-[480px]">
          <EditorialImage src={post.imageUrl} alt={post.headline} aspect="w-full h-auto" className="max-h-[480px] object-contain" />
        </div>
      ) : null}

      <article className="max-w-[720px] mx-auto px-4 pt-12 md:pt-16">
        {/* ── 2. Category + Read Time ── */}
        <div className="flex items-center justify-between mb-6">
          {post.category ? (
            <span className="type-label-md border border-on-surface px-3 py-1 text-on-surface uppercase">
              {post.category}
            </span>
          ) : <div/>}
          <span className="type-caption text-on-surface-variant uppercase">{post.readTime || '5'} MIN READ</span>
        </div>

        {/* ── 3. Headline ── */}
        <h1 
          className="type-headline-lg normal-case mb-8 leading-tight"
          style={{ fontSize: 'clamp(28px, 3.5vw, 48px)' }}
        >
          {post.headline}
        </h1>

        {/* ── 4. Author Row ── */}
        <div className="flex items-center justify-between w-full border-b border-outline-variant pb-6 mb-8">
          <div className="flex items-center gap-4">
            <AuthorAvatar name={post.author?.name} image={post.author?.image} size="sm" />
            <div>
              <p className="type-label-md text-on-surface font-bold">
                {post.author?._id ? (
                  <Link href={`/author/${post.author._id}`} className="hover:text-primary transition-colors">
                    {post.author?.name}
                  </Link>
                ) : (
                  post.author?.name
                )}
              </p>
              <p className="type-caption text-on-surface-variant mt-1 uppercase">
                {post.author?.role === 'BOT' ? 'BOT' : 'AUTHOR'} · {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="scale-110 origin-right">
            <FactScoreBadge score={post.factScore} />
          </div>
        </div>

        {/* ── 6. Article Body ── */}
        <div className="content-measure mb-12">
          {renderContent()}
        </div>

        {/* ── 7. Divider line ── */}
        <div className="border-t-2 border-on-surface pt-8" />

        {/* ── 8. Source Links ── */}
        {sourceLinks.length > 0 && (
          <div className="mb-[48px]">
            <h3 className="type-label-md text-on-surface mb-[16px]">SOURCE LINKS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sourceLinks.map((source) => (
                <a
                  key={source}
                  href={source}
                  target="_blank"
                  rel="noreferrer"
                  className="group border border-outline-variant p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="type-label-md text-primary">{sourceHost(source)}</span>
                      <p className="type-caption text-on-surface-variant mt-2 break-all">{source}</p>
                    </div>
                    <ExternalLink size={16} className="shrink-0 text-on-surface-variant group-hover:text-primary transition-colors" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── 9. AI Verification Summary ── */}
        {post.factSummary && post.factSummary !== 'Analysis complete.' && (
          <div className="border border-outline-variant bg-surface-container p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <span className="type-label-md text-on-surface-variant">AI VERIFICATION SUMMARY</span>
              <FactScoreBadge score={post.factScore} />
            </div>
            <p className="type-body-md text-on-surface-variant leading-relaxed">
              {post.factSummary}
            </p>
            {post.issues && post.issues.length > 0 && (
              <ul className="mt-4 space-y-1">
                {post.issues.map((issue: string, i: number) => (
                  <li key={i} className="type-caption text-error flex items-start gap-2">
                    <span>⚠</span> {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── 10. Tags Row ── */}
        <div className="pt-[24px] border-t border-outline-variant flex flex-wrap gap-3">
          <span className="type-label-md border border-outline-variant px-3 py-1.5 text-on-surface-variant">REPORTING</span>
          {post.category && (
            <span className="type-label-md border border-outline-variant px-3 py-1.5 text-on-surface-variant uppercase">{post.category}</span>
          )}
        </div>

      </article>

      {/* ── 8. More Like This ── */}
      {morePosts.length > 0 && (
        <div className="w-full bg-surface-container-low border-t-2 border-on-surface py-[64px] px-[16px] md:px-[64px]">
          <div className="max-w-[1440px] mx-auto">
            <h3 className="type-headline-sm mb-[48px] text-on-surface text-center uppercase">More Like This</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
              {morePosts.map((p: any) => (
                <Link key={p._id} href={`/post/${p._id}`} className="group block">
                  <div className="overflow-hidden mb-[16px]">
                    {p.imageUrl && (
                      <EditorialImage src={p.imageUrl} alt={p.headline} aspect="aspect-video" className="group-hover:scale-105 transition-transform duration-500" />
                    )}
                  </div>
                  {p.category && (
                    <span className="type-label-md text-on-surface-variant mb-2 block uppercase">{p.category}</span>
                  )}
                  <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                    {p.headline}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Interaction Row (Sticky Bottom) ── */}
      <div className="fixed bottom-[64px] md:bottom-0 left-0 w-full bg-surface border-t-2 border-on-surface z-40 p-[12px] md:px-[64px] flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-[720px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 type-label-md transition-colors ${isLiked ? 'text-primary' : 'text-on-surface hover:text-primary'}`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} strokeWidth={2} />
              <span>{likeCount}</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 type-label-md text-on-surface hover:text-primary transition-colors"
            >
              {isCopied ? <Check size={20} /> : <Share2 size={20} />}
              <span className="hidden sm:inline">{isCopied ? 'COPIED!' : 'SHARE'}</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block">
              <FactScoreBadge score={post.factScore} size="md" />
            </div>
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className="bg-on-surface text-surface type-label-md px-6 py-2 flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
              <span className="hidden sm:inline">{followLoading ? 'SAVING' : isFollowing ? 'FOLLOWING' : 'FOLLOW'}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
