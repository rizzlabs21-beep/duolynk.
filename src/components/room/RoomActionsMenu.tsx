import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { closeRoom, deleteRoom, friendlyError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Room } from '@/types/types';

interface RoomActionsMenuProps {
  room: Room;
  isCreator: boolean;
  onChanged: () => void;
  onDeleted?: () => void;
  className?: string;
}

export function RoomActionsMenu({
  room,
  isCreator,
  onChanged,
  onDeleted,
  className,
}: RoomActionsMenuProps) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<'close' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const closed = room.status === 'closed';

  const run = async (action: 'close' | 'delete') => {
    setBusy(true);
    try {
      if (action === 'close') {
        await closeRoom(room.id);
        toast.success('Room closed. It stays readable for both of you.');
        setConfirm(null);
        onChanged();
      } else {
        await deleteRoom(room.id);
        toast.success('Room deleted.');
        setConfirm(null);
        if (onDeleted) onDeleted();
        else {
          onChanged();
          navigate('/app');
        }
      }
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn('h-11 w-11 shrink-0 rounded-full border-foreground/20', className)}
            aria-label="Room actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={closed}
            onSelect={() => setConfirm('close')}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            Close room
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!isCreator}
            onSelect={() => setConfirm('delete')}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete room
          </DropdownMenuItem>
          {!isCreator ? (
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Only the creator can delete this room.
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'delete' ? 'Delete this room?' : 'Close this room?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'delete'
                ? 'The room, its members, game history and points are removed for both of you. This cannot be undone.'
                : 'Chat and new games stop for both of you. Everything already here stays readable, and the room can no longer be reopened.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it open</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                if (confirm) void run(confirm);
              }}
              className={confirm === 'delete' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {confirm === 'delete' ? 'Delete room' : 'Close room'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
