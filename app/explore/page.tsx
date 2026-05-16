"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, Users, ArrowUpRight, CheckCircle, Shield } from "lucide-react";
import { Chip } from "../components/ui/Chip";
import { FactScoreBadge } from "../components/ui/FactScoreBadge";
import { ArticleCard, Post } from "../components/ui/ArticleCard";

interface AuthorData {
  _id: string;
  name: string;
  image?: string;
  isVerifiedAuthor?: boolean;
  followersCount?: number;
}

export default function Explore() {
  const [trending, setTrending] = useState<Post[]>([]);
  const [topAuthors, setTopAuthors] = useState<AuthorData[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<'recent'|'score'>('score');
  const [posts, setPosts] = useState<Post[]>([]);
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
    setTimeout(() => setLoading(true), 0);
    fetch(`/api/posts?category=${encodeURIComponent(activeCategory)}&sort=${activeSort}`)
      .then(res => res.json())
      .then(data => { setPosts(data.posts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [activeCategory, activeSort]);

  return (
    <div className="w-full min-h-screen pb-[64px]">
      <div className="pt-[64px] pb-[32px] border-b border-outline-variant/30 mb-[32px]">
        <h1 className="font-display font-bold text-[80px] leading-[1.0] tracking-[-0.04em] text-on-surface">Explore</h1>
        <p className="font-body text-[20px] text-on-surface-variant mt-2">Discover verified authors and trending topics</p>
      </div>

      <div className="py-4 border-b border-outline-variant/30 overflow-x-auto no-scrollbar sticky top-[53px] sm:top-0 z-10 bg-surface">
        <div className="flex gap-[8px]">
          {categories.map(cat => (
            <Chip
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setPosts([]); }}
            />
          ))}
        </div>
      </div>

      {!activeCategory && (
        <div className="mt-[64px] space-y-[128px]">
          {/* Trending Section */}
          {trending.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-[32px] border-l-[4px] border-primary pl-4">
                <TrendingUp size={24} className="text-primary" />
                <h3 className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface font-bold">Trending Reports</h3>
              </div>
              <div className="grid grid-cols-1 gap-[16px]">
                {trending.map((post, i) => (
                  <ArticleCard key={post._id} post={post} variant="brief" index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Discovery Section: Top Authors */}
          {topAuthors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-[32px] border-l-[4px] border-primary pl-4">
                <Users size={24} className="text-primary" />
                <h3 className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface font-bold">Verified Experts to Follow</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                {topAuthors.map((auth) => (
                  <Link key={auth._id} href={`/author/${auth._id}`} className="group flex items-center gap-6 p-6 bg-surface border border-outline-variant hover:border-primary/30 transition-all rounded-none">
                    <div className="w-16 h-16 bg-surface-variant overflow-hidden shrink-0 flex items-center justify-center text-on-surface font-display font-bold text-[24px] border border-outline-variant/50 rounded-none">
                       {auth.image ? <img src={auth.image} className="w-full h-full object-cover" /> : auth.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <p className="font-display text-[24px] font-bold text-on-surface group-hover:text-primary transition-colors truncate">{auth.name}</p>
                         {auth.isVerifiedAuthor && <CheckCircle size={16} className="text-tertiary" />}
                      </div>
                      <p className="font-label text-[12px] text-on-surface-variant uppercase tracking-[0.1em] mt-1">{auth.followersCount || 0} Followers</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {activeCategory && (
        <div className="pt-[32px]">
          <div className="flex gap-6 mb-[32px] border-b border-outline-variant/30 pb-2">
            {(['recent', 'score'] as const).map(s => (
              <button key={s} onClick={() => setActiveSort(s)} className={`font-label text-[12px] uppercase tracking-[0.1em] font-bold pb-3 border-b-2 transition-all rounded-none ${activeSort === s ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                {s === 'recent' ? 'Latest Reporting' : 'Highest Fidelity'}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-[16px]">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse p-6 bg-surface border border-outline-variant rounded-none">
                  <div className="h-5 bg-surface-variant w-3/4 mb-3" />
                  <div className="h-4 bg-surface-variant w-full" />
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="py-20 text-center border border-outline-variant/30 mt-[32px] rounded-none">
              <h3 className="font-display text-[24px] text-on-surface mb-2 font-bold tracking-[-0.01em]">NO REPORTS IN {activeCategory.toUpperCase()}</h3>
              <p className="font-body text-[16px] text-on-surface-variant">Our verification bots are currently analyzing new sources.</p>
            </div>
          )}

          {!loading && posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px]">
              {posts.map(post => (
                <Link key={post._id} href={`/post/${post._id}`} className="group block p-6 bg-surface border border-outline-variant hover:border-outline transition-all rounded-none relative overflow-hidden break-inside-avoid">
                  <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-3">
                    <div className="flex items-center gap-3">
                      {post.author && (
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-surface-variant flex items-center justify-center text-[12px] font-bold text-on-surface border border-outline-variant/50 rounded-none">
                              {post.author.name[0]}
                           </div>
                           <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface font-bold">{post.author.name}</span>
                           {post.author.isVerifiedAuthor && <CheckCircle size={12} className="text-tertiary" />}
                        </div>
                      )}
                      <span className="font-body text-[12px] text-on-surface-variant">· {new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                    <FactScoreBadge score={post.factScore} />
                  </div>
                  <h3 className="font-display text-[32px] font-bold text-on-surface leading-[1.2] tracking-[-0.01em] group-hover:text-primary transition-colors mb-3">{post.headline}</h3>
                  <p className="font-body text-[16px] text-on-surface-variant line-clamp-3 leading-[1.6] mb-5">{post.description}</p>
                  <div className="inline-flex items-center gap-2 font-label text-[12px] uppercase tracking-[0.1em] text-primary font-bold">
                     Read Detailed Portfolio <ArrowUpRight size={14} />
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
