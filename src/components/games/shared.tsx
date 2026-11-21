import { Loader2 } from 'lucide-react';
import { gameAccentStyle, type GameMeta } from '@/lib/games';
import type { GameSession, RoomMemberWithProfile } from '@/types/types';

export interface GameProps {
  session: GameSession;
  userId: string;
  members: RoomMemberWithProfile[];
  onChanged: () => void;
  onExit: () => void;
}

export function roleOf(members: RoomMemberWithProfile[], userId: string): 'a' | 'b' {
  return members.find((member) => member.user_id === userId)?.role === 'partner' ? 'b' : 'a';
}

export function nameOf(members: RoomMemberWithProfile[], id: string | null | undefined): string {
  if (!id) return 'Partner';
  return members.find((member) => member.user_id === id)?.profile?.display_name ?? 'Partner';
}

export function partnerIdOf(members: RoomMemberWithProfile[], userId: string): string {
  return members.find((member) => member.user_id !== userId)?.user_id ?? '';
}

export function GameLoading({ meta }: { meta: GameMeta }) {
  return (
    <section
      className="flex items-center justify-center rounded-3xl border border-border bg-card py-16 shadow-card"
      style={gameAccentStyle(meta.accent)}
    >
      <Loader2 className="game-text h-5 w-5 animate-spin" />
    </section>
  );
}

export function GameError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
      <p className="text-sm text-destructive">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full border border-border px-4 py-2 text-xs font-bold text-foreground"
      >
        Try again
      </button>
    </section>
  );
}
