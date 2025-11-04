-- Collectible Realm consolidated schema
-- Generated to support modular client architecture (v2.0)

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users on delete cascade,
  username text unique,
  bio text,
  avatar jsonb default '{}'::jsonb,
  preferences jsonb default '{}'::jsonb,
  level integer default 1,
  xp integer default 0,
  streak integer default 0,
  last_login timestamp with time zone,
  status text default 'active',
  flair_title text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.collectibles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rarity text not null,
  lore text,
  attributes jsonb default '{}'::jsonb,
  power_score integer default 0,
  serial_number integer,
  set_id uuid,
  origin_code uuid,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_collectibles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  collectible_id uuid not null references public.collectibles on delete cascade,
  acquisition_source text,
  acquired_at timestamp with time zone default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists user_collectibles_user_idx on public.user_collectibles(user_id);
create index if not exists user_collectibles_collectible_idx on public.user_collectibles(collectible_id);

create table if not exists public.redemption_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  rarity text not null,
  max_redemptions integer,
  redemptions_count integer default 0,
  reward_gold integer default 0,
  reward_gems integer default 0,
  reward_collectible_id uuid references public.collectibles,
  tags text[],
  metadata jsonb default '{}'::jsonb,
  expires_at timestamp with time zone,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

create table if not exists public.redemption_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  code_id uuid not null references public.redemption_codes on delete cascade,
  code text not null,
  collectible_id uuid references public.collectibles,
  redeemed_at timestamp with time zone default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists redemption_history_user_idx on public.redemption_history(user_id);
create index if not exists redemption_history_code_idx on public.redemption_history(code_id);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users on delete cascade,
  gold_balance integer default 0,
  gem_balance integer default 0,
  last_stipend_at timestamp with time zone,
  updated_at timestamp with time zone default now()
);

create table if not exists public.economy_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  delta_gold integer default 0,
  delta_gems integer default 0,
  description text,
  reference_id uuid,
  occurred_at timestamp with time zone default now()
);

create index if not exists economy_ledger_user_idx on public.economy_ledger(user_id, occurred_at desc);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  icon text,
  reward_gold integer default 0,
  reward_gems integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  achievement_id uuid not null references public.achievements on delete cascade,
  earned_at timestamp with time zone default now(),
  metadata jsonb default '{}'::jsonb,
  unique(user_id, achievement_id)
);

create table if not exists public.daily_quest_definitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null,
  target_amount integer not null default 1,
  reward_gold integer default 0,
  reward_gems integer default 0,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  quest_id uuid not null references public.daily_quest_definitions on delete cascade,
  progress integer default 0,
  is_active boolean default true,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  unique(user_id, quest_id, expires_at)
);

create index if not exists user_daily_quests_user_idx on public.user_daily_quests(user_id) where is_active;

create table if not exists public.seasonal_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  tier text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone not null,
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users on delete cascade,
  buyer_id uuid references auth.users on delete set null,
  collectible_id uuid not null references public.collectibles,
  price_gold integer default 0,
  price_gems integer default 0,
  status text default 'active',
  expires_at timestamp with time zone,
  sold_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.app_health (
  id integer primary key,
  status text not null default 'ok',
  checked_at timestamp with time zone default now()
);

insert into public.app_health (id, status)
values (1, 'ok')
on conflict (id) do update set status = excluded.status, checked_at = now();

alter table public.app_health enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_health'
      and policyname = 'Allow anonymous health checks'
  ) then
    create policy "Allow anonymous health checks" on public.app_health
      for select
      using (true);
  end if;
end $$;

create index if not exists marketplace_status_idx on public.marketplace_listings(status, created_at desc);
create index if not exists marketplace_seller_idx on public.marketplace_listings(seller_id);

create table if not exists public.marketplace_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings on delete cascade,
  buyer_id uuid not null references auth.users on delete cascade,
  seller_id uuid not null references auth.users on delete cascade,
  price_gold integer default 0,
  price_gems integer default 0,
  completed_at timestamp with time zone default now()
);

create table if not exists public.marketplace_showcase (
  id uuid primary key default gen_random_uuid(),
  collectible_id uuid references public.collectibles,
  title text,
  description text,
  category text,
  priority integer default 100,
  created_at timestamp with time zone default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  type text not null,
  context jsonb default '{}'::jsonb,
  visibility text default 'public',
  created_at timestamp with time zone default now()
);

