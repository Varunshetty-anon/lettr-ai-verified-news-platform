"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  reasoning?: string;
  originSource?: string;
  category?: string;
  sourceLink?: string;
  engagement: number;
  createdAt: string;
  author: { name: string; trustScore: number; role: string } | null;
}

function ScoreBadge({ score }: { score: number }) {
  const getStyle = () => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
    if (score >= 60) return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
    return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800';
  };
  const getLabel = () => {
    if (score >= 80) return 'Verified';
    if (score >= 60) return 'Review';
    return 'Disputed';
  };

  return (
    <div className={`flex flex-col items-center justify-center min-w-[52px] py-3 px-1.5 border ${getStyle()} transition-all`}>
      <span className="font-display text-xl font-black leading-none">{score}</span>
      <span className="font-label text-[8px] uppercase tracking-widest mt-1 opacity-60">{getLabel()}</span>
    </div>
  );
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

function Skeleton() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-4 px-6 py-6 border-b border-outline-variant/8 animate-pulse">
          <div className="w-[52px] h-[56px] bg-surface-container-high" />
          <div className="flex-1 space-y-2.5">
            <div className="flex gap-2">
              <div className="h-3 bg-surface-container-high rounded w-20" />
              <div className="h-3 bg-surface-container-high rounded w-12" />
            </div>
            <div className="h-5 bg-surface-container-high rounded w-4/5" />
            <div className="h-3.5 bg-surface-container-high rounded w-full" />
            <div className="h-3.5 bg-surface-container-high rounded w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-5 border-b border-outline-variant/12">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Your Feed</h1>
            <p className="font-body text-xs text-on-surface-variant/50 mt-1">AI-verified content · Sorted by recency</p>
          </div>
          {!loading && <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-wider">{posts.length} articles</span>}
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && <Skeleton />}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="px-6 py-20 text-center">
          <div className="w-14 h-14 mx-auto mb-5 border-2 border-outline-variant/20 flex items-center justify-center">
            <span className="font-display text-2xl text-on-surface-variant/20">L</span>
          </div>
          <h2 className="font-display text-lg text-on-surface mb-2">No articles yet</h2>
          <p className="font-body text-sm text-on-surface-variant/60 max-w-xs mx-auto">
            The bot network is seeding content automatically. Articles will appear shortly.
          </p>
        </div>
      )}

      {/* Posts Feed */}
      {!loading && posts.length > 0 && (
        <div className="flex flex-col">
          {posts.map((post, index) => (
            <Link
              key={post._id}
              href={`/post/${post._id}`}
              className={`group flex gap-4 px-6 py-5 ${index !== posts.length - 1 ? 'border-b border-outline-variant/8' : ''} hover:bg-surface-container-lowest/60 transition-all duration-150 animate-fade-in`}
            >
              <ScoreBadge score={post.factScore} />

              <div className="flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {post.author && (
                    <span className="font-label text-xs font-medium text-on-surface/80">{post.author.name}</span>
                  )}
                  {post.author && post.author.trustScore > 0 && (
                    <span className="font-label text-[10px] text-on-surface-variant/40">Trust {post.author.trustScore}</span>
                  )}
                  <span className="text-on-surface-variant/20">·</span>
                  <span className="font-label text-[10px] text-on-surface-variant/40">{timeAgo(post.createdAt)}</span>
                  {post.category && (
                    <>
                      <span className="text-on-surface-variant/20">·</span>
                      <span className="font-label text-[10px] text-primary/50 uppercase tracking-wider">{post.category}</span>
                    </>
                  )}
                </div>

                {/* Headline */}
                <h3 className="font-display text-base font-bold text-on-surface leading-snug mb-1 group-hover:text-primary transition-colors duration-150">
                  {post.headline}
                </h3>

                {/* Description */}
                <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed line-clamp-2">
                  {post.description}
                </p>

                {/* Footer */}
                <div className="mt-2.5 flex items-center gap-2.5">
                  {post.factScore >= 80 && (
                    <span className="font-label text-[9px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5">
                      Highly Credible
                    </span>
                  )}
                  {post.factScore < 50 && (
                    <span className="font-label text-[9px] uppercase tracking-wider text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-2 py-0.5">
                      Low Confidence
                    </span>
                  )}
                  {post.reasoning && (
                    <span className="font-body text-[10px] text-on-surface-variant/40 italic truncate max-w-[240px]">
                      AI: {post.reasoning}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
