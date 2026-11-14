-- Push subscriptions for the admin desk's reminders (the editor's own devices only).

create table if not exists push_subscriptions (
  endpoint text primary key,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
