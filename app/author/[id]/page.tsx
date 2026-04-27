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

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.length > 0 ? posts.map((post) => (
                    <Link href={`/post/${post._id}`} prefetch={true} key={post._id} className="group relative block w-full aspect-[4/5] overflow-hidden bg-surface-container-high border border-outline-variant hover:border-primary/50 transition-colors">
                       {/* Media Background */}
                       {post.imageUrl ? (
                          <img src={post.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100" alt="" />
                       ) : (
                          <div className="absolute inset-0 w-full h-full flex flex-col justify-center items-center text-on-surface-variant/10">
                            <span className="font-display text-4xl font-black">LETTR</span>
                          </div>
                       )}

                       {/* Vignette Overlay */}
                       <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/95 via-[#0a0a0a]/50 to-transparent group-hover:from-[#0a0a0a]/90 transition-colors" />

                       {/* Content Overlay */}
                       <div className="absolute inset-0 p-5 flex flex-col justify-end">
                          <div className="flex items-center gap-2 mb-3">
                             <div className="flex items-center gap-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-md rounded border border-white/10">
                                <Shield size={10} className={post.factScore >= 80 ? 'text-emerald-400' : 'text-amber-400'} />
                                <span className={`font-display text-[10px] font-black ${post.factScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {post.factScore}%
                                </span>
                             </div>
                             <span className="font-label text-[9px] uppercase tracking-widest text-white/70">
                                {post.category}
                             </span>
                          </div>
                          
                          <h3 className="font-display text-lg font-bold text-white/90 group-hover:text-white transition-colors leading-snug line-clamp-4">
                             {post.headline}
                          </h3>
                       </div>
                    </Link>
                  )) : (
                     <div className="col-span-full py-20 text-center border border-dashed border-outline-variant/40 rounded-sm">
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
