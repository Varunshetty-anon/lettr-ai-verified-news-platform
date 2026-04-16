"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const ALL_CATEGORIES = [
  'World', 'Politics', 'Technology', 'Economy', 'Science', 'Culture',
  'AI & Tech', 'Startups', 'Crypto', 'Space', 'Health',
  'Geopolitics', 'Environment', 'Defense', 'Internet Culture'
];

export default function PreferencesPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggle = (cat: string) => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const save = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@lettr.ai', preferences: selected })
    });
    router.push('/');
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <h1 className="font-display text-2xl font-bold text-on-surface mb-2 text-center">Welcome to LETTR</h1>
        <p className="font-body text-sm text-on-surface-variant/60 text-center mb-8">
          Select your interests to personalize your feed. Choose at least 3 topics.
        </p>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`font-label text-[10px] uppercase tracking-[0.12em] px-4 py-2.5 border transition-all ${
                selected.includes(cat)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline-variant text-on-surface-variant/60 hover:border-primary/30 hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="font-label text-[10px] text-center text-on-surface-variant/40 uppercase tracking-wider mb-4">
          {selected.length} selected {selected.length < 3 && '· select at least 3'}
        </p>

        <button
          onClick={save}
          disabled={selected.length < 3 || saving}
          className="w-full font-label text-xs uppercase tracking-[0.15em] bg-primary text-on-primary py-3.5 transition-colors disabled:opacity-30"
        >
          {saving ? 'Saving...' : 'Continue to Feed'}
        </button>
      </div>
    </div>
  );
}
