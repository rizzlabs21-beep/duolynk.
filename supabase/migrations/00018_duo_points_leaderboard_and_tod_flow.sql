-- 1. Leaderboard opt-in on rooms
alter table public.rooms add column if not exists leaderboard_enabled boolean not null default true;

-- 2. Duo points ledger
create table if not exists public.duo_points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  points integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.duo_points enable row level security;

drop policy if exists "duo_points_read_all" on public.duo_points;
create policy "duo_points_read_all" on public.duo_points
  for select to authenticated using (true);

create or replace function public.award_duo_points(
  p_user uuid,
  p_points integer,
  p_played integer default 0,
  p_won integer default 0
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.duo_points (user_id, points, games_played, games_won, updated_at)
  values (p_user, greatest(p_points, 0), greatest(p_played, 0), greatest(p_won, 0), now())
  on conflict (user_id) do update set
    points = public.duo_points.points + greatest(p_points, 0),
    games_played = public.duo_points.games_played + greatest(p_played, 0),
    games_won = public.duo_points.games_won + greatest(p_won, 0),
    updated_at = now();
end $$;

revoke execute on function public.award_duo_points(uuid, integer, integer, integer) from public;

-- 3. Award on every finished game (respects the room's leaderboard setting)
create or replace function public.award_game_duo_points()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean;
  v_a uuid;
  v_b uuid;
  v_a_pts int := 0;
  v_b_pts int := 0;
  v_winner uuid;
  v_bonus int := 0;
begin
  if new.status <> 'finished' or coalesce(old.status, '') = 'finished' then
    return new;
  end if;

  select leaderboard_enabled into v_enabled from public.rooms where id = new.room_id;
  if not coalesce(v_enabled, false) then
    return new;
  end if;

  select user_id into v_a from public.room_members where room_id = new.room_id and role = 'creator';
  select user_id into v_b from public.room_members where room_id = new.room_id and role = 'partner';
  if v_a is null or v_b is null then
    return new;
  end if;

  select coalesce(sum(points), 0) into v_a_pts
  from public.game_submissions where session_id = new.id and user_id = v_a;
  select coalesce(sum(points), 0) into v_b_pts
  from public.game_submissions where session_id = new.id and user_id = v_b;

  v_winner := case
    when v_a_pts > v_b_pts then v_a
    when v_b_pts > v_a_pts then v_b
    else null
  end;

  -- Time spent actively playing earns a small bonus, capped per game.
  v_bonus := least(
    20,
    greatest(
      0,
      floor(extract(epoch from (coalesce(new.finished_at, now()) - coalesce(new.started_at, now()))) / 60)::int
    )
  );

  perform public.award_duo_points(v_a, v_a_pts + v_bonus, 1, case when v_winner = v_a then 1 else 0 end);
  perform public.award_duo_points(v_b, v_b_pts + v_bonus, 1, case when v_winner = v_b then 1 else 0 end);

  return new;
end $$;

drop trigger if exists trg_award_duo_points on public.game_sessions;
create trigger trg_award_duo_points
  after update on public.game_sessions
  for each row execute function public.award_game_duo_points();

-- 4. One active room per user
drop function if exists public.create_room(text, text, integer);

create or replace function public.create_room(
  p_name text,
  p_type text,
  p_duration_hours integer default null,
  p_leaderboard boolean default true
) returns public.rooms
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_expires timestamptz;
  v_room public.rooms;
  v_attempt int := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_type not in ('temporary', 'permanent') then
    raise exception 'INVALID_ROOM_TYPE';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'ROOM_NAME_REQUIRED';
  end if;

  if exists (
    select 1
    from public.room_members m
    join public.rooms r on r.id = m.room_id
    where m.user_id = v_uid
      and r.status = 'active'
      and (r.expires_at is null or r.expires_at > now())
  ) then
    raise exception 'ALREADY_IN_ROOM';
  end if;

  if p_type = 'temporary' then
    if p_duration_hours is null or p_duration_hours not in (24, 168, 720) then
      raise exception 'INVALID_DURATION';
    end if;
    v_expires := now() + make_interval(hours => p_duration_hours);
  else
    v_expires := null;
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_room_code();
    exit when not exists (select 1 from public.rooms where code = v_code);
    if v_attempt > 20 then
      raise exception 'CODE_GENERATION_FAILED';
    end if;
  end loop;

  insert into public.rooms (name, code, room_type, expires_at, created_by, leaderboard_enabled)
  values (trim(p_name), v_code, p_type, v_expires, v_uid, coalesce(p_leaderboard, true))
  returning * into v_room;

  insert into public.room_members (room_id, user_id, role)
  values (v_room.id, v_uid, 'creator');

  insert into public.room_stats (room_id, user_id)
  values (v_room.id, v_uid);

  return v_room;
end $$;

create or replace function public.join_room_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_room public.rooms;
  v_count int;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_room from public.rooms where code = upper(trim(p_code));
  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if v_room.status <> 'active' then
    raise exception 'ROOM_CLOSED';
  end if;
  if v_room.expires_at is not null and v_room.expires_at <= now() then
    raise exception 'ROOM_EXPIRED';
  end if;

  if exists (select 1 from public.room_members where room_id = v_room.id and user_id = v_uid) then
    return v_room.id;
  end if;

  if exists (
    select 1
    from public.room_members m
    join public.rooms r on r.id = m.room_id
    where m.user_id = v_uid
      and r.id <> v_room.id
      and r.status = 'active'
      and (r.expires_at is null or r.expires_at > now())
  ) then
    raise exception 'ALREADY_IN_ROOM';
  end if;

  select count(*) into v_count from public.room_members where room_id = v_room.id;
  if v_count >= 2 then
    raise exception 'ROOM_FULL';
  end if;

  insert into public.room_members (room_id, user_id, role)
  values (v_room.id, v_uid, 'partner');

  insert into public.room_stats (room_id, user_id)
  values (v_room.id, v_uid)
  on conflict (room_id, user_id) do nothing;

  return v_room.id;
end $$;

-- 5. Truth or Dare: partner-written prompts
create or replace function public.get_tod_state(p_session uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_scores jsonb;
begin
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.is_room_member(v_s.room_id, v_uid) then
    raise exception 'NOT_A_MEMBER';
  end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;

  select jsonb_build_object(
    'a', coalesce((
      select sum(s.points) from public.game_submissions s
      join public.room_members m on m.user_id = s.user_id and m.room_id = v_s.room_id
      where s.session_id = p_session and m.role = 'creator'
    ), 0),
    'b', coalesce((
      select sum(s.points) from public.game_submissions s
      join public.room_members m on m.user_id = s.user_id and m.room_id = v_s.room_id
      where s.session_id = p_session and m.role = 'partner'
    ), 0)
  ) into v_scores;

  return jsonb_build_object(
    'session_id', v_s.id,
    'game_key', v_s.game_key,
    'status', v_s.status,
    'round', coalesce((v_s.state->>'round')::int, 1),
    'total_rounds', v_s.total_rounds,
    'turn', v_turn,
    'my_turn', v_turn = v_uid,
    'phase', coalesce(v_s.state->>'phase', 'choose'),
    'kind', v_s.state->'kind',
    'prompt', v_s.state->'prompt',
    'answer', v_s.state->>'answer',
    'history', coalesce(v_s.state->'history', '[]'::jsonb),
    'scores', v_scores,
    'invited_by', v_s.invited_by,
    'started_at', v_s.started_at,
    'finished_at', v_s.finished_at,
    'winner', nullif(v_s.state->>'winner', '')::uuid
  );
end $$;

create or replace function public.tod_choose(p_session uuid, p_kind text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_other uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if p_kind not in ('truth', 'dare') then raise exception 'INVALID_KIND'; end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then raise exception 'NOT_YOUR_TURN'; end if;
  if coalesce(v_s.state->>'phase', 'choose') <> 'choose' then
    raise exception 'PROMPT_ALREADY_DRAWN';
  end if;

  select user_id into v_other from public.room_members
  where room_id = v_s.room_id and user_id <> v_uid limit 1;

  update public.game_sessions
    set state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
      'kind', p_kind,
      'phase', 'write',
      'prompt', null,
      'answer', null,
      'turn', v_other
    )
    where id = p_session;

  return public.get_tod_state(p_session);
end $$;

create or replace function public.tod_set_prompt(p_session uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_other uuid;
  v_text text := trim(coalesce(p_text, ''));
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if char_length(v_text) < 3 then raise exception 'PROMPT_REQUIRED'; end if;
  if char_length(v_text) > 240 then raise exception 'PROMPT_TOO_LONG'; end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then raise exception 'NOT_YOUR_TURN'; end if;
  if coalesce(v_s.state->>'phase', '') <> 'write' then raise exception 'NOT_WRITING_PHASE'; end if;

  select user_id into v_other from public.room_members
  where room_id = v_s.room_id and user_id <> v_uid limit 1;

  update public.game_sessions
    set state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
      'phase', 'answer',
      'prompt', jsonb_build_object(
        'text', v_text,
        'by', v_uid,
        'kind', v_s.state->>'kind'
      ),
      'turn', v_other
    )
    where id = p_session;

  return public.get_tod_state(p_session);
end $$;

create or replace function public.tod_answer(p_session uuid, p_text text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_text text := trim(coalesce(p_text, ''));
  v_prompt jsonb;
  v_round int;
  v_next int;
  v_a uuid;
  v_b uuid;
  v_a_total int;
  v_b_total int;
  v_winner uuid;
  v_history jsonb;
  v_writer uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if char_length(v_text) < 1 then raise exception 'ANSWER_REQUIRED'; end if;
  if char_length(v_text) > 500 then raise exception 'ANSWER_TOO_LONG'; end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then raise exception 'NOT_YOUR_TURN'; end if;
  if coalesce(v_s.state->>'phase', '') <> 'answer' then raise exception 'NOT_ANSWERING_PHASE'; end if;

  v_prompt := v_s.state->'prompt';
  if v_prompt is null or v_prompt = 'null'::jsonb then raise exception 'NO_PROMPT'; end if;

  v_writer := nullif(v_prompt->>'by', '')::uuid;
  v_round := coalesce((v_s.state->>'round')::int, 1);

  insert into public.game_submissions (session_id, user_id, round_index, payload, points)
  values (
    p_session, v_uid, v_round - 1,
    jsonb_build_object('kind', v_prompt->>'kind', 'text', v_prompt->>'text', 'answer', v_text),
    10
  )
  on conflict (session_id, user_id, round_index)
  do update set points = excluded.points, payload = excluded.payload;

  if v_writer is not null then
    insert into public.game_submissions (session_id, user_id, round_index, payload, points)
    values (
      p_session, v_writer, v_round - 1,
      jsonb_build_object('kind', v_prompt->>'kind', 'text', v_prompt->>'text', 'wrote', true),
      5
    )
    on conflict (session_id, user_id, round_index)
    do update set points = excluded.points;
  end if;

  update public.room_stats set points = points + 10
  where room_id = v_s.room_id and user_id = v_uid;

  if v_writer is not null then
    update public.room_stats set points = points + 5
    where room_id = v_s.room_id and user_id = v_writer;
  end if;

  v_history := coalesce(v_s.state->'history', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'round', v_round,
      'kind', v_prompt->>'kind',
      'text', v_prompt->>'text',
      'answer', v_text,
      'by', v_writer,
      'answered_by', v_uid,
      'done', true
    )
  );

  select user_id into v_a from public.room_members where room_id = v_s.room_id and role = 'creator';
  select user_id into v_b from public.room_members where room_id = v_s.room_id and role = 'partner';

  v_next := v_round + 1;

  if v_next > v_s.total_rounds then
    select coalesce(sum(points), 0) into v_a_total
    from public.game_submissions where session_id = p_session and user_id = v_a;
    select coalesce(sum(points), 0) into v_b_total
    from public.game_submissions where session_id = p_session and user_id = v_b;

    v_winner := case
      when v_a_total > v_b_total then v_a
      when v_b_total > v_a_total then v_b
      else null
    end;

    update public.game_sessions
      set status = 'finished',
          finished_at = now(),
          current_round = v_next,
          state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
            'turn', null, 'kind', null, 'prompt', null, 'answer', null,
            'phase', 'done', 'history', v_history, 'round', v_next, 'winner', v_winner
          )
      where id = p_session;

    update public.room_stats set games_played = games_played + 1
    where room_id = v_s.room_id and user_id in (v_a, v_b);

    if v_winner is not null then
      update public.room_stats set games_won = games_won + 1
      where room_id = v_s.room_id and user_id = v_winner;
    end if;

    insert into public.achievements (room_id, user_id, key, label)
    select v_s.room_id, u, 'first_truth_or_dare', 'Played Truth or Dare'
    from unnest(array[v_a, v_b]) as u
    on conflict (room_id, user_id, key) do nothing;

    if v_winner is not null then
      insert into public.achievements (room_id, user_id, key, label)
      values (v_s.room_id, v_winner, 'truth_or_dare_champion', 'Truth or Dare champion')
      on conflict (room_id, user_id, key) do nothing;
    end if;
  else
    update public.game_sessions
      set current_round = v_next,
          state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
            'turn', case when v_uid = v_a then v_b else v_a end,
            'kind', null,
            'prompt', null,
            'answer', null,
            'phase', 'choose',
            'history', v_history,
            'round', v_next
          )
      where id = p_session;
  end if;

  return public.get_tod_state(p_session);
end $$;

create or replace function public.tod_skip(p_session uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_phase text;
  v_round int;
  v_next int;
  v_a uuid;
  v_b uuid;
  v_a_total int;
  v_b_total int;
  v_winner uuid;
  v_history jsonb;
  v_prompt jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then raise exception 'NOT_YOUR_TURN'; end if;

  v_phase := coalesce(v_s.state->>'phase', 'choose');
  if v_phase not in ('choose', 'answer') then raise exception 'CANNOT_SKIP'; end if;

  v_prompt := v_s.state->'prompt';
  v_round := coalesce((v_s.state->>'round')::int, 1);

  v_history := coalesce(v_s.state->'history', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'round', v_round,
      'kind', coalesce(v_s.state->>'kind', 'truth'),
      'text', coalesce(v_prompt->>'text', 'Skipped'),
      'answer', null,
      'by', nullif(v_prompt->>'by', '')::uuid,
      'answered_by', v_uid,
      'done', false
    )
  );

  select user_id into v_a from public.room_members where room_id = v_s.room_id and role = 'creator';
  select user_id into v_b from public.room_members where room_id = v_s.room_id and role = 'partner';

  v_next := v_round + 1;

  if v_next > v_s.total_rounds then
    select coalesce(sum(points), 0) into v_a_total
    from public.game_submissions where session_id = p_session and user_id = v_a;
    select coalesce(sum(points), 0) into v_b_total
    from public.game_submissions where session_id = p_session and user_id = v_b;

    v_winner := case
      when v_a_total > v_b_total then v_a
      when v_b_total > v_a_total then v_b
      else null
    end;

    update public.game_sessions
      set status = 'finished',
          finished_at = now(),
          current_round = v_next,
          state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
            'turn', null, 'kind', null, 'prompt', null, 'answer', null,
            'phase', 'done', 'history', v_history, 'round', v_next, 'winner', v_winner
          )
      where id = p_session;

    update public.room_stats set games_played = games_played + 1
    where room_id = v_s.room_id and user_id in (v_a, v_b);

    if v_winner is not null then
      update public.room_stats set games_won = games_won + 1
      where room_id = v_s.room_id and user_id = v_winner;
    end if;
  else
    update public.game_sessions
      set current_round = v_next,
          state = coalesce(v_s.state, '{}'::jsonb) || jsonb_build_object(
            'turn', case when v_uid = v_a then v_b else v_a end,
            'kind', null,
            'prompt', null,
            'answer', null,
            'phase', 'choose',
            'history', v_history,
            'round', v_next
          )
      where id = p_session;
  end if;

  return public.get_tod_state(p_session);
end $$;
