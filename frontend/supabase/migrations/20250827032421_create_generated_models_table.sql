create table if not exists public.generated_models (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  status text not null default 'pending',
  prompt text,
  type text,
  mode text,
  meshy_task_id text,
  model_url text,
  thumbnail_url text,
  glb_url text,
  obj_url text,
  stl_url text,
  progress integer default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS Policies
alter table public.generated_models enable row level security;

create policy "Allow public read access" on public.generated_models
  for select using (true);

create policy "Allow individual insert access" on public.generated_models
  for insert with check (auth.uid() = user_id);

create policy "Allow individual update access" on public.generated_models
  for update using (auth.uid() = user_id);

create policy "Allow individual delete access" on public.generated_models
  for delete using (auth.uid() = user_id);
