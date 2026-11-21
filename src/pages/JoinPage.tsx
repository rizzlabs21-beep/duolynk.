import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  Infinity as InfinityIcon,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError, joinRoomByCode, previewRoomByCode } from '@/lib/api';
import { formatCountdown, roomTypeLabel } from '@/lib/format';
import type { RoomPreview } from '@/types/types';

export default function JoinPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialCode = (params.get('code') ?? '').toUpperCase();

  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState<RoomPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (value: string) => {
    const clean = value.trim().toUpperCase();
    if (clean.length < 6) return;
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await previewRoomByCode(clean);
      setPreview(data);
    } catch (lookupError) {
      setPreview(null);
      setError(friendlyError(lookupError));
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (user && initialCode) void lookup(initialCode);
  }, [user, initialCode, lookup]);

  const join = async () => {
    if (!preview) return;
    setJoining(true);
    setError(null);
    try {
      const roomId = await joinRoomByCode(code.trim().toUpperCase());
      toast.success('You are in. Say hello to your partner.');
      navigate(`/app/rooms/${roomId}`, { replace: true });
    } catch (joinError) {
      setError(friendlyError(joinError));
      setJoining(false);
    }
  };

  const nextParam = `/join?code=${encodeURIComponent(code.trim().toUpperCase())}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-[76px] w-full max-w-3xl items-center justify-between px-4">
          <Link to="/" aria-label="DUOLYNK home">
            <Logo className="h-14" />
          </Link>
          <Link to="/app" className="text-sm font-semibold text-muted-foreground hover:text-primary">
            Go to my rooms
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-primary" />
          Join a room
        </span>
        <h1 className="mt-4 text-balance font-display text-3xl leading-tight text-foreground md:text-4xl">
          Enter the code your partner sent you.
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
          A room holds exactly two people. You need your own DUOLYNK account before you can join, so
          the room knows who is inside.
        </p>

        <div className="mt-7 rounded-3xl border border-border bg-card p-5 shadow-card md:p-7">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(code);
            }}
            className="space-y-3"
          >
            <Label htmlFor="code">Room code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase());
                  setPreview(null);
                  setError(null);
                }}
                placeholder="ABCD2345"
                maxLength={8}
                autoComplete="off"
                className="h-12 flex-1 px-3 font-display text-lg tracking-[0.3em] uppercase"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-12 shrink-0 rounded-full border-foreground/20 px-6"
                disabled={code.trim().length < 6 || loadingPreview}
              >
                {loadingPreview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Look up room
              </Button>
            </div>
          </form>

          {error ? (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {authLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your session…
            </div>
          ) : !user ? (
            <div className="mt-6 rounded-2xl border border-border bg-muted p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Lock className="h-4 w-4 text-primary" />
                Sign in before joining
              </p>
              <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                Your partner’s room is private. Sign in to your own account, or create one, and we
                will bring you straight back to this code.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button asChild className="h-11 rounded-full px-5">
                  <Link to={`/signin?next=${encodeURIComponent(nextParam)}`}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-full border-foreground/20 px-5">
                  <Link to={`/signup?next=${encodeURIComponent(nextParam)}`}>Create an account</Link>
                </Button>
              </div>
            </div>
          ) : preview ? (
            <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground/80">
                  {preview.room_type === 'temporary' ? (
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <InfinityIcon className="h-3.5 w-3.5 text-primary" />
                  )}
                  {roomTypeLabel(preview.room_type)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground/80">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {preview.member_count}/2 members
                </span>
                {preview.room_type === 'temporary' ? (
                  <span className="rounded-full bg-card px-3 py-1 text-xs font-bold text-muted-foreground">
                    {formatCountdown(preview.expires_at)}
                  </span>
                ) : null}
              </div>

              <h2 className="mt-3 text-balance font-display text-2xl text-foreground">
                {preview.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Created by {preview.creator_name ?? 'your partner'}
              </p>

              {preview.already_member ? (
                <Button
                  className="mt-4 h-12 w-full rounded-full"
                  onClick={() => navigate(`/app/rooms/${preview.id}`)}
                >
                  Open this room
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : preview.member_count >= 2 ? (
                <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  This room already has two members.
                </p>
              ) : (
                <Button className="mt-4 h-12 w-full rounded-full" onClick={join} disabled={joining}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Join this room
                </Button>
              )}
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-pretty text-xs leading-relaxed text-muted-foreground">
          Codes are eight characters, randomly generated and revocable. If a code stops working, ask
          your partner to renew it from inside the room.
        </p>
      </main>
    </div>
  );
}
