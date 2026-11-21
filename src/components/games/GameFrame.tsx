import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameAccentStyle, type GameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';

interface GameFrameProps {
  meta: GameMeta;
  round?: { current: number; total: number };
  scores?: { mine: number; theirs: number };
  status?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onExit?: () => void;
  exitLabel?: string;
  className?: string;
}

export function GameFrame({
  meta,
  round,
  scores,
  status,
  children,
  footer,
  onExit,
  exitLabel = 'Leave game',
  className,
}: GameFrameProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-3xl border border-border bg-card shadow-card', className)}
      style={gameAccentStyle(meta.accent)}
    >
      <header className="game-soft game-border border-b">
        <div className="flex items-center gap-2.5 px-3 py-2.5 md:gap-3 md:px-4 md:py-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm md:h-14 md:w-14">
            {meta.logo ? (
              <img src={meta.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="game-gradient flex h-full w-full items-center justify-center text-white">
                <meta.icon className="h-5 w-5" />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold leading-tight text-foreground md:text-base">
              {meta.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {round ? `Round ${round.current} of ${round.total}` : meta.tagline}
            </p>
          </div>
          {onExit ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExit}
              className="h-9 shrink-0 rounded-full border border-border bg-card px-2.5 text-[11px] font-bold text-foreground hover:bg-muted md:px-3 md:text-xs"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back to Chat
            </Button>
          ) : null}
        </div>
        {scores ? (
          <div className="flex items-center gap-1.5 px-3 pb-2 text-[11px] font-bold md:px-4">
            <span className="game-soft game-text rounded-full px-2.5 py-1">You {scores.mine}</span>
            <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              Them {scores.theirs}
            </span>
          </div>
        ) : null}
      </header>

      {status ? <div className="game-soft game-border border-b px-4 py-2">{status}</div> : null}

      <div className="p-4 md:p-5">{children}</div>

      {footer ?? (onExit ? (
        <div className="game-border flex items-center justify-between gap-2 border-t px-4 py-3">
          <p className="text-[11px] text-muted-foreground">Progress saves automatically.</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 rounded-full px-3 text-xs text-muted-foreground hover:text-foreground"
            onClick={onExit}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {exitLabel}
          </Button>
        </div>
      ) : null)}
    </section>
  );
}
