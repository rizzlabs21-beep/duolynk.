create or replace function public.get_public_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rooms', (select count(*) from public.rooms),
    'games', (select count(*) from public.game_sessions where status = 'finished')
  );
$$;

grant execute on function public.get_public_stats() to anon, authenticated;