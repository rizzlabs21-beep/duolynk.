import { CalendarClock, Infinity as InfinityIcon, Lock, ShieldCheck } from 'lucide-react';

const OPTIONS = [
  {
    icon: CalendarClock,
    title: 'Temporary room',
    badge: 'Ends on a date',
    body: 'Choose 24 hours, 7 days or 30 days when you create it. The expiry date is shown before you confirm, and the room closes itself when that moment arrives.',
    points: [
      'Expiry is set at creation and shown to both partners',
      'Chat and games stop accepting new activity once it expires',
      'Good for a trip, a countdown, or a short shared project',
    ],
    tone: 'bg-accent/20',
  },
  {
    icon: InfinityIcon,
    title: 'Permanent room',
    badge: 'Stays open',
    body: 'No expiry date. The room stays available for as long as you both want it, and everything you have played stays with it.',
    points: [
      'No expiry date at all',
      'The creator can close it when you are both finished',
      'Good for the room you keep coming back to',
    ],
    tone: 'bg-secondary/30',
  },
];

export function RoomOptions() {
  return (
    <section id="rooms" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Room options
          </span>
          <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.6rem]">
            Temporary or permanent. You choose once.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Both room types work exactly the same way while they are open. The only difference is
            whether the room has an end date.
          </p>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <article
              key={option.title}
              className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-card md:p-7"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${option.tone} text-foreground`}>
                  <option.icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                  {option.badge}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">{option.title}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {option.body}
              </p>
              <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                {option.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-foreground/85">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-pretty">{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center md:p-6">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground/8 text-foreground">
            <Lock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">Private by design, in both cases</h3>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
              A room holds two members. Access rules are enforced in the database, so a signed-in
              stranger who guesses a room address still cannot read its chat, games or details.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
