"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle, TrendingUp, Users, ArrowUpRight } from 'lucide-react';

interface PostData {
  _id: string;
  headline: string;
  description: string;
  factScore: number;
  category?: string;
  createdAt: string;
  engagement: number;
  imageUrl?: string;
  videoUrl?: string;
  author: { name: string; trustScore: number; role: string; isVerifiedAuthor: boolean } | null;
}

interface AuthorData {
  _id: string;
  name: string;
  image?: string;
  followersCount: number;
  isVerifiedAuthor: boolean;
  role: string;
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

export default function Explore() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'recent' | 'score'>('recent');
  const [posts, setPosts] = useState<PostData[]>([]);
  const [trending, setTrending] = useState<PostData[]>([]);
  const [topAuthors, setTopAuthors] = useState<AuthorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/posts?sort=score`)
      .then(res => res.json())
      .then(data => setTrending((data.posts || []).slice(0, 5)))
      .catch(() => {});

    fetch('/api/posts/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(() => {});

    fetch('/api/authors/top')
      .then(res => res.json())
      .then(data => setTopAuthors(data.authors || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    setLoading(true);
    fetch(`/api/posts?category=${encodeURIComponent(activeCategory)}&sort=${activeSort}`)
      .then(res => res.json())
      .then(data => { setPosts(data.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeCategory, activeSort]);

  return (
    <div className="w-full min-h-screen bg-surface-container-lowest animate-fade-in pb-20">
      <div className="px-5 pt-10 pb-6 border-b border-outline-variant bg-surface-container-low shadow-sm">
        <h1 className="font-display text-sm uppercase tracking-[0.3em] text-on-surface font-black">Explore</h1>
        <p className="font-body text-xs text-on-surface-variant/50 mt-1">Discover verified authors and trending topics</p>
      </div>

      <div className="px-5 py-4 border-b border-outline-variant bg-surface-container-low overflow-x-auto no-scrollbar sticky top-0 z-10">
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setPosts([]); }}
              className={`font-label text-[10px] uppercase tracking-[0.15em] px-4 py-2 border transition-all whitespace-nowrap font-bold ${
                activeCategory === cat
                  ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20'
                  : 'border-outline-variant text-on-surface-variant/60 hover:border-primary/30 hover:text-primary bg-surface-container-low'
              }`}
            >{cat}</button>
          ))}
        </div>
      </div>

      {!activeCategory && (
        <div className="max-w-4xl mx-auto px-5 py-10 space-y-12">
          {/* Trending Section */}
          {trending.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6 border-l-4 border-primary pl-4">
                <TrendingUp size={18} className="text-primary" />
                <h3 className="font-display text-xs uppercase tracking-[0.2em] text-on-surface font-black">Trending Reports</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {trending.map((post, i) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group flex items-center gap-6 p-5 bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all shadow-sm">
                    <span className="font-display text-3xl font-black text-on-surface-variant/10 min-w-[32px] text-center italic">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-snug line-clamp-1">{post.headline}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{post.author?.name}</span>
                        <div className={`flex items-center gap-1 font-display text-[10px] font-bold ${post.factScore >= 80 ? 'text-emerald-500' : 'text-on-surface-variant/40'}`}>
                           <Shield size={10} /> {post.factScore}%
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Discovery Section: Top Authors */}
          {topAuthors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6 border-l-4 border-primary pl-4">
                <Users size={18} className="text-primary" />
                <h3 className="font-display text-xs uppercase tracking-[0.2em] text-on-surface font-black">Verified Experts to Follow</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topAuthors.map((auth) => (
                  <Link key={auth._id} href={`/author/${auth._id}`} className="group flex items-center gap-4 p-5 bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all shadow-sm">
                    <div className="w-12 h-12 bg-surface-container-high rounded-full overflow-hidden shrink-0 flex items-center justify-center text-primary font-black border border-outline-variant/30">
                       {auth.image ? <img src={auth.image} className="w-full h-full object-cover" /> : auth.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                         <p className="font-body text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">{auth.name}</p>
                         {auth.isVerifiedAuthor && <CheckCircle size={12} className="text-emerald-500" />}
                      </div>
                      <p className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest mt-0.5">{auth.followersCount || 0} Followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeCategory && (
        <div className="max-w-4xl mx-auto px-5 pt-8">
          <div className="flex gap-6 mb-8 border-b border-outline-variant pb-2">
            {(['recent', 'score'] as const).map(s => (
              <button key={s} onClick={() => setActiveSort(s)} className={`font-label text-[10px] uppercase tracking-[0.2em] font-black pb-3 border-b-2 transition-all ${activeSort === s ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant/40 hover:text-on-surface'}`}>
                {s === 'recent' ? 'Latest Reporting' : 'Highest Fidelity'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-6 bg-surface-container-low border border-outline-variant shadow-sm">
                  <div className="h-5 bg-surface-container-high rounded w-3/4 mb-3" />
                  <div className="h-4 bg-surface-container-high rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="py-20 text-center border border-dashed border-outline-variant/40">
              <h3 className="font-display text-base text-on-surface mb-2 font-bold uppercase tracking-widest">No reports in {activeCategory}</h3>
              <p className="font-body text-sm text-on-surface-variant/40">Our verification bots are currently analyzing new sources.</p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="grid grid-cols-1 gap-6">
              {posts.map(post => (
                <Link key={post._id} href={`/post/${post._id}`} className="group block p-6 bg-surface-container-low border border-outline-variant hover:border-primary/30 transition-all shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {post.author && (
                        <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-black text-primary/40 border border-outline-variant/30">
                              {post.author.name[0]}
                           </div>
                           <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">{post.author.name}</span>
                           {post.author.isVerifiedAuthor && <CheckCircle size={10} className="text-emerald-500" />}
                        </div>
                      )}
                      <span className="font-label text-[10px] text-on-surface-variant/30">{timeAgo(post.createdAt)}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 font-display text-[10px] font-black ${post.factScore >= 80 ? 'text-emerald-500' : 'text-on-surface-variant/40'}`}>
                      <Shield size={12} /> {post.factScore}%
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-bold text-on-surface leading-tight group-hover:text-primary transition-colors mb-2">{post.headline}</h3>
                  <p className="font-body text-sm text-on-surface-variant/70 line-clamp-2 leading-relaxed mb-4">{post.description}</p>
                  <div className="inline-flex items-center gap-1.5 font-label text-[9px] uppercase tracking-widest text-primary font-bold">
                     Read Detailed Portfolio <ArrowUpRight size={10} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
