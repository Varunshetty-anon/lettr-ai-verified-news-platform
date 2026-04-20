'use client';

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function ImpressTracker({ postId, children }: { postId: string, children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const impressed = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressed.current) {
            impressed.current = true;
            // Send impress event
            if (session?.user?.email) {
              fetch('/api/user/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: session.user.email,
                  postId: postId,
                  action: 'impress'
                })
              }).catch(() => {});
            }
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of post is visible
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [postId, session]);

  return <div ref={ref}>{children}</div>;
}
