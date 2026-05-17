import React from 'react';
import { LoadingQuotes } from './LoadingQuotes';

export function PostSkeleton({ variant = 'feed' }: { variant?: 'feed' | 'hero' | 'detail' }) {
  if (variant === 'feed') {
    return (
      <div className="w-full flex flex-col gap-[48px] animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col border-b border-outline-variant pb-[48px]">
             <div className="w-[100px] h-[24px] bg-surface-container-highest mb-4"></div>
             <div className="w-[90%] h-[32px] bg-surface-container-highest mb-2"></div>
             <div className="w-[70%] h-[32px] bg-surface-container-highest mb-6"></div>
             <div className="w-full  overflow-hidden mb-4"></div>
             <div className="w-full h-[16px] bg-surface-container-highest mb-2"></div>
             <div className="w-[80%] h-[16px] bg-surface-container-highest mb-6"></div>
             <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] bg-surface-container-highest"></div>
                <div className="w-[120px] h-[16px] bg-surface-container-highest"></div>
             </div>
          </div>
        ))}
        <LoadingQuotes />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="w-full animate-pulse">
        <div className="w-full h-[400px] bg-surface-container-highest mb-8"></div>
        <div className="max-w-[720px] mx-auto px-4">
          <div className="w-[100px] h-[24px] bg-surface-container-highest mb-6"></div>
          <div className="w-full h-[48px] bg-surface-container-highest mb-3"></div>
          <div className="w-[80%] h-[48px] bg-surface-container-highest mb-8"></div>
          <div className="flex items-center gap-4 mb-12 border-y border-outline-variant py-4">
            <div className="w-[48px] h-[48px] bg-surface-container-highest"></div>
            <div className="flex-1">
               <div className="w-[150px] h-[20px] bg-surface-container-highest mb-2"></div>
               <div className="w-[100px] h-[16px] bg-surface-container-highest"></div>
            </div>
          </div>
          <div className="space-y-4">
             <div className="w-full h-[16px] bg-surface-container-highest"></div>
             <div className="w-full h-[16px] bg-surface-container-highest"></div>
             <div className="w-[90%] h-[16px] bg-surface-container-highest"></div>
          </div>
          <LoadingQuotes />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-pulse">
      <div className="w-full h-[400px] bg-surface-container-highest mb-8"></div>
      <div className="flex flex-col gap-4">
        <div className="w-[60%] h-[40px] bg-surface-container-highest"></div>
        <div className="w-full h-[20px] bg-surface-container-highest"></div>
        <div className="w-[80%] h-[20px] bg-surface-container-highest"></div>
      </div>
      <LoadingQuotes />
    </div>
  );
}
