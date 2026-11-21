import { Award, Sparkles, Trophy } from 'lucide-react';

const ITEMS = [
  {
    icon: Sparkles,
    title: 'Points from finished games',
    body: 'Points are added only when a round is actually resolved by both of you. Nothing is awarded for opening a page.',
  },
  {
    icon: Award,
    title: 'Achievements you earned',
    body: 'Badges appear when you complete a game together, win a Brain Battle, or finish every mission in Two Minds.',
  },
  {
    icon: Trophy,
    title: 'Your head-to-head record',
    body: 'Each room keeps its own tally of games played and games won, so the two of you can see how it is going.',
  },
];

export function ProgressSection() {
  return (
    <section id="progress" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-card">
          <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
            <div className="p-6 md:p-10">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Shared progress
              </span>
              <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.4rem]">
                A little record of the time you spend together.
              </h2>
              <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
                Progress is a side effect of playing, not the point of the app. It exists so the two
                of you can look back at what you have done — nothing here is invented, and nothing is
                awarded without a real game behind it.
              </p>

              <ul className="mt-7 space-y-4">
                {ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-accent-foreground">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold leading-snug text-foreground">{item.title}</h3>
                      <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex flex-col justify-center gap-3 border-t border-border bg-secondary/20 p-6 md:border-l md:border-t-0 md:p-10">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Points in this room
                </p>
                <p className="mt-2 font-display text-3xl font-bold text-foreground">Earned together</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ten points per correct prediction or match, up to twenty for a fast Brain Battle
                  answer, fifteen for each solved mission.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Achievements
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Played a game', 'Brain Battle champion', 'Mission master'].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground/80"
                    >
                      <Award className="h-3.5 w-3.5 text-primary" />
                      {label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Badges unlock from real completed games. There is no sample board and no invented
                  ranking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
