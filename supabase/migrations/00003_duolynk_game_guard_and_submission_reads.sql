-- 1. A game must never start without both partners in the room.
create or replace function public.start_game(p_room uuid, p_game text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  if p_game not in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds') then
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
$function$;

-- 2. Room members may read the submissions of their own room's sessions,
--    so the "partner has submitted" state can update live.
drop policy if exists "room members read game submissions" on public.game_submissions;
create policy "room members read game submissions"
  on public.game_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.game_sessions s
      where s.id = game_submissions.session_id
        and public.is_room_member(s.room_id, auth.uid())
    )
  );

-- 3. Stream submission inserts to the two room members.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_submissions'
  ) then
    alter publication supabase_realtime add table public.game_submissions;
  end if;
end $$;