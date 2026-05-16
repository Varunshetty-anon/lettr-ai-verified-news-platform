"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Shield, ExternalLink, Heart, ArrowUpRight } from "lucide-react";
import ImpressTracker from "./components/ui/ImpressTracker";
import HoverVideoPlayer from "./components/ui/HoverVideoPlayer";
import { ArticleCard, Post } from "./components/ui/ArticleCard";

function Skeleton() {
  return (
    <div className="space-y-4 px-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse p-6 bg-surface border border-outline-variant shadow-sm rounded-none">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-surface-variant shrink-0 border border-outline-variant rounded-none" />
            <div className="flex-1">
              <div className="h-4 bg-surface-variant w-1/4 mb-4" />
              <div className="h-8 bg-surface-variant w-3/4 mb-3" />
              <div className="h-4 bg-surface-variant w-full mb-2" />
              <div className="h-4 bg-surface-variant w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Ref to track the latest top post ID without triggering re-renders
  const topPostIdRef = useRef<string | null>(null);

  // Real-time ping state
  const [hasNewPosts, setHasNewPosts] = useState(false);

  // Initial fetch
  const fetchLatestPosts = useCallback(async (isAutoRefresh = false) => {
    try {
      const apiUrl = `/api/posts`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      const fetchedPosts = data.posts || [];

      if (fetchedPosts.length > 0) {
        const latestId = fetchedPosts[0]._id;

        // If this is a background auto-refresh and we already have posts
        if (isAutoRefresh && topPostIdRef.current) {
           if (latestId !== topPostIdRef.current) {
              setHasNewPosts(true);
           }
        } else {
           // Direct load or manual refresh
           setPosts(fetchedPosts);
           topPostIdRef.current = latestId;
           setHasNewPosts(false);
        }
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }, []);

  // Fetch likes
  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/user/me`)
        .then((r) => r.json())
        .then((d) => {
          if (d.user?.likedPosts) {
            setLikedIds(new Set(d.user.likedPosts.map((p: any) => p._id)));
          }
        })
        .catch(() => {});
    }
  }, [session]);

  // Initial load
  useEffect(() => {
    fetchLatestPosts(false);
  }, [fetchLatestPosts]);

  // Background polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
       fetchLatestPosts(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchLatestPosts]);

  const loadNewPosts = () => {
     fetchLatestPosts(false);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleLike = async (postId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;

    const isLiked = likedIds.has(postId);
    const newLikedIds = new Set(likedIds);
    if (isLiked) {
      newLikedIds.delete(postId);
    } else {
      newLikedIds.add(postId);
    }
    setLikedIds(newLikedIds);

    // Optimistically update engagement count
    setPosts(posts.map(p => {
       if (p._id === postId) {
          return { ...p, engagement: p.engagement + (isLiked ? -1 : 1) };
       }
       return p;
    }));

    await fetch(`/api/user/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        action: isLiked ? "unlike" : "like",
      }),
    });
  };

  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="font-display font-black text-5xl md:text-7xl tracking-[-0.04em] text-primary mb-6">
          LETTR<span className="text-primary/30">.</span>
        </h1>
        <p className="font-body text-xl text-on-surface-variant max-w-lg mx-auto mb-8">
          The serious news platform verified by AI.
        </p>
        <Link
          href="/auth"
          className="font-label text-xs uppercase tracking-[0.1em] px-8 py-4 bg-primary text-on-primary hover:bg-primary-container transition-all"
        >
          Sign In / Sign Up
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* Top Bar for Mobile */}
      <div className="sm:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-outline-variant/30">
        <span className="font-display font-bold text-2xl tracking-[-0.04em] text-on-surface">LETTR.</span>
        <div className="w-8 h-8 bg-surface-variant flex items-center justify-center border border-outline-variant rounded-none">
          <span className="font-display font-bold text-on-surface">{session?.user?.name?.charAt(0)}</span>
        </div>
      </div>

      {/* Header Space */}
      <div className="hidden sm:block pt-[64px] pb-[32px] px-0 border-b border-outline-variant/30 mb-[32px]">
        <h1 className="font-display font-bold text-[32px] tracking-[-0.01em] text-on-surface mb-2">FOR YOU</h1>
        <p className="font-body text-[16px] text-on-surface-variant">Your personalized feed, verified by AI.</p>
      </div>

      {hasNewPosts && (
        <div className="sticky top-[104px] z-30 flex justify-center mt-4 -mb-2">
          <button 
            onClick={loadNewPosts}
            className="px-6 py-3 bg-primary text-on-primary font-label text-[12px] uppercase tracking-[0.1em] font-bold shadow-none border-2 border-primary hover:bg-primary-container transition-transform rounded-none"
          >
            New Posts Available ↑
          </button>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && posts.length === 0 && (
        <div className="px-5 py-20 text-center border-t border-b border-outline-variant/30 mt-[32px]">
          <h2 className="font-display text-[24px] text-on-surface mb-2 font-bold uppercase tracking-[-0.01em]">No articles yet</h2>
          <p className="font-body text-[16px] text-on-surface-variant max-w-xs mx-auto">
            The bot network is seeding content automatically. Articles will appear shortly.
          </p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-[32px] pb-[64px]">
          {posts.map((post) => (
            <ImpressTracker key={post._id} postId={post._id}>
              <ArticleCard
                post={post}
                variant="feature"
                liked={likedIds.has(post._id)}
                onLikeToggle={(e) => toggleLike(post._id, e)}
              />
            </ImpressTracker>
          ))}
        </div>
      )}
    </div>
  );
}
