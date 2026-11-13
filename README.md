# 🧶 The Clew

A mobile-first daily deduction puzzle. One secret rule per day, the same for everyone (new rule at 00:00 UTC). Clues hang on a thread; work out the rule in as few as you can.

- There are **5 rows**, one per clue. Only row 1 is showing at the start.
- **Guess** in the free-text box ("35", "3, 8, 12", "red star, blue circle", "Café", any answer on sequence days):
  the next row opens and is marked **your guess ✓/✗**. On sequence days a guess is right if it's the item that row
  reveals; on rule days, if it fits the rule. Empty box = **Next ›**, which just opens the next row. Guesses aren't scored.
- **Name the rule** in your own words at any time. Right → solved on that clue. Wrong → a short "not it" and the next row opens. No hints.
- On the last row there's nothing left to open: one final rule guess, or give up.
- Score = the clue number you named the rule on (1–5).

Share text:

```
🧶 The Clew #42
Untangled it on clue 3 of 5 🎉
🔍 ❌ ✅
theclew.fyi
```

(one emoji per clue: ⏭️ next · 🔍 tested an item · ❌ wrong rule · ✅ got it; the line changes with the day, e.g. "Got it on the first clue 🤯", "Totally tangled today 🙈")

Domains rotate by UTC weekday: Mon & Fri **numbers** (1–999) · Tue **3-number sequences** · Wed & Sat **tile rows** (🔴🔵🟢🟡 × ●▲■★) · Thu & Sun **words**.

Pass/fail is always deterministic TypeScript. AI (Gemini) is only used to judge free-text rule guesses that don't fuzzy-match a known phrasing.

## Stack

- Vite + React + TypeScript (no UI libraries), Google Fonts *IBM Plex Mono* (items, labels) + *IBM Plex Sans Condensed* (text)
- Vercel Functions in `/api` (Web `Request`/`Response` handlers)
- Neon Postgres via `@neondatabase/serverless`
- Vitest

## File structure

```
api/
  judge.ts            POST /api/judge  {ruleId, guess} → {verdict, hint}
  puzzle.ts           GET  /api/puzzle?no=N → today's approved AI puzzle (404 = play the built-in rule)
  admin/puzzles.ts    GET/POST the week's drafts; approve / reject / save (ADMIN_TOKEN)
  admin/generate.ts   POST one draft with Gemini + Google Search (ADMIN_TOKEN)
  result.ts           POST /api/result {puzzleNo, solvedOnClue}; GET /api/result?puzzle=N
  _lib/               db client, Gemini prompt + sanitising, rate limit, http helpers
db/migrations/        SQL migrations (001_init.sql, 002_puzzles.sql)
prompts/              puzzle-generator.md — the editable puzzle-writing prompt
scripts/
  validate-rules.ts   npm run validate-rules
  gen-clues.ts        npm run gen-clues (authoring helper)
  migrate.ts, seed.ts npm run db:migrate / db:seed
src/
  rules/              types, numbers/sequences/tiles/words rules + decoys, clues.ts, wordlist
  lib/                daily picker, fuzzy matcher, game state machine,
                      clue generator, elimination, validation, share text, stats, storage
  components/         Thread, ItemView, FifthInput (one free-text test box, read as the day's item type), Sheet, ResultCard, HowToPlay, confetti
  screens/            Today, Stats, Play (game screen)
tests/                Vitest suites
```

## Rules

Each rule is `{ id, domain, predicate, description, acceptedPhrasings[], decoyRuleIds[], clues[5] }`.

- 40 playable rules (10 per domain) live in `src/rules/{numbers,sequences,tiles,words}.ts`.
- **Decoys** are near-miss rules (e.g. *prime*, *palindrome*, *strictly increasing*). They can be other playable rules or decoy-only predicates in the same files. Each rule lists 6.
- **Clues** (`src/rules/clues.ts`) are chosen so that every clue removes at least one decoy that was still possible, early clues remove as few as possible (vague) and later ones more (revealing), and all decoys are gone after clue 5. They have 3–4 ✅ and open with a ✅.

Example rules and their clues:

