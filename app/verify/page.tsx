import React from 'react';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { ScorePillar } from '../components/ui/ScorePillar';

export default function Verify() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-12 text-center">
        <ScorePillar score={100} label="SYSTEM" />
        <h1 className="font-display text-5xl font-black text-primary mt-8 mb-4">Poster Verification</h1>
        <p className="font-body text-lg text-on-surface-variant">Submit your credentials to join the trusted network of archivists.</p>
      </div>

      <SurfaceCard flex-1 level="low" className="p-8 md:p-12">
        <form className="space-y-8">
          <div>
            <label className="font-label text-sm font-bold tracking-widest uppercase text-on-surface block mb-2">Full Legal Name</label>
            <input type="text" className="w-full bg-surface-variant border-x-0 border-t-0 border-b-2 border-transparent focus:border-primary px-4 py-3 outline-none transition-colors font-body text-on-surface focus:bg-white" placeholder="Jane Doe" />
          </div>
          <div>
            <label className="font-label text-sm font-bold tracking-widest uppercase text-on-surface block mb-2">Institutional Affiliation</label>
            <input type="text" className="w-full bg-surface-variant border-x-0 border-t-0 border-b-2 border-transparent focus:border-primary px-4 py-3 outline-none transition-colors font-body text-on-surface focus:bg-white" placeholder="University of Verification" />
          </div>
          <div className="pt-6">
            <button type="button" className="bg-primary text-on-primary px-8 py-4 font-label font-bold tracking-wider uppercase hover:bg-primary-container transition-colors w-full">
              Submit Documentation
            </button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
