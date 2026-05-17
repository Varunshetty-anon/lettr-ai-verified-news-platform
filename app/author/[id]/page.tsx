"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, Mail, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';

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
        <h2 className="type-headline-md text-on-surface mb-2">Account Not Found</h2>
      </div>
    );
  }

  const isBot = author.email?.includes('@lettr.ai');
  const featuredPost = posts[0];
  const sidebarPost = posts[1];
  const secondaryPosts = posts.slice(2, 5);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      
      {/* ── 1. Top Profile Info Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] lg:gap-[64px] mb-[64px]">
        
        {/* col-span-4: Photo and Stats */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="aspect-square bg-surface-container-highest mb-[24px] relative group overflow-hidden">
             {author.image ? (
                <img src={author.image} alt={author.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
             ) : (
                <div className="w-full h-full flex items-center justify-center type-display-xl text-on-surface-variant group-hover:text-primary transition-colors">
                  {author.name.charAt(0)}
                </div>
             )}
          </div>
          
          <div className="flex flex-col border-t-2 border-on-surface pt-[12px]">
             <div className="flex justify-between items-center py-3 border-b border-outline-variant">
               <span className="type-label-md text-on-surface-variant">FOLLOWERS</span>
               <span className="type-headline-sm text-on-surface">{author.followersCount || 0}</span>
             </div>
             <div className="flex justify-between items-center py-3 border-b border-outline-variant">
               <span className="type-label-md text-on-surface-variant">ARTICLES</span>
               <span className="type-headline-sm text-on-surface">{posts.length}</span>
             </div>
          </div>
        </div>

        {/* col-span-8: Name, Bio, Actions */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-8 pb-8 border-b-2 border-on-surface">
             <div className="flex items-center gap-4">
               <h1 className="type-display-xl text-on-surface uppercase">{author.name}</h1>
               {author.isVerifiedAuthor && <VerifiedBadge size={32} />}
             </div>
             <button
               onClick={handleFollow}
               disabled={followLoading}
               className={`type-label-md px-[24px] py-[12px] transition-colors border-2 ${
                 isFollowing
                   ? 'border-outline-variant text-on-surface-variant hover:border-error hover:text-error'
                   : 'bg-primary border-primary text-on-primary hover:bg-transparent hover:text-primary'
               }`}
             >
               {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
             </button>
          </div>

          <p className="type-body-lg text-on-surface leading-relaxed max-w-[720px] mb-8">
            {isBot
             ? `Automated intelligence gathering. Focused on real-time data analysis and reporting.`
             : `Independent Journalist & Researcher focusing on the intersection of culture and technology.`}
          </p>

          <div className="flex gap-4">
            <button className="w-[48px] h-[48px] border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
               <MessageCircle size={20} />
            </button>
            <button className="w-[48px] h-[48px] border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
               <Mail size={20} />
            </button>
            <button className="w-[48px] h-[48px] border-2 border-on-surface flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
               <Globe size={20} />
            </button>
          </div>
        </div>

      </div>

      {/* ── 2. Selected Works Header ── */}
      <div className="flex items-center justify-between border-b-2 border-on-surface pb-[12px] mb-[48px]">
         <h2 className="type-headline-sm text-on-surface">SELECTED WORKS</h2>
         <span className="type-label-md text-on-surface-variant">SORT BY: LATEST</span>
      </div>

      {/* ── 3. Articles Grid ── */}
      {posts.length > 0 ? (
        <div className="flex flex-col gap-[64px]">
          
          {/* Featured & Sidebar Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[64px]">
             
             {/* col-span-8: Featured Card */}
             {featuredPost && (
                <div className="lg:col-span-8">
                  <Link href={`/post/${featuredPost._id}`} className="group block">
                    <div className=" overflow-hidden mb-[24px]">
                      {featuredPost.imageUrl && <img src={featuredPost.imageUrl} className="w-full h-full object-cover" alt="" />}
                    </div>
                    {featuredPost.category && (
                      <span className="type-label-md border border-on-surface px-2 py-1 mb-4 inline-block">{featuredPost.category}</span>
                    )}
                    <h3 className="type-headline-lg text-on-surface group-hover:text-primary transition-colors mb-4">{featuredPost.headline}</h3>
                    <p className="type-body-md text-on-surface-variant line-clamp-2">{featuredPost.description}</p>
                  </Link>
                </div>
             )}

             {/* col-span-4: Sidebar Card */}
             {sidebarPost && (
                <div className="lg:col-span-4 border-l-2 border-on-surface pl-[24px] flex flex-col justify-center">
                  <Link href={`/post/${sidebarPost._id}`} className="group block">
                    {sidebarPost.category && (
                      <span className="type-label-md text-primary mb-4 block">{sidebarPost.category}</span>
                    )}
                    <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors mb-4">
                      {sidebarPost.headline}
                    </h4>
                    <span className="type-caption text-on-surface-variant">
                      {new Date(sidebarPost.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </Link>
                </div>
             )}
          </div>

          {/* Secondary Row: 3x Cards */}
          {secondaryPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px] border-t-2 border-on-surface pt-[48px]">
               {secondaryPosts.map(post => (
                 <Link key={post._id} href={`/post/${post._id}`} className="group block">
                    <div className=" overflow-hidden mb-[24px]">
                       {post.imageUrl && <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />}
                    </div>
                    <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors mb-2 line-clamp-2">
                       {post.headline}
                    </h4>
                    <span className="type-caption text-on-surface-variant block">
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                 </Link>
               ))}
            </div>
          )}

          <div className="flex justify-center mt-[48px]">
             <button className="border-2 border-on-surface px-[48px] py-[16px] type-label-md text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
               LOAD MORE ARCHIVE
             </button>
          </div>

        </div>
      ) : (
        <div className="text-center py-20 text-on-surface-variant">
          No articles published yet.
        </div>
      )}

    </div>
  );
}
