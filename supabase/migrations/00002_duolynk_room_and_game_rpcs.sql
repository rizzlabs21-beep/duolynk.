-- ============================================================
-- DUOLYNK room lifecycle RPCs
-- ============================================================

create function public.generate_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return result;
end;
$$;

create function public.create_room(p_name text, p_type text, p_duration_hours integer default null)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.rooms (name, code, room_type, expires_at, created_by)
  values (trim(p_name), v_code, p_type, v_expires, v_uid)
  returning * into v_room;

  insert into public.room_members (room_id, user_id, role)
  values (v_room.id, v_uid, 'creator');

  insert into public.room_stats (room_id, user_id)
  values (v_room.id, v_uid);

  return v_room;
end;
$$;

create function public.preview_room_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_creator text;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_room from public.rooms where code = upper(trim(p_code));
  if v_room.id is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;

  select p.display_name into v_creator
  from public.room_members m
  join public.profiles p on p.id = m.user_id
  where m.room_id = v_room.id and m.role = 'creator';

  select count(*) into v_count from public.room_members where room_id = v_room.id;

  return jsonb_build_object(
    'id', v_room.id,
    'name', v_room.name,
    'room_type', v_room.room_type,
    'expires_at', v_room.expires_at,
    'status', v_room.status,
    'creator_name', v_creator,
    'member_count', v_count,
    'already_member', public.is_room_member(v_room.id, auth.uid())
  );
end;
$$;

create function public.join_room_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
end;
$$;

create function public.regenerate_room_code(p_room uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_attempt int := 0;
begin
  if not exists (select 1 from public.rooms where id = p_room and created_by = auth.uid()) then
    raise exception 'NOT_ROOM_CREATOR';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_room_code();
    exit when not exists (select 1 from public.rooms where code = v_code);
    if v_attempt > 20 then
      raise exception 'CODE_GENERATION_FAILED';
    end if;
  end loop;

  update public.rooms set code = v_code where id = p_room;
  return v_code;
end;
$$;

create function public.close_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.rooms where id = p_room and created_by = auth.uid()) then
    raise exception 'NOT_ROOM_CREATOR';
  end if;
  update public.rooms set status = 'closed' where id = p_room;
end;
$$;

create function public.leave_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.room_members where room_id = p_room and user_id = auth.uid();
  if v_role is null then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_role = 'creator' then
    raise exception 'CREATOR_MUST_CLOSE_ROOM';
  end if;
  delete from public.room_members where room_id = p_room and user_id = auth.uid();
  delete from public.room_stats where room_id = p_room and user_id = auth.uid();
end;
$$;

-- ============================================================
-- DUOLYNK game RPCs
-- ============================================================

