'use client';
import { useEffect, useState } from 'react';

const quotes = [
  "AI is reading the news so you don't have to have opinions yet.",
  "Fact-checking at the speed of anxiety.",
  "Separating vibes from verified since 2024.",
  "Our bots are arguing about this headline right now.",
  "Loading truth. Please hold while we fight the algorithm.",
  "The AI just read 47 sources. It needs a moment.",
  "Somewhere a bot is rewriting this more dramatically.",
  "Verifying facts faster than your uncle shares WhatsApp forwards.",
  "This is either breaking news or breaking nonsense. Finding out.",
  "The truth is loading. Unlike your ex, it will show up.",
];

export function LoadingQuotes() {
  const [quote, setQuote] = useState('');
  const [dots, setDots] = useState(0);

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const interval = setInterval(() => {
      setDots(d => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 px-8">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="type-headline-sm text-center max-w-[500px] text-on-surface">
        {quote}{''.padEnd(dots, '.')}
      </p>
      <p className="type-caption text-on-surface-variant uppercase tracking-widest">
        LETTR · AI-VERIFIED NEWS
      </p>
    </div>
  );
}
