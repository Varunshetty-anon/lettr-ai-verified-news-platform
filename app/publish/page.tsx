"use client";

import React, { useState } from 'react';

export default function PublishPage() {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLink, setSourceLink] = useState('');
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
        body: JSON.stringify({ headline, description, sourceLink })
      });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        setHeadline('');
        setDescription('');
        setSourceLink('');
      }
    } catch (err) {
      setResult({ error: 'Network error. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen">
      {/* Header */}
      <div className="px-6 pt-10 pb-6 border-b border-outline-variant/15">
        <h1 className="font-display text-sm uppercase tracking-[0.2em] text-on-surface-variant font-medium">Publish</h1>
        <p className="font-body text-xs text-on-surface-variant/60 mt-1">Submit content for AI fact-checking and publication</p>
      </div>

      <div className="px-6 py-8">
        <form onSubmit={handlePublish} className="flex flex-col gap-6">
          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 block">Headline</label>
            <input 
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              required
              placeholder="Enter factual headline..."
              className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-3 font-display text-xl text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/30"
            />
          </div>
          
          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 block">Description & Evidence</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe the event with citations..."
              className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-3 font-body text-base text-on-surface outline-none focus:border-primary transition-colors resize-none placeholder:text-on-surface-variant/30"
            />
          </div>

          <div>
            <label className="font-label text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 block">Source Link (Optional)</label>
            <input 
              value={sourceLink}
              onChange={e => setSourceLink(e.target.value)}
              placeholder="https://..."
              className="w-full bg-transparent border-b border-outline-variant/30 px-0 py-3 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full font-label text-xs uppercase tracking-[0.15em] bg-primary text-on-primary py-4 hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? 'Analyzing with AI...' : 'Fact-Check & Publish'}
            </button>
          </div>
        </form>

        {/* Result Display */}
        {result && (
          <div className={`mt-8 border p-6 ${result.success ? 'border-emerald-200 bg-emerald-50/50' : result.rejected ? 'border-red-200 bg-red-50/50' : 'border-red-200 bg-red-50/50'}`}>
            {result.success && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-3xl font-black text-emerald-700">{result.factScore}</span>
                  <div>
                    <p className="font-label text-xs uppercase tracking-wider text-emerald-700">Published Successfully</p>
                    <p className="font-body text-sm text-emerald-600 mt-0.5">{result.reasoning}</p>
                  </div>
                </div>
              </>
            )}
            {result.rejected && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-display text-3xl font-black text-red-700">{result.factScore}</span>
                  <div>
                    <p className="font-label text-xs uppercase tracking-wider text-red-700">Content Rejected</p>
                    <p className="font-body text-sm text-red-600 mt-0.5">{result.reasoning}</p>
                  </div>
                </div>
              </>
            )}
            {result.error && (
              <p className="font-body text-sm text-red-700">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
