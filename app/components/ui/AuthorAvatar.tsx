import React from 'react';

interface AuthorAvatarProps {
  name: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-[120px] h-[120px] text-4xl',
};

export function AuthorAvatar({ name, image, size = 'md' }: AuthorAvatarProps) {
  return (
    <div className={`${sizeMap[size]} bg-surface-variant overflow-hidden flex items-center justify-center shrink-0 border border-outline-variant/50`}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display font-bold text-on-surface">
          {name?.charAt(0)?.toUpperCase() || '?'}
        </span>
      )}
    </div>
  );
}
