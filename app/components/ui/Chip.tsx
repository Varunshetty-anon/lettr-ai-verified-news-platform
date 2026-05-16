import React from 'react';

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Chip({ label, active = false, onClick, className = '' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`font-label text-[10px] uppercase tracking-[0.1em] px-4 py-2 border transition-all whitespace-nowrap font-bold rounded-none ${
        active
          ? 'bg-tertiary text-on-tertiary-container border-tertiary shadow-none'
          : 'border-outline-variant text-on-surface-variant/60 hover:border-tertiary hover:text-tertiary bg-surface-container-low'
      } ${className}`}
    >
      {label}
    </button>
  );
}
