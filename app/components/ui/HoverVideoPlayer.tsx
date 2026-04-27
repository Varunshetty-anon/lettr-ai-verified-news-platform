'use client';

import React from 'react';

interface HoverVideoPlayerProps {
  src: string;
  poster?: string;
}

export default function HoverVideoPlayer({ src, poster }: HoverVideoPlayerProps) {
  return (
    <div className="relative w-full overflow-hidden bg-black/5 border-b border-outline-variant/30 flex items-center justify-center">
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="w-full object-contain"
        style={{ maxHeight: '400px', backgroundColor: '#000' }}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
