import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, KeyRound, MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  {
    icon: UserPlus,
    title: 'Each of you creates an account',
    body: 'You both sign in as yourselves. DUOLYNK never merges two people into one login, so the room always knows who is who.',
  },
  {
    icon: KeyRound,
    title: 'One of you creates the room',
    body: 'Name the room and choose temporary or permanent. The room is created instantly and belongs to the two of you.',
  },
  {
    icon: MessageCircle,
    title: 'Share the code or private link',
    body: 'You get an eight-character code and a private link. Send it however you like — it only works for one more person.',
  },
  {
    icon: Gamepad2,
    title: 'Your partner joins and you begin',
    body: 'They sign in, enter the code, and the room opens for both of you: live chat, four games, and everything you have played so far.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            How a room works
          </span>
          <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.6rem]">
            Four steps from apart to together.
          </h2>
          <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            There is no feed, no friend list and no discovery. A room exists because one of you made
            it and the other one joined it.
          </p>
        </div>

        <ol className="mt-7 grid gap-4 md:grid-cols-2 md:gap-5">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="group relative flex gap-4 rounded-3xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-hover md:p-6"
            >
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="font-display text-sm font-bold text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-balance text-lg font-bold leading-snug text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 rounded-3xl border border-border bg-secondary/20 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <p className="text-pretty text-sm font-semibold text-foreground md:text-base">
            Ready to open your room? It takes less than a minute.
          </p>
          <Button asChild className="h-12 shrink-0 rounded-full px-6">
            <Link to="/app/rooms/new">
              Create a Room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
