-- When a player flags a rejected guess, a second model call reviews it. Its verdict and reason are kept,
-- and an upheld appeal accepts the wording for that puzzle (source 'review').
alter table guess_log add column if not exists review_verdict text;
alter table guess_log add column if not exists review_reason text;
alter table accepted_guesses drop constraint if exists accepted_guesses_source_check;
alter table accepted_guesses add constraint accepted_guesses_source_check check (source in ('judge', 'editor', 'review'));
