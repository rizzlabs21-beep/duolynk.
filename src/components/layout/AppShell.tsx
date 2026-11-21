import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Home, KeyRound, LogOut, Menu, PlusCircle, Settings, Trophy } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

const NAV = [
  { label: 'Home', to: '/app', icon: Home, end: true },
  { label: 'Create a room', to: '/app/rooms/new', icon: PlusCircle, end: false },
  { label: 'Leaderboard', to: '/app/leaderboard', icon: Trophy, end: false },
  { label: 'Settings', to: '/app/settings', icon: Settings, end: false },
];

const BOTTOM_NAV = [
  { label: 'Home', to: '/app', icon: Home, end: true },
  { label: 'Create', to: '/app/rooms/new', icon: PlusCircle, end: false },
  { label: 'Join', to: '/join', icon: KeyRound, end: false },
  { label: 'Ranks', to: '/app/leaderboard', icon: Trophy, end: false },
  { label: 'Settings', to: '/app/settings', icon: Settings, end: false },
];

interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Hides the page title block on phones so a single feature can own the screen. */
  compact?: boolean;
  /** Locks the shell to the viewport on desktop so a single feature owns the screen. */
  fixed?: boolean;
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="App">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-12 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/75 hover:bg-muted hover:text-foreground',
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function AccountCard({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const name = profile?.display_name || user?.email?.split('@')[0] || 'You';

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/40 font-display text-xs font-bold text-secondary-foreground">
          {initialsOf(name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? 'you'}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-2 h-10 w-full justify-start rounded-xl px-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={async () => {
          onNavigate?.();
          await signOut();
          navigate('/');
        }}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}

export function AppShell({ children, title, description, actions, compact, fixed }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={cn(
        'flex min-h-screen w-full bg-background',
        fixed && 'md:h-screen md:min-h-0 md:overflow-hidden',
      )}
    >
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="px-4 py-5">
          <Link to="/app" aria-label="DUOLYNK home">
            <Logo className="h-14" />
          </Link>
        </div>
        <div className="flex-1 px-3">
          <NavItems />
        </div>
        <div className="p-3">
          <AccountCard />
        </div>
      </aside>

      <div className={cn('flex min-w-0 flex-1 flex-col', fixed && 'md:min-h-0')}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur md:hidden">
          <div className="flex h-14 items-center gap-2 px-3">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full border-foreground/20"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[84vw] max-w-xs bg-sidebar p-0">
                <SheetTitle className="sr-only">DUOLYNK menu</SheetTitle>
                <div className="flex h-full flex-col">
                  <div className="px-4 py-4">
                    <Logo className="h-12" />
                  </div>
                  <div className="flex-1 px-3">
                    <NavItems onNavigate={() => setMenuOpen(false)} />
                  </div>
                  <div className="p-3">
                    <AccountCard onNavigate={() => setMenuOpen(false)} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link to="/app" className="min-w-0 flex-1" aria-label="DUOLYNK home">
              <Logo className="h-10" />
            </Link>
          </div>
        </header>

        <main
          className={cn(
            'min-w-0 flex-1 px-3 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8',
            fixed && 'md:min-h-0 md:overflow-hidden md:pb-4 md:pt-4',
          )}
        >
          <div className={cn('mx-auto w-full max-w-6xl', fixed && 'md:h-full md:max-w-none')}>
            {fixed ? (
              <h1 className="sr-only">{title}</h1>
            ) : (
              <div
                className={cn(
                  'flex flex-col gap-3 md:flex-row md:items-start md:justify-between',
                  compact && 'hidden md:flex',
                )}
              >
                <div className="min-w-0">
                  <h1 className="text-balance font-display text-xl leading-tight text-foreground md:text-3xl">
                    {title}
                  </h1>
                  {description ? (
                    <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                      {description}
                    </p>
                  ) : null}
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
              </div>
            )}
            <div
              className={cn(
                compact ? 'md:mt-6' : 'mt-4 md:mt-6',
                fixed && 'md:mt-0 md:h-full md:min-h-0',
              )}
            >
              {children}
            </div>
          </div>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="Primary"
        >
          <div className="grid grid-cols-5">
            {BOTTOM_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-7 w-10 items-center justify-center rounded-full transition-colors',
                        isActive && 'bg-primary/12',
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
