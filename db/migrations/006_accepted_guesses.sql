-- Wordings known to be right for a puzzle: judged correct once, or accepted by the editor from the
-- Activity page. A later guess with the same normalised wording is accepted without asking the judge
-- again, so "wedding anniversary" and "wedding anniversaries" can't get different verdicts.
create table if not exists accepted_guesses (
  puzzle_no int not null,
  normalized text not null,
  source text not null check (source in ('judge', 'editor')),
  created_at timestamptz not null default now(),
  primary key (puzzle_no, normalized)
);
alter table guess_log add column if not exists accepted_at timestamptz;
