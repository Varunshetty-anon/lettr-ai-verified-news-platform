import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-label font-medium transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]";
  
  const variants = {
    primary: "bg-primary text-on-primary rounded-sm px-6 py-3 hover:bg-primary-container",
    secondary: "bg-surface-container-high text-on-surface px-6 py-3 hover:bg-surface-variant",
    tertiary: "text-primary px-2 py-2 border-b-2 border-transparent hover:border-outline-variant hover:border-opacity-15"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