| Rule | Description | Clues |
| --- | --- | --- |
| `num-odd-digit-sum` | The digits add up to an odd number. | 375 ✅ · 779 ✅ · 999 ✅ · 435 ❌ · 716 ❌ |
| `num-contains-7` | The number contains the digit 7. | 739 ✅ · 795 ✅ · 713 ✅ · 19 ❌ · 37 ✅ |
| `num-last-gt-first` | The last digit is bigger than the first digit. | 18 ✅ · 472 ❌ · 589 ✅ · 124 ✅ · 648 ✅ |
| `seq-middle-largest` | The middle number is the largest. | (6, 18, 12) ✅ · (9, 6, 1) ❌ · (9, 19, 9) ✅ · (4, 20, 4) ✅ · (3, 18, 20) ❌ |
| `seq-alternating-parity` | The numbers alternate between odd and even. | (20, 9, 16) ✅ · (20, 3, 8) ✅ · (16, 13, 13) ❌ · (15, 10, 1) ✅ · (7, 12, 7) ✅ |
| `seq-sum-gt-30` | The three numbers add up to more than 30. | (18, 10, 20) ✅ · (14, 3, 6) ❌ · (20, 19, 19) ✅ · (18, 9, 13) ✅ · (5, 16, 1) ❌ |
| `tile-no-adjacent-colour` | No two neighbouring tiles share a colour. | 🟢★ 🔴▲ 🔵● 🟡★ ✅ · 🟢■ 🔴■ 🟡■ 🔵★ ✅ · 🟡■ 🔵■ 🔴▲ 🟡★ ✅ · 🔴▲ 🟢● 🟢▲ ❌ · 🟡★ 🟡● 🔵● 🔴★ ❌ |
| `tile-first-last-same-shape` | The first and last tiles are the same shape. | 🟢● 🟢● ✅ · 🟢● 🟡▲ 🟡● 🟢● 🔴▲ ❌ · 🟡● 🔵● 🟡● ✅ · 🟡★ 🟢● 🟡★ ✅ · 🔴● 🔴▲ 🟢● 🟡★ 🔵● ✅ |
| `word-double-letter` | The word has a double letter. | COOKIE ✅ · FIDDLE ✅ · PLUCKY ❌ · KITTEN ✅ · CIRCLE ❌ |
| `word-starts-two-consonants` | The word starts with two consonants. | BRAVE ✅ · ZIPPER ❌ · BRIDGE ✅ · GLAD ✅ · JOLLY ❌ |

`npm run validate-rules -- --verbose` prints which decoys each clue removes.

### Adding a rule

1. Add a `RuleSpec` to the right domain file (predicate, description, 4–6 accepted phrasings, ≥ 5 decoys from the same domain).
2. `npm run gen-clues -- --write <rule-id>` to pick clues (or write them by hand in `src/rules/clues.ts`).
3. `npm run validate-rules`. It checks that:
   - every clue's ✅/❌ matches the predicate and the item is valid,
   - each clue removes at least one decoy that was still alive, and every decoy is gone by clue 5,
   - the pass rate is 20–60% over the domain's reference pool (numbers 1–999; all triples of 1–20; 4000 seeded tile rows of 2–5 tiles; the built-in word list).

Rules like *prime* (17%), *palindrome* (11%) or *strictly increasing* (14%) are too rare for that pass-rate band, so they are used as decoys instead.

> The daily schedule is a seeded shuffle per domain, so adding rules to a domain reshuffles that domain's future (and past) schedule. Append rules between launches, or pin past puzzles if that matters to you.

## Judging "Name the rule"

1. **Client fuzzy match** (`src/lib/fuzzy.ts`): lowercase, drop punctuation and stopwords, map synonyms and number words, then token overlap against each accepted phrasing ≥ 0.75. Numbers, letters and meaning-flipping words (colours, shapes, odd/even, comparisons, positions, negation) must match exactly, so "multiple of 5" never matches "multiple of 3".
2. Otherwise **`POST /api/judge`**: rate limit (30/hour per hashed IP) → Neon `verdict_cache` → Gemini with the rule description, predicate source and decoys. The guess is sanitised and wrapped in `<guess>…</guess>` and the model is told to treat it strictly as data. The response is forced to JSON `{verdict: correct|close|wrong, hint}`; the game only counts `correct` as right and shows no hints. The verdict is cached.
3. **Tested items** are always checked by the rule's predicate in code, never by the model.

If the judge is unreachable, the guess does not cost a clue.

## "What comes next" puzzles and the admin desk

Besides the 40 built-in rules, the game can play AI-written puzzles in the style of the *Only Connect*
Sequences round: a well-known progression (planets, Greek letters, Apollo missions…). The writer supplies
4 clues and the answer, which fill the 5 rows; players guess what comes next and name the rule.

- **Writing:** `/api/admin/generate` sends [`prompts/puzzle-generator.md`](prompts/puzzle-generator.md) to Gemini
  with **Google Search** enabled, so it can check facts and pick up a topical hook from the week's news. Edit the
  markdown to change the house style; no code changes needed. Recent and upcoming connections are passed in so it
  doesn't repeat itself, and difficulty follows the weekday (gentle Monday, toughest Saturday).
