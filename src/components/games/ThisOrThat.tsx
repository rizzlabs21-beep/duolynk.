import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, Heart, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import { useReveal, useRoundGame } from './useRoundGame';

export function ThisOrThat({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('this_or_that');
  const { round, loading, submitting, send } = useRoundGame(session.id);
  const { result, show, dismiss } = useReveal(round);
  const [choice, setChoice] = useState<string | null>(null);

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  useEffect(() => {
    setChoice(null);
  }, [round?.current_round]);

  if (loading || !round) return <GameLoading meta={meta} />;

  const myScore = myRole === 'a' ? round.scores.a : round.scores.b;
  const theirScore = myRole === 'a' ? round.scores.b : round.scores.a;

  if (round.status === 'finished' && !show) {
    return (
      <GameResult
        meta={meta}
        myScore={myScore}
        theirScore={theirScore}
        partnerName={partnerName}
        onExit={onExit}
      />
    );
  }

  const mine = myRole === 'a' ? result?.a : result?.b;
  const theirs = myRole === 'a' ? result?.b : result?.a;
  const isLast = round.current_round >= round.total_rounds;

  return (
    <GameFrame
      meta={meta}
      round={{ current: Math.min(round.current_round + 1, round.total_rounds), total: round.total_rounds }}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
    >
      {show && result ? (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <div
            className={cn(
              'rounded-2xl border p-4 text-center',
              result.matched ? 'game-border game-soft' : 'border-border bg-muted/40',
            )}
          >
            <span
              className={cn(
                'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
                result.matched ? 'game-gradient text-white' : 'bg-muted text-muted-foreground',
              )}
            >
              {result.matched ? <Heart className="h-6 w-6" /> : <X className="h-6 w-6" />}
            </span>
            <p className="mt-2 font-display text-lg font-bold text-foreground">
              {result.matched ? 'You matched' : 'Different picks'}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {result.matched ? `${mine?.points ?? 0} points each` : 'No points this round'}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">You</p>
              <p className="mt-1 text-sm font-bold text-foreground">{mine?.choice ?? '—'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-3 text-center">
              <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                {partnerName}
              </p>
              <p className="mt-1 text-sm font-bold text-foreground">{theirs?.choice ?? '—'}</p>
            </div>
          </div>

          {result.topic ? (
            <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Talk about it: {result.topic}
            </p>
          ) : null}

          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            onClick={() => {
              dismiss();
              if (isLast) onChanged();
            }}
          >
            {isLast ? 'See the result' : 'Next round'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : round.my_submitted ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <Clock className="game-text mx-auto h-6 w-6" />
          <p className="mt-2 font-display text-base font-bold text-foreground">Choice locked in</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for {partnerName}. No peeking until you both choose.
          </p>
        </div>
      ) : (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles className="game-text h-3.5 w-3.5" />
            Pick one
          </p>
          <p className="mt-1 text-balance font-display text-lg font-bold leading-snug text-foreground">
            {round.prompt?.topic ?? 'This or that?'}
          </p>

          {round.partner_submitted ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {partnerName} has chosen. Lock yours in to reveal both.
            </p>
          ) : null}

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {[
              { key: 'left', label: round.prompt?.left ?? 'Option A' },
              { key: 'right', label: round.prompt?.right ?? 'Option B' },
            ].map((option) => {
              const active = choice === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  disabled={submitting}
                  onClick={() => setChoice(option.key)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-32 flex-col items-center justify-center gap-2 rounded-3xl border-2 px-3 py-4 text-center transition-all duration-200',
                    active
                      ? 'game-border game-soft game-ring scale-[1.02] text-foreground'
                      : 'border-border bg-muted/40 text-foreground/85 hover:border-foreground/25',
                    submitting && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold',
                      active ? 'game-gradient text-white' : 'bg-card text-muted-foreground',
                    )}
                  >
                    {active ? <Check className="h-4 w-4" /> : option.key === 'left' ? 'A' : 'B'}
                  </span>
                  <span className="text-balance text-sm font-bold leading-snug">{option.label}</span>
                </button>
              );
            })}
            <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-[10px] font-bold text-muted-foreground shadow-sm">
              OR
            </span>
          </div>

          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            disabled={submitting || !choice}
            onClick={() => void send({ choice })}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lock in my choice
          </Button>
        </div>
      )}
    </GameFrame>
  );
}
