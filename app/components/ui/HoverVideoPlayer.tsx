'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import 'plyr/dist/plyr.css';

const Plyr = dynamic(() => import('plyr-react').then(mod => mod.Plyr), { ssr: false });

interface HoverVideoPlayerProps {
  src: string;
  poster?: string;
  mode?: 'preview' | 'full';
}

export default function HoverVideoPlayer({ src, poster, mode = 'preview' }: HoverVideoPlayerProps) {
  const isPreview = mode === 'preview';

  const plyrOptions = {
    controls: isPreview ? [] : ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    autoplay: isPreview,
    muted: isPreview,
    loop: { active: isPreview },
    clickToPlay: !isPreview,
    keyboard: { focused: !isPreview, global: !isPreview },
  };

  return (
    <div className={`relative w-full aspect-video overflow-hidden bg-surface-container-highest flex items-center justify-center ${isPreview ? 'pointer-events-none' : ''}`}>
      <Plyr
        source={{
          type: 'video',
          sources: [
            {
              src: src,
              provider: 'html5',
            },
          ],
          poster: poster,
        }}
        options={plyrOptions}
      />
    </div>
  );
}

export function DynamicPlayer({ src, poster }: { src: string, poster?: string }) {
  return <HoverVideoPlayer src={src} poster={poster} mode="full" />;
}
