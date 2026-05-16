import React from 'react';
import { Shield } from 'lucide-react';

interface FactScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function FactScoreBadge({ score, size = 'md', showLabel = false }: FactScoreBadgeProps) {
  const color = score >= 85 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const bg = score >= 85 ? 'bg-emerald-500/10' : score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10';

  const s = {
    sm: { icon: 10, text: 'text-[10px]', px: 'px-1.5 py-0.5' },
    md: { icon: 14, text: 'text-[12px]', px: 'px-2 py-1' },
    lg: { icon: 18, text: 'text-[14px]', px: 'px-3 py-1.5' },
  }[size];

  return (
    <span className={`inline-flex items-center gap-1 font-display font-bold ${s.text} ${color} ${bg} ${s.px}`}>
      <Shield size={s.icon} />
      {score}%
      {showLabel && <span className="hidden sm:inline ml-0.5">Verified</span>}
    </span>
  );
}
