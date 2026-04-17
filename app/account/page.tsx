"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Heart, Eye, Bookmark, LogOut, Settings } from 'lucide-react';

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
    fetch('/api/user/me')
      .then(r => r.json())
      .then(d => { setProfile(d.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-surface-container-high rounded-full" />
          <div className="h-6 bg-surface-container-high rounded w-40" />
          <div className="h-4 bg-surface-container-high rounded w-60" />
        </div>
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
    <div className="w-full min-h-screen">
      <div className="px-5 pt-8 pb-4 border-b border-outline-variant">
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Account</h1>
      </div>

      <div className="p-5">
        {/* Profile card */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-outline-variant">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center font-display text-2xl font-bold rounded-full overflow-hidden flex-shrink-0">
            {user.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">{user.name}</h2>
            <p className="font-body text-sm text-on-surface-variant/60">{user.email}</p>
            <p className="font-label text-[9px] uppercase tracking-wider text-primary mt-1">{user.role}</p>
          </div>
        </div>

        {/* History Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3 flex items-center gap-2">
              <Heart size={12} className="text-red-500" /> Liked Posts ({user.likedPosts.length})
            </h3>
            <div className="flex flex-col gap-2">
              {user.likedPosts.length === 0 ? (
                <p className="font-body text-xs text-on-surface-variant/40 p-3 border border-outline-variant/30 text-center bg-surface-container-low">No liked posts yet.</p>
              ) : (
                user.likedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group p-3 border border-outline-variant hover:border-red-500/30 bg-surface-container-low transition-colors block">
                    <p className="font-body text-sm text-on-surface group-hover:text-primary truncate">{post.headline}</p>
                    <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant/40 mt-1">{post.category} · {timeAgo(post.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3 flex items-center gap-2">
              <Eye size={12} className="text-primary" /> Reading History ({user.viewedPosts.length})
            </h3>
            <div className="flex flex-col gap-2">
              {user.viewedPosts.length === 0 ? (
                <p className="font-body text-xs text-on-surface-variant/40 p-3 border border-outline-variant/30 text-center bg-surface-container-low">No reading history yet.</p>
              ) : (
                user.viewedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group p-3 border border-outline-variant hover:border-primary/30 bg-surface-container-low transition-colors block">
                    <p className="font-body text-sm text-on-surface group-hover:text-primary truncate">{post.headline}</p>
                    <p className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant/40 mt-1">{post.category} · {timeAgo(post.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        {user.preferences.length > 0 && (
          <div className="mb-8">
            <h3 className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface-variant/40 mb-3">Your Interests</h3>
            <div className="flex flex-wrap gap-1.5">
              {user.preferences.map(p => (
                <span key={p} className="font-label text-[9px] uppercase tracking-wider px-3 py-1.5 bg-primary/10 text-primary border border-primary/20">{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link href="/onboarding/preferences" className="flex items-center gap-2.5 px-4 py-3 border border-outline-variant hover:border-primary/30 transition-colors font-body text-sm text-on-surface">
            <Settings size={15} className="text-on-surface-variant/40" />
            Update Preferences
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth' })}
            className="flex items-center gap-2.5 px-4 py-3 border border-outline-variant hover:border-red-500/30 transition-colors font-body text-sm text-red-600 dark:text-red-400"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
