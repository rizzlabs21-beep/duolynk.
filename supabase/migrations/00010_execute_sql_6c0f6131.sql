DO $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reel_reactions'
  ) then
    alter publication supabase_realtime drop table public.reel_reactions;
  end if;
end $$; DROP TABLE IF EXISTS public.reel_reactions; DROP TABLE IF EXISTS public.reels;