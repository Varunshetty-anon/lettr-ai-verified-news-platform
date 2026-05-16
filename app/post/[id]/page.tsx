"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Shield, ExternalLink, Heart, MessageCircle, BarChart2, Share, CheckCircle } from "lucide-react";
import dynamic from 'next/dynamic';
import { FactScoreBadge } from "../../components/ui/FactScoreBadge";

const DynamicPlayer = dynamic(() => import('../../components/ui/HoverVideoPlayer').then(mod => mod.default), { ssr: false });

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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin rounded-none" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-body text-[16px] text-on-surface-variant">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-[64px]">
      {/* Progress Bar placeholder */}
      <div className="fixed top-0 left-0 w-full h-[4px] bg-primary z-50 transform origin-left" style={{ transform: 'scaleX(0.3)' }} />

      {/* Header */}
      <div className="sticky top-[4px] sm:top-0 z-40 bg-surface/90 backdrop-blur-md flex items-center gap-6 px-4 py-4 border-b border-outline-variant/50">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-surface-dim transition-colors rounded-none">
          <ArrowLeft size={24} className="text-on-surface" />
        </button>
        <span className="font-label text-[12px] uppercase tracking-[0.1em] font-bold text-on-surface">REPORT</span>
      </div>

      {/* Post Content */}
      <article className="pt-[32px]">
        {/* Category & Fact Score Top */}
        <div className="flex items-center justify-between mb-[32px] px-4 sm:px-0">
           {post.category ? (
             <span className="font-label text-[12px] uppercase tracking-[0.1em] text-tertiary font-bold bg-tertiary-fixed/20 px-3 py-1">
               {post.category}
             </span>
           ) : <div/>}
           <FactScoreBadge score={post.factScore || 0} />
        </div>

        {/* Text Content */}
        <h1 className="px-4 sm:px-0 font-display text-[48px] sm:text-[80px] font-bold text-on-surface leading-[1.0] tracking-[-0.04em] mb-[32px]">
          {post.headline}
        </h1>

        {/* Author Row */}
        <div className="px-4 sm:px-0 flex items-center gap-4 mb-[32px] pb-[32px] border-b border-outline-variant/30">
          <Link href={`/author/${post.author?._id}`} className="shrink-0">
            <div className="w-[48px] h-[48px] bg-surface-variant overflow-hidden flex items-center justify-center border border-outline-variant/50 rounded-none hover:bg-surface-dim transition-colors">
              {post.author ? (
                 <div className="w-full h-full font-display font-bold text-[24px] text-on-surface flex items-center justify-center">{post.author.name?.charAt(0)}</div>
              ) : (
                 <div className="w-full h-full font-display font-bold text-[24px] text-on-surface flex items-center justify-center">?</div>
              )}
            </div>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Link href={`/author/${post.author?._id}`} className="font-label text-[14px] font-bold uppercase tracking-[0.1em] text-on-surface hover:text-primary transition-colors">
                {post.author?.name || 'Unknown'}
              </Link>
              {post.author?.isVerifiedAuthor && (
                <CheckCircle size={16} className="text-tertiary" />
              )}
              {post.author?.email?.includes('@lettr.ai') && (
                <span className="ml-1 font-label text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-outline-variant text-on-surface-variant font-bold rounded-none">BOT</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-body text-[14px] text-on-surface-variant">
                @{post.author?.name?.toLowerCase().replace(/\s+/g, '')}
              </span>
              <span className="font-body text-[14px] text-on-surface-variant">·</span>
              <span className="font-body text-[14px] text-on-surface-variant">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Media */}
        {(post.imageUrl || post.videoUrl) && (
          <div className="mb-[64px] overflow-hidden border-y sm:border border-outline-variant/50 relative bg-surface-dim flex items-center justify-center rounded-none">
            {post.imageUrl && !post.videoUrl && (
              <img src={post.imageUrl} alt="" className="w-full h-auto object-cover max-h-[800px]" />
            )}
            {post.videoUrl && (
              <div className="w-full relative">
                <DynamicPlayer src={post.videoUrl} />
              </div>
            )}
          </div>
        )}

        {/* Full Article Body */}
        <div className="px-4 sm:px-0 font-body text-[20px] text-on-surface leading-[1.6] mb-[64px] whitespace-pre-wrap max-w-[700px]">
          {post.content || post.description}
        </div>

        {/* Community Note Integration */}
        <div className="mx-4 sm:mx-0 mb-[64px] bg-surface-container-low p-6 sm:p-[32px] border-l-[4px] border-primary relative rounded-none shadow-none">
           <div className="flex items-start gap-4">
              <Shield size={24} className={post.factScore >= 85 ? 'text-[#485c00]' : post.factScore >= 50 ? 'text-[#a33800]' : 'text-red-500'} />
              <div className="flex-1">
                 <p className="font-display font-bold text-[24px] text-on-surface mb-2 leading-[1.3] tracking-[-0.01em]">
                   Readers added context they thought people might want to know
                 </p>
                 <p className="font-body text-[16px] text-on-surface-variant leading-[1.6] mb-4">
                   {post.reasoning}
                 </p>
                 {post.issues && post.issues.length > 0 && (
                    <div className="mb-6">
                       <p className="font-label text-[12px] uppercase tracking-[0.1em] font-bold text-on-surface mb-2">Key Issues Identified:</p>
                       <ul className="space-y-2">
                          {post.issues.map((issue: string, idx: number) => (
                             <li key={idx} className="font-body text-[16px] text-on-surface-variant flex items-start gap-2">
                               <span className="text-primary mt-1">•</span> {issue}
                             </li>
                          ))}
                       </ul>
                    </div>
                 )}
                 <div className="flex items-center gap-4 border-t border-outline-variant/30 pt-4">
                    <span className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">
                      AI Fact Score: <span className="text-primary">{post.factScore}/100</span>
                    </span>
                    <span className="font-body text-[14px] text-on-surface-variant">·</span>
                    <span className={`font-label text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 border rounded-none ${post.factScore >= 85 ? 'border-[#5d7600]/30 text-[#485c00] bg-[#c3f400]/20' : post.factScore >= 50 ? 'border-[#cd4800]/30 text-[#a33800] bg-[#ffdbce]/20' : 'border-red-500/20 text-red-500 bg-red-500/10'}`}>
                      {post.confidence || 'Medium'} Confidence
                    </span>
                 </div>
              </div>
           </div>
        </div>

        {/* Source Link & Metadata */}
        <div className="px-4 sm:px-0 border-t border-b border-outline-variant/30 py-6 mb-[32px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {post.sourceLink && (
            <a href={post.sourceLink} target="_blank" rel="noopener noreferrer" className="font-label text-[12px] uppercase tracking-[0.1em] text-primary hover:bg-primary/10 transition-colors flex items-center gap-2 truncate px-4 py-2 border border-primary w-fit rounded-none">
              <ExternalLink size={16} />
              <span className="truncate">Source Document</span>
            </a>
          )}
          <div className="flex items-center gap-2 font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">
             <span>{new Date(post.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
             <span>·</span>
             <span className="text-on-surface">12.5K VIEWS</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 sm:px-0 flex items-center justify-between sm:justify-start sm:gap-[64px] text-on-surface-variant">
          <button className="flex items-center gap-3 group/btn transition-colors hover:text-primary">
            <MessageCircle size={24} />
            <span className="font-label text-[14px] font-bold">12</span>
          </button>

          <button onClick={handleLike} className={`flex items-center gap-3 group/btn transition-colors ${liked ? 'text-secondary' : 'hover:text-secondary'}`}>
            <Heart size={24} className={liked ? "fill-secondary text-secondary" : ""} />
            <span className="font-label text-[14px] font-bold">{post.engagement}</span>
          </button>

          <button className="flex items-center gap-3 group/btn transition-colors hover:text-primary">
            <BarChart2 size={24} />
            <span className="font-label text-[14px] font-bold">12.5K</span>
          </button>

          <button className="flex items-center gap-3 group/btn transition-colors hover:text-primary">
            <Share size={24} />
          </button>
        </div>
      </article>
    </div>
  );
}
