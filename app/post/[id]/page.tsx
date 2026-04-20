"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, ExternalLink, Shield, CheckCircle, Heart, Info, Globe, Users } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface PostDetail {
  _id: string;
  headline: string;
  description: string;
  body?: string;
  factScore: number;
  factSummary?: string;
  confidence?: string;
  sourcesChecked?: number;
  reasoning?: string;
  originSource?: string;
  category?: string;
  sourceLink?: string;
  imageUrl?: string;
  videoUrl?: string;
  engagement: number;
  createdAt: string;
  author: { _id: string; name: string; image?: string; trustScore: number; role: string; totalPosts: number; isVerifiedAuthor: boolean } | null;
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
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [related, setRelated] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/posts/${id}`)
      .then(res => res.json())
      .then(data => {
        setPost(data.post);
        setRelated(data.related || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (session?.user?.email) {
      fetch(`/api/user/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email, postId: id, action: 'view' })
      }).catch(() => {});
    }
  }, [id, session]);

  const handleLike = async () => {
    if (!post || !session?.user?.email) return;
    const newLiked = !liked;
    setLiked(newLiked);

    await fetch(`/api/user/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: session.user.email,
        postId: post._id,
        action: newLiked ? 'like' : 'unlike'
      })
    }).catch(() => {});
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen p-5 bg-surface-container-lowest">
        <div className="max-w-4xl mx-auto animate-pulse space-y-8 pt-10">
          <div className="h-4 bg-surface-container-high rounded w-20" />
          <div className="h-12 bg-surface-container-high rounded w-3/4" />
          <div className="h-4 bg-surface-container-high rounded w-32" />
          <div className="h-[400px] bg-surface-container-high rounded w-full" />
          <div className="space-y-4">
             <div className="h-4 bg-surface-container-high rounded w-full" />
             <div className="h-4 bg-surface-container-high rounded w-full" />
             <div className="h-4 bg-surface-container-high rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="text-center">
          <h2 className="font-display text-2xl text-on-surface mb-4">Report not found</h2>
          <Link href="/" className="font-label text-xs uppercase tracking-widest text-primary border border-primary/20 px-6 py-3 hover:bg-primary/5 transition-colors">Return to feed</Link>
        </div>
      </div>
    );
  }

  const scoreColor = post.factScore >= 85 ? 'text-emerald-500' : post.factScore >= 60 ? 'text-amber-500' : 'text-red-500';
  const scoreBg = post.factScore >= 85 ? 'bg-emerald-500/10' : post.factScore >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10';
  const scoreBorder = post.factScore >= 85 ? 'border-emerald-500/20' : post.factScore >= 60 ? 'border-amber-500/20' : 'border-red-500/20';

  const articleBody = post.body || post.description;

  return (
    <div className="w-full min-h-screen bg-surface-container-lowest animate-fade-in pb-20">
      <div className="sticky top-0 z-20 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant px-5 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
           <Link href="/" className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors font-bold">
             <ArrowLeft size={16} /> Back to Intel Feed
           </Link>
           <div className={`flex items-center gap-2 px-3 py-1 border rounded-full ${scoreBg} ${scoreBorder}`}>
             <Shield size={12} className={scoreColor} />
             <span className={`font-display text-xs font-black ${scoreColor}`}>{post.factScore}% FIDELITY</span>
           </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-5 pt-12">
        <div className="flex items-center gap-3 mb-6">
           <span className="font-label text-[10px] uppercase tracking-[0.2em] text-primary font-black px-2 py-1 bg-primary/5 border border-primary/10">
              {post.category}
           </span>
           <span className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{timeAgo(post.createdAt)}</span>
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-black text-on-surface leading-[1.1] mb-8">
          {post.headline}
        </h1>

        {post.author && (
          <div className="flex items-center gap-4 mb-10 pb-8 border-b border-outline-variant">
            <Link href={`/author/${post.author._id}`} className="w-12 h-12 bg-surface-container-high rounded-full overflow-hidden flex items-center justify-center font-display text-lg font-black text-primary/40 border border-outline-variant/30 hover:opacity-80 transition-opacity">
              {post.author.image ? <img src={post.author.image} alt="" className="w-full h-full object-cover" /> : post.author.name.charAt(0)}
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link href={`/author/${post.author._id}`} className="font-display text-base font-bold text-on-surface hover:text-primary transition-colors underline decoration-outline-variant/30 underline-offset-4">{post.author.name}</Link>
                {post.author.role === 'AUTHOR' && <span className="font-label text-[8px] px-1.5 py-0.5 bg-primary/10 text-primary font-bold tracking-widest">BOT</span>}
                {post.author.isVerifiedAuthor && <CheckCircle size={14} className="text-emerald-500" />}
              </div>
              <p className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest mt-0.5">
                Author Trust: {post.author.trustScore}% · {post.author.totalPosts || 0} Reports Published
              </p>
            </div>
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 border transition-all ${liked ? 'bg-red-500/5 border-red-500/20 text-red-500' : 'border-outline-variant text-on-surface-variant/40 hover:text-red-500'}`}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span className="font-label text-xs font-bold">{post.engagement + (liked ? 1 : 0)}</span>
            </button>
          </div>
        )}

        {post.imageUrl && (
          <div className="mb-10 shadow-2xl">
            <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-auto object-cover max-h-[600px] border border-outline-variant" />
          </div>
        )}

        {post.videoUrl && mounted && (
          <div className="mb-10 border border-outline-variant relative pt-[56.25%] bg-black">
            <ReactPlayer url={post.videoUrl} controls width="100%" height="100%" className="absolute top-0 left-0" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
           <div className="md:col-span-2">
              <div className="font-body text-lg text-on-surface/90 leading-[1.8] mb-12 whitespace-pre-line prose prose-invert max-w-none">
                {articleBody}
              </div>

              {post.sourceLink && (
                 <div className="p-6 bg-surface-container-low border border-outline-variant mb-12">
                    <h4 className="font-display text-[10px] uppercase tracking-widest text-on-surface-variant/50 mb-4 font-black">Primary Documentation</h4>
                    <a href={post.sourceLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-primary hover:underline font-body text-sm break-all">
                       <Globe size={16} /> {post.sourceLink} <ExternalLink size={14} />
                    </a>
                 </div>
              )}
           </div>

           <div className="space-y-8">
              {/* Fact Check Card */}
              <div className={`border ${scoreBorder} ${scoreBg} p-6 sticky top-24`}>
                 <div className="flex items-center gap-2 mb-4 border-b border-on-surface/5 pb-3">
                    <Shield size={16} className={scoreColor} />
                    <span className="font-display text-[10px] uppercase tracking-widest font-black text-on-surface">AI Intel Report</span>
                 </div>
                 
                 <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                       <span className={`font-display text-4xl font-black ${scoreColor}`}>{post.factScore}%</span>
                       <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40">Certainty</span>
                    </div>
                    <div className="w-full h-1 bg-on-surface/5 rounded-full overflow-hidden">
                       <div className={`h-full ${post.factScore >= 85 ? 'bg-emerald-500' : post.factScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${post.factScore}%` }} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div>
                       <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-2 font-bold">Verification Summary</span>
                       <p className="font-body text-xs text-on-surface/80 leading-relaxed italic border-l-2 border-primary/20 pl-3">
                          "{post.factSummary || post.reasoning || "Factual assessment confirmed via automated analysis."}"
                       </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-on-surface/5">
                       <div>
                          <span className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant/50 block mb-1">Confidence</span>
                          <span className="font-label text-[10px] font-black uppercase text-on-surface">{post.confidence || 'Medium'}</span>
                       </div>
                       <div>
                          <span className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant/50 block mb-1">Sources</span>
                          <span className="font-label text-[10px] font-black uppercase text-on-surface">{post.sourcesChecked || 'Validated'}</span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-6 flex items-center gap-2 text-[9px] font-label uppercase tracking-widest text-on-surface-variant/40">
                    <Info size={10} />
                    Validated by Groq Llama 3.3
                 </div>
              </div>
           </div>
        </div>

        {/* Related Section */}
        {related.length > 0 && (
          <div className="border-t border-outline-variant pt-12 mt-12">
            <h3 className="font-display text-xs uppercase tracking-[0.3em] text-on-surface font-black mb-8">Related Intelligence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {related.map(r => (
                <Link key={r._id} href={`/post/${r._id}`} className="group p-6 border border-outline-variant hover:border-primary/30 transition-all bg-surface-container-low flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                       <span className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">{r.category}</span>
                       <div className={`font-display text-xs font-black ${r.factScore >= 80 ? 'text-emerald-500' : 'text-on-surface-variant/40'}`}>
                          {r.factScore}%
                       </div>
                    </div>
                    <h4 className="font-display text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mb-4">{r.headline}</h4>
                  </div>
                  <div className="flex items-center justify-between font-label text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
                     <span>{r.author?.name}</span>
                     <span>{timeAgo(r.createdAt)}</span>
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
