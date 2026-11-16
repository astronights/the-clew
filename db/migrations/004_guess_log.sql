-- Every rule guess and how the judge saw it, for the desk's Activity page.
-- No IPs or player ids: just the text, the verdict and the judge's reasoning.
create table if not exists guess_log (
  id bigserial primary key,
  puzzle_no int not null,
  row_no int,
  guess text not null,
  verdict text not null check (verdict in ('correct', 'close', 'wrong')),
  model text,
  reason text,
  p_correct real,
  ms int,
  created_at timestamptz not null default now()
);
create index if not exists guess_log_puzzle on guess_log (puzzle_no, created_at desc);
