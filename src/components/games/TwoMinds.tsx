import { useEffect, useState } from 'react';
import { ArrowRight, Check, KeyRound, Loader2, Lock, Puzzle, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import { useReveal, useRoundGame } from './useRoundGame';

export function TwoMinds({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('two_minds');
  const { round, loading, submitting, send } = useRoundGame(session.id);
  const { result, show, dismiss } = useReveal(round);
  const [textAnswer, setTextAnswer] = useState('');

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  useEffect(() => {
    setTextAnswer('');
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
        note="Every mission solved together. That is the whole point of this one."
      />
    );
  }

  const mine = myRole === 'a' ? result?.a : result?.b;
  const isLast = round.current_round >= round.total_rounds;

  // The failed attempt is stored on the session, so BOTH partners see the same
  // feedback instead of only the player who happened to submit last.
  const attempt = round.last_attempt;
  const feedback =
    attempt && attempt.round === round.current_round
      ? { a_correct: attempt.a.correct, b_correct: attempt.b.correct }
      : null;

  const submit = async () => {
    const answer = textAnswer.trim();
    if (!answer) return;
    const response = await send({ answer });
    if (response?.status === 'retry') setTextAnswer('');
  };

  return (
    <GameFrame
      meta={meta}
      round={{ current: Math.min(round.current_round + 1, round.total_rounds), total: round.total_rounds }}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
    >
      {show && result ? (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="game-soft game-border rounded-2xl border p-5 text-center">
            <span className="game-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white">
              <Unlock className="h-6 w-6" />
            </span>
            <p className="mt-2 font-display text-lg font-bold text-foreground">Mission solved</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The answer was <span className="font-bold text-foreground">{result.answer ?? '—'}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{mine?.points ?? 0} points each</p>
          </div>
          <Button
            className="game-gradient mt-4 h-11 w-full rounded-full text-white"
            onClick={() => {
              dismiss();
              if (isLast) onChanged();
            }}
          >
            {isLast ? 'See the result' : 'Next mission'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : round.my_submitted ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
          <Lock className="game-text mx-auto h-6 w-6" />
          <p className="mt-2 font-display text-base font-bold text-foreground">Answer sent</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for {partnerName} to submit the same answer.
          </p>
        </div>
      ) : (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            <Puzzle className="game-text h-3.5 w-3.5" />
            Mission
          </p>
          <p className="mt-1 text-balance font-display text-lg font-bold leading-snug text-foreground">
            {round.prompt?.mission ?? 'Loading mission…'}
          </p>

          <div className="game-soft game-border mt-3 rounded-2xl border p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <KeyRound className="game-text h-3.5 w-3.5" />
              Your clue
            </p>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground/85">
              {round.prompt?.clue ?? '—'}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-2xl border border-dashed border-border px-3 py-2.5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {partnerName} has a different clue. Talk it through in the chat, then answer together.
            </p>
          </div>

          {feedback ? (
            <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p className="font-bold">Not quite. Try again together.</p>
              <p className="mt-0.5">
                You: {feedback.a_correct ? 'correct' : 'not yet'} · {partnerName}:{' '}
                {feedback.b_correct ? 'correct' : 'not yet'}
              </p>
            </div>
          ) : null}

          {round.partner_submitted ? (
            <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              {partnerName} has submitted. Send the same answer to unlock the mission.
            </p>
          ) : null}

          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Input
              value={textAnswer}
              onChange={(event) => setTextAnswer(event.target.value)}
              placeholder="Your shared answer"
              className="h-12 flex-1 px-3 text-base"
              maxLength={120}
            />
            <Button
              type="submit"
              className="game-gradient h-12 shrink-0 rounded-full px-6 text-white"
              disabled={submitting || !textAnswer.trim()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Submit
            </Button>
          </form>
        </div>
      )}
    </GameFrame>
  );
}
