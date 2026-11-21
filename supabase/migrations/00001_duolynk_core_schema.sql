-- ============================================================
-- DUOLYNK core schema
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := old.id;
  new.username := old.username;
  new.email := old.email;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

create function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(p_username))
  );
$$;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  code text not null unique,
  room_type text not null check (room_type in ('temporary', 'permanent')),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint rooms_expiry_check check (
    (room_type = 'permanent' and expires_at is null)
    or (room_type = 'temporary' and expires_at is not null)
  )
);

create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('creator', 'partner')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_room_created_idx on public.messages (room_id, created_at desc);

create table public.room_stats (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 0,
  games_played integer not null default 0,
  games_won integer not null default 0,
  primary key (room_id, user_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  label text not null,
  earned_at timestamptz not null default now(),
  unique (room_id, user_id, key)
);

-- ------------------------------------------------------------
-- access helpers (security definer to avoid policy recursion)
-- ------------------------------------------------------------

create function public.is_room_member(p_room uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room and m.user_id = p_user
  );
$$;

create function public.shares_room_with(p_other uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.room_members a
    join public.room_members b on a.room_id = b.room_id
    where a.user_id = p_user and b.user_id = p_other
  );
$$;

create function public.room_is_open(p_room uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = p_room
      and r.status = 'active'
      and (r.expires_at is null or r.expires_at > now())
  );
$$;

-- ------------------------------------------------------------
-- game tables
-- ------------------------------------------------------------

create table public.game_questions (
  id uuid primary key default gen_random_uuid(),
  game_key text not null check (game_key in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds')),
  prompt jsonb not null,
  solution jsonb not null default '{}'::jsonb,
  active boolean not null default true
);

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_key text not null check (game_key in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds')),
  status text not null default 'invited' check (status in ('invited', 'active', 'finished', 'declined', 'cancelled')),
  invited_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  current_round integer not null default 0,
  total_rounds integer not null default 0,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index game_sessions_room_idx on public.game_sessions (room_id, created_at desc);

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  round_index integer not null,
  prompt jsonb not null,
  solution jsonb not null default '{}'::jsonb,
  unique (session_id, round_index)
);

create table public.game_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  round_index integer not null,
  payload jsonb not null,
  points integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique (session_id, user_id, round_index)
);

create index game_submissions_session_idx on public.game_submissions (session_id, round_index);

-- ------------------------------------------------------------
-- row level security
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.room_stats enable row level security;
alter table public.achievements enable row level security;
alter table public.game_questions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_rounds enable row level security;
alter table public.game_submissions enable row level security;

-- profiles: own row plus partners you share a room with
create policy "profiles_select_self_or_partner" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_room_with(id, auth.uid()));

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- rooms: members only
create policy "rooms_select_member" on public.rooms
  for select to authenticated
  using (public.is_room_member(id, auth.uid()));

create policy "rooms_update_creator" on public.rooms
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "rooms_delete_creator" on public.rooms
  for delete to authenticated
  using (created_by = auth.uid());

-- room members: visible to the room, heartbeat on own row
create policy "room_members_select_member" on public.room_members
  for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

create policy "room_members_update_self" on public.room_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages: members of an open room only
create policy "messages_select_member" on public.messages
  for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

create policy "messages_insert_member" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_room_member(room_id, auth.uid())
    and public.room_is_open(room_id)
  );

create policy "messages_delete_own" on public.messages
  for delete to authenticated
  using (sender_id = auth.uid() and public.is_room_member(room_id, auth.uid()));

-- room stats and achievements: members only, written by RPCs
create policy "room_stats_select_member" on public.room_stats
  for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

create policy "achievements_select_member" on public.achievements
  for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

-- game sessions: members only
create policy "game_sessions_select_member" on public.game_sessions
  for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

-- game_questions, game_rounds and game_submissions intentionally expose no
-- direct client access: prompts and solutions are served through RPCs only.

-- ------------------------------------------------------------
-- seed: real game content
-- ------------------------------------------------------------

