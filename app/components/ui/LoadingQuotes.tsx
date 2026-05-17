import React, { useState, useEffect } from 'react';

const QUOTES = [
  "Separating signal from noise since 2024.",
  "Facts don't wait — but we double-check them.",
  "Good journalism is slow. Our AI is not.",
  "Verified. Ranked. Delivered.",
  "Trends come fast. Truth comes faster here.",
  "Your feed, shaped by what you actually care about.",
  "100 signals processed. One post surfaced."
];

export function LoadingQuotes() {
  const [quote, setQuote] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`mt-[48px] text-center transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <p className="type-caption text-on-surface-variant italic">"{quote}"</p>
    </div>
  );
}
