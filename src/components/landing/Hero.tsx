import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Gamepad2, Heart, Phone, Play, Puzzle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';

const ART = '/hero-couple.webp';

const SHELL = { width: 'min(1504px, calc(100% - 9.8vw))', marginInline: 'auto' } as const;

const TEASERS = [
  {
    title: 'Who Knows You Better?',
    subtitle: 'Discover how well you know each other!',
    icon: Heart,
    tile: 'bg-[#FFE1E0] text-primary',
  },
  {
    title: 'Brain Battle',
    subtitle: 'Compete. Solve. Win!',
    icon: Zap,
    tile: 'bg-[#EEE7FF] text-[#8060D1]',
  },
  {
    title: 'This or That?',
    subtitle: 'Find your perfect match!',
    icon: ArrowLeftRight,
    tile: 'bg-[#FFF0C7] text-[#D79A20]',
  },
  {
    title: 'Two Minds, One Mission',
    subtitle: 'Team up and conquer!',
    icon: Puzzle,
    tile: 'bg-[#EEE7FF] text-[#8060D1]',
  },
];

interface PublicStats {
  rooms: number;
  games: number;
}

export function Hero() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase
      .rpc('get_public_stats')
      .then(({ data }) => {
        if (alive && data) setStats(data as PublicStats);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <section
        className="relative grid items-center gap-1 pb-1 pt-8 md:min-h-[510px] md:grid-cols-[minmax(520px,0.84fr)_minmax(620px,1.16fr)] md:gap-0 md:pt-[10px]"
        style={SHELL}
        aria-labelledby="hero-title"
      >
        <div className="relative z-[3]">
          <div className="flex min-h-[39px] w-max items-center gap-[11px] rounded-full bg-[#FFE1E0] px-[13px] text-[13px] font-black text-foreground md:min-h-[47px] md:min-w-[285px] md:px-4 md:text-base">
            <span className="text-xl leading-none text-primary md:text-2xl">♥</span>
            Stay Connected. Always.
          </div>

          <h1
            id="hero-title"
            className="mb-[17px] mt-4 font-display text-[clamp(43px,10.5vw,66px)] font-black leading-[1.02] tracking-[-2.8px] text-foreground md:mt-[15px] md:text-[clamp(58px,4.34vw,73px)] md:leading-[0.99] md:tracking-[-4.5px]"
          >
            Turn Distance
            <br />
            into{' '}
            <span className="relative inline-block whitespace-nowrap text-primary">
              Togetherness
              <span
                className="absolute -bottom-[7px] left-1 right-1 h-[9px] rounded-[50%] border-t-4 border-accent md:-bottom-3 md:border-t-[5px]"
                style={{ transform: 'rotate(-1deg)' }}
                aria-hidden="true"
              />
            </span>
          </h1>

          <p className="mb-5 mt-[23px] max-w-[540px] text-[15px] font-bold leading-[1.55] text-[#4B466F] md:mb-[27px] md:mt-[27px] md:text-[19px] md:leading-[1.48]">
            Chat, play and grow together with Duolynk — the ultimate long-distance relationship app.
          </p>

          <div className="flex flex-wrap items-center gap-[10px] md:gap-[19px]">
            <Button
              asChild
              className="h-[53px] w-[calc(55%-5px)] min-w-[185px] rounded-full text-xs font-black shadow-[0_5px_15px_rgba(255,107,107,0.19)] md:h-[70px] md:w-[284px] md:text-[17px]"
            >
              <Link to="/signup">
                <Play className="mr-2 h-4 w-4 fill-current md:h-[26px] md:w-[26px]" />
                Start Your Journey
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-[53px] w-[calc(45%-5px)] min-w-[155px] rounded-full border-[1.5px] border-foreground text-xs font-black md:h-[70px] md:w-[250px] md:text-[17px]"
            >
              <a href="#games">
                <Gamepad2 className="mr-2 h-4 w-4 md:h-[30px] md:w-[30px]" />
                Explore Games
              </a>
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-[9px] pl-0.5 text-[11px] font-bold text-[#625D7D] md:mt-[15px] md:text-[13px]">
            <span className="text-[22px] leading-none text-primary">♡</span>
            Little moments. Stronger connections.
          </div>
        </div>

        <div
          className="relative z-[1] mx-auto grid w-full place-items-center md:-ml-[27px] md:-mr-[11px] md:h-[492px]"
          style={{ aspectRatio: '1.23' }}
          aria-label="An illustrated couple sharing a moment across the distance"
        >
          <div
            className="pointer-events-none absolute left-[6%] top-[10%] h-[78%] w-[88%]"
            style={{
              borderRadius: '49% 51% 48% 52% / 49% 45% 55% 51%',
              background: 'linear-gradient(132deg,#EBDFFF 5%,#F5DDF4 53%,#E8E1FF 100%)',
              transform: 'rotate(-4deg)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute left-[16%] top-[39%] h-[43%] w-[70%] rounded-[50%]"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(255,247,240,0.86), rgba(255,244,232,0) 71%)',
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-[5%] left-[-1%] z-[2] h-[35%] w-[104%] rounded-[50%] border-[6px] border-[#B59AF5] border-l-transparent border-t-transparent md:border-[8px]"
            style={{ transform: 'rotate(-7deg)' }}
            aria-hidden="true"
          />

          <img
            src={ART}
            alt="Illustration of two partners smiling at each other while holding their phones"
            width={960}
            height={640}
            className="absolute inset-0 z-[1] h-full w-full object-contain drop-shadow-[0_15px_14px_rgba(69,45,82,0.10)]"
          />

          <span
            className="absolute left-[48%] top-[25%] z-[2] -translate-x-1/2 text-[47px] leading-none text-[#FF716B] md:text-[69px]"
            style={{ transform: 'translateX(-50%) rotate(-7deg)' }}
            aria-hidden="true"
          >
            ♥
          </span>

          <span className="spark-float absolute left-[8%] top-[26%] z-[3] text-[18px] font-black text-accent md:text-[29px]" aria-hidden="true">✦</span>
          <span className="spark-float absolute right-[20%] top-[21%] z-[3] text-[18px] font-black text-[#FF7779] md:text-[27px]" style={{ animationDelay: '0.5s' }} aria-hidden="true">♥</span>
          <span className="spark-float absolute left-[10%] top-[58%] z-[3] text-[18px] font-black text-white md:text-[29px]" aria-hidden="true">✧</span>
          <span className="spark-float absolute right-[4%] top-[36%] z-[3] text-[18px] font-black text-primary md:text-[25px]" style={{ animationDelay: '1s' }} aria-hidden="true">♥</span>

          <a
            href="#games"
            className="absolute left-[2%] top-[3%] z-[4] flex min-h-[50px] items-center gap-1.5 rounded-2xl border border-[rgba(55,42,98,0.08)] bg-white/95 px-2 py-1.5 text-[9px] font-black leading-[1.18] shadow-[0_13px_28px_rgba(77,53,94,0.13)] transition-transform hover:-translate-y-0.5 md:left-[8%] md:top-[4%] md:min-h-[77px] md:min-w-[211px] md:gap-3 md:rounded-[25px] md:px-[17px] md:py-3 md:text-base"
            style={{ transform: 'rotate(-6deg)' }}
          >
            <Gamepad2 className="h-[19px] w-[19px] shrink-0 text-[#493A91] md:h-8 md:w-8" />
            <span>
              Play Games
              <br />
              Together
            </span>
          </a>

          <a
            href="#games"
            className="absolute right-[1%] top-[6%] z-[4] flex min-h-[50px] items-center gap-1.5 rounded-2xl border border-[rgba(55,42,98,0.08)] bg-white/95 px-2 py-1.5 text-[9px] font-black leading-[1.18] shadow-[0_13px_28px_rgba(77,53,94,0.13)] transition-transform hover:-translate-y-0.5 md:right-[5%] md:min-h-[77px] md:min-w-[211px] md:gap-3 md:rounded-[25px] md:px-[17px] md:py-3 md:text-base"
            style={{ transform: 'rotate(5deg)' }}
          >
            <Phone className="h-[19px] w-[19px] shrink-0 text-[#493A91] md:h-8 md:w-8" />
            <span>
              Chat &amp; Call
              <br />
              Anytime
            </span>
          </a>

          <a
            href="#games"
            className="absolute right-0 top-[39%] z-[4] flex min-h-[50px] items-center gap-1.5 rounded-2xl border border-[rgba(55,42,98,0.08)] bg-white/95 px-2 py-1.5 text-[9px] font-black leading-[1.18] shadow-[0_13px_28px_rgba(77,53,94,0.13)] transition-transform hover:-translate-y-0.5 md:min-h-[77px] md:min-w-[211px] md:gap-3 md:rounded-[25px] md:px-[17px] md:py-3 md:text-base"
            style={{ transform: 'rotate(6deg)' }}
          >
            <Heart className="h-[19px] w-[19px] shrink-0 text-[#674DC1] md:h-8 md:w-8" />
            <span>
              Share
              <br />
              Moments
            </span>
          </a>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-[9px] pt-[9px] md:grid-cols-4 md:gap-6 md:pt-5"
        style={SHELL}
        aria-label="Featured couple games"
      >
        {TEASERS.map((teaser) => (
          <Link
            key={teaser.title}
            to="/app"
            className="group relative flex min-h-[81px] min-w-0 items-center gap-2 rounded-[20px] border border-[rgba(75,55,76,0.07)] bg-white/80 px-[9px] py-[11px] text-left shadow-[0_10px_27px_rgba(86,57,72,0.075)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_42px_rgba(63,45,90,0.12)] md:min-h-[112px] md:gap-4 md:rounded-[29px] md:px-[18px] md:py-[15px]"
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl md:h-12 md:w-12 md:rounded-2xl ${teaser.tile}`}
            >
              <teaser.icon className="h-[18px] w-[18px] md:h-6 md:w-6" />
            </span>
            <span className="grid min-w-0 gap-1 pr-3.5 md:gap-[5px] md:pr-6">
              <strong className="text-[10px] font-black leading-[1.2] tracking-[-0.2px] text-foreground md:text-[15px] md:tracking-[-0.3px]">
                {teaser.title}
              </strong>
              <small className="text-[8px] font-bold leading-[1.3] text-[#565071] md:text-xs">
                {teaser.subtitle}
              </small>
            </span>
            <span className="absolute bottom-2 right-2 grid h-[21px] w-[21px] place-items-center rounded-full bg-[#F6EAF4] text-foreground md:bottom-3.5 md:right-3.5 md:h-[29px] md:w-[29px]">
              <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
            </span>
          </Link>
        ))}
      </section>

      <section
        className="flex flex-wrap items-center justify-center gap-x-[15px] gap-y-2 py-7 md:min-h-[143px] md:gap-[36px] md:py-[27px]"
        style={SHELL}
        aria-label="Duolynk activity"
      >
        <div className="flex items-center gap-2 md:gap-[15px]">
          <span className="grid place-items-center text-[27px] leading-none text-[#543894] md:text-[41px]" aria-hidden="true">♟</span>
          <span>
            <strong className="block text-[19px] font-black leading-none tracking-[-0.6px] text-foreground md:text-[29px]">
              {stats ? stats.rooms.toLocaleString() : '—'}
            </strong>
            <small className="mt-[3px] block whitespace-nowrap text-[9px] font-bold text-[#555071] md:mt-[5px] md:text-[13px]">
              Rooms opened
            </small>
          </span>
        </div>

        <span className="h-[37px] w-px bg-[rgba(45,42,94,0.3)] md:h-[51px]" aria-hidden="true" />

        <div className="flex items-center gap-2 md:gap-[15px]">
          <span className="grid place-items-center text-[27px] leading-none text-[#F2B83E] md:text-[41px]" aria-hidden="true">♜</span>
          <span>
            <strong className="block text-[19px] font-black leading-none tracking-[-0.6px] text-foreground md:text-[29px]">
              {stats ? stats.games.toLocaleString() : '—'}
            </strong>
            <small className="mt-[3px] block whitespace-nowrap text-[9px] font-bold text-[#555071] md:mt-[5px] md:text-[13px]">
              Games played
            </small>
          </span>
        </div>

        <span className="h-[37px] w-px bg-[rgba(45,42,94,0.3)] md:h-[51px]" aria-hidden="true" />

        <div className="flex w-full items-center justify-center gap-2 md:w-auto md:gap-4">
          <span className="text-[34px] leading-none text-primary md:text-[46px]" aria-hidden="true">♥</span>
          <small className="text-[9px] font-bold text-[#555071] md:text-[13px]">
            More than just an app — a bridge for hearts.
          </small>
          <span className="text-base font-black text-foreground md:text-[23px]" aria-hidden="true">♡</span>
        </div>
      </section>
    </>
  );
}
