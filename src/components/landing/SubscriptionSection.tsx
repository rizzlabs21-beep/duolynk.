import { Check, Crown, Sparkles } from 'lucide-react';

const PERKS = [
  'Unlimited rooms and longer history',
  'Extra game packs and seasonal decks',
  'Custom room themes and shared albums',
];

export function SubscriptionSection() {
  return (
    <section id="subscriptions" className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-[1504px] px-4 py-14 md:px-8 md:py-20">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="grid gap-0 md:grid-cols-[1.25fr_1fr]">
            <div className="p-6 md:p-9">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-3 w-3" />
                Coming soon
              </span>
              <h2 className="mt-3 text-balance font-display text-2xl leading-tight text-foreground md:text-3xl">
                Subscriptions
              </h2>
              <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
                A premium tier for couples who want more room to play. Nothing is on sale yet — the
                free experience stays exactly as it is today.
              </p>

              <ul className="mt-4 space-y-2">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground/85">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                    <span className="text-pretty">{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-center gap-3 border-t border-border bg-gradient-to-br from-primary/10 via-secondary/15 to-accent/10 p-6 md:border-l md:border-t-0 md:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                <Crown className="h-6 w-6" />
              </span>
              <p className="font-display text-lg font-bold text-foreground">Not available yet</p>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                We are still shaping this. Everything you use today — rooms, chat, games and Duo
                Points — stays free while we build it.
              </p>
              <span className="inline-flex w-fit items-center rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground">
                No payment details needed
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
