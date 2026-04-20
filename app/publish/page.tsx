"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, FileText, Link as LinkIcon, Image as ImageIcon, Video, AlertTriangle, CheckCircle, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'AI & Tech', 'Startups', 'Finance', 'Crypto', 'Geopolitics',
  'Defense', 'Space', 'Health', 'Environment', 'Internet Culture',
  'Science', 'Business', 'Energy'
];

export default function PublishPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    headline: '',
    body: '',
    sourceLink: '',
    imageUrl: '',
    videoUrl: '',
    category: 'AI & Tech'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (status === 'loading') return null;
  
  const isVerified = (session?.user as any)?.isVerifiedAuthor || (session?.user as any)?.role === 'AUTHOR';

  if (!session || !isVerified) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-5 bg-surface-container-lowest">
        <div className="text-center max-w-md border border-outline-variant bg-surface-container-low p-10 shadow-sm">
          <Shield size={48} className="mx-auto mb-6 text-primary/40" />
          <h2 className="font-display text-2xl font-bold mb-3 text-on-surface">Author Verification Required</h2>
          <p className="font-body text-sm text-on-surface-variant/70 mb-8 leading-relaxed">
            You must pass our AI journalism evaluation to publish articles. This ensures the LETTR feed remains highly factual and professional.
          </p>
          <button 
            onClick={() => router.push('/verify')}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-on-primary h-14 font-label text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
          >
            Start Verification <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
         setFormData({
            headline: '',
            body: '',
            sourceLink: '',
            imageUrl: '',
            videoUrl: '',
            category: 'AI & Tech'
         });
      }
    } catch { 
      setResult({ error: 'Network communication error. Please try again.' }); 
    }
    setLoading(false);
  };

  return (
    <div className="w-full min-h-screen animate-fade-in bg-surface-container-lowest pb-20">
      <div className="px-5 pt-10 pb-6 border-b border-outline-variant bg-surface-container-low sticky top-0 z-10 shadow-sm mb-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
           <div>
              <h1 className="font-display text-xs uppercase tracking-[0.3em] text-primary font-bold flex items-center gap-2">
                Professional Publisher <Shield size={14} className="text-emerald-500" />
              </h1>
              <p className="font-body text-sm text-on-surface-variant/50 mt-1">Submit high-fidelity reports for AI fact-checking</p>
           </div>
           <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full">
              <CheckCircle size={12} />
              <span className="font-label text-[10px] uppercase tracking-wider font-bold">Verified Author Status</span>
           </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5">
        <form onSubmit={handlePublish} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             <div className="md:col-span-2 space-y-8">
                <div>
                  <label className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mb-3 block">Headline</label>
                  <input 
                    value={formData.headline} 
                    onChange={e => setFormData({...formData, headline: e.target.value})} 
                    required 
                    placeholder="Enter professional, factual headline..." 
                    className="w-full bg-transparent border-b border-outline-variant px-0 py-4 font-display text-3xl text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/20" 
                  />
                </div>

                <div>
                  <label className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 mb-3 block">Report Content</label>
                  <textarea 
                    value={formData.body} 
                    onChange={e => setFormData({...formData, body: e.target.value})} 
                    required 
                    rows={12} 
                    placeholder="Write your detailed article here. Include background context and analysis..." 
                    className="w-full bg-surface-container-low border border-outline-variant p-6 font-body text-base text-on-surface outline-none focus:border-primary/40 transition-all resize-none placeholder:text-on-surface-variant/20 leading-relaxed shadow-inner" 
                  />
                </div>
             </div>

             <div className="space-y-8">
                <div className="bg-surface-container-low border border-outline-variant p-6 space-y-6 shadow-sm">
                   <h3 className="font-display text-[10px] uppercase tracking-widest text-primary font-bold border-b border-outline-variant/30 pb-3">Metadata & Sources</h3>
                   
                   <div>
                     <label className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2 block flex items-center gap-2">
                        <LinkIcon size={10} /> Source Links
                     </label>
                     <input 
                        value={formData.sourceLink} 
                        onChange={e => setFormData({...formData, sourceLink: e.target.value})} 
                        required
                        placeholder="https://..." 
                        className="w-full bg-transparent border-b border-outline-variant px-0 py-2 font-body text-xs text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/25" 
                     />
                   </div>

                   <div>
                     <label className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Primary Category</label>
                     <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-transparent border-b border-outline-variant px-0 py-2 font-body text-xs text-on-surface outline-none focus:border-primary transition-all"
                     >
                       {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant p-6 space-y-6 shadow-sm">
                   <h3 className="font-display text-[10px] uppercase tracking-widest text-primary font-bold border-b border-outline-variant/30 pb-3">Multimodal Assets</h3>
                   
                   <div>
                     <label className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2 block flex items-center gap-2">
                        <ImageIcon size={10} /> Image URL
                     </label>
                     <input 
                        value={formData.imageUrl} 
                        onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                        placeholder="https://..." 
                        className="w-full bg-transparent border-b border-outline-variant px-0 py-2 font-body text-xs text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/25" 
                     />
                   </div>

                   <div>
                     <label className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 mb-2 block flex items-center gap-2">
                        <Video size={10} /> Video URL
                     </label>
                     <input 
                        value={formData.videoUrl} 
                        onChange={e => setFormData({...formData, videoUrl: e.target.value})} 
                        placeholder="https://..." 
                        className="w-full bg-transparent border-b border-outline-variant px-0 py-2 font-body text-xs text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/25" 
                     />
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full font-label text-xs uppercase tracking-[0.2em] bg-primary text-on-primary py-4 hover:bg-primary/90 transition-all disabled:opacity-40 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 font-bold"
                >
                  {loading ? (
                     <>
                        <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                        Verifying...
                     </>
                  ) : 'Publish Article'}
                </button>
             </div>
          </div>
        </form>

        {result && (
          <div className={`mt-10 border-l-4 p-8 animate-fade-in bg-surface-container-low shadow-sm ${result.success ? 'border-emerald-500' : 'border-red-500'}`}>
            {result.success && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} className="text-emerald-500" />
                  <h3 className="font-display text-xl font-bold text-on-surface">Submission Successful</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div className="p-4 bg-surface-container-high/40 border border-outline-variant/30">
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-1">Final Fact Score</span>
                      <span className="font-display text-3xl font-black text-emerald-500">{result.factScore}%</span>
                   </div>
                   <div className="p-4 bg-surface-container-high/40 border border-outline-variant/30">
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60 block mb-1">AI Confidence</span>
                      <span className="font-display text-xl font-bold text-on-surface">{result.confidence}</span>
                   </div>
                </div>

                <div className="p-5 bg-surface-container-high border border-outline-variant/40">
                  <p className="font-label text-[9px] text-primary uppercase tracking-widest block mb-3 font-bold">AI Verification Summary</p>
                  <p className="font-body text-sm text-on-surface-variant italic leading-relaxed">"{result.factSummary}"</p>
                </div>

                <button 
                  onClick={() => router.push(`/post/${result.post._id}`)}
                  className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest text-primary font-bold hover:underline"
                >
                  View Live Article <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            
            {result.rejected && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={24} className="text-red-500" />
                  <h3 className="font-display text-xl font-bold text-on-surface">Submission Rejected</h3>
                </div>
                <div className="p-4 bg-red-500/10 border border-red-500/20">
                   <span className="font-label text-[9px] uppercase tracking-widest text-red-600/60 block mb-1">Fact Score</span>
                   <span className="font-display text-3xl font-black text-red-500">{result.factScore}%</span>
                </div>
                <p className="font-body text-sm text-on-surface-variant/80 italic leading-relaxed">"{result.factSummary}"</p>
                <p className="text-xs text-on-surface-variant/60">Journalistic integrity threshold not met. Please review your sources and try again.</p>
              </div>
            )}

            {result.error && !result.success && !result.rejected && (
              <div className="flex items-center gap-3 text-red-500">
                <AlertTriangle size={18} />
                <p className="font-body text-sm font-medium">{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
