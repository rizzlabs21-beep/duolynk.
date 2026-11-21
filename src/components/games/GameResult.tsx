import { ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameAccentStyle, type GameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';

interface GameResultProps {
  meta: GameMeta;
  myScore: number;
  theirScore: number;
  partnerName: string;
  onExit: () => void;
  note?: string;
}

export function GameResult({ meta, myScore, theirScore, partnerName, onExit, note }: GameResultProps) {
  const outcome = myScore === theirScore ? 'draw' : myScore > theirScore ? 'win' : 'loss';

  return (
    <section
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
      style={gameAccentStyle(meta.accent)}
    >
      <div className="game-gradient px-5 py-6 text-center text-white">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Trophy className="h-7 w-7" />
        </span>
        <p className="mt-3 font-display text-xl font-bold">
          {outcome === 'draw' ? 'A draw' : outcome === 'win' ? 'You won' : `${partnerName} won`}
        </p>
        <p className="mt-1 text-sm text-white/85">{meta.title} · finished</p>
      </div>

      <div className="p-4 md:p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="game-soft game-border rounded-2xl border p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">You</p>
            <p className="mt-1 font-display text-3xl font-bold text-foreground">{myScore}</p>
            <p className="text-[11px] text-muted-foreground">points</p>
          </div>
          <div className="rounded-2xl border border-border bg-muted/50 p-4 text-center">
            <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {partnerName}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-foreground">{theirScore}</p>
            <p className="text-[11px] text-muted-foreground">points</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground/85">
          {note ??
            (outcome === 'draw'
              ? 'A draw. Nobody gets the win this time.'
              : outcome === 'win'
                ? 'You came out ahead in this one.'
                : 'Your partner came out ahead this time.')}
        </p>

        <p className="mt-2 text-[11px] text-muted-foreground">
          Points and achievements from this game are already saved to your room.
        </p>

        <Button
          className={cn('game-gradient mt-4 h-11 w-full rounded-full text-white')}
          onClick={onExit}
        >
          Back to chat
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
