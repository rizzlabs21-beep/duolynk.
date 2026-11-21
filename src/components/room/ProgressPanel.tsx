import { Award, Gamepad2, Trophy } from 'lucide-react';
import { formatRelative, initialsOf } from '@/lib/format';
import { gameMeta } from '@/lib/games';
import type { Achievement, GameSession, RoomMemberWithProfile, RoomStats } from '@/types/types';

interface ProgressPanelProps {
  members: RoomMemberWithProfile[];
  stats: RoomStats[];
  achievements: Achievement[];
  recentSessions: GameSession[];
}

export function ProgressPanel({ members, stats, achievements, recentSessions }: ProgressPanelProps) {
  const finished = recentSessions.filter((session) => session.status === 'finished');

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
        <Trophy className="h-4 w-4 text-primary" />
        Shared progress
      </h2>

      <div className="mt-3 space-y-2">
        {members.map((member) => {
          const stat = stats.find((entry) => entry.user_id === member.user_id);
          return (
            <div
              key={member.user_id}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-muted/40 px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/40 font-display text-[10px] font-bold text-secondary-foreground">
                {initialsOf(member.profile?.display_name ?? 'Partner')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {member.profile?.display_name ?? 'Partner'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {stat?.games_played ?? 0} played · {stat?.games_won ?? 0} won
                </p>
              </div>
              <span className="shrink-0 font-display text-sm font-bold text-primary">
                {stat?.points ?? 0} pts
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Award className="h-3.5 w-3.5" />
          Achievements
        </p>
        {achievements.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Nothing yet. Finish a game together and the first badge appears here.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {achievements.slice(0, 8).map((achievement) => (
              <span
                key={achievement.id}
                className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground/80"
              >
                {achievement.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Gamepad2 className="h-3.5 w-3.5" />
          Recent games
        </p>
        {finished.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No completed games in this room yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {finished.slice(0, 4).map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-2.5 py-2"
              >
                <span className="min-w-0 truncate text-xs font-semibold text-foreground/85">
                  {gameMeta(session.game_key).short}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {session.finished_at ? formatRelative(session.finished_at) : 'finished'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
