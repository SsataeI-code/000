-- Total Form Fitness — promote your account to OWNER.
-- Run this once in Supabase → SQL Editor. Owner unlocks the full coach command
-- center, the CMS copy/image editors, and everything gated to the owner.
-- Safe + idempotent: it only changes the one account matching this email.

update public.profiles
set role = 'owner'
where id = (select id from auth.users where email = 'adam@totalformfitness.com');

-- Confirm it worked (should show one row, role = owner):
select p.id, u.email, p.role
from public.profiles p
join auth.users u on u.id = p.id
where u.email = 'adam@totalformfitness.com';
