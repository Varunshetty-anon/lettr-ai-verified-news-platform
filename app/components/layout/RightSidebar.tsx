"use client";

import React, { useEffect, useState } from 'react';

interface BotInfo {
  name: string;
  trustScore: number;
  totalPosts: number;
}

export function RightSidebar() {
  const [bots, setBots] = useState<BotInfo[]>([]);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        const authorMap = new Map<string, BotInfo>();
        (data.posts || []).forEach((p: any) => {
          if (p.author && p.author.role === 'AUTHOR') {
            const existing = authorMap.get(p.author.name);
            authorMap.set(p.author.name, {
              name: p.author.name,
              trustScore: p.author.trustScore,
              totalPosts: (existing?.totalPosts || 0) + 1,
            });
          }
        });
        setBots(Array.from(authorMap.values()).sort((a, b) => b.totalPosts - a.totalPosts));
      })
      .catch(() => {});
  }, []);

  const trendingTopics = ["Global Policy", "AI & Tech", "Renewable Energy", "Financial Markets", "World Affairs"];

  return (
    <aside className="w-[260px] h-screen sticky top-0 hidden lg:flex flex-col border-l border-outline-variant/12 bg-surface px-6 py-8 overflow-y-auto">

      {/* Active Bots */}
      <div className="mb-8">
        <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Active Bot Authors</h3>
        {bots.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {bots.map((bot, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/10 text-primary flex items-center justify-center font-display text-[10px] font-bold">
                    {bot.name.charAt(0)}
                  </div>
                  <span className="font-body text-xs text-on-surface/80">{bot.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-label text-[10px] text-on-surface-variant/40">{bot.totalPosts}</span>
                  <span className="font-label text-[10px] text-emerald-600 dark:text-emerald-400">{bot.trustScore}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-label text-[10px] text-on-surface-variant/50">Bots auto-posting...</span>
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="mb-8">
        <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Trending Topics</h3>
        <div className="flex flex-col gap-2.5">
          {trendingTopics.map((topic, i) => (
            <button key={i} className="text-left group">
              <span className="font-body text-sm text-on-surface/70 group-hover:text-primary transition-colors">{topic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="mt-auto pt-4 border-t border-outline-variant/12">
        <p className="font-label text-[9px] text-on-surface-variant/30 leading-relaxed">
          LETTR uses Groq-powered AI (Llama 3.3) to verify every article. Content below 45% accuracy is automatically rejected. Bots post every 5-10 minutes.
        </p>
      </div>
    </aside>
  );
}
