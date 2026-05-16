import React from 'react';
import Link from 'next/link';
import { Shield, Heart, ExternalLink, ArrowUpRight, CheckCircle } from 'lucide-react';
import { FactScoreBadge } from './FactScoreBadge';
import HoverVideoPlayer from './HoverVideoPlayer';

interface Author {
  _id: string;
  name: string;
  isVerifiedAuthor?: boolean;
  email?: string;
}

export interface Post {
  _id: string;
  author?: Author;
  createdAt: string;
  headline: string;
  description: string;
  content?: string;
  imageUrl?: string;
  videoUrl?: string;
  factScore: number;
  reasoning?: string;
  engagement: number;
  sourceLink?: string;
  category?: string;
}

interface ArticleCardProps {
  post: Post;
  variant?: 'feature' | 'brief';
  liked?: boolean;
  onLikeToggle?: (e: React.MouseEvent) => void;
  index?: number;
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

export function ArticleCard({ post, variant = 'feature', liked = false, onLikeToggle, index }: ArticleCardProps) {
  const isFeature = variant === 'feature';

  if (!isFeature) {
    // Brief Card (4 columns style, usually used in explore/trending)
    return (
      <Link href={`/post/${post._id}`} className="group flex items-center gap-6 p-5 bg-surface border border-outline-variant hover:border-primary/30 transition-all rounded-none">
        {index !== undefined && (
          <span className="font-display text-4xl font-bold text-on-surface-variant/20 min-w-[32px] text-center">{index + 1}</span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-body text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-1">{post.headline}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{post.author?.name || 'Unknown'}</span>
            <FactScoreBadge score={post.factScore || 0} />
          </div>
        </div>
        <ArrowUpRight size={16} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
      </Link>
    );
  }

  // Feature Card (8 columns style, used in main feed)
  return (
    <div className="group block bg-surface border border-outline-variant hover:border-outline transition-all duration-300 p-6 break-inside-avoid rounded-none relative">
      <Link href={`/post/${post._id}`} prefetch={true} className="absolute inset-0 z-0" aria-label="View Post" />

      <div className="flex gap-4 relative z-10 pointer-events-none">
        {/* Left side: Avatar */}
        <div className="w-10 h-10 shrink-0 bg-surface-variant overflow-hidden flex items-center justify-center border border-outline-variant/50 rounded-none pointer-events-auto">
          <Link href={`/author/${post.author?._id}`}>
            {post.author ? (
               <div className="w-full h-full font-bold text-on-surface flex items-center justify-center hover:bg-surface-dim transition-colors">{post.author.name?.charAt(0)}</div>
            ) : (
               <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">?</div>
            )}
          </Link>
        </div>

        {/* Right side: Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: Name, Handle, Time, Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-4 pb-3 border-b border-outline-variant/30 pointer-events-auto">
            {post.author && (
              <Link
                href={`/author/${post.author._id}`}
                prefetch={true}
                className="font-label text-[12px] font-bold uppercase tracking-[0.1em] text-on-surface hover:text-primary transition-colors"
              >
                {post.author.name}
              </Link>
            )}
            {post.author?.isVerifiedAuthor && (
                <CheckCircle size={14} className="text-tertiary" />
            )}
            <span className="text-[14px] text-on-surface-variant">·</span>
            <span className="text-[14px] text-on-surface-variant">{timeAgo(post.createdAt)}</span>

            {post.author?.email?.includes('@lettr.ai') && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 border border-outline-variant text-on-surface-variant font-bold font-label uppercase tracking-widest rounded-none">BOT</span>
            )}
          </div>

          {/* Content: Headline and Body */}
          <h3 className="font-display text-3xl font-bold text-on-surface leading-[1.2] tracking-[-0.01em] mb-3 group-hover:text-primary transition-colors pointer-events-auto">
            <Link href={`/post/${post._id}`}>{post.headline}</Link>
          </h3>
          <p className="font-body text-[16px] text-on-surface-variant leading-[1.6] mb-5 whitespace-pre-wrap pointer-events-auto">
            {post.description}
          </p>

          {/* Media */}
          {(post.imageUrl || post.videoUrl) && (
            <div className="mb-5 overflow-hidden border border-outline-variant/50 relative bg-surface-dim max-h-[500px] rounded-none pointer-events-auto">
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

          {/* Fact Score Integration */}
          <div className="mb-5 flex items-center justify-between pointer-events-auto border-t border-b border-outline-variant/20 py-2">
            <FactScoreBadge score={post.factScore || 0} />
            {post.category && (
               <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/60">
                 {post.category}
               </span>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between text-on-surface-variant pointer-events-auto">
            <button
              onClick={onLikeToggle}
              className={`flex items-center gap-2 group/btn transition-colors ${liked ? 'text-secondary' : 'hover:text-secondary'}`}
            >
              <Heart size={20} className={liked ? 'fill-secondary text-secondary' : ''} />
              <span className="font-label text-[12px] font-bold">{post.engagement}</span>
            </button>

            {post.sourceLink && (
              <a href={post.sourceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group/btn transition-colors hover:text-primary">
                <span className="font-label text-[10px] uppercase tracking-widest">Source</span>
                <ExternalLink size={18} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
