import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Lock, MessageCircle, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-4 py-6 md:px-10 md:py-8">
        <Link to="/" className="inline-flex w-fit items-center" aria-label="DUOLYNK home">
          <Logo className="h-14 md:h-16" />
        </Link>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <h1 className="text-balance font-display text-3xl leading-tight text-foreground md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
            {subtitle}
          </p>
          <div className="mt-7">{children}</div>
          <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
        </div>

        <p className="text-xs text-muted-foreground">
          <Link to="/" className="font-semibold hover:text-primary">
            ← Back to DUOLYNK
          </Link>
        </p>
      </div>

      <div className="relative hidden overflow-hidden bg-secondary/30 md:block">
        <div
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-accent/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-center px-10 py-12">
          <div className="mx-auto w-full max-w-md">
            <img
              src="/couple-art.webp"
              alt="A couple connected through their shared DUOLYNK room"
              className="w-full"
              width={1920}
              height={1280}
            />
            <div className="mt-6 rounded-3xl border border-border bg-card/90 p-5 shadow-card">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Heart className="h-4 w-4 fill-primary text-primary" />
                One room, just the two of you
              </p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                Sign in with your own account, then create a room or join your partner’s with their
                code. Chat and games open as soon as you are both inside.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  Realtime chat
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Four games
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Private
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
