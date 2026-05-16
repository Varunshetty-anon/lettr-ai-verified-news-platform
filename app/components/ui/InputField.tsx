import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function InputField({ label, className = '', ...props }: InputFieldProps) {
  return (
    <div className={`w-full ${className}`}>
      <label className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 mb-2 block">
        {label}
      </label>
      <input
        className="w-full bg-transparent border-b-2 border-outline-variant px-0 py-2 font-body text-base text-on-surface outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/30 rounded-none"
        {...props}
      />
    </div>
  );
}
