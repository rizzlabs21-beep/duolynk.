-- 1. Any member may close a room; closing also cancels open games.
create or replace function public.close_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not public.is_room_member(p_room, auth.uid()) then
    raise exception 'NOT_A_MEMBER';
  end if;
  update public.rooms set status = 'closed' where id = p_room;
  update public.game_sessions
    set status = 'cancelled', finished_at = now()
    where room_id = p_room and status in ('invited', 'active');
end;
$$;

-- 2. Only the creator may permanently delete a room.
create or replace function public.delete_room(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select created_by into v_creator from public.rooms where id = p_room;
  if v_creator is null then
    raise exception 'ROOM_NOT_FOUND';
  end if;
  if v_creator <> auth.uid() then
    raise exception 'NOT_ROOM_CREATOR';
  end if;

  delete from public.game_submissions
    where session_id in (select id from public.game_sessions where room_id = p_room);
  delete from public.game_rounds
    where session_id in (select id from public.game_sessions where room_id = p_room);
  delete from public.game_sessions where room_id = p_room;
  delete from public.achievements where room_id = p_room;
  delete from public.room_stats where room_id = p_room;
  delete from public.room_members where room_id = p_room;
  delete from public.rooms where id = p_room;
end;
$$;

-- 3. start_game accepts Tic-Tac-Toe (no question rounds).
create or replace function public.start_game(p_room uuid, p_game text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_session uuid;
  v_rounds int;
  v_members int;
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
  if p_game not in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds', 'tic_tac_toe') then
    raise exception 'INVALID_GAME';
  end if;

  select count(*) into v_members from public.room_members where room_id = p_room;
  if v_members < 2 then
    raise exception 'PARTNER_NOT_JOINED';
  end if;

  if exists (select 1 from public.game_sessions where room_id = p_room and status in ('invited', 'active')) then
    raise exception 'GAME_IN_PROGRESS';
  end if;

  v_rounds := case p_game
    when 'who_knows_you' then 6
    when 'brain_battle' then 6
    when 'this_or_that' then 8
    when 'tic_tac_toe' then 0
    else 3
  end;

  insert into public.game_sessions (room_id, game_key, invited_by, total_rounds, status)
  values (p_room, p_game, v_uid, v_rounds, 'invited')
  returning id into v_session;

  if v_rounds > 0 then
    insert into public.game_rounds (session_id, round_index, prompt, solution)
    select v_session, (row_number() over ()) - 1, q.prompt, q.solution
    from (
      select prompt, solution
      from public.game_questions
      where game_key = p_game and active
      order by random()
      limit v_rounds
    ) q;
  end if;

  return v_session;
end;
$$;

-- 4. Accepting a Tic-Tac-Toe invite seeds the board.
create or replace function public.respond_game_invite(p_session uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room uuid;
  v_status text;
  v_invited_by uuid;
  v_game text;
begin
  select room_id, status, invited_by, game_key
    into v_room, v_status, v_invited_by, v_game
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
          state = case
            when v_game = 'tic_tac_toe' then jsonb_build_object(
              'board', jsonb_build_array('', '', '', '', '', '', '', '', ''),
              'turn', v_invited_by,
              'winner', null,
              'winning_line', null
            )
            else jsonb_build_object('round_started_at', to_jsonb(now()))
          end
      where id = p_session;
  else
    update public.game_sessions
      set status = 'declined', finished_at = now()
      where id = p_session;
  end if;
end;
$$;

-- 5. Read the live Tic-Tac-Toe board.
create or replace function public.get_ttt_state(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_role text;
  v_a uuid;
  v_b uuid;
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
  select user_id into v_a from public.room_members where room_id = v_s.room_id and role = 'creator';
  select user_id into v_b from public.room_members where room_id = v_s.room_id and role = 'partner';

  select jsonb_build_object(
    'a', coalesce((select sum(points) from public.game_submissions where session_id = p_session and user_id = v_a), 0),
    'b', coalesce((select sum(points) from public.game_submissions where session_id = p_session and user_id = v_b), 0)
  ) into v_scores;

  return jsonb_build_object(
    'session_id', v_s.id,
    'game_key', v_s.game_key,
    'status', v_s.status,
    'board', coalesce(v_s.state->'board', jsonb_build_array('', '', '', '', '', '', '', '', '')),
    'turn', v_s.state->>'turn',
    'winner', v_s.state->>'winner',
    'winning_line', v_s.state->'winning_line',
    'my_symbol', case when v_role = 'creator' then 'X' else 'O' end,
    'my_turn', (v_s.state->>'turn') = v_uid::text,
    'scores', v_scores,
    'invited_by', v_s.invited_by,
    'started_at', v_s.started_at,
    'finished_at', v_s.finished_at
  );
end;
$$;

-- 6. Play one move; validates turn, cell and win/draw.
create or replace function public.submit_ttt_move(p_session uuid, p_cell int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_board jsonb;
  v_turn uuid;
  v_symbol text;
  v_a uuid;
  v_b uuid;
  v_line jsonb;
  v_full boolean;
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
  if v_s.game_key <> 'tic_tac_toe' then
    raise exception 'INVALID_GAME';
  end if;
  if v_s.status <> 'active' then
    raise exception 'SESSION_NOT_ACTIVE';
  end if;
  if p_cell < 0 or p_cell > 8 then
    raise exception 'INVALID_MOVE';
  end if;

  v_board := coalesce(v_s.state->'board', jsonb_build_array('', '', '', '', '', '', '', '', ''));
  if coalesce(v_board->>p_cell, '') <> '' then
    raise exception 'CELL_TAKEN';
  end if;

  v_turn := (v_s.state->>'turn')::uuid;
  if v_turn is distinct from v_uid then
    raise exception 'NOT_YOUR_TURN';
  end if;

  select user_id into v_a from public.room_members where room_id = v_s.room_id and role = 'creator';
  select user_id into v_b from public.room_members where room_id = v_s.room_id and role = 'partner';
  v_symbol := case when v_uid = v_a then 'X' else 'O' end;

  v_board := jsonb_set(v_board, array[p_cell::text], to_jsonb(v_symbol), true);

  select t.line into v_line
  from (
    values
      (jsonb_build_array(0, 1, 2)), (jsonb_build_array(3, 4, 5)), (jsonb_build_array(6, 7, 8)),
      (jsonb_build_array(0, 3, 6)), (jsonb_build_array(1, 4, 7)), (jsonb_build_array(2, 5, 8)),
      (jsonb_build_array(0, 4, 8)), (jsonb_build_array(2, 4, 6))
  ) as t(line)
  where (v_board->>(t.line->>0)) = v_symbol
    and (v_board->>(t.line->>1)) = v_symbol
    and (v_board->>(t.line->>2)) = v_symbol
  limit 1;

  v_full := not exists (
    select 1 from jsonb_array_elements_text(v_board) as c where c = ''
  );

  if v_line is not null then
    update public.game_sessions
      set status = 'finished',
          finished_at = now(),
          state = v_s.state || jsonb_build_object(
            'board', v_board, 'turn', null, 'winner', v_uid, 'winning_line', v_line
          )
      where id = p_session;

    insert into public.game_submissions (session_id, user_id, round_index, payload, points)
    values (p_session, v_uid, 0, jsonb_build_object('result', 'win'), 30)
    on conflict (session_id, user_id, round_index)
      do update set points = excluded.points;

    update public.room_stats set points = points + 30
      where room_id = v_s.room_id and user_id = v_uid;
    update public.room_stats set games_played = games_played + 1
      where room_id = v_s.room_id and user_id in (v_a, v_b);
    update public.room_stats set games_won = games_won + 1
      where room_id = v_s.room_id and user_id = v_uid;

    insert into public.achievements (room_id, user_id, key, label)
    select v_s.room_id, u, 'first_tic_tac_toe', 'Played Tic-Tac-Toe'
    from unnest(array[v_a, v_b]) as u
    on conflict (room_id, user_id, key) do nothing;

    insert into public.achievements (room_id, user_id, key, label)
    values (v_s.room_id, v_uid, 'tic_tac_toe_champion', 'Tic-Tac-Toe champion')
    on conflict (room_id, user_id, key) do nothing;

  elsif v_full then
    update public.game_sessions
      set status = 'finished',
          finished_at = now(),
          state = v_s.state || jsonb_build_object(
            'board', v_board, 'turn', null, 'winner', null, 'winning_line', null
          )
      where id = p_session;

    update public.room_stats set games_played = games_played + 1
      where room_id = v_s.room_id and user_id in (v_a, v_b);

    insert into public.achievements (room_id, user_id, key, label)
    select v_s.room_id, u, 'first_tic_tac_toe', 'Played Tic-Tac-Toe'
    from unnest(array[v_a, v_b]) as u
    on conflict (room_id, user_id, key) do nothing;

  else
    update public.game_sessions
      set state = v_s.state || jsonb_build_object(
        'board', v_board,
        'turn', case when v_uid = v_a then v_b else v_a end
      )
      where id = p_session;
  end if;

  return public.get_ttt_state(p_session);
end;
$$;

grant execute on function public.delete_room(uuid) to authenticated;
grant execute on function public.get_ttt_state(uuid) to authenticated;
grant execute on function public.submit_ttt_move(uuid, int) to authenticated;