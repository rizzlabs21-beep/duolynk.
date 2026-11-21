import { Gamepad2, Loader2, Play } from 'lucide-react';
import { GAMES, gameAccentStyle } from '@/lib/games';
import { cn } from '@/lib/utils';
import type { GameKey, GameSession } from '@/types/types';

interface GamesWidgetProps {
  activeSession: GameSession | null;
  selectedKey: GameKey | null;
  memberCount: number;
  expired: boolean;
  starting: GameKey | null;
  onSelect: (key: GameKey) => void;
  className?: string;
}

export function GamesWidget({
  activeSession,
  selectedKey,
  memberCount,
  expired,
  starting,
  onSelect,
  className,
}: GamesWidgetProps) {
  const locked = memberCount < 2 || expired;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col rounded-3xl border border-border bg-card p-3 shadow-card',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-1 pb-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
          <Gamepad2 className="h-4 w-4 text-primary" />
          Games
        </h2>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {GAMES.length} available
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {GAMES.map((game) => {
          const isActive = activeSession?.game_key === game.key;
          const isSelected = selectedKey === game.key;
          return (
            <button
              key={game.key}
              type="button"
              onClick={() => onSelect(game.key)}
              disabled={starting !== null}
              style={gameAccentStyle(game.accent)}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-2xl border p-2 text-left transition-all duration-150',
                isSelected ? 'game-border game-soft' : 'border-transparent hover:bg-muted/60',
                starting !== null && 'opacity-70',
              )}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm">
                {game.logo ? (
                  <img src={game.logo} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="game-gradient flex h-full w-full items-center justify-center text-white">
                    <game.icon className="h-[18px] w-[18px]" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-foreground">
                  {game.short}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {game.tagline}
                </span>
              </span>
              {starting === game.key ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              ) : isActive ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  Live
                </span>
              ) : (
                <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 shrink-0 rounded-xl bg-muted px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
        {locked
          ? expired
            ? 'This room has closed, so new games cannot start.'
            : 'Games unlock when your partner joins.'
          : activeSession
            ? 'A game is open. Finish or cancel it before starting another.'
            : 'Pick a game to open it in the main area.'}
      </p>
    </section>
  );
}
