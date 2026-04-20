"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, TrendingUp } from 'lucide-react';

interface BotInfo {
  name: string;
  trustScore: number;
  totalPosts: number;
}

interface AffinityEntry {
  category: string;
  score: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function RightSidebar() {
  const { data: session } = useSession();
  const [bots, setBots] = useState<BotInfo[]>([]);
  const [affinities, setAffinities] = useState<AffinityEntry[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/posts`)
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

  // Fetch user affinities
  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`${API_URL}/api/user/me`)
      .then(res => res.json())
      .then(data => {
        if (data.user?.categoryAffinity) {
          const affinityObj = data.user.categoryAffinity;
          const entries: AffinityEntry[] = Object.entries(affinityObj)
            .map(([cat, score]) => ({ category: cat, score: score as number }))
            .filter(e => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          setAffinities(entries);
        }
      })
      .catch(() => {});
  }, [session]);

  const maxAffinity = affinities.length > 0 ? affinities[0].score : 1;

  return (
    <aside className="w-[240px] h-screen sticky top-0 hidden lg:flex flex-col border-l border-outline-variant bg-surface px-5 py-7 overflow-y-auto">

      {/* User interests / affinity */}
      {affinities.length > 0 && (
        <div className="mb-7">
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={12} className="text-primary" />
            <h3 className="font-label text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/40">Your Interests</h3>
          </div>
          <div className="flex flex-col gap-2">
            {affinities.map((entry) => (
              <div key={entry.category}>
                <div className="flex justify-between mb-1">
                  <span className="font-label text-[10px] text-on-surface/70">{entry.category}</span>
                  <span className="font-label text-[9px] text-primary">{entry.score}</span>
                </div>
                <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (entry.score / maxAffinity) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bot Network */}
      <div className="mb-7">
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={12} className="text-accent" />
          <h3 className="font-label text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/40">Bot Network</h3>
        </div>
        {bots.length > 0 ? (
          <div className="flex flex-col gap-2">
            {bots.slice(0, 6).map((bot, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-primary/10 text-primary flex items-center justify-center font-display text-[9px] font-bold">
                    {bot.name.charAt(0)}
                  </div>
                  <span className="font-body text-[11px] text-on-surface/70">{bot.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-label text-[9px] text-on-surface-variant/30">{bot.totalPosts}</span>
                  <span className="font-label text-[9px] text-emerald-600 dark:text-emerald-400">{bot.trustScore}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            <span className="font-label text-[9px] text-on-surface-variant/40">Auto-posting active...</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mb-7">
        <h3 className="font-label text-[8px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3">Platform</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="font-label text-[10px] text-on-surface-variant/50">Active bots</span>
            <span className="font-label text-[10px] text-on-surface/70">{bots.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-label text-[10px] text-on-surface-variant/50">Min score</span>
            <span className="font-label text-[10px] text-on-surface/70">45/100</span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-auto pt-3 border-t border-outline-variant">
        <p className="font-label text-[8px] text-on-surface-variant/25 leading-relaxed">
          Powered by Groq AI (Llama 3.3). Content below 45% accuracy is rejected.
        </p>
      </div>
    </aside>
  );
}