- **Checking:** every draft is validated in code (`src/lib/chain.ts`): exactly 4 different clues, the answer isn't a
  clue, the accepted answers include it, enough rule phrasings, a difficulty 1–5. Drafts with problems can't be approved.
- **Reviewing:** open **`/admin`** (not linked anywhere, `noindex`) and enter `ADMIN_TOKEN`. It shows today plus the
  next 7 days. **Write puzzles for empty days** drafts the whole week; then per day you can **Approve**, **Reject**,
  **Edit** the JSON, or **Rewrite** with an optional note to the writer ("make it about music").
- **Playing:** an approved puzzle replaces that day's built-in rule; days without one play the built-in rule.
  `/api/puzzle` only ever serves today or earlier, so upcoming puzzles can't be peeked at.
  The player's 5th is matched against `acceptedAnswers` by code (case, accents, punctuation and a leading "the"
  are ignored, any script works). Only the rule guess goes to the AI judge.



```bash
npm install
cp .env.example .env    # optional: fill in DATABASE_URL / GEMINI_API_KEY
npm run dev             # http://localhost:5173 (the /api functions run inside Vite)
```

Without `DATABASE_URL` the game still works: no verdict cache, rate limit or global stats. Without `GEMINI_API_KEY`, only rule guesses that fuzzy-match an accepted phrasing can be judged; others show an error and don't cost a clue. `vercel dev` also works if you have the Vercel CLI.

```bash
npm test                # Vitest: predicates, daily picker, fuzzy matching, elimination, game flow, share/stats, word input, judge sanitising
npm run validate-rules
npm run build           # typecheck + production build
```

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | for prod | Neon connection string (use the pooled one). Verdict cache, daily results, rate limiting. |
| `GEMINI_API_KEY` | for prod | Google AI Studio key used by `/api/judge`. |
| `GEMINI_MODEL` | no | Model name, default `gemini-2.5-flash`. |
| `IP_HASH_SALT` | recommended | Salt for hashing IPs in `rate_limit`. Raw IPs are never stored. |
| `ADMIN_TOKEN` | for `/admin` | Password for the puzzle desk (12+ characters). Admin is off when unset. |
| `GEMINI_GENERATOR_MODEL` | no | A different model just for writing puzzles (defaults to `GEMINI_MODEL`). |

## Neon setup

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled** connection string.
2. Put it in `.env` as `DATABASE_URL=...`.
3. `npm run db:migrate` — creates `verdict_cache`, `daily_results`, `rate_limit`, `puzzles` (and a `schema_migrations` table).
4. `npm run db:seed` — pre-caches every accepted phrasing as `correct`. `npm run db:seed -- --demo` also adds fake results for today's puzzle so the "x% of players needed more clues" line has data.

Tables (anonymous, no PII):

- `verdict_cache(rule_id, normalized_guess, verdict, hint, created_at)`
- `daily_results(puzzle_no, solved_on_clue 0–5, count)` — 0 = unsolved; incremented by `POST /api/result`
- `rate_limit(ip_hash, "window", count, updated_at)` — hourly windows; old rows are pruned automatically
- `puzzles(puzzle_no, puzzle_date, status draft|approved|rejected, data jsonb, errors, note)` — AI puzzles from `/admin`

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel. The framework preset is Vite (`vercel.json` sets build command and output dir).
2. Add `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL` (optional), `IP_HASH_SALT` and `ADMIN_TOKEN` in **Project → Settings → Environment Variables**. Or use Vercel's Neon integration, which sets `DATABASE_URL` for you.
3. Run `npm run db:migrate && npm run db:seed` once against the production database.
4. Deploy. Files in `api/` become functions; `api/_lib` is shared code, not routes. `vercel.json` bundles `prompts/` with the generator and gives it 60 s.
5. Each week, open `/admin`, write the week's puzzles, review and approve.

The package is CommonJS on purpose (no `"type": "module"`), so Vercel compiles `/api` to CommonJS and the extensionless imports into `src/` resolve.

## Notes

- The rules ship in the client bundle (like most daily word games), so a determined player can read them.
- Stats and today's progress live in `localStorage` (wrapped in try/catch); the game still works when storage is blocked.
- Accessibility: verdicts always show a symbol and a word (✓ FITS / ✗ DOESN'T), fails are also hatched, tiles carry a colour letter, live regions announce clues, dialogs trap focus and close on Escape, and motion respects `prefers-reduced-motion`.
- No ads, accounts or tracking.
