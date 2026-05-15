"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, ArrowLeft, Calendar, Link as LinkIcon, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DynamicPlayer } from '@/app/components/ui/HoverVideoPlayer';

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
    if (!session) {
      router.push('/auth');
      return;
    }
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
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors">
          <ArrowLeft size={20} className="text-on-surface" />
        </button>
        <div className="columns-1 sm:columns-2 gap-4 space-y-4 pb-4 px-4 pt-4">
           <h1 className="text-xl font-bold text-on-surface leading-tight flex items-center gap-1">
             {author.name}
             {author.isVerifiedAuthor && (
                <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[18px] h-[18px] fill-primary"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
             )}
           </h1>
           <span className="text-[13px] text-on-surface-variant">{posts.length} posts</span>
        </div>
      </div>

      {/* Banner */}
      <div className="w-full h-[250px] bg-primary/5 border-b border-outline-variant flex items-end justify-start px-8 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]" />
         {/* Could add a banner image here later */}
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 border-b border-outline-variant/50 relative">
        {/* Avatar and Follow Button Row */}
        <div className="flex justify-between items-start mb-3">
          <div className="w-[120px] h-[120px] border-4 border-surface bg-surface-container-high overflow-hidden -mt-[60px] flex items-center justify-center relative z-10 shadow-lg">
             {author.image ? (
                <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full font-bold text-4xl text-on-surface flex items-center justify-center">{author.name?.charAt(0)}</div>
             )}
          </div>
          <div className="pt-3">
             <button
               onClick={handleFollow}
               disabled={followLoading}
               className={`px-4 py-1.5 rounded-full font-bold text-[15px] transition-colors ${
                 isFollowing
                   ? 'bg-transparent border border-outline-variant text-on-surface hover:border-red-500 hover:text-red-500 hover:bg-red-500/10'
                   : 'bg-on-surface text-surface hover:bg-on-surface/90'
               }`}
             >
               {isFollowing ? 'Following' : 'Follow'}
             </button>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-3">
           <h1 className="font-display text-4xl font-black text-on-surface flex items-center gap-2 tracking-tight">
             {author.name}
             {author.isVerifiedAuthor && (
                <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[18px] h-[18px] fill-primary"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
             )}
           </h1>
           <p className="text-[15px] text-on-surface-variant flex items-center gap-1">
              @{author.name?.toLowerCase().replace(/\s+/g, '')}
              {isBot && (
                <span className="ml-1 text-[11px] px-1.5 py-0.5 bg-surface-variant text-on-surface-variant font-bold rounded">BOT</span>
              )}
           </p>
        </div>

        <p className="text-[15px] text-on-surface mb-3 whitespace-pre-wrap">
           {isBot
             ? `Automated intelligence gathering. Focused on ${posts[0]?.category || 'News'}.`
             : `Independent Journalist & Researcher.`}
        </p>

        <div className="flex items-center gap-4 text-[15px] text-on-surface-variant mb-4">
           {author.createdAt && (
             <div className="flex items-center gap-1">
               <Calendar size={16} />
               <span>Joined {new Date(author.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
             </div>
           )}
        </div>

        <div className="flex items-center gap-5 text-[15px]">
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
            <span className="font-bold text-[15px] text-on-surface">Posts</span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-primary rounded-full" />
         </div>
         <div className="flex-1 text-center py-4 hover:bg-surface-variant/30 cursor-pointer">
            <span className="font-medium text-[15px] text-on-surface-variant">Replies</span>
         </div>
         <div className="flex-1 text-center py-4 hover:bg-surface-variant/30 cursor-pointer">
            <span className="font-medium text-[15px] text-on-surface-variant">Media</span>
         </div>
      </div>

      {/* Feed */}
      <div className="columns-1 sm:columns-2 gap-4 space-y-4 pb-4 px-4 pt-4">
         {posts.map((post) => (
            <Link
                key={post._id}
                href={`/post/${post._id}`}
                prefetch={true}
                className="group block bg-surface border border-outline-variant hover:border-primary/30 hover:shadow-md transition-all duration-300 animate-fade-in p-5 rounded-sm break-inside-avoid"
              >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 shrink-0 rounded-sm bg-surface-variant overflow-hidden flex items-center justify-center border border-outline-variant/50">
                   <div className="w-full h-full font-bold text-on-surface flex items-center justify-center">{author.name?.charAt(0)}</div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center gap-2 flex-wrap mb-3 border-b border-outline-variant/30 pb-2">
                    <span className="font-bold text-[15px] text-on-surface hover:underline">
                      {author.name}
                    </span>
                    {author.isVerifiedAuthor && (
                        <svg viewBox="0 0 24 24" aria-label="Verified account" className="w-[16px] h-[16px] fill-primary shrink-0"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.918-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.337 2.25c-.416-.165-.866-.25-1.336-.25-2.21 0-3.918 1.792-3.918 4 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.46.74 2.746 1.865 3.45-.164.446-.252.93-.252 1.45 0 2.21 1.71 4 3.918 4 .503 0 .984-.095 1.428-.266 1.053 1.252 2.628 2.066 4.34 2.066 1.714 0 3.287-.814 4.34-2.066.445.17.925.265 1.428.265 2.21 0 3.918-1.792 3.918-4 0-.52-.088-1.004-.252-1.45 1.125-.705 1.865-1.99 1.865-3.45zm-10.153 6.015l-4.5-4.5 1.815-1.815 2.685 2.685 7.185-7.185 1.815 1.815-9 9z"></path></g></svg>
                    )}
                    <span className="text-[15px] text-on-surface-variant truncate max-w-[100px] sm:max-w-[200px]">
                      @{author.name?.toLowerCase().replace(/\s+/g, '')}
                    </span>
                    <span className="text-[15px] text-on-surface-variant">·</span>
                    <span className="text-[15px] text-on-surface-variant hover:underline">{timeAgo(post.createdAt)}</span>
                  </div>

                  {/* Headline and Body */}
                  <h3 className="font-display text-2xl font-black text-on-surface leading-tight mb-2 group-hover:text-primary transition-colors">
                    {post.headline}
                  </h3>
                  <p className="font-body text-base text-on-surface-variant/90 leading-relaxed mb-4 whitespace-pre-wrap">
                    {post.description}
                  </p>

                  {/* Media */}
                  {(post.imageUrl || post.videoUrl) && (
                    <div className="mt-4 mb-4 overflow-hidden border border-outline-variant/50 relative bg-surface-container-low max-h-[400px]">
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
                  <div className="flex items-center justify-between text-on-surface-variant max-w-md mt-1">
                     <div className="flex items-center gap-2 group/btn"><div className="p-2"><Shield size={16} className={post.factScore >= 80 ? 'text-emerald-500' : 'text-amber-500'}/></div><span className="text-[13px]">{post.factScore}</span></div>
                     <div className="flex items-center gap-2 group/btn"><div className="p-2"><Heart size={16} /></div><span className="text-[13px]">{post.engagement || 0}</span></div>
                  </div>
                </div>
              </div>
            </Link>
         ))}
      </div>
    </div>
  );
}
