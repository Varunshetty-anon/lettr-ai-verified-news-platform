"use client";

import React, { useState } from 'react';
import { Button } from '../components/ui/Button';

export default function PublishPage() {
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // AI Verification would hook in here, followed by DB push.
    setTimeout(() => {
       alert("Simulating Fact Check via Gemini...\nFact Score: 94\nReasoning: Data aligns with AP News and Reuters. Proceeding to publish.");
       setLoading(false);
       setHeadline('');
       setDescription('');
    }, 2000);
  };

  return (
    <div className="w-full px-6 py-10 min-h-screen">
      <div className="mb-10 pb-8 border-b border-outline-variant/10">
         <h1 className="font-display font-medium text-2xl uppercase tracking-[0.1em] text-primary">Author Dashboard</h1>
         <p className="font-body text-sm text-on-surface-variant mt-2">Publish an AI-Verified Article</p>
      </div>

      <form onSubmit={handlePublish} className="flex flex-col gap-6">
         <div>
           <label className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-2 block">Headline</label>
           <input 
             value={headline}
             onChange={e => setHeadline(e.target.value)}
             required
             placeholder="Enter factual headline..."
             className="w-full bg-surface-container-low border border-outline-variant/20 px-4 py-4 font-display text-2xl outline-none focus:border-primary transition-colors"
           />
         </div>
         
         <div>
           <label className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-2 block">Description & Evidence</label>
           <textarea 
             value={description}
             onChange={e => setDescription(e.target.value)}
             required
             rows={6}
             placeholder="Describe the event, providing citations..."
             className="w-full bg-surface-container-low border border-outline-variant/20 px-4 py-4 font-body text-lg outline-none focus:border-primary transition-colors resize-none"
           />
         </div>

         <div className="pt-4 border-t border-outline-variant/20">
           <Button type="submit" disabled={loading} className="w-full">
             {loading ? 'Evaluating Fact Score...' : 'Fact-Check & Publish'}
           </Button>
         </div>
      </form>
    </div>
  );
}
