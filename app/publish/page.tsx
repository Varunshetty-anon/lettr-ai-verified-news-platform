"use client";

import React, { useState } from 'react';
import { Shield } from 'lucide-react';

const CATEGORIES = ['World', 'Politics', 'Technology', 'Economy', 'Science', 'Culture', 'AI & Tech', 'Health'];

export default function PublishPage() {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
  const [category, setCategory] = useState('World');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, description, sourceLink, category, authorEmail: 'demo@lettr.ai' })
      });
      const data = await res.json();
      setResult(data);
      if (data.success) { setHeadline(''); setDescription(''); setSourceLink(''); }
    } catch {
      setResult({ error: 'Network error.' });
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen">
      <div className="px-5 pt-8 pb-4 border-b border-outline-variant">
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Publish</h1>
        <p className="font-body text-xs text-on-surface-variant/50 mt-1">Submit content for AI fact-checking</p>
      </div>

      <div className="p-5">
        <form onSubmit={handlePublish} className="flex flex-col gap-5">
          <div>
            <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2 block">Headline</label>
            <input
              value={headline} onChange={e => setHeadline(e.target.value)} required
              placeholder="Enter factual headline..."
              className="w-full bg-transparent border-b border-outline-variant px-0 py-3 font-display text-lg text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
            />
          </div>

          <div>
            <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2 block">Description & Evidence</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} required rows={5}
              placeholder="Describe the event with citations..."
              className="w-full bg-transparent border-b border-outline-variant px-0 py-3 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors resize-none placeholder:text-on-surface-variant/25"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2 block">Source URL</label>
              <input
                value={sourceLink} onChange={e => setSourceLink(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent border-b border-outline-variant px-0 py-3 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
              />
            </div>
            <div className="w-40">
              <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-2 block">Category</label>
              <select
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-transparent border-b border-outline-variant px-0 py-3 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full font-label text-xs uppercase tracking-[0.15em] bg-primary text-on-primary py-3.5 transition-colors disabled:opacity-40 mt-2"
          >
            {loading ? 'Analyzing with AI...' : 'Fact-Check & Publish'}
          </button>
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-6 border p-5 animate-fade-in ${
            result.success ? 'border-emerald-300/30 dark:border-emerald-700/30' 
            : result.rejected ? 'border-red-300/30 dark:border-red-700/30' 
            : result.requiresVerification ? 'border-amber-300/30 dark:border-amber-700/30'
            : 'border-red-300/30 dark:border-red-700/30'
          }`}>
            {result.success && (
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-label text-xs text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Published · Score {result.factScore}</p>
                  <p className="font-body text-sm text-on-surface-variant mt-0.5">{result.reasoning}</p>
                </div>
              </div>
            )}
            {result.rejected && (
              <div className="flex items-center gap-3">
                <Shield size={20} className="text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-label text-xs text-red-700 dark:text-red-400 uppercase tracking-wider">Rejected · Score {result.factScore}</p>
                  <p className="font-body text-sm text-on-surface-variant mt-0.5">{result.reasoning}</p>
                </div>
              </div>
            )}
            {result.requiresVerification && (
              <div>
                <p className="font-label text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wider">Author Verification Required</p>
                <p className="font-body text-sm text-on-surface-variant mt-1">{result.error}</p>
              </div>
            )}
            {result.error && !result.requiresVerification && (
              <p className="font-body text-sm text-red-600 dark:text-red-400">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
