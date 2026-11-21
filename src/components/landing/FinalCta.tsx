import { Link } from 'react-router-dom';
import { ArrowRight, Heart, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JoinCodeDialog } from './JoinCodeDialog';

export function FinalCta() {
  return (
    <section className="relative py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1504px] px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-secondary/35 px-6 py-12 text-center md:px-12 md:py-16">
          <div
            className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-foreground/80">
              <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
              Stay connected. Always.
            </span>
            <h2 className="mt-5 text-balance font-display text-3xl leading-tight text-foreground md:text-[2.8rem]">
              Make a little more room for togetherness.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-foreground/75 md:text-lg">
              Create your account, open a room, and send your partner the code. That is the whole
              beginning.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 w-full rounded-full px-7 text-base shadow-glow sm:w-auto">
                <Link to="/signup">
                  Create your account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <JoinCodeDialog
                label="I have a code"
                icon={<KeyRound className="mr-2 h-5 w-5" />}
                size="lg"
                variant="outline"
                className="h-14 w-full rounded-full border-foreground/25 px-7 text-base sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
