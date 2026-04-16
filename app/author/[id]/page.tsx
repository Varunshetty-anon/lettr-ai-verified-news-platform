import React from 'react';
import { SurfaceCard } from '../../components/ui/SurfaceCard';
import { ScorePillar } from '../../components/ui/ScorePillar';

// Using async component pattern for dynamic route
export default async function AuthorProfile({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-24">
      {/* Author Header */}
      <div className="flex flex-col md:flex-row items-start gap-12 mb-16">
        <div className="w-32 h-32 md:w-48 md:h-48 bg-primary-container text-on-primary-container flex items-center justify-center font-display text-6xl md:text-8xl rounded-sm">
          A
        </div>
        <div>
          <span className="font-label text-sm uppercase tracking-widest text-on-surface-variant mb-4 block">Author Details - {resolvedParams.id}</span>
          <h1 className="font-display text-5xl md:text-7xl font-black text-on-surface mb-6">Alexandria Vance</h1>
          <p className="font-body text-xl max-w-2xl text-on-surface-variant">
            Independent investigative journalist. Focuses on tech policy, cybersecurity, and global information systems. Fact-checked by 12 distinct networks.
          </p>
        </div>
      </div>

      {/* Authored Articles */}
      <div className="border-t-2 border-outline-variant border-opacity-15 pt-12">
        <h2 className="font-label text-sm uppercase tracking-[0.1em] text-on-surface-variant mb-8">Published Archive</h2>
        
        <div className="flex flex-col gap-8">
          <SurfaceCard level="low" className="group cursor-pointer">
            <div className="flex gap-6 items-start">
               <ScorePillar score={99} label="TRUST" />
               <div>
                  <h3 className="font-display text-3xl font-bold text-on-surface mb-4 group-hover:text-primary transition-colors">
                    The Undersea Cables that dictate Global Sovereignty
                  </h3>
                  <p className="font-body text-lg text-on-surface-variant mb-4">
                    An analysis of the unmapped data corridors that process terrestrial communication.
                  </p>
               </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
