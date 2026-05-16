"use client";

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Cpu, Rocket, DollarSign, Bitcoin, Globe, Shield,
  Satellite, HeartPulse, Leaf, Wifi, FlaskConical,
  Briefcase, Zap
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

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
      body: JSON.stringify({ preferences: selected })
    });

    router.push('/');
    router.refresh();
  };

  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface">
      <div className="max-w-[800px] w-full">
        {/* Header */}
        <div className="text-center mb-[64px]">
          <h1 className="font-display font-bold text-[80px] leading-[1.0] tracking-[-0.04em] text-primary mb-4">
            LETTR<span className="text-primary/30">.</span>
          </h1>
          <h2 className="font-display text-[48px] font-bold text-on-surface leading-[1.1] tracking-[-0.02em] mb-4">
            WELCOME, {firstName.toUpperCase()}
          </h2>
          <p className="font-body text-[20px] text-on-surface-variant leading-[1.6] max-w-[600px] mx-auto">
            Choose your interests to build a personalized, AI-verified news feed.
            Select at least 3 topics.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-[16px] mb-[64px]">
          {CATEGORIES.map(({ name, icon: Icon }) => {
            const isSelected = selected.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggle(name)}
                className={`group flex items-center justify-center gap-3 px-6 py-4 border-[2px] transition-all duration-200 rounded-none ${
                  isSelected
                    ? 'bg-tertiary text-on-tertiary-container border-tertiary shadow-none'
                    : 'bg-surface-dim border-outline-variant text-on-surface-variant hover:border-tertiary hover:text-tertiary'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  className={`transition-colors ${isSelected ? 'text-on-tertiary-container' : 'text-on-surface-variant group-hover:text-tertiary'}`}
                />
                <span className="font-label text-[12px] uppercase tracking-[0.1em] font-bold">
                  {name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Counter + button */}
        <div className="text-center max-w-[400px] mx-auto">
          <p className="font-label text-[12px] text-on-surface-variant uppercase tracking-[0.1em] mb-[32px] font-bold">
            {selected.length} SELECTED {selected.length < 3 && '· SELECT AT LEAST 3'}
          </p>

          <Button
            onClick={save}
            disabled={selected.length < 3 || saving}
            variant="primary"
            className="w-full h-[64px] text-[14px]"
          >
            {saving ? 'SETTING UP YOUR FEED...' : 'CONTINUE TO FEED'}
          </Button>
        </div>
      </div>
    </div>
  );
}