create function public.start_game(p_room uuid, p_game text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session uuid;
  v_rounds int;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not public.is_room_member(p_room, v_uid) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if not public.room_is_open(p_room) then
    raise exception 'ROOM_NOT_OPEN';
  end if;
  if p_game not in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds') then
    raise exception 'INVALID_GAME';
  end if;
  if exists (select 1 from public.game_sessions where room_id = p_room and status in ('invited', 'active')) then
    raise exception 'GAME_IN_PROGRESS';
  end if;

  v_rounds := case p_game
    when 'who_knows_you' then 6
    when 'brain_battle' then 6
    when 'this_or_that' then 8
    else 3
  end;

  insert into public.game_sessions (room_id, game_key, invited_by, total_rounds, status)
  values (p_room, p_game, v_uid, v_rounds, 'invited')
  returning id into v_session;

  insert into public.game_rounds (session_id, round_index, prompt, solution)
  select v_session, (row_number() over ()) - 1, q.prompt, q.solution
  from (
    select prompt, solution
    from public.game_questions
    where game_key = p_game and active
    order by random()
    limit v_rounds
  ) q;

  return v_session;
end;
$$;

create function public.respond_game_invite(p_session uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
  v_status text;
  v_invited_by uuid;
begin
  select room_id, status, invited_by into v_room, v_status, v_invited_by
  from public.game_sessions where id = p_session;

  if v_room is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.is_room_member(v_room, auth.uid()) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_status <> 'invited' then
    raise exception 'SESSION_NOT_PENDING';
  end if;
  if v_invited_by = auth.uid() then
    raise exception 'INVITER_CANNOT_RESPOND';
  end if;

  if p_accept then
    update public.game_sessions
      set status = 'active',
          started_at = now(),
          current_round = 0,
          state = jsonb_build_object('round_started_at', to_jsonb(now()))
      where id = p_session;
  else
    update public.game_sessions
      set status = 'declined', finished_at = now()
      where id = p_session;
  end if;
end;
$$;

create function public.cancel_game(p_session uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
begin
  select room_id into v_room from public.game_sessions where id = p_session;
  if v_room is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.is_room_member(v_room, auth.uid()) then
    raise exception 'NOT_A_MEMBER';
  end if;
  update public.game_sessions
    set status = 'cancelled', finished_at = now()
    where id = p_session and status in ('invited', 'active');
end;
$$;

create function public.get_game_round(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_prompt jsonb;
  v_role text;
  v_my_submitted boolean := false;
  v_partner_submitted boolean := false;
  v_scores jsonb;
begin
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.is_room_member(v_s.room_id, v_uid) then
    raise exception 'NOT_A_MEMBER';
  end if;

  select role into v_role from public.room_members where room_id = v_s.room_id and user_id = v_uid;

  if v_s.status = 'active' then
    select prompt into v_prompt
    from public.game_rounds
    where session_id = p_session and round_index = v_s.current_round;

    if v_s.game_key = 'two_minds' and v_prompt is not null then
      v_prompt := jsonb_build_object(
        'mission', v_prompt->>'mission',
        'clue', case when v_role = 'creator' then v_prompt->>'clueA' else v_prompt->>'clueB' end
      );
    end if;

    select exists (
      select 1 from public.game_submissions
      where session_id = p_session and round_index = v_s.current_round and user_id = v_uid
    ) into v_my_submitted;

    select exists (
      select 1 from public.game_submissions
      where session_id = p_session and round_index = v_s.current_round and user_id <> v_uid
    ) into v_partner_submitted;
  end if;

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
    'current_round', v_s.current_round,
    'total_rounds', v_s.total_rounds,
    'prompt', v_prompt,
    'my_submitted', v_my_submitted,
    'partner_submitted', v_partner_submitted,
    'rounds', coalesce(v_s.state->'rounds', '{}'::jsonb),
    'last_attempt', v_s.state->'last_attempt',
    'scores', v_scores,
    'invited_by', v_s.invited_by,
    'started_at', v_s.started_at,
    'finished_at', v_s.finished_at
  );
end;
$$;

create function public.submit_game_answer(p_session uuid, p_round integer, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_round public.game_rounds;
  v_a_uid uuid;
  v_b_uid uuid;
  v_a_payload jsonb;
  v_b_payload jsonb;
  v_a_at timestamptz;
  v_b_at timestamptz;
  v_a_points int := 0;
  v_b_points int := 0;
  v_result jsonb;
  v_count int;
  v_round_start timestamptz;
  v_next int;
  v_a_total int;
  v_b_total int;
  v_winner uuid;
  v_solved boolean;
  v_matched boolean;
  v_correct text;
  v_a_ok boolean;
  v_b_ok boolean;
  v_a_secs numeric;
  v_b_secs numeric;
  v_state jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then
    raise exception 'SESSION_NOT_FOUND';
  end if;
  if not public.is_room_member(v_s.room_id, v_uid) then
    raise exception 'NOT_A_MEMBER';
  end if;
  if v_s.status <> 'active' then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;
  if p_round <> v_s.current_round then
    raise exception 'ROUND_MISMATCH';
  end if;

  select * into v_round from public.game_rounds where session_id = p_session and round_index = p_round;
  if v_round.id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  insert into public.game_submissions (session_id, user_id, round_index, payload)
  values (p_session, v_uid, p_round, p_payload)
  on conflict (session_id, user_id, round_index) do nothing;

  select count(*) into v_count
  from public.game_submissions
  where session_id = p_session and round_index = p_round;

  if v_count < 2 then
    return jsonb_build_object('status', 'waiting');
  end if;

  select m.user_id into v_a_uid from public.room_members m
  where m.room_id = v_s.room_id and m.role = 'creator';
  select m.user_id into v_b_uid from public.room_members m
  where m.room_id = v_s.room_id and m.role = 'partner';

  select payload, submitted_at into v_a_payload, v_a_at
  from public.game_submissions
  where session_id = p_session and round_index = p_round and user_id = v_a_uid;

  select payload, submitted_at into v_b_payload, v_b_at
  from public.game_submissions
  where session_id = p_session and round_index = p_round and user_id = v_b_uid;

  if v_a_payload is null or v_b_payload is null then
    return jsonb_build_object('status', 'waiting');
  end if;

  v_round_start := coalesce((v_s.state->>'round_started_at')::timestamptz, v_s.started_at, now());

  if v_s.game_key = 'who_knows_you' then
    v_a_ok := (v_a_payload->>'predict') = (v_b_payload->>'self');
    v_b_ok := (v_b_payload->>'predict') = (v_a_payload->>'self');
    v_a_points := case when v_a_ok then 10 else 0 end;
    v_b_points := case when v_b_ok then 10 else 0 end;
    v_result := jsonb_build_object(
      'game', 'who_knows_you',
      'a', jsonb_build_object('self', v_a_payload->>'self', 'predict', v_a_payload->>'predict', 'correct', v_a_ok, 'points', v_a_points),
      'b', jsonb_build_object('self', v_b_payload->>'self', 'predict', v_b_payload->>'predict', 'correct', v_b_ok, 'points', v_b_points)
    );

  elsif v_s.game_key = 'brain_battle' then
    v_correct := v_round.solution->>'correct';
    v_a_ok := (v_a_payload->>'choice') = v_correct;
    v_b_ok := (v_b_payload->>'choice') = v_correct;
    v_a_secs := greatest(0, extract(epoch from (v_a_at - v_round_start)));
    v_b_secs := greatest(0, extract(epoch from (v_b_at - v_round_start)));
    v_a_points := case when v_a_ok then greatest(5, 20 - floor(v_a_secs / 2)::int) else 0 end;
    v_b_points := case when v_b_ok then greatest(5, 20 - floor(v_b_secs / 2)::int) else 0 end;
    v_result := jsonb_build_object(
      'game', 'brain_battle',
      'correct', v_correct,
      'a', jsonb_build_object('choice', v_a_payload->>'choice', 'correct', v_a_ok, 'points', v_a_points, 'seconds', round(v_a_secs, 1)),
      'b', jsonb_build_object('choice', v_b_payload->>'choice', 'correct', v_b_ok, 'points', v_b_points, 'seconds', round(v_b_secs, 1))
    );

  elsif v_s.game_key = 'this_or_that' then
    v_matched := (v_a_payload->>'choice') = (v_b_payload->>'choice');
    v_a_points := case when v_matched then 10 else 0 end;
    v_b_points := v_a_points;
    v_result := jsonb_build_object(
      'game', 'this_or_that',
      'matched', v_matched,
      'topic', v_round.prompt->>'topic',
      'a', jsonb_build_object('choice', v_a_payload->>'choice', 'points', v_a_points),
      'b', jsonb_build_object('choice', v_b_payload->>'choice', 'points', v_b_points)
    );

  else
    v_a_ok := lower(regexp_replace(trim(coalesce(v_a_payload->>'answer', '')), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(coalesce(v_round.solution->>'answer', '')), '\s+', ' ', 'g'));
    v_b_ok := lower(regexp_replace(trim(coalesce(v_b_payload->>'answer', '')), '\s+', ' ', 'g'))
              = lower(regexp_replace(trim(coalesce(v_round.solution->>'answer', '')), '\s+', ' ', 'g'));
    v_solved := v_a_ok and v_b_ok;

    if not v_solved then
      delete from public.game_submissions
      where session_id = p_session and round_index = p_round;

      update public.game_sessions
        set state = jsonb_set(
          coalesce(state, '{}'::jsonb),
          '{last_attempt}',
          jsonb_build_object(
            'round', p_round,
            'a', jsonb_build_object('answer', v_a_payload->>'answer', 'correct', v_a_ok),
            'b', jsonb_build_object('answer', v_b_payload->>'answer', 'correct', v_b_ok)
          ),
          true
        )
        where id = p_session;

      return jsonb_build_object('status', 'retry', 'a_correct', v_a_ok, 'b_correct', v_b_ok);
    end if;

    v_a_points := 15;
    v_b_points := 15;
    v_result := jsonb_build_object(
      'game', 'two_minds',
      'solved', true,
      'answer', v_round.solution->>'answer',
      'a', jsonb_build_object('answer', v_a_payload->>'answer', 'points', v_a_points),
      'b', jsonb_build_object('answer', v_b_payload->>'answer', 'points', v_b_points)
    );
  end if;

  update public.game_submissions set points = v_a_points
  where session_id = p_session and round_index = p_round and user_id = v_a_uid;

  update public.game_submissions set points = v_b_points
  where session_id = p_session and round_index = p_round and user_id = v_b_uid;

  update public.room_stats set points = points + v_a_points
  where room_id = v_s.room_id and user_id = v_a_uid;

  update public.room_stats set points = points + v_b_points
  where room_id = v_s.room_id and user_id = v_b_uid;

  v_next := p_round + 1;
  v_state := jsonb_set(coalesce(v_s.state, '{}'::jsonb), array['rounds', p_round::text], v_result, true);
  v_state := v_state - 'last_attempt';

  if v_next >= v_s.total_rounds then
    select coalesce(sum(points), 0) into v_a_total
    from public.game_submissions where session_id = p_session and user_id = v_a_uid;

    select coalesce(sum(points), 0) into v_b_total
    from public.game_submissions where session_id = p_session and user_id = v_b_uid;

    v_winner := case
      when v_a_total > v_b_total then v_a_uid
      when v_b_total > v_a_total then v_b_uid
      else null
    end;

    update public.game_sessions
      set status = 'finished', finished_at = now(), current_round = v_next, state = v_state
      where id = p_session;

    update public.room_stats set games_played = games_played + 1
    where room_id = v_s.room_id and user_id in (v_a_uid, v_b_uid);

    if v_winner is not null then
      update public.room_stats set games_won = games_won + 1
      where room_id = v_s.room_id and user_id = v_winner;
    end if;

    insert into public.achievements (room_id, user_id, key, label)
    select v_s.room_id, u, 'first_' || v_s.game_key,
      case v_s.game_key
        when 'who_knows_you' then 'Played Who Knows You Better?'
        when 'brain_battle' then 'Played Brain Battle'
        when 'this_or_that' then 'Played This or That?'
        else 'Played Two Minds, One Mission'
      end
    from unnest(array[v_a_uid, v_b_uid]) as u
    on conflict (room_id, user_id, key) do nothing;

    if v_s.game_key = 'brain_battle' and v_winner is not null then
      insert into public.achievements (room_id, user_id, key, label)
      values (v_s.room_id, v_winner, 'brain_champion', 'Brain Battle champion')
      on conflict (room_id, user_id, key) do nothing;
    end if;

    if v_s.game_key = 'two_minds' then
      insert into public.achievements (room_id, user_id, key, label)
      select v_s.room_id, u, 'mission_master', 'Completed every mission together'
      from unnest(array[v_a_uid, v_b_uid]) as u
      on conflict (room_id, user_id, key) do nothing;
    end if;

    return jsonb_build_object(
      'status', 'finished',
      'winner_id', v_winner,
      'a_total', v_a_total,
      'b_total', v_b_total
    );
  end if;

  v_state := jsonb_set(v_state, '{round_started_at}', to_jsonb(now()), true);

  update public.game_sessions
    set current_round = v_next, state = v_state
    where id = p_session;

  return jsonb_build_object('status', 'resolved', 'next_round', v_next);
end;
$$;

-- ------------------------------------------------------------
-- grants
-- ------------------------------------------------------------

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.create_room(text, text, integer) to authenticated;
grant execute on function public.preview_room_by_code(text) to authenticated;
grant execute on function public.join_room_by_code(text) to authenticated;
grant execute on function public.regenerate_room_code(uuid) to authenticated;
grant execute on function public.close_room(uuid) to authenticated;
grant execute on function public.leave_room(uuid) to authenticated;
grant execute on function public.start_game(uuid, text) to authenticated;
grant execute on function public.respond_game_invite(uuid, boolean) to authenticated;
grant execute on function public.cancel_game(uuid) to authenticated;
grant execute on function public.get_game_round(uuid) to authenticated;
grant execute on function public.submit_game_answer(uuid, integer, jsonb) to authenticated;
