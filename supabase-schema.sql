-- ============================================================
-- Launch Confident – Supabase Schema
-- Kör detta i Supabase SQL Editor
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  slug text unique not null,
  created_at timestamptz not null default now()
);

-- Product sections
create table if not exists product_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  title text not null,
  "order" int not null default 0
);

-- Checklist items
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references product_sections on delete cascade,
  label text not null,
  description text,
  points int not null default 10,
  "order" int not null default 0
);

-- User <-> Product access
create table if not exists user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id uuid not null references products on delete cascade,
  granted_at timestamptz not null default now(),
  unique(user_id, product_id)
);

-- Audits
create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id uuid not null references products on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Progress per audit
create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits on delete cascade,
  item_id uuid not null references checklist_items on delete cascade,
  checked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(audit_id, item_id)
);

-- Registration tokens
create table if not exists registration_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  product_id uuid not null references products,
  email text not null,
  used boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);


-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table products enable row level security;
alter table product_sections enable row level security;
alter table checklist_items enable row level security;
alter table user_products enable row level security;
alter table audits enable row level security;
alter table user_progress enable row level security;
alter table registration_tokens enable row level security;

-- Profiles: own row only
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Products: readable if user has access
create policy "products_select" on products for select using (
  exists (select 1 from user_products where user_id = auth.uid() and product_id = products.id)
);

-- Sections: readable if user has product access
create policy "sections_select" on product_sections for select using (
  exists (select 1 from user_products where user_id = auth.uid() and product_id = product_sections.product_id)
);

-- Checklist items: readable if user has section's product access
create policy "items_select" on checklist_items for select using (
  exists (
    select 1 from product_sections ps
    join user_products up on up.product_id = ps.product_id
    where ps.id = checklist_items.section_id and up.user_id = auth.uid()
  )
);

-- User products: own rows
create policy "user_products_select" on user_products for select using (user_id = auth.uid());
create policy "user_products_insert" on user_products for insert with check (user_id = auth.uid());

-- Audits: own rows
create policy "audits_select" on audits for select using (user_id = auth.uid());
create policy "audits_insert" on audits for insert with check (user_id = auth.uid());
create policy "audits_update" on audits for update using (user_id = auth.uid());
create policy "audits_delete" on audits for delete using (user_id = auth.uid());

-- Progress: via audit ownership
create policy "progress_select" on user_progress for select using (
  exists (select 1 from audits where id = user_progress.audit_id and user_id = auth.uid())
);
create policy "progress_insert" on user_progress for insert with check (
  exists (select 1 from audits where id = user_progress.audit_id and user_id = auth.uid())
);
create policy "progress_update" on user_progress for update using (
  exists (select 1 from audits where id = user_progress.audit_id and user_id = auth.uid())
);

-- Registration tokens: publicly readable (needed before auth exists)
create policy "tokens_select" on registration_tokens for select using (true);
create policy "tokens_update" on registration_tokens for update using (true);


-- ============================================================
-- Admin overrides (service role bypass – no extra policies needed)
-- Admins use Supabase dashboard or service role key for admin ops.
-- ============================================================


-- ============================================================
-- Seed: Pre-Launch Audit
-- ============================================================

with product as (
  insert into products (name, description, slug) values
    ('Pre-Launch Audit', 'Gör en fullständig genomgång av din lansering innan du trycker på go.', 'pre-launch-audit')
  returning id
),
s1 as (insert into product_sections (product_id, title, "order") select id, 'Erbjudandet', 1 from product returning id),
s2 as (insert into product_sections (product_id, title, "order") select id, 'Målgruppen', 2 from product returning id),
s3 as (insert into product_sections (product_id, title, "order") select id, 'Teknisk setup', 3 from product returning id),
s4 as (insert into product_sections (product_id, title, "order") select id, 'Innehållet', 4 from product returning id),
s5 as (insert into product_sections (product_id, title, "order") select id, 'E-postlistan', 5 from product returning id),
s6 as (insert into product_sections (product_id, title, "order") select id, 'Lansieringsplanen', 6 from product returning id),
s7 as (insert into product_sections (product_id, title, "order") select id, 'Mindset & förberedelse', 7 from product returning id)

-- Erbjudandet
insert into checklist_items (section_id, label, description, points, "order")
select id, 'Erbjudandets namn är tydligt och minnesvärt', 'Namnet berättar vad produkten gör och för vem.', 10, 1 from s1
union all select id, 'Priset är satt och motiverat', 'Du har räknat på värdet du levererar och satt ett pris som känns rätt.', 10, 2 from s1
union all select id, 'Vad som ingår är tydligt definierat', 'Köparen vet exakt vad de får – format, längd, leverans.', 10, 3 from s1
union all select id, 'Bonusar och garantier är bestämda', 'Om du erbjuder garantier eller bonusar är de skrivna och klara.', 10, 4 from s1
union all select id, 'Transformationen är beskriven i kundspråk', 'Du har formulerat vad kunden uppnår, inte vad kursen innehåller.', 10, 5 from s1;
-- (Mer items läggs in via Supabase dashboard)


-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
