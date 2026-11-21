import { useCallback, useEffect, useState } from 'react';
import { Circle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { friendlyError, getTttState, submitTttMove } from '@/lib/api';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import { GameFrame } from './GameFrame';
import { GameResult } from './GameResult';
import { GameLoading, nameOf, partnerIdOf, roleOf, type GameProps } from './shared';
import type { TttState } from '@/types/types';

export function TicTacToe({ session, userId, members, onChanged, onExit }: GameProps) {
  const meta = gameMeta('tic_tac_toe');
  const [state, setState] = useState<TttState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyCell, setBusyCell] = useState<number | null>(null);

  const myRole = roleOf(members, userId);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  const load = useCallback(async () => {
    try {
      const data = await getTttState(session.id);
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
      .channel(`ttt-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${session.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.id, load]);

  if (loading || !state) return <GameLoading meta={meta} />;

  const myScore = state.my_symbol === 'X' ? state.scores.a : state.scores.b;
  const theirScore = state.my_symbol === 'X' ? state.scores.b : state.scores.a;

  if (state.status === 'finished') {
    return (
      <GameResult
        meta={meta}
        myScore={myScore}
        theirScore={theirScore}
        partnerName={partnerName}
        onExit={onExit}
        note={
          state.winner === userId
            ? 'Three in a row. Points are already saved to your room.'
            : state.winner
              ? `${partnerName} lined up three. Start another round whenever you both want.`
              : 'Every square filled with no line. Points are saved to your room.'
        }
      />
    );
  }

  const winning = new Set(state.winning_line ?? []);
  const turnName = state.turn === userId ? 'You' : nameOf(members, state.turn);

  const play = async (cell: number) => {
    if (!state.my_turn || state.board[cell]) return;
    setBusyCell(cell);
    try {
      const result = (await submitTttMove(session.id, cell)) as unknown as { finished?: boolean };
      await load();
      if (result?.finished) onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
      await load();
    } finally {
      setBusyCell(null);
    }
  };

  return (
    <GameFrame
      meta={meta}
      scores={{ mine: myScore, theirs: theirScore }}
      onExit={onExit}
      status={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-foreground">
            {state.my_turn ? 'Your turn' : `${turnName} is thinking`}
          </p>
          <p className="text-[11px] text-muted-foreground">
            You are <span className="font-bold text-foreground">{state.my_symbol}</span>
          </p>
        </div>
      }
    >
      <div className="mx-auto grid max-w-[380px] grid-cols-3 gap-2">
        {state.board.map((value, index) => {
          const isWinning = winning.has(index);
          const playable = state.my_turn && !value;
          return (
            <button
              key={index}
              type="button"
              onClick={() => void play(index)}
              disabled={!playable || busyCell !== null}
              aria-label={`Square ${index + 1}${value ? `, ${value}` : ', empty'}`}
              className={cn(
                'flex aspect-square items-center justify-center rounded-2xl border-2 transition-all duration-150',
                isWinning
                  ? 'game-border game-soft game-glow'
                  : 'border-border bg-muted/40',
                playable && 'hover:-translate-y-0.5 hover:border-foreground/30 hover:bg-card',
              )}
            >
              {busyCell === index ? (
                <Loader2 className="game-text h-6 w-6 animate-spin" />
              ) : value === 'X' ? (
                <X className="game-text h-10 w-10 md:h-12 md:w-12" strokeWidth={3} />
              ) : value === 'O' ? (
                <Circle className="h-9 w-9 text-foreground/70 md:h-11 md:w-11" strokeWidth={3} />
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        {state.my_turn ? 'Tap any empty square to play.' : 'Every move appears on both screens instantly.'}
      </p>
    </GameFrame>
  );
}
