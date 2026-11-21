import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { friendlyError, getGameRound, submitGameAnswer } from '@/lib/api';
import type { GameRoundState, RoundResult } from '@/types/types';

export function useRoundGame(sessionId: string) {
  const [round, setRound] = useState<GameRoundState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getGameRound(sessionId);
      setRound(data);
      setError(null);
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`game-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_submissions', filter: `session_id=eq.${sessionId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  const send = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!round) return null;
      setSubmitting(true);
      try {
        const result = await submitGameAnswer(sessionId, round.current_round, payload);
        await load();
        return result;
      } catch (sendError) {
        toast.error(friendlyError(sendError));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [round, sessionId, load],
  );

  return { round, loading, submitting, error, send, reload: load };
}

/**
 * Reveals the round that just resolved for BOTH players.
 * The first player to submit used to miss the result entirely, so the reveal is
 * derived from the session state instead of from the local submit call.
 */
export function useReveal(round: GameRoundState | null) {
  const [dismissed, setDismissed] = useState<number | null>(null);
  const lastRound = round ? round.current_round - 1 : -1;
  const result: RoundResult | undefined =
    round && lastRound >= 0 ? round.rounds[String(lastRound)] : undefined;
  const show = Boolean(result) && dismissed !== lastRound;

  return {
    result,
    show,
    dismiss: () => setDismissed(lastRound),
  };
}
