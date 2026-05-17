import React from 'react';
import { LoadingQuotes } from './LoadingQuotes';

export function PostSkeleton({ variant = 'feed' }: { variant?: 'feed' | 'hero' | 'detail' }) {
  if (variant === 'feed') {
    return (
      <div className="w-full flex flex-col gap-[32px]">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col border-b border-outline-variant pb-[32px]">
             <div className="w-[100px] h-[20px] shimmer-bg mb-4"></div>
             <div className="w-[90%] h-[28px] shimmer-bg mb-2"></div>
             <div className="w-[70%] h-[28px] shimmer-bg mb-6"></div>
             <div className="w-full overflow-hidden mb-4"></div>
             <div className="w-full h-[16px] shimmer-bg mb-2"></div>
             <div className="w-[80%] h-[16px] shimmer-bg mb-6"></div>
             <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] shimmer-bg"></div>
                <div className="w-[120px] h-[16px] shimmer-bg"></div>
             </div>
          </div>
        ))}
        <LoadingQuotes />
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="w-full">
        <div className="w-full h-[320px] md:h-[400px] shimmer-bg mb-8"></div>
        <div className="max-w-[720px] mx-auto px-4">
          <div className="w-[100px] h-[24px] shimmer-bg mb-6"></div>
          <div className="w-full h-[40px] shimmer-bg mb-3"></div>
          <div className="w-[80%] h-[40px] shimmer-bg mb-8"></div>
          <div className="flex items-center gap-4 mb-8 border-y border-outline-variant py-4">
            <div className="w-[48px] h-[48px] shimmer-bg"></div>
            <div className="flex-1">
               <div className="w-[150px] h-[20px] shimmer-bg mb-2"></div>
               <div className="w-[100px] h-[16px] shimmer-bg"></div>
            </div>
          </div>
          <div className="space-y-4">
             <div className="w-full h-[16px] shimmer-bg"></div>
             <div className="w-full h-[16px] shimmer-bg"></div>
             <div className="w-[90%] h-[16px] shimmer-bg"></div>
          </div>
          <LoadingQuotes />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="w-full h-[350px] shimmer-bg mb-8"></div>
      <div className="flex flex-col gap-4">
        <div className="w-[60%] h-[36px] shimmer-bg"></div>
        <div className="w-full h-[18px] shimmer-bg"></div>
        <div className="w-[80%] h-[18px] shimmer-bg"></div>
      </div>
      <LoadingQuotes />
    </div>
  );
}
