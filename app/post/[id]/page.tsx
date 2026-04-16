"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';

interface PostDetail {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  reasoning?: string;
  originSource?: string;
  category?: string;
  sourceLink?: string;
  mediaUrl?: string;
  engagement: number;
  createdAt: string;
  author: { name: string; trustScore: number; role: string; totalPosts: number } | null;
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then(res => res.json())
      .then(data => {
        setPost(data.post);
        setRelated(data.related || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="w-full min-h-screen px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-surface-container-high rounded w-24" />
          <div className="h-8 bg-surface-container-high rounded w-3/4" />
          <div className="h-4 bg-surface-container-high rounded w-full" />
          <div className="h-4 bg-surface-container-high rounded w-5/6" />
          <div className="h-20 bg-surface-container-high rounded" />
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

  const scoreColor = post.factScore >= 80 ? 'text-emerald-600' : post.factScore >= 60 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = post.factScore >= 80 ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' : post.factScore >= 60 ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800';

  return (
    <div className="w-full min-h-screen animate-fade-in">
      {/* Back bar */}
      <div className="px-6 py-4 border-b border-outline-variant/12">
        <Link href="/" className="flex items-center gap-2 font-label text-xs uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors">
          <ArrowLeft size={14} />
          Back to feed
        </Link>
      </div>

      <article className="px-6 py-8">
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4">
          {post.category && (
            <span className="font-label text-[10px] uppercase tracking-[0.15em] text-primary border border-primary/20 px-2 py-0.5">{post.category}</span>
          )}
          <span className="text-on-surface-variant/30">·</span>
          <span className="font-label text-xs text-on-surface-variant/60">{timeAgo(post.createdAt)}</span>
          {post.originSource && (
            <>
              <span className="text-on-surface-variant/30">·</span>
              <span className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{post.originSource}</span>
            </>
          )}
        </div>

        {/* Headline */}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface leading-tight mb-6">
          {post.headline}
        </h1>

        {/* Author */}
        {post.author && (
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-outline-variant/12">
            <div className="w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center font-display text-lg font-bold">
              {post.author.name.charAt(0)}
            </div>
            <div>
              <p className="font-body text-sm font-medium text-on-surface">{post.author.name}</p>
              <p className="font-label text-[10px] text-on-surface-variant/60 uppercase tracking-wider">
                Trust {post.author.trustScore} · {post.author.role}
              </p>
            </div>
          </div>
        )}

        {/* Media */}
        {post.mediaUrl && post.mediaUrl.startsWith('http') && (
          <div className="mb-8 overflow-hidden border border-outline-variant/12">
            <img src={post.mediaUrl} alt="" className="w-full h-auto object-cover max-h-[400px]" />
          </div>
        )}

        {/* Full description */}
        <div className="font-body text-base text-on-surface/90 leading-relaxed mb-8 whitespace-pre-line">
          {post.description}
        </div>

        {/* Fact Score Card */}
        <div className={`border p-6 mb-8 ${scoreBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className={scoreColor} />
            <span className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">AI Verification Report</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`font-display text-5xl font-black ${scoreColor}`}>{post.factScore}</span>
            <div>
              <p className="font-label text-xs uppercase tracking-wider text-on-surface mb-1">Fact Score</p>
              {post.reasoning && (
                <p className="font-body text-sm text-on-surface-variant">{post.reasoning}</p>
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <p className="font-label text-[10px] text-on-surface-variant/50 uppercase tracking-wider">
              Sources Verified: {post.factScore >= 80 ? '3+' : post.factScore >= 60 ? '1-2' : '0'} · Powered by Groq Llama 3.3
            </p>
          </div>
        </div>

        {/* Source Link */}
        {post.sourceLink && (
          <a
            href={post.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 font-label text-xs uppercase tracking-wider text-primary hover:underline underline-offset-4 decoration-primary/30 mb-8"
          >
            <ExternalLink size={14} />
            View Original Source
          </a>
        )}

        {/* Related Posts */}
        {related.length > 0 && (
          <div className="border-t border-outline-variant/12 pt-8">
            <h3 className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Related Articles</h3>
            <div className="flex flex-col gap-3">
              {related.map(r => (
                <Link
                  key={r._id}
                  href={`/post/${r._id}`}
                  className="group flex items-center gap-4 py-3 border-b border-outline-variant/8 last:border-0 hover:bg-surface-container-lowest/50 transition-colors -mx-2 px-2"
                >
                  <span className="font-display text-lg font-black text-on-surface-variant/40 group-hover:text-primary transition-colors min-w-[36px] text-center">
                    {r.factScore}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-on-surface group-hover:text-primary transition-colors truncate">{r.headline}</p>
                    <p className="font-label text-[10px] text-on-surface-variant/50">{r.author?.name} · {timeAgo(r.createdAt)}</p>
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
