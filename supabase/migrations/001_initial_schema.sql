-- ============================================================
-- Chickpea Kitchen — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Profiles table (auto-created on sign-up via trigger)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 2. Favorites (one row per user, stores JSON array of saved recipes)
create table if not exists public.favorites (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '[]'::jsonb not null,
  updated_at timestamptz default now() not null
);

-- 3. Meal plans (one row per user, stores planner state as JSON)
create table if not exists public.meal_plans (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb not null,
  updated_at timestamptz default now() not null
);

-- 4. Shopping lists (one row per user, stores shopping items as JSON)
create table if not exists public.shopping_lists (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '[]'::jsonb not null,
  updated_at timestamptz default now() not null
);

-- 5. Nutrition goals (one row per user, stores macro targets as JSON)
create table if not exists public.nutrition_goals (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb not null,
  updated_at timestamptz default now() not null
);

-- 6. Public recipes (for SEO permalinks — not user-scoped)
create table if not exists public.public_recipes (
  id text primary key,
  name text not null,
  description text default '',
  image text default '',
  ingredients jsonb default '[]'::jsonb,
  steps jsonb default '[]'::jsonb,
  nutrition jsonb default '{"calories":0,"protein":"0g","carbs":"0g","fat":"0g"}'::jsonb,
  tags jsonb default '[]'::jsonb,
  source_url text,
  source_site text,
  total_time text,
  prep_time text,
  cook_time text,
  servings text,
  rating real,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- Row Level Security (RLS) — users can only access their own data
-- ============================================================

alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.public_recipes enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Favorites: users can CRUD their own favorites
create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can update own favorites"
  on public.favorites for update
  using (auth.uid() = user_id);

-- Meal plans: users can CRUD their own plans
create policy "Users can view own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id);

-- Shopping lists: users can CRUD their own lists
create policy "Users can view own shopping lists"
  on public.shopping_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert own shopping lists"
  on public.shopping_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shopping lists"
  on public.shopping_lists for update
  using (auth.uid() = user_id);

-- Nutrition goals: users can CRUD their own goals
create policy "Users can view own nutrition goals"
  on public.nutrition_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own nutrition goals"
  on public.nutrition_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own nutrition goals"
  on public.nutrition_goals for update
  using (auth.uid() = user_id);

-- Public recipes: anyone can read, server (service role) can write
create policy "Anyone can view public recipes"
  on public.public_recipes for select
  using (true);

create policy "Service role can insert public recipes"
  on public.public_recipes for insert
  with check (true);

create policy "Service role can update public recipes"
  on public.public_recipes for update
  using (true);

-- ============================================================
-- Auto-create profile on sign-up (trigger)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop if exists to allow re-running
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done! Your database is ready for Chickpea Kitchen.
-- ============================================================
