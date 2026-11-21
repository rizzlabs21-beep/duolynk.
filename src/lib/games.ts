import { ArrowLeftRight, Flame, Grid3x3, Heart, Puzzle, Zap, type LucideIcon } from 'lucide-react';
import type { GameKey } from '@/types/types';

export interface GameMeta {
  key: GameKey;
  title: string;
  short: string;
  tagline: string;
  description: string;
  howTo: string[];
  icon: LucideIcon;
  /** Optional artwork that replaces the generic icon. */
  logo?: string;
  rounds: number;
  mode: 'rounds' | 'board' | 'live';
  /** HSL triplet used as the game's signature accent via --game-accent. */
  accent: string;
  /** Short label for the accent, used in copy. */
  accentName: string;
}

export const GAMES: GameMeta[] = [
  {
    key: 'who_knows_you',
    title: 'Who Knows You Better?',
    short: 'Who Knows You Better',
    tagline: 'Predict each other',
    description:
      'You both answer the same question about yourselves, then guess what your partner picked. Answers reveal together and every correct prediction earns points.',
    howTo: [
      'Each of you answers for yourself',
      'Then predict your partner’s answer',
      'Both answers reveal at the same moment',
      'Ten points for every correct prediction',
    ],
    icon: Heart,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Better.png',
    rounds: 6,
    mode: 'rounds',
    accent: '340 82% 56%',
    accentName: 'Rose',
  },
  {
    key: 'brain_battle',
    title: 'Brain Battle',
    short: 'Brain Battle',
    tagline: 'Race to the answer',
    description:
      'The same riddles, maths and general-knowledge questions land on both screens at once. Correct answers score more the faster you send them.',
    howTo: [
      'Six questions, both screens in sync',
      'Answer fast — speed adds points',
      'Wrong answers score nothing',
      'The higher total wins the champion badge',
    ],
    icon: Zap,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Brain.png',
    rounds: 6,
    mode: 'rounds',
    accent: '265 85% 62%',
    accentName: 'Violet',
  },
  {
    key: 'this_or_that',
    title: 'This or That?',
    short: 'This or That',
    tagline: 'Find your matches',
    description:
      'Two options, one choice each, no peeking. When you both lock in, the answers reveal together. Matches earn points and differences open a conversation.',
    howTo: [
      'Choose independently, side by side',
      'Answers reveal together',
      'A match earns ten points each',
      'A difference opens a talking point',
    ],
    icon: ArrowLeftRight,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Thisthat.png',
    rounds: 8,
    mode: 'rounds',
    accent: '22 92% 54%',
    accentName: 'Amber',
  },
  {
    key: 'two_minds',
    title: 'Two Minds, One Mission',
    short: 'Two Minds, One Mission',
    tagline: 'Solve it together',
    description:
      'You each receive a different clue. Neither clue is enough alone, so you talk it through in the room chat and submit the answer together to unlock the next mission.',
    howTo: [
      'Each partner sees a different clue',
      'Talk it through in the room chat',
      'Both submit the same answer',
      'Solve it to unlock the next mission',
    ],
    icon: Puzzle,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Puzz.png',
    rounds: 3,
    mode: 'rounds',
    accent: '168 52% 30%',
    accentName: 'Teal',
  },
  {
    key: 'tic_tac_toe',
    title: 'Tic-Tac-Toe',
    short: 'Tic-Tac-Toe',
    tagline: 'Three in a row',
    description:
      'The classic board, played live between the two of you. One of you is X, the other is O, and every move appears on both screens the moment it lands.',
    howTo: [
      'One partner plays X, the other plays O',
      'Turns alternate automatically',
      'Line up three in a row to win',
      'A full board with no line is a draw',
    ],
    icon: Grid3x3,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Tic.png',
    rounds: 0,
    mode: 'board',
    accent: '222 85% 56%',
    accentName: 'Sky',
  },
  {
    key: 'truth_or_dare',
    title: 'Truth or Dare',
    short: 'Truth or Dare',
    tagline: 'Open up, out loud',
    description:
      'Take turns choosing truth or dare. The card flips for both of you at once, and every prompt you complete earns points. Playful, romantic, deep or daring — the deck decides.',
    howTo: [
      'Take turns — the app tracks whose turn it is',
      'Choose truth or dare, then flip the card',
      'Both partners see the same prompt instantly',
      'Complete it for ten points, or pass',
    ],
    icon: Flame,
    logo: 'https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/Truthdare.png',
    rounds: 12,
    mode: 'live',
    accent: '274 72% 40%',
    accentName: 'Plum',
  },
];

export function gameMeta(key: GameKey): GameMeta {
  return GAMES.find((game) => game.key === key) ?? GAMES[0];
}

/** Inline style that scopes a game's signature accent for its subtree. */
export function gameAccentStyle(accent: string): React.CSSProperties {
  return { ['--game-accent' as string]: accent } as React.CSSProperties;
}

export const GAME_MODE_LABEL: Record<GameMeta['mode'], string> = {
  rounds: 'Rounds',
  board: 'Live board',
  live: 'Live turns',
};
