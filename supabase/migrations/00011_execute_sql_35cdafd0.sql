BEGIN; CREATE TEMPORARY TABLE probe_log (
  step text,
  detail text
) ON COMMIT DROP; DO $$
declare
  v_room uuid; v_code text; v_session uuid; v_state jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  select id, code into v_room, v_code from public.create_room('TTT Probe','permanent',null);
  insert into probe_log values ('create', v_room::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.join_room_by_code(v_code);

  begin
    perform public.delete_room(v_room);
    insert into probe_log values ('partner_delete','UNEXPECTED SUCCESS');
  exception when others then
    insert into probe_log values ('partner_delete', SQLERRM);
  end;

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_session := public.start_game(v_room,'tic_tac_toe');
  insert into probe_log values ('start_ttt', v_session::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.respond_game_invite(v_session, true);
  v_state := public.get_ttt_state(v_session);
  insert into probe_log values ('after_accept', v_state::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 0);
  insert into probe_log values ('x_plays_0', 'turn=' || coalesce(v_state->>'turn','null'));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 3);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 1);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 4);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.submit_ttt_move(v_session, 2);
  insert into probe_log values ('final', v_state::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.close_room(v_room);
  insert into probe_log values ('partner_close', (select status from public.rooms where id=v_room));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  perform public.delete_room(v_room);
  insert into probe_log values ('creator_delete', (select count(*)::text from public.rooms where id=v_room));
end $$; ROLLBACK;