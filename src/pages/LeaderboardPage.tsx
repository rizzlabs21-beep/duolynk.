import { useCallback, useEffect, useState } from 'react';
import { Crown, Loader2, RefreshCw, Sparkles, Trophy } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError, getLeaderboard, type LeaderboardEntry } from '@/lib/api';
import { initialsOf } from '@/lib/format';
import { cn } from '@/lib/utils';

function winRate(row: LeaderboardEntry): string {
  if (row.games_played === 0) return '—';
  return `${Math.round((row.games_won / row.games_played) * 100)}%`;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getLeaderboard(50));
      setError(null);
    } catch (loadError) {
      setError(friendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const myIndex = rows.findIndex((row) => row.user_id === user?.id);
  const mine = myIndex >= 0 ? rows[myIndex] : null;

  return (
    <AppShell
      title="Duo leaderboard"
      description="Duo Points are earned together — every finished game, every win, and every minute you actually play. Rooms that opt out of the leaderboard still play, but do not rank."
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-primary/12 via-secondary/15 to-accent/12 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                <Trophy className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Your standing
                </p>
                <p className="mt-0.5 font-display text-xl font-bold text-foreground">
                  {mine ? `Rank #${myIndex + 1}` : 'Not ranked yet'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {mine
                    ? `${mine.points} Duo Points · ${mine.games_played} games played`
                    : 'Finish a game in a leaderboard room to appear here.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:shrink-0">
              <div className="rounded-2xl bg-card/80 px-3 py-2 text-center">
                <p className="font-display text-lg font-bold text-foreground">{mine?.points ?? 0}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">Points</p>
              </div>
              <div className="rounded-2xl bg-card/80 px-3 py-2 text-center">
                <p className="font-display text-lg font-bold text-foreground">
                  {mine?.games_won ?? 0}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">Wins</p>
              </div>
              <div className="rounded-2xl bg-card/80 px-3 py-2 text-center">
                <p className="font-display text-lg font-bold text-foreground">
                  {mine ? winRate(mine) : '—'}
                </p>
                <p className="text-[10px] font-semibold text-muted-foreground">Win rate</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
              <Crown className="h-4 w-4 text-primary" />
              Top players
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs text-muted-foreground"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 h-9 rounded-full"
                onClick={() => void load()}
              >
                Try again
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="mt-3 font-display text-base font-bold text-foreground">
                No ranked games yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-pretty text-sm text-muted-foreground">
                Create a room with the leaderboard turned on, play a game together, and the first
                points land here.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-max text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="whitespace-nowrap px-4 py-2.5 font-bold">#</th>
                    <th className="whitespace-nowrap px-4 py-2.5 font-bold">Player</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-bold">Points</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-bold">Games</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-bold">Wins</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-bold">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isMe = row.user_id === user?.id;
                    const name = row.profile?.display_name ?? 'Player';
                    return (
                      <tr
                        key={row.user_id}
                        className={cn(
                          'border-b border-border/60 last:border-0',
                          isMe && 'bg-primary/5',
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold',
                              index === 0
                                ? 'bg-primary text-primary-foreground'
                                : index < 3
                                  ? 'bg-secondary/40 text-secondary-foreground'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/35 font-display text-[10px] font-bold text-secondary-foreground">
                              {initialsOf(name)}
                            </span>
                            <span className="font-semibold text-foreground">{name}</span>
                            {isMe ? (
                              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                                You
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-display font-bold text-foreground">
                          {row.points}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                          {row.games_played}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                          {row.games_won}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">
                          {winRate(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
          Points come from game results plus a small bonus for time spent playing. Rooms created
          with the leaderboard switched off never contribute to these rankings.
        </p>
      </div>
    </AppShell>
  );
}
