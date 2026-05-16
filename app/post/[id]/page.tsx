"use client";

import React, { use, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, MessageCircle, Heart, Share, BarChart2 } from 'lucide-react';
import { DynamicPlayer } from '@/app/components/ui/HoverVideoPlayer';
import { useSession } from 'next-auth/react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { data, error, isLoading } = useSWR(`/api/posts/${postId}`, fetcher);
  const post = data?.post;

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      const winH = window.innerHeight;
      const docH = document.documentElement.scrollHeight - winH;
      if (docH > 0) setScrollProgress(Math.min(100, (window.scrollY / docH) * 100));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (postId && session?.user?.email) {
      fetch(`/api/user/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: postId, action: 'view' })
      }).catch(() => {});
    }
  }, [postId, session]);

  const handleLike = async () => {
    if (!post || !session?.user?.email) return;
    const newLiked = !liked;
    setLiked(newLiked);
    await fetch(`/api/user/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post._id, action: newLiked ? 'like' : 'unlike' })
    }).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant">Post not found.</p>
      </div>
    );
  }

  const scoreColor = post.factScore >= 85 ? 'border-emerald-500' : post.factScore >= 50 ? 'border-amber-500' : 'border-red-500';

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Reading Progress Bar (Stitch: 4px Electric Blue) */}
      <div className="reading-progress" style={{ width: `${scrollProgress}%` }} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md flex items-center gap-6 px-4 h-[53px] border-b border-outline-variant/50">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-surface-variant transition-colors">
          <ArrowLeft size={20} className="text-on-surface" />
        </button>
        <h1 className="text-xl font-bold text-on-surface">Post</h1>
      </div>

      <article className="px-6 pt-6 pb-4">
        {/* Author Row */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/author/${post.author?._id}`} className="shrink-0">
            <AuthorAvatar name={post.author?.name || '?'} size="md" />
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link href={`/author/${post.author?._id}`} className="font-bold text-[15px] text-on-surface hover:underline">
                {post.author?.name || 'Unknown'}
              </Link>
              {post.author?.isVerifiedAuthor && <VerifiedBadge size={18} />}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[14px] text-on-surface-variant">
                @{post.author?.name?.toLowerCase().replace(/\s+/g, '')}
              </span>
              {post.author?.email?.includes('@lettr.ai') && (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant font-bold">BOT</span>
              )}
            </div>
          </div>
        </div>

        {/* Category Tag */}
        {post.category && (
          <span className="inline-block font-label text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 bg-tertiary-fixed text-on-surface font-bold mb-5">
            {post.category}
          </span>
        )}

        {/* Headline */}
        <h2 className="type-headline-lg text-on-surface mb-4">
          {post.headline}<span className="text-primary">.</span>
        </h2>

        {/* Full Article Body */}
        <div className="type-body-lg text-on-surface leading-[1.7] mb-6 whitespace-pre-wrap">
          {post.content || post.description}
        </div>

        {/* Media */}
        {(post.imageUrl || post.videoUrl) && (
          <div className="mb-6 overflow-hidden border-2 border-outline-variant relative bg-surface-container-low max-h-[600px] flex items-center justify-center">
            {post.imageUrl && !post.videoUrl && (
              <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain max-h-[600px]" />
            )}
            {post.videoUrl && (
              <div className="w-full relative">
                <DynamicPlayer src={post.videoUrl} />
              </div>
            )}
          </div>
        )}

        {/* ── Fact Check Panel (Stitch: bold border, no shadow) ── */}
        <div className={`mb-6 p-6 border-l-4 ${scoreColor} bg-surface-container-low border border-outline-variant/30`}>
          <p className="font-display text-[11px] uppercase tracking-[0.15em] font-black text-on-surface mb-3">
            AI Verification Summary
          </p>
          <p className="font-body text-[15px] text-on-surface leading-relaxed mb-4">
            {post.reasoning}
          </p>
          {post.issues && post.issues.length > 0 && (
            <div className="mb-4">
              <p className="text-[13px] font-bold text-on-surface-variant mb-2">Key Issues Identified:</p>
              <ul className="list-disc pl-5 space-y-1">
                {post.issues.map((issue: string, idx: number) => (
                  <li key={idx} className="text-[13px] text-on-surface-variant">{issue}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-4 pt-4 border-t border-outline-variant/30">
            <FactScoreBadge score={post.factScore} size="md" showLabel />
            <span className={`type-label-caps text-[10px] px-2 py-1 ${
              post.factScore >= 85 ? 'bg-emerald-500/10 text-emerald-500'
              : post.factScore >= 50 ? 'bg-amber-500/10 text-amber-500'
              : 'bg-red-500/10 text-red-500'
            }`}>
              {post.confidence || 'Medium'} Confidence
            </span>
          </div>
        </div>

        {/* Source Link */}
        {post.sourceLink && (
          <div className="mb-6">
            <a href={post.sourceLink} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-1.5 text-[14px] font-bold truncate"
            >
              <ExternalLink size={14} />
              <span className="truncate">{post.sourceLink.replace(/^https?:\/\//, '')}</span>
            </a>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1.5 text-[14px] text-on-surface-variant mb-4 pb-4 border-b border-outline-variant/50">
          <span>{new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span className="font-bold text-on-surface">12.5K</span> <span>Views</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around text-on-surface-variant pb-4 border-b border-outline-variant/50">
          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <MessageCircle size={22} />
            </div>
            <span className="text-[14px] group-hover/btn:text-primary">12</span>
          </button>

          <button onClick={handleLike} className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 group-hover/btn:bg-rose-500/10 group-hover/btn:text-rose-500 transition-colors">
              <Heart size={22} className={liked ? "fill-rose-500 text-rose-500" : ""} />
            </div>
            <span className={`text-[14px] ${liked ? 'text-rose-500' : 'group-hover/btn:text-rose-500'}`}>
              {post.engagement}
            </span>
          </button>

          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <BarChart2 size={22} />
            </div>
            <span className="text-[14px] group-hover/btn:text-primary">12.5K</span>
          </button>

          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <Share size={22} />
            </div>
          </button>
        </div>
      </article>
    </div>
  );
}
