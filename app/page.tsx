import React from 'react';
import { ScorePillar } from './components/ui/ScorePillar';

export default function Home() {
  const trendingNews = [
    { id: 1, title: 'Global Climate Summit Reaches Unprecedented Accord on Emission Standards', summary: 'Delegates from 195 nations finalized a binding agreement targeting a 45% reduction in greenhouse gas emissions by 2030, marking a pivotal moment in international climate policy.', score: 98 },
    { id: 2, title: 'Central Bank Unexpectedly Hikes Interest Rates, Market Recoils', summary: 'In a surprise move to combat persistent inflation, the central bank raised rates by 50 basis points. The decision immediately rippled through global equity markets.', score: 85 },
    { id: 3, title: 'Tech Giant Unveils Revolutionary "Neural Interface" Device', summary: 'Silicon Valley powerhouse showcased a non-invasive wearable that claims to interpret neural signals for device control, though independent verification remains scarce.', score: 45, isDisputed: true },
  ];

  return (
    <div className="w-full px-6 py-10 min-h-screen">
      <div className="mb-10 text-center pb-8 border-b border-outline-variant/10">
         <h1 className="font-display font-medium text-xl uppercase tracking-[0.15em] text-primary">Your Feed</h1>
         <p className="font-body text-sm text-on-surface-variant mt-2">Verified Content Only</p>
      </div>

      <div className="flex flex-col gap-0 border border-outline-variant/20 rounded-sm">
        {trendingNews.map((news, index) => (
          <div key={news.id} className={`flex gap-6 items-start p-8 ${index !== trendingNews.length - 1 ? 'border-b border-outline-variant/20' : ''} hover:bg-surface-container-lowest transition-colors cursor-pointer`}>
             <ScorePillar score={news.score} isDisputed={news.isDisputed} />
             <div className="flex-1">
                <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-3 block">
                    {news.originSource || 'User Submitted'}
                </span>
                <h3 className="font-display text-3xl font-bold tracking-tight text-on-surface mb-3 leading-snug">
                  {news.title}
                </h3>
                <p className="font-body text-base text-on-surface-variant leading-relaxed">
                  {news.summary}
                </p>
                <div className="mt-4 flex items-center gap-3">
                   {news.score >= 80 && (
                      <span className="font-label text-xs text-on-primary bg-primary font-medium px-3 py-1 rounded-sm">Highly Credible</span>
                   )}
                   {news.score <= 60 && (
                      <span className="font-label text-xs text-on-tertiary-container bg-tertiary font-medium px-3 py-1 rounded-sm">Low Fact Score</span>
                   )}
                   <span className="font-label text-xs text-primary font-medium border border-primary/20 px-3 py-1 rounded-sm">AI Verified</span>
                   <span className="font-label text-xs text-on-surface-variant">Recent</span>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
