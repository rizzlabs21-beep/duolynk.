create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  category text not null default 'moment',
  tone text not null default 'coral',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.reel_reactions (
  room_id uuid not null references public.rooms(id) on delete cascade,
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null default 'heart',
  created_at timestamptz not null default now(),
  primary key (room_id, reel_id, user_id)
);

alter table public.reels enable row level security;
alter table public.reel_reactions enable row level security;

drop policy if exists "reels readable by authenticated" on public.reels;
create policy "reels readable by authenticated"
  on public.reels for select to authenticated using (true);

drop policy if exists "reactions readable by room members" on public.reel_reactions;
create policy "reactions readable by room members"
  on public.reel_reactions for select to authenticated
  using (public.is_room_member(room_id, auth.uid()));

drop policy if exists "reactions insert own" on public.reel_reactions;
create policy "reactions insert own"
  on public.reel_reactions for insert to authenticated
  with check (user_id = auth.uid() and public.is_room_member(room_id, auth.uid()));

drop policy if exists "reactions update own" on public.reel_reactions;
create policy "reactions update own"
  on public.reel_reactions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_room_member(room_id, auth.uid()));

drop policy if exists "reactions delete own" on public.reel_reactions;
create policy "reactions delete own"
  on public.reel_reactions for delete to authenticated
  using (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reel_reactions'
  ) then
    alter publication supabase_realtime add table public.reel_reactions;
  end if;
end $$;

insert into public.reels (title, caption, category, tone, sort_order)
select * from (values
  ('The first message', 'Do you remember the very first thing you said to each other here? Say it again.', 'memory', 'coral', 1),
  ('One song', 'Drop the song that always brings them to mind. No explaining, just the title.', 'sound', 'lavender', 2),
  ('A tiny ritual', 'What small thing do you two do that nobody else would understand?', 'ritual', 'gold', 3),
  ('The best day', 'Describe your favourite day together in one sentence.', 'memory', 'indigo', 4),
  ('Distance math', 'How many kilometres apart are you right now? Guess before you check.', 'distance', 'coral', 5),
  ('Next first', 'What is one thing you have never done together but really want to?', 'future', 'lavender', 6),
  ('The comfort meal', 'What food means home to you both?', 'ritual', 'gold', 7),
  ('Three words', 'Say what you appreciate about them in exactly three words.', 'words', 'indigo', 8)
) as seed(title, caption, category, tone, sort_order)
where not exists (select 1 from public.reels);