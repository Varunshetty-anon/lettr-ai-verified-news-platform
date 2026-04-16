import React from 'react';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Button } from '../components/ui/Button';

export default function Account() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-12">
      <div className="md:col-span-4">
        <SurfaceCard level="low" className="sticky top-28">
           <div className="w-24 h-24 bg-primary text-on-primary rounded-full flex items-center justify-center font-display text-4xl font-bold mb-6">
             J
           </div>
           <h2 className="font-display text-3xl font-bold text-on-surface mb-2">Jane Reader</h2>
           <p className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-8">Verified Archivist</p>
           
           <nav className="flex flex-col gap-2">
             <Button variant="secondary" className="justify-start w-full">My Saved Dossiers</Button>
             <Button variant="tertiary" className="justify-start w-full">Account Settings</Button>
             <Button variant="tertiary" className="justify-start w-full text-tertiary">Sign Out</Button>
           </nav>
        </SurfaceCard>
      </div>

      <div className="md:col-span-8">
        <div className="mb-8 border-b-2 border-outline-variant border-opacity-15 pb-4">
          <h1 className="font-display text-4xl font-black text-on-surface">My Saved Dossiers</h1>
        </div>

        <div className="flex flex-col gap-6">
          <SurfaceCard level="lowest">
            <h3 className="font-display text-2xl font-bold text-on-surface mb-2">Renewable Energy Subsidies</h3>
            <p className="font-body text-on-surface-variant mb-4">Saved 2 days ago.</p>
            <Button variant="tertiary" className="pl-0">Review Document</Button>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
