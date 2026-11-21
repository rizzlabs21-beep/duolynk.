BEGIN; CREATE TEMPORARY TABLE probe_log (
  step text,
  detail text
) ON COMMIT DROP; DO $$
declare
  v_room uuid; v_code text; v_session uuid; v_state jsonb;
begin
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  select id, code into v_room, v_code from public.create_room('TOD Probe','permanent',null);
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.join_room_by_code(v_code);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_session := public.start_game(v_room,'truth_or_dare');
  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  perform public.respond_game_invite(v_session, true);
  v_state := public.get_tod_state(v_session);
  insert into probe_log values ('start', 'round=' || (v_state->>'round') || ' my_turn=' || (v_state->>'my_turn') || ' total=' || (v_state->>'total_rounds'));

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  v_state := public.tod_draw(v_session, 'truth');
  insert into probe_log values ('draw_truth', v_state->'prompt'->>'text');
  v_state := public.tod_resolve(v_session, true);
  insert into probe_log values ('after_done', 'round=' || (v_state->>'round') || ' my_turn=' || (v_state->>'my_turn') || ' scores=' || (v_state->'scores')::text);

  perform set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}', true);
  v_state := public.tod_draw(v_session, 'dare');
  insert into probe_log values ('draw_dare', v_state->'prompt'->>'text');
  v_state := public.tod_resolve(v_session, false);
  insert into probe_log values ('after_skip', 'round=' || (v_state->>'round') || ' my_turn=' || (v_state->>'my_turn') || ' history=' || jsonb_array_length(v_state->'history'));

  begin
    perform public.tod_draw(v_session, 'truth');
    insert into probe_log values ('wrong_turn','UNEXPECTED SUCCESS');
  exception when others then
    insert into probe_log values ('wrong_turn', SQLERRM);
  end;
end $$; ROLLBACK;