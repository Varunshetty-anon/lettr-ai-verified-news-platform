"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

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
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
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
    <div className="w-full max-w-[1440px] mx-auto px-[16px] md:px-[64px] py-[24px] md:py-[64px]">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-[64px] pb-[24px] border-b-2 border-on-surface">
         <div>
            <h1 className="type-headline-lg text-on-surface uppercase mb-2">Member Dashboard</h1>
            <p className="type-body-lg text-on-surface-variant">Welcome back, {user.name.split(' ')[0]}. Manage your subscription and archive.</p>
         </div>
         <button onClick={() => signOut({ callbackUrl: '/auth' })} className="mt-4 md:mt-0 type-label-md text-on-surface-variant hover:text-error transition-colors">
            SIGN OUT
         </button>
      </div>

      {/* ── Bento Grid (12-col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-[24px] mb-[64px]">
         
         {/* col-span-4: Subscription Card */}
         <div className="lg:col-span-4 border-2 border-on-surface p-[24px] flex flex-col">
            <span className="type-label-md bg-on-surface text-surface px-3 py-1 self-start mb-auto">SUBSCRIPTION</span>
            <div className="mt-[48px]">
               <h3 className="type-headline-sm text-on-surface mb-1">PRO ARCHIVE TIER</h3>
               <p className="type-caption text-on-surface-variant mb-6">Renews {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
               <div className="flex flex-col gap-3">
                  <button className="w-full border border-on-surface py-3 type-label-md text-on-surface hover:bg-on-surface hover:text-surface transition-colors">
                     MANAGE PLAN
                  </button>
                  <button className="w-full border border-transparent py-3 type-label-md text-on-surface-variant hover:text-on-surface transition-colors">
                     VIEW INVOICES
                  </button>
               </div>
            </div>
         </div>

         {/* col-span-8: Profile Image Card */}
         <div className="lg:col-span-8 border-2 border-on-surface relative group overflow-hidden aspect-[16/9] lg:aspect-auto">
            {user.image ? (
               <img src={user.image} alt={user.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
               <div className="w-full h-full bg-surface-container-highest flex items-center justify-center type-display-xl text-on-surface-variant">
                  {user.name.charAt(0)}
               </div>
            )}
            <div className="absolute bottom-0 left-0 p-[24px] bg-gradient-to-t from-surface/90 to-transparent w-full">
               <h2 className="type-headline-md text-on-surface">{user.name}</h2>
               <p className="type-label-md text-on-surface">{user.role}</p>
            </div>
         </div>

         {/* col-span-7: Reading History */}
         <div className="lg:col-span-7 border-2 border-on-surface p-[24px]">
            <h3 className="type-label-md text-on-surface border-b-2 border-on-surface pb-[12px] mb-[24px]">READING HISTORY</h3>
            <div className="flex flex-col">
               {user.viewedPosts.length > 0 ? user.viewedPosts.slice(0, 5).map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group flex items-center justify-between border-b border-outline-variant py-[16px] last:border-0 last:pb-0">
                     <div className="flex flex-col">
                        <span className="type-label-md text-primary mb-1">{post.category || 'NEWS'}</span>
                        <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">{post.headline}</h4>
                     </div>
                     <span className="type-caption text-on-surface-variant shrink-0 ml-4">{timeAgo(post.viewedAt || post.createdAt)}</span>
                  </Link>
               )) : (
                  <p className="type-body-md text-on-surface-variant py-8 text-center">No reading history yet.</p>
               )}
            </div>
         </div>

         {/* col-span-5: Newsletter Settings */}
         <div className="lg:col-span-5 bg-on-surface text-surface p-[24px]">
            <h3 className="type-label-md text-surface border-b-2 border-surface pb-[12px] mb-[24px]">NEWSLETTER PREFERENCES</h3>
            <div className="flex flex-col gap-[24px]">
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="type-body-md font-bold">The Daily Brief</span>
                     <span className="type-caption text-surface/70">Top stories delivered every morning.</span>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                     <div className="absolute right-1 top-1 w-4 h-4 bg-surface rounded-full"></div>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="type-body-md font-bold">Push Notifications</span>
                     <span className="type-caption text-surface/70">Breaking news alerts.</span>
                  </div>
                  <div className="w-12 h-6 bg-surface/30 rounded-full relative cursor-pointer">
                     <div className="absolute left-1 top-1 w-4 h-4 bg-surface rounded-full"></div>
                  </div>
               </div>
            </div>
         </div>

         {/* col-span-12: Saved Articles */}
         <div className="lg:col-span-12 mt-[48px]">
            <h3 className="type-label-md text-on-surface border-b-2 border-on-surface pb-[12px] mb-[24px]">SAVED ARTICLES ({user.likedPosts.length})</h3>
            {user.likedPosts.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
                  {user.likedPosts.map((post: any) => (
                     <Link key={post._id} href={`/post/${post._id}`} className="group block">
                        <div className="aspect-video bg-surface-container-highest mb-[16px] overflow-hidden">
                           {post.imageUrl && <img src={post.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />}
                        </div>
                        <span className="type-label-md text-on-surface-variant mb-2 block">{post.category || 'NEWS'}</span>
                        <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                           {post.headline}
                        </h4>
                     </Link>
                  ))}
               </div>
            ) : (
               <p className="type-body-md text-on-surface-variant text-center py-[48px] border-2 border-dashed border-outline-variant">
                  You haven't saved any articles yet.
               </p>
            )}
         </div>

      </div>

    </div>
  );
}
