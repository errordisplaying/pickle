-- ═══════════════════════════════════════════════════════════════
-- Sous Chef GPT — Supabase Database Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE
-- Automatically created when a user signs up
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it already exists, then create it
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. FAVORITES TABLE
create table if not exists public.favorites (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 3. MEAL PLANS TABLE
create table if not exists public.meal_plans (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 4. SHOPPING LISTS TABLE
create table if not exists public.shopping_lists (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 5. NUTRITION GOALS TABLE
create table if not exists public.nutrition_goals (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Each user can only read/write their own data
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.meal_plans enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.nutrition_goals enable row level security;

-- PROFILES: users can read and update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- FAVORITES: full CRUD for own data
create policy "Users can view own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can update own favorites"
  on public.favorites for update
  using (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- MEAL PLANS: full CRUD for own data
create policy "Users can view own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

-- SHOPPING LISTS: full CRUD for own data
create policy "Users can view own shopping lists"
  on public.shopping_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert own shopping lists"
  on public.shopping_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update own shopping lists"
  on public.shopping_lists for update
  using (auth.uid() = user_id);

create policy "Users can delete own shopping lists"
  on public.shopping_lists for delete
  using (auth.uid() = user_id);

-- NUTRITION GOALS: full CRUD for own data
create policy "Users can view own nutrition goals"
  on public.nutrition_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert own nutrition goals"
  on public.nutrition_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update own nutrition goals"
  on public.nutrition_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete own nutrition goals"
  on public.nutrition_goals for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS TABLES (server-only access via service role key)
-- ═══════════════════════════════════════════════════════════════

-- 6. ANALYTICS EVENTS TABLE
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  user_id uuid references auth.users on delete set null,
  event text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes for fast aggregate queries
create index if not exists idx_analytics_event on public.analytics_events(event);
create index if not exists idx_analytics_created on public.analytics_events(created_at);
create index if not exists idx_analytics_session on public.analytics_events(session_id);

-- 7. INGREDIENT SEARCH STATS (materialized for business ops)
create table if not exists public.ingredient_stats (
  ingredient text primary key,
  search_count int default 0,
  favorite_count int default 0,
  planner_count int default 0,
  last_seen timestamptz default now()
);

-- No RLS on analytics tables — accessed only via server service role key

-- ═══════════════════════════════════════════════════════════════
-- 8. SWAP SUGGESTIONS TABLE (community ingredient swaps)
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.swap_suggestions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  original text not null,
  swap text not null,
  category text not null check (category in ('dairy-free', 'gluten-free', 'vegan', 'low-sodium', 'nut-free')),
  note text,
  ratio text default '1:1',
  status text default 'approved' check (status in ('pending', 'approved', 'rejected')),
  upvotes int default 0,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_swap_status on public.swap_suggestions(status);
create index if not exists idx_swap_category on public.swap_suggestions(category);

-- RLS
alter table public.swap_suggestions enable row level security;

-- Anyone can read approved swaps (including anonymous)
create policy "Anyone can view approved swaps"
  on public.swap_suggestions for select
  using (status = 'approved');

-- Authenticated users can insert their own swaps
create policy "Users can insert own swaps"
  on public.swap_suggestions for insert
  with check (auth.uid() = user_id);

-- Users can update their own swaps
create policy "Users can update own swaps"
  on public.swap_suggestions for update
  using (auth.uid() = user_id);

-- Users can delete their own swaps
create policy "Users can delete own swaps"
  on public.swap_suggestions for delete
  using (auth.uid() = user_id);
