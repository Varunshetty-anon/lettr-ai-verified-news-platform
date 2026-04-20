"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, CheckCircle, AlertTriangle, FileText, ArrowRight, Link as LinkIcon, Image as ImageIcon, Video } from 'lucide-react';

export default function VerifyAuthorPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    headline: '',
    body: '',
    sources: '',
    imageUrl: '',
    videoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; summary: string; confidence: string; sourcesChecked: number; isVerified: boolean } | null>(null);
  const [error, setError] = useState('');

  const isAlreadyVerified = (session?.user as any)?.isVerifiedAuthor;

  useEffect(() => {
    if (status === 'authenticated' && isAlreadyVerified) {
      router.push('/account');
    }
  }, [status, isAlreadyVerified, router]);

  if (status === 'loading') return (
    <div className="w-full min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  
  if (status === 'unauthenticated') {
    router.push('/auth');
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.body.length < 100) {
      setError('Please provide at least 100 characters in the article body.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/verify-author`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setResult(data);
      if (data.isVerified) {
        // Update session so state reflects verification
        await update();
        setTimeout(() => {
          router.push('/account');
        }, 4000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-5 animate-fade-in bg-surface-container-lowest">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 border-b border-outline-variant pb-8">
          <div className="flex items-center gap-3 mb-3 text-primary">
            <Shield size={32} />
            <h1 className="font-display text-3xl font-bold text-on-surface">Author Verification</h1>
          </div>
          <p className="font-body text-sm text-on-surface-variant/70 leading-relaxed max-w-xl">
            Pass our one-time AI evaluation to earn your Verified Author badge. Submit a high-fidelity news sample with evidence to unlock professional publishing rights.
          </p>
        </div>

        {result ? (
          <div className={`p-8 border mb-10 bg-surface-container-low relative overflow-hidden ${result.isVerified ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
            {result.isVerified && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />}
            {!result.isVerified && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
            
            <div className="flex items-center gap-4 mb-6">
              {result.isVerified ? (
                <CheckCircle size={32} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={32} className="text-red-500" />
              )}
              <div>
                <h2 className={`font-display text-2xl font-bold ${result.isVerified ? 'text-emerald-500' : 'text-red-500'}`}>
                  {result.isVerified ? 'Verification Approved' : 'Verification Denied'}
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 mt-0.5">
                   {result.isVerified ? 'You are now a Verified LETTR Author' : 'Submission did not meet journalistic standards'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/20">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-1">Fact Score</span>
                <div className="flex items-baseline gap-1">
                   <span className={`font-display text-3xl font-black ${result.isVerified ? 'text-emerald-400' : 'text-red-400'}`}>{result.score}</span>
                   <span className="text-xs text-on-surface-variant/40">/100</span>
                </div>
              </div>
              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/20">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-1">Confidence</span>
                <span className="font-display text-xl font-bold text-on-surface">{result.confidence}</span>
              </div>
              <div className="p-4 bg-surface-container-high/40 border border-outline-variant/20">
                <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-1">Sources Validated</span>
                <span className="font-display text-xl font-bold text-on-surface">{result.sourcesChecked}</span>
              </div>
            </div>

            <div className="p-5 bg-surface-container-high border border-outline-variant/40 mb-8 rounded-sm">
              <span className="font-label text-[10px] text-primary uppercase tracking-widest block mb-3">AI Verification Summary</span>
              <p className="font-body text-sm text-on-surface/90 leading-relaxed italic">"{result.summary}"</p>
            </div>

            {result.isVerified ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-label text-xs uppercase tracking-wider">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                Updating credentials and redirecting to your account...
              </div>
            ) : (
              <button 
                onClick={() => { setResult(null); setFormData({ headline: '', body: '', sources: '', imageUrl: '', videoUrl: '' }); }}
                className="h-14 px-8 border border-outline-variant text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container-high transition-all"
              >
                Start New Evaluation
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-8 bg-surface-container-low border border-outline-variant p-8 shadow-sm">
            <div className="space-y-6">
              <div>
                <label className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-3 block">Article Headline *</label>
                <input
                  required
                  value={formData.headline}
                  onChange={e => setFormData({...formData, headline: e.target.value})}
                  placeholder="The main claim or title of your report"
                  className="w-full h-14 bg-surface-container-lowest border border-outline-variant px-4 font-display text-lg text-on-surface placeholder:text-on-surface-variant/20 focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="flex items-center justify-between mb-3">
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70">Evidence & Article Body *</span>
                  <span className="font-label text-[10px] text-on-surface-variant/30">{formData.body.length} chars</span>
                </label>
                <textarea
                  required
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                  placeholder="Detailed report with key facts, names, and timeline..."
                  className="w-full h-80 bg-surface-container-lowest border border-outline-variant p-5 font-body text-sm text-on-surface leading-relaxed placeholder:text-on-surface-variant/20 focus:border-primary/50 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-3">
                   <LinkIcon size={12} /> Source Links *
                </label>
                <input
                  required
                  value={formData.sources}
                  onChange={e => setFormData({...formData, sources: e.target.value})}
                  placeholder="https://source-one.com, https://source-two.org"
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant px-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/20 focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-outline-variant/40">
                 <div>
                    <label className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-3">
                       <ImageIcon size={12} /> Image Evidence URL
                    </label>
                    <input
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full h-12 bg-surface-container-lowest border border-outline-variant px-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/20 focus:border-primary/50 outline-none transition-all"
                    />
                 </div>
                 <div>
                    <label className="flex items-center gap-2 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-3">
                       <Video size={12} /> Video Evidence URL
                    </label>
                    <input
                      value={formData.videoUrl}
                      onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full h-12 bg-surface-container-lowest border border-outline-variant px-4 font-body text-sm text-on-surface placeholder:text-on-surface-variant/20 focus:border-primary/50 outline-none transition-all"
                    />
                 </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 font-body text-sm flex items-center gap-3">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-primary text-on-primary font-label text-xs uppercase tracking-[0.2em] font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  AI Fact-Checking in Progress...
                </>
              ) : (
                <>
                  <FileText size={18} /> Submit Verification Portfolio
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
