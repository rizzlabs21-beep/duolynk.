-- Root cause of the room-creation failure:
-- generate_room_code() called gen_random_bytes() from pgcrypto, but create_room()
-- runs as SECURITY DEFINER with `search_path = public`, so the extension schema
-- was not visible and every create_room call raised 42883.
-- Rewritten with core PostgreSQL functions only (gen_random_uuid + decode/get_byte).
create or replace function public.generate_room_code()
returns text
language plpgsql
set search_path to 'public'
as $function$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_raw text := replace(gen_random_uuid()::text, '-', '');
  v_code text := '';
  i int;
begin
  for i in 1..8 loop
    v_code := v_code || substr(
      v_alphabet,
      1 + (get_byte(decode(substr(v_raw, i * 2 - 1, 2), 'hex'), 0) % length(v_alphabet)),
      1
    );
  end loop;
  return v_code;
end;
$function$;