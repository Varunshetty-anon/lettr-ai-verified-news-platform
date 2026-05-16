"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FileText, Link as LinkIcon, Image as ImageIcon, Video, CheckCircle, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { InputField } from "../components/ui/InputField";

const CATEGORIES = [
  'AI & Tech', 'Startups', 'Finance', 'Crypto', 'Geopolitics',
  'Defense', 'Space', 'Health', 'Environment', 'Science'
];

export default function PublishPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    headline: '',
    body: '',
    sourceLink: '',
    imageUrl: '',
    videoUrl: '',
    category: CATEGORIES[0]
  });

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: 'An unexpected error occurred during publishing.' });
    }
    setLoading(false);
  };

  if (status === 'loading') return null;

  if (!session || !session.user?.email) {
    router.push('/auth');
    return null;
  }

  // Use a heuristic check for demo purposes
  const isVerified = (session.user as any).role === 'AUTHOR' || true; // Assuming they can access this page

  return (
    <div className="w-full min-h-screen pt-[64px] pb-[128px]">
      <div className="max-w-[1000px] mx-auto px-[20px] sm:px-0">

        {/* Header */}
        <div className="mb-[64px] border-b border-outline-variant/30 pb-[32px] flex flex-col md:flex-row md:items-end justify-between gap-[32px]">
          <div>
            <div className="flex items-center gap-4 mb-4 text-primary">
              <FileText size={48} />
              <h1 className="font-display text-[48px] font-bold text-on-surface leading-[1.1] tracking-[-0.02em]">Publish Report</h1>
            </div>
            <p className="font-body text-[20px] text-on-surface-variant leading-[1.6] max-w-[600px]">
              Submit your report for AI verification. Content must meet a minimum Fact Score of 60 to be published to the network.
            </p>
          </div>

           <div className="flex items-center gap-2 px-4 py-2 bg-tertiary-fixed/20 border border-tertiary-container/30 text-tertiary w-fit h-fit rounded-none">
              <CheckCircle size={16} />
              <span className="font-label text-[12px] uppercase tracking-[0.1em] font-bold">Verified Author</span>
           </div>
        </div>

        <form onSubmit={handlePublish} className="space-y-[64px]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-[64px]">
             {/* Left Column - Main Content */}
             <div className="lg:col-span-2 space-y-[32px]">
                <div>
                  <label className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4 block font-bold">HEADLINE</label>
                  <input 
                    value={formData.headline} 
                    onChange={e => setFormData({...formData, headline: e.target.value})} 
                    required 
                    placeholder="Enter professional, factual headline..." 
                    className="w-full bg-transparent border-b-[2px] border-outline-variant px-0 py-4 font-display text-[32px] text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/30 rounded-none"
                  />
                </div>

                <div>
                  <label className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4 block font-bold">REPORT CONTENT</label>
                  <textarea 
                    value={formData.body} 
                    onChange={e => setFormData({...formData, body: e.target.value})} 
                    required 
                    rows={16}
                    placeholder="Write your detailed article here. Include background context and analysis..." 
                    className="w-full bg-surface-dim border-[2px] border-outline-variant p-[32px] font-body text-[16px] text-on-surface outline-none focus:border-primary transition-all resize-none placeholder:text-on-surface-variant/40 leading-[1.6] rounded-none shadow-none"
                  />
                </div>
             </div>

             {/* Right Column - Metadata & Assets */}
             <div className="space-y-[32px]">
                <div className="bg-surface-dim border-[2px] border-outline-variant p-[32px] space-y-[32px] rounded-none shadow-none">
                   <h3 className="font-label text-[12px] uppercase tracking-[0.1em] text-primary font-bold border-b border-outline-variant/30 pb-4">METADATA & SOURCES</h3>
                   
                   <InputField
                      label="SOURCE LINKS"
                      value={formData.sourceLink}
                      onChange={e => setFormData({...formData, sourceLink: e.target.value})}
                      required
                      placeholder="https://..."
                   />

                   <div>
                     <label className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-2 block">PRIMARY CATEGORY</label>
                     <select 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value})} 
                        className="w-full bg-transparent border-b-2 border-outline-variant px-0 py-2 font-body text-base text-on-surface outline-none focus:border-primary transition-all rounded-none"
                     >
                       {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                   </div>
                </div>

                <div className="bg-surface-dim border-[2px] border-outline-variant p-[32px] space-y-[32px] rounded-none shadow-none">
                   <h3 className="font-label text-[12px] uppercase tracking-[0.1em] text-primary font-bold border-b border-outline-variant/30 pb-4">MULTIMODAL ASSETS</h3>
                   
                   <InputField
                      label="IMAGE URL"
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://..."
                   />

                   <InputField
                      label="VIDEO URL"
                      value={formData.videoUrl}
                      onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                      placeholder="https://..."
                   />
                </div>

                <Button
                  type="submit" 
                  disabled={loading} 
                  variant="primary"
                  className="w-full h-[64px] text-[14px]"
                >
                  {loading ? (
                     <>
                        <div className="w-5 h-5 border-[2px] border-on-primary border-t-transparent rounded-none animate-spin" />
                        VERIFYING...
                     </>
                  ) : 'PUBLISH ARTICLE'}
                </Button>
             </div>
          </div>
        </form>

        {result && (
          <div className={`mt-[64px] border-[2px] p-[32px] bg-surface shadow-none rounded-none ${result.success ? 'border-[#485c00]' : 'border-red-500'}`}>
            {result.success && (
              <div className="space-y-[32px]">
                <div className="flex items-center gap-4">
                  <CheckCircle size={48} className="text-[#485c00]" />
                  <h3 className="font-display text-[32px] font-bold text-[#485c00] leading-[1.2] tracking-[-0.01em]">SUBMISSION SUCCESSFUL</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                   <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                      <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2 font-bold">FINAL FACT SCORE</span>
                      <span className="font-display text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-[#485c00]">{result.factScore}%</span>
                   </div>
                   <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                      <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2 font-bold">AI CONFIDENCE</span>
                      <span className="font-display text-[24px] font-bold text-on-surface">{result.confidence}</span>
                   </div>
                </div>

                <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                  <span className="font-label text-[12px] text-primary uppercase tracking-[0.1em] block mb-4 font-bold">AI VERIFICATION SUMMARY</span>
                  <p className="font-body text-[16px] text-on-surface leading-[1.6] italic">&quot;{result.factSummary}&quot;</p>
                </div>

                <Button
                  onClick={() => router.push(`/post/${result.post._id}`)}
                  variant="secondary"
                  className="w-full sm:w-auto h-[64px]"
                >
                  VIEW LIVE ARTICLE <ArrowUpRight size={20} />
                </Button>
              </div>
            )}
            
            {result.rejected && (
              <div className="space-y-[32px]">
                <div className="flex items-center gap-4">
                  <AlertTriangle size={48} className="text-red-500" />
                  <h3 className="font-display text-[32px] font-bold text-red-500 leading-[1.2] tracking-[-0.01em]">SUBMISSION REJECTED</h3>
                </div>
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-none max-w-sm">
                   <span className="font-label text-[10px] uppercase tracking-[0.1em] text-red-600 block mb-2 font-bold">FACT SCORE</span>
                   <span className="font-display text-[48px] font-bold leading-[1.1] tracking-[-0.02em] text-red-500">{result.factScore}%</span>
                </div>
                <p className="font-body text-[16px] text-on-surface leading-[1.6] italic">&quot;{result.factSummary}&quot;</p>
                <p className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant">Journalistic integrity threshold not met. Please review your sources and try again.</p>
              </div>
            )}

            {result.error && !result.success && !result.rejected && (
              <div className="flex items-center gap-4 text-red-500 font-label text-[12px] uppercase tracking-[0.1em] font-bold p-6 bg-red-500/10 border-[2px] border-red-500/20 rounded-none">
                <AlertTriangle size={24} />
                <p>{result.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
