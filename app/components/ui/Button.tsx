import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseClasses = "font-label text-xs uppercase tracking-[0.1em] px-6 py-3 transition-all duration-200 flex items-center justify-center gap-2 rounded-none";
  
  const variantClasses = variant === 'primary'
    ? "bg-primary text-on-primary hover:bg-primary-container"
    : "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-on-primary";

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
