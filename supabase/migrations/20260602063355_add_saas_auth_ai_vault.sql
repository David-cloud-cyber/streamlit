create schema if not exists vault;
create schema if not exists app_private;
create extension if not exists supabase_vault with schema vault;

create type public.ai_provider_kind as enum ('openai', 'anthropic');
create type public.subscription_status as enum ('free', 'trialing', 'active', 'past_due', 'canceled');
create type public.ai_key_source as enum ('byok', 'platform');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status public.subscription_status not null default 'free',
  plan text not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_ai_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider public.ai_provider_kind not null,
  label text not null,
  model_name text not null,
  base_url text,
  vault_secret_id uuid not null,
  secret_name text not null unique,
  enabled boolean not null default true,
  is_default boolean not null default false,
  key_source public.ai_key_source not null default 'byok',
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_ai_providers_label_length check (char_length(label) between 1 and 80),
  constraint user_ai_providers_model_length check (char_length(model_name) between 1 and 180)
);

create unique index user_ai_providers_one_default_idx
  on public.user_ai_providers(user_id)
  where is_default and enabled;

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model_name text,
  key_source public.ai_key_source not null,
  feature text not null,
  task_id text,
  status text not null default 'success',
  created_at timestamptz not null default now()
);

create index ai_usage_events_user_created_idx
  on public.ai_usage_events(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_ai_providers enable row level security;
alter table public.ai_usage_events enable row level security;

create policy "Users can read their own profile."
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile."
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can read their own subscription."
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own AI providers."
  on public.user_ai_providers for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own AI usage."
  on public.ai_usage_events for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure app_private.handle_new_user();

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_current_timestamp_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_current_timestamp_updated_at();

create trigger user_ai_providers_updated_at
  before update on public.user_ai_providers
  for each row execute procedure public.set_current_timestamp_updated_at();

create or replace function public.app_create_ai_provider(
  p_user_id uuid,
  p_provider public.ai_provider_kind,
  p_label text,
  p_model_name text,
  p_base_url text,
  p_api_key text,
  p_is_default boolean default true
)
returns table (
  id uuid,
  user_id uuid,
  provider public.ai_provider_kind,
  label text,
  model_name text,
  base_url text,
  enabled boolean,
  is_default boolean,
  key_source public.ai_key_source,
  last_used_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_provider_id uuid := gen_random_uuid();
  v_secret_name text := 'user_ai_provider_' || p_user_id::text || '_' || v_provider_id::text;
  v_secret_id uuid;
begin
  if p_api_key is null or char_length(trim(p_api_key)) < 8 then
    raise exception 'API key is required';
  end if;

  if p_is_default then
    update public.user_ai_providers
      set is_default = false
      where public.user_ai_providers.user_id = p_user_id;
  end if;

  select vault.create_secret(
    p_api_key,
    v_secret_name,
    'BYOK ' || p_provider::text || ' key for user ' || p_user_id::text
  ) into v_secret_id;

  insert into public.user_ai_providers (
    id,
    user_id,
    provider,
    label,
    model_name,
    base_url,
    vault_secret_id,
    secret_name,
    is_default
  )
  values (
    v_provider_id,
    p_user_id,
    p_provider,
    trim(p_label),
    trim(p_model_name),
    nullif(trim(coalesce(p_base_url, '')), ''),
    v_secret_id,
    v_secret_name,
    p_is_default
  );

  return query
    select
      u.id, u.user_id, u.provider, u.label, u.model_name, u.base_url,
      u.enabled, u.is_default, u.key_source, u.last_used_at, u.created_at, u.updated_at
    from public.user_ai_providers u
    where u.id = v_provider_id;
end;
$$;

create or replace function public.app_update_ai_provider(
  p_user_id uuid,
  p_provider_id uuid,
  p_label text default null,
  p_model_name text default null,
  p_base_url text default null,
  p_api_key text default null,
  p_enabled boolean default null,
  p_is_default boolean default null
)
returns table (
  id uuid,
  user_id uuid,
  provider public.ai_provider_kind,
  label text,
  model_name text,
  base_url text,
  enabled boolean,
  is_default boolean,
  key_source public.ai_key_source,
  last_used_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
  from public.user_ai_providers
  where public.user_ai_providers.id = p_provider_id
    and public.user_ai_providers.user_id = p_user_id;

  if v_secret_id is null then
    raise exception 'AI provider not found';
  end if;

  if p_api_key is not null and char_length(trim(p_api_key)) >= 8 then
    perform vault.update_secret(v_secret_id, p_api_key);
  end if;

  if coalesce(p_is_default, false) then
    update public.user_ai_providers
      set is_default = false
      where public.user_ai_providers.user_id = p_user_id
        and public.user_ai_providers.id <> p_provider_id;
  end if;

  update public.user_ai_providers
  set
    label = coalesce(nullif(trim(p_label), ''), label),
    model_name = coalesce(nullif(trim(p_model_name), ''), model_name),
    base_url = case
      when p_base_url is null then base_url
      else nullif(trim(p_base_url), '')
    end,
    enabled = coalesce(p_enabled, enabled),
    is_default = coalesce(p_is_default, is_default)
  where public.user_ai_providers.id = p_provider_id
    and public.user_ai_providers.user_id = p_user_id;

  return query
    select
      u.id, u.user_id, u.provider, u.label, u.model_name, u.base_url,
      u.enabled, u.is_default, u.key_source, u.last_used_at, u.created_at, u.updated_at
    from public.user_ai_providers u
    where u.id = p_provider_id;
end;
$$;

create or replace function public.app_delete_ai_provider(
  p_user_id uuid,
  p_provider_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
  from public.user_ai_providers
  where public.user_ai_providers.id = p_provider_id
    and public.user_ai_providers.user_id = p_user_id;

  if v_secret_id is null then
    raise exception 'AI provider not found';
  end if;

  delete from public.user_ai_providers
  where public.user_ai_providers.id = p_provider_id
    and public.user_ai_providers.user_id = p_user_id;

  delete from vault.secrets where id = v_secret_id;
end;
$$;

create or replace function public.app_get_ai_provider_secret(
  p_user_id uuid,
  p_provider_id uuid
)
returns table (
  id uuid,
  provider public.ai_provider_kind,
  label text,
  model_name text,
  base_url text,
  decrypted_secret text,
  key_source public.ai_key_source
)
language plpgsql
security invoker
as $$
begin
  return query
    select
      u.id,
      u.provider,
      u.label,
      u.model_name,
      u.base_url,
      v.decrypted_secret,
      u.key_source
    from public.user_ai_providers u
    join vault.decrypted_secrets v on v.id = u.vault_secret_id
    where u.id = p_provider_id
      and u.user_id = p_user_id
      and u.enabled = true;
end;
$$;

create or replace function public.app_get_platform_secret(p_name text)
returns text
language sql
security invoker
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;

revoke all on function public.app_create_ai_provider(uuid, public.ai_provider_kind, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.app_update_ai_provider(uuid, uuid, text, text, text, text, boolean, boolean) from public, anon, authenticated;
revoke all on function public.app_delete_ai_provider(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_get_ai_provider_secret(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_get_platform_secret(text) from public, anon, authenticated;

grant execute on function public.app_create_ai_provider(uuid, public.ai_provider_kind, text, text, text, text, boolean) to service_role;
grant execute on function public.app_update_ai_provider(uuid, uuid, text, text, text, text, boolean, boolean) to service_role;
grant execute on function public.app_delete_ai_provider(uuid, uuid) to service_role;
grant execute on function public.app_get_ai_provider_secret(uuid, uuid) to service_role;
grant execute on function public.app_get_platform_secret(text) to service_role;
