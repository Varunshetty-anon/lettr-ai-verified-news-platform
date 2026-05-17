import React from 'react';
import { Shield } from 'lucide-react';

interface FactScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function FactScoreBadge({ score, size = 'md', showLabel = false }: FactScoreBadgeProps) {
  const isHigh = score >= 85;
  const isMed = score >= 50 && score < 85;

  const bg = isHigh ? 'bg-emerald-500' : isMed ? 'bg-amber-500' : 'bg-red-500';
  const color = 'text-white';

  const s = {
    sm: { icon: 10, text: 'text-[10px]', px: 'px-1.5 py-0.5' },
    md: { icon: 14, text: 'text-[12px]', px: 'px-2 py-1' },
    lg: { icon: 18, text: 'text-[14px]', px: 'px-3 py-1.5' },
  }[size];

  return (
    <span className={`inline-flex items-center justify-center gap-1 font-display font-bold ${s.text} ${color} ${bg} ${s.px}`}>
      <Shield size={s.icon} strokeWidth={2.5} />
      {score}%
      {showLabel && <span className="hidden sm:inline ml-0.5">Verified</span>}
    </span>
  );
}
