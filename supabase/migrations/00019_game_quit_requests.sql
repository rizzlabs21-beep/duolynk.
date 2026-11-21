alter table public.game_sessions add column if not exists quit_requested_by uuid;
alter table public.game_sessions add column if not exists quit_requested_at timestamptz;

create or replace function public.request_game_quit(p_session uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if v_s.quit_requested_by is not null and v_s.quit_requested_by <> v_uid then
    raise exception 'QUIT_ALREADY_REQUESTED';
  end if;

  update public.game_sessions
    set quit_requested_by = v_uid, quit_requested_at = now()
    where id = p_session;

  return jsonb_build_object('status', 'requested', 'quit_requested_by', v_uid);
end $$;

create or replace function public.respond_game_quit(p_session uuid, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.status <> 'active' then raise exception 'SESSION_NOT_ACTIVE'; end if;
  if v_s.quit_requested_by is null then raise exception 'NO_QUIT_REQUEST'; end if;
  if v_s.quit_requested_by = v_uid then raise exception 'REQUESTER_CANNOT_RESPOND'; end if;

  if p_accept then
    update public.game_sessions
      set status = 'cancelled',
          finished_at = now(),
          quit_requested_by = null,
          quit_requested_at = null
      where id = p_session;
    return jsonb_build_object('status', 'cancelled');
  end if;

  update public.game_sessions
    set quit_requested_by = null, quit_requested_at = null
    where id = p_session;
  return jsonb_build_object('status', 'declined');
end $$;

create or replace function public.cancel_game_quit(p_session uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_s from public.game_sessions where id = p_session;
  if v_s.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if not public.is_room_member(v_s.room_id, v_uid) then raise exception 'NOT_A_MEMBER'; end if;
  if v_s.quit_requested_by is distinct from v_uid then raise exception 'NOT_REQUESTER'; end if;

  update public.game_sessions
    set quit_requested_by = null, quit_requested_at = null
    where id = p_session;
  return jsonb_build_object('status', 'cancelled_request');
end $$;

revoke execute on function public.request_game_quit(uuid) from public;
revoke execute on function public.respond_game_quit(uuid, boolean) from public;
revoke execute on function public.cancel_game_quit(uuid) from public;
grant execute on function public.request_game_quit(uuid) to authenticated;
grant execute on function public.respond_game_quit(uuid, boolean) to authenticated;
grant execute on function public.cancel_game_quit(uuid) to authenticated;