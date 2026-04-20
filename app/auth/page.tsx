"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        // 1. Create account via API
        const res = await fetch(`/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        
        if (!res.ok) {
          setError(data.error || 'Signup failed.');
          setLoading(false);
          return;
        }

        // 2. Auto sign in after signup
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError('Account created. Please sign in.');
          setMode('signin');
          setLoading(false);
          return;
        }

        router.push('/onboarding/preferences');
        return;
      }

      // Sign in mode
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid email or password.' : result.error);
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-3xl tracking-[-0.04em] text-primary mb-1">
            LETTR<span className="text-primary/30">.</span>
          </h1>
          <p className="font-label text-[9px] uppercase tracking-[0.25em] text-on-surface-variant/40">
            AI-Verified News Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-low border border-outline-variant p-8">
          {/* Mode toggle */}
          <div className="flex mb-8 border-b border-outline-variant">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 pb-3 font-label text-[10px] uppercase tracking-[0.15em] border-b-2 transition-colors ${
                mode === 'signin'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant/40 hover:text-on-surface-variant'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 pb-3 font-label text-[10px] uppercase tracking-[0.15em] border-b-2 transition-colors ${
                mode === 'signup'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant/40 hover:text-on-surface-variant'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Google Auth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-outline-variant py-3 px-4 font-body text-sm text-on-surface hover:bg-surface-container-high transition-colors mb-6"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-outline-variant" />
            <span className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant/30">or</span>
            <div className="flex-1 h-px bg-outline-variant" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <div>
                <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-1.5 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Varun Shetty"
                  className="w-full bg-transparent border-b border-outline-variant px-0 py-2.5 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
                />
              </div>
            )}

            <div>
              <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-1.5 block">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-outline-variant px-0 py-2.5 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
              />
            </div>

            <div>
              <label className="font-label text-[9px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-1.5 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="w-full bg-transparent border-b border-outline-variant px-0 py-2.5 font-body text-sm text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/25"
              />
            </div>

            {error && (
              <p className="font-body text-xs text-red-600 dark:text-red-400 bg-red-500/5 px-3 py-2 border border-red-500/10">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-label text-xs uppercase tracking-[0.15em] bg-primary text-on-primary py-3.5 transition-all disabled:opacity-40 mt-2 hover:opacity-90"
            >
              {loading
                ? (mode === 'signup' ? 'Creating Account...' : 'Signing In...')
                : (mode === 'signup' ? 'Create Account' : 'Sign In')
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="font-label text-[8px] text-center text-on-surface-variant/25 mt-6 uppercase tracking-wider">
          By continuing, you agree to LETTR's terms and privacy policy
        </p>
      </div>
    </div>
  );
}
