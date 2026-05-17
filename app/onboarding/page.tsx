"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding/preferences');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="animate-pulse font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
        Loading Onboarding...
      </div>
    </div>
  );
}
