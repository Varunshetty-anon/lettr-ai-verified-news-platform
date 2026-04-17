"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertTriangle, FileText, ArrowRight } from 'lucide-react';

export default function VerifyAuthorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; reasoning: string; isVerified: boolean } | null>(null);
  const [error, setError] = useState('');

  if (status === 'loading') return null;
  if (status === 'unauthenticated') {
    router.push('/auth');
    return null;
  }

  // Cast session user to access custom property
  const isAlreadyVerified = (session?.user as any)?.isVerifiedAuthor;

  if (isAlreadyVerified) {
    return (
      <div className="w-full min-h-screen p-5 flex flex-col items-center justify-center animate-fade-in">
        <div className="w-full max-w-md bg-surface-container-low border border-emerald-500/30 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Verified Author</h1>
          <p className="font-body text-sm text-on-surface-variant/70 mb-6">
            You have already passed the AI verification process and hold the permanent Verified Author badge. You can freely publish articles on LETTR.
          </p>
          <button 
            onClick={() => router.push('/publish')}
            className="w-full h-12 bg-primary text-on-primary font-label text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            Go to Publisher <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.length < 100) {
      setError('Please provide at least 100 characters of text to evaluate.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/verify-author', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setResult(data);
      if (data.isVerified) {
        // Optimistically reload session or user will see it on refresh
        setTimeout(() => {
          router.push('/publish');
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-5 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 border-b border-outline-variant pb-6">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Shield size={24} />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">Author Verification</h1>
          </div>
          <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed">
            To maintain the highest standards of journalistic integrity, all human authors must pass a one-time AI evaluation. Submit a sample news article below. Our AI fact-checker requires a score of 85 or higher to grant you publishing rights.
          </p>
        </div>

        {result ? (
          <div className={`p-6 border mb-8 bg-surface-container-low ${result.isVerified ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
            <div className="flex items-center gap-3 mb-4">
              {result.isVerified ? (
                <CheckCircle size={24} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={24} className="text-red-500" />
              )}
              <h2 className={`font-display text-xl font-bold ${result.isVerified ? 'text-emerald-500' : 'text-red-500'}`}>
                {result.isVerified ? 'Verification Passed!' : 'Verification Failed'}
              </h2>
            </div>
            
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant/60">Final Score</span>
              <span className={`font-display text-4xl font-black ${result.isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.score}
              </span>
              <span className="font-label text-xs text-on-surface-variant/40">/ 100</span>
            </div>

            <div className="p-4 bg-surface-container-high/50 border border-outline-variant/30 mb-6">
              <span className="font-label text-[10px] text-primary uppercase tracking-wider block mb-2">AI Feedback</span>
              <p className="font-body text-sm text-on-surface-variant/80 italic">{result.reasoning}</p>
            </div>

            {result.isVerified ? (
              <p className="font-label text-xs text-on-surface-variant/60 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Redirecting to publisher...
              </p>
            ) : (
              <button 
                onClick={() => { setResult(null); setContent(''); }}
                className="w-full h-12 border border-outline-variant text-on-surface font-label text-xs uppercase tracking-wider hover:bg-surface-container-high transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70">Sample Article</span>
                <span className="font-label text-[10px] text-on-surface-variant/40">{content.length} chars</span>
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Paste a factual, well-researched news article here..."
                className="w-full h-64 bg-surface-container-low border border-outline-variant p-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary/50 focus:outline-none transition-colors resize-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 font-body text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || content.length < 100}
              className="w-full h-12 bg-primary text-on-primary font-label text-xs uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-on-primary border-t-transparent animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <FileText size={14} /> Submit for Verification
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
