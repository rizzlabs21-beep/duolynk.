import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock, Loader2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import { useReveal, useRoundGame } from './useRoundGame';

const LETTERS = ['A', 'B', 'C', 'D'];

function AnswerRow({
  label,
  self,
  predict,
  correct,
  points,
}: {
  label: string;
  self?: string;
  predict?: string;
  correct?: boolean;
  points?: number;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        correct ? 'game-border game-soft' : 'border-border bg-muted/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            correct ? 'game-gradient text-white' : 'bg-muted text-muted-foreground',
          )}
        >
          {correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-foreground">
        Said <span className="font-bold">{self ?? '—'}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Guessed <span className="font-semibold text-foreground/80">{predict ?? '—'}</span> ·{' '}
        {points ?? 0} pts
      </p>
    </div>
  );
}

export function WhoKnowsYou({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('who_knows_you');
  const { round, loading, submitting, send } = useRoundGame(session.id);
  const { result, show, dismiss } = useReveal(round);
  const [selfAnswer, setSelfAnswer] = useState<string | null>(null);
  const [predictAnswer, setPredictAnswer] = useState<string | null>(null);
  const [step, setStep] = useState<'self' | 'predict'>('self');

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  useEffect(() => {
    setSelfAnswer(null);
    setPredictAnswer(null);
    setStep('self');
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
  const selected = step === 'self' ? selfAnswer : predictAnswer;

  return (
    <GameFrame
      meta={meta}
      round={{ current: Math.min(round.current_round + 1, round.total_rounds), total: round.total_rounds }}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
    >
      {show && result ? (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <p className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Sparkles className="game-text h-4 w-4" />
            Answers revealed
          </p>
          <div className="mt-3 space-y-2">
            <AnswerRow
              label="You"
              self={mine?.self}
              predict={mine?.predict}
              correct={mine?.correct}
              points={mine?.points}
            />
            <AnswerRow
              label={partnerName}
              self={theirs?.self}
              predict={theirs?.predict}
              correct={theirs?.correct}
              points={theirs?.points}
            />
          </div>
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
          <p className="mt-2 font-display text-base font-bold text-foreground">Answer locked in</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for {partnerName}. The reveal happens for both of you at once.
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-1.5">
            {['self', 'predict'].map((key, index) => (
              <span
                key={key}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  (step === 'self' ? 0 : 1) >= index ? 'game-gradient' : 'bg-muted',
                )}
              />
            ))}
          </div>

          <p className="mt-3 text-pretty font-display text-lg font-bold leading-snug text-foreground">
            {round.prompt?.question ?? 'Loading question…'}
          </p>
          <p className="game-text mt-1 text-[11px] font-bold uppercase tracking-[0.12em]">
            {step === 'self' ? 'Step 1 · Your own answer' : `Step 2 · What did ${partnerName} pick?`}
          </p>

          {round.partner_submitted ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {partnerName} has locked in. Nothing is revealed until you send yours.
            </p>
          ) : null}

          <div className="mt-3 grid gap-2">
            {options.map((option, index) => {
              const active = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={submitting}
                  onClick={() => (step === 'self' ? setSelfAnswer(option.id) : setPredictAnswer(option.id))}
                  aria-pressed={active}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm font-semibold transition-all',
                    active
                      ? 'game-border game-soft game-ring text-foreground'
                      : 'border-border bg-muted/40 text-foreground/85 hover:border-foreground/25',
                    submitting && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold',
                      active ? 'game-gradient text-white' : 'bg-card text-muted-foreground',
                    )}
                  >
                    {LETTERS[index] ?? index + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-pretty">{option.label}</span>
                  {active ? <Check className="game-text h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            disabled={submitting || !selected}
            onClick={() => {
              if (step === 'self') {
                setStep('predict');
                return;
              }
              void send({ self: selfAnswer, predict: predictAnswer });
            }}
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {step === 'self' ? 'Next: guess your partner' : 'Lock in both answers'}
          </Button>
        </div>
      )}
    </GameFrame>
  );
}
