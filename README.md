# 🧶 The Clew

A mobile-first daily "what comes next" puzzle, in the spirit of the Sequences round of *Only Connect*.
One sequence a day, the same for everyone (new puzzle at 00:00 UTC).

## How it plays

- The board has **5 rows**: five things that come in a fixed order (planets, Greek letters, Bond actors…).
  Only row 1 is showing at the start.
- **Guess what comes next** in the free-text box. The next row opens, marked **✓ Called it** if you were right (wrong guesses show nothing).
  Leave the box empty and the button says **Next ›**: it just opens the next row. Guesses aren't scored.
- **Name the rule** (the sequence) in your own words at any time. Right → solved on that row. Wrong → a short
  "not it" and the next row opens. No hints.
- On row 5 there's nothing left to open: one final rule guess, or give up.
- Score = the row you named the rule on (1–5).

Share text:

```
🧶 The Clew #42
Untangled it on clue 3 of 5 🎉
🤔 ❌ ✅
theclew.fyi
```

(one emoji per row: ⏭️ next · 🤔 guessed · ❌ wrong rule · ✅ got it; the line changes with the day, e.g.
"Got it on the first clue 🤯", "Totally tangled today 🙈")

Guesses are checked in code against each row's accepted answers: case, accents, punctuation and a leading "the"
are ignored, and any script works. Only the free-text rule goes to the AI judge.

## Where puzzles come from

1. **Approved AI puzzles** (from `/admin`, below) are played on their day.
2. Otherwise the day plays one of the **built-in puzzles** in [`src/puzzles/library.ts`](src/puzzles/library.ts)
   (41 at the moment). The library is played in a seeded order, all puzzles before any repeats, so the game works
   without a database too.

Every puzzle is written as **4 clues + the answer**, which fill the 5 rows:

```ts
{
  connection: 'Greek letters in alphabetical order',
  acceptedPhrasings: ['greek letters', 'greek alphabet', 'greek alphabet in order', ...],
  clues: ['Alpha male', 'Beta version', 'Gamma ray', 'Delta blues'],
  clueAnswers: [['Alpha'], ['Beta'], ['Gamma'], ['Delta']],  // what a player types for disguised clues
  answer: 'Epsilon',
  acceptedAnswers: ['Epsilon'],
  explanation: 'Alpha, beta, gamma, delta… the fifth Greek letter is epsilon.',
  category: 'Language',
  difficulty: 2,
}
```

`npm run validate-puzzles` checks the library: 4 different clues, the answer isn't a clue, accepted answers include
it, enough rule phrasings, difficulty 1–5, unique ids and connections. A test also makes sure every row accepts its
own text and never the row before it.

## The admin desk (AI puzzles)

- **Writing:** `/api/admin/generate` sends [`prompts/puzzle-generator.md`](prompts/puzzle-generator.md) to Gemini
  with **Google Search** enabled, so it can check facts and pick up a topical hook from the week's news. Edit the
  markdown to change the house style; no code changes needed. Recent and upcoming puzzles are passed in so it doesn't
  repeat itself, and difficulty follows the weekday (gentle Monday, toughest Saturday).
