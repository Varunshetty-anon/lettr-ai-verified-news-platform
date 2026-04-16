import React from 'react';

interface ScorePillarProps {
  score: number;
  label?: string;
  isDisputed?: boolean;
}

export function ScorePillar({ score, label, isDisputed = false }: ScorePillarProps) {
  // If explicitly disputed, we use tertiary colors.
  // Otherwise, use primary logic. We could also just switch based on score but Let's allow manual overrides.
  const disputed = isDisputed || score < 50;

  const colorStyles = disputed
    ? "bg-tertiary text-on-tertiary-container"
    : "bg-primary-container text-on-primary-container";

  return (
    <div className={`flex flex-col items-center justify-center rounded-none w-16 py-4 ${colorStyles}`}>
      {label && <span className="font-label text-xs uppercase tracking-widest mb-1">{label}</span>}
      <span className="font-display text-2xl font-bold">{score}</span>
    </div>
  );
}
