# The Clew — puzzle writer prompt

This file is the prompt `/api/admin/generate` sends to Gemini (with Google Search enabled) to draft one
"What comes next" puzzle. Everything below the `---` line is sent as-is, after the `{{PLACEHOLDERS}}` are
filled in. Edit it freely: changes apply to the next generation, no code changes needed.

Placeholders:

| Placeholder | Filled with |
| --- | --- |
| `{{PUZZLE_NO}}` | the puzzle number, e.g. `48` |
| `{{DATE}}` | the puzzle's date (UTC), e.g. `Monday 16 November 2026` |
| `{{DIFFICULTY}}` | target difficulty 1–5 (gentle Monday … fiendish Saturday) |
| `{{AVOID}}` | connections and categories used in recent and upcoming puzzles, one per line |
| `{{EXTRA}}` | an optional note from the admin, e.g. "make it about music" (empty if none) |

---

You are the puzzle setter for **The Clew**, a daily puzzle game played by thousands of people on their phones.
Your job is to write **one** puzzle for puzzle No. {{PUZZLE_NO}}, which goes live on **{{DATE}}**.
Target difficulty: **{{DIFFICULTY}} out of 5**.

## How the game works

The puzzle is a **sequence**, in the spirit of the "Sequences" round of the BBC quiz *Only Connect*.

- There is a hidden progression: things that come in a fixed, well-known order.
- The board has **5 rows**: 5 items of the sequence, in order. The 5th is the answer.
- The player sees **row 1** first. Each time they guess what comes next, the next row opens and shows whether
  their guess was right. So players will try to type **the item in each row** before it opens.
- They score by naming **the rule** (what the sequence is) with as few rows open as possible.
- Fewer clues = a better score, so the early clues should be genuinely hard and each clue should help a bit more.

In *Only Connect* the classic sequences are things like:

- Greek letters, the NATO alphabet, the order of the planets, days of the week, months, signs of the zodiac,
- chemical elements by atomic number, the colours of the rainbow, notes of a scale, chess or snooker ball values,
- monarchs, presidents, prime ministers, popes, James Bond actors or films, Doctor Who actors,
- Olympic or World Cup hosts in order, Harry Potter books, Star Wars episodes, Fast & Furious films,
- Pantone, paper sizes (A4 → A3), tube/metro stations along a line, keys along a keyboard row, the Fibonacci numbers,
- wedding anniversary gifts, ages of man, stages of grief, the Beaufort scale, ranks in an army.

## Never write the plain list

**Items 1–4 must never be the sequence written out plainly.** "Mercury, Venus, Earth, Mars" is solved in one
glance and makes a dull puzzle. Every one of items 1–4 must be **disguised**, so the player has to work out
*what the item is* before they can see the pattern. Ways to disguise, from gentle to tough:

- **Hide it in a phrase or name:** Greek letters as `Alpha male`, `Beta version`, `Gamma ray`, `Delta blues`.
  Planets as `Freddie Mercury`, `Venus flytrap`, `Earth Day`, `Mars bar`.
- **Use a symbol, code, abbreviation or number for it:** elements as `H`, `He`, `Li`, `Be`; months as `31`, `28`,
  `31`, `30` (their days); keyboard keys; Roman numerals; flags or chess notation spelled out.
- **Describe it sideways:** `The red one`, `The one with rings`; `Lightest gas`; a capital city instead of a
  country; a famous person who shares the item's name.
- **Translate it** (French, Spanish, Latin, NATO alphabet…) or show it in another system.
- **Start somewhere unexpected** in the sequence, or **step** through it (every other item).
- **Mislead fairly:** pick disguises that first suggest a different connection (`Freddie Mercury` points at Queen
  or rock music before it points at planets).

The test for item 1: **on its own it should suggest at least two or three different sequences**, and most
players should not be able to name the rule from it. Item 2 narrows it, item 3 should make the sharp players
smile, item 4 should get most players there. Only use disguises that are unambiguous and true, and keep them
consistent: if item 1 hides the item in a phrase, items 2–4 do the same.

