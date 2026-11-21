import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '#games' },
  { label: 'Leaderboard', href: '#progress' },
  { label: 'Rewards', href: '#rooms' },
  { label: 'About', href: '#about' },
];

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 h-[76px] md:h-[90px] lg:h-[106px]">
      <div
        className="relative flex h-full items-center justify-between"
        style={{ width: 'min(1510px, calc(100% - 34px))', marginInline: 'auto' }}
      >
        <Link to="/" className="flex shrink-0 items-center" aria-label="DUOLYNK home">
          <Logo className="h-14 md:h-[72px] lg:h-[84px]" />
        </Link>

        <nav
          className={cn(
            'absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-[rgba(89,68,83,0.11)] bg-[rgba(255,250,244,0.83)] p-1.5 shadow-[0_7px_20px_rgba(94,61,80,0.055)] lg:flex',
            open && 'max-lg:flex',
          )}
          aria-label="Main navigation"
        >
          {NAV.map((item) => {
            const active = item.href === '/' && pathname === '/';
            return (
              <a
                key={item.label}
                href={item.href}
                className={cn(
                  'flex h-11 items-center justify-center rounded-full px-[15px] text-[15px] font-extrabold transition-colors',
                  active
                    ? 'min-w-[92px] bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(255,107,107,0.16)]'
                    : 'min-w-[76px] text-foreground hover:bg-[#f7ebf0]',
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 md:gap-4">
          <Link
            to="/signin"
            className="hidden h-[52px] w-[132px] items-center justify-center rounded-full border-[1.5px] border-foreground bg-[rgba(255,250,244,0.26)] text-[15px] font-black text-foreground transition-transform hover:-translate-y-0.5 md:inline-flex"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-[14px] text-[10px] font-black text-primary-foreground shadow-[0_5px_15px_rgba(255,107,107,0.19)] transition-transform hover:-translate-y-0.5 md:h-[52px] md:w-[162px] md:px-4 md:text-[15px]"
          >
            Get Started
            <span className="text-base md:text-[19px]" aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex h-[42px] w-[42px] flex-col items-center justify-center gap-[5px] rounded-full border border-[rgba(45,42,94,0.12)] bg-[#FFFCF7] lg:hidden"
          >
            <span className="h-0.5 w-[17px] rounded bg-foreground" />
            <span className="h-0.5 w-[17px] rounded bg-foreground" />
            <span className="h-0.5 w-[17px] rounded bg-foreground" />
          </button>
        </div>

        {open ? (
          <nav
            className="absolute left-0 right-0 top-[68px] z-30 flex flex-col gap-1 rounded-[18px] border border-[rgba(45,42,94,0.12)] bg-[#FFFCF7] p-2.5 shadow-[0_16px_42px_rgba(63,45,90,0.12)] lg:hidden"
            aria-label="Mobile navigation"
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex h-[42px] items-center rounded-full px-3.5 text-[13px] font-extrabold',
                  item.href === '/' && pathname === '/'
                    ? 'justify-center bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-[#f7ebf0]',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
