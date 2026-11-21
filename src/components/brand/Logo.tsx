import { cn } from '@/lib/utils';

export const LOGO_URL =
  'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/IMG-20261121-WA0004.jpg';

interface LogoProps {
  className?: string;
  /** Darken blending melts the artwork's cream plate into cream surfaces. */
  blend?: boolean;
}

export function Logo({ className, blend = true }: LogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="DUOLYNK"
      width={1254}
      height={1254}
      draggable={false}
      className={cn('w-auto select-none object-contain', blend && 'logo-blend', className)}
    />
  );
}
