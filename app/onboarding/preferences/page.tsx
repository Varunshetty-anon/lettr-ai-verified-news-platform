"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Cpu, Rocket, DollarSign, Bitcoin, Globe, Shield,
  Satellite, HeartPulse, Leaf, Wifi, FlaskConical,
  Briefcase, Zap
} from 'lucide-react';

const CATEGORIES = [
  { name: 'AI & Tech', icon: Cpu },
  { name: 'Startups', icon: Rocket },
  { name: 'Finance', icon: DollarSign },
  { name: 'Crypto', icon: Bitcoin },
  { name: 'Geopolitics', icon: Globe },
  { name: 'Defense', icon: Shield },
  { name: 'Space', icon: Satellite },
  { name: 'Health', icon: HeartPulse },
  { name: 'Environment', icon: Leaf },
  { name: 'Internet Culture', icon: Wifi },
  { name: 'Science', icon: FlaskConical },
  { name: 'Business', icon: Briefcase },
  { name: 'Energy', icon: Zap },
];

export default function OnboardingPreferencesPage() {
  const { data: session } = useSession();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggle = (cat: string) => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const save = async () => {
    if (selected.length < 3 || !session?.user?.email) return;
    setSaving(true);

    await fetch(`/api/user/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: session.user.email, preferences: selected })
    });

    router.push('/');
    router.refresh();
  };

  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      <div className="max-w-xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-3xl tracking-[-0.04em] text-primary mb-2">
            LETTR<span className="text-primary/30">.</span>
          </h1>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Welcome, {firstName}
          </h2>
          <p className="font-body text-sm text-on-surface-variant/60 max-w-sm mx-auto">
            Choose your interests to build a personalized, AI-verified news feed.
            Select at least 3 topics.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-8">
          {CATEGORIES.map(({ name, icon: Icon }) => {
            const isSelected = selected.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={`group flex items-center gap-3 px-4 py-3.5 border transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant text-on-surface-variant/70 hover:border-primary/30 hover:text-primary hover:bg-primary/[0.03]'
                }`}
              >
                <Icon
                  size={16}
                  strokeWidth={1.5}
                  className={`transition-colors ${isSelected ? 'text-on-primary' : 'text-on-surface-variant/40 group-hover:text-primary'}`}
                />
                <span className="font-label text-[10px] uppercase tracking-[0.1em] font-medium">
                  {name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Counter + button */}
        <div className="text-center">
          <p className="font-label text-[10px] text-on-surface-variant/40 uppercase tracking-wider mb-4">
            {selected.length} selected {selected.length < 3 && '· select at least 3'}
          </p>

          <button
            onClick={save}
            disabled={selected.length < 3 || saving}
            className="w-full font-label text-xs uppercase tracking-[0.15em] bg-primary text-on-primary py-3.5 transition-all disabled:opacity-30 hover:opacity-90"
          >
            {saving ? 'Setting up your feed...' : 'Continue to Feed'}
          </button>
        </div>
      </div>
    </div>
  );
}
