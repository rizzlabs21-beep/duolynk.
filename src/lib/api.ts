import { supabase } from '@/db/supabase';
import type {
  Achievement,
  GameKey,
  GameRoundState,
  GameSession,
  Profile,
  Room,
  RoomBundle,
  RoomMember,
  RoomMemberWithProfile,
  RoomPreview,
  RoomStats,
  RoomSummary,
  RoomType,
  TttState,
  TodState,
} from '@/types/types';

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Please sign in to continue.',
  ROOM_NOT_FOUND: 'That room code does not match any room. Check the code and try again.',
  ROOM_FULL: 'This room already has two members.',
  ALREADY_IN_ROOM:
    'You are already in a room. Leave or delete it before creating or joining another one.',
  QUIT_ALREADY_REQUESTED: 'Your partner already asked to end this game. Respond to their request.',
  NO_QUIT_REQUEST: 'That quit request is no longer active.',
  REQUESTER_CANNOT_RESPOND: 'Wait for your partner to respond to your quit request.',
  NOT_REQUESTER: 'Only the partner who asked to quit can cancel that request.',
  ROOM_EXPIRED: 'This temporary room has expired.',
  ROOM_CLOSED: 'This room has been closed.',
  ROOM_NOT_OPEN: 'This room is no longer open.',
  NOT_A_MEMBER: 'You are not a member of this room.',
  NOT_ROOM_CREATOR: 'Only the room creator can do that.',
  CREATOR_MUST_CLOSE_ROOM: 'The creator closes the room instead of leaving it.',
  INVALID_ROOM_TYPE: 'Choose either a temporary or a permanent room.',
  INVALID_DURATION: 'Choose one of the available room durations.',
  ROOM_NAME_REQUIRED: 'Give your room a name.',
  GAME_IN_PROGRESS: 'A game is already running in this room.',
  PARTNER_NOT_JOINED: 'Your partner has to join the room before a game can start.',
  INVALID_GAME: 'That game is not available.',
  SESSION_NOT_FOUND: 'That game session no longer exists.',
  SESSION_NOT_ACTIVE: 'This game is not running right now.',
  SESSION_NOT_PENDING: 'This invitation has already been answered.',
  INVITER_CANNOT_RESPOND: 'Wait for your partner to answer the invitation.',
  ROUND_MISMATCH: 'The round has already moved on.',
  ROUND_NOT_FOUND: 'That round could not be loaded.',
  CODE_GENERATION_FAILED: 'Could not create a room code. Please try again.',
  INVALID_MOVE: 'That move is not allowed.',
  CELL_TAKEN: 'That square is already taken.',
  NOT_YOUR_TURN: 'Wait for your turn.',
};

export function friendlyError(error: unknown): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (raw.includes(code)) return message;
  }

  if (raw.toLowerCase().includes('duplicate key') && raw.includes('username')) {
    return 'That username is already taken.';
  }
  if (raw.toLowerCase().includes('invalid login credentials')) {
    return 'That username and password do not match.';
  }
  if (raw.toLowerCase().includes('user already registered')) {
    return 'That username is already taken.';
  }
  if (raw.toLowerCase().includes('password should be at least')) {
    return 'Use a password with at least 6 characters.';
  }
  if (raw.toLowerCase().includes('failed to fetch')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return raw || 'Something went wrong. Please try again.';
}

function single<T>(data: T | T[] | null): T | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

/* ------------------------------------------------------------------ */
/* profiles                                                            */
/* ------------------------------------------------------------------ */

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, email, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName.trim() })
    .eq('id', userId);
  if (error) throw error;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { p_username: username });
  if (error) throw error;
  return Boolean(data);
}

/* ------------------------------------------------------------------ */
/* rooms                                                               */
/* ------------------------------------------------------------------ */

export async function createRoom(
  name: string,
  type: RoomType,
  durationHours: number | null,
  leaderboard = true,
): Promise<Room> {
  const { data, error } = await supabase.rpc('create_room', {
    p_name: name,
    p_type: type,
    p_duration_hours: durationHours,
    p_leaderboard: leaderboard,
  });
  if (error) throw error;
  const room = single<Room>(data as Room | Room[] | null);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  return room;
}

export async function previewRoomByCode(code: string): Promise<RoomPreview> {
  const { data, error } = await supabase.rpc('preview_room_by_code', { p_code: code });
  if (error) throw error;
  return data as RoomPreview;
}

