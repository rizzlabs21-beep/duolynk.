import { Heart, Lock, Users } from 'lucide-react';

const VALUES = [
  {
    icon: Users,
    title: 'Two people, not a crowd',
    body: 'DUOLYNK has no public rooms, no discovery and no follower counts. A room is a place for two.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    body: 'Invitation codes are long, random and revocable. Access is checked against your account, not just hidden in the interface.',
  },
  {
    icon: Heart,
    title: 'Built for the everyday',
    body: 'A quick message, one round of a game, a shared score. Small rituals are what make distance feel shorter.',
  },
];

export function AboutSection() {
  return (
    <section id="about" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              About DUOLYNK
            </span>
            <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.6rem]">
              A bridge for hearts, built around one shared room.
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              DUOLYNK started from a simple observation: most apps give couples a chat thread and
              leave it there. A thread is easy to lose in a busy day. A room is somewhere you go
              together.
            </p>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
              So the room is the product. It holds your conversation, your games, your scores and
              your invitation code. Everything else in DUOLYNK exists to get you both into that room
              and keep it feeling like yours.
            </p>
          </div>

          <div className="grid gap-4">
            {VALUES.map((value) => (
              <div
                key={value.title}
                className="flex gap-4 rounded-3xl border border-border bg-card p-5 shadow-card md:p-6"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/30 text-secondary-foreground">
                  <value.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground">{value.title}</h3>
                  <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                    {value.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
