"use client";

import React, { use, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, ExternalLink, MessageCircle, Heart, Share, BarChart2 } from 'lucide-react';
import { DynamicPlayer } from '@/app/components/ui/HoverVideoPlayer';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const { data: session } = useSession();
  const [liked, setLiked] = useState(false);

  const { data, error, isLoading } = useSWR(`/api/posts/${postId}`, fetcher);
  const post = data?.post;

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
      body: JSON.stringify({
        postId: post._id,
        action: newLiked ? 'like' : 'unlike'
      })
    }).catch(() => {});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md flex items-center gap-6 px-4 h-[53px] border-b border-outline-variant/50">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors">
          <ArrowLeft size={20} className="text-on-surface" />
        </button>
        <h1 className="text-xl font-bold text-on-surface">Post</h1>
      </div>

      {/* Post Content */}
      <article className="px-4 pt-3 pb-4 border-b border-outline-variant/50">
        {/* Author Row */}
        <div className="flex items-center gap-3 mb-3">
          <Link href={`/author/${post.author?._id}`} className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center">
              {post.author ? (
                 <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">{post.author.name?.charAt(0)}</div>
              ) : (
                 <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">?</div>
              )}
            </div>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <Link href={`/author/${post.author?._id}`} className="font-bold text-[15px] text-on-surface hover:underline">
                {post.author?.name || 'Unknown'}
              </Link>
              {post.author?.isVerifiedAuthor && (
                <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[18px] h-[18px] fill-primary"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[15px] text-on-surface-variant">
                @{post.author?.name?.toLowerCase().replace(/\s+/g, '')}
              </span>
              {post.author?.email?.includes('@lettr.ai') && (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant font-bold rounded">BOT</span>
              )}
            </div>
          </div>
        </div>

        {/* Text Content */}
        <h2 className="text-[17px] sm:text-[19px] font-bold text-on-surface leading-snug mb-2">
          {post.headline}
        </h2>

        {/* Full Article Body */}
        <div className="text-[15px] sm:text-[17px] text-on-surface leading-normal mb-4 whitespace-pre-wrap">
          {post.content || post.description}
        </div>

        {/* Media */}
        {(post.imageUrl || post.videoUrl) && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-outline-variant/50 relative bg-surface-container-low max-h-[600px] flex items-center justify-center">
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

        {/* Community Note Integration */}
        <div className="mb-4 bg-surface-container-high rounded-xl p-4 border border-outline-variant/30">
           <div className="flex items-start gap-3">
              <Shield size={20} className={post.factScore >= 80 ? 'text-emerald-500 mt-1' : post.factScore >= 60 ? 'text-amber-500 mt-1' : 'text-red-500 mt-1'} />
              <div className="flex-1">
                 <p className="text-[15px] font-bold text-on-surface mb-1">
                   Readers added context they thought people might want to know
                 </p>
                 <p className="text-[14px] text-on-surface leading-relaxed mb-3">
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
                 <div className="flex items-center gap-3 border-t border-outline-variant/30 pt-3">
                    <span className="text-[13px] text-on-surface-variant/80 font-medium">
                      AI Fact Score: <span className="font-bold">{post.factScore}/100</span>
                    </span>
                    <span className="text-[13px] text-on-surface-variant">·</span>
                    <span className={`text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${post.factScore >= 85 ? 'bg-emerald-500/10 text-emerald-500' : post.factScore >= 60 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>
                      {post.confidence || 'Medium'} Confidence
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Source Link */}
        {post.sourceLink && (
          <div className="mb-4 text-[15px] text-on-surface-variant">
             <a href={post.sourceLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1.5 truncate">
               <ExternalLink size={16} />
               <span className="truncate">{post.sourceLink.replace(/^https?:\/\//, '')}</span>
             </a>
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-[15px] text-on-surface-variant mb-4 border-b border-outline-variant/50 pb-4">
          <span>{new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          <span>·</span>
          <span>{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>·</span>
          <span className="font-bold text-on-surface">12.5K</span> <span>Views</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-around text-on-surface-variant pb-2">
          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 rounded-full group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <MessageCircle size={22} />
            </div>
            <span className="text-[15px] group-hover/btn:text-primary">12</span>
          </button>

          <button onClick={handleLike} className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 rounded-full group-hover/btn:bg-emerald-500/10 group-hover/btn:text-emerald-500 transition-colors">
              <Heart size={22} className={liked ? "fill-emerald-500 text-emerald-500" : ""} />
            </div>
            <span className="text-[15px] group-hover/btn:text-emerald-500">{post.engagement}</span>
          </button>

          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 rounded-full group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <BarChart2 size={22} />
            </div>
            <span className="text-[15px] group-hover/btn:text-primary">12.5K</span>
          </button>

          <button className="flex items-center gap-2 group/btn transition-colors">
            <div className="p-2 rounded-full group-hover/btn:bg-primary/10 group-hover/btn:text-primary transition-colors">
              <Share size={22} />
            </div>
          </button>
        </div>
      </article>
    </div>
  );
}
