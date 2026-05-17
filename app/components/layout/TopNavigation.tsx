"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { ThemeToggle } from '@/app/components/ui/ThemeToggle';

// Define types for search
interface SearchResult {
  posts: any[];
  authors: any[];
}

export function TopNavigation() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult>({ posts: [], authors: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Close overlay on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ posts: [], authors: [] });
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const navLinks = [
    { label: 'HOME', href: '/' },
    { label: 'EXPLORE', href: '/explore' },
    { label: 'PUBLISH', href: '/publish' },
  ];

  const isVerified = (session?.user as any)?.isVerifiedAuthor || (session?.user as any)?.role === 'AUTHOR';

  if (!isVerified) {
    navLinks.push({ label: 'VERIFY', href: '/verify' });
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-surface border-b-2 border-on-surface h-[80px] flex items-center justify-between px-[16px] md:px-[64px]">
        {/* Mobile: Hamburger Left */}
        <div className="flex md:hidden w-[60px] relative z-[60]">
          <button onClick={() => setMenuOpen(true)} className="text-on-surface hover:text-primary transition-colors touch-manipulation p-2 -ml-2">
            <Menu size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Desktop: Wordmark Left / Mobile: Wordmark Center */}
        <div className="flex-1 md:flex-none flex justify-center md:justify-start md:w-[200px]">
          <Link href="/" className="font-display text-[32px] font-bold tracking-[-0.01em] text-on-surface">
            LETTR.
          </Link>
        </div>

        {/* Desktop: Center Links */}
        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="type-label-md text-on-surface-variant hover:text-primary transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4 md:gap-6 w-[60px] md:w-[200px] justify-end relative">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          
          <button onClick={() => setSearchOpen(true)} className="text-on-surface hover:text-primary transition-colors touch-manipulation p-2 -mr-2">
            <Search size={24} strokeWidth={2} />
          </button>
          
          {session ? (
            <div className="relative hidden md:block">
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-[40px] h-[40px] rounded-full border-2 border-on-surface overflow-hidden bg-surface-container-highest flex items-center justify-center font-bold text-on-surface"
              >
                {session.user?.image ? (
                  <img src={session.user.image} alt={session.user.name || 'User'} className="w-full h-full object-cover" />
                ) : (
                  (session.user?.name || 'U').charAt(0).toUpperCase()
                )}
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-4 w-[200px] bg-surface border-2 border-on-surface flex flex-col z-50">
                  <Link onClick={() => setDropdownOpen(false)} href={`/account`} className="px-4 py-3 type-label-md text-on-surface hover:bg-surface-container-low border-b border-outline-variant">
                    DASHBOARD
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="px-4 py-3 type-label-md text-error hover:bg-red-500/10 text-left">
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="hidden md:block bg-on-surface text-surface type-label-md px-[24px] py-[12px] hover:opacity-90 transition-opacity whitespace-nowrap">
              LOG IN
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)}></div>
          <div className="relative w-[280px] h-full bg-surface border-r-2 border-on-surface flex flex-col pt-6 pointer-events-auto">
            <button onClick={() => setMenuOpen(false)} className="absolute top-6 right-6 text-on-surface touch-manipulation p-2">
              <X size={24} strokeWidth={2} />
            </button>
            <div className="px-6 mb-8">
              <span className="font-display text-[24px] font-bold text-on-surface">LETTR.</span>
            </div>
            <nav className="flex flex-col border-t-2 border-on-surface">
              {navLinks.map((link) => (
                <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="px-6 py-4 type-headline-sm text-on-surface border-b-2 border-on-surface hover:bg-surface-container-low transition-colors touch-manipulation">
                  {link.label}
                </Link>
              ))}
              {session ? (
                <>
                  <Link href="/account" onClick={() => setMenuOpen(false)} className="px-6 py-4 type-headline-sm text-on-surface border-b-2 border-on-surface hover:bg-surface-container-low transition-colors touch-manipulation">
                    ACCOUNT
                  </Link>
                  <button onClick={() => signOut({ callbackUrl: '/' })} className="px-6 py-4 type-headline-sm text-error border-b-2 border-on-surface hover:bg-red-500/10 transition-colors text-left touch-manipulation">
                    SIGN OUT
                  </button>
                </>
              ) : (
                <Link href="/auth" onClick={() => setMenuOpen(false)} className="px-6 py-4 type-headline-sm text-on-surface border-b-2 border-on-surface hover:bg-surface-container-low transition-colors touch-manipulation">
                  LOG IN
                </Link>
              )}
            </nav>
            <div className="mt-auto p-6 flex justify-between items-center border-t-2 border-on-surface">
              <span className="type-label-md text-on-surface-variant">THEME</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col text-white">
          <div className="w-full max-w-[1000px] mx-auto px-6 pt-12 pb-6 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <input
                autoFocus
                type="text"
                placeholder="Search Lettr..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-[32px] md:text-[48px] font-display font-bold text-white placeholder:text-gray-600 focus:outline-none border-b-2 border-white/20 pb-4"
              />
            </div>
            <button onClick={() => setSearchOpen(false)} className="text-white hover:text-primary transition-colors bg-white/10 p-4 rounded-full">
              <X size={32} strokeWidth={2} />
            </button>
          </div>
          
          <div className="flex-1 w-full max-w-[1000px] mx-auto px-6 overflow-y-auto">
            {isSearching ? (
              <p className="type-label-md text-gray-400">Searching...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pb-12">
                {/* Posts Column */}
                <div>
                  <h3 className="type-label-md text-white border-b-2 border-white/20 pb-2 mb-6">POSTS</h3>
                  {searchResults.posts?.length > 0 ? (
                    <div className="flex flex-col gap-6">
                      {searchResults.posts.map((post: any) => (
                        <Link key={post._id} href={`/post/${post._id}`} onClick={() => setSearchOpen(false)} className="group block">
                          <h4 className="type-headline-sm text-white group-hover:text-primary transition-colors">{post.headline}</h4>
                          <span className="type-caption text-gray-400 uppercase mt-2 block">{post.category}</span>
                        </Link>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <p className="type-body-md text-gray-400">No posts found.</p>
                  ) : null}
                </div>
                
                {/* Authors Column */}
                <div>
                  <h3 className="type-label-md text-white border-b-2 border-white/20 pb-2 mb-6">AUTHORS</h3>
                  {searchResults.authors?.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {searchResults.authors.map((author: any) => (
                        <Link key={author._id} href={`/author/${author._id}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-4 group">
                          <div className="w-10 h-10 bg-white/10 flex items-center justify-center font-bold text-white rounded-full">
                            {author.name.charAt(0)}
                          </div>
                          <div>
                            <span className="block type-headline-sm text-white group-hover:text-primary transition-colors">{author.name}</span>
                            <span className="type-caption text-gray-400">{author.role}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : searchQuery.trim() ? (
                    <p className="type-body-md text-gray-400">No authors found.</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
