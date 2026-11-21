import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flame, Loader2, PenLine, Send, SkipForward, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/db/supabase';
import {
  friendlyError,
  getTodState,
  todAnswer,
  todChoose,
  todSetPrompt,
  todSkip,
} from '@/lib/api';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import type { TodState } from '@/types/types';

type Busy = 'truth' | 'dare' | 'send' | 'skip' | null;

export function TruthOrDare({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('truth_or_dare');
  const [state, setState] = useState<TodState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [draft, setDraft] = useState('');
  const lastLocal = useRef(0);

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  const load = useCallback(async () => {
    try {
      const data = await getTodState(session.id);
      setState(data);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, [session.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`tod-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` },
        () => {
          if (Date.now() - lastLocal.current < 700) return;
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.id, load]);

  useEffect(() => {
    setDraft('');
  }, [state?.phase, state?.round]);

  if (loading || !state) return <GameLoading meta={meta} />;

  const myScore = myRole === 'a' ? state.scores.a : state.scores.b;
  const theirScore = myRole === 'a' ? state.scores.b : state.scores.a;

  if (state.status === 'finished') {
    return (
      <GameResult
        meta={meta}
        myScore={myScore}
        theirScore={theirScore}
        partnerName={partnerName}
        onExit={onExit}
        note="Every prompt was written by one of you and answered by the other. Points are saved to your room."
      />
    );
  }

  const phase = state.phase ?? 'choose';
  const kind = state.kind;
  const prompt = state.prompt;
  const writerName = nameOf(members, prompt?.by ?? null);

  const apply = (next: TodState) => {
    lastLocal.current = Date.now();
    setState(next);
    setDraft('');
  };

  const choose = async (value: 'truth' | 'dare') => {
    setBusy(value);
    try {
      apply((await todChoose(session.id, value)) as TodState);
    } catch (error) {
      toast.error(friendlyError(error));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const sendPrompt = async () => {
    const text = draft.trim();
    if (text.length < 3) {
      toast.error('Write at least a few words.');
      return;
    }
    setBusy('send');
    try {
      apply((await todSetPrompt(session.id, text)) as TodState);
    } catch (error) {
      toast.error(friendlyError(error));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const sendAnswer = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error('Write your answer first.');
      return;
    }
    setBusy('send');
    try {
      apply((await todAnswer(session.id, text)) as TodState);
      onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const skip = async () => {
    setBusy('skip');
    try {
      apply((await todSkip(session.id)) as TodState);
      onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const history = [...state.history].reverse().slice(0, 4);

  const statusLine =
    phase === 'choose'
      ? state.my_turn
        ? 'Your turn — pick truth or dare'
        : `${partnerName} is picking`
      : phase === 'write'
        ? state.my_turn
          ? `Write a ${kind ?? 'truth'} for ${partnerName}`
          : `${partnerName} is writing your ${kind ?? 'prompt'}`
        : phase === 'answer'
          ? state.my_turn
            ? 'Your turn — answer honestly'
            : `${partnerName} is answering`
          : 'Round complete';

  return (
    <GameFrame
      meta={meta}
      round={{ current: Math.min(state.round, state.total_rounds), total: state.total_rounds }}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
      status={
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-bold text-foreground">{statusLine}</p>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            {state.history.length} played
          </p>
        </div>
      }
    >
      {phase === 'choose' ? (
        state.my_turn ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pick your poison
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void choose('truth')}
                className="game-gradient flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl px-3 py-5 text-white transition-transform duration-200 hover:-translate-y-1 disabled:opacity-70"
              >
                {busy === 'truth' ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Sparkles className="h-7 w-7" />
                )}
                <span className="font-display text-lg font-bold">Truth</span>
                <span className="text-[11px] opacity-85">They write the question</span>
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void choose('dare')}
                className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-3xl bg-foreground px-3 py-5 text-background transition-transform duration-200 hover:-translate-y-1 disabled:opacity-70"
              >
                {busy === 'dare' ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Flame className="h-7 w-7" />
                )}
                <span className="font-display text-lg font-bold">Dare</span>
                <span className="text-[11px] opacity-70">They set the challenge</span>
              </button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Your partner writes the {kind ?? 'prompt'} — nothing is drawn from a deck.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
            <Flame className="game-text mx-auto h-6 w-6" />
            <p className="mt-2 font-display text-base font-bold text-foreground">
              {partnerName} is choosing
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You will write their question the moment they pick.
            </p>
          </div>
        )
      ) : null}

      {phase === 'write' ? (
        state.my_turn ? (
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="game-soft game-border rounded-2xl border p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <PenLine className="game-text h-3.5 w-3.5" />
                {kind === 'dare' ? 'Write a dare' : 'Write a truth'}
              </p>
              <p className="mt-1 text-pretty text-sm text-foreground/85">
                {partnerName} chose <span className="font-bold">{kind ?? 'truth'}</span>. Write
                something they have to answer or do — it appears on their screen instantly.
              </p>
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                kind === 'dare'
                  ? `Dare ${partnerName} to…`
                  : `Ask ${partnerName} something they must answer honestly…`
              }
              rows={3}
              maxLength={240}
              className="mt-3 min-h-24 resize-none px-3 py-2.5 text-base"
            />
            <Button
              className="game-gradient mt-3 h-12 w-full rounded-full text-white"
              disabled={busy !== null || draft.trim().length < 3}
              onClick={() => void sendPrompt()}
            >
              {busy === 'send' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send to {partnerName}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
            <PenLine className="game-text mx-auto h-6 w-6" />
            <p className="mt-2 font-display text-base font-bold text-foreground">
              {partnerName} is writing your {kind ?? 'prompt'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              It will appear here the second they send it.
            </p>
          </div>
        )
      ) : null}

      {phase === 'answer' && prompt ? (
        <div className="animate-in fade-in-0 zoom-in-95 duration-300">
          <div
            className={cn(
              'relative overflow-hidden rounded-3xl p-5 text-center',
              kind === 'dare' ? 'bg-foreground text-background' : 'game-gradient text-white',
            )}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">
              {kind === 'dare' ? <Flame className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              {kind ?? 'truth'} · from {writerName}
            </span>
            <p className="mt-3 text-balance font-display text-xl font-bold leading-snug md:text-2xl">
              {prompt.text}
            </p>
          </div>

          {state.my_turn ? (
            <>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  kind === 'dare' ? 'Describe how it went…' : 'Type your honest answer…'
                }
                rows={3}
                maxLength={500}
                className="mt-3 min-h-24 resize-none px-3 py-2.5 text-base"
              />
              <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
                <Button
                  variant="outline"
                  className="h-12 rounded-full border-foreground/20 px-4"
                  disabled={busy !== null}
                  onClick={() => void skip()}
                >
                  {busy === 'skip' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <SkipForward className="mr-2 h-4 w-4" />
                  )}
                  Skip
                </Button>
                <Button
                  className="game-gradient h-12 rounded-full text-white"
                  disabled={busy !== null || draft.trim().length === 0}
                  onClick={() => void sendAnswer()}
                >
                  {busy === 'send' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  Send answer · +10
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 rounded-2xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground">
              {partnerName} is answering. You will see their answer here.
            </p>
          )}
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Just played
          </p>
          <ul className="mt-1.5 space-y-2">
            {history.map((item) => (
              <li key={`${item.round}-${item.text}`} className="rounded-xl bg-muted/50 px-2.5 py-2">
                <div className="flex items-start gap-1.5">
                  <span
                    className={cn(
                      'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                      item.kind === 'truth'
                        ? 'game-soft game-text'
                        : 'bg-foreground/10 text-foreground/70',
                    )}
                  >
                    {item.kind}
                  </span>
                  <span className="min-w-0 flex-1 text-[11px] leading-snug text-foreground/85">
                    {item.text}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {item.done ? '+10' : 'skip'}
                  </span>
                </div>
                {item.answer ? (
                  <p className="mt-1 pl-1 text-[11px] leading-snug text-muted-foreground">
                    <span className="font-bold text-foreground/70">
                      {nameOf(members, item.answered_by ?? null)}:
                    </span>{' '}
                    {item.answer}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </GameFrame>
  );
}
