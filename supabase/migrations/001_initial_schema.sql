-- RoofEstimate AI initial schema
-- Run this in the Supabase SQL editor: Project → SQL Editor → New query

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  logo_url      text,
  primary_color text default '#7C3AED',
  created_at    timestamp default now()
);

create table users (
  id            uuid primary key references auth.users(id),
  account_id    uuid references accounts(id) not null,
  name          text,
  role          text default 'owner',
  created_at    timestamp default now()
);

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references accounts(id) not null,
  created_by    uuid references users(id),
  client_name   text not null,
  address       text not null,
  city          text,
  state         text,
  zip           text,
  status        text default 'inspecting',
  notes         text,
  created_at    timestamp default now(),
  updated_at    timestamp default now()
);

create table photos (
  id              uuid primary key default gen_random_uuid(),
  job_id          uuid references jobs(id) not null,
  account_id      uuid references accounts(id) not null,
  storage_path    text not null,
  filename        text,
  width           integer,
  height          integer,
  analysis_status text default 'pending',
  created_at      timestamp default now()
);

create table findings (
  id                uuid primary key default gen_random_uuid(),
  photo_id          uuid references photos(id) not null,
  job_id            uuid references jobs(id) not null,
  account_id        uuid references accounts(id) not null,
  box_x             float,
  box_y             float,
  box_width         float,
  box_height        float,
  issue_type        text,
  severity          text,
  description       text,
  suggested_service text,
  status            text default 'ai_suggested',
  ai_raw            jsonb,
  edited_at         timestamp,
  confirmed_at      timestamp,
  confirmed_by      uuid references users(id),
  created_at        timestamp default now()
);

create table service_catalog (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid references accounts(id) not null,
  name          text not null,
  description   text,
  unit          text,
  default_price decimal(10,2),
  issue_types   text[],
  active        boolean default true,
  sort_order    integer,
  created_at    timestamp default now()
);

create table estimates (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references jobs(id) not null,
  account_id  uuid references accounts(id) not null,
  created_by  uuid references users(id),
  title       text,
  intro_text  text,
  status      text default 'draft',
  pdf_path    text,
  subtotal    decimal(10,2),
  discount    decimal(10,2) default 0,
  total       decimal(10,2),
  created_at  timestamp default now(),
  updated_at  timestamp default now()
);

create table line_items (
  id              uuid primary key default gen_random_uuid(),
  estimate_id     uuid references estimates(id) not null,
  account_id      uuid references accounts(id) not null,
  finding_id      uuid references findings(id),
  catalog_item_id uuid references service_catalog(id),
  name            text not null,
  description     text,
  unit            text,
  quantity        decimal(10,2),
  unit_price      decimal(10,2),
  quantity_source text,
  ai_quantity     decimal(10,2),
  sort_order      integer,
  notes           text,
  created_at      timestamp default now()
);

create table ai_usage_log (
  id              uuid primary key default gen_random_uuid(),
  account_id      uuid references accounts(id) not null,
  job_id          uuid references jobs(id),
  photo_id        uuid references photos(id),
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  total_tokens    integer,
  estimated_cost  decimal(10,6),
  operation       text,
  error           boolean default false,
  created_at      timestamp default now()
);

-- Row-level security: every table filters by account_id
alter table accounts enable row level security;
alter table users enable row level security;
alter table jobs enable row level security;
alter table photos enable row level security;
alter table findings enable row level security;
alter table service_catalog enable row level security;
alter table estimates enable row level security;
alter table line_items enable row level security;
alter table ai_usage_log enable row level security;

-- Helper: resolve account_id for the authenticated user
create or replace function auth_account_id()
returns uuid language sql stable security definer as $$
  select account_id from users where id = auth.uid()
$$;

-- RLS policies: users only see rows belonging to their account
create policy "account isolation" on accounts
  for all using (id = auth_account_id());

create policy "account isolation" on users
  for all using (account_id = auth_account_id());

create policy "account isolation" on jobs
  for all using (account_id = auth_account_id());

create policy "account isolation" on photos
  for all using (account_id = auth_account_id());

create policy "account isolation" on findings
  for all using (account_id = auth_account_id());

create policy "account isolation" on service_catalog
  for all using (account_id = auth_account_id());

create policy "account isolation" on estimates
  for all using (account_id = auth_account_id());

create policy "account isolation" on line_items
  for all using (account_id = auth_account_id());

create policy "account isolation" on ai_usage_log
  for all using (account_id = auth_account_id());
