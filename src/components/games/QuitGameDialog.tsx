import { useState } from 'react';
import { Loader2, LogOut, ShieldQuestion, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cancelGameQuit, friendlyError, requestGameQuit, respondGameQuit } from '@/lib/api';
import type { GameSession } from '@/types/types';

interface QuitGameDialogProps {
  session: GameSession;
  userId: string;
  partnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
  onQuit: () => void;
}

export function QuitGameDialog({
  session,
  userId,
  partnerName,
  open,
  onOpenChange,
  onChanged,
  onQuit,
}: QuitGameDialogProps) {
  const [busy, setBusy] = useState<'request' | 'accept' | 'decline' | 'cancel' | null>(null);

  const requestedBy = session.quit_requested_by ?? null;
  const iRequested = requestedBy === userId;
  const partnerRequested = Boolean(requestedBy) && requestedBy !== userId;

  const run = async (
    kind: 'request' | 'accept' | 'decline' | 'cancel',
    action: () => Promise<void>,
  ) => {
    setBusy(kind);
    try {
      await action();
      onChanged();
      if (kind === 'accept') {
        onOpenChange(false);
        onQuit();
      }
      if (kind === 'decline' || kind === 'cancel') onOpenChange(false);
    } catch (error) {
      toast.error(friendlyError(error));
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // A pending request from the partner must be answered, not dismissed.
        if (!next && partnerRequested) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto md:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {partnerRequested
              ? `${partnerName} wants to quit`
              : iRequested
                ? 'Quit request sent'
                : 'Quit this game?'}
          </DialogTitle>
          <DialogDescription>
            {partnerRequested
              ? 'Both of you have to agree before the game ends. Accepting closes this session for both of you.'
              : iRequested
                ? `Waiting for ${partnerName} to accept or decline. The game stays paused until they answer.`
                : 'Your partner will get a request to end this game. Nothing ends until you both agree.'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 flex items-start gap-2 rounded-2xl bg-muted px-3 py-2.5">
          <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Quitting ends the current session. Points already earned stay in your room, and you can
            start another game right away.
          </p>
        </div>

        {partnerRequested ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-foreground/20"
              disabled={busy !== null}
              onClick={() => void run('decline', () => respondGameQuit(session.id, false))}
            >
              {busy === 'decline' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Keep playing
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              disabled={busy !== null}
              onClick={() => void run('accept', () => respondGameQuit(session.id, true))}
            >
              {busy === 'accept' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Accept quit
            </Button>
          </div>
        ) : iRequested ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full rounded-full border-foreground/20"
            disabled={busy !== null}
            onClick={() => void run('cancel', () => cancelGameQuit(session.id))}
          >
            {busy === 'cancel' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Cancel my request
          </Button>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-foreground/20"
              disabled={busy !== null}
              onClick={() => onOpenChange(false)}
            >
              Keep playing
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              disabled={busy !== null}
              onClick={() => void run('request', () => requestGameQuit(session.id))}
            >
              {busy === 'request' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Ask to quit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
