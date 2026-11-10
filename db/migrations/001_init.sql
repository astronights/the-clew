-- The Clew: anonymous game data only. No accounts, no PII, no raw IPs.

create table if not exists verdict_cache (
  rule_id text not null,
  normalized_guess text not null,
  verdict text not null check (verdict in ('correct', 'close', 'wrong')),
  hint text not null default '',
  created_at timestamptz not null default now(),
  primary key (rule_id, normalized_guess)
);

create table if not exists daily_results (
  puzzle_no integer not null,
  solved_on_clue smallint not null check (solved_on_clue between 0 and 5),
  count integer not null default 0,
  primary key (puzzle_no, solved_on_clue)
);

-- "window" is a reserved word in Postgres, so it is always quoted.
create table if not exists rate_limit (
  ip_hash text not null,
  "window" text not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (ip_hash, "window")
);

create index if not exists rate_limit_updated_at_idx on rate_limit (updated_at);
