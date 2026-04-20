'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface HoverVideoPlayerProps {
  src: string;
  poster?: string;
}

export default function HoverVideoPlayer({ src, poster }: HoverVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Play/pause logic
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isHovering) {
      // Play on hover
      videoRef.current.play().catch(e => console.error("Video play failed", e));
    } else {
      // Pause on leave
      videoRef.current.pause();
    }
  }, [isHovering]);

  // Intersection Observer to stop when scrolled out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            // Scrolled out of view
            if (videoRef.current) {
              videoRef.current.pause();
              setIsHovering(false);
              setIsMuted(true); // reset to mute on scroll away
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden bg-black/5 group/video border-b border-outline-variant/30"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted={isMuted}
        loop
        playsInline
        className="w-full object-cover transition-transform duration-500 ease-out"
        style={{ maxHeight: '350px', minHeight: '200px' }}
      />
      
      {/* Play state indicator (subtle) */}
      {!isHovering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity">
           <div className="bg-black/50 backdrop-blur-sm p-4 rounded-full text-white/90">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
           </div>
        </div>
      )}

      {/* Audio toggle button */}
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white opacity-0 group-hover/video:opacity-100 transition-all duration-200 focus:outline-none z-10"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}
