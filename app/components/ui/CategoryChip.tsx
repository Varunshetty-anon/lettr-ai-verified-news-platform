import React from 'react';

interface CategoryChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryChip({ label, active, onClick }: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={`font-label text-[11px] uppercase tracking-[0.1em] px-3 py-1.5 border transition-all whitespace-nowrap font-bold ${
        active
          ? 'bg-tertiary-fixed text-on-surface border-tertiary-fixed'
          : 'border-outline-variant text-on-surface-variant/60 hover:border-tertiary/30 hover:text-tertiary hover:bg-tertiary-fixed/10'
      }`}
    >
      {label}
    </button>
  );
}