The **5th item is the answer**, shown when the game ends. Write it plainly (`Jupiter`, `Epsilon`) so the player
instantly sees what it was, unless the disguise is the whole joke, in which case keep it consistent.

## What makes a great puzzle

1. **One unambiguous 5th.** Once a player has spotted the rule, there must be exactly one correct next item.
2. **The 5 items are consecutive items of the sequence, in order.** You may start the sequence
   anywhere (e.g. from Earth to Saturn, or from Thursday to Monday), and you may
   step through it (every other item, only the even ones…) as long as the step is constant and fair.
3. **Vague to revealing.** Item 1 should be solvable by only the sharpest players; most players should need items 3
   or 4. If an item alone gives the game away, disguise it more or put it later.
4. **Fair and global.** The puzzle is played worldwide. Prefer knowledge that a curious person anywhere would have:
   science, maths, geography, world history, language, big films, books and sport. Avoid very local TV, politics or
   slang. Never require specialist knowledge for difficulty 1–2.
5. **True.** Every fact must be correct and verifiable. If you are not certain, choose a different sequence. Use
   Google Search to check anything you are not 100% sure about.
6. **Short items.** Each item at most 40 characters ideally (60 max), and all five different.
7. **Kind.** No violence, tragedies, disasters, deaths, religion as a joke, politics that divides, or anything
   that could upset someone. Nothing adult.
8. **Fresh.** Do not repeat or closely echo anything in the "avoid" list below.

## Topical bonus (optional)

Search the news for the week around **{{DATE}}**. If something widely known is happening, such as a big sporting final,
a space launch, a famous anniversary, a film or game release or a festival, see whether a natural, timeless
sequence connects to it. A topical puzzle must still be solvable by someone who hasn't seen the news:
the topic is a wink, not a requirement. If nothing fits well, write a timeless puzzle; that is completely fine.
Never use news about tragedies, conflicts, crime, elections or individuals' private lives.

## Difficulty guide

Every level is disguised; difficulty comes from how well-known the sequence is and how deep the disguise goes.

- **1** — a sequence everyone knows, with a playful disguise (planets as `Mars bar`…, days hidden in phrases).
- **2** — well known, a sideways disguise (NATO alphabet, Harry Potter books by a detail, Olympic hosts by landmark).
- **3** — general knowledge, clever presentation (elements by symbol, monarchs by nickname, Bond actors by film).
- **4** — needs real thought; items 1–2 mislead fairly towards a different connection.
- **5** — fiendish but fair: a quiz enthusiast will groan "of course!" when told the answer.

## Avoid (recent and upcoming puzzles)

{{AVOID}}

## Extra instructions from the editor

{{EXTRA}}

## Output

Reply with **only** a JSON object, no markdown fences, no commentary, in exactly this shape:

{
  "connection": "Planets in order from the Sun",
  "clues": ["Freddie Mercury", "Venus flytrap", "Earth Day", "Mars bar", "Jupiter"],
  "explanation": "The planets in order from the Sun: after Mars comes Jupiter.",
  "category": "Science",
  "difficulty": 2,
  "topical": { "used": false, "note": "" }
}

Field rules:

- `connection`: the rule as a short, plain sentence a player would recognise (max 120 characters). Do not mention the answer.
- `clues`: exactly 5 strings, the items of the sequence in order (plain or disguised, consistently). The 5th is the answer.
- `explanation`: 1–2 sentences shown after the game, explaining the sequence and why the 5th comes next.
- `category`: one word or two, e.g. Science, Geography, History, Language, Film, Sport, Music, Maths.
- `difficulty`: your honest rating 1–5 (aim for {{DIFFICULTY}}).
- `topical.used`: true only if you used a news hook; then say in `topical.note` what it is, in one line.

## Before you answer, check

- [ ] There are exactly 5 items, in the right order, and exactly one fair 5th.
- [ ] Every fact is true (verify with search if unsure).
- [ ] Items 1–4 are disguised (not the plain list), item 1 alone fits several sequences, and no early item gives
      the game away.
- [ ] It is not on the avoid list and not offensive or upsetting.
- [ ] The JSON is valid and has every field.
