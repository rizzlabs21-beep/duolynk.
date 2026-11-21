import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, LogOut, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError, updateDisplayName } from '@/lib/api';
import { getChatProviderStatus } from '@/lib/chat/provider';

export default function SettingsPage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const provider = getChatProviderStatus();

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      await updateDisplayName(user.id, name.trim());
      await refreshProfile();
      toast.success('Name updated');
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Settings"
      description="Your account details and the current state of the chat integration."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <UserRound className="h-4 w-4 text-primary" />
            Your profile
          </h2>

          <form onSubmit={save} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                className="h-12 px-3 text-base"
              />
              <p className="text-xs text-muted-foreground">
                This is the name your partner sees in the room.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile?.username ?? ''}
                readOnly
                disabled
                className="h-12 px-3 text-base"
              />
              <p className="text-xs text-muted-foreground">
                Usernames are fixed after sign-up so your partner always knows who they are talking to.
              </p>
            </div>

            <Button type="submit" className="h-11 rounded-full px-6" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </form>
        </section>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" />
              Chat transport
            </h2>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-1 text-xs font-bold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {provider.label}
              </span>
              <span className="text-xs text-muted-foreground">live</span>
            </div>

            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
              {provider.summary}
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-muted p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Nexcon Chat SDK — connected
              </p>
              <p className="mt-1.5 text-pretty text-xs leading-relaxed text-foreground/80">
                Messages are sent and received through Nexconn in real time. Your App Secret stays on
                the server and is never sent to the browser.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-card md:p-6">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Privacy
            </h2>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
              Room messages, games and scores are readable only by the two members of that room.
              Access is enforced in the database, not just in the interface.
            </p>
            <Button
              variant="ghost"
              className="mt-4 h-11 w-full justify-start rounded-full px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                await signOut();
                navigate('/');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out of this device
            </Button>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
