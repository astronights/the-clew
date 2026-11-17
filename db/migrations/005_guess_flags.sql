-- Players can flag a rule guess they think was wrongly rejected; flagged guesses lead the desk's Activity page.
alter table guess_log add column if not exists flagged_at timestamptz;
create index if not exists guess_log_flagged on guess_log (puzzle_no) where flagged_at is not null;
