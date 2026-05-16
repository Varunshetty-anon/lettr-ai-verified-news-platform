import React from 'react';

export function PostSkeleton({ variant = 'card' }: { variant?: 'card' | 'hero' | 'brief' }) {
  if (variant === 'hero') {
    return (
      <div className="animate-pulse px-6 pt-10 pb-12 border-b border-outline-variant">
        <div className="h-3 bg-surface-container-high w-20 mb-6" />
        <div className="h-12 bg-surface-container-high w-4/5 mb-4" />
        <div className="h-12 bg-surface-container-high w-3/5 mb-6" />
        <div className="h-5 bg-surface-container-high w-full mb-2" />
        <div className="h-5 bg-surface-container-high w-4/5" />
      </div>
    );
  }

  if (variant === 'brief') {
    return (
      <div className="animate-pulse py-5 border-t border-outline-variant/30">
        <div className="h-5 bg-surface-container-high w-3/4 mb-2" />
        <div className="h-3 bg-surface-container-high w-full" />
      </div>
    );
  }

  return (
    <div className="animate-pulse p-6 border-b border-outline-variant">
      <div className="h-3 bg-surface-container-high w-20 mb-4" />
      <div className="h-6 bg-surface-container-high w-4/5 mb-3" />
      <div className="h-4 bg-surface-container-high w-full mb-2" />
      <div className="h-4 bg-surface-container-high w-3/5" />
    </div>
  );
}
