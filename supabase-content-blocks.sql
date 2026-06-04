-- ============================================================
-- Migration: Content Blocks
-- Kör detta i Supabase SQL Editor
-- ============================================================

-- Content blocks – ett block per rad, valfri typ per sektion
create table if not exists content_blocks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references product_sections on delete cascade,
  type text not null, -- 'checklist' | 'video' | 'audio' | 'richtext' | 'file'
  title text,
  "order" int not null default 0,
  -- video/audio
  embed_url text,
  -- richtext
  body text,
  -- file
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

-- Checklist items kopplas nu till ett content_block istället för direkt till section
alter table checklist_items
  add column if not exists block_id uuid references content_blocks on delete cascade;

-- RLS
alter table content_blocks enable row level security;

create policy "blocks_select" on content_blocks for select using (
  exists (
    select 1 from product_sections ps
    join user_products up on up.product_id = ps.product_id
    where ps.id = content_blocks.section_id and up.user_id = auth.uid()
  )
);

create policy "blocks_admin_all" on content_blocks for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- ============================================================
-- Migrera befintlig data:
-- Skapa ett checklist-block per sektion och koppla items till det
-- ============================================================

do $$
declare
  sec record;
  blk_id uuid;
begin
  for sec in select id from product_sections loop
    -- Skapa ett checklist-block för sektionen om den har items
    if exists (select 1 from checklist_items where section_id = sec.id) then
      insert into content_blocks (section_id, type, title, "order")
      values (sec.id, 'checklist', 'Checklista', 1)
      returning id into blk_id;

      update checklist_items set block_id = blk_id where section_id = sec.id;
    end if;
  end loop;
end $$;