export async function joinRoomByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_room_by_code', { p_code: code });
  if (error) throw error;
  return data as string;
}

export async function regenerateRoomCode(roomId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_room_code', { p_room: roomId });
  if (error) throw error;
  return data as string;
}

export async function closeRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('close_room', { p_room: roomId });
  if (error) throw error;
}

export async function deleteRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_room', { p_room: roomId });
  if (error) throw error;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_room', { p_room: roomId });
  if (error) throw error;
}

export async function touchRoom(roomId: string, userId: string): Promise<void> {
  await supabase
    .from('room_members')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
}

async function loadMembers(roomIds: string[]): Promise<Map<string, RoomMemberWithProfile[]>> {
  const grouped = new Map<string, RoomMemberWithProfile[]>();
  if (roomIds.length === 0) return grouped;

  const { data: memberRows, error: memberError } = await supabase
    .from('room_members')
    .select('room_id, user_id, role, joined_at, last_seen_at')
    .in('room_id', roomIds);
  if (memberError) throw memberError;

  const members = (memberRows ?? []) as RoomMember[];
  const userIds = Array.from(new Set(members.map((m) => m.user_id)));

  let profiles: Profile[] = [];
  if (userIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, email, created_at')
      .in('id', userIds);
    if (profileError) throw profileError;
    profiles = (profileRows ?? []) as Profile[];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  for (const member of members) {
    const list = grouped.get(member.room_id) ?? [];
    list.push({ ...member, profile: profileMap.get(member.user_id) ?? null });
    grouped.set(member.room_id, list);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => (a.role === 'creator' ? -1 : b.role === 'creator' ? 1 : 0));
  }

  return grouped;
}

