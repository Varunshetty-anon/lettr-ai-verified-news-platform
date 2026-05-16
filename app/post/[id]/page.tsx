"use client";

import React, { use, useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DynamicPlayer } from '@/app/components/ui/HoverVideoPlayer';
import { useSession } from 'next-auth/react';
import { FactScoreBadge } from '@/app/components/ui/FactScoreBadge';
import { VerifiedBadge } from '@/app/components/ui/VerifiedBadge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const { data: session } = useSession();

  const { data, error, isLoading } = useSWR(`/api/posts/${postId}`, fetcher);
  const post = data?.post;
  const { data: moreLikeThisData } = useSWR(`/api/posts?sort=recent`, fetcher);

  useEffect(() => {
    if (postId && session?.user?.email) {
      fetch(`/api/user/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: postId, action: 'view' })
      }).catch(() => {});
    }
  }, [postId, session]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-on-surface-variant type-body-md">Post not found.</p>
      </div>
    );
  }

  const morePosts = (moreLikeThisData?.posts || []).filter((p: any) => p._id !== post._id).slice(0, 3);

  // Content formatting
  const rawContent = post.content || post.description || '';
  const paragraphs = rawContent.split('\n\n').filter((p: string) => p.trim() !== '');

  const renderContent = () => {
    return paragraphs.map((p: string, idx: number) => {
      const isBlockquote = p.startsWith('"') || p.startsWith('>');
      const cleanText = p.replace(/^> /, '').trim();
      
      // Determine if it's a subheading (short, no ending punctuation)
      const isSubheading = !isBlockquote && cleanText.length > 5 && cleanText.length < 60 && !/[.!?]$/.test(cleanText);

      if (isBlockquote) {
        return (
          <blockquote key={idx} className="border-y-2 border-on-surface py-[24px] my-[48px] italic text-center type-headline-sm text-on-surface">
            {cleanText}
          </blockquote>
        );
      }

      if (isSubheading) {
        return (
          <h3 key={idx} className="type-headline-sm border-l-4 border-primary pl-4 uppercase text-on-surface mt-[48px] mb-[24px]">
            {cleanText}
          </h3>
        );
      }

      const isFirstParagraph = idx === 0;
      
      return (
        <p key={idx} className={`type-body-md text-on-surface-variant leading-relaxed mb-6 ${
          isFirstParagraph ? "first-letter:text-7xl first-letter:font-display first-letter:float-left first-letter:mr-3 first-letter:text-primary first-letter:font-bold first-line:uppercase first-line:tracking-widest" : ""
        }`}>
          {cleanText}
        </p>
      );
    });
  };

  return (
    <div className="w-full min-h-screen bg-surface">
      
      {/* ── 1. Full-width Hero Image ── */}
      {post.imageUrl && (
        <div className="w-full h-[614px] md:h-[819px] relative bg-surface-container-highest">
          <img 
            src={post.imageUrl} 
            alt={post.headline} 
            className="w-full h-full object-cover grayscale brightness-90"
          />
        </div>
      )}

      <article className="max-w-[720px] mx-auto px-[16px] md:px-0 py-[64px]">
        
        {/* ── 2. Article Header ── */}
        <div className="mb-[64px]">
          {post.category && (
            <div className="mb-6">
              <span className="type-label-md border border-on-surface px-3 py-1.5 text-on-surface uppercase inline-block">
                {post.category}
              </span>
            </div>
          )}
          
          <h1 className="type-display-xl text-on-surface mb-8">
            {post.headline}
          </h1>

          <div className="flex flex-col md:flex-row md:items-center justify-between border-y-2 border-on-surface py-6 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-[48px] h-[48px] bg-surface-container-highest grayscale flex items-center justify-center type-headline-sm">
                {post.author?.name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="type-label-md text-on-surface">{post.author?.name}</span>
                  {post.author?.isVerifiedAuthor && <VerifiedBadge size={16} />}
                </div>
                <span className="type-caption text-on-surface-variant">SENIOR CORRESPONDENT · 5 MIN READ</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-on-surface-variant">
              <span className="type-label-md">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* ── 3. Video / Media (if any) ── */}
        {post.videoUrl && (
          <figure className="mb-[48px] w-full aspect-video">
            <DynamicPlayer src={post.videoUrl} />
            <figcaption className="type-caption text-center text-on-surface-variant mt-3">
              Media accompanying the report.
            </figcaption>
          </figure>
        )}

        {/* ── 4. AI Verification Summary ── */}
        <div className="mb-[48px] border-2 border-on-surface p-[24px] bg-surface-container">
          <div className="flex items-center justify-between border-b-2 border-on-surface pb-[12px] mb-[24px]">
            <h3 className="type-label-md text-on-surface">AI VERIFICATION SUMMARY</h3>
            <FactScoreBadge score={post.factScore} size="sm" showLabel />
          </div>
          <p className="type-body-md text-on-surface-variant mb-4">
            {post.reasoning}
          </p>
          {post.issues && post.issues.length > 0 && (
            <ul className="list-disc pl-5">
              {post.issues.map((issue: string, idx: number) => (
                <li key={idx} className="type-caption text-on-surface-variant">{issue}</li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 5. Body Content ── */}
        <div className="content-measure">
          {renderContent()}
        </div>

        {/* ── 6. Tags Row ── */}
        <div className="mt-[64px] pt-[24px] border-t border-outline-variant flex flex-wrap gap-3">
          <span className="type-label-md border border-outline-variant px-3 py-1.5 text-on-surface-variant">REPORTING</span>
          <span className="type-label-md border border-outline-variant px-3 py-1.5 text-on-surface-variant">ANALYSIS</span>
          {post.category && (
            <span className="type-label-md border border-outline-variant px-3 py-1.5 text-on-surface-variant uppercase">{post.category}</span>
          )}
        </div>

      </article>

      {/* ── 7. More Like This ── */}
      {morePosts.length > 0 && (
        <div className="w-full bg-surface-container-low border-t-2 border-on-surface py-[64px] px-[16px] md:px-[64px]">
          <div className="max-w-[1440px] mx-auto">
            <h3 className="type-headline-sm mb-[48px] text-on-surface text-center uppercase">More Like This</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
              {morePosts.map((p: any) => (
                <Link key={p._id} href={`/post/${p._id}`} className="group block">
                  <div className="aspect-[4/3] bg-surface-container-highest mb-[16px]">
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.headline} className="w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 transition-all" />
                    )}
                  </div>
                  {p.category && (
                    <span className="type-label-md text-on-surface-variant mb-2 block">{p.category}</span>
                  )}
                  <h4 className="type-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                    {p.headline}
                  </h4>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
