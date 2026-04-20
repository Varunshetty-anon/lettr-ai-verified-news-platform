"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, Users, Award, Calendar, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthorProfilePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [author, setAuthor] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/authors/${params.id}`);
        const data = await res.json();
        if (res.ok) {
          setAuthor(data.author);
          setPosts(data.posts);
          
          // Check if current user is following this author
          if (session?.user?.email) {
             const userRes = await fetch(`/api/user/me`);
             const userData = await userRes.json();
             if (userData.user && userData.user.following) {
                setIsFollowing(userData.user.following.includes(params.id));
             }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id, session]);

  const handleFollow = async () => {
    if (!session) {
      router.push('/auth');
      return;
    }
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/user/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: params.id })
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
        setAuthor({
           ...author,
           followersCount: data.isFollowing ? author.followersCount + 1 : author.followersCount - 1
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return (
    <div className="w-full min-h-screen flex items-center justify-center bg-surface-container-lowest">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!author) return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-surface-container-lowest">
       <h1 className="font-display text-2xl font-bold text-on-surface">Author Not Found</h1>
       <Link href="/" className="text-primary mt-4 font-label text-xs uppercase tracking-widest hover:underline">Return to Feed</Link>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-surface-container-lowest pb-20 animate-fade-in">
      {/* Header / Banner Area */}
      <div className="w-full h-48 bg-surface-container-low border-b border-outline-variant relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
         <div className="max-w-5xl mx-auto px-5 h-full flex items-end pb-8">
            <button onClick={() => router.back()} className="absolute top-8 left-5 text-on-surface-variant/60 hover:text-primary transition-colors">
               <ArrowLeft size={20} />
            </button>
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 -mt-12">
         <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Sidebar / Profile Info */}
            <div className="w-full md:w-80 shrink-0 space-y-6">
               <div className="bg-surface-container-low border border-outline-variant p-8 shadow-sm">
                  <div className="w-24 h-24 bg-surface-container-high rounded-full border-4 border-surface-container-lowest mb-6 flex items-center justify-center text-3xl font-display font-black text-primary/40 overflow-hidden">
                     {author.image ? <img src={author.image} alt="" className="w-full h-full object-cover" /> : author.name[0]}
                  </div>
                  
                  <h1 className="font-display text-2xl font-black text-on-surface flex items-center gap-2">
                     {author.name}
                     {author.isVerifiedAuthor && <Shield size={18} className="text-emerald-500" />}
                  </h1>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/40 mt-1 mb-6">
                     {author.role === 'AUTHOR' ? 'Verified Professional Author' : 'LETTR Contributor'}
                  </p>

                  <div className="space-y-4 pt-6 border-t border-outline-variant/30">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant/60">
                           <Users size={14} />
                           <span className="font-label text-xs">Followers</span>
                        </div>
                        <span className="font-display font-bold text-on-surface">{author.followersCount || 0}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-on-surface-variant/60">
                           <Award size={14} />
                           <span className="font-label text-xs">Credibility</span>
                        </div>
                        <span className={`font-display font-bold ${author.avgScore > 80 ? 'text-emerald-500' : 'text-primary'}`}>
                           {author.avgScore}%
                        </span>
                     </div>
                  </div>

                  <button 
                    onClick={handleFollow}
                    disabled={followLoading || (session?.user as any)?.email === author.email}
                    className={`w-full mt-8 h-12 font-label text-[10px] uppercase tracking-[0.2em] font-bold transition-all shadow-md ${
                       isFollowing 
                       ? 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high' 
                       : 'bg-primary text-on-primary hover:bg-primary/90 shadow-primary/10'
                    } disabled:opacity-50`}
                  >
                     {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow Author'}
                  </button>
               </div>

               <div className="bg-surface-container-low border border-outline-variant p-6 text-[11px] text-on-surface-variant/50 space-y-3 font-label tracking-widest">
                  <div className="flex items-center gap-2">
                     <Calendar size={12} />
                     JOINED {new Date(author.createdAt).toLocaleDateString()}
                  </div>
               </div>
            </div>

            {/* Main Content / Posts */}
            <div className="flex-1 w-full space-y-10">
               <div className="border-b border-outline-variant pb-4 flex items-center justify-between">
                  <h2 className="font-display text-sm uppercase tracking-[0.3em] text-on-surface font-black">Published Reports</h2>
                  <span className="font-label text-[10px] text-on-surface-variant/40">{posts.length} ARTICLES</span>
               </div>

               <div className="space-y-12">
                  {posts.length > 0 ? posts.map((post) => (
                    <article key={post._id} className="group relative">
                       <div className="flex flex-col md:flex-row gap-6">
                          {post.imageUrl && (
                             <div className="w-full md:w-48 h-32 bg-surface-container-high shrink-0 overflow-hidden">
                                <img src={post.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" alt="" />
                             </div>
                          )}
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-2">
                                <span className="font-label text-[9px] uppercase tracking-widest text-primary font-bold">{post.category}</span>
                                <span className="w-1 h-1 bg-outline-variant rounded-full" />
                                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/40">
                                   {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                             </div>
                             <Link href={`/post/${post._id}`}>
                                <h3 className="font-display text-xl font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mb-3">
                                   {post.headline}
                                </h3>
                             </Link>
                             <p className="font-body text-sm text-on-surface-variant/70 line-clamp-2 leading-relaxed mb-4">
                                {post.description}
                             </p>
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/5 border border-emerald-500/10 rounded-sm">
                                   <Shield size={10} className="text-emerald-500" />
                                   <span className="font-label text-[9px] font-bold text-emerald-600">{post.factScore}% FACT SCORE</span>
                                </div>
                                <Link href={`/post/${post._id}`} className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors flex items-center gap-1">
                                   READ FULL REPORT <ExternalLink size={10} />
                                </Link>
                             </div>
                          </div>
                       </div>
                    </article>
                  )) : (
                     <div className="py-20 text-center border border-dashed border-outline-variant/40 rounded-sm">
                        <p className="font-body text-sm text-on-surface-variant/40">This author hasn't published any reports yet.</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