insert into public.game_questions (game_key, prompt) values
('who_knows_you', '{"question":"What is your ideal Friday night?","options":[{"id":"a","label":"Cozy night in"},{"id":"b","label":"Dinner out"},{"id":"c","label":"Movie marathon"},{"id":"d","label":"Adventure somewhere new"}]}'),
('who_knows_you', '{"question":"Which treat would you reach for first?","options":[{"id":"a","label":"Chocolate"},{"id":"b","label":"Ice cream"},{"id":"c","label":"Fresh pastries"},{"id":"d","label":"Something savoury"}]}'),
('who_knows_you', '{"question":"How do you recharge after a long day?","options":[{"id":"a","label":"Quiet time alone"},{"id":"b","label":"Talking it out"},{"id":"c","label":"A long walk"},{"id":"d","label":"Music and headphones"}]}'),
('who_knows_you', '{"question":"What kind of trip sounds best to you?","options":[{"id":"a","label":"Beach and sunshine"},{"id":"b","label":"City and food"},{"id":"c","label":"Mountains and hiking"},{"id":"d","label":"Somewhere completely new"}]}'),
('who_knows_you', '{"question":"Which gift would mean the most to you?","options":[{"id":"a","label":"Something handmade"},{"id":"b","label":"A surprise plan"},{"id":"c","label":"A useful upgrade"},{"id":"d","label":"A long letter"}]}'),
('who_knows_you', '{"question":"How do you handle being upset?","options":[{"id":"a","label":"I need space first"},{"id":"b","label":"I want to talk right away"},{"id":"c","label":"I distract myself"},{"id":"d","label":"I want a hug"}]}'),
('who_knows_you', '{"question":"What is your morning usually like?","options":[{"id":"a","label":"Up early and productive"},{"id":"b","label":"Snooze as long as possible"},{"id":"c","label":"Slow coffee start"},{"id":"d","label":"Already rushing out"}]}'),
('who_knows_you', '{"question":"Which movie night wins for you?","options":[{"id":"a","label":"Comedy"},{"id":"b","label":"Thriller"},{"id":"c","label":"Romance"},{"id":"d","label":"Documentary"}]}'),
('who_knows_you', '{"question":"How do you feel most loved?","options":[{"id":"a","label":"Kind words"},{"id":"b","label":"Time together"},{"id":"c","label":"Little gifts"},{"id":"d","label":"Helping hands"}]}'),
('who_knows_you', '{"question":"Which chore would you happily skip?","options":[{"id":"a","label":"Dishes"},{"id":"b","label":"Laundry"},{"id":"c","label":"Cleaning floors"},{"id":"d","label":"Grocery shopping"}]}'),
('who_knows_you', '{"question":"How do you like to celebrate good news?","options":[{"id":"a","label":"Tell everyone"},{"id":"b","label":"Quiet celebration"},{"id":"c","label":"Go out somewhere nice"},{"id":"d","label":"Order something delicious"}]}'),
('who_knows_you', '{"question":"What makes you feel most understood?","options":[{"id":"a","label":"Being listened to"},{"id":"b","label":"Being remembered"},{"id":"c","label":"Being checked on"},{"id":"d","label":"Being trusted"}]}');

insert into public.game_questions (game_key, prompt, solution) values
('brain_battle', '{"question":"I have hands but cannot clap. What am I?","options":[{"id":"a","label":"A clock"},{"id":"b","label":"A tree"},{"id":"c","label":"A river"},{"id":"d","label":"A glove"}]}', '{"correct":"a"}'),
('brain_battle', '{"question":"What number comes next: 2, 6, 12, 20, 30, ?","options":[{"id":"a","label":"36"},{"id":"b","label":"40"},{"id":"c","label":"42"},{"id":"d","label":"44"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"Which planet is known as the Red Planet?","options":[{"id":"a","label":"Venus"},{"id":"b","label":"Mars"},{"id":"c","label":"Jupiter"},{"id":"d","label":"Mercury"}]}', '{"correct":"b"}'),
('brain_battle', '{"question":"A notebook costs 3 and a pen costs 2. What do 4 notebooks and 3 pens cost?","options":[{"id":"a","label":"17"},{"id":"b","label":"18"},{"id":"c","label":"19"},{"id":"d","label":"20"}]}', '{"correct":"b"}'),
('brain_battle', '{"question":"What gets wetter the more it dries?","options":[{"id":"a","label":"A sponge"},{"id":"b","label":"A river"},{"id":"c","label":"A towel"},{"id":"d","label":"A cloud"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"How many sides does a hexagon have?","options":[{"id":"a","label":"5"},{"id":"b","label":"6"},{"id":"c","label":"7"},{"id":"d","label":"8"}]}', '{"correct":"b"}'),
('brain_battle', '{"question":"Which is the largest ocean on Earth?","options":[{"id":"a","label":"Atlantic"},{"id":"b","label":"Indian"},{"id":"c","label":"Arctic"},{"id":"d","label":"Pacific"}]}', '{"correct":"d"}'),
('brain_battle', '{"question":"What is 15% of 200?","options":[{"id":"a","label":"20"},{"id":"b","label":"25"},{"id":"c","label":"30"},{"id":"d","label":"35"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"I am tall when I am young and short when I am old. What am I?","options":[{"id":"a","label":"A candle"},{"id":"b","label":"A tree"},{"id":"c","label":"A pencil"},{"id":"d","label":"A shadow"}]}', '{"correct":"a"}'),
('brain_battle', '{"question":"Which word is the odd one out: apple, banana, carrot, mango?","options":[{"id":"a","label":"Apple"},{"id":"b","label":"Banana"},{"id":"c","label":"Carrot"},{"id":"d","label":"Mango"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"A train travels 60 km in 45 minutes. What is its speed in km/h?","options":[{"id":"a","label":"60"},{"id":"b","label":"75"},{"id":"c","label":"80"},{"id":"d","label":"90"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"What has keys but cannot open locks?","options":[{"id":"a","label":"A door"},{"id":"b","label":"A map"},{"id":"c","label":"A piano"},{"id":"d","label":"A box"}]}', '{"correct":"c"}'),
('brain_battle', '{"question":"What is the next prime number after 17?","options":[{"id":"a","label":"18"},{"id":"b","label":"19"},{"id":"c","label":"21"},{"id":"d","label":"23"}]}', '{"correct":"b"}'),
('brain_battle', '{"question":"Which country spans the most time zones?","options":[{"id":"a","label":"Russia"},{"id":"b","label":"United States"},{"id":"c","label":"France"},{"id":"d","label":"China"}]}', '{"correct":"c"}');

