import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError, isUsernameAvailable } from '@/lib/api';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export default function SignUpPage() {
  const { signUpWithUsername, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/app';

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, navigate, next]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!USERNAME_PATTERN.test(username)) {
      setError('Usernames use 3–20 letters, numbers or underscores.');
      return;
    }
    if (password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please accept the User Agreement and Privacy Policy.');
      return;
    }

    setSubmitting(true);
    try {
      const available = await isUsernameAvailable(username);
      if (!available) {
        setError('That username is already taken.');
        setSubmitting(false);
        return;
      }
    } catch (checkError) {
      setError(friendlyError(checkError));
      setSubmitting(false);
      return;
    }

    const result = await signUpWithUsername(username, password, displayName || username);
    setSubmitting(false);

    if (result.error) {
      setError(friendlyError(result.error));
      return;
    }

    toast.success('Your account is ready');
    navigate(next, { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Each partner needs their own account, so the room always knows who is who."
      footer={
        <span>
          Already have an account?{' '}
          <Link
            to={`/signin${next !== '/app' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="font-bold text-primary hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Your name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How your partner will see you"
            autoComplete="name"
            className="h-12 px-3"
            maxLength={40}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.replace(/\s/g, ''))}
            placeholder="letters, numbers, underscores"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="h-12 px-3"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="h-12 px-3 pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat it"
              autoComplete="new-password"
              className="h-12 px-3"
              required
            />
          </div>
        </div>

        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-border bg-muted/60 p-3">
          <Checkbox
            checked={agreed}
            onCheckedChange={(value) => setAgreed(value === true)}
            className="mt-0.5"
          />
          <span className="text-pretty text-xs leading-relaxed text-muted-foreground">
            I agree to the DUOLYNK User Agreement and Privacy Policy. My room content is visible only
            to me and the partner I invite.
          </span>
        </label>

        {error ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
