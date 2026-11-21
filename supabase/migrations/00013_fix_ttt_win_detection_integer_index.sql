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
  where (v_board->>((t.line->>0)::int)) = v_symbol
    and (v_board->>((t.line->>1)::int)) = v_symbol
    and (v_board->>((t.line->>2)::int)) = v_symbol
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