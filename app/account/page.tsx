"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { LoadingQuotes } from '@/app/components/ui/LoadingQuotes';
interface UserProfile {
  name: string;
  email: string;
  image?: string;
  role: string;
  preferences: string[];
  likedPosts: any[];
  viewedPosts: any[];
  savedPosts: any[];
  trustScore: number;
  totalPosts: number;
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

export default function Account() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/user/me`)
      .then(r => r.json())
      .then(d => { setProfile(d.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingQuotes />;
  }

  const user = profile || {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    image: session?.user?.image || '',
    role: 'READER',
    preferences: [],
    likedPosts: [],
    viewedPosts: [],
    savedPosts: [],
    trustScore: 0,
    totalPosts: 0,
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-[16px] md:px-[64px] py-[48px] md:py-[64px]">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-[48px] pb-[24px] border-b-2 border-on-surface">
         <div>
            <h1 className="type-headline-lg text-on-surface uppercase mb-2">Member Dashboard</h1>
            <p className="type-body-lg text-on-surface-variant">Welcome back, {user.name.split(' ')[0]}.</p>
         </div>
         <button onClick={() => signOut({ callbackUrl: '/auth' })} className="mt-4 md:mt-0 type-label-md text-on-surface-variant hover:text-error transition-colors">
            SIGN OUT
         </button>
      </div>

      {/* ── Profile Card ── */}
      <div className="border-2 border-on-surface p-[32px] mb-[64px] flex flex-col md:flex-row items-center gap-[32px]">
         <div className="w-[120px] h-[120px] shrink-0 border-2 border-on-surface overflow-hidden bg-surface-container-highest">
            {user.image ? (
               <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
               <div className="w-full h-full flex items-center justify-center type-display-xl text-on-surface-variant">
                  {user.name.charAt(0)}
               </div>
            )}
         </div>
         <div className="flex flex-col text-center md:text-left">
            <h2 className="type-headline-md text-on-surface mb-2">{user.name}</h2>
            <p className="type-body-md text-on-surface-variant mb-4">{user.email}</p>
            <span className="type-label-md bg-on-surface text-surface px-3 py-1 self-center md:self-start uppercase">
               {user.role}
            </span>
         </div>
      </div>

      {/* ── Saved Articles & Reading History ── */}
      <div className="space-y-[48px]">
        {/* Liked Articles */}
        <div>
           <h3 className="type-label-md text-on-surface border-b-2 border-on-surface pb-[12px] mb-[24px]">LIKED STORIES ({user.likedPosts.length})</h3>
           {user.likedPosts.length > 0 ? (
              <div className="flex flex-col text-left">
                 {user.likedPosts.map((post: any) => (
                    <Link key={post._id} href={`/post/${post._id}`} className="group flex items-center justify-between border-b border-outline-variant py-[16px] last:border-0 last:pb-0">
                       <div className="flex flex-col min-w-0 pr-4">
                          <span className="type-label-md text-primary mb-1 uppercase">{post.category || 'NEWS'}</span>
                          <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">{post.headline}</h4>
                       </div>
                       {post.factScore !== undefined && (
                         <div className="shrink-0 font-display font-bold text-xs border border-primary text-primary px-2 py-0.5">
                           {post.factScore}%
                         </div>
                       )}
                    </Link>
                 ))}
              </div>
           ) : (
              <p className="type-body-md text-on-surface-variant text-center py-[48px] border-2 border-dashed border-outline-variant">
                 You haven't liked any articles yet.
              </p>
           )}
        </div>

        {/* Reading History */}
        <div>
           <h3 className="type-label-md text-on-surface border-b-2 border-on-surface pb-[12px] mb-[24px]">READING HISTORY ({user.viewedPosts.length})</h3>
           {user.viewedPosts.length > 0 ? (
              <div className="flex flex-col text-left">
                 {user.viewedPosts.map((post: any) => (
                    <Link key={post._id} href={`/post/${post._id}`} className="group flex items-center justify-between border-b border-outline-variant py-[16px] last:border-0 last:pb-0">
                       <div className="flex flex-col min-w-0 pr-4">
                          <span className="type-label-md text-primary mb-1 uppercase">{post.category || 'NEWS'}</span>
                          <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">{post.headline}</h4>
                       </div>
                       {post.factScore !== undefined && (
                         <div className="shrink-0 font-display font-bold text-xs border border-outline-variant text-on-surface-variant px-2 py-0.5">
                           {post.factScore}%
                         </div>
                       )}
                    </Link>
                 ))}
              </div>
           ) : (
              <p className="type-body-md text-on-surface-variant text-center py-[48px] border-2 border-dashed border-outline-variant">
                 Your reading history is empty.
              </p>
           )}
        </div>
      </div>

    </div>
  );
}
