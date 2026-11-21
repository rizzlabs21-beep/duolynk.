import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, Loader2, Timer, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import { useReveal, useRoundGame } from './useRoundGame';

const LIMIT = 20;

export function BrainBattle({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('brain_battle');
  const { round, loading, submitting, send } = useRoundGame(session.id);
  const { result, show, dismiss } = useReveal(round);
  const [choice, setChoice] = useState<string | null>(null);
  const [left, setLeft] = useState(LIMIT);

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  useEffect(() => {
    setChoice(null);
    setLeft(LIMIT);
    const started = Date.now();
    const timer = window.setInterval(() => {
      setLeft(Math.max(0, LIMIT - Math.floor((Date.now() - started) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
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
  const options = round.prompt?.options ?? [];
  const pct = Math.round((left / LIMIT) * 100);

  return (
    <GameFrame
      meta={meta}
      round={{ current: Math.min(round.current_round + 1, round.total_rounds), total: round.total_rounds }}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
    >
      {show && result ? (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Correct answer
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">{result.correct ?? '—'}</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'You', data: mine },
              { label: partnerName, data: theirs },
            ].map((row) => (
              <div
                key={row.label}
                className={cn(
                  'rounded-2xl border p-3 text-center',
                  row.data?.correct ? 'game-border game-soft' : 'border-border bg-muted/40',
                )}
              >
                <p className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  {row.label}
                </p>
                <span
                  className={cn(
                    'mx-auto mt-1.5 flex h-7 w-7 items-center justify-center rounded-full',
                    row.data?.correct ? 'game-gradient text-white' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {row.data?.correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </span>
                <p className="mt-1.5 text-sm font-bold text-foreground">{row.data?.points ?? 0} pts</p>
                <p className="text-[11px] text-muted-foreground">
                  {typeof row.data?.seconds === 'number' ? `${row.data.seconds}s` : '—'}
                </p>
              </div>
            ))}
          </div>

          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            onClick={() => {
              dismiss();
              if (isLast) onChanged();
            }}
          >
            {isLast ? 'See the result' : 'Next question'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : round.my_submitted ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <Clock className="game-text mx-auto h-6 w-6" />
          <p className="mt-2 font-display text-base font-bold text-foreground">Answer locked in</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for {partnerName}. Both answers reveal together.
          </p>
        </div>
      ) : (
        <div>
          <div className="rounded-2xl bg-foreground px-4 py-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-background/60">
              Solve it
            </p>
            <p className="mt-1 text-balance font-display text-2xl font-bold leading-tight text-background md:text-3xl">
              {round.prompt?.question ?? 'Loading…'}
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Timer className="game-text h-3.5 w-3.5 shrink-0" />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="game-gradient h-full rounded-full transition-[width] duration-300 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-[11px] font-bold text-muted-foreground">
              {left}s
            </span>
          </div>

          {round.partner_submitted ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {partnerName} already answered. Send yours to see who was right.
            </p>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {options.map((option) => {
              const active = choice === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => setChoice(option.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-16 items-center justify-center rounded-2xl border px-2 py-3 text-center text-base font-bold transition-all',
                    active
                      ? 'game-border game-soft game-ring text-foreground'
                      : 'border-border bg-muted/40 text-foreground/85 hover:border-foreground/25',
                    submitting && 'opacity-60',
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            disabled={submitting || !choice}
            onClick={() => void send({ choice })}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Submit answer
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Faster correct answers score more.
          </p>
        </div>
      )}
    </GameFrame>
  );
}