-- Helper function to ensure daily quests are provisioned
create or replace function public.ensure_daily_quests(p_user_id uuid, p_max_active integer)
returns setof public.user_daily_quests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
  v_needed integer;
begin
  select count(*)
    into v_active_count
  from public.user_daily_quests
  where user_id = p_user_id
    and is_active
    and (expires_at is null or expires_at > now());

  v_needed := greatest(p_max_active - coalesce(v_active_count, 0), 0);

  if v_needed > 0 then
    insert into public.user_daily_quests (user_id, quest_id, expires_at)
    select p_user_id, q.id, date_trunc('day', now()) + interval '1 day'
      from public.daily_quest_definitions q
     where q.is_active
       and not exists (
         select 1 from public.user_daily_quests existing
          where existing.user_id = p_user_id
            and existing.quest_id = q.id
            and (existing.expires_at is null or existing.expires_at > now())
       )
     order by q.created_at desc
     limit v_needed;
  end if;

  return query
  select * from public.user_daily_quests
   where user_id = p_user_id
     and is_active
     and (expires_at is null or expires_at > now());
end;
$$;

-- Function to handle redemption flow, mint collectibles, and increment counts
create or replace function public.redeem_collectible_code(p_code text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code record;
  v_collectible record;
  v_user_collectible record;
  v_response jsonb := '{}'::jsonb;
begin
  select *
    into v_code
    from public.redemption_codes
   where code = p_code
     and is_active
   limit 1;

  if not found then
    raise exception 'CODE_NOT_FOUND';
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    raise exception 'CODE_EXPIRED';
  end if;

  if v_code.max_redemptions is not null and v_code.redemptions_count >= v_code.max_redemptions then
    raise exception 'CODE_DEPLETED';
  end if;

  if exists (
    select 1 from public.redemption_history
     where user_id = p_user_id
       and code_id = v_code.id
  ) then
    raise exception 'CODE_ALREADY_USED';
  end if;

  if v_code.reward_collectible_id is not null then
    select *
      into v_collectible
      from public.collectibles
     where id = v_code.reward_collectible_id;

    if not found then
      raise exception 'COLLECTIBLE_MISSING';
    end if;

    insert into public.user_collectibles (user_id, collectible_id, acquisition_source)
    values (p_user_id, v_collectible.id, 'code:' || v_code.code)
    returning * into v_user_collectible;

    v_response := jsonb_set(v_response, '{collectible}', to_jsonb(v_collectible));
    v_response := jsonb_set(v_response, '{acquisition}', to_jsonb(v_user_collectible));
  end if;

  insert into public.redemption_history (user_id, code_id, code, collectible_id)
  values (p_user_id, v_code.id, v_code.code, v_code.reward_collectible_id);

  update public.redemption_codes
     set redemptions_count = redemptions_count + 1,
         is_active = case
           when max_redemptions is not null and redemptions_count + 1 >= max_redemptions then false
           else is_active
         end
   where id = v_code.id;

  v_response := jsonb_set(v_response, '{currency_rewards}', jsonb_build_object(
    'gold', v_code.reward_gold,
    'gems', v_code.reward_gems
  ));

  return v_response;
end;
$$;

-- Basic RLS scaffolding (enable for key tables)
alter table public.user_profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.user_collectibles enable row level security;
alter table public.economy_ledger enable row level security;
alter table public.redemption_history enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_transactions enable row level security;
alter table public.user_daily_quests enable row level security;
alter table public.user_achievements enable row level security;

create policy if not exists "Users manage own profile"
  on public.user_profiles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users manage own wallet"
  on public.wallets
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users manage own collectibles"
  on public.user_collectibles
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users view own ledger"
  on public.economy_ledger for select
  using (auth.uid() = user_id);

create policy if not exists "Users insert ledger"
  on public.economy_ledger for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users view own redemptions"
  on public.redemption_history for select
  using (auth.uid() = user_id);

create policy if not exists "Users manage own quests"
  on public.user_daily_quests
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Users manage own achievements"
  on public.user_achievements
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy if not exists "Marketplace read"
  on public.marketplace_listings for select
  using (true);

create policy if not exists "Marketplace write"
  on public.marketplace_listings for all
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create policy if not exists "Marketplace transactions read"
  on public.marketplace_transactions for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
