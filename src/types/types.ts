export interface Profile {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  created_at: string;
}

export type RoomType = 'temporary' | 'permanent';
export type RoomStatus = 'active' | 'closed';
export type MemberRole = 'creator' | 'partner';

export interface Room {
  id: string;
  name: string;
  code: string;
  room_type: RoomType;
  expires_at: string | null;
  status: RoomStatus;
  leaderboard_enabled: boolean;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_seen_at: string;
}

export interface RoomMemberWithProfile extends RoomMember {
  profile: Profile | null;
}

export type ChatMessageKind = 'text' | 'image' | 'sticker';

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  kind?: ChatMessageKind;
  mediaUrl?: string;
}

export interface RoomStats {
  room_id: string;
  user_id: string;
  points: number;
  games_played: number;
  games_won: number;
}

export interface Achievement {
  id: string;
  room_id: string;
  user_id: string;
  key: string;
  label: string;
  earned_at: string;
}

export type GameKey =
  | 'who_knows_you'
  | 'brain_battle'
  | 'this_or_that'
  | 'two_minds'
  | 'tic_tac_toe'
  | 'truth_or_dare';
export type GameStatus = 'invited' | 'active' | 'finished' | 'declined' | 'cancelled';

export interface GameSession {
  id: string;
  room_id: string;
  game_key: GameKey;
  status: GameStatus;
  invited_by: string;
  current_round: number;
  total_rounds: number;
  state: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  quit_requested_by?: string | null;
}

export interface GameOption {
  id: string;
  label: string;
}

export interface GamePrompt {
  question?: string;
  options?: GameOption[];
  left?: string;
  right?: string;
  topic?: string;
  mission?: string;
  clue?: string;
}

export interface RoundPlayerResult {
  self?: string;
  predict?: string;
  choice?: string;
  answer?: string;
  correct?: boolean;
  points?: number;
  seconds?: number;
}

export interface RoundResult {
  game: GameKey;
  a?: RoundPlayerResult;
  b?: RoundPlayerResult;
  correct?: string;
  matched?: boolean;
  topic?: string;
  solved?: boolean;
  answer?: string;
}

export interface LastAttempt {
  round: number;
  a: { answer: string; correct: boolean };
  b: { answer: string; correct: boolean };
}

export interface GameRoundState {
  session_id: string;
  game_key: GameKey;
  status: GameStatus;
  current_round: number;
  total_rounds: number;
  prompt: GamePrompt | null;
  my_submitted: boolean;
  partner_submitted: boolean;
  rounds: Record<string, RoundResult>;
  last_attempt: LastAttempt | null;
  scores: { a: number; b: number };
  invited_by: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface RoomBundle {
  room: Room;
  members: RoomMemberWithProfile[];
  stats: RoomStats[];
  achievements: Achievement[];
  activeSession: GameSession | null;
  recentSessions: GameSession[];
}

export interface RoomSummary {
  room: Room;
  members: RoomMemberWithProfile[];
  stats: RoomStats[];
  activeSession: GameSession | null;
  lastMessage: ChatMessage | null;
}

export interface RoomPreview {
  id: string;
  name: string;
  room_type: RoomType;
  expires_at: string | null;
  status: RoomStatus;
  creator_name: string | null;
  member_count: number;
  already_member: boolean;
}

export interface TttState {
  session_id: string;
  game_key: GameKey;
  status: GameStatus;
  board: string[];
  turn: string | null;
  winner: string | null;
  winning_line: number[] | null;
  my_symbol: 'X' | 'O';
  my_turn: boolean;
  scores: { a: number; b: number };
  invited_by: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface TodPrompt {
  id?: number;
  kind: 'truth' | 'dare';
  category?: string;
  text: string;
  /** Who wrote the prompt — the partner of the person answering. */
  by?: string;
}

export interface TodHistoryItem {
  round: number;
  kind: 'truth' | 'dare';
  text: string;
  category?: string;
  by: string | null;
  answered_by?: string | null;
  answer?: string | null;
  done: boolean;
}

export interface TodState {
  session_id: string;
  game_key: GameKey;
  status: GameStatus;
  round: number;
  total_rounds: number;
  turn: string | null;
  my_turn: boolean;
  phase: 'choose' | 'write' | 'answer' | 'done';
  kind: 'truth' | 'dare' | null;
  prompt: TodPrompt | null;
  answer: string | null;
  history: TodHistoryItem[];
  scores: { a: number; b: number };
  invited_by: string;
  started_at: string | null;
  finished_at: string | null;
  winner: string | null;
}
