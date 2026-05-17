'use client';

import React, { useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface HoverVideoPlayerProps {
  src: string;
  poster?: string;
  mode?: 'preview' | 'full';
}

export default function HoverVideoPlayer({ src, poster, mode = 'preview' }: HoverVideoPlayerProps) {
  const isPreview = mode === 'preview';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false); // Default unmuted for full mode as requested

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div className={`relative w-full  overflow-hidden flex items-center justify-center ${isPreview ? 'pointer-events-none' : ''}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        autoPlay={isPreview}
        loop={isPreview}
        muted={isPreview ? true : isMuted}
        playsInline
        controls={!isPreview}
      />
      
      {!isPreview && (
        <button
          onClick={toggleMute}
          className="absolute bottom-4 right-4 z-10 w-[40px] h-[40px] rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      )}
    </div>
  );
}

export function DynamicPlayer({ src, poster }: { src: string, poster?: string }) {
  return <HoverVideoPlayer src={src} poster={poster} mode="full" />;
}
