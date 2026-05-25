'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  id: number;
  username: string;
  balance: number;
  is_admin: number;
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: '🏠 首页' },
    { href: '/leaderboard', label: '🏆 排行榜' },
    { href: '/profile', label: '📋 我的投注' },
  ];

  if (user?.is_admin === 1) {
    navLinks.push({ href: '/admin', label: '⚙️ 管理后台' });
  }

  return (
    <nav className="sticky top-0 z-50 bg-pitch-dark/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">⚽</span>
            <span className="text-lg font-bold text-gold hidden sm:block">世界杯竞猜</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  pathname === link.href
                    ? 'bg-gold/20 text-gold font-medium'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side: user info */}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm text-white/70">
                <span className="text-white font-medium">{user.username}</span>
                <span className="mx-1.5">·</span>
                <span className="text-gold font-bold">${user.balance.toFixed(2)}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
              >
                退出
              </button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 animate-fade-in border-t border-white/10 mt-1 pt-3">
            {user && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm text-white/70">
                  <span className="text-white font-medium">{user.username}</span>
                  <span className="mx-1.5">·</span>
                  <span className="text-gold font-bold">${user.balance.toFixed(2)}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
                >
                  退出
                </button>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    pathname === link.href
                      ? 'bg-gold/20 text-gold font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
