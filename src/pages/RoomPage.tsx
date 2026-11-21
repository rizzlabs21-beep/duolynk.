import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Gamepad2,
  HeartHandshake,
  Info,
  Loader2,
  LogOut,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { GamesArea } from '@/components/games/GamesArea';
import { GameStage } from '@/components/games/GameStage';
import { QuitGameDialog } from '@/components/games/QuitGameDialog';
import { AppShell } from '@/components/layout/AppShell';
import { ChatPanel } from '@/components/room/ChatPanel';
import { GamesWidget } from '@/components/room/GamesWidget';
import { InvitePanel } from '@/components/room/InvitePanel';
import { ProgressPanel } from '@/components/room/ProgressPanel';
import { RoomActionsMenu } from '@/components/room/RoomActionsMenu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { friendlyError, getRoomBundle, startGame, touchRoom } from '@/lib/api';
import { formatCountdown, isRoomExpired } from '@/lib/format';
import { gameMeta } from '@/lib/games';
import { cn } from '@/lib/utils';
import type { GameKey, RoomBundle } from '@/types/types';

type RoomView = 'chat' | 'game' | 'room';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [bundle, setBundle] = useState<RoomBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<RoomView>('chat');
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState<GameKey | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await getRoomBundle(roomId);
      if (!data) {
        setError('This room does not exist, or you are not one of its members.');
      } else {
        setBundle(data);
        setError(null);
      }
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_stats', filter: `room_id=eq.${roomId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `room_id=eq.${roomId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'achievements', filter: `room_id=eq.${roomId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, load]);

  // Keep the game on screen when it finishes: the session stops being "active"
  // the moment the last round resolves, but the players still need the reveal.
  useEffect(() => {
    const id = bundle?.activeSession?.id;
    if (id) setPinnedId(id);
  }, [bundle?.activeSession?.id]);

  useEffect(() => {
    if (!roomId || !user) return;
    void touchRoom(roomId, user.id);
    const timer = window.setInterval(() => {
      void touchRoom(roomId, user.id);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [roomId, user]);

  if (loading) {
    return (
      <AppShell title="Opening your room">
        <div className="flex items-center justify-center rounded-3xl border border-border bg-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !bundle || !user) {
    return (
      <AppShell title="Room unavailable">
        <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card md:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-balance font-display text-xl text-foreground">
            You cannot open this room
          </h2>
          <p className="mx-auto mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
            {error ?? 'This room is private to its two members.'}
          </p>
          <Button asChild className="mt-5 h-11 rounded-full px-6">
            <Link to="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to my rooms
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { room, members, stats, achievements, activeSession, recentSessions } = bundle;
  const expired = isRoomExpired(room);
  const isCreator = members.find((member) => member.user_id === user.id)?.role === 'creator';
  const partnerName =
    members.find((member) => member.user_id !== user.id)?.profile?.display_name ?? 'Partner';

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const selectGame = async (key: GameKey) => {
    if (expired) {
      toast.error('This room has closed, so new games cannot start.');
      return;
    }
    if (members.length < 2) {
      toast.error('Games unlock when your partner joins the room.');
      return;
    }
    if (activeSession) {
      if (activeSession.game_key === key) {
        setView('game');
      } else {
        toast.error('A game is already open. Finish or cancel it before starting another.');
      }
      return;
    }
    setStarting(key);
    try {
      await startGame(room.id, key);
      await load();
      setView('game');
    } catch (startError) {
      toast.error(friendlyError(startError));
    } finally {
      setStarting(null);
    }
  };

  const shownSession =
    activeSession ?? (pinnedId ? recentSessions.find((item) => item.id === pinnedId) ?? null : null);
  const gameOpen = view === 'game' && Boolean(shownSession);
  const gamesBrowser = view === 'game' && !shownSession;

  const leaveGame = () => {
    setPinnedId(null);
    setView('chat');
  };
  const stageHeight = 'h-[calc(100dvh-18rem)] min-h-[340px] lg:h-full lg:min-h-0';

  return (
    <AppShell fixed title={room.name}>
      <div className="flex h-full min-h-0 flex-col gap-2 md:gap-2.5">
        <section className="shrink-0 rounded-2xl border border-border bg-card px-2.5 py-2 shadow-card md:rounded-3xl md:px-3">
          <div className="flex items-center gap-2">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
              <HeartHandshake className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate font-display text-sm font-bold text-foreground md:text-base">
                  {room.name}
                </h1>
                {expired ? (
                  <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                    Closed
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[10px] text-muted-foreground">
                {members.length}/2 here ·{' '}
                {room.room_type === 'temporary'
                  ? formatCountdown(room.expires_at)
                  : 'No expiry'}
              </p>
            </div>

            {activeSession && view !== 'game' ? (
              <Button
                size="sm"
                onClick={() => setView('game')}
                className="h-8 shrink-0 rounded-full px-2.5 text-[11px] font-bold"
              >
                <Play className="mr-1 h-3 w-3" />
                Resume
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDetailsOpen(true)}
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Room details and code"
            >
              <Info className="h-4 w-4" />
            </Button>

            <RoomActionsMenu
              room={room}
              isCreator={Boolean(isCreator)}
              onChanged={() => void load()}
              className="h-9 w-9 shrink-0"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen((open) => !open)}
              className="hidden h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground md:inline-flex"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        </section>

        <div className="shrink-0 lg:hidden">
          <div className="grid grid-cols-3 gap-1 rounded-full border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setView('chat')}
              aria-pressed={view === 'chat'}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors',
                view === 'chat'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setView('game')}
              aria-pressed={view === 'game'}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors',
                view === 'game'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Games
            </button>
            <button
              type="button"
              onClick={() => setView('room')}
              aria-pressed={view === 'room'}
              className={cn(
                'flex min-h-11 items-center justify-center gap-1.5 rounded-full text-xs font-bold transition-colors',
                view === 'room'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Info className="h-3.5 w-3.5" />
              Room
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 gap-2.5">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {gameOpen && shownSession ? (
              <div
                key="game"
                className={cn(
                  'flex animate-in flex-col gap-2 fade-in slide-in-from-right-4 duration-300',
                  stageHeight,
                )}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    onClick={leaveGame}
                    className="h-11 shrink-0 rounded-full px-3 text-xs font-bold shadow-sm"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to Chat
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setQuitOpen(true)}
                    className="h-11 shrink-0 rounded-full border-foreground/20 px-3 text-xs"
                  >
                    <LogOut className="mr-1.5 h-3.5 w-3.5" />
                    Quit Game
                  </Button>
                  <span className="ml-auto hidden truncate text-[11px] text-muted-foreground sm:block">
                    Progress saves automatically
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                  <GameStage
                    session={shownSession}
                    userId={user.id}
                    members={members}
                    onChanged={() => void load()}
                    onExit={leaveGame}
                  />
                </div>
              </div>
            ) : gamesBrowser ? (
              <div
                key="browser"
                className={cn(
                  'flex animate-in flex-col gap-2 fade-in slide-in-from-right-4 duration-300',
                  stageHeight,
                )}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setView('chat')}
                    className="h-11 shrink-0 rounded-full px-3 text-xs font-bold shadow-sm"
                  >
                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                    Back to Chat
                  </Button>
                  <span className="truncate text-[11px] text-muted-foreground">
                    Pick a game to open it here
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
                  <GamesArea
                    roomId={room.id}
                    userId={user.id}
                    members={members}
                    expired={expired}
                    activeSession={activeSession}
                    recentSessions={recentSessions}
                    onChanged={() => void load()}
                  />
                </div>
              </div>
            ) : (
              <div
                key="chat"
                className={cn(
                  'flex animate-in flex-col fade-in slide-in-from-left-4 duration-300',
                  stageHeight,
                )}
              >
                {activeSession?.status === 'invited' && activeSession.invited_by !== user.id ? (
                  <div className="mb-2 flex shrink-0 items-center gap-2 rounded-2xl border border-primary/30 bg-primary/8 px-2.5 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card shadow-sm">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                    </span>
                    <p className="min-w-0 flex-1 text-[11px] leading-snug text-foreground">
                      <span className="font-bold">
                        {members.find((m) => m.user_id === activeSession.invited_by)?.profile
                          ?.display_name ?? 'Your partner'}
                      </span>{' '}
                      invited you to {gameMeta(activeSession.game_key).title}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setView('game')}
                      className="h-9 shrink-0 rounded-full px-3 text-[11px] font-bold"
                    >
                      Open
                    </Button>
                  </div>
                ) : null}
                <div
                  className={cn(
                    'min-h-0 flex-1 overflow-y-auto lg:hidden',
                    view !== 'room' && 'hidden',
                  )}
                >
                  <div className="space-y-3 pb-2">
                    <InvitePanel
                      room={room}
                      isCreator={Boolean(isCreator)}
                      memberCount={members.length}
                      onChanged={() => void load()}
                    />
                    <ProgressPanel
                      members={members}
                      stats={stats}
                      achievements={achievements}
                      recentSessions={recentSessions}
                    />
                  </div>
                </div>
                <div className={cn('min-h-0 flex-1', view !== 'chat' && 'hidden lg:block')}>
                  <ChatPanel
                    roomId={room.id}
                    userId={user.id}
                    members={members}
                    expired={expired}
                  />
                </div>
              </div>
            )}
          </div>

          {sidebarOpen ? (
            <aside className="hidden w-[300px] shrink-0 lg:flex lg:min-h-0 lg:flex-col">
              {gameOpen ? (
                <ChatPanel
                  roomId={room.id}
                  userId={user.id}
                  members={members}
                  expired={expired}
                />
              ) : (
                <GamesWidget
                  className="min-h-0 flex-1"
                  activeSession={activeSession}
                  selectedKey={activeSession?.game_key ?? null}
                  memberCount={members.length}
                  expired={expired}
                  starting={starting}
                  onSelect={(key) => void selectGame(key)}
                />
              )}
            </aside>
          ) : null}
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Room details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Room code
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono text-xl font-bold tracking-[0.22em] text-foreground">
                  {room.code}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="ml-auto h-9 shrink-0 rounded-full border-foreground/20"
                  onClick={() => void copyCode()}
                >
                  {copied ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                Share this with your partner. Only one more person can join.
              </p>
            </div>

            <InvitePanel
              room={room}
              isCreator={Boolean(isCreator)}
              memberCount={members.length}
              onChanged={() => void load()}
            />
            <ProgressPanel
              members={members}
              stats={stats}
              achievements={achievements}
              recentSessions={recentSessions}
            />
          </div>
        </DialogContent>
      </Dialog>

      {shownSession ? (
        <QuitGameDialog
          session={shownSession}
          userId={user.id}
          partnerName={partnerName}
          open={
            quitOpen ||
            Boolean(
              shownSession.quit_requested_by && shownSession.quit_requested_by !== user.id,
            )
          }
          onOpenChange={setQuitOpen}
          onChanged={() => void load()}
          onQuit={leaveGame}
        />
      ) : null}
    </AppShell>
  );
}
