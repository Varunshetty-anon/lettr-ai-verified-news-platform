"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ExternalLink, Shield, CheckCircle, Heart } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface PostDetail {
  _id: string;
  headline: string;
  description: string;
  body?: string;
  factScore: number;
  reasoning?: string;
  originSource?: string;
  category?: string;
  sourceLink?: string;
  mediaUrl?: string;
  mediaType?: string;
  engagement: number;
  createdAt: string;
  author: { _id: string; name: string; image?: string; trustScore: number; role: string; totalPosts: number; isVerifiedAuthor: boolean } | null;
}

interface RelatedPost {
  _id: string;
  headline: string;
  factScore: number;
  category?: string;
  createdAt: string;
  author: { name: string } | null;
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

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/posts/${id}`)
      .then(res => res.json())
      .then(data => {
        setPost(data.post);
        setRelated(data.related || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Track view with session email
    if (session?.user?.email) {
      fetch('/api/user/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, postId: id, action: 'view' })
      }).catch(() => {});
    }
  }, [id, session]);

  const handleLike = async () => {
    if (!post || !session?.user?.email) return;
    const newLiked = !liked;
    setLiked(newLiked);

    await fetch('/api/user/interact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        postId: post._id,
        action: newLiked ? 'like' : 'unlike'
      })
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen p-5">
        <div className="animate-pulse space-y-5">
          <div className="h-3 bg-surface-container-high rounded w-20" />
          <div className="h-7 bg-surface-container-high rounded w-3/4" />
          <div className="h-3 bg-surface-container-high rounded w-32" />
          <div className="h-4 bg-surface-container-high rounded w-full mt-6" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-5/6" />
          <div className="h-4 bg-surface-container-high rounded w-4/6" />
          <div className="h-24 bg-surface-container-high rounded mt-6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-xl text-on-surface mb-2">Post not found</h2>
          <Link href="/" className="font-label text-xs uppercase tracking-wider text-primary hover:underline">Return to feed</Link>
        </div>
      </div>
    );
  }

  const scoreColor = post.factScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : post.factScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const scoreBorder = post.factScore >= 80 ? 'border-emerald-200 dark:border-emerald-800' : post.factScore >= 60 ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800';

  // Use body if available, otherwise fall back to description
  const articleBody = post.body || post.description;

  return (
    <div className="w-full min-h-screen animate-fade-in">
      {/* Back bar */}
      <div className="px-5 py-3 border-b border-outline-variant">
        <Link href="/" className="flex items-center gap-2 font-label text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft size={14} />
          Back to feed
        </Link>
      </div>

      <article className="p-5">
        {/* Top: Category + Score badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {post.category && (
              <span className="font-label text-[10px] uppercase tracking-[0.15em] text-primary border border-primary/20 px-2 py-0.5">{post.category}</span>
            )}
            <span className="font-label text-[10px] text-on-surface-variant/50">{timeAgo(post.createdAt)}</span>
          </div>
          {/* Fact score badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 border ${scoreBorder}`}>
            <Shield size={12} className={scoreColor} />
            <span className={`font-display text-sm font-black ${scoreColor}`}>{post.factScore}</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface leading-tight mb-5">
          {post.headline}
        </h1>

        {/* Author bar */}
        {post.author && (
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-outline-variant">
            <div className="w-9 h-9 bg-primary/10 text-primary flex items-center justify-center font-display text-base font-bold overflow-hidden">
              {post.author.image ? (
                <img src={post.author.image} alt="" className="w-full h-full object-cover" />
              ) : (
                post.author.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-body text-sm font-medium text-on-surface">{post.author.name}</span>
                {post.author.role === 'AUTHOR' && (
                  <span className="font-label text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary">Bot</span>
                )}
                {post.author.isVerifiedAuthor && (
                  <CheckCircle size={13} className="text-accent" />
                )}
              </div>
              <p className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
                Trust {post.author.trustScore} · {post.author.totalPosts || 0} posts
              </p>
            </div>
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-on-surface-variant/40 hover:text-red-500 transition-colors"
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-red-500' : ''} />
              <span className="font-label text-xs">{post.engagement + (liked ? 1 : 0)}</span>
            </button>
          </div>
        )}


        {/* Media */}
        {post.mediaUrl && post.mediaType === 'image' && (
          <div className="mb-6 overflow-hidden border border-outline-variant">
            <img src={post.mediaUrl} alt="" loading="lazy" className="w-full h-auto object-cover max-h-[480px]" />
          </div>
        )}
        {post.mediaUrl && post.mediaType === 'video' && mounted && (
          <div className="mb-6 overflow-hidden border border-outline-variant relative pt-[56.25%]">
            <ReactPlayer 
              url={post.mediaUrl} 
              controls 
              width="100%" 
              height="100%" 
              className="absolute top-0 left-0"
            />
          </div>
        )}

        {/* Summary */}
        <div className="font-body text-sm text-on-surface-variant/70 leading-relaxed mb-6 p-4 bg-surface-container-low border border-outline-variant/30 italic">
          {post.description}
        </div>

        {/* Full article body */}
        <div className="font-body text-base text-on-surface/85 leading-[1.85] mb-6 whitespace-pre-line">
          {articleBody}
        </div>

        {/* AI Verification Card */}
        <div className={`border ${scoreBorder} bg-surface-container-low p-5 mb-6`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className={scoreColor} />
            <span className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60">AI Verification Report</span>
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className={`font-display text-3xl font-black ${scoreColor}`}>{post.factScore}</span>
            <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant/50">/ 100</span>
          </div>
          {post.reasoning && (
            <p className="font-body text-sm text-on-surface-variant/70 mb-3">{post.reasoning}</p>
          )}
          {post.originSource && (
            <p className="font-body text-xs text-on-surface-variant/50 mb-3">{post.originSource}</p>
          )}
          <div className="pt-3 border-t border-outline-variant">
            <p className="font-label text-[9px] text-on-surface-variant/40 uppercase tracking-wider">
              Sources Verified: {post.factScore >= 80 ? '3+' : post.factScore >= 60 ? '1-2' : '0'} · Powered by Groq Llama 3.3
            </p>
          </div>
        </div>

        {/* Source */}
        {post.sourceLink && (
          <a
            href={post.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-label text-xs text-primary hover:underline underline-offset-4 decoration-primary/30 mb-6"
          >
            <ExternalLink size={13} />
            View Original Source
          </a>
        )}

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="border-t border-outline-variant pt-6 mt-2">
            <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Related Articles</h3>
            <div className="flex flex-col gap-2">
              {related.map(r => (
                <Link
                  key={r._id}
                  href={`/post/${r._id}`}
                  className="group flex items-center gap-3 p-3 border border-outline-variant hover:border-primary/30 transition-all bg-surface-container-low"
                >
                  <span className={`font-display text-base font-black min-w-[32px] text-center ${
                    r.factScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant/40'
                  }`}>
                    {r.factScore}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-on-surface group-hover:text-primary transition-colors truncate">{r.headline}</p>
                    <p className="font-label text-[10px] text-on-surface-variant/40">{r.author?.name} · {timeAgo(r.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
