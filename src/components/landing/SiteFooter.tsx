import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Room options', href: '#rooms' },
  { label: 'Games', href: '#games' },
  { label: 'About', href: '#about' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-[1504px] px-4 py-10 md:px-8 md:py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo className="h-16" />
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
              One private room for two people: chat in real time, play four games built for two, and
              keep a record of the time you spend together.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="py-1 font-semibold text-foreground/75 transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
            <Link to="/signin" className="py-1 font-semibold text-foreground/75 hover:text-primary">
              Sign in
            </Link>
            <Link to="/join" className="py-1 font-semibold text-foreground/75 hover:text-primary">
              Join a room
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-1.5">
            <Heart className="h-3.5 w-3.5 text-primary" />
            DUOLYNK — turn distance into togetherness.
          </p>
          <p className="text-pretty">
            Room chat is delivered by the Nexconn Chat SDK in real time.
          </p>
        </div>
      </div>
    </footer>
  );
}
