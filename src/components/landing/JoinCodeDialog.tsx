import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JoinCodeDialogProps {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function JoinCodeDialog({
  label,
  icon = <KeyRound className="mr-2 h-4 w-4" />,
  variant = 'outline',
  size = 'default',
  className,
}: JoinCodeDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');

  const clean = code.trim().toUpperCase();
  const ready = clean.length >= 6;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {icon}
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <KeyRound className="h-5 w-5 text-primary" />
            Join a room
          </DialogTitle>
          <DialogDescription className="text-pretty">
            Enter the eight-character code your partner shared with you.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready) return;
            setOpen(false);
            navigate(`/join?code=${encodeURIComponent(clean)}`);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="join-code">Room code</Label>
            <Input
              id="join-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABCD2345"
              maxLength={8}
              autoComplete="off"
              className="h-12 px-3 text-center font-display text-lg tracking-[0.3em] uppercase"
            />
          </div>

          <Button type="submit" className="h-12 w-full rounded-full" disabled={!ready}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
            You will be asked to sign in with your own account before the room opens. A room holds
            exactly two people.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
