"use client";

import React, { useEffect, useState } from 'react';

interface FactScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export function FactScoreRing({ score, size = 80, strokeWidth = 8 }: FactScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const progress = score / 100;
    const strokeDashoffset = circumference - progress * circumference;
    const timer = setTimeout(() => {
      setOffset(strokeDashoffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  const isHigh = score >= 85;
  const isMed = score >= 50 && score < 85;
  
  const strokeColor = isHigh ? '#c3f400' : isMed ? '#e0af68' : '#f7768e';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#1a1a1a"
          strokeWidth={strokeWidth}
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {/* Center Label */}
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none text-on-surface" style={{ fontSize: `${size * 0.24}px` }}>
          {score}%
        </span>
      </div>
    </div>
  );
}
