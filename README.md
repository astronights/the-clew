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

Only puzzles **you approve in the desk** (`/admin`, below) are ever played. Nothing is used automatically: a day with
no approved puzzle shows players "Today's clew is still being spun", and the desk's reminders make sure that doesn't happen.

The 41 **built-in puzzles** in [`src/puzzles/library.ts`](src/puzzles/library.ts) are a pick list in the desk: start a
day from one, edit it if you like, and approve it.

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
  - **Reminders:** install the desk as an app and turn on push notifications (see below).
  - **This week** lists today plus the next 7 days with their status (approved / needs review / empty).
    **Write AI puzzles for empty days** drafts every day that doesn't have one.
  - **The calendar** shows any month; tap a day to see the puzzle that played or will play. Past days are view-only.
  - **The day editor** has a field for every part (clues and what each accepts as a guess, the answer and its
    spellings, the rule and its phrasings, explanation, category, difficulty), live checks, and **Save as draft /
    Approve / Unapprove / Reject**. **Ask AI to change it** sends an instruction ("make clue 1 harder", "use football
    instead") plus the current puzzle to Gemini (`/api/admin/revise`) and saves the result as a draft; **Start over**
    writes a fresh one. An empty day can also **start from a built-in** puzzle.
- **Installable desk + reminders:** `/admin` is its own page (`admin.html`) with a web app manifest and a service
  worker (`public/admin-sw.js`), so it installs as **Clew desk** (iPhone: Share → Add to Home Screen; Android/desktop:
  "Install the desk app"). In the desk, **Turn on reminders** subscribes the device to Web Push. A daily Vercel Cron
  (`/api/cron/reminder`, 17:07 UTC) sends a **weekly summary every Sunday** and an **urgent nudge any day tomorrow
  has no approved puzzle**. On iPhone, push only works from the installed app (iOS 16.4+).
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
  admin/push.ts       GET the VAPID key; POST subscribe / unsubscribe / test (ADMIN_TOKEN)
  cron/reminder.ts    daily check (Vercel Cron, CRON_SECRET): Sunday summary + "tomorrow isn't ready" nudge
  _lib/               db client, Gemini judge + sanitising, generator, puzzle store, rate limit, admin auth
db/migrations/        001_init.sql, 002_puzzles.sql, 003_push.sql
admin.html            the desk's own page (manifest, icons, service worker); /admin rewrites to it
public/               admin.webmanifest, admin-sw.js, icons/
prompts/              puzzle-generator.md (writing puzzles), judge.md (judging rule guesses)
scripts/              validate-puzzles.ts, migrate.ts, seed.ts
src/
  puzzles/library.ts  built-in sequence puzzles
  lib/                puzzle + game state, daily picker, answer matching, fuzzy rule matching,
                      puzzle checks (chain.ts), share text, stats, storage, API client
  components/         Thread (the 5 rows), GuessInput, ResultCard, HowToPlay, confetti
  screens/            Today, Play, Stats, Admin (desk entry: src/admin-main.tsx)
tests/                Vitest suites
```

## Judging "name the rule"

**Every rule guess is judged by Gemini**: no word-matching shortcut and no reusing earlier verdicts.

- `POST /api/judge`: rate limit (30/hour per hashed IP) → Gemini. The guess is sanitised, wrapped in
  `<guess>…</guess>` and treated strictly as data; the response is forced to JSON and only `correct` counts.
- **The prompt is built for caching.** [`prompts/judge.md`](prompts/judge.md) holds the fixed judging rules and ~60
  worked examples (~2,200 tokens). It goes **first** and is identical for every call; today's puzzle follows (the same
  for every player all day); the guess comes last. Gemini 2.5's automatic (implicit) caching reuses a shared prefix
  once it's past the model's minimum size, so most of each request can be served from cache. Each call logs
  `judge tokens: prompt N, cached M` so you can see hits in the Vercel logs. Edit `judge.md` freely, but keep
  anything puzzle-specific out of it.
- Every verdict is written to `verdict_cache` as a log for reviewing the judge (it's never read back to skip a call).

If the judge is unreachable, the guess doesn't cost a row.

## Local development

```bash
npm install
cp .env.example .env    # optional: fill in DATABASE_URL / GEMINI_API_KEY / ADMIN_TOKEN
npm run dev             # http://localhost:5173 (the /api functions run inside Vite)
```

Without `DATABASE_URL` there are no approved puzzles, so the game shows "still being spun"; the desk, verdict cache,
stats and reminders need the database. Without `GEMINI_API_KEY` rule guesses can't be judged: players see an error and nothing is used up. `vercel dev` also works if you have the Vercel CLI.

```bash
npm test                  # Vitest: game flow, answer matching, library, daily picker, fuzzy matching, puzzle checks,
                          # prompt filling, admin auth, reminders, share/stats, judge sanitising
npm run validate-puzzles  # check the built-in puzzles (also: npm run validate-rules)
npm run vapid-keys        # create the key pair for push reminders (once)
npm run build             # typecheck + production build
```

### Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | for prod | Neon connection string (use the pooled one). Verdict cache, results, rate limiting, AI puzzles. |
| `GEMINI_API_KEY` | for prod | Google AI Studio key, for the judge and the puzzle writer. |
| `GEMINI_MODEL` | no | Model name, default `gemini-2.5-flash` (e.g. `gemini-3.8-flash`). Settings adapt to the model family. |
| `GEMINI_GENERATOR_MODEL` | no | A different model just for writing puzzles (defaults to `GEMINI_MODEL`). |
| `GEMINI_THINKING_LEVEL` / `GEMINI_GENERATOR_THINKING_LEVEL` | no | Gemini 3.x only: thinking level for judging / writing, default `low`. |
| `ADMIN_TOKEN` | for `/admin` | Password for the puzzle desk (12+ characters). Admin is off when unset. |
| `IP_HASH_SALT` | recommended | Salt for hashing IPs in `rate_limit`. Raw IPs are never stored. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | for reminders | Web Push keys; create once with `npm run vapid-keys`. |
| `VAPID_SUBJECT` | for reminders | A `mailto:` address push services can contact, e.g. `mailto:you@example.com`. |
| `CRON_SECRET` | for reminders | Any long random string; Vercel sends it to `/api/cron/reminder`. |

## Neon setup

1. Create a project at [neon.tech](https://neon.tech) and copy the **pooled** connection string.
2. Put it in `.env` as `DATABASE_URL=...`.
3. `npm run db:migrate` — creates `verdict_cache`, `daily_results`, `rate_limit`, `puzzles`, `push_subscriptions`
   (and `schema_migrations`).
4. Optional, for local testing: `npm run db:seed -- --demo` adds fake results for today so the
   "x% of players needed more clues" line has data.

Tables (anonymous, no PII):

- `verdict_cache(rule_id, normalized_guess, verdict, hint, created_at)` — a log of judged rule guesses per puzzle
- `daily_results(puzzle_no, solved_on_clue 0–5, count)` — 0 = unsolved; incremented by `POST /api/result`
- `rate_limit(ip_hash, "window", count, updated_at)` — hourly windows; old rows are pruned automatically
- `puzzles(puzzle_no, puzzle_date, status draft|approved|rejected, data jsonb, errors, note)` — puzzles from `/admin`
- `push_subscriptions(endpoint, keys)` — the editor's devices that get desk reminders

## Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel. The framework preset is Vite (`vercel.json` sets build command and output dir).
2. Add the environment variables above in **Project → Settings → Environment Variables** (or use Vercel's Neon
   integration, which sets `DATABASE_URL` for you).
3. Run `npm run db:migrate` once against the production database.
4. Deploy. Files in `api/` become functions; `api/_lib` is shared code, not routes. `vercel.json` bundles `prompts/`
   with the generator and reviser and gives them 60 s.
5. The daily reminder cron is declared in `vercel.json` (Vercel → Project → Cron Jobs shows it).
6. Open `/admin` on your phone, install it (iPhone: Share → Add to Home Screen), open **Clew desk** from the Home
   Screen and tap **Turn on reminders**, then **Send a test**.
7. Each week (the Sunday reminder will nudge you), write, review and approve the coming days.

The package is CommonJS on purpose (no `"type": "module"`), so Vercel compiles `/api` to CommonJS and the
extensionless imports into `src/` resolve.

## Notes

- Puzzles are only served on their day, so upcoming ones can't be peeked at.
- Stats and today's progress live in `localStorage` (wrapped in try/catch); the game still works when storage is blocked.
- Accessibility: guess results show a symbol and a word, live regions announce each row, dialogs close on Escape,
  and motion respects `prefers-reduced-motion`.
- No ads, accounts or tracking.
