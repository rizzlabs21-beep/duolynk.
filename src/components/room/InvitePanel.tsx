import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, Link2, Loader2, LogOut, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { closeRoom, friendlyError, leaveRoom, regenerateRoomCode } from '@/lib/api';
import { inviteLink } from '@/lib/format';
import type { Room } from '@/types/types';

interface InvitePanelProps {
  room: Room;
  isCreator: boolean;
  memberCount: number;
  onChanged: () => void;
}

export function InvitePanel({ room, isCreator, memberCount, onChanged }: InvitePanelProps) {
  const navigate = useNavigate();
  const [code, setCode] = useState(room.code);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [busy, setBusy] = useState<'renew' | 'close' | 'leave' | null>(null);

  const copy = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      toast.success(kind === 'code' ? 'Code copied' : 'Invite link copied');
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error('Your browser blocked clipboard access. Select the text and copy it manually.');
    }
  };

  const renew = async () => {
    setBusy('renew');
    try {
      const next = await regenerateRoomCode(room.id);
      setCode(next);
      toast.success('New code created. The old one no longer works.');
      onChanged();
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    setBusy('close');
    try {
      await closeRoom(room.id);
      toast.success('Room closed');
      navigate('/app', { replace: true });
    } catch (error) {
      toast.error(friendlyError(error));
      setBusy(null);
    }
  };

  const leave = async () => {
    setBusy('leave');
    try {
      await leaveRoom(room.id);
      toast.success('You left the room');
      navigate('/app', { replace: true });
    } catch (error) {
      toast.error(friendlyError(error));
      setBusy(null);
    }
  };

  const link = inviteLink(code);

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Link2 className="h-4 w-4 text-primary" />
          Invite your partner
        </h2>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {memberCount}/2 joined
        </span>
      </div>

      <p className="mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">
        {memberCount < 2
          ? 'Send this code to your partner. They need their own account to join.'
          : 'Your partner is in. Renew the code if you ever want to invalidate the old one.'}
      </p>

      <div className="mt-4 rounded-2xl border border-border bg-muted p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Room code
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 break-all font-display text-xl font-bold tracking-[0.22em] text-foreground">
            {code}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full border-foreground/20"
            onClick={() => copy(code, 'code')}
            aria-label="Copy room code"
          >
            {copied === 'code' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{link}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 rounded-full px-3 text-xs"
          onClick={() => copy(link, 'link')}
        >
          {copied === 'link' ? <Check className="mr-1 h-3.5 w-3.5 text-primary" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
          Copy link
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {isCreator ? (
          <>
            <Button
              variant="outline"
              className="h-11 w-full rounded-full border-foreground/20"
              onClick={renew}
              disabled={busy !== null}
            >
              {busy === 'renew' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Renew code
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={close}
              disabled={busy !== null}
            >
              {busy === 'close' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Close this room
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            className="h-11 w-full rounded-full text-muted-foreground hover:text-foreground"
            onClick={leave}
            disabled={busy !== null}
          >
            {busy === 'leave' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Leave this room
          </Button>
        )}
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        Only signed-in members of this room can read its messages or games.
      </p>
    </section>
  );
}
