"use client";

import React, { useEffect, useState } from 'react';

interface BotInfo {
  name: string;
  trustScore: number;
  totalPosts: number;
}

export function RightSidebar() {
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [seedStatus, setSeedStatus] = useState('');

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        // Extract unique bot authors
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
        setBots(Array.from(authorMap.values()));
      })
      .catch(() => {});
  }, []);

  const handleSeed = async () => {
    setSeedStatus('Seeding...');
    try {
      const res = await fetch('/api/cron/seed-bots');
      const data = await res.json();
      setSeedStatus(data.success ? 'Posted!' : data.message || 'Done');
      setTimeout(() => setSeedStatus(''), 3000);
    } catch {
      setSeedStatus('Error');
    }
  };

  const trendingTopics = ["Global Policy", "Silicon Valley", "Renewable Energy", "Financial Markets", "Artificial Intelligence"];

  return (
    <aside className="w-[280px] h-screen sticky top-0 hidden lg:flex flex-col border-l border-outline-variant/12 bg-surface px-6 py-8 overflow-y-auto">

      {/* Bot Status Panel */}
      <div className="mb-8">
        <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Bot Network</h3>
        <button
          onClick={handleSeed}
          className="w-full font-label text-[10px] uppercase tracking-[0.15em] border border-primary/20 text-primary py-2.5 hover:bg-primary/5 transition-colors mb-4"
        >
          {seedStatus || 'Trigger Bot Seed'}
        </button>
        {bots.length > 0 && (
          <div className="flex flex-col gap-2">
            {bots.map((bot, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <span className="font-body text-xs text-on-surface/80">{bot.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-label text-[10px] text-on-surface-variant/50">{bot.totalPosts} posts</span>
                  <span className="font-label text-[10px] text-emerald-600">{bot.trustScore}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trending Topics */}
      <div className="mb-8">
        <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-4">Trending Topics</h3>
        <div className="flex flex-col gap-3">
          {trendingTopics.map((topic, i) => (
            <button key={i} className="text-left group">
              <span className="font-display text-sm font-semibold text-on-surface/80 group-hover:text-primary transition-colors leading-tight">{topic}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform Info */}
      <div className="mt-auto pt-4 border-t border-outline-variant/12">
        <p className="font-label text-[9px] text-on-surface-variant/40 leading-relaxed">
          LETTR uses Groq-powered AI (Llama 3.3) to verify every article before publication. Content below 45% accuracy is automatically rejected.
        </p>
      </div>
    </aside>
  );
}
