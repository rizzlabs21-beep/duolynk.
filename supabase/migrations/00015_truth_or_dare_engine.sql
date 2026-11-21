alter table public.game_sessions drop constraint if exists game_sessions_game_key_check;
alter table public.game_sessions
  add constraint game_sessions_game_key_check
  check (game_key in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds', 'tic_tac_toe', 'truth_or_dare'));

create table if not exists public.tod_prompts (
  id serial primary key,
  kind text not null check (kind in ('truth', 'dare')),
  category text not null check (category in ('playful', 'romantic', 'deep', 'daring')),
  text text not null,
  active boolean not null default true
);

create unique index if not exists tod_prompts_kind_text_key on public.tod_prompts (kind, text);
create index if not exists tod_prompts_kind_idx on public.tod_prompts (kind) where active;

alter table public.tod_prompts enable row level security;

insert into public.tod_prompts (kind, category, text) values
  ('truth', 'playful', 'What is the most embarrassing song on your playlist right now?'),
  ('truth', 'playful', 'What is the silliest thing you have ever cried about?'),
  ('truth', 'playful', 'What is your most irrational fear?'),
  ('truth', 'playful', 'What is the weirdest food combination you actually enjoy?'),
  ('truth', 'playful', 'What is the last thing you searched on your phone?'),
  ('truth', 'playful', 'What is a small habit of mine that you find adorable?'),
  ('truth', 'romantic', 'When did you first realise you were falling for me?'),
  ('truth', 'romantic', 'What is your favourite memory of us so far?'),
  ('truth', 'romantic', 'What is one thing I do that makes you feel loved?'),
  ('truth', 'romantic', 'What is a place you want us to visit together?'),
  ('truth', 'romantic', 'What song reminds you of us?'),
  ('truth', 'romantic', 'What is the first thing you noticed about me?'),
  ('truth', 'deep', 'What is something you have never told me but want to?'),
  ('truth', 'deep', 'What is a fear you have about us?'),
  ('truth', 'deep', 'When do you feel most alone, even when we are talking?'),
  ('truth', 'deep', 'What is one thing you need more of from me?'),
  ('truth', 'deep', 'What does home mean to you?'),
  ('truth', 'deep', 'What is a dream you have not said out loud yet?'),
  ('truth', 'daring', 'What is the most spontaneous thing you have ever done?'),
  ('truth', 'daring', 'What is a rule you would break for me?'),
  ('truth', 'daring', 'What is the boldest message you have ever wanted to send me?'),
  ('truth', 'daring', 'What is something you want to try together that scares you a little?'),
  ('dare', 'playful', 'Send me a voice note singing the chorus of our song.'),
  ('dare', 'playful', 'Text me three emojis that describe your mood right now, no words.'),
  ('dare', 'playful', 'Do your best impression of me for ten seconds.'),
  ('dare', 'playful', 'Send a photo of the messiest corner of your room.'),
  ('dare', 'playful', 'Type a compliment about me using only your non-dominant hand.'),
  ('dare', 'playful', 'Send me the last photo in your camera roll.'),
  ('dare', 'romantic', 'Tell me three things you love about me, one for each year we have known each other.'),
  ('dare', 'romantic', 'Send me a message you would want to read on a bad day.'),
  ('dare', 'romantic', 'Describe our perfect date in five words.'),
  ('dare', 'romantic', 'Send me a selfie right now, no filters.'),
  ('dare', 'romantic', 'Write me a two-line poem, right now.'),
  ('dare', 'romantic', 'Tell me one thing you want to do with me this month.'),
  ('dare', 'deep', 'Tell me one thing you are proud of that you rarely say out loud.'),
  ('dare', 'deep', 'Share a memory of us that you replay and have never told me about.'),
  ('dare', 'deep', 'Tell me one thing you forgive me for.'),
  ('dare', 'deep', 'Say the thing you have been holding back, gently.'),
  ('dare', 'daring', 'Send me a message you would only send after midnight.'),
  ('dare', 'daring', 'Give me a dare for tomorrow and I have to do it.'),
  ('dare', 'daring', 'Tell me your favourite thing about the way I look.'),
  ('dare', 'daring', 'Send me a photo of something that reminds you of me.')
on conflict (kind, text) do nothing;

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
  if p_game not in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds', 'tic_tac_toe', 'truth_or_dare') then
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
    when 'truth_or_dare' then 12
    else 3
  end;

  insert into public.game_sessions (room_id, game_key, invited_by, total_rounds, status)
  values (p_room, p_game, v_uid, v_rounds, 'invited')
  returning id into v_session;

  if v_rounds > 0 and p_game <> 'truth_or_dare' then
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
            when v_game = 'truth_or_dare' then jsonb_build_object(
              'turn', v_invited_by,
              'round', 1,
              'kind', null,
              'prompt', null,
              'history', '[]'::jsonb,
              'used', '[]'::jsonb
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

create or replace function public.get_tod_state(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    'kind', v_s.state->'kind',
    'prompt', v_s.state->'prompt',
    'history', coalesce(v_s.state->'history', '[]'::jsonb),
    'scores', v_scores,
    'invited_by', v_s.invited_by,
    'started_at', v_s.started_at,
    'finished_at', v_s.finished_at,
    'winner', nullif(v_s.state->>'winner', '')::uuid
  );
end;
$$;

create or replace function public.tod_draw(p_session uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_used jsonb;
  v_prompt public.tod_prompts;
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
  if p_kind not in ('truth', 'dare') then
    raise exception 'INVALID_KIND';
  end if;

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then
    raise exception 'NOT_YOUR_TURN';
  end if;
  if v_s.state->'prompt' is not null and v_s.state->'prompt' <> 'null'::jsonb then
    raise exception 'PROMPT_ALREADY_DRAWN';
  end if;

  v_used := coalesce(v_s.state->'used', '[]'::jsonb);

  select * into v_prompt
  from public.tod_prompts
  where kind = p_kind and active and not (v_used @> to_jsonb(id))
  order by random()
  limit 1;

  if v_prompt.id is null then
    v_used := '[]'::jsonb;
    select * into v_prompt
    from public.tod_prompts
    where kind = p_kind and active
    order by random()
    limit 1;
  end if;

  if v_prompt.id is null then
    raise exception 'NO_PROMPTS';
  end if;

  update public.game_sessions
    set state = v_s.state || jsonb_build_object(
      'kind', p_kind,
      'prompt', jsonb_build_object(
        'id', v_prompt.id,
        'kind', v_prompt.kind,
        'category', v_prompt.category,
        'text', v_prompt.text
      ),
      'used', v_used || to_jsonb(v_prompt.id)
    )
    where id = p_session;

  return public.get_tod_state(p_session);
end;
$$;

create or replace function public.tod_resolve(p_session uuid, p_completed boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_s public.game_sessions;
  v_turn uuid;
  v_prompt jsonb;
  v_round int;
  v_next int;
  v_a uuid;
  v_b uuid;
  v_a_total int;
  v_b_total int;
  v_winner uuid;
  v_history jsonb;
  v_points int;
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

  v_turn := nullif(v_s.state->>'turn', '')::uuid;
  if v_turn is distinct from v_uid then
    raise exception 'NOT_YOUR_TURN';
  end if;

  v_prompt := v_s.state->'prompt';
  if v_prompt is null or v_prompt = 'null'::jsonb then
    raise exception 'NO_PROMPT';
  end if;

  v_round := coalesce((v_s.state->>'round')::int, 1);
  v_points := case when p_completed then 10 else 0 end;

  if p_completed then
    insert into public.game_submissions (session_id, user_id, round_index, payload, points)
    values (
      p_session, v_uid, v_round - 1,
      jsonb_build_object('kind', v_prompt->>'kind', 'text', v_prompt->>'text'),
      v_points
    )
    on conflict (session_id, user_id, round_index) do update set points = excluded.points;

    update public.room_stats set points = points + v_points
      where room_id = v_s.room_id and user_id = v_uid;
  end if;

  v_history := coalesce(v_s.state->'history', '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'round', v_round,
      'kind', v_prompt->>'kind',
      'text', v_prompt->>'text',
      'category', v_prompt->>'category',
      'by', v_uid,
      'done', p_completed
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
          state = v_s.state || jsonb_build_object(
            'turn', null, 'kind', null, 'prompt', null,
            'history', v_history, 'round', v_next, 'winner', v_winner
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
          state = v_s.state || jsonb_build_object(
            'turn', case when v_uid = v_a then v_b else v_a end,
            'kind', null,
            'prompt', null,
            'history', v_history,
            'round', v_next
          )
      where id = p_session;
  end if;

  return public.get_tod_state(p_session);
end;
$$;

grant execute on function public.get_tod_state(uuid) to authenticated;
grant execute on function public.tod_draw(uuid, text) to authenticated;
grant execute on function public.tod_resolve(uuid, boolean) to authenticated;