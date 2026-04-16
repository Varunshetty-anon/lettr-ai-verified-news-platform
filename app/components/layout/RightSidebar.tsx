import React from 'react';

export function RightSidebar() {
  const trendingTopics = ["Global Policy", "Silicon Valley", "Renewable Infrastructure", "Economic Sanctions"];

  return (
    <aside className="w-[320px] h-screen sticky top-0 hidden lg:flex flex-col border-l border-outline-variant/20 bg-surface px-8 py-10 overflow-y-auto">
      
      <div className="mb-12">
        <h3 className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-6 border-b border-outline-variant/20 pb-2">Trending Topics</h3>
        <div className="flex flex-col gap-4">
          {trendingTopics.map((topic, i) => (
             <button key={i} className="text-left group flex items-start flex-col gap-1">
               <span className="font-display font-bold text-lg text-on-surface group-hover:text-primary transition-colors leading-tight">{topic}</span>
               <span className="font-body text-xs text-on-surface-variant">42 Verified Articles</span>
             </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-6 border-b border-outline-variant/20 pb-2">Top Origin Sources</h3>
        <div className="flex flex-col gap-4">
           {['reuters.com', 'apnews.com', 'wsj.com'].map((src, i) => (
              <a key={i} href={`#`} className="font-body text-base text-primary hover:underline underline-offset-4 decoration-primary/30">
                 {src}
              </a>
           ))}
        </div>
      </div>
      
    </aside>
  );
}