- **Checking:** every draft runs the same checks as the library (`src/lib/chain.ts`). Drafts with problems can't be approved.
- **Reviewing:** open **`/admin`** (not linked anywhere, `noindex`) and enter `ADMIN_TOKEN`.
  - **This week** lists today plus the next 7 days with their status (approved / needs review / built-in).
    **Write AI puzzles for empty days** drafts every day that doesn't have one.
  - **The calendar** shows any month; tap a day to see the puzzle that played or will play. Past days are view-only.
  - **The day editor** has a field for every part (clues and what each accepts as a guess, the answer and its
    spellings, the rule and its phrasings, explanation, category, difficulty), live checks, and **Save as draft /
    Approve / Unapprove / Reject**. **Ask AI to change it** sends an instruction ("make clue 1 harder", "use football
    instead") plus the current puzzle to Gemini (`/api/admin/revise`) and saves the result as a draft; **Start over**
    writes a fresh one. A day still on its built-in puzzle can be edited and saved as its own draft.
- `/api/puzzle` only ever serves today or earlier, so upcoming puzzles can't be peeked at.

## Stack

- Vite + React + TypeScript (no UI libraries); Google Fonts *IBM Plex Mono* + *IBM Plex Sans Condensed*
- Vercel Functions in `/api` (Web `Request`/`Response` handlers)
- Neon Postgres via `@neondatabase/serverless`
- Gemini for judging the free-text rule and for writing puzzles
- Vitest

## File structure

```
api/
  judge.ts            POST /api/judge  {ruleId: "lib:<id>" | "chain:<no>", guess} → {verdict}
  result.ts           POST /api/result {puzzleNo, solvedOnClue}; GET /api/result?puzzle=N
  puzzle.ts           GET  /api/puzzle?no=N → today's approved AI puzzle (404 = play the built-in one)
  admin/puzzles.ts    GET/POST the week's drafts; approve / reject / save (ADMIN_TOKEN)
  admin/generate.ts   POST one draft with Gemini + Google Search (ADMIN_TOKEN)
  admin/revise.ts     POST an instruction → Gemini updates the day's puzzle, saved as a draft (ADMIN_TOKEN)
  _lib/               db client, Gemini judge + sanitising, generator, puzzle store, rate limit, admin auth
db/migrations/        001_init.sql, 002_puzzles.sql
prompts/              puzzle-generator.md — the editable puzzle-writing prompt
scripts/              validate-puzzles.ts, migrate.ts, seed.ts
src/
  puzzles/library.ts  built-in sequence puzzles
  lib/                puzzle + game state, daily picker, answer matching, fuzzy rule matching,
                      puzzle checks (chain.ts), share text, stats, storage, API client
  components/         Thread (the 5 rows), GuessInput, ResultCard, HowToPlay, confetti
  screens/            Today, Play, Stats, Admin
tests/                Vitest suites
```

## Judging "name the rule"

1. **Client fuzzy match** (`src/lib/fuzzy.ts`) against the puzzle's connection and accepted phrasings: lowercase,
   drop punctuation and stopwords, map synonyms and number words, token overlap ≥ 0.75; numbers and other key words
   must match exactly ("powers of 3" never matches "powers of 2").
2. Otherwise **`POST /api/judge`**: rate limit (30/hour per hashed IP) → Neon `verdict_cache` → Gemini, given the full
   sequence, the rule and the explanation. The guess is sanitised and wrapped in `<guess>…</guess>` and treated strictly
   as data. The response is forced to JSON; only `correct` counts. The verdict is cached.

If the judge is unreachable, the guess doesn't cost a row.

## Local development

```bash
npm install
cp .env.example .env    # optional: fill in DATABASE_URL / GEMINI_API_KEY / ADMIN_TOKEN
npm run dev             # http://localhost:5173 (the /api functions run inside Vite)
```

Without `DATABASE_URL` the game still works with the built-in puzzles: no verdict cache, rate limit, global stats or
admin. Without `GEMINI_API_KEY`, only rule guesses that fuzzy-match an accepted phrasing can be judged; others show
an error and don't cost a row. `vercel dev` also works if you have the Vercel CLI.

```bash
npm test                  # Vitest: game flow, answer matching, library, daily picker, fuzzy matching, puzzle checks,
                          # prompt filling, admin auth, share/stats, judge sanitising
npm run validate-puzzles  # check the built-in puzzles (also: npm run validate-rules)
npm run build             # typecheck + production build
```

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | for prod | Neon connection string (use the pooled one). Verdict cache, results, rate limiting, AI puzzles. |
| `GEMINI_API_KEY` | for prod | Google AI Studio key, for the judge and the puzzle writer. |
| `GEMINI_MODEL` | no | Model name, default `gemini-2.5-flash`. |
| `GEMINI_GENERATOR_MODEL` | no | A different model just for writing puzzles (defaults to `GEMINI_MODEL`). |
| `ADMIN_TOKEN` | for `/admin` | Password for the puzzle desk (12+ characters). Admin is off when unset. |
| `IP_HASH_SALT` | recommended | Salt for hashing IPs in `rate_limit`. Raw IPs are never stored. |

## Neon setup

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled** connection string.
2. Put it in `.env` as `DATABASE_URL=...`.
3. `npm run db:migrate` — creates `verdict_cache`, `daily_results`, `rate_limit`, `puzzles` (and `schema_migrations`).
4. `npm run db:seed` — pre-caches the built-in puzzles' accepted phrasings as `correct`.
   `npm run db:seed -- --demo` also adds fake results for today so the "x% of players needed more clues" line has data.

Tables (anonymous, no PII):

- `verdict_cache(rule_id, normalized_guess, verdict, hint, created_at)` — `rule_id` is the puzzle id
- `daily_results(puzzle_no, solved_on_clue 0–5, count)` — 0 = unsolved; incremented by `POST /api/result`
- `rate_limit(ip_hash, "window", count, updated_at)` — hourly windows; old rows are pruned automatically
- `puzzles(puzzle_no, puzzle_date, status draft|approved|rejected, data jsonb, errors, note)` — AI puzzles from `/admin`

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel. The framework preset is Vite (`vercel.json` sets build command and output dir).
2. Add the environment variables above in **Project → Settings → Environment Variables** (or use Vercel's Neon
   integration, which sets `DATABASE_URL` for you).
3. Run `npm run db:migrate && npm run db:seed` once against the production database.
4. Deploy. Files in `api/` become functions; `api/_lib` is shared code, not routes. `vercel.json` bundles `prompts/`
   with the generator and reviser and gives them 60 s.
5. Each week, open `/admin`, write the week's puzzles, review and approve.

The package is CommonJS on purpose (no `"type": "module"`), so Vercel compiles `/api` to CommonJS and the
extensionless imports into `src/` resolve.

## Notes

- The built-in puzzles ship in the client bundle (like most daily word games), so a determined player could read them.
  AI puzzles are only served on their day.
- Stats and today's progress live in `localStorage` (wrapped in try/catch); the game still works when storage is blocked.
- Accessibility: guess results show a symbol and a word, live regions announce each row, dialogs close on Escape,
  and motion respects `prefers-reduced-motion`.
- No ads, accounts or tracking.
