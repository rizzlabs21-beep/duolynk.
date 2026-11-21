import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GAME_MODE_LABEL, gameAccentStyle, type GameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';

interface GameCardProps {
  meta: GameMeta;
  onStart: () => void;
  starting: boolean;
  disabled: boolean;
  disabledReason?: string;
}

export function GameCard({ meta, onStart, starting, disabled, disabledReason }: GameCardProps) {
  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-card"
      style={gameAccentStyle(meta.accent)}
    >
      <span className="game-gradient absolute inset-x-0 top-0 h-1" aria-hidden="true" />

      <div className="flex items-start gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
          {meta.logo ? (
            <img src={meta.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="game-gradient flex h-full w-full items-center justify-center text-white">
              <meta.icon className="h-6 w-6" />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-balance font-display text-base font-bold leading-snug text-foreground">
            {meta.short}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{meta.tagline}</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-pretty text-xs leading-relaxed text-muted-foreground">
        {meta.description}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="game-soft game-text rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]">
          {GAME_MODE_LABEL[meta.mode]}
        </span>
        {meta.rounds > 0 ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            {meta.rounds} rounds
          </span>
        ) : null}
      </div>

      <div className="mt-auto pt-4">
        <Button
          className={cn(
            'h-10 w-full rounded-full text-sm',
            disabled ? '' : 'game-gradient text-white',
          )}
          variant={disabled ? 'secondary' : 'default'}
          disabled={disabled || starting}
          onClick={onStart}
        >
          {starting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {disabled ? (disabledReason ?? 'Unavailable') : 'Play together'}
        </Button>
      </div>
    </article>
  );
}
