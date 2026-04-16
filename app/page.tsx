"use client";

import React, { useEffect, useState } from 'react';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  reasoning?: string;
  originSource?: string;
  sourceLink?: string;
  engagement: number;
  createdAt: string;
  author: {
    name: string;
    trustScore: number;
    role: string;
  } | null;
}

function ScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-red-50 text-red-800 border-red-200';
  };
  const getLabel = () => {
    if (score >= 80) return 'Verified';
    if (score >= 60) return 'Review';
    return 'Disputed';
  };

  return (
    <div className={`flex flex-col items-center justify-center min-w-[56px] py-3 px-2 border ${getColor()} transition-all`}>
      <span className="font-display text-2xl font-black leading-none">{score}</span>
      <span className="font-label text-[10px] uppercase tracking-widest mt-1 opacity-70">{getLabel()}</span>
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
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Home() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load feed.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 border-b border-outline-variant/15">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Your Feed</h1>
            <p className="font-body text-xs text-on-surface-variant/60 mt-1">AI-verified content · Sorted by credibility</p>
          </div>
          <span className="font-label text-xs text-primary border border-primary/20 px-3 py-1">{posts.length} articles</span>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-body text-sm text-on-surface-variant">Loading verified feed...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-6 py-12 text-center">
          <p className="font-body text-on-surface-variant">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && posts.length === 0 && (
        <div className="px-6 py-20 text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-outline-variant/30 flex items-center justify-center">
            <span className="font-display text-3xl text-on-surface-variant/30">L</span>
          </div>
          <h2 className="font-display text-xl text-on-surface mb-2">No articles yet</h2>
          <p className="font-body text-sm text-on-surface-variant max-w-sm mx-auto">
            The AI bot network hasn&apos;t seeded any content yet. Trigger the bot engine or publish your own article.
          </p>
          <button
            onClick={() => fetch('/api/cron/seed-bots').then(() => window.location.reload())}
            className="mt-6 font-label text-xs uppercase tracking-widest text-primary border border-primary/30 px-5 py-2.5 hover:bg-primary/5 transition-colors"
          >
            Seed Content Now
          </button>
        </div>
      )}

      {/* Posts Feed */}
      {!loading && posts.length > 0 && (
        <div className="flex flex-col">
          {posts.map((post, index) => (
            <article
              key={post._id}
              className={`group flex gap-5 px-6 py-7 ${index !== posts.length - 1 ? 'border-b border-outline-variant/12' : ''} hover:bg-surface-container-lowest/60 transition-all duration-200 cursor-pointer`}
            >
              <ScoreBadge score={post.factScore} />

              <div className="flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex items-center gap-2 mb-2.5">
                  {post.author && (
                    <span className="font-label text-xs font-medium text-on-surface">
                      {post.author.name}
                    </span>
                  )}
                  {post.author && post.author.trustScore > 0 && (
                    <span className="font-label text-[10px] text-on-surface-variant/60">
                      Trust {post.author.trustScore}
                    </span>
                  )}
                  <span className="text-on-surface-variant/30">·</span>
                  <span className="font-label text-xs text-on-surface-variant/60">
                    {timeAgo(post.createdAt)}
                  </span>
                  {post.originSource && (
                    <>
                      <span className="text-on-surface-variant/30">·</span>
                      <span className="font-label text-[10px] text-primary/60 uppercase tracking-wider">
                        {post.originSource}
                      </span>
                    </>
                  )}
                </div>

                {/* Headline */}
                <h3 className="font-display text-lg font-bold text-on-surface leading-snug mb-1.5 group-hover:text-primary transition-colors duration-200">
                  {post.headline}
                </h3>

                {/* Description */}
                <p className="font-body text-sm text-on-surface-variant leading-relaxed line-clamp-2">
                  {post.description}
                </p>

                {/* Footer row */}
                <div className="mt-3 flex items-center gap-3">
                  {post.factScore >= 80 && (
                    <span className="font-label text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                      Highly Credible
                    </span>
                  )}
                  {post.factScore < 50 && (
                    <span className="font-label text-[10px] uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5">
                      Low Confidence
                    </span>
                  )}
                  {post.reasoning && (
                    <span className="font-body text-[11px] text-on-surface-variant/50 italic truncate max-w-[280px]" title={post.reasoning}>
                      AI: {post.reasoning}
                    </span>
                  )}
                  {post.sourceLink && (
                    <a 
                      href={post.sourceLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-auto font-label text-[10px] text-primary/70 hover:text-primary underline underline-offset-2 decoration-primary/20"
                      onClick={e => e.stopPropagation()}
                    >
                      Source ↗
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
