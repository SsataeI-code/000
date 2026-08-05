-- Total Form Fitness — delete a client without needing the service-role key.
-- A SECURITY DEFINER function (runs with elevated rights) deletes the client's
-- auth user, which cascades to their profile and all their data. Authorized:
-- only the client's own coach or the owner may call it. Idempotent.

create or replace function public.delete_client(p_client uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if p_client is null then
    raise exception 'delete_client: missing client id';
  end if;
  if not (public.is_owner() or public.is_coach_of(p_client)) then
    raise exception 'delete_client: not authorized';
  end if;
  -- Cascades: auth.users -> public.profiles -> all of the client's rows.
  delete from auth.users where id = p_client;
end;
$$;

revoke all on function public.delete_client(uuid) from public, anon;
grant execute on function public.delete_client(uuid) to authenticated;
