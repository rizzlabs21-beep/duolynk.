import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GAMES, GAME_MODE_LABEL, gameAccentStyle } from '@/lib/games';

export function GamesSection() {
  return (
    <section id="games" className="relative scroll-mt-24 py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1272px] px-4 md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Games made for two
            </span>
            <h2 className="mt-2 text-balance font-display text-2xl leading-tight text-foreground md:text-[2.6rem]">
              Six games that need both of you.
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Every game starts from inside your room and waits for your partner to accept. Answers,
              turns and scores are shared live, so neither of you is ever playing alone.
            </p>
          </div>
          <Button asChild variant="outline" className="h-12 shrink-0 rounded-full border-foreground/25 px-6">
            <Link to="/app">
              Open your room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GAMES.map((game, index) => (
            <article
              key={game.key}
              className="group flex h-full flex-col rounded-3xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-hover"
              style={gameAccentStyle(game.accent)}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="game-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                  <game.icon className="h-6 w-6" />
                </span>
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  0{index + 1} · {GAME_MODE_LABEL[game.mode]}
                </span>
              </div>

              <h3 className="mt-4 text-balance text-lg font-bold leading-snug text-foreground">
                {game.title}
              </h3>
              <p className="game-text mt-1 text-sm font-semibold">{game.tagline}</p>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {game.description}
              </p>

              <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                {game.howTo.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/85">
                    <Check className="game-text mt-0.5 h-4 w-4 shrink-0" />
                    <span className="text-pretty">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                <Button asChild variant="secondary" className="h-11 w-full rounded-full">
                  <Link to="/app">
                    Play in your room
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-6 text-pretty text-sm text-muted-foreground">
          Games only run inside a room with two members. If your partner has not joined yet, the
          invitation waits for them instead of starting a solo round.
        </p>
      </div>
    </section>
  );
}
