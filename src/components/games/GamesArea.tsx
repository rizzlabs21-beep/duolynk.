import { useEffect, useState } from 'react';
import { Gamepad2, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError, startGame } from '@/lib/api';
import { GAMES } from '@/lib/games';
import type { GameKey, GameSession, RoomMemberWithProfile } from '@/types/types';
import { GameCard } from './GameCard';
import { GameStage } from './GameStage';

interface GamesAreaProps {
  roomId: string;
  userId: string;
  members: RoomMemberWithProfile[];
  expired: boolean;
  activeSession: GameSession | null;
  recentSessions: GameSession[];
  onChanged: () => void;
}

export function GamesArea({
  roomId,
  userId,
  members,
  expired,
  activeSession,
  recentSessions,
  onChanged,
}: GamesAreaProps) {
  const [starting, setStarting] = useState<GameKey | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    if (activeSession) setPinnedId(activeSession.id);
  }, [activeSession?.id]);

  const shownSession =
    activeSession ?? recentSessions.find((session) => session.id === pinnedId) ?? null;

  const liveSession =
    activeSession && (activeSession.status === 'invited' || activeSession.status === 'active')
      ? activeSession
      : null;

  const memberCount = members.length;
  const locked = memberCount < 2;
  const blocked = expired || locked || liveSession !== null;

  const start = async (key: GameKey) => {
    setStarting(key);
    try {
      await startGame(roomId, key);
      toast.success('Invitation sent to your partner');
      onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="space-y-4">
      {shownSession ? (
        <GameStage
          session={shownSession}
          userId={userId}
          members={members}
          onChanged={onChanged}
          onExit={() => {
            setPinnedId(null);
            onChanged();
          }}
        />
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-4 shadow-card md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <Gamepad2 className="h-4 w-4 text-primary" />
              Games for two
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Six games, one room, both screens in sync.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            {memberCount}/2 ready
          </span>
        </div>

        {locked ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Games unlock when your partner joins. Nothing starts as a solo round.
          </p>
        ) : expired ? (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            This room has closed, so new games cannot start.
          </p>
        ) : activeSession ? (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            A game is open above. Finish or cancel it before starting another.
          </p>
        ) : (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            Starting a game sends your partner an invitation. It begins when they accept.
          </p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GAMES.map((game) => (
            <GameCard
              key={game.key}
              meta={game}
              starting={starting === game.key}
              disabled={blocked || starting !== null}
              disabledReason={locked ? 'Waiting for partner' : expired ? 'Room closed' : 'Game open'}
              onStart={() => void start(game.key)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
