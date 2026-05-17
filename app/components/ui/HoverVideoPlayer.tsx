'use client';

interface HoverVideoPlayerProps {
  src: string;
  poster?: string;
}

export default function HoverVideoPlayer({ src, poster }: HoverVideoPlayerProps) {
  return (
    <div className="relative w-full overflow-hidden bg-surface-container" style={{aspectRatio: '16/9'}}>
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
        style={{maxHeight: '420px'}}
        onError={(e) => {
          const container = e.currentTarget.parentElement!;
          container.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#888;font-size:12px;letter-spacing:0.1em">VIDEO UNAVAILABLE</div>';
        }}
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}
