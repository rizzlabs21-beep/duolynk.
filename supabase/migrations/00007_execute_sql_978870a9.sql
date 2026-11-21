BEGIN; CREATE TEMPORARY TABLE probe_log (
  step text,
  detail text
) ON COMMIT DROP; DO $$
declare
  v_room uuid; v_code text; v_session uuid; v_round jsonb; v_res jsonb; v_preview jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  select id, code into v_room, v_code from public.create_room('Probe Room','permanent',null);
  insert into probe_log values ('create_room', v_room || ' / ' || v_code);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_preview := public.preview_room_by_code(v_code);
  insert into probe_log values ('preview', v_preview::text);
  insert into probe_log values ('join', public.join_room_by_code(v_code)::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_session := public.start_game(v_room,'brain_battle');
  insert into probe_log values ('start_game', v_session::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.respond_game_invite(v_session, true);
  v_round := public.get_game_round(v_session);
  insert into probe_log values ('round_b', left(v_round::text, 400));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_round := public.get_game_round(v_session);
  insert into probe_log values ('round_a', left(v_round::text, 400));
end $$; ROLLBACK;