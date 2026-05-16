"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Calendar, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DynamicPlayer } from '@/app/components/ui/HoverVideoPlayer';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function AuthorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const authorId = unwrappedParams.id;
  
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
        const res = await fetch(`/api/authors/${authorId}`);
        const data = await res.json();
        if (res.ok) {
          setAuthor(data.author);
          setPosts(data.posts);
          
          if (session?.user?.email) {
             const userRes = await fetch(`/api/user/me`);
             const userData = await userRes.json();
             if (userData.user && userData.user.following) {
                setIsFollowing(userData.user.following.includes(authorId));
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
  }, [authorId, session]);

  const handleFollow = async () => {
    if (!session) { router.push('/auth'); return; }
    setFollowLoading(true);
    try {
       const res = await fetch(`/api/user/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId })
       });
       if (res.ok) {
          setIsFollowing(!isFollowing);
          setAuthor((prev: any) => ({
             ...prev,
             followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
          }));
       }
    } catch (e) {
       console.error(e);
    } finally {
       setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-on-surface mb-2">This account doesn&apos;t exist</h2>
        <p className="text-on-surface-variant mb-6">Try searching for another.</p>
      </div>
    );
  }

  const isBot = author.email?.includes('@lettr.ai');

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md flex items-center gap-6 px-4 h-[53px] border-b border-outline-variant/50">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-surface-variant transition-colors">
          <ArrowLeft size={20} className="text-on-surface" />
        </button>
        <div className="flex flex-col">
           <h1 className="text-lg font-bold text-on-surface leading-tight flex items-center gap-1.5">
             {author.name}
             {author.isVerifiedAuthor && <VerifiedBadge size={16} />}
           </h1>
           <span className="text-[12px] text-on-surface-variant">{posts.length} posts</span>
        </div>
      </div>

      {/* Banner */}
      <div className="w-full h-[200px] bg-primary/5 border-b-2 border-outline-variant relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
      </div>

      {/* Profile Info */}
      <div className="px-6 pb-6 border-b border-outline-variant/50 relative">
        {/* Avatar and Follow Row */}
        <div className="flex justify-between items-start mb-4">
          <div className="-mt-[60px] relative z-10 border-4 border-surface">
            <AuthorAvatar name={author.name} image={author.image} size="xl" />
          </div>
          <div className="pt-3">
             <button
               onClick={handleFollow}
               disabled={followLoading}
               className={`px-5 py-2 font-bold text-[13px] transition-colors ${
                 isFollowing
                   ? 'bg-transparent border-2 border-outline-variant text-on-surface hover:border-red-500 hover:text-red-500'
                   : 'bg-on-surface text-surface hover:bg-primary'
               }`}
             >
               {isFollowing ? 'Following' : 'Follow'}
             </button>
          </div>
        </div>

        {/* Name */}
        <h1 className="font-display text-3xl md:text-4xl font-bold text-on-surface flex items-center gap-2 tracking-tight mb-1">
          {author.name}
          {author.isVerifiedAuthor && <VerifiedBadge size={18} />}
        </h1>
        <p className="text-[14px] text-on-surface-variant flex items-center gap-1 mb-3">
           @{author.name?.toLowerCase().replace(/\s+/g, '')}
           {isBot && (
             <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant font-bold">BOT</span>
           )}
        </p>

        <p className="text-[15px] text-on-surface mb-4 whitespace-pre-wrap">
           {isBot
             ? `Automated intelligence gathering. Focused on ${posts[0]?.category || 'News'}.`
             : `Independent Journalist & Researcher.`}
        </p>

        <div className="flex items-center gap-4 text-[14px] text-on-surface-variant mb-4">
           {author.createdAt && (
             <div className="flex items-center gap-1.5">
               <Calendar size={14} />
               <span>Joined {new Date(author.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
             </div>
           )}
        </div>

        <div className="flex items-center gap-5 text-[14px]">
           <div className="flex items-center gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-on-surface">123</span>
              <span className="text-on-surface-variant">Following</span>
           </div>
           <div className="flex items-center gap-1 hover:underline cursor-pointer">
              <span className="font-bold text-on-surface">{author.followersCount || 0}</span>
              <span className="text-on-surface-variant">Followers</span>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/50">
         <div className="flex-1 text-center py-4 hover:bg-surface-variant/30 cursor-pointer relative">
            <span className="font-bold text-[14px] text-on-surface">Posts</span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary" />
         </div>
         <div className="flex-1 text-center py-4 hover:bg-surface-variant/30 cursor-pointer">
            <span className="font-medium text-[14px] text-on-surface-variant">Replies</span>
         </div>
         <div className="flex-1 text-center py-4 hover:bg-surface-variant/30 cursor-pointer">
            <span className="font-medium text-[14px] text-on-surface-variant">Media</span>
         </div>
      </div>

      {/* Posts Feed */}
      <div className="px-6">
         {posts.map((post) => (
            <Link
                key={post._id}
                href={`/post/${post._id}`}
                prefetch={true}
                className="group block py-6 border-b border-outline-variant/30 animate-fade-in"
              >
              {/* Author Row */}
              <div className="flex items-center gap-2 mb-3">
                <AuthorAvatar name={author.name} size="sm" />
                <span className="font-bold text-[14px] text-on-surface">{author.name}</span>
                {author.isVerifiedAuthor && <VerifiedBadge size={14} />}
                <span className="text-[13px] text-on-surface-variant">·</span>
                <span className="text-[13px] text-on-surface-variant">{timeAgo(post.createdAt)}</span>
              </div>

              {/* Headline */}
              <h3 className="font-display text-xl font-semibold text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors">
                {post.headline}
              </h3>
              <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed mb-3 line-clamp-2">
                {post.description}
              </p>

              {/* Media */}
              {(post.imageUrl || post.videoUrl) && (
                <div className="mb-4 overflow-hidden border border-outline-variant/50 relative bg-surface-container-low max-h-[300px]">
                  {post.imageUrl && !post.videoUrl && (
                    <img src={post.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                  {post.videoUrl && (
                    <div className="w-full relative h-full pointer-events-none">
                       <DynamicPlayer src={post.videoUrl} />
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center gap-6 text-on-surface-variant mt-2">
                 <FactScoreBadge score={post.factScore} size="sm" />
                 <div className="flex items-center gap-1.5">
                   <Heart size={14} />
                   <span className="text-[12px]">{post.engagement || 0}</span>
                 </div>
              </div>
            </Link>
         ))}
      </div>
    </div>
  );
}
