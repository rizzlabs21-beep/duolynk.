import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Infinity as InfinityIcon, Loader2, Lock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createRoom, friendlyError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { RoomType } from '@/types/types';

const DURATIONS = [
  { hours: 24, label: '24 hours', hint: 'Closes tomorrow at this time' },
  { hours: 168, label: '7 days', hint: 'Closes one week from now' },
  { hours: 720, label: '30 days', hint: 'Closes one month from now' },
];

export default function CreateRoomPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('permanent');
  const [duration, setDuration] = useState(168);
  const [leaderboard, setLeaderboard] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give your room a name.');
      return;
    }

    setSubmitting(true);
    try {
      const room = await createRoom(
        name.trim(),
        type,
        type === 'temporary' ? duration : null,
        leaderboard,
      );
      toast.success('Room created. Share the code with your partner.');
      navigate(`/app/rooms/${room.id}`, { replace: true });
    } catch (createError) {
      setError(friendlyError(createError));
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Create a room"
      description="This room belongs to the two of you. Choose how long it should stay open, then share the code."
    >
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
            <Label htmlFor="room-name" className="text-sm font-bold">
              Room name
            </Label>
            <Input
              id="room-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Our little room"
              maxLength={60}
              className="mt-2 h-12 px-3 text-base"
              required
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Both of you will see this name at the top of the room.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
            <p className="text-sm font-bold text-foreground">Room type</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setType('permanent')}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  type === 'permanent'
                    ? 'border-primary bg-primary/8 ring-2 ring-primary/25'
                    : 'border-border bg-muted/40 hover:border-foreground/25',
                )}
                aria-pressed={type === 'permanent'}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/35 text-secondary-foreground">
                  <InfinityIcon className="h-5 w-5" />
                </span>
                <span className="mt-3 block font-display text-base font-bold text-foreground">
                  Permanent
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  No expiry date. Stays open until the creator closes it.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setType('temporary')}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  type === 'temporary'
                    ? 'border-primary bg-primary/8 ring-2 ring-primary/25'
                    : 'border-border bg-muted/40 hover:border-foreground/25',
                )}
                aria-pressed={type === 'temporary'}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <span className="mt-3 block font-display text-base font-bold text-foreground">
                  Temporary
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  Closes automatically after the duration you pick.
                </span>
              </button>
            </div>

            {type === 'temporary' ? (
              <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm font-bold text-foreground">When should this room close?</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {DURATIONS.map((option) => (
                    <button
                      key={option.hours}
                      type="button"
                      onClick={() => setDuration(option.hours)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-left transition-colors',
                        duration === option.hours
                          ? 'border-primary bg-card'
                          : 'border-border bg-card/60 hover:border-foreground/25',
                      )}
                      aria-pressed={duration === option.hours}
                    >
                      <span className="block text-sm font-bold text-foreground">{option.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-pretty text-xs leading-relaxed text-muted-foreground">
                  Once the room expires, chat and games stop accepting new activity. Your partner
                  will see the expiry date in the room header before it happens.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-pretty text-xs leading-relaxed text-muted-foreground">
                A permanent room has no expiry date. You can still close it later from the room
                settings if you both decide to.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">Duo leaderboard</p>
                <p className="mt-1 text-pretty text-xs leading-relaxed text-muted-foreground">
                  When this is on, every finished game in this room adds Duo Points to the global
                  leaderboard. Turn it off for a private room that never ranks.
                </p>
              </div>
              <Switch
                checked={leaderboard}
                onCheckedChange={setLeaderboard}
                aria-label="Include this room in the Duo leaderboard"
                className="mt-0.5 shrink-0"
              />
            </div>
            <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              {leaderboard
                ? 'Ranked room — points count toward the leaderboard.'
                : 'Private room — games still work, but no points are ranked.'}
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Create room and get the code
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            One room at a time. If you already have a room, leave or delete it first.
          </p>
        </div>

        <aside className="space-y-3">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <p className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <Lock className="h-4 w-4 text-primary" />
              What happens next
            </p>
            <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary">1</span>
                <span className="text-pretty">
                  DUOLYNK creates the room and gives you an eight-character code plus a private link.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary">2</span>
                <span className="text-pretty">
                  Send the code to your partner. It only works for one more person.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-display font-bold text-primary">3</span>
                <span className="text-pretty">
                  They sign in with their own account and join. Chat and games unlock for both of you.
                </span>
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-border bg-secondary/20 p-5">
            <p className="text-sm font-bold text-foreground">You can change your mind</p>
            <p className="mt-1.5 text-pretty text-xs leading-relaxed text-muted-foreground">
              The creator can renew the code at any time, which immediately invalidates the old one.
              Nobody who has not joined can get in with a revoked code.
            </p>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}
