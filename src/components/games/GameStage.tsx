import { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cancelGame, friendlyError, respondGameInvite } from '@/lib/api';
import { gameAccentStyle, gameMeta } from '@/lib/games';
import type { GameSession, RoomMemberWithProfile } from '@/types/types';
import { BrainBattle } from './BrainBattle';
import { ThisOrThat } from './ThisOrThat';
import { TicTacToe } from './TicTacToe';
import { TruthOrDare } from './TruthOrDare';
import { TwoMinds } from './TwoMinds';
import { WhoKnowsYou } from './WhoKnowsYou';
import { nameOf, partnerIdOf } from './shared';

interface GameStageProps {
  session: GameSession;
  userId: string;
  members: RoomMemberWithProfile[];
  onChanged: () => void;
  onExit: () => void;
}

export function GameStage({ session, userId, members, onChanged, onExit }: GameStageProps) {
  const meta = gameMeta(session.game_key);
  const [busy, setBusy] = useState(false);
  const partnerName = nameOf(members, partnerIdOf(members, userId));

  // A quit accepted by both partners (or a cancelled invitation) closes the
  // session for both devices, so both return to chat automatically.
  useEffect(() => {
    if (session.status === 'cancelled') onExit();
  }, [session.status, onExit]);

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      await respondGameInvite(session.id, accept);
      onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelGame(session.id);
      onChanged();
      onExit();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  if (session.status === 'invited') {
    const iInvited = session.invited_by === userId;
    return (
      <section
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-card"
        style={gameAccentStyle(meta.accent)}
      >
        <div className="game-gradient px-5 py-6 text-white">
          <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/20">
            {meta.logo ? (
              <img src={meta.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              <meta.icon className="h-6 w-6" />
            )}
          </span>
          <p className="mt-3 font-display text-xl font-bold">{meta.title}</p>
          <p className="mt-1 text-sm text-white/85">
            {iInvited
              ? `Invitation sent. Waiting for ${partnerName} to accept.`
              : `${nameOf(members, session.invited_by)} invited you to play.`}
          </p>
        </div>
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-end">
          {iInvited ? (
            <Button
              variant="outline"
              className="h-11 rounded-full border-foreground/20"
              disabled={busy}
              onClick={() => void cancel()}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel invitation
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-11 rounded-full border-foreground/20"
                disabled={busy}
                onClick={() => void respond(false)}
              >
                <X className="mr-1.5 h-4 w-4" />
                Decline
              </Button>
              <Button
                className="game-gradient h-11 rounded-full text-white"
                disabled={busy}
                onClick={() => void respond(true)}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                Accept and play
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  if (session.status === 'declined' || session.status === 'cancelled') {
    return (
      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {session.status === 'declined'
            ? 'The invitation was declined. Start another game whenever you both want.'
            : 'This game was cancelled.'}
        </p>
        <Button
          variant="outline"
          className="h-11 shrink-0 rounded-full border-foreground/20"
          onClick={onExit}
        >
          Back to games
        </Button>
      </section>
    );
  }

  const props = { session, userId, members, onChanged, onExit };

  switch (session.game_key) {
    case 'who_knows_you':
      return <WhoKnowsYou {...props} />;
    case 'brain_battle':
      return <BrainBattle {...props} />;
    case 'this_or_that':
      return <ThisOrThat {...props} />;
    case 'two_minds':
      return <TwoMinds {...props} />;
    case 'tic_tac_toe':
      return <TicTacToe {...props} />;
    case 'truth_or_dare':
      return <TruthOrDare {...props} />;
    default:
      return null;
  }
}
