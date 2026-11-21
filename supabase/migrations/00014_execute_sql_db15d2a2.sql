BEGIN; CREATE TEMPORARY TABLE probe_log (
  step text,
  detail text
) ON COMMIT DROP; DO $$
declare
  v_room uuid; v_code text; v_session uuid; v_state jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  select id, code into v_room, v_code from public.create_room('TTT Probe','permanent',null);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.join_room_by_code(v_code);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_session := public.start_game(v_room,'tic_tac_toe');
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.respond_game_invite(v_session, true);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 0);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 3);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 1);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 4);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 2);
  insert into probe_log values ('win_state', v_state::text);

  insert into probe_log values ('stats', (select string_agg(user_id::text || ':' || points || '/' || games_played || '/' || games_won, ' | ')
    from public.room_stats where room_id = v_room));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.close_room(v_room);
  insert into probe_log values ('partner_close', (select status from public.rooms where id=v_room));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  perform public.delete_room(v_room);
  insert into probe_log values ('creator_delete', (select count(*)::text from public.rooms where id=v_room));
end $$; ROLLBACK;