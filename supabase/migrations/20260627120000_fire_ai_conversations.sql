-- FIRE Nepal AI: conversation history for Ask FIRE AI (production milestone 2.1)

create table if not exists public.fire_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  preview text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fire_ai_conversations_user_updated_idx
  on public.fire_ai_conversations (user_id, updated_at desc);

create table if not exists public.fire_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.fire_ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists fire_ai_messages_conversation_created_idx
  on public.fire_ai_messages (conversation_id, created_at asc);

create index if not exists fire_ai_messages_user_idx
  on public.fire_ai_messages (user_id);

alter table public.fire_ai_conversations enable row level security;
alter table public.fire_ai_messages enable row level security;

create policy "Users read own fire ai conversations"
  on public.fire_ai_conversations for select
  using (auth.uid () = user_id);

create policy "Users insert own fire ai conversations"
  on public.fire_ai_conversations for insert
  with check (auth.uid () = user_id);

create policy "Users update own fire ai conversations"
  on public.fire_ai_conversations for update
  using (auth.uid () = user_id);

create policy "Users delete own fire ai conversations"
  on public.fire_ai_conversations for delete
  using (auth.uid () = user_id);

create policy "Users read own fire ai messages"
  on public.fire_ai_messages for select
  using (auth.uid () = user_id);

create policy "Users insert own fire ai messages"
  on public.fire_ai_messages for insert
  with check (auth.uid () = user_id);

create policy "Users update own fire ai messages"
  on public.fire_ai_messages for update
  using (auth.uid () = user_id);

create policy "Users delete own fire ai messages"
  on public.fire_ai_messages for delete
  using (auth.uid () = user_id);
