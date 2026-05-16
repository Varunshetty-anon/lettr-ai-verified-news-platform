import React from 'react';
import { Shield } from 'lucide-react';

interface FactScoreBadgeProps {
  score: number;
  className?: string;
  showIcon?: boolean;
}

export function FactScoreBadge({ score, className = '', showIcon = true }: FactScoreBadgeProps) {
  let colorClass = 'text-red-500 bg-red-500/10 border-red-500/20';
  let iconColorClass = 'text-red-500';

  if (score >= 85) {
    colorClass = 'text-[#485c00] bg-[#c3f400]/20 border-[#5d7600]/30'; // Tertiary / Neon Green
    iconColorClass = 'text-[#485c00]';
  } else if (score >= 50) {
    colorClass = 'text-[#a33800] bg-[#ffdbce]/20 border-[#cd4800]/30'; // Secondary / Punchy Orange
    iconColorClass = 'text-[#a33800]';
  }

  return (
    <div className={`flex items-center gap-1.5 font-display text-[10px] font-black px-2 py-0.5 border rounded-none ${colorClass} ${className}`}>
      {showIcon && <Shield size={12} className={iconColorClass} />}
      <span>{score}%</span>
    </div>
  );
}
