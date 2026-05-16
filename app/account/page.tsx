"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Heart, Eye, Settings, LogOut, ArrowUpRight } from 'lucide-react';
import { AuthorAvatar } from '@/app/components/ui/AuthorAvatar';

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
      <div className="w-full min-h-screen p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-surface-container-high" />
          <div className="h-6 bg-surface-container-high w-40" />
          <div className="h-4 bg-surface-container-high w-60" />
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
      {/* ── Masthead ── */}
      <div className="px-6 pt-10 pb-6 border-b-2 border-on-surface">
        <h1 className="font-display text-4xl font-bold text-on-surface tracking-tight">
          Account<span className="text-primary">.</span>
        </h1>
      </div>

      <div className="px-6 pt-8">
        {/* ── Profile Card ── */}
        <div className="flex items-start gap-5 mb-8 pb-8 border-b border-outline-variant">
          <AuthorAvatar name={user.name} image={user.image} size="xl" />
          <div className="pt-2">
            <h2 className="font-display text-3xl font-bold text-on-surface tracking-tight">{user.name}</h2>
            <p className="font-body text-sm text-on-surface-variant/60 mt-1">{user.email}</p>
            <span className="inline-block mt-2 type-label-caps text-[10px] text-primary px-2 py-1 bg-primary/5 border border-primary/20">
              {user.role}
            </span>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-0 mb-8 border border-outline-variant">
          <div className="p-5 text-center border-r border-outline-variant">
            <span className="font-display text-2xl font-bold text-on-surface block">{user.likedPosts.length}</span>
            <span className="type-label-caps text-[9px] text-on-surface-variant/50">Liked</span>
          </div>
          <div className="p-5 text-center border-r border-outline-variant">
            <span className="font-display text-2xl font-bold text-on-surface block">{user.viewedPosts.length}</span>
            <span className="type-label-caps text-[9px] text-on-surface-variant/50">Read</span>
          </div>
          <div className="p-5 text-center">
            <span className="font-display text-2xl font-bold text-on-surface block">{user.totalPosts}</span>
            <span className="type-label-caps text-[9px] text-on-surface-variant/50">Published</span>
          </div>
        </div>

        {/* ── Preferences ── */}
        {user.preferences.length > 0 && (
          <div className="mb-8">
            <h3 className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-on-surface mb-4 pb-3 border-b-2 border-on-surface">
              Your Interests
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.preferences.map(p => (
                <span key={p} className="font-label text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 bg-tertiary-fixed text-on-surface font-bold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── History Lists ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Liked */}
          <div>
            <h3 className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-on-surface mb-4 pb-3 border-b-2 border-on-surface flex items-center gap-2">
              <Heart size={12} className="text-rose-500" /> Liked Posts
            </h3>
            <div className="space-y-0">
              {user.likedPosts.length === 0 ? (
                <p className="font-body text-xs text-on-surface-variant/40 py-6 text-center border border-dashed border-outline-variant/40">
                  No liked posts yet.
                </p>
              ) : (
                user.likedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`}
                    className="group block py-4 border-b border-outline-variant/30"
                  >
                    <p className="font-display text-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {post.headline}
                    </p>
                    <p className="type-label-caps text-[9px] text-on-surface-variant/40 mt-1">
                      {post.category} · {timeAgo(post.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Reading History */}
          <div>
            <h3 className="font-display text-[11px] uppercase tracking-[0.2em] font-black text-on-surface mb-4 pb-3 border-b-2 border-on-surface flex items-center gap-2">
              <Eye size={12} className="text-primary" /> Reading History
            </h3>
            <div className="space-y-0">
              {user.viewedPosts.length === 0 ? (
                <p className="font-body text-xs text-on-surface-variant/40 py-6 text-center border border-dashed border-outline-variant/40">
                  No reading history yet.
                </p>
              ) : (
                user.viewedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`}
                    className="group block py-4 border-b border-outline-variant/30"
                  >
                    <p className="font-display text-sm font-semibold text-on-surface group-hover:text-primary transition-colors leading-snug">
                      {post.headline}
                    </p>
                    <p className="type-label-caps text-[9px] text-on-surface-variant/40 mt-1">
                      {post.category} · {timeAgo(post.createdAt)}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="space-y-0 mb-8 border border-outline-variant">
          <Link href="/onboarding/preferences"
            className="flex items-center justify-between px-5 py-4 border-b border-outline-variant hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-on-surface-variant/40" />
              <span className="font-body text-sm text-on-surface">Update Preferences</span>
            </div>
            <ArrowUpRight size={14} className="text-on-surface-variant/30" />
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth' })}
            className="flex items-center justify-between w-full px-5 py-4 hover:bg-red-500/5 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut size={16} className="text-red-500/60" />
              <span className="font-body text-sm text-red-600 dark:text-red-400">Sign Out</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
