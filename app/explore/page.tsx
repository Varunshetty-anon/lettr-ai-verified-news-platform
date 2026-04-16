import React from 'react';
import { SurfaceCard } from '../components/ui/SurfaceCard';

export default function Explore() {
  const categories = ['World', 'Politics', 'Technology', 'Science', 'Economy', 'Culture'];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <h1 className="font-display text-5xl md:text-6xl font-black text-primary mb-4">Explore the Archive.</h1>
        <p className="font-body text-xl text-on-surface-variant max-w-2xl">
          Dive into verified reporting across topics. Our archive is continuously fact-checked by our network.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {categories.map((cat, idx) => (
          <SurfaceCard key={idx} level="lowest" className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all">
            <h3 className="font-display text-3xl font-bold text-on-surface mb-2 group-hover:text-primary transition-colors">{cat}</h3>
            <p className="font-label text-sm text-on-surface-variant tracking-wider uppercase">View Dossiers &rarr;</p>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
