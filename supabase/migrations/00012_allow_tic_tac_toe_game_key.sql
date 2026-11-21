alter table public.game_sessions drop constraint if exists game_sessions_game_key_check;
alter table public.game_sessions
  add constraint game_sessions_game_key_check
  check (game_key in ('who_knows_you', 'brain_battle', 'this_or_that', 'two_minds', 'tic_tac_toe'));