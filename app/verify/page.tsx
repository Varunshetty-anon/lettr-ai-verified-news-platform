"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Shield, FileText, CheckCircle, AlertTriangle, Link as LinkIcon, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';

export default function VerifyAuthor() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    headline: '',
    body: '',
    sources: '',
    imageUrl: '',
    videoUrl: ''
  });

  useEffect(() => {
    const isVerified = (session?.user as any)?.isVerifiedAuthor || (session?.user as any)?.role === 'AUTHOR';
    if (isVerified) {
      router.replace('/publish');
    }
  }, [session, router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/verify-author', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Verification failed');
      } else {
        setResult(data);
        if (data.isVerified) {
          setTimeout(() => {
            update().finally(() => {
              router.push('/publish');
              router.refresh();
            });
          }, 1800);
        }
      }
    } catch (err) {
      setError('An error occurred during verification');
    }
    setLoading(false);
  };

  if (status === 'loading') return null;
  if (!session) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="w-full min-h-screen pt-[64px] pb-[128px]">
      <div className="max-w-[800px] mx-auto px-[20px] sm:px-0">
        <div className="mb-[64px] border-b border-outline-variant/30 pb-[32px]">
          <div className="flex items-center gap-4 mb-4 text-primary">
            <Shield size={48} />
            <h1 className="font-display text-[48px] font-bold text-on-surface leading-[1.1] tracking-[-0.02em]">Author Verification</h1>
          </div>
          <p className="font-body text-[20px] text-on-surface-variant leading-[1.6] max-w-[600px]">
            Pass our one-time AI evaluation to earn your Verified Author badge. Submit a high-fidelity news sample with evidence to unlock professional publishing rights.
          </p>
        </div>

        {result ? (
          <div className={`p-[32px] border-[2px] mb-[64px] bg-surface relative overflow-hidden rounded-none ${result.isVerified ? 'border-[#485c00]' : 'border-red-500'}`}>
            <div className={`absolute top-0 left-0 w-full h-[4px] ${result.isVerified ? 'bg-[#485c00]' : 'bg-red-500'}`} />
            
            <div className="flex items-center gap-4 mb-[32px]">
              {result.isVerified ? (
                <CheckCircle size={48} className="text-[#485c00]" />
              ) : (
                <AlertTriangle size={48} className="text-red-500" />
              )}
              <div>
                <h2 className={`font-display text-[32px] font-bold leading-[1.2] tracking-[-0.01em] ${result.isVerified ? 'text-[#485c00]' : 'text-red-500'}`}>
                  {result.isVerified ? 'VERIFICATION APPROVED' : 'VERIFICATION DENIED'}
                </h2>
                <p className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mt-1">
                   {result.isVerified ? 'YOU ARE NOW A VERIFIED LETTR AUTHOR' : 'SUBMISSION DID NOT MEET JOURNALISTIC STANDARDS'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px] mb-[32px]">
              <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2 font-bold">FACT SCORE</span>
                <div className="flex items-baseline gap-1">
                   <span className={`font-display text-[48px] font-bold leading-[1.1] tracking-[-0.02em] ${result.isVerified ? 'text-[#485c00]' : 'text-red-500'}`}>{result.score}</span>
                   <span className="font-label text-[14px] text-on-surface-variant">/100</span>
                </div>
              </div>
              <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2 font-bold">CONFIDENCE</span>
                <span className="font-display text-[24px] font-bold text-on-surface">{result.confidence}</span>
              </div>
              <div className="p-6 bg-surface-dim border border-outline-variant/50 rounded-none">
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2 font-bold">SOURCES VALIDATED</span>
                <span className="font-display text-[24px] font-bold text-on-surface">{result.sourcesChecked}</span>
              </div>
            </div>

            <div className="p-6 bg-surface-dim border border-outline-variant/50 mb-[32px] rounded-none">
              <span className="font-label text-[12px] text-primary uppercase tracking-[0.1em] block mb-4 font-bold">AI VERIFICATION SUMMARY</span>
              <p className="font-body text-[16px] text-on-surface leading-[1.6] italic">&quot;{result.summary}&quot;</p>
            </div>

            {result.isVerified ? (
              <div className="flex items-center gap-4 p-6 bg-[#c3f400]/10 border border-[#5d7600]/30 text-[#485c00] font-label text-[12px] uppercase tracking-[0.1em] font-bold rounded-none">
                <div className="w-5 h-5 border-[2px] border-[#485c00] border-t-transparent rounded-none animate-spin" />
                UPDATING CREDENTIALS AND REDIRECTING...
              </div>
            ) : (
              <Button
                onClick={() => { setResult(null); setFormData({ headline: '', body: '', sources: '', imageUrl: '', videoUrl: '' }); }}
                variant="secondary"
                className="w-full h-[64px]"
              >
                START NEW EVALUATION
              </Button>
            )}
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-[32px] bg-surface border border-outline-variant p-[32px] sm:p-[64px] shadow-none rounded-none">
            <div className="space-y-[32px]">
              <div>
                <label className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant mb-4 block font-bold">ARTICLE HEADLINE *</label>
                <input
                  required
                  value={formData.headline}
                  onChange={e => setFormData({...formData, headline: e.target.value})}
                  placeholder="The main claim or title of your report"
                  className="w-full h-[64px] bg-transparent border-b-[2px] border-outline-variant px-0 font-display text-[32px] text-on-surface placeholder:text-on-surface-variant/30 focus:border-primary outline-none transition-all rounded-none"
                />
              </div>

              <div>
                <label className="flex items-center justify-between mb-4">
                  <span className="font-label text-[12px] uppercase tracking-[0.1em] text-on-surface-variant font-bold">EVIDENCE & ARTICLE BODY *</span>
                  <span className="font-label text-[10px] text-on-surface-variant">{formData.body.length} CHARS</span>
                </label>
                <textarea
                  required
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                  placeholder="Detailed report with key facts, names, and timeline..."
                  className="w-full h-[320px] bg-surface-dim border-[2px] border-outline-variant p-6 font-body text-[16px] text-on-surface leading-[1.6] placeholder:text-on-surface-variant/40 focus:border-primary outline-none transition-all resize-none rounded-none"
                />
              </div>

              <InputField
                label="SOURCE LINKS *"
                required
                value={formData.sources}
                onChange={e => setFormData({...formData, sources: e.target.value})}
                placeholder="https://source-one.com, https://source-two.org"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] pt-[32px] border-t border-outline-variant/30">
                 <InputField
                    label="IMAGE EVIDENCE URL"
                    value={formData.imageUrl}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://..."
                 />
                 <InputField
                    label="VIDEO EVIDENCE URL"
                    value={formData.videoUrl}
                    onChange={e => setFormData({...formData, videoUrl: e.target.value})}
                    placeholder="https://..."
                 />
              </div>
            </div>

            {error && (
              <div className="p-6 bg-red-500/10 border-[2px] border-red-500/20 text-red-500 font-label text-[12px] uppercase tracking-[0.1em] font-bold flex items-center gap-3 rounded-none">
                <AlertTriangle size={20} />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full h-[64px] text-[14px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-[2px] border-on-primary border-t-transparent rounded-none animate-spin" />
                  AI FACT-CHECKING IN PROGRESS...
                </>
              ) : (
                <>
                  <FileText size={20} /> SUBMIT VERIFICATION PORTFOLIO
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
