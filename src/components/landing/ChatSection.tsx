import { Link } from 'react-router-dom';
import { ArrowRight, Check, Lock, MessageCircle, Radio, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NEXCON_INTEGRATION_NOTE } from '@/lib/chat/provider';

const POINTS = [
  {
    icon: Radio,
    title: 'Delivered while you are both there',
    body: 'A message appears on your partner’s screen as soon as it is sent, without refreshing the page.',
  },
  {
    icon: Lock,
    title: 'Only the two of you can read it',
    body: 'Room access is checked against your account on every read and every write, not just in the interface.',
  },
  {
    icon: MessageCircle,
    title: 'The conversation stays with the room',
    body: 'Reopen the room tomorrow and the messages are still there, in order, with who said what.',
  },
];

export function ChatSection() {
  return (
    <section id="chat" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Chat together
            </span>
            <h2 className="mt-2 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.6rem]">
              One conversation, in the room you share.
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Chat is not a separate inbox you have to remember to open. It lives inside the room,
              next to the games, so talking and playing are the same place.
            </p>

            <ul className="mt-7 space-y-4">
              {POINTS.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/30 text-secondary-foreground">
                    <point.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold leading-snug text-foreground">{point.title}</h3>
                    <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-2xl border border-border bg-muted p-4">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Chat transport
              </p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground/85">
                {NEXCON_INTEGRATION_NOTE}
              </p>
              <p className="mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">
                Nothing is simulated: every message you send reaches your partner’s screen.
              </p>
            </div>
          </div>

          <div className="relative">
            <div
              className="absolute -inset-4 rounded-[2.5rem] bg-secondary/25 blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-bold text-foreground">
                    Our little room
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Temporary room · 2 members
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted px-2.5 py-1 font-display text-[11px] font-bold tracking-[0.18em] text-muted-foreground">
                  ABCD2345
                </span>
              </div>

              <div className="space-y-3 px-5 py-5" aria-hidden="true">
                <div className="flex justify-start">
                  <div className="w-[62%] space-y-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="h-2.5 w-full rounded-full bg-foreground/12" />
                    <div className="h-2.5 w-4/5 rounded-full bg-foreground/12" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="w-[54%] space-y-2 rounded-2xl rounded-br-md bg-primary/15 px-4 py-3">
                    <div className="h-2.5 w-full rounded-full bg-primary/35" />
                    <div className="h-2.5 w-2/3 rounded-full bg-primary/35" />
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="w-[46%] space-y-2 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                    <div className="h-2.5 w-full rounded-full bg-foreground/12" />
                  </div>
                </div>
                <p className="pt-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Your real messages appear here
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-border px-4 py-3">
                <div className="flex h-11 flex-1 items-center rounded-full border border-border bg-background px-4 text-sm text-muted-foreground">
                  Write something to your partner…
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {['Realtime delivery', 'Persistent history', 'Members only'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80"
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
          <p className="text-pretty text-sm font-semibold text-foreground md:text-base">
            Open a room and send the first message.
          </p>
          <Button asChild variant="outline" className="h-12 shrink-0 rounded-full border-foreground/25 px-6">
            <Link to="/signup">
              Create your account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
