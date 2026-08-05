-- Total Form Fitness — dietary pattern + food preferences (client-customizable;
-- filters food recommendations). diet_pattern is the eating style (vegan,
-- vegetarian, pescatarian, mediterranean, carnivore, or anything); food_avoid is
-- a free-text list of ingredients to keep out of suggestions. Coach or client can
-- set them (client_profiles_write already permits both). Idempotent.
alter table public.client_profiles add column if not exists diet_pattern text not null default 'anything';
alter table public.client_profiles add column if not exists food_avoid text not null default '';