insert into public.game_questions (game_key, prompt) values
('this_or_that', '{"left":"Sunrise","right":"Sunset","topic":"When would you rather spend a quiet hour together?"}'),
('this_or_that', '{"left":"Beach","right":"Mountains","topic":"What does your dream weekend look like?"}'),
('this_or_that', '{"left":"Text message","right":"Voice note","topic":"How do you like to hear from each other during the day?"}'),
('this_or_that', '{"left":"Cook at home","right":"Eat out","topic":"What is your favourite way to share a meal?"}'),
('this_or_that', '{"left":"Early bird","right":"Night owl","topic":"When do you feel most like yourself?"}'),
('this_or_that', '{"left":"Plan everything","right":"Go with the flow","topic":"How do you like to travel together?"}'),
('this_or_that', '{"left":"Big group","right":"Just the two of us","topic":"What kind of evening recharges you?"}'),
('this_or_that', '{"left":"City","right":"Countryside","topic":"Where would you rather build a quiet life?"}'),
('this_or_that', '{"left":"Sweet","right":"Savoury","topic":"What is your go-to snack?"}'),
('this_or_that', '{"left":"Movie at home","right":"Cinema","topic":"What makes a perfect movie night?"}'),
('this_or_that', '{"left":"Winter","right":"Summer","topic":"Which season feels most like you?"}'),
('this_or_that', '{"left":"Cats","right":"Dogs","topic":"Who would be waiting at the door?"}'),
('this_or_that', '{"left":"Book","right":"Podcast","topic":"How do you like to learn something new?"}'),
('this_or_that', '{"left":"Road trip","right":"Flight","topic":"How do you want to travel next?"}');

insert into public.game_questions (game_key, prompt, solution) values
('two_minds', '{"mission":"Unlock the first door. What is the three-digit code?","clueA":"The first digit is the number of letters in the word moon.","clueB":"The last two digits are 4 and 7, in that order."}', '{"answer":"447"}'),
('two_minds', '{"mission":"Name the city you are travelling to.","clueA":"It is the capital city of a country famous for pizza and ancient ruins.","clueB":"Its name starts with R and has four letters."}', '{"answer":"rome"}'),
('two_minds', '{"mission":"Find the missing number in the sequence: 3, 6, 11, 18, ?","clueA":"The gaps grow by two each time: plus 3, then plus 5, then plus 7.","clueB":"The next gap is plus 9."}', '{"answer":"27"}'),
('two_minds', '{"mission":"Which animal are you looking for?","clueA":"It lives in the ocean and is the largest animal on Earth.","clueB":"Its name is two words, and the first word is a colour."}', '{"answer":"blue whale"}'),
('two_minds', '{"mission":"What time should you meet?","clueA":"The hour is the number of sides on a triangle plus nine.","clueB":"The minutes are half of sixty."}', '{"answer":"12:30"}'),
('two_minds', '{"mission":"What is the secret word?","clueA":"It is something you can share, and it rhymes with night.","clueB":"It is the opposite of darkness."}', '{"answer":"light"}');

-- ------------------------------------------------------------
-- realtime
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.game_sessions;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_stats;
alter publication supabase_realtime add table public.achievements;