export async function getMyRooms(userId: string): Promise<RoomSummary[]> {
  const { data: membershipRows, error: membershipError } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', userId);
  if (membershipError) throw membershipError;

  const roomIds = (membershipRows ?? []).map((row) => row.room_id as string);
  if (roomIds.length === 0) return [];

  const { data: roomRows, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, code, room_type, expires_at, status, leaderboard_enabled, created_by, created_at')
    .in('id', roomIds)
    .order('created_at', { ascending: false })
    .limit(20);
  if (roomError) throw roomError;

  const rooms = (roomRows ?? []) as Room[];
  const membersByRoom = await loadMembers(rooms.map((r) => r.id));

  const { data: statsRows } = await supabase
    .from('room_stats')
    .select('room_id, user_id, points, games_played, games_won')
    .in('room_id', rooms.map((r) => r.id));
  const stats = (statsRows ?? []) as RoomStats[];

  const { data: sessionRows } = await supabase
    .from('game_sessions')
    .select('id, room_id, game_key, status, invited_by, current_round, total_rounds, state, created_at, started_at, finished_at, quit_requested_by')
    .in('room_id', rooms.map((r) => r.id))
    .in('status', ['invited', 'active'])
    .order('created_at', { ascending: false });
  const sessions = (sessionRows ?? []) as GameSession[];

  return rooms.map((room) => ({
    room,
    members: membersByRoom.get(room.id) ?? [],
    stats: stats.filter((s) => s.room_id === room.id),
    activeSession: sessions.find((s) => s.room_id === room.id) ?? null,
    lastMessage: null,
  }));
}

export async function getRoomBundle(roomId: string): Promise<RoomBundle | null> {
  const { data: roomRow, error: roomError } = await supabase
    .from('rooms')
    .select('id, name, code, room_type, expires_at, status, leaderboard_enabled, created_by, created_at')
    .eq('id', roomId)
    .maybeSingle();
  if (roomError) throw roomError;
  if (!roomRow) return null;

  const room = roomRow as Room;
  const membersByRoom = await loadMembers([room.id]);

  const { data: statsRows } = await supabase
    .from('room_stats')
    .select('room_id, user_id, points, games_played, games_won')
    .eq('room_id', room.id);

  const { data: achievementRows } = await supabase
    .from('achievements')
    .select('id, room_id, user_id, key, label, earned_at')
    .eq('room_id', room.id)
    .order('earned_at', { ascending: false })
    .limit(40);

  const { data: sessionRows } = await supabase
    .from('game_sessions')
    .select('id, room_id, game_key, status, invited_by, current_round, total_rounds, state, created_at, started_at, finished_at, quit_requested_by')
    .eq('room_id', room.id)
    .order('created_at', { ascending: false })
    .limit(12);

  const sessions = (sessionRows ?? []) as GameSession[];

  return {
    room,
    members: membersByRoom.get(room.id) ?? [],
    stats: (statsRows ?? []) as RoomStats[],
    achievements: (achievementRows ?? []) as Achievement[],
    activeSession: sessions.find((s) => s.status === 'invited' || s.status === 'active') ?? null,
    recentSessions: sessions,
  };
}

/* ------------------------------------------------------------------ */
/* messages                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* games                                                               */
/* ------------------------------------------------------------------ */

export async function startGame(roomId: string, gameKey: GameKey): Promise<string> {
  const { data, error } = await supabase.rpc('start_game', { p_room: roomId, p_game: gameKey });
  if (error) throw error;
  return data as string;
}

export async function respondGameInvite(sessionId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_game_invite', {
    p_session: sessionId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function cancelGame(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_game', { p_session: sessionId });
  if (error) throw error;
}

export async function requestGameQuit(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('request_game_quit', { p_session: sessionId });
  if (error) throw error;
}

export async function respondGameQuit(sessionId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_game_quit', {
    p_session: sessionId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function cancelGameQuit(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_game_quit', { p_session: sessionId });
  if (error) throw error;
}

export async function getGameRound(sessionId: string): Promise<GameRoundState> {
  const { data, error } = await supabase.rpc('get_game_round', { p_session: sessionId });
  if (error) throw error;
  return data as GameRoundState;
}

export async function submitGameAnswer(
  sessionId: string,
  round: number,
  payload: Record<string, unknown>,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc('submit_game_answer', {
    p_session: sessionId,
    p_round: round,
    p_payload: payload,
  });
  if (error) throw error;
  return data as { status: string };
}

export async function getTttState(sessionId: string): Promise<TttState> {
  const { data, error } = await supabase.rpc('get_ttt_state', { p_session: sessionId });
  if (error) throw error;
  return data as TttState;
}

export async function submitTttMove(sessionId: string, cell: number): Promise<TttState> {
  const { data, error } = await supabase.rpc('submit_ttt_move', {
    p_session: sessionId,
    p_cell: cell,
  });
  if (error) throw error;
  return data as TttState;
}

export async function getTodState(sessionId: string): Promise<TodState> {
  const { data, error } = await supabase.rpc('get_tod_state', { p_session: sessionId });
  if (error) throw error;
  return data as TodState;
}

export async function todChoose(sessionId: string, kind: 'truth' | 'dare'): Promise<TodState> {
  const { data, error } = await supabase.rpc('tod_choose', { p_session: sessionId, p_kind: kind });
  if (error) throw error;
  return data as TodState;
}

export async function todSetPrompt(sessionId: string, text: string): Promise<TodState> {
  const { data, error } = await supabase.rpc('tod_set_prompt', {
    p_session: sessionId,
    p_text: text,
  });
  if (error) throw error;
  return data as TodState;
}

export async function todAnswer(sessionId: string, text: string): Promise<TodState> {
  const { data, error } = await supabase.rpc('tod_answer', {
    p_session: sessionId,
    p_text: text,
  });
  if (error) throw error;
  return data as TodState;
}

export async function todSkip(sessionId: string): Promise<TodState> {
  const { data, error } = await supabase.rpc('tod_skip', { p_session: sessionId });
  if (error) throw error;
  return data as TodState;
}

/* ------------------------------------------------------------------ */
/* leaderboard                                                         */
/* ------------------------------------------------------------------ */

export interface LeaderboardEntry {
  user_id: string;
  points: number;
  games_played: number;
  games_won: number;
  updated_at: string;
  profile: Profile | null;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('duo_points')
    .select('user_id, points, games_played, games_won, updated_at')
    .order('points', { ascending: false })
    .order('games_won', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as Omit<LeaderboardEntry, 'profile'>[];
  if (rows.length === 0) return [];

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, display_name, email, created_at')
    .in('id', rows.map((row) => row.user_id));
  if (profileError) throw profileError;

  const profiles = new Map(((profileRows ?? []) as Profile[]).map((p) => [p.id, p]));
  return rows.map((row) => ({ ...row, profile: profiles.get(row.user_id) ?? null }));
}
