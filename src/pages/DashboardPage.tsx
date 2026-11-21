import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Gamepad2,
  Infinity as InfinityIcon,
  KeyRound,
  Loader2,
  MessageCircle,
  PlusCircle,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { JoinCodeDialog } from '@/components/landing/JoinCodeDialog';
import { RoomActionsMenu } from '@/components/room/RoomActionsMenu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError, getMyRooms } from '@/lib/api';
import { loadLatestMessage } from '@/lib/chat/nexconn';
import { formatCountdown, formatRelative, initialsOf, isOnline, isRoomExpired, roomTypeLabel } from '@/lib/format';
import { gameMeta } from '@/lib/games';
import type { ChatMessage, RoomSummary } from '@/types/types';

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyRooms(user.id);
      setRooms(data);
      setError(null);
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = profile?.display_name || 'there';
  const primaryRoom = rooms.find((room) => !isRoomExpired(room.room)) ?? rooms[0] ?? null;
  const partnerId =
    primaryRoom?.members.find((member) => member.user_id !== user?.id)?.user_id ?? null;
  const [latestMessage, setLatestMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (!primaryRoom || !partnerId) {
      setLatestMessage(null);
      return;
    }
    let cancelled = false;
    loadLatestMessage(partnerId, primaryRoom.room.id)
      .then((message) => {
        if (!cancelled) setLatestMessage(message);
      })
      .catch(() => {
        if (!cancelled) setLatestMessage(null);
      });
    return () => {
      cancelled = true;
    };
  }, [primaryRoom?.room.id, partnerId]);

  return (
    <AppShell
      title={`Hi, ${name}`}
      description="Your shared rooms live here. Open one to chat and play, or start a new room for the two of you."
      actions={
        <>
          <JoinCodeDialog
            label="Join with a code"
            variant="outline"
            className="h-11 rounded-full border-foreground/20 px-5"
          />
          <Button asChild className="h-11 rounded-full px-5">
            <Link to="/app/rooms/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create a room
            </Link>
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          {error}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card md:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/35 text-secondary-foreground">
            <Users className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-balance font-display text-2xl text-foreground">
            You do not have a room yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            Create a room and DUOLYNK will give you a private code to send to your partner. Once they
            join with their own account, chat and games open for both of you.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild className="h-12 w-full rounded-full px-6 sm:w-auto">
              <Link to="/app/rooms/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create your first room
              </Link>
            </Button>
            <JoinCodeDialog
              label="I have a code"
              variant="outline"
              className="h-12 w-full rounded-full border-foreground/20 px-6 sm:w-auto"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {primaryRoom ? (
            <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground/80">
                      {primaryRoom.room.room_type === 'temporary' ? (
                        <CalendarClock className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <InfinityIcon className="h-3.5 w-3.5 text-primary" />
                      )}
                      {roomTypeLabel(primaryRoom.room.room_type)}
                    </span>
                    {isRoomExpired(primaryRoom.room) ? (
                      <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                        Closed
                      </span>
                    ) : (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {primaryRoom.room.room_type === 'temporary'
                          ? formatCountdown(primaryRoom.room.expires_at)
                          : 'Always open'}
                      </span>
                    )}
                    <div className="ml-auto">
                      <RoomActionsMenu
                        room={primaryRoom.room}
                        isCreator={primaryRoom.room.created_by === user?.id}
                        onChanged={() => void load()}
                      />
                    </div>
                  </div>

                  <h2 className="mt-4 text-balance font-display text-2xl leading-tight text-foreground md:text-3xl">
                    {primaryRoom.room.name}
                  </h2>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {primaryRoom.members.map((member) => (
                      <span key={member.user_id} className="flex items-center gap-2">
                        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-secondary/40 font-display text-xs font-bold text-secondary-foreground">
                          {initialsOf(member.profile?.display_name ?? 'Partner')}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                              isOnline(member.last_seen_at) ? 'bg-primary' : 'bg-muted-foreground/40'
                            }`}
                          />
                        </span>
                        <span className="text-sm font-semibold text-foreground/85">
                          {member.profile?.display_name ?? 'Partner'}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {member.role === 'creator' ? 'creator' : 'partner'}
                          </span>
                        </span>
                      </span>
                    ))}
                    {primaryRoom.members.length < 2 ? (
                      <span className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                        Waiting for your partner
                      </span>
                    ) : null}
                  </div>

                  {latestMessage ? (
                    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted px-3 py-2.5 text-sm text-foreground/80">
                      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0 truncate">{latestMessage.body}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {formatRelative(latestMessage.createdAt)}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      No messages yet. Open the room and say hello.
                    </p>
                  )}

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button asChild className="h-12 rounded-full px-6">
                      <Link to={`/app/rooms/${primaryRoom.room.id}`}>
                        Open room
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    {primaryRoom.activeSession ? (
                      <span className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-muted px-4 text-sm font-semibold text-foreground/80">
                        <Gamepad2 className="h-4 w-4 text-primary" />
                        {gameMeta(primaryRoom.activeSession.game_key).short} in progress
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="border-t border-border bg-secondary/20 p-5 md:border-l md:border-t-0 md:p-7">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    This room so far
                  </p>
                  <dl className="mt-3 space-y-3">
                    {primaryRoom.members.map((member) => {
                      const stat = primaryRoom.stats.find((s) => s.user_id === member.user_id);
                      return (
                        <div key={member.user_id} className="flex items-center justify-between gap-3">
                          <dt className="min-w-0 truncate text-sm font-semibold text-foreground/85">
                            {member.profile?.display_name ?? 'Partner'}
                          </dt>
                          <dd className="shrink-0 text-sm text-muted-foreground">
                            {stat?.points ?? 0} pts · {stat?.games_won ?? 0} wins
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                    Points only come from games you both finished.
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {rooms.length > 1 ? (
            <section>
              <h2 className="font-display text-lg font-bold text-foreground">Your other rooms</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {rooms
                  .filter((room) => room.room.id !== primaryRoom?.room.id)
                  .map((room) => (
                    <div
                      key={room.room.id}
                      className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-card"
                    >
                      <Link
                        to={`/app/rooms/${room.room.id}`}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-display text-base font-bold text-foreground">
                            {room.room.name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {roomTypeLabel(room.room.room_type)} · {room.members.length}/2 members
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                      <RoomActionsMenu
                        room={room.room}
                        isCreator={room.room.created_by === user?.id}
                        onChanged={() => void load()}
                      />
                    </div>
                  ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
