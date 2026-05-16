"use client";

import React, { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Heart, Eye, LogOut, Settings } from 'lucide-react';

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
      <div className="w-full min-h-screen pt-[64px] px-[20px] sm:px-0">
        <div className="animate-pulse space-y-4">
          <div className="h-16 w-16 bg-surface-variant rounded-none" />
          <div className="h-6 bg-surface-variant w-40" />
          <div className="h-4 bg-surface-variant w-60" />
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
    <div className="w-full min-h-screen pb-[64px]">
      <div className="pt-[64px] pb-[32px] border-b border-outline-variant/30 mb-[32px] px-[20px] sm:px-0">
        <h1 className="font-display font-bold text-[80px] leading-[1.0] tracking-[-0.04em] text-on-surface">ACCOUNT</h1>
        <p className="font-body text-[20px] text-on-surface-variant mt-2">Manage your verification credentials and reading history.</p>
      </div>

      <div className="px-[20px] sm:px-0">
        {/* Profile card */}
        <div className="flex items-center gap-6 mb-[64px] pb-[32px] border-b border-outline-variant/30">
          <div className="w-[80px] h-[80px] bg-primary text-on-primary flex items-center justify-center font-display text-[48px] font-bold overflow-hidden flex-shrink-0 border border-outline-variant rounded-none">
            {user.image ? (
              <img src={user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-display text-[32px] font-bold text-on-surface tracking-[-0.01em]">{user.name}</h2>
            <p className="font-body text-[16px] text-on-surface-variant mb-1">{user.email}</p>
            <span className="font-label text-[10px] uppercase tracking-[0.1em] text-primary font-bold px-2 py-0.5 border border-primary/30 bg-primary/10">
              {user.role}
            </span>
          </div>
        </div>

        {/* History Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[32px] mb-[64px]">
          <div className="border border-outline-variant rounded-none">
            <h3 className="font-label text-[12px] uppercase tracking-[0.1em] font-bold text-on-surface bg-surface-dim px-6 py-4 border-b border-outline-variant flex items-center gap-2">
              <Heart size={16} className="text-secondary" /> Liked Posts ({user.likedPosts.length})
            </h3>
            <div className="flex flex-col">
              {user.likedPosts.length === 0 ? (
                <p className="font-body text-[14px] text-on-surface-variant p-6 text-center bg-surface">No liked posts yet.</p>
              ) : (
                user.likedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group p-6 border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-dim transition-colors block">
                    <p className="font-display text-[20px] font-bold text-on-surface group-hover:text-primary mb-2 line-clamp-2">{post.headline}</p>
                    <p className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">{post.category} · {timeAgo(post.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="border border-outline-variant rounded-none">
            <h3 className="font-label text-[12px] uppercase tracking-[0.1em] font-bold text-on-surface bg-surface-dim px-6 py-4 border-b border-outline-variant flex items-center gap-2">
              <Eye size={16} className="text-primary" /> Reading History ({user.viewedPosts.length})
            </h3>
            <div className="flex flex-col">
              {user.viewedPosts.length === 0 ? (
                <p className="font-body text-[14px] text-on-surface-variant p-6 text-center bg-surface">No reading history yet.</p>
              ) : (
                user.viewedPosts.map((post: any) => (
                  <Link key={post._id} href={`/post/${post._id}`} className="group p-6 border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-dim transition-colors block">
                    <p className="font-display text-[20px] font-bold text-on-surface group-hover:text-primary mb-2 line-clamp-2">{post.headline}</p>
                    <p className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">{post.category} · {timeAgo(post.createdAt)}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        {user.preferences.length > 0 && (
          <div className="mb-[64px] p-[32px] border border-outline-variant bg-surface-dim">
            <h3 className="font-label text-[12px] uppercase tracking-[0.1em] font-bold text-primary mb-4">YOUR INTERESTS</h3>
            <div className="flex flex-wrap gap-2">
              {user.preferences.map(p => (
                <span key={p} className="font-label text-[12px] uppercase tracking-[0.1em] px-4 py-2 border border-outline-variant bg-surface text-on-surface font-bold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-[16px]">
          <Link href="/onboarding/preferences" className="flex items-center justify-center gap-3 px-8 py-4 border-[2px] border-primary text-primary hover:bg-primary hover:text-on-primary transition-all font-label text-[12px] uppercase tracking-[0.1em] font-bold rounded-none w-full sm:w-auto">
            <Settings size={18} />
            UPDATE PREFERENCES
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth' })}
            className="flex items-center justify-center gap-3 px-8 py-4 border-[2px] border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all font-label text-[12px] uppercase tracking-[0.1em] font-bold rounded-none w-full sm:w-auto"
          >
            <LogOut size={18} />
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  );
}
