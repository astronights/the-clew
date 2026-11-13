-- Upcoming AI-written "what comes next" puzzles, reviewed on /admin.
-- An approved row replaces that day's built-in rule.

create table if not exists puzzles (
  puzzle_no integer primary key,
  puzzle_date date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected')),
  data jsonb not null,
  errors jsonb not null default '[]',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists puzzles_status_idx on puzzles (status, puzzle_no);
