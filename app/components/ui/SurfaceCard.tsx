import React, { ReactNode } from 'react';

interface SurfaceCardProps {
  children: ReactNode;
  level?: 'low' | 'lowest' | 'high' | 'highest';
  className?: string;
  withPadding?: boolean;
}

export function SurfaceCard({ children, level = 'lowest', className = '', withPadding = true }: SurfaceCardProps) {
  // Map level to background
  const bgMap = {
    low: 'bg-surface-container-low',
    lowest: 'bg-surface-container-lowest',
    high: 'bg-surface-container-high',
    highest: 'bg-surface-container-highest',
  };

  const paddingClass = withPadding ? 'p-6 sm:p-8' : '';

  return (
    <div className={`rounded-sm ${bgMap[level]} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
